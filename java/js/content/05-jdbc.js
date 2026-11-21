/* Mission 5: a database through JDBC, and a build that tests itself. H2 ran in memory on the real JDK 21, and the Maven project ran JUnit 5. A database server and Spark did not run. */
(function () {
  var B = LAB.b, G = LAB.get;
  var C = G.counts, X = G.text, n = G.n;
  var JD = G.file('Jdbc.java'), LOAD = G.file('maven/src/main/java/brewline/Loader.java'), TEST = G.file('maven/src/test/java/brewline/LoaderTest.java');
  var MP = C('maven.package'), MF = C('maven.failing_test'), MR = C('maven.run');
  var T = X('jdbc.run');
  var rb = /rows after (\d+) batches: (\d+)/.exec(T), inj = /glued into the text: (\d+) rows, bound as a parameter: (\d+) rows/.exec(T), tx = /inside the transaction: (\d+)\nafter the rollback: (\d+)/.exec(T), dup = /SQLState (\d+)/.exec(T);
  G.expect(rb && +rb[1] === 4 && +rb[2] === 1000 && inj && +inj[1] === 1000 && +inj[2] === 0 && tx && +tx[1] === 917 && +tx[2] === 1000 && dup && dup[1] === '23505', 'four batches load 1000 rows, a glued value matches every row and a bound one none, a rollback restores 1000 rows and a duplicate key is SQLState 23505');
  G.expect(MP.tests_run === 2 && MF.build_failure && MF.message_has_expected && MR.cents_expected === 226675, 'the Maven build runs 2 tests, a wrong expectation fails the build, and the loader sums 50 orders to 226675 cents');

  LAB.addChapter({
    id: 'm5', n: 5, title: 'A database and a test', short: 'JDBC', blurb: 'JDBC with batches and a transaction, a value that is never glued into SQL, and a JUnit test', minutes: 22,
    focus: ['db'],
    goals: [
      'Load rows with a **`PreparedStatement`** and a **batch**.',
      'Say why a value is **bound as a parameter** and never glued into SQL text.',
      'Use a **transaction**: commit, or roll back.',
      'Read a **JUnit 5** test and a failing build.'
    ],
    say: 'Java is the language of many loaders and connectors, and nearly all of them end in a database call. I ran every example here against H2, a database that runs inside the JVM, so the output is real. A server such as PostgreSQL has its own tutorial, and I did not run one here.',
    scenes: [
      B.flow({
        id: 'm5-flow', t: 1, src: 'rec', title: 'A Java object becomes a row', g: 'jdbc', legend: true,
        steps: [
          { say: 'Your code wants a row in a table. Press Next.', focus: ['app', 'ps', 'drv', 'db'], cap: 'Code, statement, driver, database.' },
          { say: 'Step 1. You write the SQL with **question marks** where the values go. `prepareStatement` sends the text to be parsed **once**. A value is not part of the text.', on: ['e1'], focus: ['app', 'ps'], tags: ['tg_param'], cap: 'SQL and values stay apart.' },
          { say: 'Step 2. You set the values and call `addBatch()` for each row. Every 250 rows the program called `executeBatch()`, and **' + rb[1] + ' batches** put **' + n(+rb[2]) + ' rows** in the table.', on: ['e2', 'e3'], focus: ['ps', 'drv', 'db'], tags: ['tg_batch'], cap: 'A batch saves round trips.' },
          { say: 'Step 3. A **transaction** groups changes. The delete of store 1 left **' + tx[1] + '** rows inside it, and `rollback()` brought back all **' + n(+tx[2]) + '**. `commit()` would have kept the delete.', on: ['e4'], focus: ['db', 'tx'], tags: ['tg_commit'], cap: 'One commit, or nothing.' }
        ]
      }),

      B.code({
        id: 'm5-code', t: 1, src: 'rec', title: 'Jdbc.java: batch, parameter, transaction', file: 'Jdbc.java', lang: 'java', code: JD,
        steps: [
          { say: 'One file that does the three things of the diagram against an in-memory H2 database. Press Next.', lines: null },
          { say: '`DriverManager.getConnection` opens the connection, and **try-with-resources** closes it. The URL `jdbc:h2:mem:brewline` is a database that lives inside this JVM.', lines: G.span(JD, /DriverManager\.getConnection/) },
          { say: 'A **batch**: the statement has four question marks. The loop sets the values, calls `addBatch()`, and every 250 rows calls `executeBatch()`.', lines: G.span(JD, /PreparedStatement ps = c\.prepareStatement\("INSERT/, /^            System\.out\.println\("rows after/) },
          { say: 'The **dangerous** way: the typed value is glued into the SQL text with `+`. A value of `x\' OR \'1\'=\'1` becomes part of the SQL.', lines: G.span(JD, /long glued = count/) },
          { say: 'The **safe** way: the same value is bound with `setString`. The database treats it as text to compare, and nothing breaks out of it.', lines: G.span(JD, /long bound;/, /^            System\.out\.println\("glued/) },
          { say: 'A **transaction**: `setAutoCommit(false)` starts one. The delete is visible inside it, and `rollback()` undoes it.', lines: G.span(JD, /c\.setAutoCommit\(false\)/, /after the rollback/) },
          { say: 'And a **duplicate key** raises an `SQLException`. Its `getSQLState()` is the standard code to branch on.', lines: G.span(JD, /INSERT INTO orders VALUES \('O-1'/, /duplicate key/) }
        ],
        note: 'The classpath holds the H2 jar: `java -cp libs/h2-2.3.232.jar Jdbc.java`.'
      }),

      B.term({
        id: 'm5-out', t: 1, src: 'rec', title: 'What Jdbc.java printed',
        say: 'The real output, line by line. The second line is the one to read twice.',
        lines: function () { return G.plain(T); },
        after: 'The value `x\' OR \'1\'=\'1` found **' + n(+inj[1]) + ' rows** when it was glued into the SQL and **' + inj[2] + ' rows** when it was bound as a parameter. That is **SQL injection**: the glued text turned a search for one status into a condition that is true for every row. A parameter cannot do that, because the database never reads it as SQL. The duplicate key gave SQLState `' + dup[1] + '`.',
        afterKind: 'warn',
        doneSay: 'A parameter cannot become SQL.'
      }),

      B.widget({ id: 'm5-lab', kind: 'sqllab', t: 1, src: 'rec', title: 'Lab: batch, injection, transaction' }),

      B.bug({
        id: 'm5-bug', t: 1, q: 'A loader looks up an order by a status that comes from a web form. Click the line that lets a user write SQL.',
        file: 'Lookup.java', lang: 'java',
        code: 'String status = request.getParameter("status");\nString sql = "SELECT count(*) FROM orders WHERE status = \'" + status + "\'";\ntry (Statement s = c.createStatement(); ResultSet rs = s.executeQuery(sql)) {\n    rs.next();\n    return rs.getLong(1);\n}\n',
        bad: [2],
        hint: 'Where does the value of the user end up?',
        why: 'The value is **glued into the text of the SQL**. In the recording `x\' OR \'1\'=\'1` made the glued query match **' + n(+inj[1]) + ' rows**, and as a parameter it matched ' + inj[2] + '. Use a `PreparedStatement` with `?` and `setString`.',
        fix: 'String status = request.getParameter("status");\ntry (PreparedStatement ps = c.prepareStatement("SELECT count(*) FROM orders WHERE status = ?")) {\n    ps.setString(1, status);\n    try (ResultSet rs = ps.executeQuery()) {\n        rs.next();\n        return rs.getLong(1);\n    }\n}\n',
        cheer: 'Bind it, never glue it.'
      }),

      B.bug({
        id: 'm5-bug2', t: 1, q: 'A job loads 1,000,000 rows. It is slow and the database is busy with tiny requests. Click the line that causes it.',
        file: 'Slow.java', lang: 'java',
        code: 'for (Order o : orders) {\n    try (PreparedStatement ps = c.prepareStatement("INSERT INTO orders VALUES (?, ?, ?)")) {\n        ps.setString(1, o.id());\n        ps.setInt(2, o.store());\n        ps.setLong(3, o.cents());\n        ps.executeUpdate();\n    }\n}\n',
        bad: [6],
        hint: 'How many round trips does this make?',
        why: '`executeUpdate()` inside the loop is **one round trip per row**. The recording used one `PreparedStatement`, called `addBatch()` for each row and `executeBatch()` every 250 rows: **' + rb[1] + ' batches** for **' + n(+rb[2]) + ' rows**. I did not time a remote database, so I give no speed figure. The saving comes from fewer trips, and it is larger the farther the database is.',
        fix: 'try (PreparedStatement ps = c.prepareStatement("INSERT INTO orders VALUES (?, ?, ?)")) {\n    int pending = 0;\n    for (Order o : orders) {\n        ps.setString(1, o.id());\n        ps.setInt(2, o.store());\n        ps.setLong(3, o.cents());\n        ps.addBatch();\n        if (++pending % 1000 == 0) ps.executeBatch();\n    }\n    ps.executeBatch();\n}\n',
        cheer: 'Batch the rows.'
      }),

      B.bug({
        id: 'm5-bug3', t: 2, q: 'A job moves money between two accounts with two updates. One day the second update fails and money disappears. Click the line to fix.',
        file: 'Transfer.java', lang: 'java',
        code: 'c.setAutoCommit(true);\ndebit.executeUpdate();\ncredit.executeUpdate();\n',
        bad: [1],
        hint: 'What does each update do on its own?',
        why: 'With **autocommit on** each statement is its own transaction. The debit is kept even if the credit fails. Turn it off, then `commit()` after both, and `rollback()` in the `catch`. In the recording `rollback()` brought **' + n(+tx[2]) + '** rows back after a delete that had left **' + tx[1] + '**.',
        fix: 'c.setAutoCommit(false);\ntry {\n    debit.executeUpdate();\n    credit.executeUpdate();\n    c.commit();\n} catch (SQLException e) {\n    c.rollback();\n    throw e;\n}\n',
        cheer: 'Both, or neither.'
      }),

      B.code({
        id: 'm5-load', t: 1, src: 'rec', title: 'Loader.java: the pieces together', file: 'Loader.java', lang: 'java', code: LOAD,
        steps: [
          { say: 'The loader of the Maven project in mission 1. It reads a CSV file, converts each amount to cents, loads the rows into H2 and prints a total. Press Next.', lines: null },
          { say: '`parseCents` does the money rule of mission 3: **`BigDecimal` from text**, shifted two places, and **`UNNECESSARY`** so that a value with a third decimal is refused, not rounded.', lines: G.span(LOAD, /public static long parseCents/, /longValueExact/) },
          { say: 'The **CSV format** names the header, and `format.parse(in)` gives the records **one at a time**, so the memory stays flat as in mission 4.', lines: G.span(LOAD, /CSVFormat format = /, /Connection db = /) },
          { say: 'The loop binds three values and **adds each row to a batch**. After the loop one `executeBatch()` sends the rows.', lines: G.span(LOAD, /try \(PreparedStatement insert/, /insert\.executeBatch\(\);/) },
          { say: 'A last query prints the count and the sum. With the 50-order file the real run printed `' + MR.expected_output + '`.', lines: G.span(LOAD, /SELECT count\(\*\), sum\(amount_cents\)/, /rs\.getLong\(2\)/) }
        ],
        note: 'The jar was built with Maven and shaded in mission 1: `java -jar target/loader-1.0.jar orders.csv`.'
      }),

      B.code({
        id: 'm5-test', t: 1, src: 'rec', title: 'LoaderTest.java: a test that builds with the code', file: 'LoaderTest.java', lang: 'java', code: TEST,
        steps: [
          { say: 'A **JUnit 5** test lives under `src/test/java`, next to the code that it checks. `mvn package` runs it before it makes the jar. Press Next.', lines: null },
          { say: 'The first test says what `parseCents` **must** do: `"12.50"` is `1250` and `"5"` is `500`. A test is an example that you can run.', lines: G.span(TEST, /void parsesAmountsAsCents/, /assertEquals\(500/) },
          { say: 'The second test says what it must **refuse**: a value with three decimals throws an `ArithmeticException`. This is the rule that protects the money.', lines: G.span(TEST, /void refusesMoreThanTwoDecimals/, /assertThrows/) }
        ],
        note: 'The Maven build in the recording ran **' + MP.tests_run + '** tests and passed.'
      }),

      B.term({
        id: 'm5-fail', t: 1, src: 'rec', title: 'A test that fails the build',
        say: 'I changed one expectation in the test to a wrong value, `1251`, and ran `mvn test`.',
        lines: function () { return G.plain(X('maven.failing_test')); },
        after: 'The test said what it **expected** (`1251`) and what it **got** (`1250`), the line of the test, and `BUILD FAILURE`. A failing test stops the build **before** a jar exists, so a wrong rule cannot ship by itself. Read the message the way you read a stack trace: the first line that names your own class.',
        afterKind: 'tip',
        doneSay: 'A red test stops the jar.'
      }),

      B.quiz({
        id: 'm5-q1', t: 1,
        q: 'In the recording, a value of `x\' OR \'1\'=\'1` matched every row when it was glued into the SQL. How many rows did it match as a bound parameter?',
        opts: [
          { t: '0, because the database compared it as text', fb: '' },
          { t: '1000, the same as glued', fb: 'That was the glued query.' },
          { t: '1', fb: 'No order has that text as its status.' },
          { t: 'It raised an error', fb: 'It ran without an error and found nothing.' }
        ],
        ok: 0, why: 'The output was `glued into the text: ' + inj[1] + ' rows, bound as a parameter: ' + inj[2] + ' rows`.'
      }),

      B.quiz({
        id: 'm5-q2', t: 1,
        q: 'What does `rollback()` do?',
        opts: [
          { t: 'Undoes the changes since the last commit in the transaction', fb: '' },
          { t: 'Closes the connection', fb: 'It leaves the connection open.' },
          { t: 'Commits the changes', fb: 'That is `commit()`.' },
          { t: 'Restarts the database', fb: 'It does nothing to the server.' }
        ],
        ok: 0, why: 'In the recording a delete left ' + tx[1] + ' rows inside the transaction, and after `rollback()` the table had ' + n(+tx[2]) + ' again.'
      }),

      B.quiz({
        id: 'm5-q3', t: 1,
        q: 'Why does a loader call `addBatch()` and `executeBatch()` instead of `executeUpdate()` for each row?',
        opts: [
          { t: 'Fewer round trips to the database', fb: '' },
          { t: 'It checks the types better', fb: 'The check is the same.' },
          { t: 'It avoids SQL injection', fb: 'That is the job of parameters, not of batches.' },
          { t: 'It makes the table smaller', fb: 'The table is the same.' }
        ],
        ok: 0, why: 'A batch sends many rows in one request. The recording loaded ' + n(+rb[2]) + ' rows in ' + rb[1] + ' batches. I did not time a remote server, so no speed is quoted.'
      }),

      B.quiz({
        id: 'm5-q4', t: 1,
        q: 'A duplicate order id raises an `SQLException` in the recording. What do you read to branch on the kind of error?',
        opts: [
          { t: '`getSQLState()`, which was `' + dup[1] + '` here', fb: '' },
          { t: 'The text of the message', fb: 'The text changes between databases and versions.' },
          { t: 'The line number', fb: 'It says where, not what.' },
          { t: 'The class of the connection', fb: 'It does not say what failed.' }
        ],
        ok: 0, why: 'The SQL state is a standard code, and `23505` is a violated unique constraint. The driver and the database add their own codes and text.'
      }),

      B.quiz({
        id: 'm5-q5', t: 2, src: 'docs',
        q: 'A job gets its connections with `DriverManager.getConnection` inside a loop that handles each request. What do you change for a service that runs all day?',
        opts: [
          { t: 'Use a connection pool such as HikariCP, and borrow and return connections', fb: '' },
          { t: 'Keep one connection for every thread forever', fb: 'It wastes connections and survives failures badly.' },
          { t: 'Open a connection for every row', fb: 'It is the slowest choice.' },
          { t: 'Turn autocommit off', fb: 'That is about transactions, not about connections.' }
        ],
        ok: 0, why: 'Opening a connection costs a network round trip and a login. A pool opens a few and lends them. This is from documentation. A pool did not run in this course.'
      }),

      B.order({
        id: 'm5-ord', t: 1, q: 'Put the steps of a safe load in order.',
        items: ['Open the connection with try-with-resources', 'Switch autocommit off', 'Prepare the statement with question marks', 'Set the values, add each row to a batch, and execute the batches', 'Commit, or roll back if anything failed'],
        why: 'Connection first, then the transaction, then the statement. Values are bound, rows are batched, and one commit decides whether all of it stays.'
      }),

      B.decide({
        id: 'm5-dec', t: 2, src: 'docs', title: 'Decision: how do you load a million rows into a database?',
        scenario: 'A Java job must load a million rows into a PostgreSQL table every night. It currently runs one `INSERT` for each row and takes hours.',
        opts: [
          { t: 'Batch the inserts in one transaction, with a `PreparedStatement`', d: 'The simplest change. Fewer round trips, and a failure rolls everything back.', lose: 'It is still row by row inside the database, and a very large transaction holds locks.' },
          { t: 'Use the bulk loader of the database (`COPY` for PostgreSQL)', d: 'The fastest path that the database offers. The PostgreSQL tutorial of this library records a `COPY`.', lose: 'The driver needs support for it, and the error handling is coarser.' },
          { t: 'Write a file and let another tool load it', d: 'Decouples the steps and lets the tool retry.', lose: 'More moving parts, and a file to clean up.' }
        ],
        pick: 0,
        why: 'Batching is a small, safe change that already removes most round trips, so start there and measure. Move to `COPY` when the batch is still too slow. Both options are from documentation, and no server ran in this course.',
        when: 'A load of tens of millions of rows is normally `COPY` or the bulk tool, and a batch is for the cases in between.'
      }),

      B.incident({
        id: 'm5-inc', t: 2, src: 'rec', title: 'Incident: the nightly loader prints a total that is too low', time: '09:10',
        alert: '**The finance team says that yesterday\'s total from the loader is 1,000 cents lower than the file.** The job did not fail. Its log shows an `SQLException` for a duplicate key, which a `catch` block prints and ignores.',
        clues: ['The loader runs with autocommit on', 'The `catch` prints the error and continues', 'The file holds two rows with the same order id'],
        opts: [
          { t: 'Make the load one transaction, let the error fail the job, and decide what to do about duplicate ids', fb: '' },
          { t: 'Remove the log line so the error disappears', fb: 'The error would be hidden, and the rows would still be missing.' },
          { t: 'Add 1,000 cents to the total', fb: 'It hides the cause.' },
          { t: 'Retry the whole job tonight', fb: 'The same row fails the same way.' }
        ],
        best: 0,
        why: 'The recording showed the two pieces: a duplicate key raised an `SQLException` with SQLState `' + dup[1] + '`, and a transaction can be rolled back as a whole. An error that is printed and ignored turns into silent loss. Let it fail, or handle a duplicate on purpose, for example with an upsert.',
        checks: [
          ['Read the log', 'A duplicate key error that was swallowed.'],
          ['Compare the file with the table', 'One row of 1,000 cents is missing.'],
          ['Find the cause', 'A `catch` that continues after an error.'],
          ['Fix', 'One transaction, and a rule for duplicates.']
        ],
        tell: 'One order in the file had the same id as another. The loader logged the error and went on, so the second row never reached the table, and the total was 1,000 cents too low. I made the load one transaction that fails on an error, and added a rule for duplicate ids. I will alert on a loaded count that differs from the file.',
        prevent: ['Never **swallow** an exception in a loader', 'Compare **row count and total** with the file', 'Decide what a **duplicate** means before the load']
      }),

      B.qa({
        id: 'qa-jdbc', t: 1, tag: 'Java', secs: 60,
        q: 'How do you load rows into a database from Java?',
        pts: ['PreparedStatement, values bound', 'Batches', 'One transaction', 'Close with try-with-resources'],
        short: 'I open the connection in a **try-with-resources**, prepare one `PreparedStatement` with question marks, bind the values for each row, call `addBatch()`, and send the rows with `executeBatch()` every few hundred. In my recording, ' + n(+rb[2]) + ' rows went out in ' + rb[1] + ' batches. I switch autocommit off so that the whole load is one transaction: it commits when everything worked and rolls back when something failed. For a very large load I would use the bulk path of the database, such as `COPY` in PostgreSQL, and I would measure before and after. I ran this against H2 and did not time a real server.',
        fu: [['What about connection pooling?', 'A service borrows connections from a pool such as HikariCP, and does not open one per request.'], ['What if the batch partly fails?', 'BatchUpdateException says which update failed. With one transaction I roll back all of it.']],
        trap: 'One executeUpdate per row.',
        real: 'Describe a load that you sped up.'
      }),

      B.qa({
        id: 'qa-inject', t: 1, tag: 'Java', secs: 45,
        q: 'What is SQL injection and how do you prevent it in Java?',
        pts: ['A value becomes SQL', 'Glued into the text', 'Bind parameters', 'Never build SQL with +'],
        short: 'SQL injection is when a value that someone typed becomes part of the SQL. It happens when the value is glued into the text with `+`. In my test the value `x\' OR \'1\'=\'1` matched all ' + n(+inj[1]) + ' rows when it was glued in, and ' + inj[2] + ' rows when I bound it with `setString` in a `PreparedStatement`. A parameter is sent apart from the SQL, so the database cannot read it as SQL. I build SQL with question marks and bind every value. For a table or column name, which cannot be a parameter, I check the value against a fixed list.',
        fu: [['Can a parameter be a table name?', 'No. Check the name against a list of allowed names.'], ['Does an ORM prevent it?', 'Usually, but a raw query in an ORM can still glue text together.']],
        trap: 'Escaping quotes by hand.',
        real: 'Say where you found this in a code review.'
      }),

      B.qa({
        id: 'qa-tx', t: 1, tag: 'Java', secs: 60,
        q: 'What is a transaction, and how do you use one in JDBC?',
        pts: ['A group of changes, all or none', 'setAutoCommit(false)', 'commit and rollback', 'Keep it short'],
        short: 'A transaction groups changes so that **all of them stay or none do**. In JDBC I call `setAutoCommit(false)`, run the statements, then `commit()`, and in the `catch` I call `rollback()`. In my recording a delete of store 1 left ' + tx[1] + ' of ' + n(+rb[2]) + ' rows inside the transaction and `rollback()` brought back all ' + n(+tx[2]) + '. With autocommit on, each statement is its own transaction, so a failure in the second of two updates cannot undo the first. I keep a transaction **short**, because it holds locks, and I never leave one open while the job waits for something else.',
        fu: [['What are isolation levels?', 'They decide what one transaction sees of another. The default of the database is usually enough, and I read its documentation before I change it.'], ['What about a transaction across two databases?', 'It needs more than JDBC. I design for retries and idempotent writes instead.']],
        trap: 'Autocommit on for a multi-step change.',
        real: 'Describe a change that needed to be atomic.'
      }),

      B.qa({
        id: 'qa-junit', t: 1, tag: 'Java', secs: 45,
        q: 'How do you test a Java loader?',
        pts: ['JUnit 5, in the build', 'Test the rules', 'Test what it must refuse', 'A real database for the integration test'],
        short: 'I use **JUnit 5**, and the tests run in the Maven build (`mvn package` ran ' + MP.tests_run + ' tests before it made my jar). I test the rules as small examples: `"12.50"` is 1250 cents. I also test what the code must **refuse**: a value with three decimals throws an `ArithmeticException`. When I changed an expectation to a wrong value, the build failed with `expected: <1251> but was: <1250>` and no jar was made. For the load itself I use an in-memory database such as H2, or a container with the real database, and a small file with a known total.',
        fu: [['Unit test or integration test?', 'Both. Rules are unit tests, and a database or a file system gets an integration test.'], ['Mocking?', 'I mock the edges that are slow or outside my control, and not the database that I am trying to check.']],
        trap: 'Tests that do not fail when the code is wrong.',
        real: 'Describe a bug that a test caught.'
      }),

      B.recap({
        id: 'm5-recap', n: 5, badge: 'Query Writer', color: '#BFDBFE',
        pts: [
          'A **`PreparedStatement`** with `?` and a **batch** loaded **' + n(+rb[2]) + '** rows in **' + rb[1] + '** batches.',
          'A value glued into SQL matched **' + n(+inj[1]) + '** rows, and bound as a parameter **' + inj[2] + '**. Never glue a value.',
          'A transaction left **' + tx[1] + '** rows inside, and `rollback()` restored **' + n(+tx[2]) + '**.',
          'A duplicate key is SQLState **`' + dup[1] + '`**. Read the code, not the text, and never swallow the exception.',
          'A JUnit test runs in the build, and a wrong expectation stopped it before a jar existed.'
        ],
        lines: [
          'I bind every value.',
          'I batch inside a transaction.',
          'I let a loader fail on an error.'
        ]
      })
    ]
  });
})();
