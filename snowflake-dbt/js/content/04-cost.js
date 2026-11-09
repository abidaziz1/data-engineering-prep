/* Mission 4: warehouses, credits and finding the model that spends them. */
(function () {
  var B = LAB.b, G = LAB.get;
  var CC = LAB.W.costCalc;

  var COMMENT = G.comment('incr_merge', /^merge into/);
  var EMPTY = G.stmt('empty_run', /^create or replace view/);
  var ON = (CC.billedSeconds(300, 30, 600) / 3600).toFixed(1), OFF = (CC.billedSeconds(300, 30, 60) / 3600).toFixed(1);
  var SMALL = CC.perRunCredits('S', 40 * 60), LARGE = CC.perRunCredits('L', 12 * 60);
  G.expect(/"node_id": "model\.brewline\.fct_orders"/.test(COMMENT), 'the query comment carries the node id');
  G.expect(/where false limit 0/.test(EMPTY), 'dbt run --empty reads no rows from the source');
  G.expect(G.conns('parse_only') === 0, 'dbt parse opens no connection');
  G.expect(G.stmts('compile_one').every(function (s) { return s.kind === 'meta'; }), 'dbt compile sends only metadata statements here');

  var WH = [
    "create warehouse if not exists WH_TRANSFORM",
    "    warehouse_size = 'MEDIUM'",
    "    auto_suspend = 60",
    "    auto_resume = true",
    "    initially_suspended = true",
    "    comment = 'Nightly dbt build';",
    "",
    "create warehouse if not exists WH_TRANSFORM_DEV",
    "    warehouse_size = 'XSMALL'",
    "    auto_suspend = 60",
    "    auto_resume = true",
    "    initially_suspended = true",
    "    comment = 'dbt runs by developers';",
    "",
    "create warehouse if not exists WH_CI",
    "    warehouse_size = 'XSMALL'",
    "    auto_suspend = 60",
    "    auto_resume = true",
    "    initially_suspended = true",
    "    comment = 'Pull request checks';",
    "",
    "create warehouse if not exists WH_BI",
    "    warehouse_size = 'SMALL'",
    "    auto_suspend = 300",
    "    auto_resume = true",
    "    initially_suspended = true",
    "    comment = 'Dashboards and analysts';"
  ].join('\n');
  var BUGWH = [
    "create warehouse if not exists WH_TRANSFORM",
    "    warehouse_size = 'MEDIUM'",
    "    auto_suspend = 3600",
    "    auto_resume = true",
    "    initially_suspended = true",
    "    comment = 'Nightly dbt build';"
  ].join('\n');
  var BUGWHFIX = BUGWH.replace('auto_suspend = 3600', 'auto_suspend = 60');
  var HIST = [
    "select",
    "    regexp_substr(query_text, '\"node_id\": \"([^\"]+)\"', 1, 1, 'e', 1) as node_id,",
    "    warehouse_name,",
    "    warehouse_size,",
    "    count(*) as statements,",
    "    round(sum(total_elapsed_time) / 1000 / 60, 1) as minutes,",
    "    round(sum(bytes_scanned) / power(1024, 3), 1) as gb_scanned",
    "from snowflake.account_usage.query_history",
    "where start_time >= dateadd(day, -7, current_timestamp())",
    "    and query_text like '%\"app\": \"dbt\"%'",
    "group by 1, 2, 3",
    "order by minutes desc",
    "limit 20;"
  ].join('\n');
  var RM = [
    "create resource monitor RM_TRANSFORM",
    "    with credit_quota = 200",
    "    frequency = monthly",
    "    start_timestamp = immediately",
    "    triggers",
    "        on 80 percent do notify",
    "        on 100 percent do suspend;",
    "",
    "alter warehouse WH_TRANSFORM set resource_monitor = RM_TRANSFORM;"
  ].join('\n');

  LAB.addChapter({
    id: 'm4', n: 4, title: 'Warehouses and cost', short: 'Cost', blurb: 'Credits, sizes, auto-suspend and finding the model that spends them', minutes: 34,
    focus: ['air', 'mon'],
    goals: [
      'Explain how a warehouse **bills**: credits an hour by size, per second, with a 60 second minimum.',
      'Choose a **size** and an **auto-suspend** for dbt runs, and defend the choice with numbers.',
      'Say what **threads** do on Snowflake, and when more of them stop helping.',
      'Find the model that spends the credits, using the **query comment** and **query tags**.'
    ],
    say: 'Mission 4 is about money. A dbt run costs nothing while it sits in your editor. Every statement that reaches a warehouse costs credits, and a senior engineer is expected to say how many, why, and how to make it fewer.',
    scenes: [
      B.talk({
        id: 'm4-talk', t: 1, title: 'How a warehouse bills',
        say: 'A virtual warehouse is the compute that runs your statements. Press Next for the four facts that explain almost every bill. The numbers come from Snowflake\'s documentation, and the price per credit is an example.',
        items: [
          ['Credits, not dollars', 'A running warehouse uses **credits**. An X-Small uses 1 credit an hour. Every size up doubles it: Small 2, Medium 4, Large 8, X-Large 16. What a credit costs depends on your contract. This course uses $3 as an example.', 'Each size doubles the rate.'],
          ['Per second, at least 60', 'Billing counts seconds, but each time a warehouse resumes it bills at least **60 seconds**. A 20 second run on a suspended warehouse is billed as 60 seconds.', 'Short bursts cost more than they look.'],
          ['Running means billed', 'A warehouse bills from the moment it resumes until it suspends. That includes the idle time before auto-suspend. Auto-suspend decides how long the idle time lasts.', 'Idle time is paid time.'],
          ['Metadata needs no warehouse', 'SHOW, DESCRIBE and creating a view do not need a running warehouse. A table build, a merge and a test do. The first lines of every dbt run are free for that reason.', 'Only real work wakes the warehouse.'],
          ['Some commands never connect', 'In the recordings, `dbt parse` opened ' + G.conns('parse_only') + ' connections. `dbt compile` of one model opened ' + G.conns('compile_one') + ' and sent a single SHOW. Run them freely, and in CI before any build.', 'Parse and compile are close to free.']
        ],
        cols: 2
      }),

      B.widget({ id: 'm4-calc', t: 1, kind: 'cost', title: 'Lab: what does a run cost?' }),

      B.code({
        id: 'm4-wh', t: 1, title: 'The four Brewline warehouses', file: 'setup.sql (written by hand, not recorded)', lang: 'sql', code: WH,
        steps: [
          { say: 'This is how the course sets up compute: one warehouse for each kind of work. Press Next.', lines: null },
          { say: 'The nightly build gets a Medium warehouse. It is sized for the work, and it suspends after 60 seconds of idle time.', lines: G.span(WH, /WH_TRANSFORM$/, /Nightly dbt build/) },
          { say: 'Developers share a small warehouse. They run a few models at a time, so size matters less than a short auto-suspend.', lines: G.span(WH, /WH_TRANSFORM_DEV/, /dbt runs by developers/) },
          { say: 'Pull request checks get their own, so a busy day of reviews never slows the nightly build and never hides in its bill.', lines: G.span(WH, /WH_CI/, /Pull request checks/) },
          { say: 'Dashboards and analysts get a fourth. It waits 5 minutes before suspending, because people ask follow-up questions and the warehouse keeps its local cache while it stays on.', lines: G.span(WH, /WH_BI/, /Dashboards and analysts/) }
        ],
        note: '`initially_suspended` stops a new warehouse from running at creation. `auto_resume` wakes it when a statement arrives. Both are the safe defaults for a transformation warehouse.'
      }),

      B.quiz({
        id: 'm4-q1', t: 1,
        q: 'A nightly build takes **40 minutes** on a Small warehouse (2 credits an hour). On a Large warehouse (8 credits an hour) it takes **12 minutes**. Which costs less?',
        opts: [
          { t: 'Small: ' + SMALL.toFixed(2) + ' credits, against ' + LARGE.toFixed(2) + ' on Large', fb: '' },
          { t: 'Large: it is faster, so it must be cheaper', fb: 'Large costs ' + LARGE.toFixed(2) + ' credits. Faster does not mean cheaper when the size rate is four times higher.' },
          { t: 'They cost the same, because credits depend on the data', fb: 'Credits depend on the size and the time the warehouse runs.' },
          { t: 'Large, because the 60 second minimum is smaller', fb: 'The minimum applies to both. It does not matter for runs of this length.' }
        ],
        ok: 0, why: 'Credits are the rate times the time. Small: 2 x 40/60 = ' + SMALL.toFixed(2) + '. Large: 8 x 12/60 = ' + LARGE.toFixed(2) + '. Here the query gets 3.3 times faster on a warehouse four times as big, so you pay more to finish 28 minutes sooner. Whether that is worth it depends on the deadline.'
      }),

      B.quiz({
        id: 'm4-q2', t: 1,
        q: 'A job runs every **5 minutes** and each run takes **30 seconds**. The warehouse has an auto-suspend of **600 seconds**. What is wrong?',
        opts: [
          { t: 'Nothing. The warehouse suspends between runs', fb: 'It would need 600 idle seconds, and it only gets 270.' },
          { t: 'The warehouse never suspends, so it bills around the clock', fb: '' },
          { t: 'Each run is billed as 60 seconds, so use 30 second runs', fb: 'The 60 second minimum applies only when the warehouse resumes. Here it never suspends.' },
          { t: 'Auto-suspend must be longer than the run', fb: 'The longer it is, the more idle time you pay for.' }
        ],
        ok: 1, why: 'After a run ends there are 270 idle seconds before the next one, which is less than 600, so the warehouse never suspends. The lab model puts it on for about ' + ON + ' hours a day. With an auto-suspend of 60 seconds it is on for about ' + OFF + ' hours.'
      }),

      B.code({
        id: 'm4-comment', t: 1, title: 'Every statement carries a label', file: 'query comment on the merge, as recorded', lang: 'json', code: COMMENT,
        steps: [
          { say: 'dbt adds a comment to the end of every statement it sends. This one was on the merge into fct_orders. Press Next.', lines: null },
          { say: 'The comment says the statement came from dbt, which version, and which profile and target.', lines: G.span(COMMENT, /"app"/, /"target_name"/) },
          { say: 'And it names the model that sent the statement. This is the line that lets you tie cost to a model.', lines: G.span(COMMENT, /"node_id"/, /"node_id"/) }
        ],
        note: 'Snowflake keeps the statement text, comment included, in its query history. A query that groups by the node id gives you time and bytes scanned per model.'
      }),

      B.code({
        id: 'm4-hist', t: 2, title: 'Find the models that spend the most', file: 'written by hand, not recorded', lang: 'sql', code: HIST,
        steps: [
          { say: 'Here is a query on the account usage views. It pulls the node id out of the query comment and adds up time and bytes scanned for the last 7 days. Press Next.', lines: null },
          { say: 'The regular expression reads the model name from the comment that dbt writes.', lines: G.span(HIST, /regexp_substr/, /regexp_substr/) },
          { say: 'The size of the warehouse tells you the rate. Minutes of runtime times the rate gives a rough ranking of credits.', lines: G.span(HIST, /warehouse_name/, /gb_scanned/) },
          { say: 'The filter keeps statements that dbt sent. Sort by minutes and the top of the list is where to look first.', lines: G.span(HIST, /^from snowflake/, /^order by/) }
        ],
        note: 'This ranks time, and time is not credits. Two queries that overlap on one warehouse share the credits, and the account usage views lag the real events by up to about 45 minutes. Use the ranking to choose where to look, then measure the model on its own.'
      }),

      B.talk({
        id: 'm4-threads', t: 2, title: 'Threads and the warehouse queue',
        say: 'The threads setting is easy to misread on Snowflake. Press Next for four facts.',
        items: [
          ['One thread, one session', 'Each thread opens its own Snowflake session and runs one statement at a time. In the recorded dev run, `threads: 4` meant ' + G.conns('run_all_dev') + ' connections.', 'Threads are sessions.'],
          ['The warehouse runs a limited number at once', 'A warehouse runs a limited number of statements at once, and the rest wait in a queue. The default limit is 8 per cluster, according to Snowflake\'s documentation.', 'Past the limit, statements queue.'],
          ['More threads is not faster', 'If the graph has 3 independent branches, a fourth thread has nothing to run. If the warehouse is already full, an extra thread only joins the queue. The longest chain of models sets the minimum time.', 'The graph and the warehouse set the limit.'],
          ['Size makes each statement faster', 'A larger warehouse speeds up each statement. A multi-cluster warehouse, on higher editions, adds clusters for concurrency. Pick by the problem: slow statements need size, many waiting statements need clusters.', 'Size for speed, clusters for crowds.']
        ],
        cols: 2
      }),

      B.code({
        id: 'm4-empty', t: 1, title: 'A run that reads no data', file: 'dbt run --empty, as recorded', lang: 'sql', code: EMPTY,
        steps: [
          { say: 'The `--empty` flag runs your models against empty inputs. I recorded it on the orders staging view. Press Next.', lines: null },
          { say: 'dbt replaced the source with a query that returns no rows: `where false limit 0`.', lines: G.span(EMPTY, /where false limit 0/, /where false limit 0/) },
          { say: 'Snowflake still checks the whole model: names, types and syntax. But no table is read, so the run is cheap.', lines: G.span(EMPTY, /^latest as/, /^from latest/) }
        ],
        note: 'This is a cheap first check for a pull request. It proves the SQL compiles on Snowflake. It does not test the data, so it does not replace the tests.'
      }),

      B.cmp({
        id: 'm4-levers', t: 1, title: 'Five ways to spend less',
        say: 'Here are the levers, in the order I would pull them. Press Next to read each one.',
        cols: ['Lever', 'What it changes', 'Where you set it', 'Watch out for'],
        hl: 1,
        rows: [
          ['Short auto-suspend', 'Idle time you pay for', 'The warehouse: `auto_suspend = 60`', 'A cold cache after each suspend'],
          ['Right-sized warehouse', 'Credits an hour', 'The profile, or `snowflake_warehouse` for one model', 'Slower runs if too small'],
          ['Build only what changed', 'The number of statements', '`--select state:modified+` in CI', 'Stale children if the selection is wrong'],
          ['Incremental models with predicates', 'Rows read and written', 'The model config (mission 3)', 'Drift, and rows outside the window'],
          ['`--empty` for first checks', 'Rows read in CI', 'The command line', 'It does not test the data']
        ],
        steps: [
          { upto: 2, say: 'Compute settings first. They cost nothing to change and they affect every run.' },
          { upto: 4, say: 'Then build less. Fewer statements, and fewer rows in each.' },
          { upto: 5, say: 'Last, check cheaply before you build for real.' }
        ],
        pick: 'Start with **auto-suspend** and the **size** of the warehouse, then **build less**. Change one thing at a time, and look at the query history before and after.'
      }),

      B.bug({
        id: 'm4-bug', t: 1, q: 'This warehouse runs only a 15 minute nightly build. It still shows 24 hours of use on the bill. Click the line that costs the most.',
        file: 'setup.sql', lang: 'sql', code: BUGWH, bad: G.at(BUGWH, /auto_suspend = 3600/),
        hint: 'What does the warehouse do after the build finishes?',
        why: 'An auto-suspend of **3600 seconds** keeps the warehouse on for a full hour after the last statement. Other statements, such as a dashboard refresh or a test run, restart that hour. With a 15 minute build, you pay for about 75 minutes to do 15 minutes of work. Set 60 seconds for a transformation warehouse.',
        fix: BUGWHFIX,
        cheer: 'Idle time is the quiet cost.'
      }),

      B.decide({
        id: 'm4-dec', t: 2, title: 'Decision: one warehouse or several?',
        scenario: 'Brewline has one **Medium** warehouse, WH_MAIN, for everything. The nightly build runs 10 heavy models and 300 tests. Developers run `dbt build` all day. The BI tool queries the marts from 09:00. The bill is high, and nobody can say who causes it.',
        opts: [
          { t: 'Keep one warehouse and make it Large', d: 'Everything gets faster.', lose: 'The bill doubles, the cost is still one number, and a developer\'s run still queues behind the BI users.' },
          { t: 'Keep one Medium warehouse and ask people to run less', d: 'No change to the account.', lose: 'There is no evidence for who runs what, so the request changes nothing you can measure.' },
          { t: 'One warehouse per workload: nightly build, developers, CI, BI', d: 'Each is sized for its job and suspends on its own.' }
        ],
        pick: 2,
        why: 'Separate warehouses give three things at once: **isolation**, so a developer never blocks the nightly build, **attribution**, because the bill is split by warehouse, and **right-sizing**, because each workload gets the size it needs and a short auto-suspend.',
        when: 'A very small account can run one X-Small warehouse for all. Add a warehouse when two workloads disturb each other or when you need to bill them apart.'
      }),

      B.incident({
        id: 'm4-inc', t: 2, title: 'Incident: the credit bill tripled', time: '11:00',
        alert: 'Finance reports that the data platform used **three times the usual credits** this month. The nightly schedule did not change.',
        clues: ['The increase started 12 days ago', 'WH_TRANSFORM shows many short bursts during working hours', 'A pull request check was added to the repository that month'],
        opts: [
          { t: 'Group the query history by warehouse, day and query tag, and find what started 12 days ago', fb: '' },
          { t: 'Resize WH_TRANSFORM to X-Small', fb: 'It slows the nightly build and treats a symptom. The cause keeps running.' },
          { t: 'Add a resource monitor that suspends the warehouse at the limit', fb: 'It is a good guard rail, and it can stop the nightly build in the middle. It does not find the cause.' },
          { t: 'Ask developers to run dbt less often', fb: 'You have no evidence yet that developers cause it.' }
        ],
        best: 0,
        why: 'The facts say something changed 12 days ago and that bursts appear in working hours. The query history shows who ran what, on which warehouse. Evidence first, then the fix.',
        checks: [
          ['Chart credits by day and warehouse', 'The jump starts 12 days ago, on WH_TRANSFORM, in working hours.'],
          ['Group by user and query tag', 'Most of the new load comes from the CI service user, with the tag of the pull request job.'],
          ['Read the CI job', 'It runs `dbt build` for the whole project on every push, on the production warehouse.'],
          ['Fix', 'Move CI to WH_CI, select only changed models with `state:modified+`, and run `--empty` first.'],
          ['Guard', 'Add a resource monitor on WH_CI with a notify threshold.']
        ],
        tell: 'Credits tripled with no change to the nightly schedule. I charted credits by warehouse and day, saw the jump 12 days ago in working hours, and grouped by user and query tag. The new load came from the CI job, which built the whole project on every push using the production warehouse. I moved CI to its own small warehouse, limited it to changed models, and added a resource monitor that notifies at 80 percent. Credits returned to normal within a week.',
        prevent: ['Give each workload its **own warehouse**', 'Set a **query tag** per job, and review the bill by tag', 'Use **resource monitors** with notify thresholds', 'Review **CI settings** like a production schedule']
      }),

      B.code({
        id: 'm4-rm', t: 3, title: 'A resource monitor as a guard rail', file: 'setup.sql (written by hand, not recorded)', lang: 'sql', code: RM,
        steps: [
          { say: 'A resource monitor watches the credits a warehouse uses. It can warn you and it can stop the warehouse. Press Next.', lines: null },
          { say: 'It has a monthly quota of 200 credits, counted from now.', lines: G.span(RM, /with credit_quota/, /start_timestamp/) },
          { say: 'At 80 percent it sends a notification. At 100 percent it suspends the warehouse. Choose carefully: a suspended nightly warehouse stops the nightly build.', lines: G.span(RM, /triggers/, /do suspend/) },
          { say: 'Then you attach the monitor to a warehouse.', lines: [G.at(RM, /^alter warehouse/), G.at(RM, /^alter warehouse/)] }
        ],
        note: 'Put a notify-only monitor on production and a suspend monitor on CI and development. A guard rail should stop a mistake, not the business.'
      }),

      B.qa({
        id: 'qa-cost', t: 1, tag: 'Cost', secs: 60,
        q: 'How does Snowflake bill compute, and how do you keep a dbt project cheap?',
        pts: ['Credits an hour by warehouse size, doubling with each size', 'Billed per second, at least 60 seconds each time it resumes', 'Idle time before auto-suspend is billed', 'Short auto-suspend, right-sized warehouses, one per workload', 'Build less: changed models only, incremental with predicates, --empty first', 'Measure with the query history and tags'],
        short: 'A virtual warehouse uses credits while it runs. An X-Small uses one credit an hour and each size doubles that. Billing is per second, with a 60 second minimum each time the warehouse resumes, and it includes the idle time before auto-suspend.\n\nSo I do three things. I set auto-suspend to 60 seconds on transformation warehouses, so idle time stays short. I give each workload its own warehouse, sized for its job: the nightly build, developers and CI. And I build less: in CI I select only changed models, on big tables I use incremental models with predicates, and I run `--empty` first to check the SQL without reading data.\n\nThen I measure. dbt writes the model name into a comment on every statement, so I can group the query history by model and see which ones take the most time and scan the most data. I change one thing and compare before and after.',
        fu: [
          ['What is the 60 second minimum?', 'Each time a suspended warehouse resumes, it bills at least 60 seconds. A 20 second job costs the same as a 60 second job.'],
          ['Does a view cost anything?', 'Creating one does not need a running warehouse. Reading it runs the query on the reader\'s warehouse.']
        ],
        trap: 'Naming only "use a smaller warehouse". A smaller warehouse can cost more when it runs far longer.',
        real: 'Give a figure: the credits or dollars a change saved, and how you measured it.'
      }),

      B.qa({
        id: 'qa-size', t: 2, tag: 'Cost', secs: 90,
        q: 'How do you size warehouses for dbt, and how do you know you got it right?',
        pts: ['One warehouse per workload: nightly build, developers, CI, BI', 'Start small, step up while time falls faster than the rate rises', 'Credits equal the rate times the time: compare cost per run as well as speed', 'Short auto-suspend; multi-cluster for concurrency, not for slow statements', 'Check queueing and spilling in the query history', 'Per-model overrides for the few heavy models'],
        short: 'I give each workload its own warehouse and size it by experiment. I run the nightly build on a small size, then step up one size at a time. As long as the run time falls by about half with each step, the cost per run stays flat and I finish sooner, so I keep going. When a step saves much less than half, the cost per run rises, and I stop at the size before.\n\nI compare credits per run, which is the rate times the time, as well as speed. I look in the query history for queueing, which means too many statements for the warehouse, and for spilling to disk, which means the warehouse is too small for the data. Queueing calls for more clusters or fewer threads. Spilling calls for a larger size.\n\nFor the few heavy models, I use `snowflake_warehouse` to run them on a larger warehouse and keep the rest small. And I set auto-suspend to 60 seconds.',
        fu: [
          ['What is spilling?', 'When a query needs more memory than the warehouse has, it writes intermediate data to local disk and then to remote storage. Both slow the query down. A larger size has more memory.'],
          ['When do you use a multi-cluster warehouse?', 'For many users at once, such as BI, where statements queue. It does not make a single slow statement faster.']
        ],
        trap: 'Saying "bigger is faster, so use the biggest". The cost per run rises when a query does not scale.',
        real: 'Describe how you chose a size, with the run times you saw.'
      }),

      B.qa({
        id: 'qa-attrib', t: 2, tag: 'Cost', secs: 75,
        q: 'How would you find which dbt model spends the most credits?',
        pts: ['dbt writes the node id into a comment on every statement', 'Group the query history by node id: time, bytes scanned, warehouse size', 'Time times the size rate gives a ranking, not an exact bill', 'Query tags per job split cost by workflow', 'Check the top models for full scans, spilling and bad filters', 'Re-measure after each change'],
        short: 'dbt adds a comment to the end of each statement with the model\'s node id, and Snowflake keeps that text in its query history. So I query the account usage query history for the last week, pull the node id out of the comment, and add up the run time, the bytes scanned and the warehouse size for each model. The size gives me the rate, so time times rate ranks the models by approximate credits.\n\nIt is a ranking, not an exact bill, because statements that overlap on a warehouse share its credits and the view lags by some minutes. It tells me where to look. For the top models I read the statement, check for full scans and spilling, and look at the filter: an incremental model with a bad filter can scan the whole table every night.\n\nI also set a query tag per job, so I can split cost by workflow. After I change a model, I compare the same numbers a week later.',
        fu: [
          ['Is the query history exact?', 'It records per query time and bytes, not credits per query. Account usage views also lag by some minutes.'],
          ['What does a query tag add?', 'A label you choose, set per session or per model, that groups queries by job or team.']
        ],
        trap: 'Looking at the warehouse total only. It cannot tell you which model to fix.',
        real: 'Name the model you found, what was wrong with it, and what it saved.'
      }),

      B.recap({
        id: 'm4-recap', n: 4, badge: 'Credit Watcher', color: '#FDE68A',
        pts: [
          'Credits equal **rate times time**. Each size doubles the rate. Billing is per second with a **60 second minimum** on resume.',
          '**Idle time is paid time.** Set auto-suspend to 60 seconds on transformation warehouses.',
          '**One warehouse per workload**: nightly build, developers, CI, BI.',
          'A **thread is a session**. Past the warehouse limit, statements queue.',
          'dbt writes the **model name into every statement**, so you can find the model that spends.'
        ],
        lines: [
          'I compare cost per run as well as speed.',
          'I change one thing and measure again.',
          'Idle time is the quiet cost.'
        ]
      })
    ]
  });
})();
