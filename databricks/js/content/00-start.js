/* Mission 0: pick a path, see the whole lakehouse, meet the Brewline setup. */
(function () {
  var B = LAB.b, G = LAB.get;
  var VER = 'Apache Spark ' + G.meta('spark') + ' and Delta Lake ' + G.meta('delta');

  LAB.addChapter({
    id: 'm0', n: 0, noIntro: true, title: 'Start here', short: 'Start', blurb: 'Pick your path and see the whole lakehouse', minutes: 9,
    scenes: [
      B.welcome({ id: 'welcome' }),

      B.flow({
        id: 'm0-map', t: 1, src: 'docs', title: 'Brewline on Databricks: the whole picture', g: 'master', legend: true,
        steps: [
          { say: 'Brewline sells coffee online. Its orders, website events and supplier files already reach your cloud storage. This course starts there. It follows one pipeline from files to the gold tables that people read, and then the controls around it. Press Next to walk the map once.', cap: 'Every mission in this course is one part of this picture.' },
          { say: 'Step 1. Export jobs, event collectors and supplier uploads drop files into a landing area in your cloud storage. Databricks does not own this part. The files stay exactly as they arrived.', on: ['e1a', 'e1b', 'e1c'], focus: ['ld_db', 'ld_web', 'ld_csv', 'lz'], cap: 'Landing belongs to whoever sends the files.' },
          { say: 'Step 2. Spark does the work. A cluster of virtual machines, or serverless compute, starts, reads the files and writes tables. You pay for the time it runs, so the size and the run time of every job matter.', on: ['e6'], focus: ['spark', 'g_sp'], cap: 'Spark reads and writes. Missions 2 and 10 show what it does and what it costs.' },
          { say: 'Step 3. Bronze keeps what arrived, as a Delta table, plus the file name and the time of loading. Nothing is cleaned yet. If a downstream rule was wrong, bronze lets you rebuild without asking the source again.', on: ['e2'], focus: ['lz', 'bronze'], keepGroups: true, cap: 'Mission 5 builds bronze with a stream that remembers which files it has read.' },
          { say: 'Step 4. Silver cleans the data. It keeps the newest version of every order and removes duplicates. It uses MERGE, so a row that arrives twice changes the table once.', on: ['e3'], focus: ['bronze', 'silver'], keepGroups: true, cap: 'Mission 5 shows the merge and the Delta log entry it writes.' },
          { say: 'Step 5. Gold holds the tables that the business reads: revenue by day, customers with their tier. They are small, named for business questions, and rebuilt or updated on a schedule.', on: ['e4'], focus: ['silver', 'gold'], keepGroups: true, cap: 'Gold is the layer that other teams query.' },
          { say: 'Step 6. Dashboards read gold through a SQL warehouse. Data scientists read silver and gold from notebooks. Both go through the same catalog, so the same permissions apply.', on: ['e5a', 'e5b'], focus: ['gold', 'bi', 'ml'], cap: 'Mission 7 covers who may read what.' },
          { say: 'Around the flow sit five controls. Unity Catalog decides who may read what. Jobs run and retry the work. Cost control keeps the bill small. Security protects keys and the network. Releases move code to production without surprises.', focus: ['c_uc', 'c_jobs', 'c_cost', 'c_sec', 'c_ci'], keepGroups: true, cap: 'Missions 7, 9, 10, 12 and 11. Mission 13 is the boss round.' }
        ]
      }),

      B.cmp({
        id: 'm0-levels', t: 1, src: 'docs', title: 'Junior or senior: what changes',
        say: 'Same platform, different expectations. Press Next to read the gap area by area. A senior is judged on decisions and on what happens when something breaks, not on knowing more syntax.',
        cols: ['Area', 'A junior is expected to', 'A senior is expected to'],
        hl: 2,
        rows: [
          ['Platform', 'Say what a workspace, a cluster and a notebook are, and where the data lives.', 'Choose the compute type for each workload and explain the control plane and the compute plane.'],
          ['Spark', 'Tell a transformation from an action and read a simple query plan.', 'Read a plan for a shuffle, a join strategy and skew, and fix what is slow.'],
          ['Delta Lake', 'Create a table, query an old version and explain what the log is.', 'Design merges, constraints and schema changes, and restore a table after a bad write.'],
          ['Layout', 'Know why many small files are slow and what OPTIMIZE does.', 'Choose between partitions, Z-order and liquid clustering, and set a VACUUM policy.'],
          ['Pipelines', 'Describe bronze, silver and gold and write a simple merge.', 'Handle duplicates, late data and slowly changing dimensions without double counting.'],
          ['Streaming', 'Explain a checkpoint and a trigger.', 'Choose a watermark, size the state and plan a restart or a replay.'],
          ['Catalog', 'Find a table in the three-level name and grant a read.', 'Design catalogs, schemas, groups and external locations, and prove who can read what.'],
          ['Jobs', 'Run a notebook as a job with a schedule.', 'Design tasks, retries, alerts and compute, and stop two runs from colliding.'],
          ['Cost', 'Know that clusters bill while they run.', 'Cut the bill with job compute, auto-termination, right sizing and layout.'],
          ['Delivery', 'Run a test with pytest.', 'Ship with bundles, a pull request check and a promotion from dev to production.'],
          ['Azure', 'Know that Entra ID signs people in.', 'Design the access connector, secret scopes, private networking and keys.']
        ],
        steps: [
          { upto: 4, say: 'Platform, Spark, Delta Lake and layout. A junior reads and runs them. A senior decides how they are built and tuned.' },
          { upto: 8, say: 'Pipelines, streaming, catalog and jobs. These are the topics where a design mistake shows up in production.' },
          { upto: 11, say: 'Cost, delivery and Azure. They decide whether the platform stays affordable, repeatable and safe.' }
        ],
        pick: '**Junior path** if you are starting out or interviewing for a junior data engineer role. **Senior path** if you have used Spark or Databricks already: it includes every junior topic and adds the tuning, governance, cost and release decisions. Use the **Map** button to switch whenever you like.'
      }),

      B.rows({
        id: 'm0-setup', t: 1, src: 'docs', title: 'Meet the Brewline setup',
        steps: [
          {
            say: 'This is the setup the course assumes. One workspace per environment. In each, Unity Catalog holds one catalog, and each catalog has one schema per layer.',
            tabs: [{
              layer: 'WORKSPACE', name: 'Catalogs and schemas', c: 'raw',
              cols: ['Catalog', 'Schema', 'Who writes there', 'What lives there'],
              rows: [
                ['brewline_prod', 'landing', 'the loaders', 'a volume with the files as sent'],
                ['brewline_prod', 'bronze', 'the pipeline job', 'orders as loaded, with the source file name'],
                ['brewline_prod', 'silver', 'the pipeline job', 'orders, one row per order'],
                ['brewline_prod', 'gold', 'the pipeline job', 'daily revenue, customers with their tier'],
                ['brewline_dev', 'a schema per developer', 'one developer', 'a private copy to test changes'],
                ['brewline_ci', 'a schema per pull request', 'the pull request check', 'a temporary copy that the check deletes']
              ],
              trk: 0
            }],
            notes: ['These names are the design this course uses. A real account will differ, and the reasons behind each choice matter more than the names.']
          },
          {
            say: 'Four groups of people and services, and three kinds of compute. Each group gets the privileges for its job and no more.',
            tabs: [{
              layer: 'WORKSPACE', name: 'Groups, services and compute', c: 'raw',
              cols: ['Name', 'Kind', 'Used by', 'Why it exists'],
              rows: [
                ['data_engineers', 'group', 'the team', 'owns bronze, silver and gold in dev, reads production'],
                ['analysts', 'group', 'people who write queries', 'reads gold only'],
                ['svc_pipeline', 'service principal', 'the production job', 'writes bronze, silver and gold, and nothing else'],
                ['svc_ci', 'service principal', 'the pull request check', 'writes to brewline_ci only'],
                ['jobs compute', 'compute', 'the nightly pipeline', 'starts for a run and stops when it ends'],
                ['SQL warehouse', 'compute', 'dashboards and analysts', 'serverless, scales with the queries'],
                ['all-purpose compute', 'compute', 'developers', 'a small cluster that stops after an idle period']
              ],
              trk: 0
            }],
            notes: ['Mission 7 builds the grants. Mission 10 compares the compute types and what they cost.']
          }
        ]
      }),

      B.talk({
        id: 'm0-how', t: 1, src: 'rec', title: 'How this course works',
        say: 'Five quick things before we start. Press Next for each.',
        items: [
          ['SEE, TRY, SAY', 'Every mission watches something work (**SEE**), makes you practise it (**TRY**), then asks the interview question out loud (**SAY**). Orange blocks in a diagram are data moving. Numbers show the order.', 'Watch first, practise second, speak third.'],
          ['Junior, Senior, Extra', 'A small tag on a screen tells you who it is for. No tag means everybody. **Senior** and **Extra** screens appear only on the wider paths.', 'The tag tells you whether a screen is on your path.'],
          ['Two kinds of screen', 'A green **Recorded** tag means a real engine produced what you see. I ran ' + VER + ' on one machine with the Brewline data and wrote down the query plans, the Delta log, the history tables, the error messages and the file counts. Databricks Runtime is built on these two engines, so Spark and Delta behave the same way there. A blue **From documentation** tag means the screen covers a Databricks feature that I did not run: Unity Catalog, Auto Loader, declarative pipelines, jobs, Photon, serverless compute, bundles and the Azure integration. Those screens follow the public documentation as I read it when I wrote this course, and the names and limits change. Check the current page before you rely on one.', 'Green means a real engine ran it. Blue means documentation.'],
          ['Run it yourself', 'Everything recorded here comes from `databricks/verify/capture_db.py`. Install PySpark and Delta Lake with pip, add Java 17 or 21, and run the script to get the same plans, logs and counts. To try the platform features you need a Databricks workspace. A trial or a free edition is enough for most missions, and the Azure mission needs an Azure subscription. Check what Databricks offers today. Stop the compute and delete what you create when you finish.', 'Typing builds skill. Reading builds recognition.'],
          ['Controls', 'Press the right and left arrow keys to move. **A-** and **A+** change the text size. **Map** jumps to any mission and switches path. Your progress saves in this browser.', 'Next, Back, arrow keys, Map.']
        ],
        cols: 1
      })
    ]
  });
})();
