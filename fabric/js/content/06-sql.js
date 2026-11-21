/* Mission 6: SQL, the Warehouse and Direct Lake. The platform parts are from documentation. The gold table and the pinned version are recorded on real Delta Lake. */
(function () {
  var B = LAB.b, G = LAB.get;
  var C = G.counts, n = G.n;
  var GT = C('gold.table'), GP = C('gold.pinned'), GS = G.table('gold.sample').rows;
  var TSQL = G.file('gold_daily.tsql');
  G.expect(GP.pinned_equals_earlier === true && GP.dates_pinned !== GP.dates_latest && GP.rows_latest > GP.rows_pinned && GP.revenue_latest > GP.revenue_pinned, 'a reader pinned to the first gold version still sees the old data after a rebuild');

  LAB.addChapter({
    id: 'm6', n: 6, title: 'SQL, the Warehouse and Direct Lake', short: 'SQL and Power BI', blurb: 'T-SQL on the lakehouse, the Warehouse, and a model that reads Delta', minutes: 26,
    focus: ['mon', 'air'],
    goals: [
      'Say what the **SQL analytics endpoint** can and cannot do, and how the **Warehouse** differs.',
      'Read the T-SQL for the **gold table** and say what is different from Spark SQL.',
      'Explain **Direct Lake**, **framing** and the **fallback**.',
      'Choose between **Direct Lake** and **Import**.'
    ],
    say: 'Most of the people who read your tables will never open a notebook. They use T-SQL or Power BI, and Fabric gives each group an engine over the same Delta files. This mission is about the choices at that edge. Almost all of it is from documentation, which I read through search summaries, and I mark the two screens that are recorded: the gold logic that ran on Spark, and a reader that stays on an old version of a table.',
    scenes: [
      B.flow({
        id: 'm6-flow', t: 1, src: 'docs', title: 'One copy of the data, several engines', g: 'engines', legend: true,
        steps: [
          { say: 'Brewline has a gold table. Different people want to read it in different ways. Press Next.', focus: ['sp', 'wh', 'ol', 'sql', 'dl', 'ext'], cap: 'Writers on the left, readers on the right.' },
          { say: 'Step 1. A **Spark notebook** writes Delta tables into OneLake. This is how bronze, silver and gold were made in the last missions.', on: ['e1'], focus: ['sp', 'ol'], cap: 'Spark writes Delta.' },
          { say: 'Step 2. A **Warehouse** also writes Delta tables into OneLake, with T-SQL. It is a separate item with its own tables.', on: ['e2'], focus: ['wh', 'ol'], cap: 'The Warehouse writes Delta.' },
          { say: 'Step 3. Every lakehouse gets a **SQL analytics endpoint**. It lets people and tools query the lakehouse tables with T-SQL. It is **read-only**: it cannot change a table.', on: ['e3'], focus: ['ol', 'sql'], tags: ['tg_ro'], cap: 'T-SQL reads, and cannot write.' },
          { say: 'Step 4. A Power BI **Direct Lake** model reads the same Parquet files. There is no copy into the model first. Other engines that can read Delta can read the same tables.', on: ['e4', 'e5'], focus: ['ol', 'dl', 'ext'], tags: ['tg_nocopy'], cap: 'The same files, read in place.' }
        ]
      }),

      B.cmp({
        id: 'm6-endpoint', t: 1, src: 'docs', title: 'The SQL analytics endpoint and the Warehouse',
        say: 'They both speak T-SQL, and they are not the same thing. Press Next to compare them.',
        cols: ['', 'SQL analytics endpoint of a lakehouse', 'Warehouse'],
        hl: 2,
        rows: [
          ['What it is', 'A T-SQL view of the Delta tables of a lakehouse', 'A T-SQL database whose tables are Delta files'],
          ['Can it write?', 'No. Tables are changed by Spark', 'Yes: CREATE TABLE, INSERT, CTAS and so on, within the supported T-SQL'],
          ['Who creates the tables?', 'A notebook or a pipeline, in the lakehouse', 'A person or a pipeline, with T-SQL'],
          ['T-SQL surface', 'Queries. Check the list of what is supported', 'A subset of SQL Server T-SQL. Triggers are not supported, and some ALTER TABLE forms are limited'],
          ['Best for', 'Letting SQL users read the lakehouse tables', 'Governed, SQL-first tables with their own write path']
        ],
        steps: [
          { upto: 2, say: 'The endpoint is a **read** path onto the lakehouse. The Warehouse is a place where tables are **made** with T-SQL.' },
          { upto: 4, say: 'Neither is a full SQL Server. The documentation has a page on the supported T-SQL, and I read it only through search summaries, so check it for the statement that you need.' },
          { upto: 5, say: 'Pick the endpoint when SQL users only read what Spark makes. Pick a warehouse when they need to build tables.' }
        ]
      }),

      B.code({
        id: 'm6-tsql', t: 1, src: 'docs', title: 'The gold table in T-SQL', file: 'gold_daily.tsql', lang: 'tsql', code: TSQL,
        steps: [
          { say: 'This is the same gold table as in mission 4, written for a **Warehouse**. It was not run in Fabric. The verifier of this course parses it as T-SQL, which checks the syntax and nothing else. Press Next.', lines: null },
          { say: '`CREATE TABLE ... AS SELECT` (CTAS) makes a table from a query in one step. This is the way to build a table in a warehouse.', lines: G.span(TSQL, /CREATE TABLE/, /^AS$/) },
          { say: 'The lakehouse is read through a **three-part name**: item, schema, table. In documentation this works for items of the same workspace.', lines: G.span(TSQL, /FROM BrewlineLakehouse/) },
          { say: 'The rest is the same as the Spark version: the same filter and the same grouping. `CAST(... AS date)` is the T-SQL spelling of the cast, and the logic is unchanged.', lines: G.span(TSQL, /WHERE status/, /GROUP BY/) }
        ],
        note: 'Spark SQL and T-SQL differ in small things: `DATE` against `date`, string quoting, and functions. Put business logic in one place, and test the two engines on the same rows if both exist.'
      }),

      B.term({
        id: 'm6-logic', t: 1, src: 'rec', title: 'The same logic, run on Spark',
        say: 'The T-SQL above was not run. The logic of it ran in mission 4 as Spark SQL on the real gold table, and these are its first rows.',
        lines: function () {
          return G.term([['SELECT order_date, store_id, orders, revenue FROM gold_daily_revenue ORDER BY 1, 2 LIMIT 6;   -- Spark SQL', GS.map(function (r) { return r.join(' | '); }).join('\n')]]);
        },
        after: 'The result is **' + GT.rows + '** rows of ' + n(GT.orders) + ' orders and a revenue of **' + n(GT.revenue) + '**. A Warehouse query with the same filter and grouping should return the same figures, and that comparison is a test worth writing: run both on the same silver rows and compare the totals.',
        afterKind: 'tip',
        doneSay: 'The logic is the same. The engine is not.'
      }),

      B.talk({
        id: 'm6-sync', t: 2, src: 'docs', title: 'Things to watch with the endpoint',
        say: 'Four points that come up when SQL users read a lakehouse. Press Next for each.',
        items: [
          ['The endpoint is a view of the lakehouse', 'It reads the Delta tables of the lakehouse, so it sees what Spark wrote. It cannot create, change or drop them.', 'Read-only.'],
          ['Metadata is synced', 'The endpoint keeps its own metadata about the tables, and it is synced from the lakehouse. After a notebook creates a table or changes its schema, the endpoint can take a moment to show it. I did not find the delay quantified in what I read, so measure it before you promise freshness.', 'A new table may not show at once.'],
          ['Same region', 'The documentation says that connections between a Warehouse or an endpoint and the items that it reads need the items to be in the same region.', 'Keep the items in one region.'],
          ['Work counts as background', 'SQL queries of the Warehouse and the endpoint are mostly background work for the capacity, which is smoothed over 24 hours. Mission 8 comes back to this.', 'A heavy query is paid for later.']
        ],
        cols: 1
      }),

      B.flow({
        id: 'm6-dl', t: 1, src: 'docs', title: 'Direct Lake in five steps', g: 'directlake', legend: true,
        steps: [
          { say: 'A Power BI model over gold. Press Next.', focus: ['dl', 'fr', 'mem', 'rep', 'dq'], cap: 'A Delta table, a model, a report.' },
          { say: 'Step 1. The model points at **Delta tables in OneLake**. There is no import and no refresh that copies the rows.', on: ['e1'], focus: ['dl', 'fr'], tags: ['tg_nocopy'], cap: 'No copy of the rows.' },
          { say: 'Step 2. **Framing** pins the model to a **version** of each Delta table. The model knows which files make up the table. Mission 6\'s lab shows what a pinned reader sees.', on: ['e2'], focus: ['fr', 'mem'], tags: ['tg_reframe'], cap: 'The model is pinned to a version.' },
          { say: 'Step 3. When a report asks for a column, the model **loads that column from the Parquet files into memory** and answers from memory, with the same engine as an Import model.', on: ['e3'], focus: ['mem', 'rep'], cap: 'Columns load when they are asked for.' },
          { say: 'Step 4. In some situations the model cannot read the files and **falls back to DirectQuery**, which sends the query to the SQL endpoint. It is slower. Views and SQL-based row-level security are examples that the documentation names for models that use the SQL endpoint.', on: ['e4'], focus: ['mem', 'dq'], tags: ['tg_fb'], cap: 'The fallback is DirectQuery.' }
        ]
      }),

      B.widget({ id: 'm6-lab', kind: 'framelab', t: 1, src: 'rec', title: 'Lab: two readers of the same gold table' }),

      B.cmp({
        id: 'm6-modes', t: 1, src: 'docs', title: 'Import, DirectQuery and Direct Lake',
        say: 'A Power BI model stores its data in one of three ways. Press Next to compare them.',
        cols: ['', 'Import', 'DirectQuery', 'Direct Lake'],
        hl: 3,
        rows: [
          ['Where the data is read from', 'A copy loaded into the model', 'The source, on every query', 'Delta files in OneLake, columns loaded when asked'],
          ['Freshness', 'As of the last refresh', 'Live', 'As of the framed version. A refresh frames again'],
          ['Speed', 'Fast, from memory', 'Depends on the source', 'Fast when the columns are in memory. Slower on a fallback'],
          ['A step that copies data', 'Yes: the refresh', 'No', 'No'],
          ['Watch for', 'Refresh time and size limits', 'Load on the source', 'Fallback, and which sources are supported']
        ],
        steps: [
          { upto: 3, say: 'Direct Lake keeps the speed of memory and skips the copy. The documentation says that it normally performs like Import and better than DirectQuery. Other writers, such as SQLBI, say that Import can be faster, so measure on your model.' },
          { upto: 5, say: 'The price is the dependence on the shape of the Delta files and on the fallback rules. Choose by measuring, and by checking whether the model falls back.' }
        ]
      }),

      B.talk({
        id: 'm6-fallback', t: 2, src: 'docs', title: 'When Direct Lake falls back',
        say: 'The fallback is the part that surprises teams. Press Next for each point.',
        items: [
          ['What it is', 'A query that cannot be answered from the Delta files is sent to the **SQL endpoint** as DirectQuery. The report still works, and it is slower.', 'It works, and it is slower.'],
          ['Examples', 'For a model built on the SQL endpoint, the documentation names a **SQL view** as a source, and a **Warehouse with SQL-based row-level security**, as reasons for the fallback. A model built directly on OneLake does not fall back through the endpoint.', 'Views and SQL security are the usual causes.'],
          ['How to avoid it', 'Point the model at **tables**, not views. Put the logic in a gold table that a notebook builds. Use row-level security in the model if that fits your rules. Then check the report in a tool that shows the storage mode of each query.', 'Tables, not views.'],
          ['A pinned version', 'A model that was framed before a load shows old data until it is framed again. A refresh does that. The recorded lab above shows the table side of it.', 'Reframe after a load.']
        ],
        cols: 1
      }),

      B.bug({
        id: 'm6-bug', t: 2, q: 'A team ports the Brewline logic to a Warehouse and adds an audit step. The script fails in Fabric. Click the statement that a Fabric Warehouse does not support, according to the documentation that I read.',
        file: 'warehouse_setup.sql', lang: 'tsql',
        code: 'CREATE TABLE dbo.orders_audit (order_id varchar(20), changed_at datetime2(6));\n\nCREATE TRIGGER dbo.trg_orders_audit ON dbo.orders\nAFTER UPDATE\nAS\n    INSERT INTO dbo.orders_audit SELECT order_id, SYSDATETIME() FROM inserted;\n',
        bad: [3],
        hint: 'Which object type runs code when a row changes?',
        why: 'The documentation lists **triggers** among the T-SQL features that a Fabric Warehouse does not support. This is from documentation: I did not run a Warehouse, and I read the page through search summaries. Do the audit in the load instead: a notebook or pipeline that writes the audit row, or the Delta history of the table, which already records every commit.',
        fix: '-- the audit is written by the load itself, in the same pipeline step\nINSERT INTO dbo.orders_audit\nSELECT order_id, SYSDATETIME()\nFROM dbo.orders_changed_today;\n',
        cheer: 'Do it in the load.'
      }),

      B.quiz({
        id: 'm6-q1', t: 1, src: 'docs',
        q: 'A SQL analyst wants to create a table of her own next to the lakehouse tables. Which is the right place?',
        opts: [
          { t: 'A Warehouse, which supports T-SQL writes', fb: '' },
          { t: 'The SQL analytics endpoint of the lakehouse', fb: 'The endpoint is read-only.' },
          { t: 'The Files area of the lakehouse', fb: 'Files holds files, not tables that T-SQL can create.' },
          { t: 'A Direct Lake model', fb: 'A model is for reading and reporting.' }
        ],
        ok: 0, why: 'The endpoint reads Delta tables of the lakehouse and cannot write. A warehouse is where T-SQL builds tables.'
      }),

      B.quiz({
        id: 'm6-q2', t: 1, src: 'docs',
        q: 'What does Direct Lake avoid compared with Import?',
        opts: [
          { t: 'The step that copies the rows into the model', fb: '' },
          { t: 'The need for a capacity', fb: 'A capacity pays for it.' },
          { t: 'The need for Delta tables', fb: 'Delta tables are the source.' },
          { t: 'All DAX', fb: 'The model still answers DAX queries.' }
        ],
        ok: 0, why: 'The model loads columns from the Delta files when they are needed, and a refresh frames it again on the newest version. There is no import of the rows.'
      }),

      B.quiz({
        id: 'm6-q3', t: 1,
        q: 'A Direct Lake model was framed before day 6 was loaded. A report shows the old revenue. What does the recording say about this?',
        opts: [
          { t: 'A reader pinned to the first gold version shows ' + GP.dates_pinned + ' and ' + n(GP.revenue_pinned) + ', while the latest shows ' + GP.dates_latest + ' and ' + n(GP.revenue_latest), fb: '' },
          { t: 'Nothing: all readers always see the newest data', fb: 'A reader sees the version that it is pinned to.' },
          { t: 'The old data is deleted at once when gold is rebuilt', fb: 'Old versions stay until they are vacuumed.' },
          { t: 'The report fails with an error', fb: 'It works and shows older data.' }
        ],
        ok: 0, why: 'This is the table side of framing. The model itself did not run. A refresh frames the model on the newest version.'
      }),

      B.order({
        id: 'm6-ord', t: 2, src: 'docs', q: 'Put the steps in order for a new day of data to reach a Direct Lake report.',
        items: ['The notebook merges the day into silver and rebuilds gold', 'Gold gets a new Delta version', 'The model is framed again on the new version (a refresh)', 'A report asks for a column, and the model loads it from the new files'],
        why: 'The table changes first and the model follows. A model that is not framed again keeps showing the version that it was pinned to.'
      }),

      B.decide({
        id: 'm6-dec', t: 2, src: 'docs', title: 'Decision: Direct Lake or Import for the Brewline sales model?',
        scenario: 'The sales model reads the gold table, which is rebuilt every night. It has 40 million rows and 15 reports, and the business wants the new day by 07:00. The gold logic is in a notebook.',
        opts: [
          { t: 'Direct Lake on the gold tables, framed again when the pipeline ends', d: 'No copy and no refresh of the rows. The model follows the tables, and the pipeline adds one step at its end.', lose: 'The model depends on the shape of the Delta files and on avoiding the fallback. A view in the path or SQL security can slow it down.' },
          { t: 'Import mode with a scheduled refresh', d: 'Well understood. Fast, from memory, and independent of the layout of the files.', lose: 'A refresh that copies 40 million rows, a schedule to keep in step with the pipeline, and a copy of the data.' },
          { t: 'DirectQuery to the SQL endpoint', d: 'Always live.', lose: 'Every query goes to the endpoint, and the reports are slower.' }
        ],
        pick: 0,
        why: 'The gold table is made by a notebook and read by many reports, which suits a model that reads the files in place. Import is a fine answer when a team prefers it, or when the table cannot meet the Direct Lake rules. The choice is a measurement, not a rule, and this is from documentation.',
        when: 'A model with logic that Direct Lake does not support, or with data that is not in Delta, uses Import.'
      }),

      B.incident({
        id: 'm6-inc', t: 2, src: 'docs', title: 'Incident: the sales reports got ten times slower overnight', time: '08:10',
        alert: '**The sales reports took 2 seconds yesterday and take 20 today.** The gold tables are fine and the pipeline ran. Yesterday afternoon a colleague added **row-level security with SQL** on the gold tables in the Warehouse that the model uses.',
        clues: ['The model is Direct Lake on the SQL endpoint of a warehouse', 'A SQL security rule was added yesterday', 'The capacity is not throttled'],
        opts: [
          { t: 'Suspect a fallback to DirectQuery: remove the SQL security from the path and apply the rule in the model', fb: '' },
          { t: 'Double the capacity', fb: 'The capacity is not throttled, and the cause is not compute.' },
          { t: 'Run OPTIMIZE on the gold tables', fb: 'The files are not the problem.' },
          { t: 'Switch the model to Import without looking', fb: 'It may work, and you would not learn the cause.' }
        ],
        best: 0,
        why: 'The documentation says that a Direct Lake model built on the SQL endpoint can fall back to DirectQuery when the source uses SQL-based row-level security, and DirectQuery is slower. The timing of the change is the clue. This is from documentation, and I did not run it, so I would confirm in a tool that shows the storage mode.',
        checks: [
          ['Find the change', 'A SQL security rule was added yesterday.'],
          ['Read the rules', 'SQL security is a reason for the fallback.'],
          ['Confirm', 'Check the storage mode of the slow queries.'],
          ['Fix', 'Apply the rule in the model, or use another design for the access rule.']
        ],
        tell: 'Adding SQL row-level security to the warehouse tables most likely made the model fall back to DirectQuery, which is slower. I will confirm that in the query tools, move the rule into the model, and add a check for the storage mode to the release steps.',
        prevent: ['**Review** access changes for their effect on performance', '**Check** the storage mode of the important queries', '**Test** a model after any change to its sources']
      }),

      B.qa({
        id: 'qa-endpoint', t: 1, tag: 'Fabric', secs: 60,
        q: 'What is the SQL analytics endpoint?',
        pts: ['A T-SQL read path onto a lakehouse', 'Read-only', 'Synced metadata', 'Not a warehouse'],
        short: 'Every lakehouse in Fabric gets a **SQL analytics endpoint**, which lets people and tools query the Delta tables of the lakehouse with T-SQL. It is **read-only**: tables are created and changed by Spark notebooks or pipelines, not through the endpoint. It keeps its own metadata, synced from the lakehouse, so a new table can take a moment to show. A **Warehouse** is different: it is a T-SQL database in which people can write. I would use the endpoint to give SQL users and Power BI a read path onto silver and gold, and a warehouse for people who need to build tables. This is from documentation, which I read through summaries.',
        fu: [['Can it update a table?', 'No.'], ['How fresh is it?', 'It reads the same files, with a metadata sync. I would measure the delay.']],
        trap: 'Saying that the endpoint is a warehouse.',
        real: 'Say who reads your gold tables, and how.'
      }),

      B.qa({
        id: 'qa-directlake', t: 1, tag: 'Fabric', secs: 75,
        q: 'What is Direct Lake?',
        pts: ['A storage mode for Power BI models', 'Reads Delta files in OneLake, no copy', 'Loads columns into memory when asked', 'Framing pins a version, fallback to DirectQuery'],
        short: 'Direct Lake is a storage mode for a Power BI semantic model that reads **Delta tables in OneLake** directly. There is no import of the rows: the model is **framed** on a version of each table, and when a report asks for a column it loads that column from the Parquet files into memory and answers with the same engine as Import. A refresh frames the model again on the newest version. In some cases the model **falls back to DirectQuery** through the SQL endpoint, for example when the source is a view or uses SQL-based row-level security, and DirectQuery is slower. I would point the model at gold tables, not views, and check the storage mode. I ran the table side, a reader pinned to a version, and I know Direct Lake itself from documentation.',
        fu: [['Is it faster than Import?', 'The documentation says it normally performs like Import. Some writers disagree. Measure.'], ['What does framing mean?', 'Pinning the model to table versions.']],
        trap: 'Saying that it is always live.',
        real: 'Say how you would test a model for fallback.'
      }),

      B.qa({
        id: 'qa-t-sql', t: 2, tag: 'Fabric', secs: 60,
        q: 'What limits does a Fabric Warehouse have compared with SQL Server?',
        pts: ['A subset of T-SQL', 'No triggers', 'ALTER TABLE is limited', 'Read the surface area page'],
        short: 'The Fabric Warehouse supports a subset of the T-SQL of SQL Server, and the documentation has a page that lists the surface area. In what I read through search summaries, triggers are not supported, some other features such as hints, materialized views and recursive queries were listed as unsupported on the version of the page that I saw, ALTER TABLE is limited, and support for MERGE depended on the version of the page, so I would check the live page before I rely on any of these. In practice that means I do the audit and the row-level logic in the load, not in triggers, and I test a migrated script before I trust it. I did not run a Warehouse for this course.',
        fu: [['Where is the list?', 'The T-SQL surface area page of the documentation.'], ['Does CTAS work?', 'Yes, it is the usual way to build a table.']],
        trap: 'Assuming that SQL Server code runs unchanged.',
        real: 'Describe a script that you had to change for another SQL engine.'
      }),

      B.qa({
        id: 'qa-fallback', t: 2, tag: 'Fabric', secs: 60,
        q: 'A Direct Lake report suddenly became slow. What do you suspect?',
        pts: ['A fallback to DirectQuery', 'A view or SQL security in the path', 'Check the storage mode', 'Capacity throttling is another cause'],
        short: 'First I look at what changed. A Direct Lake model that reads through the SQL endpoint can fall back to DirectQuery, which is much slower, when its source is a view or the warehouse uses SQL-based row-level security, so a new view or security rule is my first suspect. I confirm with a tool that shows the storage mode of the queries. The fix is to point the model at tables and to put the access rule in the model. Then I check the capacity, because throttling slows interactive requests too, and the framing, because a model that was not framed again shows old data and not slow data. This is from documentation, and I did not run Direct Lake.',
        fu: [['Does it break the report?', 'No. It still works, more slowly.'], ['How do you prevent it?', 'Tables, not views, and a test after changes.']],
        trap: 'Adding capacity first.',
        real: 'Describe a slow report and what you found.'
      }),

      B.recap({
        id: 'm6-recap', n: 6, badge: 'SQL Bridge', color: '#99F6E4',
        pts: [
          'The **SQL analytics endpoint** reads lakehouse tables with T-SQL and is **read-only**. A **Warehouse** is where T-SQL writes tables.',
          'The Warehouse supports a **subset** of T-SQL. Triggers are not supported. Check the surface area page.',
          'The gold logic gave **' + GT.rows + '** rows and **' + n(GT.revenue) + '** of revenue on Spark. A T-SQL version should match.',
          '**Direct Lake** reads Delta files with no copy. **Framing** pins a version, and a refresh frames again. A reader pinned to version ' + GP.pinned_version + ' showed ' + GP.dates_pinned + ' while the latest showed ' + GP.dates_latest + '.',
          'A **fallback to DirectQuery** is slower. Views and SQL security are causes. Point models at tables.'
        ],
        lines: [
          'I can say what the endpoint can and cannot do.',
          'I can explain framing and the fallback.',
          'I can choose between Direct Lake and Import.'
        ]
      })
    ]
  });
})();
