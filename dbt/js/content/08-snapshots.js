/* Mission 8: snapshots, history, and joining to the right version. */
(function () {
  var B = LAB.b, G = LAB.get;

  var SNAP = G.file('snapshots/snap_customers.yml');
  var CHECKALL = G.file('scenario/snap_customers_check_all.yml');
  var HARD = G.file('scenario/snap_customers_hard_deletes.yml');
  var d1 = G.table('snap_day1'), d2 = G.table('snap_day2');
  var wrong = G.table('asof_wrong'), right = G.table('asof_orders');
  var diffs = [];
  wrong.rows.forEach(function (r, i) { r.forEach(function (c, j) { if (c !== right.rows[i][j]) diffs.push([i, j]); }); });
  var ALLN = G.table('snap_all_counts').rows[0];
  var ALL12 = G.table('snap_all_rows').rows;
  var CHK = G.table('snap_check_day2').rows;
  var DEL = G.table('snap_delete_rows');

  LAB.addChapter({
    id: 'm8', n: 8, title: 'Snapshots and history', short: 'Snapshots', blurb: 'Keep the past of a table that only shows the present', minutes: 26,
    focus: ['snap'],
    goals: [
      'Say why a **snapshot** exists and what **type 2** history means.',
      'Read a snapshot configuration and the **four columns** dbt adds.',
      'Choose between the **timestamp** and **check** strategies.',
      'Join a fact to the **version that was true at the time**.'
    ],
    say: 'Mission 8 is memory. Most source tables only show the present: when a customer changes, the old row is overwritten. If you want to know what was true last month, you have to have written it down. A snapshot is dbt writing it down.',
    scenes: [
      B.talk({
        id: 'm8-talk', t: 1, title: 'Why snapshots exist',
        say: 'Four points. Press Next for each.',
        items: [
          ['Sources forget', 'The customers table has one row per customer, and an update overwrites it. When Ava moves from standard to gold, nothing in the source says she was ever standard.', 'The source keeps the present only.'],
          ['Why that hurts', 'Say you want revenue by customer tier **at the time of the order**. If you join orders to today\'s customers table, every old order of a customer who is now gold looks like a gold order.', 'Today\'s attribute on yesterday\'s fact is wrong.'],
          ['A snapshot keeps every version', 'dbt compares the source with the snapshot table each time you run it. A row that changed gets its old version closed and a new version opened. Each version has a validity range. This pattern is called a **type 2 slowly changing dimension**.', 'One row per version, with from and to dates.'],
          ['What it cannot do', 'A snapshot only sees the source **when it runs**. If a row changes twice between two runs, the first change is lost. Run the snapshot as often as the data changes.', 'History is as fine as your schedule.']
        ],
        cols: 1
      }),

      B.flow({
        id: 'm8-flow', t: 1, title: 'What dbt snapshot does', g: 'scd2', legend: true,
        steps: [
          { say: 'This is one snapshot run. Press Next to follow it.', cap: 'The same steps run for every customer.' },
          { say: 'The source has the customers as they are today. It overwrites rows when something changes.', on: ['d1'], focus: ['src', 'cmp'], cap: 'dbt reads the **whole** source table, or the part you select.' },
          { say: 'For each customer, dbt compares the source row with the currently open row in the snapshot table.', on: ['d1'], focus: ['src', 'cmp'], cap: 'With the timestamp strategy it compares the update time. With check it compares column values.' },
          { say: 'A customer who did not change causes no write at all.', on: ['d2'], tags: ['tg_run'], focus: ['cmp', 'same'], cap: 'A snapshot of a quiet table is cheap.' },
          { say: 'A customer who changed has the old version closed: dbt sets its valid-to time, so it is no longer current.', on: ['d3'], focus: ['cmp', 'close'], cap: 'The old row is **not** deleted.' },
          { say: 'And a new version is opened, with a valid-from time and an empty valid-to, which means current.', on: ['d4'], focus: ['cmp', 'open'], cap: 'An empty valid-to means "still true".' },
          { say: 'Both rows end up in the snapshot table. The history grows by one row for every change.', on: ['d5'], focus: ['close', 'snap'], cap: 'The table is **append-only history**, apart from closing old rows.' }
        ]
      }),

      B.code({
        id: 'm8-yaml', t: 1, title: 'A snapshot is a few lines of YAML', file: 'snapshots/snap_customers.yml', lang: 'yaml', code: SNAP,
        steps: [
          { say: 'This is the whole snapshot for Brewline\'s customers. The YAML form of snapshots arrived in dbt Core 1.9, and older projects use a Jinja block that does the same. Press Next.', lines: null },
          { say: 'The name is the table dbt will create. The relation says what to watch. Here it is the raw customers source, on purpose: snapshot the source as it is, before staging changes it.', lines: G.span(SNAP, /- name: snap_customers/, /relation:/) },
          { say: 'The schema where the snapshot lives, and the unique key that identifies a customer across versions.', lines: G.span(SNAP, /schema: snapshots/, /unique_key/) },
          { say: 'The strategy is timestamp: dbt compares the updated_at column, and here the load time of the row stands for it. When the source row is newer than what the snapshot has, the customer changed.', lines: G.span(SNAP, /strategy:/, /updated_at/) }
        ],
        note: 'Snapshots live in their own folder and run with `dbt snapshot`, or as part of `dbt build`. Treat the snapshot schema as precious: it is the only copy of the past.'
      }),

      B.widget({ id: 'm8-lab', t: 1, kind: 'snap', title: 'Lab: take two pictures' }),

      B.rows({
        id: 'm8-rows', t: 1, title: 'The real snapshot table',
        steps: [
          {
            say: 'After the first run the snapshot has four rows, one per customer. Every valid-to is empty, so all four are current. The valid-from is the time of the source row.',
            tabs: [{ layer: 'SNAPSHOT', name: 'snap_customers, run 1', c: 'snap', cols: d1.cols, rows: d1.rows, trk: 1 }]
          },
          {
            say: 'On day two Ava became gold and Noah moved to Germany. After the second run there are six rows. The old versions of C-42 and C-77 have a valid-to. The new versions are open.',
            tabs: [{ layer: 'SNAPSHOT', name: 'snap_customers, run 2', c: 'snap', cols: d2.cols, rows: d2.rows, trk: 2, chg: [[1, 4], [2, 3], [3, 4], [4, 3]] }],
            notes: ['The yellow cells are what the second run changed: two valid-to dates were filled in, and two new rows started on 18 March at 06:00.', 'C-12 and C-91 did not change, so dbt left them alone.']
          }
        ]
      }),

      B.cmp({
        id: 'm8-cols', t: 1, title: 'The four columns dbt adds',
        say: 'Besides your own columns, dbt adds four. Press Next for each.',
        cols: ['Column', 'What it holds'],
        hl: 1,
        rows: [
          ['`dbt_scd_id`', 'A hash that identifies this version of the row. It is unique per version.'],
          ['`dbt_updated_at`', 'The value of the update column when dbt saw this version.'],
          ['`dbt_valid_from`', 'When this version started being true.'],
          ['`dbt_valid_to`', 'When it stopped being true. **Empty means current.**']
        ],
        steps: [
          { upto: 2, say: 'The first two are bookkeeping. You rarely use them directly.' },
          { upto: 4, say: 'The last two are the ones you query. A valid range is from, inclusive, to the valid-to, exclusive. An empty valid-to means open.' }
        ],
        pick: 'To get the **current** state of every customer, filter `dbt_valid_to is null`. To get the state **at a time**, use the range, as the next screen shows.'
      }),

      B.rows({
        id: 'm8-asof', t: 1, title: 'The tier at the time of the order',
        steps: [
          {
            say: 'Here is the same question answered two ways. First the wrong way: join the orders to today\'s customers table. Ava (C-42) is gold today, so her March orders look gold, and Noah\'s orders look German.',
            tabs: [{ layer: 'WRONG', name: 'orders joined to the current customers', c: 'raw', cols: wrong.cols, rows: wrong.rows, trk: 0, chg: diffs }],
            notes: ['The yellow cells are wrong. On 14 March Ava was **standard** and Noah lived in the **UK**.']
          },
          {
            say: 'Now the right way: join to the snapshot, and require the order time to fall inside the validity range of the version. Every order gets the tier and the country that were true when it was placed.',
            tabs: [{ layer: 'RIGHT', name: 'orders joined to the snapshot, as of the order', c: 'snap', cols: right.cols, rows: right.rows, trk: 0 }],
            notes: ['The join condition has three parts: the same customer, the order time at or after `dbt_valid_from`, and before `dbt_valid_to` (or the valid-to is empty).']
          }
        ]
      }),

      B.quiz({
        id: 'm8-q1', t: 1,
        q: 'In a snapshot table, what does an **empty** `dbt_valid_to` mean?',
        opts: [
          { t: 'The row is the current version', fb: '' },
          { t: 'The row was deleted in the source', fb: 'A delete is a different case, covered by the hard deletes setting.' },
          { t: 'The snapshot failed for this row', fb: 'A failure stops the run. It does not write empty values.' },
          { t: 'The change has not been confirmed', fb: 'There is no confirmation step.' }
        ],
        ok: 0, why: 'A version is closed by filling its valid-to with the time of the next change. While the version is still true, the valid-to stays empty. Filtering `dbt_valid_to is null` gives the current table.'
      }),

      B.quiz({
        id: 'm8-q2', t: 1,
        q: 'Why can a plain incremental model not replace a snapshot for customer history?',
        opts: [
          { t: 'It sees only the rows the source currently holds, so an overwritten value is already gone when it runs', fb: '' },
          { t: 'Incremental models cannot store more than one row per key', fb: 'You could keep several rows with an append strategy. The point is what the source still shows.' },
          { t: 'Snapshots are faster', fb: 'Speed is not the reason.' },
          { t: 'Incremental models cannot read sources', fb: 'They can.' }
        ],
        ok: 0, why: 'An update in the source overwrites the old value. An incremental model reads the source after the change. A snapshot is the same idea done right: it records the old row **as a version** before the overwrite is lost, and it does it on every run.'
      }),

      B.cmp({
        id: 'm8-strat', t: 2, title: 'Timestamp or check?',
        say: 'dbt has two strategies. Press Next to compare them.',
        cols: ['', '`timestamp`', '`check`'],
        hl: 1,
        rows: [
          ['How it spots a change', 'Compares the update column of the source with the one in the snapshot', 'Compares the values of the columns you list'],
          ['What `dbt_valid_from` holds', 'The update time from the source, so it is the real moment of change. In this project: ' + G.table('snap_day2').rows[2][3], 'The time of the snapshot run. In the check run I made: ' + CHK[2][3]],
          ['Needs', 'A reliable column that changes on **every** update', 'Nothing in the source, only a list of columns to watch'],
          ['Weak spot', 'A source that updates a row without touching the column', 'Too many watched columns create fake versions'],
          ['Prefer it when', 'The source has a trustworthy updated_at', 'It does not, or the update column is unreliable']
        ],
        steps: [
          { upto: 2, say: 'The big difference is time. With timestamp, history uses the moment of the change. With check, it uses the moment you noticed.' },
          { upto: 5, say: 'What each strategy needs and where it hurts. Prefer timestamp when the source supports it.' }
        ],
        pick: 'Use **timestamp** whenever the source has an update column you can trust. Use **check** with a short list of the columns that matter. I ran both on the same data: the real versions are in the table above.'
      }),

      B.bug({
        id: 'm8-bug', t: 2, q: 'The customers loader writes a new load time on **every row, every day**. A teammate configured this snapshot to catch every change. A week later every customer has a new version for every single day. Click the line that causes it.',
        file: 'snapshots/snap_customers.yml', lang: 'yaml', code: CHECKALL, bad: G.at(CHECKALL, /check_cols: all/),
        hint: 'What does "all" include?',
        why: '`check_cols: all` watches **every column**, including `_loaded_at`. The loader stamps a new value daily, so every customer looks changed every day and gets a new version. In my test, one reload of the table took the snapshot from **' + ALLN[1] + '** customers to **' + ALLN[0] + '** rows, and customer C-12 now has ' + ALL12.length + ' versions that differ only in `_loaded_at`. List the columns that matter, here `tier` and `country`.',
        fix: 'snapshots:\n  - name: snap_customers\n    relation: source(\'brewline\', \'customers\')\n    config:\n      schema: snapshots\n      unique_key: customer_id\n      strategy: check\n      check_cols: [tier, country]',
        cheer: 'Watch the columns whose change you care about. Technical columns change for the wrong reasons.'
      }),

      B.code({
        id: 'm8-hard', t: 2, title: 'When a row is deleted in the source', file: 'snapshots/snap_customers.yml', lang: 'yaml', code: HARD,
        steps: [
          { say: 'By default, a row that disappears from the source simply stays open in the snapshot forever, as if the customer still existed. Press Next.', lines: null },
          { say: 'The hard deletes setting tells dbt what to do. With invalidate, dbt closes the open version when the key is no longer in the source.', lines: G.span(HARD, /hard_deletes:/) }
        ],
        note: 'I deleted customer C-91 from the source and ran the snapshot with this setting. The real result is on the next screen. Other choices are to ignore the delete, or to write a new row that marks the delete.'
      }),

      B.rows({
        id: 'm8-harddel', t: 2, title: 'After a delete, with invalidate',
        steps: [
          {
            say: 'C-91 is gone from the source. The snapshot closed its row and left the history in place. C-12 did not change and is still open.',
            tabs: [{ layer: 'SNAPSHOT', name: 'snap_customers after the delete', c: 'snap', cols: DEL.cols, rows: DEL.rows, trk: 1, chg: [[1, 4]] }],
            notes: ['The valid-to of C-91 is filled in with the time of the snapshot run (' + DEL.rows[1][4] + '), because a deleted row has no update time of its own.', 'Reports that ask "who was a customer on 10 March" still work.']
          }
        ]
      }),

      B.decide({
        id: 'm8-dec', t: 2, title: 'Decision: how to keep the history of a customer',
        scenario: 'Finance wants revenue by the customer\'s **tier at the time of each order**. The customers table lives in an operational database that overwrites rows. The company already uses dbt, and there are **30,000** customers, changing about **200 rows a day**.',
        opts: [
          { t: 'Join orders to the current customers table', d: 'No new work.', lose: 'Every old order shows today\'s tier. The report is wrong in a way that nobody can see.' },
          { t: 'A dbt snapshot of the source customers, run at least daily', d: 'History is recorded as versions, and facts join to the right version.' },
          { t: 'Ask the source team to keep a history table', d: 'The cleanest answer, if it exists.', lose: 'It depends on another team, and nothing is recorded until they do it. You also lose all the history from before.' }
        ],
        pick: 1,
        why: 'With 200 changes a day, a daily snapshot misses almost nothing and costs almost nothing. It starts recording now, without waiting for another team. You can still move to a change-data-capture feed later, and replace the snapshot source.',
        when: 'If the source already offers a history or change feed, load that instead, because it captures every change and not just the state at snapshot time. If rows change many times a day, run the snapshot more often.'
      }),

      B.challenge({
        id: 'm8-ch', t: 2,
        q: 'Write a model that returns, for each order of **customers C-42 and C-77**, the **tier and country that were true when the order was placed**. Join `fct_orders` to `snap_customers`, and sort by the order time.',
        data: [{ name: 'snap_customers', cols: d2.cols, rows: d2.rows }],
        lang: 'jinja', file: 'models/scratch/orders_with_customer_version.sql',
        starter: 'select\n    o.order_id,\n    o.ordered_at\n    -- tier and country at that time\nfrom {{ ref(\'fct_orders\') }} as o',
        hints: ['Join on the customer id, and add a condition on time.', 'The order time must be at or after `dbt_valid_from`.', 'And before `dbt_valid_to`. An open row has an empty valid-to, so use `coalesce(dbt_valid_to, timestamp \'9999-12-31\')`.'],
        sol: G.file('scenario/ch_m8_asof.sql'),
        res: G.result('ch_m8_asof'),
        expl: ['Each order matches exactly one version, because the validity ranges of one customer do not overlap.', 'The empty valid-to is replaced by a far future date, so open rows still match.', 'The result agrees with the table on the earlier screen. Orders placed before 18 March show the old tier and country.'],
        cx: 'A range join: fine at this size. On large tables, keep the snapshot narrow and filter facts by date before joining.'
      }),

      B.qa({
        id: 'qa-snap', t: 1, tag: 'Modeling', secs: 60,
        q: 'What is a snapshot in dbt, and when do you use one?',
        pts: ['It records how a mutable source row changes over time', 'It keeps one row per version with valid-from and valid-to columns', 'It is a type 2 slowly changing dimension', 'Use it when the source overwrites rows and you need history', 'Strategies: timestamp when there is an update column, check otherwise', 'It only sees the source when it runs, so schedule it often enough'],
        short: 'A snapshot records how a row in a mutable table changes over time. Many source tables keep only the current state, so when a customer changes tier, the old value is gone. A snapshot fixes that. Each time it runs, dbt compares the source with the snapshot table. For a row that changed, it closes the old version by filling in dbt_valid_to, and inserts a new version with an empty valid-to. That is a type 2 slowly changing dimension.\n\nI use it when the source overwrites rows and the business asks "what was true at that time". For example, revenue by the customer tier at the time of the order, which needs a join on the validity range. I use the timestamp strategy when the source has a reliable update column, and the check strategy with a short column list when it does not.\n\nThe limit is that it only sees the source when it runs. If a row changes twice between runs, the first change is lost, so I schedule the snapshot as often as the data changes.',
        fu: [
          ['What do you snapshot: the source or a model?', 'The source, as it is, before staging cleans it. A snapshot of a transformed model could hide or alter changes.'],
          ['What happens when a row is deleted?', 'By default the open version stays open. The hard deletes setting can invalidate it, ignore it, or add a marker row.']
        ],
        trap: 'Confusing a snapshot with a backup. It is a history of changes of one table, with validity ranges, not a copy for recovery.',
        real: 'Describe a table you snapshotted, how often it ran, and a question the history answered.'
      }),

      B.qa({
        id: 'qa-asof', t: 2, tag: 'Modeling', secs: 75,
        q: 'How do you join a fact table to the right version of a dimension?',
        pts: ['Keep dimension history with valid-from and valid-to, for example with a dbt snapshot', 'Join on the key and require the event time to fall in the validity range', 'Use a far future date for open rows', 'Make sure the validity ranges of one key do not overlap', 'Check that every fact finds exactly one version', 'Start the history early, because it cannot be rebuilt'],
        short: 'I keep the dimension as a type 2 table, for example with a dbt snapshot, so each version has a dbt_valid_from and a dbt_valid_to. Then I join the fact to it on the key plus a time condition: the event time must be at or after valid-from and before valid-to. Current rows have an empty valid-to, so I coalesce it to a far future date.\n\nThe join must return exactly one version for every fact. Version ranges for one key must not overlap, which the snapshot guarantees, and I test it: a count of facts before and after the join should match, and a left join should show no facts without a version. Facts older than the first snapshot have no version, so I decide the rule: use the earliest version, or mark them unknown.\n\nThe weakness is that history cannot be rebuilt. If the snapshot started last month, older facts cannot be placed in time. So I start the snapshot early, even before I need the question answered.',
        fu: [
          ['What if the snapshot started after the first facts?', 'Those facts have no matching version. I assign them the earliest version or label them unknown, and I say so on the report.'],
          ['How do you test the join?', 'Compare the fact count before and after, and check for facts with no matching version. Both should be zero differences.']
        ],
        trap: 'Joining on the key alone. The result then multiplies the facts by the number of versions.',
        real: 'Describe the question your as-of join answered, and how many versions the busiest key had.'
      }),

      B.recap({
        id: 'm8-recap', n: 8, badge: 'History Keeper', color: '#FBCFE8',
        pts: [
          'Sources **overwrite**. A **snapshot** keeps every version, with valid-from and valid-to.',
          'An empty `dbt_valid_to` means the **current** version.',
          '**Timestamp** uses the real change time. **Check** uses the time of the run. Prefer timestamp.',
          'Join facts to dimension history with a **time range**, never on the key alone.',
          'A snapshot only sees the source **when it runs**. Start early, run often, snapshot the raw source.'
        ],
        lines: [
          'I snapshot the source, not a transformed model.',
          'History cannot be rebuilt, so I start the snapshot before I need it.',
          'Today\'s attribute on yesterday\'s fact is a wrong number.'
        ]
      })
    ]
  });
})();
