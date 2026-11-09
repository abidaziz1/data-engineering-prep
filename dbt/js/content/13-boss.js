/* Mission 13: case studies, the boss round, and a one-page review. */
(function () {
  var B = LAB.b, G = LAB.get;

  /* Boss round: questions come from the earlier missions, in mission order. Tier 1 is the junior path,
     tier 2 adds the senior questions, tier 3 adds the rest. */
  var BOSS = [
    ['qa-dbt', 1], ['qa-core-platform', 2], ['qa-ref', 1], ['qa-order', 2], ['qa-staging', 1], ['qa-fresh', 2],
    ['qa-grain', 1], ['qa-model-orders', 2], ['qa-jinja', 1], ['qa-macro', 3], ['qa-tests', 1], ['qa-unit', 2],
    ['qa-testfail', 2], ['qa-incr', 1], ['qa-late', 2], ['qa-notincr', 3], ['qa-snap', 1], ['qa-asof', 3],
    ['qa-docs', 1], ['qa-breaking', 2], ['qa-slow', 1], ['qa-jobs', 3], ['qa-cicd', 1], ['qa-slimci', 2], ['qa-orch', 3], ['qa-python', 3]
  ];

  var RENAME_ERR = G.grep(G.log('source_rename'), /Binder Error|Referenced column|not found/).replace(/^\d\d:\d\d:\d\d\s+/gm, '').trim().split('\n')[0];
  var RENAME_LINE = G.grep(G.log('source_rename'), /ERROR creating/).replace(/^\d\d:\d\d:\d\d\s+/gm, '').replace(/\s*\.{2,}\s*/, ' ... ').trim().split('\n')[0];
  var RENAME_DONE = G.grep(G.log('source_rename'), /Done\./).replace(/^\d\d:\d\d:\d\d\s+/gm, '').trim();

  LAB.addChapter({
    id: 'm13', n: 13, title: 'Boss round and cheat sheet', short: 'Boss round', blurb: 'Case studies, a mock interview, a one-page review', minutes: 40,
    focus: ['src', 'stg', 'int', 'mart', 'con', 'dbt', 'qual', 'air', 'snap', 'mon', 'ci'],
    goals: [
      'Solve **case studies** that combine several topics from the course.',
      'Answer a **mock interview round** with a timer, and grade yourself honestly.',
      'Keep a **one-page review** of the commands and the decision rules.'
    ],
    say: 'This is the final mission. First two drills that mix topics, then a design decision, then the boss round: real interview questions with no notes. Be honest when you grade yourself. Honest grades make the scorecard worth reading.',
    scenes: [
      B.incident({
        id: 'm13-inc1', t: 1, title: 'Drill: the loader renamed a column', time: '02:20',
        alert: 'The 02:00 production build failed. The first red line is `' + RENAME_LINE + '`. The loader team deployed a change last night that renamed a column in `raw.orders`.',
        clues: ['The error comes from the staging view for orders, not from a mart', 'Children of the staging view were skipped', 'The final line of the log reads `' + RENAME_DONE + '`'],
        opts: [
          { t: 'Read the first error, fix the one staging model to use the new column name, then run dbt retry', fb: '' },
          { t: 'Ask the loader team to revert their change before doing anything', fb: 'You might need that, but waiting blocks you. The staging model is your isolation layer, and one edit there fixes everything downstream.' },
          { t: 'Edit every mart that uses the order total', fb: 'The marts do not read the raw column. Only the staging model does. That is why staging exists.' },
          { t: 'Disable the staging model so the job turns green', fb: 'You would starve every child and the dashboards.' }
        ],
        best: 0,
        why: 'This is the payoff of staging: **one** file knows the raw column names. The error says `' + RENAME_ERR.replace(/\s+/g, ' ') + '`. You change the select list of one view, run the build again for the failed and skipped nodes with `dbt retry`, and the marts never notice.',
        checks: [
          ['Read the first error', 'It names the model and the missing column. Ignore the list of skipped nodes below it.'],
          ['Confirm the rename', 'Check the raw table\'s columns in the warehouse, or ask the loader team. The new name is in the table.'],
          ['Fix staging only', 'Select the new column and keep the old output name, so no mart changes: `total_amount_usd as order_total_usd`.'],
          ['Retry', 'Run `dbt retry`. Only the failed model and the skipped nodes run.'],
          ['Close the loop', 'Agree with the loader team how schema changes are announced.']
        ],
        tell: 'The 02:00 build failed in the orders staging model because the loader had renamed a column in the raw table. I read the first error, saw the missing column, and changed the staging select to read the new name while keeping the old output name. I ran dbt retry, and only the failed model and its skipped children ran. No mart changed. Then I asked the loader team to announce schema changes, and I added a source test that checks the raw columns we depend on.',
        prevent: ['Add **source tests or a contract** on the raw columns you read, so a rename fails early with a clear message', 'Agree a **change notice** with the loader team for schema changes', 'Keep the **raw column names in one place**: the staging model', 'Alert the **loader owner** as well as the analytics channel']
      }),

      B.incident({
        id: 'm13-inc2', t: 2, title: 'Drill: a warning nobody reads', time: '11:00',
        alert: 'Finance found that two orders carry a total that does not match their lines. The build has printed **WARN 2 assert_order_total_matches_lines** every day for six weeks.',
        clues: ['The test has severity warn, set when it was introduced', 'The warning appears in the log of every run, but nobody gets an alert', 'The two orders are O-5009, lines add up to 29.00 for a 30.00 total, and O-5010, which has no lines at all'],
        opts: [
          { t: 'Treat the warning as a bug: find the cause of the two mismatches, fix it at the source or in the model, and give the test an owner and a threshold', fb: '' },
          { t: 'Delete the test, because it has been noisy for weeks', fb: 'The noise is the point. The test is telling you the truth.' },
          { t: 'Raise the test to error immediately', fb: 'The build would go red every day until the data is fixed. Fix the cause first, then raise it.' },
          { t: 'Mute the warning in the log', fb: 'That repeats the mistake that let it go unseen for six weeks.' }
        ],
        best: 0,
        why: 'A warning is a **decision to defer**, and it needs an owner and a date. Six weeks of the same line means nobody owned it. Find out **why** the two orders disagree, fix it, and **then** raise the test so it protects the pipeline.',
        checks: [
          ['Read the rows', 'The compiled test returns the two orders and both totals. One has a lines gap of 1.00, the other has no lines.'],
          ['Find the cause', 'O-5009: a line was edited without updating the total. O-5010: the lines had not arrived. Ask the source team.'],
          ['Decide the model rule', 'Should an order with no lines count as revenue? Make it a stated rule in the mart, not an accident.'],
          ['Own the test', 'Give the warning an owner and a review date. Add an alert when the count of bad rows changes.'],
          ['Raise it', 'When the count is zero, move the test to error so it stops the next bad load.']
        ],
        tell: 'Finance found two orders whose totals did not match their lines, and our build had printed a warning for it for six weeks without an owner. I read the rows from the test, found a manual edit and an order whose lines had not arrived, got the source team to fix both, and wrote down the rule for an order without lines. Then I gave the test an owner, an alert on any change in the count, and raised it to error once it had been at zero for a week.',
        prevent: ['Every warning gets an **owner** and a **date**', '**Alert** when the number of bad rows goes up, as well as on failure', 'Review all warnings in a **monthly clean-up**', 'Prefer **error** for new rules once the data is clean']
      }),

      B.decide({
        id: 'm13-dec', t: 2, title: 'Decision: your first two weeks on a new dbt project',
        scenario: 'You join Brewline as the first data engineer. There are **40 reports** in a BI tool, built on SQL views that nobody tests. The CEO wants **one trusted revenue number** by the end of the month. You have **two weeks** before the first review.',
        opts: [
          { t: 'Rebuild all 40 reports in dbt first', d: 'Everything in one clean project.', lose: 'In two weeks you will have 40 half-finished models, nothing trusted, and a long list of surprises.' },
          { t: 'Pick the revenue number and build only its chain: sources with freshness, staging with tested keys, one mart with a contract, and CI', d: 'A thin slice from the raw table to the one dashboard people look at.' },
          { t: 'Write the documentation and the style guide first', d: 'A good foundation.', lose: 'Without a working slice, the guide has no examples, and nobody sees progress.' }
        ],
        pick: 1,
        why: 'One trusted number needs one complete chain. A thin slice proves the tools, the conventions and the checks on a real result. Then every other report follows a path that already works, and the CEO sees the first number early.',
        when: 'If the existing reports are already trusted and only slow, start with the slowest and migrate it with the same chain, comparing results to the old view.'
      }),

      B.mockRound(BOSS.map(function (b) { return b[0]; }), BOSS.map(function (b) { return b[1]; })),

      B.cheat({
        id: 'm13-cheat', t: 1, title: 'One-page review',
        say: 'This is your last-minute page. Screenshot it, or print it with your browser. Everything here appears somewhere in the course.',
        sections: [
          { h: 'Commands to type from memory', items: ['`dbt build --select +my_model` develop, then `dbt build` in production', '`dbt ls --select <selector>` checks what a selector matches', '`dbt compile` and `target/compiled` show the SQL that really ran', '`dbt show --select m` or `--inline "..."` previews rows', '`dbt retry` reruns failed and skipped nodes only', '`dbt source freshness`, `dbt docs generate`, `dbt seed`, `dbt snapshot`', '`dbt run-operation macro --args \'{k: v}\'` calls a macro'] },
          { h: 'Selectors', items: ['`+m` parents, `m+` children, `1+m` one step, `@m` children and their parents', '`tag:x`, `path:models/staging`, `config.materialized:incremental`, `source:s+`', 'Space is union. Comma is intersection. `--exclude` removes.', '`state:modified+ --state <dir>` is what changed, with descendants'] },
          { h: 'Materializations', items: ['Views for staging, tables for marts', 'Incremental when the full build hurts. Ephemeral rarely', 'Strategies: append, delete+insert, merge, microbatch', 'Filter on the column that moves when a row changes: the load time', '`unique_key` lets a changed row replace its old version', 'Lookback re-reads recent rows. Full refresh rebuilds. `on_schema_change` handles new columns'] },
          { h: 'Tests', items: ['unique and not_null on every key. relationships on every foreign key. accepted_values for known sets', 'Singular test: a SQL file in tests/ that returns bad rows', 'Unit test: fixed input rows, expected output rows, tests the code', 'Severity warn needs an owner and a date. Then move it to error', 'Freshness catches a loader that stopped. Nothing else does', 'A unit test with the this input needs the table to exist. Create it with the empty flag first'] },
          { h: 'Jinja', items: ['`{{ }}` prints. `{% %}` runs. `{# #}` is a comment', 'Jinja is finished before the warehouse sees the query', 'run_query needs an `execute` check, or parsing fails', '`var` for settings, `env_var` for secrets, `target` for dev versus prod', 'Write a macro at the third use'] },
          { h: 'History and governance', items: ['Snapshot the raw source. An empty `dbt_valid_to` is the current row', 'Timestamp strategy uses the real change time. Check uses the run time', 'Join facts to history with a time range, never on the key alone', 'Contract: names and types, fails before the table is replaced', 'Access: private, protected, public. Groups say who owns what', 'Breaking change: new version and a deprecation date'] },
          { h: 'Delivery', items: ['Targets: dev (own schema), CI (schema per pull request), prod (scheduler only)', 'Override `generate_schema_name` so dev lands in one schema', 'Slim CI: `state:modified+`, `--defer`, `--state`. Keep the production manifest fresh', 'Always drop the pull request schema. Pull requests never use the production target', 'Run a full build of main every night as a backstop'] },
          { h: 'Say it in one line', items: ['dbt is the T in ELT and sends SQL to the warehouse.', 'ref() draws the arrows, and the arrows decide the order.', 'Staging is where the mess stops.', 'Say the grain before you write the SQL.', 'A green build does not prove a correct table.', 'Today\'s attribute on yesterday\'s fact is a wrong number.'] }
        ]
      }),

      B.recap({
        id: 'm13-recap', n: 13, badge: 'dbt Architect', color: '#99F6E4',
        pts: [
          'You can follow a model from **raw table to dashboard**, and say what runs, in what order, and why.',
          'You can **build, test, version and deliver** a dbt project, and explain each choice.',
          'You choose by **evidence**: compiled SQL before guesses, run results before settings, bad rows before reruns.',
          'You know which facts are **new or uncertain**, and you say so.',
          'Next: practise the answers out loud, then run the project yourself with `dbt build`.'
        ],
        lines: [
          'I read the compiled SQL and the first error before I change anything.',
          'I protect every key, every source and every public model.',
          'I say what I know, and I say when I would check the docs.'
        ]
      })
    ].reduce(function (all, x) { return all.concat(x); }, [])
  });
})();
