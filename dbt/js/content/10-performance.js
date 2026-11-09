/* Mission 10: run time, cost, selectors in practice, and slow runs. */
(function () {
  var B = LAB.b, G = LAB.get;

  var SLOW = G.text('slowest_code');
  var SLOW_OUT = G.text('slowest_out').split('\n').filter(Boolean);
  var SEL = JSON.parse(G.text('selectors'));
  var nm = function (k) { return G.ls(k).filter(function (n, i, a) { return n.indexOf('source:') !== 0 && a.indexOf(n) === i; }); };

  LAB.addChapter({
    id: 'm10', n: 10, title: 'Run time, cost and selectors', short: 'Performance', blurb: 'Why a run is slow, and how to run only what you need', minutes: 28,
    focus: ['air'],
    goals: [
      'Say where the **time** in a dbt run goes, and what threads can and cannot fix.',
      'Find the **slowest models** from the run artifacts.',
      'Split work into **jobs** with tags and selectors, so each job runs only what it needs.',
      'Walk through a **slow run** like an investigation, not a guess.'
    ],
    say: 'Mission 10 is about the clock and the bill. A dbt run is a graph of SQL statements, and each one costs warehouse time. Speed comes from three things: slow statements, long chains and doing work nobody needed.',
    scenes: [
      B.talk({
        id: 'm10-talk', t: 1, title: 'Where the time goes',
        say: 'Five points. Press Next for each.',
        items: [
          ['One slow model usually dominates', 'In most projects a handful of models take most of the time, often the big joins and the largest incremental tables. Fixing the slowest one beats shaving a second off fifty others.', 'Measure first. The slowest model is rarely the one you guess.'],
          ['The longest chain sets the floor', 'Models run in parallel only when they do not depend on each other. A chain of five models that each wait for the previous one cannot be shortened by threads.', 'Threads cannot shorten a chain.'],
          ['Threads share one warehouse', 'The thread count says how many statements dbt sends at once. The warehouse must run them. With too many, statements queue in the warehouse and nothing gets faster.', 'More threads need more warehouse.'],
          ['Tests cost compute', 'Each test is a query. Hundreds of tests on large tables can cost as much as the models themselves. Put tests where they protect something, and limit them to recent data when you can.', 'Every test has a price.'],
          ['The cheapest work is the work you skip', 'Select only what changed, use incremental models for big tables, and give fast-changing and slow-changing models different jobs.', 'Run less, then run faster.']
        ],
        cols: 1
      }),

      B.widget({ id: 'm10-threads', t: 1, kind: 'threads', title: 'Lab: threads and the longest chain' }),

      B.code({
        id: 'm10-slow', t: 1, title: 'Find the slowest models', file: 'slowest.py', lang: 'python', code: SLOW,
        steps: [
          { say: 'Every dbt run writes run_results.json in the target folder. It lists each node with its status and its execution time. This short script reads it. Press Next.', lines: null },
          { say: 'Load the results list from the file that dbt wrote at the end of the last run.', lines: G.span(SLOW, /^import json/, /^r = /) },
          { say: 'Sort by execution time, largest first, keep three, and print the time and the unique id of each node.', lines: G.span(SLOW, /^for x in sorted/, /print\(/) }
        ],
        note: 'The real output from the first Brewline build is on the next screen. Times are tiny because DuckDB is tiny. On a warehouse the same script finds the minutes.'
      }),

      B.term({
        id: 'm10-slowrun', t: 1, title: 'The three slowest nodes',
        say: 'Here is what the script printed after the Brewline build. Even here, the ranking is not what you might guess.',
        lines: function () {
          var out = [{ c: 'cmd', t: '$ python slowest.py', d: 350 }];
          SLOW_OUT.forEach(function (l) { out.push({ c: 'out', t: l, d: 160 }); });
          return out;
        },
        after: 'Not every entry is a model. The list includes **unit tests** and **data tests**, which are nodes too. When you search for slow things, filter on the type of the node in the unique id, then look at the models.',
        afterKind: 'tip',
        doneSay: 'A tiny script, a real answer. Sort by time, then look at what is on top.'
      }),

      B.cmp({
        id: 'm10-run', t: 1, title: 'Run less: what each selector builds',
        say: 'These are real results from `dbt ls`. Press Next to compare the ways to run only a part of the project.',
        cols: ['You want', 'Selector', 'It builds'],
        hl: 1,
        rows: [
          ['One model', '`' + SEL.model + '`', nm('model').join(', ')],
          ['A model and what it needs', '`' + SEL.up + '`', nm('up').join(', ')],
          ['A model and what depends on it', '`' + SEL.down + '`', nm('down').join(', ')],
          ['Everything with a tag', '`' + SEL.tag_daily + '`', nm('tag_daily').join(', ')],
          ['Everything personal', '`' + SEL.tag_pii + '`', nm('tag_pii').join(', ')],
          ['One folder', '`' + SEL.path_core + '`', nm('path_core').join(', ')],
          ['Only what changed (CI)', '`state:modified+ --state <folder>`', 'Compares your code with the last production manifest. Mission 11.']
        ],
        steps: [
          { upto: 3, say: 'Select by name and by graph position. This is what you use while developing.' },
          { upto: 6, say: 'Select by tag and by folder. This is how teams define jobs: a job is a selector.' },
          { upto: 7, say: 'And select by change. This is what makes pull request builds fast.' }
        ],
        pick: 'Treat selectors as the definition of your jobs. A tag such as `daily` or `hourly` is easy to review and to change, and `dbt ls` proves what a job will run before it costs anything.'
      }),

      B.cmp({
        id: 'm10-causes', t: 2, title: 'Slow run: symptom, likely cause, first move',
        say: 'Press Next for each symptom. The first move is always a measurement.',
        cols: ['Symptom', 'Likely cause', 'First move'],
        hl: 2,
        rows: [
          ['One model takes most of the time', 'A heavy join or aggregation, or a table that outgrew a full rebuild', 'Open the warehouse query profile for that statement. Consider an incremental model or an intermediate table.'],
          ['Many small models, long total, low warehouse use', 'Threads set too low, or a long dependency chain', 'Raise threads, and look at the chain in the lineage graph.'],
          ['Models are fast but statements wait', 'Too many threads for the warehouse, so statements queue', 'Check queueing in the warehouse. Lower threads or use a larger or multi-cluster warehouse.'],
          ['Tests take as long as the models', 'Heavy tests on large tables, tests on every column', 'Rank tests by time. Limit them with the where setting, or run heavy ones less often.'],
          ['Nothing runs for a minute at the start', 'Parsing a very large project', 'Keep partial parsing on, and look at the opt-in faster parser in recent releases.']
        ],
        steps: [
          { upto: 2, say: 'Slow work or too little parallelism: the two most common cases.' },
          { upto: 4, say: 'Queueing and tests: both are about asking the warehouse for too much at once.' },
          { upto: 5, say: 'And a slow start, before any SQL runs, is about parsing, not the warehouse.' }
        ],
        pick: 'Do not change a setting before you have the numbers. Read `run_results.json` for the order and the time, and the warehouse history for queueing. The fix usually becomes obvious.'
      }),

      B.quiz({
        id: 'm10-q1', t: 1,
        q: 'You raise `threads` from 4 to 32 and the build barely gets faster. What is the most likely reason?',
        opts: [
          { t: 'The longest chain of dependent models, or the warehouse, is the limit', fb: '' },
          { t: 'dbt ignores threads above 16', fb: 'There is no such cap. The limit is somewhere else.' },
          { t: 'The tests cannot run in parallel', fb: 'Tests run in parallel like models.' },
          { t: 'Threads only affect parsing', fb: 'Threads set how many nodes run at once.' }
        ],
        ok: 0, why: 'Threads let independent nodes run side by side, but a model must still wait for its parents, so the longest chain is the minimum time. And the warehouse must have the capacity to run the statements together. In the thread lab, four threads already reached the longest chain, and eight did no better.'
      }),

      B.quiz({
        id: 'm10-q2', t: 1,
        q: 'Where do you find how long each model took in the last run?',
        opts: [
          { t: 'In `target/run_results.json`, which lists every node and its execution time', fb: '' },
          { t: 'In `dbt_project.yml`', fb: 'That file holds settings, not results.' },
          { t: 'In the profiles file', fb: 'That holds connection settings.' },
          { t: 'Only in the warehouse, dbt keeps no timing', fb: 'dbt writes timing for every node.' }
        ],
        ok: 0, why: 'dbt writes `run_results.json` at the end of each command. Many teams load it into a table after every run, so they can chart model times and spot a model that got slower.'
      }),

      B.incident({
        id: 'm10-inc', t: 2, title: 'Incident: the nightly build takes 70 minutes instead of 25', time: '07:30',
        alert: 'The nightly production build finished at 04:10, not 02:25. Dashboards were stale at 07:00. Nothing failed. Every test passed.',
        clues: ['No code was merged this week', 'Warehouse credits for the transform warehouse went up about 60 percent', 'The run started on time'],
        opts: [
          { t: 'Compare run_results.json from last night and a normal night, node by node', fb: '' },
          { t: 'Double the thread count', fb: 'You do not yet know the cause. If one model is the problem, threads will not help.' },
          { t: 'Make every model incremental', fb: 'A big change on a guess. Most models are fine.' },
          { t: 'Wait one more night to see if it repeats', fb: 'Dashboards are already stale, and the evidence is available now.' }
        ],
        best: 0,
        why: 'No code changed, so the **data or the warehouse** changed. Comparing node times tells you which model grew. That narrows the investigation from 600 models to one or two.',
        checks: [
          ['Rank the nodes by time', 'Sort last night\'s run_results by execution time and compare with a normal night. Look for the model that grew the most.'],
          ['Check the input', 'Row counts of the sources behind that model. A loader sending duplicates or a one-off backfill can multiply the size.'],
          ['Check the warehouse', 'Queueing and size in query history. Another job may have shared the same warehouse that night.'],
          ['Read the query profile', 'Look at the slow statement: rows in and out at each join, spilling to disk, partitions scanned.'],
          ['Decide the fix', 'A filter on the model, an incremental rewrite, a bigger warehouse for that job, or a fix upstream.']
        ],
        tell: 'The nightly build took 70 minutes instead of 25 although no code changed. I compared the node timings with a normal night and found that one fact model had grown from four minutes to 45. A loader had sent a day of duplicate rows, which multiplied a join. I asked for the duplicates to be removed, deduplicated the staging model, and the build was back to 26 minutes the next night.',
        prevent: ['Load **run_results** into a table and **chart the top 10 nodes** over time', 'Alert when a node is **twice** as slow as its 7-day median', 'Add a **row count test** on the sources behind the heaviest joins', 'Give the transform job its **own warehouse**, so other work cannot slow it']
      }),

      B.decide({
        id: 'm10-dec', t: 2, title: 'Decision: one job, or jobs by freshness?',
        scenario: 'The project has **600 models**. The sales dashboards need fresh data **every hour**. About **70 percent** of the models feed reports that are read once a day. A full `dbt build` takes **50 minutes**, and the warehouse bill is growing.',
        opts: [
          { t: 'Run the full build every hour', d: 'Simple. Everything is always fresh.', lose: 'It runs 50 minutes of an hour, costs the most, and leaves no gap for a retry. Most of the work is for data nobody needs hourly.' },
          { t: 'Split into jobs by freshness with tags', d: 'An hourly job runs the tagged models and what they need. A nightly job runs the rest.' },
          { t: 'Make all 600 models faster first', d: 'The cleanest long-term answer.', lose: 'It takes months, and it does nothing about the hourly bill this week. Do it in parallel, not instead.' }
        ],
        pick: 1,
        why: 'The requirement is hourly freshness for **some** models. A tag such as `hourly`, with the graph operator (`tag:hourly+` or the parents with a leading plus), builds exactly those and their dependencies. The rest run once at night. You cut the hourly run to a few minutes and the cost with it.',
        when: 'If almost everything is needed hourly, tags buy little: tune the slowest models and the warehouse instead. If a few models are very slow, make them incremental.'
      }),

      B.qa({
        id: 'qa-slow', t: 1, tag: 'Operations', secs: 75,
        q: 'A dbt run got slower. How do you find out why?',
        pts: ['Measure first: run_results.json gives the time per node', 'Compare with a normal run to see which node changed', 'Check the data: row counts of the sources behind the slow node', 'Check the warehouse: queueing, size, other jobs', 'Read the query profile of the slow statement', 'Fix the cause, then add a guard: alert on node times'],
        short: 'I measure before I touch a setting. dbt writes run_results.json after every run with the execution time of each node. I sort it and compare it with a run from a normal day, node by node. Usually one or two models account for the change.\n\nThen I ask why those models grew. If no code changed, the data did: a loader sent duplicates, a backfill landed, or a join started multiplying rows. I check the row counts of the sources behind the slow model. I also check the warehouse history, because statements may be queueing behind another job, or the warehouse may be too small for the new size.\n\nFor the slow statement itself I read the query profile: where rows jump, whether the join spills, how many partitions are scanned. Then I fix the cause: a better filter, an incremental rewrite, a repaired source, or a bigger warehouse for that job only. Finally I add a guard so I find out sooner next time, such as an alert when a node takes twice its usual time.',
        fu: [
          ['How many threads do you set?', 'Enough to cover the parallel branches, without queueing in the warehouse. I check queueing before I raise it.'],
          ['What is a cheap quick win?', 'Making a heavy, rarely changing model incremental, or splitting a long job so the fast part does not wait for the slow part.']
        ],
        trap: 'Starting with "increase the warehouse size". Without numbers it is a guess, and it hides the real cause.',
        real: 'Give a case where you found the slow model, how big the difference was, and the fix.'
      }),

      B.qa({
        id: 'qa-jobs', t: 2, tag: 'Operations', secs: 75,
        q: 'How do you decide what to run, how often, and with which command?',
        pts: ['Start from freshness requirements per consumer', 'Tag models by cadence and define jobs as selectors', 'dbt build in production, so tests protect the children', 'Separate jobs for source freshness, models and docs', 'Keep heavy and light work on different warehouses or schedules', 'Check selectors with dbt ls before scheduling them'],
        short: 'I start from what each consumer needs. A dashboard that must be fresh every hour gets its models tagged hourly, and a report read at nine each morning gets nightly. A job is then just a selector: the hourly job builds the hourly tag plus its parents, and the nightly job builds the rest. I verify each selector with dbt ls before it goes on a schedule.\n\nIn production I use dbt build, not run and test separately, so tests sit between a model and its children and a bad table does not spread. I run source freshness as its own, short job, because it should alert even when nothing builds. I regenerate the docs on a schedule or on merge.\n\nI keep heavy and light work apart, either on different schedules or on different warehouses, so a slow nightly rebuild cannot delay the hourly dashboards. And I look at the run results every week for the slowest nodes, because jobs drift as data grows.',
        fu: [
          ['How do you avoid running a job twice at the same time?', 'Make the scheduler wait for the previous run, or use a lock. Overlapping runs of the same incremental model can duplicate or lose rows.'],
          ['Would you ever run only tests on a schedule?', 'Yes, for expensive checks on large tables. Run them less often than the models, and alert on failure.']
        ],
        trap: 'Answering with one cron line. The expected answer starts from who needs the data and when.',
        real: 'Describe your job layout: how many jobs, their selectors, and their run times.'
      }),

      B.recap({
        id: 'm10-recap', n: 10, badge: 'Run Tuner', color: '#BAE6FD',
        pts: [
          'A few models usually dominate the **time**. Measure with `run_results.json`.',
          'The **longest chain** sets the floor. Threads help only up to that limit and the warehouse size.',
          '**Tests** cost compute too. Put them where they protect something.',
          'A **job is a selector**. Tag by cadence and check it with `dbt ls`.',
          'In a slow run: **measure, compare with a normal run, check data and warehouse**, then fix.'
        ],
        lines: [
          'I measure before I change a setting.',
          'I split jobs by how fresh each consumer needs the data.',
          'I alert when a node takes twice its usual time.'
        ]
      })
    ]
  });
})();
