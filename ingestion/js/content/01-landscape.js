/* Mission 1: what an ingestion tool does, and the families of tools. first_load.py ran for real with dlt on DuckDB. */
(function () {
  var B = LAB.b, G = LAB.get;
  var C = G.counts, X = G.text, n = G.n, M = function (k) { return G.meta(k); };
  var F = C('first'), SP = G.file('shop_pipeline.py');
  G.expect(F.orders === 100 && F.lines === 200 && F.tables.indexOf('orders__lines') >= 0 && F.tables.indexOf('_dlt_loads') >= 0, 'a first load writes 100 orders, 200 lines in a child table, and the tables of dlt');
  G.expect(F.columns.indexOf('customer__id') >= 0 && F.columns.indexOf('_dlt_load_id') >= 0 && F.columns.indexOf('_dlt_id') >= 0, 'the customer object became columns, and dlt added its two ids');

  LAB.addChapter({
    id: 'm1', n: 1, title: 'What an ingestion tool does', short: 'Landscape', blurb: 'A first load, what it leaves behind, and the families of tools', minutes: 19,
    focus: ['src'],
    goals: [
      'Say what a **connector** does, and what it leaves in the destination.',
      'Explain **ELT**, and why the raw tables come first.',
      'Name the **families of tools** and one case where each one fits.',
      'Spot a **join to a child table** that multiplies rows.'
    ],
    say: 'An ingestion tool does four jobs: it reads a source, handles pages and limits, writes the rows to a destination, and remembers where it stopped. I ran a first load with dlt and looked at everything that it left in the database.',
    scenes: [
      B.term({
        id: 'm1-first', t: 1, src: 'rec', title: 'A first load: 100 orders into DuckDB',
        say: 'I loaded the first day of a pretend shop API with dlt, and then looked at what was in the database. The replay calls the language Python: the program is `first_load.py`.',
        lines: function () { return G.plain(X('first.run')); },
        after: 'The shop had **' + n(F.orders) + '** orders. dlt wrote **' + n(F.orders) + '** rows into `orders` and **' + n(F.lines) + '** rows into `orders__lines`: the **list of lines** inside each order became a **child table**, and the **customer object** became two columns, `customer__id` and `customer__tier`. dlt added `_dlt_load_id` and `_dlt_id` to every row, and three tables of its own: `_dlt_loads`, `_dlt_pipeline_state` and `_dlt_version`. Nobody wrote a `create table`.',
        afterKind: 'tip',
        doneSay: 'The tool made the tables.'
      }),

      B.code({
        id: 'm1-code', t: 1, src: 'rec', title: 'shop_pipeline.py: a pipeline and a resource', file: 'shop_pipeline.py', lang: 'python', code: SP,
        steps: [
          { say: 'The dlt side of the course in one file. Press Next.', lines: null },
          { say: 'A **pipeline** has a name, a **destination** (a DuckDB file here), and a dataset name. It also keeps a folder for its own state.', lines: G.span(SP, /^def make_pipeline/, /pipelines_dir/) },
          { say: 'A **resource** is a function that yields rows. Here it reads the shop **page by page** and yields each page. Its **write disposition** (`append`, `replace` or `merge`) says what to do with the rows that already exist.', lines: G.span(SP, /^def orders_resource/, /kw\.update\(hints\)/) },
          { say: 'With a **cursor**, the resource asks the API only for the orders changed since the last run: `updated_at >= last_value`. That is `dlt.sources.incremental`.', lines: G.span(SP, /if cursor:/, /yield page/) },
          { say: '`pipeline.run` extracts, normalizes and loads. The program counts the rows that the run wrote, so that every lesson can compare runs.', lines: G.span(SP, /^def run\(/, /row_counts/) }
        ],
        note: 'The shop API is a stand-in: a Python function with fixed rules, `source.get_orders(day, since)`. Real APIs add rate limits, retries and secrets, which mission 5 covers from documentation.'
      }),

      B.cmp({
        id: 'm1-elt', t: 1, src: 'docs', title: 'ETL or ELT',
        say: 'Two orders of the same three steps. Press Next to read how they differ.',
        cols: ['', 'ETL', 'ELT'],
        hl: 2,
        rows: [
          ['Order', 'Extract, transform, then load', 'Extract, load, then transform'],
          ['Where the transform runs', 'In the pipeline, before the warehouse', 'In the warehouse, with SQL (for example dbt)'],
          ['What the warehouse holds', 'Only the cleaned result', 'The raw copy and the cleaned tables'],
          ['When the logic is wrong', 'Re-read the source, if it still has the data', 'Re-run the SQL on the raw copy'],
          ['The ingestion tool is', 'Part of the business logic', 'A plain copier that must be dependable']
        ],
        steps: [
          { upto: 3, say: 'ELT keeps a raw copy. When a rule is wrong you fix the SQL and run it again, and you do not depend on the source still having the old data.' },
          { upto: 5, say: 'This is why ingestion tools aim to be boring copiers, and why Fivetran, Airbyte and dlt all load first and leave the cleaning to dbt or SQL.' }
        ]
      }),

      B.cmp({
        id: 'm1-families', t: 1, src: 'docs', title: 'Five families of ingestion tools',
        say: 'Tools differ in who runs them and what they read. Press Next to read the families, with examples.',
        cols: ['Family', 'Examples', 'You run', 'A good fit'],
        hl: 0,
        rows: [
          ['Managed ELT service', 'Fivetran, Airbyte Cloud, Stitch, Hevo', 'A connection in a screen. The vendor runs it', 'Common SaaS sources, a small team, no wish to run servers'],
          ['Open-source framework', 'Airbyte self-hosted, dlt, Meltano with Singer taps', 'The code or the platform, and its servers', 'A source that nobody sells a connector for, or a need for control and a fixed cost'],
          ['Log-based change capture', 'Debezium with Kafka Connect, AWS DMS, Google Datastream', 'A reader of the database log, and often Kafka', 'A database source where deletes and a few seconds of lag matter'],
          ['Loaders of the platform', 'Snowpipe, COPY INTO, Databricks Auto Loader, BigQuery Data Transfer, Azure Data Factory copy', 'Little: a job on the platform that you already use', 'Files or streams that land in one warehouse or lake'],
          ['Custom code', 'A script, an Airflow task with requests', 'Everything', 'One odd source, and a team that will keep the script alive']
        ],
        steps: [
          { upto: 2, say: 'The first two families copy from **applications and APIs**. One sells the work, the other sells the code. The question is who owns the connector and its bugs.' },
          { upto: 4, say: 'Change capture and the loaders of a platform copy from **databases, files and streams**. They are narrower and often cheaper, and the Kafka course in this library records Debezium.' },
          { upto: 5, say: 'Custom code is always possible. Count the cost of paging, retries, state and schema changes before you choose it.' }
        ]
      }),

      B.bug({
        id: 'm1-bug', t: 1, q: 'A dashboard counts orders by joining the orders to their lines. It shows 200 orders, and the shop says 100. Click the line that counts the wrong thing.',
        file: 'count.sql', lang: 'sql',
        code: 'select count(*) as orders\nfrom shop.orders o\njoin shop.orders__lines l on l._dlt_parent_id = o._dlt_id;\n',
        bad: [1],
        hint: 'What does one row of this join stand for?',
        why: 'Each order has one to three **lines**, so the join gives **one row for each line**: **' + n(F.lines) + '** rows for **' + n(F.orders) + '** orders. A child table multiplies the parent. Count **distinct** orders, or count `orders` alone when no column of the lines is needed.',
        fix: 'select count(distinct o.id) as orders\nfrom shop.orders o\njoin shop.orders__lines l on l._dlt_parent_id = o._dlt_id;\n',
        cheer: 'Count what you mean.'
      }),

      B.bug({
        id: 'm1-bug2', t: 1, q: 'The nightly job loads the orders, and the table always has 50 rows although the shop has 100. Click the line that stops too early.',
        file: 'resource.py', lang: 'python',
        code: '@dlt.resource(name=\'orders\', write_disposition=\'merge\', primary_key=\'id\')\ndef orders():\n    yield next(source.get_orders(1))\n',
        bad: [3],
        hint: 'The API answers in pages of 50. How many pages does this read?',
        why: 'The API gives the orders **in pages** of 50, and `next(...)` reads **only the first page**. The job did not fail: it loaded what it asked for. A loader must **walk every page**, and a check against the source count (50 against 100) catches it on the first night.',
        fix: '@dlt.resource(name=\'orders\', write_disposition=\'merge\', primary_key=\'id\')\ndef orders():\n    for page in source.get_orders(1):\n        yield page\n',
        cheer: 'Read every page.'
      }),

      B.quiz({
        id: 'm1-q1', t: 1,
        q: 'What is ELT?',
        opts: [
          { t: 'Load the raw data into the warehouse first, and transform it there afterwards', fb: '' },
          { t: 'Transform the data in the pipeline, then load only the result', fb: 'That is ETL.' },
          { t: 'Extract only the data that changed', fb: 'That is an incremental load, which is a separate idea.' },
          { t: 'A tool made by one vendor', fb: 'It is an order of steps, not a product.' }
        ],
        ok: 0, why: 'The first load of this mission wrote **raw** tables, and the cleaning is left to SQL later. A wrong rule is fixed in SQL on the raw copy, with no new read of the source.'
      }),

      B.quiz({
        id: 'm1-q2', t: 1,
        q: 'An order has a list of lines inside it. dlt wrote 100 rows into `orders` and 200 into `orders__lines`. Where did the lines go?',
        opts: [
          { t: 'Into a child table, linked to the order by `_dlt_parent_id`', fb: '' },
          { t: 'Into one text column of `orders`', fb: 'The recording shows a table of its own.' },
          { t: 'They were dropped', fb: 'The 200 rows are there.' },
          { t: 'Into one extra column for each line', fb: 'A list of any length does not fit in columns.' }
        ],
        ok: 0, why: 'The recording lists the table `orders__lines` with **' + n(F.lines) + '** rows. A join from the order to its lines gives one row for each line, so a count over the join counts lines.'
      }),

      B.quiz({
        id: 'm1-q3', t: 1,
        q: 'A connector runs every night. What must it keep between two runs?',
        opts: [
          { t: 'Its state: where it stopped, for example the last `updated_at` that it saw', fb: '' },
          { t: 'A copy of every row that it loaded', fb: 'The destination already has the rows.' },
          { t: 'Nothing: each run starts from zero', fb: 'That is a full refresh, and it is slow and costly for large tables.' },
          { t: 'The password of the shop', fb: 'Secrets are kept elsewhere, and they are not what lets a run continue.' }
        ],
        ok: 0, why: 'The diagram has a box for it: the **state**. dlt kept it in the pipeline folder and in a table of the destination (`_dlt_pipeline_state`), and mission 5 shows the difference.'
      }),

      B.quiz({
        id: 'm1-q4', t: 2, src: 'docs',
        q: 'A Postgres source must reach the warehouse within seconds, and deleted rows must disappear there too. Which family fits best?',
        opts: [
          { t: 'Log-based change capture, for example Debezium or a cloud service on the database log', fb: '' },
          { t: 'A nightly full export', fb: 'It has a day of lag.' },
          { t: 'An incremental load on `updated_at`', fb: 'It never sees a delete.' },
          { t: 'A custom script that polls every second', fb: 'It adds load to the database and still misses deletes.' }
        ],
        ok: 0, why: 'A change capture tool reads the **log** of the database, which records every insert, update and delete in order. Mission 2 shows in a recording why a cursor cannot see a delete. This is from documentation, and the Kafka course records Debezium.'
      }),

      B.order({
        id: 'm1-ord', t: 1, q: 'Put the steps in order to set up ingestion for a new source.',
        items: ['List the tables or endpoints, and how each one changes', 'Choose the load method for each one (full, incremental, change capture)', 'Run a first load and compare the counts with the source', 'Run it again and prove that a repeat changes nothing', 'Add alerts for freshness, volume and schema changes'],
        why: 'The choice of method depends on how the data changes, so you look at the source first. A load that you have not repeated is not proven, and an alert is what keeps it calm after you leave.'
      }),

      B.decide({
        id: 'm1-dec', t: 2, src: 'docs', title: 'Decision: buy or build the ingestion for 12 SaaS sources and one Postgres?',
        scenario: 'Brewline has twelve SaaS tools (ads, payments, support, shop) and one Postgres. The data team has three engineers. Marketing wants the numbers every morning, and finance wants deleted records handled correctly.',
        opts: [
          { t: 'A managed ELT service for the SaaS sources, and change capture for Postgres', d: 'The vendor owns the connectors, the paging and the changes of the APIs. The engineers work on models.', lose: 'A bill that grows with usage, and little control when a connector misbehaves.' },
          { t: 'An open-source framework (dlt or self-hosted Airbyte) for all of it', d: 'Full control, a fixed cost, and code in Git.', lose: 'The team owns every connector bug, the servers, and the upgrades.' },
          { t: 'Custom scripts in Airflow for everything', d: 'No new tool to learn.', lose: 'Paging, retries, state and schema changes are rebuilt twelve times.' }
        ],
        pick: 0,
        why: 'Three engineers should spend their time on models and quality. A managed service covers the **commodity** connectors, and change capture handles the one source where deletes and lag matter. The options are from documentation, and no vendor was compared here.',
        when: 'If one source is not sold as a connector, write that one with dlt, and keep the managed service for the rest. If the volume is huge and the budget is fixed, move the largest sources to an open-source tool.'
      }),

      B.incident({
        id: 'm1-inc', t: 2, src: 'rec', title: 'Incident: the dashboard counts twice the orders of the shop', time: '09:05',
        alert: '**The orders dashboard shows 200 orders, and the shop says 100.** A new column was added to the dashboard query this morning: the SKU of each line. The query joins `orders` to `orders__lines`. Nothing failed.',
        clues: ['The number is exactly the number of rows in the lines table', 'The query joins to a child table', 'The count was right yesterday, before the SKU was added'],
        opts: [
          { t: 'Count distinct orders, or aggregate the lines first and join the result to the orders', fb: '' },
          { t: 'Delete the duplicates in `orders`', fb: 'There are no duplicates in `orders`: the join made them.' },
          { t: 'Reload the orders from the shop', fb: 'The load was right: 100 rows.' },
          { t: 'Divide the count by two', fb: 'Orders have one to three lines, not two.' }
        ],
        best: 0,
        why: 'The recording shows it: **' + n(F.orders) + '** orders and **' + n(F.lines) + '** lines. A join to a child table gives **one row for each line**, so any count or sum of an order-level column is multiplied. Count distinct ids, or collapse the lines to one row for each order before the join.',
        checks: [
          ['Compare with the source', '200 against 100.'],
          ['Count the child table', '200 rows in orders__lines.'],
          ['Read the join', 'One row for each line.'],
          ['Fix and prevent', 'Count distinct orders, and test the grain of every model.']
        ],
        tell: 'The dashboard joined the orders to their lines, and a join to a child table gives one row for each line, so the count was the number of lines. I changed the query to count distinct orders, and I added a test that the model has one row for each order.',
        prevent: ['Know the **grain** (one row for each what) of every table', 'Test that a model keeps its grain', 'Compare a headline number with the **source** after every change']
      }),

      B.qa({
        id: 'qa-elt', t: 1, tag: 'Ingestion', secs: 60,
        q: 'What is the difference between ETL and ELT, and why did ELT win?',
        pts: ['The order of the steps', 'Raw copy in the warehouse', 'Transform with SQL', 'Fix by re-running'],
        short: 'In **ETL** the data is transformed in the pipeline and only the result is loaded. In **ELT** it is **loaded raw first and transformed in the warehouse**, usually with SQL and dbt. ELT won because warehouse compute is cheap and elastic, and because the **raw copy stays**: when a business rule is wrong I fix the SQL and run it again, and I do not need the source to still hold the old data. It also makes the ingestion tool a plain copier. In my run dlt loaded raw tables, including a child table for a list, and nothing was cleaned. ETL still fits when data must not reach the warehouse, for example personal data that is removed on the way.',
        fu: [['Where does PII removal go?', 'Before the load if it must never land; after, with masking and access rules, if the raw zone is protected.'], ['What is the downside of ELT?', 'The raw zone grows, and it needs access rules.']],
        trap: 'Saying ELT means no transformation.',
        real: 'Describe where you did the transformation, and why.'
      }),

      B.qa({
        id: 'qa-families', t: 1, tag: 'Ingestion', secs: 60,
        q: 'Which kinds of ingestion tools exist, and how do you choose?',
        pts: ['Managed, open source, change capture', 'Loaders of the platform, custom code', 'Who owns the connector', 'How the data changes'],
        short: 'I group them by **who runs them and what they read**. **Managed ELT services** (Fivetran, Airbyte Cloud, Hevo) run the connectors for common applications. **Open-source frameworks** (dlt, self-hosted Airbyte, Meltano) give control and code in Git, and I run them. **Log-based change capture** (Debezium, AWS DMS, Datastream) reads a database log, so it sees deletes and has seconds of lag. **Loaders of the platform** (Snowpipe, Auto Loader, COPY INTO) bring files and streams into one platform, and **custom code** covers the odd source. I choose by **how the data changes**, who should own the connector bugs, the team size, and the cost model. The comparison is from documentation, and I ran dlt and an Airbyte connector only.',
        fu: [['Where does Kafka fit?', 'As the transport between a change capture tool and the consumers. The Kafka course in this library records it.'], ['Your default for SaaS sources?', 'A managed service, unless the cost or a missing connector says otherwise.']],
        trap: 'Choosing by the tool that you already know.',
        real: 'Describe how you chose a tool for a source.'
      }),

      B.qa({
        id: 'qa-buy', t: 2, tag: 'Ingestion', secs: 60,
        q: 'When do you build ingestion yourself instead of buying it?',
        pts: ['No connector exists', 'Volume makes usage pricing too high', 'Control or compliance needs', 'The cost of owning it'],
        short: 'I build when **no connector exists** for a source, when **volume makes usage-based pricing the larger cost**, or when control, data residency or custom logic cannot be met by a service. Even then I use a **framework** such as dlt, not bare scripts, because it already handles paging, state, schema inference, merges and contracts: in my recording it loaded 100 orders and a child table in a few lines. I count the **cost of owning** it: connector bugs, API changes, upgrades, on-call and monitoring. For standard SaaS sources a service is usually cheaper than the engineers that it saves. This is a judgement from documentation, and I did not compare prices here.',
        fu: [['How do you keep a custom connector alive?', 'Tests against recorded responses, contract checks on the schema, alerts on volume and freshness.'], ['Hybrid?', 'Yes: buy the commodity connectors and write the few that nobody sells.']],
        trap: 'Counting only the license, and not the on-call.',
        real: 'Describe a connector that you built, and what it cost.'
      }),

      B.recap({
        id: 'm1-recap', n: 1, badge: 'Loader', color: '#F5D0FE',
        pts: [
          'A connector **reads, pages, writes and remembers**. dlt made the tables itself: **' + n(F.orders) + '** orders, and **' + n(F.lines) + '** lines in a **child table**.',
          '**ELT** loads raw data first and transforms with SQL after, so a wrong rule is fixed without reading the source again.',
          'Five families: **managed ELT**, **open source**, **change capture**, **loaders of a platform** and **custom code**. Choose by how the data changes and who owns the connector.',
          'A join to a child table multiplies rows: count **distinct** orders and know the **grain**.',
          'A loader must walk **every page**, and compare its count with the source.'
        ],
        lines: [
          'I know what a connector leaves behind.',
          'I choose a family by how the data changes.',
          'I check the grain before I trust a count.'
        ]
      })
    ]
  });
})();
