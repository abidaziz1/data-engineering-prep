/* Mission 6: boss round. Two drills that mix the missions, a design decision, a coding round that ran for real with dlt, a mock interview and a one-page review. */
(function () {
  var B = LAB.b, G = LAB.get;
  var C = G.counts, X = G.text, n = G.n, M = function (k) { return G.meta(k); };
  var T = G.table('strategies.cases').rows, BD = G.table('boundary.cases').rows, DM = G.table('drift.modes').rows, SY = G.table('sync.cases').rows, CH = G.table('challenge.days').rows;
  var S = C('strategies'), ST = C('state'), PR = C('protocol'), F = C('first');
  var CHF = G.file('challenge.py'), SOL = G.lines(CHF, G.at(CHF, /your answer starts here/) + 1, G.at(CHF, /your answer ends here/) - 1);
  G.expect(CH.length === 4 && CH[0][1] === 100 && CH[1][1] === 20 && CH[2][1] === 7 && CH[3][1] === 0 && CH[3][2] === 117 && CH[3][3] === 117, 'the coding round writes 100, 20, 7 and 0 rows, and ends with 117 rows for 117 orders');

  var QA = [['qa-elt', 1], ['qa-families', 1], ['qa-incr', 1], ['qa-idem', 1], ['qa-deletes', 2], ['qa-cursor', 2], ['qa-drift', 1], ['qa-contracts', 2],
    ['qa-airbyte', 1], ['qa-fivetran', 2], ['qa-backfill', 1], ['qa-monitor', 1], ['qa-state', 2], ['qa-cdc', 2], ['qa-buy', 2]];

  LAB.addChapter({
    id: 'm6', n: 6, title: 'Boss round', short: 'Boss round', blurb: 'Two drills, a decision, a coding round, a mock interview and a one-page review', minutes: 32,
    focus: ['src', 'stg', 'ing', 'mart', 'mon'],
    goals: [
      'Solve **drills** that combine several missions.',
      'Write a **resource** that reads only what changed and is safe to run twice.',
      'Answer a **mock interview round** with a timer, and grade yourself honestly.',
      'Keep a **one-page review** of the rules and the recorded numbers.'
    ],
    say: 'This is the last mission. Two drills in which more than one thing goes wrong, one design decision, one coding round, and then the interview questions with no notes. Grade yourself honestly. An honest grade is the only one worth reading.',
    scenes: [
      B.incident({
        id: 'm6-drill1', t: 1, src: 'rec', title: 'Drill 1: 2 March is doubled, and 3 March is short', time: '09:20',
        alert: '**Finance says that the revenue of 2 March is exactly twice the shop, and the revenue of 3 March is short by one order, and every job is green.** A backfill of 2 March was started twice. On 3 March one order was sent with its amount as the text "11.17". The backfill resource appends, and the revenue model sums `total_cents`.',
        clues: ['The backfill appends, and it ran twice', 'The short order has an amount that is not a whole number', 'No job failed'],
        opts: [
          { t: 'Make the backfill a merge on the key and remove the duplicates, and read the variant column of the amount with a test for nulls', fb: '' },
          { t: 'Divide 2 March by two, and add 11.17 to 3 March', fb: 'Two patches on a report, and the next ones come tomorrow.' },
          { t: 'Freeze the schema and re-run both days', fb: 'Freezing the type would have failed the whole day for one order.' },
          { t: 'Delete both days and wait for the next run', fb: 'The cursor has moved on, and a backfill with append duplicates again.' }
        ],
        best: 0,
        why: 'Two missions at once. **Mission 5**: a window loaded twice held **' + n(ST.window.append[1]) + '** rows with append and **' + n(ST.window.merge[1]) + '** with merge. **Mission 3**: an amount of `"11.17"` went to the variant column `total_cents__v_text`, and `total_cents` was `None`.',
        checks: [
          ['Compare each day with the shop', 'One is double, one is short.'],
          ['Count rows and distinct keys', 'Rows exceed keys on 2 March.'],
          ['Read the columns of 3 March', 'A variant column with the amount.'],
          ['Fix both', 'Merge the backfill, read the variant column, test for nulls.']
        ],
        tell: 'The backfill appended and was started twice, so 2 March was in the table twice, and one order of 3 March sent its amount as text, so the loader put it in a variant column that the revenue model did not read. I changed the backfill to a merge on the key, removed the duplicates, made the model read the variant column, and added a test that no amount is null.',
        prevent: ['A backfill is a **merge**, and it is **locked**', '**Alert** when a variant column appears', 'Test **rows against distinct keys** and **nulls** in key columns']
      }),

      B.incident({
        id: 'm6-drill2', t: 2, src: 'rec', title: 'Drill 2: the bill doubled, and so did the users table', time: '13:40',
        alert: '**The monthly usage of the users connection doubled, and the users table has 40 rows for 20 users.** Someone switched the connection to a full refresh with append to keep a history, and at the same time moved to an incremental sync "to save cost". The source sets `updated_at` to the time of each sync.',
        clues: ['The table has exactly twice the users', 'The incremental sync still reads every row', 'The cursor of the source moves on every sync'],
        opts: [
          { t: 'Use replace or merge for the table, and build a history table on purpose. Ask the source for an honest cursor, or keep the full refresh', fb: '' },
          { t: 'Keep append, and divide the dashboards by two', fb: 'It breaks at the next sync.' },
          { t: 'Switch to a bigger plan', fb: 'It pays for the same mistake.' },
          { t: 'Pause the connection until the end of the month', fb: 'The data goes stale, and the cause stays.' }
        ],
        best: 0,
        why: 'Two missions at once. **Mission 4**: full refresh with append left **' + SY[1][2].split(', ')[1] + '** rows for **' + SY[1][3] + '** users. **Mission 2 and 4**: a cursor that moves on every sync read **' + SY[3][1].split(', ')[1] + '** records again, while an honest cursor read **' + SY[4][1].split(', ')[1] + '**. The bill follows the changed rows, and every row looks changed.',
        checks: [
          ['Compare rows with distinct keys', '40 rows for 20 users.'],
          ['Read the sync mode', 'Full refresh with append.'],
          ['Read the cursor', '`updated_at` is set at each sync.'],
          ['Fix and prove', 'Replace or merge, and a second sync that changes nothing.']
        ],
        tell: 'The connection appended a full refresh, so the table doubled, and the incremental sync did not save anything because the source moves its cursor on every sync, so every row counted as changed. I set the table to replace, removed the duplicates, and I will build a history table on purpose if it is needed. I also asked the owner of the source for a cursor that tells the truth.',
        prevent: ['**Review** changes of a sync mode', 'Test that a **cursor is honest** before you rely on it', 'Watch **usage by connection**']
      }),

      B.decide({
        id: 'm6-dec', t: 2, src: 'docs', title: 'Decision: what do you build for Brewline\'s ingestion?',
        scenario: 'Brewline has ten SaaS tools, one Postgres for orders, and one odd partner API that nobody sells a connector for. Three engineers, a warehouse, dbt for the models, and a finance team that needs deletes handled. The budget is real but not unlimited.',
        opts: [
          { t: 'A managed service for the SaaS tools, log-based capture for Postgres, dlt for the partner API, and dbt on top, with the same checks on all of them', d: 'Each source gets the tool that fits how it changes. The engineers own the models and the checks.', lose: 'Three tools to learn, and a bill to watch by connection.' },
          { t: 'One open-source platform for everything, self-hosted', d: 'One tool, a fixed cost, and the code is yours.', lose: 'The team owns every server, upgrade and connector bug.' },
          { t: 'Custom scripts for everything, in Airflow', d: 'Nothing new to buy or learn.', lose: 'Paging, retries, state, schema changes and monitoring are written ten times.' }
        ],
        pick: 0,
        why: 'Every piece has a reason from this course: a **service** owns the commodity connectors, **log capture** sees the deletes that a cursor missed (**order 11** stayed), **dlt** handled a pretend API with a cursor, a merge and contracts, and the **same checks** (rows against keys, volume, schema) caught the bugs of every mission. The options are from documentation.',
        when: 'With one engineer and no Postgres delete problem, use a managed service for all of it. With a huge volume and a fixed budget, move the largest sources to an open-source tool.'
      }),

      B.challenge({
        id: 'm6-ch', t: 1, title: 'Coding round: an incremental load that is safe to repeat', file: 'challenge.py', lang: 'python',
        q: 'The shop API answers `source.get_orders(day, since=...)` in pages. Write a **dlt resource** `orders` that (1) reads only the orders **changed since the last run**, using `updated_at` as a cursor that starts at `START`, (2) is **safe to run twice** with no duplicate orders, and (3) loads every page. Orders are identified by `id`.',
        starter: '@dlt.resource(name=\'orders\')   # add what an incremental, repeatable load needs\ndef orders():\n    for page in source.get_orders(day[0]):\n        yield page\n',
        hints: ['The cursor is a parameter of the function: `updated=dlt.sources.incremental(\'updated_at\', initial_value=START)`.', 'Ask the API only for what changed: `since=updated.last_value`.', 'Repeatable means a **merge** on a key: `write_disposition=\'merge\'` and `primary_key=\'id\'` in the decorator.', 'Keep the loop over the pages: `for page in ...: yield page`.'],
        sol: SOL,
        res: { cols: ['day', 'rows written', 'rows in the table', 'distinct orders'], rows: CH.map(function (r, k) { return [(k === 3 ? '3 again' : String(r[0])), n(r[1]), n(r[2]), n(r[3])]; }) },
        expl: ['The **cursor** `updated_at` with `initial_value=START` lets the API return only the orders changed since the last run: day 2 wrote **' + CH[1][1] + '** rows and not 109.', '**`write_disposition=\'merge\'`** with **`primary_key=\'id\'`** makes a repeat harmless: day 3 loaded a second time wrote **' + CH[3][1] + '** rows, and the table stayed at **' + n(CH[3][2]) + '** rows for **' + n(CH[3][3]) + '** orders.', 'The loop over **every page** matters: reading only the first page would have loaded 50 rows. And the new fields of day 3 arrived as new columns, because the default contract is evolve.'],
        cx: 'Add a **lookback** (`lag`) if the shop can change an order without a new `updated_at`, and a nightly comparison of ids if deletes matter. Both are mission 2. Add an alert on a new or variant column (mission 3).'
      })
    ].concat(B.mockRound(QA.map(function (x) { return x[0]; }), QA.map(function (x) { return x[1]; }))).concat([
      B.cheat({
        id: 'm6-cheat', t: 1, src: 'rec', title: 'One page to review',
        say: 'This is your last-minute review. The numbers come from the recording with dlt ' + M('dlt') + ' and the Airbyte Faker connector. Sections marked (docs) come from documentation and did not run. Take a screenshot or print the page.',
        sections: [
          { h: 'Loading', items: ['A first load: **' + F.orders + '** orders, **' + F.lines + '** lines in a **child table**, and tables of the tool', 'The same day twice: append **' + T[0][2] + '** rows, replace and merge **' + T[2][2] + '**, for **' + T[0][3] + '** orders', 'A cursor: day 2 wrote **' + T[5][1].split(', ')[1] + '** rows and a repeat wrote **0**. Rows that change need a **merge**'] },
          { h: 'What a cursor misses', items: ['A **delete**: order 11 stayed. A **silent update**: order 12 stayed PLACED', 'A lookback of one day read **' + BD[3][1].split(', ')[1] + '** rows and fixed it', 'A key at the boundary drops the changed row too: append with a key wrote **' + BD[1][1].split(', ')[1] + '** and without a key **' + BD[0][1].split(', ')[1] + '**'] },
          { h: 'Schema drift', items: ['Evolve: **' + DM[0][3].split(', ').length + '** new columns, all 7 orders. Freeze: failed, **' + DM[1][2] + '** kept', 'discard_row kept **' + DM[2][1].split(' ')[1] + '** of 7 with no error. A text amount went to a **variant column**', 'Alert on a change. Fail loudly rather than lose rows'] },
          { h: 'Connectors and cost', items: ['Airbyte: **spec, check, discover, read**; **RECORD** and **STATE**. A read with the saved state gave **' + PR.again + '** records', 'Full refresh with append: **' + SY[1][2].split(', ')[1] + '** rows for **' + SY[1][3] + '** users. A cursor that moves: **' + SY[3][1].split(', ')[1] + '** read again', 'Fivetran (docs): `_fivetran_synced`, `_fivetran_deleted`, **monthly active rows** = distinct keys per month. Airbyte Core: ELv2 (docs)'] },
          { h: 'Production', items: ['State is kept **in the destination too**: a new folder wrote **' + ST.fresh_wrote + '** rows', 'A backfill twice: append **' + ST.window.append[1] + '**, merge **' + ST.window.merge[1] + '**. Lock it', 'Watch freshness, volume, rows against keys, schema, nulls, usage. Real APIs add limits and retries (docs)'] }
        ]
      }),

      B.recap({
        id: 'm6-recap', n: 6, badge: 'Ingestion Partner', color: '#A21CAF',
        pts: [
          'You choose a **family of tools** by how the data changes and who owns the connector.',
          'You make every load **safe to repeat**, and you say what a **cursor** misses: deletes and silent changes.',
          'You handle **schema drift** with a contract, an alert, and explicit columns downstream.',
          'You read a connector\'s **messages**, choose a **sync mode**, and know what drives a **usage-based bill**.',
          'You run **backfills** that merge, keep **state** safe, and monitor **gaps and changes**.'
        ],
        lines: [
          'I can explain what a load did, and why.',
          'I can recover from my own mistakes.',
          'I can talk to the people who own the sources.'
        ]
      })
    ])
  });
})();
