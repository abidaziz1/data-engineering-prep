/* Mission 0: pick a path, see the whole platform, meet the data. */
(function () {
  var B = LAB.b, G = LAB.get;

  LAB.addChapter({
    id: 'm0', n: 0, noIntro: true, title: 'Start here', short: 'Start', blurb: 'Pick your path and see the whole project', minutes: 8,
    scenes: [
      B.welcome({ id: 'welcome' }),

      B.flow({
        id: 'm0-map', t: 1, title: 'Brewline with dbt: the whole picture', g: 'master', legend: true,
        steps: [
          { say: 'Brewline sells coffee online. Its data already lands in the warehouse, copied there by loader tools that are not dbt. dbt starts after that. This is the map for the whole course. Press Next to walk it once.', cap: 'Every mission in this course is one part of this picture.' },
          { say: 'Step 1. Loaders copy data from the orders database, the website and supplier files into the warehouse. dbt does not do this part.', on: ['e1a', 'e1b', 'e1c'], focus: ['ld_db', 'ld_web', 'ld_csv', 'raw'], cap: 'Loading is **not** dbt\'s job. A loader copies data in, and dbt transforms what arrived.' },
          { say: 'The loaded tables are called RAW. Nothing is cleaned. They keep every version of every row, exactly as the loader wrote it. dbt calls these tables sources, and it only reads them.', focus: ['raw'], cap: 'dbt **reads** RAW and never edits it. Mission 3 covers sources.' },
          { say: 'Step 2. Staging models clean one raw table each. They rename columns, cast types and keep the latest version of each row. They are cheap views.', on: ['e2'], focus: ['raw', 'stg'], keepGroups: true, cap: 'One staging model per source table. Mission 3.' },
          { say: 'Step 3. Intermediate models join and reshape the staged tables. The result is a building block that no dashboard reads directly.', on: ['e3'], focus: ['stg', 'int'], keepGroups: true, cap: 'Here the order lines are added up and joined to the orders. Mission 4.' },
          { say: 'Step 4. Marts are the finished tables: facts such as orders and dimensions such as customers. Business rules live here.', on: ['e4'], focus: ['int', 'mart'], keepGroups: true, cap: 'A mart is the **small, trusted, documented** layer people query.' },
          { say: 'Step 5. Dashboards and notebooks read the marts. dbt can record who depends on what, so a change to a mart shows who it affects.', on: ['e5a', 'e5b'], focus: ['mart', 'bi', 'ml'], cap: 'Dashboards are declared as **exposures**. Mission 9.' },
          { say: 'Around the flow sit four controls. Tests check the data, docs and contracts describe it, a scheduler runs it, and environments keep dev, CI and production apart. Each has its own mission.', focus: ['c_test', 'c_docs', 'c_orch', 'c_ci'], keepGroups: true, cap: 'Mission 6 tests. Mission 9 docs. Mission 10 performance. Mission 11 environments and CI.' }
        ]
      }),

      B.cmp({
        id: 'm0-levels', t: 1, title: 'Junior or senior: what changes',
        say: 'Same tool, different expectations. Press Next to read the gap area by area. Notice that seniors are judged on decisions and on what happens when things break, not on knowing more syntax.',
        cols: ['Area', 'A junior is expected to', 'A senior is expected to'],
        hl: 2,
        rows: [
          ['Models', 'Write a SELECT model, use `ref` and `source`, read the compiled SQL.', 'Design layers and naming, set the grain of every model, keep each model small enough to review.'],
          ['Tests', 'Add unique, not_null, accepted_values and relationships tests.', 'Decide what to test and where, write custom and unit tests, choose warn or error.'],
          ['Jinja', 'Use `ref`, `source`, `config` and a few macros.', 'Write macros and packages, and know compile time from run time.'],
          ['Incremental', 'Read an incremental model and run it.', 'Choose the strategy, handle late and changed rows, run backfills, control cost.'],
          ['History', 'Read a snapshot table.', 'Decide what to snapshot, and join facts to the right version.'],
          ['Governance', 'Describe models and columns.', 'Use contracts, groups, access and versions to stop breaking changes.'],
          ['Speed', 'Run a subset with `--select`.', 'Find the slow model, tune threads and warehouse size, run only what changed.'],
          ['Delivery', 'Run `dbt build` on a laptop.', 'Design environments, CI and CD, scheduling, alerts and recovery.']
        ],
        steps: [
          { upto: 3, say: 'Models, tests and Jinja. A junior writes and runs them. A senior decides which ones to write.' },
          { upto: 5, say: 'Incremental models and history. These are where production data gets awkward: rows change, rows arrive late.' },
          { upto: 8, say: 'Governance, speed and delivery. These decide whether a project survives its second year and its tenth contributor.' }
        ],
        pick: '**Junior path** if you are starting out or interviewing for a junior or analytics engineer role. **Senior path** if you have built dbt projects before: it includes every junior topic and adds the design, performance, governance and delivery decisions. Use the **Map** button to switch whenever you like.'
      }),

      B.rows({
        id: 'm0-data', t: 1, title: 'Meet the data',
        steps: [
          {
            say: 'Brewline\'s loader copies the orders table into the warehouse and only ever appends. Every time an order changes, a new row arrives. Look at the marked row: order O-5001 was PLACED at 09:31, then SHIPPED at 10:31. Both versions are in RAW.',
            tabs: [{ layer: 'RAW', name: 'raw.orders', c: 'raw', cols: G.table('raw_orders').cols, rows: G.where('raw_orders', 'order_id', ['O-5001', 'O-5002', 'O-5003']).rows, trk: 1 }],
            notes: ['The same `order_id` appears twice for **O-5001** and **O-5003**. A dashboard that reads this table directly would count them twice.']
          },
          {
            say: 'Each order has lines. O-5001 has two: two bags of Ethiopia coffee at 14.00 and one hand grinder at 39.00. Two times 14 plus 39 is 67, the order total. Keep that in mind, because we will check it with a test.',
            tabs: [{ layer: 'RAW', name: 'raw.order_items', c: 'raw', cols: G.table('raw_order_items').cols, rows: G.where('raw_order_items', 'order_id', ['O-5001', 'O-5002']).rows, trk: 0 }],
            notes: ['`P-10` is Ethiopia 250 g and `P-22` is a hand grinder. Product names live in `raw.products`.']
          },
          {
            say: 'Customers are loaded as they last looked. The email for C-12 has capital letters, and the country code is lower case. These are small mess-ups that a staging model will fix.',
            tabs: [{ layer: 'RAW', name: 'raw.customers', c: 'raw', cols: G.table('raw_customers').cols, rows: G.table('raw_customers').rows, trk: 0 }],
            notes: ['The loader overwrites a customer row when it changes. That is why a **snapshot** exists. Mission 8.']
          }
        ]
      }),

      B.talk({
        id: 'm0-how', t: 1, title: 'How this course works',
        say: 'Five quick things before we start. Press Next for each.',
        items: [
          ['SEE, TRY, SAY', 'Every mission watches something work (**SEE**), makes you practise it (**TRY**), then asks the interview question out loud (**SAY**). Orange blocks in a diagram are data moving. Numbers show the order.', 'Watch first, practise second, speak third.'],
          ['Junior, Senior, Extra', 'A small tag on a screen tells you who it is for. No tag means everybody. **Senior** and **Extra** screens appear only on the wider paths.', 'The tag tells you whether a screen is on your path.'],
          ['Real output', 'Every command output, compiled query and result table in this course was **recorded from a real run** of dbt Core ' + LAB.real.meta.dbt + ' on DuckDB, a small database that runs on a laptop. Nothing was typed by hand. Timings are tiny because DuckDB is tiny. On a warehouse they are seconds to minutes. Snowflake-specific behavior has its own course.', 'If a screen shows output, dbt printed it.'],
          ['Run it yourself', 'The whole Brewline project is in the repository under `dbt/verify/project`. Install `dbt-core` and `dbt-duckdb`, run `dbt deps` and `dbt build`, and you get the same results. Typing the commands is what makes them stick.', 'Reading builds recognition. Typing builds skill.'],
          ['Controls', 'Press the right and left arrow keys to move. **A-** and **A+** change the text size. **Map** jumps to any mission and switches path. Your progress saves in this browser.', 'Next, Back, arrow keys, Map.']
        ],
        cols: 1
      })
    ]
  });
})();
