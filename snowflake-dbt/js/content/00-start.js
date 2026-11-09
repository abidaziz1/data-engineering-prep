/* Mission 0: pick a path, see the whole platform, meet the Brewline setup. */
(function () {
  var B = LAB.b, G = LAB.get;
  var VER = 'dbt-snowflake ' + G.meta('dbt-snowflake') + ' with dbt Core ' + G.meta('dbt-core');

  LAB.addChapter({
    id: 'm0', n: 0, noIntro: true, title: 'Start here', short: 'Start', blurb: 'Pick your path and see the whole platform', minutes: 8,
    scenes: [
      B.welcome({ id: 'welcome' }),

      B.flow({
        id: 'm0-map', t: 1, title: 'Brewline on Snowflake with dbt: the whole picture', g: 'master', legend: true,
        steps: [
          { say: 'Brewline sells coffee online. Its data already lands in Snowflake, copied there by loader tools that are not dbt. This course starts after that. It follows one pipeline from RAW tables to the marts that people read, and then the controls around it. Press Next to walk the map once.', cap: 'Every mission in this course is one part of this picture.' },
          { say: 'Step 1. Loader tools copy data from the orders database, the website and supplier files into Snowflake. dbt does not do this part. The copied tables sit in the RAW schema, exactly as they arrived.', on: ['e1a', 'e1b', 'e1c'], focus: ['ld_db', 'ld_web', 'ld_csv', 'raw'], cap: 'Loading is **not** dbt\'s job. RAW belongs to the loaders.' },
          { say: 'Step 2. dbt is a program. It turns your model files into SQL and sends that SQL to Snowflake. It holds no data. The work runs on a virtual warehouse, which is the compute that Snowflake bills you for while it runs.', on: ['e6'], focus: ['dbt', 'g_wh'], cap: 'dbt writes the SQL. The warehouse runs it.' },
          { say: 'Step 3. Staging models clean one RAW table each. They rename columns, cast types and keep the latest version of every row. They are views, so they take no storage.', on: ['e2'], focus: ['raw', 'stg'], keepGroups: true, cap: 'One staging model per RAW table. Mission 2 shows the exact statement.' },
          { say: 'Step 4. Intermediate models join and reshape the staged tables. The result is a building block that no dashboard reads directly.', on: ['e3'], focus: ['stg', 'int'], keepGroups: true, cap: 'Here the order lines are added up and joined to the orders.' },
          { say: 'Step 5. Marts are the finished tables: facts such as orders, dimensions such as customers. dbt builds them as tables, and they are the only layer other people query.', on: ['e4'], focus: ['int', 'mart'], keepGroups: true, cap: 'Mission 3 builds the biggest one, incrementally.' },
          { say: 'Step 6. Dashboards read the marts through a read-only role. A secure view can also share a mart with another Snowflake account.', on: ['e5a', 'e5b'], focus: ['mart', 'bi', 'sh'], cap: 'Mission 6 covers who may read what.' },
          { say: 'Around the flow sit five controls. Roles decide who may do what. Cost control sizes the warehouse. Security protects keys and personal data. Recovery undoes mistakes. Environments keep dev, CI and production apart.', focus: ['c_roles', 'c_cost', 'c_sec', 'c_rec', 'c_ci'], keepGroups: true, cap: 'Missions 4, 5, 6 and 7. Mission 8 runs it all on a schedule.' }
        ]
      }),

      B.cmp({
        id: 'm0-levels', t: 1, title: 'Junior or senior: what changes',
        say: 'Same tools, different expectations. Press Next to read the gap area by area. Notice that a senior is judged on decisions and on what happens when something breaks, not on knowing more syntax.',
        cols: ['Area', 'A junior is expected to', 'A senior is expected to'],
        hl: 2,
        rows: [
          ['Connect', 'Run `dbt debug`, read a profile, and know which role and warehouse a run uses.', 'Choose how people and schedulers sign in, rotate keys, and keep secrets out of the repository.'],
          ['Objects', 'Say which statement a view, a table and an incremental model send.', 'Choose transient or permanent, clustering, secure views and dynamic tables on purpose.'],
          ['Incremental', 'Read a merge and say why a filter on the load time works.', 'Choose the strategy, handle late rows, and run a backfill without duplicates.'],
          ['Cost', 'Know that a warehouse bills while it runs and that a bigger one costs more an hour.', 'Size warehouses, set auto-suspend, tag queries, and find the model that spends the credits.'],
          ['Environments', 'Run in a developer schema without touching production.', 'Design dev, CI and production with clones, deferral and a schema per pull request.'],
          ['Security', 'Never commit a secret, and use the role you were given.', 'Design roles, grants, masking and secure views, and prove who can read what.'],
          ['Recovery', 'Say what Time Travel is.', 'Restore a table after a bad release, and protect history that cannot be rebuilt.'],
          ['Running', 'Run `dbt build` and read the result.', 'Schedule, retry and alert, and stop two runs from colliding.']
        ],
        steps: [
          { upto: 3, say: 'Connecting, building objects and incremental models. A junior reads and runs them. A senior decides how they are built.' },
          { upto: 6, say: 'Cost, environments and security. These are where seniors earn the title, because a mistake here costs money or exposes data.' },
          { upto: 8, say: 'Recovery and running. They decide whether the platform survives its second year and its tenth contributor.' }
        ],
        pick: '**Junior path** if you are starting out or interviewing for a junior or analytics engineer role. **Senior path** if you have used dbt or Snowflake already: it includes every junior topic and adds the cost, security, environment and recovery decisions. Use the **Map** button to switch whenever you like.'
      }),

      B.rows({
        id: 'm0-setup', t: 1, title: 'Meet the Brewline setup',
        steps: [
          {
            say: 'This is the Snowflake account the course uses. One database holds production. Two more hold the developer copies and the pull request copies. The loaders write to RAW. dbt writes to everything else.',
            tabs: [{
              layer: 'ACCOUNT', name: 'Databases and schemas', c: 'raw',
              cols: ['Database', 'Schema', 'Who writes there', 'What lives there'],
              rows: [
                ['BREWLINE', 'RAW', 'the loaders', 'tables as loaded, nothing cleaned'],
                ['BREWLINE', 'STAGING', 'dbt', 'one view per RAW table'],
                ['BREWLINE', 'INTERMEDIATE', 'dbt', 'views that join and reshape'],
                ['BREWLINE', 'MARTS', 'dbt', 'facts and dimensions, as tables'],
                ['BREWLINE', 'REFERENCE', 'dbt', 'seed tables such as country names'],
                ['BREWLINE_DEV', 'DEV_ALICE', 'one developer', 'a private copy of everything'],
                ['BREWLINE_CI', 'PR_123', 'the pull request check', 'a temporary copy for one pull request']
              ],
              trk: 0
            }],
            notes: ['Missions 2 and 5 show where each of these names comes from in the dbt files.']
          },
          {
            say: 'Five roles and four warehouses. Each role can do one job and no more. Each warehouse has a size that fits its job.',
            tabs: [{
              layer: 'ACCOUNT', name: 'Roles and warehouses', c: 'raw',
              cols: ['Name', 'Kind', 'Used by', 'Why it exists'],
              rows: [
                ['TRANSFORMER', 'role', 'dbt in dev and production', 'owns the schemas dbt builds in, and reads RAW'],
                ['CI_DEPLOYER', 'role', 'the pull request check', 'can create schemas in BREWLINE_CI and nothing else'],
                ['REPORTER', 'role', 'the dashboard tool', 'select on MARTS only'],
                ['ANALYST', 'role', 'people', 'select on MARTS, sees masked emails'],
                ['PII_READER', 'role', 'a few approved people', 'sees the real email addresses'],
                ['WH_TRANSFORM', 'warehouse', 'production runs', 'sized for the nightly build'],
                ['WH_TRANSFORM_DEV', 'warehouse', 'developers', 'small, suspends after 60 seconds'],
                ['WH_CI', 'warehouse', 'pull request checks', 'small'],
                ['WH_BI', 'warehouse', 'the dashboard tool and analysts', 'small, stays warm a few minutes']
              ],
              trk: 0
            }],
            notes: ['These names are the design this course uses. A real account will differ, and the reasons behind each choice matter more than the names.']
          }
        ]
      }),

      B.talk({
        id: 'm0-how', t: 1, title: 'How this course works',
        say: 'Five quick things before we start. Press Next for each.',
        items: [
          ['SEE, TRY, SAY', 'Every mission watches something work (**SEE**), makes you practise it (**TRY**), then asks the interview question out loud (**SAY**). Orange blocks in a diagram are data moving. Numbers show the order.', 'Watch first, practise second, speak third.'],
          ['Junior, Senior, Extra', 'A small tag on a screen tells you who it is for. No tag means everybody. **Senior** and **Extra** screens appear only on the wider paths.', 'The tag tells you whether a screen is on your path.'],
          ['Recorded, not typed', 'Every SQL statement that dbt sends in this course was **recorded** from ' + VER + ', running the Brewline project. A stand-in replaced the connection: it wrote down each statement and answered dbt\'s questions about what exists. **Nothing ran on a Snowflake account.** So the statements are exact. Results, timings and credit numbers on screen are examples, and each screen says so. Facts about Snowflake itself, such as defaults and limits, come from Snowflake\'s public documentation as known when this course was written. Check the current page before you rely on a number.', 'If a screen shows a statement, dbt sent it.'],
          ['Run it yourself', 'The Brewline project is the one from the dbt course, in `dbt/verify/project`. To try it on Snowflake, create the objects from the setup screens, put the profile from mission 1 in `~/.dbt/profiles.yml`, and run `dbt build`. A trial or personal account is enough. Suspend the warehouse and drop what you create when you finish.', 'Typing builds skill. Reading builds recognition.'],
          ['Controls', 'Press the right and left arrow keys to move. **A-** and **A+** change the text size. **Map** jumps to any mission and switches path. Your progress saves in this browser.', 'Next, Back, arrow keys, Map.']
        ],
        cols: 1
      })
    ]
  });
})();
