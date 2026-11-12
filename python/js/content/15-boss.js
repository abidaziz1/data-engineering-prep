/* Mission 15: drills that mix missions, a coding round, the boss round of interview questions, and a one-page review.
   The numbers in the review come from the recordings of the earlier missions (guarded below, so a new recording that changes them fails the lint)
   or from documentation, and the review says which. */
(function () {
  var B = LAB.b, G = LAB.get;

  /* Boss round: questions come from the earlier missions, in mission order. Tier 1 is the junior path, tier 2 adds the senior questions, tier 3 adds the rest. */
  var BOSS = [
    ['qa-pyrole', 1], ['qa-sqlpy', 2],
    ['qa-lock', 1], ['qa-repro', 2],
    ['qa-structs', 1], ['qa-mutable', 1], ['qa-complexity', 2],
    ['qa-generator', 1], ['qa-itertools', 2],
    ['qa-parquet', 1], ['qa-atomic', 2], ['qa-codec', 3],
    ['qa-utc', 1], ['qa-decimal', 1], ['qa-dst', 2],
    ['qa-retry', 1], ['qa-idempotent', 1], ['qa-delivery', 2],
    ['qa-paging', 1], ['qa-sqli', 1], ['qa-timeout', 2],
    ['qa-joinfan', 1], ['qa-engines', 1], ['qa-bigframe', 2],
    ['qa-profile', 1], ['qa-gil', 1], ['qa-free', 3],
    ['qa-pydantic', 1], ['qa-quarantine', 1], ['qa-contract', 2],
    ['qa-testing', 1], ['qa-coverage', 1], ['qa-hypothesis', 2],
    ['qa-config', 1], ['qa-secrets', 1], ['qa-package', 2],
    ['qa-design', 1], ['qa-coreshell', 1], ['qa-refactor', 2]
  ];

  function blk(file, name) { var a = G.at(file, new RegExp('^def ' + name + '\\(')), l = file.split('\n'), b = a; while (b < l.length && l[b] !== '') b++; return [a, b]; }
  function fn(file, name) { var r = blk(file, name); return G.lines(file, r[0], r[1]); }
  function num(x, d) { return x.toLocaleString('en-US', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }); }

  /* what the earlier recordings say, checked before the review quotes it */
  var DS = G.counts('m6.dst'), MN = G.counts('m6.money'), RT = G.counts('m7.retry'), ID = G.counts('m7.idem'), PG = G.counts('m8.paging'), BT = G.counts('m8.batch');
  var FO = G.counts('m9.fanout'), EN = G.counts('m9.engines'), PR = G.counts('m10.profile'), VC = G.counts('m10.vector'), CO = G.counts('m10.concurrency'), ME = G.counts('m10.memory');
  var VD = G.counts('m11.validate'), MU = G.counts('m12.mutants'), CF = G.counts('m13.config'), TS = G.counts('m14.tests');
  var NUT = G.text('m9/nulls_and_types.py'), LDT = G.text('m6/local_days.py'), PRT = G.text('m15/pipeline_round.py'), PRF = G.file('m15/pipeline_round.py'), MYT = G.text('m11/mypy'), TXT = G.text('m8/transactions.py'), SPT = G.text('m8/sql_params.py');
  var LON = DS.cases.filter(function (c) { return c.zone === 'Europe/London' && c.hint === 'gap'; })[0], LONA = DS.cases.filter(function (c) { return c.zone === 'Europe/London' && c.hint === 'ambiguous'; })[0];
  var S1M = MN.sums[MN.sums.length - 1], R25 = MN.rounding.filter(function (r) { return r.value === '2.675'; })[0];
  var AT = RT.storm['at once'], FX = RT.storm['fixed 1 s'], JT = RT.storm['exponential with full jitter'];
  var APP2 = ID.cells['append']['run twice'], UPD = ID.cells['upsert']['the source drops O-6'], TXC = ID.cells['delete, then insert, in a transaction']['crash, then run again'], DIC = ID.cells['delete, then insert']['crash, then run again'];
  var OI = PG.cases.filter(function (c) { return c.style === 'offset' && c.scenario === 'insert'; })[0], OD = PG.cases.filter(function (c) { return c.style === 'offset' && c.scenario === 'delete'; })[0];
  var EACH = BT.methods['commit for every row'], MANY = BT.methods['one transaction, executemany'];
  var PD = EN.engines['pandas'], DK = EN.engines['duckdb'], RG = CO.builds['regular'], FR = CO.builds['free-threaded'], TOT = ME.columns['total'];
  var WK = MU.suites['test_weak.py'], ST = MU.suites['test_strong.py'];
  var HOURS = /hours in 2026-03-29 in London: (\d+)/.exec(LDT)[1], HOURS_AUTUMN = /hours in 2026-10-25 in London: (\d+)/.exec(LDT)[1];
  G.expect(LON.kind === 'does not exist' && LONA.kind === 'ambiguous' && HOURS === '23' && HOURS_AUTUMN === '25', 'a London day has 23 or 25 hours on the change days, and 01:30 does not exist or happens twice');
  G.expect(S1M.float === '100000.00000133288' && R25.round === '2.67' && R25.half_up === '2.68', 'the float sum drifted and round(2.675, 2) gave 2.67');
  G.expect(AT.requests === 330 && AT.gave_up === 40 && FX.retry_burst === 40 && JT.retry_burst === 14, 'the retry simulation');
  G.expect(APP2.final.length === 12 && UPD.final.length === 6 && TXC.runs[0].rows === 0 && DIC.runs[0].rows === 3, 'the load strategies');
  G.expect(OI.rows === 26 && OI.unique === 23 && OD.missed.length === 3, 'offset pages repeat and skip');
  G.expect(EACH.seconds / MANY.seconds > 50 && /Conan O'Brien -> \[\]/.test(SPT) && /rows returned: 3 of 3/.test(SPT) && /'Singapore': 75\} -> total 80 kg, and it was 50/.test(TXT), 'a commit for every row is slow, an f-string query is injectable, and separate commits broke the total');
  G.expect(/pandas  rows per store: \{'London': 2, 'Singapore': 1\}/.test(NUT) && /polars  rows per store: \{'London': 2, 'Singapore': 1, None: 1\}/.test(NUT) && FO.cases.filter(function (c) { return c.how === 'left' && c.dup === 1; })[0].rows === 9, 'groupby drops a missing key in pandas and a join multiplies rows');
  G.expect(PD.extra_mb > 3 * DK.extra_mb && PR.list_seconds > 20 * PR.set_seconds && VC.ms['for loop'] / VC.ms['numpy: (arr * 2).sum()'] > 10, 'pandas needed more than three times the memory of DuckDB, a set beats a list, and numpy beats a loop');
  G.expect(RG.gil === true && FR.gil === false && RG.computing['8 threads'] >= 0.85 * RG.computing['one after another'] && RG.computing['4 processes'] <= 0.75 * RG.computing['one after another'] && FR.computing['8 threads'] <= 0.8 * FR.computing['one after another'], 'threads help waiting and not computing on the regular build');
  G.expect(/Found 4 errors in 1 file/.test(MYT) && VD.cells['lax']['quarantine, fail above 20 percent'].loaded === 0 && VD.cells['lax']['drop bad rows silently'].dropped === 4, 'mypy found four errors and silence dropped four rows');
  G.expect(WK.caught === 4 && ST.caught === 7 && MU.coverage.weak.percent === 100, 'the weak tests had 100 percent coverage and caught 4 of 7');
  G.expect(CF.cells['1|1|1'].batch_size.value === '50' && CF.cells['0|0|0'].batch_size.value === '1000' && CF.cells['1|0|0'].batch_size.value === '500' && CF.cells['1|1|0'].batch_size.value === '200', 'the layers of the settings');
  G.expect(TS.tangled.lines === 14 && TS.core.fixtures === 0 && /tests passed$/.test(PRT), 'the test sizes and the capstone round');

  var PRROWS = PRT.split('\n').filter(function (l) { return l.indexOf(':') > 0 && l !== 'tests passed'; }).map(function (l) { var i = l.indexOf(':'); return [l.slice(0, i), l.slice(i + 2)]; });

  LAB.addChapter({
    id: 'm15', n: 15, title: 'Boss round and cheat sheet', short: 'Boss round', blurb: 'Drills that mix topics, a coding round, a mock interview and a one-page review', minutes: 55,
    focus: ['src', 'ing', 'stg', 'mart', 'con', 'sf', 'mon', 'qual', 'snap', 'ci'],
    goals: [
      'Solve **drills** that combine several missions, with the first move and the reasoning.',
      'Write one day of a pipeline as a **function with injected parts**: pages, a check, a writer and a limit.',
      'Answer a **mock interview round** against a timer, and grade yourself honestly.',
      'Keep a **one-page review** of the numbers, settings and decision rules.'
    ],
    say: 'This is the last mission. First three drills that mix topics, then a design decision and a coding round that uses most of the course, then the boss round: real interview questions with no notes. Be honest when you grade yourself. Honest grades make the scorecard worth reading.',
    scenes: [
      B.incident({
        id: 'm15-d1', t: 2, src: 'rec', title: 'Drill 1: three orders twice, and a retry in the log', time: '08:10',
        alert: 'The nightly orders extract has 3 order ids that appear twice, and revenue for the day is 2.4 percent above the till. The log shows that page 2 of the partner API got a 429, the job waited, tried again and carried on. The load ended green.',
        clues: ['The extract reads `/orders?page=N&per_page=100` until a short page, newest orders first.', 'The same job on a quiet night has no duplicates.', 'The load appends the rows to a table that has a key on `order_id`... or so the design document says.'],
        opts: [
          { t: 'Look at where the repeated ids sit: if they are the last ids of one page and the first of the next, the paging shifted. Switch to cursor pages.', fb: '' },
          { t: 'Remove the retry, because it is the only unusual line in the log', fb: 'A retry that asks for the same page again is correct. The recording showed that a 429 and a wait did not repeat a row.' },
          { t: 'Drop duplicates after the load', fb: 'It hides the symptom and leaves the orders that were skipped, which no one can see.' },
          { t: 'Make the page size bigger so that there are fewer pages', fb: 'The shift is the number of new orders, not the number of pages.' }
        ],
        best: 0, why: 'In the recording, three new orders arriving after page 1 made offset pages read ' + OI.rows + ' rows for ' + OI.unique + ' orders, and the repeated ids were ' + OI.repeated.join(', ') + ': the last three of page 1. When three orders were cancelled the same paging skipped three, with a 200 on every page. The retry was a distraction. Cursor pages follow the data.',
        checks: [
          ['List the repeated ids with their page numbers', 'They sit at a page boundary: the last of one page and the first of the next.'],
          ['Compare the unique ids with the partner\'s count', 'More rows than ids means repeats, and fewer ids than the partner has means that some were skipped.'],
          ['Read how the job pages', 'Offset pages on a newest-first list that changes while the job runs.'],
          ['Switch to cursor pages and save the cursor after each write', 'The next page starts after the last id that was read.'],
          ['Check that the table has a key and that the load is an upsert or a replace of the day', 'A repeated id must not become a second row, even if the paging is wrong again.']
        ],
        tell: 'The extract used offset pages on a newest-first list, so orders that arrived during the run pushed the last three of one page onto the next page. The 429 and the retry were fine. I switched to cursor pages with the cursor saved after each write, and added a check that the number of unique ids matches what the API reports. The table gets a key on order_id, and the load replaces the day in one transaction.',
        prevent: ['Cursor or keyset pages on data that changes.', 'A key on the business id in the target table.', 'A check on unique ids and totals after every extract.', 'The load is idempotent, so a repeat cannot double anything.']
      }),

      B.incident({
        id: 'm15-d2', t: 2, src: 'rec', title: 'Drill 2: killed for memory since the file grew tenfold', time: '06:40',
        alert: 'The nightly job is killed by the kernel with "out of memory" on a 16 GB machine. It worked for a year. The partner\'s file went from 2 million to 20 million rows last week. The job reads the CSV with pandas, filters paid orders and sums by store.',
        clues: ['The job needs 3 of the 12 columns of the file.', 'The partner can also send the same file as Parquet.', 'The machine has 4 cores, and 8 GB of the memory is used by other jobs.'],
        opts: [
          { t: 'Read only the 3 columns, from a Parquet copy, with an engine that streams, such as DuckDB or Polars lazy', fb: '' },
          { t: 'Run the pandas code in 8 threads', fb: 'Threads share the same memory and the same table. They would not lower the peak.' },
          { t: 'Buy a machine with 64 GB', fb: 'It may work for a month. The file will grow again, and the cause stays.' },
          { t: 'Delete the older rows of the file by hand', fb: 'It changes the answer.' }
        ],
        best: 0, why: 'In the recording on 2 million rows, pandas added about ' + Math.round(PD.extra_mb) + ' MB while DuckDB added about ' + Math.round(DK.extra_mb) + ' MB for the same answer, because it reads only the columns and rows that it needs. Smaller types cut a table from ' + TOT.before_mb.toFixed(1) + ' MB to ' + TOT.after_mb.toFixed(1) + ' MB. Parquet lets the reader skip the columns that the job does not use.',
        checks: [
          ['Measure the memory of the job before changing it', 'The peak grows with the file. At 10 times the rows it is about 10 times the memory.'],
          ['Count the columns that the job really uses', '3 of 12: the other 9 are loaded and thrown away.'],
          ['Ask the partner for Parquet, or convert the CSV once', 'Columns can be skipped without parsing text.'],
          ['Use DuckDB or Polars lazy, and compare the answer with the pandas one on last month\'s file', 'The rows must be identical.'],
          ['Set a memory alert and keep the measurement in the log', 'The next growth is seen before the kernel kills the job.']
        ],
        tell: 'The job loaded the whole table with pandas, so its memory grew with the file, and ten times the rows needed about ten times the memory. It uses 3 of 12 columns. I moved to Parquet and an engine that reads only the needed columns and streams the rest, checked the answer against the old one, and added the peak memory to the log with an alert.',
        prevent: ['Read only the columns that you use.', 'Prefer Parquet to CSV for large files.', 'Choose an engine that streams for files that can outgrow the machine.', 'Log the peak memory and the row count of every run.']
      }),

      B.incident({
        id: 'm15-d3', t: 2, src: 'rec', title: 'Drill 3: the 01:30 job did not run, and the day is an hour short', time: '09:20',
        alert: 'On Monday the daily report for the London store is one hour short for Sunday. The job is scheduled by cron at 01:30 server time, and the server uses London local time. It ran every other night. The log has no line for Sunday.',
        clues: ['Sunday was 29 March, the day that the clocks went forward.', 'The report counts orders for each local day.', 'The orders table stores UTC timestamps.'],
        opts: [
          { t: 'Check whether 01:30 existed that night. Schedule in UTC, and build the local day from UTC values with the zone name.', fb: '' },
          { t: 'Move the job to 03:00 and keep the server on local time', fb: 'It avoids this night. The autumn night has the opposite problem, and the cause stays.' },
          { t: 'Add one hour to the report for Sunday', fb: 'A hand fix on one day. The next change day will be wrong again.' },
          { t: 'Restart the scheduler', fb: 'It did not crash. The time did not exist.' }
        ],
        best: 0, why: 'In the recording, ' + LON.local + ' in London does not exist on 29 March: the clocks go from 01:00 to 02:00. The day of the 29th has ' + HOURS + ' hours, and the 25 October day has ' + HOURS_AUTUMN + '. A job that runs at a local wall-clock time can be skipped in spring and run twice in autumn.',
        checks: [
          ['Check the date against the clock change', 'The last Sunday of March in London. 01:30 was skipped.'],
          ['Look at how the job is scheduled', 'In local server time.'],
          ['Schedule in UTC, and keep the server and the data in UTC', 'UTC has no gaps and no repeats.'],
          ['Build the report for the local day from UTC timestamps, with the store\'s zone name', 'The day of 29 March then has 23 hours, as it should.'],
          ['Add a test with orders on the change days, and rerun Sunday through the idempotent load', 'The report is right, and the next change day is covered.']
        ],
        tell: 'The cron job was scheduled at 01:30 local time, which did not exist on the night that the clocks went forward, so it never ran and the day was an hour short. I moved the schedule to UTC, kept the data in UTC, built the local day with the store\'s zone name, added a test for the two change days, and reran the day through the idempotent load.',
        prevent: ['Schedule in UTC.', 'Store UTC, and keep the zone name for local days.', 'Test the two clock-change days for every zone that you serve.', 'Alert when an expected run is missing, and when a run fails.']
      }),

      B.decide({
        id: 'm15-d4', t: 2, src: 'rec', title: 'Decision: design the daily orders pipeline',
        scenario: 'You are asked to build the daily orders pipeline from the partner API into the warehouse. It has to survive timeouts, reruns, bad rows and a new teammate. The course showed these recorded facts: a plain append run twice gave **' + APP2.final.length + ' rows**, offset pages repeated **3** orders and missed **3** others, a loader that dropped bad rows silently called it success, and tests with 100 percent coverage caught **' + WK.caught + ' of ' + WK.total + '** changes.',
        opts: [
          { t: 'One script: offset pages, append the rows, print "done"', d: 'Fast to write.', lose: 'Repeats and misses rows, doubles on a rerun, hides bad rows, and nobody can test it.' },
          { t: 'A pure core for the rules and a thin shell: cursor pages saved after each write, validation with quarantine and a limit, the day replaced in one transaction, a command line with a dry run, layered settings, and tests, ruff and mypy in CI', d: 'Each recorded failure has an answer: rerunnable, checked, observable, testable.', lose: '' },
          { t: 'The same design, with the tests added later', d: 'Faster to the first run.', lose: 'The first change breaks something quietly, and the boundary bugs that coverage does not see are the expensive ones.' },
          { t: 'Start with a cluster and an orchestrator', d: 'Scales to any volume.', lose: 'A lot of setup for one nightly API extract, and the problems above remain until the code is fixed.' }
        ],
        pick: 1,
        why: 'The second option answers each failure of the recordings: a cursor against shifting pages, a transaction and a key against doubling, quarantine and a limit against silence, a thin shell and tests against fear of change. An orchestrator can be added when the dependencies grow.',
        when: 'If the data is small and one person owns it, a smaller version of the same design is fine. Keep the idempotent load and the limit on bad rows even then.'
      }),

      B.challenge({
        id: 'm15-ch1', t: 2, lang: 'python', file: 'pipeline_round.py',
        q: '**Coding round: one day, end to end.** Write `run_day(pages, check, write, max_bad_share=0.1, batch_size=2)`. `pages` is an iterator of lists of rows, like a cursor API. `check(row)` returns the cleaned row or raises `ValueError(reason)`. `write(rows)` writes one batch. Return `{"read": n, "loaded": n, "quarantined": [(line, reason)], "batches": n}`, with lines counted from 2. When the share of bad rows is above `max_bad_share`, raise `RuntimeError` **before anything is written**.',
        data: [{ name: 'what the tests check', cols: ['case', 'expected'], rows: [['10 rows in 4 pages, 1 bad, limit 0.2, batch 4', '9 loaded in 3 batches, quarantined [(6, reason)]'], ['10 rows, 3 bad, limit 0.2', 'RuntimeError, and write was never called'], ['no pages', 'all zeros, and write never called']] }],
        starter: 'def run_day(pages, check, write, max_bad_share=0.1, batch_size=2):\n    ...',
        hints: ['Loop over the pages and the rows. Count lines from 2, because line 1 is the header. Collect `good` rows and `bad` (line, reason) pairs.', 'Compute `read = len(good) + len(bad)`. If `read` and the share of bad rows is above the limit, raise `RuntimeError` before any write.', 'Then write `good` in slices of `batch_size`, and count the batches. Return the summary dict.'],
        sol: fn(PRF, 'run_day'),
        res: { msg: 'tests passed in the recording', cols: ['case', 'result'], rows: PRROWS },
        expl: ['The pages, the check and the writer are **arguments**, so the whole day is tested with lists and a function that appends to a list, with no API, no database and no clock (mission 14).', 'Nothing is written before the limit is checked, so a source that has changed leaves the table as it was (mission 11), and the run fails with a number in the message (mission 7).', 'The writer is called once for each batch and must be safe to repeat, so a rerun after a crash replaces the same rows (mission 7). The batches keep one commit from becoming a million (mission 8).'],
        cx: 'O(n) rows and one call of `write` for each batch. The good rows are held in memory, so for a very large day the shell would write each page as it comes, and keep only the counts.'
      }),

      B.mockRound(BOSS.map(function (b) { return b[0]; }), BOSS.map(function (b) { return b[1]; })),

      B.cheat({
        id: 'm15-cheat', t: 1, src: 'rec', title: 'One page to review',
        say: 'This is your last-minute review. Items marked (docs) come from documentation and were not run. Everything else comes from a recording that the README describes. Take a screenshot or print the page.',
        sections: [
          { h: 'Scripts and environments', items: ['A job must be **safe to run twice**: a key, an upsert or a replace of the day, and a transaction. Test it by running it twice, and by killing it halfway', 'A notebook hides state. Ship scripts and packages', '`pyproject.toml` has ranges, `uv.lock` has exact versions and hashes. Commit both, ignore `.venv`, rebuild with `uv sync --locked`. Pin the major version of pandas and upgrade on purpose'] },
          { h: 'Structures, streams and files', items: ['`in` on a list is O(n), on a set one hash lookup. Keys must be hashable. A mutable default and a shallow copy share objects: use `None` and `copy.deepcopy`', 'A generator makes values when asked and forgets them: one batch in memory. It can be used once. Use `itertools.batched` for batches', 'Read CSV with the csv module, `newline=""` and an explicit encoding. JSON Lines loses one line when a file is cut. Parquet for the clean layer. Write atomically: a temporary file and `os.replace`'] },
          { h: 'Time and money', items: ['Store **UTC**, keep the zone name, convert at the edge. A naive datetime is a clock reading. `datetime.utcnow()` is deprecated', LON.local + ' in London did not exist on 29 March and happened twice on 25 October. A London day has ' + HOURS + ' or ' + HOURS_AUTUMN + ' hours', 'A float loop of a million additions of 0.10 gave `' + S1M.float + '`. Use `Decimal` from text or integer cents. `round(2.675, 2)` gave ' + R25.round + ' and Decimal half up gave ' + R25.half_up + '. Write the rounding rule in the code'] },
          { h: 'Errors, retries and loads', items: ['Catch the error you can handle. `except Exception: pass` printed success and dropped rows. Exit 0 only when it worked', 'Retry what can change (timeouts, 429, 5xx) with backoff, jitter, a cap and a limit, and raise at the end. In the simulation, retrying at once sent ' + AT.requests + ' requests for 10 successes. Jitter cut the biggest burst from ' + FX.retry_burst + ' to ' + JT.retry_burst + ', at a cost in time and requests', 'A plain append run twice gave ' + APP2.final.length + ' rows. Replace the day in one transaction, or upsert by key. An upsert keeps a row the source dropped. Save a watermark after the write, and read with an overlap'] },
          { h: 'APIs and databases', items: ['Every call has a timeout, and `raise_for_status()`. Offset pages read ' + OI.rows + ' rows for ' + OI.unique + ' orders when 3 arrived, and missed 3 when 3 were cancelled. Use cursor or keyset pages and save the cursor after the write', '429 with `Retry-After`: wait that long, ask for the same page. Values go in **parameters**: an f-string query returned 3 of 3 customers for an injected name', 'A transaction keeps related changes together: separate commits made 30 kg of stock from nothing. A commit for every row made ' + num(EACH.rows_per_second) + ' rows per second, one transaction about ' + num(MANY.rows_per_second) + ' (on this machine)'] },
          { h: 'pandas, Polars and DuckDB', items: ['pandas `groupby` drops a missing key and Polars and DuckDB keep it. A join on a key that is not unique turned 6 orders into 8 rows and 8,275 cents into 10,905: use `validate="m:1"`, or `GROUP BY key HAVING count(*) > 1`', 'The three engines gave the same answer on 2 million rows. pandas added about ' + Math.round(PD.extra_mb) + ' MB and DuckDB about ' + Math.round(DK.extra_mb) + ' MB (on this machine). A lazy plan pushes the columns and the filter into the file scan', 'DuckDB 2: a relation has no `fetchone()`, use `fetchall()` (docs)'] },
          { h: 'Speed and memory', items: ['Measure, profile, change one thing, measure again. A set instead of a list made a report about ' + Math.round(PR.list_seconds / PR.set_seconds) + ' times faster. A column operation was about ' + Math.round(VC.ms['for loop'] / VC.ms['numpy: (arr * 2).sum()']) + ' times faster than a loop', 'Waiting work: threads or asyncio overlapped eight 0.25 s waits into about ' + RG.waiting['8 threads'].toFixed(2) + ' s. Computing work: 8 threads gave no gain with the GIL (' + RG.computing['8 threads'].toFixed(2) + ' s against ' + RG.computing['one after another'].toFixed(2) + ' s), processes did (' + RG.computing['4 processes'].toFixed(2) + ' s). The free-threaded 3.14t build gave ' + FR.computing['8 threads'].toFixed(2) + ' s with threads', 'Smaller types cut a table from ' + TOT.before_mb.toFixed(1) + ' MB to ' + TOT.after_mb.toFixed(1) + ' MB. Money stays in integer cents'] },
          { h: 'Types and validation', items: ['A type hint is a note. mypy found 4 errors in a small file without running it. pydantic checks real values and lists every error: 5 for one bad row', 'Validate once, at the boundary. Quarantine bad rows with the line and the reason. 4 of 10 rows were bad: a limit of 20 percent failed the run, 50 percent loaded 6, and dropping silently loaded 6 and said success. Strict mode on a CSV rejected all 10', 'A contract check reports a missing, new or retyped column before the load. A change of meaning needs value checks and an owner'] },
          { h: 'Tests, logs and lint', items: ['A test fails with the values in the message. `parametrize` makes a table of facts. Test the **boundary** of every limit, on both sides', 'Four tests had ' + MU.coverage.weak.percent + ' percent coverage and caught ' + WK.caught + ' of ' + WK.total + ' changes to the code. Boundary cases caught ' + ST.caught + '. Coverage counts lines that ran, not facts that were checked. Hypothesis shrank a failure to `[0, -1]`', 'Log with a level, a name and fields, and `log.exception` inside an `except`. ruff gave rule codes, such as `B006` for a mutable default. Run ruff, mypy and the tests in CI'] },
          { h: 'Shipping and design', items: ['Exit 0 worked, 1 failed, 2 was used wrongly. Settings in layers: default 1000, file 500, environment 200, flag 50. The nearest layer wins and an unknown key is an error. Secrets come from the environment only', '`uv build` made a wheel with `entry_points.txt`. CI runs ruff, mypy, pytest and the build on every change. The workflow file itself was not run here (docs)', 'A pure core and a thin shell. The tangled job needed 1 test of ' + TS.tangled.lines + ' lines with ' + TS.tangled.fixtures + ' fixtures, the core 3 tests of ' + TS.core.lines + ' lines with none. Pass in the clock, the reader and the writer'] },
          { h: 'Say it in one line', items: ['Run it twice and get the same table.', 'Check the data where it enters, and keep what fails.', 'Measure before you change anything.', 'Pass the clock in, and store UTC.', 'Say what you know from practice, and say when you would check the documentation.'] }
        ]
      }),

      B.recap({
        id: 'm15-recap', n: 15, badge: 'Python Pipeline Pro', color: '#FDE68A',
        pts: [
          'You can take data from an **API, a file and a database** to a table, and say what happens when it is cut, repeated, late or bad.',
          'You choose by **evidence**: the profile before the rewrite, the memory before the machine, the recorded failure before the fix.',
          'You make loads **safe to repeat**, check data **where it enters**, keep what fails, and test the **boundaries**.',
          'You know which facts came from **recordings** and which from **documentation**, and you say so.',
          'Next: practise the answers out loud, then rebuild the Brewline job with a small API of your own and your own tests.'
        ],
        lines: [
          'I run it twice before I trust it.',
          'I measure before I change, and I test the edges.',
          'I say what I know, and I say when I would check the documentation.'
        ]
      })
    ].reduce(function (all, x) { return all.concat(x); }, [])
  });
})();
