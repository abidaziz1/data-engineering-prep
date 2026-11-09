/* Mission 0: pick a path, see the whole platform, meet the data. */
(function () {
  var B = LAB.b;

  LAB.addChapter({
    id: 'm0', n: 0, noIntro: true, title: 'Start here', short: 'Start', blurb: 'Pick your path and see the whole platform', minutes: 8,
    scenes: [
      B.welcome({ id: 'welcome' }),

      B.flow({
        id: 'm0-map', t: 1, title: 'Brewline on Snowflake: the whole platform', g: 'master', legend: true,
        steps: [
          { say: 'Brewline sells coffee online. Its data lives in three places, and Snowflake has to hold all of it. This is the map for the whole course. Press Next to walk it once.', cap: 'Every mission in this course is one part of this picture.' },
          { say: 'Step 1. Data starts in source systems: the orders database, JSON events from the website, and CSV files from suppliers. Snowflake does not own these. It receives copies.', on: ['e1a', 'e1b', 'e1c'], focus: ['s_db', 's_web', 's_csv', 's3'], cap: 'Sources send **files** to cloud storage. Mission 3 covers this.' },
          { say: 'Step 2. Files land in cloud storage, one folder per day. This is the landing zone. Snowflake can read files straight from here.', on: ['e2'], focus: ['s3', 'load'], cap: 'Landing files first gives you a **replayable** copy of everything that arrived.' },
          { say: 'Step 3. A load step copies the files into tables. Batch loading uses COPY INTO. Continuous loading uses Snowpipe. The tables are called RAW because nothing is cleaned yet.', on: ['e3'], focus: ['load', 'raw'], cap: 'RAW keeps data **exactly as loaded**, plus the file name and load time.' },
          { say: 'Step 4. SQL cleans RAW into CORE: correct types, no duplicates, orders joined to customers and products. This is where most of the engineering effort goes.', on: ['e4'], focus: ['raw', 'core'], cap: 'Missions 4 and 6 cover the SQL and the pipelines that run it.' },
          { say: 'Step 5. CORE becomes MARTS: tables shaped for questions such as revenue by country. Analysts query these.', on: ['e5'], focus: ['core', 'mart'], cap: 'A mart is the **small, fast, trusted** layer people actually use.' },
          { say: 'Step 6. Consumers read the marts: dashboards, the website, and partners through secure data sharing, with no copy made.', on: ['e6a', 'e6b', 'e6c'], focus: ['mart', 'bi', 'app', 'shr'], cap: 'Mission 9 covers sharing. Mission 7 covers making these reads fast.' },
          { say: 'Around the flow sit four controls: warehouses supply compute, security decides who sees what, cost guardrails stop surprises, and delivery moves changes safely through Git. Each has its own mission.', focus: ['c_wh', 'c_sec', 'c_cost', 'c_ops'], keepGroups: true, cap: 'Mission 2 warehouses. Mission 8 security. Mission 11 cost. Mission 12 delivery.' }
        ]
      }),

      B.cmp({
        id: 'm0-levels', t: 1, title: 'Junior or senior: what changes',
        say: 'Same platform, different expectations. Press Next to read the gap area by area. Notice that seniors are judged on decisions and operations, not on knowing more syntax.',
        cols: ['Area', 'A junior is expected to', 'A senior is expected to'],
        hl: 2,
        rows: [
          ['Compute', 'Create, resize and suspend a warehouse. Know that credits double with each size.', 'Design warehouses per workload, choose scale up or out, set guardrails, attribute cost to teams.'],
          ['Loading', 'Load staged files with COPY INTO and read the result.', 'Choose COPY, Snowpipe or streaming. Design for bad files, replays and no duplicates.'],
          ['SQL', 'Join, aggregate, use window functions, query JSON with FLATTEN.', 'Write MERGE pipelines, handle time zones and late data, review other people\'s SQL.'],
          ['Recovery', 'Use Time Travel, UNDROP and clones.', 'Set retention per layer, plan recovery and replication, weigh the storage cost.'],
          ['Pipelines', 'Read a stream, a task and a dynamic table.', 'Pick streams and tasks, dynamic tables or dbt, and keep them cheap and observable.'],
          ['Performance', 'Open a query profile and spot a full scan.', 'Diagnose pruning, spilling and skew, then choose clustering, search optimization or sizing with evidence.'],
          ['Security', 'Use roles, grant privileges, know what masking does.', 'Design role hierarchies, masking and row policies, authentication and audit.'],
          ['Delivery', 'Keep SQL in Git and run deployment scripts.', 'Run environments, CI/CD and infrastructure as code with safe releases.']
        ],
        steps: [
          { upto: 2, say: 'Compute and loading. A junior operates things. A senior designs them and says what they cost.' },
          { upto: 4, say: 'SQL and recovery. Notice the senior column talks about late data and retention. Those are the problems that appear only in production.' },
          { upto: 6, say: 'Pipelines and performance. The senior habit is to diagnose with evidence before changing a setting.' },
          { upto: 8, say: 'Security and delivery. These decide whether a platform survives an audit and a bad release.' }
        ],
        pick: '**Junior path** if you are starting out or interviewing for a junior role. **Senior path** if you have built pipelines before: it includes every junior topic and adds the design, tuning, security, cost and delivery decisions. Use the **Map** button to switch whenever you like.'
      }),

      B.rows({
        id: 'm0-data', t: 1, title: 'Meet the data',
        steps: [
          { say: 'Brewline\'s orders database has a table of orders. We will follow one order, O-5001, from the source all the way to a dashboard. It is the marked row.', tabs: [
            { layer: 'SOURCE', name: 'orders (Postgres)', c: 'src', cols: ['order_id', 'customer_id', 'order_ts', 'status', 'total_usd'], rows: [['O-5001', 'C-42', '2026-03-14 09:12', 'PLACED', '67.00'], ['O-5002', 'C-77', '2026-03-14 09:15', 'PLACED', '12.50'], ['O-5003', 'C-42', '2026-03-14 10:02', 'SHIPPED', '28.00']], trk: 0 }
          ], notes: ['Order O-5001 belongs to customer **C-42** and totals **67.00 USD**.'] },
          { say: 'Each order has lines. O-5001 has two: two bags of coffee at 14.00 and one grinder at 39.00. Two times 14 plus 39 is 67, so the lines add up to the order total. We will check that again later.', tabs: [
            { layer: 'SOURCE', name: 'order_items (Postgres)', c: 'src', cols: ['order_id', 'line_no', 'product_id', 'qty', 'unit_price'], rows: [['O-5001', '1', 'P-10', '2', '14.00'], ['O-5001', '2', 'P-22', '1', '39.00'], ['O-5002', '1', 'P-11', '1', '12.50']], trk: 0 }
          ], notes: ['`P-10` is Ethiopia 250 g, `P-22` is a hand grinder.'] },
          { say: 'The website sends events as JSON. The same customer added both products to the cart at 09:10. JSON is nested, so Snowflake stores it in a VARIANT column. Mission 4 shows how to query it.', code: { file: 'events/2026-03-14/part-0001.json', lang: 'json', code: '{\n  "event_id": "E-9001",\n  "ts": "2026-03-14T09:10:41Z",\n  "user": { "id": "C-42", "device": "ios" },\n  "event": "add_to_cart",\n  "items": [\n    { "sku": "P-10", "qty": 2 },\n    { "sku": "P-22", "qty": 1 }\n  ]\n}' } }
        ]
      }),

      B.talk({
        id: 'm0-how', t: 1, title: 'How this course works',
        say: 'Four quick things before we start. Press Next for each.',
        items: [
          ['SEE, TRY, SAY', 'Every mission watches something work (**SEE**), makes you practise it (**TRY**), then asks the interview question out loud (**SAY**). Orange blocks in a diagram are data moving. Numbers show the order.', 'Watch first, practise second, speak third.'],
          ['Junior, Senior, Extra', 'A small tag on a screen tells you who it is for. No tag means everybody. **Senior** and **Extra** screens appear only on the wider paths.', 'The tag tells you whether a screen is on your path.'],
          ['Practise on a real account', 'This course runs in your browser. It does not connect to Snowflake. The SQL is written to be typed into your own account. Snowflake offers a free trial, and typing the statements yourself is what makes them stick.', 'Reading builds recognition. Typing builds skill.'],
          ['Controls', 'Press the right and left arrow keys to move. **A-** and **A+** change the text size. **Map** jumps to any mission and switches path. Your progress saves in this browser.', 'Next, Back, arrow keys, Map.']
        ],
        cols: 1
      })
    ]
  });
})();
