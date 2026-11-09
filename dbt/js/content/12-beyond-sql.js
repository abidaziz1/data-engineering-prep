/* Mission 12: seeds, hooks, run-operation, grants, Python models, and what is new. */
(function () {
  var B = LAB.b, G = LAB.get;

  var SEED = G.file('seeds/country_names.csv');
  var HOOK = G.file('scenario/on_run_end.yml');
  var PRINT = G.file('scenario/print_counts.sql');
  var PY = G.file('scenario/py_customer_revenue.py');

  var GRANTS = [
    'models:',
    '  brewline:',
    '    marts:',
    '      +grants:',
    '        select: [reporter, analyst]',
    '',
    '    staging:',
    '      +post-hook:',
    '        - "grant select on {{ this }} to role transformer"'
  ].join('\n');

  LAB.addChapter({
    id: 'm12', n: 12, title: 'Beyond SQL models', short: 'Toolbox', blurb: 'Seeds, hooks, run-operation, Python models and what is new', minutes: 30,
    focus: ['dbt'],
    goals: [
      'Use **seeds**, **hooks**, **grants** and **`run-operation`** for the jobs that are not models.',
      'Write a **Python model** and say when SQL is still the better choice.',
      'Decide where a piece of logic belongs: **model, macro, hook or operation**.',
      'Talk about **recent changes** in dbt without claiming more than you know.'
    ],
    say: 'Mission 12 is the toolbox around the models. A dbt project is mostly SELECT statements, but real projects also load small lookup files, grant access, clean up after themselves and sometimes need Python. Knowing which tool fits which job is what an interviewer is listening for.',
    scenes: [
      B.talk({
        id: 'm12-talk', t: 1, title: 'The rest of the toolbox',
        say: 'Five tools, one line each. Press Next for each.',
        items: [
          ['Seeds', 'A CSV file in the `seeds` folder that dbt loads as a table with `dbt seed`. Good for small, stable lookups such as country names. The file is in Git, so changes are reviewed.', 'Small, static, version-controlled.'],
          ['Hooks', 'SQL or Jinja that dbt runs before or after a model or a whole run: granting access, logging, vacuuming. They run in the same command, so they cannot be forgotten.', 'Run something around the build.'],
          ['Grants', 'A config that tells dbt who may read a model. dbt applies it after building, so a rebuilt table does not lose its permissions. The syntax and the privileges depend on the warehouse.', 'Permissions as code.'],
          ['run-operation', 'Call a macro from the command line, with arguments. Handy for housekeeping: print row counts, drop a schema, load a stage.', 'Run a macro on demand.'],
          ['Python models', 'A model written as a Python function that returns a data frame. It runs where the warehouse supports Python: DuckDB in this course, Snowpark on Snowflake, Spark on Databricks.', 'When SQL is the wrong tool.']
        ],
        cols: 1
      }),

      B.rows({
        id: 'm12-seedrows', t: 1, title: 'A seed in practice',
        steps: [
          {
            say: 'This is the real seed file. Four rows, two columns, in a CSV that lives in the repository. dbt seed turns it into a table, and models use it with ref() like any other.',
            tabs: [{ layer: 'SEED', name: 'seeds/country_names.csv', c: 'seed', cols: ['country_code', 'country_name'], rows: G.table('country_names').rows, trk: 0 }],
            code: { file: 'seeds/country_names.csv', lang: 'text', code: SEED },
            notes: ['dim_customers joins to it with `ref(\'country_names\')` to turn a code into a name.', 'A seed is the right size for hundreds of rows. For thousands, load it with a loader instead.']
          }
        ]
      }),

      B.code({
        id: 'm12-hook', t: 1, title: 'A hook that runs at the end', file: 'dbt_project.yml', lang: 'yaml', code: HOOK,
        steps: [
          { say: 'This adds one line to dbt_project.yml. It tells dbt to run something after every run. Press Next.', lines: null },
          { say: 'The key on-run-end takes a list. Each item is SQL or Jinja. This one writes a message with the number of results of the run. The results variable exists only at the end.', lines: G.span(HOOK, /on-run-end:/, /results/) }
        ],
        note: 'Real hooks usually grant privileges, write audit rows, or send a notification. Keep them small and fast: a hook that fails fails the run.'
      }),

      B.term({
        id: 'm12-hookrun', t: 1, title: 'What the hook printed',
        say: 'I ran one model with that hook. Look at the line that appears twice, and at the extra step at the end.',
        lines: function () { return G.term('hook_run'); },
        after: 'The message shows up **twice**. The first, with **0 results**, appears while dbt **parses** the project, because the hook text is rendered once for validation. The second, with 1 result, is the real one at the end. A hook is also a node in the run: it has its own START and OK lines.',
        afterKind: 'tip',
        doneSay: 'Parse time and run time again. A hook that should act only at the end can check the results variable.'
      }),

      B.code({
        id: 'm12-op', t: 1, title: 'run-operation: a macro as a command', file: 'macros/print_counts.sql', lang: 'jinja', code: PRINT,
        steps: [
          { say: 'This macro prints the number of rows of any models you give it. Press Next.', lines: null },
          { say: 'The argument is a list of model names. The loop runs a count query for each one, through ref(), so the name is resolved for the current target.', lines: G.span(PRINT, /for m in models/, /run_query/) },
          { say: 'log with info true prints a line to the terminal. Without it, the message would go only to the log file.', lines: G.span(PRINT, /log\(/) }
        ],
        note: 'Run it with `dbt run-operation print_counts --args \'{models: [fct_orders, dim_customers]}\'`. The next screen shows the real output.'
      }),

      B.term({
        id: 'm12-opout', t: 1, title: 'The macro, run from the terminal',
        say: 'Here is the real output. No model was built and no file was written. It only asked the warehouse two questions.',
        lines: function () { return G.term('run_operation'); },
        after: 'Two lines, two answers: **11** orders and **4** customers. The same pattern drops a pull request schema, grants access to a role or loads a file from a stage.',
        afterKind: 'tip',
        doneSay: 'A macro plus run-operation is a small, reviewed, repeatable script. Better than a SQL snippet in someone\'s notes.'
      }),

      B.code({
        id: 'm12-grants', t: 2, title: 'Grants and a post-hook', file: 'dbt_project.yml', lang: 'yaml', code: GRANTS,
        steps: [
          { say: 'Permissions belong in the project, next to the model, not in a runbook. This is a sketch for Snowflake. It was not run in this course, because DuckDB has no roles. Press Next.', lines: null },
          { say: 'The grants config lists which roles can select from each model in marts. dbt applies it after every build, and it also revokes grants that are no longer listed.', lines: G.span(GRANTS, /\+grants:/, /select:/) },
          { say: 'A post-hook is the free-form alternative. The SQL is rendered with the current model, so this one grants select on the model\'s table to the transformer role.', lines: G.span(GRANTS, /\+post-hook:/, /grant select/) }
        ],
        note: 'The grants config and its exact behavior differ between adapters. Check the documentation for yours. Prefer the config over a post-hook, because dbt then knows about the grant and can keep it correct.'
      }),

      B.code({
        id: 'm12-py', t: 2, title: 'A Python model', file: 'models/scratch/py_customer_revenue.py', lang: 'python', code: PY,
        steps: [
          { say: 'A Python model is a function called model that dbt runs, with two arguments: a dbt object and the session of the warehouse. It must return a data frame. Press Next.', lines: null },
          { say: 'The config call sets the materialization. For Python models the options are table and incremental, not view.', lines: G.span(PY, /dbt\.config/) },
          { say: 'dbt.ref works like ref in SQL: it names the upstream model, so the graph includes this node. On DuckDB it returns a relation, and dot df turns it into a pandas data frame.', lines: G.span(PY, /dbt\.ref/) },
          { say: 'Plain pandas from here: drop cancelled orders, then group by customer and compute the count and the revenue.', lines: G.span(PY, /kept = /, /revenue_usd=/) }
        ],
        note: 'On Snowflake the same idea runs as Snowpark inside the warehouse, and the data frame type and the column case differ. On Databricks it runs as Spark. The model shape is the same, the code is not portable.'
      }),

      B.rows({
        id: 'm12-pyrows', t: 2, title: 'What the Python model produced',
        steps: [
          {
            say: 'dbt created a table called py_customer_revenue. It has one row per customer with the number of orders and the revenue. The log said the model was "python table model".',
            tabs: [{ layer: 'MART', name: 'py_customer_revenue', c: 'mart', cols: G.table('python_model_rows').cols, rows: G.table('python_model_rows').rows, trk: 1 }],
            notes: ['This is real output from DuckDB. Note that it is the same result a SQL model would give. For this task, SQL would be shorter and easier to review.']
          }
        ]
      }),

      B.cmp({
        id: 'm12-where', t: 2, title: 'Where does this logic belong?',
        say: 'A common interview question is where to put a piece of logic. Press Next to read the options.',
        cols: ['Tool', 'What it is for', 'It runs', 'Example here'],
        hl: 1,
        rows: [
          ['SQL model', 'Turn a SELECT into a table or a view', 'On `dbt run` and `dbt build`', '`stg_brewline__orders`'],
          ['Macro', 'Reuse an expression or a pattern in many places', 'While compiling, when called', '`cents_to_dollars`'],
          ['Seed', 'A small, stable lookup table from a CSV', 'On `dbt seed` and `dbt build`', '`country_names`'],
          ['Snapshot', 'The history of a mutable source table', 'On `dbt snapshot` and `dbt build`', '`snap_customers`'],
          ['Hook', 'Something before or after a model or run, such as grants', 'Around a run', '`on-run-end`'],
          ['run-operation', 'A housekeeping macro that you start by hand or in a job', 'On demand', '`print_counts`, `drop_schema`'],
          ['Python model', 'Logic that SQL cannot express well', 'On `dbt run` and `dbt build`', '`py_customer_revenue`']
        ],
        steps: [
          { upto: 4, say: 'The first four build or load data. They are the core of a project.' },
          { upto: 7, say: 'The rest wrap or extend it: hooks, operations and Python.' }
        ],
        pick: 'Default to a **SQL model**. Reach for a macro when you repeat yourself, a seed for a small lookup, a hook for permissions, and a Python model only when the logic really needs a library or a loop that SQL handles badly.'
      }),

      B.decide({
        id: 'm12-dec', t: 2, title: 'Decision: SQL or a Python model?',
        scenario: 'Brewline wants to **classify free-text delivery notes** into categories such as "left with neighbour" or "damaged". There are **50,000** notes a day. A data scientist offers a Python function that uses a text library, and the warehouse supports Python models.',
        opts: [
          { t: 'Write it in SQL with a long CASE and LIKE patterns', d: 'Stays in the usual toolbox.', lose: 'A few hundred patterns of regular expressions are fragile and hard to review, and they miss most of the real variation in the text.' },
          { t: 'A Python model that applies the function and writes a table', d: 'The logic is in a reviewed file, and dbt tracks it in the graph like any other model.' },
          { t: 'Run it in a notebook once a week and paste the results', d: 'No engineering.', lose: 'Nobody can reproduce it, it breaks the lineage, and the results go out of date quietly.' }
        ],
        pick: 1,
        why: 'This is the case a Python model is made for: logic that needs a library and does not fit relational operations. dbt keeps it in the graph, so lineage, scheduling, tests and docs still work. Keep the joins, filters and aggregations around it in SQL.',
        when: 'If the logic fits a few joins and a CASE, stay in SQL. If the work is heavy machine learning, run it in a proper ML pipeline and load the result as a source.'
      }),

      B.quiz({
        id: 'm12-q1', t: 1,
        q: 'What are **seeds** best used for?',
        opts: [
          { t: 'Small, stable lookup data that should be reviewed in Git, such as a list of country names', fb: '' },
          { t: 'Loading a 50 GB export from the orders database', fb: 'Seeds are CSV files in a repository. They are for small files.' },
          { t: 'Storing secrets', fb: 'Never. Everything in the repository is readable.' },
          { t: 'Creating staging views automatically', fb: 'Seeds load data. They do not generate models.' }
        ],
        ok: 0, why: 'A seed is a CSV that lives in Git and is loaded as a table with `dbt seed`. The file is reviewed like code, and dbt treats the table as a node in the graph.'
      }),

      B.quiz({
        id: 'm12-q2', t: 1,
        q: 'What does `dbt run-operation` do?',
        opts: [
          { t: 'Runs a macro from the command line, with arguments', fb: '' },
          { t: 'Runs all the models in a folder', fb: 'That is dbt run.' },
          { t: 'Starts the scheduler', fb: 'dbt Core has no scheduler.' },
          { t: 'Runs a unit test', fb: 'That is dbt test.' }
        ],
        ok: 0, why: 'It calls a macro by name. The macro can run queries, log messages or change the warehouse. Typical uses are housekeeping jobs: drop a schema, print counts, apply grants, refresh a stage.'
      }),

      B.quiz({
        id: 'm12-q3', t: 2,
        q: 'Which materializations can a Python model use in dbt Core?',
        opts: [
          { t: 'table and incremental', fb: '' },
          { t: 'view and ephemeral', fb: 'A Python model returns a data frame that the adapter saves, so it cannot be a view or a CTE.' },
          { t: 'Any of them', fb: 'The options are limited.' },
          { t: 'None. A Python model only returns data', fb: 'It builds a table like a SQL model.' }
        ],
        ok: 0, why: 'The adapter writes the returned data frame to a table, so Python models can be tables or incremental. The documentation for your adapter lists exactly what is supported, and it differs from warehouse to warehouse.'
      }),

      B.talk({
        id: 'm12-new', t: 3, title: 'What is new, and how sure I am',
        say: 'You will be asked what is new. The vendor documentation could not be opened when this course was built, so every fact on this screen comes from release summaries and search results. Treat it as a map of what to look up, not as a source.',
        items: [
          ['dbt Core 1.12', 'Summaries of the release say it added an opt-in faster parser, switched on with `--use-v2-parser`, an `on_error` setting for models that decides what happens when an upstream model fails, updates to the semantic layer specification, and changes to function and Iceberg catalog settings. This course used version ' + LAB.real.meta.dbt + '.', 'Confirm the list on the release page.'],
          ['dbt v2 and the Fusion engine', 'The version banner printed by dbt Core said that dbt v2 is available and is the default for new installations. The install pages described Fusion as the engine of v2. Sources disagreed on which warehouses had general availability and which had a preview, and on licensing, so check the vendor\'s availability page.', 'Verify status and license before you recommend it.'],
          ['Upgrades are mostly deprecations', 'Release notes for 1.12 mentioned that flags introduced in 1.9 and 1.10 now default to on. So the practical upgrade step is the same as always: install the new version on a branch, run `dbt parse`, fix every deprecation warning, and compare the results of a full build before and after.', 'Pin the version, upgrade on a branch.'],
          ['The company around it', 'Press releases said Fivetran and dbt Labs completed their merger in mid 2026, and that dbt Core stays open source under the Apache 2.0 license. Say what you read, and do not guess what it means for your contract.', 'Facts, not forecasts.']
        ],
        cols: 1
      }),

      B.qa({
        id: 'qa-seeds', t: 1, tag: 'Toolbox', secs: 45,
        q: 'What are seeds in dbt, and when would you use one?',
        pts: ['A CSV file in the repository that dbt loads as a table', 'Small, stable lookup data', 'Reviewed in pull requests like code', 'Referenced with ref() like a model', 'Not for large or fast-changing data'],
        short: 'A seed is a CSV file in the seeds folder that dbt loads into the warehouse as a table with dbt seed. Because the file is in Git, changes go through a pull request and are reviewed like code. Models read it with ref(), so it appears in the lineage like any other node.\n\nI use seeds for small, stable lookup data that belongs to the business logic: country names, a mapping from product codes to categories, a list of test accounts to exclude. A few hundred rows is comfortable.\n\nI do not use them for large files or for data that changes daily. That is the job of a loader, and the data should arrive as a source, with freshness checks. I also never put secrets or personal data in a seed, because the repository is readable by many people.',
        fu: [
          ['How do you test a seed?', 'The same way as a model: unique and not_null tests on the key, and accepted_values for a code list, in the YAML.'],
          ['What happens if you change a seed?', 'Run dbt seed, or a build, and the table is replaced. Models that read it need a rebuild to pick up the change if they are tables.']
        ],
        trap: 'Using a seed as a way to load a big export. The repository is not a data lake.',
        real: 'Name a seed you maintained, how many rows, and who changed it.'
      }),

      B.qa({
        id: 'qa-python', t: 2, tag: 'Toolbox', secs: 75,
        q: 'When would you write a Python model instead of SQL, and what are the trade-offs?',
        pts: ['When the logic needs a library or procedural code that SQL expresses badly', 'It stays in the dbt graph: lineage, scheduling, tests and docs still work', 'Runs where the warehouse supports Python: Snowpark, Spark, DuckDB', 'Only table and incremental materializations', 'Not portable between warehouses, and harder to review', 'Default to SQL; keep Python small'],
        short: 'My default is SQL. It is shorter, easier to review, and runs close to the data. I write a Python model when the logic needs something SQL does badly: a text or statistics library, a loop with state, parsing of an awkward format. A Python model is still a node in the dbt graph, so lineage, scheduling, tests and docs work as for any model, and the surrounding joins and aggregations stay in SQL.\n\nThe trade-offs matter. It runs only where the warehouse supports Python, such as Snowpark on Snowflake or Spark on Databricks, and the data frame type and even the column case differ between them, so the code is not portable. Python models can be tables or incremental only. They are harder to review and to test, and they may cost more compute. So I keep them small, I put business rules in SQL, and I unit-test the Python function as ordinary code outside dbt.',
        fu: [
          ['How do you test one?', 'Test the function as normal Python with sample data, and add data tests on the resulting table like any other model.'],
          ['What about heavy machine learning?', 'I would run training in a proper pipeline and load predictions as a source. A Python model suits light scoring and cleaning, not long-running training.']
        ],
        trap: 'Choosing Python because it feels more powerful. Choose it because SQL cannot do the job well.',
        real: 'Describe a Python model you wrote, what library it needed, and what it cost to run.'
      }),

      B.qa({
        id: 'qa-new', t: 3, tag: 'Toolbox', secs: 60,
        q: 'What have you been following in dbt lately?',
        pts: ['Name two or three specific changes and the version', 'Say how you learned about them: release notes, the docs', 'Say what you tried or would try, on a branch', 'Be clear about what you have not verified', 'Mention how you handle upgrades: pin, branch, fix deprecations, compare'],
        short: 'I follow the release notes of dbt Core and what the vendor says about the next major version. From what I read, Core 1.12 added an opt-in faster parser, a setting for what should happen when an upstream model fails, and semantic layer updates, and the version banner now says dbt v2 is available and the default for new installs, built on the Fusion engine. I know that the status and the license of the new engine differ by warehouse, so I would check the vendor\'s availability page before recommending it.\n\nHow I handle upgrades matters more than the list. I pin versions, upgrade on a branch, run dbt parse and fix every deprecation warning first, and then I compare a full build before and after: same models, same row counts, same test results. I try new features on a branch with a small project and I say plainly what I have and have not tested.',
        fu: [
          ['Would you move production to the new engine?', 'Not on a headline. I would run it on a branch, compare outputs, check the adapter status and license, and move one low-risk project first.'],
          ['How do you keep up?', 'Release notes, the changelog of the packages I use, and a short note in the team channel when something changes our routine.']
        ],
        trap: 'Repeating marketing language. Say what you tested and what you did not.',
        real: 'Name one feature you tried, what you saw, and whether you adopted it.'
      }),

      B.recap({
        id: 'm12-recap', n: 12, badge: 'Toolbox Owner', color: '#E2E8F0',
        pts: [
          '**Seeds**: small, stable CSV lookups in Git. Not for big data.',
          '**Hooks** run around a run or a model. **Grants** keep permissions in code.',
          '**run-operation** calls a macro on demand, for housekeeping.',
          '**Python models** are for logic SQL does badly. Default to SQL.',
          'Talk about **new features** by naming what you read, what you tested, and what you did not.'
        ],
        lines: [
          'I default to SQL and reach for Python only when I must.',
          'Permissions live in the project, not in a runbook.',
          'I upgrade dbt on a branch and compare a full build before and after.'
        ]
      })
    ]
  });
})();
