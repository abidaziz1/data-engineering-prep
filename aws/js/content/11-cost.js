/* Mission 11: cost and operations. The bill lab is arithmetic: example rates after public US East prices applied to a made-up month of Brewline usage,
   checked by hand in aws/verify/check_widgets.js. The code of this mission was checked against the AWS SDK service models, and the CloudWatch and Logs
   calls were run against moto, an AWS emulator, by aws/verify/verify_aws.py. Prices, limits and the descriptions of the cost tools come from
   documentation and change often. Nothing here ran on AWS. */
(function () {
  var B = LAB.b, G = LAB.get;
  var BI = LAB.W.billInfo, TODAY = BI.presets.today.v;
  var L0 = BI.lines(TODAY), T0 = BI.total(L0), SAVE = {}, LEV = ['parquet', 'life', 'gateway', 'flex', 'arm'];
  LEV.forEach(function (k) { var lv = {}; lv[k] = true; SAVE[k] = T0 - BI.total(BI.lines(TODAY, lv)); });
  var ALL = T0 - BI.total(BI.lines(TODAY, { parquet: true, life: true, gateway: true, flex: true, arm: true }));
  function num(n, d) { return n.toLocaleString('en-US', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }); }
  function usd(n) { return '$' + (n >= 100 ? num(n, 0) : num(n, 2)); }
  function line(k) { return L0.filter(function (l) { return l.k === k; })[0].cost; }
  G.expect(Math.round(T0 * 100) === 101815 && Math.round(SAVE.parquet) === 90 && Math.round(SAVE.flex) === 45 && Math.round(SAVE.gateway) === 18 && Math.round(SAVE.life * 100) === 1470 && Math.round(SAVE.arm) === 1 && Math.round(ALL * 100) === 16870, 'the bill today is $1,018.15, and the five savings add up to $168.70');
  G.expect(Math.round(line('redshift')) === 375 && Math.round(line('glue')) === 264 && Math.round(line('athena')) === 100, 'the three biggest lines');
  var BY_COST = L0.slice().sort(function (a, b) { return b.cost - a.cost; });
  var SHARE = {}; L0.forEach(function (l) { SHARE[l.k] = l.cost / T0 * 100; });

  var CE = [
    'import boto3',
    '',
    'ce = boto3.client("ce", region_name="us-east-1")',
    '',
    'out = ce.get_cost_and_usage(',
    '    TimePeriod={"Start": "2026-03-01", "End": "2026-04-01"},',
    '    Granularity="MONTHLY",',
    '    Metrics=["UnblendedCost"],',
    '    GroupBy=[{"Type": "TAG", "Key": "pipeline"}],',
    ')',
    'for group in out["ResultsByTime"][0]["Groups"]:',
    '    print(group["Keys"][0], group["Metrics"]["UnblendedCost"]["Amount"])'
  ].join('\n');

  var BUDGET = [
    'import boto3',
    '',
    'bud = boto3.client("budgets", region_name="us-east-1")',
    '',
    'bud.create_budget(',
    '    AccountId="123456789012",',
    '    Budget={',
    '        "BudgetName": "data-platform-monthly",',
    '        "BudgetLimit": {"Amount": "1500", "Unit": "USD"},',
    '        "TimeUnit": "MONTHLY",',
    '        "BudgetType": "COST",',
    '    },',
    '    NotificationsWithSubscribers=[',
    '        {',
    '            "Notification": {',
    '                "NotificationType": "FORECASTED",',
    '                "ComparisonOperator": "GREATER_THAN",',
    '                "Threshold": 100,',
    '                "ThresholdType": "PERCENTAGE",',
    '            },',
    '            "Subscribers": [{"SubscriptionType": "EMAIL", "Address": "data-team@example.com"}],',
    '        },',
    '    ],',
    ')'
  ].join('\n');

  var CUR = [
    'SELECT line_item_product_code AS service,',
    '       line_item_usage_type AS usage_type,',
    '       sum(line_item_unblended_cost) AS cost_usd',
    'FROM cur.brewline_cur',
    "WHERE year = '2026' AND month = '3'",
    "  AND line_item_line_item_type = 'Usage'",
    'GROUP BY 1, 2',
    'ORDER BY cost_usd DESC',
    'LIMIT 20;'
  ].join('\n');

  var ALARM = [
    'import boto3',
    '',
    'cw = boto3.client("cloudwatch", region_name="us-east-1")',
    '',
    'cw.put_metric_alarm(',
    '    AlarmName="raw-orders-dlq-not-empty",',
    '    Namespace="AWS/SQS",',
    '    MetricName="ApproximateNumberOfMessagesVisible",',
    '    Dimensions=[{"Name": "QueueName", "Value": "raw-orders-dlq"}],',
    '    Statistic="Maximum",',
    '    Period=300,',
    '    EvaluationPeriods=1,',
    '    Threshold=0,',
    '    ComparisonOperator="GreaterThanThreshold",',
    '    TreatMissingData="notBreaching",',
    '    AlarmActions=["arn:aws:sns:us-east-1:123456789012:data-alerts"],',
    ')'
  ].join('\n');

  var FRESH = [
    'import datetime',
    'import boto3',
    '',
    'cw = boto3.client("cloudwatch", region_name="us-east-1")',
    '',
    '',
    'def publish_freshness(table, newest_event_time):',
    '    age = (datetime.datetime.now(datetime.timezone.utc) - newest_event_time).total_seconds()',
    '    cw.put_metric_data(',
    '        Namespace="Brewline/Pipelines",',
    '        MetricData=[{',
    '            "MetricName": "FreshnessSeconds",',
    '            "Dimensions": [{"Name": "Table", "Value": table}],',
    '            "Value": age,',
    '            "Unit": "Seconds",',
    '        }],',
    '    )'
  ].join('\n');

  var RETAIN = [
    'import boto3',
    '',
    'logs = boto3.client("logs", region_name="us-east-1")',
    '',
    'for page in logs.get_paginator("describe_log_groups").paginate():',
    '    for group in page["logGroups"]:',
    '        if "retentionInDays" not in group:',
    '            logs.put_retention_policy(logGroupName=group["logGroupName"], retentionInDays=30)'
  ].join('\n');

  LAB.addChapter({
    id: 'm11', n: 11, title: 'Cost and operations: bills, tags, alarms and freshness', short: 'Cost', blurb: 'Where the money goes, tags and budgets, CloudWatch alarms and logs, and freshness checks for data', minutes: 45,
    focus: ['mon'],
    goals: [
      'Read a bill as **meters times usage**, and find the meter that grew.',
      'Split the bill with **cost allocation tags**, and watch it with **budgets** and anomaly detection.',
      'Set **alarms** on queues, jobs and **data freshness**, and keep **logs** from becoming a cost.',
      'Rank savings by **dollars and effort**.',
      'Explain a **cost jump** step by step.'
    ],
    say: 'Mission 11 is the part that decides whether the platform survives its second year. Every AWS service has a meter, and a bill is meters times usage. I use one made-up month of Brewline usage with example rates, so that you can see which line is big and which lever saves what. The code of this mission uses the cost and monitoring APIs, checked against the AWS SDK models. Prices change, so treat them as examples.',
    scenes: [
      B.talk({
        id: 'm11-talk', t: 1, src: 'docs', title: 'Where the money goes',
        say: 'Every service has a meter. Press Next for the seven kinds you meet in a data platform.',
        items: [
          ['Storage by the GB-month', 'S3 and Redshift managed storage. It grows every day, and it only falls when a lifecycle rule or a delete says so.', 'It accumulates.'],
          ['Requests', 'S3 PUT and GET, KMS calls, SQS messages, Lambda invocations. A million small files make a million requests.', 'Counted in thousands and millions.'],
          ['Compute by the hour or second', 'Glue DPU-hours, Redshift node-hours or RPU-hours, Lambda GB-seconds, EMR instance-hours.', 'Time times size.'],
          ['Data scanned', 'Athena and Redshift Spectrum bill the bytes a query reads from S3. A wrong query costs as much as a right one (mission 5).', 'Bytes read.'],
          ['Things that run by the hour', 'A NAT gateway, a Kinesis stream, an interface endpoint, a provisioned cluster, an MWAA environment. They cost money while idle.', 'Idle is not free.'],
          ['Data movement', 'NAT processing, traffic between zones and regions, traffic out to the internet, Kinesis in and out.', 'Every GB that moves.'],
          ['Logs', 'CloudWatch Logs bills the GB that you send in, and the GB that you keep. A job that logs every row can cost more than the job.', 'Quiet until a bad deploy.']
        ],
        cols: 1
      }),

      B.widget({ id: 'm11-lab', kind: 'bill', t: 1, src: 'docs', title: 'Lab: a month of Brewline on AWS' }),

      B.cmp({
        id: 'm11-lines', t: 1, src: 'docs', title: 'The bill, line by line',
        say: 'This is the bill of the first lab step: a made-up month of Brewline with example rates. Press Next to read the lines from the biggest.',
        cols: ['Line', 'Meter', 'A month', 'Share'],
        hl: 2,
        rows: BY_COST.map(function (l) { return [l.name, l.meter, usd(l.cost), num(SHARE[l.k], 0) + ' %']; }),
        steps: [
          { upto: 2, say: 'Redshift Serverless and Glue are ' + num(SHARE.redshift + SHARE.glue, 0) + ' % of the bill together. They are compute, billed by time.' },
          { upto: 5, say: 'Athena, Kinesis and CloudWatch Logs. Athena is the line that a better file layout cuts the most.' },
          { upto: 9, say: 'Storage, requests, NAT and Lambda. NAT is small here, and the example in mission 1 showed it at $4,100 when S3 traffic went through it.' }
        ],
        pick: 'The **biggest line** is not always the **best saving**. Rank by dollars saved for the work spent: here a file layout change saves ' + usd(SAVE.parquet) + ' on a line of ' + usd(line('athena')) + '.'
      }),

      B.cmp({
        id: 'm11-levers', t: 1, src: 'docs', title: 'Five savings and what they are worth',
        say: 'The second step of the lab turns on five savings. Press Next to read what each one saves on this month, and what it costs you in work and in risk.',
        cols: ['Saving', 'On this month', 'Work', 'The catch'],
        hl: 1,
        rows: [
          ['Parquet and day folders for Athena tables', usd(SAVE.parquet), 'A few days: a CTAS per table and new paths for readers', 'The lab assumes 90 % fewer bytes. The recorded layouts in mission 5 showed far more.'],
          ['Glue Flex for half of the job hours', usd(SAVE.flex), 'A setting on the job', 'Flex jobs can start later. Not for jobs that people wait for.'],
          ['S3 gateway endpoint instead of NAT for S3 traffic', usd(SAVE.gateway), 'An hour, once for each VPC', 'Assumes 80 % of the NAT traffic was S3 traffic.'],
          ['Lifecycle rule to Standard-IA after 30 days', usd(SAVE.life), 'An hour', 'Retrieval fees and a 30 day minimum. Check how old data is read.'],
          ['Lambda on arm64', usd(SAVE.arm), 'A rebuild and a test', 'Small here because Lambda is a small line.']
        ],
        steps: [
          { upto: 2, say: 'The two biggest: a file layout and a Glue setting.' },
          { upto: 5, say: 'Three smaller ones. All five together save ' + usd(ALL) + ' a month, which is ' + num(ALL / T0 * 100, 0) + ' % of ' + usd(T0) + '.' }
        ],
        pick: 'Do the **one-hour savings first** (endpoint, lifecycle) and the **file layout next**. Buying more compute commitments before the waste is gone locks the waste in.'
      }),

      B.cmp({
        id: 'm11-tags', t: 1, src: 'docs', title: 'Cost allocation tags',
        say: 'A bill that shows only services does not say who spent what. Tags do. Press Next to read how they work.',
        cols: ['Question', 'Answer'],
        hl: 1,
        rows: [
          ['What is a tag?', 'A name and a value on a resource, for example `team=analytics`, `pipeline=orders`, `env=prod`.'],
          ['How do they reach the bill?', 'You activate a tag key as a cost allocation tag in the billing console. After that, Cost Explorer and the cost reports can group by it.'],
          ['What is the catch?', 'A tag counts from the day you activate it, not before. Resources without the tag show up as untagged.'],
          ['How do you keep them complete?', 'Put the tags in the infrastructure templates, add a tag policy in AWS Organizations, and check with a Config rule that finds resources without the required tags.'],
          ['What is stronger than a tag?', 'A separate account for each environment or team. The account is a line on the bill that no one can forget to set.']
        ],
        steps: [
          { upto: 2, say: 'What a tag is, and how it gets into the bill.' },
          { upto: 4, say: 'A tag is not retroactive, so activate keys early, and enforce them in code.' },
          { upto: 5, say: 'Accounts are the strongest separator.' }
        ],
        pick: 'Choose **three keys** and no more: `team`, `pipeline`, `env`. Put them in **every template**, and **activate them in billing today**, because the history starts then.'
      }),

      B.cmp({
        id: 'm11-tools', t: 1, src: 'docs', title: 'The cost tools',
        say: 'AWS has several tools for cost, and each answers a different question. Press Next to match them.',
        cols: ['Tool', 'It answers', 'Use it for'],
        hl: 1,
        rows: [
          ['Cost Explorer', 'What did we spend, by service, tag or account?', 'Interactive charts, and an API for reports. The API bills about $0.01 for each request.'],
          ['AWS Budgets', 'Are we on track for the month?', 'An alert at a percentage of a limit, on actual or forecast spend, by email or SNS.'],
          ['Cost Anomaly Detection', 'Did something unusual change?', 'Alerts on a spike by service, account or tag, with no threshold to guess.'],
          ['Cost and Usage Report', 'Which exact usage line cost this?', 'Line-item data in S3, queried with Athena, for analysis that Cost Explorer cannot do.'],
          ['Compute Optimizer and recommendations', 'Which resources are too big?', 'Rightsizing advice for Lambda, EC2 and others, from real usage.']
        ],
        steps: [
          { upto: 2, say: 'Look at the spend, and watch it.' },
          { upto: 5, say: 'Find the unusual, drill into lines, and get advice.' }
        ],
        pick: 'Set a **budget with a forecast alert** and **anomaly detection** on day one. Use the **Cost and Usage Report with Athena** when a question needs line items.'
      }),

      B.code({
        id: 'm11-ce', t: 2, src: 'docs', title: 'Cost by pipeline from the API', file: 'cost_by_tag.py', lang: 'python', code: CE,
        steps: [
          { say: 'Cost Explorer has an API. It lives in `us-east-1` whatever your region is, and the management account sees all member accounts.', lines: G.span(CE, /^ce = /) },
          { say: 'A month, and the measure that you want. `UnblendedCost` is the price of the usage as billed.', lines: G.span(CE, /TimePeriod/, /Metrics/) },
          { say: 'Group by the tag `pipeline`. Resources without the tag come back under an empty key, which is how you measure how complete your tagging is.', lines: G.span(CE, /GroupBy/) },
          { say: 'Each group has the tag value and the amount. Put the result on a dashboard once a day, not once a minute: each Cost Explorer API request has a small price.', lines: G.span(CE, /for group in/, /print/) }
        ],
        note: 'I checked the parameter names and the allowed values against the AWS SDK service model. The call did not run on AWS. The pricing page lists about $0.01 for each API request.'
      }),

      B.code({
        id: 'm11-budget', t: 2, src: 'docs', title: 'A budget with a forecast alert', file: 'budget.py', lang: 'python', code: BUDGET,
        steps: [
          { say: 'A monthly cost budget of $1,500. The limit is a string with a unit.', lines: G.span(BUDGET, /"BudgetName"/, /"BudgetType"/) },
          { say: 'The notification type `FORECASTED` fires when the forecast for the month passes the threshold, which can be days before the actual spend does. `ACTUAL` waits for the money to be spent.', lines: G.span(BUDGET, /"NotificationType"/, /"ThresholdType"/) },
          { say: 'The subscriber gets an email, or an SNS topic that chat tools and tickets can read.', lines: G.span(BUDGET, /"Subscribers"/) }
        ],
        note: 'I checked the parameter names and the allowed values against the AWS SDK service model. The call did not run on AWS.'
      }),

      B.code({
        id: 'm11-cur', t: 2, src: 'docs', title: 'Which usage cost the money', file: 'cur.sql', lang: 'sql', code: CUR,
        steps: [
          { say: 'The Cost and Usage Report lands in S3, and a table over it makes the bill a data set. Partitions by year and month keep the scans small (mission 5).', lines: null },
          { say: 'Group by service and usage type. The usage type is the meter: for example `NatGateway-Bytes` or `DataTransfer-Out-Bytes`.', lines: G.span(CUR, /SELECT line_item_product_code/, /sum\(line_item_unblended_cost\)/) },
          { say: 'Filter to one month and to lines of usage, and not taxes or credits.', lines: G.span(CUR, /WHERE year/, /line_item_line_item_type/) },
          { say: 'The top of this list is where a cost jump shows first. A usage type that you did not expect is the lead.', lines: G.span(CUR, /ORDER BY/, /LIMIT/) }
        ],
        note: 'Column names follow the Cost and Usage Report documentation. The statement is Athena SQL and was parsed by the verifier. It runs against a table that you create from the report, and it did not run on AWS.'
      }),

      B.quiz({
        id: 'm11-q1', t: 1, src: 'docs',
        q: 'You tag every resource with `pipeline=orders` today. Next week you open Cost Explorer. What do you see for last month?',
        opts: [
          { t: 'The cost of last month grouped by pipeline', fb: 'A cost allocation tag counts from the day you activate it.' },
          { t: 'Nothing for the pipeline tag before the day you activated it', fb: '' },
          { t: 'The cost of the whole year grouped by pipeline', fb: 'There is no back-fill of tags.' },
          { t: 'An error, because tags cannot be used for cost', fb: 'Cost allocation tags exist for exactly this.' }
        ],
        ok: 1, why: 'Activating a cost allocation tag key starts its history that day. Costs before it stay untagged. That is why you activate the keys early and put them in the templates from the start.'
      }),

      B.quiz({
        id: 'm11-q2', t: 2, src: 'docs',
        q: 'A dashboard calls the Cost Explorer API every 5 minutes for a 30 day month. At about $0.01 for each request, what does that cost?',
        opts: [
          { t: 'About $0.86', fb: 'That is 86 requests. Count how many 5 minute slots fit in 30 days.' },
          { t: 'About $8.64', fb: 'That is 864 requests. There are 12 in an hour, 24 hours and 30 days.' },
          { t: 'About $86.40', fb: '' },
          { t: 'Nothing. The API is free', fb: 'Cost Explorer API requests have a price.' }
        ],
        ok: 2, why: '12 an hour x 24 hours x 30 days = 8,640 requests, and at $0.01 that is $86.40 for a number that changes once a day. Read it once a day and store the result.'
      }),

      B.quiz({
        id: 'm11-q3', t: 1, src: 'docs',
        q: 'A Lambda function has written logs for a year. The log group was created by Lambda and nobody set a retention. How long are the logs kept?',
        opts: [
          { t: '30 days, the default', fb: 'There is no 30 day default.' },
          { t: 'Never deleted, until you set a retention', fb: '' },
          { t: '7 days', fb: 'CloudWatch does not delete log groups on its own.' },
          { t: 'Until the function is deleted', fb: 'The log group outlives the function.' }
        ],
        ok: 1, why: 'A log group keeps its events forever unless you set a retention period. Storage grows every month. Set 14 or 30 days for job logs, and export to S3 if you need them longer.'
      }),

      B.quiz({
        id: 'm11-q4', t: 2, src: 'docs',
        q: 'In the lab, Glue Flex for half of the 600 DPU-hours changes the rate for those 300 hours from $0.44 to $0.29. What does it save a month?',
        opts: [
          { t: '$45', fb: '' },
          { t: '$90', fb: 'That is for all 600 hours. Only half of them use Flex.' },
          { t: '$4.50', fb: 'Ten times too low. 300 hours x $0.15 is $45.' },
          { t: '$132', fb: 'That is half of the whole Glue line, not the saving.' }
        ],
        ok: 0, why: '300 DPU-hours x ($0.44 - $0.29) = 300 x $0.15 = $45. It is 17 % of the Glue line of $264, for a setting. The catch: Flex runs on spare capacity and can start later.'
      }),

      B.quiz({
        id: 'm11-q5', t: 2, src: 'docs',
        q: 'A budget alert of type FORECASTED at 100 % and one of type ACTUAL at 100 %. Which usually warns first?',
        opts: [
          { t: 'ACTUAL, because it counts real money', fb: 'It fires only after the limit is reached.' },
          { t: 'FORECASTED, because it fires when the forecast for the month passes the limit', fb: '' },
          { t: 'They always fire together', fb: 'The forecast looks ahead, and the actual spend looks back.' },
          { t: 'Neither. Budgets send no alerts', fb: 'Budgets send alerts by email and SNS.' }
        ],
        ok: 1, why: 'A forecast alert fires when the projection for the month passes the threshold, which is often days before the actual spend passes it. Use both: the forecast to act, and the actual as the last line.'
      }),

      B.talk({
        id: 'm11-cw', t: 1, src: 'docs', title: 'CloudWatch for pipelines',
        say: 'CloudWatch is where AWS services report. Press Next for the parts, and the three questions that a pipeline owner asks.',
        items: [
          ['Metrics', 'Numbers over time. AWS services publish metrics for you, such as the age of the oldest message in a queue or the iterator age of a stream. You can publish your own with `put_metric_data`.', 'Numbers over time.'],
          ['Logs', 'Text that jobs write, in log groups. A query feature of the console runs queries over them. Set a retention, and log what happened, never secrets or personal data.', 'What the job said.'],
          ['Alarms', 'A rule on a metric: if it passes a threshold for a number of periods, take an action, such as a message to an SNS topic that chat or a pager reads. Decide what a missing value means, because a dead job sends no data.', 'A rule and an action.'],
          ['Dashboards', 'A page of graphs and numbers. Keep one for each pipeline, with the same four graphs: runs, duration, freshness and failures.', 'One look.'],
          ['The three questions', 'Did it run? Did it finish on time? Is the output right? Metrics and run history answer the first two. Checks on the data answer the third, and it is the one that people skip.', 'Run, on time, right.']
        ],
        cols: 1
      }),

      B.code({
        id: 'm11-alarm', t: 2, src: 'docs', title: 'An alarm on a dead-letter queue', file: 'alarm.py', lang: 'python', code: ALARM,
        steps: [
          { say: 'SQS publishes metrics under `AWS/SQS`. The queue is a dimension.', lines: G.span(ALARM, /AlarmName/, /Dimensions/) },
          { say: 'The metric is the number of messages that can be received. For a dead-letter queue, any value above zero means that something failed for good.', lines: G.span(ALARM, /MetricName/) },
          { say: 'Check every 5 minutes, and alarm at the first period with a value above zero.', lines: G.span(ALARM, /Statistic/, /ComparisonOperator/) },
          { say: '`TreatMissingData="notBreaching"` says that no data means no problem. SQS stops publishing for a queue that is empty and idle, so without this the alarm would sit in an unknown state.', lines: G.span(ALARM, /TreatMissingData/) },
          { say: 'The action sends a message to an SNS topic, which chat or a pager reads.', lines: G.span(ALARM, /AlarmActions/) }
        ],
        note: 'The verifier ran this call against moto, an emulator, and read the alarm back. Real alarm evaluation and delivery were not part of that run.'
      }),

      B.code({
        id: 'm11-fresh', t: 2, src: 'docs', title: 'A freshness metric', file: 'freshness.py', lang: 'python', code: FRESH,
        steps: [
          { say: 'Freshness is how old the newest data is: the current time minus the newest event time in the table. A pipeline can run on time and still deliver old data.', lines: G.span(FRESH, /age = /) },
          { say: 'Publish it as a custom metric, with the table as a dimension.', lines: G.span(FRESH, /cw\.put_metric_data/, /"Dimensions"/) },
          { say: 'The value and the unit. Then an alarm on `FreshnessSeconds` above the limit that the business accepts, for example 3 hours at 06:00, tells you before an analyst does.', lines: G.span(FRESH, /"Value"/, /"Unit"/) }
        ],
        note: 'The verifier ran this function against moto, an emulator, and read the metric back. The Lambda that reads the newest event time, for example with an Athena query, is not shown.'
      }),

      B.talk({
        id: 'm11-observe', t: 2, src: 'docs', title: 'Checks on the data itself',
        say: 'A green pipeline can deliver wrong data. Press Next for the four checks that catch it.',
        items: [
          ['Freshness', 'Is the newest event recent enough? One number for each table, with an alarm.', 'How old.'],
          ['Volume', 'Is the row count close to what it usually is, and to the source? A count of zero, or half of yesterday, is a failure of the pipeline and not of the business.', 'How many.'],
          ['Schema', 'Did a column appear, vanish or change type? A rule at the boundary of each zone stops a surprise from reaching curated tables (mission 4).', 'What shape.'],
          ['Values', 'Are keys unique, are required columns filled, are amounts in a sane range, do statuses come from the known list? Glue Data Quality, or tests in dbt, express these as rules.', 'What content.'],
          ['Where they run', 'As a gate inside the pipeline that fails the run (mission 9), and as scheduled checks that alarm. A page for what stops the business, a ticket for the rest, so people keep believing the alarms.', 'Gate and alarm.']
        ],
        cols: 1
      }),

      B.code({
        id: 'm11-retain', t: 1, src: 'docs', title: 'Retention for every log group', file: 'retention.py', lang: 'python', code: RETAIN,
        steps: [
          { say: 'A sweep over all log groups of the region. The paginator handles accounts with many groups.', lines: G.span(RETAIN, /for page in/, /for group in/) },
          { say: 'A group that has no `retentionInDays` keeps its logs for ever. This is the same as a retention of never.', lines: G.span(RETAIN, /if "retentionInDays"/) },
          { say: 'Set 30 days. The allowed values are fixed numbers such as 7, 14, 30, 60, 90 and 365. Run the sweep on a schedule, because new groups appear all the time.', lines: G.span(RETAIN, /put_retention_policy/) }
        ],
        note: 'The verifier ran this sweep against moto, an emulator, on groups with and without a retention. It did not run on AWS.'
      }),

      B.talk({
        id: 'm11-s3cost', t: 2, src: 'docs', title: 'S3 cost traps',
        say: 'S3 is cheap per GB and still produces surprises. Press Next for the usual ones.',
        items: [
          ['Many small files', 'A request costs the same for 1 KB and for 1 GB. Five million small PUTs a month cost $25 at $0.005 for 1,000, and every read of them costs more. Fewer, larger files help every service (mission 5).', 'Requests add up.'],
          ['Storage classes with minimums', 'Standard-IA and Glacier classes have a minimum storage time and a minimum object size. Tiny or short-lived objects can cost more there than in Standard.', 'Read the minimums.'],
          ['Versions nobody sees', 'With versioning, old versions and delete markers stay and bill. A lifecycle rule for noncurrent versions removes them (mission 2).', 'Old versions bill too.'],
          ['Incomplete multipart uploads', 'Parts of an upload that never finished are stored and billed. A lifecycle rule can abort them after a few days.', 'Unfinished uploads.'],
          ['Know what you have', 'S3 Storage Lens shows usage and trends for the organization. S3 Inventory lists every object with its size and class, and Athena can query the list.', 'Measure first.']
        ],
        cols: 1
      }),

      B.cmp({
        id: 'm11-transfer', t: 2, src: 'docs', title: 'Data transfer',
        say: 'Moving data costs money in ways that surprise people. Press Next to read the common paths. The prices are example US rates, and AWS changes them.',
        cols: ['Path', 'Example price', 'How to avoid it'],
        hl: 1,
        rows: [
          ['Into AWS from the internet', 'Free', 'Nothing to do.'],
          ['S3 to a service in the same region', 'Free', 'Keep compute in the same region as the data.'],
          ['Between availability zones', 'About $0.01 for each GB, in each direction', 'Keep chatty services in one zone when the design allows. Watch Kinesis consumers and Redshift loads in other zones.'],
          ['Between regions', 'About $0.02 for each GB', 'Copy once, with compression, and read the copy.'],
          ['Out to the internet', 'About $0.09 for each GB for the first tier', 'Compress. Serve large files through a CDN or share them in place with data sharing.'],
          ['Through a NAT gateway', 'About $0.045 for each GB, on top of the other charges', 'Use endpoints for AWS services (mission 10).']
        ],
        steps: [
          { upto: 2, say: 'Free paths: into AWS, and S3 to a service in the same region.' },
          { upto: 4, say: 'Zones and regions have a price for each GB.' },
          { upto: 6, say: 'Out to the internet and through NAT are the expensive ones.' }
        ],
        pick: 'Put **compute next to the data**, read data **once** and **compress**. A copy to another region is a monthly cost, and a read from another region is a cost for every read.'
      }),

      B.order({
        id: 'm11-ord', t: 1, q: 'Put the steps of finding why the bill jumped in order.',
        items: [
          'In Cost Explorer, group the month by service and find the line that grew',
          'Group that service by usage type to find the meter',
          'Group by tag or by account to find who owns it',
          'Check the metrics, the logs and CloudTrail of that resource for the change',
          'Fix the cause, and write down what it cost',
          'Add a budget or anomaly alert that would have caught it'
        ],
        why: 'Narrow the question step by step: the service, the meter, the owner and the cause. Then fix it. The last step makes sure that the same jump is caught in days next time, and not at the end of the month.'
      }),

      B.decide({
        id: 'm11-dec', t: 2, src: 'docs', title: 'Decision: what do you do first with the bill of ' + usd(T0) + '?',
        scenario: 'Brewline pays **' + usd(T0) + '** a month. You have **one week**. The lines are Redshift Serverless **' + usd(line('redshift')) + '**, Glue **' + usd(line('glue')) + '**, Athena **' + usd(line('athena')) + '**, and the rest smaller. Someone suggests a **commitment** for the compute to get a lower rate.',
        opts: [
          { t: 'Commit to a year of compute spend now, to get the lower rate', d: 'A lower rate for the committed amount.', lose: 'The waste is still in the bill, and you would commit to paying for it. Glue, Athena and S3 are not covered by Compute Savings Plans, and the commitment cannot be undone.' },
          { t: 'Convert the Athena tables to Parquet with day folders, turn on Glue Flex for nightly jobs, add the S3 endpoint and a lifecycle rule', d: 'About ' + usd(ALL) + ' a month, mostly from the file layout (' + usd(SAVE.parquet) + ') and Flex (' + usd(SAVE.flex) + '), with the one-hour changes done on the first day.' },
          { t: 'Shut down Redshift Serverless, the biggest line', d: 'Saves ' + usd(line('redshift')) + ' a month.', lose: 'The dashboards use it all day. The money is not wasted, so cutting it breaks the product. Right-size it later, with data.' }
        ],
        pick: 1,
        why: 'Remove waste first, and commit only to what is left. The four changes are cheap to make and easy to undo, and the file layout also makes every Athena query faster. Re-read the bill after a month, and then look at commitments for the steady part.',
        when: 'Commitments make sense for a steady base that you have measured for months, such as the always-on part of a provisioned cluster or EC2 fleet. Right-size Redshift Serverless from its usage, not by switching it off.'
      }),

      B.incident({
        id: 'm11-inc', t: 2, src: 'docs', title: 'Incident: CloudWatch Logs is 40 % of the bill', time: '09:05',
        alert: '**The CloudWatch line of the bill is $1,000 this month. Last month it was $50.** A new Glue job went live on the 3rd. Nobody changed anything else. The job runs nightly and finishes on time.',
        clues: ['Cost Explorer shows `DataProcessing-Bytes` of CloudWatch Logs growing from the 3rd', 'The log group of the job holds about 2,000 GB this month, with no retention', 'The job script prints every row at DEBUG level'],
        opts: [
          { t: 'Log at INFO, summarize instead of printing each row, set a retention of 14 to 30 days, and clear the old data', fb: '' },
          { t: 'Delete the log group and keep logging as before', fb: 'The ingestion cost is paid when the logs are written. Deleting afterwards does not give it back.' },
          { t: 'Move the job to another region', fb: 'The logs follow the job, and so does the cost.' },
          { t: 'Ignore it. Logs are cheap per GB', fb: '2,000 GB at about $0.50 for each GB is $1,000. The volume makes it expensive.' }
        ],
        best: 0,
        why: 'Logs are billed for the GB that you send in, and the job sent 2,000 GB, about $1,000 at $0.50 for each GB. Logging every row is a debug habit that does not belong in production. Log counts and errors, set a retention, and watch the usage type of the log line.',
        checks: [
          ['Find the line', 'Cost Explorer for the month shows CloudWatch as the service that grew.'],
          ['Find the meter', 'The usage type is the bytes of log data ingested.'],
          ['Find the group', 'The log group of the new job holds 2,000 GB.'],
          ['Fix the job', 'Change the level to INFO, and log one line for each batch.'],
          ['Prevent it', 'A retention for every group, and an anomaly alert on CloudWatch.']
        ],
        tell: 'Our CloudWatch bill went from about $50 to about $1,000 in a month. A new Glue job printed every row at debug level, so its log group took in 2,000 GB, and the group had no retention. I changed the job to log one summary line for each batch at INFO level, set a retention of 30 days on all log groups with a sweep, and cleared the old data. We also added a cost anomaly alert and a review of log volume for every new job.',
        prevent: ['Log **summaries and errors**, not rows', 'Set a **retention** on every log group', 'Watch **log ingestion** as a cost line', 'Review the **log volume** of a new job in its first week']
      }),

      B.incident({
        id: 'm11-inc2', t: 2, src: 'docs', title: 'Incident: a sandbox account costs $4,800 a month', time: '16:10',
        alert: '**The sandbox account shows $4,822 for the third month in a row.** Nobody uses it. A hackathon in January created a Redshift cluster with 2 ra3.4xlarge nodes, a Kinesis stream and a NAT gateway, and nobody deleted them.',
        clues: ['The resources have no `team` or `env` tags', 'No budget or anomaly alert exists for the sandbox account', 'The Redshift cluster has had no queries for 8 weeks'],
        opts: [
          { t: 'Snapshot what is needed, delete the idle resources, and add budgets, anomaly detection, tag rules and a clean-up of sandbox accounts', fb: '' },
          { t: 'Resize the cluster to one node', fb: 'It halves a cost for something that nobody uses.' },
          { t: 'Add reserved nodes to get a lower rate', fb: 'It commits money for resources that should not exist.' },
          { t: 'Ask each engineer whether the cluster is theirs, and wait for answers', fb: 'Waiting costs about $160 a day. Check usage, snapshot, and delete, then tell people.' }
        ],
        best: 0,
        why: 'Two ra3.4xlarge nodes at about $3.26 an hour for 730 hours cost $4,760, and the NAT gateway and the stream add about $62. The cluster had no queries for weeks. Take a snapshot if anyone might want it, delete the resources, and then add the controls that would have caught it: tags with an owner, a budget with a forecast alert, anomaly detection, and a scheduled clean-up of sandbox accounts.',
        checks: [
          ['Find the lines', 'Cost Explorer by service: Redshift, Kinesis and NAT account for nearly all of it.'],
          ['Check usage', 'The cluster has no queries for 8 weeks, and the stream has no traffic.'],
          ['Find an owner', 'CloudTrail shows who created the resources in January.'],
          ['Delete safely', 'Snapshot the cluster, then delete the cluster, the stream and the NAT gateway.'],
          ['Prevent it', 'A budget, an anomaly alert, required tags, and a clean-up that deletes sandbox resources after 30 days.']
        ],
        tell: 'The sandbox account cost about $4,800 a month for three months because a hackathon cluster of two ra3.4xlarge nodes, a Kinesis stream and a NAT gateway were never deleted. Nothing was tagged and no budget or alert existed for the account. I checked that the cluster had no queries for eight weeks, took a snapshot, deleted the resources, and told the owners from CloudTrail. We added a budget with a forecast alert, cost anomaly detection, required tags and an automatic clean-up of sandbox resources after 30 days.',
        prevent: ['Put a **budget and an anomaly alert** on every account', 'Require **owner and expiry tags**', 'Clean up **sandbox accounts** on a schedule', 'Review the **top five lines** of the bill every week']
      }),

      B.qa({
        id: 'qa-costfind', t: 1, tag: 'Cost', secs: 90,
        q: 'The AWS bill doubled this month. How do you find out why?',
        pts: ['Cost Explorer by service, then usage type', 'Group by tag or account for the owner', 'Check metrics, logs and CloudTrail for what changed', 'Fix, and write down the cost', 'Budget and anomaly alerts for next time', 'The CUR with Athena for line items'],
        short: 'I narrow the question. In Cost Explorer I group the month by service and find the line that grew. Then I group that service by usage type, which is the meter: for example NAT gateway bytes, Athena data scanned or log ingestion. Then I group by tag or by account to find the owner.\n\nNext I look for the change: CloudWatch metrics of that resource, its logs, and CloudTrail for who deployed or changed something on the day the cost began. If Cost Explorer is not detailed enough, I query the Cost and Usage Report with Athena for the line items.\n\nI fix the cause. Examples I have seen: S3 traffic going through a NAT gateway, $4,100 in a month, an Athena dashboard scanning a CSV file every 5 minutes, $7,200, and a job logging every row, $1,000. I write down what it cost and what fixed it.\n\nThen I add what would have caught it earlier: a budget with a forecast alert and cost anomaly detection.',
        fu: [
          ['What is a usage type?', 'The meter of a service, such as `NatGateway-Bytes`. It tells you what kind of usage the money is for.'],
          ['What if resources are untagged?', 'Use the account and the service, then CloudTrail to find the creator. Then fix the tagging in the templates and activate the tags in billing.']
        ],
        trap: 'Guessing the cause from memory. Follow the meters: service, usage type, owner, change.',
        real: 'Describe a cost jump you traced, the meter, and the fix.'
      }),

      B.qa({
        id: 'qa-tags', t: 1, tag: 'Cost', secs: 60,
        q: 'How do you know which team or pipeline spends what on AWS?',
        pts: ['Cost allocation tags: team, pipeline, env', 'Activate them in billing, because history starts then', 'Put tags in every template, enforce with tag policies and Config', 'Separate accounts for strong separation', 'Group Cost Explorer or the CUR by tag', 'Measure the share of untagged spend'],
        short: 'I use cost allocation tags. I choose three keys, `team`, `pipeline` and `env`, put them in every infrastructure template, and activate them in the billing console. Activation matters, because the history of a tag begins on that day and is not back-filled.\n\nTo keep tagging complete, I add a tag policy in Organizations and a Config rule that finds resources without the required tags. Then Cost Explorer, or the Cost and Usage Report queried with Athena, can group the spend by tag.\n\nI also measure how complete tagging is: the cost that comes back untagged is a number I report each month, and I drive it down.\n\nTags are never as strong as accounts. A separate account for production, for development and for each larger team puts the separation on the bill with nothing to forget. For shared services such as a data lake used by many teams, I allocate by usage, for example Athena cost by workgroup tag.',
        fu: [
          ['How do you charge back Athena by team?', 'Give each team a workgroup with a tag, and group the Athena cost by that tag.'],
          ['What do you do about untagged resources?', 'Find the owner from CloudTrail, tag the resource, fix the template, and add a Config rule so that new untagged resources are flagged.']
        ],
        trap: 'Tagging by hand in the console. Tags that are not in code are missing within a month.',
        real: 'Describe how you introduced tagging and how complete it became.'
      }),

      B.qa({
        id: 'qa-monitor', t: 1, tag: 'Cost', secs: 90,
        q: 'How do you monitor a data pipeline on AWS?',
        pts: ['Did it run? Did it finish on time? Is the output right?', 'Metrics and alarms: queue depth, iterator age, job failures', 'A dead-letter queue alarm for any value above zero', 'Freshness and volume checks on the data', 'Logs with a retention, at INFO level', 'A dashboard for each pipeline'],
        short: 'I ask three questions: did it run, did it finish on time, and is the output right.\n\nFor the first two I use the metrics that services publish: failed Step Functions runs, Glue job failures, the age of the oldest message in a queue, the iterator age of a stream. A dead-letter queue gets an alarm on any value above zero, with TreatMissingData set so that an idle queue is not an unknown state.\n\nFor the third I check the data: freshness, which is the current time minus the newest event time, published as a custom metric and alarmed against what the business accepts, and the row count against the source and against a usual range. A gate inside the pipeline fails the run on a check that stops the business, and the rest alarm.\n\nLogs stay at INFO with a retention of 14 to 30 days, and never hold secrets or personal data. Each pipeline gets one dashboard with runs, duration, freshness and failures. I page for what stops the business and open tickets for the rest, so that people trust the pages.',
        fu: [
          ['What does TreatMissingData do?', 'It says how an alarm reads a period with no data. For a queue that is idle, `notBreaching` avoids an alarm for a quiet but healthy system. For a job that must report, `breaching` catches a dead job.'],
          ['What is the most useful single metric?', 'End-to-end freshness of the main table. It catches problems that no single component metric shows.']
        ],
        trap: 'Watching only whether the job ran. A green run can deliver an empty or stale table.',
        real: 'Describe an alarm that caught a problem before users did.'
      }),

      B.qa({
        id: 'qa-observe', t: 2, tag: 'Cost', secs: 90,
        q: 'How do you make sure that the data in the lake is right?',
        pts: ['Freshness, volume, schema and value checks', 'Gates in the pipeline that fail the run', 'Quality rules in Glue Data Quality or dbt tests', 'Reconcile counts with the source', 'Alert design: page, ticket, no noise', 'Data contracts with the producers'],
        short: 'I check four things at each zone boundary. Freshness: is the newest event recent enough? Volume: does the row count match the source and the usual range? Schema: did a column appear, vanish or change type? Values: are keys unique, are required columns filled, do statuses come from the known list?\n\nThe checks that stop the business run as a gate inside the pipeline. For example, a Step Functions state counts the rows of yesterday and fails the run when the count is below a minimum, so the dashboards keep the previous good data. The rest run on a schedule and alarm. I write the rules in Glue Data Quality or as dbt tests, so they live in code and review.\n\nI reconcile counts with the source after each load, which finds silent duplicates and loss. I tune alerts: a page only for what stops the business, a ticket for the rest, and I remove alerts that nobody acts on.\n\nUpstream, I agree a data contract with the producers: columns, types and meaning, and how changes are announced.',
        fu: [
          ['Where do you put the gate?', 'After the load into a staging location and before the publish step, so bad data never reaches the tables that people query.'],
          ['What is a data contract?', 'A written agreement between a producer and its consumers about the schema, the meaning, the freshness and how changes are announced.']
        ],
        trap: 'Describing checks without saying what happens when one fails. A check needs an action: stop, alert, or ignore.',
        real: 'Describe a quality check that caught bad data, and what it stopped.'
      }),

      B.qa({
        id: 'qa-finops', t: 2, tag: 'Cost', secs: 90,
        q: 'How do you keep AWS cost under control as the platform grows?',
        pts: ['Ownership: tags, accounts, budgets for each team', 'Alerts: budget with forecast, anomaly detection', 'Design for cost: Parquet, lifecycle, endpoints, right-sized jobs', 'A weekly look at the top lines', 'Commit only to measured steady usage', 'Delete idle resources automatically'],
        short: 'I start with ownership. Every account and resource has a team, a pipeline and an environment, in tags and accounts, so each team sees its own spend. Each account has a budget with a forecast alert and cost anomaly detection, so a jump reaches a person in days.\n\nThen I design for cost: Parquet with partitions and large files, lifecycle rules, an S3 endpoint in every VPC, right-sized and auto-scaled jobs, Flex where nobody waits, and a retention on every log group. I put the cost of a design into its review, with numbers, for example a dashboard on a CSV file that cost $7,200 and $92 on Parquet.\n\nEvery week I look at the top five lines of the bill. I commit to savings plans or reserved capacity only for steady usage that I have measured for months, after the waste is gone. Idle resources in sandboxes are deleted automatically after a set time.\n\nI report the cost of each pipeline per run or per GB, so that cost is a number that engineers can improve.',
        fu: [
          ['What is unit cost?', 'The cost of one useful unit, for example per run, per GB loaded or per thousand orders. It shows efficiency while the total grows with the business.'],
          ['When do you buy a commitment?', 'When a steady base has been used for months, and the waste has been removed. Before that a commitment fixes the waste in place.']
        ],
        trap: 'Treating cost as a finance topic that arrives after the architecture. The design decides most of it.',
        real: 'Describe a saving you delivered, with the before and after numbers.'
      }),

      B.qa({
        id: 'qa-transfer', t: 3, tag: 'Cost', secs: 90,
        q: 'Where does data transfer cost surprise you on AWS, and how do you design around it?',
        pts: ['Free into AWS and from S3 to a service in the same region', 'Cross-zone and cross-region traffic bill for each GB', 'Internet egress is the dear path', 'NAT gateway adds a per-GB fee', 'Endpoints for AWS services, compression, one read', 'Compute next to the data'],
        short: 'Transfer into AWS is free, and so is traffic from S3 to a service in the same region. The surprises are the other paths. Between availability zones I pay about $0.01 for each GB in each direction, so a chatty consumer in another zone adds up. Between regions it is about $0.02 for each GB, and out to the internet about $0.09 for each GB for the first tier.\n\nA NAT gateway adds about $0.045 for each GB on top, and I have seen S3 traffic go through it and cost $4,100 in a month. The fix was a free S3 gateway endpoint. For other AWS services I use interface endpoints, which cost about $0.01 for each GB plus an hourly fee.\n\nMy design rules: put compute in the same region as the data, read data once and cache the result, compress, copy between regions once and read the copy, and share data in place with Redshift data sharing or Lake Formation instead of exporting files. I check the usage types of the bill for transfer lines every month.',
        fu: [
          ['How do you find transfer cost?', 'In Cost Explorer or the Cost and Usage Report, group by usage type and look for `DataTransfer` and `NatGateway-Bytes` lines.'],
          ['What about serving data to customers?', 'Compress, cache, and put a CDN in front, because the per-GB price drops and repeated reads do not hit S3 at all.']
        ],
        trap: 'Assuming that data inside AWS moves for free. Zones, regions and NAT all have prices.',
        real: 'Describe a transfer cost you removed and how you found it.'
      }),

      B.recap({
        id: 'm11-recap', n: 11, badge: 'Cost Watcher', color: '#BAE6FD',
        pts: [
          'A bill is **meters times usage**. Find the service that grew, then its **usage type**, then the owner, then the change.',
          'In the lab, five savings add up to **' + usd(ALL) + '** of **' + usd(T0) + '**. The best saving is **' + usd(SAVE.parquet) + '** from a file layout, and a one-hour endpoint saves **' + usd(SAVE.gateway) + '**.',
          '**Tags** start their history on the day you activate them. Put them in every template, and use **accounts** for strong separation.',
          '**Budgets** with a **forecast alert** and **anomaly detection** find a jump in days. Cost Explorer API requests cost about $0.01 each.',
          '**Logs** keep for ever without a retention. A job that prints every row can cost **$1,000** a month. Alarm on **freshness**, **queue depth** and failures.',
          'Remove **waste before you commit** to savings plans, and delete **idle sandbox resources** automatically.'
        ],
        lines: [
          'I follow the meter, not a guess.',
          'I put a budget and an anomaly alert on every account.',
          'I check freshness as well as whether the job ran.'
        ]
      })
    ]
  });
})();
