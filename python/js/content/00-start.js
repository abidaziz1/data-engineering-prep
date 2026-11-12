/* Mission 0: pick a path, see the whole platform, meet the Brewline setup, and learn what the tags mean. */
(function () {
  var B = LAB.b, G = LAB.get;
  var VER = 'Python ' + G.meta('python') + ', pandas ' + G.meta('pandas') + ', Polars ' + G.meta('polars') + ', DuckDB ' + G.meta('duckdb') + ', pydantic ' + G.meta('pydantic') + ', pytest ' + G.meta('pytest') + ', ruff ' + G.meta('ruff') + ', mypy ' + G.meta('mypy') + ' and uv ' + G.meta('uv');

  LAB.addChapter({
    id: 'm0', n: 0, noIntro: true, title: 'Start here', short: 'Start', blurb: 'Pick your path and see the whole platform', minutes: 9,
    scenes: [
      B.welcome({ id: 'welcome' }),

      B.flow({
        id: 'm0-map', t: 1, src: 'docs', title: 'Brewline\'s Python jobs: the whole picture', g: 'master', legend: true,
        steps: [
          { say: 'Brewline sells coffee online. Its orders sit in a database, a partner API sends stores and exchange rates, and suppliers send files. This course builds the Python jobs that move that data into a warehouse, and everything around them. Press Next to follow one order through.', cap: 'The whole platform on one page.' },
          { say: 'Step 1. Data arrives in three ways: a nightly export of the orders database, pages from a partner API, and CSV files that suppliers drop on an SFTP server. Each one fails differently: files are cut, APIs say 429, exports change a column.', on: ['e1a', 'e1b', 'e1c'], focus: ['s_db', 's_api', 's_file', 'j_ext'], cap: 'Three sources, three ways to fail.' },
          { say: 'Step 2. **Extract** reads from the sources, with timeouts, pages and retries. It keeps what it received, so that a bad rule can be fixed and the data replayed. Missions 4, 5, 7 and 8.', focus: ['j_ext'], cap: 'Read, retry, page.' },
          { say: 'Step 3. **Transform** cleans and checks the data: types, times, money, joins that must not multiply rows, and rows that must be set aside. Missions 3, 6, 9 and 11.', on: ['e2'], focus: ['j_ext', 'j_tr'], cap: 'Clean, join, validate.' },
          { say: 'Step 4. **Load** writes the result so that running it twice leaves the same table: a transaction, a key, a replaced day. Missions 7 and 8.', on: ['e3'], focus: ['j_tr', 'j_ld'], cap: 'Write so it can run twice.' },
          { say: 'Step 5. The **warehouse** holds the tables that reports and dashboards read.', on: ['e4'], focus: ['j_ld', 'wh'], cap: 'Tables for reports.' },
          { say: 'Around the jobs sit five things that decide whether anyone can trust them. The **environment** (mission 2), **config and secrets** (13), **tests** (12), **logs** (12), and a **scheduler** (14). Each has a mission.', focus: ['c_env', 'c_cfg', 'c_test', 'c_log', 'c_sch'], cap: 'What makes it run every night.' }
        ]
      }),

      B.cmp({
        id: 'm0-levels', t: 1, src: 'docs', title: 'Junior or senior: what changes',
        say: 'The same topics, different expectations. Press Next to read the gap area by area. A senior is judged on decisions and on what happens when something breaks, not on knowing more libraries.',
        cols: ['Area', 'A junior is expected to', 'A senior is expected to'],
        hl: 2,
        rows: [
          ['Scripts and reruns', 'Write a script, and say what idempotent means.', 'Design reruns, backfills and partial failures so that a retry is safe.'],
          ['Environments', 'Make a virtual environment, and use a lock file.', 'Pin and upgrade on purpose, and make every build reproducible in CI.'],
          ['Structures and streams', 'Pick a list, dict or set, and write a generator.', 'Estimate memory, and design streaming and batching for files that do not fit.'],
          ['Files and formats', 'Read CSV, JSON and Parquet with the right encoding.', 'Choose formats and layouts, write atomically, and partition by date.'],
          ['Time and money', 'Use UTC, aware datetimes and Decimal.', 'Handle clock changes, local days and rounding rules, and reconcile totals.'],
          ['Errors and retries', 'Catch the right error, and retry with a limit.', 'Use backoff and jitter, idempotent loads and watermarks, and handle poison records.'],
          ['APIs and databases', 'Call an API with a timeout, and use SQL parameters.', 'Page safely, obey rate limits, choose transactions and bulk loads.'],
          ['Dataframes', 'Use pandas for joins and groups.', 'Prevent join fan-out, compare engines on memory, and read a query plan.'],
          ['Speed and memory', 'Profile first, and use sets and column operations.', 'Choose threads, processes or asyncio, and explain the GIL.'],
          ['Types and validation', 'Write type hints and validate a row.', 'Set limits, quarantine bad rows, and detect schema drift.'],
          ['Tests and quality', 'Write pytest tests, logs and lint.', 'Test boundaries, use mutation and property tests, and run checks in CI.'],
          ['Shipping and design', 'Give a job a command line, config and secrets.', 'Package it, layer the settings, and split a legacy job into a core and a shell.']
        ],
        steps: [
          { upto: 4, say: 'Reruns, environments, structures and files. A junior uses them. A senior decides how they are laid out and what happens at the edges.' },
          { upto: 8, say: 'Time, retries, APIs and dataframes. These are the places where a quiet mistake becomes a wrong number.' },
          { upto: 12, say: 'Speed, validation, tests and design. They decide whether the platform stays fast, checked and changeable.' }
        ],
        pick: '**Junior path** if you are starting out or interviewing for a junior data engineer role. **Senior path** if you have written Python for data already: it includes every junior topic and adds the design, speed, validation and release decisions. **Everything** adds the newest features and the deepest follow-up questions.'
      }),

      B.rows({
        id: 'm0-setup', t: 1, src: 'docs', title: 'Meet the Brewline setup',
        steps: [
          {
            say: 'This is the setup that the course assumes. Brewline has three sources, and each one is made of real files and calls in the lessons.',
            tabs: [{
              layer: 'SOURCES', name: 'Where the data comes from', c: 'src',
              cols: ['Source', 'How it arrives', 'Format', 'What goes wrong'],
              rows: [
                ['Orders database', 'a nightly export', 'CSV, sometimes compressed', 'late rows, a changed column, a cut file'],
                ['Partner API', 'HTTP, in pages', 'JSON', '429, timeouts, pages that shift while you read'],
                ['Supplier files', 'dropped on an SFTP server', 'CSV', 'encodings, commas in numbers, a missing column']
              ],
              trk: 0
            }],
            notes: ['The lessons use made-up data and a fake partner API that runs on this machine, so every page, every 429 and every timeout is a real answer from real code.']
          },
          {
            say: 'Three jobs, each with a job to do, and the places where this course teaches it.',
            tabs: [{
              layer: 'JOBS', name: 'What each job does', c: 'stg',
              cols: ['Job', 'What it does', 'Missions'],
              rows: [
                ['Extract', 'read, page, retry, keep what arrived', '4, 5, 7, 8'],
                ['Transform', 'clean, convert, join, validate, set aside', '3, 6, 9, 11'],
                ['Load', 'write in a transaction, so that a rerun is safe', '7, 8']
              ],
              trk: 0
            }],
            notes: ['Missions 1 and 2 set the scene and the environment. Missions 10, 12, 13 and 14 are about speed, tests, shipping and design. Mission 15 is the boss round.']
          },
          {
            say: 'The jobs run in three places: your laptop, CI and a server. The same package has to behave the same in all three.',
            tabs: [{
              layer: 'PLACES', name: 'Where a job runs', c: 'ci',
              cols: ['Place', 'Who uses it', 'What must be true there'],
              rows: [
                ['Laptop', 'you, to develop and test', 'the same versions as the server, through the lock file'],
                ['CI', 'a robot, on every change', 'a clean machine, and the checks that block a merge'],
                ['Server', 'the scheduler, every night', 'settings from the environment, secrets from a store, and honest exit codes']
              ],
              trk: 0
            }],
            notes: ['Mission 13 builds a package and runs the checks by hand. The GitHub workflow file is shown, and it was not run, because it needs GitHub.']
          }
        ]
      }),

      B.talk({
        id: 'm0-how', t: 1, src: 'rec', title: 'How this course works',
        say: 'Six quick things before we start. Press Next for each.',
        items: [
          ['SEE, TRY, SAY', 'Every mission watches something work (**SEE**), makes you practise it (**TRY**), then asks the interview question out loud (**SAY**). Orange blocks in a diagram are data moving. Numbers show the order.', 'Watch first, practise second, speak third.'],
          ['Junior, Senior, Extra', 'A small tag on a screen tells you who it is for. No tag means everybody. **Senior** and **Extra** screens appear only on the wider paths.', 'The tag tells you whether a screen is on your path.'],
          ['Two kinds of screen', 'A **Recorded** tag means that I ran the code on one machine and wrote down what it did: ' + VER + '. A **From documentation** tag means that I read it and did not run it. Every output that you see in a terminal screen is a recording, and a check fails if a lesson quotes a number that the recording no longer has.', 'Recorded was run. Documentation was read.'],
          ['What is a stand-in', 'The partner API is a small fake that runs on this machine. The database is SQLite, a real database with the same transaction rules. The 0.25 second waits of the concurrency lab are sleeps that stand in for network calls. The fifty-client retry lab is a simulation, and it says so. The GitHub workflow file was not run.', 'Each stand-in says what it is.'],
          ['Timings are from one machine', 'Every timing is the median of several runs on one shared machine, and it says so. Teach yourself the ratios and the direction. Do not quote a speed-up as a law, and measure on your own data.', 'Ratios, not promises.'],
          ['Controls', 'Press the right and left arrow keys to move. **A-** and **A+** change the text size. **Map** jumps to any mission and switches path. Your progress saves in this browser.', 'Next, Back, arrow keys, Map.']
        ],
        cols: 1
      })
    ]
  });
})();
