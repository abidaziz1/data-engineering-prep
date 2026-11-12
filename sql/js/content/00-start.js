/* Mission 0: pick a path, see where SQL sits in the platform, meet the Brewline mini data, and learn what the tags mean. */
(function () {
  var B = LAB.b, G = LAB.get;
  var SIZES = G.counts('data.sizes');
  var VER = 'DuckDB ' + G.meta('duckdb') + ', PostgreSQL ' + G.meta('postgres') + ' and SQLite ' + G.meta('sqlite');
  G.expect(SIZES.mini.orders === 12 && SIZES.mini.customers === 8 && SIZES.big.big_orders === 30000, 'the mini data has 12 orders and 8 customers, the big data 30,000 orders');
  var MINI = G.file('data/mini.sql');
  var SCRIPT = G.lines(MINI, 1, 33);

  LAB.addChapter({
    id: 'm0', n: 0, noIntro: true, title: 'Start here', short: 'Start', blurb: 'Pick your path and meet the Brewline data', minutes: 9,
    scenes: [
      B.welcome({ id: 'welcome' }),

      B.flow({
        id: 'm0-map', t: 1, src: 'docs', title: 'Where SQL runs at Brewline', g: 'master', legend: true,
        steps: [
          { say: 'Brewline sells coffee online and in four stores. Orders sit in a database, the website sends events, and suppliers send files. This course is about the SQL that moves that data and answers questions about it. Press Next to follow it.' },
          { say: 'Step 1. SQL loads the data. INSERT, COPY and MERGE put rows into tables. The hard part is to make a load safe to run twice, because jobs fail and run again.', on: ['m1'], focus: ['s_src', 's_load'], cap: 'A load that is run twice must not double the rows.' },
          { say: 'Step 2. Raw tables keep what arrived. Staging queries clean it: they fix types, handle NULL, remove duplicates and rename columns. Most bugs that a dashboard shows were born here.', on: ['m2'], focus: ['s_load', 's_raw'], cap: 'Cleaning is SQL too.' },
          { say: 'Step 3. Business tables join and group the clean data: revenue by day, customers with their tier. Each table has one grain, which means one row for one kind of thing. A join that breaks the grain doubles a total.', on: ['m3'], focus: ['s_raw', 's_mart'], cap: 'One table, one grain.' },
          { say: 'Step 4. Dashboards and analysts read the business tables. They expect the same answer every time and an answer in seconds, so plans, indexes and file layout matter.', on: ['m4'], focus: ['s_mart', 's_use'], cap: 'Right and fast.' },
          { say: 'Around the flow sit five habits. Checks count rows and test keys. Plans show the work. Transactions keep two jobs from disturbing each other. Dialects change small things from engine to engine. Modelling decides the tables. The missions of this course take them in that order.', focus: ['x_chk', 'x_plan', 'x_tx', 'x_dia', 'x_mod'] }
        ]
      }),

      B.cmp({
        id: 'm0-levels', t: 1, src: 'docs', title: 'Junior or senior: what changes',
        say: 'The same language, different expectations. Press Next to read the gap area by area. A senior is judged on correct totals, on speed at scale and on what happens when two things run at once, not on a longer list of functions.',
        cols: ['Area', 'A junior is expected to', 'A senior is expected to'],
        hl: 2,
        rows: [
          ['Reading and filtering', 'Write SELECT with WHERE and ORDER BY, and handle NULL.', 'Predict what a filter does with NULL, and write portable SQL.'],
          ['Joins', 'Pick the right join and explain a LEFT JOIN.', 'Spot a fan-out, state the grain of every table, and prove a total is right.'],
          ['Aggregation', 'Use GROUP BY, HAVING and COUNT correctly.', 'Use GROUPING SETS, conditional aggregates and approximate counts at scale.'],
          ['Subqueries and CTEs', 'Write a CTE and an EXISTS.', 'Choose between a CTE, a view and a temporary table, and write a recursive CTE.'],
          ['Window functions', 'Rank rows and compute a running total.', 'Choose frames, handle ties and peers, and solve top N, gaps and sessions.'],
          ['Dates and text', 'Truncate dates and clean strings.', 'Handle time zones, daylight saving time and JSON without losing rows.'],
          ['Changing data', 'INSERT, UPDATE and DELETE with a WHERE.', 'Write an idempotent upsert, a MERGE and a slowly changing dimension.'],
          ['Transactions', 'Say what COMMIT and ROLLBACK do.', 'Choose an isolation level, avoid lost updates and read a deadlock.'],
          ['Plans and indexes', 'Run EXPLAIN and say what a scan is.', 'Read estimates against real rows, choose an index and fix a slow query.'],
          ['Modelling and checks', 'Name a primary key and a foreign key.', 'Design a star schema, state the grain and write checks that catch bad loads.']
        ],
        steps: [
          { upto: 3, say: 'Reading, joins and aggregation. A junior writes them. A senior also proves that the numbers are right.' },
          { upto: 7, say: 'Subqueries, windows, dates and changes. These are the patterns that interviews test and pipelines use all day.' },
          { upto: 10, say: 'Transactions, plans and modelling. They decide whether the system stays correct and fast when data and users grow.' }
        ],
        pick: '**Junior path** if you are starting out or interviewing for a junior data engineer role. **Senior path** if you write SQL every day: it includes every junior topic and adds plans, transactions, modelling and the design decisions. **Everything** adds the newest features and the deepest follow-up questions.'
      }),

      B.talk({
        id: 'm0-how', t: 1, src: 'rec', title: 'How this course works',
        say: 'Six quick things before we start. Press Next for each.',
        items: [
          ['SEE, TRY, SAY', 'Every mission watches something run (**SEE**), makes you practise it (**TRY**), then asks the interview question out loud (**SAY**). Orange blocks in a diagram are data moving. Numbers show the order.', 'Watch first, practise second, speak third.'],
          ['Junior, Senior, Extra', 'A small tag on a screen tells you who it is for. No tag means everybody. **Senior** and **Extra** screens appear only on the wider paths.', 'The tag tells you whether a screen is on your path.'],
          ['Recorded: it ran', 'A **Recorded** tag means I ran the SQL on one machine and wrote down what came back: ' + VER + '. Every result table, error message and plan on such a screen is real output. I never typed a result in by hand.', 'Rows on screen came from an engine.'],
          ['From documentation: it did not run', 'A **From documentation** tag means the fact comes from public documentation, not from a run: how a cloud warehouse behaves, a limit, a name. When a screen shows a query in the dialect of Snowflake, BigQuery, Redshift, MySQL, SQL Server or Oracle, it is **translated, not run**: a program rewrote the text, and no such engine ran it.', 'Translated text is not a test.'],
          ['Mini data and big data', 'The mini data is a few dozen made-up rows that fit on a screen, so you can follow every example by eye. The big data is 30,000 orders made by arithmetic, so that plans and row counts mean something. No real customer is in either.', 'Small to read, big to measure.'],
          ['Controls', 'Press the right and left arrow keys to move. **A-** and **A+** change the text size. **Map** jumps to any mission and switches path. Your progress saves in this browser.', 'Next, Back, arrow keys, Map.']
        ],
        cols: 1
      }),

      B.rows({
        id: 'm0-data', t: 1, src: 'rec', title: 'Meet the Brewline mini data',
        steps: [
          {
            say: 'These are the tables of the course. Brewline has four stores in four countries, and a customer table with some gaps. Look for the NULL cells: customer 6 has no email, no country and no tier. That is on purpose.',
            tabs: [
              { layer: 'STORES', name: 'stores', c: 'raw', cols: G.table('data.stores').cols, rows: G.table('data.stores').rows },
              { layer: 'CUSTOMERS', name: 'customers', c: 'raw', cols: G.table('data.customers').cols, rows: G.table('data.customers').rows, trk: 5 }
            ],
            notes: ['Customer 6 and customer 8 never ordered. Customer 3 has no tier. Customer 2 has no email.']
          },
          {
            say: 'An order has a customer, a store, a time, a status, a channel and a total. Order 1009 has no customer: a guest checked out. Order 1005 was cancelled, 1008 refunded, 1012 is still pending.',
            tabs: [{ layer: 'ORDERS', name: 'orders', c: 'stg', cols: G.table('data.orders').cols, rows: G.table('data.orders').rows, trk: 8 }],
            notes: ['The times are in UTC. Mission 7 shows what that does to a daily total in Singapore.']
          },
          {
            say: 'Each order has one or more lines, and each order may have more than one payment. Order 1002 was paid in two parts. Order 1008 was paid and then refunded. This is where a join can double a total.',
            tabs: [
              { layer: 'ITEMS', name: 'order_items', c: 'int', cols: G.table('data.order_items').cols, rows: G.table('data.order_items').rows },
              { layer: 'PAYMENTS', name: 'payments', c: 'int', cols: G.table('data.payments').cols, rows: G.table('data.payments').rows, trk: 2 }
            ],
            notes: ['Orders 1005 and 1012 have no payment at all.']
          },
          {
            say: 'Events are what the website saw. They have a time and a type. Later missions turn them into sessions and funnels. A NULL customer is a visitor who is not signed in.',
            tabs: [
              { layer: 'EVENTS', name: 'events (the first 12 of ' + G.table('data.events').rows.length + ')', c: 'mart', cols: G.table('data.events').cols, rows: G.table('data.events').rows.slice(0, 12) },
              { layer: 'ACTIVE', name: 'daily_active', c: 'mart', cols: G.table('data.daily_active').cols, rows: G.table('data.daily_active').rows }
            ],
            notes: ['The same data is loaded by one script that runs on all three engines.']
          }
        ]
      }),

      B.code({
        id: 'm0-script', t: 1, src: 'rec', title: 'The script that loads the data', file: 'mini.sql (the first 33 lines)', lang: 'sql',
        code: SCRIPT,
        steps: [
          { say: 'One script creates and fills every mini table. It is plain SQL, and it ran without a change on DuckDB, PostgreSQL and SQLite. This is its first 33 lines of ' + MINI.split('\n').length + '.' },
          { say: 'CREATE TABLE names the columns and their types. The same type names work on all three engines. A PRIMARY KEY says that no two rows may share a store id.', lines: G.span(SCRIPT, /^CREATE TABLE stores/, /^\);/) },
          { say: 'INSERT adds rows. Text goes in single quotes, numbers do not.', lines: G.span(SCRIPT, /^INSERT INTO stores/, /^  \(4,/) },
          { say: 'The customers table follows. Dates are written as text in the ISO form, year first, and the engines read them as dates.', lines: G.span(SCRIPT, /^CREATE TABLE customers/, /^\);/) },
          { say: 'The row for customer 6 uses NULL for email, country and tier. NULL has no quotes, because it is not a value. It means that the value is not known.', lines: G.span(SCRIPT, /^  \(6, 'Fay Tan'/) }
        ],
        note: 'The script is in sql/verify, and the recorder runs it every time. Three engines accept it, so it is also a test.'
      }),

      B.cmp({
        id: 'm0-engines', t: 1, src: 'rec', title: 'The three engines of this course',
        say: 'Three engines ran everything. Press Next to meet each one. They agree on the core of SQL and disagree on the edges, and the course shows both.',
        cols: ['Engine', 'What it is', 'Version that ran', 'Why it is here'],
        hl: 3,
        rows: [
          ['**DuckDB**', 'An analytical engine that runs inside your program or a notebook, and reads files such as Parquet and CSV. It stores data by column.', G.meta('duckdb'), 'Fast to start, friendly SQL, and close to what cloud warehouses do for analysis.'],
          ['**PostgreSQL**', 'A server database that stores data by row, runs many sessions at once and keeps data correct with transactions.', G.meta('postgres'), 'The usual home of application data. It shows locks, isolation, indexes and plans in detail.'],
          ['**SQLite**', 'A small database in one file, built into phones, browsers and Python. It is forgiving about types.', G.meta('sqlite'), 'It shows how much SQL differs when an engine is relaxed about types and NULL order.']
        ],
        steps: [
          { upto: 1, say: 'DuckDB is the engine for analysis. It has no server and starts in milliseconds, which is why it is a good place to practise SQL for a warehouse.' },
          { upto: 2, say: 'PostgreSQL is a real server. Two sessions can talk to it at once, which is what the mission on transactions needs.' },
          { upto: 3, say: 'SQLite ran the same queries as a third opinion. Where it differs, the difference is real and the lesson says so.' }
        ],
        pick: 'Learn the SQL on the one you have. Then check each edge on the engine you ship on. Snowflake, BigQuery, Redshift, SQL Server, MySQL and Oracle did not run here. Mission 13 shows queries translated for them, and says "translated, not run".'
      })
    ]
  });
})();
