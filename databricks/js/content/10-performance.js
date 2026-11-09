/* Mission 10: performance and cost. A method for slow jobs, the levers you measured in missions 2 and 4, the cost of compute, and the billing tables.
   The levers that were measured come from the recordings. Rates, spot prices, Photon and the billing tables come from documentation, and the cost lab
   is arithmetic on example rates. */
(function () {
  var B = LAB.b, G = LAB.get;
  var J = LAB.W.joinInfo, CALC = LAB.W.dbuCalc;
  var JD = J.info('plan.join_default'), JN = J.info('plan.join_no_broadcast');
  var SH200 = G.counts('spark.shuffle_200').files, SHAQE = G.counts('spark.shuffle_200_aqe').files;
  var Z = G.counts('layout.zorder'), SB = G.counts('layout.small_before'), SA = G.counts('layout.small_after');
  var SZ = G.counts('spark.skew_partition_sizes');
  var avg = function (a) { return a.reduce(function (x, y) { return x + y; }, 0) / a.length; };
  var RATIO0 = Math.max.apply(null, SZ.by_key) / avg(SZ.by_key), RATIO1 = Math.max.apply(null, SZ.salted_32) / avg(SZ.salted_32);
  G.expect(JD.shuffles === 0 && JN.shuffles === 2 && SH200 === 200 && SHAQE === 1 && Z.scan_files_before === 16 && Z.scan_files_after === 1 && SB.numFiles === 40 && SA.numFiles === 1, 'the levers measured in missions 2 and 4');
  G.expect(RATIO0.toFixed(1) === '6.6' && RATIO1.toFixed(1) === '1.4', 'salting cut the biggest partition from 6.6 to 1.4 times the average');
  G.expect(/ArrowEvalPython/.test(G.text('plan.udf')) && !/ArrowEvalPython/.test(G.text('plan.builtin')), 'a Python function adds an ArrowEvalPython step, a built-in function does not');

  /* the cost challenge, with the same arithmetic as the lab */
  var BASE = { type: 'allp', workers: 8, vm: 0.60, dbuh: 1.5, hours: 3, days: 30, spot: 0 };
  var M = function (o) { return CALC.monthly(Object.assign({}, BASE, o)); };
  var C0 = M({}), C1 = M({ type: 'jobs' }), C2 = M({ type: 'jobs', spot: 0.6 }), C3 = M({ type: 'jobs', spot: 0.6, hours: 2.1 });
  var d = function (x) { return '$' + x.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ','); };
  G.expect(d(C0.total) === '$1,154.25' && d(C1.total) === '$850.50' && d(C2.total) === '$591.30' && d(C3.total) === '$413.91', 'the cost challenge totals');

  var COST_SQL = [
    'SELECT u.usage_metadata.job_id,',
    '       round(sum(u.usage_quantity * p.pricing.default), 2) AS list_cost',
    'FROM system.billing.usage u',
    'JOIN system.billing.list_prices p',
    '  ON u.sku_name = p.sku_name',
    ' AND u.usage_start_time >= p.price_start_time',
    ' AND (u.usage_end_time <= p.price_end_time OR p.price_end_time IS NULL)',
    'WHERE u.usage_metadata.job_id IS NOT NULL',
    '  AND u.usage_date >= current_date() - 30',
    'GROUP BY u.usage_metadata.job_id',
    'ORDER BY list_cost DESC',
    'LIMIT 10;'
  ].join('\n');
  var TAG_SQL = [
    'SELECT custom_tags[\'team\'] AS team,',
    '       billing_origin_product,',
    '       sum(usage_quantity) AS dbus',
    'FROM system.billing.usage',
    'WHERE usage_date >= current_date() - 30',
    'GROUP BY 1, 2',
    'ORDER BY dbus DESC;'
  ].join('\n');
  var POLICY = [
    '{',
    '  "autotermination_minutes": { "type": "range", "maxValue": 60, "defaultValue": 30 },',
    '  "num_workers": { "type": "range", "maxValue": 10 },',
    '  "node_type_id": { "type": "allowlist", "values": ["Standard_D4ds_v5", "Standard_D8ds_v5"], "defaultValue": "Standard_D4ds_v5" },',
    '  "azure_attributes.availability": { "type": "fixed", "value": "SPOT_WITH_FALLBACK_AZURE" },',
    '  "custom_tags.team": { "type": "fixed", "value": "data-engineering" }',
    '}'
  ].join('\n');
  var SPOT = [
    '"new_cluster": {',
    '  "spark_version": "17.3.x-scala2.13",',
    '  "node_type_id": "Standard_D8ds_v5",',
    '  "autoscale": { "min_workers": 2, "max_workers": 8 },',
    '  "azure_attributes": {',
    '    "first_on_demand": 1,',
    '    "availability": "SPOT_WITH_FALLBACK_AZURE",',
    '    "spot_bid_max_price": -1',
    '  },',
    '  "custom_tags": { "team": "data-engineering", "pipeline": "brewline" }',
    '}'
  ].join('\n');
  var BUG = [
    '{',
    '  "cluster_name": "dev-sandbox",',
    '  "spark_version": "17.3.x-scala2.13",',
    '  "node_type_id": "Standard_E32ds_v5",',
    '  "num_workers": 64,',
    '  "autotermination_minutes": 0',
    '}'
  ].join('\n');
  var BUGFIX = [
    '{',
    '  "cluster_name": "dev-sandbox",',
    '  "spark_version": "17.3.x-scala2.13",',
    '  "node_type_id": "Standard_D4ds_v5",',
    '  "autoscale": { "min_workers": 1, "max_workers": 4 },',
    '  "autotermination_minutes": 30',
    '}'
  ].join('\n');

  LAB.addChapter({
    id: 'm10', n: 10, title: 'Performance and cost', short: 'Cost', blurb: 'Find the slow stage, pick the lever, size the compute and read the bill', minutes: 42,
    focus: ['mon'],
    goals: [
      'Follow a **method** for a slow job: measure, find the stage, read the plan, fix the cause, then size the compute.',
      'Name the **levers** you measured and the saving each one gave.',
      'Work out the **monthly cost** of a job from DBUs and VMs, and find the largest saving.',
      'Choose **spot VMs, autoscaling, auto-termination and cluster policies**.',
      'Find the costly job with the **billing system tables** and tags.'
    ],
    say: 'Mission 10 puts speed and money side by side. Most of what makes a job fast also makes it cheap, because compute bills while it runs. Part of this mission reuses what you measured in missions 2 and 4: file counts, shuffles and skew. The rest, the DBU rates, spot prices, Photon and the billing tables, comes from documentation, and every price in this mission is an example. Use the rates in your own contract.',
    scenes: [
      B.talk({
        id: 'm10-talk', t: 1, src: 'docs', title: 'A method for a slow job',
        say: 'Do not start by adding workers. Press Next for the five steps.',
        items: [
          ['1. Measure', 'Find which task of the job is slow, and how its run time changed. The run history of the job, or the job run system table, gives the duration of every run. A change of the data size, the code or the cluster explains most slow-downs.', 'Which task, since when.'],
          ['2. Find the stage', 'Open the task in the **Spark UI**. The stages tab lists every stage with its time. Open the slowest one and look at the **task time distribution**: the minimum, the median and the maximum. A maximum far above the median means skew. Look at shuffle read and write sizes and at **spill** to disk.', 'The slowest stage, and its spread.'],
          ['3. Read the plan', 'The SQL tab shows the query plan with the rows and the time of each operator. Look for a shuffle, for the join type, for the number of files read, and for a Python function.', 'Missions 2 and 4 taught you to read it.'],
          ['4. Fix the cause', 'Broadcast the small side. Fix the skew. Compact small files. Cluster the table by the filter columns. Replace a Python function. Each lever is in the next screen with its measured effect.', 'Fix the cause, not the symptom.'],
          ['5. Size the compute last', 'Only when the work is as small as it can be, pick the size. If tasks wait in a queue and the CPUs are busy, add workers. If tasks spill, use machines with more memory. If the CPUs are idle, you have too many.', 'Compute is the last lever.']
        ],
        cols: 1
      }),

      B.cmp({
        id: 'm10-levers', t: 1, src: 'rec', title: 'The levers you measured',
        say: 'You already have numbers for five levers, from real runs of open-source Spark and Delta Lake. Press Next to compare them in one table.',
        cols: ['Lever', 'Before', 'After', 'Where you saw it'],
        hl: 2,
        rows: [
          ['Broadcast the small table', JN.shuffles + ' shuffles, a sort-merge join', JD.shuffles + ' shuffles, a broadcast join', 'Mission 2, the join lab'],
          ['Leave adaptive execution on', SH200 + ' small output files', SHAQE + ' file', 'Mission 2, partitions after a shuffle'],
          ['Compact small files', SB.numFiles + ' files', SA.numFiles + ' file', 'Mission 4, OPTIMIZE'],
          ['Group data by the filter column', 'a filter reads ' + Z.scan_files_before + ' of ' + Z.total_files_before + ' files', 'a filter reads ' + Z.scan_files_after + ' of ' + Z.total_files_after + ' files', 'Mission 4, Z-order and liquid clustering'],
          ['Salt a hot key', 'the biggest partition is ' + RATIO0.toFixed(1) + ' times the average', RATIO1.toFixed(1) + ' times the average', 'Mission 2, the skew lab'],
          ['Use a built-in function', 'a Python step, ArrowEvalPython, in the plan', 'no Python step in the plan', 'Mission 2, UDF against built-in']
        ],
        steps: [
          { upto: 2, say: 'The first two remove work in the shuffle. A broadcast join removes both shuffles of this join. Adaptive execution merges tiny partitions.' },
          { upto: 4, say: 'The next two remove work at the files. Fewer files and a better layout mean less to open and less to read.' },
          { upto: 6, say: 'The last two remove waiting. A skewed partition keeps one core busy while the others wait. A Python function sends rows out of the JVM.' }
        ],
        pick: 'Each row is a **saving in time**, and time is the unit that Databricks bills. A job that runs half as long costs about half as much on the same compute.'
      }),

      B.widget({ id: 'm10-lab', kind: 'dbu', t: 1, src: 'docs', title: 'Lab: what a job costs a month' }),

      B.cmp({
        id: 'm10-cost', t: 1, src: 'docs', title: 'Cost levers for compute',
        say: 'Beyond making the work smaller, you can make each hour of compute cheaper. Press Next to read the levers. They come from the Databricks documentation, and the prices change, so use your own numbers.',
        cols: ['Lever', 'What it changes', 'Risk or limit'],
        hl: 2,
        rows: [
          ['Jobs compute, not all-purpose', 'A lower price for each DBU. The cost lab showed the Databricks charge falling by almost half for the same hours.', 'Needs a job, not a person at a keyboard.'],
          ['Serverless', 'One rate that includes the VMs, and no idle time.', 'Not every task type is supported. Compare the real cost.'],
          ['Spot VMs for workers', 'A lower price for the VM part only. The driver stays on demand.', 'A worker can be taken away. Tasks must retry, and writes must be safe to repeat.'],
          ['Autoscaling', 'The cluster adds workers when tasks wait and removes them when it is idle.', 'Scaling takes minutes. It suits uneven load, not a short job.'],
          ['Auto-termination', 'A cluster stops after a number of idle minutes.', 'The next query waits for a start. Use serverless for analysts.'],
          ['Right-sized machines', 'Fewer, larger or smaller nodes that match the work.', 'You need the Spark UI to know if work is memory-bound or CPU-bound.'],
          ['Photon', 'A faster engine for SQL and DataFrame work. It is on by default on serverless compute and SQL warehouses, and bills at a different DBU rate than the same machine without it.', 'Measure your job. The gain varies with the work.']
        ],
        steps: [
          { upto: 2, say: 'First choose the cheaper kind of compute. For a nightly job, that means jobs compute or serverless, never an all-purpose cluster.' },
          { upto: 5, say: 'Then make the hours fewer and cheaper: spot workers, autoscaling and auto-termination. Idle time is the easiest saving.' },
          { upto: 7, say: 'Last, tune the machines and the engine. This is where measuring matters, because the right choice depends on the work.' }
        ],
        pick: 'Order of attack: **make the work smaller**, then **pick the cheaper compute type**, then **cut idle time**, and only then tune machine sizes.'
      }),

      B.code({
        id: 'm10-spot', t: 2, src: 'docs', title: 'A job cluster with spot workers and autoscaling', file: 'new_cluster inside a job', lang: 'json', code: SPOT,
        steps: [
          { say: 'This is the compute part of a job on Azure. The field names come from the Databricks SDK, which I checked in the verification step. The runtime and the VM size are examples.', lines: null },
          { say: '`autoscale` gives a minimum and a maximum number of workers. The cluster starts with the minimum and grows when tasks wait.', lines: G.span(SPOT, /"autoscale"/, /"autoscale"/) },
          { say: '`azure_attributes` controls spot. `first_on_demand: 1` keeps the first node, the driver, on demand. `SPOT_WITH_FALLBACK_AZURE` uses spot workers and falls back to on-demand VMs when no spot capacity is available. A price of -1 means "pay up to the on-demand price".', lines: G.span(SPOT, /"azure_attributes"/, /^  \},$/) },
          { say: '`custom_tags` put a label on the VMs and on the usage records. They are how you attribute cost to a team in the billing tables.', lines: G.span(SPOT, /"custom_tags"/, /"custom_tags"/) }
        ],
        note: 'Spot capacity can be taken back with little warning. A job with retries and writes that are safe to repeat tolerates this. A job that cannot be repeated belongs on on-demand VMs.'
      }),

      B.code({
        id: 'm10-policy', t: 2, src: 'docs', title: 'A cluster policy sets the limits', file: 'cluster policy definition', lang: 'json', code: POLICY,
        steps: [
          { say: 'A **cluster policy** limits what people can configure when they create compute. This definition follows the documentation of the policy format. You assign it to a group, and the group can only create clusters inside it.', lines: null },
          { say: 'Auto-termination: at most 60 minutes, and 30 by default. Nobody can turn it off.', lines: G.span(POLICY, /"autotermination_minutes"/, /"autotermination_minutes"/) },
          { say: 'At most 10 workers, and only two machine types. This stops a sandbox from being created with 64 large nodes.', lines: G.span(POLICY, /"num_workers"/, /"node_type_id"/) },
          { say: 'Spot with fallback is fixed. The tag `team` is fixed too, so every cluster carries the label that the cost report needs.', lines: G.span(POLICY, /"azure_attributes\.availability"/, /"custom_tags\.team"/) }
        ],
        note: 'A policy that you cannot bypass is worth more than a rule in a wiki. Pair it with budget alerts for the teams that need more.'
      }),

      B.quiz({
        id: 'm10-q1', t: 1,
        q: 'On classic compute, which part of the bill does a spot discount reduce?',
        opts: [
          { t: 'Only the virtual machine charge of the workers', fb: '' },
          { t: 'The DBU charge', fb: 'Databricks charges DBUs at its own rate. A spot discount is a price from your cloud provider for the VMs.' },
          { t: 'Both the VMs and the DBUs', fb: 'DBUs have a separate price. Spot does not change it.' },
          { t: 'Nothing: spot only changes how fast the job runs', fb: 'Spot VMs are cheaper per hour. The saving is the point.' }
        ],
        ok: 0, why: 'Classic compute bills DBUs to Databricks and VMs to your cloud. Spot lowers the VM price of the workers. The cost lab shows the effect: the Databricks charge does not move when you switch spot on.'
      }),

      B.quiz({
        id: 'm10-q2', t: 1,
        q: 'A nightly job runs for 2 hours on an all-purpose cluster with auto-termination set to 120 minutes. How many hours is the cluster billed each night?',
        opts: [
          { t: '2 hours', fb: 'The cluster stays up for 120 minutes after the last work, so it bills for those too.' },
          { t: '4 hours', fb: '' },
          { t: '2 hours and 30 minutes', fb: 'The idle time is the full auto-termination period, not a few minutes.' },
          { t: '1 hour', fb: 'It cannot bill for less time than it runs.' }
        ],
        ok: 1, why: 'The cluster runs 2 hours of work, then stays up for the idle period of 2 hours before it stops. A job cluster stops when the job ends, so the same job would bill 2 hours. The third step of the cost lab shows the effect.'
      }),

      B.talk({
        id: 'm10-billing', t: 2, src: 'docs', title: 'Where the bill lives',
        say: 'Databricks records usage in system tables, so you can answer cost questions with SQL. Press Next for the tables. The names come from the documentation, and the schemas can change, so check the current pages.',
        items: [
          ['The usage table', '`system.billing.usage` has one record for each unit of billable usage: the date, the SKU, the quantity, a metadata struct with the job id, cluster id or warehouse id, and the **custom tags** of the compute. It covers the whole account.', 'What was used, by whom and for what.'],
          ['The price table', '`system.billing.list_prices` holds the list price for each SKU over time. Multiply a usage quantity by the price valid at that time to get the **list cost**. Your contract may give a discount, so the real cost can be lower.', 'List prices, not your invoice.'],
          ['Jobs', '`system.lakeflow.jobs` and `system.lakeflow.job_run_timeline` describe jobs and the start and end of each run. Join them to usage by the job id to find the cost of a run or a job.', 'Cost and runs together.'],
          ['Tags decide how well it works', 'A record carries the tags of the compute that produced it. If every cluster has a `team` tag, you can group the bill by team. A cluster policy is the way to make the tag mandatory.', 'Tag at creation, query later.'],
          ['Budgets', 'Budget policies and alerts can warn a team when it spends more than planned. Check the documentation for what your plan includes.', 'A warning before the invoice.']
        ],
        cols: 1
      }),

      B.code({
        id: 'm10-sql', t: 2, src: 'docs', title: 'Which job costs the most?', file: 'sql editor', lang: 'sql', code: COST_SQL,
        steps: [
          { say: 'This query lists the ten jobs with the highest list cost in the last 30 days. It uses the table names and columns from the documentation.', lines: null },
          { say: 'Take the usage records, and the job id from the metadata. Sum quantity times price.', lines: [1, 3] },
          { say: 'Join the price that was valid when the usage happened. A SKU has several prices over time, so the join uses the time range of each price.', lines: [4, 7] },
          { say: 'Keep only usage that belongs to a job, and only the last 30 days. The date column keeps the scan small.', lines: [8, 9] },
          { say: 'Group by job and sort by cost. The top rows are where an hour of work saves the most money.', lines: [10, 12] }
        ],
        note: 'Check the current column names before you run it. I verified the syntax with a SQL parser, and I could not run it on a workspace.'
      }),

      B.code({
        id: 'm10-tags', t: 2, src: 'docs', title: 'Cost for each team, by tag', file: 'sql editor', lang: 'sql', code: TAG_SQL,
        steps: [
          { say: 'The same table answers a different question: which team spends what, and on which product.', lines: null },
          { say: 'Read the `team` tag from the custom tags map, and the product that produced the usage, such as jobs, SQL or all-purpose compute.', lines: [1, 3] },
          { say: 'Group by both and sort by usage. A team with a large all-purpose share has clusters that someone should review.', lines: [4, 7] }
        ]
      }),

      B.challenge({
        id: 'm10-ch', t: 2, title: 'Cost round: cut the bill of a nightly job',
        q: 'A nightly job runs on an **all-purpose** cluster with **8 workers and 1 driver**. It runs **3 hours** each night for **30 nights**. Each node uses **1.5 DBUs an hour** and costs **$0.60 an hour** as a VM. Use the example rates: **$0.55 a DBU** for all-purpose compute and **$0.30 a DBU** for jobs compute.\n\n**1. What does it cost a month? 2. Propose three changes, and estimate the cost after each.**',
        data: [{ name: 'The facts', cols: ['item', 'value'], rows: [['workers and driver', '8 + 1 = 9 nodes'], ['run time', '3 hours a night, 30 nights'], ['DBUs', '1.5 an hour for each node'], ['VM price', '$0.60 an hour for each node'], ['all-purpose rate', '$0.55 a DBU'], ['jobs compute rate', '$0.30 a DBU']] }],
        lang: 'text', file: 'cost.txt',
        hints: ['Cost = DBUs times the rate, plus the VM hours times the VM price.', 'DBUs a month = nodes times DBUs an hour times hours times nights.', 'Move the same job to jobs compute. Then make the 8 workers spot at 60 percent off. The driver stays on demand.'],
        sol: [
          'DBUs a month  = 9 nodes x 1.5 x 3 h x 30 = ' + C0.dbu.toFixed(0),
          'all-purpose   = ' + C0.dbu.toFixed(0) + ' x $0.55 = ' + d(C0.dbuCost) + '   VMs = 9 x $0.60 x 90 h = ' + d(C0.vmCost),
          'now           = ' + d(C0.total),
          '',
          '1. Jobs compute:        ' + C1.dbu.toFixed(0) + ' x $0.30 = ' + d(C1.dbuCost) + ' + VMs ' + d(C1.vmCost) + ' = ' + d(C1.total),
          '2. Spot workers:        VMs = (1 + 8 x 0.4) x $0.60 x 90 h = ' + d(C2.vmCost) + '  ->  ' + d(C2.total),
          '3. Faster job, 2.1 h:   DBUs ' + C3.dbu.toFixed(0) + ' x $0.30 = ' + d(C3.dbuCost) + ', VMs ' + d(C3.vmCost) + '  ->  ' + d(C3.total)
        ].join('\n'),
        expl: ['The bill is **' + d(C0.total) + '** a month. The three changes bring it to **' + d(C3.total) + '**, which is ' + Math.round((1 - C3.total / C0.total) * 100) + ' percent less.', 'Moving to jobs compute needs no code change and saves ' + d(C0.total - C1.total) + '. Do it first.', 'Spot workers save another ' + d(C1.total - C2.total) + ', and they need retries and writes that are safe to repeat.', 'A job that runs 30 percent shorter saves on both parts, because DBUs and VMs both bill by the hour. In mission 2 and 4 you saw how.', 'The rates are examples from public price pages. Put your contract rates into the cost lab and check.'],
        cx: 'Linear in the hours. Saving 30 percent of the run time cuts about 30 percent from both parts of the bill.'
      }),

      B.bug({
        id: 'm10-bug', t: 2, q: 'A teammate creates this cluster for their experiments. It will cost far more than it should. Click a line that is wrong.',
        file: 'dev-sandbox cluster', lang: 'json', code: BUG, bad: [G.at(BUG, /num_workers/), G.at(BUG, /autotermination_minutes/)],
        hint: 'One line fixes the cluster at a very large size. Another one never lets it stop.',
        why: 'Sixty-four large workers stay up for a sandbox, whatever the load, and `autotermination_minutes: 0` turns auto-termination off, so the cluster bills until somebody remembers it. Use autoscaling with a small maximum, a smaller machine and an idle time of 30 minutes. A cluster policy would have refused both settings.',
        fix: BUGFIX,
        cheer: 'Two settings, and the bill for a long weekend is large.'
      }),

      B.decide({
        id: 'm10-dec', t: 2, src: 'docs', title: 'Decision: which change do you make first?',
        scenario: 'The all-purpose nightly job from the cost round costs about **$1,150** a month. The team has **two days** to cut the bill. A rewrite of the job logic is possible but would take weeks. The job already has retries and writes that are safe to repeat.',
        opts: [
          { t: 'Move the job to jobs compute', d: 'The same code and the same machines, with the lower DBU rate.' },
          { t: 'Rewrite the job to cut its run time by 30 percent', d: 'Fix skew and layout.', lose: 'It is the right long-term lever and it saves about as much as the move, but it takes weeks. You can do it after the move, and it saves on top of it.' },
          { t: 'Buy a larger machine so that the job ends sooner', d: 'Fewer hours, higher hourly price.', lose: 'The price per hour rises with the machine, and the job may not scale linearly. You may pay as much for a shorter run.' }
        ],
        pick: 0,
        why: 'Jobs compute needs no code change and no risk to the logic. In the cost round it took the bill from $1,154.25 to $850.50. Then add spot workers, then work on the run time with the time you have.',
        when: 'If the job needs a feature that only all-purpose compute offers, such as the RDD API, keep it there and attack idle time and size instead.'
      }),

      B.incident({
        id: 'm10-inc', t: 2, src: 'docs', title: 'Incident: the Databricks bill doubled this month', time: '10:15',
        alert: '**Finance reports that the Databricks bill doubled compared with last month.** The pipelines have not changed. Nobody has added a project. The usage dashboard shows all-purpose compute growing, with no tag on most of it.',
        clues: ['The growth is in all-purpose compute', 'Most of the new usage has no `team` tag', 'A hackathon ran two weeks ago'],
        opts: [
          { t: 'Group usage by product, tag and cluster in the billing tables, then look at the largest untagged clusters', fb: '' },
          { t: 'Cut every team\'s budget by half', fb: 'You would punish teams that did nothing wrong, and the cause would remain.' },
          { t: 'Ask each team to explain their usage in a meeting', fb: 'It takes a week. The usage table gives the answer in minutes.' },
          { t: 'Switch all workloads to serverless right away', fb: 'A broad change without evidence can raise the cost for some workloads and break others.' }
        ],
        best: 0,
        why: 'The billing tables record every unit of usage with its product, its tags and the cluster that produced it. Grouping by those fields shows which clusters grew. Untagged all-purpose clusters from a hackathon are a typical finding.',
        checks: [
          ['Group usage by product and day', 'All-purpose compute grew. Jobs and SQL did not.'],
          ['Group by cluster', 'Three large all-purpose clusters from the hackathon still run, with auto-termination turned off.'],
          ['Find the owners', 'The creator is recorded. Ask them to stop the clusters.'],
          ['Stop the leak', 'Terminate the clusters. Attach a policy that caps idle time and requires tags.'],
          ['Set up the warning', 'Add a budget alert per team and a weekly usage query.']
        ],
        tell: 'The bill doubled because three large all-purpose clusters from a hackathon kept running with auto-termination turned off, and they had no team tag, so nobody saw them. I grouped the billing usage by product and cluster to find them, asked the owners to stop them, and attached a cluster policy that caps idle time at 60 minutes and requires a team tag. We added a budget alert for each team and a weekly usage query. The next month came back to the old level.',
        prevent: ['A **cluster policy** that caps idle time and requires tags', 'A **budget alert** for each team', 'A **weekly query** of usage by product and tag', 'Short-lived clusters for events, deleted when they end']
      }),

      B.qa({
        id: 'qa-slow', t: 1, tag: 'Cost', secs: 60,
        q: 'A Spark job is slow. How do you find out why, and what do you try first?',
        pts: ['Measure: which task, and since when', 'Spark UI: slowest stage and the task time spread', 'Read the plan: shuffles, join type, files read, UDFs', 'Fix the cause: broadcast, skew, small files, layout', 'Check spill and memory', 'Size the compute last'],
        short: 'I start by finding which task of the job is slow and when it became slow, from the run history. A change in data volume, code or cluster usually explains it.\n\nThen I open the Spark UI for that task, go to the slowest stage, and look at the task time distribution. If the maximum is far above the median, I have skew. I also look at the shuffle sizes and at spill to disk, which means too little memory.\n\nNext I read the query plan: is there a shuffle that a broadcast could avoid, which join type was chosen, how many files were read, and is there a Python function. I fix that cause. In my tests a broadcast join removed both shuffles, compaction cut 40 files to 1, and one Z-order let a filter read 1 file of 16.\n\nOnly when the work is as small as it can be do I change the compute size. Adding workers first just makes a slow job expensive.',
        fu: [
          ['What does spill mean?', 'Spark ran out of memory for a task and wrote data to disk. It is slow. Use machines with more memory, or reduce the data per task.'],
          ['When do more workers help?', 'When tasks queue and CPUs are busy, and the data is spread evenly. They do not help one oversized partition.']
        ],
        trap: 'Starting with "I would increase the cluster size". It treats the symptom and raises the bill.',
        real: 'Describe a slow job you fixed, the cause and the time before and after.'
      }),

      B.qa({
        id: 'qa-cost', t: 2, tag: 'Cost', secs: 90,
        q: 'How do you reduce the cost of a Databricks workload without making it unreliable?',
        pts: ['Make the work smaller first: layout, joins, skew', 'Use jobs compute or serverless, not all-purpose, for scheduled work', 'Cut idle time: auto-termination, job clusters, serverless', 'Spot workers with retries and idempotent writes', 'Autoscaling for uneven load, right-size from the Spark UI', 'Policies, tags and budgets to keep it cheap'],
        short: 'I go in order. First I make the work smaller, because every hour saved is saved on both parts of the bill: layout, joins, skew and file sizes. Then I use the cheaper compute type. A scheduled job runs on jobs compute or serverless, not on an all-purpose cluster, whose price for each DBU is higher. In my cost example that alone cut a $1,154 monthly bill to $850.\n\nNext I remove idle time with job clusters that stop with the job, auto-termination on interactive clusters, and serverless for analysts. I use spot VMs for the workers when the job has retries and its writes are safe to repeat. The saving is only on the VM part, and the driver stays on demand.\n\nI use autoscaling for uneven load and size the machines from what the Spark UI shows. To keep the gain, I add a cluster policy for idle time, size and tags, and budget alerts by team. The prices in my example are from public pages, and I recompute with the contract rates.',
        fu: [
          ['Does spot change the DBU charge?', 'No. Spot is a cloud price for the VMs. The DBU charge stays the same.'],
          ['When would you keep an all-purpose cluster?', 'For interactive development, or for a feature that only it offers, with auto-termination set and a policy on size.']
        ],
        trap: 'Answering with only "use spot instances". It saves part of one of two lines and ignores the larger levers.',
        real: 'Give the monthly cost of a workload before and after you changed it, and what you changed first.'
      }),

      B.qa({
        id: 'qa-billing', t: 2, tag: 'Cost', secs: 90,
        q: 'How do you find out which team or job spends the most, and keep it under control?',
        pts: ['Billing system tables: usage and list prices', 'Join usage to jobs by job id', 'Tags on compute, made mandatory by cluster policies', 'Group by team, product and cluster', 'Budget alerts and a weekly review', 'List cost against invoice'],
        short: 'I use the billing system tables. `system.billing.usage` holds every unit of usage with the SKU, the quantity, the job or cluster id and the tags of the compute. I join it to the list prices for the time of the usage to get the list cost, and to the job tables by the job id to rank the jobs. A second query groups usage by the team tag and the product, so I can see which team has a large share of all-purpose compute.\n\nThe tags only work if every cluster has them, so I make them mandatory with a cluster policy. Then I set budget alerts for each team and put the two queries on a weekly dashboard.\n\nThe list cost is not the invoice, because the contract may give discounts, and classic compute also has a VM bill at the cloud provider, which I read from the cloud\'s cost tools. I know these tables from the documentation, and I check the schema pages before I build on them.',
        fu: [
          ['What if compute has no tag?', 'You cannot assign it to a team. Find the creator in the records, tag it, and add a policy so it cannot happen again.'],
          ['Where do you see the VM cost?', 'In your cloud provider\'s cost management, with the same tags. Databricks usage covers the DBUs.']
        ],
        trap: 'Looking only at DBUs. On classic compute, the VM bill at the cloud provider is a second line.',
        real: 'Describe a report or an alert that you built for cost and what it caught.'
      }),

      B.recap({
        id: 'm10-recap', n: 10, badge: 'Cost Watcher', color: '#FDE68A',
        pts: [
          'A method: **measure, find the stage, read the plan, fix the cause, size last**.',
          'The levers you measured: broadcast (**2 shuffles to 0**), adaptive execution (**200 files to 1**), compaction (**40 to 1**), layout (**16 files to 1**), salting (**6.6x to 1.4x**).',
          'A bill is **DBUs plus VMs** on classic compute, and one rate on serverless. Time is the multiplier.',
          'Cheaper hours: **jobs compute**, **spot workers**, **autoscaling**, **auto-termination**. Spot lowers only the VM part.',
          'Cost round: **' + d(C0.total) + '** to **' + d(C3.total) + '** with three changes.',
          '**Tags, cluster policies and billing tables** show who spends what.'
        ],
        lines: [
          'I make the work smaller before I make the compute bigger.',
          'I tag compute and read the billing tables every week.',
          'I recompute savings with my own rates.'
        ]
      })
    ]
  });
})();
