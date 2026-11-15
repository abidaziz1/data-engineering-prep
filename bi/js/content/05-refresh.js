/* Mission 5: refresh. The partition numbers come from DuckDB, the append from the Tableau Hyper engine. Product settings are from documentation. */
(function () {
  var B = LAB.b, G = LAB.get;
  var PT = G.table('refresh.partitions'), R = G.counts('refresh.policy'), HA = G.counts('hyper.append'), REQ = G.text('powerbi.refresh_request'), MODEL = G.file('lookml/brewline.model.lkml'), LK = G.counts('lookml.summary');
  var n = G.n;
  G.expect(R.difference_after_incremental === R.late_order_amount && R.difference_after_refreshing_changed_months === 0, 'the two-month window misses the late refund, and reloading the changed months repairs it');
  G.expect(HA.late_order_status_in_extract === 'completed' && HA.late_order_status_in_source === 'refunded' && HA.difference === HA.late_order_amount, 'the appended extract still holds the old status of the refunded order');
  G.expect(G.counts('powerbi.refresh_request').sent === false, 'the refresh request was built and not sent');

  LAB.addChapter({
    id: 'm5', n: 5, title: 'Refresh and freshness', short: 'Refresh', blurb: 'Schedules, partitions, incremental refresh, and the change it does not see', minutes: 20,
    focus: ['air', 'ing', 'mart'],
    goals: [
      'Start a BI refresh **from the pipeline**, after the load, and say why a clock is not enough.',
      'Explain **incremental refresh**: partitions, a window, and what is reloaded.',
      'Find the change that an incremental refresh **misses**.',
      'Name the refresh features of **Power BI, Tableau and Looker**.'
    ],
    say: 'A dashboard that is fast and wrong by one day is a common complaint, and it lands on the data engineer. This mission is about when the copy is filled, how much of it is reloaded, and what a small window leaves behind.',
    scenes: [
      B.flow({
        id: 'm5-flow', t: 1, src: 'docs', title: 'Refresh after the load, not by the clock', g: 'refresh', legend: true,
        steps: [
          { say: 'Two ways to start a refresh. At the bottom left a **schedule in the BI tool**: every day at 06:00. At the top the **pipeline**. Press Next.', focus: ['clock', 'load'], cap: 'A clock, or the pipeline.' },
          { say: 'The clock first. At 06:00 the tool starts its refresh. It does not know whether the load has finished. On a normal night it has. On a slow night the tool copies half a day.', on: ['e6'], focus: ['clock', 'tool'], status: { load: 'run' }, tags: ['tg_clock'], cap: 'A schedule does not wait for the load.' },
          { say: 'Now the pipeline. Step 1: the load finishes, and only then the quality checks start.', on: ['e1'], focus: ['load', 'test'], status: { load: 'ok', test: 'run' }, cap: 'Load, then check.' },
          { say: 'Step 2: the checks pass. A task calls the **API of the BI tool** and asks for a refresh. If the checks fail, this task never runs, and the dashboard keeps yesterday\'s numbers, which are at least correct.', on: ['e2'], focus: ['test', 'call'], status: { load: 'ok', test: 'ok', call: 'run' }, cap: 'Refresh only what passed the checks.' },
          { say: 'Step 3: the tool reloads its partitions or its extract. Step 4: the pipeline **waits and asks for the status**, because a refresh can fail too, and you want that failure in the same place as all the others.', on: ['e3', 'e4'], focus: ['call', 'tool', 'wait'], status: { load: 'ok', test: 'ok', call: 'ok', wait: 'run' }, tags: ['tg_event'], cap: 'The pipeline owns the refresh.' },
          { say: 'Step 5: the dashboard shows the new numbers. One chain, one place to look when something is late.', on: ['e5'], focus: ['tool', 'dash'], status: { load: 'ok', test: 'ok', call: 'ok', wait: 'ok' }, cap: 'One chain from the source to the tile.' }
        ]
      }),

      B.rows({
        id: 'm5-parts', t: 1, src: 'rec', title: 'A table cut into partitions',
        steps: [
          {
            say: 'A full refresh reloads every row: ' + n(R.rows_full_refresh) + ' order lines, every night, although most of them have not changed in a year. An **incremental refresh** cuts the table into partitions, here one for each month, and reloads only some of them.',
            tabs: [{ layer: 'RECORDED', name: 'The order lines by month, on ' + G.meta('today'), c: 'raw', cols: PT.cols.slice(0, 4), rows: PT.rows.map(function (r) { return r.slice(0, 4); }), trk: 0 }],
            notes: ['The policy in this recording: keep ' + R.keep_months + ' months, reload the newest ' + R.refresh_months + '. Months older than the ' + R.keep_months + ' are dropped from the model.']
          },
          {
            say: 'I ran that policy on a copy of the table. It reloaded ' + R.months_refreshed.join(' and ') + ': **' + n(R.rows_incremental_refresh) + ' rows, ' + R.percent_of_full + ' %** of a full refresh. That is the whole point of the feature.',
            tabs: [{ layer: 'RECORDED', name: 'The order lines by month, on ' + G.meta('today'), c: 'raw', cols: PT.cols.slice(0, 4), rows: PT.rows.map(function (r) { return r.slice(0, 4); }), trk: 0 }],
            notes: ['The older partitions were not read at all. That is also the weakness, as the next step shows.']
          },
          {
            say: 'Now the last column. Today, ' + G.meta('today') + ', a refund was booked on an order from **' + R.late_order_month + '**. That month is outside the window. After the refresh, the model counts ' + n(R.completed_revenue_model_after_incremental) + ' of completed revenue and the warehouse counts ' + n(R.completed_revenue_source) + '. The model is **' + R.difference_after_incremental.toFixed(2) + '** too high, and no refresh failed.',
            tabs: [{ layer: 'RECORDED', name: 'The same months, with the changes of today', c: 'raw', cols: PT.cols, rows: PT.rows, trk: 0 }],
            notes: ['Then I reloaded the months that hold a change, ' + R.months_with_changes_today.join(' and ') + ', by name. The difference went to ' + R.difference_after_refreshing_changed_months + '.']
          }
        ]
      }),

      B.widget({ id: 'm5-lab', kind: 'refresh', t: 1, src: 'rec', title: 'Lab: a refresh policy and a late refund' }),

      B.rows({
        id: 'm5-append', t: 1, src: 'rec', title: 'The same trap in a Tableau extract',
        steps: [
          {
            say: 'An incremental refresh of an extract **adds new rows**. I ran it with the Hyper engine: the extract held ' + n(HA.rows_before) + ' rows up to 30 March, and the append added the ' + n(HA.rows_appended) + ' rows of 31 March.',
            tabs: [{ layer: 'RECORDED', name: 'Appending one day to the extract', c: 'raw', cols: ['Step', 'Rows in the extract', 'File size in bytes'], rows: [['After the full build', n(HA.rows_before), n(HA.bytes_before)], ['After the append', n(HA.rows_after), n(HA.bytes_after)], ['Rows in the warehouse', n(HA.rows_in_source), '']], trk: 0 }],
            notes: ['The row counts match, and the revenue tile gives the same twelve numbers as the warehouse. Everything looks right.']
          },
          {
            say: 'But order ' + HA.late_order_id + ' of ' + HA.late_order_date + ' was refunded today. In the warehouse its status is **' + HA.late_order_status_in_source + '**. In the extract it is still **' + HA.late_order_status_in_extract + '**, because the append never looked at rows that were already there.',
            tabs: [{ layer: 'RECORDED', name: 'Completed revenue, warehouse against extract', c: 'raw', cols: ['Where', 'Completed revenue'], rows: [['Warehouse', n(HA.completed_revenue_in_source)], ['Extract after the append', n(HA.completed_revenue_in_extract)], ['Difference', HA.difference.toFixed(2)]], trk: 1 }],
            notes: ['Row counts cannot find this. A changed row is one row before and one row after. Compare a **sum** with the source, or reload old data on a schedule.']
          }
        ]
      }),

      B.cmp({
        id: 'm5-tools', t: 1, src: 'docs', title: 'Refresh in each tool',
        say: 'The idea is the same in all three. The settings have different names. Press Next.',
        cols: ['', 'Power BI', 'Tableau', 'Looker'],
        hl: 0,
        rows: [
          ['What is refreshed', 'An imported semantic model, table by table and partition by partition.', 'An extract.', 'Nothing is copied. The result cache and derived tables in the warehouse are rebuilt.'],
          ['By the clock', 'Scheduled refresh on the model, a limited number of times a day that depends on the licence.', 'An extract refresh schedule on Tableau Server or Cloud.', 'A datagroup with `max_cache_age`, or a derived table with a time-based trigger.'],
          ['By an event', 'A call to the refresh REST API (a refresh of named partitions needs Premium, Premium per user or Embedded capacity), or the XMLA endpoint.', 'The REST API or the `tabcmd` command line.', 'A datagroup whose `sql_trigger` query changes its result, for example the newest load time.'],
          ['Incremental', 'An incremental refresh policy with the parameters `RangeStart` and `RangeEnd`: a period to keep and a period to reload.', 'An incremental extract refresh that adds rows whose date or id is newer than the newest in the extract.', 'Incremental derived tables with an `increment_key`.'],
          ['Changed old rows', '"Detect data changes" needs a date and time column at the source, looks only inside the reload period, and does not find deleted rows. An older partition needs a refresh by name through the API.', 'Missed. A full refresh brings them in.', 'Not an issue for live queries. A derived table needs an offset or a rebuild.'],
          ['Inside a private network', 'An on-premises data gateway.', 'Tableau Bridge, for Tableau Cloud.', 'Looker must be able to reach the warehouse, through an allowlist or a tunnel.']
        ],
        steps: [
          { upto: 3, say: 'What, by the clock, by an event. Every tool can be started from outside. That is the hook your pipeline needs.' },
          { upto: 6, say: 'Incremental refresh, old rows and private networks. The fifth row is the trap from the recording, and each tool has it in its own form.' }
        ]
      }),

      B.code({
        id: 'm5-request', t: 1, src: 'rec', title: 'Asking Power BI for a refresh', file: 'refresh_request.http', lang: 'http', code: REQ,
        steps: [
          { say: 'This is the request that a pipeline task sends to start a refresh. I built it with a Python library and printed it. **It was not sent**: there is no Power BI here to receive it.', lines: null },
          { say: 'A `POST` to the refreshes of one semantic model in one workspace. The two ids in braces come from the Power BI service.', lines: [1, 1] },
          { say: 'The call needs a token for an identity that may refresh the model. In a pipeline that is a service principal, and its secret lives in the secret store of the orchestrator.', lines: G.span(REQ, /^Authorization/) },
          { say: 'The body can name what to refresh. Here it is one partition of one table: the November partition that held the late refund. Without `objects` the whole model is refreshed by its policy.', lines: G.span(REQ, /"objects"/, /\]/) },
          { say: '`commitMode` and `retryCount` belong to the enhanced refresh of the REST API. The call returns at once. The task must then ask for the status until the refresh has finished.', lines: G.span(REQ, /"type"/, /"commitMode"/) }
        ],
        note: 'Built and printed, not sent. The path and the body follow the Power BI REST API documentation. A refresh that names tables or partitions is an enhanced refresh, which the documentation says needs a model in Premium, Premium per user or Embedded capacity. Check your licence before you rely on it.'
      }),

      B.code({
        id: 'm5-datagroup', t: 2, src: 'rec', title: 'Looker: a cache that follows the load', file: 'brewline.model.lkml', lang: 'lookml', code: MODEL,
        steps: [
          { say: 'Looker has no copy to refresh. It has a **cache** of query results, and the question is when to throw the cache away. This model file was read by a LookML parser. Looker did not run it.', lines: null },
          { say: 'A **datagroup**. Looker runs the `sql_trigger` query from time to time. When its result changes, here the newest load time, everything tied to the datagroup is stale: cached results are dropped and derived tables are rebuilt.', lines: G.span(MODEL, /^datagroup: nightly_load/, /^\}/) },
          { say: '`max_cache_age` is the safety net: no cached result lives longer than 24 hours, even if the trigger never changes.', lines: G.span(MODEL, /max_cache_age/) },
          { say: 'The explore uses the datagroup. So the cache of the sales dashboard is as old as the last load, without a schedule in Looker.', lines: G.span(MODEL, /persist_with/) }
        ],
        note: 'The parser found the datagroup `' + LK.datagroup + '` with a maximum cache age of ' + LK.datagroup_max_cache_age + '. For this to work, your pipeline has to write a load time somewhere that the trigger query can read. That table is yours to build.'
      }),

      B.quiz({
        id: 'm5-q1', t: 1,
        q: 'The BI refresh is scheduled at 06:00. Tonight the load finished at 06:20. What do the viewers see at 09:00?',
        opts: [
          { t: 'Today\'s data, because the load finished before 09:00', fb: 'The copy was filled at 06:00, before the load ended.' },
          { t: 'Whatever was in the tables at 06:00: yesterday\'s data, or half of today\'s', fb: '' },
          { t: 'An error message', fb: 'The refresh succeeded. It copied what was there.' },
          { t: 'Nothing. The dashboard is empty', fb: 'The copy holds the rows that were there at 06:00.' }
        ],
        ok: 1, why: 'A schedule does not wait. The refresh reports success and the numbers are old or partial. Start the refresh from the pipeline, after the load and its checks.'
      }),

      B.quiz({
        id: 'm5-q2', t: 1,
        q: 'An incremental refresh reloads the newest two months. Which change does it miss?',
        opts: [
          { t: 'A new order placed yesterday', fb: 'Yesterday is inside the window.' },
          { t: 'A refund booked today on an order from four months ago', fb: '' },
          { t: 'A new column in the source table', fb: 'A changed structure usually fails the refresh or needs a full one. It is not missed quietly.' },
          { t: 'A new store', fb: 'A new store is a row in a dimension, which is small and reloaded in full.' }
        ],
        ok: 1, why: 'The partition of that order is outside the window, so it is not read. In the recording this left the model ' + R.difference_after_incremental.toFixed(2) + ' above the warehouse.'
      }),

      B.order({
        id: 'm5-ord', t: 1, q: 'Put the nightly chain in order, so that the dashboard never shows half a load.',
        items: [
          'Load the new orders into the warehouse tables',
          'Run the quality checks: row counts, unique keys, totals against the source',
          'Record the load time where the BI tool can read it',
          'Ask the BI tool to refresh, through its API',
          'Wait for the refresh to finish and check its status',
          'Compare one total on the model with the warehouse'
        ],
        why: 'The refresh comes after the checks, and it is itself checked. The last step is the one that would have caught the late refund: a total of the model against the total of the warehouse.'
      }),

      B.incident({
        id: 'm5-inc', t: 2, src: 'docs', title: 'Incident: the dashboard is one day behind', time: '09:10',
        alert: '**The head of sales reports that the dashboard shows yesterday\'s numbers. The refresh history in the BI tool says "succeeded" at 06:02.** The pipeline ran green.',
        clues: ['The load task finished at 06:31 last night. It usually finishes around 05:30', 'The source system delivered its files 50 minutes late', 'The refresh is a schedule inside the BI tool, set to 06:00'],
        opts: [
          { t: 'Start a refresh now, then move the trigger into the pipeline so that it runs after the load and its checks', fb: '' },
          { t: 'Move the schedule in the BI tool to 07:00', fb: 'That works until the next night when the load takes longer. A clock cannot know.' },
          { t: 'Switch the dashboard to a live connection', fb: 'That removes the refresh and moves 200 viewers onto the warehouse. It is a larger change than the problem needs.' },
          { t: 'Tell the source team to deliver on time', fb: 'Late deliveries will happen again. The chain must handle them.' }
        ],
        best: 0,
        why: 'Both systems did what they were told. The refresh ran at its time and the load ran late. The defect is that two steps of one chain are started by two clocks.',
        checks: [
          ['Now', 'Trigger the refresh by hand or by the API and tell the head of sales when the numbers will be right.'],
          ['Chain', 'Add a task after the quality checks that calls the refresh API and waits for the result.'],
          ['Remove', 'Delete the schedule in the BI tool, so that there is one way to start a refresh.'],
          ['Show', 'Put the time of the last load on the dashboard. Viewers can then see how old the numbers are.']
        ],
        tell: 'The dashboard was a day behind because the BI refresh was on a 06:00 schedule and the load finished at 06:31. I refreshed it by hand, then moved the trigger into the pipeline, after the load and the checks, and removed the schedule in the tool. The dashboard now shows the time of its last load.',
        prevent: ['**One orchestrator** starts the load, the checks and the refresh', 'A **freshness line** on the dashboard: "data up to ..."', 'An **alert** when the model is older than the warehouse by more than an hour']
      }),

      B.decide({
        id: 'm5-dec', t: 2, src: 'docs', title: 'Decision: refunds arrive up to 90 days late',
        scenario: 'Brewline accepts refunds for 90 days. A refund changes the status of an old order. The imported model uses incremental refresh with a window of two months, and finance has noticed that last quarter never quite matches the warehouse. The fact table has about 122,000 lines and grows slowly.',
        opts: [
          { t: 'Keep the window of two months and do a full refresh every Sunday', d: 'Simple to explain.', lose: 'The numbers are wrong from Monday to Saturday, and finance closes the books on a weekday. A known error that is repaired weekly is still an error.' },
          { t: 'Widen the window to four months, so that it covers the 90 days', d: 'The policy now matches the business rule. On this table it reloads about a quarter of the rows each night, which is cheap.' },
          { t: 'Keep two months, and refresh by name every older partition that holds a changed order', d: 'The smallest reload. It needs an `updated_at` column, a query that finds the changed months, and a call to the refresh API for each.', lose: 'It is the right design for a very large table. For 122,000 lines it is more moving parts than the problem deserves.' }
        ],
        pick: 1,
        why: 'The window of an incremental refresh is a statement about how late a row can change. If the business allows 90 days, the window has to cover 90 days. Start with the simple policy and move to targeted partitions when the table is too large for it.',
        when: 'Choose targeted partition refreshes when the fact has billions of rows and a wide window would take hours. Whatever you choose, reconcile one total against the warehouse after each refresh.'
      }),

      B.qa({
        id: 'qa-incr', t: 1, tag: 'BI', secs: 75,
        q: 'How does incremental refresh work, and what can go wrong with it?',
        pts: ['The table is cut into partitions by a date', 'A policy keeps a long period and reloads a short, recent one', 'Older partitions are not read, which is the saving', 'A late change to an old row is missed without any error'],
        short: 'Incremental refresh cuts an imported table into partitions by a date column, for example one partition for each month. A policy says how much history to keep and how much of the recent past to reload. Each night only the recent partitions are read again, so a refresh that took an hour takes minutes. In the recording behind this course a two-month window reloaded 14 percent of the rows. The risk is in the saving: a partition outside the window is never read, so a refund or a correction on an old order stays wrong in the model, and nothing fails. The window has to cover how late a row can change, and I reconcile a total against the warehouse to prove it.',
        fu: [['How does Power BI define the partitions?', 'With two parameters, RangeStart and RangeEnd, that filter the source query. The service fills them for each partition.'], ['How would you repair one old month?', 'Refresh that partition by name through the refresh API or the XMLA endpoint.']],
        trap: 'Describing only the speed. The interviewer is waiting for late-arriving data.',
        real: 'Say how late a row could change in your data, and what window you used.'
      }),

      B.qa({
        id: 'qa-fresh', t: 1, tag: 'Pipelines', secs: 60,
        q: 'How do you make sure a dashboard is refreshed after your pipeline, and not before?',
        pts: ['Do not rely on two clocks', 'Trigger the refresh from the orchestrator, after load and checks', 'Wait for the refresh and treat its failure like any task failure', 'Show the load time on the dashboard'],
        short: 'I do not let the BI tool run on its own schedule. The orchestrator that runs the load also starts the refresh: load, quality checks, then a task that calls the refresh API of the tool, then a task that waits for the result. If a check fails, the refresh does not start, and the dashboard keeps yesterday\'s correct numbers. If the refresh fails, it fails in my pipeline, where the alerts are. For Looker, which has no refresh, I write the load time to a table and let a datagroup watch it. And I put the time of the last load on the dashboard, so people can see how old the numbers are.',
        fu: [['What if the BI tool has no API access for you?', 'Then agree a schedule with a margin, publish the load time, and alert when the model is older than the warehouse.'], ['What do you check after the refresh?', 'One or two totals of the model against the warehouse.']],
        trap: 'Saying "we scheduled it an hour later".',
        real: 'Name the orchestrator and the tool you connected.'
      }),

      B.qa({
        id: 'qa-late', t: 2, tag: 'Pipelines', secs: 60,
        q: 'Row counts match between the warehouse and the BI model, but a total differs. What happened?',
        pts: ['A row changed in place: the count is the same, the value is not', 'Typical: a status change, a refund, a corrected amount on old data', 'An append or a narrow refresh window never re-read that row', 'Compare sums as well as counts, and reload the affected partition'],
        short: 'A row changed in place. An update keeps the number of rows the same, so a count cannot see it, and only a sum can. The usual case is a status change or a refund on an old order. The BI copy was filled by an append, or by an incremental refresh whose window does not reach back that far, so the old version of the row is still there. I saw exactly this with a Tableau extract in the recording for this course: the same number of rows, and 56 more in completed revenue, because one order from November was refunded later. The repair is to reload the affected period, and the prevention is to compare a sum after every refresh.',
        fu: [['How do you find which period is affected?', 'With an updated_at column on the source: group the changed rows by partition.'], ['And if the source has no updated_at?', 'Then reload a window that covers the business rule, or compare sums by partition to find the one that differs.']],
        trap: 'Assuming the load is wrong. The load can be right while the copy is old.',
        real: 'Say which reconciliation checks you ran in a past job.'
      }),

      B.recap({
        id: 'm5-recap', n: 5, badge: 'Refresh Planner', color: '#FBCFE8',
        pts: [
          'Start the refresh **from the pipeline**: load, checks, refresh, wait. A clock in the tool does not wait for the load.',
          '**Incremental refresh** reloads a recent window: ' + n(R.rows_incremental_refresh) + ' of ' + n(R.rows_full_refresh) + ' rows in the recording.',
          'A change **outside the window** is missed without an error. The model was ' + R.difference_after_incremental.toFixed(2) + ' too high.',
          'An extract append has the same trap: **same row count, different sum**.',
          'The window must cover **how late a row can change**. Reconcile a total after every refresh.'
        ],
        lines: [
          'I trigger the refresh, I do not hope for it.',
          'I size the window from the business rule.',
          'I compare sums as well as counts.'
        ]
      })
    ]
  });
})();
