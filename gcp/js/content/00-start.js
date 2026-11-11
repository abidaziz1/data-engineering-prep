/* Mission 0: pick a path, see the whole platform on Google Cloud, meet the Brewline setup, and learn what the tags mean. */
(function () {
  var B = LAB.b, G = LAB.get;
  var D = G.counts('sql.world');
  G.expect(D.orders === 20000 && D.raw_deliveries === 20600 && D.days === 14 && D.stores === 12 && D.customers === 2000, 'the size of the Brewline data');
  var TOOLS = 'the Cloud Storage client ' + G.meta('google-cloud-storage') + ' on an emulator, the BigQuery client ' + G.meta('google-cloud-bigquery') + ' (offline), the Pub/Sub client ' + G.meta('google-cloud-pubsub') + ' (offline), sqlglot ' + G.meta('sqlglot') + ' with DuckDB ' + G.meta('duckdb') +
    ', Apache Beam ' + G.meta('apache-beam') + ', Apache Airflow ' + G.meta('apache-airflow') + ', the Dataform compiler ' + G.meta('dataform-cli') + ', the Functions Framework with pytest, Checkov ' + G.meta('checkov') + ', check-jsonschema ' + G.meta('check-jsonschema') + ', PySpark ' + G.meta('pyspark') +
    ', and the gcloud ' + G.meta('gcloud') + ' and bq ' + G.meta('bq') + ' help pages';
  var n0 = function (x) { return x.toLocaleString('en-US'); };

  LAB.addChapter({
    id: 'm0', n: 0, noIntro: true, title: 'Start here', short: 'Start', blurb: 'Pick your path and see the whole platform on Google Cloud', minutes: 9,
    scenes: [
      B.welcome({ id: 'welcome' }),

      B.flow({
        id: 'm0-map', t: 1, src: 'docs', title: 'Brewline on Google Cloud: the whole picture', g: 'master', legend: true,
        steps: [
          { say: 'Brewline sells coffee in six countries, and its Asia-Pacific team is moving its data to Google Cloud, in the Singapore region. Orders come from the stores, customers from an app, products from an ERP database and campaign files from partners. This course builds the data platform, one layer at a time. Press Next to walk through it.', cap: 'The whole platform on one page.' },
          { say: 'Step 1. The sources. Store tills send an event for every order. The ERP database changes all day. Partners drop files. Each one has a different way of arriving, and a different way of going wrong.', on: ['m1'], focus: ['s_src', 's_land'], cap: 'Three kinds of source, three ways to land.' },
          { say: 'Step 2. Landing. Pub/Sub carries the events, Datastream follows the changes of the database, and Cloud Storage holds the files. Nothing is cleaned yet. The first rule is to keep what arrived.', on: ['m2'], focus: ['s_land', 's_proc'], cap: 'Keep what arrived, as it arrived.' },
          { say: 'Step 3. Processing. Dataflow runs streaming and batch pipelines written with Apache Beam. Dataproc runs Spark. Dataform runs SQL inside BigQuery. You choose by the shape of the work, not by habit.', on: ['m3'], focus: ['s_proc', 's_wh'], cap: 'Three engines, each for a shape of work.' },
          { say: 'Step 4. The warehouse. BigQuery holds the data in layers: raw as it landed, staging cleaned, curated for people. Partitions and clusters decide what a query reads, and so what it costs.', on: ['m3'], focus: ['s_wh'], cap: 'BigQuery holds three layers.' },
          { say: 'Step 5. Use. Dashboards read the curated tables. BigQuery ML and Vertex AI train models on them. The same rules about who may see a column apply to all of them.', on: ['m4'], focus: ['s_wh', 's_use'], cap: 'People and models read the curated layer.' },
          { say: 'Around the flow sit six controls. IAM decides who may do what. Composer runs the jobs in order and retries them. Dataplex keeps the catalog and the quality checks. Monitoring tells you when something is late. Terraform keeps the setup as code. Cost watches the bytes and the hours. Each one has a mission.', focus: ['x_iam', 'x_orch', 'x_gov', 'x_mon', 'x_iac', 'x_cost'], keepGroups: true, cap: 'Six controls around the flow.' }
        ]
      }),

      B.cmp({
        id: 'm0-levels', t: 1, src: 'docs', title: 'Junior or senior: what changes',
        say: 'The same topics, different expectations. Press Next to read the gap area by area. A senior is judged on decisions and on what happens when something breaks, not on knowing more service names.',
        cols: ['Area', 'A junior is expected to', 'A senior is expected to'],
        hl: 2,
        rows: [
          ['Projects and IAM', 'Explain a project, a role and a service account.', 'Design access by group and by level, avoid key files, and use federation for outside jobs.'],
          ['Cloud Storage', 'Create a bucket, upload, list, and pick a storage class.', 'Design the layout, lifecycle, access and notifications, and pick a location for good.'],
          ['BigQuery tables', 'Create a dataset and a table and load a file.', 'Choose partitions, clusters, formats and load methods, and keep every load safe to repeat.'],
          ['BigQuery cost', 'Select only the columns you need.', 'Estimate bytes before a query runs, guard the bill, and choose between on demand and capacity.'],
          ['SQL for pipelines', 'Write joins, windows and aggregates.', 'Use MERGE, QUALIFY, arrays and structs, and test the data with queries.'],
          ['Pub/Sub', 'Publish a message and pull it.', 'Handle redelivery, dead letters, ordering and replay, and make consumers idempotent.'],
          ['Dataflow and Beam', 'Read the steps of a pipeline.', 'Design windows, triggers and late data, a dead letter output, and a safe update.'],
          ['Spark on Dataproc', 'Run a PySpark job on a cluster.', 'Choose clusters or serverless, fix skew and small files, and keep storage in Cloud Storage.'],
          ['Orchestration', 'Read and run a DAG.', 'Design idempotent tasks, retries, backfills and tests, and know when Airflow is too much.'],
          ['Change data and transfers', 'Name the ways to move data in.', 'Run change data capture with backfill, ordering and reconciliation.'],
          ['Governance', 'Know that columns can be tagged.', 'Design tags, masking, row policies and a catalog, and find what nobody tagged.'],
          ['ML and AI data work', 'Train a simple model in SQL.', 'Build features without leaks, split by entity, and feed models and vector search.'],
          ['Operations and code', 'Read a log and an alert.', 'Set alerts on lag and cost, keep the platform in Terraform, and ship it through a pipeline.']
        ],
        steps: [
          { upto: 4, say: 'Access, storage and tables. A junior sets them up. A senior sets them up so that they are safe to leave alone.' },
          { upto: 9, say: 'Cost, SQL, messages, pipelines and Spark. This is where a design mistake turns into a bill or a wrong number.' },
          { upto: 13, say: 'Orchestration, change data, governance, models and operations. They decide whether the platform stays trustworthy in production.' }
        ],
        pick: '**Junior path** if you are starting out or interviewing for a junior data engineer role. **Senior path** if you have built pipelines already: it includes every junior topic and adds the design, cost, security and operations decisions. **Everything** adds the newest features and the deepest follow-up questions.'
      }),

      B.rows({
        id: 'm0-setup', t: 1, src: 'rec', title: 'Meet the Brewline setup',
        steps: [
          {
            say: 'This is the data that the whole course uses. It is made up, and the same on every run. ' + n0(D.orders) + ' orders over ' + D.days + ' days in ' + D.stores + ' stores. Store s01 sells about a third of them, which is the skew that you will meet in Spark. About a quarter of the orders are guests with no customer id.',
            tabs: [{
              layer: 'DATA', name: 'The Brewline tables', c: 'raw',
              cols: ['Table', 'What it holds', 'Rows'],
              rows: [
                ['raw.orders_raw', 'every delivery of an order, with a load time', n0(D.raw_deliveries)],
                ['curated.orders', 'one row per order, items nested inside', n0(D.orders)],
                ['curated.customers', 'email, phone, birth year, loyalty tier', n0(D.customers)],
                ['curated.stores', 'six countries, one row per store', D.stores],
                ['the order stream', 'POS events for the Beam lessons', '40 (plus repeats)']
              ],
              trk: 0
            }],
            notes: ['I generated the data from a fixed seed, so every number in the course can be checked. ' + n0(D.duplicate_deliveries) + ' orders arrive twice, on purpose: delivery is at least once, and real data has repeats.']
          },
          {
            say: 'The platform has a few names that come back all the time. Two projects keep development apart from production. Everything lives in the Singapore region. Data moves through three BigQuery datasets, and two service accounts do the work, so no person runs a pipeline.',
            tabs: [{
              layer: 'NAMES', name: 'What is called what', c: 'raw',
              cols: ['Thing', 'Name', 'Why'],
              rows: [
                ['Projects', 'brewline-dev, brewline-prod', 'costs, quotas and access are set per project'],
                ['Region', 'asia-southeast1 (Singapore)', 'close to the stores, and one region for everything'],
                ['Datasets', 'raw, staging, curated', 'a layer each, with its own access'],
                ['Bucket', 'brewline-landing-dev', 'where partner files land'],
                ['Topic', 'pos-orders', 'one event for every order'],
                ['Service accounts', 'sa-pipeline, sa-deploy', 'one runs jobs, one deploys from GitHub']
              ],
              trk: 0
            }],
            notes: ['Mission 2 shows who may do what with these, and mission 14 writes the same setup as Terraform.']
          },
          {
            say: 'People matter as much as services. Analysts read the curated layer and nothing else. Data engineers build and run the pipelines. A data steward owns the tags on sensitive columns. A group is the right unit for all of them, never a single person.',
            tabs: [{
              layer: 'PEOPLE', name: 'Who needs what', c: 'raw',
              cols: ['Who', 'Does', 'Needs'],
              rows: [
                ['Analysts (a group)', 'build reports', 'read on curated, a job permission'],
                ['Data engineers (a group)', 'build pipelines', 'write on raw and staging, deploy rights in dev'],
                ['sa-pipeline', 'runs the nightly jobs', 'write on its datasets, nothing else'],
                ['sa-deploy', 'ships code from GitHub', 'a short-lived identity, no key file'],
                ['Data steward', 'owns the tags', 'admin on the taxonomy']
              ],
              trk: 0
            }],
            notes: ['Mission 12 puts the steward to work on policy tags and masking.']
          }
        ]
      }),

      B.talk({
        id: 'm0-how', t: 1, src: 'rec', title: 'How this course works',
        say: 'Six quick things before we start. Press Next for each.',
        items: [
          ['SEE, TRY, SAY', 'Every mission watches something work (**SEE**), makes you practise it (**TRY**), then asks the interview question out loud (**SAY**). Orange blocks in a diagram are data moving. Numbers show the order.', 'Watch first, practise second, speak third.'],
          ['Junior, Senior, Extra', 'A small tag on a screen tells you who it is for. No tag means everybody. **Senior** and **Extra** screens appear only on the wider paths.', 'The tag tells you whether a screen is on your path.'],
          ['Two kinds of screen', 'A **Recorded** tag means I ran something on one machine and wrote down what it did: ' + TOOLS + '. A **From documentation** tag means the fact comes from public documentation as I found it. **Nothing in this course ran on Google Cloud.**', 'Recorded, or from documentation. Never both, never guessed.'],
          ['Three stand-ins', 'No project or account could be reached from where I worked, so three parts are stand-ins, and I say so each time. The Cloud Storage **emulator** is not Cloud Storage: it ignores bucket locations and does not enforce preconditions. **DuckDB** runs your BigQuery SQL after sqlglot translates it, so the logic is real and the bytes are an **estimate** from the documented sizes of the data types. The **Pub/Sub delivery rules** are a small model that I wrote from the documentation.', 'The mechanics are real. The services are described from documentation.'],
          ['Prices are examples', 'Every price in this course is an example for practice, and Google changes them. A lab that shows a bill is arithmetic on example rates. Read the price page of your region before you promise a number.', 'The shape of the bill is the lesson. The numbers are not a quote.'],
          ['Controls', 'Press the right and left arrow keys to move. **A-** and **A+** change the text size. **Map** jumps to any mission and switches path. Your progress saves in this browser.', 'Next, Back, arrow keys, Map.']
        ],
        cols: 1
      })
    ]
  });
})();
