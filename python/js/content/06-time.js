/* Mission 6: dates, time zones and money. Real results from datetime, zoneinfo (tzdata) and decimal. */
(function () {
  var B = LAB.b, G = LAB.get;
  var NA = G.file('m6/naive_aware.py'), ISO = G.file('m6/iso_parse.py'), DST = G.file('m6/zoneinfo_dst.py'), DAY = G.file('m6/day_buckets.py'), MON = G.file('m6/money.py'), NORM = G.file('m6/normalize_timestamps.py'), LOCAL = G.file('m6/local_days.py');
  var NAT = G.text('m6/naive_aware.py'), ISOT = G.text('m6/iso_parse.py'), DSTT = G.text('m6/zoneinfo_dst.py'), DAYT = G.text('m6/day_buckets.py'), MONT = G.text('m6/money.py'), NORMT = G.text('m6/normalize_timestamps.py'), LOCALT = G.text('m6/local_days.py');
  var DS = G.counts('m6.dst'), MN = G.counts('m6.money');

  function cs(zone, hint) { var r = DS.cases.filter(function (c) { return c.zone === zone && c.hint === hint; })[0]; G.expect(!!r, 'a recorded case ' + zone + ' ' + hint); return r; }
  var LON_GAP = cs('Europe/London', 'gap'), LON_AMB = cs('Europe/London', 'ambiguous'), NY_GAP = cs('America/New_York', 'gap'), NY_AMB = cs('America/New_York', 'ambiguous'), SG = cs('Asia/Singapore', 'regular'), LH_GAP = cs('Australia/Lord_Howe', 'gap');
  G.expect(LON_GAP.kind === 'does not exist' && LON_AMB.kind === 'ambiguous' && NY_GAP.kind === 'does not exist' && NY_AMB.kind === 'ambiguous' && SG.kind === 'exists once', 'London and New York have a missing hour and a repeated hour, Singapore has neither');
  G.expect(LON_GAP.local === '2026-03-29 01:30' && LON_AMB.local === '2026-10-25 01:30' && NY_AMB.local === '2026-11-01 01:30', 'the sample times are 01:30 on the three change days');
  G.expect(LON_AMB.fold0.utc === '2026-10-25 00:30' && LON_AMB.fold1.utc === '2026-10-25 01:30', 'the repeated London 01:30 is two moments, 00:30 and 01:30 UTC');
  G.expect(NY_AMB.fold0.utc === '2026-11-01 05:30' && NY_AMB.fold1.utc === '2026-11-01 06:30', 'the repeated New York 01:30 is 05:30 and 06:30 UTC');
  G.expect(/comparing them: can't compare offset-naive and offset-aware datetimes/.test(NAT) && /DeprecationWarning/.test(NAT) && /same moment as 08:15 UTC: True/.test(NAT) && /naive == aware: False/.test(NAT), 'a naive and an aware value cannot be ordered, are never equal, and utcnow warns');
  G.expect(/year must be in 1\.\.9999, not 58169/.test(ISOT), 'epoch milliseconds read as seconds give year 58169');
  G.expect(/by the UTC date:\s+\{'2026-03-14': 4, '2026-03-15': 1\}/.test(DAYT) && /Singapore's date:\s+\{'2026-03-14': 2, '2026-03-15': 3\}/.test(DAYT) && /1 day, 0:00:00/.test(DAYT) && /23:00:00/.test(DAYT), 'the day buckets differ by the clock, and a London day has 23 hours');
  var S10 = MN.sums[0], S1M = MN.sums[MN.sums.length - 1];
  G.expect(S1M.n === 1000000 && S1M.float === '100000.00000133288' && S1M.fsum === '100000.0' && S1M.decimal === '100000.00' && S1M.cents === '10000000', 'a million additions of 0.10 give 100000.00000133288 as a float and exactly 100000 otherwise');
  var R = {}; MN.rounding.forEach(function (r) { R[r.value] = r; });
  G.expect(R['2.675'].round === '2.67' && R['2.675'].half_up === '2.68' && R['2.5'].round === '2.0' && R['2.5'].half_up === '3', 'round(2.675, 2) is 2.67, Decimal half up gives 2.68, round(2.5) is 2');
  G.expect(/0\.1 \+ 0\.2 = 0\.30000000000000004/.test(MONT), '0.1 + 0.2 is 0.30000000000000004');
  var HOURS = /hours in 2026-03-29 in London: (\d+)/.exec(LOCALT)[1], HOURS_AUTUMN = /hours in 2026-10-25 in London: (\d+)/.exec(LOCALT)[1];
  G.expect(HOURS === '23' && HOURS_AUTUMN === '25', 'a London day has 23 hours in March and 25 in October');
  var TZV = DS.tzdata;

  function lines(file, a, b) { return G.span(file, a, b); }
  function rowsOf(text, re, fnc) { return text.split('\n').filter(function (l) { return re.test(l); }).map(fnc); }
  var NORMROWS = rowsOf(NORMT, /->/, function (l) { var p = l.split('->'); return [p[0].trim(), p[1].trim()]; });
  var LOCALROWS = [['London', LOCALT.split('\n')[0].replace(/^London:\s+/, '')], ['Singapore', LOCALT.split('\n')[1].replace(/^Singapore:\s+/, '')]];
  function fn(file, name) { var a = G.at(file, new RegExp('^def ' + name)), l = file.split('\n'), b = a; while (b < l.length && l[b] !== '') b++; return G.lines(file, a, b); }
  var NORMFN = fn(NORM, 'to_utc'), LOCALFN = fn(LOCAL, 'orders_per_local_day') + '\n\n' + fn(LOCAL, 'hours_in_local_day');

  var BUG_NOW = ['def stamp(order):', '    order["loaded_at"] = datetime.now()', '    return order'].join('\n');
  var BUG_NOW_FIX = ['from datetime import datetime, timezone', '', 'def stamp(order):', '    order["loaded_at"] = datetime.now(timezone.utc)', '    return order'].join('\n');
  var BUG_DAY = ['# orders carry UTC timestamps; the report is for the Singapore store', 'by_day = Counter()', 'for order in orders:', '    by_day[order["ordered_at"].date()] += 1'].join('\n');
  var BUG_DAY_FIX = ['from zoneinfo import ZoneInfo', 'SG = ZoneInfo("Asia/Singapore")', 'by_day = Counter()', 'for order in orders:', '    by_day[order["ordered_at"].astimezone(SG).date()] += 1'].join('\n');
  var BUG_FLOAT = ['total = 0.0', 'for row in rows:', '    total += float(row["total"])', 'print(total == ledger_total)'].join('\n');
  var BUG_FLOAT_FIX = ['from decimal import Decimal', 'total = Decimal("0")', 'for row in rows:', '    total += Decimal(row["total"])', 'print(total == ledger_total)'].join('\n');

  LAB.addChapter({
    id: 'm6', n: 6, title: 'Dates, time zones and money', short: 'Time and money', blurb: 'The hour that does not exist, and cents that do not add up', minutes: 24,
    focus: ['stg', 'ing'],
    goals: [
      'Tell a **naive** datetime from an **aware** one, and store timestamps in **UTC**.',
      'Read what **zoneinfo** says about a time that **does not exist** or **happens twice**.',
      'Count orders per **local day** and explain why a day can have **23 or 25 hours**.',
      'Say why a **float** is the wrong type for money, and use `Decimal` or whole cents.',
      'Name the **rounding rule** that your code uses.'
    ],
    say: 'Mission 6 has the two kinds of bug that pass every test and fail in the report: the clock and the cents. The time zone cases come from Python\'s zoneinfo with the time zone database version ' + TZV + ', and the money results come from real float and Decimal arithmetic. A million additions of ten cents is not a million times ten cents, and an hour of 29 March does not exist in London.',
    scenes: [
      B.talk({
        id: 'm6-talk', t: 1, src: 'docs', title: 'Time and money fail quietly',
        say: 'Neither of these crashes. Both give a number that looks right. Press Next to meet the five rules that prevent most of the damage.',
        items: [
          ['A datetime is a clock reading, or a moment', 'A naive datetime has no time zone: it says "08:15" and nothing else. An aware one names its offset, so it is a moment. Mixing them is an error, and guessing is a bug.', 'Naive or aware.'],
          ['Store UTC, show local', 'Keep every timestamp in UTC, or with its offset. Convert to a local time only where a person reads it, such as a report or a screen.', 'Convert at the edge.'],
          ['Local time has holes and repeats', 'Where clocks change, one local hour is skipped and another happens twice. Python has a name for the choice, `fold`. A job that stores local wall-clock time stores guesses.', 'DST is not an edge case.'],
          ['A day is not always 24 hours', 'In London, 29 March 2026 has 23 hours, and 25 October has 25. A report "per day" must say whose day it is.', 'Whose midnight?'],
          ['Money is not a float', 'A float is binary and cannot hold 0.1 exactly. Use `Decimal` built from text, or integer cents, and write down the rounding rule.', 'Exact, or wrong.']
        ],
        cols: 1
      }),

      B.code({
        id: 'm6-naive', t: 1, src: 'rec', title: 'Naive and aware datetimes', file: 'naive_aware.py', lang: 'python', code: NA,
        steps: [
          { say: 'A short file that creates the two kinds of datetime, compares them, converts one, and calls the old `utcnow()`. The output is real.', lines: null },
          { say: 'The first has no time zone: `tzinfo` is `None`. The second carries UTC.', lines: G.span(NA, /^naive = /, /^print\("aware/) },
          { say: 'Ordering a naive and an aware value with `<` raises `TypeError`. Python refuses to guess which clock the naive one is on. `==` does not raise: it quietly says the two are not equal.', lines: G.span(NA, /^try:/, /^print\("naive == aware/) },
          { say: 'An aware value in Singapore (UTC+8) and one in UTC can be the same moment. `==` is `True`, and `astimezone` converts between them.', lines: G.span(NA, /^singapore = /, /^print\("converted to UTC/) },
          { say: '`datetime.utcnow()` is the trap. It returns a **naive** value that happens to be in UTC, and since Python 3.12 it warns that it is deprecated. Use `datetime.now(timezone.utc)`.', lines: G.span(NA, /^with warnings/, /^print\("the replacement/) }
        ]
      }),

      B.term({
        id: 'm6-naive-run', t: 1, src: 'rec', title: 'Run it',
        say: 'The real output of the file you just read, from Python ' + G.meta('python') + '.',
        lines: function () { return G.plain(NAT, { cmd: 'python naive_aware.py' }); },
        after: 'The comparison failed loudly, which is good. The dangerous one is `utcnow()`: it looks like UTC and carries no zone, so the next person to call `astimezone` on it gets a conversion from the **local** zone of the machine. The fix is one line: `datetime.now(timezone.utc)`.',
        afterKind: 'tip',
        doneSay: 'A timestamp without a zone is a question. Attach the answer when you create it.'
      }),

      B.quiz({
        id: 'm6-q1', t: 1, src: 'rec',
        q: 'A job checks `created_at < cutoff`. `created_at` comes from the database and is aware. `cutoff` is `datetime(2026, 3, 14, 8, 15)`, which is naive. What happens, according to the recording?',
        opts: [
          { t: 'TypeError: can\'t compare offset-naive and offset-aware datetimes', fb: '' },
          { t: 'Python assumes UTC for the naive value and compares', fb: 'Python makes no assumption. It refuses, as the recording shows.' },
          { t: 'Python assumes the local zone of the machine', fb: 'Some libraries do. The standard library raises an error.' },
          { t: 'The comparison returns False', fb: '`==` returns False, as the recording shows, but `<` raises TypeError.' }
        ],
        ok: 0, why: 'The error is a feature. The fix is to make both values aware: attach a zone to the naive one if you know it (`replace(tzinfo=...)`), and then compare.'
      }),

      B.bug({
        id: 'm6-bug1', t: 1, src: 'rec', q: 'The load stamps each order with the time it was loaded. On the server (set to UTC) the values look fine, and on a developer laptop in Singapore they are eight hours different. Click the line that depends on the machine.',
        file: 'stamp.py', lang: 'python', code: BUG_NOW, bad: [2],
        hint: 'In which zone is `datetime.now()` without an argument?',
        why: '`datetime.now()` returns a naive value in the **local** zone of the machine. The same code gives different values on a UTC server and on a laptop. `datetime.now(timezone.utc)` is aware and the same everywhere. `utcnow()` is no better: it is naive, and deprecated since 3.12.',
        fix: BUG_NOW_FIX,
        cheer: 'Create timestamps as aware UTC values.'
      }),

      B.code({
        id: 'm6-iso', t: 1, src: 'rec', title: 'Parsing timestamps, and the epoch mistake', file: 'iso_parse.py', lang: 'python', code: ISO,
        steps: [
          { say: 'Timestamps arrive as text and as numbers. This file parses four text forms, one with a custom format, and an epoch in seconds and in milliseconds. The output is real.', lines: null },
          { say: '`fromisoformat` reads ISO 8601. Since Python 3.11 it accepts the `Z` suffix and most other ISO forms. A text with an offset gives an aware value. A text without one gives a naive value. Do not mix them.', lines: G.span(ISO, /^for text in/, /print\(f"\{text/) },
          { say: '`strptime` with `%z` reads an offset from a format of your choice, here a day-first date.', lines: G.span(ISO, /^print\("strptime/, /^print\("strptime/) },
          { say: 'An epoch is a count since 1 January 1970 UTC. In **seconds** it gives the right moment.', lines: G.span(ISO, /^seconds = /, /^print\("\\nepoch seconds/) },
          { say: 'In **milliseconds**, which many systems use, it gives a year in the 58,000s, and Python raises `ValueError`. That error is the signal. Dividing by 1,000 first gives the right moment again.', lines: G.span(ISO, /^try:/, /^print\("divide by 1000/) }
        ]
      }),

      B.term({
        id: 'm6-iso-run', t: 1, src: 'rec', title: 'Run it',
        say: 'The real output. Look at the third and fourth lines: a text with no offset parses without complaint, and the value is naive.',
        lines: function () { return G.plain(ISOT, { cmd: 'python iso_parse.py' }); },
        after: 'A date with no time, or a time with no offset, becomes a **naive** value. `fromisoformat` does not warn. Check `tzinfo` yourself, and decide what zone the source meant before you attach one.',
        afterKind: 'tip',
        doneSay: 'Read the zone you were given, and attach the one you know. Never guess it from the machine.'
      }),

      B.quiz({
        id: 'm6-q2', t: 1, src: 'rec',
        q: 'A job reads a column of epoch values and calls `datetime.fromtimestamp(value, timezone.utc)`. It fails with "year must be in 1..9999, not 58169". What is the most likely cause?',
        opts: [
          { t: 'The values are in milliseconds, and the function expects seconds', fb: '' },
          { t: 'The values are in a local time zone', fb: 'A zone would shift the hour, not the year.' },
          { t: 'The values are negative', fb: 'A negative epoch gives a year before 1970, not one in the 58,000s.' },
          { t: 'Python does not support years after 2038', fb: 'Python datetimes go to the year 9999. The recording shows that limit in the message.' }
        ],
        ok: 0, why: 'In the recording, 1,773,476,100 seconds was 14 March 2026, and the same number times 1,000 gave year 58169. A value 1,000 times too large lands in the far future. Divide by 1,000, or detect the unit from the size of the numbers.'
      }),

      B.term({
        id: 'm6-dst', t: 1, src: 'rec', title: 'The hour that does not exist, and the hour that happens twice',
        say: 'Local times around a clock change, from zoneinfo, with time zone data version ' + TZV + '. Read London, New York and Singapore.',
        lines: function () { return G.plain(DSTT, { cmd: 'python zoneinfo_dst.py' }); },
        after: 'On 29 March 2026 the London clocks jump from 01:00 to 02:00, so **01:30 does not exist**. Python still accepts it, and the two values of `fold` give moments **an hour apart**: 00:30 and 01:30 UTC. On 25 October the clocks go back, so **01:30 happens twice**: at 00:30 UTC and again at 01:30 UTC. New York does the same on other dates. Singapore has no change, so every time exists once.',
        afterKind: 'warn',
        doneSay: 'A local time can be missing or doubled. Only a time with its offset, or in UTC, names one moment.'
      }),

      B.widget({ id: 'm6-lab-dst', kind: 'dst', t: 1, src: 'rec', title: 'Lab: local times around a clock change' }),

      B.quiz({
        id: 'm6-q3', t: 1, src: 'rec',
        q: 'A store system in London writes the local time `2026-03-29 01:30` for an order, without an offset. What does the recording say about it?',
        opts: [
          { t: 'That time does not exist: the clocks went from 01:00 to 02:00, so the value is a guess', fb: '' },
          { t: 'It is an ordinary time, and means 01:30 UTC', fb: 'The offset in London changed at 01:00 UTC. The two readings of 01:30 are 00:30 and 01:30 UTC, and neither is a real London wall-clock time.' },
          { t: 'It happens twice, as in October', fb: 'That is the autumn case, when the clocks go back. In March the hour is skipped.' },
          { t: 'Python raises an error when you build it', fb: 'Python accepts the value silently. That is part of the danger.' }
        ],
        ok: 0, why: 'In spring the clocks skip an hour. A system that records wall-clock time cannot produce 01:30 that night, so a value like that comes from a bug or from a conversion. The fix is to store UTC or an offset.'
      }),

      B.quiz({
        id: 'm6-q4', t: 1, src: 'rec',
        q: 'A New York store records `2026-11-01 01:30` with no offset. How many different moments can that mean, and how far apart are they?',
        opts: [
          { t: 'Two, one hour apart: 05:30 UTC and 06:30 UTC', fb: '' },
          { t: 'One, because 01:30 only happens once on a given day', fb: 'On 1 November the clocks go back at 02:00 and 01:00 to 02:00 happens twice.' },
          { t: 'Two, twelve hours apart', fb: 'The repeated hour is a single hour, so the two moments are one hour apart.' },
          { t: 'None, because the time does not exist', fb: 'That is the March case. In November the hour is repeated, not skipped.' }
        ],
        ok: 0, why: 'In the recording `fold=0` gave 05:30 UTC (still daylight time, UTC-4) and `fold=1` gave 06:30 UTC (standard time, UTC-5). Without the offset, the data cannot say which, and an hourly report can double count or lose an hour.'
      }),

      B.code({
        id: 'm6-days', t: 1, src: 'rec', title: 'Which day is an order on?', file: 'day_buckets.py', lang: 'python', code: DAY,
        steps: [
          { say: 'Five orders with UTC timestamps. The Singapore store wants a report per day. The output is real.', lines: null },
          { say: 'Counting by the **UTC date** puts four orders on 14 March and one on 15 March.', lines: G.span(DAY, /^print\("orders per day by the UTC/, /^print\("orders per day by the UTC/) },
          { say: 'Singapore is UTC+8. Converting first with `astimezone` and then taking the date gives **two** orders on 14 March and **three** on 15 March. The same data, a different report.', lines: G.span(DAY, /^print\("orders per day by Singapore/, /^print\("orders per day by Singapore/) },
          { say: 'London on 29 March: midnight to the next midnight. Subtracting two aware values that share a zone ignores the clock change and says **1 day**. Convert both to UTC first and the answer is **23 hours**.', lines: G.span(DAY, /^london = /, /^print\("the same two moments/) }
        ]
      }),

      B.term({
        id: 'm6-days-run', t: 1, src: 'rec', title: 'Run it',
        say: 'The real output of `day_buckets.py`. The same five orders make two different reports.',
        lines: function () { return G.plain(DAYT, { cmd: 'python day_buckets.py' }); },
        after: 'By the UTC date, the orders split 4 and 1. By the Singapore calendar they split 2 and 3. In London the end of 29 March is `+01:00`, and the same two moments are **23 hours** apart in UTC, while the two aware values in the same zone say `1 day`.',
        afterKind: 'warn',
        doneSay: 'Pick the calendar first. Then count.'
      }),

      B.quiz({
        id: 'm6-q5', t: 1, src: 'rec',
        q: 'Per the recording, how many of the five orders belong to 14 March in the Singapore store\'s own calendar?',
        opts: [
          { t: '2', fb: '' },
          { t: '4, the count by the UTC date', fb: 'That counts by the UTC calendar. Singapore is eight hours ahead, so two of those orders happened on 15 March there.' },
          { t: '3', fb: 'Three is the count for 15 March in Singapore.' },
          { t: '5, because all five happened on or around that day', fb: 'A report by day must choose a calendar, and each calendar gives a different split.' }
        ],
        ok: 0, why: 'The two orders at 03:00 and 15:59 UTC are 11:00 and 23:59 in Singapore. The order at 16:01 UTC is 00:01 on 15 March there. "Per day" always means "per day in some zone".'
      }),

      B.bug({
        id: 'm6-bug2', t: 1, src: 'rec', q: 'The daily report for the Singapore store is built from UTC timestamps. Finance says the evening orders land on the wrong day. Click the line that decides the day.',
        file: 'report.py', lang: 'python', code: BUG_DAY, bad: [4],
        hint: 'Whose calendar does `.date()` use on an aware UTC value?',
        why: '`.date()` on a UTC value gives the UTC date. In the recording that put four orders on 14 March when the store counted two. Convert to the store\'s zone with `astimezone` first, then take the date.',
        fix: BUG_DAY_FIX,
        cheer: 'Convert to the zone of the report, then take the date.'
      }),

      B.cmp({
        id: 'm6-rules', t: 1, src: 'docs', title: 'Six rules for time in a pipeline',
        say: 'These rules prevent most time bugs. Press Next to read each one and the recording behind it.',
        cols: ['Rule', 'Why', 'Seen in this mission'],
        hl: 2,
        rows: [
          ['Create aware values: `datetime.now(timezone.utc)`', 'A naive value hides its zone and depends on the machine.', 'The laptop and the server disagreed by eight hours.'],
          ['Store UTC, or an offset, or a timestamp-with-zone column', 'It names one moment. Local wall-clock time can be missing or doubled.', 'London 01:30 does not exist on 29 March, and happens twice on 25 October.'],
          ['Keep the zone name, such as `Asia/Singapore`, if you need local rules later', 'An offset of +08:00 does not say what the rules will do next year. The name does.', 'Offsets differ across the year in London and New York.'],
          ['Convert to local time only at the edge', 'Reports and screens need a calendar. Joins and sorts do not.', 'Four orders on 14 March by UTC, two by the Singapore calendar.'],
          ['Parse with a real parser, and check units', '`fromisoformat` handles `Z` and offsets since 3.11. An epoch has a unit.', 'Milliseconds read as seconds gave year 58169.'],
          ['Use `zoneinfo`, not a hand-made offset', 'The standard library reads the IANA database, which is updated when governments change the rules. On systems without the database, the `tzdata` package supplies it.', 'This mission used tzdata ' + TZV + '.']
        ],
        steps: [
          { upto: 3, say: 'Create, store and name: aware values, UTC at rest, and the zone name when you need it.' },
          { upto: 6, say: 'Convert at the edge, parse carefully, and let the standard library own the rules.' }
        ],
        pick: 'In one line: **UTC in the tables, a zone name on the side, local time only on the screen.**'
      }),

      B.code({
        id: 'm6-money', t: 1, src: 'rec', title: 'Money in a float, a Decimal and cents', file: 'money.py', lang: 'python', code: MON,
        steps: [
          { say: 'The same sum in four ways, and four ways to round a half. The output is real.', lines: null },
          { say: '`0.1 + 0.2` is `0.30000000000000004`. A float is stored in binary, and 0.1 has no exact binary form. The long number on the next line is what the float `0.1` really holds.', lines: G.span(MON, /^print\("0\.1 \+ 0\.2 =/, /^print\("the float 0\.1/) },
          { say: 'A `Decimal` made from **text** is exact. A `Decimal` made from a float inherits the float\'s error, so never write `Decimal(0.1)`.', lines: G.span(MON, /^print\("the float 0\.1/, /^print\("the Decimal from text/) },
          { say: 'Adding 0.10 a million times in a float loop gives `100000.00000133288`. `math.fsum` is exact here, and so are `Decimal` and whole cents.', lines: G.span(MON, /^n = /, /whole cents/) },
          { say: '`round(2.675, 2)` gives 2.67, because the float is a little below 2.675.', lines: G.span(MON, /^print\("\\nrounding/, /^print\("  round\(2\.675/) },
          { say: '`Decimal.quantize` takes the rounding rule as an argument. `ROUND_HALF_EVEN`, `ROUND_HALF_UP` and `ROUND_DOWN` can give different answers for the same value. The rule is a business decision. Write it in the code.', lines: G.span(MON, /^for mode in/, /print\(f"  Decimal/) },
          { say: 'The built-in `round` on a tie goes to the even number: `round(2.5)` is 2 and `round(3.5)` is 4.', lines: G.span(MON, /^print\("  round\(2\.5\)/, /^print\("  round\(2\.5\)/) }
        ]
      }),

      B.term({
        id: 'm6-money-run', t: 1, src: 'rec', title: 'Run it',
        say: 'The real output of `money.py`, from Python ' + G.meta('python') + '. Read the loop and the rounding lines.',
        lines: function () { return G.plain(MONT, { cmd: 'python money.py' }); },
        after: 'A float loop of a million additions drifted to `100000.00000133288`. `math.fsum`, `Decimal` and whole cents did not. And `round(2.675, 2)` gave 2.67 while `Decimal("2.675")` gave 2.68 with half even and half up, because the float 2.675 is stored a little below the tie.',
        afterKind: 'warn',
        doneSay: 'Money is exact or it is wrong. A float is never exact.'
      }),

      B.widget({ id: 'm6-lab-money', kind: 'money', t: 1, src: 'rec', title: 'Lab: float, Decimal and cents' }),

      B.quiz({
        id: 'm6-q6', t: 1, src: 'rec',
        q: 'A job adds the price 0.10 one million times in a float loop, and compares the total with 100,000. In the recording, what is the float total?',
        opts: [
          { t: S1M.float, fb: '' },
          { t: '100000.0, exactly', fb: 'That is the result of `math.fsum`, which tracks the lost digits. The plain loop drifted.' },
          { t: '99999.99999999', fb: 'The error was in the other direction: the float total ended slightly above 100,000.' },
          { t: '100000.00', fb: 'That is the `Decimal` result. A float has no fixed number of decimals.' }
        ],
        ok: 0, why: 'Every addition rounds a little, and a million of them add up to a visible error. `total == 100000` is `False`. With cents as integers, or with `Decimal`, the sum is exact.'
      }),

      B.quiz({
        id: 'm6-q7', t: 1, src: 'rec',
        q: 'Finance rounds the price 2.675 to two places with "half up" and gets 2.68. A script uses `round(2.675, 2)`. What does the recording show?',
        opts: [
          { t: '2.67: the float 2.675 is stored a little below 2.675, so it rounds down', fb: '' },
          { t: '2.68, the same as finance', fb: 'The recording printed 2.67 for `round(2.675, 2)`.' },
          { t: '2.7', fb: '`round` to two places keeps two places.' },
          { t: 'An error, because the value is a tie', fb: 'No error is raised. A tie goes to the even digit, and here the float is not a tie.' }
        ],
        ok: 0, why: 'The float is 2.67499999999999982..., so `round` gives 2.67. The `Decimal` built from the text "2.675" is an exact tie, and ROUND_HALF_UP gives 2.68. Money should live in `Decimal` or cents so that the rounding rule is yours, not an accident of binary.'
      }),

      B.cmp({
        id: 'm6-types', t: 1, src: 'docs', title: 'Types for money',
        say: 'Four places hold money in a pipeline. Press Next to read the strengths and the traps of each.',
        cols: ['Type', 'Exact?', 'Good for', 'Watch for'],
        hl: 2,
        rows: [
          ['float', 'No', 'Measurements: distances, temperatures, scores.', 'A sum of prices is off by a visible amount, as the million additions showed.'],
          ['Decimal from text', 'Yes', 'Prices, taxes, anything the books must match to the cent.', 'Slower than float. `Decimal(0.1)` keeps the float\'s error: always build it from a string.'],
          ['Integer cents', 'Yes', 'Storage and fast arithmetic. Arrow and Parquet decimals work the same way inside.', 'You must remember the scale. Currencies with no minor unit or three decimals need care.'],
          ['Database `numeric(12,2)`', 'Yes', 'The warehouse and the ledger.', 'A driver may give you a float back. Ask for `Decimal`, as the next missions show.']
        ],
        steps: [
          { upto: 2, say: 'Float for measurements, Decimal for money you handle in Python.' },
          { upto: 4, say: 'Cents and numeric columns keep the amounts exact at rest. Convert to Decimal at the edges.' }
        ],
        pick: 'Hold money as **integer cents** or **Decimal from text**, never as a float. For JSON, send the amount as a string or as cents, or read it with `json.loads(text, parse_float=Decimal)`.'
      }),

      B.bug({
        id: 'm6-bug3', t: 1, src: 'rec', q: 'The reconciliation adds up an order file and compares the total with the ledger. It reports a difference of a fraction of a cent on large files. Click the line that introduces the error.',
        file: 'reconcile.py', lang: 'python', code: BUG_FLOAT, bad: [3],
        hint: 'What type holds the running total?',
        why: 'Each `float(row["total"])` is slightly off, and the running float total drifts, as the million additions showed: `100000.00000133288`. Read the amounts as `Decimal` from the text and add `Decimal`s. The comparison is then exact.',
        fix: BUG_FLOAT_FIX,
        cheer: 'Money from text to Decimal, never through a float.'
      }),

      B.challenge({
        id: 'm6-ch1', t: 1, lang: 'python', file: 'normalize_timestamps.py',
        q: '**Coding round: one UTC format.** A partner sends timestamps in three shapes: ISO text with `Z`, ISO text with an offset, ISO text with **no** offset (in the store\'s own zone), and sometimes a number of epoch seconds. Write `to_utc(value, default_zone)` that returns an ISO 8601 string in UTC ending in `Z`.',
        data: [{ name: 'samples (the default zone is Asia/Singapore)', cols: ['value'], rows: [['2026-03-14T08:15:00Z'], ['2026-03-14T16:15:00+08:00'], ['2026-03-14 16:15:00'], ['1773476100']] }],
        starter: 'from datetime import datetime, timezone\nfrom zoneinfo import ZoneInfo\n\ndef to_utc(value, default_zone):\n    ...',
        hints: ['A number is an epoch: `datetime.fromtimestamp(value, timezone.utc)`.', 'Text goes through `datetime.fromisoformat`. If the result has no `tzinfo`, attach the default zone with `replace(tzinfo=ZoneInfo(...))`.', 'Finish with `astimezone(timezone.utc)` and format it. Replace `+00:00` with `Z`.'],
        sol: NORMFN,
        res: { msg: 'tests passed in the recording', cols: ['input', 'UTC'], rows: NORMROWS },
        expl: ['All four inputs name the same moment, 08:15 UTC, and the function returns the same string for all of them.', 'A zone is attached only when the text has none, using the zone the **source** lives in. A wrong default is a silent error, so log how many values used it.', 'The summer-time test, 12:00 in London on 1 July, gives 11:00Z: London is UTC+1 then. A fixed offset would get this wrong.'],
        cx: 'O(1) per value. Parsing dominates.'
      }),

      B.challenge({
        id: 'm6-ch2', t: 2, lang: 'python', file: 'local_days.py',
        q: '**Coding round: local days.** Write `orders_per_local_day(utc_times, zone)` that returns a dict from local date to the number of orders, in date order, and `hours_in_local_day(day, zone)` that returns the real number of hours in that local day (23 on a spring change day, 25 on an autumn one).',
        data: [{ name: 'order times, in UTC', cols: ['utc time'], rows: [['2026-03-28 23:30'], ['2026-03-29 00:30'], ['2026-03-29 22:59'], ['2026-03-29 23:01']] }],
        starter: 'from datetime import datetime, timedelta, timezone\nfrom zoneinfo import ZoneInfo\n\ndef orders_per_local_day(utc_times, zone):\n    ...\n\ndef hours_in_local_day(day, zone):\n    ...',
        hints: ['Convert each time with `astimezone(ZoneInfo(zone))` and take `.date()`.', 'Count with `collections.Counter`, then sort by date.', 'For the length of a day, build local midnight and the next local midnight with `timedelta(days=1)`, then subtract them **in UTC**.'],
        sol: LOCALFN,
        res: { msg: 'tests passed in the recording; hours in the London days: 24, ' + HOURS + ' and ' + HOURS_AUTUMN, cols: ['zone', 'orders per local day'], rows: LOCALROWS },
        expl: ['London is on UTC until 01:00 UTC on 29 March and on UTC+1 after it. The order at 23:30 UTC on the 28th is 23:30 in London, and the order at 23:01 UTC on the 29th is 00:01 on the 30th.', 'Singapore has no clock change, so its day always runs 16:00 UTC to 16:00 UTC.', 'Adding `timedelta(days=1)` to an aware value moves the **wall clock** by a day. Subtracting in UTC then shows the real length: ' + HOURS + ' hours on the spring change day.'],
        cx: 'O(n) over the orders and O(1) per day.'
      }),

      B.order({
        id: 'm6-order', t: 1, src: 'docs', q: 'Put the steps in order for handling a timestamp from a store system without an offset.',
        items: ['Read the text and the store\'s zone name (`Asia/Singapore`)', 'Attach that zone to the naive value', 'Convert the aware value to UTC', 'Store the UTC value, and keep the zone name in its own column', 'Convert to the store\'s zone only when a report needs a local day'],
        why: 'The zone is attached as soon as it is known, and the moment is stored in UTC. The zone name stays beside it, so the local day can be rebuilt later, even if the rules change.',
        cheer: 'Say it as: attach, convert, store, keep the name, convert at the edge.'
      }),

      B.decide({
        id: 'm6-decide', t: 2, src: 'rec', title: 'Decision: what do you store for an order time?',
        scenario: 'Brewline has stores in Singapore, Kuala Lumpur and London. Each store system sends local wall-clock times without an offset. Reports are by local day for each store. The recording showed **' + LON_GAP.local + ' in London does not exist** and **' + LON_AMB.local + ' happens twice**, and that four orders fall on 14 March by the UTC date and two by the Singapore calendar.',
        opts: [
          { t: 'Store the local time as it arrives', d: 'Simple. It matches what the store saw.', lose: 'Two stores in different zones cannot be ordered, and the London data has an hour that does not exist and an hour that is doubled.' },
          { t: 'Store UTC, plus the zone name of the store, and convert to the local day for reports', d: 'One moment per row, and the local calendar can be rebuilt.', lose: '' },
          { t: 'Store UTC only, and drop the zone', d: 'One moment per row. Everything sorts and joins.', lose: 'A report by store day needs the store\'s zone. Without the name you must keep a lookup elsewhere, and it can drift.' },
          { t: 'Store an offset such as +08:00 instead of a zone name', d: 'It names one moment.', lose: 'It cannot tell what the rules will do next month. London\'s offset changes twice a year.' }
        ],
        pick: 1,
        why: 'UTC gives you one moment that sorts and joins. The zone name lets you build the local day on demand, and it follows the rules when a government changes them. Neither alone covers both needs.',
        when: 'If every store is in one zone with no daylight saving, and that will never change, UTC with the zone documented in the schema can be enough. For an hourly system that cannot lose or double an hour, never store local time.'
      }),

      B.incident({
        id: 'm6-inc', t: 2, src: 'rec', title: 'Incident: Singapore revenue is "wrong" by a day', time: '10:05',
        alert: 'Finance says the Singapore daily revenue does not match the till reports. On busy days the report shows more orders on the earlier day than the tills do. The load job and its tests are green.',
        clues: ['The report groups orders by `ordered_at.date()`.', '`ordered_at` is stored in UTC.', 'Singapore is UTC+8. The tills close at midnight local time.'],
        opts: [
          { t: 'Compare a few orders near midnight by their UTC time, their Singapore time and the date that the report gave them', fb: '' },
          { t: 'Add eight hours to every `ordered_at` in the table', fb: 'It corrupts the stored moment, and it breaks the other stores and the part of the data that is already right.' },
          { t: 'Round the revenue to the nearest hundred', fb: 'It hides the difference. It does not fix the days.' },
          { t: 'Tell finance that the tills are wrong', fb: 'In the recording the day count changed with the calendar, not with the tills.' }
        ],
        best: 0, why: 'The recording had four orders on 14 March by the UTC date and two by the Singapore calendar. Looking at one order near midnight shows the cause in a minute: `date()` takes the UTC calendar.',
        checks: [
          ['Pick an order at 16:01 UTC and look at its local time', 'It is 00:01 on the next day in Singapore, and the report puts it on the earlier UTC day.'],
          ['Read how the report builds the day', '`.date()` on an aware UTC value gives the UTC date.'],
          ['Convert to the store\'s zone before taking the date', '`ordered_at.astimezone(ZoneInfo("Asia/Singapore")).date()`.'],
          ['Check the other stores', 'Each store needs its own zone. London also has days of 23 and 25 hours.'],
          ['Add a test with orders at 15:59 and 16:01 UTC', 'They must fall on different Singapore days.']
        ],
        tell: 'Finance said the Singapore daily revenue was off by a day on busy evenings. The report took the date of the UTC timestamp, and Singapore is eight hours ahead, so orders after 16:00 UTC belonged to the next local day. In a test, an order at 15:59 UTC and one at 16:01 UTC landed on the same UTC day and on different local days. I converted to the store zone before taking the date, stored the zone name for each store, and added a test with orders on both sides of local midnight.',
        prevent: ['Report days are always built in the zone of the report, from UTC values.', 'Each store has a zone name in its record.', 'A test has orders on both sides of local midnight, and on a clock-change day.', 'Dates in reports state their zone in the title.']
      }),

      B.qa({
        id: 'qa-aware', t: 1, tag: 'Dates', secs: 60,
        q: 'What is the difference between a naive and an aware datetime, and which do you use in a pipeline?',
        pts: ['Naive: no time zone, a clock reading. Aware: has an offset or zone, a moment', 'Comparing them raises TypeError', 'Use aware values, created with datetime.now(timezone.utc)', 'utcnow() returns a naive value and is deprecated'],
        short: 'A naive datetime has no time zone, so it is only a clock reading that depends on where you stand. An aware datetime carries an offset or a zone, so it names one moment. Python refuses to compare the two: in a recording it raised `TypeError: can\'t compare offset-naive and offset-aware datetimes`. In a pipeline I use aware values everywhere, created with `datetime.now(timezone.utc)`, and I store UTC. I avoid `utcnow()`, because it returns a naive value in UTC and has been deprecated since Python 3.12. When data arrives without a zone, I attach the zone of the source system and then convert to UTC.',
        fu: [['How do you attach a zone to a naive value?', '`replace(tzinfo=ZoneInfo("Asia/Singapore"))`. `astimezone` on a naive value assumes the machine\'s zone, so I avoid it there.'], ['What does astimezone do?', 'It converts an aware value to another zone and keeps the same moment.']],
        trap: 'Calling `datetime.now()` and "hoping the server is UTC".',
        real: 'Describe a bug that came from a naive timestamp.'
      }),

      B.qa({
        id: 'qa-utc', t: 1, tag: 'Dates', secs: 60,
        q: 'Why store timestamps in UTC, and when do you convert to local time?',
        pts: ['UTC names one moment, so values sort and join across zones', 'Local wall-clock time can be skipped or repeated', 'Keep the zone name when local days matter', 'Convert at the edge: reports and screens'],
        short: 'UTC names one moment, so values from different stores sort, join and subtract correctly. Local wall-clock time cannot do that: in a recording London 01:30 on 29 March did not exist, and 01:30 on 25 October happened twice, an hour apart in UTC. So I store UTC, and I keep the IANA zone name of the source next to it when local days matter, because a report per store day needs the store\'s calendar: the same five orders were four on one day by the UTC date and two by the Singapore calendar. I convert to local time only at the edge, in the report or on the screen.',
        fu: [['Why the zone name and not the offset?', 'The offset is correct for one moment. The name carries the rules, so you can compute the right offset for any other date, including after a rule change.'], ['What about a future appointment?', 'Store the local time and the zone name, because a government may change the offset before the day arrives.']],
        trap: 'Storing local time "because the business thinks in local time". The business also thinks about reports, which you can build from UTC.',
        real: 'Describe how your tables hold time.'
      }),

      B.qa({
        id: 'qa-dst', t: 2, tag: 'Dates', secs: 60,
        q: 'What goes wrong around a daylight saving change, and how do you protect a pipeline?',
        pts: ['One hour is skipped, one is repeated', 'A day has 23 or 25 hours', 'Wall-clock times become guesses or ambiguous', 'UTC at rest, zone-aware conversion, tests on change days'],
        short: 'Twice a year the local clock skips an hour or repeats one. A local time in the skipped hour does not exist, and one in the repeated hour is ambiguous. Python accepts both and lets `fold` choose between two moments an hour apart: in a recording London 01:30 on 25 October was 00:30 UTC and 01:30 UTC. Days also have 23 or 25 hours, so an hourly average per day or a "last 24 hours" window changes length. I protect a pipeline by storing UTC, converting with `zoneinfo`, never adding a fixed offset by hand, and by adding tests with data on the two change days for every zone that I serve.',
        fu: [['Does every country change its clocks?', 'No. Singapore and India do not, and some places shift by 30 minutes, like Lord Howe Island. That is why you use the database and not a rule of thumb.'], ['How does a job that runs at 02:30 local time behave?', 'On the spring change day it does not run or runs at a shifted time, and on the autumn day it can run twice. Schedule in UTC, or say what you expect.']],
        trap: 'Saying "I use pytz and it handles it". Say what you do about the missing and the repeated hour.',
        real: 'Tell what your jobs did on the last change day.'
      }),

      B.qa({
        id: 'qa-decimal', t: 1, tag: 'Money', secs: 60,
        q: 'Why should money never be a float, and what do you use instead?',
        pts: ['A float is binary and cannot hold 0.1 exactly', 'Errors add up: a visible drift over many additions', 'Decimal from a string, or integer cents', 'Never Decimal(0.1): build from text'],
        short: 'A float is stored in binary, and a decimal fraction like 0.1 has no exact binary form. `0.1 + 0.2` gives `0.30000000000000004`, and in a recording a million additions of 0.10 gave `100000.00000133288` instead of 100,000. A total that is off by a hair fails an equality check against the ledger. I hold money as `Decimal` built from text, or as integer cents, which is exact and fast. `Decimal(0.1)` keeps the error of the float, so I always pass a string. In the database I use `numeric`, and in Arrow or Parquet a decimal type.',
        fu: [['When is a float fine?', 'For measurements where a tiny error does not matter: distances, temperatures, scores, and many machine learning features.'], ['How do you read money from JSON?', 'JSON numbers parse to floats by default. Use `json.loads(text, parse_float=Decimal)`, or send the amount as a string or in cents.']],
        trap: 'Rounding the float at the end and saying that it is fixed. Rounding hides the drift and does not remove it.',
        real: 'Describe a reconciliation that went wrong because of a float.'
      }),

      B.qa({
        id: 'qa-rounding', t: 2, tag: 'Money', secs: 60,
        q: 'A report has to round money to two places. What do you have to decide?',
        pts: ['Which rule: half up, half even, down', 'Python round() goes to the even number, on the binary value', 'Decimal.quantize takes the rule', 'Round once, at the end, not in each step'],
        short: 'I have to decide the rule, and write it in the code, because it is a business decision. Half up always rounds a tie away from zero. Half even rounds a tie to the even digit, which avoids a bias when you round many values. In a recording `round(2.675, 2)` gave 2.67, since the float is a little below 2.675, and `Decimal("2.675")` gave 2.68 with half up and with half even. `round(2.5)` gave 2 and `round(3.5)` gave 4. So I use `Decimal.quantize` with an explicit rounding argument, I round once at the end and not at every step, and I add a test with ties.',
        fu: [['What if the rule differs between countries?', 'Make it a parameter of the report, test each rule, and say which one a report uses in its header.'], ['What about tax and discounts?', 'Rounding each line and rounding the sum can differ by a cent. The finance owner decides which comes first.']],
        trap: 'Using `round(x, 2)` on a float and calling it exact.',
        real: 'Say which rounding rule your reports use, and who decided it.'
      }),

      B.qa({
        id: 'qa-zoneinfo', t: 3, tag: 'Dates', secs: 60,
        q: 'How do you handle time zones in Python: zoneinfo, pytz or fixed offsets?',
        pts: ['zoneinfo is in the standard library and reads the IANA database', 'pytz has a different, error-prone API (localize)', 'A fixed offset knows nothing about rule changes', 'tzdata package where the OS has no database'],
        short: 'I use `zoneinfo`, which is in the standard library since Python 3.9 and reads the IANA time zone database, so I get the correct rules for any date. It works with the normal datetime API: I attach a zone with `replace(tzinfo=ZoneInfo(...))` or convert with `astimezone`. `pytz` is older and needs its own `localize` and `normalize` calls, which people get wrong. A fixed `timezone(timedelta(hours=8))` is right for one place with no rules, and wrong the moment a rule changes. On systems without a database, like Windows, I install the `tzdata` package. And I keep that package updated, because governments change the rules.',
        fu: [['How do you test a time zone rule?', 'With data on the clock-change days, for each zone you serve, and I print the offsets, as the recording does.'], ['Can the database be stale?', 'Yes. A rule change that is not in your `tzdata` version gives wrong offsets. Update it with the rest of the dependencies.']],
        trap: 'Hardcoding +8 for Singapore "because it never changes". It does not, and London does.',
        real: 'Say which zones your pipeline serves and how you test them.'
      }),

      B.recap({
        id: 'm6-recap', n: 6, badge: 'Clock Keeper', color: '#DDD6FE',
        pts: [
          'A **naive** datetime has no zone and cannot be compared with an **aware** one. Create `datetime.now(timezone.utc)`, never `utcnow()`.',
          'Store **UTC**, keep the **zone name**, and convert to local time only at the edge. Four orders were on 14 March by the UTC date and **two** by the Singapore calendar.',
          'In London **' + LON_GAP.local + ' does not exist** and **' + LON_AMB.local + ' happens twice**, an hour apart in UTC. A London day has **' + HOURS + '** or **' + HOURS_AUTUMN + '** hours on the change days.',
          'A float loop of a million additions of 0.10 gave **' + S1M.float + '**. Use `Decimal` from text or integer cents. `Decimal(0.1)` keeps the float\'s error.',
          '`round(2.675, 2)` gave **2.67** and Decimal half up gave **2.68**. Write the rounding rule in the code.'
        ],
        lines: [
          'I store UTC and I keep the zone name for local days.',
          'I never use a float for money, and I say which rounding rule my code uses.',
          'I test the two clock-change days for every zone I serve.'
        ]
      })
    ]
  });
})();
