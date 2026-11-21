/* Mission 3: numbers, text and time. Money with BigDecimal, rounding, overflow, and java.time across a change of clocks. Every output ran on the real JDK 21. */
(function () {
  var B = LAB.b, G = LAB.get;
  var C = G.counts, X = G.text, n = G.n;
  var NS = C('num.sums'), NUM = G.file('Numbers.java'), TIM = G.file('Times.java');
  var N = X('num.numbers').split('\n').slice(1), T = X('num.times').split('\n').slice(1);
  var ERR = (parseFloat(NS.double_sum) - 100000).toExponential(2);
  G.expect(N[0] === '0.30000000000000004' && N[2] === 'BigDecimal sum: 100000.00' && /^double sum:\s+100000\.0000013328/.test(N[1]) && N[4] === '-2147483648' && N[5] === 'addExact: integer overflow' && N[6] === 'false true' && N[8] === '3.33' && N[9] === '2.34 2.36' && N[10] === '5997 cents', 'the output of Numbers.java');
  G.expect(T[0] === '2026-03-08T03:30-04:00[America/New_York]' && T[1].indexOf('01:30-04:00') > 0 && T[1].indexOf('01:30-05:00') > 0 && T[2] === '2026-03-08T12:00-04:00[America/New_York] 23 hours, 1 day' && T[3] === '2026-03-14T05:12' && T[4] === '2026-03-14T09:12' && /Invalid date 'FEBRUARY 30'/.test(T[5]) && /index 0/.test(T[6]), 'the output of Times.java');

  LAB.addChapter({
    id: 'm3', n: 3, title: 'Numbers, text and time', short: 'Numbers', blurb: 'Money without lost cents, and time across a change of clocks', minutes: 22,
    focus: ['mart'],
    goals: [
      'Say why money is not a **double**, and add it up exactly with `BigDecimal` or cents.',
      'Choose a **rounding mode**, and know that an `int` wraps without a word.',
      'Use **`java.time`** and say what an `Instant`, a `LocalDateTime` and a `ZonedDateTime` mean.',
      'Handle a day with **23 hours** and an hour that happens **twice**.'
    ],
    say: 'Two kinds of bugs reach finance: a total that is a little off, and a day that has the wrong number of hours. Both come from a type that looked right. I ran the sums and the clocks on the real JDK, and every number on these screens is a line that a program printed.',
    scenes: [
      B.widget({ id: 'm3-lab', kind: 'moneylab', t: 1, src: 'rec', title: 'Lab: double, BigDecimal, int and rounding' }),

      B.code({
        id: 'm3-code', t: 1, src: 'rec', title: 'Numbers.java: the traps of numbers', file: 'Numbers.java', lang: 'java', code: NUM,
        steps: [
          { say: 'One program with every trap of this mission. It ran, and the next screen shows what it printed. Press Next.', lines: null },
          { say: 'The classic: `0.1 + 0.2` in a `double`.', lines: G.span(NUM, /System\.out\.println\(0\.1 \+ 0\.2\)/) },
          { say: 'Ten cents added a million times, in a `double` and in a `BigDecimal` that was built from the **text** "0.10".', lines: G.span(NUM, /double d = 0;/, /System\.out\.println\("BigDecimal sum/) },
          { say: '`new BigDecimal(0.1)` is built from a **double**, so it keeps the error of the double, with its whole expansion.', lines: G.span(NUM, /new BigDecimal\(0\.1\)/) },
          { say: 'An `int` that goes over its maximum **wraps** to a negative number. `Math.addExact` throws instead.', lines: G.span(NUM, /Integer\.MAX_VALUE \+ 1/, /^        }$/) },
          { say: '`equals` of two `BigDecimal` values compares the **scale** too, and `compareTo` compares the number.', lines: G.span(NUM, /new BigDecimal\("2\.50"\)\.equals/) },
          { say: 'Dividing with no scale throws when the result never ends, and with a scale and a **rounding mode** it gives an answer.', lines: G.span(NUM, /new BigDecimal\("10"\)\.divide\(new BigDecimal\("3"\)\);/, /RoundingMode\.HALF_EVEN\)\);/) },
          { say: 'Rounding a tie with `HALF_EVEN`, and money counted in **cents** as a `long`, read with `longValueExact`.', lines: G.span(NUM, /new BigDecimal\("2\.345"\)/, /cents \* 3/) }
        ],
        note: 'The loop of a million additions runs in a fraction of a second. The point is the result, not the time.'
      }),

      B.term({
        id: 'm3-numbers', t: 1, src: 'rec', title: 'What Numbers.java printed',
        say: 'The output of the program, line by line.',
        lines: function () { return G.plain(X('num.numbers')); },
        after: 'Ten cents a million times gave **' + N[1].replace('double sum:', '').trim() + '** in a `double` and **' + N[2].replace('BigDecimal sum: ', '') + '** in a `BigDecimal`. The double is off by about ' + ERR + ', which no one sees in one number and which is wrong in a reconciliation. The `int` wrapped to `' + N[4] + '`, and `addExact` threw. A `BigDecimal` that is **`new BigDecimal(0.1)`** is not 0.1: it is the double, written out in full.',
        afterKind: 'warn',
        doneSay: 'Money in a double is a bug waiting for a reconciliation.'
      }),

      B.bug({
        id: 'm3-bug', t: 1, q: 'A job adds up the amount of every order line, in a double. Finance says the total is wrong by a tiny amount that changes with the number of lines. Click the line that causes it.',
        file: 'Total.java', lang: 'java',
        code: 'double total = 0;\nfor (Line line : lines) {\n    total += line.price() * line.qty();\n}\nSystem.out.println(total);\n',
        bad: [1],
        hint: 'Can a double hold 0.10 exactly?',
        why: 'A `double` is a **binary fraction**, and most decimal amounts, such as 0.10, have no exact one. The recorded loop gave **' + N[1].replace('double sum:', '').trim() + '** for ten cents a million times. Use `BigDecimal` made from **text or from `BigDecimal.valueOf`**, or count **cents** in a `long`.',
        fix: 'BigDecimal total = BigDecimal.ZERO;\nfor (Line line : lines) {\n    total = total.add(line.price().multiply(BigDecimal.valueOf(line.qty())));\n}\nSystem.out.println(total);\n',
        cheer: 'Money is a decimal, not a double.'
      }),

      B.bug({
        id: 'm3-bug2', t: 1, q: 'A developer uses BigDecimal "for the money", and the total is still not exact. Click the line that brings the error back.',
        file: 'Price.java', lang: 'java',
        code: 'double fromFeed = 0.1;\nBigDecimal price = new BigDecimal(fromFeed);\nSystem.out.println(price);\n',
        bad: [2],
        hint: 'Where does the value of the BigDecimal come from?',
        why: '`new BigDecimal(double)` takes the **double**, error included: the recording printed `' + N[3].slice(0, 30) + '...` for 0.1. Build a `BigDecimal` from the **text** of the feed, `new BigDecimal("0.1")`, or from `BigDecimal.valueOf(0.1)`, which goes through the shortest text of the double.',
        fix: 'String fromFeed = "0.1";\nBigDecimal price = new BigDecimal(fromFeed);\nSystem.out.println(price);\n',
        cheer: 'Build it from text.'
      }),

      B.cmp({
        id: 'm3-time', t: 1, src: 'docs', title: 'The types of java.time',
        say: 'The `java.time` package replaced the old `Date` and `Calendar`. Press Next to read the types that a pipeline uses.',
        cols: ['Type', 'What it is', 'Use it for'],
        hl: 0,
        rows: [
          ['`Instant`', 'A point on the timeline, with no zone and no calendar', 'Storing and comparing event times. Think "UTC"'],
          ['`LocalDate`', 'A date with no time and no zone', 'A birthday, a business day'],
          ['`LocalDateTime`', 'A date and a time of day, with no zone', 'A wall clock reading that you have not placed yet'],
          ['`ZonedDateTime`', 'A date, a time and a zone, so an exact instant', 'Showing a time to a person in their zone'],
          ['`Duration` and `Period`', 'An amount of time: seconds or days and months', 'Differences. A `Duration` is exact, a `Period` follows the calendar']
        ],
        steps: [
          { upto: 2, say: 'An `Instant` is the type for **data**. A `LocalDateTime` is only a reading of a clock, and it means nothing until you know the zone.' },
          { upto: 5, say: 'Put the zone on at the **edge**, when you read a local time or show a result. Inside the pipeline, keep instants.' }
        ]
      }),

      B.code({
        id: 'm3-times-code', t: 2, src: 'rec', title: 'Times.java: the clocks of New York', file: 'Times.java', lang: 'java', code: TIM,
        steps: [
          { say: 'The clocks of New York changed on 8 March and on 1 November 2026. This program asks what Java does with a time that does not exist, and with one that happens twice. Press Next.', lines: null },
          { say: 'On 8 March at 02:00 the clock jumped to 03:00, so **02:30 does not exist**. What does Java make of it?', lines: G.span(TIM, /LocalDateTime\.of\(2026, 3, 8, 2, 30\)/) },
          { say: 'On 1 November at 02:00 the clock went back to 01:00, so **01:30 happens twice**. By default Java takes the earlier one, and `withLaterOffsetAtOverlap` takes the other.', lines: G.span(TIM, /ZonedDateTime overlap/, /withLaterOffsetAtOverlap/) },
          { say: 'Add one **day** to noon on 7 March. Is the next noon 24 hours later?', lines: G.span(TIM, /ZonedDateTime before/, /ChronoUnit\.DAYS\.between/) },
          { say: 'An `Instant` placed in a zone, and a text parsed with a pattern.', lines: G.span(TIM, /Instant\.parse/, /LocalDateTime\.parse\("2026-03-14 09:12:00"/) },
          { say: 'Two texts that are not dates. Read the messages that Java gives.', lines: G.span(TIM, /LocalDate\.parse\("2026-02-30"\)/, /LocalDateTime\.parse\("14\/03\/2026 09:12", f\)/) }
        ],
        note: 'A pipeline that uses the clock of the machine, or a zone that is not set, behaves differently on a server in another zone.'
      }),

      B.term({
        id: 'm3-times', t: 1, src: 'rec', title: 'What Times.java printed',
        say: 'The output of the program, line by line.',
        lines: function () { return G.plain(X('num.times')); },
        after: '02:30 on 8 March does not exist, and Java moved it to **03:30** (`' + T[0].split('[')[0] + '`). 01:30 on 1 November is **two different instants**, with the offsets -04:00 and -05:00. Adding one day to noon of 7 March gave noon the next day, which is **23 hours** later, not 24. An instant of 09:12 UTC is 05:12 in New York in March, and the parse errors name the text and the index.',
        afterKind: 'warn',
        doneSay: 'A local time can be missing or happen twice.'
      }),

      B.bug({
        id: 'm3-bug3', t: 2, q: 'A job reads the local timestamp of a New York store, such as 2026-03-08 02:30, and builds a ZonedDateTime. It does not fail, and the hourly totals of 8 March are wrong. Click the line that hides the problem.',
        file: 'Stamp.java', lang: 'java',
        code: 'ZoneId ny = ZoneId.of("America/New_York");\nLocalDateTime local = LocalDateTime.of(2026, 3, 8, 2, 30);\nZonedDateTime when = ZonedDateTime.of(local, ny);\n',
        bad: [3],
        hint: 'Does 02:30 exist in New York on that day?',
        why: 'On 8 March the clocks of New York jump from 02:00 to 03:00, so **02:30 never happened**. Java does not throw: it moves the time to **' + T[0].split('[')[0] + '**. A reading that cannot exist is a sign of bad data, or of a feed that is in another zone, and the quiet shift puts it in the wrong hour. Ask the producer for **UTC or an offset**, check that local times exist, and store `Instant`s.',
        fix: 'Instant when = Instant.parse("2026-03-08T07:30:00Z");   // the feed sends UTC, or an offset\nZonedDateTime shown = when.atZone(ZoneId.of("America/New_York"));\n',
        cheer: 'Store instants and place the zone at the edge.'
      }),

      B.quiz({
        id: 'm3-q1', t: 1,
        q: 'Why is the sum of ten cents a million times not exactly 100,000 in the recording?',
        opts: [
          { t: 'A double is a binary fraction, and 0.10 has no exact one', fb: '' },
          { t: 'The loop has a bug', fb: 'The loop is right. The type is not.' },
          { t: 'Java rounds down', fb: 'It did not round. It kept the error of each addition.' },
          { t: 'The JVM is too old', fb: 'It happens on every JVM, because it is how doubles work.' }
        ],
        ok: 0, why: 'The double sum was ' + N[1].replace('double sum:', '').trim() + ', and the `BigDecimal` sum was ' + N[2].replace('BigDecimal sum: ', '') + '.'
      }),

      B.quiz({
        id: 'm3-q2', t: 1,
        q: 'In the recording, `new BigDecimal("2.50").equals(new BigDecimal("2.5"))` printed `false` and `compareTo(...) == 0` printed `true`. Why?',
        opts: [
          { t: '`equals` compares the scale as well, and `compareTo` compares the number', fb: '' },
          { t: '`equals` has a bug', fb: 'It is documented: 2.50 has scale 2 and 2.5 has scale 1.' },
          { t: '`compareTo` rounds first', fb: 'It does not change the values.' },
          { t: 'The first one is a double', fb: 'Both are BigDecimal.' }
        ],
        ok: 0, why: 'Use `compareTo` for the value, or normalize the scale with `setScale` before you use a `BigDecimal` as a key.'
      }),

      B.quiz({
        id: 'm3-q3', t: 1,
        q: 'What does `Integer.MAX_VALUE + 1` give in Java, and what does `Math.addExact` do instead?',
        opts: [
          { t: 'It wraps to ' + N[4] + ', and addExact throws `ArithmeticException`', fb: '' },
          { t: 'It throws an exception, and addExact wraps', fb: 'The other way around.' },
          { t: 'It promotes to a long', fb: 'An int plus an int stays an int.' },
          { t: 'It gives a compile error', fb: 'The compiler accepts it.' }
        ],
        ok: 0, why: 'The recording printed `' + N[4] + '` and `' + N[5] + '`. For a counter of rows or cents, use a `long`, and `addExact` where an overflow would be a bug.'
      }),

      B.quiz({
        id: 'm3-q4', t: 2,
        q: 'You add one day to noon on 7 March 2026 in New York. How many hours later is the result in the recording?',
        opts: [
          { t: '23 hours, because the clocks jumped forward in between', fb: '' },
          { t: '24 hours, always', fb: 'Not on a day that changes the clock.' },
          { t: '25 hours', fb: 'That is the day in November.' },
          { t: 'It depends on the machine', fb: 'It depends on the zone that you gave, not on the machine.' }
        ],
        ok: 0, why: 'The recording printed `' + T[2].split('] ')[1] + '`: **23 hours** and **1 day**. A `Period` follows the calendar, and a `Duration` counts exact time.'
      }),

      B.order({
        id: 'm3-ord', t: 1, q: 'Put the steps in order to handle a money column from a CSV file safely.',
        items: ['Read the amount as text', 'Make a `BigDecimal` from the text, or count cents with `longValueExact`', 'Refuse a value with more decimals than allowed', 'Add up with `BigDecimal` or `long`, never with a double', 'Round once, at the end, with a named rounding mode'],
        why: 'Text in, exact types inside, refuse what does not fit, and round once at the edge with a rule that finance agreed.'
      }),

      B.decide({
        id: 'm3-dec', t: 2, src: 'rec', title: 'Decision: how should the pipeline hold money?',
        scenario: 'The Brewline loader reads amounts such as `12.50` and adds them by store and by day. The totals go to finance and must equal the totals of the point of sale to the cent.',
        opts: [
          { t: 'Cents in a `long`, read with `BigDecimal.movePointRight(2).longValueExact()`', d: 'Exact, fast, and it fits a database column. The loader of this course does this: the 50 orders gave 226,675 cents and a million lines gave 4,497,500,000.', lose: 'You have to divide by 100 to show it, and a currency with a different number of decimals needs care.' },
          { t: '`BigDecimal` with a fixed scale', d: 'Exact, readable, and it handles any scale.', lose: 'Slower and heavier than a long. `equals` and the scale need discipline.' },
          { t: '`double`', d: 'Easy to write.', lose: 'The sum of ten cents a million times was off by about ' + ERR + '. A reconciliation to the cent will find it.' }
        ],
        pick: 0,
        why: 'Both exact choices work, and cents in a `long` is the simplest to store and to add up. The recorded loader refuses a value with more than two decimals, so a bad amount fails loudly. Pick one rule for the whole pipeline.',
        when: 'Use `BigDecimal` when a computation needs more decimals than the currency has, such as a tax or an exchange rate.'
      }),

      B.incident({
        id: 'm3-inc', t: 2, src: 'rec', title: 'Incident: the hourly report has no 02:00 and two 01:00 rows', time: '08:30',
        alert: '**The hourly order report of the New York stores has no row for 02:00 on 8 March and two rows for 01:00 on 1 November.** The job groups orders by the local hour of the store. Finance asks whether orders were lost.',
        clues: ['The job uses `LocalDateTime` and groups by `getHour()`', 'The stores send local timestamps without an offset', 'The two dates are the days that the clocks change'],
        opts: [
          { t: 'Store the time as an `Instant` (UTC) and group by the hour in the zone only when you show it', fb: '' },
          { t: 'Add a row for 02:00 by hand', fb: 'Next year it is another date, and the 01:00 rows are still wrong.' },
          { t: 'Tell finance that orders were lost', fb: 'They were not. The grouping key is the problem.' },
          { t: 'Run the job in a zone with no daylight saving', fb: 'It hides the problem, and the local hour would be wrong for the stores.' }
        ],
        best: 0,
        why: 'In the recording 8 March has **23 hours** and 1 November has an hour that happens **twice**, with the offsets -04:00 and -05:00. A local hour is not a unique key. An `Instant` is, and the zone is a presentation detail.',
        checks: [
          ['Find the dates', 'The days when the clocks change.'],
          ['Look at the key', 'A local hour is not unique.'],
          ['Look at the feed', 'Local times with no offset are ambiguous.'],
          ['Fix', 'Instants inside, the zone at the edge, and an offset in the feed.']
        ],
        tell: 'The report grouped by the local hour, and on the two days when the clocks change a local hour is missing or happens twice. No orders were lost. I will group by the instant and convert to the local hour only to show it, and ask the stores to send an offset.',
        prevent: ['Keep **instants** (UTC) in the pipeline', 'Ask producers for an **offset**', 'Test with **8 March and 1 November**']
      }),

      B.qa({
        id: 'qa-money', t: 1, tag: 'Java', secs: 75,
        q: 'How do you handle money in Java?',
        pts: ['Never a double', 'BigDecimal from text, or cents in a long', 'Refuse extra decimals', 'Round once, with a named mode'],
        short: 'Not in a `double`: it is a binary fraction, and 0.10 has no exact one. In my test, ten cents added a million times gave 100000.00000133288 as a double and exactly 100000.00 as a `BigDecimal`. I read the amount as **text** and make a `BigDecimal` from the text, never from a double, because `new BigDecimal(0.1)` keeps the error. Or I count **cents** in a `long`, reading with `movePointRight(2).longValueExact()`, which refuses a value with more than two decimals. I add up in the exact type, and round **once**, at the end, with a named rounding mode that finance agreed. `HALF_EVEN` gave 2.34 for 2.345 and 2.36 for 2.355. For counters I use `addExact` so that an overflow throws.',
        fu: [['BigDecimal.valueOf or new BigDecimal(String)?', 'Both go through text. valueOf takes the shortest text of a double.'], ['What about the database?', 'DECIMAL with a scale, and the same rule on both sides.']],
        trap: 'Rounding every line and then adding.',
        real: 'Describe a total that did not match finance.'
      }),

      B.qa({
        id: 'qa-bigdecimal', t: 2, tag: 'Java', secs: 60,
        q: 'What are the traps of BigDecimal?',
        pts: ['new BigDecimal(double)', 'equals compares scale', 'Division needs a scale and a mode', 'Immutable: use the result'],
        short: 'Four. First, **`new BigDecimal(0.1)`** takes a double and keeps its error: it printed fifty digits. Build it from text. Second, **`equals`** compares the scale as well, so 2.50 and 2.5 are not equal, and `compareTo` says that they are the same number. Third, dividing with no scale throws `ArithmeticException` when the result never ends, as 10 divided by 3 did, so I give a scale and a rounding mode and got 3.33. Fourth, a `BigDecimal` is **immutable**: `a.add(b)` returns a new value, and ignoring it is a bug. I also choose the rounding mode on purpose, because the default for people is HALF_UP and the default for money in some systems is HALF_EVEN.',
        fu: [['What is MathContext?', 'It sets precision, the number of significant digits, instead of a scale.'], ['Is it slow?', 'Slower than a long. For most pipelines it does not matter.']],
        trap: 'Using BigDecimal as a map key without a scale.',
        real: 'Describe a BigDecimal mistake that you saw.'
      }),

      B.qa({
        id: 'qa-javatime', t: 1, tag: 'Java', secs: 60,
        q: 'Which java.time types do you use, and where?',
        pts: ['Instant inside', 'ZonedDateTime to show', 'LocalDate for dates', 'Duration and Period'],
        short: 'Inside a pipeline I keep **`Instant`**, a point on the timeline, which is UTC in practice, so that it is unique and comparable. I use **`ZonedDateTime`** only at the edge, to show a time in a person\'s zone or to place a local time that I read. **`LocalDate`** is for things that are dates, such as a business day, and **`LocalDateTime`** is a clock reading with no zone, which means nothing until I know the zone. `Duration` is exact time, and `Period` follows the calendar, so one day added to noon of 7 March in New York was 23 hours. I do not use `Date`, `Calendar` or `SimpleDateFormat`: the new types are immutable and safe to share.',
        fu: [['What about a timestamp column?', 'Store UTC, and name the zone when you convert.'], ['How do you parse?', 'DateTimeFormatter with a pattern. A wrong text gave a DateTimeParseException that names the index.']],
        trap: 'Using LocalDateTime for event times.',
        real: 'Say how your pipelines store time.'
      }),

      B.qa({
        id: 'qa-dst', t: 2, tag: 'Java', secs: 60,
        q: 'What can go wrong with daylight saving time in a pipeline?',
        pts: ['A day with 23 or 25 hours', 'A local time that does not exist', 'A local time that happens twice', 'Fix: instants and an offset'],
        short: 'Three things. A day can have 23 or 25 hours, so "one day later" is not always 24 hours: in my test one day after noon of 7 March in New York was 23 hours later. A local time can **not exist**: 02:30 on 8 March, which Java moved to 03:30 without an error. And a local time can **happen twice**: 01:30 on 1 November had the offsets -04:00 and -05:00. So a local hour is not a unique key, and a report that groups by it loses an hour in March and doubles one in November. I store **instants**, ask producers for an offset, group by the instant, convert to the zone only to show a result, and test with the two change dates.',
        fu: [['Which offset does Java pick in an overlap?', 'The earlier one by default. `withLaterOffsetAtOverlap` picks the other.'], ['What about zones that change rules?', 'Keep the time zone data of the JDK up to date.']],
        trap: 'Grouping by a local hour.',
        real: 'Describe a report that was wrong on a change day.'
      }),

      B.recap({
        id: 'm3-recap', n: 3, badge: 'Number Keeper', color: '#FDE68A',
        pts: [
          'Ten cents a million times: **' + N[1].replace('double sum:', '').trim() + '** in a double, **' + N[2].replace('BigDecimal sum: ', '') + '** in a `BigDecimal`.',
          '`new BigDecimal(0.1)` keeps the error of the double. Build it from **text**, or count **cents** in a `long`.',
          '`Integer.MAX_VALUE + 1` is `' + N[4] + '`. `Math.addExact` throws. `HALF_EVEN` gave `' + N[9] + '` for two ties.',
          '`Instant` inside, the zone at the edge. 02:30 on 8 March became **03:30**, and 01:30 on 1 November happens **twice**.',
          'One day after noon of 7 March is **23 hours** later in New York.'
        ],
        lines: [
          'I do not use a double for money.',
          'I keep instants in the pipeline.',
          'I test with the days when the clocks change.'
        ]
      })
    ]
  });
})();
