/* Mission 5: Jinja, macros, variables and packages. */
(function () {
  var B = LAB.b, G = LAB.get;

  var LOOP = G.file('scenario/orders_by_status.sql');
  var LOOP_C = G.sql('compiled/jinja/orders_by_status');
  var LIM = G.file('macros/limit_in_dev.sql');
  var CENTS = G.file('macros/cents_to_dollars.sql');
  var PKG = G.file('packages.yml');
  var NOGUARD = G.file('scenario/status_list_no_guard.sql');
  var GUARD = G.file('scenario/status_list.sql');
  var ERR = G.grep(G.log('jinja_execute_bug'), /has no attribute/).trim();

  LAB.addChapter({
    id: 'm5', n: 5, title: 'Jinja and macros', short: 'Jinja', blurb: 'Templates that run before the SQL does', minutes: 28,
    focus: ['dbt'],
    goals: [
      'Read and write the three **Jinja** delimiters and say when each one runs.',
      'Use **loops**, **`if`**, **`target`** and **`var`** inside a model.',
      'Write a small **macro**, and install a **package**.',
      'Explain **compile time** versus **run time**, and why `run_query` needs an `execute` check.'
    ],
    say: 'Mission 5 is Jinja. Jinja is a templating language: it writes text for you. dbt uses it to write SQL. The warehouse never sees Jinja. It only sees the plain SQL that comes out, and that is the whole trick.',
    scenes: [
      B.talk({
        id: 'm5-talk', t: 1, title: 'Jinja in four points',
        say: 'Press Next for each point.',
        items: [
          ['Three kinds of brackets', '`{{ ... }}` **prints** a value, for example `{{ ref(\'stg_brewline__orders\') }}`. `{% ... %}` **runs** a statement such as `if`, `for` or `set`. `{# ... #}` is a **comment** that never reaches the SQL.', 'Print, run, comment.'],
          ['Jinja runs first', 'dbt evaluates all the Jinja on its own machine while it compiles. The result is plain SQL text, and only that text goes to the warehouse. A `for` loop is finished before the first query starts.', 'The warehouse never sees Jinja.'],
          ['What Jinja is good for', 'Repeating a pattern over a list, switching behavior by environment, reusing an expression in many models, and pulling in code from a package.', 'Loops, conditions, reuse.'],
          ['Keep it small', 'Plain SQL is easier to review, debug and test. Use Jinja where it removes real repetition, and stop there. If a reviewer has to run the template in their head, it is too clever.', 'Clear SQL beats clever Jinja.']
        ],
        cols: 1
      }),

      B.widget({ id: 'm5-compile', t: 1, kind: 'compile', title: 'Lab: read the compiled SQL' }),

      B.sql({
        id: 'm5-loop', t: 1, title: 'A for loop that writes columns', file: 'models/scratch/orders_by_status.sql', code: LOOP,
        compiled: { label: 'What the warehouse receives after compiling', file: 'target/compiled/brewline/.../orders_by_status.sql', code: LOOP_C },
        result: G.result('jinja_orders_by_status'),
        steps: [
          { say: 'This model counts each customer\'s orders by status, with one column per status. Without Jinja you would write the same line three times. Press Next.', lines: null },
          { say: 'The for loop walks over a list of three statuses. Everything between the for and the endfor is repeated once for each item, and s holds the current item.', lines: G.span(LOOP, /\{% for s in/, /\{% endfor %\}/) },
          { say: 'Inside the loop, double braces print the status in two places: as a value to compare, and, lowered, as part of the column name.', lines: G.span(LOOP, /filter \(where/) },
          { say: 'The comma is the classic trap. Every column needs a comma except the last one. loop.last is true on the final turn, so the expression prints a comma on every turn except that one.', lines: G.span(LOOP, /loop\.last/) },
          { say: 'Compiled: three plain columns and no comma after the last one. No loop, no braces. This is the only thing the warehouse ever sees.', compiled: true, lines: G.span(LOOP, /\{% for s in/, /\{% endfor %\}/), clines: G.span(LOOP_C, /count\(\*\) filter \(where order_status = 'PLACED'/, /cancelled_orders/) },
          { say: 'Run it. One row per customer, with one column per status.', run: true, lines: null }
        ],
        note: 'The blank lines inside the loop are removed in the compiled file by Jinja whitespace rules. If you need exact spacing, add a minus sign, as in `{%- ... -%}`.'
      }),

      B.code({
        id: 'm5-macro', t: 1, title: 'A macro: a function written in Jinja', file: 'macros/limit_in_dev.sql', lang: 'jinja', code: LIM,
        steps: [
          { say: 'A macro is a reusable piece of Jinja, like a function. Files in the macros folder are available to every model. This real macro adds a LIMIT, but only in dev. Press Next.', lines: null },
          { say: 'The header gives the macro a name and an argument. row_count has a default of 1000, so a model can call limit_in_dev() or limit_in_dev(5).', lines: G.span(LIM, /^\{% macro/) },
          { say: 'The body asks which target is running. target is a variable that dbt always provides. target.name is dev on a laptop and prod in the scheduler.', lines: G.span(LIM, /target\.name/) },
          { say: 'Only in dev does the macro print a LIMIT. In prod it prints nothing, so production gets every row.', lines: G.span(LIM, /limit \{\{/) }
        ],
        note: 'Developers love this one: fast feedback while writing a model. Use it with care. A limit in dev can hide a join or a fan-out bug until the model reaches production.'
      }),

      B.code({
        id: 'm5-cents', t: 1, title: 'A macro for an expression', file: 'macros/cents_to_dollars.sql', lang: 'jinja', code: CENTS,
        steps: [
          { say: 'Payment providers send amounts in cents. This macro turns a column of cents into dollars. Press Next.', lines: null },
          { say: 'The arguments are the column, or any expression, and the number of decimals. Callers do not have to repeat the formula or the rounding.', lines: G.span(CENTS, /^\{% macro/) },
          { say: 'The body is one line of SQL with two holes. The double braces print the arguments into it.', lines: G.span(CENTS, /round\(/) }
        ],
        note: 'A macro like this is worth writing when **three or more** models need the same expression. For one model, write the SQL and move on.'
      }),

      B.term({
        id: 'm5-inline', t: 1, title: 'See the compiled SQL without a file',
        say: 'You do not need a model file to see what ref() becomes. dbt compile has an inline mode. Watch it resolve a ref to the real relation in the production schema.',
        lines: function () { return G.term('compile_inline'); },
        after: 'The ref became `"brewline"."analytics_staging"."stg_brewline__orders"`. In dev it would be `dev_alice_staging`. Use `--inline` when you are unsure what a ref, a macro or a variable becomes.',
        afterKind: 'tip',
        doneSay: 'A fast way to check Jinja. Type a line, read the result, change it.'
      }),

      B.term({
        id: 'm5-show', t: 1, title: 'Run a macro with dbt show',
        say: 'dbt show runs a query and prints the first rows without saving anything. Here it runs the cents macro on the number 6700. That is 67 dollars, the total of order O-5001.',
        lines: function () { return G.term('show_inline'); },
        after: '6700 cents became 67 dollars through `round(6700 / 100.0, 2)`. `dbt show` is the quickest way to try a macro.',
        afterKind: 'tip',
        doneSay: 'No file, no table, just an answer. Use dbt show while you write.'
      }),

      B.code({
        id: 'm5-pkg', t: 1, title: 'Packages: other people\'s dbt code', file: 'packages.yml', lang: 'yaml', code: PKG,
        steps: [
          { say: 'A package is a dbt project that you install into yours. Its macros and models become available. This project uses dbt_utils, the most common one. Press Next.', lines: null },
          { say: 'Packages are listed in packages.yml. This entry points at the Git repository of dbt_utils and pins a revision, so every developer and every CI run gets the same code. Most teams install from the dbt package hub with a version range. This course used Git, because the hub was not reachable from the machine that built it.', lines: G.span(PKG, /git:/, /revision:/) },
          { say: 'Run dbt deps to download the code into the dbt_packages folder. Commit packages.yml and the lock file, not the folder.', lines: null }
        ],
        note: 'Packages run code on your machine and in your warehouse. Pin versions, read what you install, and upgrade on a branch.'
      }),

      B.term({
        id: 'm5-deps', t: 1, title: 'dbt deps',
        say: 'The install, for real. It clones the package and writes a lock file with the exact revision.',
        lines: function () { return G.term('deps'); },
        after: 'Now `dbt_utils.generate_surrogate_key` is available. In Mission 4 it built the customer key.',
        afterKind: 'tip',
        doneSay: 'One command, and the macros are there.'
      }),

      B.quiz({
        id: 'm5-q1', t: 1,
        q: 'Which bracket pair runs a **statement** such as a `for` loop but prints nothing itself?',
        opts: [
          { t: '`{{ ... }}`', fb: 'Double braces print a value.' },
          { t: '`{% ... %}`', fb: '' },
          { t: '`{# ... #}`', fb: 'That is a comment. It never reaches the SQL.' },
          { t: '`{$ ... $}`', fb: 'Not a Jinja delimiter.' }
        ],
        ok: 1, why: 'Braces with percent signs run statements: `if`, `for`, `set`, `macro`. Double braces print values. Hash marks are comments.'
      }),

      B.quiz({
        id: 'm5-q2', t: 1,
        q: 'When is the Jinja in a model evaluated?',
        opts: [
          { t: 'While dbt compiles the model, before the SQL is sent to the warehouse', fb: '' },
          { t: 'Inside the warehouse, while the query runs', fb: 'The warehouse does not understand Jinja. It never sees it.' },
          { t: 'In the BI tool, when a dashboard opens', fb: 'The BI tool reads finished tables.' },
          { t: 'Only when you run dbt docs generate', fb: 'Docs generation compiles too, but Jinja is evaluated at every compile.' }
        ],
        ok: 0, why: 'dbt renders the template on its own machine and sends only plain SQL. That is why a Jinja `if` cannot look at a row value. It decides what SQL to write, not what the data contains. The exception is `run_query`, which asks the warehouse a question while compiling, and only when `execute` is true.'
      }),

      B.bug({
        id: 'm5-bug', t: 2, q: 'This model asks the warehouse for the list of statuses and builds a column for each. `dbt parse` fails. Click the line that causes it.',
        file: 'models/scratch/status_list.sql', lang: 'jinja', code: NOGUARD, bad: G.at(NOGUARD, /run_query\(statuses_query\)/),
        hint: 'dbt parses the project before it connects to the warehouse. What does run_query return then?',
        why: 'dbt **parses** every model before it runs anything, and during parsing `execute` is false and `run_query` returns nothing. The next call, `.columns`, then fails. The real error says `' + ERR.replace(/^\s+/, '') + '`, which sounds like a missing macro, but the cause is the missing `execute` check. Wrap the call in `{% if execute %}` and give the other branch an empty list.',
        fix: GUARD,
        cheer: 'The error message points in the wrong direction. Knowing parse time from run time saves an hour here.'
      }),

      B.cmp({
        id: 'm5-vars', t: 2, title: 'var, env_var and target: where values come from',
        say: 'Three ways to get a value into a model. Choosing the wrong one leaks a secret or makes a run hard to reproduce. Press Next for each.',
        cols: ['', '`var()`', '`env_var()`', '`target`'],
        hl: 1,
        rows: [
          ['Set in', '`dbt_project.yml` or `--vars` on the command line', 'The operating system environment', 'The profile that you selected with `--target`'],
          ['Good for', 'Project settings such as a start date, or a switch for a backfill', 'Secrets, account names and values that differ per machine', 'Behaviour that depends on dev versus prod'],
          ['Example', '`{{ var(\'min_total\', 0) }}`', '`{{ env_var(\'SNOWFLAKE_ACCOUNT\') }}`', '`{% if target.name == \'dev\' %}`'],
          ['Watch out', 'It is text substitution, so validate it. Never put a secret here', 'Prefix a secret with `DBT_ENV_SECRET_` so dbt keeps it out of the logs', 'Do not branch heavily on it. Environments should behave alike']
        ],
        steps: [
          { upto: 2, say: 'Where each value is set and what it suits.' },
          { upto: 4, say: 'The mistake to avoid for each. Secrets belong in environment variables, ideally with the secret prefix, and not in YAML that gets committed.' }
        ],
        pick: 'Use `var` for project settings, `env_var` for secrets and machine-specific values, and `target` for the few places where dev and prod must differ. The less a model branches on the target, the closer dev is to prod.'
      }),

      B.decide({
        id: 'm5-dec', t: 2, title: 'Decision: macro, package or copy and paste?',
        scenario: 'Four models need the same expression: `round(amount / 100.0, 2)`. A fifth model is coming next week. A teammate suggests installing a package that has a currency helper.',
        opts: [
          { t: 'Copy the expression into each model', d: 'It is one line.', lose: 'Five copies drift. The day someone needs a different rounding rule, you search and edit five files and miss one.' },
          { t: 'Write one small macro', d: 'cents_to_dollars(column, scale), in the macros folder, used by all five models.' },
          { t: 'Install the package for this one line', d: 'No code of our own to maintain.', lose: 'You take on a dependency, its upgrades and its code for a single expression, and the next reader has to look it up.' }
        ],
        pick: 1,
        why: 'A one-line macro is the cheapest abstraction: a single place to edit, easy to read, no dependency. Write it once at the third or fourth use, not the first.',
        when: 'Install a package when it solves something hard and well known, such as a date spine or a surrogate key. Skip the macro when only one model uses the expression.'
      }),

      B.qa({
        id: 'qa-jinja', t: 1, tag: 'Jinja', secs: 60,
        q: 'What is Jinja doing in dbt? Give me an example.',
        pts: ['Jinja is a templating language that dbt evaluates before the SQL is sent', 'ref(), source() and config() are Jinja functions', 'for and if statements generate repeated or conditional SQL', 'Macros are reusable Jinja functions', 'The warehouse only ever sees the compiled SQL'],
        short: 'Jinja is the templating layer. dbt renders it while it compiles a model, and the warehouse only ever receives the plain SQL that comes out. The functions I use all day, ref, source and config, are Jinja functions, and they are how dbt learns the dependency graph.\n\nBeyond that I use it to remove repetition. For example, a model that counts orders by status uses a for loop over the list of statuses, so I write the count once and Jinja writes three columns. I use an if on target.name, so a macro can add a LIMIT in dev and nothing in production. And I put repeated expressions, such as converting cents to dollars, in a macro so there is a single place to change.\n\nI keep it modest. When I debug, I open the compiled file in target/compiled, because that SQL is what actually ran. If a template is hard to read, I go back to plain SQL.',
        fu: [
          ['How do you see what a macro produced?', 'dbt compile and open target/compiled, or dbt compile --inline with the call, or dbt show for the result.'],
          ['Can Jinja read values from a table?', 'Only through run_query, which asks the warehouse while compiling and works only when execute is true. Use it sparingly, because it hides a dependency and slows parsing.']
        ],
        trap: 'Saying Jinja "runs in the warehouse". It is finished before the first statement is sent.',
        real: 'Give a macro you wrote or a loop you used, and what it saved.'
      }),

      B.qa({
        id: 'qa-macro', t: 2, tag: 'Jinja', secs: 75,
        q: 'When do you write a macro, and when do you decide not to?',
        pts: ['A macro pays off when the same logic is needed in three or more places', 'It gives one place to change a rule', 'Prefer a package for well-known problems', 'Skip it for one-off code or when it makes SQL hard to read', 'Test and document macros, and keep arguments simple', 'Know compile time from run time: execute guards for run_query'],
        short: 'I write a macro when the same logic appears in three or more places and I expect it to change as one rule, for example converting cents to dollars, building a surrogate key from a list of columns, or adding a limit in dev. A macro gives me one place to edit and one place to review.\n\nI decide against it when the code is used once, because a macro hides the SQL behind a call and makes a reader jump between files. I also stop when the arguments grow into a mini language. A model full of nested macro calls is harder to debug than the same SQL written out, because the compiled output is what runs.\n\nFor well-known problems I use a package such as dbt_utils instead of writing my own. I treat macros like code: a short comment on what goes in and out, and a quick check with dbt show or a unit test. When a macro asks the warehouse something with run_query, I guard it with an execute check, because dbt parses the project before it connects.',
        fu: [
          ['How would you test a macro?', 'Call it from a scratch model or with dbt show --inline and compare the result with a known answer, or cover the model that uses it with a unit test.'],
          ['What is the risk of too many macros?', 'The compiled SQL gets hard to predict, new team members cannot read a model without opening four other files, and a change to one macro touches many models at once.']
        ],
        trap: 'Describing macros as "always good for reuse". Reuse has a cost in readability.',
        real: 'Name a macro that earned its place, and one you removed because it was too clever.'
      }),

      B.recap({
        id: 'm5-recap', n: 5, badge: 'Jinja Writer', color: '#FDE68A',
        pts: [
          '`{{ }}` **prints**, `{% %}` **runs**, `{# #}` is a **comment**.',
          'Jinja runs while dbt **compiles**. The warehouse only receives plain SQL.',
          '`for`, `if`, `target` and `var` let one file write many shapes of SQL.',
          'A **macro** is a reusable function. Write one at the third use, not the first.',
          'Parsing happens before any connection, so `run_query` needs an **`execute`** check.'
        ],
        lines: [
          'When a model surprises me, I read the compiled SQL.',
          'Secrets go in environment variables, never in vars or YAML.',
          'I keep Jinja small. Plain SQL is easier to review.'
        ]
      })
    ]
  });
})();
