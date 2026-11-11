/* Mission 0: pick a path, see the whole platform, meet the Brewline setup on Azure, and learn what the tags mean. */
(function () {
  var B = LAB.b, G = LAB.get;
  var VER = 'the Azure SDK for Python (azure-storage-blob ' + G.meta('azure-storage-blob') + ') and Azurite ' + G.meta('azurite');

  LAB.addChapter({
    id: 'm0', n: 0, noIntro: true, title: 'Start here', short: 'Start', blurb: 'Pick your path and see the whole platform', minutes: 9,
    scenes: [
      B.welcome({ id: 'welcome' }),

      B.flow({
        id: 'm0-map', t: 1, src: 'docs', title: 'Brewline on Azure: the whole picture', g: 'master', legend: true,
        steps: [
          { say: 'Brewline sells coffee online, and now it is opening a European branch. Its orders sit in an Azure SQL database, its website sends click events, and suppliers send files. This course builds the data platform on Azure: a lake in ADLS Gen2, pipelines that move and clean the data, and two ways to query it. Press Next to follow one order through.', cap: 'The whole platform on one page.' },
          { say: 'Step 1. Data reaches the lake in three ways. Data Factory copies the changed rows of the orders database. Event Hubs collects the website events. Suppliers upload files, or a script runs AzCopy. Everything lands in the RAW zone exactly as it arrived.', on: ['e1a', 'e1b', 'e1c'], focus: ['ld_db', 'ld_web', 'ld_csv', 'raw'], cap: 'Three sources, one landing zone.' },
          { say: 'Step 2. Data Factory does the moving. A pipeline starts on a trigger, runs its activities in order, and copies data with an integration runtime. You pay for the activity runs and for the data movement while it runs. Heavier cleaning runs in Spark, on Databricks or in Synapse.', on: ['e6'], focus: ['adf', 'clean'], cap: 'Compute starts for a run and stops after it.' },
          { say: 'Step 3. RAW keeps the data as received, in folders named by arrival date. Nothing is cleaned. If a rule turns out wrong, you rebuild the later zones from here without asking the source again.', on: ['e1a', 'e1b', 'e1c'], focus: ['raw'], cap: 'RAW is the copy you can always rebuild from.' },
          { say: 'Step 4. CLEAN holds typed Parquet files with duplicates removed. Columnar files let a query read only the columns it names, which is the main lever on the serverless SQL bill.', on: ['e2'], focus: ['raw', 'clean'], cap: 'Parquet is smaller and cheaper to read.' },
          { say: 'Step 5. CURATED holds the tables that the business reads: revenue by day, customers with their tier. They are small, named for questions, and rebuilt or updated on a schedule.', on: ['e3'], focus: ['clean', 'cur'], cap: 'Business tables, small and named.' },
          { say: 'Step 6. Analysts query CURATED with Synapse, which reads the files in place. Power BI reads the same tables for dashboards. A serverless SQL pool bills for the data it processes, and a dedicated pool bills for the hours it runs.', on: ['e5a', 'e5b'], focus: ['cur', 'syn', 'pbi'], cap: 'Two ways to ask questions of the same tables.' },
          { say: 'Around the flow sit five controls. Entra ID decides who may do what. Key Vault and private network paths protect secrets and data. Monitor and budgets watch the platform. Event Grid starts work when a file lands. Bicep builds all of it from files. Each one has a mission.', focus: ['c_iam', 'c_sec', 'c_ops', 'c_flow', 'c_iac'], keepGroups: true, cap: 'Five controls around the data path.' }
        ]
      }),

      B.cmp({
        id: 'm0-levels', t: 1, src: 'docs', title: 'Junior or senior: what changes',
        say: 'The same services, different expectations. Press Next to read the gap area by area. A senior is judged on decisions and on what happens when something breaks, not on knowing more service names.',
        cols: ['Area', 'A junior is expected to', 'A senior is expected to'],
        hl: 2,
        rows: [
          ['Tenant and the bill', 'Say what a subscription, a region and a resource group are.', 'Design subscriptions, find the meter that grew, and cut the bill without breaking a pipeline.'],
          ['Storage', 'Upload, list and read blobs, and explain a container and a prefix.', 'Design the layout, redundancy, tiers, lifecycle, protection and events of a lake.'],
          ['Identity', 'Read a role assignment and say what it allows.', 'Design least-privilege roles and ACLs, debug a 403, and replace secrets with managed identities.'],
          ['Data Factory', 'Build a copy pipeline with a trigger.', 'Design incremental loads, retries, idempotency, runtimes and the release path.'],
          ['Spark and the catalog', 'Know where Spark runs on Azure.', 'Choose between Databricks, Synapse Spark and Fabric, and govern data with a catalog.'],
          ['Synapse serverless', 'Query a file with OPENROWSET.', 'Cut the data processed with Parquet, folders and filepath(), and set cost limits.'],
          ['Dedicated SQL pool', 'Load a table with COPY INTO.', 'Choose distributions and indexes, find data movement, and decide pause, scale or move to Fabric.'],
          ['Event Hubs', 'Send events to an event hub.', 'Pick the partition key, size the throughput, checkpoint safely and handle duplicates.'],
          ['Events and Functions', 'Trigger a function from a new blob.', 'Design retries, poison queues and idempotent handlers.'],
          ['Security', 'Know that data is encrypted.', 'Design Key Vault, private endpoints, customer-managed keys and column protection.'],
          ['Operations and delivery', 'Read a log and deploy a template.', 'Run budgets, alerts and KQL, and promote changes through what-if, tests and approval.']
        ],
        steps: [
          { upto: 4, say: 'Tenant, storage, identity and Data Factory. A junior uses them. A senior decides how they are laid out and locked down.' },
          { upto: 8, say: 'Spark, Synapse and Event Hubs. These are the places where a design mistake becomes a bill or an outage.' },
          { upto: 11, say: 'Events, security, operations and delivery. They decide whether the platform stays safe, repeatable and affordable.' }
        ],
        pick: '**Junior path** if you are starting out or interviewing for a junior data engineer role. **Senior path** if you have used Azure already: it includes every junior topic and adds the design, security, cost and release decisions. **Everything** adds the newest features and the deepest follow-up questions.'
      }),

      B.rows({
        id: 'm0-setup', t: 1, src: 'docs', title: 'Meet the Brewline setup on Azure',
        steps: [
          {
            say: 'This is the setup the course assumes. Brewline uses one subscription for each environment, and each subscription has resource groups that hold the resources of one job.',
            tabs: [{
              layer: 'SUBSCRIPTIONS', name: 'Subscriptions and resources', c: 'raw',
              cols: ['Subscription', 'Resource group', 'Main resources', 'Who works there'],
              rows: [
                ['sub-brewline-prod', 'rg-brewline-data-prod', 'stbrewlinelakeprod, adf-brewline-prod, syn-brewline-prod, evhns-brewline-prod, kv-brewline-prod', 'the pipelines, and the deployment identity'],
                ['sub-brewline-dev', 'rg-brewline-data-dev', 'stbrewlinelakedev, adf-brewline-dev', 'the engineers, with room to break things'],
                ['sub-brewline-platform', 'rg-brewline-monitor', 'log-brewline-prod, a storage account for audit logs', 'security and operations']
              ],
              trk: 0
            }],
            notes: ['A storage account name is 3 to 24 lower-case letters and digits, and it is unique across all of Azure. That is why `stbrewlinelakeprod` has no dashes. The names follow a common convention of a short type prefix. They are a design for this course, and the reasons matter more than the names.']
          },
          {
            say: 'Identities, not people, do the work. Each pipeline, function and group of people gets an identity with the access its job needs and no more.',
            tabs: [{
              layer: 'IDENTITIES', name: 'Identities and what they may do', c: 'raw',
              cols: ['Identity', 'Used by', 'Allowed to', 'Why it exists'],
              rows: [
                ['id-brewline-adf', 'Data Factory', 'write the lake, read secrets in Key Vault', 'pipelines sign in with no secret'],
                ['id-brewline-synapse', 'the Synapse workspace', 'read the lake', 'serverless SQL reads files as itself'],
                ['id-brewline-func', 'the function app', 'use queues, write curated', 'handlers sign in with no secret'],
                ['brewline-analysts', 'people, through single sign-on', 'read curated', 'analysts never touch raw data'],
                ['gh-brewline-deploy', 'GitHub Actions', 'change the resource groups', 'deployments leave a trail and need no stored secret']
              ],
              trk: 0
            }],
            notes: ['Mission 3 builds these identities and shows what happens when one of them is wrong.']
          }
        ]
      }),

      B.talk({
        id: 'm0-how', t: 1, src: 'rec', title: 'How this course works',
        say: 'Six quick things before we start. Press Next for each.',
        items: [
          ['SEE, TRY, SAY', 'Every mission watches something work (**SEE**), makes you practise it (**TRY**), then asks the interview question out loud (**SAY**). Orange blocks in a diagram are data moving. Numbers show the order.', 'Watch first, practise second, speak third.'],
          ['Junior, Senior, Extra', 'A small tag on a screen tells you who it is for. No tag means everybody. **Senior** and **Extra** screens appear only on the wider paths.', 'The tag tells you whether a screen is on your path.'],
          ['Two kinds of screen', 'A **Recorded** tag means I ran something on one machine and wrote down what it did: ' + VER + ' (the real Azure client library against a storage emulator of Microsoft), azure-identity, azure-eventhub, DuckDB and pyarrow for file sizes, and pytest. A **From documentation** tag means the fact comes from the public Azure pages as I found them. Nothing in this course ran on Azure.', 'Recorded, or from documentation. Never both, never guessed.'],
          ['The emulator is not Azure', 'Azurite answers the calls the way Azure documents them, but it is a different program. It has no soft delete, no versioning, no ADLS Gen2 directories and no user delegation SAS, and it names a few error codes differently. I used its output only where the documentation says the same thing, and every screen that needs more says so.', 'An emulator proves the SDK side, not the service side.'],
          ['Prices are examples', 'Every price in this course is an example taken from public pages and third-party guides, and Microsoft changes prices. A lab that shows a bill is arithmetic on example rates. Read the pricing page of your region before you promise a number.', 'The shape of the bill is the lesson. The numbers are not a quote.'],
          ['Controls', 'Press the right and left arrow keys to move. **A-** and **A+** change the text size. **Map** jumps to any mission and switches path. Your progress saves in this browser.', 'Next, Back, arrow keys, Map.']
        ],
        cols: 1
      })
    ]
  });
})();
