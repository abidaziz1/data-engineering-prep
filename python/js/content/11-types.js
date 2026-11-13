/* Mission 11: types, validation and data contracts. Real results from mypy, pydantic and small programs. */
(function () {
  var B = LAB.b, G = LAB.get;
  var THF = G.file('m11/type_hints.py'), BTF = G.file('m11/bad_types.py'), DPF = G.file('m11/dataclass_vs_pydantic.py'), VQF = G.file('m11/validate_or_quarantine.py'), SVF = G.file('m11/split_valid.py'), CCF = G.file('m11/contract_check.py');
  var THT = G.text('m11/type_hints.py'), MYT = G.text('m11/mypy'), DPT = G.text('m11/dataclass_vs_pydantic.py'), VQT = G.text('m11/validate_or_quarantine.py'), SVT = G.text('m11/split_valid.py'), CCT = G.text('m11/contract_check.py');
  var VD = G.counts('m11.validate');

  function blk(file, name) { var a = G.at(file, new RegExp('^def ' + name + '\\(')), l = file.split('\n'), b = a; while (b < l.length && l[b] !== '') b++; return [a, b]; }
  function fn(file, name) { var r = blk(file, name); return G.lines(file, r[0], r[1]); }
  function last(file) { return file.replace(/\n+$/, '').split('\n').length; }
  function cell(m, p) { return VD.cells[m][p]; }

  G.expect(/the hint says int, and we got: '12\.5012\.5012\.50'/.test(THT) && /a dataclass accepts anything: Order\(order_id=17, total_cents='12\.50'\)/.test(THT) && /the types of the fields: int str/.test(THT), 'a hint does not stop a wrong type at run time');
  G.expect(/bad_types\.py:5: error: Incompatible return value type \(got "float", expected "int"\)/.test(MYT) && /bad_types\.py:9: error: Incompatible return value type \(got "str \| None", expected "str"\)/.test(MYT) && /bad_types\.py:16: error: Argument 1 to "load" has incompatible type "int"; expected "str"/.test(MYT) && /Found 4 errors in 1 file/.test(MYT), 'mypy found four errors in three places');
  G.expect(/a row of text, converted: 2 1250 2026-03-14T08:15:00/.test(DPT) && /^5 errors:/m.test(DPT) && /strict mode on text from a CSV: 3 errors, the first is qty -> Input should be a valid integer/.test(DPT), 'pydantic converts text, reports five errors for the bad row, and strict mode refuses text');
  G.expect(/read 10 rows: 6 good, 4 in quarantine/.test(VQT) && /line  4 O-3 +store: Input should be 'London' or 'Singapore'/.test(VQT) && /line  8 O-7 +qty: Input should be greater than or equal to 1/.test(VQT) && /line 10 O-8 +order_id: already seen in this file/.test(VQT) && /status: loaded 6 rows, 40% in quarantine \(limit 50%\)/.test(VQT), 'six good rows and four in quarantine');
  var LX = 'lax', ST = 'strict', FB = 'forbid extra columns', P0 = VD.policies[0], P20 = VD.policies[1], P50 = VD.policies[2], PD = VD.policies[3];
  G.expect(cell(LX, P20).loaded === 0 && /^failed: 40%/.test(cell(LX, P20).status) && cell(LX, P50).loaded === 6 && cell(LX, PD).dropped === 4 && /^success/.test(cell(LX, PD).status) && cell(ST, PD).loaded === 0 && cell(ST, PD).dropped === 10 && cell(FB, P50).loaded === 5, 'the lab cases: a 20 percent limit fails, a 50 percent limit loads six, silence drops four, strict drops all ten, forbidding extra columns loads five');
  G.expect(/tests passed$/.test(SVT) && /tests passed$/.test(CCT) && /over the limit: 2 of 10 rows are bad/.test(SVT) && /a renamed column: \[\('missing', 'total_cents'\), \('new', 'total'\)\]/.test(CCT), 'both coding rounds pass');

  var BUG_COERCE = ['df = pd.read_csv("orders.csv", dtype=str)', 'df["total_cents"] = pd.to_numeric(df["total_cents"], errors="coerce")', 'df = df.dropna(subset=["total_cents"])', 'load(df)'].join('\n');
  var BUG_COERCE_FIX = ['df = pd.read_csv("orders.csv", dtype=str)', 'df["total_num"] = pd.to_numeric(df["total_cents"], errors="coerce")', 'bad = df[df["total_num"].isna()]', 'if len(bad) / len(df) > 0.05:', '    raise RuntimeError(f"{len(bad)} rows have a bad total_cents")', 'bad.to_csv("quarantine/orders_bad.csv", index=False)', 'df = df.drop(columns="total_cents").rename(columns={"total_num": "total_cents"}).dropna(subset=["total_cents"])', 'load(df)'].join('\n');
  var SVROWS = SVT.split('\n').filter(function (l) { return l.indexOf(':') > 0 && l !== 'tests passed'; }).map(function (l) { var i = l.indexOf(':'); return [l.slice(0, i), l.slice(i + 2)]; });
  var CCROWS = CCT.split('\n').filter(function (l) { return l.indexOf(':') > 0 && l !== 'tests passed'; }).map(function (l) { var i = l.indexOf(':'); return [l.slice(0, i), l.slice(i + 2)]; });

  LAB.addChapter({
    id: 'm11', n: 11, title: 'Types, validation and data contracts', short: 'Types', blurb: 'Check data at the boundary, and set aside what fails', minutes: 32,
    focus: ['ing', 'stg'],
    goals: [
      'Say what a **type hint** checks (nothing at run time) and what **mypy** checks (the code, before it runs).',
      'Use a **pydantic** model to check and convert rows at the boundary, and read its errors.',
      'Send bad rows to **quarantine** with a reason, and **fail the run** above a limit.',
      'Explain why **dropping bad rows silently** is the worst choice.',
      'Write a **data contract** as code and report **schema drift**.'
    ],
    say: 'Mission 11 is about the moment data enters your code. A CSV file is all text, a partner changes a column without telling you, and Python accepts all of it. You will see a type hint do nothing, mypy catch four mistakes before the code runs, pydantic check a row and name every problem, and a loader that quarantines bad rows. Every output is a real run, with mypy ' + G.meta('mypy') + ' and pydantic ' + G.meta('pydantic') + '.',
    scenes: [
      B.talk({
        id: 'm11-talk', t: 1, src: 'docs', title: 'Python does not check your data',
        say: 'Press Next for four ideas that separate code from data.',
        items: [
          ['Type hints are notes', 'A hint such as `qty: int` tells a reader and a tool what you meant. Python does not enforce it when the program runs.', 'Notes, not rules.'],
          ['mypy checks the code', 'A type checker reads the code and the hints, and finds mismatches **before** the program runs. It cannot see what a file contains.', 'Checks code.'],
          ['Validation checks the data', 'A library such as pydantic checks real values at run time: it converts what it can and reports what it cannot, at the boundary where data comes in.', 'Checks data.'],
          ['Bad rows need a place', 'A row that fails is not dropped. It goes to quarantine with the line number and the reason, and the run fails when too many are bad.', 'Set aside, do not drop.']
        ],
        cols: 2
      }),

      B.code({
        id: 'm11-hints', t: 1, src: 'rec', title: 'A hint does not stop a wrong value', file: 'type_hints.py', lang: 'python', code: THF,
        steps: [
          { say: 'A function whose hints say `str`, `int` and `-> int`, and a dataclass with typed fields. Both get wrong values. The output is real.', lines: null },
          { say: 'The hints say that it takes a text price and a whole quantity and returns an `int`. The body multiplies the text.', lines: blk(THF, 'total_in_cents') },
          { say: 'Python runs it without a complaint. `"12.50" * 3` is a legal expression that repeats the text.', lines: G.span(THF, /^print\("the hint says/, /^print\("the hint says/) },
          { say: 'A dataclass declares typed fields.', lines: G.span(THF, /^@dataclass/, /total_cents: int/) },
          { say: 'And it accepts a number for the id and a text for the total. Nothing is checked.', lines: [G.at(THF, /^order = Order/), last(THF)] }
        ]
      }),

      B.term({
        id: 'm11-hints-run', t: 1, src: 'rec', title: 'Run it',
        say: 'The real output of `type_hints.py`.',
        lines: function () { return G.plain(THT, { cmd: 'python type_hints.py' }); },
        after: 'The function that promised an `int` returned the text **`12.5012.5012.50`**, and the dataclass stored an `int` in a field that is typed `str`, and a `str` in one typed `int`. No error. Hints are for people and tools, and they do not change what runs.',
        afterKind: 'warn',
        doneSay: 'A hint is a promise that nobody enforces.'
      }),

      B.quiz({
        id: 'm11-q1', t: 1, src: 'rec',
        q: '`total_in_cents(price: str, qty: int) -> int` was called with `("12.50", 3)`. What happened, according to the recording?',
        opts: [
          { t: 'It returned the text \'12.5012.5012.50\', with no error', fb: '' },
          { t: 'It raised a TypeError, because the hint says int', fb: 'Python does not read the hints when it runs the code.' },
          { t: 'It returned 37.5', fb: 'The body multiplies a text by an integer, which repeats the text.' },
          { t: 'It returned 12', fb: 'Nothing converts the result to an int.' }
        ],
        ok: 0, why: 'A text multiplied by 3 is the text three times. The `-> int` hint did not stop it. A type checker reads the hints before the run, and a validation library checks values while it runs. Plain Python does neither.'
      }),

      B.code({
        id: 'm11-mypy', t: 1, src: 'rec', title: 'Three mistakes that mypy finds first', file: 'bad_types.py', lang: 'python', code: BTF,
        steps: [
          { say: 'A small file with three mistakes. It is never run: mypy only reads it. The output of mypy is on the next screen.', lines: null },
          { say: 'The `/` in Python always returns a float, but the hint promises an `int`.', lines: G.span(BTF, /return price_cents \* qty/, /return price_cents \* qty/) },
          { say: '`dict.get` returns `None` when the key is missing, so the result is `str | None`, and the hint promises `str`.', lines: blk(BTF, 'find_store') },
          { say: 'The call passes a number for the id and a text for the total. The two are swapped against the hints.', lines: G.span(BTF, /^load\(17/, /^load\(17/) }
        ]
      }),

      B.term({
        id: 'm11-mypy-run', t: 1, src: 'rec', title: 'Run mypy',
        say: 'The real output of mypy ' + G.meta('mypy') + '. The file did not run.',
        lines: function () { return G.plain(MYT); },
        after: 'Four errors in three places, with the **line numbers**. Mypy found a float where an `int` was promised, a missing `None` case, and two swapped arguments, all without running the code. In a pipeline it runs in CI (mission 13), so a mistake like this never reaches production.',
        afterKind: 'tip',
        doneSay: 'mypy reads the code. It cannot read your files.'
      }),

      B.quiz({
        id: 'm11-q2', t: 1, src: 'rec',
        q: 'Mypy reported `got "str | None", expected "str"` for `return stores.get(key)`. What does it tell you?',
        opts: [
          { t: 'The key may be missing, so the function can return None, and the hint says it never does', fb: '' },
          { t: 'The dict contains text and numbers', fb: 'The hint says `dict[str, str]`. The problem is the missing key.' },
          { t: 'The function raised an error when it ran', fb: 'Mypy does not run the code.' },
          { t: 'The key must be an int', fb: 'The key is declared `str`.' }
        ],
        ok: 0, why: '`dict.get(key)` returns the value, or `None` if the key is missing. Mypy follows that through the hint. Fix it by returning a default, raising a clear error, or changing the hint to `str | None` and handling `None` in the caller.'
      }),

      B.code({
        id: 'm11-pyd', t: 1, src: 'rec', title: 'A pydantic model checks real values', file: 'dataclass_vs_pydantic.py', lang: 'python', code: DPF,
        steps: [
          { say: 'pydantic (' + G.meta('pydantic') + ') reads the same kind of hints, and **enforces** them on the data you give it. The output is real.', lines: null },
          { say: 'A model: the hints say what a valid order is. `Field` adds rules: a pattern, a minimum. `Literal` lists the allowed stores.', lines: G.span(DPF, /^class Order/, /ordered_at: datetime/) },
          { say: 'A row from a CSV is all text. In the default mode pydantic converts what it can: the text "2" becomes 2, and the text date becomes a `datetime`.', lines: G.span(DPF, /^good = /, /print\("a row of text/) },
          { say: 'A bad row has five problems. `ValidationError` lists every one, with the field, a type code and a message. It does not stop at the first.', lines: G.span(DPF, /^bad = /, /e\['msg'\]/) },
          { say: 'In **strict** mode pydantic refuses to convert. Text from a CSV then fails for every number and date.', lines: [G.at(DPF, /model_validate\(good, strict=True\)/) - 1, last(DPF)] }
        ]
      }),

      B.term({
        id: 'm11-pyd-run', t: 1, src: 'rec', title: 'Run it',
        say: 'The real output of `dataclass_vs_pydantic.py`.',
        lines: function () { return G.plain(DPT, { cmd: 'python dataclass_vs_pydantic.py' }); },
        after: 'The good row came back with real types: integers and a `datetime`. The bad row produced **5 errors** in one pass, one for each field, with a code such as `literal_error` that a program can read. And strict mode on a row of text produced **3 errors**: use it when the data already has types, as JSON numbers do, and not for a CSV.',
        afterKind: 'tip',
        doneSay: 'Validate, convert, and list every problem.'
      }),

      B.quiz({
        id: 'm11-q3', t: 1, src: 'rec',
        q: 'The bad row had a wrong id, a store that is not allowed, a quantity of 0, a total of "12.50" and a date "yesterday". How many errors did pydantic report?',
        opts: [
          { t: '5, one for each field, in one ValidationError', fb: '' },
          { t: '1, the first one that it found', fb: 'pydantic collects every error in the row before it raises.' },
          { t: '4, because "12.50" can be converted', fb: 'The text "12.50" is not a whole number, so `int` conversion failed: `int_parsing`.' },
          { t: '0, because it converts what it can', fb: 'It converts text that fits the type. These values did not fit.' }
        ],
        ok: 0, why: 'Every field failed its rule: the pattern, the allowed list, the minimum, the integer parsing and the date parsing. One error object for each means that a person can fix the whole row in one go.'
      }),

      B.flow({
        id: 'm11-flow', t: 1, src: 'docs', title: 'Validate at the boundary', g: 'validate', legend: true,
        steps: [
          { say: 'A raw file, a validation step, a clean table, a quarantine table and a limit check. Press Next.', cap: 'Nothing has run yet.' },
          { say: 'Step 1. Every row of the raw file reaches the validation step. Every value is text at this point.', on: ['v1'], focus: ['raw', 'val'], cap: 'Every row is checked.' },
          { say: 'Step 2. A row that passes becomes a typed row and goes to the clean table.', on: ['v2'], focus: ['val', 'good'], cap: 'Valid rows go on.' },
          { say: 'Step 3. A row that fails goes to **quarantine** with its line number and the reasons. It is not dropped.', on: ['v3'], focus: ['val', 'q'], cap: 'Invalid rows are kept.' },
          { say: 'Step 4. The run counts the quarantined rows against a **limit**. A few bad rows are normal. Many mean that the source changed.', on: ['v4'], focus: ['q', 'chk'], tags: ['tg_fail'], cap: 'Compare with the limit.' },
          { say: 'Step 5. Under the limit, the good rows are loaded. Over it, the run fails and nothing is committed.', on: ['v5'], focus: ['chk', 'good'], cap: 'Load, or fail.' },
          { say: 'A person reads the quarantine table, fixes the data or the rule, and replays the rows through the same load, which is safe to rerun (mission 7).', on: ['v3'], focus: ['q'], tags: ['tg_fix'], cap: 'Fix, then replay.' }
        ]
      }),

      B.code({
        id: 'm11-vq', t: 1, src: 'rec', title: 'Validate, quarantine, and fail above a limit', file: 'validate_or_quarantine.py', lang: 'python', code: VQF,
        steps: [
          { say: 'Ten rows of a CSV file, checked with a pydantic model. Good rows go on, bad rows go to quarantine, and too many bad rows fail the run. The output is real.', lines: null },
          { say: 'The model. Rules for each column. `extra="ignore"` means that a column that is not in the model is ignored.', lines: G.span(VQF, /^class Order/, /ordered_at: datetime/) },
          { say: 'The rows, as a CSV reader would give them: every value is text. Four of them are bad in different ways, and O-6 has an extra column.', lines: G.span(VQF, /^ROWS = \[/, /^\]/) },
          { say: 'Each row is validated. On a `ValidationError` the row goes to quarantine with its **line number**, the **id** and every reason.', lines: G.span(VQF, /^        try:/, /"why": why\}\)/) },
          { say: 'A rule that no single row can check: the same `order_id` twice in a file. It needs a set of ids already seen.', lines: G.span(VQF, /^        if order\.order_id in seen/, /^        seen\.add/) },
          { say: 'The report, and the limit. The share of bad rows decides whether the run fails.', lines: [G.at(VQF, /^good, quarantine = validate/), last(VQF)] }
        ]
      }),

      B.term({
        id: 'm11-vq-run', t: 1, src: 'rec', title: 'Run it',
        say: 'The real output of `validate_or_quarantine.py`.',
        lines: function () { return G.plain(VQT, { cmd: 'python validate_or_quarantine.py' }); },
        after: 'Six rows were good and four went to quarantine, each with the **line** and the **reason**: a store that is not allowed, a total with a comma, a quantity of 0, and a duplicate id. The limit in this small demo is 50 percent. A real file gets a limit of a few percent, and in the next lab you can see what the limit changes.',
        afterKind: 'tip',
        doneSay: 'Bad rows are kept with a reason, and the limit decides.'
      }),

      B.widget({ id: 'm11-lab-validate', kind: 'validate', t: 1, src: 'rec', title: 'Lab: validate or quarantine' }),

      B.quiz({
        id: 'm11-q4', t: 1, src: 'rec',
        q: 'In the lab, the model was strict and the file was a CSV, so every value was text. The job used the policy "drop bad rows silently". What was the result?',
        opts: [
          { t: '0 rows loaded, 10 dropped, and the status was success', fb: '' },
          { t: '10 rows loaded', fb: 'Strict mode refuses text for numbers and dates, so every row was bad.' },
          { t: 'The run failed with an error', fb: 'Dropping silently never fails. That is the problem with it.' },
          { t: '6 rows loaded, like the default model', fb: 'The default model converts text. The strict one does not.' }
        ],
        ok: 0, why: 'Every row failed a strict check, and the policy threw all of them away without a word. The run ended in "success" with an empty table. A limit on the share of bad rows would have failed the run at once.'
      }),

      B.quiz({
        id: 'm11-q5', t: 1, src: 'rec',
        q: 'With the default model, 4 of 10 rows were bad. What did the policy "quarantine, fail above 20 percent" do, and what did "above 50 percent" do?',
        opts: [
          { t: 'The 20 percent limit failed the run and loaded nothing. The 50 percent limit loaded 6 rows and kept 4 in quarantine.', fb: '' },
          { t: 'Both loaded 6 rows', fb: '40 percent bad is above a 20 percent limit.' },
          { t: 'Both failed the run', fb: '40 percent is below a 50 percent limit.' },
          { t: 'The 20 percent limit loaded 6 rows and the 50 percent limit loaded 10', fb: 'A bad row is never loaded.' }
        ],
        ok: 0, why: 'The limit is a decision about how much bad data is normal for this source. 40 percent bad is far over a limit of 20 percent, so the run failed and the table stayed as it was. Under a limit of 50 percent the run went on.'
      }),

      B.bug({
        id: 'm11-bug1', t: 1, src: 'rec', q: 'This code loads a CSV. Last week a partner started sending totals like "12,50", and the revenue fell by 8 percent without an error. Click the line that hides the problem.',
        file: 'load_orders.py', lang: 'python', code: BUG_COERCE, bad: [3],
        hint: 'What happens to the rows that `to_numeric` could not read?',
        why: '`errors="coerce"` turns every bad value into `nan`, and `dropna` removes those rows. The rows vanish with no message, which is the "drop silently" policy of the lab: success, and a smaller table. Keep the bad rows in a quarantine file, and fail the run when their share is over a limit.',
        fix: BUG_COERCE_FIX,
        cheer: 'Set bad rows aside, with a limit, and say so.'
      }),

      B.cmp({
        id: 'm11-cmp', t: 1, src: 'docs', title: 'Four checks, four places',
        say: 'Each check catches a different kind of mistake, at a different time. Press Next.',
        cols: ['Check', 'When it runs', 'What it catches', 'What it cannot see'],
        hl: 0,
        rows: [
          ['Type hints and mypy', 'Before the code runs, in CI', 'A wrong argument, a missing `None` case, a wrong return type.', 'What is inside a file or an API answer.'],
          ['A pydantic model', 'At run time, when data enters', 'A wrong type, a value out of range, an unknown choice, a bad date.', 'A rule across rows, such as a duplicate id, unless you add it.'],
          ['A contract check on the file', 'At run time, before the load', 'A renamed, missing or new column, and a column that changed type.', 'A single bad value in a column that still has the right type.'],
          ['Database constraints', 'At write time, in the database', 'A NULL in a required column, a duplicate key, a failed CHECK.', 'Anything that has been converted wrongly before it got there.']
        ],
        steps: [
          { upto: 2, say: 'The first two check your code and your rows.' },
          { upto: 4, say: 'The last two check the shape of the file, and the table that you write to. Use all four, each for what it is good at.' }
        ],
        pick: 'Validate **at the boundary**, where data enters. Inside your code, types and tests are enough.'
      }),

      B.cmp({
        id: 'm11-drift', t: 2, src: 'docs', title: 'Kinds of schema drift, and what to do',
        say: 'A partner changes a file without telling you. These are the usual changes. Press Next.',
        cols: ['Change', 'What happens if nobody checks', 'What the check does'],
        hl: 0,
        rows: [
          ['A new column', 'Usually harmless, until `SELECT *` or a model with extra columns forbidden breaks.', 'Report it. Fail only when the model forbids extra columns.'],
          ['A missing or renamed column', 'The load fails late, or fills the column with NULL.', 'Fail before the load, and name the missing column.'],
          ['A column changes type', 'A cast fails, or silently gives NULL or a rounded number.', 'Fail, and name the column and both types.'],
          ['The values change meaning', 'Nothing fails: cents become dollars, a code gets a new meaning.', 'Add range and distribution checks, and ask the owner for a change note.']
        ],
        steps: [
          { upto: 3, say: 'Structure changes can be checked by a program.' },
          { upto: 4, say: 'A change of meaning needs checks on the values and a person to ask.' }
        ],
        pick: 'Put the **contract in code**, run it before every load, and fail with the column name and the two types.'
      }),

      B.decide({
        id: 'm11-decide', t: 2, src: 'rec', title: 'Decision: what does the load do with a bad row?',
        scenario: 'Brewline loads a partner file of orders every night. In the lab, four of ten rows were bad with the default model. The four policies gave: a failed run at the first bad row, a failed run above a limit of 20 percent, a load of 6 rows with 4 kept in quarantine under a limit of 50 percent, and a "success" that dropped 4 rows without a word.',
        opts: [
          { t: 'Fail the whole run on the first bad row', d: 'Nothing wrong ever gets in.', lose: 'One bad row blocks all the good ones, and the report is late, for a problem that a few rows caused.' },
          { t: 'Quarantine the bad rows with the reason, load the good ones, and fail above a limit', d: 'A few bad rows are set aside for a person, and a source that has really changed stops the run.', lose: '' },
          { t: 'Drop the bad rows and log a line', d: 'The run always finishes.', lose: 'Nobody reads the log. The table is smaller than the file, and a source that changed looks like success.' },
          { t: 'Fix the bad rows automatically by guessing', d: 'No manual work.', lose: 'A guess such as turning "12,50" into 1250 or 12.50 changes money without anyone knowing.' }
        ],
        pick: 1,
        why: 'Quarantine keeps every bad row with its line number and reason, so a person can fix and replay it. The limit stops the run when the source has changed. Silence and guessing are the two ways to get a wrong table with a green run.',
        when: 'For a source where every row matters, such as payments, a limit of 0 (fail on any bad row) is right. For a noisy source, set the limit from the history: the normal share of bad rows, plus a margin.'
      }),

      B.challenge({
        id: 'm11-ch1', t: 1, lang: 'python', file: 'split_valid.py',
        q: '**Coding round: good rows, bad rows, and a limit.** Write `split_valid(rows, check, max_bad_share=0.2)`. `check(row)` returns the cleaned row or raises `ValueError("reason")`. Return `(good, quarantine)`. A quarantine item is `{"line": n, "row": row, "why": reason}`, and `n` counts from 2 because line 1 is the header. When the share of bad rows is above `max_bad_share`, raise `RuntimeError`.',
        data: [{ name: 'what the tests check', cols: ['case', 'expected'], rows: [['10 rows, 2 bad, limit 0.3', '8 good rows (cleaned), 2 in quarantine at lines 3 and 4'], ['the same rows, limit 0.1', 'RuntimeError: 2 of 10 rows are bad'], ['no rows', '([], [])']] }],
        starter: 'def split_valid(rows, check, max_bad_share=0.2):\n    ...',
        hints: ['Loop with `enumerate(rows, start=2)`, so that the line numbers match the file.', 'Call `check(row)` in a `try`. On `ValueError`, append the quarantine item with `str(err)` as the reason.', 'After the loop compare `len(quarantine) / len(rows)` with the limit. Guard against an empty list of rows.'],
        sol: fn(SVF, 'split_valid'),
        res: { msg: 'tests passed in the recording', cols: ['case', 'result'], rows: SVROWS },
        expl: ['Only `ValueError` is caught. A `KeyError` or `TypeError` from a bug in `check` is not a bad row, it is a bug, and it should stop the run.', 'Counting from 2 means that a person can open the file and go straight to the line. A quarantine without line numbers is hard to use.', 'The limit check comes after the loop, so the quarantine is complete when the run fails. A real job writes the quarantine before it raises.'],
        cx: 'O(n) rows. One call of `check` for each row.'
      }),

      B.challenge({
        id: 'm11-ch2', t: 2, lang: 'python', file: 'contract_check.py',
        q: '**Coding round: schema drift.** Write `check_schema(contract, rows)`. `contract` maps a column to `"int"`, `"float"` or `"str"`. `rows` is a list of dicts of text. Return a sorted list of findings: `("missing", column)`, `("new", column)` and `("type", column, expected, got)`. The type of a column is the widest kind in its values: `str` beats `float`, and `float` beats `int`. An `int` column is fine for a `float` contract.',
        data: [{ name: 'the contract', cols: ['column', 'type'], rows: [['order_id', 'str'], ['store', 'str'], ['qty', 'int'], ['total_cents', 'int']] }],
        starter: 'def kind(value):\n    ...\n\ndef check_schema(contract, rows):\n    ...',
        hints: ['`kind` tries `int(value)`, then `float(value)`, and falls back to `"str"`.', 'The columns of the file are the union of the keys of the rows. Missing and new columns are set differences.', 'For a column that is in both, take the widest kind of its non-empty values and compare it with the contract.'],
        sol: fn(CCF, 'kind') + '\n\n' + fn(CCF, 'check_schema'),
        res: { msg: 'tests passed in the recording', cols: ['case', 'findings'], rows: CCROWS },
        expl: ['A renamed column shows up as a pair: the old one is missing and the new one is new. The check cannot know that it is a rename, and a person can.', 'The type is the widest kind that is seen, so one value "two" in a column of numbers makes the column `str`, and the finding names it.', 'Run this before the load. It fails with the column name and both types, which is what the person on call needs.'],
        cx: 'O(rows times columns).'
      }),

      B.incident({
        id: 'm11-inc', t: 2, src: 'rec', title: 'Incident: London orders fell, and every run says success', time: '09:05',
        alert: 'London orders on the dashboard dropped by about 40 percent four days ago. Singapore is normal. The partner says that nothing changed. The nightly load shows success every night.',
        clues: ['The load validates each row, and the store must be "London" or "Singapore".', 'The load logs "dropped 0 bad rows" at the end, and the count is always zero.', 'The partner\'s new export system went live five days ago.'],
        opts: [
          { t: 'Compare the number of rows in the file with the number loaded, and look at the store values that fail the check', fb: '' },
          { t: 'Ask the stores to enter more orders', fb: 'The orders exist. They are not reaching the table.' },
          { t: 'Reload the last four days', fb: 'The reload will drop the same rows again.' },
          { t: 'Raise the limit on bad rows', fb: 'The load has no limit. It drops rows without counting them in the log.' }
        ],
        best: 0, why: 'In the recording the policy "drop bad rows silently" loaded 6 of 10 rows and ended in "success, and nobody is told that 4 rows were dropped". A new export system that writes "LONDON" or "London " fails a `Literal["London", "Singapore"]` check, and a loader that drops bad rows hides it.',
        checks: [
          ['Count the rows in the raw file and in the table for one London day', 'The file has far more rows than the table.'],
          ['Run the validation on the raw file and print the first errors', 'The `store` field fails with "Input should be \'London\' or \'Singapore\'".'],
          ['Look at the raw values', 'The partner\'s new system writes "LONDON" in capitals, or with a trailing space.'],
          ['Fix the rule and replay the four days', 'Normalise with `strip()` and a case-insensitive match, then reload each day. The load is idempotent (mission 7).'],
          ['Change the policy to quarantine with a limit, and log the counts', 'Four days of 40 percent bad rows must fail the run on the first night.']
        ],
        tell: 'London orders dropped because the partner\'s new export system writes the store in a different form, so the rows fail the store check. The loader dropped bad rows without a trace, and the log said that zero were dropped. I normalised the store value, replayed the four days, and changed the load to quarantine bad rows with their reasons and to fail the run when more than a few percent are bad.',
        prevent: ['Bad rows go to quarantine, and the count is part of the run result.', 'A limit on the share of bad rows fails the run.', 'The row count of the file and of the table are compared after each load.', 'A contract check runs before the load and reports the values that are new.']
      }),

      B.qa({
        id: 'qa-hints', t: 1, tag: 'Types', secs: 60,
        q: 'What do type hints do in Python, and what do they not do?',
        pts: ['Notes for readers and tools', 'Not enforced when the program runs', 'mypy checks them before the run', 'Data needs validation'],
        short: 'A type hint says what a value should be. Python does not enforce it at run time: in a recording, a function typed `-> int` returned the text \'12.5012.5012.50\', and a dataclass typed `total_cents: int` stored the text "12.50" without an error. A type checker such as mypy reads the hints and the code before the run and finds mismatches: it found four errors in a small file without running it. For data that comes from a file or an API, I validate at run time with a library such as pydantic, because a checker cannot see what a file contains.',
        fu: [['Are hints worth writing, then?', 'Yes. They document the code, they help the editor, and mypy catches whole classes of mistakes in CI.'], ['Can hints slow the program?', 'No. Python ignores them when it runs, except in libraries that read them, such as pydantic.']],
        trap: 'Believing that a hint makes Python reject a wrong type.',
        real: 'Tell about a bug that a type checker found for you.'
      }),

      B.qa({
        id: 'qa-pydantic', t: 1, tag: 'Types', secs: 60,
        q: 'Why use pydantic or a similar library to read rows from a file or an API?',
        pts: ['Checks real values and converts types', 'Reports every error with the field', 'Rules: ranges, patterns, allowed values', 'Lax or strict'],
        short: 'Data from outside is text or loose JSON, and Python accepts it all. A pydantic model checks each value against the hints and the rules, converts what fits (the text "1250" becomes 1250), and raises one `ValidationError` that lists every problem with the field, a code and a message. In a recording a bad row gave five errors in one pass. I choose the mode: the default is lax and converts text, which suits a CSV, and strict refuses to convert, which suits data that already has types. In strict mode every row of a CSV failed. I also add the rules that a single row cannot check, such as a duplicate key, myself.',
        fu: [['What does it cost?', 'A little time for each row. For very large files, validate in a columnar engine, or on a sample plus the constraints in the database.'], ['Could you use a dataclass?', 'A plain dataclass does not check anything. It only stores the values.']],
        trap: 'Validating deep inside the code, over and over, instead of once at the boundary.',
        real: 'Tell where in your pipelines the data is first checked.'
      }),

      B.qa({
        id: 'qa-quarantine', t: 1, tag: 'Quality', secs: 60,
        q: 'What do you do with rows that fail validation?',
        pts: ['Quarantine them with the line and the reason', 'Load the good rows', 'A limit on the share of bad rows fails the run', 'Never drop silently'],
        short: 'I set them aside and I do not drop them. Each bad row goes to a quarantine table or file with its line number, its id and every reason, and the good rows load. A limit on the share of bad rows decides whether the run fails: in a recording 4 of 10 rows were bad, a 20 percent limit failed the run with nothing loaded, and a 50 percent limit loaded 6 rows. Dropping silently ended in "success" with a smaller table, and with a strict model on a CSV it dropped all ten rows. A person reads the quarantine, fixes the data or the rule, and replays the rows through the same idempotent load.',
        fu: [['How do you set the limit?', 'From history: the normal share of bad rows, plus a margin. For payments, zero.'], ['Who looks at the quarantine?', 'An owner, with an alert that has the count and a link, so that it does not become a table that nobody opens.']],
        trap: 'A log line that says "dropped N rows" and nobody reads.',
        real: 'Describe where bad rows go in your pipelines, and who looks at them.'
      }),

      B.qa({
        id: 'qa-contract', t: 2, tag: 'Quality', secs: 60,
        q: 'What is a data contract, and how do you enforce it?',
        pts: ['An agreement on columns, types, meaning and freshness', 'Written as code or a schema', 'Checked before the load', 'An owner and a change process'],
        short: 'A data contract is an agreement between the team that produces a dataset and the teams that use it: the columns, their types and meaning, the allowed values, how fresh it is, and who owns it. I write it as code or as a schema file next to the pipeline, and I check every incoming file against it before the load: in a recording the check reported a renamed column as one missing and one new, a changed type with the column and both types, and a new column. The check fails with the column name, so the person on call knows where to look. The contract also needs an owner and a way to announce changes before they ship.',
        fu: [['What can code not enforce?', 'A change of meaning, such as cents turning into dollars. Add range and distribution checks, and a change process.'], ['Where does the contract live?', 'In version control, next to the code that reads the data, so that a change is reviewed.']],
        trap: 'A contract in a wiki page that no code reads.',
        real: 'Describe a change from a partner that broke you, and how you would catch it now.'
      }),

      B.qa({
        id: 'qa-mypy', t: 2, tag: 'Types', secs: 60,
        q: 'How do you use mypy in a data project?',
        pts: ['Run it in CI, on the code', 'Start loose, tighten step by step', 'Annotate the boundaries first', 'Fix the Optional cases'],
        short: 'I run mypy in CI next to the tests, so that a mismatch fails the build. In a recording it found a float returned for an int, a missing `None` case and two swapped arguments, with line numbers, without running the code. I start with the settings the project can pass, annotate the functions at the boundaries first, such as readers, loaders and the public functions, and then tighten. The `Optional` cases are where it pays most: `dict.get` and a lookup that can miss. It does not replace validation of the data, because it cannot see inside a file.',
        fu: [['What about libraries without hints?', 'Install the stubs package if there is one, or ignore that module in the config, narrowly.'], ['Strict mode from day one?', 'On a new project, yes. On an old one, tighten one module at a time.']],
        trap: 'Using `Any` everywhere to make the errors go away.',
        real: 'Tell where mypy caught something that tests did not.'
      }),

      B.qa({
        id: 'qa-drift', t: 2, tag: 'Quality', secs: 60,
        q: 'A partner changes their file format without telling you. How does your pipeline find out?',
        pts: ['A contract check on the schema before the load', 'Validation of the values, with a limit', 'Row counts and freshness checks', 'An alert with the column and the reason'],
        short: 'Three layers. First a contract check on the file before the load, which names a missing column, a new one and a type change, and fails early. Second, row validation with quarantine and a limit, so that a change in the values, like a new spelling of a store, fails the run instead of dropping rows. Third, checks on the result: the row count of the file against the table, and freshness. The alert says which column or which rule and the numbers. In a recording the silent policy loaded 6 of 10 rows and called it success, which is the failure these layers prevent.',
        fu: [['What if the meaning of a column changes?', 'Only range and distribution checks and a change process catch that: for example the average total jumping by a factor of 100.'], ['Do you auto-adapt to the new format?', 'Not without a person. A guess can change money without anyone noticing.']],
        trap: 'Relying on the partner to tell you.',
        real: 'Tell about a change that you found out about from a dashboard.'
      }),

      B.recap({
        id: 'm11-recap', n: 11, badge: 'Gatekeeper', color: '#C7D2FE',
        pts: [
          'A **type hint** is a note. A function typed `-> int` returned the text **\'12.5012.5012.50\'**. **mypy** found **4 errors** in the code without running it.',
          'A **pydantic** model checks and converts real values and lists **every** error: **5 errors** for one bad row. **Strict** mode refused all text, which suits typed data and not a CSV.',
          'Bad rows go to **quarantine** with the line and the reason. 4 of 10 were bad: a limit of 20 percent **failed** the run, and a limit of 50 percent loaded **6**.',
          '**Dropping silently** loaded 6 rows and said success, and with strict mode on a CSV it dropped all **10**.',
          'A **contract check** reports a missing, new or retyped column before the load. A change of meaning needs value checks and an owner.'
        ],
        lines: [
          'I validate data once, at the boundary, and I keep the bad rows with a reason.',
          'I set a limit on bad rows, so a changed source fails the run.',
          'I check the shape of every file against a contract before I load it.'
        ]
      })
    ]
  });
})();
