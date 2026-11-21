/* Diagram specs for the Scala course. Plain data: nodes, edges, tags. shared/js/graph.js draws them. */
(function () {
  var LAB = (window.LAB = window.LAB || {});
  var S = (LAB.graphs = {});

  /* 1. From source to a running program */
  S.compile = {
    w: 1000, h: 400,
    label: 'A .scala file is compiled by scalac into bytecode, in .class files. The JVM runs the classes, and it also needs the Scala library on its classpath, because every Scala program calls it. A type error stops the build at the compiler.',
    nodes: [
      { id: 'src', x: 0, y: 150, w: 170, h: 90, t: 'Source', s: '.scala files', c: 'src' },
      { id: 'scalac', x: 215, y: 150, w: 170, h: 90, t: 'scalac', s: 'types are checked', c: 'stg' },
      { id: 'cls', x: 430, y: 150, w: 190, h: 90, t: 'Bytecode', s: '.class files', c: 'raw' },
      { id: 'jvm', x: 665, y: 150, w: 170, h: 90, t: 'JVM', s: 'loads and runs', c: 'ing' },
      { id: 'lib', x: 665, y: 300, w: 215, h: 80, t: 'scala-library.jar', s: 'List, Option, println', c: 'mart' }
    ],
    edges: [
      { id: 'e1', a: 'src', b: 'scalac', d: 'M170 195 H215', n: 1, nb: true },
      { id: 'e2', a: 'scalac', b: 'cls', d: 'M385 195 H430', n: 2, nb: true },
      { id: 'e3', a: 'cls', b: 'jvm', d: 'M620 195 H665', n: 3, nb: true },
      { id: 'e4', a: 'lib', b: 'jvm', d: 'M750 300 V240', n: 4, nb: true }
    ],
    tags: [
      { id: 'tg_err', x: 150, y: 70, t: 'a type error stops here', c: 'stg' },
      { id: 'tg_cp', x: 400, y: 70, t: 'the classpath is read here', c: 'raw' },
      { id: 'tg_lib', x: 270, y: 330, t: 'without it: NoClassDefFoundError', c: 'mart' }
    ]
  };

  /* 2. Two Scala versions in one program */
  S.versions = {
    w: 1000, h: 400,
    label: 'A library compiled with Scala 2.12 and an application compiled with Scala 2.13 can meet in one JVM. The 2.13 compiler reads the library without a word, and the program fails at run time when a method has another signature in the two versions.',
    nodes: [
      { id: 'lib', x: 0, y: 150, w: 200, h: 90, t: 'Library', s: 'compiled with 2.12', c: 'raw' },
      { id: 'app', x: 240, y: 150, w: 200, h: 90, t: 'Application', s: 'compiled with 2.13', c: 'stg' },
      { id: 'run', x: 480, y: 150, w: 190, h: 90, t: 'JVM', s: 'scala-library 2.13', c: 'ing' },
      { id: 'ok', x: 740, y: 40, w: 250, h: 80, t: 'Same version', s: 'prints the map', c: 'mart' },
      { id: 'bad', x: 740, y: 270, w: 250, h: 90, t: 'NoSuchMethodError', s: 'the signature changed', c: 'mon' }
    ],
    edges: [
      { id: 'e1', a: 'lib', b: 'app', d: 'M200 195 H240', n: 1, nb: true },
      { id: 'e2', a: 'app', b: 'run', d: 'M440 195 H480', n: 2, nb: true },
      { id: 'e3', a: 'run', b: 'ok', d: 'M670 175 C705 175 705 80 740 80', n: 3, bx: 705, by: 130 },
      { id: 'e4', a: 'run', b: 'bad', d: 'M670 215 C705 215 705 315 740 315', n: 4, bx: 705, by: 265 }
    ],
    tags: [
      { id: 'tg_same', x: 240, y: 70, t: 'the compiler said nothing', c: 'stg' },
      { id: 'tg_suffix', x: 120, y: 290, t: '_2.13 or _2.12 in the artifact name', c: 'raw' }
    ]
  };

  /* 3. Strict and lazy collections */
  S.lazy = {
    w: 1000, h: 400,
    label: 'A list of four numbers goes through a map and a filter, and the first match is wanted. A strict list maps every number, then filters every result. A view takes one number through both steps at a time, and stops at the first match.',
    nodes: [
      { id: 'src', x: 0, y: 150, w: 160, h: 90, t: 'List', s: '1, 2, 3, 4', c: 'src' },
      { id: 'map', x: 215, y: 150, w: 170, h: 90, t: 'map', s: 'times ten', c: 'stg' },
      { id: 'fil', x: 440, y: 150, w: 190, h: 90, t: 'filter', s: 'keep multiples of 20', c: 'ing' },
      { id: 'head', x: 685, y: 150, w: 170, h: 90, t: 'head', s: 'the first one', c: 'mart' },
      { id: 'cnt', x: 440, y: 300, w: 300, h: 80, t: 'steps that ran', s: 'strict 8, view 4', c: 'mon' }
    ],
    edges: [
      { id: 'e1', a: 'src', b: 'map', d: 'M160 195 H215', n: 1, nb: true },
      { id: 'e2', a: 'map', b: 'fil', d: 'M385 195 H440', n: 2, nb: true },
      { id: 'e3', a: 'fil', b: 'head', d: 'M630 195 H685', n: 3, nb: true },
      { id: 'e4', a: 'fil', b: 'cnt', d: 'M535 240 V300', n: 4, nb: true }
    ],
    tags: [
      { id: 'tg_strict', x: 190, y: 70, t: 'a list does every map first', c: 'stg' },
      { id: 'tg_view', x: 470, y: 70, t: 'a view stops at the first match', c: 'ing' }
    ]
  };

  /* 4. A closure that is sent to the executors */
  S.spark = {
    w: 1000, h: 400,
    label: 'Your function runs on the executors, so Spark writes it to bytes and sends it. Everything that the function uses goes with it. An object that is not serializable stops the job with Task not serializable. Copy the value that you need into a local val first.',
    nodes: [
      { id: 'code', x: 0, y: 150, w: 225, h: 90, t: 'Your lambda', s: 'uses settings.minCents', c: 'src' },
      { id: 'ser', x: 270, y: 150, w: 260, h: 90, t: 'Serialize', s: 'function and what it uses', c: 'stg' },
      { id: 'send', x: 575, y: 150, w: 170, h: 90, t: 'Send', s: 'to the executors', c: 'raw' },
      { id: 'exec', x: 790, y: 150, w: 200, h: 90, t: 'Executors', s: 'run the tasks', c: 'ing' },
      { id: 'fail', x: 270, y: 300, w: 260, h: 80, t: 'Task not serializable', s: 'Settings is not Serializable', c: 'mon' }
    ],
    edges: [
      { id: 'e1', a: 'code', b: 'ser', d: 'M225 195 H270', n: 1, nb: true },
      { id: 'e2', a: 'ser', b: 'send', d: 'M530 195 H575', n: 2, nb: true },
      { id: 'e3', a: 'send', b: 'exec', d: 'M745 195 H790', n: 3, nb: true },
      { id: 'e4', a: 'ser', b: 'fail', d: 'M400 240 V300', n: 4, nb: true }
    ],
    tags: [
      { id: 'tg_copy', x: 20, y: 70, t: 'copy the number into a local val', c: 'ing' },
      { id: 'tg_whole', x: 500, y: 70, t: 'the whole object goes along', c: 'stg' }
    ]
  };
})();
