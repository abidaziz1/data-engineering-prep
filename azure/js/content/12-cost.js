/* Mission 12: cost and operations. What each service charges for, finding the biggest line, five savings, logs, tags, budgets and commitments.
   The month of Brewline in the lab is arithmetic on example rates and made-up usage: the rules (which meter counts what) come from the Azure
   documentation, the rates are examples that Microsoft changes, and the usage is invented. The KQL was checked for syntax with the Kusto language service of
   Microsoft. The Bicep was scanned by Checkov in mission 13 and was not compiled. Nothing here ran on Azure. */
(function () {
  var B = LAB.b, G = LAB.get;
  var BI = LAB.W.billInfo, BASE = BI.lines({}), T0 = BI.total(BASE);
  function usd(n, d) { d = d === undefined ? 2 : d; return '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }); }
  function saved(k) { var sv = {}; sv[k] = 1; return T0 - BI.total(BI.lines(sv)); }
  var ALL = {}; BI.save.forEach(function (x) { ALL[x.k] = 1; });
  var T1 = BI.total(BI.lines(ALL));
  var SORTED = BASE.slice().sort(function (a, b) { return b[1] - a[1]; });
  var KC = G.counts('kql.cost'), BUDGET = G.file('iac/modules/budget.bicep');

  G.expect(Math.round(T0) === 7489 && /dedicated/.test(SORTED[0][0]) && Math.round(SORTED[0][1]) === 4320 && /Log Analytics/.test(SORTED[1][0]) && Math.round(SORTED[1][1]) === 1380 && /Lake storage/.test(SORTED[2][0]) && Math.round(SORTED[2][1]) === 800, 'the month is about $7,489, and the pool, the logs and the storage are the three biggest lines');
  G.expect(Math.round(saved('pause')) === 2160 && Math.round(saved('logs')) === 828 && Math.round(saved('life')) === 280 && Math.round(saved('batch')) === 162 && Math.round(saved('parquet')) === 100 && Math.round(T0 - T1) === 3530, 'the five savings are 2,160, 828, 280, 162 and 100 and add up to 3,530');
  G.expect(KC.usage_by_table.valid === true && KC.usage_by_table.errors.length === 0, 'the usage query passes the KQL syntax check');
  G.expect(/Microsoft.Consumption\/budgets/.test(BUDGET) && /Forecasted/.test(BUDGET) && /Actual/.test(BUDGET), 'the budget file has a forecast and an actual notification');
  G.expect(BI.rate.dwu100 === 1.2 && BI.use.hours === 720 && BI.use.dwu === 500, 'the lab prices a 500 DWU pool at 1.20 for each 100 DWU hour over 720 hours');

  var SHARE = function (r) { return (r[1] / T0 * 100).toFixed(1) + '%'; };
  var TOP2 = (SORTED[0][1] + SORTED[1][1]) / T0 * 100;

  var PAUSE = [
    '# stop the compute charge in the evening, and start the pool before the nightly load',
    'az synapse sql pool pause  --name brewline_dw --workspace-name syn-brewline-prod --resource-group rg-brewline-data-prod',
    'az synapse sql pool resume --name brewline_dw --workspace-name syn-brewline-prod --resource-group rg-brewline-data-prod',
    '',
    '# check the state of the pool',
    'az synapse sql pool show --name brewline_dw --workspace-name syn-brewline-prod --resource-group rg-brewline-data-prod --query status'
  ].join('\n');

  var USAGE = [
    'Usage',
    '| where TimeGenerated > ago(30d) and IsBillable == true',
    '| summarize GB = sum(Quantity) / 1000 by DataType',
    '| top 10 by GB desc'
  ].join('\n');

  var BUG_DIAG = [
    "resource diag 'Microsoft.Insights/diagnosticSettings@2021-05-01-preview' = {",
    "  name: 'to-log-analytics'",
    '  scope: blobs',
    '  properties: {',
    '    workspaceId: workspaceId',
    '    logs: [',
    '      {',
    "        categoryGroup: 'allLogs'",
    '        enabled: true',
    '      }',
    '    ]',
    '  }',
    '}'
  ].join('\n');
  var FIX_DIAG = BUG_DIAG.replace("        categoryGroup: 'allLogs'\n        enabled: true\n      }\n", "        category: 'StorageWrite'\n        enabled: true\n      }\n      {\n        category: 'StorageDelete'\n        enabled: true\n      }\n");

  var BUG_BUDGET = [
    'notifications: {',
    '  actual100: {',
    '    enabled: true',
    "    operator: 'GreaterThan'",
    '    threshold: 100',
    "    thresholdType: 'Actual'",
    '    contactEmails: [',
    '      contactEmail',
    '    ]',
    '  }',
    '}'
  ].join('\n');
  var FIX_BUDGET = BUG_BUDGET.replace("    threshold: 100\n    thresholdType: 'Actual'", "    threshold: 90\n    thresholdType: 'Forecasted'");

  var SQL_TOP = [
    'SELECT TOP 3',
    '       line,',
    '       amount,',
    '       ROUND(100.0 * amount / SUM(amount) OVER (), 1) AS share_percent',
    'FROM bill',
    'ORDER BY amount DESC;'
  ].join('\n');

  LAB.addChapter({
    id: 'm12', n: 12, title: 'Cost and operations', short: 'Cost', blurb: 'What each service charges for, the biggest line, five savings, logs, tags, budgets and commitments', minutes: 48,
    focus: ['mon', 'qual'],
    goals: [
      'Name the **meter** of each service, and what drives it.',
      'Find the **biggest line** of a bill, and say what to ask its owner.',
      'Apply five **savings**, and say what each one costs you.',
      'Control **log cost** with categories, plans and retention.',
      'Set **tags, budgets and alerts** so that a surprise shows up in days, not on the invoice.',
      'Decide when a **reservation** pays, with the break-even arithmetic.'
    ],
    say: 'Mission 12 is about the invoice. I built a made-up month for Brewline Europe, at example rates, from the rules that the Azure documentation gives for each meter. The numbers are arithmetic, not a quote, and Microsoft changes the rates. The lesson is the shape: two lines are most of the bill, and both are things that run when nobody is looking. I checked the KQL for syntax. Nothing here ran on Azure.',
    scenes: [
      B.cmp({
        id: 'm12-meters', t: 1, src: 'docs', title: 'What each service charges for',
        say: 'Every Azure service has a meter, and the meter says what is counted. Press Next to see ten of them, and the lever that moves each one.',
        cols: ['Service', 'The meter', 'What drives it', 'The lever'],
        hl: 1,
        rows: [
          ['Storage', 'GB a month by tier, operations, data transfer', 'how much you keep, how many small files, where readers sit', 'lifecycle rules, bigger files, ZRS only where needed'],
          ['Data Factory', 'activity runs, DIU hours of copy, data flow vCore hours', 'runs a day, size of copies, data flow cluster time', 'fewer, bigger runs, Auto DIU, short data flow time to live'],
          ['Synapse serverless', 'TB of data processed', 'columns, format, folders', 'Parquet, named columns, filepath, gold tables'],
          ['Synapse dedicated pool', 'DWU hours, plus storage', 'the hours the pool is on, and its size', 'pause on a schedule, right-size, a reservation'],
          ['Spark and Databricks', 'node hours, plus Databricks units on Databricks', 'cluster size, run time, idle time', 'job clusters, auto-termination'],
          ['Event Hubs', 'throughput unit hours, plus ingress events', 'the peak load, not the average', 'batch events, auto-inflate with a cap'],
          ['Functions', 'executions and GB seconds, or the instances of a plan', 'how often and how long', 'short functions, the right plan'],
          ['Log Analytics', 'GB ingested, then retention', 'which categories you send', 'choose categories, Basic plan, commitment tier'],
          ['Networking', 'data out, private endpoint hours and GB', 'traffic that leaves a region, number of endpoints', 'keep readers in the region, share endpoints'],
          ['Key Vault', 'operations, and hardware keys', 'calls each second', 'read a secret once']
        ],
        steps: [
          { upto: 3, say: 'Storage, Data Factory and serverless SQL. Storage is cheap for each GB and adds up in operations. The other two bill for work that is done.' },
          { upto: 6, say: 'The engines that bill by the hour: the dedicated pool, Spark and Event Hubs. An hour that is on is billed, whether or not a query runs.' },
          { upto: 10, say: 'Functions, logs, networking and Key Vault. They are small until a setting multiplies them, and logs are the usual surprise.' }
        ],
        pick: 'Learn the **meter** before the price. A meter that counts **hours** punishes idle time, one that counts **GB or TB** punishes careless queries, and one that counts **operations** punishes tiny files.'
      }),

      B.widget({ id: 'm12-lab', kind: 'bill', t: 1, src: 'docs', title: 'Lab: a month of Brewline on Azure' }),

      B.talk({
        id: 'm12-find', t: 1, src: 'docs', title: 'How to find where the money goes',
        say: 'In the lab, ' + Math.round(TOP2) + ' percent of the bill is two lines. Real bills are like that too. Press Next for how to find your two.',
        items: [
          ['Start with the bill, not the service', 'Open cost analysis, and group by service name. Look at the biggest bar first. Then group by resource group, and by resource. In the lab the dedicated pool is ' + SHARE(SORTED[0]) + ' of the month, and the log workspace is ' + SHARE(SORTED[1]) + '.', 'The biggest bar first.'],
          ['Read the daily chart', 'A step up on one day points to a change on that day: a bigger pool, a new diagnostic setting, a new pipeline. A slow climb points to growth in data or in logs. Compare with the same days of last month.', 'A step is a change, a slope is growth.'],
          ['Read the meter', 'Each line names a meter: hours, GB, operations, TB processed. The meter tells you which lever can move it, and which cannot.', 'The meter names the lever.'],
          ['Group by tag', 'Group by owner or by workload. Cost with no tag has no owner, and nobody will answer for it. Fixing the tags is the first job if many lines are untagged.', 'Untagged cost has no owner.'],
          ['Ask the owner with a number', '"This pool cost ' + usd(SORTED[0][1], 0) + ' last month and was on for 720 hours. Twelve hours a day would do." A question with a number gets an answer, and one without it gets a shrug.', 'Bring the number.']
        ],
        cols: 1
      }),

      B.cmp({
        id: 'm12-levers', t: 1, src: 'docs', title: 'Five savings, and what each one costs you',
        say: 'Each saving has a price in convenience. Press Next to read the five levers of the lab with the amount each one saves at example rates, and what to check first.',
        cols: ['Lever', 'Saves in the lab', 'Explained in', 'Check before you do it'],
        hl: 1,
        rows: [
          ['Pause the dedicated pool 12 hours a day', usd(saved('pause')), 'mission 8', 'The first query after a resume waits for minutes, and storage still bills.'],
          ['Send only the useful diagnostic logs', usd(saved('logs')), 'this mission', 'You cannot query what you did not send. Keep audit and failure logs.'],
          ['Move old lake data to Cool with a lifecycle rule', usd(saved('life')), 'mission 2', 'Minimum days and read fees apply. Do not move data that is still read.'],
          ['Write bigger batches of events and files', usd(saved('batch')), 'missions 2 and 9', 'Bigger batches mean more delay before data lands.'],
          ['Query Parquet and not CSV in serverless', usd(saved('parquet')), 'mission 7', 'It needs a conversion job and a schema.']
        ],
        steps: [
          { upto: 2, say: 'The two big ones. A pool that sleeps, and logs that are chosen. They are ' + Math.round((saved('pause') + saved('logs')) / T0 * 100) + ' percent of the month between them.' },
          { upto: 5, say: 'The small ones. Each is worth doing once and none of them changes the picture alone. All five together save ' + usd(T0 - T1, 0) + ', from ' + usd(T0, 0) + ' to ' + usd(T1, 0) + '.' }
        ],
        pick: 'Do the **big levers first**: sleep what idles, and choose what you log. Then do the small ones once. **Change one thing at a time** and measure the line, so that you know which lever worked.'
      }),

      B.code({
        id: 'm12-pause', t: 1, src: 'docs', title: 'Pause the pool on a schedule', file: 'pause_pool.sh', lang: 'bash', code: PAUSE,
        steps: [
          { say: 'Pausing is one command, and the saving is the biggest of the five. Press Next.', lines: null },
          { say: '`pause` releases the compute. The tables stay in storage, and the compute charge stops. Run it when the last dashboard user has gone home, from a scheduled pipeline, a runbook or a workflow, with an identity that has a role that can pause the pool.', lines: G.span(PAUSE, /sql pool pause/) },
          { say: '`resume` starts the compute again, and takes a few minutes. Schedule it before the nightly load, and before the first people arrive, so that nobody waits.', lines: G.span(PAUSE, /sql pool resume/) },
          { say: 'A last check for the schedule itself: ask for the state, and alert when the pool is online out of hours. Mission 8 told the story of a pool that nobody paused for a weekend.', lines: G.span(PAUSE, /sql pool show/) }
        ],
        note: 'From the documentation, not run. Check the arguments with `az synapse sql pool pause --help`. The schedule belongs in a pipeline or a template, so that it is reviewed like code.'
      }),

      B.talk({
        id: 'm12-logs', t: 1, src: 'docs', title: 'Why logs get expensive, and what to do',
        say: 'A log workspace bills for what you send, whether anyone reads it or not. Press Next for five facts and one habit.',
        items: [
          ['You pay by the GB that you ingest', 'The Analytics plan bills for each GB that arrives. At the example rate of ' + usd(BI.rate.laGB) + ' a GB, ' + n0(BI.use.laGB) + ' GB cost ' + usd(BI.use.laGB * BI.rate.laGB, 0) + ' in the lab: the second biggest line.', 'Ingestion is the meter.'],
          ['Three plans', 'Analytics logs support full queries and alerts. Basic logs cost less to ingest and are meant for verbose logs that you search now and then, and a search is billed by the data it scans. Auxiliary logs cost least, for data that you rarely read. Check the pricing page for the rates and the status of each plan.', 'Cheaper plans, fewer features.'],
          ['Commitment tiers', 'For Analytics logs, a commitment tier from 100 GB a day gives a discount against pay-as-you-go, and Microsoft says up to about 30 percent. It pays only for a workspace that steadily ingests that much.', 'For steady, large workspaces.'],
          ['Retention', 'Data stays free for 31 days in Analytics logs, and for 30 days in Basic and Auxiliary logs. After that, retention is billed for each GB and month. If a rule demands a year, keep the old data in the cheaper archive tier, or in storage.', 'Free for a month, then billed.'],
          ['Choose the categories', 'A diagnostic setting can send every category or only some. The read logs of a lake record every request, so a busy Spark cluster makes them huge. Send writes, deletes and failures, and look for reasons before you send reads.', 'Do not send everything.']
        ],
        cols: 1
      }),

      B.code({
        id: 'm12-usage', t: 2, src: 'rec', title: 'Which tables fill the workspace?', file: 'billable_usage.kql', lang: 'kql', code: USAGE,
        steps: [
          { say: 'Before you cut a log, find out which one is big. The `Usage` table of the workspace records what each table ingested. Press Next.', lines: null },
          { say: 'The filter keeps the last 30 days and only the data that is billable. Some data, such as the Activity log, is free.', lines: G.span(USAGE, /^\| where/) },
          { say: '`Quantity` is in MB, so dividing by 1000 gives GB. `summarize` adds it up for each data type, which is the name of a table.', lines: G.span(USAGE, /^\| summarize/) },
          { say: '`top 10` keeps the ten biggest. The first one or two usually explain the bill. Ask who needs them, and for how long.', lines: G.span(USAGE, /^\| top/) }
        ],
        note: 'The Kusto language service of Microsoft parsed this query without errors. That checks syntax only, since it has no table schemas, so the table and column names come from the documentation of the workspace tables.'
      }),

      B.talk({
        id: 'm12-tags', t: 1, src: 'docs', title: 'Tags: so that every cost has an owner',
        say: 'A bill that you cannot split is a bill that nobody owns. Press Next for how to make it splittable.',
        items: [
          ['The first tags are the structure', 'One subscription for each environment and one resource group for each workload split most of the bill before you add a tag. Brewline uses sub-brewline-prod and sub-brewline-dev, as in mission 0.', 'Structure first.'],
          ['Four tags', 'Use few tags and use them everywhere: owner, cost centre, environment and workload. A tag that nobody fills in is worse than none.', 'Few tags, always set.'],
          ['Enforce by policy', 'An Azure Policy can require the tags when a resource is created, and can copy a tag from the resource group to its resources. A tag that depends on memory is missing within a month.', 'Policy, not memory.'],
          ['Some cost cannot be tagged', 'Some charges belong to shared resources, such as a log workspace or a firewall. Agree on a rule to share them, for example by the share of use, and write the rule down.', 'Shared cost needs a rule.'],
          ['Show people their own bill', 'Send each owner a view of their own cost every month. The teams that see their bill act on it. This is showback, and it works before any chargeback.', 'Showback first.']
        ],
        cols: 1
      }),

      B.talk({
        id: 'm12-budget', t: 1, src: 'docs', title: 'Budgets are an alarm, not a brake',
        say: 'A budget tells you. It does not stop anything. Press Next for what that means in practice.',
        items: [
          ['An alarm', 'A budget in cost management sends alerts when spending reaches a threshold. By default it does not stop or limit any resource. If you want an action, you build it.', 'It tells you, and that is all.'],
          ['Actual and forecast', 'A threshold can be set on the actual cost or on the forecast cost. A forecast alert at 90 percent can arrive in the middle of the month, while there is still time to act. An actual alert at 100 percent arrives when the money is gone.', 'Forecast gives time.'],
          ['An action group', 'A budget at subscription or resource group scope can call an action group: an email, a chat message, a webhook. A webhook or a function can then do something, such as pause a pool. That code is yours to write and test.', 'Automation is custom.'],
          ['Scope', 'Set one budget for each environment, and for each big workload. A single budget for the whole tenant hides the one pool that grew. A small dev budget catches a forgotten test early.', 'Budgets close to the owners.'],
          ['Anomaly alerts', 'Cost management can also flag a sudden change in daily cost, which a budget cannot see until the end of the month. Check that it is available for your scope, and who receives it.', 'A budget sees the total, an anomaly sees the jump.']
        ],
        cols: 1
      }),

      B.code({
        id: 'm12-budget-code', t: 2, src: 'docs', title: 'A budget as code', file: 'modules/budget.bicep', lang: 'bicep', code: BUDGET,
        steps: [
          { say: 'The budget belongs in the template, like everything else. This is the module of the Brewline set. Press Next.', lines: null },
          { say: 'The amount, the period and the category. This budget is monthly and starts on the first day of a month.', lines: G.span(BUDGET, /category: 'Cost'/, /startDate/) },
          { say: 'The first notification is the one that gives time: at 90 percent of the forecast, an email. It fires in the middle of the month, if the pace says that the budget will be passed.', lines: G.span(BUDGET, /forecast90: \{/, /^      \},?$/) },
          { say: 'The second fires when 100 percent of the budget has been spent. It is late, and it is the last line. Both go to a mailbox, and it should be a team address and not a person.', lines: G.span(BUDGET, /actual100: \{/, /^      \},?$/) }
        ],
        note: 'The file is `azure/verify/iacproj/modules/budget.bicep`, part of the template set of mission 13. Checkov has no rules for budgets, so nothing about these properties was checked, and the Bicep was not compiled. Check the property names against the current reference.'
      }),

      B.talk({
        id: 'm12-commit', t: 2, src: 'docs', title: 'Commitments: reservations and plans',
        say: 'A commitment buys a lower price for a promise. Press Next for what to promise and what to do first.',
        items: [
          ['Reserved capacity', 'For a dedicated SQL pool you can reserve a number of DWUs for one or three years, and pay up front or monthly. The discount applies to the compute of pools that match the scope and the region. A reservation does not renew by itself, and when it ends you pay the normal rate.', 'A promise of hours.'],
          ['You pay for the promised hours', 'A reservation bills every hour, whether the pool runs or not. Pausing a reserved pool saves nothing on the reserved part. So a commitment fits a pool that runs most of the time, and not a pool that sleeps half the day.', 'Reserved hours are paid.'],
          ['Other plans', 'Some services also have pre-purchase plans or savings plans, such as units for Synapse or Databricks. The products and discounts change, so read the current page and compare with what your usage really is.', 'Check what exists now.'],
          ['The order of work', 'Cut first, commit after. Pause what idles, choose the logs, fix the queries, and then reserve the hours that are left. A reservation on a wasteful setup locks the waste in for years.', 'Optimize, then commit.']
        ],
        cols: 1
      }),

      B.cmp({
        id: 'm12-breakeven', t: 2, src: 'docs', title: 'Pause or reserve? The break-even',
        say: 'Compare two ways to cut a pool. Pausing 12 hours a day costs half of the always-on bill. A reservation costs a fixed share, whatever the pool does. The discounts below are examples, not quotes.',
        cols: ['Example discount', 'Reserved cost', 'Pause 12 hours a day', 'Cheaper'],
        hl: 3,
        rows: [20, 35, 50, 65].map(function (d) { var r = 100 - d; return [d + ' percent', r + ' percent of always on', '50 percent of always on', r > 50 ? 'pausing' : r === 50 ? 'the same' : 'the reservation']; }),
        steps: [
          { upto: 2, say: 'With a discount of 20 or 35 percent, a reservation costs 80 or 65 percent of always on. Pausing half the day costs 50, so pausing wins.' },
          { upto: 4, say: 'At 50 percent the two are equal, and above it the reservation wins. A pool that runs all day and all night is the one to reserve.' }
        ],
        pick: 'A reservation wins only when its **cost share is below the share of hours** that the pool would run. Compare the two with your real discount, and reserve what you cannot pause.'
      }),

      B.talk({
        id: 'm12-governance', t: 2, src: 'docs', title: 'Guardrails and a monthly habit',
        say: 'A cost process is a few guardrails and a habit. Press Next for four of them.',
        items: [
          ['Azure Policy as guardrail', 'Require tags, limit the allowed regions and the allowed SKUs, deny the very big sizes in dev, and audit resources that have no diagnostic setting. A policy says no before the money is spent.', 'A rule that says no early.'],
          ['Advisor recommendations', 'Azure Advisor lists cost recommendations, such as idle resources or sizes that are too big. Read them once a month, and decide, since some recommendations do not fit a data platform.', 'Read, then decide.'],
          ['Small budgets for dev', 'Give dev its own small budget, with alerts to the engineers who work there. Auto-pause what can pause, and give test resource groups an expiry tag, so that a script can delete them.', 'Dev is where waste starts.'],
          ['A monthly review', 'Thirty minutes a month: the biggest lines, what changed, who owns each, and what we do about it. Write the decisions down. The habit matters more than any tool.', 'A short meeting, every month.']
        ],
        cols: 1
      }),

      B.talk({
        id: 'm12-export', t: 3, src: 'docs', title: 'Cost data as files in the lake',
        say: 'The bill is data, so a data team can keep it in the lake. Press Next for how.',
        items: [
          ['Exports', 'Cost Management can write your cost data to a storage account on a schedule, daily, weekly or monthly, as CSV or Parquet files. The scope can be a subscription, a resource group, a management group or a billing account.', 'The bill as files.'],
          ['Why a data team wants it', 'Files in the lake can be queried with the tools that you use for orders. A serverless query over the cost files tells you which service, tag or resource group grew, and a pipeline can join the cost with business numbers such as the cost for each order.', 'Query the bill like any data.'],
          ['Freshness', 'Cost data can arrive a day or two late, so a daily file can miss the latest usage. Check how fresh the files are before you build an alert on them.', 'Late data, early alert.'],
          ['Setup', 'The export has to be allowed to write to the account, past its firewall too. Read the current page for the exact setup, because the identity and the network rules are the usual reason an export fails.', 'Let the export in.']
        ],
        cols: 1
      }),

      B.decide({
        id: 'm12-dec', t: 2, src: 'docs', title: 'Decision: the bill is twice what was planned',
        scenario: 'The Brewline month is **' + usd(T0, 0) + '**, double the plan. The dedicated pool is **' + usd(SORTED[0][1], 0) + '**, the log workspace **' + usd(SORTED[1][1], 0) + '** and the lake storage **' + usd(SORTED[2][1], 0) + '**. The pool runs 24 hours a day, and queries come only in business hours. Finance wants a **first step this week**.',
        opts: [
          { t: 'Buy a three-year reservation for the dedicated pool', d: 'A guaranteed discount on the biggest line.', lose: 'It locks in the always-on cost. Pausing 12 hours a day halves the hours, and a reservation beats that only above a 50 percent discount. The pool may also be too big for its load.' },
          { t: 'Pause the pool outside business hours, cut the log categories to the useful ones, and look at the smaller lines after that', d: 'In the lab, ' + usd(saved('pause'), 0) + ' and ' + usd(saved('logs'), 0) + ' are saved, ' + usd(saved('pause') + saved('logs'), 0) + ' of ' + usd(T0, 0) + ', with no new contract.' },
          { t: 'Move all of the lake to the Archive tier', d: 'The cheapest storage tier.', lose: 'Archive has a minimum of 180 days and needs hours to rehydrate, the storage line is only ' + usd(SORTED[2][1], 0) + ', and the data is read every day.' }
        ],
        pick: 1,
        why: 'The two biggest lines are things that run when nobody looks: a pool and a log workspace. Pausing and choosing logs change no contract and can be undone in an hour. A reservation can come later, for the hours that remain, and the storage tiers are a small lever here.',
        when: 'If the pool must answer queries all day and night, a reservation is the right next step. Compare its discount with the share of hours, as on the break-even screen.'
      }),

      B.quiz({
        id: 'm12-q1', t: 1,
        q: 'In the lab, which line is the biggest, and why?',
        opts: [
          { t: 'The lake storage, because 40 TB is a lot', fb: 'Storage is ' + usd(SORTED[2][1], 0) + ', the third line.' },
          { t: 'The dedicated pool, because it bills for every hour that it is on', fb: '' },
          { t: 'Data Factory, because it runs every day', fb: 'Data Factory is a small line, a few hundred dollars.' },
          { t: 'Key Vault, because every job reads secrets', fb: 'Key Vault is the smallest line.' }
        ],
        ok: 1, why: 'The pool is ' + usd(SORTED[0][1], 0) + ', ' + SHARE(SORTED[0]) + ' of the month, because 720 hours are billed at its size, whether a query runs or not.'
      }),

      B.quiz({
        id: 'm12-q2', t: 1,
        q: 'You pause the dedicated pool for the night. What does it still cost?',
        opts: [
          { t: 'Nothing at all', fb: 'The tables stay in storage.' },
          { t: 'The storage of its tables, and nothing for compute', fb: '' },
          { t: 'The full price, but at a lower rate', fb: 'Compute stops billing when the pool is paused.' },
          { t: 'Only the queries that ran before the pause', fb: 'A pool is billed by hours, not by query.' }
        ],
        ok: 1, why: 'Pausing releases the compute and its charge. The data stays in Azure Storage, and storage bills all the time.'
      }),

      B.quiz({
        id: 'm12-q3', t: 1,
        q: 'A budget of $8,000 reaches 100 percent in the middle of the month. What does Azure do to the resources?',
        opts: [
          { t: 'Nothing by default. It sends the alerts that you set, and you can build an action', fb: '' },
          { t: 'It stops every resource in the scope', fb: 'A budget does not stop anything by default.' },
          { t: 'It deletes the most expensive resource', fb: 'It never deletes.' },
          { t: 'It scales every service down to the lowest size', fb: 'There is no such action built in.' }
        ],
        ok: 0, why: 'A budget is an alarm. Any action, such as pausing a pool, is code that an action group calls, and you must build and test it.'
      }),

      B.quiz({
        id: 'm12-q4', t: 2,
        q: 'You move a verbose table to the Basic plan of Log Analytics. What does a search of it bill?',
        opts: [
          { t: 'Nothing, because Basic logs are free to query', fb: 'Searches are billed.' },
          { t: 'The GB of data that the search scans', fb: '' },
          { t: 'A fixed price for each query', fb: 'The charge follows the data scanned.' },
          { t: 'Only the number of rows returned', fb: 'Rows returned do not set the charge.' }
        ],
        ok: 1, why: 'Basic logs cost less to ingest, and a search is billed by the data that it scans. They suit verbose logs that you search now and then, and not logs behind alerts.'
      }),

      B.quiz({
        id: 'm12-q5', t: 2,
        q: 'A reservation gives a 35 percent discount on a pool. At what share of the hours does it beat pay-as-you-go with pausing?',
        opts: [
          { t: 'When the pool would run more than 65 percent of the hours', fb: '' },
          { t: 'When the pool would run more than 35 percent of the hours', fb: 'The reservation costs 65 percent of always on, not 35.' },
          { t: 'Always, because it is cheaper per hour', fb: 'A reservation bills every hour, even the hours that you would have paused.' },
          { t: 'Never, because pausing is free', fb: 'Pausing is cheap, and a deep discount can still win for a pool that runs all day.' }
        ],
        ok: 0, why: 'The reservation costs 65 percent of the always-on price, whatever the pool does. Pay-as-you-go costs the share of hours that the pool runs. They are equal at 65 percent, and the reservation is cheaper above it.'
      }),

      B.quiz({
        id: 'm12-q6', t: 1,
        q: 'Which log setting is the usual cause of a workspace that suddenly bills much more?',
        opts: [
          { t: 'A diagnostic setting that sends every category, including the read logs of a busy lake', fb: '' },
          { t: 'A shorter retention period', fb: 'Retention bills stored data. Ingestion is the big meter.' },
          { t: 'A new alert rule', fb: 'An alert rule has a small charge.' },
          { t: 'A new tag on the workspace', fb: 'Tags are free.' }
        ],
        ok: 0, why: 'Every request to a busy lake can become a log row. Sending all categories ingests all of them, and ingestion is billed for each GB. Choose the categories, and look for the biggest tables with the `Usage` query.'
      }),

      B.order({
        id: 'm12-ord', t: 1, q: 'Put a monthly cost review in order.',
        items: [
          'Open cost analysis, grouped by service, and find the biggest bar',
          'Look at the daily chart for a step, and find what changed that day',
          'Read the meter of the biggest lines, and ask the owner with the number',
          'Pick one lever, change one thing, and measure the line',
          'Write the finding and its owner down',
          'Check that the budget and the alerts still fit the new picture'
        ],
        why: 'The review goes from the biggest line to the cause, then to one change that you can measure. The finding is written down with an owner so that it is done, and the budget is updated so that the next surprise is smaller.'
      }),

      B.bug({
        id: 'm12-bug', t: 1, src: 'docs', q: 'The log workspace is the second biggest line of the bill. Click the line of this diagnostic setting that causes it.',
        file: 'diag.bicep', lang: 'bicep', code: BUG_DIAG, bad: [8],
        hint: 'Which categories does this send?',
        why: 'The category group `allLogs` sends every log category of the lake, including the read log of every request. A busy Spark cluster makes millions of reads, and each one becomes a row that is billed by the GB. Choose the categories that you use, such as writes and deletes. The Bicep was not compiled here, so check the category names against the reference.',
        fix: FIX_DIAG,
        cheer: 'Send what you will read.'
      }),

      B.bug({
        id: 'm12-bug2', t: 2, src: 'docs', q: 'The team gets the budget email on the 28th, after a month that went over by 40 percent. Click the line that makes the alert too late.',
        file: 'budget.bicep', lang: 'bicep', code: BUG_BUDGET, bad: [5, 6],
        hint: 'When does an alert on the actual cost fire?',
        why: 'An actual cost of 100 percent means that the whole budget has been spent. There is no time left to act. A forecast alert at 90 percent fires when the pace says that the budget will be passed, which can be in the middle of the month. Keep the actual alert as the last line, and add a forecast alert before it.',
        fix: FIX_BUDGET,
        cheer: 'Alert on the forecast, not on the spend.'
      }),

      B.challenge({
        id: 'm12-ch', t: 2, title: 'Coding round: the three biggest lines', file: 'top_lines.sql', lang: 'sql',
        q: 'The table `bill` holds the ten lines of the lab with their amount for the month. **Write a query that returns the three biggest lines with their share of the total**, in percent with one decimal.',
        data: [{ name: 'bill (the lab month, example rates)', cols: ['line', 'amount'], rows: BASE.map(function (r) { return [r[0], r[1].toFixed(2)]; }) }],
        starter: '-- the three biggest lines, and their share of the month\nSELECT ...\nFROM bill',
        hints: ['Sort by `amount` descending and keep three rows.', 'The total of the month next to each row is a window function: `SUM(amount) OVER ()`.', 'Multiply by 100.0 so that the share is not rounded to a whole number.'],
        sol: SQL_TOP,
        res: { msg: '3 rows', cols: ['line', 'amount', 'share_percent'], rows: SORTED.slice(0, 3).map(function (r) { return [r[0], r[1].toFixed(2), (Math.round(r[1] / T0 * 1000) / 10).toFixed(1)]; }) },
        expl: ['`SUM(amount) OVER ()` puts the total of the month on every row, so the share needs no subquery.', '`100.0 * amount / SUM(...)` uses decimals, and `ROUND(..., 1)` keeps one decimal.', 'The first two lines are ' + TOP2.toFixed(1) + ' percent of the month together. Most bills look like that, and it is why you start with the biggest bar.', 'The amounts are arithmetic at the example rates of the lab, and the usage is made up.'],
        cx: 'One sort of ten rows. The point is the habit: a share of the total says more than an amount.'
      }),

      B.incident({
        id: 'm12-inc', t: 2, src: 'docs', title: 'Incident: the log workspace tripled the bill', time: '09:20',
        alert: '**The Log Analytics line went from ' + usd(BI.use.laGB * BI.rate.laGB, 0) + ' to more than three times that this month.** On the 3rd, an engineer added a diagnostic setting with the category group allLogs to the lake account, "so that nothing is missed". A Spark cluster reads the lake all day. The `Usage` query shows one table taking most of the new volume.',
        clues: ['The step in the daily chart starts on the 3rd', 'The new table holds the read logs of the lake', 'Nobody has queried those logs'],
        opts: [
          { t: 'Change the diagnostic setting to the categories that are used, such as writes and deletes, keep the read logs on the cheaper Basic plan or off, and set a budget on the workspace', fb: '' },
          { t: 'Delete the workspace', fb: 'It deletes the history and breaks every alert that reads from it.' },
          { t: 'Set the retention to zero days', fb: 'Retention bills stored data. The big meter is what is ingested, and it would still be ingested.' },
          { t: 'Raise the budget so that the alert stays quiet', fb: 'It hides the cost and does nothing about it.' }
        ],
        best: 0,
        why: 'Ingestion is the meter, and the read logs of a busy lake are huge. In the lab, ' + n0(BI.use.laGB) + ' GB at the example rate cost ' + usd(BI.use.laGB * BI.rate.laGB, 0) + ', and choosing categories saved ' + usd(saved('logs'), 0) + '. Keep the logs that you read and alert on, and send the rest to a cheaper plan or nowhere.',
        checks: [
          ['Find the step', 'The daily chart shows the day that the cost jumped.'],
          ['Find the table', 'The Usage query lists the tables by GB.'],
          ['Ask who reads it', 'If nobody queries a table, ask why it is sent.'],
          ['Choose categories', 'Writes, deletes and failures first, and reads only for a reason.'],
          ['Add a guard', 'A budget on the workspace, and a policy that audits diagnostic settings.']
        ],
        tell: 'The log line tripled because a diagnostic setting with all categories was added to the lake on the third, so the read logs of a Spark cluster that reads all day were ingested at the full rate. I found the step on the daily chart, confirmed the table with the Usage query, and changed the setting to the categories that we query, writes, deletes and failures, with the read logs on a cheaper plan. I added a budget on the workspace and a policy that audits diagnostic settings.',
        prevent: ['**Choose** categories', 'Look at the **Usage** table each month', 'Put a **budget** on the workspace', 'Audit **diagnostic settings** with policy']
      }),

      B.incident({
        id: 'm12-inc2', t: 2, src: 'docs', title: 'Incident: the invoice was 40 percent over and no alert fired', time: '10:00',
        alert: '**The month ended 40 percent over the plan, and nobody heard anything until finance sent the invoice.** There is one budget for the whole subscription, with one notification: 100 percent of the actual cost, sent to the mailbox of an engineer who left in February.',
        clues: ['The only alert fires after the money is spent', 'The email goes to a person who has left', 'One budget covers every workload'],
        opts: [
          { t: 'Add a forecast alert at 90 percent, send alerts to a team channel through an action group, split the budget by environment, and turn on anomaly alerts', fb: '' },
          { t: 'Lower the budget amount', fb: 'The alert would fire sooner, and it would still go to the wrong mailbox and still arrive late.' },
          { t: 'Remove the budget and review the bill every quarter', fb: 'A quarterly review is slower than the current setup.' },
          { t: 'Lock the subscription so that nothing can be created', fb: 'It stops the work and does nothing about the cause.' }
        ],
        best: 0,
        why: 'A budget is an alarm, so the alarm has to be early and must reach someone. A forecast alert gives time in the middle of the month, an action group sends it to a team channel and not a person, and a budget for each environment shows which part of the platform grew. An anomaly alert catches a jump that the monthly total hides.',
        checks: [
          ['Read the alert settings', 'Who is the contact, and when does it fire?'],
          ['Find the growth', 'Group the month by resource group and by tag to see which part went over.'],
          ['Fix the alert', 'A forecast threshold, an action group with a team channel.'],
          ['Split the budget', 'One for each environment and each big workload.'],
          ['Test it', 'Send a test notification, and check who receives it.']
        ],
        tell: 'The overrun went unnoticed because the only alert fired at one hundred percent of the actual cost and was emailed to someone who had left. I added a forecast alert at ninety percent, sent the alerts to a team channel through an action group, split the budget by environment so that the growth shows where it is, and turned on anomaly alerts. I tested the notification, and the owner list is reviewed each quarter.',
        prevent: ['Alert on the **forecast**', 'Send alerts to a **team**, not a person', '**Split** budgets by environment', '**Test** the notification']
      }),

      B.qa({
        id: 'qa-cost-first', t: 1, tag: 'Cost', secs: 75,
        q: 'Your Azure bill doubled this month. How do you find out why?',
        pts: ['Cost analysis grouped by service, then resource group, then resource', 'The daily chart: a step is a change, a slope is growth', 'Read the meter of the biggest lines', 'Group by tag to find the owner', 'Ask the owner with a number', 'Change one thing and measure'],
        short: 'I start in cost analysis and group by service, and I look at the biggest bar first, since a few lines are usually most of the bill. Then I group by resource group and by resource, and I look at the daily chart: a step on one day points to a change on that day, such as a bigger pool or a new diagnostic setting, and a slow climb points to growth in data or logs.\n\nI read the meter of the biggest lines, hours, GB, operations or TB, because it tells me which lever can move the line. I group by tag to find the owner, and I ask the owner with a number, for example that a pool was on for 720 hours and 360 would do.\n\nThen I change one thing and measure the line, so that I know the change worked.',
        fu: [
          ['What if there are no tags?', 'Use the resource groups and subscriptions, ask around, and then fix the tags with a policy.'],
          ['What is usually the cause?', 'A compute resource that runs all day, or a log workspace that takes everything.']
        ],
        trap: 'Cutting small things first and leaving the two big lines alone.',
        real: 'Describe a bill that you investigated, what you found, and what you changed.'
      }),

      B.qa({
        id: 'qa-cost-levers', t: 1, tag: 'Cost', secs: 90,
        q: 'How would you cut the cost of a data platform on Azure?',
        pts: ['Pause what idles: the dedicated pool and clusters, on a schedule', 'Choose the logs: categories, plans and retention', 'Storage: lifecycle rules, bigger files, the right redundancy', 'Serverless: Parquet, named columns, folders and gold tables', 'Event Hubs and files: batch to cut requests', 'Measure first, change one thing at a time, then commit'],
        short: 'I measure first, then I pull the levers by size. The biggest are things that run when nobody looks: I pause the dedicated pool outside business hours, and I use job clusters that stop after the run. In the lab month, pausing 12 hours a day saved more than a quarter of the bill.\n\nThe second is logs: I send only the categories that I use, put verbose tables on a cheaper plan, and set retention on purpose.\n\nThen the data itself. For storage I use lifecycle rules for old data, bigger files to cut operations, and the redundancy that the data needs. For serverless SQL I use Parquet, name the columns and skip folders. For events and files, I batch, because the client counts requests.\n\nI change one thing at a time and measure the line. Only when the base is lean do I consider a reservation.',
        fu: [
          ['What do you check before you move data to Cool?', 'The minimum days, the read fees, and whether the data is still read.'],
          ['When do you reserve?', 'For hours that you cannot pause, with the break-even worked out first.']
        ],
        trap: 'Buying a reservation before you have cut the waste.',
        real: 'Describe a saving that you made, with the numbers before and after.'
      }),

      B.qa({
        id: 'qa-budgets', t: 1, tag: 'Cost', secs: 60,
        q: 'How do you stop a surprise bill?',
        pts: ['A budget is an alarm: it does not stop resources by default', 'Forecast alerts give time, actual alerts come late', 'Alerts go to a team through an action group', 'One budget for each environment and big workload', 'Anomaly alerts for sudden jumps', 'Automation, such as a pause, is custom code'],
        short: 'I use budgets as an alarm and I design them to be early. A budget does not stop anything by default, so I set a forecast alert at about 90 percent, which can fire in the middle of the month, and an actual alert at 100 percent as the last line. The alerts go to a team channel through an action group, and not to one person, and I split the budgets by environment and by big workload so that the growth shows where it is.\n\nI add anomaly alerts for sudden jumps that the monthly total hides, and a small budget for dev with auto-pause where possible.\n\nIf I want an action, for example to pause a pool, I build it as a function or a runbook that the action group calls, and I test it, since it is my code and not a built-in brake.',
        fu: [
          ['Does a budget stop resources?', 'No, not unless you build an action for it.'],
          ['Who gets the alert?', 'A team address or channel, reviewed every quarter, never one engineer.']
        ],
        trap: 'One budget, one alert at 100 percent, to one mailbox.',
        real: 'Describe an alert that told you about a cost problem early.'
      }),

      B.qa({
        id: 'qa-logs-cost', t: 2, tag: 'Cost', secs: 75,
        q: 'Why are logs expensive in Azure, and how do you control that?',
        pts: ['Log Analytics bills by the GB that you ingest, then by retention', 'Three plans: Analytics, Basic and Auxiliary, with different features and prices', 'Commitment tiers from 100 GB a day for steady workspaces', 'Free retention: 31 days in Analytics logs, 30 in the others', 'Diagnostic settings: choose categories, since read logs of a busy lake are huge', 'The Usage table shows which tables are big'],
        short: 'The workspace bills for what you ingest, for each GB, and then for retention beyond the free days: 31 for Analytics logs and 30 for Basic and Auxiliary logs. So the cost follows the categories that you send. A diagnostic setting with all categories on a busy lake ingests the read log of every request, which can be enormous.\n\nI control it in four ways. I choose the categories that I query and alert on, such as writes, deletes and failures. I put verbose tables on the Basic plan, knowing that searches are billed by the data scanned and that they do not feed alerts. For a steady workspace of 100 GB a day or more, I look at a commitment tier. And I set retention to the rule that I must meet, using an archive for long keeps.\n\nTo find the culprit, I query the Usage table and group the billable data by table.',
        fu: [
          ['What is free?', 'Some data types, such as the Activity log, are not billed for ingestion.'],
          ['What do Basic logs give up?', 'Full queries and alerts. They are for searching verbose logs now and then.']
        ],
        trap: 'Turning on every category "so that nothing is missed".',
        real: 'Describe a log workspace that you right-sized, and what you kept.'
      }),

      B.qa({
        id: 'qa-commitments', t: 2, tag: 'Cost', secs: 75,
        q: 'When do you buy a reservation or a commitment on Azure?',
        pts: ['After the waste is cut: pause, logs, queries', 'A reservation bills every hour, whether the resource runs or not', 'It beats pausing only when its cost share is below the share of hours', 'Dedicated pool: reserved cDWUs for one or three years, no auto-renewal', 'Other plans exist for some services: read the current page', 'Review the usage before renewal'],
        short: 'Last, and for the hours that I cannot pause. A reservation bills every hour, whether the resource runs or not, so it fits something that runs most of the time. For a dedicated SQL pool I can reserve a number of cDWUs for one or three years, and it does not renew by itself.\n\nI work out the break-even first. A reservation with a 35 percent discount costs 65 percent of the always-on price, so it beats pay-as-you-go only when the pool would run more than 65 percent of the hours. Pausing 12 hours a day costs 50 percent, so there pausing wins, and at a 65 percent discount the reservation wins.\n\nOther plans exist for some services, such as pre-purchase units, and I read the current page. And I cut the waste before I commit, because a reservation on a wasteful setup locks the waste in.',
        fu: [
          ['What happens when it expires?', 'The resources keep running at the pay-as-you-go rate. Plan the renewal.'],
          ['What if the workload shrinks?', 'The reserved hours are still paid, which is the risk of a commitment.']
        ],
        trap: 'Reserving a pool that you could pause half of the day.',
        real: 'Describe a commitment that you bought or declined, and the arithmetic behind it.'
      }),

      B.qa({
        id: 'qa-finops', t: 2, tag: 'Cost', secs: 75,
        q: 'How do you make teams own their cloud cost?',
        pts: ['Structure: a subscription for each environment, a resource group for each workload', 'A few required tags, enforced and inherited by policy', 'Showback: send each team its own cost every month', 'Budgets and alerts close to the owners', 'A short monthly review with decisions written down', 'Guardrails with policy: allowed sizes and regions, expiry for test resources'],
        short: 'I start with structure: a subscription for each environment and a resource group for each workload, which splits most of the bill before any tag. Then a few tags, owner, cost centre, environment and workload, required and inherited by Azure Policy, since a tag that depends on memory is missing within a month.\n\nI show each team its own cost every month, showback, because teams that see their bill act on it. Each team gets budgets and alerts for its own part, going to a channel and not a person. Once a month I hold a thirty-minute review of the biggest lines and what changed, and I write down who does what.\n\nPolicy adds guardrails: allowed regions and sizes, limits in dev, and an expiry tag on test resource groups so that a script can clean them up.',
        fu: [
          ['What about shared cost?', 'Agree a rule, such as the share of use, and write it down.'],
          ['Chargeback or showback?', 'Showback first. Chargeback needs a trusted split and a finance process.']
        ],
        trap: 'A cost report that only the platform team reads.',
        real: 'Describe how cost became visible to the teams in a place you worked.'
      }),

      B.recap({
        id: 'm12-recap', n: 12, badge: 'Cost Watcher', color: '#D9F99D',
        pts: [
          'Know the **meter**: hours, GB, TB processed, operations. The meter names the lever.',
          'Two lines are most of a bill: the **dedicated pool** and the **log workspace** took ' + Math.round(TOP2) + ' percent of the lab month.',
          '**Pause** what idles, **choose** the logs, then lifecycle, batching and Parquet. Change one thing and measure.',
          'A **budget is an alarm**, not a brake. Alert on the **forecast**, send it to a **team**, and split it by environment.',
          'A **reservation** bills every hour. It beats pausing only above the break-even share of hours. Cut first, commit after.'
        ],
        lines: [
          'I find the biggest line before I touch a small one.',
          'I alert on the forecast, never only on the spend.',
          'I cut first and commit after.'
        ]
      })
    ]
  });

  function n0(n) { return Number(n).toLocaleString('en-US'); }
})();
