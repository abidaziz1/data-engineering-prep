/* Mission 9: documentation, exposures, contracts, groups, access and versions. */
(function () {
  var B = LAB.b, G = LAB.get;

  var F = G.file('models/marts/_marts__models.yml');
  var DOCS = G.file('models/docs.md');
  var EXPO = G.file('models/marts/_exposures.yml');
  var GROUPS = G.file('models/marts/_groups.yml');
  var EXPO_UP = G.ls('exposure_up').filter(function (n) { return n.indexOf('source:') !== 0; });

  LAB.addChapter({
    id: 'm9', n: 9, title: 'Docs, contracts and governance', short: 'Governance', blurb: 'Describe it, promise it, protect it from breaking changes', minutes: 28,
    focus: ['mon'],
    goals: [
      'Document models and columns, and generate the **docs site** with its lineage graph.',
      'Declare an **exposure**, so a dashboard shows up as a consumer.',
      'Protect a public model with a **contract**, **access** levels and **versions**.',
      'Choose between a **new column**, a **new version** and a **breaking change**.'
    ],
    say: 'Mission 9 is about trust at scale. Writing a model is easy. Letting thirty other people build on it without breaking each other is the hard part. dbt gives you four tools for that: descriptions, contracts, access rules and versions.',
    scenes: [
      B.talk({
        id: 'm9-talk', t: 1, title: 'Documentation that lives next to the code',
        say: 'Four points. Press Next for each.',
        items: [
          ['Descriptions in YAML', 'Every model and every column can have a `description` in the YAML file beside it. The text travels with the code, goes through the same pull request, and appears on the docs site.', 'Describe it where you define it.'],
          ['Doc blocks for long text', 'When a description is long or shared, write it once in a Markdown file with a `docs` block, and point to it with `doc()`. The order status text in this project is one.', 'One text, many columns.'],
          ['The site builds itself', '`dbt docs generate` writes the project description and the real column types from the warehouse. `dbt docs serve` shows it as a website with search and a lineage graph.', 'Docs are generated, not written twice.'],
          ['Exposures name the consumers', 'An exposure says "this dashboard depends on these models" and who owns it. It is not code that runs. It is a note that makes impact visible.', 'Lineage reaches all the way to the dashboard.']
        ],
        cols: 1
      }),

      B.code({
        id: 'm9-docs', t: 1, title: 'A doc block', file: 'models/docs.md', lang: 'text', code: DOCS,
        steps: [
          { say: 'This is a Markdown file in the models folder. Press Next.', lines: null },
          { say: 'The docs tag opens a block with a name. Everything up to the enddocs tag is the text, written in plain Markdown.', lines: G.span(DOCS, /\{% docs order_status %\}/) },
          { say: 'The text explains each status in business words. Anyone reading the docs site learns what PLACED means without asking.', lines: G.span(DOCS, /^Where an order/, /^`SHIPPED`/) },
          { say: 'The block closes here. In YAML, a column writes its description as doc(order_status), and the text appears there. The staging YAML in Mission 6 does exactly that.', lines: G.span(DOCS, /\{% enddocs %\}/) }
        ]
      }),

      B.term({
        id: 'm9-gen', t: 1, title: 'Generating the docs',
        say: 'One command writes the catalog. dbt asks the warehouse for the real column names and types, and combines them with your descriptions.',
        lines: function () { return G.term('docs_generate'); },
        after: 'The result is `manifest.json` (your project) and `catalog.json` (the warehouse). `dbt docs serve` turns them into a site you can click through. Many teams generate the docs on every merge and host the files.',
        afterKind: 'tip',
        doneSay: 'The graph on that site is the one from Mission 2. It is always current, because it comes from the code.'
      }),

      B.code({
        id: 'm9-expo', t: 1, title: 'An exposure: naming the consumer', file: 'models/marts/_exposures.yml', lang: 'yaml', code: EXPO,
        steps: [
          { say: 'An exposure describes something outside dbt that reads your models. Press Next.', lines: null },
          { say: 'A name, a label for people, the kind of thing it is, how mature it is, and a link to open it.', lines: G.span(EXPO, /- name: finance_dashboard/, /url:/) },
          { say: 'The important part: which models it depends on. This one reads fct_daily_revenue, and through it, everything that feeds that table.', lines: G.span(EXPO, /depends_on:/, /ref\('fct_daily_revenue'\)/) },
          { say: 'And who to call. When a model changes, the owner is the person to tell.', lines: G.span(EXPO, /owner:/, /email:/) }
        ],
        note: 'I ran `dbt ls --select +exposure:finance_dashboard`: it listed ' + EXPO_UP.join(', ') + '. That is everything the finance dashboard depends on.'
      }),

      B.code({
        id: 'm9-contract', t: 1, title: 'A contract: a promise about the shape', file: 'models/marts/_marts__models.yml', lang: 'yaml', code: F,
        steps: [
          { say: 'A contract says which columns a model returns and their types. If the SQL does not match, the build fails before the table changes. This is the real YAML for the daily revenue model. Press Next.', lines: null },
          { say: 'The model, its description, and its config. Four settings matter here: a tag, a group, an access level, and the contract switch. Groups and access come next.', lines: G.span(F, /^  - name: fct_daily_revenue/, /enforced: true/) },
          { say: 'Each column lists its name and its type. The date column also has a constraint: not null. With an enforced contract, dbt checks that the model returns exactly these columns with these types.', lines: G.span(F, /^      - name: order_date/, /data_type: decimal\(38, 2\)/) }
        ],
        note: 'A contract checks names, order and types. A constraint such as `not_null` is passed to the warehouse when it supports it. A contract is not a data test: it guards the shape, not the values.'
      }),

      B.term({
        id: 'm9-contractfail', t: 2, title: 'A contract that fails', g: 'dag',
        say: 'Someone renamed revenue_usd to revenue in the model. Here is the real error. Watch where the build stops.',
        initial: G.wait('dag'),
        lines: function () { return G.term('contract_fail'); },
        after: 'The table shows both sides: `revenue` is in the model and **missing in contract**, and `revenue_usd` is in the contract and **missing in definition**. The build failed **before** the old table was replaced, so the dashboard still reads good data.',
        afterKind: 'warn',
        doneSay: 'Without the contract, the table would have been replaced and the dashboard would have broken at nine in the morning.'
      }),

      B.code({
        id: 'm9-access', t: 2, title: 'Groups and access levels', file: 'models/marts/_groups.yml', lang: 'yaml', code: GROUPS,
        steps: [
          { say: 'A group is a team that owns a set of models. This file defines one, with an owner. Press Next.', lines: null },
          { say: 'The group name is what models refer to in their config. The owner is who to ask.', lines: G.span(GROUPS, /- name: finance/, /email:/) }
        ],
        note: 'A model chooses its access: **private** models can be used only by models in the same group, **protected** (the default) by any model in the same project, and **public** by any project. fct_daily_revenue is public, and it belongs to the finance group.'
      }),

      B.term({
        id: 'm9-accessfail', t: 2, title: 'Breaking the privacy rule',
        say: 'I made int_orders__with_items private to a core group and added a finance model that reads it. dbt refuses at parse time, before any SQL runs.',
        lines: function () { return G.term('access_fail'); },
        after: 'The message names the **two models** and the **group** that owns the private one. Nothing was built. This is the cheap way to keep teams from depending on each other\'s internals.',
        afterKind: 'warn',
        doneSay: 'Private for internals, public for the interface. Everything else in between is protected.'
      }),

      B.code({
        id: 'm9-ver', t: 2, title: 'Model versions', file: 'models/marts/_marts__models.yml', lang: 'yaml', code: F,
        steps: [
          { say: 'Sometimes a public model must change in a way that breaks users. A version lets two shapes live side by side. Press Next.', lines: null },
          { say: 'dim_products declares that version 2 is the latest. Anyone who calls ref without a version gets the latest.', lines: G.span(F, /^  - name: dim_products/, /latest_version: 2/) },
          { say: 'Version 1 stays available, with a date after which it is deprecated. People get a warning and time to move.', lines: G.span(F, /^      - v: 1/, /deprecation_date/) },
          { say: 'Version 2 includes all columns of the model except the old name, and adds the new ones: the renamed price column, and a price band.', lines: G.span(F, /^      - v: 2/, /premium for list prices/) }
        ],
        note: 'Each version is its own SQL file: `dim_products_v1.sql` and `dim_products_v2.sql`. Other models ask for one with `ref(\'dim_products\', v=1)`.'
      }),

      B.term({
        id: 'm9-vers', t: 2, title: 'Both versions exist',
        say: 'dbt ls shows the two versions of dim_products, and which one is the latest. These are the real lines it printed.',
        lines: function () { return G.term('versions_ls'); },
        after: 'Two entries with the same name and `version` 1 and 2. A plain `ref(\'dim_products\')` returns **version 2**, the latest. To read the old one you must ask for it with `v=1`.',
        afterKind: 'tip',
        doneSay: 'Same name, two versions. The default is always the latest.'
      }),

      B.term({
        id: 'm9-dep', t: 2, title: 'Using a version after its deprecation date',
        say: 'I moved the deprecation date of version 1 into the past and ran a model that still reads it. Watch the warnings.',
        lines: function () { return G.term('deprecated_v1'); },
        after: 'The model **still builds**. dbt only warns, and the warning names the version, the date and the new version to move to. That is the point of a deprecation date: it is a nudge with a deadline, not a lock.',
        afterKind: 'tip',
        doneSay: 'A warning each run is annoying on purpose. Remove the old version when the last reader is gone.'
      }),

      B.cmp({
        id: 'm9-protect', t: 2, title: 'Four ways to protect a consumer',
        say: 'Each tool protects against a different mistake. Press Next to read them.',
        cols: ['Tool', 'It stops', 'It fails', 'You use it for'],
        hl: 1,
        rows: [
          ['Tests', 'Bad values reaching consumers', 'After the model is built', 'Keys, rules, values'],
          ['Contract', 'A change of columns or types', 'Before the table is replaced', 'Public interfaces and BI tables'],
          ['Access and groups', 'Other teams using internal models', 'At parse time', 'Hiding the building blocks'],
          ['Versions', 'A breaking change hitting everyone at once', 'It does not fail. It gives people time', 'Planned, breaking changes']
        ],
        steps: [
          { upto: 2, say: 'Tests guard the values. A contract guards the shape, and it fires before the damage.' },
          { upto: 4, say: 'Access hides internals, and versions manage the moment you must break the interface.' }
        ],
        pick: 'Put a **contract** on every model that a dashboard or another team reads. Mark internals **private** or leave them **protected**. Use **versions** only for real breaking changes, because each one is a model you maintain twice.'
      }),

      B.quiz({
        id: 'm9-q1', t: 1,
        q: 'What does `dbt docs generate` produce?',
        opts: [
          { t: 'The files that describe your project and the real warehouse columns, which `dbt docs serve` shows as a site', fb: '' },
          { t: 'A PDF manual of your SQL', fb: 'It produces JSON files for a website.' },
          { t: 'Descriptions written automatically by an AI', fb: 'Descriptions come from you. dbt only collects them.' },
          { t: 'A copy of the data for the BI tool', fb: 'Docs hold no data.' }
        ],
        ok: 0, why: 'It writes `manifest.json` with your project and `catalog.json` with the column types it read from the warehouse. The site shows them with search and a lineage graph. The quality of the docs is the quality of the descriptions you wrote.'
      }),

      B.quiz({
        id: 'm9-q2', t: 2,
        q: 'A model has an enforced contract. Someone changes its SQL so that a column has a different type. What happens in `dbt build`?',
        opts: [
          { t: 'The build of that model fails before the existing table is replaced', fb: '' },
          { t: 'The table is replaced, and a warning is printed afterwards', fb: 'A contract fails the build. It is not a warning.' },
          { t: 'dbt silently casts the column back to the contract type', fb: 'dbt does not cast. It compares and fails on a mismatch.' },
          { t: 'Nothing, because contracts only apply to views', fb: 'They apply to tables as well as views, with some warehouse limits.' }
        ],
        ok: 0, why: 'dbt compares the names, order and types the model returns with the contract before it creates the new table. A mismatch is a compilation error, so the old table stays and the dashboard keeps working.'
      }),

      B.quiz({
        id: 'm9-q3', t: 2,
        q: 'Which access level lets **any other dbt project** use a model?',
        opts: [
          { t: 'private', fb: 'Private limits use to the same group.' },
          { t: 'protected', fb: 'Protected is the default and limits use to the same project.' },
          { t: 'public', fb: '' },
          { t: 'exposed', fb: 'That is not an access level.' }
        ],
        ok: 2, why: 'Public models are the interface of your project. Keep that list short and give them contracts, because other teams will depend on every column.'
      }),

      B.decide({
        id: 'm9-dec', t: 2, title: 'Decision: renaming a column in a public model',
        scenario: 'The column `list_price_usd` in `dim_products` must become `price_usd`. **Six dashboards** and **two other teams** read it. Finance wants the change by the end of the month.',
        opts: [
          { t: 'Rename it and post in Slack', d: 'Done in a minute.', lose: 'Six dashboards break at the next run. Nobody reads the message before 9 AM.' },
          { t: 'Publish a version 2 with the new name and set a deprecation date on version 1', d: 'Both shapes exist during the migration. People move at their own pace, and the old version warns.' },
          { t: 'Add the new column next to the old one and delete the old one later without telling anybody', d: 'No extra model.', lose: 'The deletion is still a breaking change for anyone who missed the news, and nothing warns them.' }
        ],
        pick: 1,
        why: 'A version makes the break **explicit and survivable**. Consumers see a deprecation warning, can find themselves with lineage, and choose when to move. You also learn who is still on version 1 by the date you set.',
        when: 'For a purely additive change, such as a new column, no version is needed. For a small internal project with one reader, rename it and fix the reader in the same pull request.'
      }),

      B.talk({
        id: 'm9-mesh', t: 3, title: 'Beyond one project: Mesh and the semantic layer',
        say: 'Two newer ideas sit on top of contracts and access. Both are moving quickly, so check the current documentation before you rely on the details.',
        items: [
          ['Several projects, one platform (dbt Mesh)', 'Large companies split one big project into several that depend on each other. A project exposes its public models, and another project can reference them with a two-argument ref, for example the project name and the model name. When this course was built, cross-project references were part of the hosted platform. Check which plan includes them.', 'Public models are the interface between projects.'],
          ['Metrics in YAML (the semantic layer)', 'Instead of every dashboard re-computing "revenue", you define it once in YAML as a metric on top of your models, and tools ask for it by name. The dbt Core 1.12 release notes mention an updated semantic layer specification. Whether you need it depends on how many tools compute the same numbers.', 'Define a metric once. Query it from anywhere.'],
          ['What this means for you', 'Both are the same answer to the same problem as this mission: many people build on shared data, so make the interface explicit. In an interview, show that you understand the problem before you name a product.', 'Interfaces first, products second.']
        ],
        cols: 1
      }),

      B.qa({
        id: 'qa-docs', t: 1, tag: 'Governance', secs: 60,
        q: 'How do you document a dbt project so that people actually use the documentation?',
        pts: ['Descriptions in YAML next to the code, reviewed in pull requests', 'Doc blocks for shared and long text', 'dbt docs generate on every merge, hosted somewhere people can reach', 'Exposures so dashboards appear in the lineage', 'Require descriptions on public models in CI', 'Name the owner'],
        short: 'I keep documentation in the same pull request as the code. Every model and every column in a mart gets a description in the YAML next to it, so a change to the model is reviewed together with its explanation. Long or shared text, such as what each order status means, goes in a doc block that several columns point to.\n\nI generate the docs on every merge to main and host them where analysts can find them, because documentation nobody opens is wasted. The lineage graph comes free from the ref and source calls, and I add exposures so dashboards appear in it with an owner. That lets someone ask "who reads this table" and get names.\n\nTo keep it alive, CI checks that public models have descriptions on the model and on every column, and I treat a missing description as a review comment. I document the grain of each model first, because that is the question people ask most.',
        fu: [
          ['How do you enforce descriptions?', 'A CI check or a package such as dbt-project-evaluator that fails when a public model has no description. Pick one rule and keep it simple.'],
          ['Where do you host the docs?', 'On any static host: object storage with a website, GitHub Pages, or the hosted platform. The files are static.']
        ],
        trap: 'Saying "we document in Confluence". Documentation that lives away from the code goes out of date at the first change.',
        real: 'Describe how people actually found answers in your docs, and how you measured it.'
      }),

      B.qa({
        id: 'qa-breaking', t: 2, tag: 'Governance', secs: 90,
        q: 'How do you prevent a change to a model from breaking dashboards and other teams?',
        pts: ['Know the consumers: lineage and exposures with owners', 'Contracts on public models fail the build before the table changes', 'Access levels hide internals so others do not depend on them', 'Additive changes are safe; breaking changes get a new version and a deprecation date', 'CI runs the model and its children, and tests them', 'Announce, give time, track who is still on the old version'],
        short: 'I start with knowing who depends on what. Lineage and exposures show the children of a model, including dashboards, with owners I can contact. Then I make the interface explicit. Models that others read are public and have an enforced contract, so a change of column names or types fails the build before the table is replaced. Everything else is private or protected, so other teams cannot depend on internals.\n\nWhen a breaking change is needed, I avoid doing it in place. I publish a new version of the model, set a deprecation date on the old one, and tell the consumers. Both shapes exist during the migration, the old one prints a warning, and I can see who is still on it by the date. Additive changes, like a new column, need no version.\n\nIn CI I build the changed model and its children and run their tests, so a break inside the project shows before merge. After the deprecation date, I remove the old version.',
        fu: [
          ['What do you do about consumers outside dbt?', 'Exposures cover dashboards you register. For ad hoc queries, I check warehouse query history for the table before I remove or rename a column.'],
          ['Do contracts replace tests?', 'No. A contract guards the shape of the table. Tests guard its values.']
        ],
        trap: 'Saying "we tell people in Slack". Announcements help, but the build should fail when the interface breaks.',
        real: 'Describe a change that nearly broke a dashboard and which of these tools would have caught it.'
      }),

      B.recap({
        id: 'm9-recap', n: 9, badge: 'Governance Lead', color: '#C7D2FE',
        pts: [
          '**Descriptions** live in YAML. **Doc blocks** share long text. `dbt docs generate` builds the site and the lineage graph.',
          '**Exposures** name dashboards and owners, so impact is visible.',
          'A **contract** checks names and types, and fails before the table is replaced.',
          '**Access** levels: private, protected, public. **Groups** say who owns what.',
          'A breaking change gets a **new version** with a deprecation date.'
        ],
        lines: [
          'Every public model has a contract and a description.',
          'I never rename a column in place in a model other people read.',
          'Lineage tells me who is affected before I change anything.'
        ]
      })
    ]
  });
})();
