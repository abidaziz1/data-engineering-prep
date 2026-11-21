/* Mission 1: the map of Fabric. A capacity, workspaces, items and OneLake. Everything on these screens is from documentation. */
(function () {
  var B = LAB.b, G = LAB.get;

  LAB.addChapter({
    id: 'm1', n: 1, title: 'The map of Fabric', short: 'The map', blurb: 'Capacity, workspace, items and OneLake', minutes: 20,
    focus: ['src', 'stg'],
    goals: [
      'Say what a **capacity**, a **workspace**, an **item** and **OneLake** are.',
      'Choose between a **lakehouse**, a **warehouse** and an **eventhouse** for a workload.',
      'Say what a capacity size gives you in **Spark cores**.',
      'Name the first thing to check when everyone on a capacity is slow.'
    ],
    say: 'Fabric is one product that puts many tools behind one login and one storage layer. Before any notebook, you need the map: who pays for the compute, where the people and the items live, and where the data is. This mission is all from documentation, so every screen carries that tag. The other missions show what the tables do.',
    scenes: [
      B.flow({
        id: 'm1-flow', t: 1, src: 'docs', title: 'A capacity, a workspace, items and OneLake', g: 'platform', legend: true,
        steps: [
          { say: 'Brewline has one Fabric setup. This is how its parts relate. Press Next.', focus: ['cap', 'ws', 'lh', 'wh', 'pl', 'ol'], cap: 'Compute on the left, data on the right.' },
          { say: 'Step 1. A **capacity** is the compute that the organization buys, in sizes called F2, F4, F8 and up to F2048. The number is the **capacity units** (CU). Every job of every item on it takes units from the same pool.', on: ['e1'], focus: ['cap', 'ws'], tags: ['tg_share'], cap: 'A capacity is bought.' },
          { say: 'Step 2. A **workspace** is assigned to one capacity. It holds the items and says who may see them. Brewline has one workspace for the data engineers and one for the report authors.', on: ['e2'], focus: ['ws', 'lh'], cap: 'A workspace holds items.' },
          { say: 'Step 3. A **lakehouse** is an item. It has a Files area, a Tables area of Delta tables, and a SQL endpoint that reads the tables with T-SQL. Notebooks use Spark to write to it.', on: ['e2'], focus: ['lh'], cap: 'A lakehouse is an item.' },
          { say: 'Step 4. A **warehouse** is another item, a T-SQL database whose tables are also Delta files. A **pipeline** is an item that runs other items in an order.', on: ['e3', 'e4'], focus: ['wh', 'pl'], cap: 'Warehouse and pipeline.' },
          { say: 'Step 5. Every table of every item is stored in **OneLake** as Delta files. Mission 2 opens one. That is why a notebook, the SQL endpoint and Power BI can read the same table without a copy.', on: ['e5', 'e6'], focus: ['lh', 'wh', 'ol'], tags: ['tg_one'], cap: 'One copy of every table.' }
        ]
      }),

      B.cmp({
        id: 'm1-items', t: 1, src: 'docs', title: 'The items that a data engineer meets',
        say: 'These are the items that come up in jobs and interviews. Press Next to go through them.',
        cols: ['Item', 'What it is', 'You write it with', 'Typical use'],
        hl: 0,
        rows: [
          ['Lakehouse', 'Files and Delta tables in OneLake, plus a read-only SQL endpoint', 'Spark notebooks, pipelines, Dataflow Gen2', 'Bronze, silver and gold tables'],
          ['Warehouse', 'A T-SQL database with Delta tables', 'T-SQL, pipelines, Dataflow Gen2', 'Governed tables for SQL users'],
          ['Notebook', 'Code (PySpark, Spark SQL, Scala, R) that runs on a Spark session', 'Python and SQL', 'Cleaning, merging, maintenance'],
          ['Data pipeline', 'A graph of activities with schedules, parameters and retries', 'The pipeline editor', 'Running notebooks in order each night'],
          ['Dataflow Gen2', 'Power Query transformations that write to a destination', 'Power Query', 'Small and medium loads by analysts'],
          ['Eventstream and eventhouse', 'Streaming ingestion and a store for event data queried with KQL', 'The editor, KQL', 'Telemetry and live feeds'],
          ['Semantic model and report', 'The Power BI model and the pages that read it', 'DAX, Power BI', 'What the business sees']
        ],
        steps: [
          { upto: 3, say: 'The first three are where your tables and your code live. A lakehouse and a warehouse hold tables, and a notebook runs the code that fills them.' },
          { upto: 5, say: 'The next two move and shape data without you writing much code: a pipeline runs things in order, and a Dataflow Gen2 is Power Query for people who think in Excel steps.' },
          { upto: 7, say: 'The last two are for live data and for the business. Mission 7 touches the first, and mission 6 the second.' }
        ]
      }),

      B.talk({
        id: 'm1-capacity', t: 1, src: 'docs', title: 'What a capacity is',
        say: 'The capacity is the part that surprises people, because it is shared. Press Next for each point.',
        items: [
          ['Shared by every item', 'A capacity is a pool of **capacity units**. Notebooks, queries, pipeline runs and report refreshes in every workspace assigned to it take units from the same pool.', 'One pool, many users.'],
          ['The size is a number', 'F2 has 2 units, F64 has 64. The name is the size: there is no smaller and no larger version of the same thing. Capacities can be bought for a short time or a long one, and a trial exists.', 'The number is the units.'],
          ['Units turn into cores', 'In the documentation, **one capacity unit is two Spark cores**, and a capacity can burst to **three times** as many for a while. An F64 gives 128 cores, and up to 384 with bursting.', 'One unit is two cores.'],
          ['Running out has a rule', 'A capacity that uses more than it has does not fail at once. It borrows from the future and pays back later (smoothing), and then throttling starts in steps. Mission 8 has a lab for it.', 'Overuse is borrowed, then throttled.']
        ],
        cols: 1
      }),

      B.cmp({
        id: 'm1-sizes', t: 2, src: 'docs', title: 'What a size gives you in Spark cores',
        say: 'Here is the arithmetic of the documented rule, for four sizes. The numbers in the last two columns are mine: units times two, and that times three. Press Next.',
        cols: ['Size', 'Capacity units', 'Spark cores', 'With bursting (3 times)'],
        hl: 2,
        rows: [['F2', '2', '4', '12'], ['F8', '8', '16', '48'], ['F64', '64', '128', '384'], ['F256', '256', '512', '1,536']],
        steps: [
          { upto: 2, say: 'A small capacity has few cores, and a few people running notebooks at the same time use them all. Sessions then queue.' },
          { upto: 4, say: 'The cores grow in step with the units. Bursting lets a big job use more for a while, and it is paid back through smoothing, so it is not free.' }
        ]
      }),

      B.cmp({
        id: 'm1-choose', t: 1, src: 'docs', title: 'Lakehouse, warehouse or eventhouse',
        say: 'The first design question in a Fabric project is where a table lives. Press Next to read the guidance.',
        cols: ['If the work is', 'Lean to', 'Because'],
        hl: 1,
        rows: [
          ['Files of any shape, Spark, exploration, medallion layers', 'Lakehouse', 'Notebooks write to it and it keeps raw files next to tables'],
          ['Governed tables, T-SQL development, SQL users who write data', 'Warehouse', 'It is a T-SQL database with the full write path'],
          ['Events, logs and telemetry that are queried by time', 'Eventhouse', 'It is built for streaming ingestion and KQL'],
          ['A table that a SQL user only needs to read', 'Lakehouse and its SQL endpoint', 'The endpoint reads Delta tables with T-SQL and cannot change them']
        ],
        steps: [
          { upto: 2, say: 'The first two rows are the common choice. Documentation suggests a lakehouse for big data processing and exploration, and a warehouse for governed, high-performance SQL work.' },
          { upto: 4, say: 'The last two are the cases that people forget. Events want an eventhouse, and a read-only SQL user does not need a warehouse at all.' }
        ]
      }),

      B.quiz({
        id: 'm1-q1', t: 1, src: 'docs',
        q: 'What do a notebook, the SQL analytics endpoint and a Power BI model have in common in Fabric?',
        opts: [
          { t: 'They can all read the same Delta table in OneLake', fb: '' },
          { t: 'They all need their own copy of the data', fb: 'The point of OneLake is one copy that several engines read.' },
          { t: 'They all write tables with T-SQL', fb: 'A notebook uses Spark, and the SQL endpoint of a lakehouse cannot write.' },
          { t: 'They all run on the same Spark session', fb: 'Only the notebook uses Spark.' }
        ],
        ok: 0, why: 'Tables of a lakehouse or a warehouse are stored as Delta files in OneLake, and each engine reads those files. Mission 6 comes back to this.'
      }),

      B.quiz({
        id: 'm1-q2', t: 1, src: 'docs',
        q: 'Your team buys an F64 capacity. Which statement is right?',
        opts: [
          { t: 'Every workspace that is assigned to it shares its 64 capacity units', fb: '' },
          { t: 'Each workspace gets 64 capacity units of its own', fb: 'The pool is shared, which is why one heavy notebook can slow a report.' },
          { t: 'The 64 is the number of users who may sign in', fb: 'The size is compute, not seats.' },
          { t: 'It stores 64 TB of data', fb: 'Storage is OneLake and is not what the size measures.' }
        ],
        ok: 0, why: 'A capacity is a pool of compute. Sharing it is the reason that capacity monitoring is part of the job.'
      }),

      B.quiz({
        id: 'm1-q3', t: 1, src: 'docs',
        q: 'Where is the data of a Warehouse table stored?',
        opts: [
          { t: 'As Delta files in OneLake', fb: '' },
          { t: 'In a hidden SQL Server database file', fb: 'Documentation describes Warehouse tables as Delta files in OneLake.' },
          { t: 'Only in memory', fb: 'Memory is a cache and not the storage.' },
          { t: 'In the Files area of a lakehouse', fb: 'Files is for files of any shape. The Warehouse has its own table storage in OneLake.' }
        ],
        ok: 0, why: 'This is the design that lets a model, a notebook and a SQL endpoint share tables. The Warehouse still has its own rules for who may write to them.'
      }),

      B.order({
        id: 'm1-ord', t: 1, src: 'docs', q: 'Put the parts in order, from the one you buy to the one you query.',
        items: ['A capacity is bought and sized', 'A workspace is assigned to the capacity', 'An item such as a lakehouse is created in the workspace', 'A table is written into the item', 'A report or a query reads the table'],
        why: 'Compute is the capacity, people and items live in a workspace, and the data is a table of an item. Everything above the table shares the capacity.'
      }),

      B.decide({
        id: 'm1-dec', t: 2, src: 'docs', title: 'Decision: where should the Brewline orders tables live?',
        scenario: 'A team of four data engineers who know PySpark and SQL load files every night and build silver and gold tables. A group of eight analysts writes T-SQL against the gold tables and wants to create tables of their own for experiments.',
        opts: [
          { t: 'The engineers use a lakehouse for bronze, silver and gold. The analysts query gold through its SQL endpoint and keep their own tables in a warehouse', d: 'Each group works in the tool it knows. Gold is stored once, and the analysts\' experiments do not touch the layers of the engineers.', lose: 'Two items to govern, and the analysts\' tables are separate from gold until someone joins them in T-SQL across the two.' },
          { t: 'Everything in one warehouse', d: 'One T-SQL place for everybody.', lose: 'The engineers lose the files area and the notebook workflow that fits the medallion layers.' },
          { t: 'Everything in one lakehouse, analysts write through the endpoint', d: 'One item.', lose: 'The endpoint of a lakehouse is read-only, so the analysts cannot create tables there.' }
        ],
        pick: 0,
        why: 'The deciding fact is the read-only SQL endpoint. Analysts who must write tables need a warehouse, and engineers who work with files and notebooks need a lakehouse. Both read the same OneLake.',
        when: 'A team with no analysts who write tables can start with a lakehouse alone.'
      }),

      B.incident({
        id: 'm1-inc', t: 2, src: 'docs', title: 'Incident: everything is slow on Monday morning', time: '08:50',
        alert: '**Reports in three workspaces are slow, a notebook session takes minutes to start, and a pipeline of the finance team failed.** None of the three teams changed anything. All three workspaces are assigned to one F64 capacity.',
        clues: ['The three workspaces share one capacity', 'A large refresh and a data science notebook were scheduled for 08:00', 'No item shows an error of its own'],
        opts: [
          { t: 'Open the capacity metrics for the capacity and look for the jobs that used the most units and for throttling', fb: '' },
          { t: 'Restart the three reports', fb: 'The reports are not the cause. They are waiting for a shared pool.' },
          { t: 'Add more users to each workspace', fb: 'More users add more load.' },
          { t: 'Delete the slowest notebook', fb: 'You do not yet know that it is the cause, and deleting an item is not reversible.' }
        ],
        best: 0,
        why: 'When unrelated items slow down together, look at what they share, which is the capacity. The metrics show which jobs used the units and whether throttling started. The fix can be to move a heavy job, to schedule it away from the peak, or to size the capacity up.',
        checks: [
          ['Find what they share', 'Three teams, three workspaces, one capacity.'],
          ['Open the capacity metrics', 'Look at the units used by job and at throttling.'],
          ['Find the heavy jobs', 'A refresh and a notebook that start together.'],
          ['Choose the fix', 'Move a job, spread the schedule, or size up the capacity.']
        ],
        tell: 'Three workspaces share one capacity, and two heavy jobs started together at 08:00 and used its units, so everything else slowed. I will move the data science notebook to the afternoon and watch the metrics for a week before we decide to size up.',
        prevent: ['**Schedule** heavy jobs away from the morning peak', '**Watch** the capacity metrics and alert on throttling', 'Keep **development** and **production** on different capacities']
      }),

      B.qa({
        id: 'qa-what', t: 1, tag: 'Fabric', secs: 60,
        q: 'What is Microsoft Fabric, in one minute?',
        pts: ['One platform: data engineering, warehousing, real-time, Power BI', 'OneLake: one copy of data as Delta', 'A shared capacity pays for the compute', 'Workspaces hold items'],
        short: 'Fabric is Microsoft\'s data platform in one product. It brings data engineering with Spark, a T-SQL warehouse, real-time analytics, pipelines and Power BI behind one sign-in and one storage layer called **OneLake**. Tables are stored as **Delta** files there, so a notebook, a SQL query and a report can read the same table without a copy. People work in **workspaces**, which hold **items** such as lakehouses, warehouses and pipelines, and the compute is a shared **capacity** that the organization buys in sizes such as F2 or F64. I have worked with the table behavior on real Spark and Delta Lake, and I know the platform from its documentation.',
        fu: [['Is it new Spark?', 'Fabric Spark is Apache Spark with Microsoft\'s runtime. The tables are Delta.'], ['What replaced Synapse?', 'Fabric is the successor in direction. Check the current guidance for migration.']],
        trap: 'Listing every item without saying how they share storage and compute.',
        real: 'Say what you built on it, or what you would build first.'
      }),

      B.qa({
        id: 'qa-lakewh', t: 1, tag: 'Fabric', secs: 75,
        q: 'Lakehouse or warehouse: how do you choose?',
        pts: ['Lakehouse: Spark, files, medallion', 'Warehouse: T-SQL with writes, governed', 'Both are Delta in OneLake', 'The lakehouse SQL endpoint is read-only'],
        short: 'Both store tables as Delta files in OneLake, so the choice is about how people work. A **lakehouse** fits Spark notebooks, raw files and the bronze, silver and gold layers. It also exposes a **SQL analytics endpoint**, which reads its tables with T-SQL and cannot change them. A **warehouse** is a T-SQL database where people can create tables and write with SQL, and it fits governed, SQL-first work. For Brewline I would put the medallion layers in a lakehouse, let analysts query gold through the endpoint, and give analysts who need to create tables a warehouse of their own. If nobody writes tables with T-SQL, a lakehouse is enough.',
        fu: [['Can you query across them?', 'Yes, within the same workspace, with a three-part name in T-SQL. From documentation.'], ['Which one is faster?', 'It depends on the workload. I would measure on real data.']],
        trap: 'Saying that one is simply better.',
        real: 'Describe a table that you would put in each.'
      }),

      B.qa({
        id: 'qa-capacity', t: 1, tag: 'Fabric', secs: 60,
        q: 'What is a capacity, and why does it matter to a data engineer?',
        pts: ['The pool of compute that items share', 'F-sizes: the number is capacity units', 'One unit is two Spark cores', 'Overuse is smoothed, then throttled'],
        short: 'A capacity is the compute that the organization buys, in sizes called F2, F4 and so on up to F2048. The number is the **capacity units**, and every notebook, query, pipeline run and refresh in every workspace on that capacity takes units from the same pool. In the documentation one unit equals two Spark cores, and a capacity can burst to three times as many. If the work asks for more than the capacity has, it borrows from the future and pays back later, and when the debt grows throttling starts: delay for interactive work, then rejection. So I schedule heavy jobs away from peak, keep development apart from production, and watch the capacity metrics.',
        fu: [['What is smoothing?', 'Spreading the cost of a job over time. Background work is spread over 24 hours.'], ['Can you pause one?', 'F capacities are Azure resources and can be paused and resized. From documentation, check the current rules.']],
        trap: 'Treating the capacity as a per-workspace limit.',
        real: 'Say how you would find the job that used the most.'
      }),

      B.recap({
        id: 'm1-recap', n: 1, badge: 'Map Reader', color: '#CCFBF1',
        pts: [
          'A **capacity** is shared compute, sized F2 to F2048. The number is the capacity units.',
          'A **workspace** holds **items**: lakehouses, warehouses, notebooks, pipelines, models.',
          'Every table is **Delta in OneLake**, so a notebook, T-SQL and Power BI read one copy.',
          'One unit is **two Spark cores**, and bursting allows three times as many. From documentation.',
          'When unrelated things are slow together, check what they **share**: the capacity.'
        ],
        lines: [
          'I can name the parts and how they relate.',
          'I know that the capacity is shared.',
          'I can choose between a lakehouse and a warehouse.'
        ]
      })
    ]
  });
})();
