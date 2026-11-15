/* Mission 3: a copy in the tool or a live query. The extract on these screens was built by the Tableau Hyper engine. */
(function () {
  var B = LAB.b, G = LAB.get;
  var SZ = G.table('hyper.sizes'), HB = G.counts('hyper.build'), HA = G.counts('hyper.append'), HT = G.table('hyper.tile'), P = G.counts('perf.page'), BUILD = G.file('build_extract.py');
  var n = G.n, csv = SZ.rows[0][3], pq = SZ.rows[1][3], hy = SZ.rows[2][3];
  G.expect(HB.tile_matches_duckdb_before_the_last_day === true && HA.tile_matches_duckdb_after_append === true, 'the extract gives the same tile numbers as the warehouse');
  G.expect(csv > hy * 5 && csv > pq * 5, 'the CSV file is more than five times the size of the columnar files');
  G.expect(P.tiles === 6, 'the dashboard page has six tiles');

  LAB.addChapter({
    id: 'm3', n: 3, title: 'Where the query runs: a copy or a live query', short: 'Mode', blurb: 'Import and extract against DirectQuery and live, and what each costs', minutes: 16,
    focus: ['ing', 'stg', 'mart'],
    goals: [
      'Explain a **copy in the tool** (import, extract) and a **live query**.',
      'Name the modes of **Power BI, Tableau and Looker**.',
      'Weigh **freshness** against **load on the warehouse**.',
      'Say what an **extract** is, from having seen one built.'
    ],
    say: 'Every BI model answers one question before any other: does the tool keep its own copy of your data, or does it ask your warehouse each time? The answer decides how fresh the numbers are and who pays for a click.',
    scenes: [
      B.flow({
        id: 'm3-modes', t: 1, src: 'docs', title: 'Two ways to answer a tile', g: 'modes', legend: true,
        steps: [
          { say: 'A dashboard page with six tiles, and your warehouse on the right. There are two roads between them. Press Next.', focus: ['dash', 'wh'], cap: 'Two roads from the dashboard to the data.' },
          { say: 'Road one, step 1. The tile is answered from a **copy inside the tool**. The engine holds the rows in memory, in columns, compressed. The warehouse is not involved.', on: ['a1'], focus: ['dash', 'copy'], cap: 'The copy answers from memory.' },
          { say: 'Steps 2 and 3. A **refresh** fills the copy. It runs on a schedule, or when something tells it to. Between two refreshes the copy does not change.', on: ['a2', 'a3'], focus: ['wh', 'copy', 'sched'], tags: ['tg_stale'], cap: 'As fresh as the last refresh.' },
          { say: 'Road two, step 4. No copy. The tool turns the tile into **SQL**.', on: ['b1'], focus: ['dash', 'sql'], cap: 'The tile becomes SQL.' },
          { say: 'Step 5. The SQL runs on **your warehouse**, and the rows come back. The tile is as fresh as the tables. Every viewer and every click is warehouse work.', on: ['b2'], focus: ['sql', 'wh'], tags: ['tg_fresh'], cap: 'As fresh as the warehouse, and paid for by the warehouse.' },
          { say: 'Neither road is the right one. A copy is fast and cheap for viewers and can be hours old. A live query is current and can be slow and costly. Most companies use both, for different dashboards.', focus: ['copy', 'sql', 'wh', 'dash'], tags: ['tg_stale', 'tg_fresh'], cap: 'Choose for each dashboard.' }
        ]
      }),

      B.cmp({
        id: 'm3-names', t: 1, src: 'docs', title: 'The modes of each tool',
        say: 'Each tool has its own names for the two roads, and some extras in between. Press Next.',
        cols: ['Tool', 'A copy in the tool', 'A live query', 'In between'],
        hl: 0,
        rows: [
          ['Power BI', '**Import**. The rows are loaded into the semantic model and held in memory.', '**DirectQuery**. Every visual sends a query to the source.', '**Composite** models mix both. A **hybrid table** imports old partitions and reads the newest one live. **Direct Lake** reads Delta tables in Microsoft Fabric without an import.'],
          ['Tableau', '**Extract**. A .hyper file, built by the Hyper engine and stored with the workbook or the published data source.', '**Live connection**. Tableau sends queries to the database.', 'An extract can be filtered or aggregated when it is built. Tableau Cloud reaches a database inside your network through **Tableau Bridge**.'],
          ['Looker', 'None. Looker keeps no copy of your tables.', '**Every query** is SQL on the warehouse.', 'A **cache** of query results, and **persistent derived tables** that Looker builds inside your warehouse.']
        ],
        steps: [
          { upto: 2, say: 'Power BI and Tableau both offer the two roads. Import and extract are the same idea with two engines behind them.' },
          { upto: 3, say: 'Looker has one road. That is why a Looker rollout is first of all a question about warehouse capacity.' }
        ]
      }),

      B.code({
        id: 'm3-build', t: 1, src: 'rec', title: 'Building an extract, without Tableau Desktop', file: 'build_extract.py', lang: 'python', code: BUILD,
        steps: [
          { say: 'An extract is not magic. It is a file that an engine writes. This script uses the **Hyper API**, the same engine that Tableau uses for extracts, and I ran it. Press Next.', lines: null },
          { say: 'The table of the extract: one row for each order line, with the store, the region and the category already on it. An extract is often one wide table, built from the star.', lines: G.span(BUILD, /^TABLE = /, /status text NOT NULL\)/) },
          { say: '`build` is a **full refresh**. It makes a new file and loads every row of the CSV into it.', lines: G.span(BUILD, /^def build/, /COPY sales FROM/) },
          { say: '`append` is an **incremental refresh**. It opens the same file and adds the rows of a newer file. Read its comment: rows that are already in the extract are not looked at. Mission 5 shows what that costs.', lines: G.span(BUILD, /^def append/, /COPY sales FROM/) },
          { say: 'The engine runs as its own process next to your script. Tableau Desktop is not needed, which is why a pipeline can build an extract and publish it.', lines: G.span(BUILD, /^def start/, /HyperProcess/) }
        ],
        note: 'Recorded with tableauhyperapi ' + G.meta('tableauhyperapi') + '. It loaded ' + n(HB.rows_loaded) + ' rows, up to ' + HB.newest_day_in_extract + '.'
      }),

      B.rows({
        id: 'm3-sizes', t: 1, src: 'rec', title: 'The same rows in three files',
        steps: [
          {
            say: 'The same ' + n(HB.rows_in_extract) + ' rows, written three ways. The CSV is text, row by row. Parquet and the extract store the data **by column** and compress it.',
            tabs: [{ layer: 'RECORDED', name: 'Three files, the same rows', c: 'raw', cols: SZ.cols, rows: SZ.rows.map(function (r) { return [r[0], r[1], n(r[2]), n(r[3])]; }), trk: 0 }],
            notes: ['The CSV is ' + (csv / hy).toFixed(1) + ' times the size of the extract and ' + (csv / pq).toFixed(1) + ' times the size of the Parquet file. A column of regions has four different values, and a column store writes each value once.']
          },
          {
            say: 'I asked the extract the question of the first tile, in the SQL of the Hyper engine, and compared the answer with the warehouse. All twelve numbers are the same.',
            tabs: [{ layer: 'RECORDED', name: 'The tile, answered by the extract', c: 'raw', cols: HT.cols, rows: HT.rows, trk: 0 }],
            notes: ['An import in Power BI works the same way with another engine, called VertiPaq: columns, compressed, in memory. I did not run that engine.']
          }
        ]
      }),

      B.widget({ id: 'm3-lab', kind: 'modes', t: 1, src: 'rec', title: 'Lab: a copy or a live query' }),

      B.cmp({
        id: 'm3-trade', t: 1, src: 'docs', title: 'What you trade',
        say: 'The same six questions decide the mode for every dashboard. Press Next.',
        cols: ['Question', 'A copy in the tool', 'A live query'],
        hl: 0,
        rows: [
          ['How old can a number be?', 'As old as the time between two refreshes, plus the refresh itself.', 'As old as your tables.'],
          ['Who does the work for a click?', 'The engine of the tool, from memory.', 'Your warehouse, for every tile.'],
          ['What limits the size?', 'Memory and the size limits of your licence. A refresh has to finish in its time limit.', 'The warehouse. There is no copy to fill.'],
          ['What can break at night?', 'The refresh: a timeout, a changed column, a gateway that is down.', 'Nothing at night. It breaks at nine in the morning, when everybody opens the page.'],
          ['Where do access rules live?', 'In the tool. The copy holds all rows.', 'In the tool, in the warehouse, or both.'],
          ['What do you tune?', 'The refresh: partitions and incremental loads.', 'The tables: aggregates, clustering and warehouse size.']
        ],
        steps: [
          { upto: 3, say: 'Freshness, work and size. A copy moves the work out of the warehouse and pays for it with age and a size limit.' },
          { upto: 6, say: 'Failure, access and tuning. A copy fails quietly at night. A live model fails loudly in the morning.' }
        ]
      }),

      B.quiz({
        id: 'm3-q1', t: 1,
        q: 'The finance team opens a Power BI report at 09:00. The model is in import mode and was refreshed at 02:00. The warehouse loaded new orders at 06:00. What do they see?',
        opts: [
          { t: 'The orders loaded at 06:00', fb: 'The copy does not know about the 06:00 load.' },
          { t: 'The data as it was at 02:00', fb: '' },
          { t: 'An error, because the data changed', fb: 'A copy answers from memory. It does not check the source.' },
          { t: 'A mix: new rows for visuals that were opened first', fb: 'All visuals read the same copy.' }
        ],
        ok: 1, why: 'An imported model is as old as its last refresh. A refresh at 02:00 before a load at 06:00 is the classic ordering mistake, and mission 5 fixes it.'
      }),

      B.quiz({
        id: 'm3-q2', t: 1,
        q: 'Which statement about Looker is right?',
        opts: [
          { t: 'It imports the tables every night', fb: 'Looker keeps no copy of your tables.' },
          { t: 'It sends SQL to the warehouse for every question, and can cache results', fb: '' },
          { t: 'It stores data in .hyper files', fb: 'That is a Tableau extract.' },
          { t: 'It needs DAX to query the warehouse', fb: 'DAX is the language of Power BI.' }
        ],
        ok: 1, why: 'Looker always queries the warehouse. A cache of results and derived tables that it builds in the warehouse reduce the load, and both live on your side.'
      }),

      B.decide({
        id: 'm3-dec', t: 2, src: 'docs', title: 'Decision: which mode for the store managers?',
        scenario: 'Brewline has 12 store managers and about 200 staff who open the sales dashboard between 08:00 and 09:00. The warehouse loads orders once a night and finishes around 05:30. The fact table grows by about 300 lines a day. The managers ask for "real-time data".',
        opts: [
          { t: 'A live connection, because they asked for real time', d: 'Always current.', lose: 'The data changes once a night, so "current" means the 05:30 load either way. A live model would send every tile of every viewer to the warehouse during the busiest hour and buy no freshness for it.' },
          { t: 'A copy in the tool, refreshed when the nightly load has finished', d: 'Viewers are served from memory, and the numbers are as fresh as the warehouse can be.' },
          { t: 'A copy refreshed every 15 minutes', d: 'Feels fresh.', lose: 'Ninety-six refreshes a day reload data that changed once. It costs warehouse time and can hit the refresh limits of the licence.' }
        ],
        pick: 1,
        why: 'Ask how often the source changes before you ask how fresh the dashboard should be. With one load a night, a copy that refreshes after the load is exactly as fresh as a live query and far cheaper for 200 viewers.',
        when: 'Choose live when the tables change during the day and the question needs the last minutes, when the data is too large to copy, or when access rules must be enforced by the warehouse.'
      }),

      B.incident({
        id: 'm3-inc', t: 2, src: 'docs', title: 'Incident: the warehouse bill doubled', time: '10:40',
        alert: '**The cost report of the warehouse shows twice the usual spend for last week.** No pipeline changed. A new "Sales live" dashboard was launched to 200 people on Monday.',
        clues: ['The query history shows thousands of short queries between 08:00 and 10:00 from the service account of the BI tool', 'Most of them read the fact table and group by region and month', 'The dashboard has six tiles and a date filter that many people change'],
        opts: [
          { t: 'Find the tiles behind the queries, give the common ones an aggregate table or a copy, and switch on result caching', fb: '' },
          { t: 'Double the size of the warehouse', fb: 'That makes the queries faster and the bill larger. It does not remove a single query.' },
          { t: 'Block the service account', fb: 'The dashboard stops for 200 people, and nothing is learned.' },
          { t: 'Ask people to open the dashboard less often', fb: 'That is not a control you can rely on.' }
        ],
        best: 0,
        why: 'A live dashboard multiplies viewers by tiles by clicks. The lab counted it: every viewer and every filter change is a set of queries. The fix is to make each query small (an aggregate table), to reuse answers (a cache), or to move the common tiles to a copy.',
        checks: [
          ['Measure', 'Group the query history by query text and count. A handful of query shapes usually make up most of the load.'],
          ['Match', 'Map each shape to a tile. The tool can show the SQL that a tile sends.'],
          ['Reduce', 'Build an aggregate table for the common shapes, or switch those tiles to a copy.'],
          ['Guard', 'Set a limit on the warehouse that the BI tool uses, so that a new dashboard cannot spend without a ceiling.']
        ],
        tell: 'The bill doubled because a new live dashboard sent six queries for every viewer and every filter change. I grouped the query history, found that three query shapes made up most of the load, built one aggregate table that answers them, and gave the BI tool its own warehouse with a spending limit.',
        prevent: ['Review the **mode** of a new dashboard before it is shared widely', 'Give the BI tool **its own warehouse or resource group** with a limit', 'Watch **queries by service account** on a chart']
      }),

      B.qa({
        id: 'qa-modes', t: 1, tag: 'BI', secs: 75,
        q: 'What is the difference between import mode and DirectQuery, or an extract and a live connection?',
        pts: ['Copy: rows loaded into the tool, columnar and compressed, answered from memory', 'Live: every visual becomes SQL on the source', 'Copy is fast and as old as the last refresh', 'Live is current and puts the load on the warehouse'],
        short: 'In import mode, or with a Tableau extract, the tool copies the rows into its own columnar engine and answers every visual from memory. It is fast, it costs the warehouse nothing when people look at it, and it is as old as the last refresh. With DirectQuery or a live connection the tool keeps no copy: every visual becomes a SQL query on the source, so the numbers are as fresh as the tables and the warehouse does the work for every viewer and every click. I choose by asking how often the source really changes, how many people look, and how large the data is.',
        fu: [['What is a composite model?', 'A Power BI model that mixes imported tables and DirectQuery tables, for example imported dimensions and a live fact.'], ['And Looker?', 'Always live. It reduces load with a result cache and with derived tables built in the warehouse.']],
        trap: 'Saying that live is "better because it is real time". The source decides how real the time is.',
        real: 'Say which mode your dashboards used and why.'
      }),

      B.qa({
        id: 'qa-extract', t: 2, tag: 'BI', secs: 60,
        q: 'What is a Tableau extract, physically?',
        pts: ['A .hyper file written by the Hyper engine', 'Columnar and compressed, often one wide table', 'Built by a full refresh or added to by an incremental refresh', 'Can be built by a pipeline with the Hyper API'],
        short: 'An extract is a file with the extension .hyper, written by Tableau\'s Hyper engine. It stores the data by column and compressed, usually as one wide table built from the model. A full refresh writes a new file with every row, and an incremental refresh adds new rows to the existing file. Because the engine is available as an API, a pipeline can build the file and publish it without Tableau Desktop. In the recording behind this course the same 121,881 rows took about seven megabytes as CSV and under one megabyte as an extract.',
        fu: [['What does an incremental refresh miss?', 'A change to a row that is already in the extract. It only adds rows.'], ['Where does the extract live?', 'With the workbook, or with a published data source on Tableau Server or Cloud.']],
        trap: 'Calling an extract "a cache". A cache is filled by queries. An extract is filled by a refresh.',
        real: 'If you have published an extract from a pipeline, say how.'
      }),

      B.recap({
        id: 'm3-recap', n: 3, badge: 'Mode Chooser', color: '#BFDBFE',
        pts: [
          'A **copy** (import, extract) answers from memory and is as old as its last refresh.',
          'A **live query** (DirectQuery, live connection, every Looker query) is as fresh as the tables and runs on your warehouse.',
          'An extract is a **columnar file**: ' + n(csv) + ' bytes of CSV became ' + n(hy) + ' bytes.',
          'Six tiles are six queries for each viewer and each click. Count before you choose live.',
          'Ask **how often the source changes** before you promise real time.'
        ],
        lines: [
          'I can name the modes of all three tools.',
          'I choose a mode from the source, the viewers and the size.',
          'I know who pays for a click.'
        ]
      })
    ]
  });
})();
