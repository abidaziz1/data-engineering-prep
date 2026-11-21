/* Mission 4: errors as values. Errors.scala ran on the real Scala 2.13.16 compiler and the JDK. */
(function () {
  var B = LAB.b, G = LAB.get;
  var C = G.counts, X = G.text, n = G.n;
  var E = C('err'), ERR = G.file('Errors.scala'), EL = X('err.errors').split('\n').slice(2);
  G.expect(E.good === 2 && E.bad === 3 && E.cents === 1950 && E.summary === '2 good, 3 bad, 1950 cents' && E.none_get === 'None.get' && /NumberFormatException/.test(E.number_format), 'five lines give 2 orders and 3 reasons, and Option.get on None throws None.get');
  G.expect(/^Right/.test(EL[0]) && /^Left\(bad store id/.test(EL[1]) && /^Left\(more than two decimals/.test(EL[2]) && /^Left\(expected 3 fields/.test(EL[3]) && /^Right/.test(EL[4]), 'parse returns Right for lines 1 and 5, and a named reason for the others');

  LAB.addChapter({
    id: 'm4', n: 4, title: 'Errors as values', short: 'Errors', blurb: 'Option, Either and Try: a bad row is a value that a job can collect', minutes: 22,
    focus: ['mon', 'mart'],
    goals: [
      'Use **`Option`** instead of `null`, and say why `.get` is dangerous.',
      'Return a **`Left` with a reason** or a **`Right` with a value**, and collect every reason.',
      'Use **`Try`** to turn an exception into a value, without hiding bad rows.',
      'Decide what a job does with a bad row.'
    ],
    say: 'A loader meets bad rows every night. In Java you throw and catch. In Scala the usual way is to **return** the error as a value, so that a job can collect all of them. I parsed five lines with the real compiler, and three of them were bad.',
    scenes: [
      B.code({
        id: 'm4-code', t: 1, src: 'rec', title: 'Errors.scala: parse, never throw', file: 'Errors.scala', lang: 'scala', code: ERR,
        steps: [
          { say: 'One parser for the lines of a file, and what the program does with the results. Press Next.', lines: null },
          { say: '`parseCents` turns text into **cents**. `Try(BigDecimal(...))` catches the exception from a bad number, `toOption` and `toRight` make it an `Either` with a reason, and a third decimal is refused.', lines: G.span(ERR, /def parseCents/, /^    }$/) },
          { say: '`parse` splits a line and **matches on its shape**: three fields, or not. A `for` over `Either` chains the checks, and **stops at the first `Left`**.', lines: G.span(ERR, /def parse\(line/, /case fields =>/) },
          { say: 'Five lines go through `parse`. Nothing is thrown.', lines: G.span(ERR, /val lines = List/, /results\.foreach/) },
          { say: '**`partitionMap`** splits the results into the errors and the orders in one pass. The job decides what to do with each pile.', lines: G.span(ERR, /partitionMap\(identity\)/, /println\(s"\$\{orders\.size\}/) },
          { say: 'Two ways to get a value **out** of a failure: `Option.get` on a `None` throws, and `Try("12x".toInt)` holds the exception as a value.', lines: G.span(ERR, /Option\.empty\[Int\]\.get/, /"12x"\.toInt/) },
          { say: 'An `Option` chains too: `orElse` gives a second choice, and a `for` over a `None` gives `None`.', lines: G.span(ERR, /Option\("a"\)\.orElse/, /yield a \+ b/) }
        ]
      }),

      B.term({
        id: 'm4-out', t: 1, src: 'rec', title: 'What Errors.scala printed',
        say: 'Five lines in, five results out. Three of them are bad.',
        lines: function () { return G.plain(X('err.errors')); },
        after: 'Two lines gave `Right` with an `Order`, and three gave a `Left` with **a reason that names the value**: `' + EL[1].replace(/^Left\(|\)$/g, '') + '`, `' + EL[2].replace(/^Left\(|\)$/g, '') + '` and `' + EL[3].replace(/^Left\(|\)$/g, '') + '`. The job went on and printed **`' + E.summary + '`**. `Option.empty.get` threw `' + E.none_get + '`, and `Try("12x".toInt)` held a `NumberFormatException` as a value.',
        afterKind: 'tip',
        doneSay: 'A bad row is a value, not a crash.'
      }),

      B.widget({ id: 'm4-lab', kind: 'errlab', t: 1, src: 'rec', title: 'Lab: five lines, five results' }),

      B.cmp({
        id: 'm4-types', t: 1, src: 'docs', title: 'Option, Either, Try and an exception',
        say: 'Four ways to say that something can go wrong. Press Next to read when to use each one.',
        cols: ['Type', 'It says', 'Use it for'],
        hl: 1,
        rows: [
          ['`Option[A]`', 'A value, or nothing (`Some` or `None`)', 'A lookup that may find nothing: no reason is needed'],
          ['`Either[E, A]`', 'A value (`Right`), or a reason (`Left`)', 'A parse that can fail for several reasons, and you want the reason'],
          ['`Try[A]`', 'A value, or an exception that was thrown', 'Calling code that throws, such as `toInt` or a library'],
          ['an exception', 'Something that the program cannot handle here', 'A bug, or a failure that should stop the job']
        ],
        steps: [
          { upto: 2, say: '`Option` and `Either` are for **expected** failures, such as a bad line. The type says so, and the compiler makes you handle it.' },
          { upto: 4, say: '`Try` turns a thrown exception into a value at the **edge** where you call code that throws. An exception itself is for what should stop the job.' }
        ]
      }),

      B.bug({
        id: 'm4-bug', t: 1, q: 'A job takes the domain of the email of a customer and stops for some customers. Click the line that throws.',
        file: 'Domain.scala', lang: 'scala',
        code: 'val email: Option[String] = None\nval domain = email.get.split("@")(1)\nprintln(domain)\n',
        bad: [2],
        hint: 'What does get do on a None?',
        why: '`get` on a `None` **throws**: the recording printed `' + E.none_get + '`. The `Option` was there to make you handle a missing value, and `.get` throws that away. Use `map` and `getOrElse`, or a match.',
        fix: 'val email: Option[String] = None\nval domain = email.map(_.split("@")(1)).getOrElse("unknown")\nprintln(domain)\n',
        cheer: 'Handle the None.'
      }),

      B.bug({
        id: 'm4-bug2', t: 1, q: 'A job adds up the numbers of three lines and reports 12. The three lines are 5, x and 7, and nobody was told about the bad one. Click the line that hides it.',
        file: 'Sum.scala', lang: 'scala',
        code: 'val lines = List("5", "x", "7")\nval total = lines.flatMap(l => scala.util.Try(l.toInt).toOption).sum\nprintln(total)\n',
        bad: [2],
        hint: 'What happens to the line that is not a number?',
        why: '`Try(...).toOption` turns a failure into `None`, and `flatMap` **drops** it. The total is 12 and the bad line vanished. In the recording `partitionMap` kept the three bad lines **and their reasons**. Split the good from the bad, and decide what the job does with the bad.',
        fix: 'val lines = List("5", "x", "7")\nval (bad, good) = lines.partitionMap(l => l.toIntOption.toRight(l))\nprintln(s"${good.sum} from ${good.size} lines, rejected: $bad")\n',
        cheer: 'Keep the bad rows.'
      }),

      B.bug({
        id: 'm4-bug3', t: 2, src: 'docs', q: 'A job parses two values with a for over Either and reports one error, and the second value is also bad. Click the line that stops at the first.',
        file: 'Both.scala', lang: 'scala',
        code: 'def parseCents(s: String): Either[String, Long] = s.toLongOption.toRight(s"not a number: \'$s\'")\nval both = for { a <- parseCents("x"); b <- parseCents("y") } yield a + b\nprintln(both)\n',
        bad: [2],
        hint: 'What does a for over Either do after the first Left?',
        why: 'A `for` over `Either` **stops at the first `Left`**, so the second error is never found. To report every error, parse each value and collect the `Left`s with `partitionMap`, as the recording did for five lines. This is from documentation, and the check script of the course ran it.',
        fix: 'def parseCents(s: String): Either[String, Long] = s.toLongOption.toRight(s"not a number: \'$s\'")\nval (errors, values) = List("x", "y").map(parseCents).partitionMap(identity)\nprintln(errors)\n',
        cheer: 'Collect every reason.'
      }),

      B.quiz({
        id: 'm4-q1', t: 1,
        q: 'What does `Option.empty[Int].get` do?',
        opts: [
          { t: 'Throws NoSuchElementException: `' + E.none_get + '`', fb: '' },
          { t: 'Returns 0', fb: 'There is no default.' },
          { t: 'Returns null', fb: 'Scala code uses `None`, and `get` does not return null.' },
          { t: 'Does not compile', fb: 'It compiles. That is the danger.' }
        ],
        ok: 0, why: 'The recording printed `' + E.none_get + '`. Use `getOrElse` or a match.'
      }),

      B.quiz({
        id: 'm4-q2', t: 1,
        q: 'Five lines go through `parse`: two are valid and three are not. What does the job print in the recording?',
        opts: [
          { t: '`' + E.summary + '`', fb: '' },
          { t: 'An exception at the first bad line', fb: '`parse` returns the error, so nothing is thrown.' },
          { t: '5 good', fb: 'Three lines were bad.' },
          { t: 'Only the two good orders, with no word about the bad ones', fb: 'The job counted them: the bad ones came back as `Left`.' }
        ],
        ok: 0, why: 'The `partitionMap` split the results, and the program printed `' + E.summary + '`.'
      }),

      B.quiz({
        id: 'm4-q3', t: 1,
        q: 'What is `Try` for?',
        opts: [
          { t: 'Turning an exception from code that throws into a value', fb: '' },
          { t: 'Making code faster', fb: 'It has no effect on speed.' },
          { t: 'Retrying a failed call', fb: 'It does not retry.' },
          { t: 'Replacing `Option`', fb: 'They answer different questions.' }
        ],
        ok: 0, why: 'In the recording `Try("12x".toInt)` held `' + E.number_format + '` as a value instead of throwing it.'
      }),

      B.quiz({
        id: 'm4-q4', t: 2, src: 'docs',
        q: 'A job uses `flatMap(l => Try(parse(l)).toOption)` on every line. A reviewer says that this is a bug. Why?',
        opts: [
          { t: 'Every bad line is dropped without a word, so the totals can be wrong and nobody knows', fb: '' },
          { t: 'Try is too slow for a job', fb: 'Speed is not the problem here.' },
          { t: 'toOption cannot be used with flatMap', fb: 'It can: that is why the bug compiles.' },
          { t: 'The compiler warns about it', fb: 'It does not.' }
        ],
        ok: 0, why: 'The bug hunt of this mission showed it: the total of 5, x and 7 was 12 and the bad line vanished. This is from documentation.'
      }),

      B.order({
        id: 'm4-ord', t: 1, q: 'Put the steps in order to load a file whose bad rows must not be lost.',
        items: ['Parse each line to an `Either` with a reason', 'Split the results into errors and orders with `partitionMap`', 'Write the good orders', 'Write the errors, with their line numbers, to a rejects file', 'Compare the counts with the lines of the file'],
        why: 'The reasons are values, so the job can keep them. The last step is the check that nothing was dropped: good plus bad equals the lines of the file.'
      }),

      B.decide({
        id: 'm4-dec', t: 2, src: 'docs', title: 'Decision: what does a job do with a bad row?',
        scenario: 'A nightly load reads a file from a store. Most nights every line is fine. Some nights a few lines are bad, and the totals are needed by 07:00.',
        opts: [
          { t: 'Write the good rows, send the bad rows with their reasons to a rejects file, and alert when there are more than a few', d: 'The load finishes, nothing is lost, and someone sees the bad rows.', lose: 'More code, and a rejects file to look at.' },
          { t: 'Fail the whole job on the first bad row', d: 'Nothing wrong is ever loaded.', lose: 'One bad line stops the totals for every store.' },
          { t: 'Skip the bad rows quietly', d: 'The shortest code.', lose: 'The totals are wrong and nobody knows. This is the bug hunt of this mission.' }
        ],
        pick: 0,
        why: 'Errors as values make the first option cheap: `partitionMap` gave the good and the bad piles in one pass in the recording. The options are from documentation.',
        when: 'If a wrong total is worse than a late one (for example a financial close), fail the job and fix the file.'
      }),

      B.incident({
        id: 'm4-inc', t: 2, src: 'rec', title: 'Incident: the total is short and nothing failed', time: '08:30',
        alert: '**Finance says that yesterday\'s total from the Scala loader is 7 cents under the stores\' figure.** The job did not fail and its log is clean. The loader parses each line with `Try(parse(line)).toOption` and flatMaps the results.',
        clues: ['The loader drops a line when `parse` fails', 'One line of the file has a value with three decimals', 'The log has no mention of a rejected line'],
        opts: [
          { t: 'Return the reason for each bad line (`Left`), write them to a rejects file, and compare the counts with the file', fb: '' },
          { t: 'Add 7 cents to the total', fb: 'It hides the cause, and the next bad line is wrong in the same way.' },
          { t: 'Catch the exception and print it', fb: 'The line is still dropped, and the message is lost in the log.' },
          { t: 'Round all values to two decimals', fb: 'It silently changes the data of the store.' }
        ],
        best: 0,
        why: 'The recording parsed a value with three decimals (`4.505`) and returned `Left(more than two decimals: \'4.505\')`, and the job counted `' + E.summary + '`. A reason as a value cannot be lost the way a dropped line can.',
        checks: [
          ['Compare the count of lines', 'Lines in the file against rows loaded.'],
          ['Read the loader', 'flatMap over Try(...).toOption drops failures.'],
          ['Find the cause', 'A value with three decimals was dropped.'],
          ['Fix', 'Return the reason, collect the rejects, compare the counts.']
        ],
        tell: 'The loader dropped any line that failed to parse, so one line with three decimals vanished and the total was short by its amount. I changed it to return the reason for each bad line, write the bad lines to a rejects file, and compare the number of rows loaded plus rejected with the lines of the file.',
        prevent: ['Never drop a row without **counting** it', 'Compare **loaded plus rejected** with the file', 'Keep the **reason** next to the line number']
      }),

      B.qa({
        id: 'qa-option', t: 1, tag: 'Scala', secs: 45,
        q: 'Why Option instead of null, and what is wrong with Option.get?',
        pts: ['The type says that a value may be missing', 'The compiler makes you handle it', 'map, flatMap, getOrElse', 'get throws on None'],
        short: 'An **`Option`** says in the type that a value may be missing, so the compiler makes you handle it, where a `null` fails later in some other place. I use `map`, `flatMap`, `getOrElse` and `match`, and in a `for` a `None` ends the chain. **`.get`** throws the benefit away: `Option.empty[Int].get` threw `None.get` in my run. So I do not call it in code that runs in a job. For a value that comes from Java code that may return null, I wrap it with `Option(x)`, which turns null into `None`.',
        fu: [['`Some(null)`?', 'Valid and confusing. `Option(null)` is `None`.'], ['`orElse` or `getOrElse`?', '`orElse` gives another `Option`. `getOrElse` gives the plain value.']],
        trap: 'Calling get.',
        real: 'Describe a NullPointerException that you fixed.'
      }),

      B.qa({
        id: 'qa-eithertry', t: 1, tag: 'Scala', secs: 60,
        q: 'When do you use Either, and when Try?',
        pts: ['Either: an expected failure with a reason', 'Try: an exception from code that throws', 'Right is the value', 'Collect with partitionMap'],
        short: 'I use **`Either[Reason, Value]`** for an **expected** failure where the reason matters: my `parse` returns `Left("bad store id: \'x\'")` or `Right(order)`, and nothing is thrown. I use **`Try`** at the edge where I call code that **throws**, such as `toInt` or a library, to turn the exception into a value, and then I turn it into an `Either` with a reason. By convention `Right` is the value. Then `partitionMap` splits many results into the errors and the values: five lines gave `' + E.summary + '`. A `for` over `Either` stops at the first `Left`, so to collect every reason I parse each line and partition.',
        fu: [['`Try(...).toOption`?', 'It drops the reason. I keep it only when losing it is a decision.'], ['Is an exception ever right?', 'For a bug, or a failure that should stop the job.']],
        trap: 'flatMap over Try(...).toOption.',
        real: 'Describe how you handled bad rows.'
      }),

      B.qa({
        id: 'qa-badrows', t: 2, tag: 'Scala', secs: 60,
        q: 'How do you handle bad rows in a Scala loader?',
        pts: ['Never drop a row silently', 'Return the reason, with the line number', 'A rejects file and an alert', 'Compare counts with the source'],
        short: 'I **never drop a row silently**. Each line goes through a parser that returns an `Either` with a reason, `partitionMap` splits the results, the good rows are loaded, and the bad rows go to a **rejects file** with their line numbers and reasons. Then I compare rows loaded plus rows rejected with the lines of the file, and I alert when there are more rejects than usual. In my recording five lines gave `' + E.summary + '`. The alternative, failing the whole job on the first bad row, is right only when a wrong or late total is worse than a missing one.',
        fu: [['Fail or continue?', 'It is a business rule: for a financial close I fail, for a daily report I continue with an alert.'], ['How do you test it?', 'With a file that has one example of every kind of bad line.']],
        trap: 'Dropping bad rows to keep the job green.',
        real: 'Describe how a rejects file helped you.'
      }),

      B.recap({
        id: 'm4-recap', n: 4, badge: 'Safe Parser', color: '#EF4444',
        pts: [
          '`parse` returned a **`Right`** or a **`Left` with a reason**: five lines gave **' + E.summary + '**. Nothing was thrown.',
          '`Option.get` on a `None` threw **' + E.none_get + '**. Use `getOrElse` or a match.',
          '`Try` turns an exception into a value at the edge: **' + E.number_format.replace('java.lang.', '') + '**.',
          '`flatMap` over `Try(...).toOption` **drops** bad rows. Split them with `partitionMap`.',
          'Compare **loaded plus rejected** with the lines of the file.'
        ],
        lines: [
          'I return a reason, not a null.',
          'I never drop a row without counting it.',
          'I keep a rejects file.'
        ]
      })
    ]
  });
})();
