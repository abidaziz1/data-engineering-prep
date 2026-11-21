/* Mission 4: files and memory. A file of a million lines against a small heap: readAllLines runs out, a stream and a BufferedReader do not. All of it ran on the real JDK 21. */
(function () {
  var B = LAB.b, G = LAB.get;
  var C = G.counts, X = G.text, n = G.n;
  var M = C('mem'), GC = C('tool.gc'), MEM = G.file('Memory.java');
  G.expect(M.oom_exit === 1 && M.oom_message === 'java.lang.OutOfMemoryError: Java heap space' && M.stream_exit === 0 && M.stream_output === '1000001 lines counted from a stream' && M.sum_exit === 0 && M.sum_output === M.sum_expected && M.all_2g_output === '1000001 lines read into a list' && M.max_heap_64 === 'max heap: 64 MB' && M.max_heap_32 === 'max heap: 32 MB', 'a list of a million lines does not fit 64 MB, a stream does, and a 32 MB heap sums the file');
  G.expect(GC.g1_is_default === true && GC.max_heap_mb > 1000, 'this machine uses G1 and a heap of more than a gigabyte by default');

  LAB.addChapter({
    id: 'm4', n: 4, title: 'Files and memory', short: 'Memory', blurb: 'Read a file that is bigger than the heap, and read an OutOfMemoryError', minutes: 22,
    focus: ['air'],
    goals: [
      'Say what the **heap**, `-Xmx` and the **garbage collector** are.',
      'Read an **`OutOfMemoryError: Java heap space`**, and name what caused it.',
      'Read a big file with a **stream** or a **BufferedReader** so that memory stays small.',
      'Tell a **heap** error from a **container** that was killed.'
    ],
    say: 'The most common failure of a Java data job is not a bug in the logic. It is a heap that was too small for what the code held at once. I made a file of a million orders and read it four ways with the real JVM. Everything on these screens is a line that java printed.',
    scenes: [
      B.flow({
        id: 'm4-flow', t: 1, src: 'rec', title: 'Where an object lives', g: 'jvm', legend: true,
        steps: [
          { say: 'A running program has code, and it has objects. Press Next.', focus: ['jvm', 'heap'], cap: 'The JVM and its heap.' },
          { say: 'Step 1. Every object that you create with `new`, every `String` and every element of a list, lives on the **heap**. Local numbers and the calls of methods live on the **stack**, which is small.', on: ['e4'], focus: ['jvm', 'heap'], cap: 'Objects live on the heap.' },
          { say: 'Step 2. The heap has a **limit**, set with **`-Xmx`**. On this machine the default was **' + n(GC.max_heap_mb) + ' MB**, chosen from the memory that the JVM sees. A program that needs more stops with `OutOfMemoryError`.', on: ['e4'], focus: ['heap'], tags: ['tg_xmx'], cap: 'The limit is -Xmx.' },
          { say: 'Step 3. The **garbage collector** frees the objects that nothing refers to any more. On this machine it is **' + (GC.g1_is_default ? 'G1' : 'another collector') + '**. It cannot free what your code still holds, such as a list with a million lines in it.', on: ['e4'], focus: ['jvm', 'heap'], cap: 'The collector frees what nobody holds.' }
        ]
      }),

      B.code({
        id: 'm4-code', t: 1, src: 'rec', title: 'Memory.java: three ways to read a file', file: 'Memory.java', lang: 'java', code: MEM,
        steps: [
          { say: 'One program with three modes, and the heap is set on the command line. Press Next.', lines: null },
          { say: 'It starts by printing **the heap limit** that the JVM is running with.', lines: G.span(MEM, /Runtime\.getRuntime\(\)\.maxMemory/) },
          { say: 'Mode `all`: `Files.readAllLines` reads **every line into a `List`**. All of it is in memory at the same time.', lines: G.span(MEM, /case "all"/, /^            }$/) },
          { say: 'Mode `stream`: `Files.lines` gives a **`Stream`** of lines that is read as it is consumed. `count()` looks at one line at a time. The `try` closes the file.', lines: G.span(MEM, /case "stream"/, /^            }$/) },
          { say: 'Mode `sum`: a `BufferedReader` reads one line, parses the amount into cents, adds it, and forgets the line. Only the running total is kept.', lines: G.span(MEM, /case "sum"/, /^            }$/) }
        ],
        note: 'The file has a million orders and a header, about ' + n(M.file_mb) + ' MB, made from a fixed rule. The expected total was worked out in Python from the same rule.'
      }),

      B.term({
        id: 'm4-oom', t: 1, src: 'rec', title: 'readAllLines against a heap of 64 MB',
        say: 'The file is ' + n(M.file_mb) + ' MB. I gave the JVM a heap of 64 MB and asked it to read all the lines into a list.',
        lines: function () { return G.plain(X('mem.oom')); },
        after: 'The JVM stopped with **`' + M.oom_message + '`** (exit code ' + M.oom_exit + '). A file of ' + n(M.file_mb) + ' MB did not fit a heap of 64 MB as a **list of strings**: each line is an object with its own overhead, so the list is larger than the file. The error is not a bug in a line of code. It says that **the program holds more than the heap can**.',
        afterKind: 'warn',
        doneSay: 'OutOfMemoryError: the program holds more than the heap.'
      }),

      B.term({
        id: 'm4-stream', t: 1, src: 'rec', title: 'The same file, read as a stream',
        say: 'The same file, the same 64 MB, and then a real job on a heap of only 32 MB. Then the first call again with a heap of 2 GB.',
        lines: function () { return G.plain(X('mem.stream')); },
        after: 'The stream counted **' + n(1000001) + '** lines with a heap of 64 MB, and the `BufferedReader` **parsed every amount and added them up** with a heap of 32 MB: `' + M.sum_output + '`, which equals the total that Python worked out. The call that failed worked with 2 GB. That is not a fix: **the next file will be bigger**, and a job that holds all the lines needs a heap that grows with the data.',
        afterKind: 'tip',
        doneSay: 'Read a line, use it, forget it.'
      }),

      B.widget({ id: 'm4-lab', kind: 'heaplab', t: 1, src: 'rec', title: 'Lab: four ways to read a file' }),

      B.cmp({
        id: 'm4-ways', t: 1, src: 'rec', title: 'Ways to read a file in Java',
        say: 'Four ways come up. The recording shows what each one holds in memory. Press Next.',
        cols: ['Way', 'What it holds in memory', 'In the recording'],
        hl: 1,
        rows: [
          ['`Files.readAllLines(path)`', 'Every line, in a list', 'Failed with a 64 MB heap, worked with 2 GB'],
          ['`Files.lines(path)`', 'One line at a time, in a stream that you must close', 'Counted all lines with 64 MB'],
          ['`BufferedReader.readLine()`', 'One line at a time, in a loop', 'Parsed and summed all lines with 32 MB'],
          ['A library reader (commons-csv, Jackson)', 'One record at a time, if you iterate', 'Not run on the big file. The loader of mission 1 used commons-csv on 50 rows']
        ],
        steps: [
          { upto: 1, say: '`readAllLines` is for **small files**. It is the shortest to write and the first to fail when the data grows.' },
          { upto: 3, say: 'A stream and a `BufferedReader` keep **memory flat**: the size of the file does not matter. Choose the one that reads best, and close it.' },
          { upto: 4, say: 'A CSV or JSON library also reads **record by record** if you iterate and do not collect. Check that it does not read the whole file first.' }
        ]
      }),

      B.bug({
        id: 'm4-bug', t: 1, q: 'A nightly job sums the amounts of a file. It worked on Monday with 50,000 lines and dies on Friday with OutOfMemoryError. Click the line that holds the whole file.',
        file: 'Sum.java', lang: 'java',
        code: 'Path path = Path.of(args[0]);\nList<String> lines = Files.readAllLines(path);\nlong cents = 0;\nfor (String line : lines.subList(1, lines.size())) {\n    cents += new BigDecimal(line.split(",")[5]).movePointRight(2).longValueExact();\n}\n',
        bad: [2],
        hint: 'How many lines are in memory at the same time?',
        why: '`Files.readAllLines` puts **every line in a list**. The recording: a file of ' + n(M.file_mb) + ' MB did not fit a heap of 64 MB (`' + M.oom_message + '`). Read it **line by line** with a `BufferedReader` or `Files.lines`, and keep only the running total. The same job then ran in a heap of 32 MB.',
        fix: 'Path path = Path.of(args[0]);\nlong cents = 0;\ntry (BufferedReader in = Files.newBufferedReader(path)) {\n    in.readLine();\n    for (String line = in.readLine(); line != null; line = in.readLine()) {\n        cents += new BigDecimal(line.split(",")[5]).movePointRight(2).longValueExact();\n    }\n}\n',
        cheer: 'Do not hold the whole file.'
      }),

      B.bug({
        id: 'm4-bug2', t: 1, q: 'A job counts the lines of many files with Files.lines. After a few thousand files it fails with "Too many open files". Click the line that causes it.',
        file: 'Count.java', lang: 'java',
        code: 'long total = 0;\nfor (Path file : files) {\n    total += Files.lines(file).count();\n}\n',
        bad: [3],
        hint: 'Who closes the file that Files.lines opened?',
        why: '`Files.lines` **opens the file** and returns a stream that holds it open until the stream is closed. A `count()` does not close it. The operating system limits the number of open files, and the job runs out. Use **try-with-resources**, as `Memory.java` does, so that the stream is closed even when an error is thrown. The check script of the course counted the open files: 20 files stayed open after 20 `count()` calls, and none with try-with-resources. I did not run it up to the limit of the operating system.',
        fix: 'long total = 0;\nfor (Path file : files) {\n    try (Stream<String> lines = Files.lines(file)) {\n        total += lines.count();\n    }\n}\n',
        cheer: 'Close what you open.'
      }),

      B.talk({
        id: 'm4-heap', t: 2, src: 'docs', title: 'The heap, the collector and the other limits',
        say: 'Four facts about memory that interviewers like. Press Next for each.',
        items: [
          ['-Xmx and -Xms', '`-Xmx` is the largest size of the heap, and `-Xms` is the size that it starts with. By default the JVM chooses a maximum from the memory that it sees: **' + n(GC.max_heap_mb) + ' MB** on this machine. In a container it is the **container limit** that counts, which is why you set `-Xmx` or a percentage of the container.', 'Set the maximum on purpose.'],
          ['Garbage collection', 'Most objects die young, so the collector works on a young part of the heap more often than on the old part. **G1** is the default collector on a machine with enough memory and cores, and it was the one in the recording. Other collectors exist (ZGC, Parallel, Serial) and did not run here.', 'The collector frees only what nothing holds.'],
          ['Not every limit is the heap', 'An `OutOfMemoryError` can also come from **metaspace** (class metadata), from **direct buffers**, or from too many threads, and the message says which one. The process can use **more than the heap**, so a container limit can be hit while the heap is fine.', 'Read the message after the colon.'],
          ['Evidence', 'Run with `-XX:+HeapDumpOnOutOfMemoryError` and the JVM writes a **heap dump** when it fails, which a tool can open to see what held the memory. Print GC activity with `-Xlog:gc`. I did not run these, and they are from documentation.', 'Keep a heap dump of the failure.']
        ],
        cols: 1
      }),

      B.quiz({
        id: 'm4-q1', t: 1,
        q: 'A job fails with `java.lang.OutOfMemoryError: Java heap space`. What does it say?',
        opts: [
          { t: 'The program holds more objects than the heap limit allows', fb: '' },
          { t: 'The disk is full', fb: 'That is an IOException about space.' },
          { t: 'The JVM is too old', fb: 'That gives a version error.' },
          { t: 'A thread died', fb: 'That is a different message.' }
        ],
        ok: 0, why: 'In the recording a heap of 64 MB could not hold a list of the lines of a file of ' + n(M.file_mb) + ' MB. The fix is to hold less, and more heap only delays it.'
      }),

      B.quiz({
        id: 'm4-q2', t: 1,
        q: 'Which of these reads a file of any size with a small heap?',
        opts: [
          { t: 'A `BufferedReader` in a loop that keeps only a running total', fb: '' },
          { t: '`Files.readAllLines`', fb: 'It keeps every line in a list.' },
          { t: 'Reading the file into one `String`', fb: 'It needs the whole file in memory.' },
          { t: 'A `List` of the lines, sorted', fb: 'The list holds all the lines.' }
        ],
        ok: 0, why: 'In the recording a heap of 32 MB parsed all the amounts of the file and printed `' + M.sum_output + '`.'
      }),

      B.quiz({
        id: 'm4-q3', t: 1,
        q: 'A job reads a big file with `Files.lines` and a heap of 64 MB, and counts the lines. What happens in the recording?',
        opts: [
          { t: 'It counts ' + n(1000001) + ' lines, because the stream reads one line at a time', fb: '' },
          { t: 'OutOfMemoryError, like readAllLines', fb: 'A stream does not collect the lines.' },
          { t: 'It reads only the first line', fb: 'count() reads them all.' },
          { t: 'It needs a heap of 2 GB', fb: 'The recording used 64 MB.' }
        ],
        ok: 0, why: 'The output was `' + M.stream_output + '` with `' + M.max_heap_64 + '`.'
      }),

      B.quiz({
        id: 'm4-q4', t: 2, src: 'docs',
        q: 'A container is killed by the platform, and the Java heap was only half full. What is the likely cause?',
        opts: [
          { t: 'The process used more memory than the container limit: the heap is not all of it', fb: '' },
          { t: 'The garbage collector crashed', fb: 'A crash would show in the log.' },
          { t: 'The heap was too small', fb: 'It was half full.' },
          { t: 'The network failed', fb: 'A network failure does not kill a process for memory.' }
        ],
        ok: 0, why: 'A JVM also uses memory outside the heap: metaspace, thread stacks and direct buffers. Set `-Xmx` below the container limit, with room for them. This is from documentation.'
      }),

      B.order({
        id: 'm4-ord', t: 1, q: 'Put the steps in order to find the cause of an OutOfMemoryError in a nightly job.',
        items: ['Read the message after the colon: heap space, metaspace or something else', 'Find what the job holds in memory at once: a list, a map, a whole file', 'Check the size of the input against the heap limit', 'Change the code to read in pieces, or process in batches', 'Only then consider a bigger heap, and say why'],
        why: 'Message first, then what is held, then the size of the input. A bigger heap is the last step, because it only moves the limit.'
      }),

      B.decide({
        id: 'm4-dec', t: 2, src: 'rec', title: 'Decision: the loader fails with OutOfMemoryError. What do you change?',
        scenario: 'The loader reads a daily file with `readAllLines`. It worked for a year and now fails, because the file grew from 50,000 to 1,000,000 lines. Someone says: "just give it 4 GB".',
        opts: [
          { t: 'Read the file as a stream or with a `BufferedReader`, and keep the heap small', d: 'Memory no longer depends on the size of the file. The recording: 32 MB was enough to parse and sum a million lines.', lose: 'A change of code, and a test with a big file.' },
          { t: 'Raise `-Xmx` to 4 GB', d: 'One flag. The recording: a call that failed at 64 MB worked at 2 GB.', lose: 'It works until the file is four times bigger, and the machine needs the memory for it.' },
          { t: 'Split the file into pieces before the job', d: 'Each piece is small.', lose: 'Another job to run, and the pieces have to be put together by something.' }
        ],
        pick: 0,
        why: 'The cause is that the job holds all the lines, and the recording shows a job that does not. A bigger heap is a loan that you pay back when the data grows again.',
        when: 'If a step truly needs all the data in memory, such as a sort of a million rows, size the heap for it, and say what the maximum input is.'
      }),

      B.incident({
        id: 'm4-inc', t: 2, src: 'rec', title: 'Incident: the nightly loader dies with OutOfMemoryError', time: '03:40',
        alert: '**The loader stopped at 03:05 with `java.lang.OutOfMemoryError: Java heap space`.** It runs with `-Xmx64m` on a small server. Yesterday the file had 50,000 lines. Today it has about a million.',
        clues: ['The job reads the file with `Files.readAllLines`', 'The server has plenty of free memory', 'The file grew twentyfold after a new store joined'],
        opts: [
          { t: 'Change the loader to read line by line, and test it with a file of a million lines', fb: '' },
          { t: 'Restart the job until it passes', fb: 'It fails the same way every time.' },
          { t: 'Set `-Xmx` to the full memory of the server', fb: 'It may pass tonight and leave no room for the operating system.' },
          { t: 'Skip the file and load it tomorrow', fb: 'Tomorrow it is bigger.' }
        ],
        best: 0,
        why: 'The recording of this exact case: a list of the lines of a file of ' + n(M.file_mb) + ' MB did not fit 64 MB, and a `BufferedReader` parsed the same file in 32 MB and printed the right total. The fix is to stop holding the file.',
        checks: [
          ['Read the message', 'Heap space: the heap limit was reached.'],
          ['Find what holds the memory', 'A list of all the lines.'],
          ['Compare sizes', 'A file twentyfold bigger than last month.'],
          ['Fix and test', 'Read in a loop, and test with a big file.']
        ],
        tell: 'The loader read the whole file into a list, and the file grew twentyfold, so the list no longer fits the heap. I changed it to read line by line and keep a running total, and tested it with a file of a million lines in a small heap. I will add a size check to the alerts.',
        prevent: ['**Test** with a file as big as the largest you expect', '**Stream** inputs of unknown size', 'Alert on the **size of the input** and on heap use']
      }),

      B.qa({
        id: 'qa-heap', t: 1, tag: 'Java', secs: 60,
        q: 'What are the heap and -Xmx, and what does OutOfMemoryError: Java heap space mean?',
        pts: ['The heap holds objects', '-Xmx is its maximum', 'The collector frees what nothing holds', 'The error: the program holds more than the limit'],
        short: 'The **heap** is where the JVM keeps the objects that your code creates: strings, lists, records. **`-Xmx`** sets its maximum, and by default the JVM picks one from the memory that it sees, ' + n(GC.max_heap_mb) + ' MB on my machine. The garbage collector frees the objects that nothing refers to, and it cannot free what the code still holds. `OutOfMemoryError: Java heap space` means that the program holds more than the limit: in my recording a list of the lines of a file of ' + n(M.file_mb) + ' MB did not fit a heap of 64 MB. I read the message, find what is held, and usually change the code to hold less. A bigger heap is a loan, not a fix.',
        fu: [['What is the stack?', 'Per thread, it holds the frames of method calls and local values. Too deep a recursion gives StackOverflowError.'], ['How do you see what holds memory?', 'A heap dump, from -XX:+HeapDumpOnOutOfMemoryError, opened in a tool.']],
        trap: 'Raising -Xmx first.',
        real: 'Describe an OutOfMemoryError that you fixed.'
      }),

      B.qa({
        id: 'qa-bigfile', t: 1, tag: 'Java', secs: 60,
        q: 'How do you process a file that is bigger than the memory?',
        pts: ['Never hold all the lines', 'BufferedReader loop or Files.lines', 'Keep only a running state', 'Close the file'],
        short: 'I never hold all of it. I read it **one line or one record at a time**, with a `BufferedReader` in a loop or with a `Files.lines` stream inside try-with-resources, and I keep only a running state, such as a total or a counter by key. In my test a heap of 32 MB parsed a million lines and added up the amounts in cents, and the total equalled the one that Python worked out from the same rule, while `readAllLines` failed with 64 MB. If the work needs more than a running state, such as a sort or a join, I batch it, use a database or an engine for it, or size the heap for the largest input that I expect and say what it is.',
        fu: [['What about memory-mapped files?', 'They map a file into the address space. They suit random access and are from documentation here.'], ['How do you test it?', 'With a file as big as the largest input, in a small heap.']],
        trap: 'Testing only with a small file.',
        real: 'Describe the biggest file that you processed.'
      }),

      B.qa({
        id: 'qa-gc', t: 2, tag: 'Java', secs: 60,
        q: 'How does garbage collection work, and how does it affect a data job?',
        pts: ['Frees objects that nothing refers to', 'Most objects die young', 'G1 is the default', 'Pauses and memory limits'],
        short: 'The garbage collector frees objects that nothing refers to any more, so you do not free memory yourself. It uses the observation that **most objects die young**: it works on a young region often and on the old region less often. **G1**, the default collector on a machine with enough memory, was the one in my recording. For a data job the effects are two. A collector needs room, so a heap that is nearly full spends its time collecting and slows down before it fails. And while it works it can pause the program, which matters for latency more than for a nightly batch. I would read GC activity with `-Xlog:gc` before I tune anything, and I did not run other collectors for this course.',
        fu: [['ZGC or Shenandoah?', 'Low-pause collectors. For a batch job the default is usually enough.'], ['Do you call System.gc()?', 'No. It is a hint, and the JVM knows better.']],
        trap: 'Tuning flags without reading the GC log.',
        real: 'Say what you looked at when a job was slow.'
      }),

      B.qa({
        id: 'qa-container', t: 2, tag: 'Java', secs: 60,
        q: 'A Java container is killed, but the heap was not full. Why?',
        pts: ['The process uses more than the heap', 'Metaspace, thread stacks, direct buffers', 'Container limit is for the whole process', 'Set -Xmx below the limit'],
        short: 'The container limit applies to the **whole process**, and a JVM uses memory outside the heap: **metaspace** for class data, the **stacks** of its threads, **direct buffers** and the code cache. So a process can reach the limit while the heap is half full, and the platform kills it, with no `OutOfMemoryError` in the log. I set `-Xmx` or a percentage of the container well below the limit, leave room for the rest, and count the threads. A heap error and a killed container look alike in the dashboard and are different problems: one says `OutOfMemoryError` in the log, and the other says that the container was killed. This is from documentation, and I did not run it in a container.',
        fu: [['What does MaxRAMPercentage do?', 'It sets the maximum heap as a share of the container memory.'], ['How do you check?', 'Native memory tracking, from documentation.']],
        trap: 'Setting -Xmx equal to the container limit.',
        real: 'Describe a pod that was killed.'
      }),

      B.recap({
        id: 'm4-recap', n: 4, badge: 'Memory Watcher', color: '#FDE68A',
        pts: [
          'The **heap** holds objects, and **-Xmx** is its limit. The default here was **' + n(GC.max_heap_mb) + ' MB**, with ' + (GC.g1_is_default ? 'G1' : 'another collector') + ' as the collector.',
          '`readAllLines` of a file of **' + n(M.file_mb) + ' MB** failed with a 64 MB heap: `' + M.oom_message + '`.',
          '`Files.lines` counted **' + n(1000001) + '** lines in 64 MB, and a `BufferedReader` summed the amounts in 32 MB: `' + M.sum_output + '`.',
          'More heap only moved the limit: the same call worked with 2 GB. **Hold less.**',
          'A container can be killed with the heap half full: the process uses more than the heap.'
        ],
        lines: [
          'I can read an OutOfMemoryError.',
          'I read big files in a loop.',
          'I do not set -Xmx to the container limit.'
        ]
      })
    ]
  });
})();
