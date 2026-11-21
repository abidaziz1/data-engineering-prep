/* Mission 2: the language of pipelines. Records, enums, switch, Optional, immutable lists, and streams with their laziness and their errors. Every output ran on the real JDK 21. */
(function () {
  var B = LAB.b, G = LAB.get;
  var C = G.counts, X = G.text, n = G.n;
  var ORD = G.file('Orders.java'), STR = G.file('Streams.java'), LC = C('lang');
  var OT = X('lang.orders').split('\n').slice(1), ST = X('lang.streams').split('\n').slice(1);
  G.expect(OT[0] === 'Order[id=O-1, storeId=1, status=PLACED, amount=12.5]' && OT[1] === 'true' && OT[2] === 'on its way' && OT[5] === 'add failed: java.lang.UnsupportedOperationException' && OT[6] === 'bad order: amount must not be negative: -1.0' && OT[7] === '{store 1=2, store 2=1}', 'the output of Orders.java');
  G.expect(ST[0] === '{BEANS-250=98.0, FILTER=17.5, MUG=9.0}' && ST[1] === 'peek a' && ST[2] === 'got A' && ST[3] === 'peek b' && ST[4] === 'got B' && ST[5] === 'reuse: stream has already been operated upon or closed' && ST[6] === 'toMap: Duplicate key BEANS-250 (attempted merging values 2 and 5)' && ST[7] === '{BEANS-250=7, FILTER=5, MUG=1}' && ST[8] === '{false=3, true=2}', 'the output of Streams.java: peek stops at the limit, a reused stream and a duplicate key throw');

  LAB.addChapter({
    id: 'm2', n: 2, title: 'Records and streams', short: 'Language', blurb: 'The parts of modern Java that pipelines use every day', minutes: 24,
    focus: ['ing'],
    goals: [
      'Model a row with a **record** and a status with an **enum**, and say what each guarantees.',
      'Use **Optional**, a **switch expression** and an **immutable list**, and read their errors.',
      'Write a **stream** with grouping, and say what **lazy** means.',
      'Fix the two errors that streams throw in a nightly job: a **reused stream** and a **duplicate key**.'
    ],
    say: 'Java has changed. Records, switch expressions, text blocks and streams make the code of a pipeline short, and each of them has a failure that you should be able to read. I ran two small programs on the real JDK and kept every line that they printed. Keep the Python habits that you have, and notice where Java checks more at compile time and where it still throws at run time.',
    scenes: [
      B.code({
        id: 'm2-code', t: 1, src: 'rec', title: 'Orders.java: a record, an enum, a switch and an Optional', file: 'Orders.java', lang: 'java', code: ORD,
        steps: [
          { say: 'One file of about fifty lines. It ran, and the next screen shows what it printed. Press Next.', lines: null },
          { say: 'An **enum** is a fixed set of values. A `Status` cannot be anything but one of the three, and the compiler knows them.', lines: G.span(ORD, /enum Status/) },
          { say: 'A **record** is a class for plain data. One line gives the fields, a constructor, the getters (`id()`, `amount()`), `equals`, `hashCode` and `toString`. The **compact constructor** runs first and can refuse a bad value.', lines: G.span(ORD, /record Order\(/, /^    }$/) },
          { say: 'A **switch expression** returns a value, and with an enum the compiler **checks that every case is covered**. Add a fourth status and this stops compiling until you handle it.', lines: G.span(ORD, /static String label/, /^    }$/) },
          { say: '`Optional` says "there may be no result" in the type. `findFirst` returns one, and `map` and `orElse` work on it without a null check.', lines: G.span(ORD, /static Optional<Order> find/, /^    }$/) },
          { say: '`List.of(...)` makes an **immutable** list. Adding to it throws, as the next screen shows.', lines: G.span(ORD, /List<Order> orders = List\.of/, /Status\.REFUNDED, 7\.25\)\);/) },
          { say: 'A `HashMap` and `merge` count the orders of each store. It is printed through a `TreeMap` so that the order of the keys is fixed. A `HashMap` does not promise any order.', lines: G.span(ORD, /Map<String, Integer> byStore/, /System\.out\.println\(new TreeMap/) },
          { say: 'A **text block** between three quotes keeps its lines and removes the indentation.', lines: G.span(ORD, /String header = """/, /""";/) }
        ],
        note: 'Records, switch expressions and text blocks are all in Java 21. The language has moved a lot since Java 8.'
      }),

      B.term({
        id: 'm2-out', t: 1, src: 'rec', title: 'What Orders.java printed',
        say: 'The output of the program, line by line.',
        lines: function () { return G.plain(X('lang.orders')); },
        after: 'The record printed as `Order[id=O-1, ...]` without any code of mine, and two records with the same fields are **equal**: `' + OT[1] + '`. `List.of` refused an add with `UnsupportedOperationException`, and the compact constructor refused a negative amount with its own message. `Optional.orElse` gave `' + OT[4] + '` for an order that does not exist, and no `NullPointerException`.',
        afterKind: 'tip',
        doneSay: 'A record is data with equality for free.'
      }),

      B.cmp({
        id: 'm2-py', t: 1, src: 'docs', title: 'Your Python habits, in Java',
        say: 'You can read Java faster if you know where each Python habit went. Press Next to compare them.',
        cols: ['In Python', 'In Java', 'What differs'],
        hl: 1,
        rows: [
          ['A dict', '`Map<String, Integer>`: `HashMap`, `TreeMap`, `LinkedHashMap`', 'You choose the kind. `HashMap` has no order, `TreeMap` sorts, `LinkedHashMap` keeps insertion order'],
          ['A list', '`List<Order>`: `ArrayList`, or `List.of(...)` that cannot change', 'The type of the elements is in the declaration and checked'],
          ['A dataclass', 'A `record`', 'Immutable: the fields cannot change after the constructor'],
          ['`None`', '`null`, and `Optional<T>` for "maybe no value"', 'A `null` where an object was expected is a `NullPointerException` at run time'],
          ['Duck typing', 'Types are declared and checked by `javac`', 'A type error is found before the program runs'],
          ['A list comprehension', 'A stream: `list.stream().filter(...).map(...).toList()`', 'Lazy, and it can be used once']
        ],
        steps: [
          { upto: 3, say: 'The first three rows are the containers. They look alike, and Java makes you choose the kind and says what it promises.' },
          { upto: 6, say: 'The last three are about **absence**, **types** and **transformations**. Java moves some checks to compile time and keeps others, such as a null, at run time.' }
        ]
      }),

      B.code({
        id: 'm2-streams-code', t: 1, src: 'rec', title: 'Streams.java: five lines of an order, grouped and counted', file: 'Streams.java', lang: 'java', code: STR,
        steps: [
          { say: 'A record of an order line, five lines of data, and six things that a stream does with them. It ran, and the next screen shows the output. Press Next.', lines: null },
          { say: '`groupingBy` groups the lines by SKU, and `summingDouble` adds the value of each group. A `TreeMap` keeps the keys sorted.', lines: G.span(STR, /Map<String, Double> revenue/, /summingDouble/) },
          { say: '`peek` prints each element as it passes, and `limit(2)` stops the stream after two. This shows **when** the steps run.', lines: G.span(STR, /Stream\.of\("a"/, /forEach/) },
          { say: 'A stream is **used once**. The second `count()` on the same stream throws.', lines: G.span(STR, /Stream<String> once/, /^        }$/) },
          { say: '`toMap` builds a map, and **throws when two elements have the same key**. There are two lines of the SKU `BEANS-250`.', lines: G.span(STR, /lines\.stream\(\)\.collect\(Collectors\.toMap\(Line::sku, Line::qty\)\);/, /^        }$/) },
          { say: 'The fix: give `toMap` a **merge function**, here `Integer::sum`, that says what to do with two values of one key.', lines: G.span(STR, /Map<String, Integer> qty/) },
          { say: '`partitioningBy` splits into two groups with a condition, and `counting` counts each.', lines: G.span(STR, /Map<Boolean, Long> bigOrSmall/) }
        ],
        note: 'The data is five lines on purpose. The point is what the stream does, and a small input makes the output readable.'
      }),

      B.flow({
        id: 'm2-flow', t: 1, src: 'rec', title: 'A stream is lazy', g: 'streams', legend: true,
        steps: [
          { say: 'Three letters go through a `peek`, a `map` and a `limit(2)`. Press Next.', focus: ['src', 'fil', 'map', 'out'], cap: 'A source, two steps and a terminal step.' },
          { say: 'Step 1. Building the pipeline **runs nothing**. `peek`, `map` and `limit` describe what to do. Nothing was printed yet.', on: ['e1', 'e2'], focus: ['src', 'fil', 'map'], tags: ['tg_lazy'], cap: 'Describing is not running.' },
          { say: 'Step 2. `forEach` is the **terminal step**. It asks for the first element, and `a` goes through the whole pipeline: `' + ST[1] + '`, then `' + ST[2] + '`. Then `b`: `' + ST[3] + '`, `' + ST[4] + '`.', on: ['e3'], focus: ['map', 'out'], tags: ['tg_go'], cap: 'The terminal step starts it.' },
          { say: 'Step 3. After two elements `limit(2)` stops the pipeline. **`c` was never read**: there is no `peek c`. A lazy stream does only the work that the result needs, and that is how a stream can read a file that does not fit in memory.', on: ['e3'], focus: ['out'], tags: ['tg_once'], cap: 'It stops when it has enough.' }
        ]
      }),

      B.term({
        id: 'm2-streams-out', t: 1, src: 'rec', title: 'What Streams.java printed',
        say: 'The output of the program, line by line, with its two errors.',
        lines: function () { return G.plain(X('lang.streams')); },
        after: 'The revenue is grouped and added: `' + ST[0] + '`. The two errors are **`IllegalStateException`**: `' + ST[5] + '`, and `' + ST[6] + '`. Both come from the stream API and not from your logic, and both are easy to cause in a nightly job: a stream that is stored in a variable and used twice, and a key that repeats in the data. With the merge function the quantities were added: `' + ST[7] + '`.',
        afterKind: 'warn',
        doneSay: 'A stream is used once, and toMap needs a merge function for repeated keys.'
      }),

      B.bug({
        id: 'm2-bug', t: 1, q: 'A nightly job turns the lines of an order feed into a map from SKU to quantity. It works for weeks, then dies with IllegalStateException. Click the line that causes it.',
        file: 'Quantities.java', lang: 'java',
        code: 'Map<String, Integer> qty = lines.stream()\n    .collect(Collectors.toMap(\n        Line::sku,\n        Line::qty));\n',
        bad: [2],
        hint: 'What does toMap do when two lines have the same SKU?',
        why: '`Collectors.toMap` without a merge function **throws when a key repeats**. The recorded message is `' + ST[6] + '`. It works for weeks because the data had one line for each SKU, and fails on the first day that two lines of an order share one. Decide what a repeat means, and say it in the code: `Integer::sum` adds, and `groupingBy` with a downstream collector is the other way.',
        fix: 'Map<String, Integer> qty = lines.stream()\n    .collect(Collectors.toMap(\n        Line::sku,\n        Line::qty,\n        Integer::sum));\n',
        cheer: 'Say what a repeated key means.'
      }),

      B.bug({
        id: 'm2-bug2', t: 1, q: 'A method gets the orders of the day as a List.of(...) and adds a late order to it. It throws. Click the line that fails.',
        file: 'Late.java', lang: 'java',
        code: 'List<Order> orders = List.of(a, b, c);\nOrder late = new Order("O-4", 3, Status.PLACED, 1.0);\norders.add(late);\n',
        bad: [3],
        hint: 'Can the list that List.of returns be changed?',
        why: '`List.of` returns an **immutable** list. Any `add`, `remove` or `set` throws `UnsupportedOperationException`: the recording printed `' + OT[5] + '`. That is a feature. Make a copy when you need to change it: `new ArrayList<>(orders)`.',
        fix: 'List<Order> orders = new ArrayList<>(List.of(a, b, c));\nOrder late = new Order("O-4", 3, Status.PLACED, 1.0);\norders.add(late);\n',
        cheer: 'Copy before you change.'
      }),

      B.quiz({
        id: 'm2-q1', t: 1,
        q: 'You build a stream pipeline with `peek` and `map` and never call a terminal step. What does it print?',
        opts: [
          { t: 'Nothing: a stream is lazy and starts at the terminal step', fb: '' },
          { t: 'Every peek, in order', fb: 'Only a terminal step starts the work.' },
          { t: 'An error, because the stream was not used', fb: 'It is allowed. It just does nothing.' },
          { t: 'The first element only', fb: 'No element is read.' }
        ],
        ok: 0, why: 'In the recording `forEach` started the pipeline, and `limit(2)` stopped it, so the `peek` of the third element never printed.'
      }),

      B.quiz({
        id: 'm2-q2', t: 1,
        q: 'What does `' + ST[6] + '` tell you?',
        opts: [
          { t: 'Two elements have the same key, and toMap needs a merge function', fb: '' },
          { t: 'The map is full', fb: 'A map has no capacity limit of that kind.' },
          { t: 'The key is null', fb: 'A null key gives a different error.' },
          { t: 'The stream was used twice', fb: 'That is `stream has already been operated upon or closed`.' }
        ],
        ok: 0, why: 'The two values were 2 and 5. With `Integer::sum` as the merge function the result was `' + ST[7] + '`.'
      }),

      B.quiz({
        id: 'm2-q3', t: 1,
        q: 'Which of these is true of a Java record?',
        opts: [
          { t: 'Its fields cannot be changed after it is built, and it has equals and toString', fb: '' },
          { t: 'It can be changed like any object', fb: 'Its fields are final.' },
          { t: 'It cannot have a constructor', fb: 'It can have a compact constructor that checks the values.' },
          { t: 'It is the same as a HashMap', fb: 'It is a class with named fields.' }
        ],
        ok: 0, why: 'The recording: `' + OT[0] + '`, two equal records gave `' + OT[1] + '`, and the compact constructor refused a negative amount.'
      }),

      B.quiz({
        id: 'm2-q4', t: 2, src: 'docs',
        q: 'You add a fourth value to an enum that a switch expression covers. What does the compiler do?',
        opts: [
          { t: 'Refuses the switch until the new case is handled', fb: '' },
          { t: 'Ignores the new value', fb: 'A switch expression has to be exhaustive.' },
          { t: 'Throws at run time only', fb: 'With a switch expression over an enum it is found at compile time.' },
          { t: 'Adds the case itself', fb: 'It does not write code.' }
        ],
        ok: 0, why: 'That is the benefit of an enum with a switch expression: a new status cannot slip through a place that forgot it. This is from documentation, and I did not add a value to run it.'
      }),

      B.order({
        id: 'm2-ord', t: 1, q: 'Put the parts of a stream pipeline in order.',
        items: ['Take the source: a list or the lines of a file', 'Describe the intermediate steps: filter, map', 'Call the terminal step: collect, count or forEach', 'The elements flow through the steps, one at a time', 'The stream is finished and cannot be used again'],
        why: 'Nothing runs until the terminal step. Then each element goes through all the steps, and the stream is spent.'
      }),

      B.decide({
        id: 'm2-dec', t: 2, src: 'docs', title: 'Decision: a loop, a stream or a parallel stream?',
        scenario: 'A job groups 200 million order lines by SKU, in a single process on one machine, after a fast read from a file. A teammate suggests `parallelStream()` "because it is faster".',
        opts: [
          { t: 'A sequential stream, or a loop, that reads the file lazily', d: 'Simple, predictable, and the memory stays small. Measure first.', lose: 'It uses one core.' },
          { t: '`parallelStream()` on the whole list', d: 'It can use all the cores for the grouping.', lose: 'The data has to be in memory first, the threads share a pool with everything else in the process, and the gain depends on the work. For a short pipeline it can be slower.' },
          { t: 'Hand the grouping to Spark or a database', d: 'Built for this size, and it scales out.', lose: 'More to run. Spark has its own course.' }
        ],
        pick: 0,
        why: 'A parallel stream is a tool for a computation that is heavy for each element and a collection that is already in memory. A grouping over a file is bound by reading, and at 200 million lines the right answer is often a distributed engine. This is from documentation and experience, and I did not run a parallel stream.',
        when: 'Use a parallel stream for CPU-heavy work on a large list that fits in memory, after a measurement that shows a gain.'
      }),

      B.incident({
        id: 'm2-inc', t: 2, src: 'rec', title: 'Incident: the nightly job dies with IllegalStateException', time: '02:45',
        alert: '**The nightly job stopped at 02:20 with `IllegalStateException: Duplicate key BEANS-250 (attempted merging values 2 and 5)`.** It has run for four months. Today the feed contains two lines of the same SKU in one order.',
        clues: ['The job turns lines into a map with `Collectors.toMap`', 'The map is from SKU to quantity', 'The feed changed today: a promotion splits a product over two lines'],
        opts: [
          { t: 'Give `toMap` a merge function that adds the quantities, and test with a feed that has a repeated SKU', fb: '' },
          { t: 'Catch the exception and skip the order', fb: 'You would lose the quantity of an order without a trace.' },
          { t: 'Remove the duplicate lines from the feed by hand', fb: 'The feed will have them again tomorrow.' },
          { t: 'Make the job run in parallel', fb: 'It does not change what a repeated key means.' }
        ],
        best: 0,
        why: 'The recording: `Duplicate key BEANS-250 (attempted merging values 2 and 5)` and, with `Integer::sum`, `{BEANS-250=7, FILTER=5, MUG=1}`. The code has to say what a repeated key means, and a test with a repeated key keeps it that way.',
        checks: [
          ['Read the message', 'It names the key and the two values.'],
          ['Find the toMap', 'There is no merge function.'],
          ['Decide the meaning', 'Quantities of one SKU add up.'],
          ['Test it', 'A test with a feed that repeats a SKU.']
        ],
        tell: 'A promotion put two lines of one SKU in an order, and `Collectors.toMap` has no merge function, so it threw on the repeated key. I added `Integer::sum` so that the quantities add up, and a test that feeds a repeated SKU. I will check the other places where we use `toMap`.',
        prevent: ['Always give **`toMap`** a merge function, or use `groupingBy`', 'Test with a **repeated key**', 'Alert on **exceptions** in a job, and read the message']
      }),

      B.qa({
        id: 'qa-records', t: 1, tag: 'Java', secs: 60,
        q: 'What is a record, and when do you use one?',
        pts: ['A class for plain, immutable data', 'Constructor, getters, equals, hashCode, toString for free', 'A compact constructor can validate', 'Not for objects that change'],
        short: 'A **record** is a class for plain data. One line gives the fields, the constructor, the accessors, `equals`, `hashCode` and `toString`, and the fields cannot change after it is built. A **compact constructor** can check the values: in my example it refused a negative amount. I use records for rows, messages and results that are read and passed around, such as an order or a line of an order. I use a normal class for something that has behavior and changes state. A record is a better key of a map than a class with no `equals`, because two records with the same values are equal.',
        fu: [['Can a record implement an interface?', 'Yes.'], ['Since which version?', 'Records were finalized in Java 16, so they are in every long-term release since 17.']],
        trap: 'Using a record for something that must change.',
        real: 'Describe a row that you model in Java.'
      }),

      B.qa({
        id: 'qa-lazy', t: 1, tag: 'Java', secs: 60,
        q: 'What does it mean that streams are lazy?',
        pts: ['Intermediate steps only describe', 'A terminal step starts the work', 'Elements flow one at a time', 'A stream can be used once'],
        short: 'The intermediate steps, such as `filter` and `map`, only **describe** the work. Nothing runs until a **terminal step**, such as `collect`, `count` or `forEach`, asks for the result. Then each element flows through all the steps, one at a time, and the pipeline can stop early. In my example `peek` printed a and b and never c, because `limit(2)` had enough. That is why a stream can process a file that is larger than the memory, and why a stream that you build and never finish does nothing. A stream can be used once: a second terminal step on it throws `IllegalStateException`.',
        fu: [['Is a parallel stream lazy too?', 'Yes, and the elements are split across threads.'], ['What about side effects in map?', 'Avoid them. The order and the number of calls are not something to rely on.']],
        trap: 'Putting an important side effect in peek or map.',
        real: 'Say where you used a stream on a big file.'
      }),

      B.qa({
        id: 'qa-immutable', t: 1, tag: 'Java', secs: 60,
        q: 'Why are immutable collections and records good for pipelines?',
        pts: ['No one can change them by mistake', 'Safe to share between threads', 'List.of and record fields throw on a change', 'Copy when you need to change'],
        short: 'Data that cannot change cannot be changed by a function that you did not expect, and can be shared by threads without a lock. `List.of` and `Map.of` give immutable collections, and a record has final fields. In my example adding to a `List.of` threw `UnsupportedOperationException`, which turns a silent bug into a loud one. When I need a changed version, I copy: `new ArrayList<>(list)`, or build a new record. This matters in a pipeline because the same row often passes through several steps, and a step that changes it in place is a source of results that depend on the order of the steps.',
        fu: [['Is `Collections.unmodifiableList` the same?', 'It is a read-only view. The list behind it can still change.'], ['What does it cost?', 'Copies. For large data use an engine that handles it.']],
        trap: 'Handing out the internal list of an object.',
        real: 'Describe a bug that came from a shared mutable list.'
      }),

      B.qa({
        id: 'qa-optional', t: 1, tag: 'Java', secs: 45,
        q: 'What is Optional for, and when would you not use it?',
        pts: ['A return type that says "maybe no value"', 'map, orElse, orElseThrow instead of null checks', 'Not for fields or parameters', 'null is still there'],
        short: '`Optional<T>` is a **return type** that says in the signature that there may be no result, so the caller is made to handle it: `map`, `orElse` and `orElseThrow` replace the null check. In my example a missing order gave `-1.0` through `orElse` and no `NullPointerException`. I use it for the result of a search or a lookup. I do not use it for fields or for method parameters, where it adds noise, and I remember that `null` is still in the language, so a library can return one. A `get()` without a check puts the exception back, so I prefer `orElseThrow` with a message that says what was missing.',
        fu: [['Is it serializable?', 'No, which is one more reason not to keep it in a field.'], ['What about a collection that may be empty?', 'Return an empty list, not an Optional of a list.']],
        trap: 'Calling get() without checking.',
        real: 'Say how you handle a lookup that finds nothing.'
      }),

      B.recap({
        id: 'm2-recap', n: 2, badge: 'Stream Handler', color: '#FDE68A',
        pts: [
          'A **record** is immutable data with `equals` and `toString`: `' + OT[0] + '`. A compact constructor refused a negative amount.',
          '`List.of` is **immutable**: an add threw `UnsupportedOperationException`. Copy to change.',
          'A stream is **lazy**: `limit(2)` stopped it, and the third `peek` never printed.',
          'A stream is used **once**: `' + ST[5] + '`.',
          '`toMap` throws on a repeated key (`' + ST[6] + '`) unless it has a merge function: `' + ST[7] + '`.'
        ],
        lines: [
          'I can model a row with a record.',
          'I know what lazy means.',
          'I give toMap a merge function.'
        ]
      })
    ]
  });
})();
