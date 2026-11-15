/* Mission 7: who sees which rows. The filter is a DuckDB query with the viewer's email as a parameter. Product settings are from documentation. */
(function () {
  var B = LAB.b, G = LAB.get;
  var U = G.table('rls.users'), S = G.counts('rls.summary'), BR = G.table('rls.by_region'), RLS = G.file('sql/rls.sql'), LK = G.counts('lookml.summary');
  var n = G.n, ana = G.row('rls.users', 'ana'), cho = G.row('rls.users', 'cho'), dee = G.row('rls.users', 'dee'), eli = G.row('rls.users', 'eli');
  G.expect(eli['order lines visible'] === 0 && S.unknown_user_lines === 0, 'a person with no entry in the security table sees no rows');
  G.expect(dee['revenue visible'] === S.march_revenue_all, 'the head of sales sees the whole revenue of March');
  G.expect(U.rows.filter(function (r) { return r[2] !== 'all regions'; }).reduce(function (a, r) { return a + r[4]; }, 0) === S.march_revenue_all, 'the regions of ana, ben and cho together are the whole company');

  LAB.addChapter({
    id: 'm7', n: 7, title: 'Security: who sees which rows', short: 'Security', blurb: 'Row-level security, the service account, and where the rule should live', minutes: 16,
    focus: ['qual', 'con', 'sf'],
    goals: [
      'Explain **row-level security** as a filter that the tool adds for each viewer.',
      'Say how **Power BI, Tableau and Looker** each define it.',
      'Explain what the **warehouse sees** when a dashboard queries it.',
      'Decide whether a rule lives in the **tool** or in the **warehouse**.'
    ],
    say: 'One dashboard, many viewers, and not everybody may see every row. The rule is small. The questions around it are yours: which table holds the rule, which identity queries your warehouse, and what happens to somebody the rule forgot.',
    scenes: [
      B.flow({
        id: 'm7-flow', t: 1, src: 'docs', title: 'A filter for each viewer', g: 'rls', legend: true,
        steps: [
          { say: 'Ana is the regional manager of North. She opens the same dashboard as everybody else. Press Next.', focus: ['user'], cap: 'One dashboard for everybody.' },
          { say: 'Step 1. The tool knows who signed in. It looks Ana up in a table that says **who sees what**: Ana, North.', on: ['s1'], focus: ['user', 'map'], tags: ['tg_tool'], cap: 'Identity, then a lookup.' },
          { say: 'Step 2. The tool puts a filter on the **store dimension**: region = North. It does not touch the fact table directly.', on: ['s2'], focus: ['map', 'dim'], cap: 'The filter lands on a dimension.' },
          { say: 'Step 3. The filter follows the relationship from the dimension to the fact, like any other filter in a star schema. Every tile now reads only the lines of North stores.', on: ['s3'], focus: ['dim', 'fact'], cap: 'The relationship carries it to the fact.' },
          { say: 'Step 4, the part that concerns you. In most setups the tool reads your warehouse with **one service account**, and that account can read every row. The warehouse does not know that Ana exists. The rule is enforced by the tool, and only there.', on: ['s4'], focus: ['svc', 'fact'], tags: ['tg_db'], cap: 'The warehouse sees one login.' }
        ]
      }),

      B.sql({
        id: 'm7-sql', t: 1, src: 'rec', title: 'Row-level security as the database sees it', file: 'rls.sql', code: RLS,
        result: { cols: ['user', 'order_lines_visible', 'revenue_visible'], rows: U.rows.map(function (r) { return [r[0], r[3], r[4]]; }), msg: 'the same query, five emails' },
        steps: [
          { say: 'The revenue tile for March 2026, with the viewer\'s email as a parameter. This is what a row-level rule comes down to.' },
          { say: 'The ordinary part of the tile: lines, their orders and their stores.', lines: G.span(RLS, /^FROM fact_order_lines/, /^WHERE/) },
          { say: 'The rule. A viewer with the flag `sees_all` passes. Everybody else sees a store only when its region is among **their** regions.', lines: G.span(RLS, /^  AND \(/, /^      \);/) },
          { say: 'Run it once for each of the five people. Ana sees ' + n(ana['order lines visible']) + ' lines, Cho sees two regions and ' + n(cho['order lines visible']) + ' lines, Dee sees all ' + n(dee['order lines visible']) + ', and Eli, who is in no row of the security table, sees **0**.', run: true }
        ],
        note: 'Recorded in DuckDB. `$email` is a parameter of the query. A BI tool fills in the identity of the signed-in viewer at that place.'
      }),

      B.widget({ id: 'm7-lab', kind: 'rls', t: 1, src: 'rec', title: 'Lab: sign in as five people' }),

      B.cmp({
        id: 'm7-tools', t: 1, src: 'docs', title: 'How each tool writes the rule',
        say: 'The same rule in three tools. Press Next.',
        cols: ['', 'Power BI', 'Tableau', 'Looker'],
        hl: 0,
        rows: [
          ['Where the rule is defined', 'A **role** in the semantic model, with a DAX filter on a table.', 'A **user filter** or a calculated field in the data source, often joined to an entitlement table. Tableau Cloud and Server also have data policies on virtual connections.', 'An **access_filter** on an explore, tied to a user attribute.'],
          ['How it knows the viewer', 'The DAX function `USERPRINCIPALNAME()` returns the email of the signed-in viewer.', 'The function `USERNAME()` returns the signed-in user.', 'A **user attribute**, such as `region`, set for each user or group by an admin. Every user of the explore needs a value for it.'],
          ['The Brewline rule', 'A filter on the security table: `bi_users[email] = USERPRINCIPALNAME()`, related to `dim_store` through the regions.', 'A join to the entitlement table with the condition `[email] = USERNAME()`.', '`access_filter: { field: stores.region  user_attribute: region }`'],
          ['Who is not filtered', 'In the Power BI service the rule applies to people with the Viewer role in a workspace. Admins, members and contributors of the workspace see all rows.', 'Whoever can edit or download the data source can see what it holds.', 'Developers with access to the model can change the filter.'],
          ['Hiding columns', 'Object-level security hides tables or columns from a role.', 'Hide fields in the published data source.', '`access_grant` limits fields and explores to users with an attribute.']
        ],
        steps: [
          { upto: 3, say: 'A place for the rule, a way to know the viewer, and the rule itself. The entitlement table in the first and second column is a table in **your** warehouse.' },
          { upto: 5, say: 'The fourth row surprises people: giving somebody edit rights on a workspace or a data source usually lifts the row filter for them.' }
        ]
      }),

      B.rows({
        id: 'm7-table', t: 1, src: 'rec', title: 'The table behind the rule is yours',
        steps: [
          {
            say: 'Somebody has to own the table that says who sees which region. If it lives in a spreadsheet next to the dashboard, it will be wrong within a month. As a table in the warehouse it can be loaded from the HR system and tested.',
            tabs: [{ layer: 'RECORDED', name: 'Five people and what the rule gives them, March 2026', c: 'raw', cols: U.cols, rows: U.rows, trk: 0 }],
            notes: ['Ana, Ben and Cho together see ' + n(ana['revenue visible'] + G.row('rls.users', 'ben')['revenue visible'] + cho['revenue visible']) + ', which is the whole company. That check, the parts add up to the whole, is a test you can run every night.']
          },
          {
            say: 'Look at Eli. A new analyst with no row sees nothing. That is the right default: forgetting somebody must never show them everything. It also means that the first sign of a stale security table is a message saying "my dashboard is empty".',
            tabs: [{ layer: 'RECORDED', name: 'Revenue by region, March 2026', c: 'raw', cols: BR.cols, rows: BR.rows, trk: 0 }],
            notes: ['An email that is not in the table at all also returned ' + S.unknown_user_lines + ' rows. Test the empty case on purpose.']
          }
        ]
      }),

      B.cmp({
        id: 'm7-where', t: 2, src: 'docs', title: 'Enforce it in the tool, or in the warehouse?',
        say: 'There are two places to enforce a row rule. Press Next and compare.',
        cols: ['', 'In the BI tool', 'In the warehouse'],
        hl: 0,
        rows: [
          ['How', 'A role, a user filter or an access filter in the model.', 'A row access policy or a secured view on the table, which filters by the identity of the session.'],
          ['What the warehouse sees', 'One service account that reads everything.', 'Each viewer, when the tool passes their identity on with single sign-on or OAuth.'],
          ['Covers', 'Only that tool. A notebook, an export job or a second BI tool has to repeat the rule.', 'Every client of the table.'],
          ['Works with a copy in the tool', 'Yes. The copy holds all rows and the tool filters them.', 'Poorly. An import or an extract is filled by one identity, so the copy holds whatever that identity may see.'],
          ['Caching', 'The tool can share one cached result and filter it.', 'Results differ for each viewer, so less can be shared.'],
          ['Audit', 'In the logs of the tool.', 'In the query history of the warehouse, by viewer.']
        ],
        steps: [
          { upto: 3, say: 'A rule in the tool is simple and covers one tool. A rule in the warehouse covers everything, and needs the viewer\'s identity to reach the warehouse.' },
          { upto: 6, say: 'The fourth row decides many designs. A warehouse rule and an imported copy do not go together: the copy is filled by one identity.' }
        ]
      }),

      B.talk({
        id: 'm7-gov', t: 3, src: 'docs', title: 'Which dataset can I trust?',
        say: 'Security is one half of governance. The other half is knowing which model is the real one. Press Next for each.',
        items: [
          ['One model, many reports', 'Publish the model once and let reports connect to it. Power BI calls this a shared semantic model, Tableau a published data source, and in Looker every dashboard uses the explores of the project. Copies of a model are where numbers start to disagree.', 'Reuse the model. Do not copy it.'],
          ['A mark for the real one', 'Power BI can mark a model as promoted or certified, and Tableau can certify a data source. It is a label that an admin controls. It tells people which of five "Sales" models to use.', 'Certify the model that the pipeline feeds.'],
          ['Lineage', 'All three tools can show which reports depend on which model and which tables. Before you rename a column, that view tells you what will break.', 'Look at lineage before you change a table.'],
          ['Your contract', 'The certified model reads a small set of your tables. Treat those tables as an interface: announce changes, keep old columns for a while, and test them harder than the rest.', 'The tables behind a certified model are an interface.']
        ],
        cols: 1
      }),

      B.quiz({
        id: 'm7-q1', t: 1,
        q: 'A new regional manager joins. Nobody adds her to the security table. What does she see on the dashboard, with a rule like the one in the recording?',
        opts: [
          { t: 'All regions', fb: 'That would be the dangerous default. The rule lets a row through only when her region matches.' },
          { t: 'No rows', fb: '' },
          { t: 'An access denied error', fb: 'She can open the dashboard. The rule filters rows, it does not block the page.' },
          { t: 'The region of the previous manager', fb: 'The rule goes by her email, not by her job.' }
        ],
        ok: 1, why: 'No row in the security table means no region matches, so every row is filtered out. In the recording the analyst with no entry saw ' + eli['order lines visible'] + ' lines. Empty is safe, and it is also your first support ticket.'
      }),

      B.quiz({
        id: 'm7-q2', t: 1,
        q: 'The BI tool reads the warehouse with one service account and applies row-level security in its model. An engineer queries the same table from a notebook. What do they see?',
        opts: [
          { t: 'Only their region, because the rule is on the table', fb: 'The rule is in the BI model. The table has no rule.' },
          { t: 'Whatever their warehouse permissions allow, with no row filter', fb: '' },
          { t: 'Nothing, because only the service account may read it', fb: 'That depends on grants. Nothing in the question says so.' },
          { t: 'The same as the last dashboard viewer', fb: 'The warehouse keeps no memory of dashboard viewers.' }
        ],
        ok: 1, why: 'A rule in the tool protects the tool. Every other path to the table needs its own protection: grants, or a policy on the table itself.'
      }),

      B.decide({
        id: 'm7-dec', t: 2, src: 'docs', title: 'Decision: where does the region rule live?',
        scenario: 'Brewline has three BI tools on the same tables, and analysts who query the warehouse from notebooks. Regional managers may only see their own region. The Power BI model is imported. The Looker model is live. An auditor asks how the rule is enforced.',
        opts: [
          { t: 'In each BI tool, from one entitlement table in the warehouse. Notebooks get only aggregated tables without the detail', d: 'Works with the imported model. The rule is written three times, and all three read the same table of who sees what.' },
          { t: 'Only in the warehouse, as a row access policy', d: 'One rule for every client.', lose: 'The Power BI model is imported by a service account, so the copy would hold whatever that account may see, for all viewers. You would have to rebuild that model as a live one first.' },
          { t: 'In each BI tool, each with its own list of users', d: 'Quick to set up.', lose: 'Three lists that drift apart. When somebody changes region, one of the three is forgotten.' }
        ],
        pick: 0,
        why: 'With an imported model in the mix, the rule has to be applied by the tools. What you can make single is the data behind the rule: one entitlement table, loaded from the system that knows who manages what, tested, and read by all three models.',
        when: 'Move the rule into the warehouse when every tool can pass the viewer\'s identity through and no model keeps a copy, or when the auditor requires enforcement at the data.'
      }),

      B.incident({
        id: 'm7-inc', t: 2, src: 'docs', title: 'Incident: a manager can see every region', time: '14:15',
        alert: '**The regional manager of South sends a screenshot of the sales report showing all four regions.** Last week she saw only South. The security table still lists her with South.',
        clues: ['She was added as a Member of the Power BI workspace on Tuesday, so that she could edit a report', 'Row-level security in the Power BI service applies to the Viewer role of a workspace', 'Other regional managers, who are Viewers, still see one region'],
        opts: [
          { t: 'Change her workspace role back to Viewer, and give editing rights in a separate workspace that holds no restricted model', fb: '' },
          { t: 'Add a second filter for South inside the report', fb: 'A report filter is a convenience. Anybody who can edit the report can remove it.' },
          { t: 'Rewrite the security table', fb: 'The table is right. The rule is not applied to her role.' },
          { t: 'Delete the report', fb: 'The model is the same for every report in the workspace.' }
        ],
        best: 0,
        why: 'The rule did not break. Her role changed, and that role is not filtered. Edit rights on the place where a restricted model lives usually mean access to all of its rows.',
        checks: [
          ['Confirm', 'Use the tool\'s "view as role" test with her identity, and check her workspace role.'],
          ['Contain', 'Set her back to Viewer. Ask what she exported while she could see everything.'],
          ['Separate', 'Keep restricted models in a workspace where only the data team can edit, and let others build reports elsewhere against the shared model.'],
          ['Review', 'List every non-viewer of that workspace. Each of them sees all rows.']
        ],
        tell: 'A manager saw all regions because she had been made a workspace member to edit a report, and row-level security in the service only filters viewers. I set her back to viewer, moved report editing to a separate workspace that connects to the shared model, and reviewed who else had edit rights on the restricted workspace.',
        prevent: ['**Separate workspaces** for restricted models and for report building', 'A regular **list of non-viewers** on restricted workspaces', 'A test in the pipeline that the **entitlement table covers every manager**']
      }),

      B.qa({
        id: 'qa-rls', t: 1, tag: 'Security', secs: 75,
        q: 'What is row-level security in a BI tool, and how is it usually built?',
        pts: ['A filter on rows that depends on the signed-in viewer', 'An entitlement table: who sees which region, customer or team', 'The rule filters a dimension, and the relationship carries it to the fact', 'Default for an unknown viewer: no rows'],
        short: 'Row-level security shows each viewer only the rows they are allowed to see, on the same dashboard. It is usually built with an entitlement table that maps a person to what they may see, for example an email to a region. The tool reads the identity of the signed-in viewer, looks them up, and puts a filter on a dimension such as the store. The relationship then carries that filter to the fact table, so every tile is restricted. In Power BI this is a role with a DAX filter, in Tableau a user filter or a data policy, and in Looker an access filter with a user attribute. A viewer who is not in the table should see nothing, not everything.',
        fu: [['Who is not filtered in Power BI?', 'People with an editing role in the workspace. The rule applies to viewers.'], ['What do you test?', 'That the parts add up to the whole, and that an unknown user gets no rows.']],
        trap: 'Describing a filter on the report page. A report filter can be removed by the viewer.',
        real: 'Say what the entitlement key was in a system you worked on: region, cost centre, customer.'
      }),

      B.qa({
        id: 'qa-svc', t: 2, tag: 'Security', secs: 75,
        q: 'A BI tool connects to the warehouse with a service account. What does that mean for security?',
        pts: ['The warehouse sees one identity that can read everything the tool needs', 'Row rules are enforced by the tool, and only for the tool', 'Other clients of the same tables are not covered', 'Alternative: pass the viewer identity through and enforce in the warehouse'],
        short: 'It means that the warehouse cannot tell viewers apart. Every query arrives from one account, and that account must be allowed to read everything any viewer might see. So the row rules are enforced by the BI tool, in its model, and they protect only that tool: a notebook, an export or a second tool has to be secured on its own. I keep that service account narrow, with read access to the modeled tables only, its own warehouse or resource limit, and its queries on a chart. The alternative is to pass the viewer\'s identity through with single sign-on or OAuth and enforce a row policy in the warehouse. That covers every client, and it does not fit a model that imports a copy, because the copy is filled by one identity.',
        fu: [['How do you audit who saw what?', 'In the tool\'s logs with a service account, in the warehouse query history with identity passthrough.'], ['What permissions does the service account need?', 'Read on the tables or views the model uses. Nothing else.']],
        trap: 'Saying the service account is "secure because it is not a person".',
        real: 'Say how the BI connection was set up where you worked, if you know.'
      }),

      B.recap({
        id: 'm7-recap', n: 7, badge: 'Gatekeeper', color: '#FECACA',
        pts: [
          'Row-level security is a **filter that depends on the viewer**, placed on a dimension and carried to the fact.',
          'The rule reads an **entitlement table**. Keep it in the warehouse, load it from the system that knows, and test it.',
          'A viewer the table forgot sees **no rows**: ' + eli['order lines visible'] + ' in the recording.',
          'With a **service account**, the warehouse sees one login and the tool enforces the rule, for that tool only.',
          'People with **edit rights** on a restricted model usually see all of its rows.'
        ],
        lines: [
          'I own the table behind the rule.',
          'I know what the warehouse sees.',
          'I test the empty case.'
        ]
      })
    ]
  });
})();
