/* Mission 0: pick a path, see the whole platform, meet the Brewline setup, and learn what the tags mean. */
(function () {
  var B = LAB.b, G = LAB.get;
  var VER = 'boto3 ' + G.meta('boto3') + ' and moto ' + G.meta('moto');

  LAB.addChapter({
    id: 'm0', n: 0, noIntro: true, title: 'Start here', short: 'Start', blurb: 'Pick your path and see the whole platform', minutes: 9,
    scenes: [
      B.welcome({ id: 'welcome' }),

      B.flow({
        id: 'm0-map', t: 1, src: 'docs', title: 'Brewline on AWS: the whole picture', g: 'master', legend: true,
        steps: [
          { say: 'Brewline sells coffee online. Its orders sit in a database, its website sends click events, and suppliers send files. This course builds the data platform on AWS: an S3 lake, a catalog, jobs that clean the data, and two ways to query it. Press Next to follow one order through.', cap: 'The whole platform on one page.' },
          { say: 'Step 1. Data reaches S3 in three ways. The Database Migration Service copies the changes of the orders database. Kinesis and Firehose collect the website events. Suppliers upload files, or a script runs `aws s3 sync`. Everything lands in the RAW zone exactly as it arrived.', on: ['e1a', 'e1b', 'e1c'], focus: ['ld_db', 'ld_web', 'ld_csv', 'raw'], cap: 'Three sources, one landing zone.' },
          { say: 'Step 2. Glue jobs do the work. A job starts Spark workers, reads files from one zone and writes files to the next. You pay for the Data Processing Units (DPUs) while the job runs. The Glue Data Catalog stores the table definitions that the jobs and the query engines share.', on: ['e6'], focus: ['glue', 'clean'], cap: 'Compute starts for a run and stops after it.' },
          { say: 'Step 3. RAW keeps the data as received, in folders named by arrival date. Nothing is cleaned. If a rule turns out wrong, you rebuild the later zones from here without asking the source again.', on: ['e1a', 'e1b', 'e1c'], focus: ['raw'], cap: 'RAW is the copy you can always rebuild from.' },
          { say: 'Step 4. CLEAN holds typed Parquet files with duplicates removed. Columnar files let Athena read only the columns a query names, which is the main lever on the Athena bill.', on: ['e2'], focus: ['raw', 'clean'], cap: 'Parquet is smaller and cheaper to scan.' },
          { say: 'Step 5. CURATED holds the tables that the business reads: revenue by day, customers with their tier. They are small, named for questions, and rebuilt or updated on a schedule.', on: ['e3'], focus: ['clean', 'cur'], cap: 'Business tables, small and named.' },
          { say: 'Step 6. Analysts query CURATED with Athena, which reads the files in S3 and bills for the bytes it reads. A dashboard tool reads it through Redshift, which keeps hot data on its own storage. Both use the same table definitions from the catalog.', on: ['e5a', 'e5b'], focus: ['cur', 'ath', 'rs'], cap: 'Two ways to ask questions of the same tables.' },
          { say: 'Around the flow sit five controls. IAM decides who may do what. Keys and private network paths protect the data. Alarms and budgets watch the platform. Step Functions runs the jobs in order. CloudFormation builds all of it from files. Each one has a mission.', focus: ['c_iam', 'c_sec', 'c_ops', 'c_flow', 'c_iac'], keepGroups: true, cap: 'Five controls around the data path.' }
        ]
      }),

      B.cmp({
        id: 'm0-levels', t: 1, src: 'docs', title: 'Junior or senior: what changes',
        say: 'The same services, different expectations. Press Next to read the gap area by area. A senior is judged on decisions and on what happens when something breaks, not on knowing more service names.',
        cols: ['Area', 'A junior is expected to', 'A senior is expected to'],
        hl: 2,
        rows: [
          ['Account and bill', 'Say what an account, a Region and a bucket are.', 'Design accounts, find the line that grew, and cut the bill without breaking a job.'],
          ['S3', 'Upload, list and read objects, and explain a prefix.', 'Design the layout, file sizes, lifecycle, versioning and events of a lake.'],
          ['IAM', 'Read a policy and say what it allows.', 'Write least-privilege roles, debug an AccessDenied, and set up cross-account access.'],
          ['Glue and the catalog', 'Run a crawler and a Glue job.', 'Size workers, handle schema changes, bookmarks and partitions, and choose Glue or EMR.'],
          ['Athena', 'Write a query and read the scanned bytes.', 'Cut the scan with Parquet, partitions and projection, and set workgroup limits.'],
          ['Redshift', 'Load a table with COPY.', 'Choose distribution and sort keys, size the cluster, and decide between Redshift and Athena.'],
          ['Streaming', 'Send a record to a stream.', 'Pick the partition key, size the shards, handle a hot shard and replay.'],
          ['Events and queues', 'Trigger a Lambda function from S3.', 'Design retries, dead-letter queues and idempotent consumers.'],
          ['Orchestration', 'Read a state machine.', 'Design retries, catches, parallel work and a restart after a failure.'],
          ['Security', 'Know that data is encrypted.', 'Design keys, private network paths, secrets and the audit trail.'],
          ['Delivery', 'Deploy a template.', 'Run changes through tests, change sets and promotion across accounts.']
        ],
        steps: [
          { upto: 4, say: 'Account, S3, IAM and the catalog. A junior uses them. A senior decides how they are laid out and locked down.' },
          { upto: 8, say: 'Athena, Redshift, streaming and events. These are the places where a design mistake becomes a bill or an outage.' },
          { upto: 11, say: 'Orchestration, security and delivery. They decide whether the platform stays safe, repeatable and affordable.' }
        ],
        pick: '**Junior path** if you are starting out or interviewing for a junior data engineer role. **Senior path** if you have used AWS already: it includes every junior topic and adds the design, security, cost and release decisions. **Everything** adds the newest features and the deepest follow-up questions.'
      }),

      B.rows({
        id: 'm0-setup', t: 1, src: 'docs', title: 'Meet the Brewline setup',
        steps: [
          {
            say: 'This is the setup the course assumes. Brewline uses one AWS account for each environment, and each account has a lake bucket with a zone for each stage of the data.',
            tabs: [{
              layer: 'ACCOUNTS', name: 'Accounts and buckets', c: 'raw',
              cols: ['Account', 'Bucket', 'Who writes there', 'What lives there'],
              rows: [
                ['brewline-prod', 'brewline-lake-prod', 'the loaders and the jobs', 'raw/, clean/ and curated/ with the real data'],
                ['brewline-dev', 'brewline-lake-dev', 'the engineers', 'a small copy of the data to test changes'],
                ['brewline-prod', 'brewline-athena-results-prod', 'Athena', 'query results, expired after 7 days'],
                ['brewline-log', 'brewline-audit-logs', 'AWS services', 'CloudTrail and access logs, written and never edited']
              ],
              trk: 0
            }],
            notes: ['Bucket names are global across all AWS accounts, so a company prefix and an environment help avoid clashes. The names are a design for this course. A real company will differ, and the reasons matter more than the names.']
          },
          {
            say: 'Roles, not people, do the work. Each job and each group of people gets a role with the access its job needs and no more.',
            tabs: [{
              layer: 'IDENTITIES', name: 'Roles and who assumes them', c: 'raw',
              cols: ['Role', 'Assumed by', 'Allowed to', 'Why it exists'],
              rows: [
                ['brewline-glue-etl', 'the Glue jobs', 'read raw/, write clean/ and curated/', 'a job should write only where it must'],
                ['brewline-analyst', 'people, through single sign-on', 'run Athena queries, read curated/', 'analysts never touch raw data'],
                ['brewline-loader', 'DMS and Firehose', 'write raw/ only', 'loaders cannot read or delete what they wrote'],
                ['brewline-ci-deploy', 'the CI pipeline', 'create and update the stacks', 'deployments leave a trail and need no stored keys']
              ],
              trk: 0
            }],
            notes: ['Mission 3 builds these roles and shows what happens when one of them is wrong.']
          }
        ]
      }),

      B.talk({
        id: 'm0-how', t: 1, src: 'rec', title: 'How this course works',
        say: 'Five quick things before we start. Press Next for each.',
        items: [
          ['SEE, TRY, SAY', 'Every mission watches something work (**SEE**), makes you practise it (**TRY**), then asks the interview question out loud (**SAY**). Orange blocks in a diagram are data moving. Numbers show the order.', 'Watch first, practise second, speak third.'],
          ['Junior, Senior, Extra', 'A small tag on a screen tells you who it is for. No tag means everybody. **Senior** and **Extra** screens appear only on the wider paths.', 'The tag tells you whether a screen is on your path.'],
          ['Two kinds of screen', 'A **Recorded** tag means I ran something on one machine and wrote down what it did: ' + VER + ' (the real AWS SDK against an AWS emulator), DuckDB and pyarrow for file sizes, cfn-lint and parliament for templates and policies, and pytest. A **From documentation** tag means the fact comes from the public AWS pages as I found them. Nothing in this course ran on AWS.', 'Recorded, or from documentation. Never both, never guessed.'],
          ['The emulator is not AWS', 'moto answers the calls the way AWS documents them, but it is a different program. I used its output only where the documentation says the same thing, and I did not use its quirks: its sequence numbers, its instant Firehose delivery, its Step Functions runs. Where it could not show a behaviour, the screen says so.', 'An emulator proves the SDK side, not the service side.'],
          ['Prices are examples', 'Every price in this course is an example taken from public pages, and AWS changes prices. A lab that shows a bill is arithmetic on example rates. Read the pricing page of your Region before you promise a number.', 'The shape of the bill is the lesson. The numbers are not a quote.'],
          ['Controls', 'Press the right and left arrow keys to move. **A-** and **A+** change the text size. **Map** jumps to any mission and switches path. Your progress saves in this browser.', 'Next, Back, arrow keys, Map.']
        ],
        cols: 1
      })
    ]
  });
})();
