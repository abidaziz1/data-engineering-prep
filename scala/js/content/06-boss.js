/* Mission 6: boss round. Two drills that mix the missions, a design decision, a coding round that ran on the real Scala 2.13.16 compiler, a mock interview and a one-page review. */
(function () {
  var B = LAB.b, G = LAB.get;
  var C = G.counts, X = G.text, n = G.n, M = function (k) { return G.meta(k); };
  var BN = C('build.binary'), NL = C('build.no_library'), BJ = C('build.jar'), L = C('lang'), KC = C('coll'), E = C('err'), KS = C('spark'), ES = C('spark.errors'), CH = C('challenge');
  var CF = G.file('Challenge.scala'), SOL = G.lines(CF, G.at(CF, /def parseCents/), G.span(CF, /def centsByStore/, /^  }$/)[1]);
  G.expect(CH.good_output === CH.expected && /^Left\(List\(line 8: bad store id: 'x', line 9: more than two decimals: '12\.505'\)\)$/.test(CH.bad_output), 'the coding round solution gives the cents by store that Python worked out, and reports each bad line with its number');

  var QA = [['qa-versions', 1], ['qa-classpath', 1], ['qa-scala3', 2],
    ['qa-caseclass', 1], ['qa-sealed', 1], ['qa-matcherror', 2], ['qa-valvar', 1],
    ['qa-collections', 1], ['qa-lazy', 1], ['qa-mappitfalls', 1], ['qa-fold', 2],
    ['qa-option', 1], ['qa-eithertry', 1], ['qa-badrows', 2],
    ['qa-closure', 1], ['qa-dataset', 1], ['qa-encoder', 2], ['qa-collect', 2]];

  LAB.addChapter({
    id: 'm6', n: 6, title: 'Boss round', short: 'Boss round', blurb: 'Two drills, a decision, a coding round, a mock interview and a one-page review', minutes: 34,
    focus: ['src', 'stg', 'ing', 'mart', 'mon', 'air'],
    goals: [
      'Solve **drills** that combine several missions.',
      'Write **cents by store**, collecting bad lines, in one pass over an iterator.',
      'Answer a **mock interview round** with a timer, and grade yourself honestly.',
      'Keep a **one-page review** of the rules and the recorded numbers.'
    ],
    say: 'This is the last mission. Two drills in which more than one thing goes wrong, one design decision, one coding round, and then the interview questions with no notes. Grade yourself honestly. An honest grade is the only one worth reading.',
    scenes: [
      B.incident({
        id: 'm6-drill1', t: 1, src: 'rec', title: 'Drill 1: a refund stops the job, and the beans are short', time: '06:50',
        alert: '**The nightly job stopped at 02:10 with `scala.MatchError: Refunded`, and the report that finished the night before says 5 bags of BEANS-250 where the store sold 7.** The fee step matches on the status. The quantity report builds a map from `sku -> qty` pairs with `toMap`.',
        clues: ['The fee step has no case for refunds, and the compile log has a warning', 'BEANS-250 has two lines on the day', 'Only the SKUs that repeat in a day are wrong'],
        opts: [
          { t: 'Add the missing case with a test, make the build fail on that warning, and group and add the quantities instead of `toMap`', fb: '' },
          { t: 'Catch `MatchError` and add 2 to BEANS-250', fb: 'Refunds are dropped, and the next repeated SKU is wrong in the same way.' },
          { t: 'Add `case _ => 0` and sort the lines', fb: 'It hides the next new status, and sorting does not fix the map.' },
          { t: 'Roll back to last week and say nothing', fb: 'Both bugs are still there.' }
        ],
        best: 0,
        why: 'Two missions at once. **Mission 2**: the compiler warned `match may not be exhaustive. It would fail on the following input: ' + L.missing_input + '`, and the run ended in `scala.MatchError`. **Mission 3**: `toMap` gave `BEANS-250 -> 5` where `groupMapReduce` gave `BEANS-250 -> 7`.',
        checks: [
          ['Read the errors', 'A MatchError on Refunded, and a quantity that is short.'],
          ['Read the build log', 'A warning that a match may not be exhaustive.'],
          ['Read the report code', 'toMap keeps the last value of a repeated key.'],
          ['Fix both', 'Add the case, add a test, group and add, and fail the build on the warning.']
        ],
        tell: 'The fee step had no case for refunded orders, so the first refund stopped the job, and the compiler had warned about it. The quantity report used toMap, which keeps one value for a repeated key, so a SKU with two lines lost one. I added the case and a test, changed the report to group and add, and made the build fail on that warning.',
        prevent: ['Make the build fail on **exhaustiveness warnings**', 'Never use **`toMap`** on data that may repeat a key', 'Test with **every case** and a **repeated key**']
      }),

      B.incident({
        id: 'm6-drill2', t: 2, src: 'rec', title: 'Drill 2: it ran on the laptop, and fails on the cluster, twice', time: '15:10',
        alert: '**A new release of the Spark job failed with `java.lang.NoSuchMethodError` on the cluster. You fixed that, and now it fails with `Task not serializable`.** The build is Scala 2.13 for Spark 4. The change of the week added an internal library and a `Settings` class that a filter uses. The tests passed on a laptop.',
        clues: ['The internal library is `reports_2.12`', 'The filter uses `settings.minCents`', 'The unit tests call plain functions and never serialize a lambda'],
        opts: [
          { t: 'Use the `_2.13` build of the library (and `%%`), copy the value into a local `val` before the lambda, and add a test that runs a small Dataset', fb: '' },
          { t: 'Add Scala 2.12 to the classpath and make `Settings` serializable', fb: 'Two Scala libraries make it worse, and a serializable object breaks the day it holds a connection.' },
          { t: 'Run the job on the laptop from now on', fb: 'It avoids the cluster and the problem stays.' },
          { t: 'Catch the exception and continue without the filter', fb: 'Every order would be counted, and the report is wrong.' }
        ],
        best: 0,
        why: 'Two missions at once. **Mission 1**: a library built with Scala ' + M('scala_212') + ' compiled clean in a ' + M('scala') + ' build and failed with `' + BN.mixed_error + '`. **Mission 5**: a filter that used `Settings` failed with `' + KS.closure_headline + '`, cause `' + KS.cause + '`, and copying the number first gave **' + n(KS.fixed_count) + '** orders. Spark ran locally here, and no cluster ran.',
        checks: [
          ['Read the first error', 'NoSuchMethodError, a library of another Scala version.'],
          ['Read the suffix', 'reports_2.12 in a 2.13 build.'],
          ['Read the second error', 'Task not serializable: the cause names Settings.'],
          ['Fix both', 'Use the 2.13 build, copy the value, and test with a real Dataset.']
        ],
        tell: 'The new library was built for Scala 2.12 and the job runs on 2.13, so the compiler accepted it and the JVM failed on a method with another signature. After that fix, a filter used a field of a settings object, so Spark tried to send the whole object, which cannot be serialized. I changed the build to the 2.13 artifact, copied the value into a local value before the lambda, and added a test that runs a small Dataset through a real session.',
        prevent: ['Use **`%%`** so that the suffix follows the Scala version', 'A **test through a real session**', 'Copy **values**, not objects, into lambdas']
      }),

      B.decide({
        id: 'm6-dec', t: 2, src: 'docs', title: 'Decision: Scala, Java or Python for a new Spark job?',
        scenario: 'Brewline needs a new nightly Spark job. The team has two Scala engineers, four Python engineers and one Java engineer. The job has business rules that change often, and it will run for years.',
        opts: [
          { t: 'Python (PySpark) for most of it, with the heavy logic as column expressions', d: 'Most of the team can write and review it, and the optimizer sees the column expressions.', lose: 'Python functions that run row by row are slower, and typed checks are lost.' },
          { t: 'Scala with typed Datasets for the rules and column expressions for the heavy work', d: 'The compiler checks the rules (the sealed types, the fields), and the code is native to Spark.', lose: 'Only two people can review it, and the version and closure traps of this course apply.' },
          { t: 'Java', d: 'One engineer knows it, and the language is stable.', lose: 'More code than Scala for the same job, and less used for Spark work.' }
        ],
        pick: 0,
        why: 'The deciding fact is **who maintains it for years**. Nothing in this course says that Scala is faster for column expressions, and I did not time anything. Pick Scala when the rules need the compiler (sealed types, typed rows) and the team can support it. This is a judgement from documentation and experience.',
        when: 'If the job is a library for many teams, has complex business rules, or must run custom code at high speed, the case for Scala grows.'
      }),

      B.challenge({
        id: 'm6-ch', t: 1, title: 'Coding round: cents by store, and every bad line', file: 'Challenge.scala', lang: 'scala',
        q: 'Lines arrive as `order_id,store_id,status,amount`, **header first**, as an `Iterator[String]`. Write `centsByStore(lines): Either[List[String], SortedMap[Int, Long]]`. If every line is valid, return `Right` with the **total cents for each store**, sorted by store id. Otherwise return `Left` with **one message for each bad line, naming its line number** (the header is line 1). Parse the amount with `BigDecimal`, **refuse more than two decimals**, and keep memory flat: do not collect the lines into a list.',
        starter: 'def parseCents(amount: String): Either[String, Long] = ???\n\ndef parse(line: String): Either[String, (Int, Long)] = ???\n\ndef centsByStore(lines: Iterator[String]): Either[List[String], SortedMap[Int, Long]] = ???\n',
        hints: ['`BigDecimal(text)` is exact, and `scale` says how many decimals it has. `(d * 100).toLongExact` gives the cents.', '`Try(...).toOption.toRight(reason)` turns a failed parse into a `Left` with a reason. A `for` chains the checks of one line.', '`lines.drop(1).zipWithIndex` skips the header and numbers the lines. The first data line is line 2.', '`foldLeft` with a pair of `(errors, totals)` walks the iterator once: a `Right` adds to the `SortedMap`, and a `Left` adds a message with its line number to the errors.'],
        sol: SOL,
        res: { cols: ['input of the program', 'output'], rows: [['6 valid lines', CH.good_output], ['the same, plus two bad lines', CH.bad_output]] },
        expl: ['`parseCents` returns a **`Left` with a reason** for a text that is not a number and for a third decimal, and a `Right` with cents otherwise, so nothing is thrown.', '`foldLeft` walks the iterator **once**, with the errors so far and the totals so far as its state, so memory does not depend on the size of the file.', 'The first run printed `' + CH.good_output + '`, the cents that Python worked out from the same rows. The second reported **both** bad lines with their numbers: `' + CH.bad_output + '`.'],
        cx: 'Return the bad lines to a rejects file as well as the message, count the lines that were good and bad, and stop early when the errors pass a limit. For a file that does not fit one machine, do the same with a `groupBy` and `agg` on a Dataset.'
      })
    ].concat(B.mockRound(QA.map(function (x) { return x[0]; }), QA.map(function (x) { return x[1]; }))).concat([
      B.cheat({
        id: 'm6-cheat', t: 1, src: 'rec', title: 'One page to review',
        say: 'This is your last-minute review. The numbers come from the recording on the real Scala ' + M('scala') + ' compiler, Java ' + M('java_version') + ' and a local Spark ' + M('spark') + '. Sections marked (docs) come from documentation and did not run. Take a screenshot or print the page.',
        sections: [
          { h: 'Build and versions', items: ['Scala compiles to **JVM bytecode** and needs the **Scala library** on the classpath: without it `' + NL.error + '`', 'A jar holds your classes only: `java -jar` failed with `' + BJ.jar_run_error + '`', 'A **2.12 library in a 2.13 app** compiled clean and failed at run time: `' + BN.mixed_error.replace('java.lang.', '') + '`', 'Spark ' + M('spark') + ' is built with Scala **' + M('scala') + '**. In sbt, `%%` adds the suffix (docs)'] },
          { h: 'Case classes and matches', items: ['A case class has `equals`, `copy` and `toString`: `==` **' + X('lang.orders').split('\n')[3] + '**, `eq` **' + X('lang.orders').split('\n')[4] + '**', 'A match on a **sealed trait** is checked: `' + L.missing_input + '` would fail. The run ended in `scala.MatchError`', 'Prefer **`val`** and immutable case classes. A `var` in a key changes its hash (docs)'] },
          { h: 'Collections', items: ['`groupMapReduce`: BEANS-250 **7**. `toMap` kept the last: **5**. Never `toMap` on repeated keys', 'A strict list: **' + KC.strict_steps + '** steps to the first match. A view: **' + KC.lazy_steps + '**. An iterator is used up by one pass', '`stock("TEA")` throws, `get` gives `None`. The order of a map is not a promise: `HashMap` on 2.13, `Map` on 2.12'] },
          { h: 'Errors as values', items: ['`parse` returned `Right` or a `Left` with a reason: five lines gave **' + E.summary + '**', '`Option.get` on a `None` throws `' + E.none_get + '`. `Try` holds an exception as a value', '`flatMap` over `Try(...).toOption` drops bad rows. `partitionMap` keeps them. Compare **loaded plus rejected** with the file'] },
          { h: 'Spark', items: ['A local Spark ' + M('spark') + ' counted **' + n(KS.orders) + '** orders, **' + n(KS.placed) + '** placed', '`_.statu` is a compile error: `' + ES.typed_message + '`. `col("statu")` is `' + KS.untyped_error + '` at run time', 'A lambda that uses a non-serializable object: **' + KS.closure_headline + '**, cause `' + KS.cause + '`. Copy the value first: **' + n(KS.fixed_count) + '**', 'No encoder for a plain class: `' + ES.encoder_message + '`. A lambda is a black box to the optimizer (docs). Never `collect()` a big Dataset (docs)'] }
        ]
      }),

      B.recap({
        id: 'm6-recap', n: 6, badge: 'Scala Partner', color: '#B91C1C',
        pts: [
          'You can **build and run** a program, read `NoClassDefFoundError` and `NoSuchMethodError`, and keep **one Scala version**.',
          'You model data with **case classes** and a **sealed trait**, and you read a **match warning** before it becomes a `MatchError`.',
          'You use collections **on purpose**: `groupMapReduce` and not `toMap`, a view or an iterator for one pass, `get` and not `apply`.',
          'You return **errors as values**, collect every bad row with its reason, and compare loaded plus rejected with the file.',
          'You can explain **why a closure fails** on Spark, and choose between typed lambdas and column expressions.'
        ],
        lines: [
          'I can explain what the program did, and why.',
          'I can recover from my own mistakes.',
          'I can talk to the people who run the platform.'
        ]
      })
    ])
  });
})();
