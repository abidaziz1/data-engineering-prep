/* Mission 0: pick a path, see the whole picture, and learn what the tags mean. */
(function () {
  var B = LAB.b, G = LAB.get;
  var M = function (k) { return G.meta(k); };
  var L = G.counts('lake.landing');

  LAB.addChapter({
    id: 'm0', n: 0, noIntro: true, title: 'Start here', short: 'Start', blurb: 'Pick your path and see the whole picture', minutes: 7,
    scenes: [
      B.welcome({ id: 'welcome' }),

      B.flow({
        id: 'm0-map', t: 1, src: 'docs', title: 'A daily file on its way through a lakehouse', g: 'medallion', legend: true,
        steps: [
          { say: 'Brewline receives a file of orders every night. The team wants it in Microsoft Fabric, cleaned, merged and ready for a report by 06:00. This picture is the path of the whole course. Press Next.', focus: ['file', 'br', 'sv', 'go', 'rep', 'rej'], cap: 'A file on the left, a report on the right.' },
          { say: 'Step 1. The file lands in the **Files** area of a lakehouse, exactly as it came. Mission 2 opens the lakehouse and shows that Files and Tables are two different things.', on: ['e1'], focus: ['file', 'br'], cap: 'The file lands.' },
          { say: 'Step 2. A notebook appends the file to a **bronze** table. Every column stays text, so a bad value cannot stop the load. Missions 2 and 3.', on: ['e2'], focus: ['br', 'sv'], tags: ['tg_app'], cap: 'Bronze keeps the raw rows.' },
          { say: 'Step 3. The **silver** step gives the columns their types, sends the rows that cannot be loaded to a rejects table, and merges the rest by key. Run it twice and nothing changes. Mission 4.', on: ['e3'], focus: ['sv', 'go'], tags: ['tg_merge'], cap: 'Silver is typed and merged.' },
          { say: 'Step 4. The **gold** table has one row for each store and day. The report reads it. Missions 5 and 6 look after the tables and show who may read them, and with which engine.', on: ['e4'], focus: ['go', 'rep'], tags: ['tg_gold'], cap: 'Gold is what the report reads.' },
          { say: 'Step 5. Rows that cannot be loaded are kept, with the reason, and not dropped. Missions 7 and 8 schedule the whole path in a pipeline and watch the capacity that it runs on.', on: ['e5'], focus: ['sv', 'rej'], tags: ['tg_rej'], cap: 'Bad rows are kept.' }
        ]
      }),

      B.cmp({
        id: 'm0-levels', t: 1, src: 'docs', title: 'Junior or senior: what changes',
        say: 'You are asked about Fabric because a growing share of data engineering jobs name it, usually next to Spark and SQL. Press Next to read what is expected at each level.',
        cols: ['Area', 'A junior is expected to', 'A senior is expected to'],
        hl: 2,
        rows: [
          ['Platform', 'Say what a capacity, a workspace, an item and OneLake are.', 'Choose between a lakehouse, a warehouse and an eventhouse for a workload, and size and share a capacity.'],
          ['Tables', 'Know that a lakehouse table is a Delta table and read a PySpark notebook.', 'Explain the Delta log, time travel, VACUUM and what each one costs, and partition only when it pays.'],
          ['Loading', 'Land a file in bronze and clean it into silver.', 'Write a merge that is safe to repeat, route bad rows, and say what a replay out of order does.'],
          ['SQL', 'Query the SQL analytics endpoint with T-SQL.', 'Say what the endpoint and the Warehouse each allow, and when each one is the right place for a table.'],
          ['Pipelines', 'Run a notebook from a pipeline on a schedule.', 'Design retries, dependencies and a rerun that changes nothing, and know when a Dataflow Gen2 is the wrong tool.'],
          ['Power BI', 'Know that a report reads a semantic model.', 'Explain Direct Lake, framing and the fallback, and choose between Direct Lake and Import.'],
          ['Operations', 'Know that a capacity can be overloaded.', 'Read throttling, plan around smoothing, set workspace roles and ship a change through Git and a deployment pipeline.']
        ],
        steps: [
          { upto: 3, say: 'The first three rows are the tables and the loads. They are where most of a junior\'s work is, and the Delta behavior in them is recorded on real Spark and Delta Lake.' },
          { upto: 7, say: 'The last four rows are the platform around the tables. They carry most of the questions of a senior interview, and they are from documentation.' }
        ]
      }),

      B.talk({
        id: 'm0-how', t: 1, src: 'rec', title: 'How this course works',
        say: 'Five quick things before we start. Press Next for each.',
        items: [
          ['SEE, TRY, SAY', 'Every mission watches something work (**SEE**), makes you practise it (**TRY**), then asks the interview question out loud (**SAY**). Orange blocks in a diagram are data moving. Numbers show the order.', 'Watch first, practise second, speak third.'],
          ['Junior, Senior, Extra', 'A small tag on a screen tells you who it is for. No tag means everybody. **Senior** and **Extra** screens appear only on the wider paths.', 'The tag tells you whether a screen is on your path.'],
          ['Two kinds of screen', 'A **Recorded** tag means that I ran it on real Apache Spark and Delta Lake and wrote down what it printed and did. A **From documentation** tag means that I read it and did not run it. Most of what makes Fabric different from plain Spark is in the second group.', 'Recorded means run. From documentation means read.'],
          ['What ran', 'Apache Spark ' + M('spark') + ' with Delta Lake ' + M('delta') + ' on one machine, in a folder laid out like a lakehouse (a Files folder and a Tables folder), with made-up Brewline data: ' + G.n(L.total_rows) + ' lines in five daily files. The notebook code on the screens is the code that ran. Counts repeat when you run it again.', 'The notebook code is the code that ran.'],
          ['Where Fabric ends', 'Microsoft Fabric needs a Microsoft account and a capacity, so it did not run. Everything about the platform itself (the capacity, OneLake, the Warehouse, pipelines, Direct Lake, security, Git) is from documentation, and the documentation site could not be opened from where I built this. I read it through search summaries. The README lists every claim that you should check again.', 'Fabric itself is from documentation.']
        ],
        cols: 1
      }),

      B.cmp({
        id: 'm0-ran', t: 2, src: 'rec', title: 'What I ran, and what I did not',
        say: 'This is the exact setup behind every recorded screen. Press Next to read it.',
        cols: ['Part', 'What it was', 'Status'],
        hl: 1,
        rows: [
          ['Apache Spark and Delta Lake', 'Spark ' + M('spark') + ' and Delta Lake ' + M('delta') + ' (PySpark ' + M('pyspark') + ', Java ' + M('java') + '), two local cores, one machine', 'Run'],
          ['The lakehouse', 'A folder with Files/ and Tables/. Tables are Delta tables, and Spark SQL creates Delta tables by default, as it does in Fabric', 'Run, shaped like Fabric'],
          ['The notebook code', 'The five files of the project: tables, bronze, silver, gold and maintenance, run as they appear on the screens', 'Run'],
          ['Data', 'Five daily files of orders from fixed rules (no random numbers), with blank order ids, an amount that is not a number, orders that arrive twice and orders that change', 'Run'],
          ['Fabric runtime', 'Fabric offers runtimes with other Spark and Delta versions than the ones here. Features that arrived later, or that Fabric adds, can differ', 'Not run'],
          ['Capacity, OneLake, Warehouse, SQL analytics endpoint, pipelines, Direct Lake, Git, security', 'Everything that needs a Fabric workspace', 'Not run']
        ],
        steps: [
          { upto: 4, say: 'The first four rows ran. They are everything you need to see what a Delta table, a merge, a schema check, a vacuum and a restore do, which is the part of Fabric that you cannot get wrong.' },
          { upto: 6, say: 'The last two rows did not run. What I say about them comes from documentation. The README says which pages I could reach and which claims to check again.' }
        ]
      })
    ]
  });
})();
