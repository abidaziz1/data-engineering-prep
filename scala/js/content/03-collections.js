/* Mission 3: collections and functions. Collections.scala ran on the real Scala 2.13.16 compiler and the JDK. */
(function () {
  var B = LAB.b, G = LAB.get;
  var C = G.counts, X = G.text, n = G.n;
  var K = C('coll'), COL = G.file('Collections.scala'), CL = X('coll.collections').split('\n').slice(2);
  G.expect(K.strict_steps === 8 && K.lazy_steps === 4 && K.lazy_trace === 'map 1, filter 10, map 2, filter 20', 'a strict list runs 8 steps for the first match and a view runs 4');
  G.expect(CL[1] === 'Map(FILTER -> 5, BEANS-250 -> 7, MUG -> 1)' && K.duplicate_key_line === 'Map(MUG -> 1, BEANS-250 -> 5, FILTER -> 5)' && K.total_cents === 15250, 'groupMapReduce adds the duplicates (7) and toMap keeps the last one (5)');
  G.expect(/key not found: TEA/.test(K.missing_key_line) && /empty list/.test(K.head_line), 'apply on a missing key and head of an empty list throw');

  LAB.addChapter({
    id: 'm3', n: 3, title: 'Collections and functions', short: 'Collections', blurb: 'map, groupBy and fold, and what is strict and what is lazy', minutes: 22,
    focus: ['mart', 'src'],
    goals: [
      'Use **map, filter, groupMapReduce and foldLeft** on a `List`.',
      'Say what a **view** does that a `List` does not.',
      'Avoid three traps: **`toMap` on duplicate keys, `apply` on a missing key, and an iterator that is used twice**.',
      'Choose between a `List`, a `Vector` and an `Iterator`.'
    ],
    say: 'Most Scala in a pipeline is a chain of map, filter and group. It is short, and it hides three traps. I ran each one with the real compiler and wrote down what it printed.',
    scenes: [
      B.code({
        id: 'm3-code', t: 1, src: 'rec', title: 'Collections.scala: four sales lines', file: 'Collections.scala', lang: 'scala', code: COL,
        steps: [
          { say: 'One program that does the usual things with four lines of sales, and then the traps. Press Next.', lines: null },
          { say: 'A **`List` of case classes**. Everything below leaves this list as it is: collections in Scala are **immutable** by default.', lines: G.span(COL, /val lines = List/) },
          { say: '`map` changes each element. `groupMapReduce` groups by a key, maps each element, and **adds up** the group: three lines become three SKUs.', lines: G.span(COL, /println\(lines\.map\(_\.sku\)\)/, /groupMapReduce/) },
          { say: '`foldLeft` carries a **running total** through the list. It starts at `0L` and adds quantity times cents for each line.', lines: G.span(COL, /foldLeft/) },
          { say: 'Trap 1. `toMap` on pairs with **the same key** keeps only the last one. Nothing warns you.', lines: G.span(COL, /\.toMap\)/) },
          { say: 'Trap 2. `stock("TEA")` **throws** when the key is missing. `get` returns an `Option`, and `getOrElse` gives a default.', lines: G.span(COL, /val stock = Map/, /catch \{ case e: NoSuchElementException => println\(s"stock/) },
          { say: '`xs :+ 5` makes a **new** list, and `xs` is untouched. A `List` never changes.', lines: G.span(COL, /val xs = List/, /println\(\(xs :\+ 5/) },
          { say: 'The same chain, **strict** and then on a **view**. A `ListBuffer` records which steps ran.', lines: G.span(COL, /val seen = ListBuffer/, /println\(s"view:/) }
        ],
        note: 'A `for` comprehension at the end is another way to write map, filter and flatMap.'
      }),

      B.term({
        id: 'm3-out', t: 1, src: 'rec', title: 'What Collections.scala printed',
        say: 'The output, line by line. Look for the two lines about `BEANS-250`.',
        lines: function () { return G.plain(X('coll.collections')); },
        after: '`groupMapReduce` gave **BEANS-250 = 7**: two lines of 2 and 5. `toMap` gave **BEANS-250 = 5**: the first line was **dropped without a word**. `stock("TEA")` threw `' + K.missing_key_line.replace('stock("TEA"): ', '') + '`, `get` gave `None`, and `head` of an empty list threw `' + K.head_line.replace('head: ', '') + '`. The total of the sales was **' + n(K.total_cents) + ' cents**. All of this is silent until it is wrong.',
        afterKind: 'warn',
        doneSay: 'toMap keeps the last duplicate.'
      }),

      B.flow({
        id: 'm3-flow', t: 1, src: 'rec', title: 'A list is strict, a view is lazy', g: 'lazy', legend: true,
        steps: [
          { say: 'Four numbers go through a `map` and a `filter`, and we want the first match. Press Next.', focus: ['src', 'map', 'fil', 'head'], cap: 'A list, two steps, a head.' },
          { say: 'Step 1. With a **`List`**, `map` runs on **every** number first. Four maps, and a list of four results.', on: ['e1', 'e2'], focus: ['src', 'map'], tags: ['tg_strict'], cap: 'A list does every map first.' },
          { say: 'Step 2. Then `filter` runs on every result. In all that was **' + K.strict_steps + ' steps** to find `20`, the second element.', on: ['e3'], focus: ['fil', 'head'], cap: 'Then every filter.' },
          { say: 'Step 3. With a **`view`**, one number goes through both steps at a time: `' + K.lazy_trace + '`. It stopped at the first match after **' + K.lazy_steps + ' steps**.', on: ['e4'], focus: ['fil', 'cnt'], tags: ['tg_view'], cap: 'A view stops when it has enough.' }
        ]
      }),

      B.cmp({
        id: 'm3-which', t: 1, src: 'docs', title: 'Which collection',
        say: 'Four collections come up in every review. Press Next to read when to use each one.',
        cols: ['Collection', 'Good for', 'Watch out for'],
        hl: 1,
        rows: [
          ['`List`', 'Small sequences that you walk from the front, and pattern matching', 'Indexing and appending to the end are slow for a long list'],
          ['`Vector`', 'Long sequences with index access and updates', 'Slightly more memory than a list for tiny ones'],
          ['`Iterator`', 'One pass over data that is too big to hold, such as the lines of a file', 'It is **used up** by one pass: a second pass sees nothing'],
          ['a `view`, or `LazyList`', 'A chain where you want the first few results only', 'A view **recomputes** each time that you walk it']
        ],
        steps: [
          { upto: 2, say: 'The first two hold their data in memory. `List` is the default, and `Vector` is the one for a long list that you index.' },
          { upto: 4, say: 'The last two **compute as you go**. They save memory and work, and they surprise you if you walk them twice.' }
        ]
      }),

      B.bug({
        id: 'm3-bug', t: 1, q: 'A job adds the quantity of every SKU. BEANS-250 has two lines, 2 and 5, and the report says 5. Click the line that loses the other one.',
        file: 'Qty.scala', lang: 'scala',
        code: 'case class Line(sku: String, qty: Int)\nval lines = List(Line("BEANS-250", 2), Line("BEANS-250", 5))\nval qty = lines.map(l => l.sku -> l.qty).toMap\nprintln(qty("BEANS-250"))\n',
        bad: [3],
        hint: 'What does a Map do with two pairs that have the same key?',
        why: '`toMap` keeps **one value for each key**, and the last pair wins, so the first line was dropped without a word. In the recording `toMap` gave `BEANS-250 -> 5` and `groupMapReduce` gave `BEANS-250 -> 7`. Add the group up with `groupMapReduce`.',
        fix: 'case class Line(sku: String, qty: Int)\nval lines = List(Line("BEANS-250", 2), Line("BEANS-250", 5))\nval qty = lines.groupMapReduce(_.sku)(_.qty)(_ + _)\nprintln(qty("BEANS-250"))\n',
        cheer: 'Group, then add up.'
      }),

      B.bug({
        id: 'm3-bug2', t: 1, q: 'A lookup of the stock of an item that is not in the map stops the job. Click the line that throws.',
        file: 'Stock.scala', lang: 'scala',
        code: 'val stock = Map("MUG" -> 1)\nval tea = stock("TEA")\nprintln(tea)\n',
        bad: [2],
        hint: 'What does apply do when the key is missing?',
        why: '`stock("TEA")` is `apply`, and it **throws** when the key is missing: the recording printed `' + K.missing_key_line.replace('stock("TEA"): ', '') + '`. `get` returns an `Option` and `getOrElse` returns a default. Choose the one that says what a missing key means for your job.',
        fix: 'val stock = Map("MUG" -> 1)\nval tea = stock.getOrElse("TEA", 0)\nprintln(tea)\n',
        cheer: 'Say what missing means.'
      }),

      B.bug({
        id: 'm3-bug3', t: 2, src: 'docs', q: 'A job counts the lines of an iterator, and then prints them, and prints nothing. Click the line that uses the iterator up.',
        file: 'Twice.scala', lang: 'scala',
        code: 'val it = List("a", "b", "c").iterator\nval count = it.size\nprintln(s"$count lines")\nit.foreach(println)\n',
        bad: [2],
        hint: 'What does size have to do to an iterator?',
        why: 'An `Iterator` is **used up** by one pass. `it.size` walked all of it, so `foreach` found nothing left. Keep the lines in a `List` if you need two passes, or count while you walk. This is from documentation, and the check script of the course ran it.',
        fix: 'val lines = List("a", "b", "c")\nval count = lines.size\nprintln(s"$count lines")\nlines.foreach(println)\n',
        cheer: 'One pass per iterator.'
      }),

      B.quiz({
        id: 'm3-q1', t: 1,
        q: 'The same two lines are `Line("BEANS-250", 2)` and `Line("BEANS-250", 5)`. What does `toMap` of their pairs hold for BEANS-250?',
        opts: [
          { t: '5, the last one', fb: '' },
          { t: '7, the sum', fb: 'That is what `groupMapReduce` gave.' },
          { t: '2, the first one', fb: 'A later pair replaces an earlier one.' },
          { t: 'An error is thrown', fb: 'It does not throw, and that is the danger.' }
        ],
        ok: 0, why: 'The recording printed `' + K.duplicate_key_line + '` for `toMap`, and `' + CL[1] + '` for `groupMapReduce`.'
      }),

      B.quiz({
        id: 'm3-q2', t: 1,
        q: 'A chain of `map` and `filter` on a `List` looks for the first match. How many steps does it take for `List(1, 2, 3, 4)`, and how many on a view?',
        opts: [
          { t: n(K.strict_steps) + ' on the list, and ' + n(K.lazy_steps) + ' on the view', fb: '' },
          { t: 'The same on both', fb: 'A view stops at the first match.' },
          { t: '4 on the list, and 8 on the view', fb: 'It is the other way round.' },
          { t: '1 on both', fb: 'Each needs at least a map and a filter for the first match.' }
        ],
        ok: 0, why: 'The recording counted `' + K.strict_steps + '` steps for the list and `' + K.lazy_steps + '` for the view: `' + K.lazy_trace + '`.'
      }),

      B.quiz({
        id: 'm3-q3', t: 1,
        q: 'What does `xs :+ 5` do to the list `xs`?',
        opts: [
          { t: 'Nothing: it returns a new list, and `xs` is as it was', fb: '' },
          { t: 'Adds 5 to `xs`', fb: 'A `List` is immutable.' },
          { t: 'Throws, because a List cannot grow', fb: 'It returns a new list.' },
          { t: 'Adds 5 at the front', fb: '`:+` appends at the end. `+:` puts at the front.' }
        ],
        ok: 0, why: 'The program printed `' + CL[9] + '`: the new list and the old one.'
      }),

      B.quiz({
        id: 'm3-q4', t: 2, src: 'docs',
        q: 'A job reads a file of 50 million lines and adds up one column. Which is the best way to hold the lines?',
        opts: [
          { t: 'An `Iterator` over the lines: one pass, and a running total', fb: '' },
          { t: '`readLines` into a `List`', fb: 'All the lines are in memory at the same time.' },
          { t: 'A `Vector` of the lines', fb: 'It is the same problem with a faster index.' },
          { t: 'A `Map` with a key for each line', fb: 'It uses even more memory.' }
        ],
        ok: 0, why: 'The same lesson as the memory mission of the Java course: do not hold what you can walk once. This is from documentation, and the Scala version was not run on a big file.'
      }),

      B.order({
        id: 'm3-ord', t: 1, q: 'Put the steps in order to total the quantity of each SKU from a list of lines.',
        items: ['Start from the `List` of lines', 'Group the lines by SKU', 'Map each line to its quantity', 'Add the quantities of each group', 'Check the result against a SKU that has two lines'],
        why: '`groupMapReduce` does the middle three in one call. The last step is the one that catches `toMap`: a SKU with two lines.'
      }),

      B.decide({
        id: 'm3-dec', t: 2, src: 'docs', title: 'Decision: how should a loader hold a million lines?',
        scenario: 'A loader reads a file of a million sales lines, validates each one and writes totals by SKU. The file may grow ten times.',
        opts: [
          { t: 'An `Iterator` over the lines, folding into a running `Map` of totals', d: 'Memory stays flat, whatever the size of the file.', lose: 'One pass only: a second use of the lines needs the file to be read again.' },
          { t: 'A `List` of all the lines, then `groupMapReduce`', d: 'The shortest code, and easy to test.', lose: 'The whole file is in memory, as in the memory mission of the Java course.' },
          { t: 'Load the lines into Spark', d: 'Scales with a cluster.', lose: 'A cluster for something that one machine can walk once.' }
        ],
        pick: 0,
        why: 'A fold over an iterator keeps **one line and one map of totals** in memory. The coding round of the boss mission uses this shape. The options are from documentation.',
        when: 'For a file that fits easily in memory and is read twice, a `List` is simpler, and the difference does not matter.'
      }),

      B.incident({
        id: 'm3-inc', t: 2, src: 'rec', title: 'Incident: the report is short of beans', time: '09:20',
        alert: '**The store says that it sold 7 bags of BEANS-250 and the report shows 5.** The loader builds a map of quantities by SKU from the lines of the day. Nothing failed, and the totals of other SKUs are right.',
        clues: ['The loader uses `toMap` on `sku -> qty` pairs', 'BEANS-250 has two lines on the day', 'SKUs with one line are right'],
        opts: [
          { t: 'Group the lines and add the quantities (`groupMapReduce`), and test a SKU that has two lines', fb: '' },
          { t: 'Add 2 to BEANS-250 by hand', fb: 'The next SKU with two lines is wrong in the same way.' },
          { t: 'Sort the lines so that the largest comes last', fb: 'It hides the error for some data and not for other data.' },
          { t: 'Use a `mutable.Map` instead', fb: 'It overwrites the same way when you assign.' }
        ],
        best: 0,
        why: 'The recording shows both: `toMap` gave `BEANS-250 -> 5` and `groupMapReduce` gave `BEANS-250 -> 7`. `toMap` keeps the last value for a key and says nothing.',
        checks: [
          ['Compare with the source', 'The lines of BEANS-250 add up to 7.'],
          ['Read the loader', 'It builds the map with toMap.'],
          ['Find the cause', 'A key that occurs twice keeps only the last value.'],
          ['Fix and test', 'groupMapReduce, and a test with a repeated SKU.']
        ],
        tell: 'The loader turned pairs into a map with `toMap`, which keeps one value for each key, so a SKU with two lines lost one of them. I changed it to group the lines and add the quantities, and added a test with a SKU that has two lines.',
        prevent: ['Never use `toMap` on data that may repeat a key', 'Test with a **repeated key**', 'Compare totals with the source']
      }),

      B.qa({
        id: 'qa-collections', t: 1, tag: 'Scala', secs: 60,
        q: 'How do Scala collections differ from Java collections, and what do you use for a pipeline?',
        pts: ['Immutable by default', 'map, filter, flatMap, fold', 'List, Vector, Set, Map', 'Iterator for one pass'],
        short: 'Scala collections are **immutable by default**: `xs :+ 5` made a new list and `xs` stayed as it was in my run. They come with a rich set of operations (`map`, `filter`, `flatMap`, `groupMapReduce`, `foldLeft`) so that a pipeline is a short chain. I use a `List` for small data and pattern matching, a `Vector` for a long indexed sequence, a `Set` or `Map` for lookups, and an **`Iterator`** for a pass over data that is too big to hold. For Spark the same style carries over, but the data is a `Dataset` and not a local collection.',
        fu: [['mutable or immutable?', 'Immutable unless I need a local buffer. A mutable collection is never shared between tasks.'], ['`Seq` in a signature?', 'In 2.13 it means `immutable.Seq`. In 2.12 it meant `collection.Seq`, which is the binary change of mission 1.']],
        trap: 'A mutable collection that tasks share.',
        real: 'Describe a pipeline that you wrote with collections.'
      }),

      B.qa({
        id: 'qa-lazy', t: 1, tag: 'Scala', secs: 60,
        q: 'What is the difference between a List and a view, or an Iterator?',
        pts: ['A List is strict', 'A view or Iterator computes as you go', 'It stops at the first match', 'Used up, or recomputed'],
        short: 'A `List` is **strict**: `map` runs on every element at once. A **view** or an `Iterator` is **lazy**: one element goes through the whole chain at a time. For the first match of `map` then `filter` over four numbers, the list ran **' + K.strict_steps + ' steps** and the view ran **' + K.lazy_steps + '** (`' + K.lazy_trace + '`), because the view stopped at the first match. Laziness saves memory and work, and it has two traps: an iterator is **used up** by one pass, so a second pass sees nothing, and a view **recomputes** each time that you walk it. For repeated use I make a list.',
        fu: [['What is a `LazyList`?', 'A lazy list that remembers the elements that it has computed.'], ['Is a Spark Dataset lazy?', 'Yes: transformations build a plan and an action runs it.']],
        trap: 'Walking an iterator twice.',
        real: 'Describe a bug that came from a lazy collection.'
      }),

      B.qa({
        id: 'qa-mappitfalls', t: 1, tag: 'Scala', secs: 60,
        q: 'What are the traps of Map in Scala?',
        pts: ['toMap keeps the last duplicate', 'apply throws on a missing key', 'get or getOrElse', 'Do not rely on order'],
        short: 'Three traps. `toMap` on pairs with the same key keeps **the last one** and says nothing: my run gave `BEANS-250 -> 5` where the lines add up to 7, and `groupMapReduce` gave 7. `map("key")` is `apply` and **throws** when the key is missing: `' + K.missing_key_line.replace('stock("TEA"): ', '') + '`. I use `get`, which returns an `Option`, or `getOrElse` with a default that I chose on purpose. And the **order** of a map is not part of its contract: the same code printed `HashMap(s2 -> 7, s1 -> 8)` on Scala 2.13 and `Map(s1 -> 8, s2 -> 7)` on 2.12, so I never rely on it.',
        fu: [['How do you merge two maps?', 'A fold that adds the values of each key, or `groupMapReduce` over both lists.'], ['`mapValues`?', 'In 2.13 it returns a view, so I call `.view.mapValues(...).toMap` on purpose.']],
        trap: 'Relying on the order of a map.',
        real: 'Describe a total that was wrong because of a map.'
      }),

      B.qa({
        id: 'qa-fold', t: 2, tag: 'Scala', secs: 60,
        q: 'What is foldLeft, and when do you use it instead of map and sum?',
        pts: ['A running state through a collection', 'Start value and a step', 'Several results at once', 'The shape of the coding round'],
        short: '`foldLeft(start)(step)` walks a collection from the left and carries a **running state**: in my run `lines.foldLeft(0L)((total, l) => total + l.qty * l.cents)` gave ' + n(K.total_cents) + ' cents. I use it when the state is more than one number, for example a **map of totals together with a list of errors**, which is how my coding round adds up cents by store and collects the bad lines in one pass over an iterator. For one total, `map` then `sum` reads better. A fold with a `var` inside is a sign to stop and use a fold with a state.',
        fu: [['`foldLeft` or `reduce`?', '`reduce` has no start value and fails on an empty collection. `foldLeft` has a start value.'], ['Is it safe on a big iterator?', 'Yes, it keeps only the state.']],
        trap: 'A var inside a loop where a fold would do.',
        real: 'Describe a fold that you wrote.'
      }),

      B.recap({
        id: 'm3-recap', n: 3, badge: 'Collector', color: '#F87171',
        pts: [
          '`groupMapReduce` gave **BEANS-250 = 7**. `toMap` kept the last duplicate and gave **5**, without a word.',
          '`stock("TEA")` throws: **' + K.missing_key_line.replace('stock("TEA"): ', '') + '**. Use `get` or `getOrElse`.',
          'A strict list ran **' + K.strict_steps + '** steps to the first match, and a view ran **' + K.lazy_steps + '**.',
          'An iterator is **used up** by one pass, and a view recomputes. Make a list for repeated use.',
          'Never rely on the **order** of a map.'
        ],
        lines: [
          'I test a repeated key.',
          'I choose get or getOrElse on purpose.',
          'I walk an iterator once.'
        ]
      })
    ]
  });
})();
