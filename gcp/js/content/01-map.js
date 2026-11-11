/* Mission 1: the map of Google Cloud for a data engineer. Projects and locations, the services by job, which database for which workload, what the
   certification and the job descriptions ask for, and the command line tools. The hierarchy, the services and the exam come from documentation. The one recorded
   screen checks the flags that this course names against the installed gcloud and bq help pages. */
(function () {
  var B = LAB.b, G = LAB.get;
  var FL = G.table('cli.flags'), CS = G.counts('cli.summary');
  G.expect(CS.commands_checked === 24 && CS.flags_not_found.length === 0, 'every flag that the course names exists in gcloud and bq');

  LAB.addChapter({
    id: 'm1', n: 1, title: 'The map of Google Cloud for data', short: 'Map', blurb: 'Projects, locations, the services by job, the exam and the job descriptions', minutes: 30,
    focus: ['src', 'ing', 'stg', 'mart', 'con'],
    goals: [
      'Explain the **resource hierarchy** and why a **project** is the unit of cost, quota and access.',
      'Say why a **location** is chosen once, and what goes wrong when data and compute are in different places.',
      'Name the service for each **job**: land, process, store, orchestrate, govern, serve.',
      'Pick a **database** by the shape of the workload and not by habit.',
      'Read the **five areas** of the Professional Data Engineer exam and the common job description against the missions.',
      'Use `gcloud` and `bq` from the command line, and check a flag before you rely on it.'
    ],
    say: 'Mission 1 is the map. Google Cloud has hundreds of products, and a data engineer needs about two dozen of them. Before any service, learn the frame around it: the hierarchy that holds your resources, the location that your data lives in, and the job each service does. I also read a small sample of job descriptions and the exam page, so that you know which parts of the map are asked about.',
    scenes: [
      B.flow({
        id: 'm1-hier', t: 1, src: 'docs', title: 'The resource hierarchy', g: 'project', legend: true,
        steps: [
          { say: 'Everything you create in Google Cloud lives in a project, and projects live in a hierarchy. Press Next to walk down it. This is how Brewline is set up, and the same shape is the usual answer to the question "how do you organise a company on Google Cloud".', cap: 'Organization, folders, projects, resources.' },
          { say: 'Step 1. The organization is the root. It belongs to the company domain. Policies set here reach everything below, for example "nobody may create a service account key" or "resources may only be created in these regions".', on: ['h1'], focus: ['o_org', 'o_fold'], cap: 'The root holds company-wide rules.' },
          { say: 'Step 2. Folders group projects, for example by team or by environment. A folder is where you give a team access to all of its projects at once, and where you set a rule for all of them.', on: ['h2'], focus: ['o_fold', 'o_dev', 'o_prod'], cap: 'Folders group projects.' },
          { say: 'Step 3. A project is the working unit. It has a name, an id that is unique in the world and cannot be reused, and a number. Billing, quotas, the list of enabled APIs and most access are set per project, so a dev project and a prod project cannot spoil each other.', on: ['h3'], focus: ['o_dev', 'o_bkt', 'o_ds'], cap: 'A project is the unit of cost, quota and access.' },
          { say: 'Step 4. Resources sit in projects: buckets, datasets, topics, service accounts. A role granted on the project reaches all of them. A role granted on one dataset reaches only that. The next mission is all about this inheritance.', on: ['h4'], focus: ['o_prod', 'o_topic', 'o_sa'], cap: 'A role on a level reaches everything below it.' }
        ]
      }),

      B.talk({
        id: 'm1-region', t: 1, src: 'docs', title: 'Locations: chosen once, and they matter',
        say: 'A location is not a detail. Data has to sit somewhere, and a few things follow from where. Press Next for each.',
        items: [
          ['Regions and multi-regions', 'A **region** is one place, such as `asia-southeast1` (Singapore) or `asia-southeast2` (Jakarta). A **multi-region**, such as `US` or `EU`, spans several. Cloud Storage also has **dual-regions**. Brewline picks Singapore for everything, because the stores are close and one region keeps the rules simple.', 'One region for one platform, unless a rule says otherwise.'],
          ['You choose once', 'The location of a **BigQuery dataset** and of a **Cloud Storage bucket** is set when you create it, and it cannot be changed later. To move data you copy it to a new dataset or bucket and switch the pipelines. So the choice belongs in a design review, before the first table.', 'Moving later is a project, not a setting.'],
          ['Compute goes where the data is', 'A BigQuery query runs in the location of the data it reads, and it cannot join tables that sit in different locations. A load job wants the bucket in the same location as the dataset. A Dataflow job runs in a region, and reads and writes across regions cost money and time.', 'Keep data and compute in one location.'],
          ['Residency and rules', 'Some data must stay in a country or a region. An **organization policy** can limit where resources may be created, so a mistake cannot put a bucket in the wrong place. Whether a rule applies to you is a question for your legal team. This course describes the engineering.', 'Make the right location the only possible one.']
        ],
        cols: 1,
        call: { k: 'warn', h: 'One of the most common first errors:', t: 'a query reports that a dataset "was not found in location US" while the dataset exists in `asia-southeast1`. The data is there. The job ran in the wrong place.' }
      }),

      B.cmp({
        id: 'm1-services', t: 1, src: 'docs', title: 'The services by job',
        say: 'Here are the services this course uses, by the job they do. You do not need to memorise a product list. You need to know the job, and which service is the usual answer to it. Press Next for each group.',
        cols: ['Job', 'Service', 'Use it when'],
        hl: 1,
        rows: [
          ['Land events', 'Pub/Sub', 'Many producers send small messages and several consumers read them.'],
          ['Land database changes', 'Datastream', 'You want the inserts, updates and deletes of a database in BigQuery or Cloud Storage.'],
          ['Land files', 'Cloud Storage, Storage Transfer Service', 'Files arrive or must be copied in bulk from S3, Azure or a data center.'],
          ['Process streams and batches', 'Dataflow (Apache Beam)', 'You need windows, late data and scale that you do not manage.'],
          ['Process with Spark', 'Dataproc, Serverless for Apache Spark', 'You have Spark or Hadoop code, or a library that only Spark has.'],
          ['Transform with SQL', 'BigQuery SQL, Dataform', 'The data is in BigQuery and the logic fits in SQL. This is the default.'],
          ['Run small code on events', 'Cloud Run functions, Eventarc', 'A file or a message needs a few lines of code, not a pipeline.'],
          ['Orchestrate', 'Cloud Composer, Workflows, Cloud Scheduler', 'Composer for DAGs of data tasks. Workflows for API calls. Scheduler for a cron trigger.'],
          ['Govern', 'Dataplex, policy tags, Sensitive Data Protection', 'You need a catalog, lineage, quality checks, masking and a scan for sensitive data.'],
          ['Serve', 'Looker, Looker Studio, BI Engine', 'People need dashboards on the curated layer.'],
          ['Learn from data', 'BigQuery ML, Vertex AI', 'You want a model on warehouse data, or custom training and serving.']
        ],
        steps: [
          { upto: 3, say: 'Landing. Events, database changes and files have three different front doors. Pick the one that matches how the data is born.' },
          { upto: 7, say: 'Processing. SQL first, because it is the cheapest to run and to read. Beam when you need streaming semantics. Spark when you inherit it. A function for small tasks.' },
          { upto: 11, say: 'Orchestration, governance, serving and learning. They surround the pipelines, and each has its own mission.' }
        ],
        pick: 'Product names change, and some services have been renamed over the years: for example Cloud Functions is now Cloud Run functions, and the catalog is part of Dataplex. Learn the **job** first. When you meet a new name, ask which job it does.'
      }),

      B.cmp({
        id: 'm1-stores', t: 2, src: 'docs', title: 'Which database for which workload',
        say: 'Google Cloud has several databases, and the wrong one is expensive to move away from. Here is the usual map. Press Next to read the pattern.',
        cols: ['Service', 'Shape', 'Good at', 'Not for'],
        hl: 2,
        rows: [
          ['BigQuery', 'Columnar warehouse, SQL', 'Scans and aggregates over huge tables, analytics, ML in SQL', 'Single-row reads and writes that must answer in milliseconds'],
          ['Cloud SQL', 'MySQL, PostgreSQL or SQL Server, managed', 'An ordinary application database, up to a size that one primary can hold', 'Horizontal scale of writes across the world'],
          ['AlloyDB', 'PostgreSQL-compatible, built for speed', 'A busy PostgreSQL workload, with some analytics on the same data', 'A team that needs the cheapest small database'],
          ['Spanner', 'Relational, distributed, strongly consistent', 'Global scale with SQL and transactions', 'A small database: it is built for the large case'],
          ['Bigtable', 'Wide-column, key lookups', 'Huge volumes at low latency: time series, counters, a serving store', 'Ad hoc SQL, joins, or a poorly chosen row key'],
          ['Firestore', 'Documents', 'Application data for mobile and web', 'Analytics'],
          ['Cloud Storage', 'Objects', 'Files, raw copies, lake storage, exports', 'Updating a record in place']
        ],
        steps: [
          { upto: 2, say: 'BigQuery answers questions about many rows. Cloud SQL and AlloyDB run an application. A common design uses both: the tills write to a database, and the changes flow to BigQuery.' },
          { upto: 5, say: 'Spanner and Bigtable are for scale. Spanner keeps SQL and transactions across regions. Bigtable keeps speed and simplicity, and asks you to design the row key with care.' },
          { upto: 7, say: 'Firestore is for apps, and Cloud Storage is for files. A lake is files plus an engine that reads them.' }
        ],
        pick: 'The rule of thumb: **OLTP** (many small reads and writes) goes to a database, **OLAP** (few big reads) goes to BigQuery, and the two are joined by a change stream. A single BigQuery table is a poor application database, and Cloud SQL is a poor warehouse.'
      }),

      B.decide({
        id: 'm1-dec', t: 1, src: 'docs', title: 'Decision: where do the orders live?',
        scenario: 'The tills must save an order in a few milliseconds and never lose it. Analysts want to sum a year of orders across all stores, and a data scientist wants to train a model on them. A colleague says: "just use BigQuery for everything, it is serverless."',
        opts: [
          { t: 'Write orders straight into BigQuery from the tills, and query them there', d: 'One system, nothing to move.', lose: 'BigQuery is built for scans, not for a point write in milliseconds with no retry logic. A till would depend on a warehouse, and the cost of many tiny writes grows.' },
          { t: 'The tills write to Pub/Sub (or to an application database), and a pipeline loads BigQuery for analysis', d: 'The write path is fast and decoupled. The warehouse gets the data in a form made for scans.', lose: '' },
          { t: 'Keep orders in Cloud Storage files and let analysts open them from there', d: 'Cheap storage.', lose: 'Files are fine as a landing layer, but analysts and models need tables, partitions and SQL. Somebody must build all of that.' }
        ],
        pick: 1,
        why: 'Separate the system that takes the order from the system that analyses it. Pub/Sub or a database takes the write, and a pipeline lands the data in BigQuery. That is the shape of the whole course.',
        when: 'For a small shop with a few hundred orders a day, a BigQuery subscription on a Pub/Sub topic is enough, and there is no pipeline to run.'
      }),

      B.cmp({
        id: 'm1-exam', t: 1, src: 'docs', title: 'The Professional Data Engineer exam, and where this course covers it',
        say: 'Many job descriptions list the Professional Data Engineer certification as a plus, and some as a requirement. Google describes it in five areas. I read the certification page, and it gives the areas, the length and the format. Press Next to see where each area sits in this course.',
        cols: ['Area on the certification page', 'Missions here', 'What it is about'],
        hl: 1,
        rows: [
          ['Design data processing systems', '1, 2, 7, 8, 9', 'Choosing services, security, reliability, batch against streaming'],
          ['Ingest and process the data', '3, 7, 8, 9, 11', 'Pipelines, messaging, transfers, change data capture'],
          ['Store the data', '3, 4, 5, 11', 'Choosing a store, schemas, partitions, lifecycle'],
          ['Prepare and use data for analysis', '6, 12, 13', 'SQL, modelling, quality, masking, features'],
          ['Maintain and automate data workloads', '10, 14', 'Orchestration, monitoring, cost, delivery, recovery']
        ],
        steps: [
          { upto: 3, say: 'Design, ingest and store are the largest part of the work. They are missions 1 to 9 and 11.' },
          { upto: 5, say: 'Analysis and operations finish the loop: SQL, governance, models, orchestration and delivery.' }
        ],
        pick: 'The page I read in November 2026 says: 2 hours, 40 to 50 multiple choice and multiple select questions, recommended experience of 3 or more years with at least 1 designing and managing data solutions on Google Cloud, no prerequisite, valid for 2 years. **I could not open the full exam guide with its sub-sections and weights, so I do not quote weights.** Read the current guide before you plan your study.'
      }),

      B.cmp({
        id: 'm1-jd', t: 1, src: 'docs', title: 'What job descriptions ask for, and where it is here',
        say: 'I read a small sample of Google Cloud data engineer postings through search, including some in Singapore, Malaysia and Indonesia. It is a small sample, so read it as a direction and not a statistic. The same themes came back in almost every posting.',
        cols: ['What postings ask for', 'How often I saw it', 'Mission'],
        hl: 1,
        rows: [
          ['BigQuery, with partitioning, clustering and cost control', 'almost every posting', '4, 5, 6'],
          ['Advanced SQL and Python', 'almost every posting', 'all, 6'],
          ['Cloud Composer or Airflow', 'most', '10'],
          ['Dataflow and Apache Beam, Pub/Sub', 'most', '7, 8'],
          ['Cloud Storage', 'core, in most', '3'],
          ['Dataproc, Spark and PySpark', 'many', '9'],
          ['Dataform or dbt for transformations', 'many senior roles, either accepted', '6, 10'],
          ['Terraform, Git and CI/CD', 'often in senior and platform roles', '14'],
          ['IAM, masking, Dataplex, policy tags', 'in governance-flavoured roles', '2, 12'],
          ['Datastream, change data capture, migrations', 'several roles', '11'],
          ['Vertex AI, BigQuery ML, MLOps', 'in AI and ML flavoured roles', '13'],
          ['Cloud SQL, Spanner, Bigtable', 'nice to have, sometimes required', '1, 11'],
          ['The Professional Data Engineer certificate', 'often a plus, sometimes required', 'the exam screen above']
        ],
        steps: [
          { upto: 5, say: 'The core stack: BigQuery, SQL, Composer, Dataflow, Pub/Sub and Cloud Storage. If you can do these well, you can answer most of a posting.' },
          { upto: 9, say: 'The next layer: Spark, Dataform or dbt, Terraform and CI, and governance. Seniors are expected to have an opinion on each.' },
          { upto: 13, say: 'Then the extras: change data capture, ML, other databases and the certificate.' }
        ],
        pick: 'This table is a **sample of search results**, not a survey. Check the postings that you care about, and treat the missions as a way to cover what they name.'
      }),

      B.rows({
        id: 'm1-cli', t: 1, src: 'rec', title: 'Check a flag before you use it',
        steps: [{
          say: 'The command line tools are part of every job, and flag names change between versions. This course names a lot of flags, so I checked every one of them against the installed help pages of gcloud ' + G.meta('gcloud') + ' and bq ' + G.meta('bq') + '. The tools ran offline: help pages need no account. ' + CS.commands_checked + ' commands, and no flag is missing. One needed a correction on the way: the idle timeout of a Dataproc cluster is `--delete-max-idle`, not `--max-idle`.',
          tabs: [{ layer: 'FLAGS', name: 'Flags found in the help pages', c: 'raw', cols: ['command', 'flags found'], rows: FL.rows.map(function (r) { return [r[0], r[1].split(' ').length + ' of ' + (r[1].split(' ').length + (r[2] === '-' ? 0 : r[2].split(' ').length))]; }), trk: 0 }],
          notes: ['Recorded: the help pages of the real command line tools, run offline. Nothing here called Google Cloud. A flag that exists in the help can still need a permission or an API that your project has not enabled.']
        }]
      }),

      B.talk({
        id: 'm1-names', t: 1, src: 'docs', title: 'Names, ids and labels',
        say: 'Four names that people mix up, and one habit that saves money later. Press Next for each.',
        items: [
          ['Project name, id and number', 'The **name** is for people and can change. The **id** is unique in the world, chosen once, and cannot be reused after the project is deleted. The **number** is assigned by Google. Commands and Terraform use the id, and service account emails contain it.', 'Use the id in code and the name in slides.'],
          ['Global and local names', 'A **bucket** name is unique across all of Google Cloud, so `brewline-landing-dev` can be taken by somebody else. A **dataset** name is unique only inside its project. A **topic** name is unique inside its project. Plan a naming scheme with the environment and a company prefix.', 'Bucket names are global. Everything else is per project.'],
          ['Configurations in gcloud', 'The command line keeps a default project, account and region in a **configuration**. Running a destructive command with the wrong default project is a classic mistake. Name your configurations after your environments and read the prompt before you press Enter.', 'Check which project a command will touch.'],
          ['Labels', '**Labels** are key and value pairs on most resources, for example `team=data` and `env=dev`. They show up in the billing export and in the job history, so they are how you answer "who spent this". Set them in Terraform and on every query that a pipeline runs.', 'Cost without labels is a guess.']
        ],
        cols: 1
      }),

      B.quiz({
        id: 'm1-q1', t: 1,
        q: 'A dataset was created in the wrong location. What can you do?',
        opts: [
          { t: 'Edit the location of the dataset in the console', fb: 'The location of a dataset is fixed when it is created. There is no edit.' },
          { t: 'Create a new dataset in the right location, copy the tables, and move the pipelines', fb: '' },
          { t: 'Add a label with the right location', fb: 'A label is metadata. It does not move any data.' },
          { t: 'Ask support to change it', fb: 'Support cannot change it either. A copy is the way.' }
        ],
        ok: 1,
        why: 'A location is chosen once. The copy is a planned task with a cut-over, which is why the location belongs in the design.'
      }),

      B.quiz({
        id: 'm1-q2', t: 1,
        q: 'Where do billing, quotas and the list of enabled APIs live?',
        opts: [
          { t: 'On each resource', fb: 'A bucket or a dataset does not have its own quota or its own list of APIs.' },
          { t: 'On the project', fb: '' },
          { t: 'On the folder only', fb: 'A folder can carry policies and access, but costs and quotas are per project.' },
          { t: 'On the service account', fb: 'A service account is an identity that lives in a project. It is not a billing unit.' }
        ],
        ok: 1,
        why: 'The project is the unit of cost, quota and enabled APIs, and the default boundary of access. That is why a dev and a prod project are separate.'
      }),

      B.quiz({
        id: 'm1-q3', t: 2,
        q: 'A dashboard needs a sum over a year of orders, and the till needs a point write in 5 ms. One table in one service for both?',
        opts: [
          { t: 'Yes: BigQuery handles both', fb: 'BigQuery is built for large scans. It is not a low-latency transactional store.' },
          { t: 'No: a database or messaging for the write, and a pipeline into BigQuery for the sum', fb: '' },
          { t: 'Yes: Cloud Storage handles both', fb: 'Files cannot be updated in place and have no SQL.' },
          { t: 'No: use Bigtable for the dashboard', fb: 'Bigtable serves key lookups. A sum across a year is a scan, which BigQuery does better.' }
        ],
        ok: 1,
        why: 'Two workloads, two shapes. Join them with a change stream or a message, not with a compromise.'
      }),

      B.order({
        id: 'm1-ord', t: 1, q: 'Put the setup of a new data project in a sensible order.',
        items: [
          'Create the project in the right folder',
          'Link a billing account and set a budget',
          'Enable only the APIs that you need',
          'Create service accounts, one for each job',
          'Grant each one the smallest role on the smallest resource',
          'Create the datasets and buckets in one location'
        ],
        why: 'A project without billing cannot create most resources, and a budget protects you from the first mistake. APIs are off until you enable them. Identities come before grants, and grants come before the data, so nothing is ever open by default.'
      }),

      B.bug({
        id: 'm1-bug', t: 1, q: 'A teammate runs this to clean up a test dataset. Their shell still points at the production project from an earlier task. Click the line that makes it dangerous.',
        file: 'cleanup.sh', lang: 'bash',
        code: 'gcloud config list project\n# project = brewline-prod\nbq rm -r -f -d scratch\nbq ls',
        bad: [3],
        hint: 'Which project does this command touch?',
        why: 'Line 3 names only a dataset. `bq` resolves it in the **default project**, which the listing on line 1 showed to be production. Name the project in the command (`brewline-dev:scratch`), or set the project for the shell with `--project_id`, and never use `-f` where a prompt would have saved you.',
        fix: 'gcloud config list project\n# project = brewline-prod  <- stop here\nbq rm -r -d brewline-dev:scratch\nbq ls --project_id=brewline-dev',
        cheer: 'Name the project in the command.'
      }),

      B.incident({
        id: 'm1-inc', t: 1, src: 'docs', title: 'Incident: "Not found: dataset in location US"', time: '09:20',
        alert: '**A new report fails with: dataset brewline-dev:curated was not found in location US.** The dataset exists, and a colleague can open it in the console. The report is run by a script on a laptop.',
        clues: ['The dataset is in asia-southeast1', 'The script does not set a location', 'The same query works in the console'],
        opts: [
          { t: 'Set the location of the job to `asia-southeast1` in the script, and add it to the shared client settings', fb: '' },
          { t: 'Recreate the dataset in the US', fb: 'It would move data to a place that you did not choose, and break the rule about where data lives.' },
          { t: 'Grant the analyst the owner role', fb: 'The error is about location, not permission. A bigger role changes nothing.' },
          { t: 'Retry later', fb: 'The job will fail the same way every time, because it is sent to the wrong location.' }
        ],
        best: 0,
        why: 'A query job runs in a location. Without one, the client picks a default, and a dataset elsewhere is "not found" there. The console works because it reads the location of the dataset for you.',
        checks: [
          ['Read the location', 'Show the location of the dataset in the console or with `bq show`.'],
          ['Read the job', 'Look at the location of the failed job in the job history.'],
          ['Fix the client', 'Set the location in the client and in the shared settings of the team.'],
          ['Prevent', 'Add an organization policy for allowed locations, so that a dataset cannot be created in the wrong place.']
        ],
        tell: 'The report ran its query in the default location, and the data is in Singapore. I set the location on the client, and the report worked. I added the location to our shared settings and to the checklist for new datasets.',
        prevent: ['Set the location in every client and template', 'Restrict resource locations with an organization policy', 'Create datasets only through Terraform, with the location written in the code']
      }),

      B.qa({
        id: 'qa-hier', t: 1, tag: 'Platform', secs: 75,
        q: 'Explain the resource hierarchy of Google Cloud and why a project matters.',
        pts: ['Organization, folders, projects, resources', 'Policies and access are inherited downward', 'A project is the unit of billing, quotas and enabled APIs', 'Separate projects for dev and prod', 'Resources like buckets and datasets live in a project'],
        short: 'The organization is the root, folders group projects, and projects hold the resources: buckets, datasets, topics and service accounts. Access and organization policies are inherited downward, so a role on a folder reaches every project in it.\n\nA project is the working unit. Billing, quotas and the list of enabled APIs are set per project, and access is usually decided there. That is why I use separate projects for dev and prod: a mistake or a runaway query in dev cannot spend production quota or touch production data.',
        fu: [['Where would you grant analysts read access?', 'On the curated dataset, to a group. Not on the project, and not to people one by one.'], ['What does a folder add?', 'A place to apply access and policies to a set of projects, for example all data projects of one team.']],
        trap: 'Listing the levels without saying what inherits what, or saying that a project is just a folder of resources.',
        real: 'Describe how the projects of a company you know were organised, and what you would change.'
      }),

      B.qa({
        id: 'qa-loc', t: 1, tag: 'Platform', secs: 75,
        q: 'Why does the location of a dataset or a bucket matter?',
        pts: ['Chosen at creation and cannot be changed', 'Queries run where the data is', 'No joins across locations', 'Load jobs and buckets should match', 'Cross-region traffic costs time and money', 'Residency rules'],
        short: 'The location of a BigQuery dataset or a Cloud Storage bucket is set at creation and cannot be edited. To change it you copy the data and move the pipelines, so I treat the location as a design decision.\n\nIt matters because compute follows data. A BigQuery query runs where the data is and cannot join tables from different locations. A load job wants the bucket in the same location as the dataset. Dataflow and Dataproc jobs that read and write across regions are slower and cost egress. And some data must stay in a country, which I enforce with an organization policy on allowed locations.',
        fu: [['What is a typical symptom of a location mistake?', 'A "not found in location" error from a client that did not set the location, or a failed join between two datasets.'], ['Region or multi-region?', 'A region when residency or latency to the sources matters, a multi-region when you want availability across a geography and accept less control.']],
        trap: 'Saying that you can change the location later in the settings.',
        real: 'Tell me about a time data and compute were in different places, and what it cost you.'
      }),

      B.qa({
        id: 'qa-db', t: 2, tag: 'Platform', secs: 90,
        q: 'You are asked to pick a database for a new workload. How do you decide between BigQuery, Cloud SQL, Spanner and Bigtable?',
        pts: ['Start from the access pattern', 'Scans and aggregates: BigQuery', 'Application transactions at normal scale: Cloud SQL or AlloyDB', 'Global scale with SQL and transactions: Spanner', 'Huge volume, key lookups, low latency: Bigtable', 'Often two: a database and a warehouse joined by a change stream'],
        short: 'I start from the access pattern, not the product. If the question is "sum or count over many rows", it is BigQuery. If it is an application that reads and writes single rows with transactions, it is Cloud SQL or AlloyDB. If that application needs global scale and strong consistency, it is Spanner. If it is a huge number of key lookups at low latency, such as a serving store for time series, it is Bigtable, and I spend my effort on the row key.\n\nVery often the answer is two systems: the application database takes the writes, and a change stream, with Datastream for example, feeds BigQuery for analysis.',
        fu: [['What is the cost of choosing Bigtable for analytics?', 'No ad hoc SQL and no joins. You would rebuild a warehouse on top of it.'], ['And BigQuery for the application?', 'Single-row work is the wrong shape for it, and many small writes are slower and costlier than a database.']],
        trap: 'Naming the most scalable product for everything. The interviewer wants the access pattern first.',
        real: 'Describe a system you built with two data stores, and how data moved between them.'
      }),

      B.qa({
        id: 'qa-exam', t: 2, tag: 'Platform', secs: 60,
        q: 'How would you prepare for the Professional Data Engineer exam, and is it worth it?',
        pts: ['Read the current exam guide and its five areas', 'Hands-on in each area, and not just reading', 'Know the choice between services, not just each service', 'Practise reading a scenario for the constraint', 'It signals knowledge, and is a plus in many postings, not a substitute for experience'],
        short: 'I would start with the current exam guide, which lists five areas: designing data processing systems, ingesting and processing data, storing data, preparing and using data for analysis, and maintaining and automating workloads. Then I would build something in each area, because the questions describe a situation and ask which service and which setting fit it.\n\nThe skill that the exam tests most is choice: batch or streaming, Dataflow or Dataproc or SQL, which database, which security control. It is a useful signal and many postings list it as a plus, but a design that I can explain from experience is worth more in an interview.',
        fu: [['What would you do in the last week?', 'Practise scenario questions, and write down the reason that each wrong answer is wrong.'], ['What do you do if you meet a new product?', 'Place it in the map: which job it does, and what it replaces.']],
        trap: 'Saying that you will memorise product lists.',
        real: 'Say how you keep up with a cloud platform that changes every month.'
      }),

      B.recap({
        id: 'm1-recap', n: 1, badge: 'Cloud Mapper', color: '#FDE68A',
        pts: [
          'The hierarchy is **organization, folders, projects, resources**. Access and policies are inherited downward.',
          'A **project** is the unit of **cost, quota, enabled APIs and access**. Keep dev and prod apart.',
          'A **location** is chosen once. Data and compute must be in the same place, and **jobs need a location** too.',
          'Learn the service by its **job**: land, process, store, orchestrate, govern, serve, learn.',
          'Pick a database by the **access pattern**. Scans go to BigQuery, application transactions go to a database, and a change stream joins them.',
          'The exam has **five areas**, and job descriptions ask most for **BigQuery, SQL, Composer, Dataflow, Pub/Sub, Cloud Storage and Terraform**.'
        ],
        lines: [
          'I name the project and the location in every command.',
          'I choose by the shape of the work, not by the name of the product.',
          'I check a flag in the help page before I put it in a script.'
        ]
      })
    ]
  });
})();
