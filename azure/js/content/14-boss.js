/* Mission 14: drills that mix missions, a design decision, a coding round, the boss round of interview questions, and a one-page review.
   Every number on the cheat sheet comes from a recording in an earlier mission (Azure SDK for Python against Azurite, DuckDB, local Spark with Delta Lake,
   cryptography, Checkov) or from arithmetic at the example rates of the cost lab. Facts about the Azure services come from the documentation, and nothing
   here ran on Azure. */
(function () {
  var B = LAB.b, G = LAB.get;

  /* Boss round: questions come from the earlier missions, in mission order. Tier 1 is the junior path, tier 2 adds the senior questions. */
  var BOSS = [
    ['qa-map', 1], ['qa-bill', 2],
    ['qa-storage', 1], ['qa-sas', 1], ['qa-lake', 2],
    ['qa-rbac', 1], ['qa-mi', 1], ['qa-acl', 2],
    ['qa-adf', 1], ['qa-ir', 1], ['qa-meta', 2],
    ['qa-triggers', 1], ['qa-idem', 1], ['qa-incr', 2],
    ['qa-medallion', 1], ['qa-delta', 1], ['qa-smallfiles', 2],
    ['qa-serverless', 1], ['qa-serverless-bill', 1], ['qa-serverless-layout', 2],
    ['qa-dedicated', 1], ['qa-distribution', 1], ['qa-engine-choice', 2],
    ['qa-eventhubs', 1], ['qa-partitionkey', 1], ['qa-checkpoint', 2],
    ['qa-event-driven', 1], ['qa-queue', 1], ['qa-functions', 2],
    ['qa-keyvault', 1], ['qa-private-endpoint', 2], ['qa-secure-lake', 2],
    ['qa-cost-first', 1], ['qa-cost-levers', 1], ['qa-commitments', 2],
    ['qa-iac-why', 1], ['qa-cicd-infra', 2], ['qa-drift', 2]
  ];

  var CH = G.counts('identity.chain'), WM = G.counts('adf.watermark').strategies, OP = G.counts('delta.optimize'), VC = G.counts('delta.vacuum'), PR = G.counts('spark.prune');
  var SPC = G.counts('synapse.columns').bytes_by_column, SPR = G.counts('synapse.prune').cases, DD = G.counts('dedicated.distribution'), MV = G.counts('dedicated.movement');
  var KS = G.counts('eventhubs.keyspread'), QR = G.counts('queue.redrive'), EN = G.counts('security.envelope'), CK = G.counts('iac.checkov');
  var BI = LAB.W.billInfo, BASE = BI.lines({}), T0 = BI.total(BASE), REPLAY = LAB.W.ehInfo.replayed(100, 2547);
  function usd(n, d) { d = d === undefined ? 0 : d; return '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }); }
  function n0(n) { return Number(n).toLocaleString('en-US'); }
  function saved(k) { var sv = {}; sv[k] = 1; return T0 - BI.total(BI.lines(sv)); }
  var SORTED = BASE.slice().sort(function (a, b) { return b[1] - a[1]; });
  var COLTOTAL = Object.keys(SPC).reduce(function (a, k) { return a + SPC[k]; }, 0), TWO = SPC.order_date + SPC.total_eur;
  function mvc(how) { return MV.cases.filter(function (c) { return c.how === how; })[0]; }
  function p(id) { return SPR.filter(function (c) { return c.id === id; })[0]; }

  G.expect(CH.order.length === 9 && CH.order[0] === 'EnvironmentCredential' && CH.order[2] === 'ManagedIdentityCredential' && CH.order[5] === 'AzureCliCredential', 'the order of the default credential chain');
  G.expect(WM.A.missing.join() === 'O5' && WM.B.missing.join() === 'O3,O5' && WM.C.missing.length === 0, 'the three watermark strategies lose O5, O3 and O5, and nothing');
  G.expect(OP.files_before === 20 && OP.files_after === 1 && VC.default_retention_hours === 168 && PR.scan_with_filter[0].numFiles === 2 && PR.scan_without_filter[0].numFiles === 5, 'OPTIMIZE and pruning numbers quoted in the cheat sheet');
  G.expect(Math.round(TWO / COLTOTAL * 100) === 6 && p('p2').files === 14 && p('p1').files === 60, 'two columns are 6 percent of the bytes, and a month opens 14 of 60 files');
  G.expect(DD.distributions === 60 && DD.by_column.status.empty === 56 && mvc('HASH(customer_id)').moved === 0 && Math.round(mvc('HASH(order_id)').share * 100) === 98, 'the dedicated pool numbers quoted in the cheat sheet');
  G.expect(Math.round(KS.by_key.status.busiest_share * 100) === 96 && REPLAY === 47 && QR.max_dequeue_count === 3 && EN.wrapped_key_bytes === 40, 'the stream, queue and key numbers quoted in the cheat sheet');
  G.expect(Math.round(T0) === 7489 && Math.round(saved('pause')) === 2160 && Math.round(saved('logs')) === 828 && CK.passed === 24 && CK.failed === 2 && CK.skipped === 5, 'the cost lab and the scan numbers quoted in the cheat sheet');

  var T = G.table('spark.gold');
  var GOLD_ROWS = T.rows.map(function (r) { return [r[0], r[1], parseInt(r[2], 10), parseFloat(r[3])]; });
  var RUN = {};
  var RUNNING = GOLD_ROWS.slice().sort(function (a, b) { return a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : a[0] < b[0] ? -1 : 1; }).map(function (r) { RUN[r[1]] = (RUN[r[1]] || 0) + r[3]; return [r[0], r[1], r[3].toFixed(2), RUN[r[1]].toFixed(2)]; });
  var RUN_SQL = [
    'SELECT order_date,',
    '       country,',
    '       revenue_eur,',
    '       SUM(revenue_eur) OVER (',
    '           PARTITION BY country',
    '           ORDER BY order_date',
    '           ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW',
    '       ) AS running_revenue_eur',
    'FROM gold_daily_revenue',
    'ORDER BY country, order_date;'
  ].join('\n');

  LAB.addChapter({
    id: 'm14', n: 14, title: 'Boss round and cheat sheet', short: 'Boss round', blurb: 'Drills that mix topics, a design decision, a coding round, a mock interview and a one-page review', minutes: 55,
    focus: ['src', 'stg', 'int', 'mart', 'con', 'sf', 'air', 'mon', 'qual', 'snap', 'ci'],
    goals: [
      'Solve **drills** that combine several missions, with the first move and the reasoning.',
      'Make a **design decision** for the whole Brewline platform, and defend it with numbers.',
      'Write a **running total** with a window function over the gold table.',
      'Answer a **mock interview round** with no notes, and grade yourself honestly.',
      'Keep a **one-page review** of the numbers, settings and decision rules.'
    ],
    say: 'This is the last mission. Two drills that mix topics, a design decision, a coding round, then the boss round: real interview questions with no notes. Be honest when you grade yourself. An honest grade makes the scorecard worth reading.',
    scenes: [
      B.incident({
        id: 'm14-inc1', t: 1, src: 'docs', title: 'Drill: a new analyst cannot read the curated folder', time: '10:05',
        alert: '**A new analyst gets an authorization error when a serverless query reads the curated container.** Colleagues in the same group read it without trouble. The analyst was added to the group `brewline-analysts` an hour ago, and had signed in to Synapse Studio before that. The group holds Storage Blob Data Reader on the container.',
        clues: ['The group holds the role, and teammates can read', 'The analyst joined the group after signing in', 'A token is a snapshot that is issued at sign-in'],
        opts: [
          { t: 'Ask the analyst to sign out and in again for a new token, and check that the new membership shows up', fb: '' },
          { t: 'Give the analyst the Owner role on the storage account', fb: 'Owner does not grant data access, and it gives far more than a reader needs.' },
          { t: 'Send the analyst the account key', fb: 'The key opens everything, names nobody in the logs, and the account may have shared key access switched off.' },
          { t: 'Add a SAS token to the view', fb: 'A SAS is a stored secret that expires. The role is already right.' }
        ],
        best: 0,
        why: 'The role is on the group, and teammates read fine, so the assignment is right. What differs is the analyst\'s token: it was issued before the membership change, so it does not carry the new group. A new token, from a new sign-in, does. Nothing about the grants should change.',
        checks: [
          ['Read the error', 'It is an authorization failure, and not a network or name error, so the identity reaches the lake.'],
          ['Compare with a teammate', 'Same group, same role, and a teammate reads. The grants are fine.'],
          ['Check the membership time', 'The analyst joined the group after the last sign-in.'],
          ['Get a new token', 'Sign out and in, and read again.'],
          ['Keep it clean', 'Never grant to a person to work around a delay.']
        ],
        tell: 'A new analyst could not read the curated container although the group had the role and a teammate could read. I saw that the analyst had joined the group after signing in, and a token is issued at sign-in, so it did not carry the new membership. A new sign-in fixed it, and I changed no grant. To avoid the delay, we add people to groups before their first day.',
        prevent: ['**Add people to groups** before they start', 'Never **grant to a person** to work around a delay', 'Remember that a **token is a snapshot**', 'Read the **error code** before you change a role']
      }),

      B.incident({
        id: 'm14-inc2', t: 2, src: 'docs', title: 'Drill: the weekend backfill doubled the bill', time: '08:30',
        alert: '**The Azure bill for the weekend is twice a normal weekend.** On Friday evening an engineer started a backfill of 90 days with a tumbling window trigger and a maximum concurrency of 50, and resumed the dedicated pool for it. The backfill ended on Saturday morning. The pool was still online on Monday, and the log workspace took three times its usual volume.',
        clues: ['Backfill windows run in parallel, and each copy bills DIU hours', 'The pool was resumed and never paused', 'The diagnostic logs were verbose while the backfill ran'],
        opts: [
          { t: 'Group the cost by service and by day, pause the pool, lower the concurrency for the next backfill, choose the diagnostic categories, and add a forecast alert', fb: '' },
          { t: 'Ask finance for a bigger budget', fb: 'It pays for the problem and does nothing about it.' },
          { t: 'Delete the factory and build it again', fb: 'The factory is not the cause. A pool that stayed on is.' },
          { t: 'Buy a one-year reservation for the pool', fb: 'It would lock in the always-on cost of a pool that should have been paused.' }
        ],
        best: 0,
        why: 'Three meters moved at once: copy hours for the parallel windows, pool hours for a pool that stayed on, and log GB for verbose categories. Cost analysis by service and day shows the three steps. The pool is the biggest line, so pausing is first. A forecast alert would have told the team in the middle of the weekend.',
        checks: [
          ['Group by service and by day', 'The three steps show on the daily chart: Friday evening onward.'],
          ['Stop the biggest line', 'Pause the pool now. Storage keeps billing, compute stops.'],
          ['Tame the backfill', 'A lower maximum concurrency, and a plan for the hours that it needs.'],
          ['Choose the logs', 'The categories that you query, as in mission 12.'],
          ['Add the alarm', 'A forecast alert, to a team, and an alert on a pool that is online out of hours.']
        ],
        tell: 'The weekend bill doubled because a 90 day backfill ran with a concurrency of fifty, the dedicated pool was resumed for it and never paused, and the log workspace took verbose categories. I grouped the cost by service and day to confirm the three steps, paused the pool, lowered the concurrency for the next backfill, chose the log categories, and added a forecast alert and an alert on a pool that is online out of hours.',
        prevent: ['**Pause** after a load, on a schedule', 'Set a **concurrency** that fits the budget', '**Choose** log categories', 'Alert on the **forecast**']
      }),

      B.decide({
        id: 'm14-dec', t: 2, src: 'docs', title: 'Decision: the platform for Brewline Europe',
        scenario: 'Brewline Europe starts with **600,000 orders** and expects **8 million** in a year. **Four engineers** will run it. The business wants **daily revenue by country**, **click events within seconds** for the site team, and an **audit** of who reads customer data. The budget is tight, and the data is sensitive.',
        opts: [
          { t: 'One dedicated SQL pool for everything, always on, loaded with COPY INTO and serving the dashboards', d: 'One engine, T-SQL that the team knows.', lose: 'At 600,000 rows each of the 60 distributions holds about ' + n0(DD.rows / DD.distributions) + ' rows, far too few for a columnstore. The pool bills every hour, and the clicks still need a stream.' },
          { t: 'ADLS Gen2 with bronze, silver and gold. Data Factory lands the orders with a load that is safe to repeat, a Spark job on a job cluster builds silver and gold in Delta, serverless SQL serves gold, Event Hubs with Capture takes the clicks. Managed identities, private endpoints, Key Vault and chosen logs, all in Bicep and deployed by a pipeline', d: 'Each piece matches the size of the data, and the bill follows the work. Compute exists only while it runs, and the files stay in open formats.' },
          { t: 'A Databricks workspace for all transformation and all BI queries', d: 'A strong platform with jobs and governance in one place.', lose: 'At this size serverless SQL over gold tables serves BI at a small cost for each query, and a second product adds a second bill and a second set of permissions for four people to run. Choose it when the team needs its jobs and governance.' }
        ],
        pick: 1,
        why: 'Orders are small today, so a pool is the wrong tool: ' + n0(DD.rows / DD.distributions) + ' rows in each distribution, and in the cost lab a pool is ' + Math.round(SORTED[0][1] / T0 * 100) + ' percent of the bill. A lake with a Delta silver and gold, a serverless SQL layer and a stream with Capture each cost for the work that they do. Identities, private endpoints, Key Vault and the log choices answer the audit, and Bicep with a pipeline makes the second region the same as the first.',
        when: 'If the data grows to hundreds of millions of rows, or the team already lives in Databricks or Fabric, revisit the choice. Because the files stay in Parquet and Delta, the move is a job and not a rewrite.'
      }),

      B.challenge({
        id: 'm14-ch', t: 2, title: 'Coding round: a running total of revenue', file: 'running_revenue.sql', lang: 'sql',
        q: 'The gold table of mission 6 is `gold_daily_revenue`. **Write a query that adds a running total of revenue for each country, in date order**, and returns the rows ordered by country and date.',
        data: [{ name: 'gold_daily_revenue (from mission 6)', cols: T.cols, rows: T.rows }],
        starter: '-- every gold row, with the running revenue of its country\nSELECT order_date, country, revenue_eur, ...\nFROM gold_daily_revenue',
        hints: ['A running total is `SUM(...) OVER (...)`.', 'The total restarts for each country, so partition by country.', 'The order inside the partition is the date, and the frame runs from the first row to the current one.'],
        sol: RUN_SQL,
        res: { msg: GOLD_ROWS.length + ' rows', cols: ['order_date', 'country', 'revenue_eur', 'running_revenue_eur'], rows: RUNNING },
        expl: ['`PARTITION BY country` makes one window for each country, so the total restarts when the country changes.', '`ORDER BY order_date` inside the window decides the order of the additions, and the frame `UNBOUNDED PRECEDING` to `CURRENT ROW` says: all earlier rows and this one.', 'Netherlands has 18.75 on the first day and 7.75 on the second, so the running total is 26.50. Germany goes from 12.00 to 32.00.', 'The data is the gold table that local Spark wrote in mission 6, so the numbers are the real ones of that run.'],
        cx: 'One sort by country and date, and a single pass to add. In a distributed engine the rows of one country should sit together, so that the window needs no shuffle.'
      }),

      B.mockRound(BOSS.map(function (b) { return b[0]; }), BOSS.map(function (b) { return b[1]; })),

      B.cheat({
        id: 'm14-cheat', t: 1, src: 'rec', title: 'One page to review',
        say: 'This is your last-minute review. Items marked (docs) come from documentation and were not run. Everything else comes from a recording or from arithmetic at the example rates of the cost lab. Take a screenshot or print the page.',
        sections: [
          { h: 'Map and bill', items: ['Tenant, management groups, subscriptions, resource groups, resources. The bill belongs to a subscription. A region and a name decide where and what (docs)', 'A meter says what is counted: hours, GB, TB processed, operations. Learn the meter before the price', 'Cost lab month ' + usd(T0) + ': the dedicated pool and the log workspace are ' + Math.round((SORTED[0][1] + SORTED[1][1]) / T0 * 100) + ' percent of it. Rates are examples'] },
          { h: 'Storage', items: ['An account name is 3 to 24 lower-case letters and digits, unique in Azure. A hierarchical namespace makes it ADLS Gen2 (docs)', 'Tiers: Hot, Cool, Cold, Archive, with minimum days of 30, 90 and 180. Archive must be rehydrated before a read', 'LRS, ZRS, GRS and GZRS copy data. None of them undoes a delete: use soft delete. A hierarchical namespace has no versioning (docs)', 'A SAS is a signed URL. Prefer a user delegation SAS. An overwrite with `overwrite=False` is a conditional write'] },
          { h: 'Identity', items: ['Control plane roles and data plane roles are different. Owner does not read blobs', 'A role is who, which role and which scope. RBAC is checked first, and ACLs on folders add to it', 'DefaultAzureCredential tries ' + CH.order.length + ' credentials in order, from ' + CH.order[0] + ', through ' + CH.order[2] + ', to ' + CH.order[5], 'Managed identity: no secret. A token is a snapshot of sign-in. A federated credential replaces a stored secret'] },
          { h: 'Data Factory', items: ['A pipeline is activities with dependency conditions. Four triggers: schedule, tumbling window, storage event and custom event (docs)', 'Four runtimes: Azure, managed network, self-hosted, SSIS. DIU from 2 to 256 (docs)', 'Watermark: the largest value loses ' + WM.A.missing.join(', ') + ', the run time loses ' + WM.B.missing.join(' and ') + ', overlap with an upsert loses none', 'Safe to repeat: a dated folder, or stage and merge. A handled failure can leave a run green: end with a Fail activity'] },
          { h: 'Spark and the lakehouse', items: ['Bronze as text with the file name, silver typed with one row per key, gold for questions. Use try_cast and a quarantine table', 'Delta is Parquet plus a log. OPTIMIZE turned ' + OP.files_before + ' files into ' + OP.files_after + ', and VACUUM keeps ' + VC.default_retention_hours + ' hours by default', 'A partition filter read ' + PR.scan_with_filter[0].numFiles + ' of ' + PR.scan_without_filter[0].numFiles + ' files. Broadcast the small side of a join', 'abfss://container@account.dfs.core.windows.net/path. Prefer a managed identity to a secret (docs)'] },
          { h: 'Synapse serverless', items: ['No storage, no cluster. Bills for TB processed, rounded up to the MB, with a 10 MB minimum for each query. Example rate $5 per TB (docs)', 'Two of 11 columns were ' + Math.round(TWO / COLTOTAL * 100) + ' percent of the bytes. CSV reads everything. Skip folders with filepath(): a month opened ' + p('p2').files + ' of ' + p('p1').files + ' files', 'UTF-8 collation and varchar for Parquet. Files of 100 MB to 10 GB (docs). sp_set_data_processed_limit sets a budget (docs)'] },
          { h: 'Dedicated pool', items: ['60 distributions for every table. A step ends with the slowest one. Hash, round robin or replicated', 'Hash on customer_id: ' + mvc('HASH(customer_id)').moved + ' rows moved for the join. Any other column: ' + Math.round(mvc('HASH(order_id)').share * 100) + ' percent. HASH(status) left ' + DD.by_column.status.empty + ' of 60 empty', 'A columnstore wants tens of millions of rows. ' + n0(DD.rows) + ' rows give ' + n0(DD.rows / DD.distributions) + ' for each distribution. Pause on a schedule: storage keeps billing'] },
          { h: 'Event Hubs', items: ['A log in ordered partitions. Same key, same partition. Key by status: ' + Math.round(KS.by_key.status.busiest_share * 100) + ' percent in one of 4 partitions', 'One reader for each partition in a consumer group. The checkpoint goes after the work. A crash repeats ' + REPLAY + ' events with a checkpoint every 100', 'Capture: Avro files, 5 minutes or 300 MB by default (docs). Throughput units: 1 MB per second in (docs)'] },
          { h: 'Events and Functions', items: ['Event Grid pushes facts, at least once. On Data Lake, filter data.api on FlushWithClose (docs)', 'A queue hides a message while it is read. A client moves it to a poison queue after ' + QR.max_dequeue_count + ' tries. Functions: 5 tries by default, then `-poison` (docs)', 'Delete after the work. Handlers are safe to repeat: refuse to overwrite, name by the input. Test with pytest and Azurite'] },
          { h: 'Security', items: ['Key Vault: Secrets User reads. Soft delete keeps 7 to 90 days, 90 by default. Purge protection is optional. Recovery loses role assignments (docs)', 'Envelope encryption: a rotation re-wraps a ' + EN.wrapped_key_bytes + ' byte key and leaves the data alone. A destroyed key makes the data unreadable', 'A private endpoint needs private DNS. Shared key access off, TLS 1.2, public access off, and a default action of Deny'] },
          { h: 'Cost', items: ['Pausing the pool saves ' + usd(saved('pause')) + ' of the lab month, and chosen logs save ' + usd(saved('logs')), 'A budget is an alarm. Alert on the forecast, to a team, for each environment', 'A reservation bills every hour: it beats pausing only above its break-even share of hours. Cut first, commit after'] },
          { h: 'Infrastructure as code', items: ['Bicep compiles to ARM, with no state file. What-if previews. Incremental leaves unnamed resources, Complete deletes them (docs)', 'Checkov scanned the Bicep set: ' + CK.passed + ' passed, ' + CK.failed + ' failed, ' + CK.skipped + ' skipped with written reasons. A scan reads properties, and not intent', 'Federated credential, `id-token: write`, one identity for each environment, approval for prod, a nightly what-if for drift'] },
          { h: 'Say it in one line', items: ['Name the meter before you name the fix.', 'Make every write and every handler safe to run twice.', 'Check the cheap things first: a plan, a scan, a what-if.', 'Give identities, not people, the access, and keep secrets out of code.', 'Say what you know from practice, and say when you would check the documentation.'] }
        ]
      }),

      B.recap({
        id: 'm14-recap', n: 14, badge: 'Azure Architect', color: '#BFDBFE',
        pts: [
          'You can follow Brewline from the **tenant and the bill**, through **storage, identity, Data Factory, Spark, Synapse and Event Hubs**, to **events, security, cost and code**.',
          'You can **read a plan, a scan, a log and a bill**, and say what each one tells you and what it hides.',
          'You make loads and handlers **safe to repeat**, and you keep **secrets out of code**.',
          'You **choose by the size of the data** and the shape of the cost, and you can defend the choice with numbers.',
          'You say what you **know from practice**, and you say when you would **check the documentation**.'
        ],
        lines: [
          'I name the meter before I name the fix.',
          'I make everything safe to run twice.',
          'I check what I can, and I say what I did not.'
        ]
      })
    ].reduce(function (all, x) { return all.concat(x); }, [])
  });
})();
