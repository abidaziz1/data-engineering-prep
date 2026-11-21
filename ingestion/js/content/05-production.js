/* Mission 5: running ingestion for real: state, backfills, monitoring, limits of real APIs and change capture. state.py ran for real with dlt on DuckDB. */
(function () {
  var B = LAB.b, G = LAB.get;
  var C = G.counts, X = G.text, n = G.n;
  var ST = C('state'), STF = G.file('state.py'), T = G.table('strategies.cases').rows, BD = G.table('boundary.cases').rows;
  G.expect(ST.fresh_wrote === 0 && ST.remembered === 10 && ST.loads === 2 && ST.last_value === '2026-03-02T09:30:00+00:00', 'a new working folder on the same destination wrote 0 rows, and the cursor and its boundary rows are kept');
  G.expect(ST.window.append[0].join() === '20,20' && ST.window.append[1] === 140 && ST.window.append[2] === 110 && ST.window.merge[1] === 110 && ST.window.merge[2] === 110, 'a window of day 2 loaded twice gives 140 rows with append and 110 with merge');

  LAB.addChapter({
    id: 'm5', n: 5, title: 'Running it in production', short: 'Production', blurb: 'State, backfills, monitoring, the limits of real APIs, and change capture', minutes: 22,
    focus: ['mon'],
    goals: [
      'Say where a loader keeps its **state**, and what happens when it is lost.',
      'Run a **backfill** that is safe to repeat.',
      'Name the **checks** that keep an ingestion calm: freshness, volume, schema, duplicates.',
      'Say what a **real API** adds: limits, retries, pages and secrets.'
    ],
    say: 'A load that works once is a demo. In production it is run again, stopped halfway, pointed at old data, and left alone for a year. I looked at where dlt keeps its state, and at what a window of old data does to a table.',
    scenes: [
      B.code({
        id: 'm5-code', t: 1, src: 'rec', title: 'state.py: the cursor, and a window of old data', file: 'state.py', lang: 'python', code: STF,
        steps: [
          { say: 'This program looks at the state, and then loads a window of old data. Press Next.', lines: null },
          { say: 'After days 1 and 2 it reads the **cursor** out of the pipeline state: the last value, and the rows at the cursor that dlt remembers.', lines: G.span(STF, /^cursor = p\.state/, /unique_hashes/) },
          { say: 'It counts the **loads** that the destination recorded, and then makes a **new pipeline in another working folder**, on the same destination, and loads day 2 again.', lines: G.span(STF, /^print\('loads recorded/, /day 2 again: wrote/) },
          { say: 'A **backfill**: a window of day 2, between two dates (`initial_value` and `end_value`), loaded **twice**, once with append and once with merge.', lines: G.span(STF, /^for strategy in \('append', 'merge'\)/, /wrote\.append\(sp\.run\(q, window\)\)/) }
        ]
      }),

      B.term({
        id: 'm5-out', t: 1, src: 'rec', title: 'What state.py printed',
        say: 'The cursor, the fresh folder, and the two windows. Read the last two lines twice.',
        lines: function () { return G.plain(X('state.run')); },
        after: 'The cursor after day 2 was **`' + ST.last_value + '`**, and dlt also remembered the **' + ST.remembered + '** rows at that value. The destination recorded **' + ST.loads + '** loads. A **new working folder** on the same destination wrote **' + ST.fresh_wrote + '** rows: **the state is kept in the destination too**, so a job that runs in a container with no disk still continues. A **window of old data** loaded twice gave **' + ST.window.append[1] + '** rows with append and **' + ST.window.merge[1] + '** with merge, for **' + ST.window.merge[2] + '** orders.',
        afterKind: 'tip',
        doneSay: 'State and merge make a backfill safe.'
      }),

      B.cmp({
        id: 'm5-monitor', t: 1, src: 'docs', title: 'What to watch on an ingestion',
        say: 'Six checks that keep an ingestion calm. Press Next to read what each one catches.',
        cols: ['Check', 'It catches', 'Seen in this course'],
        hl: 0,
        rows: [
          ['Freshness', 'A sync that stopped, or is late', 'The load id and time of `_dlt_loads`'],
          ['Volume against the source', 'A page that was skipped, a filter that is wrong', '50 rows against 100'],
          ['Rows against distinct keys', 'A repeat that appended', '200 rows for 100 orders'],
          ['Schema changes', 'A new column, a variant column, a failed contract', 'Day 3 under evolve and freeze'],
          ['Nulls in key columns', 'A value that moved to a variant column', '`total_cents` of order 117'],
          ['Usage and cost', 'A connection that suddenly changes many rows', 'Active rows of the recorded loads']
        ],
        steps: [
          { upto: 3, say: 'The first three need no tool at all: a timestamp, a count of the source, and **rows against distinct keys**. Each one caught a bug of this course.' },
          { upto: 6, say: 'Schema, nulls and usage need a test or a report. Alert on a **change**, and not on every day: an alert that fires daily is ignored. These are from documentation and from the bugs of this course.' }
        ]
      }),

      B.cmp({
        id: 'm5-api', t: 2, src: 'docs', title: 'What a real API adds: limits, retries and secrets',
        say: 'The pretend shop never failed. Real ones do. Press Next to read what you must handle, and none of it ran here.',
        cols: ['Problem', 'What it looks like', 'What a loader needs'],
        hl: 2,
        rows: [
          ['Rate limits', 'HTTP 429, often with a header that says when to retry', 'Back off, honour the header, and spread the calls'],
          ['Temporary errors', '5xx answers, timeouts, a dropped connection', 'Retry with a growing delay and a maximum, and fail clearly after that'],
          ['Pagination', 'Pages by number, by offset, or by a cursor token', 'Walk every page, and stop on the last one, not on an empty guess'],
          ['Authentication', 'Keys, OAuth tokens that expire', 'Secrets in a vault, a refresh of tokens, and no secrets in logs'],
          ['Changes while reading', 'A row moves between two pages while you read', 'Read by a stable order, and merge on the key']
        ],
        steps: [
          { upto: 2, say: 'Limits and temporary errors are the **normal** case. A loader that fails on the first 429 is a demo.' },
          { upto: 5, say: 'Pages, secrets and changes during a read are where subtle bugs live. A tool that handles them for you is part of what you pay for. This screen is from documentation: the pretend shop had none of these, and I tested none of them.' }
        ]
      }),

      B.bug({
        id: 'm5-bug', t: 1, q: 'A backfill of one day of old orders was run twice because the first run looked stuck. Now the table has more rows than the shop has orders. Click the line that cannot be repeated.',
        file: 'backfill.py', lang: 'python',
        code: '@dlt.resource(name=\'orders\', write_disposition=\'append\')\ndef window(updated=dlt.sources.incremental(\'updated_at\', initial_value=\'2026-03-02T00:00:00+00:00\', end_value=\'2026-03-03T00:00:00+00:00\')):\n    for page in source.get_orders(2, since=updated.start_value):\n        yield page\n',
        bad: [1],
        hint: 'What does a second run of the same window do with append?',
        why: 'A window gives a **bounded** read, and **append** adds it again on every run: in the recording the same window loaded twice held **' + n(ST.window.append[1]) + '** rows for **' + n(ST.window.append[2]) + '** orders. With a **merge** on the key it held **' + n(ST.window.merge[1]) + '**. A backfill is the load that is most often repeated, so it must be a merge.',
        fix: '@dlt.resource(name=\'orders\', write_disposition=\'merge\', primary_key=\'id\')\ndef window(updated=dlt.sources.incremental(\'updated_at\', initial_value=\'2026-03-02T00:00:00+00:00\', end_value=\'2026-03-03T00:00:00+00:00\')):\n    for page in source.get_orders(2, since=updated.start_value):\n        yield page\n',
        cheer: 'Make the backfill repeatable.'
      }),

      B.bug({
        id: 'm5-bug2', t: 2, q: 'A new table was loaded with a cursor whose first value is the day the project started. The table has no orders from before that day, although the shop has them. Click the line that starts too late.',
        file: 'resource.py', lang: 'python',
        code: '@dlt.resource(name=\'orders\', write_disposition=\'merge\', primary_key=\'id\')\ndef orders(updated=dlt.sources.incremental(\'updated_at\', initial_value=\'2026-03-02T00:00:00+00:00\')):\n    for page in source.get_orders(day[0], since=updated.last_value):\n        yield page\n',
        bad: [2],
        hint: 'What is the first value of the cursor on the very first run?',
        why: 'The **first value** of the cursor decides how far back the first load goes. Set to the day of the project, it skipped every order that was last changed before: on day 2 the load wrote only **20** orders, and the table should hold **109**. A **first load of history** starts from the **beginning** of time (or from the oldest date that you need), and the cursor takes over after it.',
        fix: '@dlt.resource(name=\'orders\', write_disposition=\'merge\', primary_key=\'id\')\ndef orders(updated=dlt.sources.incremental(\'updated_at\', initial_value=\'2026-01-01T00:00:00+00:00\')):\n    for page in source.get_orders(day[0], since=updated.last_value):\n        yield page\n',
        cheer: 'Start from the beginning.'
      }),

      B.quiz({
        id: 'm5-q1', t: 1,
        q: 'A new working folder was made for the same destination, and day 2 was loaded again. It wrote 0 rows. Why?',
        opts: [
          { t: 'dlt keeps its state in the destination too, so the new folder found the cursor and the rows at the cursor', fb: '' },
          { t: 'The new folder copied the old one', fb: 'It was empty.' },
          { t: 'Day 2 had no data', fb: 'It had 109 orders.' },
          { t: 'DuckDB blocked the write', fb: 'Nothing failed.' }
        ],
        ok: 0, why: 'The recording: the destination recorded **' + ST.loads + '** loads, and a new folder on the same destination wrote **' + ST.fresh_wrote + '** rows. State kept only on a local disk is lost when a container is thrown away, so it matters where it lives.'
      }),

      B.quiz({
        id: 'm5-q2', t: 1,
        q: 'The same window of old data is loaded twice. With append the table holds 140 rows, and with merge 110. How many orders are there?',
        opts: [
          { t: '110: the 30 extra rows of append are duplicates', fb: '' },
          { t: '140: append is right', fb: 'It counted the same orders twice.' },
          { t: '125: the average', fb: 'Neither table holds that.' },
          { t: '20: the window', fb: 'The window is the part that was loaded twice.' }
        ],
        ok: 0, why: 'Distinct orders in both tables: **' + ST.window.merge[2] + '**. The window wrote **' + ST.window.append[0].join(' and ') + '** rows, and append kept both copies.'
      }),

      B.quiz({
        id: 'm5-q3', t: 2,
        q: 'A job lost 5 of 7 new orders without any error, under a contract that discards rows. Which check finds it the same night?',
        opts: [
          { t: 'A comparison of the row count with the source, and an alert on the gap', fb: '' },
          { t: 'A check that the job finished', fb: 'It finished: that is the problem.' },
          { t: 'A check of the size of the database file', fb: 'It tells you nothing about completeness.' },
          { t: 'A check of the day of the week', fb: 'It has no link to the data.' }
        ],
        ok: 0, why: 'A silent discard loads fewer rows and raises nothing. The **count against the source** is the one check that sees it: **' + n(G.table('drift.modes').rows[2][2]) + '** where a complete load gives **117**.'
      }),

      B.order({
        id: 'm5-ord', t: 1, q: 'Put the steps in order for a sync that failed last night.',
        items: ['Read the error, and find which stage failed', 'Check whether the state moved, and what is in the destination', 'Fix the cause, for example a limit, a secret or a changed field', 'Run the failed window again, which is safe when the load is a merge', 'Compare the counts with the source, and write down what happened'],
        why: 'First understand, then fix, then repeat the load, then verify. The repeat is only safe because the load is idempotent, which is what mission 2 was about.'
      }),

      B.decide({
        id: 'm5-dec', t: 2, src: 'docs', title: 'Decision: query-based incremental or log-based capture for the orders table?',
        scenario: 'The orders live in the Postgres of the shop. Finance needs deletes handled, and the dashboards should be at most five minutes old. The DBA is careful about anything that touches the production database.',
        opts: [
          { t: 'Log-based change capture, with a read-only replication slot, into the warehouse through a tool that you trust', d: 'Every insert, update and delete arrives in order, within seconds.', lose: 'A component to run and monitor, a replication slot to watch (it holds the log until it is read), and the DBA to convince.' },
          { t: 'An incremental query on `updated_at` every five minutes, plus a nightly comparison of ids', d: 'No new component. The nightly step finds the deletes.', lose: 'A query on production every five minutes, silent changes, and deletes that wait for the night.' },
          { t: 'A nightly full export', d: 'The simplest.', lose: 'A day of lag, and a heavy read of production every night.' }
        ],
        pick: 0,
        why: 'The recording showed what a cursor cannot do: **order 11 stayed** after it was deleted, and **order 12** kept its old status. A log has neither gap. The price is operations, and the DBA must agree. The options are from documentation, and the Kafka course records a change capture tool.',
        when: 'If the DBA will not allow a replication slot, or five minutes of lag is not needed, the incremental query with a nightly comparison is the honest second choice.'
      }),

      B.incident({
        id: 'm5-inc', t: 1, src: 'rec', title: 'Incident: the backfill doubled the rows of March 2', time: '11:30',
        alert: '**The revenue of 2 March is exactly twice the shop\'s number after a backfill.** A day of old orders was loaded again because a source bug was fixed. The first run looked stuck, so it was started a second time. The resource appends.',
        clues: ['The numbers are exactly double, for one day only', 'The window was loaded twice', 'The write disposition is append'],
        opts: [
          { t: 'Make the backfill a merge on the key, remove the duplicates of that day, and run the window again to prove that it changes nothing', fb: '' },
          { t: 'Delete March 2 and never backfill again', fb: 'The next fix at the source needs a backfill again.' },
          { t: 'Divide the revenue of that day by two', fb: 'It is a patch on the report.' },
          { t: 'Tell finance to ignore March 2', fb: 'The data stays wrong.' }
        ],
        best: 0,
        why: 'The recording: a window of day 2 loaded twice held **' + n(ST.window.append[1]) + '** rows with append and **' + n(ST.window.merge[1]) + '** with merge, for **' + n(ST.window.merge[2]) + '** orders. A backfill is repeated more than any other load, because someone always starts it twice.',
        checks: [
          ['Compare the day with the source', 'Exactly twice.'],
          ['Count rows and distinct keys', 'Rows exceed distinct keys.'],
          ['Read the history of the runs', 'The window ran twice.'],
          ['Fix and prove', 'Merge on the key, de-duplicate, run the window twice.']
        ],
        tell: 'The backfill appended a day of old orders, and it was started twice, so that day was in the table twice. I changed the resource to merge on the order id, removed the duplicates, and ran the window again to prove that the table does not change.',
        prevent: ['A backfill is a **merge**, never an append', '**Lock** a backfill, so that two cannot run at once', 'Compare **rows with distinct keys** after every backfill']
      }),

      B.incident({
        id: 'm5-inc2', t: 2, src: 'docs', title: 'Incident: the nightly job stops after 40 minutes with HTTP 429', time: '04:10',
        alert: '**The nightly load of the support tool fails after 40 minutes, and the marketing dashboards are stale.** The log says HTTP 429 (too many requests). The job calls the API as fast as it can, and the tool has lowered its limit this month.',
        clues: ['The error is a rate limit, not a bug', 'The job does not wait or retry', 'The limit changed this month'],
        opts: [
          { t: 'Honour the retry header, back off with a growing delay, read less often or in smaller windows, and resume from the saved cursor', fb: '' },
          { t: 'Run the job in a loop until it works', fb: 'It makes the limit worse and risks a ban.' },
          { t: 'Ask for a higher plan before anything else', fb: 'It may help later. The job must back off anyway.' },
          { t: 'Skip the failed pages', fb: 'It loses data silently.' }
        ],
        best: 0,
        why: 'A limit is a **normal** answer of an API, and a loader has to back off and continue from where it stopped: the state is what makes **resume** possible, as the recording showed. This is from documentation, and the pretend shop had no limits.',
        checks: [
          ['Read the status code', '429, not 500.'],
          ['Read the retry header', 'It says when to try again.'],
          ['Check the cursor', 'It moved up to the last good page.'],
          ['Fix and prevent', 'Back off, retry, resume, and alert on a late job.']
        ],
        tell: 'The API lowered its rate limit and the job called it at full speed, so it was refused with 429 after 40 minutes. I made the job honour the retry header and back off, and resume from its saved cursor, and I added an alert when a job is late.',
        prevent: ['Handle **429** with a back-off and the retry header', 'Resume from the **saved state**', 'Alert on a **late** load as well as a failed one']
      }),

      B.qa({
        id: 'qa-backfill', t: 1, tag: 'Ingestion', secs: 60,
        q: 'How do you run a backfill safely?',
        pts: ['Bounded windows', 'Merge on a key', 'Never two at once', 'Compare with the source'],
        short: 'A backfill loads **old data again**, for example after a fix at the source. I use **bounded windows** (a start and an end date), a **merge on the key** so that a repeat changes nothing, and a **lock** so that two backfills cannot run together. In my recording the same window loaded twice held **' + n(ST.window.append[1]) + '** rows with append and **' + n(ST.window.merge[1]) + '** with merge, for **' + n(ST.window.merge[2]) + '** orders. I keep the normal cursor out of it: a window with an end value left the cursor alone. Afterwards I **compare counts and a few rows with the source**, and I tell the people who read the data that it changed.',
        fu: [['What about a first load of history?', 'Start the cursor from the oldest date that you need, and let it take over.'], ['Backfill and deletes?', 'A window does not remove rows. Compare the ids of the window with the source.']],
        trap: 'Backfilling with append.',
        real: 'Describe a backfill that you ran.'
      }),

      B.qa({
        id: 'qa-monitor', t: 1, tag: 'Ingestion', secs: 60,
        q: 'What do you monitor on an ingestion pipeline?',
        pts: ['Freshness', 'Volume against the source', 'Rows against distinct keys', 'Schema changes and cost'],
        short: 'Six things. **Freshness**: when the last load finished. **Volume against the source**: a row count, which caught a loader that read one page of two in my run (**50** against **100**). **Rows against distinct keys**: it caught a repeat that appended (**200** for **100**). **Schema changes**: a new column, a variant column, a failed contract. **Nulls in key columns**, because a value can move to a variant column. And **usage and cost** for each connection. I alert on **changes and gaps**, not on every day, because an alert that fires daily is ignored, and each alert says what to look at first.',
        fu: [['Who gets the alert?', 'The owner of the pipeline, in the channel where the work happens, with a link to the run.'], ['A failed job or a late job?', 'Both. A job that never started raises no error.']],
        trap: 'Alerting only on failures.',
        real: 'Describe an alert that saved you.'
      }),

      B.qa({
        id: 'qa-state', t: 2, tag: 'Ingestion', secs: 60,
        q: 'Where does an ingestion tool keep its state, and why does it matter?',
        pts: ['The cursor and its boundary rows', 'Local disk or destination', 'Loss means a full re-read', 'Reset on purpose'],
        short: 'The **state** is what makes a run continue: the **cursor** (in my run `' + ST.last_value + '`) and, in dlt, **hashes of the **' + ST.remembered + '** rows at the cursor**. Where it lives decides what a lost disk costs. dlt kept it in a local folder **and in the destination**: a new working folder wrote **' + ST.fresh_wrote + '** rows and carried on. Airbyte hands the last STATE message back to the connector at the next read. If state is lost, the usual outcome is a **full re-read**, which a **merge** survives and an **append** does not. I reset state **on purpose**, for a backfill, and I do not edit it by hand.',
        fu: [['State in a container with no disk?', 'Keep it in the destination or in a store that survives the container.'], ['Two jobs on one state?', 'Do not: they overwrite each other. Lock the job.']],
        trap: 'Editing state by hand in production.',
        real: 'Describe how you recovered a lost state.'
      }),

      B.qa({
        id: 'qa-cdc', t: 2, tag: 'Ingestion', secs: 60,
        q: 'When would you choose log-based change capture over an incremental query?',
        pts: ['Deletes must arrive', 'Seconds of lag', 'No silent changes', 'The cost of operating it'],
        short: 'When **deletes** or **very low lag** matter, or when I cannot trust a cursor column. A query on `updated_at` is simple and has two gaps that my recording showed: a **deleted** order stayed (order 11), and a **silent update** was missed (order 12) until I added a lookback. **Log-based capture** (Debezium, a cloud service) reads the database log, so inserts, updates and deletes arrive **in order**, within seconds, and silent changes do not exist. The price is a **component to run**, a **replication slot** that holds the log until it is read and must be watched, and a DBA who agrees. For small tables with a day of lag allowed, I take the query plus a nightly comparison.',
        fu: [['What is the risk of a replication slot?', 'If the reader stops, the database keeps the log and the disk fills.'], ['Where do I see it?', 'The Kafka course in this library records Debezium with Kafka Connect.']],
        trap: 'Choosing change capture for a table that changes once a day.',
        real: 'Describe a source where you chose change capture.'
      }),

      B.recap({
        id: 'm5-recap', n: 5, badge: 'Pipeline Owner', color: '#C026D3',
        pts: [
          'dlt keeps its **state** in a local folder **and in the destination**: a new folder wrote **' + ST.fresh_wrote + '** rows and carried on.',
          'A **backfill** loaded twice held **' + n(ST.window.append[1]) + '** rows with append and **' + n(ST.window.merge[1]) + '** with merge: use **bounded windows**, a **merge**, and a **lock**.',
          'Watch **freshness**, **volume against the source**, **rows against distinct keys**, **schema changes**, **nulls** and **usage**.',
          'A real API adds **limits, retries, pages and secrets**: from documentation, and not run here.',
          '**Log-based capture** sees deletes and silent changes that a cursor cannot, at the price of running one more component.'
        ],
        lines: [
          'I run backfills that are safe to repeat.',
          'I monitor gaps and changes as well as failures.',
          'I know where my state lives.'
        ]
      })
    ]
  });
})();
