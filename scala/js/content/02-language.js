/* Mission 2: case classes and pattern matching. Orders.scala and Partial.scala ran on the real Scala 2.13.16 compiler and the JDK. */
(function () {
  var B = LAB.b, G = LAB.get;
  var C = G.counts, X = G.text, n = G.n, M = function (k) { return G.meta(k); };
  var L = C('lang'), ORD = G.file('Orders.scala'), PAR = G.file('Partial.scala');
  var OL = X('lang.orders').split('\n').slice(2);
  G.expect(L.warning && L.missing_input === 'Refunded' && /^Refunded/.test(L.match_error) && L.exit === 1, 'a match that leaves out Refunded warns at compile time and fails with MatchError at run time');
  G.expect(OL[1] === 'true' && OL[2] === 'false' && /^Order\(O-1,1,Shipped,1250\)$/.test(OL[3]) && /requirement failed/.test(OL[6]), 'a case class is equal by its fields, not the same object, copies, and refuses a negative amount');

  LAB.addChapter({
    id: 'm2', n: 2, title: 'Case classes and pattern matching', short: 'Matches', blurb: 'The parts of Scala that pipelines use every day', minutes: 22,
    focus: ['stg', 'ing'],
    goals: [
      'Write a **case class** and say what the compiler writes for you.',
      'Use a **sealed trait** and a **match**, and read the compiler warning for a missing case.',
      'Tell **`==`** from **`eq`**, and use **`copy`** instead of changing a value.',
      'Read a **`scala.MatchError`**.'
    ],
    say: 'Scala shows up in a pipeline as data (case classes) and decisions (matches). I wrote an order as a case class and its status as a sealed trait, left one case out on purpose, and ran it with the real compiler.',
    scenes: [
      B.code({
        id: 'm2-code', t: 1, src: 'rec', title: 'Orders.scala: data and a match', file: 'Orders.scala', lang: 'scala', code: ORD,
        steps: [
          { say: 'One file with the data of Brewline and what to do with it. Press Next.', lines: null },
          { say: 'A **sealed trait** with three **case objects**. Sealed means that every case lives in this file, so the compiler knows all of them.', lines: G.span(ORD, /sealed trait Status/, /case object Refunded/) },
          { say: 'A **case class** gives you `equals`, `hashCode`, `toString`, `copy` and a constructor that needs no `new`. The `require` refuses a negative amount.', lines: G.span(ORD, /case class Order/, /^}$/) },
          { say: '**`label`** is a **match**: it picks one branch by the shape of the value. It is an expression, so it returns a `String`.', lines: G.span(ORD, /def label/, /^  }$/) },
          { say: '`==` compares the **fields**. `eq` asks whether it is the **same object**.', lines: G.span(ORD, /println\(a == Order/, /println\(a eq Order/) },
          { say: '**`copy`** makes a new order with one field changed. The old one is untouched.', lines: G.span(ORD, /val b = a\.copy/) },
          { say: 'A pattern can also take an object apart: `val Order(id, store, _, cents) = a` gives names to the fields, and `_` ignores one.', lines: G.span(ORD, /val Order\(id, store/) }
        ],
        note: 'The two builds in the lab use `Partial.scala` as well, which is shown further on.'
      }),

      B.term({
        id: 'm2-out', t: 1, src: 'rec', title: 'What Orders.scala printed',
        say: 'The output of the program, line by line.',
        lines: function () { return G.plain(X('lang.orders')); },
        after: 'The order printed itself as `' + OL[0] + '`: `toString` was written by the compiler. Two orders with the same fields are `==` (`' + OL[1] + '`) and two different objects (`eq`: `' + OL[2] + '`). `copy` gave `' + OL[3] + '`. The negative amount was refused by `require` with **`requirement failed`**. A case class is the standard shape of a row in Scala.',
        afterKind: 'tip',
        doneSay: 'A case class is a value with its fields.'
      }),

      B.widget({ id: 'm2-lab', kind: 'matchlab', t: 1, src: 'rec', title: 'Lab: equal, copy, and a case left out' }),

      B.code({
        id: 'm2-partial', t: 1, src: 'rec', title: 'Partial.scala: a match that leaves a case out', file: 'Partial.scala', lang: 'scala', code: PAR,
        steps: [
          { say: 'A fee for each status, with a case missing. Press Next.', lines: null },
          { say: 'The match handles `Placed` and `Shipped`. **`Refunded` is not handled.**', lines: G.span(PAR, /def fee/, /case Shipped/) },
          { say: 'The program calls `fee` with `Placed`, which works, and then with `Refunded`.', lines: G.span(PAR, /println\(fee\(Placed\)\)/, /println\(fee\(Refunded\)\)/) }
        ]
      }),

      B.term({
        id: 'm2-run', t: 1, src: 'rec', title: 'The warning, and the run',
        say: 'I compiled the two files together and ran `Partial`.',
        lines: function () { return G.plain(X('lang.partial')); },
        after: 'The compiler **warned**: `match may not be exhaustive. It would fail on the following input: ' + L.missing_input + '`. The build still succeeded, and the first `Refunded` stopped the program with **`scala.MatchError: ' + L.match_error + '`**. A warning that nobody reads becomes an incident. Many teams turn warnings into errors for exactly this (`-Xfatal-warnings`, from documentation).',
        afterKind: 'warn',
        doneSay: 'A missing case is a warning, then a MatchError.'
      }),

      B.cmp({
        id: 'm2-java', t: 1, src: 'docs', title: 'What you know from Java, and what Scala does',
        say: 'If you read the Java course, this table maps what you know. Press Next to read it.',
        cols: ['In Java', 'In Scala', 'The difference that matters'],
        hl: 1,
        rows: [
          ['a `record`', 'a `case class`', 'A case class also has `copy` and works in a match.'],
          ['an `enum`, or an interface with a few classes', 'a `sealed trait` with `case object`s', 'The compiler checks that a match covers every case.'],
          ['a `switch`', 'a `match`', 'A match is an expression and can take values apart.'],
          ['`null`', '`Option`', 'The type says that a value may be missing.'],
          ['`final` and a mutable field', '`val` and `var`', 'Prefer `val`: a value that never changes cannot be changed by a race.']
        ],
        steps: [
          { upto: 2, say: 'Data: a case class is a record that can also be copied and matched.' },
          { upto: 5, say: 'Decisions and missing values: the compiler helps with a sealed type, and an `Option` states that a value may be missing.' }
        ]
      }),

      B.bug({
        id: 'm2-bug', t: 1, q: 'A job computes a fee for each status, and fails for refunded orders only. Click the line that the compiler warned about.',
        file: 'Partial.scala', lang: 'scala',
        code: 'def fee(status: Status): Int = status match {\n  case Placed  => 0\n  case Shipped => 5\n}\n',
        bad: [1],
        hint: 'Which status does the match not handle?',
        why: 'The compiler warned at the **`match`** that it may not be exhaustive and named the input that would fail: **`' + L.missing_input + '`**. At run time that input gave `scala.MatchError`. Add the missing case, and do not add a `case _ =>` that hides future statuses unless you mean it.',
        fix: 'def fee(status: Status): Int = status match {\n  case Placed   => 0\n  case Shipped  => 5\n  case Refunded => 0\n}\n',
        cheer: 'Cover every case.'
      }),

      B.bug({
        id: 'm2-bug2', t: 1, q: 'Two orders with the same fields should be the same order, and the check says they are not. Click the line that compares them.',
        file: 'Same.scala', lang: 'scala',
        code: 'val a = Order("O-1", 1, Placed, 1250)\nval sameFields = a eq Order("O-1", 1, Placed, 1250)\nprintln(sameFields)\n',
        bad: [2],
        hint: 'Does `eq` compare fields?',
        why: '`eq` asks whether two names point to the **same object**, and the recording printed `' + OL[2] + '` for it. `==` compares the **fields** of a case class and printed `' + OL[1] + '`. Use `==`.',
        fix: 'val a = Order("O-1", 1, Placed, 1250)\nval sameFields = a == Order("O-1", 1, Placed, 1250)\nprintln(sameFields)\n',
        cheer: 'Fields, not objects.'
      }),

      B.bug({
        id: 'm2-bug3', t: 2, src: 'docs', q: 'A set of counters stops finding a counter that it holds after its field was changed. Click the line that causes it.',
        file: 'Counter.scala', lang: 'scala',
        code: 'case class Counter(var n: Int)\nval seen = scala.collection.mutable.Set(Counter(1))\nseen.head.n = 2\nprintln(seen.contains(Counter(2)))\n',
        bad: [1],
        hint: 'What does a case class use to compute its hash?',
        why: 'A case class computes its **hash from its fields**. With a `var`, changing the field changes the hash, and the set looks in the wrong place for it: it printed `false`. Keep case classes **immutable** (`val` fields) and use `copy` for a change. This is from documentation, and the check script of the course ran it.',
        fix: 'case class Counter(n: Int)\nvar seen = Set(Counter(1))\nseen = seen.map(c => c.copy(n = 2))\nprintln(seen.contains(Counter(2)))\n',
        cheer: 'Immutable keys.'
      }),

      B.quiz({
        id: 'm2-q1', t: 1,
        q: 'Two case class values have the same fields. What does `a == b` give, and what does `a eq b` give?',
        opts: [
          { t: '`true` and `false`', fb: '' },
          { t: '`true` and `true`', fb: '`eq` asks for the same object.' },
          { t: '`false` and `false`', fb: '`==` compares fields for a case class.' },
          { t: 'A compile error', fb: 'Both compile.' }
        ],
        ok: 0, why: 'The program printed `' + OL[1] + '` for `==` and `' + OL[2] + '` for `eq`.'
      }),

      B.quiz({
        id: 'm2-q2', t: 1,
        q: 'The compiler says "match may not be exhaustive. It would fail on the following input: Refunded". What should you do?',
        opts: [
          { t: 'Add the missing case, and treat the warning as a defect', fb: '' },
          { t: 'Ignore it: the build succeeded', fb: 'The first Refunded order stopped the program.' },
          { t: 'Catch MatchError everywhere', fb: 'It hides the missing case instead of writing it.' },
          { t: 'Change Refunded to a String', fb: 'The compiler would then check nothing at all.' }
        ],
        ok: 0, why: 'The recording ran the program: `Placed` worked, and `Refunded` ended in `scala.MatchError`.'
      }),

      B.quiz({
        id: 'm2-q3', t: 1,
        q: 'What does `copy` do on a case class?',
        opts: [
          { t: 'Makes a new value with some fields changed, and leaves the old one as it was', fb: '' },
          { t: 'Changes the fields of the old value', fb: 'Case class fields are `val`s.' },
          { t: 'Writes the value to a file', fb: 'It has nothing to do with files.' },
          { t: 'Makes a deep copy of every object inside', fb: 'It copies the references that it holds.' }
        ],
        ok: 0, why: 'In the recording `a.copy(status = Shipped)` printed `' + OL[3] + '`, and `a` still printed `' + OL[0] + '`.'
      }),

      B.quiz({
        id: 'm2-q4', t: 2, src: 'docs',
        q: 'Why must the subclasses of a sealed trait be in the same file?',
        opts: [
          { t: 'So that the compiler knows every case and can check a match for you', fb: '' },
          { t: 'Because Scala allows only one class per file', fb: 'It allows many.' },
          { t: 'To make the program start faster', fb: 'It has no effect on speed.' },
          { t: 'Because of the JVM', fb: 'The JVM does not know about sealed in Scala 2.' }
        ],
        ok: 0, why: 'If anyone could add a case elsewhere, the compiler could not promise that a match covers everything. This is from documentation.'
      }),

      B.order({
        id: 'm2-ord', t: 1, q: 'Put the steps in order to add a new status to a job that matches on it.',
        items: ['Add the new `case object` to the sealed trait', 'Compile, and read every warning', 'Add the new case to each match that the compiler lists', 'Run a test with an order of the new status', 'Release, and keep warnings as errors in the build'],
        why: 'A sealed trait lets the compiler list every match that must change. The order is: change the type, read the warnings, fix each match, test, and keep the check on.'
      }),

      B.decide({
        id: 'm2-dec', t: 2, src: 'docs', title: 'Decision: how should the status of an order be modelled?',
        scenario: 'Brewline orders have a status that the code branches on in many places. Another team may add statuses later. Data comes in as text.',
        opts: [
          { t: 'A sealed trait with case objects, and a parser from text that returns an `Option` or an `Either`', d: 'The compiler checks every match, and a bad text is caught once, at the edge.', lose: 'More code than a string, and a new status means changing every match.' },
          { t: 'A `String` and `match` on its value, with a default case', d: 'The shortest. A new status never stops the job.', lose: 'A typo compiles, and the default hides a status that nobody handled.' },
          { t: 'A Scala 3 `enum`', d: 'The shortest way to a closed set of cases.', lose: 'Spark 4 does not target Scala 3, and I did not run it here.' }
        ],
        pick: 0,
        why: 'The compiler found the missing case in the recording, and a string would have said nothing. Parse the text **once at the edge**, and keep a type inside. This is a design judgement from documentation.',
        when: 'For a status that is only printed and never branched on, a string is enough.'
      }),

      B.incident({
        id: 'm2-inc', t: 2, src: 'rec', title: 'Incident: the job stops with a MatchError at the first refund', time: '02:25',
        alert: '**The nightly job stopped at 02:10 with `scala.MatchError: Refunded (of class Refunded$)`.** It has run for a year. The release of yesterday added the fee step. Refunds are rare, and none was in the test data.',
        clues: ['The fee step matches on the status', 'The compile log of yesterday has a warning about an exhaustive match', 'Only refunded orders fail'],
        opts: [
          { t: 'Add the missing case to the match, add a test with a refund, and make the build fail on this warning', fb: '' },
          { t: 'Wrap the step in a try and skip the failures', fb: 'Refunded orders would be dropped in silence.' },
          { t: 'Add a `case _ => 0` and move on', fb: 'It hides the next new status the same way.' },
          { t: 'Roll back and ignore refunds', fb: 'The bug is still there when the step comes back.' }
        ],
        best: 0,
        why: 'The recording of this exact case: the compiler warned (`' + L.missing_input + '` would fail) and the run ended in `scala.MatchError`. The warning was the whole bug report, one day early.',
        checks: [
          ['Read the error', 'A MatchError on the value Refunded.'],
          ['Read the build log', 'A warning that the match may not be exhaustive.'],
          ['Find the cause', 'The fee step has no case for refunds.'],
          ['Fix and prevent', 'Add the case, add a test, fail the build on this warning.']
        ],
        tell: 'The fee step matched on the status and had no case for refunded orders, so the first refund stopped the job. The compiler had warned about exactly this in yesterday\'s build. I added the case and a test with a refund, and the build now fails on that warning.',
        prevent: ['Turn **warnings into errors** for exhaustive matches', 'Test with an example of **every case**', 'Prefer a **sealed** type to a string']
      }),

      B.qa({
        id: 'qa-caseclass', t: 1, tag: 'Scala', secs: 60,
        q: 'What is a case class, and why is it the shape of a row in Scala?',
        pts: ['The compiler writes equals, hashCode, toString and copy', 'Immutable fields', 'Works in a pattern match', 'Spark encoders use it'],
        short: 'A **case class** is a class for data. The compiler writes `equals`, `hashCode`, `toString`, `copy` and a constructor without `new`, and the fields are `val`s, so the value is immutable. In my run `Order("O-1",1,Placed,1250)` printed itself, was `==` to an order with the same fields and `eq` false, and `copy(status = Shipped)` made a new one and left the old one alone. It also works in pattern matches, and Spark builds its typed `Dataset` encoders from case classes, so a case class is the natural shape of a row. I keep its fields immutable: a `var` field in a case class used as a key changes its hash.',
        fu: [['What is `unapply`?', 'The method that takes an object apart in a pattern. A case class gets one for free.'], ['Case class or a tuple?', 'A tuple has no names for its fields. A case class says what each one is.']],
        trap: 'Using `var` fields in a case class.',
        real: 'Describe how you modelled a row.'
      }),

      B.qa({
        id: 'qa-sealed', t: 1, tag: 'Scala', secs: 60,
        q: 'What is a sealed trait good for?',
        pts: ['A closed set of cases', 'The compiler checks every match', 'The warning for a missing case', 'Better than strings or magic numbers'],
        short: 'A **sealed trait** is a closed set: all its subtypes are in one file, so the compiler knows every case. A match on a sealed type is checked for **exhaustiveness**: in my example I left `Refunded` out and the compiler warned `match may not be exhaustive. It would fail on the following input: Refunded`. Without the warning the first refund stopped the job with `scala.MatchError`. So I use a sealed trait with case objects, and not strings, for a status that code branches on, I parse text into it once at the edge, and I make the build fail on that warning.',
        fu: [['Sealed or `enum`?', 'Scala 3 has `enum`, which is shorter. Spark does not target Scala 3, and I did not run it.'], ['Can a sealed trait be extended later?', 'Only in the same file. That is the point.']],
        trap: 'Adding a catch-all case that hides new statuses.',
        real: 'Describe a match that failed in production.'
      }),

      B.qa({
        id: 'qa-matcherror', t: 2, tag: 'Scala', secs: 45,
        q: 'You get a scala.MatchError in a job. How do you find and fix it?',
        pts: ['The message names the value', 'No case matched it', 'Read the compile warnings', 'Add the case and a test'],
        short: 'The message of a `MatchError` names the **value that no case matched**, here `Refunded (of class Refunded$)`. I find the match, which is in the stack trace (`Partial$.fee`), add the missing case, and add a test with an example of every case. The compile log usually had the answer already: the compiler warned about a match that may not be exhaustive and named the input. I turn that warning into an error in the build, so that it cannot reach a run. A catch-all `case _` is a last resort, because it hides the next new value in the same way.',
        fu: [['Why does a string match never warn?', 'The compiler does not know the possible strings, so it cannot check them.'], ['What about a partial function?', 'A `PartialFunction` says by its type that it covers only some inputs, and `collect` skips the rest.']],
        trap: 'Catching MatchError.',
        real: 'Describe how you fixed one.'
      }),

      B.qa({
        id: 'qa-valvar', t: 1, tag: 'Scala', secs: 45,
        q: 'What is the difference between val and var, and which do you prefer?',
        pts: ['val cannot be reassigned', 'var can', 'Immutable by default', 'Safer with several tasks'],
        short: 'A `val` cannot be reassigned, and a `var` can. I use `val` by default, and `copy` to make a changed value, as in `a.copy(status = Shipped)`, which left `a` alone in my run. Immutable values are easy to reason about and safe to share between tasks, because nothing can change them under you. A `var` is for a counter inside one function, and not for a field of a case class or for state that tasks share. Note that `val` fixes the **reference**: a `val` that holds a mutable collection can still be changed.',
        fu: [['Is a val list immutable?', 'Only if the collection is. A `val buffer = ListBuffer()` can still grow.'], ['What is `lazy val`?', 'A value that is computed the first time that it is used.']],
        trap: 'A val that holds a mutable collection.',
        real: 'Say where you used a var on purpose.'
      }),

      B.recap({
        id: 'm2-recap', n: 2, badge: 'Pattern Matcher', color: '#FCA5A5',
        pts: [
          'A **case class** gets `equals`, `toString` and `copy`. `==` is **' + OL[1] + '** for equal fields and `eq` is **' + OL[2] + '**.',
          '`copy(status = Shipped)` made **' + OL[3] + '** and left the first order as it was.',
          'A match on a **sealed trait** is checked: the compiler warned that **' + L.missing_input + '** would fail.',
          'The build still passed, and the first refund ended with **`scala.MatchError`**. Fail the build on that warning.',
          'Prefer **`val`** and immutable case classes.'
        ],
        lines: [
          'I read the warnings of a build.',
          'I model a closed set as a sealed trait.',
          'I copy instead of changing.'
        ]
      })
    ]
  });
})();
