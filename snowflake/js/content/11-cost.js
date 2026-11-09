/* Mission 11: where the money goes, how to see it, and how to bring it down. */
(function () {
  var B = LAB.b;

  var METER = [
    '-- 1. Credits by warehouse, last 7 days',
    'SELECT warehouse_name, SUM(credits_used) AS credits',
    'FROM snowflake.account_usage.warehouse_metering_history',
    "WHERE start_time >= DATEADD('day', -7, CURRENT_TIMESTAMP())",
    'GROUP BY 1',
    'ORDER BY credits DESC;',
    '',
    '-- 2. Credits by day and kind of service',
    'SELECT usage_date, service_type, SUM(credits_used) AS credits',
    'FROM snowflake.account_usage.metering_daily_history',
    "WHERE usage_date >= DATEADD('day', -14, CURRENT_DATE())",
    'GROUP BY 1, 2',
    'ORDER BY 1, 2;'
  ].join('\n');

  LAB.addChapter({
    id: 'm11', n: 11, title: 'Where the money goes', short: 'Cost', blurb: 'Seeing the bill, attributing it, bringing it down', minutes: 20,
    focus: ['mart'],
    goals: [
      'Name the **six sources** of Snowflake cost and which controls cover which.',
      'Find out **where the money went** with the usage views.',
      'Attribute cost to **teams** with warehouses, tags and budgets.',
      'Handle a **cost spike** in a calm, ordered way.'
    ],
    say: 'Mission 11 is cost. In Mission 2 you set warehouse guardrails. Here you learn to read the whole bill, because seniors are expected to explain it, not just to keep it low.',
    scenes: [
      B.flow({
        id: 'm11-bill', t: 1, title: 'Six places the bill comes from', g: 'bill', legend: false,
        steps: [
          { say: 'Your Snowflake bill has six sources. The first question in any cost review is which one grew. Press Next to see each.', cap: 'Know the **six sources**. Each has its own controls.' },
          { say: 'Warehouses are the biggest line for most companies. You pay credits for every second a warehouse runs, and credits per hour double with each size.', on: ['b1'], focus: ['wh', 'bill'], cap: 'Controls: **sizing, auto-suspend, resource monitors**, query habits.' },
          { say: 'Serverless features run on compute that Snowflake manages and bills separately: Snowpipe, automatic clustering, search optimization, materialized views, serverless tasks and query acceleration. A warehouse resource monitor does not cap them.', on: ['b2'], focus: ['sl', 'bill'], cap: 'Controls: **budgets**, and a return-on-investment check for each feature.' },
          { say: 'Cloud services cover login, metadata and query planning. Use is free up to 10 percent of your daily warehouse credits. Many tiny queries or heavy metadata commands can push you over it.', on: ['b3'], focus: ['cs', 'bill'], cap: 'Watch it when the count of queries, not their size, is huge.' },
          { say: 'Storage is billed per terabyte per month for tables, Time Travel and Fail-safe history, and clones that have diverged.', on: ['b4'], focus: ['st', 'bill'], cap: 'Controls: **retention**, transient tables, dropping dead tables.' },
          { say: 'Data transfer out of a region or cloud costs money, for example in replication, unloads and cross-region sharing. AI features bill model usage in credits, per call or per token.', on: ['b5', 'b6'], focus: ['tr', 'ai', 'bill'], cap: 'Keep data and consumers in the **same region** when you can. Put a **budget** on AI usage.' }
        ]
      }),

      B.quiz({
        id: 'm11-q1', t: 1,
        q: 'A resource monitor is set on every warehouse, yet the credits bill jumps. Which of these would the monitors NOT have caught?',
        opts: [
          { t: 'Automatic clustering or Snowpipe credits, which run as serverless features', fb: '' },
          { t: 'A warehouse left running over the weekend', fb: 'A resource monitor does cover warehouse credits, so this would have been capped.' },
          { t: 'A very long query on WH_BI', fb: 'Warehouse credits are exactly what resource monitors track.' },
          { t: 'A new Large warehouse added to the plan', fb: 'If it has a monitor, its credits count. A warehouse without one is a gap in your setup, not in the tool.' }
        ],
        ok: 0, why: 'Resource monitors track **warehouse** credits. Serverless features such as Snowpipe and automatic clustering bill separately, so use **budgets** and the usage views to watch them.'
      }),

      B.sql({
        id: 'm11-meter', t: 2, title: 'Find out where the credits went', file: 'worksheet: usage.sql', code: METER,
        ctx: { role: 'ACCOUNTADMIN', wh: 'WH_BI', db: 'SNOWFLAKE.ACCOUNT_USAGE' },
        steps: [
          { say: 'Two questions, in this order. Which warehouse, and which kind of service. Press Next.', lines: null },
          { say: 'First, credits by warehouse for the last week. This tells you whether the growth is in compute, and which workload it belongs to.', lines: [1, 6] },
          { say: 'Second, credits by day and by kind of service. This splits warehouse use from serverless features. Press Run and compare the two days.', lines: [8, 13], run: true }
        ],
        result: { cols: ['USAGE_DATE', 'SERVICE_TYPE', 'CREDITS'], rows: [['2026-03-12', 'AUTO_CLUSTERING', '18.4'], ['2026-03-12', 'PIPE', '3.1'], ['2026-03-12', 'WAREHOUSE_METERING', '41.2'], ['2026-03-13', 'AUTO_CLUSTERING', '61.9'], ['2026-03-13', 'PIPE', '3.0'], ['2026-03-13', 'WAREHOUSE_METERING', '44.0']], msg: '6 of 28 rows shown, illustrative values' },
        note: 'Warehouse use and pipe use barely moved. **Automatic clustering** went from 18 to 62 credits in one day. A chart of total credits would have hidden that. Splitting by service type finds it at once.'
      }),

      B.talk({
        id: 'm11-attrib', t: 2, title: 'Who spent what',
        say: 'Finance will ask which team spent the credits. Five tools answer that. Press Next for each.',
        items: [
          ['A warehouse per workload', 'The simplest attribution. If WH_BI serves analysts and WH_TRANSFORM serves pipelines, the metering view already splits the bill by workload.', 'Each warehouse is a cost line.'],
          ['Query tags', 'Set `QUERY_TAG` in each tool, job and dbt run. Query history then lets you group time and credits by team or job, even on a shared warehouse.', 'Tags answer who ran it.'],
          ['Object tags', 'Tag warehouses, databases and users with a `cost_center` value. Reports can then roll usage up to the owner without guessing.', 'Tag the objects that incur cost.'],
          ['Credits per query', '`QUERY_ATTRIBUTION_HISTORY` estimates the compute credits each query used, so you can rank queries by credits instead of by run time. It needs a role with access to the usage views.', 'Rank queries by credits, not seconds.'],
          ['Budgets', 'A **budget** sets a monthly spending limit on a group of objects and sends alerts as you approach it. It can cover serverless features that resource monitors do not.', 'Budgets catch what monitors miss.']
        ],
        cols: 1
      }),

      B.talk({
        id: 'm11-levers', t: 2, title: 'The levers, in the order I would pull them',
        say: 'When someone asks you to cut the bill, order matters. Start with the cheapest changes that remove waste. Press Next.',
        items: [
          ['1. Stop paying for idle', 'Right-size warehouses, set auto-suspend per workload, and find warehouses that run when nobody queries. This is usually the fastest and safest saving.', 'Remove idle time first.'],
          ['2. Remove duplicate work', 'Two pipelines that build the same table, dashboards that refresh every minute for nobody, and full rebuilds where an incremental load would do. Ask what the business actually uses.', 'Delete work nobody needs.'],
          ['3. Make queries read less', 'Pruning, selecting only needed columns, and fixing joins that multiply rows. This is Mission 7, and it saves compute and time together.', 'Efficient queries are cheaper queries.'],
          ['4. Check serverless return on investment', 'For clustering, search optimization and materialized views, compare what the feature costs with the query time it saves. Remove the ones that do not pay for themselves.', 'Every serverless feature should earn its cost.'],
          ['5. Clean up storage', 'Shorten Time Travel on high-churn tables, use transient tables for rebuildable data, drop unused tables and old clones, and delete staged files you no longer need.', 'Storage hygiene is slow and steady.']
        ],
        cols: 1
      }),

      B.talk({
        id: 'm11-storage', t: 2, title: 'Finding storage waste',
        say: 'Storage is quieter than compute, but it adds up. This view tells you where the bytes are. Press Next.',
        items: [
          ['The storage metrics view', '`SNOWFLAKE.ACCOUNT_USAGE.TABLE_STORAGE_METRICS` splits each table into active bytes, Time Travel bytes, Fail-safe bytes and bytes retained for a clone.', 'One view shows where storage is held.'],
          ['What to look for', 'A table with far more Time Travel and Fail-safe bytes than active bytes is high-churn. A table with large bytes retained for a clone holds data that only a forgotten clone still uses.', 'Compare history bytes with active bytes.'],
          ['What to do', 'Lower retention on churny tables, make rebuildable ones transient, and drop the old clones. Check before you drop: ask the owner, and keep a short Time Travel window on anything you delete.', 'Ask the owner, then drop.']
        ],
        cols: 1
      }),

      B.incident({
        id: 'm11-inc', t: 2, title: 'Incident: daily credits jumped overnight', time: '07:50',
        alert: 'Daily credits went from **63 to 109** overnight. The warehouse chart looks normal, and the finance team has asked for an explanation by noon.',
        clues: ['`WAREHOUSE_METERING` credits are flat', '`AUTO_CLUSTERING` credits more than tripled', 'A clustering key was added to `core.events` yesterday, in a pull request'],
        opts: [
          { t: 'Split the spend by service type, find the serverless jump, then check the automatic clustering history by table', fb: '' },
          { t: 'Scale every warehouse down one size', fb: 'Warehouse credits are flat. The spend is in a serverless feature, so this changes nothing.' },
          { t: 'Suspend all pipelines until the cause is known', fb: 'That stops the business for a cost problem you can locate in minutes.' },
          { t: 'Tell finance it is normal growth', fb: 'A tripled line is not growth. You would be guessing, and it would be wrong.' }
        ],
        best: 0,
        why: 'Total credits hid the problem, because warehouse use was flat. **Splitting by service type** points straight at automatic clustering, and the history by table names the cause.',
        checks: [
          ['Split by service type', '`METERING_DAILY_HISTORY` by `service_type`: which one jumped, and when?'],
          ['Find the object', '`AUTOMATIC_CLUSTERING_HISTORY` by table: which table reclustered, and how much?'],
          ['Understand why', 'A clustering key on a table that receives inserts all day makes Snowflake recluster again and again, because every load disorders it.'],
          ['Act', '`ALTER TABLE ... SUSPEND RECLUSTER` stops the spend at once. Then decide: drop the key, or cluster on a column that suits the load pattern.'],
          ['Prove the value', 'Compare the query speed-up with the clustering credits. Keep the key only if it pays for itself.']
        ],
        tell: 'Credits had risen by about 46 a day, but warehouse use was flat. Splitting by service type showed automatic clustering had tripled, and the history named core.events. A new clustering key on a table with inserts all day was reclustering constantly. I suspended reclustering to stop the spend, then measured the queries it helped. The saving was small, so we dropped the key and told finance the cause the same morning.',
        prevent: ['Add a **budget** that includes serverless features, with an alert at 75 percent', 'Require a **cost and benefit note** for any new clustering key, search optimization or materialized view', 'Review `AUTOMATIC_CLUSTERING_HISTORY` weekly', 'Alert on **daily credits by service type**, and keep the total as a second alert']
      }),

      B.decide({
        id: 'm11-dec', t: 2, title: 'Decision: cost per team',
        scenario: 'Finance wants **cost per team**. Five teams share warehouses and run queries from BI tools, notebooks and dbt. Some teams use more than others. You want a method that stays accurate as teams change.',
        opts: [
          { t: 'Split the monthly bill equally across teams', d: 'Simple, and nobody argues about the method.', lose: 'Heavy users are subsidized, nobody has a reason to save, and finance cannot tell where growth comes from.' },
          { t: 'A warehouse per workload, plus query tags and a cost-center tag, with one reporting view', d: 'Tag the objects and the work, and report from the usage views.' },
          { t: 'A separate Snowflake account per team', d: 'Each team gets its own bill.', lose: 'You gain a clean bill and lose shared data, shared governance and a lot of admin time. It is far too heavy for a cost-reporting problem.' }
        ],
        pick: 1,
        why: '**Warehouses per workload** give a first split. **Query tags** and a **cost-center tag** on objects let you attribute shared warehouses and shared tools fairly. One reporting view over the usage data keeps the method visible and repeatable, and it adjusts as teams change.',
        when: 'A **separate account per team** can be right when regulation or contracts require full isolation, not just for cost. **Equal splits** work for tiny budgets where measuring costs more than it saves.'
      }),

      B.quiz({
        id: 'm11-q2', t: 2,
        q: 'A BI warehouse sits idle every night, and it has `AUTO_SUSPEND` set to never. What is the fastest safe saving?',
        opts: [
          { t: 'Set a suitable auto-suspend, for example a few minutes', fb: '' },
          { t: 'Move the data to a cheaper storage tier', fb: 'The idle cost is compute, not storage.' },
          { t: 'Shorten Time Travel to zero on every table', fb: 'That affects storage and recovery, not warehouse idle time.' },
          { t: 'Delete the warehouse and create one per query', fb: 'It would create start-up costs and chaos, and users would lose their warm cache.' }
        ],
        ok: 0, why: 'An idle warehouse bills every second it runs. A short auto-suspend removes that waste with no change to queries, and **auto-resume** brings it back when someone asks.'
      }),

      B.qa({
        id: 'qa-bill', t: 2, tag: 'Cost', secs: 75,
        q: 'Your Snowflake bill doubled this month. What do you do?',
        pts: ['Find where it grew: by service type, by warehouse, by day', 'Compare with a baseline and with what shipped or changed', 'Find the top warehouses, queries and objects', 'Fix the cause and add a guardrail: monitor, budget, timeout, alert', 'Report: what happened, what it cost, what changed'],
        short: 'I find where it grew before I change anything. I split credits by service type and by day, because a total can hide a serverless feature that tripled while the warehouses stayed flat. Then I narrow down: which warehouse, which queries, which tables or pipelines. I compare against a baseline and against what shipped that week, such as a new pipeline, a clustering key or a dashboard refresh.\n\nOnce I know the cause I fix it, for example a runaway query, an idle warehouse or a feature that does not pay for itself, and I add a guardrail so it cannot repeat: a resource monitor or budget, a timeout, or an alert on daily credits by service type. Then I report to finance what happened, what it cost, and what changed, with the credits before and after.',
        fu: [
          ['What is the first query you run?', 'Credits by day and service type from the metering view, because it shows whether the growth is in warehouses, in serverless features or in cloud services.'],
          ['How would you stop it from happening again?', 'A budget that includes serverless features, resource monitors on warehouses, statement timeouts, and an alert on daily credits by service type.']
        ],
        trap: 'Starting with "I would shrink the warehouses". You have not found the cause, and the growth may be in a feature that warehouse size does not affect.',
        real: 'Tell a real cost story: which line grew, what caused it, what you changed and the credits per day before and after.'
      }),

      B.recap({
        id: 'm11-recap', n: 11, badge: 'Cost Guardian', color: '#BBF7D0',
        pts: [
          'Six sources: **warehouses, serverless features, cloud services, storage, data transfer, AI features**.',
          '**Resource monitors** cover warehouses only. **Budgets** and the usage views cover serverless features.',
          'Split spend by **service type and by day** before you look at anything else.',
          'Attribute cost with **warehouse per workload, query tags, object tags and budgets**.',
          'Pull levers in order: **idle time, duplicate work, efficient queries, serverless return, storage**.'
        ],
        lines: [
          'I split the spend by service type first, because a total can hide a serverless spike.',
          'I attribute cost with warehouses, tags and budgets, so finance sees the same numbers I do.',
          'I ask whether each serverless feature earns its cost.'
        ]
      })
    ]
  });
})();
