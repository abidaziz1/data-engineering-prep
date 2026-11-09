/* Mission 6: data tests, unit tests, severity, and what to do when one fails. */
(function () {
  var B = LAB.b, G = LAB.get;

  var Y = G.file('models/staging/brewline/_brewline__models.yml');
  var TESTSQL = G.sql('compiled/test/accepted_values');
  var SING = G.file('tests/assert_order_total_matches_lines.sql');
  var GEN = G.file('tests/generic/positive_value.sql');
  var UT = G.file('models/staging/brewline/_brewline__unit_tests.yml');
  var UTI = G.file('models/marts/core/_core__unit_tests.yml');
  var SEV = G.file('scenario/severity.yml');
  var BADV = G.file('scenario/accepted_values_lowercase.yml');
  var BADV_FAIL = G.grep(G.log('bad_values'), /FAIL \d+ accepted_values/).replace(/^\d\d:\d\d:\d\d\s+/, '').replace(/\s*\.{2,}\s*.*$/, '').replace(/^\d+ of \d+ /, '');
  var BADV_N = (BADV_FAIL.match(/FAIL (\d+)/) || [0, '?'])[1];
  var UTCH = G.file('scenario/ch_m6_unit_test.yml');
  var UTCH_PASS = G.grep(G.log('unit_challenge'), /PASS /).replace(/^\d\d:\d\d:\d\d\s+/, '').replace(/\s*\.{2,}\s*/, ' ... ');

  LAB.addChapter({
    id: 'm6', n: 6, title: 'Tests and data quality', short: 'Tests', blurb: 'Data tests, unit tests, severity, and a failing build', minutes: 34,
    focus: ['qual'],
    goals: [
      'Say what a **test** is in dbt, and read one that fails.',
      'Add **generic**, **singular** and **custom** tests, and set their **severity**.',
      'Write a **unit test** and tell it from a data test.',
      'Run the **first response** to a failing test in production.'
    ],
    say: 'Mission 6 is trust. A dashboard is only as good as the checks behind it. dbt makes a test a query that must return no rows, and that one idea gives you a whole toolbox.',
    scenes: [
      B.talk({
        id: 'm6-talk', t: 1, title: 'A test is a query that should return nothing',
        say: 'Five points. Press Next for each.',
        items: [
          ['Zero rows means pass', 'Every dbt data test is a `SELECT` that returns the rows that **break** a rule. No rows, the test passes. One or more, it fails, and dbt prints how many.', 'A test finds the bad rows.'],
          ['Generic tests are in YAML', 'Four come with dbt: `unique`, `not_null`, `accepted_values` and `relationships`. You attach them to a column in the YAML file next to the model.', 'unique, not_null, accepted_values, relationships.'],
          ['Singular tests are SQL files', 'For a rule that fits no generic test, write a query in `tests/`. It passes when it returns nothing.', 'One SQL file, one rule.'],
          ['Unit tests check the logic', 'A data test checks the **real data**. A unit test gives a model **fixed input rows** and compares the output with the rows you expect. It proves the SQL, not the data.', 'Data tests ask "is the data right?" Unit tests ask "is the code right?"'],
          ['Tests run after the model', 'With `dbt build`, a model is built, then its tests run, then its children build. A failing test stops the children, so bad data does not spread.', 'build puts tests between a model and its children.']
        ],
        cols: 1
      }),

      B.code({
        id: 'm6-yaml', t: 1, title: 'Generic tests in YAML', file: 'models/staging/brewline/_brewline__models.yml', lang: 'yaml', code: Y,
        steps: [
          { say: 'This is the real YAML file for the staging models. The model is described once, and each column lists its tests. Press Next.', lines: null },
          { say: 'The model name and a description. The description appears in the docs. Mission 9.', lines: G.span(Y, /- name: stg_brewline__orders/, /description: One row per order/) },
          { say: 'The key. unique fails if a value appears twice, and not_null fails if it is empty. Put this pair on the key of every model.', lines: G.span(Y, /^      - name: order_id/, /^          - not_null/) },
          { say: 'relationships checks that every customer_id in orders exists in the customers model. The to and field values go under arguments. This is the newer syntax.', lines: G.span(Y, /^      - name: customer_id/, /field: customer_id/) },
          { say: 'accepted_values lists the statuses the business knows about. When a new one appears, the test fails and somebody has to decide what it means.', lines: G.span(Y, /^      - name: order_status/, /values: \[/) },
          { say: 'positive_value is not one of the four. The project wrote it, and a later screen shows how. Used here it checks that no order total is zero or negative.', lines: G.span(Y, /^      - name: order_total_usd/, /- positive_value/) }
        ],
        note: 'Older projects write `tests:` where this file says `data_tests:`. Both worked for a long time. The newer name avoids a clash with unit tests.'
      }),

      B.sql({
        id: 'm6-sql', t: 1, title: 'What a generic test really is', file: 'target/compiled/brewline/.../accepted_values_stg_brewline__orders...sql', code: TESTSQL,
        result: G.result('store_failures_rows', '1 row, so the test fails'),
        ctx: { role: 'dev_alice', wh: 'DuckDB, local', db: 'brewline.analytics' },
        steps: [
          { say: 'Here is the SQL that dbt generated for the accepted_values test on order_status. I added one order with the status REFUNDED to RAW first. Press Next to read it.', lines: null },
          { say: 'The first part counts rows per status in the model under test.', lines: G.span(TESTSQL, /^with all_values as/, /^\)$/) },
          { say: 'The second part keeps only the statuses that are **not** in the allowed list. These are the rows that break the rule.', lines: G.span(TESTSQL, /^select \*/, /^\)$/) },
          { say: 'Run it. One row comes back: REFUNDED, with one record. dbt counts the rows and reports the test as FAIL 1. With the store failures option, dbt saves these rows in a table so you can look at them.', run: true, lines: null }
        ],
        note: 'The query was written by dbt, not by you. It is also saved in `target/compiled`, and the failure message gives its path.'
      }),

      B.term({
        id: 'm6-fail', t: 1, title: 'A build with four failing tests', g: 'dag',
        say: 'I added four bad orders to RAW: one with no customer, one for a customer that does not exist, one with a negative total, and one with the new status REFUNDED. Then I ran the tests for the orders staging model. Watch the staging block.',
        initial: G.wait('dag'),
        lines: function () { return G.term('test_fail_many'); },
        after: 'Four tests **failed**, and three passed. The message under each failure says `Got 1 result, configured to fail if != 0` and prints the path of the compiled SQL. Open that file, run it in a worksheet, and you see the bad row.',
        afterKind: 'warn',
        doneSay: 'Each failure names its test and its column in the test name. That is why the names are long: they say what broke.'
      }),

      B.widget({ id: 'm6-lab', t: 1, kind: 'testlab', title: 'Lab: which check catches it?' }),

      B.sql({
        id: 'm6-singular', t: 1, title: 'A singular test: one rule, one SQL file', file: 'tests/assert_order_total_matches_lines.sql', code: SING,
        result: G.result('assert_rows', '2 rows, so the test warns'),
        steps: [
          { say: 'Some rules involve two models, and no generic test fits them. Write the query yourself. This one finds orders whose total differs from the sum of their lines.', lines: null },
          { say: 'The config makes the severity warn. A warning shows in the log but does not stop the build. The team chose this because the source data has known mismatches and nobody has fixed them yet.', lines: G.span(SING, /config\(severity/) },
          { say: 'The query itself. It selects the orders where the two totals disagree.', lines: G.span(SING, /^select$/, /order_total_usd <> items_total_usd/) },
          { say: 'Run it. Two orders break the rule: O-5009, where the lines add up to 29.00 and the order says 30.00, and O-5010, which has no lines at all. This is exactly the WARN 2 you saw in the first build.', run: true, lines: null }
        ],
        note: 'A singular test lives in `tests/` and is named after what it checks. Start the name with `assert_` and the intent reads like a sentence.'
      }),

      B.code({
        id: 'm6-generic', t: 1, title: 'A custom generic test', file: 'tests/generic/positive_value.sql', lang: 'jinja', code: GEN,
        steps: [
          { say: 'When you want the same rule on many columns, write a generic test once. This is the real one from the project. Press Next.', lines: null },
          { say: 'It is a macro with a special block. The two arguments are always the same: the model under test and the column. Anything else becomes a named argument.', lines: G.span(GEN, /\{% test positive_value/) },
          { say: 'The body returns the rows that break the rule: any value that is zero or negative. Same contract as every test: bad rows out.', lines: G.span(GEN, /^select \*/, /^where/) }
        ],
        note: 'Once defined, the test is available by name in any YAML file, as in `- positive_value`. The project uses it on order totals and on line quantities.'
      }),

      B.code({
        id: 'm6-sev', t: 1, title: 'Severity and thresholds', file: 'models/staging/brewline/_brewline__models.yml', lang: 'yaml', code: SEV,
        steps: [
          { say: 'By default one bad row fails a test. You can make that softer. Press Next.', lines: null },
          { say: 'warn_if says: show a warning when the number of bad rows is greater than zero. error_if says: fail the build only when it is greater than five. Between the two, the test only warns.', lines: G.span(SEV, /warn_if/, /error_if/) }
        ],
        note: 'Use `severity: warn` for a rule you are still learning, such as a known data problem. Move it to error once the data is clean, so it can protect the pipeline.'
      }),

      B.term({
        id: 'm6-sevrun', t: 1, title: 'One bad row, warn threshold crossed',
        say: 'I added one order with a total of minus five and ran the test with those thresholds. One bad row is above zero, so it warns. It is not above five, so it does not fail.',
        lines: function () { return G.term('severity'); },
        after: 'The line says **WARN 1**. The build goes on, and the warning stays in the log for the team to see.',
        afterKind: 'tip',
        doneSay: 'A warning is a decision, not a hiding place. Put an owner and a date on every test you leave at warn.'
      }),

      B.code({
        id: 'm6-unit', t: 1, title: 'A unit test: fixed input, expected output', file: 'models/staging/brewline/_brewline__unit_tests.yml', lang: 'yaml', code: UT,
        steps: [
          { say: 'Data tests look at the real tables. A unit test checks the SQL itself, with rows you made up. It needs no data in the warehouse, so it can run anywhere. Press Next.', lines: null },
          { say: 'The test has a name and a description, and says which model it tests.', lines: G.span(UT, /- name: test_stg_orders_keeps/, /model: stg_brewline__orders/) },
          { say: 'The input. Three raw rows replace the source: order O-1 appears twice, placed and then shipped, and O-2 appears once.', lines: G.span(UT, /^    given:/, /O-2, customer_id: C-2/) },
          { say: 'The expected output: two rows. For O-1 only the shipped version should remain. dbt runs the model on the fake input and compares the result with these rows.', lines: G.span(UT, /^    expect:/, /O-2, customer_id: C-2/) }
        ],
        note: 'Unit tests arrived in dbt Core 1.8. They suit logic that is easy to get wrong: window functions, case statements, date maths and deduplication.'
      }),

      B.term({
        id: 'm6-unitfail', t: 1, title: 'A unit test that fails', g: 'dag',
        say: 'I changed the staging model to keep the **oldest** version instead of the newest, by flipping the sort. The real data still looks fine. The unit test is the only thing that notices.',
        initial: G.wait('dag'),
        lines: function () { return G.term('unit_fail'); },
        after: 'dbt prints a **diff**: the expected row for O-1 had status SHIPPED and a load time of 11:05, but the model returned PLACED and 10:05. That is exactly the bug.',
        afterKind: 'warn',
        doneSay: 'The diff shows only the cells that differ. Read the arrow: expected on the left, actual on the right.'
      }),

      B.code({
        id: 'm6-unitinc', t: 2, title: 'Unit-testing an incremental model', file: 'models/marts/core/_core__unit_tests.yml', lang: 'yaml', code: UTI,
        steps: [
          { say: 'An incremental model behaves differently on the first run and on later runs. A unit test can pretend to be a later run. Press Next.', lines: null },
          { say: 'The override tells dbt to treat is_incremental() as true, so the WHERE clause is active.', lines: G.span(UTI, /^    overrides:/, /is_incremental: true/) },
          { say: 'The upstream input has two orders: O-1 with a newer load time than the table, and a brand new O-2.', lines: G.span(UTI, /input: ref/, /O-2, customer_id: C-2/) },
          { say: 'The special input called this stands for the table as it is **before** the run. It holds the old version of O-1.', lines: G.span(UTI, /input: this/, /order_status: PLACED/) },
          { say: 'The expected result: O-1 appears once with the newer version and O-2 is added. That is what the delete and insert should produce.', lines: G.span(UTI, /^    expect:/, /O-2, customer_id: C-2/) }
        ],
        note: 'You are testing the model SQL and the incremental filter. You are not testing the strategy that dbt applies afterwards.'
      }),

      B.term({
        id: 'm6-freshbuild', t: 2, title: 'The first build in a fresh schema fails', g: 'dag',
        say: 'Now a surprise from a real run. I ran dbt build in an empty schema, the situation of every new CI run. The unit test on the incremental model fails, and everything behind it is skipped.',
        initial: G.wait('dag'),
        lines: function () { return G.term('build_fresh_fail'); },
        after: 'The error says dbt **could not read the columns** of `fct_orders` because the table does not exist yet. A unit test with the `this` input needs the real table to learn its column types. Nothing is wrong with the data.',
        afterKind: 'warn',
        doneSay: 'A skip cascade looks scary, but it is dbt protecting the children. Read the first red line, not the last.'
      }),

      B.term({
        id: 'm6-fix', t: 2, title: 'The fix: create empty tables first', g: 'dag',
        say: 'The fix is to create the missing tables empty, with the empty flag, and then build. The flag adds a limit of zero rows to every ref and source, so it runs fast and writes nothing but the table shapes.',
        initial: G.wait('dag'),
        lines: function () { return G.term('empty_shell'); },
        after: 'Four models were created with **zero rows**: three staging views and the empty `fct_orders`. A normal `dbt build` after this one passes, because the unit test can now read the table. CI jobs on fresh schemas often start with this step.',
        afterKind: 'tip',
        doneSay: 'Run the cheap shell first. Then the real build.'
      }),

      B.cmp({
        id: 'm6-layers', t: 2, title: 'Layers of data quality',
        say: 'No single check catches everything. A mature project stacks them. Press Next to read each layer.',
        cols: ['Layer', 'What it catches', 'Runs with', 'Cost'],
        hl: 1,
        rows: [
          ['Source freshness', 'The loader stopped or is late', '`dbt source freshness`, on its own schedule', 'One tiny query per source'],
          ['Generic data tests', 'Duplicate keys, nulls, unknown values, orphan rows', '`dbt build`', 'One query per test, scales with table size'],
          ['Singular tests', 'Rules between models, such as totals that must agree', '`dbt build`', 'Whatever your query costs'],
          ['Unit tests', 'Logic mistakes in a model, found with fake rows', '`dbt build` or `dbt test`', 'Almost free: tiny inputs'],
          ['Contracts', 'A public model changing its shape', 'Every build of that model', 'Free: checked while building'],
          ['Observability tools', 'Volume drops and drift that no rule describes', 'Separate tools on a schedule', 'A subscription or your own jobs']
        ],
        steps: [
          { upto: 2, say: 'Freshness and generic tests guard the data coming in and the keys of what you build.' },
          { upto: 4, say: 'Singular and unit tests guard your own logic and your own rules.' },
          { upto: 6, say: 'Contracts guard the promise to consumers, and observability watches for things you did not think to write a rule for.' }
        ],
        pick: 'Start with freshness on sources, unique and not_null on every key, and relationships on every foreign key. Add singular tests for the rules your finance team cares about. Add unit tests for the tricky logic. Add contracts to the models other teams build on.'
      }),

      B.bug({
        id: 'm6-bug', t: 1, q: 'The team wrote this test for the order status. It fails on **every** row, although the data is fine. Click the line that causes it.',
        file: 'models/staging/brewline/_brewline__models.yml', lang: 'yaml', code: BADV, bad: G.at(BADV, /values:/),
        hint: 'Staging changed the status text. Check the model.',
        why: 'The staging model upper-cases the status, so the values are `PLACED`, `SHIPPED` and `CANCELLED`. A list in lower case matches nothing. I ran it and dbt printed `' + BADV_FAIL + '`: every distinct status counted as bad. A test must use the values the model really produces.',
        fix: G.file('models/staging/brewline/_brewline__models.yml').split('\n').slice(G.at(Y, /^      - name: order_status/) - 1, G.at(Y, /values: \[/)).join('\n'),
        cheer: 'When a test fails on everything, suspect the test before the data.'
      }),

      B.quiz({
        id: 'm6-q1', t: 1,
        q: 'A generic test such as `unique` **passes** when the query that dbt generates for it...',
        opts: [
          { t: 'returns zero rows', fb: '' },
          { t: 'returns exactly one row', fb: 'One row would be a failure to report.' },
          { t: 'returns at least one row', fb: 'Rows returned are the bad rows. They make the test fail.' },
          { t: 'runs faster than five seconds', fb: 'Time has no effect on the result.' }
        ],
        ok: 0, why: 'Every data test selects the rows that **break** a rule. No such rows means the data follows the rule. That is also why you can write a singular test as plain SQL with the same shape.'
      }),

      B.quiz({
        id: 'm6-q2', t: 1,
        q: 'The reconciliation test `assert_order_total_matches_lines` returns 2 rows, and its severity is `warn`. What does `dbt build` do?',
        opts: [
          { t: 'It stops and skips every model that depends on the tested model', fb: 'That happens for severity error, not warn.' },
          { t: 'It prints WARN 2, keeps going, and counts it as a warning at the end', fb: '' },
          { t: 'It ignores the test completely', fb: 'It still runs and still reports. It just does not stop the build.' },
          { t: 'It deletes the two bad rows', fb: 'dbt never changes data to fix a test.' }
        ],
        ok: 1, why: 'The first build printed `WARN 2 assert_order_total_matches_lines` and ended with `WARN=1`. A warning is visible and does not block. Decide who fixes the data, and move the test to error when it is clean.'
      }),

      B.quiz({
        id: 'm6-q3', t: 2,
        q: 'Why add a **unit test** when you already have data tests on the model?',
        opts: [
          { t: 'Data tests only check the data that exists today. A unit test checks the logic with rows you chose, including cases that are rare or not there yet', fb: '' },
          { t: 'Unit tests run faster on very large tables', fb: 'They use tiny fake inputs, but speed is not the reason.' },
          { t: 'Data tests cannot run on views', fb: 'They can.' },
          { t: 'Unit tests replace the need for source freshness', fb: 'They check logic, not the clock.' }
        ],
        ok: 0, why: 'A data test passes if today\'s data happens to be fine. A unit test builds the awkward case on purpose: two versions of one order, a null, a date on a boundary. It proves the code handles it, before that case shows up in production.'
      }),

      B.order({
        id: 'm6-ord', t: 1, q: 'Put the steps of adding a test to an existing model in order.',
        items: [
          'Decide the risk: what could go wrong, and what would it cost?',
          'Choose the cheapest check that catches it',
          'Write it in the YAML next to the model',
          'Run it with dbt test --select <model> and read the result',
          'If it fails, decide whether the data or the rule is wrong',
          'Set the severity and write down who owns a failure'
        ],
        why: 'Start from the risk, not from the tool. Run the test before you commit it, because a test that fails on day one teaches you about the data. And decide the severity and the owner while the context is fresh.'
      }),

      B.incident({
        id: 'm6-inc', t: 2, title: 'Incident: a unique test fails at six in the morning', time: '06:12',
        alert: 'The 06:00 production build ended with **FAIL 1 unique_fct_orders_order_id**. Anna from finance says revenue for yesterday looks about one order too high.',
        clues: ['The test passed every day for three months', 'A pull request that touches fct_orders merged yesterday at 17:40', 'One order, O-5010, appears twice in fct_orders'],
        opts: [
          { t: 'Rerun the build, it is probably a one-off', fb: 'A test failure is deterministic. The same data gives the same result, so a rerun only loses time.' },
          { t: 'Read the failing rows and the last change to the model', fb: '' },
          { t: 'Rebuild fct_orders with --full-refresh right now', fb: 'It may clear the symptom, but you would not know why it happened, and it would happen again tomorrow.' },
          { t: 'Set the test to warn so the pipeline turns green', fb: 'The data is wrong. Hiding the alarm leaves the wrong number on the dashboard.' }
        ],
        best: 1,
        why: 'A failing test hands you the bad rows and the time it started. The failing rows say **what** is wrong, and the last change says **why**. Both take minutes to read.',
        checks: [
          ['Read the failing rows', 'Run the compiled test SQL, or use store failures. O-5010 appears twice, once as PLACED and once as SHIPPED.'],
          ['Check what changed', 'git log on the model. Yesterday\'s pull request set `incremental_strategy=\'append\'`. Append never deletes the older version.'],
          ['Find the blast radius', '`dbt ls --select fct_orders+` lists the children. fct_daily_revenue sums the table, so the day is too high. Check the exposures.'],
          ['Mitigate', 'Revert the pull request, then run `dbt run --select fct_orders --full-refresh`, then rebuild the children.'],
          ['Confirm', 'Run `dbt build --select fct_orders+` and check the unique test and the day\'s revenue.']
        ],
        tell: 'Our unique test on fct_orders failed at six. I read the failing rows, found one order twice, and checked the history of the model. A pull request had switched the incremental strategy to append, which never removes the older version of an order that changes. I reverted it, rebuilt the table with a full refresh, and reran the children. Revenue was back to correct by seven.',
        prevent: ['Keep **unique** and **not_null** at error severity on every key', 'Run CI on data that includes an **updated row**, so append-style bugs show before merge', 'Require a note in the pull request when the **incremental strategy** changes', 'Send test failures to the **owner** of the model, as well as to a shared channel']
      }),

      B.decide({
        id: 'm6-dec', t: 2, title: 'Decision: how do you add tests to a project with none?',
        scenario: 'You inherit **40 models** and no tests. The next release is in **two days**, and the data team has had three wrong-number incidents this quarter.',
        opts: [
          { t: 'Add every test you can think of, all at error severity', d: 'Maximum coverage.', lose: 'On day one half of them fail on old data issues. The pipeline goes red, the team mutes the alerts, and the tests lose their value.' },
          { t: 'Start with keys and freshness, at error, and add rule tests as warnings', d: 'unique and not_null on every key, relationships on foreign keys, freshness on sources. Business rules start at warn until the data is clean.' },
          { t: 'Wait until the data is clean, then add tests', d: 'No red builds.', lose: 'The data is never cleaned without a list of what is wrong. Tests are that list.' }
        ],
        pick: 1,
        why: 'Keys and freshness are cheap, rarely wrong, and protect the most. Rules often meet old data problems, so let them warn first, fix the data, then turn them into errors. You get protection in two days, without a wall of red.',
        when: 'In a regulated report, raise the key and rule tests to error from the first day and fix the data first.'
      }),

      B.challenge({
        id: 'm6-ch', t: 2,
        q: 'Write a **unit test** for `stg_brewline__customers`. Give it **one raw customer** with a mixed-case email and a lower-case country, and expect the model to return the email in lower case and the country code in upper case.',
        data: [{ name: 'Model under test: stg_brewline__customers', cols: ['column', 'what the model does'], rows: [['email', 'lower(email)'], ['country', 'upper(country), renamed to country_code']] }],
        lang: 'yaml', file: 'models/staging/brewline/_brewline__unit_tests.yml',
        starter: 'unit_tests:\n  - name: test_stg_customers_cleans_email_and_country\n    model: stg_brewline__customers\n    given:\n      # your input rows\n    expect:\n      # your expected rows',
        hints: ['The input is the source: `input: source(\'brewline\', \'customers\')`, with the raw column names.', 'The expected rows use the **output** column names, such as `country_code`.', 'Give every column that the model selects a value in the expected row.'],
        sol: UTCH,
        expl: ['I ran this exact test with dbt. Result: `' + UTCH_PASS + '`.', 'The input row uses raw names: `country` and `email`. The expected row uses the model\'s output names: `country_code`.', 'One tiny row is enough to prove the cleaning logic. Add more rows only for edge cases such as an empty email.'],
        cx: 'No warehouse data is read. The test runs on the rows in the YAML.'
      }),

      B.qa({
        id: 'qa-tests', t: 1, tag: 'Data quality', secs: 60,
        q: 'How do you test data in dbt?',
        pts: ['Generic tests: unique, not_null, accepted_values and relationships in YAML', 'Singular tests for rules that involve more than one model', 'Source freshness for late loaders', 'Unit tests for tricky logic', 'dbt build runs tests between a model and its children', 'Severity: error for keys, warn for rules the data does not meet yet'],
        short: 'I use layers. Every model gets unique and not_null on its key, and relationships on foreign keys, written in the YAML next to the model. Columns with a known set of values get accepted_values, so a new status makes a test fail instead of silently falling out of a report. Rules that involve several models, such as order totals matching line totals, become singular tests: a SQL file that returns the broken rows.\n\nFor sources I configure freshness, because tests cannot notice a loader that stopped. For tricky logic, such as the deduplication in staging, I write unit tests with a few fake rows.\n\nI run everything with dbt build, which tests a model before its children are built, so bad data stops spreading. Keys and freshness are errors. New business rules start as warnings until the data is clean, and then I raise them. A warning always gets an owner.',
        fu: [
          ['What does a test failure look like?', 'A line such as FAIL 1 unique_fct_orders_order_id, then the number of bad rows and the path of the compiled SQL, which I can run to see them.'],
          ['How do you keep tests cheap on big tables?', 'Test keys on the marts and the sources, not every column, limit tests to recent partitions with the where config, and run the heavy ones less often.']
        ],
        trap: 'Listing the four generic tests and stopping. Say what each layer protects and what happens when one fails.',
        real: 'Describe a bad value that a test caught, how it got into the data, and how you fixed the cause.'
      }),

      B.qa({
        id: 'qa-unit', t: 2, tag: 'Data quality', secs: 75,
        q: 'What is the difference between a data test and a unit test in dbt, and when do you use each?',
        pts: ['Data tests run on real data and ask whether it follows a rule', 'Unit tests give a model fixed input rows and compare its output with expected rows', 'Unit tests check the SQL logic, including rare or missing cases', 'Unit tests need no data in the warehouse and run in CI', 'Use data tests for keys and constraints; unit tests for window functions, case statements, dates and deduplication', 'Incremental models need the this input and an existing table'],
        short: 'A data test asks whether today\'s data follows a rule: no duplicate keys, no nulls, only known statuses. It runs on the real tables, so it catches bad data from outside.\n\nA unit test asks whether my SQL is right. I give the model a few fixed input rows that I wrote, define the output I expect, and dbt compares them. I can build the awkward cases on purpose: two versions of one order, a null, a date on a boundary. It needs no data in the warehouse, so it runs fast in CI and catches a bug before the code reaches production data.\n\nI use data tests on every key and on rules that depend on the data. I use unit tests for logic that is easy to get wrong, such as deduplication with a window function, case statements and date arithmetic. For an incremental model I use the this input to stand for the existing table, and I make sure the table exists before the test runs, for example with a run using the empty flag.',
        fu: [
          ['Do unit tests replace data tests?', 'No. A unit test passes even when the real data is broken. Both are needed.'],
          ['Why did the unit test on the incremental model fail in a fresh schema?', 'The this input needs the real table to learn its column types. In an empty schema the table does not exist, so I create it empty first.']
        ],
        trap: 'Saying unit tests "test the data". They test the code.',
        real: 'Describe a bug a unit test caught that the data tests would have missed.'
      }),

      B.qa({
        id: 'qa-testfail', t: 2, tag: 'Operations', secs: 90,
        q: 'A dbt test fails in production. Walk me through what you do.',
        pts: ['Read the failing rows and the compiled SQL', 'Check what changed: code, a source or a load', 'Decide the blast radius with lineage and exposures', 'Mitigate: revert or fix forward, protect consumers', 'Confirm with dbt build on the model and its children', 'Add prevention: a test, a review rule or an alert owner'],
        short: 'First I read, I do not rerun. A test failure is deterministic. The log gives the test name, the number of bad rows and the path of the compiled SQL. I run that SQL or use store failures to see the actual rows. That tells me what is wrong.\n\nThen I ask what changed. I look at the model history for a recent pull request, and at the sources for a late or odd load. Usually one of the two explains it. I check lineage to see which children and which dashboards are affected, and I tell the owner of those dashboards early.\n\nNext I mitigate. If a change caused it, I revert and rebuild with a full refresh when the table is incremental. If the source sent bad data, I fix the cause with the loader owner and decide whether the model should filter it. I do not mute the test. Finally I confirm with dbt build on the model and its children, and I add prevention: a better test, a CI check on an updated row, or a clearer owner for the alert.',
        fu: [
          ['When is it OK to set a test to warn?', 'When the rule is new and the data has known old problems, with an owner and a date to fix them. Never to make a red build green.'],
          ['How do you stop children from using bad data?', 'Use dbt build, which skips the children of a failed test, and set error severity on keys. For critical dashboards, keep the last good table until the build passes.']
        ],
        trap: 'Starting with "rerun it" or "change the severity". Start by looking at the bad rows.',
        real: 'Tell a real incident: the alert, how long diagnosis took, and the prevention you added.'
      }),

      B.recap({
        id: 'm6-recap', n: 6, badge: 'Test Author', color: '#FCA5A5',
        pts: [
          'A data test is a query that returns the **broken rows**. Zero rows means pass.',
          '**Generic** tests live in YAML, **singular** tests in `tests/`, **custom generic** tests are written once.',
          '**Unit tests** feed fake rows to a model and compare the output. They test the code, not the data.',
          '**Severity** decides whether a failure stops the build. Warn is a decision with an owner.',
          'In a failure: **read the rows**, check what changed, find the blast radius, then fix.'
        ],
        lines: [
          'Every key gets unique and not_null. Every source gets freshness.',
          'When a test fails, I read the bad rows before I touch anything.',
          'A warning needs an owner and a date, or it is a lie.'
        ]
      })
    ]
  });
})();
