/* Diagram specs for the Java course. Plain data: nodes, edges, tags. shared/js/graph.js draws them. */
(function () {
  var LAB = (window.LAB = window.LAB || {});
  var S = (LAB.graphs = {});

  /* 1. From source to a running program */
  S.jvm = {
    w: 1000, h: 400,
    label: 'A .java source file is compiled by javac into bytecode, in .class files that are often packed in a .jar. The JVM loads the classes it finds on the classpath and runs them. Objects live on the heap, and the garbage collector frees the ones that nothing refers to. The -Xmx setting is the limit of the heap.',
    nodes: [
      { id: 'src', x: 0, y: 150, w: 165, h: 90, t: 'Source', s: '.java files', c: 'src' },
      { id: 'javac', x: 215, y: 150, w: 165, h: 90, t: 'Compiler', s: 'javac', c: 'stg' },
      { id: 'cls', x: 430, y: 150, w: 180, h: 90, t: 'Bytecode', s: '.class in a .jar', c: 'raw' },
      { id: 'jvm', x: 660, y: 150, w: 165, h: 90, t: 'JVM', s: 'loads and runs', c: 'ing' },
      { id: 'heap', x: 660, y: 300, w: 165, h: 80, t: 'Heap', s: 'objects, then GC', c: 'mart' }
    ],
    edges: [
      { id: 'e1', a: 'src', b: 'javac', d: 'M170 195 H215', n: 1, nb: true },
      { id: 'e2', a: 'javac', b: 'cls', d: 'M380 195 H430', n: 2, nb: true },
      { id: 'e3', a: 'cls', b: 'jvm', d: 'M610 195 H660', n: 3, nb: true },
      { id: 'e4', a: 'jvm', b: 'heap', d: 'M742 240 V300', n: 4, nb: true }
    ],
    tags: [
      { id: 'tg_err', x: 150, y: 70, t: 'a type error stops here', c: 'stg' },
      { id: 'tg_cp', x: 420, y: 70, t: 'the classpath is read here', c: 'raw' },
      { id: 'tg_xmx', x: 310, y: 330, t: '-Xmx is the limit of the heap', c: 'mart' }
    ]
  };

  /* 2. A Maven build */
  S.maven = {
    w: 1000, h: 400,
    label: 'The pom.xml lists the libraries that a project needs. Maven resolves them from Maven Central and its local repository, and picks one version of each library. Then it compiles, runs the tests and packages a jar. A failing test stops the build, and the shade plugin can put the libraries inside the jar.',
    nodes: [
      { id: 'pom', x: 0, y: 150, w: 160, h: 90, t: 'pom.xml', s: 'what you need', c: 'src' },
      { id: 'repo', x: 215, y: 20, w: 200, h: 80, t: 'Maven Central', s: 'and ~/.m2', c: 'raw' },
      { id: 'res', x: 215, y: 150, w: 200, h: 90, t: 'Resolve', s: 'one version of each', c: 'stg' },
      { id: 'build', x: 470, y: 150, w: 200, h: 90, t: 'Build', s: 'compile, test, jar', c: 'ing' },
      { id: 'jar', x: 725, y: 150, w: 210, h: 90, t: 'Jar', s: 'thin or shaded', c: 'mart' }
    ],
    edges: [
      { id: 'e1', a: 'pom', b: 'res', d: 'M160 195 H215', n: 1, nb: true },
      { id: 'e2', a: 'repo', b: 'res', d: 'M315 100 V150', n: 2, nb: true },
      { id: 'e3', a: 'res', b: 'build', d: 'M415 195 H470', n: 3, nb: true },
      { id: 'e4', a: 'build', b: 'jar', d: 'M670 195 H725', n: 4, nb: true }
    ],
    tags: [
      { id: 'tg_near', x: 20, y: 270, t: 'the nearest declaration wins', c: 'stg' },
      { id: 'tg_test', x: 440, y: 270, t: 'a failing test stops the build', c: 'ing' },
      { id: 'tg_shade', x: 640, y: 320, t: 'shade packs the libraries in', c: 'mart' }
    ]
  };

  /* 3. A stream pipeline */
  S.streams = {
    w: 1000, h: 400,
    label: 'A stream starts from a source such as a list or the lines of a file. Intermediate steps such as filter and map describe what to do, and nothing runs until a terminal step such as collect or count asks for the result. Then the elements flow through the steps one at a time. A stream can be used once.',
    nodes: [
      { id: 'src', x: 0, y: 150, w: 170, h: 90, t: 'Source', s: 'list or file lines', c: 'src' },
      { id: 'fil', x: 230, y: 150, w: 170, h: 90, t: 'filter', s: 'keep some', c: 'stg' },
      { id: 'map', x: 460, y: 150, w: 170, h: 90, t: 'map', s: 'change each', c: 'ing' },
      { id: 'out', x: 690, y: 150, w: 200, h: 90, t: 'Terminal step', s: 'collect, count, sum', c: 'mart' }
    ],
    edges: [
      { id: 'e1', a: 'src', b: 'fil', d: 'M170 195 H230', n: 1, nb: true },
      { id: 'e2', a: 'fil', b: 'map', d: 'M400 195 H460', n: 2, nb: true },
      { id: 'e3', a: 'map', b: 'out', d: 'M630 195 H690', n: 3, nb: true }
    ],
    tags: [
      { id: 'tg_lazy', x: 240, y: 70, t: 'nothing runs yet', c: 'stg' },
      { id: 'tg_go', x: 690, y: 70, t: 'this step starts it', c: 'mart' },
      { id: 'tg_once', x: 300, y: 300, t: 'a stream is used once', c: 'mon' }
    ]
  };

  /* 4. JDBC */
  S.jdbc = {
    w: 1000, h: 400,
    label: 'Your code builds a PreparedStatement with question marks, sets the values, and sends the statement and the values to the database through the JDBC driver. A batch sends many rows in few round trips. A transaction groups statements, and ends with a commit or a rollback.',
    nodes: [
      { id: 'app', x: 0, y: 150, w: 170, h: 90, t: 'Your code', s: 'SQL with ?', c: 'src' },
      { id: 'ps', x: 215, y: 150, w: 235, h: 90, t: 'PreparedStatement', s: 'SQL and values apart', c: 'stg' },
      { id: 'drv', x: 500, y: 150, w: 210, h: 90, t: 'JDBC driver', s: 'talks to the database', c: 'raw' },
      { id: 'db', x: 760, y: 150, w: 190, h: 90, t: 'Database', s: 'runs the SQL', c: 'mart' },
      { id: 'tx', x: 760, y: 300, w: 190, h: 80, t: 'Transaction', s: 'commit or roll back', c: 'mon' }
    ],
    edges: [
      { id: 'e1', a: 'app', b: 'ps', d: 'M170 195 H215', n: 1, nb: true },
      { id: 'e2', a: 'ps', b: 'drv', d: 'M450 195 H500', n: 2, nb: true },
      { id: 'e3', a: 'drv', b: 'db', d: 'M710 195 H760', n: 3, nb: true },
      { id: 'e4', a: 'db', b: 'tx', d: 'M855 240 V300', n: 4, nb: true }
    ],
    tags: [
      { id: 'tg_param', x: 200, y: 70, t: 'a value is never SQL text', c: 'stg' },
      { id: 'tg_batch', x: 470, y: 70, t: 'a batch saves round trips', c: 'raw' },
      { id: 'tg_commit', x: 500, y: 330, t: 'one commit, or nothing', c: 'mon' }
    ]
  };

  /* 5. Threads and a shared counter */
  S.threads = {
    w: 1000, h: 400,
    label: 'Eight threads each add one to a shared counter 100,000 times. With a plain int, two threads can read the same value and write the same result, so updates are lost. With an AtomicInteger, the read, the add and the write are one step, so every update counts.',
    nodes: [
      { id: 'th', x: 0, y: 150, w: 180, h: 90, t: 'Eight threads', s: '100,000 adds each', c: 'src' },
      { id: 'plain', x: 330, y: 30, w: 200, h: 90, t: 'int counter', s: 'read, add, write', c: 'stg' },
      { id: 'atom', x: 330, y: 270, w: 200, h: 90, t: 'AtomicInteger', s: 'one atomic step', c: 'ing' },
      { id: 'lost', x: 700, y: 30, w: 200, h: 90, t: 'Short', s: 'updates were lost', c: 'mon' },
      { id: 'ok', x: 700, y: 270, w: 200, h: 90, t: '800,000', s: 'every update counted', c: 'mart' }
    ],
    edges: [
      { id: 'e1', a: 'th', b: 'plain', d: 'M180 175 C255 175 255 75 330 75', n: 1, bx: 256, by: 125 },
      { id: 'e2', a: 'th', b: 'atom', d: 'M180 215 C255 215 255 315 330 315', n: 2, bx: 256, by: 265 },
      { id: 'e3', a: 'plain', b: 'lost', d: 'M530 75 H700', n: 3, nb: true },
      { id: 'e4', a: 'atom', b: 'ok', d: 'M530 315 H700', n: 4, nb: true }
    ],
    tags: [
      { id: 'tg_race', x: 330, y: 140, t: 'two threads read the same value', c: 'stg' },
      { id: 'tg_cas', x: 330, y: 230, t: 'the JVM makes it atomic', c: 'ing' }
    ]
  };
})();
