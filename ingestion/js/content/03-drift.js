/* Mission 3: schema drift, nested data and contracts. drift.py ran for real with dlt on DuckDB. */
(function () {
  var B = LAB.b, G = LAB.get;
  var C = G.counts, X = G.text, n = G.n;
  var DM = G.table('drift.modes').rows, D = C('drift'), DR = G.file('drift.py');
  G.expect(DM[0][1] === 'loaded 7' && DM[0][2] === 117 && DM[0][3] === 'coupon, channel__name, channel__app__version, total_cents__v_text', 'day 3 under evolve loads 7 orders and adds four columns, with a variant column for the amount');
  G.expect(DM[1][1] === 'failed' && DM[1][2] === 110 && DM[2][1] === 'loaded 2' && DM[2][2] === 112 && DM[3][2] === 117 && DM[4][1] === 'failed' && DM[4][2] === 110, 'freeze fails the load, discard_row keeps 2 of 7, discard_value keeps all 7, data_type freeze fails the load');
  G.expect(D.order116 === "(116, None, None, None, 1116, None)" && D.order117 === "(117, None, None, None, None, '11.17')" && D.order111 === "(111, 'SPRING', 'web', '4.1', 1111, None)", 'the text 1116 became a number, and the text 11.17 went to a variant column');

  LAB.addChapter({
    id: 'm3', n: 3, title: 'Schema drift and nested data', short: 'Drift', blurb: 'New fields, text where a number was, and a contract that decides', minutes: 22,
    focus: ['ing'],
    goals: [
      'Say what a loader does with a **new field**, and with a **value of another type**.',
      'Choose a **schema contract**: evolve, freeze or discard.',
      'Say why a **silent discard** is worse than a failed load.',
      'Read **nested** data in the tables that a loader makes.'
    ],
    say: 'Sources change without telling you. On day 3 the pretend shop sends two new fields, a nested object, and an amount as text. I loaded the same day under five rules, and the destination was different every time.',
    scenes: [
      B.code({
        id: 'm3-code', t: 1, src: 'rec', title: 'drift.py: day 3 under five contracts', file: 'drift.py', lang: 'python', code: DR,
        steps: [
          { say: 'One program, five rules, and the same data. Press Next.', lines: null },
          { say: 'A **schema contract** has three parts: what to do with a new **table**, a new **column**, and a **data type** that does not fit. Each can be `evolve`, `freeze`, `discard_row` or `discard_value`.', lines: G.span(DR, /^MODES = \[/, /discard_value/) },
          { say: 'For each rule the program loads days 1 and 2 as usual, and **remembers the columns** of the table.', lines: G.span(DR, /for k, \(label, mode\) in enumerate\(MODES\)/, /before = /) },
          { say: 'Then it loads **day 3 with the rule**. If dlt refuses, the program catches the error and prints its message.', lines: G.span(DR, /day\[0\] = 3/, /result, error = 'failed'/) },
          { say: 'It prints the result, how many orders the destination holds, and which **columns are new**.', lines: G.span(DR, /after = \[c\[0\]/, /^    print\('%s \| %s/) }
        ]
      }),

      B.term({
        id: 'm3-out', t: 1, src: 'rec', title: 'What drift.py printed',
        say: 'One line for each rule, and then the three orders of day 3 as they look in the default table. Read the second column first.',
        lines: function () { return G.plain(X('drift.run')); },
        after: 'The table held **110** orders before day 3, and day 3 brings **7** new ones, so **117** is a complete load. Under the default (**evolve**) all **7** new orders loaded and **four columns** appeared. With the columns **frozen**, and with the data type frozen, the whole load **failed** and the table kept **110**. With **discard_row** only **2** of the 7 orders loaded (**' + DM[2][2] + '** in the end) and nothing failed. Order 116 sent the text `"1116"` and dlt made it the **number** 1116. Order 117 sent `"11.17"`, which is not a whole number, so the amount went to a **new variant column** and `total_cents` is `None`.',
        afterKind: 'warn',
        doneSay: 'The contract decides.'
      }),

      B.widget({ id: 'm3-lab', kind: 'driftlab', t: 1, src: 'rec', title: 'Lab: day 3 under five contracts' }),

      B.flow({
        id: 'm3-flow', t: 1, src: 'rec', title: 'A new field, and the contract that decides', g: 'drift', legend: true,
        steps: [
          { say: 'A row arrives that does not look like the table. Press Next.', focus: ['row', 'inf', 'con', 'tab', 'err'], cap: 'A row that does not fit.' },
          { say: 'Step 1. Day 3 brings orders with a **`coupon`**, a **nested `channel`** and, for one order, an amount sent as **text**.', on: ['e1'], focus: ['row', 'inf'], tags: ['tg_var'], cap: 'New fields arrive.' },
          { say: 'Step 2. dlt **infers a type** from each value. The text `"1116"` is a whole number, so it became a number. The text `"11.17"` is not, so it needs a place of its own.', on: ['e2'], focus: ['inf', 'con'], cap: 'A type is inferred.' },
          { say: 'Step 3. The **contract** decides. By default it is **evolve**: the table gets `coupon`, `channel__name`, `channel__app__version`, and a **variant column** `total_cents__v_text`.', on: ['e3'], focus: ['con', 'tab'], tags: ['tg_evolve'], cap: 'Evolve: the table grows.' },
          { say: 'Step 4. With a contract of **freeze** the same row **stops the load**: nothing is written, and the error names the column and the row. A person has to look.', on: ['e4'], focus: ['con', 'err'], cap: 'Freeze: a person looks.' }
        ]
      }),

      B.cmp({
        id: 'm3-changes', t: 2, src: 'docs', title: 'What changes at a source, and what it does downstream',
        say: 'Five kinds of change. Press Next to read what each one looks like in the destination.',
        cols: ['The source', 'In the destination', 'What breaks downstream'],
        hl: 1,
        rows: [
          ['A new field', 'A new column, empty for old rows', 'Nothing, until a model needs it. A `select *` copies it everywhere'],
          ['A field is removed', 'The column stays, and new rows have nulls', 'A model that needs it quietly reads nulls'],
          ['A field is renamed', 'It looks like a removal and a new field: the old column stops, a new one fills', 'Models on the old name read nulls from the day of the change'],
          ['A type changes', 'A variant column, a conversion, or an error, by the loader and the rules', 'Sums that skip the variant column are short'],
          ['An object or list appears', 'Flattened columns, or a child table', 'A join to the child table multiplies the parent']
        ],
        steps: [
          { upto: 3, say: 'The first three rows are about **names**. Nothing fails, and numbers go quietly wrong. In my recording, a new field gave new columns and nothing else.' },
          { upto: 5, say: 'Types and nesting change the **shape** of the tables. The recording shows both: a variant column for the amount, and a child table for the lines. The first three rows are from documentation and general experience, and only a new field, a type change and nesting were run.' }
        ]
      }),

      B.bug({
        id: 'm3-bug', t: 2, q: 'The revenue of orders 116 and 117 is 1,116 cents in the model, and the shop says 2,233. One amount arrived as the text "11.17". Click the line that ignores it.',
        file: 'revenue.sql', lang: 'sql',
        code: 'select sum(total_cents) as cents\nfrom shop.orders\nwhere id in (116, 117);\n',
        bad: [1],
        hint: 'Where did the loader put an amount that is not a whole number?',
        why: 'Order 117 sent `"11.17"`. dlt made the text of order 116 a number, but `"11.17"` is not a whole number, so it went to the **variant column** `total_cents__v_text`, and `total_cents` is `None` for that order. A sum over `total_cents` **skips it** and nothing fails. Read the variant column too, convert it on purpose, and ask the source to send one type.',
        fix: 'select sum(coalesce(total_cents, cast(round(cast(total_cents__v_text as decimal(10, 2)) * 100) as bigint))) as cents\nfrom shop.orders\nwhere id in (116, 117);\n',
        cheer: 'Read the variant column.'
      }),

      B.bug({
        id: 'm3-bug2', t: 2, q: 'To keep the table clean, a job loads with a contract that drops any row that brings a new column. Since day 3 the order count is short and no job failed. Click the line that drops them.',
        file: 'run.py', lang: 'python',
        code: 'day[0] = 3\npipeline.run(orders(), schema_contract={\'columns\': \'discard_row\'})\n',
        bad: [2],
        hint: 'What happens to a row that cannot be loaded under this rule?',
        why: 'With **discard_row** the 5 orders that brought `coupon` and `channel` were **dropped without an error**: **' + n(DM[2][2]) + '** orders in the destination against **117** for a complete load (110 and the 7 new ones). A contract that loses data silently is worse than one that stops: nobody is told. Let the table evolve and **alert** on the change, or freeze it and fail loudly.',
        fix: 'day[0] = 3\npipeline.run(orders(), schema_contract={\'columns\': \'evolve\'})\n',
        cheer: 'Never lose rows quietly.'
      }),

      B.quiz({
        id: 'm3-q1', t: 1,
        q: 'On day 3 the shop sends orders with a new field `coupon`. What does dlt do by default?',
        opts: [
          { t: 'It adds a column `coupon` to the table, and loads the rows', fb: '' },
          { t: 'It stops the load with an error', fb: 'That is the freeze contract.' },
          { t: 'It ignores the new field', fb: 'That is a discard contract.' },
          { t: 'It renames the table', fb: 'It never renames a table.' }
        ],
        ok: 0, why: 'The default is **evolve**. The recording shows **' + DM[0][3].split(', ').length + '** new columns and all **7** new orders loaded. Nobody was told, which is why a change needs an alert.'
      }),

      B.quiz({
        id: 'm3-q2', t: 1,
        q: 'The columns are frozen, and one new order brings a new field. What happens to the 7 orders of the day?',
        opts: [
          { t: 'The whole load fails and none of them is written', fb: '' },
          { t: 'The 6 other orders load and the bad one is skipped', fb: 'The recording shows that nothing was written.' },
          { t: 'All 7 load, with the new field dropped', fb: 'That is discard_value.' },
          { t: 'The table is dropped', fb: 'The table kept its 110 orders.' }
        ],
        ok: 0, why: 'With the columns frozen the run **failed**, and the destination kept **' + DM[1][2] + '** orders. The error says: `' + DM[1][4].split('. ').pop().slice(0, 70) + '`.'
      }),

      B.quiz({
        id: 'm3-q3', t: 1,
        q: 'An amount arrives as the text "11.17" in a column of whole numbers. Where does dlt put it?',
        opts: [
          { t: 'Into a variant column named after the original, `total_cents__v_text`', fb: '' },
          { t: 'Into `total_cents`, rounded', fb: 'The column stayed `None` for that order.' },
          { t: 'Nowhere: the row is dropped', fb: 'Order 117 was loaded.' },
          { t: 'Into a new table', fb: 'It is a column of the same table.' }
        ],
        ok: 0, why: 'In the recording order 117 had `total_cents` `None` and `total_cents__v_text` `"11.17"`. The text `"1116"` of order 116 **was** a whole number, and dlt converted it.'
      }),

      B.quiz({
        id: 'm3-q4', t: 2,
        q: 'Which contract is the most dangerous for the completeness of the data?',
        opts: [
          { t: 'discard_row on columns: rows with a new field vanish without an error', fb: '' },
          { t: 'freeze on columns: the load stops', fb: 'It is loud, and a person decides.' },
          { t: 'evolve on columns: the table grows', fb: 'It keeps all the data.' },
          { t: 'freeze on data type: the load stops', fb: 'It is loud too.' }
        ],
        ok: 0, why: 'The recording: **' + DM[2][1] + '** of 7 orders, **' + n(DM[2][2]) + '** in the end, and no error. A silent loss is found by a person who counts, weeks later.'
      }),

      B.order({
        id: 'm3-ord', t: 1, q: 'Put the steps in order for the morning after a schema change breaks a dashboard.',
        items: ['Compare the table with the source and find the new or changed column', 'Check what the loader did: a new column, a variant column or a failed load', 'Fix the model that reads the column, and test it on the raw table', 'Reload or repair the days that were wrong', 'Add an alert for schema changes, and a test on the model'],
        why: 'First find what changed, then what the loader did about it, then repair the model and the data. The alert comes last, and it is what stops the next one from being a surprise.'
      }),

      B.decide({
        id: 'm3-dec', t: 2, src: 'docs', title: 'Decision: which contract for which layer?',
        scenario: 'Brewline loads the shop into a raw schema, and dbt models build staging and marts on top. Marketing adds a field to the shop every few weeks without telling anyone. Finance uses a mart for the monthly close.',
        opts: [
          { t: 'Raw: evolve with an alert. Staging: name the columns. Marts: a tested contract on the columns that finance uses', d: 'No data is lost, a change is seen the same day, and the mart only changes on purpose.', lose: 'Someone has to read the alerts and update the staging model.' },
          { t: 'Freeze the raw tables', d: 'Nothing changes by surprise.', lose: 'Every new field stops the load until a person acts, including the harmless ones.' },
          { t: 'Discard rows that do not fit, to keep the tables clean', d: 'No alerts and no failures.', lose: 'Rows vanish quietly, as the recording showed.' }
        ],
        pick: 0,
        why: 'The raw layer is a **copy**: it should keep everything, so it evolves. The **mart** is a promise to finance, so its columns are explicit and tested. The line between the two is the staging model. The options are from documentation, and dbt did not run in this course.',
        when: 'If a source is regulated or handles personal data, freeze the raw layer and review each new field before it lands.'
      }),

      B.incident({
        id: 'm3-inc', t: 2, src: 'rec', title: 'Incident: the revenue of day 3 is short, and nothing failed', time: '08:25',
        alert: '**The revenue of 3 March is 11.17 below the shop, and every job is green.** One order was sent with its amount as the text "11.17" instead of a number. The revenue model sums `total_cents`.',
        clues: ['The difference is exactly one order', 'The load succeeded', 'The amount of that order is not in `total_cents`'],
        opts: [
          { t: 'Read the variant column in the model, ask the source to fix the type, and add a test for nulls in `total_cents`', fb: '' },
          { t: 'Freeze the data type so that the load fails', fb: 'It would have stopped the whole day for one row, with a delay for everyone.' },
          { t: 'Delete the order', fb: 'It was a real order.' },
          { t: 'Add 11.17 to the report', fb: 'The same thing happens at the next odd value.' }
        ],
        best: 0,
        why: 'The recording shows where it went: order 117 had `total_cents` **None** and **`total_cents__v_text`** `"11.17"`. The loader kept the value in a **variant column**, and the sum skipped it. Freezing the type would have failed the whole day: the recording shows that too, **' + DM[4][2] + '** orders in the end.',
        checks: [
          ['Find the missing amount', 'One order with a null amount.'],
          ['Read the columns', 'A new variant column.'],
          ['Read the model', 'It sums only total_cents.'],
          ['Fix and prevent', 'Use the variant column, fix the source, test for nulls.']
        ],
        tell: 'One order sent its amount as text with a decimal point, so the loader put it in a variant column and the revenue model, which sums one column, skipped it. I made the model read the variant column, asked the owner of the shop to send a number, and added a test that no amount is null.',
        prevent: ['**Alert** when a variant column appears', 'Test that important columns are **never null**', 'Ask the source for **one type** for each field']
      }),

      B.qa({
        id: 'qa-drift', t: 1, tag: 'Ingestion', secs: 60,
        q: 'How do you handle schema drift in an ingestion pipeline?',
        pts: ['Expect it', 'Let the raw layer evolve', 'Alert on every change', 'Explicit columns downstream'],
        short: 'I **expect** it: sources change without notice. The **raw layer evolves**, so no data is lost: in my run a new field gave new columns and all the orders loaded. I **alert on every change** (a new column, a variant column, a failed load), because evolving is silent. **Downstream I name the columns** in the staging models and put tests on the ones that matter, so a change is a decision and not an accident. I never use a contract that drops rows quietly: **discard_row** kept **' + DM[2][1].split(' ')[1] + '** of 7 orders in my run and raised nothing. For a source I do not trust I freeze the columns and review each change.',
        fu: [['A renamed field?', 'It looks like a removed field and a new one. The old column goes null from the day of the change, so a test on nulls finds it.'], ['What does Fivetran do?', 'By its documentation it adapts the destination to most schema changes by itself, and you see them in its log and notifications.']],
        trap: 'Using select * in a mart.',
        real: 'Describe a schema change that broke a pipeline.'
      }),

      B.qa({
        id: 'qa-contracts', t: 2, tag: 'Ingestion', secs: 60,
        q: 'What is a schema contract, and which one would you choose?',
        pts: ['Rules for table, column and type', 'Evolve, freeze, discard', 'Fail loudly beats losing data', 'Choose by layer'],
        short: 'A **schema contract** tells the loader what to do with a new **table**, a new **column**, or a **value of another type**: evolve, freeze, discard the row, or discard the value. In my recording the same day gave **117** orders under evolve, **110** with a failed load under freeze, **112** under discard_row, and **117** with thinner rows under discard_value. I choose **by layer**: evolve with an alert for the raw layer, explicit and tested columns for the marts. And I prefer a **loud failure to a silent loss**, so freeze when a change must be reviewed, and never discard rows without a counter and an alert.',
        fu: [['Freeze stops the whole load for one row?', 'Yes, in the recording, and that is the cost. Route the bad rows to a quarantine table when the tool allows it.'], ['dbt contracts?', 'dbt can enforce the columns and types of a model. It is a different layer, and it did not run in this course.']],
        trap: 'Choosing discard to avoid alerts.',
        real: 'Describe how you decided what to do with bad rows.'
      }),

      B.qa({
        id: 'qa-nested', t: 1, tag: 'Ingestion', secs: 45,
        q: 'How do you land nested JSON in a warehouse?',
        pts: ['Objects become columns', 'Lists become child tables', 'Mind the grain', 'Or keep the JSON column'],
        short: 'Two usual ways. **Flatten it on load**: in my run dlt turned the customer **object** into columns (`customer__id`) and the **list** of lines into a **child table** (`orders__lines`) linked by a parent id, **' + n(C('first').lines) + '** line rows for **' + n(C('first').orders) + '** orders. Or **keep the JSON** in a column of the warehouse and parse it in the models, which suits data that changes shape often. With a child table I watch the **grain**: a join gives one row for each line, so counts and sums of order columns are multiplied. I decide by how stable the shape is and who queries it.',
        fu: [['Deeply nested data?', 'Flattening makes many child tables. Keep the JSON and parse the parts that people use.'], ['What is a grain?', 'What one row stands for. Know it for every table.']],
        trap: 'Joining a child table and counting the parent.',
        real: 'Describe a nested source that you flattened.'
      }),

      B.recap({
        id: 'm3-recap', n: 3, badge: 'Drift Spotter', color: '#E879F9',
        pts: [
          'A new field gave **new columns** by default, and nobody was told: **evolve** is silent.',
          'A text where a number was went to a **variant column**, and a sum over the original column **skipped** it.',
          'With the columns **frozen** the whole load **failed** (**' + DM[1][2] + '** orders kept). With **discard_row** only **' + DM[2][1].split(' ')[1] + '** of 7 loaded, with **no error**.',
          'Let the raw layer **evolve with an alert**, name the columns in staging, and test the marts.',
          'A nested list becomes a **child table**: watch the **grain**.'
        ],
        lines: [
          'I alert on every schema change.',
          'I would rather fail loudly than lose rows.',
          'I read the variant columns.'
        ]
      })
    ]
  });
})();
