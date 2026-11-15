/* Mission 1: the same four parts in three tools, the words each tool uses, and one tile as a query. */
(function () {
  var B = LAB.b, G = LAB.get;
  var TILE = G.file('sql/tile.sql'), TR = G.table('tile.region_month'), CTX = G.table('measures.context');
  var north = TR.rows.filter(function (r) { return r[0] === 'North' && r[1] === '2026-03'; })[0][2];
  G.expect(TR.rows.length === 12, 'the tile has four regions and three months');

  LAB.addChapter({
    id: 'm1', n: 1, title: 'The map: three tools, the same four parts', short: 'Map', blurb: 'Connection, model, measures, report: the names differ and the parts do not', minutes: 14,
    focus: ['src', 'stg', 'mart'],
    goals: [
      'Name the **four parts** of a BI tool and find them in Power BI, Tableau and Looker.',
      'Translate the **words** of one tool into the words of another.',
      'Say what a **tile** sends to the engine, as a query on your tables.'
    ],
    say: 'Three tools, three vocabularies, and one idea. In this mission you learn the idea once and the words three times, and you read a dashboard tile as the query that it is.',
    scenes: [
      B.flow({
        id: 'm1-tools', t: 1, src: 'docs', title: 'Three tools, the same four parts', g: 'tools', legend: true,
        steps: [
          { say: 'Each row is one tool. Read the columns: a way to **connect**, a **model**, a language for **measures**, and a place where **reports** live. Press Next.', tags: ['tg_pbi', 'tg_tab', 'tg_look'], focus: ['p1', 'p2', 'p3', 'p4', 't1', 't2', 't3', 't4', 'l1', 'l2', 'l3', 'l4'], cap: 'Three rows, four columns.' },
          { say: 'Column 1, the connection. Power BI reads and shapes data with **Power Query**. Tableau connects **live** or builds an **extract**. Looker has only one way: it sends SQL to the warehouse over a **connection** that an admin defines.', focus: ['p1', 't1', 'l1'], tags: ['tg_pbi', 'tg_tab', 'tg_look'], cap: 'How the tool reaches your tables.' },
          { say: 'Column 2, the model. Power BI has a **semantic model** with tables and relationships. Tableau has a **data source** with relationships between tables. Looker has **views** for tables and **explores** that say how the views join.', on: ['p12', 't12', 'l12'], focus: ['p2', 't2', 'l2'], tags: ['tg_pbi', 'tg_tab', 'tg_look'], cap: 'How the tables fit together.' },
          { say: 'Column 3, the measures. Power BI writes them in **DAX**. Tableau writes **calculated fields**, and level of detail expressions for the harder ones. Looker defines **measures in LookML**, in the same files as the views.', on: ['p23', 't23', 'l23'], focus: ['p3', 't3', 'l3'], tags: ['tg_pbi', 'tg_tab', 'tg_look'], cap: 'What a business number means.' },
          { say: 'Column 4, the reports. A Power BI **report** is published to a workspace in the Power BI service. A Tableau **workbook** is published to Tableau Server or Tableau Cloud. A Looker **dashboard** is built from explores inside Looker.', on: ['p34', 't34', 'l34'], focus: ['p4', 't4', 'l4'], tags: ['tg_pbi', 'tg_tab', 'tg_look'], cap: 'Where people look at it.' },
          { say: 'Your work touches the first two columns every day and the third one more often than you expect. When an analyst says "the model is slow" or "the measure is wrong", they are in column 2 or 3, and the cause is often in your tables.', focus: ['p1', 'p2', 'p3', 't1', 't2', 't3', 'l1', 'l2', 'l3'], tags: ['tg_pbi', 'tg_tab', 'tg_look'], cap: 'Columns 1 to 3 depend on your tables.' }
        ]
      }),

      B.cmp({
        id: 'm1-words', t: 1, src: 'docs', title: 'One idea, three words',
        say: 'You will sit in meetings where each team uses its own word for the same thing. Press Next and read across each row.',
        cols: ['Idea', 'Power BI', 'Tableau', 'Looker'],
        hl: 0,
        rows: [
          ['The model', 'Semantic model (older name: dataset)', 'Data source', 'Model file with explores'],
          ['A table in the model', 'Table', 'Table in a data source', 'View'],
          ['How two tables join', 'Relationship', 'Relationship, or a join', 'Join inside an explore'],
          ['A number that is computed when asked', 'Measure, in DAX', 'Calculated field with an aggregate', 'Measure, in LookML'],
          ['A column to group or filter by', 'Column', 'Dimension', 'Dimension'],
          ['A copy of the data in the tool', 'Import mode', 'Extract (a .hyper file)', 'None. A persistent derived table is stored in your warehouse'],
          ['A query sent to the warehouse', 'DirectQuery', 'Live connection', 'Every query'],
          ['The file you can put in Git', 'Project files (.pbip, with TMDL)', '.twb and .tds (XML)', 'LookML files'],
          ['Where it is published', 'Workspace in the Power BI service', 'Project on Tableau Server or Cloud', 'Looker instance']
        ],
        steps: [
          { upto: 5, say: 'The first five rows are the model. A Looker **view** is a table and an **explore** is a set of joins. People who know only one tool mix these up, so say which tool you mean.' },
          { upto: 7, say: 'Rows six and seven decide where the query runs. That is the subject of mission 3.' },
          { upto: 9, say: 'The last two rows are about shipping the model. Mission 8 opens one file of each kind.' }
        ]
      }),

      B.sql({
        id: 'm1-tile', t: 1, src: 'rec', title: 'One tile is one query', file: 'tile.sql', code: TILE,
        result: { cols: TR.cols, rows: TR.rows, msg: TR.rows.length + ' rows' },
        steps: [
          { say: 'The first tile of the Brewline dashboard shows revenue by region and month. Whatever the tool is, the engine has to answer this question. Here it is as SQL.' },
          { say: 'The measure is a **sum** over the order lines. The tile does not store this number. It asks for it every time.', lines: G.span(TILE, /sum\(l\.line_amount\)/) },
          { say: 'Two joins. The line knows its order, and the order knows its store. The region lives on the store, so the query walks from the fact to the dimension.', lines: G.span(TILE, /^FROM fact_order_lines/, /JOIN dim_store/) },
          { say: 'The date filter of the dashboard becomes a `WHERE`, and the two things on the axes become the `GROUP BY`.', lines: G.span(TILE, /^WHERE/, /^GROUP BY/) },
          { say: 'Run it. Twelve rows come back: four regions and three months. North made ' + G.n(north) + ' in March 2026. A BI tool would draw these twelve numbers as a chart.', run: true }
        ],
        note: 'This query ran in DuckDB on the Brewline tables. A BI tool writes its own SQL for the same question, and its text differs from tool to tool.'
      }),

      B.rows({
        id: 'm1-context', t: 1, src: 'rec', title: 'The same tile, after a viewer clicks',
        steps: [
          {
            say: 'A dashboard is not one fixed query. A viewer clicks a region or a category, and every tile asks again with one more filter. These are five states of the same four numbers for March 2026.',
            tabs: [{ layer: 'RECORDED', name: 'Four measures under five sets of filters', c: 'raw', cols: CTX.cols, rows: CTX.rows, trk: 0 }],
            notes: ['Each row is one query. Revenue for the whole month is ' + G.n(CTX.rows[0][1]) + ', and for the region North it is ' + G.n(CTX.rows[1][1]) + '.']
          },
          {
            say: 'Read the last column. Customers do not add up: North has ' + G.n(CTX.rows[1][4]) + ' customers and the whole company has ' + G.n(CTX.rows[0][4]) + ', because one person can buy in two regions. A number like that cannot be stored once and summed later. Mission 4 comes back to it.',
            tabs: [{ layer: 'RECORDED', name: 'Four measures under five sets of filters', c: 'raw', cols: CTX.cols, rows: CTX.rows, trk: 0 }],
            notes: ['A measure is computed for the filters of the moment. That is why a BI tool needs a model. A result table is not enough.']
          }
        ]
      }),

      B.talk({
        id: 'm1-yours', t: 1, src: 'docs', title: 'What is yours, and what is theirs',
        say: 'The line between the data engineer and the analyst moves from company to company. This is a common place to draw it. Press Next for each.',
        items: [
          ['Yours: the tables', 'Facts and dimensions with a clear grain, keys that are unique, and names that people can read. If a number needs a rule that everybody shares, the rule lives here.', 'The grain and the keys are yours.'],
          ['Yours: the load and the refresh', 'When the tables are complete, and how the BI tool finds out. An analyst cannot fix a dashboard that refreshes before the load ends.', 'Freshness is a pipeline question.'],
          ['Shared: the model', 'Relationships and the measures that the whole company uses. In Looker this is code that an engineer often owns. In Power BI and Tableau an analyst often builds it, and asks you why a number is doubled.', 'The model is where the two jobs meet.'],
          ['Theirs: the report', 'Charts, colours, pages and the questions that the business asks. You do not need to be good at this. You need to know what a chart asks of your tables.', 'The visuals are theirs.'],
          ['Yours again: cost and access', 'Live dashboards spend warehouse money, and a service account reads your tables on behalf of everybody. Both are decisions that you will be asked to make.', 'Cost and access come back to you.']
        ],
        cols: 1
      }),

      B.quiz({
        id: 'm1-q1', t: 1,
        q: 'An analyst says: "The explore is missing the store view." Which tool are they using, and what do they mean?',
        opts: [
          { t: 'Looker. The set of joins they query does not include the store table', fb: '' },
          { t: 'Power BI. A relationship is inactive', fb: 'Explore and view are LookML words. Power BI says semantic model and table.' },
          { t: 'Tableau. The extract was not refreshed', fb: 'An extract is a copy of data. Explore and view are Looker words.' },
          { t: 'Any tool. The dashboard has no store filter', fb: 'A filter is on a dashboard. An explore is in the model, and the word is Looker\'s.' }
        ],
        ok: 0, why: 'In Looker a **view** is a table and an **explore** says how views join. A missing join in the explore means that nobody can group by store, whatever the dashboard looks like.'
      }),

      B.quiz({
        id: 'm1-q2', t: 1,
        q: 'A dashboard page has six tiles. A viewer opens it and clicks one filter. With a live connection and no cache, how many queries reach the warehouse?',
        opts: [
          { t: '1', fb: 'Each tile asks its own question.' },
          { t: '6', fb: 'That is the first opening. The click makes every tile ask again.' },
          { t: '12', fb: '' },
          { t: 'None, the tool has the data', fb: 'A live connection keeps no copy.' }
        ],
        ok: 2, why: 'Six tiles are six queries when the page opens, and six more when the filter changes. A cache or a copy in the tool lowers that number, and mission 3 counts it.'
      }),

      B.order({
        id: 'm1-ord', t: 1, q: 'A viewer opens the sales dashboard. Put what happens in order.',
        items: [
          'The viewer signs in, and the tool knows who they are',
          'The dashboard asks the engine one question for each tile',
          'The model tells the engine how to join the tables and what the measure means',
          'The engine answers from its copy, or sends SQL to the warehouse',
          'The numbers come back and the tiles draw them'
        ],
        why: 'Identity first, then one question for each tile, then the model, then the data. When a number is wrong, walk the same five steps and ask at which one it went wrong.'
      }),

      B.qa({
        id: 'qa-parts', t: 1, tag: 'BI', secs: 60,
        q: 'What does a BI tool do between the warehouse and a chart?',
        pts: ['Connects to the data: a copy or a live query', 'Holds a model: tables, joins, measures', 'Turns each tile and filter into a query', 'Applies access rules and draws the result'],
        short: 'A BI tool does four things. It connects to the data, either by copying it or by sending queries to the warehouse. It holds a model: which tables exist, how they join, and what a measure such as revenue means. It turns every tile and every click into a query against that model. And it applies the access rules and draws the result. As a data engineer I care most about the first two, because the tables I build are what the model is made of.',
        fu: [['Where do the numbers get computed?', 'In the engine of the tool when it holds a copy, and in the warehouse when the connection is live.'], ['Why does it need a model at all?', 'Because a measure has to be computed again for every filter. A stored result table cannot do that.']],
        trap: 'Describing only charts. The interviewer wants to hear model, queries and refresh.',
        real: 'Name the tool that your team used and say which mode it ran in.'
      }),

      B.qa({
        id: 'qa-three', t: 2, tag: 'BI', secs: 75,
        q: 'How do Power BI, Tableau and Looker differ, from an engineer\'s point of view?',
        pts: ['Power BI: copy by default, model with DAX measures', 'Tableau: extract or live, calculations in the workbook or data source', 'Looker: always live SQL, model as LookML code in Git', 'The difference that matters: where the query runs and where the model lives'],
        short: 'The three have the same parts and put them in different places. Power BI usually imports the data into its own engine and defines measures in DAX inside a semantic model. Tableau connects live or builds an extract, and its calculations live in the workbook or in a published data source. Looker keeps no copy: every question becomes SQL on the warehouse, and the model is LookML code in a Git repository. So for me the questions are the same for each tool: where does the query run, who pays for it, how does the tool learn that new data has arrived, and where is the model stored so that I can review a change.',
        fu: [['Which one puts the most load on the warehouse?', 'Looker, and any Power BI or Tableau model that is set to live. Aggregate tables and caching are how you manage it.'], ['Which is easiest to put under version control?', 'Looker, because LookML is text from the start. Power BI project files and Tableau XML can be versioned too.']],
        trap: 'Ranking the tools by which is "best". Compare where the work happens.',
        real: 'Say which of the three you have worked next to, and be honest about the others.'
      }),

      B.recap({
        id: 'm1-recap', n: 1, badge: 'Map Reader', color: '#DDD6FE',
        pts: [
          'Every BI tool has a **connection**, a **model**, **measures** and **reports**.',
          'Power BI says semantic model, DAX and import. Tableau says data source, calculated field and extract. Looker says view, explore and LookML.',
          'A **tile is a query**. Six tiles and one click are twelve queries on a live connection.',
          'A **measure is computed for the filters of the moment**, so a result table cannot replace a model.',
          'The tables, the load, the cost and the access are yours. The charts are not.'
        ],
        lines: [
          'I can translate between the three vocabularies.',
          'I can read a tile as a query.',
          'I know which parts are mine.'
        ]
      })
    ]
  });
})();
