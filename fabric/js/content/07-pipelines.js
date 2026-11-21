/* Mission 7: pipelines and real-time data. Pipelines, Dataflows Gen2 and Real-Time Intelligence are from documentation. The retry experiment on a landing step ran on real Delta Lake. */
(function () {
  var B = LAB.b, G = LAB.get;
  var C = G.counts, X = G.text, n = G.n;
  var RT = C('bronze.retry');
  var ONCE = G.file('01b_land_once.py');
  G.expect(RT.plain_rows_after_two_runs === 2 * RT.rows_in_file && RT.once_rows_after_three_runs === RT.rows_in_file && RT.plain_distinct_lines === RT.rows_in_file, 'a retried plain append doubles the rows of a file, and replacing the rows of the file does not');

  LAB.addChapter({
    id: 'm7', n: 7, title: 'Pipelines and real-time data', short: 'Pipelines', blurb: 'Run the notebooks in order, retry safely, and know when data should be real-time', minutes: 24,
    focus: ['qual', 'mon'],
    goals: [
      'Describe a **pipeline**: activities, parameters, schedules, retries and dependencies.',
      'Make a step **safe to retry**, and show it with numbers.',
      'Choose between a **notebook**, a **Dataflow Gen2** and a **Copy** activity.',
      'Say when **real-time** tools are the right answer.'
    ],
    say: 'A notebook does one job. A pipeline runs the jobs in order, on time, with a retry when something fails. The platform parts of this mission are from documentation, and I mark them. What is recorded is the part that decides whether a pipeline is safe: what a retry does to a landing step, with numbers from real Delta Lake.',
    scenes: [
      B.flow({
        id: 'm7-flow', t: 1, src: 'docs', title: 'The nightly pipeline of Brewline', g: 'pipeline', legend: true,
        steps: [
          { say: 'One pipeline runs the three notebooks of the medallion path every night. Press Next.', focus: ['trg', 'p', 'n1', 'n2', 'n3', 'al'], cap: 'A schedule, a pipeline, three notebooks and an alert.' },
          { say: 'Step 1. A **schedule** starts the pipeline at 02:00. A schedule is one way to start a pipeline, and the documentation also describes triggers that react to events.', on: ['e1'], focus: ['trg', 'p'], cap: 'A schedule starts it.' },
          { say: 'Step 2. The pipeline has a **parameter**, the day to load. The pipeline passes it to each notebook, so a rerun of yesterday is a run with another value, not a change of code.', on: ['e2'], focus: ['p', 'n1'], tags: ['tg_dep'], cap: 'A parameter carries the day.' },
          { say: 'Step 3. The notebooks run **in order**, and each one starts only when the one before it **succeeded**. Bronze, then silver, then gold.', on: ['e3', 'e4'], focus: ['n1', 'n2', 'n3'], cap: 'In order, on success.' },
          { say: 'Step 4. If a step fails after its **retries**, an **alert** goes to a person. A retry is only safe when the step is safe to repeat, which the recorded part of this mission shows.', on: ['e5'], focus: ['n2', 'al'], tags: ['tg_retry', 'tg_idem'], cap: 'A failure is reported.' }
        ]
      }),

      B.cmp({
        id: 'm7-activities', t: 1, src: 'docs', title: 'The activities that a data engineer uses',
        say: 'A pipeline is a graph of activities. These are the ones that come up. Press Next.',
        cols: ['Activity', 'What it does', 'Typical use'],
        hl: 0,
        rows: [
          ['Copy data', 'Moves data from a source to a destination', 'Landing files from a source into the lakehouse'],
          ['Notebook', 'Runs a notebook, with parameters', 'Bronze, silver and gold steps'],
          ['Dataflow', 'Runs a Dataflow Gen2', 'A Power Query transformation by an analyst'],
          ['Stored procedure', 'Runs a procedure in a warehouse', 'A T-SQL step in the Warehouse'],
          ['ForEach and If', 'Loops and branches', 'One run for each store, or a different path on a condition'],
          ['Web and alerts', 'Calls a web endpoint', 'A message to a chat or a ticket system on failure']
        ],
        steps: [
          { upto: 3, say: 'The first three move and transform data. A notebook is the one that holds your logic.' },
          { upto: 6, say: 'The rest decide **what runs next** and **who hears about a failure**. They are small, and they are where many production pipelines are weak.' }
        ]
      }),

      B.talk({
        id: 'm7-settings', t: 1, src: 'docs', title: 'Retries, timeouts and what runs next',
        say: 'Four settings decide what a pipeline does when a step is slow or fails. Press Next for each.',
        items: [
          ['Retry', 'Each activity can be set to **retry** a number of times, with a **wait** between tries. It is useful for a step that fails because of a short problem such as a busy capacity. It is harmful for a step that is not safe to repeat.', 'A retry is a repeat.'],
          ['Timeout', 'An activity has a **timeout**, so that a step that hangs does not hold the pipeline and the capacity for hours. Set it to a little more than the longest normal run.', 'A step that hangs costs capacity.'],
          ['Dependencies', 'An arrow between activities carries a **condition**: on success, on fail, on completion or on skip. Alert activities hang on the **fail** arrow of the step that they watch.', 'Success, fail, completion, skip.'],
          ['Parameters', 'A pipeline takes **parameters** such as the day, and passes them to the notebooks. A run for yesterday then needs no edit. A notebook that takes the date from the clock cannot be rerun for another day.', 'Pass the day in. Do not read the clock.']
        ],
        cols: 1
      }),

      B.cmp({
        id: 'm7-deps', t: 2, src: 'docs', title: 'What the arrows do when silver fails',
        say: 'The third notebook hangs on the arrow from the second one. Here is what each kind of arrow does when the second notebook fails. This is my reading of the documented conditions. Press Next.',
        cols: ['Arrow from silver to gold', 'Silver succeeded', 'Silver failed', 'What it is for'],
        hl: 0,
        rows: [
          ['On success', 'Gold runs', 'Gold is skipped', 'The normal chain'],
          ['On fail', 'Gold is skipped', 'Gold runs', 'A step that handles a failure, such as an alert'],
          ['On completion', 'Gold runs', 'Gold runs', 'A step that must run either way, such as cleanup'],
          ['On skip', 'Gold is skipped', 'Gold is skipped', 'Rarely used']
        ],
        steps: [
          { upto: 2, say: 'The first row is what you want for gold: do not build a report table from a silver that failed. The second row is how an alert is wired.' },
          { upto: 4, say: 'Be careful with **on completion** for a data step. It runs gold on a failed silver, and the report then shows yesterday\'s data as today\'s.' }
        ]
      }),

      B.term({
        id: 'm7-retry', t: 1, src: 'rec', title: 'A retry of the landing step',
        say: 'The pipeline retries a notebook that fails halfway. I ran the landing step of the day 5 file twice, as a retry does, into two copies of the table.',
        lines: function () {
          return G.term([
            ['land("2026-03-05", "bronze_retry")   # the first run, and then the retry', 'rows in the file: ' + n(RT.rows_in_file)],
            ['SELECT count(*) FROM bronze_retry;', String(RT.plain_rows_after_two_runs)],
            ['SELECT count(*) FROM (SELECT DISTINCT * FROM bronze_retry);', String(RT.plain_distinct_lines)]
          ]);
        },
        after: 'The file has **' + n(RT.rows_in_file) + '** lines, and after the retry the table holds **' + n(RT.plain_rows_after_two_runs) + '**: every line twice, and only ' + n(RT.plain_distinct_lines) + ' different ones. The retry did exactly what it was told. The landing step was **not safe to repeat**. Silver can absorb the duplicates with `dropDuplicates`, but a bronze table with doubled lines is a poor record of what arrived.',
        afterKind: 'warn',
        doneSay: 'A retry of a plain append doubles the rows.'
      }),

      B.code({
        id: 'm7-once', t: 2, src: 'rec', title: 'A landing step that is safe to repeat', file: '01b_land_once.py', lang: 'python', code: ONCE,
        steps: [
          { say: 'Another cell of the notebook, with the same read as before. Only the write changes. Press Next.', lines: null },
          { say: 'The read is the same: a header, no type inference, and the source file as a column.', lines: G.span(ONCE, /df = \(/, /withColumn\("_source_file"/) },
          { say: '`mode("overwrite")` with **`replaceWhere`** replaces only the rows that match a condition, here the rows of **this source file**. The rows of the other files are untouched.', lines: G.span(ONCE, /df\.write\.format/, /saveAsTable/) },
          { say: 'The first run adds the rows, and a second run **replaces them with the same rows**. The table is the same after one run and after ten.', lines: G.span(ONCE, /replaceWhere/) }
        ],
        note: 'In the recording the table had ' + n(RT.once_rows_after_three_runs) + ' rows after three runs of the same file. It does make a new version each time, with the same rows.'
      }),

      B.term({
        id: 'm7-once-run', t: 2, src: 'rec', title: 'Three runs, one file',
        say: 'I ran `land_once` three times for the same file and counted the rows.',
        lines: function () {
          return G.term([
            ['land_once("2026-03-05", "bronze_once")   # three times', 'rows in the file: ' + n(RT.rows_in_file)],
            ['SELECT count(*) FROM bronze_once;', String(RT.once_rows_after_three_runs)],
            ['DESCRIBE HISTORY bronze_once;   -- operations', RT.once_operations.join(', ')]
          ]);
        },
        after: 'The table holds **' + n(RT.once_rows_after_three_runs) + '** rows after three runs: the lines of the file, once. The history shows **' + RT.once_operations.length + '** commits, all `' + RT.once_operations[0] + '`, one for each run, each with the same rows. A retry is now harmless, and a person can rerun a day without thinking about it.',
        afterKind: 'tip',
        doneSay: 'Replace the rows of the file, and a retry is harmless.'
      }),

      B.bug({
        id: 'm7-bug', t: 1, q: 'The pipeline failed on Tuesday night. On Wednesday morning someone reruns it, and the table now has two copies of Wednesday and none of Tuesday. Click the line that causes it.',
        file: 'bronze_notebook.py', lang: 'python',
        code: 'import datetime\n\nday = datetime.date.today().isoformat()      # the night job\nland(day)\n',
        bad: [3],
        hint: 'Which date does a rerun on Wednesday use?',
        why: 'The notebook takes the day from the **clock**, so a rerun on Wednesday loads Wednesday\'s file, and Tuesday is never loaded. A day that is a **parameter** of the pipeline can be set to Tuesday for the rerun, with no edit of the code. Combine it with a landing step that is safe to repeat, and a rerun of any day is harmless.',
        fix: '# "day" is a parameter cell: the pipeline passes it in, and a rerun passes another value\nday = "2026-03-02"\nland_once(day)\n',
        cheer: 'Pass the day in.'
      }),

      B.cmp({
        id: 'm7-tools', t: 1, src: 'docs', title: 'Notebook, Dataflow Gen2 or Copy activity',
        say: 'Three tools can move and shape data in Fabric. Press Next to compare them.',
        cols: ['', 'Copy activity', 'Dataflow Gen2', 'Notebook'],
        hl: 3,
        rows: [
          ['What you write', 'Settings of a source and a destination', 'Power Query steps in a visual editor', 'Code: PySpark or Spark SQL'],
          ['Good for', 'Moving files and tables, as they are', 'Analysts shaping small and medium data', 'Merges, conditions, tests, anything with logic'],
          ['Merges with a condition', 'No', 'Limited', 'Yes, as in mission 4'],
          ['Review and test', 'Review the settings', 'Harder to diff and test', 'A text file: a diff, a unit test'],
          ['Watch for', 'It copies. It does not clean', 'Size, and capacity cost for large data', 'You own the code']
        ],
        steps: [
          { upto: 2, say: 'Copy moves, Dataflow Gen2 shapes, and a notebook decides. Brewline\'s silver step is a decision about rows, so it is a notebook.' },
          { upto: 5, say: 'A notebook is the one that you can review and test like any code. That is why the logic that matters sits there, and a pipeline only orders it.' }
        ]
      }),

      B.talk({
        id: 'm7-rt', t: 2, src: 'docs', title: 'Real-time data in Fabric',
        say: 'Some data cannot wait for the night. Fabric has a family of tools for it. Press Next for each point.',
        items: [
          ['Eventstream', 'An **Eventstream** brings events from a source such as a message broker or an application into Fabric, and can route them to a destination.', 'Events come in.'],
          ['Eventhouse and KQL', 'An **Eventhouse** stores event data for queries by time. You query it with **KQL**, the Kusto query language, which reads like a pipeline of steps.', 'Store and query by time.'],
          ['Activator', 'An **Activator** watches data and acts when a condition holds, for example by sending a message.', 'Act on a condition.'],
          ['When to use it', 'Use it when the value of the data falls fast with age: telemetry, a live feed, an alert. A daily batch is cheaper and simpler when the report is read once a day.', 'Real-time costs more. Ask who needs it.']
        ],
        cols: 1
      }),

      B.code({
        id: 'm7-kql', t: 2, src: 'docs', title: 'A KQL query, as a sketch', file: 'orders_live.kql', lang: 'text',
        code: 'Orders\n| where Timestamp > ago(1h)\n| summarize orders = count(), revenue = sum(Amount) by bin(Timestamp, 5m), StoreId\n| order by Timestamp asc\n',
        steps: [
          { say: 'This KQL was **not run**. I wrote it from my knowledge of the language, as a sketch of what an eventhouse query looks like. Press Next.', lines: null },
          { say: 'A query starts with a **table** and passes it through steps joined by the `|` sign.', lines: [1, 2] },
          { say: '`summarize` groups and counts. `bin(Timestamp, 5m)` rounds a time down to five minutes, so the result has one row for each store and five minutes.', lines: [3, 3] },
          { say: '`order by` sorts the result. Read it top to bottom, as a pipeline.', lines: [4, 4] }
        ],
        note: 'No KQL engine ran for this course. Check the syntax against the documentation before you use it.'
      }),

      B.quiz({
        id: 'm7-q1', t: 1,
        q: 'A pipeline retries a landing notebook that does a plain append. What happens in the recording after one retry of a file of 2,040 lines?',
        opts: [
          { t: 'The table holds ' + n(RT.plain_rows_after_two_runs) + ' rows: every line twice', fb: '' },
          { t: 'The table holds 2,040 rows, because Delta ignores repeated lines', fb: 'Delta does not know that the lines are the same.' },
          { t: 'The retry fails because the data exists', fb: 'An append does not check.' },
          { t: 'The table is empty', fb: 'Nothing deletes rows.' }
        ],
        ok: 0, why: 'A retry repeats the step, and the step appends. `replaceWhere` on the source file made three runs leave ' + n(RT.once_rows_after_three_runs) + ' rows.'
      }),

      B.quiz({
        id: 'm7-q2', t: 1, src: 'docs',
        q: 'Which arrow would you use for an alert that must fire when silver fails?',
        opts: [
          { t: 'On fail', fb: '' },
          { t: 'On success', fb: 'The alert would only fire when nothing failed.' },
          { t: 'On skip', fb: 'It fires when the step was skipped.' },
          { t: 'None: alerts are sent by the notebook', fb: 'A notebook that crashed cannot send a message.' }
        ],
        ok: 0, why: 'An alert hangs on the fail arrow of the step that it watches. Some teams also add an alert on completion for a daily summary.'
      }),

      B.quiz({
        id: 'm7-q3', t: 1, src: 'docs',
        q: 'Why should a notebook receive the day as a parameter instead of reading the clock?',
        opts: [
          { t: 'So that a rerun of an earlier day needs no change of code', fb: '' },
          { t: 'Because notebooks cannot read the clock', fb: 'They can.' },
          { t: 'To make the notebook faster', fb: 'The speed does not change.' },
          { t: 'Because the pipeline needs a parameter to start', fb: 'A pipeline can run without parameters.' }
        ],
        ok: 0, why: 'A parameter makes a rerun of any day possible. A date from the clock always loads today.'
      }),

      B.order({
        id: 'm7-ord', t: 2, src: 'docs', q: 'Put the parts of a safe nightly pipeline in order.',
        items: ['A schedule starts the pipeline with the day as a parameter', 'The landing notebook replaces the rows of that day\'s file', 'The silver notebook merges the day by key with a condition', 'The gold notebook rebuilds the report table', 'On a failure after the retries, an alert goes to a person'],
        why: 'Each step is safe to repeat, so the retry is safe. The order protects gold from a failed silver, and the alert makes a failure visible.'
      }),

      B.decide({
        id: 'm7-dec', t: 2, src: 'docs', title: 'Decision: which tool builds the silver step?',
        scenario: 'The silver step types the columns, routes bad lines, and merges by key with a condition. The team has two engineers who write PySpark and four analysts who know Power Query. The step must be reviewed and tested.',
        opts: [
          { t: 'A notebook, run from the pipeline with the day as a parameter', d: 'The logic is code in a file: reviewed, tested and versioned. The merge with a condition is a first-class operation.', lose: 'The analysts cannot change it without help from the two engineers.' },
          { t: 'A Dataflow Gen2 built by the analysts', d: 'The analysts own it and can change it.', lose: 'The merge with a condition and the routing of bad lines are limited, and the steps are harder to review and test.' },
          { t: 'A Copy activity into silver', d: 'No code.', lose: 'It copies. It does not type, route or merge by a condition.' }
        ],
        pick: 0,
        why: 'The step is a decision about rows, with a merge condition and a rejects table. A notebook is the tool that does that and that a team can review. The analysts keep a place where they work, for example the shaping of gold tables with a Dataflow, if the team agrees.',
        when: 'A small, low-risk shaping step owned by analysts can be a Dataflow Gen2.'
      }),

      B.incident({
        id: 'm7-inc', t: 2, src: 'rec', title: 'Incident: the bronze table has every line twice', time: '04:30',
        alert: '**Bronze holds twice as many lines for yesterday as the file has.** The pipeline log shows that the landing notebook failed at 02:14 on a later cell, and that the retry at 02:19 succeeded.',
        clues: ['The landing notebook appends the file with `mode("append")`', 'The first run wrote its rows before it failed', 'The activity is set to retry once'],
        opts: [
          { t: 'Make the landing step replace the rows of its source file, and clean the doubled lines for yesterday', fb: '' },
          { t: 'Remove the retry from the pipeline', fb: 'The retry is useful for short problems. The step must be safe to repeat.' },
          { t: 'Delete the whole bronze table and reload everything', fb: 'It works, and it is a large and risky step for one day.' },
          { t: 'Ignore it, because silver removes duplicates', fb: 'Silver does absorb them, and bronze is no longer the record of what arrived.' }
        ],
        best: 0,
        why: 'The recording: the same file landed twice by plain append gave **' + n(RT.plain_rows_after_two_runs) + '** lines for a file of **' + n(RT.rows_in_file) + '**. With `replaceWhere` on the source file, three runs left **' + n(RT.once_rows_after_three_runs) + '**. Fix the step, then repair the day with the same replace.',
        checks: [
          ['Compare counts', 'Lines of the file against lines in bronze for that file.'],
          ['Read the pipeline log', 'A failure after the append, then a retry.'],
          ['Fix the step', 'Replace the rows of the file instead of appending.'],
          ['Repair the day', 'Run the fixed step for the day.']
        ],
        tell: 'The landing notebook failed after it had appended its rows, and the retry appended them again, so yesterday has every line twice. I changed the step to replace the rows of its source file, repaired the day with it, and added a check that bronze has as many lines as the file.',
        prevent: ['Make every step **safe to repeat** before you add a retry', '**Check** the lines in bronze against the file', '**Pass the day** in as a parameter']
      }),

      B.qa({
        id: 'qa-pipeline', t: 1, tag: 'Fabric', secs: 75,
        q: 'How do you design a nightly pipeline in Fabric?',
        pts: ['A schedule, a parameter for the day', 'Notebooks in order, on success', 'Retries only for steps that are safe to repeat', 'An alert on failure'],
        short: 'One pipeline with a **schedule** and a **parameter** for the day. It runs the landing, silver and gold notebooks in order, each on the **success** of the one before, so gold is never built from a failed silver. Each activity has a **timeout** and a **retry**, and an alert activity hangs on the **fail** arrow. The part that matters is that each step is **safe to repeat**: in my recording a retry of a plain append doubled the lines of a file, and replacing the rows of the source file kept it at one copy, and the silver merge with a condition changed nothing on a repeat. The pipeline itself is from documentation, and the notebooks ran on real Spark and Delta.',
        fu: [['Where does the logic live?', 'In notebooks, which can be reviewed and tested.'], ['How do you rerun a day?', 'Run the pipeline with that day as the parameter.']],
        trap: 'Adding a retry to a step that is not safe to repeat.',
        real: 'Describe a pipeline failure that you recovered from.'
      }),

      B.qa({
        id: 'qa-retry', t: 1, tag: 'Fabric', secs: 60,
        q: 'When is a retry dangerous?',
        pts: ['When the step is not safe to repeat', 'A plain append doubles data', 'Idempotent steps: merge, replaceWhere', 'Test by running twice'],
        short: 'A retry repeats the step, so it is dangerous when the step is not safe to repeat. A plain append is the usual example: in my recording the same file appended twice gave 4,080 lines for a file of 2,040. The fix is to make the step idempotent. For landing I replace the rows of the source file with `replaceWhere`, and for silver I merge by key with a condition, so that a repeat changes no row. I test this by running the step twice and comparing the counts. With steps like that a retry is a safe answer to a short failure such as a busy capacity, and without them it turns one failure into two problems.',
        fu: [['How many retries?', 'One or two, with a wait. More hides a real failure.'], ['What about a half-finished step?', 'A Delta commit is all or nothing, so a failed write leaves no partial rows.']],
        trap: 'Retrying everything by default.',
        real: 'Say how you tested a step for repeats.'
      }),

      B.qa({
        id: 'qa-dataflow', t: 1, tag: 'Fabric', secs: 60,
        q: 'Dataflow Gen2, notebook or Copy activity: how do you choose?',
        pts: ['Copy: move data as it is', 'Dataflow Gen2: Power Query for analysts', 'Notebook: logic, merges, tests', 'Who maintains it, and how it is reviewed'],
        short: 'I choose by what the step does and who maintains it. A **Copy activity** moves data from a source to a destination as it is, so it fits landing files. A **Dataflow Gen2** is Power Query in a visual editor, which fits shaping by analysts of small and medium data. A **notebook** holds code, so it fits a step with logic such as typing, routing bad lines and merging by key with a condition, and it can be reviewed and tested like any code. For Brewline the silver step is a decision about rows, so it is a notebook, and the pipeline only orders the steps. This is from documentation, and the notebook version is the one I ran.',
        fu: [['Can they be mixed?', 'Yes, in a pipeline.'], ['What about cost?', 'All three use the capacity. Large Dataflows can be costly.']],
        trap: 'Using a Dataflow for logic that needs tests.',
        real: 'Say which tool your team uses for the main load, and why.'
      }),

      B.qa({
        id: 'qa-realtime', t: 2, tag: 'Fabric', secs: 60,
        q: 'When would you use real-time tools instead of a daily batch?',
        pts: ['Data loses value quickly', 'Eventstream, eventhouse, KQL, activator', 'More cost and more moving parts', 'Ask who acts on it, and how fast'],
        short: 'When the value of the data falls fast with age: telemetry, a live feed, or an alert that someone must act on within minutes. Fabric has an Eventstream to bring events in, an Eventhouse that stores them for queries by time with KQL, and an Activator that acts when a condition holds. They cost more and add parts to run, so I first ask who acts on the data and how fast. If the report is read once a day, a nightly batch is simpler and cheaper, and the pipeline of this course is that. This is from documentation, and I did not run the real-time tools.',
        fu: [['What about streaming in Spark?', 'Spark can stream into Delta too. It is another option.'], ['How do you join live data with gold?', 'Through shortcuts or by landing both in OneLake. Check the options.']],
        trap: 'Choosing real-time because it sounds modern.',
        real: 'Describe a feed that really needed to be live.'
      }),

      B.recap({
        id: 'm7-recap', n: 7, badge: 'Pipeline Owner', color: '#99F6E4',
        pts: [
          'A pipeline has a **schedule**, **parameters**, activities in order, **retries**, **timeouts** and an **alert** on the fail arrow.',
          'A retry of a plain append gave **' + n(RT.plain_rows_after_two_runs) + '** lines for a file of **' + n(RT.rows_in_file) + '**. `replaceWhere` kept **' + n(RT.once_rows_after_three_runs) + '** after three runs.',
          'Pass the **day** in as a parameter. Do not read the clock.',
          'A **notebook** holds logic. A **Dataflow Gen2** shapes data for analysts. A **Copy** activity moves it.',
          '**Real-time** tools (Eventstream, eventhouse, KQL, activator) fit data that loses value fast. Ask who acts on it.'
        ],
        lines: [
          'I can design a pipeline and say what each setting does.',
          'I make every step safe to repeat before I add a retry.',
          'I can choose between the three tools.'
        ]
      })
    ]
  });
})();
