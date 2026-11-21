/* Mission 4: connectors the Airbyte way, sync modes, Fivetran from documentation, and how the bill is counted.
   protocol.py and sync_modes.py ran for real with the Faker connector of Airbyte. Fivetran did not run: it is a service with an account. */
(function () {
  var B = LAB.b, G = LAB.get;
  var C = G.counts, X = G.text, n = G.n, M = function (k) { return G.meta(k); };
  var PR = C('protocol'), SY = G.table('sync.cases').rows, SYC = C('sync'), PRF = G.file('protocol.py'), SMF = G.file('sync_modes.py'), CH = G.table('challenge.days').rows;
  var USERS = PR.streams.filter(function (s) { return s[0] === 'users'; })[0];
  G.expect(PR.check_ok === 'SUCCEEDED' && /^FAILED, Config validation error: -5 is less than the minimum of 1$/.test(PR.check_bad) && PR.streams.length === 3 && USERS[1] === 17 && USERS[2] === 'full_refresh and incremental' && USERS[3] === 'updated_at' && USERS[4] === 'id', 'the connector checks a config, and lists three streams with two sync modes, a cursor and a key');
  G.expect(PR.full[0] === 20 && PR.full[1] === 2 && PR.inc[0] === 20 && PR.inc[1] === 2 && PR.again === 0 && /"loop_offset": 20/.test(PR.state) && PR.record_keys === 'stream, data, emitted_at', 'a read gives 20 RECORD and 2 STATE messages, and a read with the saved state gives 0 records');
  G.expect(SY[0][2] === '20, 20' && SY[1][2] === '20, 40' && SY[2][2] === '20, 20' && SY[3][1] === '20, 20' && SY[3][2] === '20, 40' && SY[4][1] === '20, 0' && SY[4][2] === '20, 20' && SYC.added.join() === '_airbyte_raw_id,_airbyte_extracted_at,_airbyte_meta' && SYC.source_columns === 17, 'full refresh with append doubles the table, a cursor that always moves reads everything again, and a true cursor reads 0');
  var WROTE = CH.reduce(function (a, r) { return a + r[1]; }, 0), MAR = CH[CH.length - 1][3];
  G.expect(WROTE === 127 && MAR === 117, 'the four loads wrote 127 rows, for 117 distinct orders');

  LAB.addChapter({
    id: 'm4', n: 4, title: 'Airbyte and Fivetran', short: 'Connectors', blurb: 'What a connector prints, sync modes, Fivetran from its documentation, and how the bill is counted', minutes: 26,
    focus: ['mart'],
    goals: [
      'Say what a **connector** is in Airbyte, and read **RECORD** and **STATE** messages.',
      'Choose a **sync mode**, and say what **incremental** saves only when the cursor is honest.',
      'Say what **Fivetran** adds to your tables, from its documentation.',
      'Explain how **usage-based pricing** is counted, and what changes the bill.'
    ],
    say: 'Airbyte and Fivetran sell the same job in two ways. Airbyte is a protocol that I could run myself, so I ran its Faker connector and wrote down every message. Fivetran is a service: I explain it from its documentation, and I say so on every screen.',
    scenes: [
      B.flow({
        id: 'm4-flow', t: 1, src: 'rec', title: 'A connector is a program that prints messages', g: 'protocol', legend: true,
        steps: [
          { say: 'In Airbyte a connector is a small program. The platform calls it and reads what it prints. Press Next.', focus: ['srcs', 'con', 'plat', 'dst', 'sta'], cap: 'A program and a platform.' },
          { say: 'Step 1. The platform calls the connector with one of four commands: **spec**, **check**, **discover** or **read**. The connector talks to the source.', on: ['e1'], focus: ['srcs', 'con'], tags: ['tg_cmds'], cap: 'Four commands.' },
          { say: 'Step 2. The connector prints **one JSON message for each line**. A **RECORD** is a row, and a **STATE** is a bookmark. In my run a read of 20 users printed **' + PR.full[0] + '** RECORD and **' + PR.full[1] + '** STATE messages.', on: ['e2'], focus: ['con', 'plat'], tags: ['tg_msgs'], cap: 'RECORD and STATE.' },
          { say: 'Step 3. The platform **writes the rows** to the destination. PyAirbyte played this part in my run, with a local cache.', on: ['e3'], focus: ['plat', 'dst'], cap: 'The rows are written.' },
          { say: 'Step 4. The platform **saves the last STATE** and gives it back at the next read. With the saved state a second read gave **' + PR.again + '** records.', on: ['e4'], focus: ['plat', 'sta'], tags: ['tg_back'], cap: 'The state comes back.' }
        ]
      }),

      B.code({
        id: 'm4-code', t: 1, src: 'rec', title: 'protocol.py: calling a connector by hand', file: 'protocol.py', lang: 'python', code: PRF,
        steps: [
          { say: 'This program does what the Airbyte platform does: it runs the connector and reads its messages. Press Next.', lines: null },
          { say: 'The connector is a **program on disk**. `call` runs it with a command and keeps the messages that matter. `LOG` and `TRACE` messages are left out.', lines: G.span(PRF, /^def call\(/, /return \[m for m/) },
          { say: '**spec** asks what settings it takes. **check** asks whether a config works, and the connector answers `SUCCEEDED` or `FAILED` with a message.', lines: G.span(PRF, /spec = of\(call\('spec'\)/, /print\('check, count -5/) },
          { say: '**discover** returns the **catalog**: the streams, their fields, the **sync modes** that each one supports, its cursor and its primary key.', lines: G.span(PRF, /^catalog = of/, /print\('discover:/) },
          { say: '**read** takes the config and a **configured catalog**: which streams, and which sync mode. A second read passes the **state** that the first one printed.', lines: G.span(PRF, /^full = call\('read'/, /print\('read again with that state/) }
        ]
      }),

      B.term({
        id: 'm4-out', t: 1, src: 'rec', title: 'What protocol.py printed',
        say: 'The output, command by command. Read the last two lines twice.',
        lines: function () { return G.plain(X('protocol.run')); },
        after: 'The connector asked for **' + PR.spec.split(', ').length + '** settings. **check** said `' + PR.check_ok + '` for a good config, and for `count` of -5 it said `' + PR.check_bad + '`. **discover** listed **' + PR.streams.length + '** streams, and each supports **full_refresh and incremental**, with the cursor `' + USERS[3] + '` and the key `' + USERS[4] + '`. A read of the users gave **' + PR.full[0] + '** RECORD messages and **' + PR.full[1] + '** STATE messages, because the config said to save a bookmark after every 10 records. Read again **with the last state**, it gave **' + PR.again + '** records.',
        afterKind: 'tip',
        doneSay: 'The protocol is plain.'
      }),

      B.code({
        id: 'm4-codesync', t: 1, src: 'rec', title: 'sync_modes.py: the same users, synced twice', file: 'sync_modes.py', lang: 'python', code: SMF,
        steps: [
          { say: 'PyAirbyte plays the platform and writes into a local cache. Press Next.', lines: null },
          { say: 'Five cases: a **write strategy** (`replace`, `append` or `merge`), whether to **force a full refresh**, and whether the source\'s cursor **always moves**.', lines: G.span(SMF, /^CASES = \[/, /tells the truth/) },
          { say: 'For each case the program makes a **source** and a **cache**, and syncs **twice**.', lines: G.span(SMF, /for k, \(label, strategy, full, moves\)/, /cache = ab\.new_local_cache/) },
          { say: 'It writes down **how many records each sync read** and **how many rows the cache holds** after each one.', lines: G.span(SMF, /read, rows = \[\], \[\]/, /rows\.append/) },
          { say: 'And it lists the **columns that PyAirbyte adds** to the table, next to the columns that come from the source.', lines: G.span(SMF, /^engine = cache/, /come from the source/) }
        ]
      }),

      B.widget({ id: 'm4-lab', kind: 'synclab', t: 1, src: 'rec', title: 'Lab: five sync modes, synced twice' }),

      B.term({
        id: 'm4-sync', t: 1, src: 'rec', title: 'What sync_modes.py printed',
        say: 'The same table as the lab, and the columns that the platform adds.',
        lines: function () { return G.plain(X('sync.run')); },
        after: 'Every table got **' + SYC.added.length + '** columns of the platform (`' + SYC.added.join('`, `') + '`) next to the **' + SYC.source_columns + '** columns of the source. **Append** with a full refresh left **' + SY[1][2].split(', ')[1] + '** rows for **' + SY[1][3] + '** users. An incremental sync read **' + SY[3][1].split(', ')[1] + '** records again when the source set `updated_at` to the time of the sync, and **' + SY[4][1].split(', ')[1] + '** when the cursor told the truth.',
        afterKind: 'warn',
        doneSay: 'A cursor has to be honest.'
      }),

      B.cmp({
        id: 'm4-fivetran', t: 1, src: 'docs', title: 'Fivetran: what it adds to your tables, from its documentation',
        say: 'Fivetran is a service with an account, so none of this ran here. Press Next to read what its documentation says.',
        cols: ['What', 'What the documentation says', 'What you check in your account'],
        hl: 1,
        rows: [
          ['`_fivetran_synced`', 'A UTC timestamp of when Fivetran last synced the row', 'That your freshness checks read it'],
          ['`_fivetran_deleted`', 'In soft delete mode (the default) a row that was deleted at the source stays, with this column TRUE', 'That your connector reports deletes at all: not every one does'],
          ['Hard deletes', 'Fivetran suggests a transformation after the load that deletes the rows with `_fivetran_deleted` TRUE', 'That your models filter the flag, or delete the rows'],
          ['Schema changes', 'The connector adapts the destination to most changes at the source', 'The log and the notifications of the connection'],
          ['A re-sync', 'The system columns can show the wrong deleted status until the re-sync ends', 'Do not trust the flags in the middle of a re-sync']
        ],
        steps: [
          { upto: 2, say: 'The two **system columns** are how Fivetran tells you about time and deletes. In the recording of dlt, order 11 stayed with **no flag at all**, so a flag is a real feature.' },
          { upto: 5, say: 'Fivetran **handles** the schema changes and the deletes that the source reports. You still own the models, so check what the flags mean for each connector. This table comes from the documentation as search summaries showed it, and I did not use an account.' }
        ]
      }),

      B.cmp({
        id: 'm4-compare', t: 1, src: 'docs', title: 'Fivetran, Airbyte, dlt and custom code side by side',
        say: 'Four ways to the same table. Press Next to read how they differ.',
        cols: ['', 'Fivetran', 'Airbyte', 'dlt', 'Custom code'],
        hl: 0,
        rows: [
          ['Who runs it', 'The vendor', 'The vendor (Cloud), or you (self-managed)', 'You: it is a Python library', 'You'],
          ['The connectors', 'A catalog that the vendor maintains', 'A catalog with a protocol, and a kit to write your own', 'Sources that you write in Python, and ready ones', 'All yours'],
          ['How the bill is counted', 'By usage, per connection', 'Cloud: credits or capacity. Self-managed: your servers', 'Your compute only', 'Your compute and your hours'],
          ['Control', 'Low: you configure it', 'Medium to high', 'High: it is code in Git', 'Full'],
          ['A good fit', 'Standard sources, a small team', 'Many sources, a wish for open source, or a hybrid', 'An odd source, a Python team', 'One source that nothing else covers']
        ],
        steps: [
          { upto: 2, say: 'The first two rows are about **who owns the work**. A service owns the connectors, and you own the bill. With a library you own both.' },
          { upto: 5, say: 'The last rows are about **cost and control**. None of this was benchmarked: I ran dlt and an Airbyte connector, and read the rest.' }
        ]
      }),

      B.cmp({
        id: 'm4-pricing', t: 2, src: 'docs', title: 'How the bill is counted: Fivetran and Airbyte Cloud',
        say: 'Prices change, so this screen is about the model and not the numbers. Press Next.',
        cols: ['', 'What is counted', 'What it means for design'],
        hl: 1,
        rows: [
          ['Fivetran: monthly active rows', 'The distinct primary keys that were added, updated or deleted in a calendar month, synced to the destination. It resets each month', 'A row that changes a hundred times in a month counts once. A big table that never changes costs little'],
          ['Fivetran: deletes', 'From 1 January 2026, deletes count for pay-as-you-go accounts, and for annual contracts at renewal', 'A purge of old rows is billed like a change'],
          ['Fivetran: per connection', 'Each connection is counted on its own, and there is a minimum charge for a connection on monthly pay-as-you-go from 1 January 2026', 'Many small connections cost more than one big one'],
          ['Airbyte Cloud', 'Credits for the volume that you move on the Standard and Plus plans, and capacity (a number of Data Workers) on Pro and Enterprise Flex', 'Volume drives a credit plan, and the number of parallel syncs drives a capacity plan'],
          ['Airbyte self-managed, dlt', 'Your servers and your hours. The software of Airbyte Core has no fee', 'A fixed cost that you pay in work']
        ],
        steps: [
          { upto: 3, say: 'The Fivetran rows come from its pricing pages as search summaries showed them in November 2026. Always read the current page: the rules changed in 2025 and 2026.' },
          { upto: 5, say: 'Sources disagreed on the **prices** of Airbyte Cloud, so I show none. The structure, credits for volume and capacity for parallelism, is what to know.' }
        ]
      }),

      B.cmp({
        id: 'm4-mar', t: 2, src: 'docs', title: 'Counting active rows on the recording: 127 rows written, 117 keys',
        say: 'I did not use Fivetran, so this is computed from the definition, on the recorded loads of the coding round. Press Next.',
        cols: ['Day', 'Rows that the load wrote', 'New keys this month', 'Keys counted so far'],
        hl: 3,
        rows: [
          ['Day 1', String(CH[0][1]), String(CH[0][1]), String(CH[0][1])],
          ['Day 2', String(CH[1][1]), String(CH[1][3] - CH[0][3]), String(CH[1][3])],
          ['Day 3', String(CH[2][1]), String(CH[2][3] - CH[1][3]), String(CH[2][3])],
          ['Day 3 again', String(CH[3][1]), '0', String(CH[3][3])]
        ],
        steps: [
          { upto: 2, say: 'The loads wrote **' + WROTE + '** rows in all, and the destination holds **' + MAR + '** distinct orders. Ten of the 20 rows of day 2 were orders that had **already been counted** on day 1.' },
          { upto: 4, say: 'By the definition, **active rows** count distinct keys in a month, so a row that changes ten times counts once. Here that is **' + MAR + '**, not **' + WROTE + '**. This is an illustration of the rule, and not an invoice.' }
        ]
      }),

      B.bug({
        id: 'm4-bug', t: 1, q: 'A nightly sync keeps a full history by appending the whole users table every night. After a week the destination has seven times the rows. Click the line that appends the whole table.',
        file: 'nightly.py', lang: 'python',
        code: 'result = source.read(cache=cache, write_strategy=\'append\', force_full_refresh=True)\nprint(result.processed_records)\n',
        bad: [1],
        hint: 'What does an append of a full refresh add on every run?',
        why: 'A **full refresh** reads every row, and **append** adds them all again: in the recording the second sync left **' + SY[1][2].split(', ')[1] + '** rows for **' + SY[1][3] + '** users. For the current state of a table use **replace** or **merge**. For history keep a deliberate table, with a timestamp of the sync, and read the latest row from it.',
        fix: 'result = source.read(cache=cache, write_strategy=\'merge\', force_full_refresh=True)\nprint(result.processed_records)\n',
        cheer: 'Append is for history.'
      }),

      B.bug({
        id: 'm4-bug2', t: 2, q: 'A script runs the Airbyte connector by hand every night and saves the last STATE message to a file. Every night it still reads all the records. Click the line that forgets the bookmark.',
        file: 'nightly.py', lang: 'python',
        code: 'state_file = save(\'state.json\', [last_state])\nagain = call(\'read\', \'--config\', config, \'--catalog\', configured(\'incremental\', \'append\'))\nprint(len(of(again, \'RECORD\')))\n',
        bad: [2],
        hint: 'The state is saved on line 1. Where is it given back to the connector?',
        why: 'The connector only knows what it is **told**: without `--state` it starts from the beginning, so every night it reads everything. In the recording the read with the saved state gave **' + PR.again + '** records and the read without it gave **' + PR.inc[0] + '**. The platform does this for you, and a hand-made runner has to do it too.',
        fix: 'state_file = save(\'state.json\', [last_state])\nagain = call(\'read\', \'--config\', config, \'--catalog\', configured(\'incremental\', \'append\'), \'--state\', state_file)\nprint(len(of(again, \'RECORD\')))\n',
        cheer: 'Give the bookmark back.'
      }),

      B.quiz({
        id: 'm4-q1', t: 1,
        q: 'What does an Airbyte connector print when it reads a source?',
        opts: [
          { t: 'One JSON message for each line: RECORD for a row, STATE for a bookmark, and logs', fb: '' },
          { t: 'A CSV file of the rows', fb: 'The messages are JSON, one for each line.' },
          { t: 'Nothing: it writes straight into the warehouse', fb: 'The platform writes the rows. The connector only reads.' },
          { t: 'SQL statements', fb: 'It prints messages, not SQL.' }
        ],
        ok: 0, why: 'In the recording a read of 20 users printed **' + PR.full[0] + '** RECORD messages and **' + PR.full[1] + '** STATE messages. A record has the keys `' + PR.record_keys + '`.'
      }),

      B.quiz({
        id: 'm4-q2', t: 1,
        q: 'A connector says `FAILED` on `check` with "-5 is less than the minimum of 1". What does that tell you?',
        opts: [
          { t: 'The configuration is wrong, and the connector validated it before reading anything', fb: '' },
          { t: 'The source is down', fb: 'It did not even reach the source.' },
          { t: 'The destination is full', fb: 'The destination is not involved in a check.' },
          { t: 'The connector is broken', fb: 'It gave a clear message about the setting.' }
        ],
        ok: 0, why: 'The recording: `' + PR.check_bad + '`. **check** exists so that a wrong setting is found before a night is lost.'
      }),

      B.quiz({
        id: 'm4-q3', t: 1,
        q: 'An incremental sync read 20 records the first time and 20 again the second time, and the table grew from 20 to 40. What is the most likely cause?',
        opts: [
          { t: 'The cursor moves on every sync, so every row looks new', fb: '' },
          { t: 'The destination duplicates rows', fb: 'The destination wrote what it received.' },
          { t: 'The state was saved too early', fb: 'The state does not change what a moving cursor reads.' },
          { t: 'Incremental syncs always read everything', fb: 'With an honest cursor the second sync read 0.' }
        ],
        ok: 0, why: 'In the recording the Faker connector sets `updated_at` to the time of the sync when `always_updated` is on: **' + SY[3][1] + '** records read and **' + SY[3][2] + '** rows. With an honest cursor: **' + SY[4][1] + '**.'
      }),

      B.quiz({
        id: 'm4-q4', t: 2, src: 'docs',
        q: 'Under Fivetran\'s model of monthly active rows, a row is updated 30 times in one month. How many active rows is that?',
        opts: [
          { t: 'One: a row is counted once for a month, by its primary key', fb: '' },
          { t: 'Thirty: once for every update', fb: 'It counts distinct keys, not changes.' },
          { t: 'Zero: updates are free', fb: 'An update makes the row active.' },
          { t: 'It depends on the size of the row', fb: 'The size of a row does not matter in this model.' }
        ],
        ok: 0, why: 'By the definition on Fivetran\'s pages, active rows are **distinct primary keys** that were added, updated or deleted in a calendar month. On the recorded loads that is **' + MAR + '** for **' + WROTE + '** rows written. This is from documentation, and I did not use an account.'
      }),

      B.quiz({
        id: 'm4-q5', t: 2, src: 'docs',
        q: 'A company wants to use Airbyte Core inside its own data platform for its own data. By the license FAQ of Airbyte, what is the main limit?',
        opts: [
          { t: 'The Elastic License 2.0 allows the use, and does not allow offering the software to others as a managed service', fb: '' },
          { t: 'It cannot be used for commercial work at all', fb: 'The FAQ says that commercial use is allowed.' },
          { t: 'It must be released as open source again', fb: 'That is a copyleft rule, and ELv2 does not work that way.' },
          { t: 'There is no license, so there is no limit', fb: 'There is a license.' }
        ],
        ok: 0, why: 'The search summaries of the FAQ say that **Airbyte Core** is under **ELv2**, and the **protocol** and the **CDK** are MIT. The pages disagreed about the license of the **connectors**, and said to read the metadata file of each one. This is from documentation, and legal advice is not something this course gives.'
      }),

      B.order({
        id: 'm4-ord', t: 1, src: 'rec', q: 'Put the calls of the Airbyte protocol in the order that a platform uses them for a new connection.',
        items: ['spec: ask what settings the connector takes', 'check: test the configuration', 'discover: get the catalog of streams and sync modes', 'read: pull the records, with the chosen sync mode', 'save the last STATE, and pass it to the next read'],
        why: 'The order of `protocol.py`: **spec**, **check**, **discover**, **read**, and then the state goes back in at the next read. A wrong setting is found by `check`, long before a night is lost.'
      }),

      B.decide({
        id: 'm4-dec', t: 2, src: 'docs', title: 'Decision: how to sync a large table that changes a little every day',
        scenario: 'The `purchases` stream has 40 million rows, and about 1% of them change every day. The source has an honest `updated_at` and a primary key. The warehouse needs the current state of each purchase, and analysts want to know when each row last changed.',
        opts: [
          { t: 'Incremental sync, with a merge (a deduped destination) on the key, and a lookback for late changes', d: 'Each night reads and writes only the changed rows, and the table holds the current state of each purchase.', lose: 'A cursor that must stay honest, and deletes that need their own answer.' },
          { t: 'A full refresh with replace every night', d: 'Always right, and simple.', lose: 'Reading and writing 40 million rows every night for 400 thousand changes, on a bill that counts volume or time.' },
          { t: 'A full refresh with append every night, to keep history', d: 'A history of every night.', lose: 'The table grows by 40 million rows every night: the recording doubled 20 rows in one more sync.' }
        ],
        pick: 0,
        why: 'The recording shows the trade: an honest cursor read **' + SY[4][1].split(', ')[1] + '** records on the second sync, and a full refresh with append doubled the table (**' + SY[1][2] + '**). **Incremental with a merge** reads only what changes and keeps one row for each key. The options are from documentation, and a table of this size was not run.',
        when: 'If the source cursor is not honest, or the table is small, a full refresh with replace is much simpler and as correct.'
      }),

      B.incident({
        id: 'm4-inc', t: 2, src: 'rec', title: 'Incident: the users table doubled overnight', time: '06:40',
        alert: '**The users table has 40 rows, and the source has 20.** On Friday somebody changed the sync mode of the connection from "full refresh, replace" to "full refresh, append" to keep a history. The counts of the dashboards doubled on Saturday.',
        clues: ['Exactly twice the source', 'A setting changed on Friday', 'The new mode appends the whole table on every sync'],
        opts: [
          { t: 'Go back to replace (or merge) for the table, remove the duplicate rows, and build a history table on purpose if it is needed', fb: '' },
          { t: 'Leave it, and divide the dashboards by two', fb: 'It breaks the next sync.' },
          { t: 'Stop the connection for a week', fb: 'The data goes stale and nothing is fixed.' },
          { t: 'Add more rows to the source', fb: 'It makes it worse.' }
        ],
        best: 0,
        why: 'The recording shows the setting and its effect: full refresh with **append** left **' + SY[1][2] + '** rows for **' + SY[1][3] + '** users, and **replace** left **' + SY[0][2] + '**. A history belongs in a table that is made for it, with the time of each sync.',
        checks: [
          ['Compare with the source', '40 against 20.'],
          ['Read the history of the settings', 'A change on Friday.'],
          ['Read the sync mode', 'Full refresh with append.'],
          ['Fix and prevent', 'Replace or merge, de-duplicate, and review changes of the mode.']
        ],
        tell: 'Someone switched the sync mode to append to keep a history, and a full refresh with append adds the whole table every night, so the table doubled. I set the mode back to replace, removed the duplicate rows, and I will build a history table on purpose if one is needed. I also asked that a change of a sync mode is reviewed.',
        prevent: ['**Review** changes of a sync mode', 'Alert when **rows exceed distinct keys**', 'Keep **history** in a table made for it']
      }),

      B.qa({
        id: 'qa-airbyte', t: 1, tag: 'Ingestion', secs: 60,
        q: 'How does Airbyte work, and what is a sync mode?',
        pts: ['A connector is a program', 'spec, check, discover, read', 'RECORD and STATE messages', 'Sync mode and write mode'],
        short: 'An Airbyte **connector** is a program that the platform calls with **spec, check, discover** or **read**, and that prints **one JSON message for each line**: a **RECORD** for a row and a **STATE** for a bookmark. The platform writes the rows to the destination and saves the last state, and gives it back at the next read. I ran the Faker connector for real: a read of 20 users gave **' + PR.full[0] + '** records and **' + PR.full[1] + '** states, and a read with the saved state gave **' + PR.again + '**. A **sync mode** has two halves: how to **read** (full refresh or incremental) and how to **write** (overwrite, append, or deduped). I choose by the cursor and by whether the table changes.',
        fu: [['What if the cursor lies?', 'In my run a cursor that always moved made the second sync read 20 records again.'], ['Can you write a connector?', 'Yes, with the connector kit of Airbyte, or in dlt as a Python function.']],
        trap: 'Saying that incremental always reads less.',
        real: 'Describe a connection that you set up.'
      }),

      B.qa({
        id: 'qa-fivetran', t: 2, tag: 'Ingestion', secs: 60,
        q: 'How is Fivetran priced, and how would you keep the cost under control?',
        pts: ['Monthly active rows', 'Distinct keys per month', 'Per connection', 'Design for few changed rows'],
        short: 'By its documentation Fivetran charges by **monthly active rows**: the **distinct primary keys** that were added, updated or deleted in a calendar month, counted for each connection. A row that changes a hundred times counts once, and a big table that never changes costs little. From 2026, deletes count and there is a minimum for each connection on monthly plans. So I **avoid churn I do not need** (a nightly purge, a column that updates every row), I **exclude tables and columns** nobody uses, I **watch the usage by connection**, and I compare with an open-source tool when one table dominates. I computed the idea on recorded loads: **' + WROTE + '** rows written for **' + MAR + '** keys. I did not use an account, and the rules change, so I check the current page.',
        fu: [['Does a full re-sync cost more?', 'By the definition only changed rows count. Check the current rules and the history of your invoices.'], ['Is usage pricing always dearer than open source?', 'Not once you count the engineers who run the open-source one.']],
        trap: 'Quoting a price that has changed.',
        real: 'Describe how you reduced an ingestion bill.'
      }),

      B.qa({
        id: 'qa-tools', t: 1, tag: 'Ingestion', secs: 60,
        q: 'Fivetran, Airbyte or dlt: how do you choose?',
        pts: ['Standard sources: managed', 'Odd sources or control: open source', 'Count the cost of owning', 'A hybrid is normal'],
        short: 'I ask **who should own the connector and the bill**. For **standard sources** and a small team I lean to a **managed service** such as Fivetran: it owns the connectors, the schema changes and the deletes that the source reports. For **many sources** or a wish for open source, **Airbyte** gives a catalog and a protocol, as a service or self-managed. For an **odd source**, or a team that likes code in Git, **dlt** loaded my pretend API with a cursor, a merge and contracts in a few lines. **Custom code** is the last choice. A **hybrid** is normal: buy the commodity connectors and write the few that nobody sells. I compare cost with the **time of the engineers included**. This is judgement from documentation and two small runs, and I did not benchmark the tools.',
        fu: [['Lock-in?', 'Managed services keep the connectors. Keep models in dbt and the raw tables in your warehouse, so a switch is a re-point.'], ['Where does Kafka Connect fit?', 'For database change capture into Kafka, in the Kafka course.']],
        trap: 'Choosing the cheapest sticker price.',
        real: 'Describe a tool choice that you made, and what you would change.'
      }),

      B.recap({
        id: 'm4-recap', n: 4, badge: 'Connector Picker', color: '#D946EF',
        pts: [
          'An Airbyte **connector** is a program: **spec, check, discover, read**, and one JSON message for each line, **RECORD** and **STATE**.',
          'A read with the saved **state** gave **' + PR.again + '** records. **Append** with a full refresh doubled the table to **' + SY[1][2].split(', ')[1] + '**.',
          'An **incremental** sync saves work only when the **cursor tells the truth**: a moving cursor read **' + SY[3][1].split(', ')[1] + '** records again.',
          'Fivetran (from its documentation) adds **`_fivetran_synced`** and **`_fivetran_deleted`**, and counts **monthly active rows**: distinct keys, not changes.',
          'Choose by **who owns the connector and the bill**. A **hybrid** is normal.'
        ],
        lines: [
          'I can read a connector\'s messages.',
          'I check that a cursor is honest.',
          'I know what drives the bill.'
        ]
      })
    ]
  });
})();
