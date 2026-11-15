/* Mission 0: pick a path, see the whole picture, and learn what the tags mean. */
(function () {
  var B = LAB.b, G = LAB.get;
  var T = G.table('model.tables'), F = G.counts('model.fanout');
  G.expect(G.meta('today') === '2026-03-31', 'the course text says that the data ends on 31 March 2026');

  LAB.addChapter({
    id: 'm0', n: 0, noIntro: true, title: 'Start here', short: 'Start', blurb: 'Pick your path and see the whole picture', minutes: 7,
    scenes: [
      B.welcome({ id: 'welcome' }),

      B.flow({
        id: 'm0-map', t: 1, src: 'docs', title: 'A click becomes a query on your tables', g: 'master', legend: true,
        steps: [
          { say: 'Brewline sells coffee online and in twelve stores. Its sales dashboard exists in three tools, because three teams each chose their own. You look after the warehouse tables behind all three. This picture is what happens when somebody opens the dashboard. Press Next.', focus: ['wh', 'dash'], cap: 'Your tables on the left, their dashboard on the right.' },
          { say: 'Step 1. A **viewer** opens the dashboard. The tool knows who they are, and that will matter in mission 7.', on: ['e1'], focus: ['user', 'dash'], cap: 'A viewer has an identity and a role.' },
          { say: 'Step 2. The dashboard has tiles. **Every tile asks one question**: revenue by region, orders today, the top products. Six tiles are six questions.', on: ['e2'], focus: ['dash', 'engine'], cap: 'One tile, one query.' },
          { say: 'Step 3. The **model** tells the engine how the tables join and what "revenue" means. This is the part people call the semantic layer. A wrong model gives a wrong number on every tile at once.', on: ['e3'], focus: ['model', 'engine'], cap: 'The model defines joins and measures.' },
          { say: 'Step 4. The engine can answer from **its own copy** of the data. Power BI calls that import, and Tableau calls it an extract. It is fast, and it is as old as the last refresh.', on: ['e4'], focus: ['engine', 'copy'], tags: ['tg_import'], cap: 'A copy answers from memory.' },
          { say: 'Step 5. Or the engine writes **SQL and sends it to your warehouse**. Power BI calls that DirectQuery, Tableau calls it a live connection, and Looker always works this way. The numbers are current, and your warehouse does the work.', on: ['e5'], focus: ['engine', 'wh'], tags: ['tg_live'], cap: 'Live means SQL on your warehouse.' },
          { say: 'Step 6. A **refresh** fills the copy from the warehouse. When it runs, how much it reloads and what it misses is mission 5.', on: ['e6'], focus: ['wh', 'copy'], tags: ['tg_refresh'], cap: 'A refresh copies rows.' },
          { say: 'That is the whole course: the model (mission 2), where the query runs (3), measures (4), refresh (5), speed (6), who sees what (7) and the model as files (8). You will not learn to design charts. You will learn what a chart needs from you.', focus: ['wh', 'copy', 'model', 'engine', 'dash', 'user'], cap: 'Eight short missions and a boss round.' }
        ]
      }),

      B.cmp({
        id: 'm0-levels', t: 1, src: 'docs', title: 'Junior or senior: what changes',
        say: 'A data engineer is not hired to build dashboards. They are asked about BI tools because their tables end up in one. Press Next to read what is expected at each level.',
        cols: ['Area', 'A junior is expected to', 'A senior is expected to'],
        hl: 2,
        rows: [
          ['The model', 'Say what a fact, a dimension and a grain are.', 'Shape tables so that a BI model cannot double a number.'],
          ['Where the query runs', 'Know the difference between a copy and a live query.', 'Choose the mode for a dashboard and defend the cost.'],
          ['Measures', 'Read a simple measure and say what it adds up.', 'Decide which numbers belong in the warehouse and which in the tool.'],
          ['Refresh', 'Know that an imported model needs a refresh.', 'Start the refresh from the pipeline and design for late changes.'],
          ['Speed', 'Notice that a dashboard reads a large table.', 'Build aggregate tables and say what they cannot answer.'],
          ['Security', 'Know that viewers can be limited to their rows.', 'Decide where the rule lives and what the warehouse can see.'],
          ['Files', 'Know that a model can be stored as text.', 'Put the model through review, checks and a deployment.']
        ],
        steps: [
          { upto: 3, say: 'The first three rows are about the numbers. A junior reads a model. A senior prevents the wrong number before a dashboard exists.' },
          { upto: 7, say: 'The last four are about running it: fresh, fast, safe and deployed. These are the questions a senior interview spends its time on.' }
        ]
      }),

      B.talk({
        id: 'm0-how', t: 1, src: 'rec', title: 'How this course works',
        say: 'Five quick things before we start. Press Next for each.',
        items: [
          ['SEE, TRY, SAY', 'Every mission watches something work (**SEE**), makes you practise it (**TRY**), then asks the interview question out loud (**SAY**). Orange blocks in a diagram are data or a request moving. Numbers show the order.', 'Watch first, practise second, speak third.'],
          ['Junior, Senior, Extra', 'A small tag on a screen tells you who it is for. No tag means everybody. **Senior** and **Extra** screens appear only on the wider paths.', 'The tag tells you whether a screen is on your path.'],
          ['Two kinds of screen', 'A **Recorded** tag means that I ran something and wrote down what it did. A **From documentation** tag means that I read it and did not run it. Everything about the screens of Power BI, Tableau and Looker is from documentation, because none of the three ran here.', 'Recorded means run. From documentation means read.'],
          ['What ran instead', 'The Brewline tables are real tables in DuckDB: ' + G.n(F.orders) + ' orders and ' + G.n(F.lines) + ' order lines, made up by a fixed rule. Every query result comes from them. The engine behind a Tableau extract built a real extract. A parser read a real LookML project, and a Tableau library read and changed a real data source file.', 'The questions a dashboard asks were run as SQL.'],
          ['Formulas in three languages', 'When a screen shows DAX, a Tableau calculation or LookML next to a number, the number comes from SQL that asks the same question. The formula was written from the documentation and was not run by its tool. The screen says so.', 'The number is real. The formula next to it is read, not run.']
        ],
        cols: 1
      }),

      B.cmp({
        id: 'm0-ran', t: 2, src: 'rec', title: 'What I ran, and what I did not',
        say: 'This is the exact setup behind every recorded screen. Press Next to read it.',
        cols: ['Part', 'What it was', 'Status'],
        hl: 1,
        rows: [
          ['The warehouse', 'DuckDB ' + G.meta('duckdb') + ' with ' + T.rows.length + ' tables of made-up Brewline data, from ' + G.meta('first_day') + ' to ' + G.meta('today'), 'Run'],
          ['A Tableau extract', 'The Hyper engine, through the package tableauhyperapi ' + G.meta('tableauhyperapi') + ': it built, queried and appended to a .hyper file', 'Run'],
          ['A LookML project', 'Read by the parser lkml ' + G.meta('lkml') + ', with my own checks against the tables', 'Run'],
          ['A Tableau data source file', 'Read and changed with the Tableau Document API ' + G.meta('tableaudocumentapi'), 'Run'],
          ['A Power BI refresh request', 'Built with requests ' + G.meta('requests') + ' and printed. It was not sent', 'Built'],
          ['Power BI Desktop and the Power BI service', 'Described from the Microsoft documentation', 'Not run'],
          ['Tableau Desktop, Server and Cloud', 'Described from the Tableau documentation', 'Not run'],
          ['Looker', 'Described from the Google Cloud documentation', 'Not run']
        ],
        steps: [
          { upto: 5, say: 'The first five rows ran on one machine. They are the parts of BI that an engineer can run without a licence: the data, the extract engine, and the model files.' },
          { upto: 8, say: 'The three products did not run. What I say about their screens, their settings and their limits comes from documentation, and the README lists what to check again.' }
        ]
      })
    ]
  });
})();
