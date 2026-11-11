/* Mission 12: governance. The catalog, lineage, data quality, policy tags and masking, row access policies, sensitive data, retention. A real BigQuery client built a column with a
   policy tag (offline). The row policy is a filter that DuckDB applied to the made-up orders, the "scan for personal data" is a STAND-IN made of two regular expressions (it is
   not Sensitive Data Protection), and the lineage was read from SQL text by sqlglot (it is not Dataplex). Dataplex, policy tags, data policies and Sensitive Data Protection were not
   reachable: what they do, their roles, and their limits are from documentation, and names in this area change often. This is engineering practice and not legal advice. */
(function () {
  var B = LAB.b, G = LAB.get;
  var CK = G.table('sql.checks'), LN = G.table('sql.lineage'), PS = G.table('sql.pii_scan'), RP = G.counts('sql.row_policy'), TG = G.file('bq/policy_tag_field.json'), BS = G.counts('bq.summary'), DC = G.counts('df.compile');
  var FL = G.table('cli.flags');
  G.expect(RP.orders === 20000 && RP.stores_in_the_table === 12 && RP.orders_visible_to_a_manager_of_s01 > 6000 && RP.orders_visible_to_a_manager_of_s01 < 7500, 'the row policy count');
  G.expect(LN.rows.length === 4 && LN.rows[0][1] === 'orders.order_ts' && LN.rows[3][1] === 'orders.total_cents', 'the lineage');
  var scan = function (c) { return PS.rows.filter(function (r) { return r[0] === c; })[0]; };
  G.expect(scan('customers.email')[2] === 1 && scan('customers.phone')[3] === 1 && scan('orders.status')[2] === 0 && scan('orders.channel')[3] === 0, 'the scan finds the e-mail and the phone columns');
  G.expect(BS.policy_tag_names.length === 1 && /policyTags\/9876543210$/.test(BS.policy_tag_names[0]), 'the policy tag');
  G.expect(CK.rows.length === 5 && CK.rows[0][1] === 0, 'the five checks');
  var dq = FL.rows.filter(function (r) { return r[0] === 'gcloud dataplex datascans create data-quality'; })[0];
  G.expect(dq[2] === '-' && /data-quality-spec-file/.test(dq[1]), 'the Dataplex flags exist');
  var n0 = function (x) { return x.toLocaleString('en-US'); };
  var YAML = [
    'rules:',
    '  - column: order_id',
    '    dimension: UNIQUENESS',
    '    uniquenessExpectation: {}',
    '  - column: order_id',
    '    dimension: COMPLETENESS',
    '    nonNullExpectation: {}',
    '  - column: total_cents',
    '    dimension: VALIDITY',
    '    rangeExpectation:',
    '      minValue: \'0\'',
    '  - column: status',
    '    dimension: VALIDITY',
    '    setExpectation:',
    '      values: [NEW, PAID, REFUNDED, CANCELLED]',
    '  - dimension: CONSISTENCY',
    '    description: every order has a store',
    '    sqlAssertion:',
    '      sqlStatement: SELECT o.store_id FROM ${data()} AS o LEFT JOIN `brewline-dev.curated.stores` AS s USING (store_id) WHERE s.store_id IS NULL'
  ].join('\n');
  var DQCMD = [
    'gcloud dataplex datascans create data-quality orders-quality \\',
    '  --location=asia-southeast1 \\',
    '  --data-source-resource="//bigquery.googleapis.com/projects/brewline-dev/datasets/curated/tables/orders" \\',
    '  --data-quality-spec-file=orders_quality.yaml'
  ].join('\n');
  var ROWSQL = [
    'CREATE ROW ACCESS POLICY manager_s01',
    'ON `brewline-dev.curated.orders`',
    'GRANT TO ("group:managers-s01@example.com")',
    'FILTER USING (store_id = "s01");'
  ].join('\n');
  var BUGG = [
    'GRANT `roles/bigquery.dataViewer`',
    'ON SCHEMA `brewline-dev.raw`',
    'TO "group:analysts@example.com";'
  ].join('\n');
  var FIXG = [
    'GRANT `roles/bigquery.dataViewer`',
    'ON SCHEMA `brewline-dev.curated`',
    'TO "group:analysts@example.com";',
    '-- the raw dataset, with the personal data, is not granted'
  ].join('\n');
  var BUGV = [
    'CREATE OR REPLACE VIEW `brewline-dev.share.orders_for_marketing` AS',
    'SELECT o.*, c.email, c.phone',
    'FROM `brewline-dev.curated.orders` AS o',
    'JOIN `brewline-dev.curated.customers` AS c USING (customer_id);'
  ].join('\n');
  var FIXV = [
    'CREATE OR REPLACE VIEW `brewline-dev.share.orders_for_marketing` AS',
    'SELECT o.order_id, o.store_id, o.order_ts, o.total_cents, c.loyalty_tier',
    'FROM `brewline-dev.curated.orders` AS o',
    'JOIN `brewline-dev.curated.customers` AS c USING (customer_id);'
  ].join('\n');

  LAB.addChapter({
    id: 'm12', n: 12, title: 'Governance: catalog, quality, tags and masking', short: 'Governance', blurb: 'Catalog and lineage, data quality, policy tags and masking, row policies, sensitive data and retention', minutes: 50,
    focus: ['qual', 'sf'],
    goals: [
      'Say what a **catalog**, **lineage** and a **quality scan** each give a data team.',
      'Write **data quality rules** and map them to the checks you already know.',
      'Use **policy tags** and **masking** to control a column, and a **row access policy** to control rows.',
      'Choose **where to enforce** access: dataset, view, tag, row policy or a separate copy.',
      'Find **personal data that nobody tagged**, and say what a real scanner adds.',
      'Plan **retention and deletion** across raw, staging and curated.'
    ],
    say: 'Mission 12 is the part of the platform that lets other people use it safely. A catalog tells people what exists, lineage tells you who depends on what, quality rules tell you whether to trust it, and tags and policies decide who sees which column and which row. Job descriptions that mention Dataplex ask for all of these. I built a column with a policy tag using the real BigQuery client, applied a row filter in DuckDB, read lineage from SQL text, and wrote a stand-in scanner out of two regular expressions to find personal data. The services themselves come from documentation, and I say so on each screen.',
    scenes: [
      B.flow({
        id: 'm12-flow', t: 1, src: 'docs', title: 'Governance around a table', g: 'governance', legend: true,
        steps: [
          { say: 'A governed table is more than a table. Around it sit a catalog entry, lineage, quality scans, tags and policies. Press Next to follow the pieces. Everything on this picture is from documentation, and the next screens add a few recorded demonstrations.', cap: 'A table, and what governs it.' },
          { say: 'Step 1. The tables are **registered in a catalog**: a searchable list with descriptions, owners, labels and the schema of every table. People find data here before they ask in a chat.', on: ['g1'], focus: ['g_tbl', 'g_cat'], cap: 'A catalog makes data findable.' },
          { say: 'Step 2. **Lineage** records which tables and jobs produced which. When a column changes, lineage tells you which reports and models depend on it.', on: ['g2'], focus: ['g_cat', 'g_lin'], cap: 'Lineage: who feeds whom.' },
          { say: 'Step 3. **Quality scans** run rules on a schedule and report scores: unique keys, no nulls, values in range. A failing score can stop a pipeline or page a person.', on: ['g3'], focus: ['g_lin', 'g_dq'], cap: 'Quality rules, on a schedule.' },
          { say: 'Step 4. **Policy tags** mark the sensitive columns. **Masking rules** are attached to a tag, so that a reader without the right role sees a hash or a null instead of the value. A **row access policy** filters rows by who is asking. Together they decide what each reader gets.', on: ['g4', 'g5', 'g6', 'g7'], focus: ['g_tbl', 'g_tag', 'g_mask', 'g_row', 'g_users'], cap: 'Tags, masking and row policies.' },
          { say: 'Step 5. A scan for **sensitive data** finds columns that look like e-mail addresses or card numbers and that nobody tagged. It feeds the tags: the gap between what you tagged and what exists is where a leak starts.', on: ['g8'], focus: ['g_dlp', 'g_tag'], cap: 'Find what nobody tagged.' }
        ]
      }),

      B.talk({
        id: 'm12-catalog', t: 1, src: 'docs', title: 'Catalog, glossary and lineage',
        say: 'Three ideas make a platform understandable to the people who did not build it. Press Next for each. This is from documentation, as I know it. The Google Cloud products in this area have been renamed and merged more than once, so check the current names: Data Catalog has been folded into Dataplex.',
        items: [
          ['The catalog', 'A **catalog** holds an **entry** for each data asset, with its schema, description, owner and labels, and **aspects**: extra structured metadata that you define, such as "owner team" or "contains personal data". BigQuery tables appear in it automatically. Search finds them by name, description or tag.', 'A search box for the data.'],
          ['The glossary', 'A **business glossary** defines terms, such as "active customer" and "net revenue", and links them to columns. It stops two teams from using one word for two numbers.', 'One definition for each word.'],
          ['Lineage', '**Lineage** is recorded for BigQuery jobs automatically, and integrations add Composer, Dataflow, Dataproc and others. The graph shows which table was built from which, and at best which column from which. It answers "if I change this, what breaks" and "where did this number come from".', 'The map of dependencies.']
        ],
        cols: 1
      }),

      B.rows({
        id: 'm12-lineage', t: 2, src: 'rec', title: 'Reading lineage from SQL: what a parser can see',
        steps: [
          {
            say: 'A catalog derives lineage from the jobs that ran. A parser can do part of that from the **SQL text**, and it shows the idea. I gave sqlglot the query of the daily sales table and asked where each column comes from. `sale_date` comes from `order_ts`, `store_id` from `store_id`, `revenue_cents` from `total_cents`. The column `orders` is a count of rows, so it has **no source column**.',
            tabs: [{ layer: 'RECORDED', name: 'Column lineage of the daily sales table', c: 'raw', cols: LN.cols, rows: LN.rows, trk: 0 }],
            notes: ['Recorded with sqlglot ' + G.meta('sqlglot') + ' on the query of the Dataform table of mission 10. This is a **stand-in**: Dataplex records lineage from what actually ran. It shows why column-level lineage is possible, and why a count has no parent column.']
          },
          {
            say: 'In practice, a person asks to rename `total_cents`, or to stop loading `order_ts` in the old format. Lineage lists the tables and reports that read it. Without it, the answer is "we will find out when it breaks".',
            tabs: [{ layer: 'RULE', name: 'Questions that lineage answers', c: 'raw', cols: ['Question', 'Without lineage', 'With lineage'], rows: [['What breaks if I rename this column?', 'You find out in production', 'A list of downstream tables and reports'], ['Where does this number come from?', 'Read many queries', 'Follow the graph back to the source'], ['Which tables hold personal data downstream of this one?', 'Guess', 'Walk the graph from the tagged column']], trk: 0 }],
            notes: ['Lineage is only as complete as the integrations. A manual export to a file, or a step that Dataplex does not see, breaks the chain.']
          }
        ]
      }),

      B.cmp({
        id: 'm12-dq-types', t: 1, src: 'docs', title: 'Data quality: the kinds of rule',
        say: 'Every quality tool offers the same small set of rules. Press Next to read them. The names are the rule types of Dataplex data quality, as I know them: check the current reference.',
        cols: ['Rule type', 'What it checks', 'Example on the orders'],
        hl: 1,
        rows: [
          ['Non-null', 'A column has no null', 'order_id, order_ts, store_id'],
          ['Uniqueness', 'No value appears twice', 'order_id'],
          ['Set', 'Values are in a list', 'status is NEW, PAID, REFUNDED or CANCELLED'],
          ['Range', 'A number is between bounds', 'total_cents is not below 0'],
          ['Regular expression', 'Text matches a pattern', 'an e-mail address has an @'],
          ['Row condition', 'A SQL condition holds for every row', 'qty is greater than 0'],
          ['Table condition and statistic range', 'A condition on the whole table, or a mean in a range', 'the average order is between 3 and 15 dollars'],
          ['SQL assertion', 'A query that returns the rows that break the rule', 'every order has a store that exists']
        ],
        steps: [
          { upto: 4, say: 'The first four are one-column checks, and they find most real problems: nulls, repeats, wrong values and out-of-range numbers.' },
          { upto: 6, say: 'A pattern and a row condition cover the rest of the rules about one row.' },
          { upto: 8, say: 'The last two are about the table as a whole and about relations between tables. The SQL assertion is the most general: any query that returns bad rows.' }
        ],
        pick: 'Start with **non-null, unique and range** on keys and amounts, add a **freshness** rule, and write a **SQL assertion** for each business rule that has ever gone wrong. A rule that never failed is a guess. A rule that failed once is evidence.'
      }),

      B.rows({
        id: 'm12-dq-map', t: 1, src: 'rec', title: 'The checks that you already ran, as rules',
        steps: [{
          say: 'In mission 6 I ran five checks as queries on the made-up orders. Each one is one of these rule types. Four pass with an empty result. The fifth, repeats in raw, finds **' + n0(CK.rows[4][1]) + '** rows, and that is the answer that was expected. It shows why a rule can need a **different expectation** for each layer.',
          tabs: [{ layer: 'RECORDED', name: 'Recorded checks, and the rule type of each', c: 'raw', cols: ['check', 'rows returned', 'verdict', 'rule type'], rows: [[CK.rows[0][0], CK.rows[0][1], CK.rows[0][2], 'uniqueness'], [CK.rows[1][0], CK.rows[1][1], CK.rows[1][2], 'non-null'], [CK.rows[2][0], CK.rows[2][1], CK.rows[2][2], 'SQL assertion'], [CK.rows[3][0], CK.rows[3][1], CK.rows[3][2], 'range'], [CK.rows[4][0], CK.rows[4][1], CK.rows[4][2], 'uniqueness, expected to fail in raw']], trk: 0 }],
          notes: ['Recorded: the checks ran in DuckDB on made-up data. The Dataform compiler of mission 10 produced ' + DC.assertions + ' assertions from the `config` of the orders table: the same idea in a different tool.']
        }]
      }),

      B.code({
        id: 'm12-dq-yaml', t: 1, src: 'docs', title: 'Quality rules as a file', file: 'orders_quality.yaml', lang: 'yaml', code: YAML,
        steps: [
          { say: 'A Dataplex data quality scan is described in a YAML file of rules. This one is from the documentation of the format, and I did not run it, because there is no project behind this course. It checks the orders table with the rule types of the last screen. Press Next.', lines: null },
          { say: 'The first two rules are the **key**: no repeats and no nulls. Each rule has a **dimension**, a label that groups results into a score: completeness, uniqueness, validity, consistency.', lines: G.span(YAML, /UNIQUENESS/, /nonNullExpectation/) },
          { say: 'A **range** rule keeps amounts at zero or more, and a **set** rule lists the values that a status may take. A new status that the application starts to send will fail this rule, which is the point.', lines: G.span(YAML, /rangeExpectation/, /values:/) },
          { say: 'A **SQL assertion** is a query that returns the rows that break the rule. `${data()}` stands for the table that is scanned. This one finds orders whose store does not exist.', lines: G.span(YAML, /sqlAssertion/, /sqlStatement/) }
        ],
        note: 'Rules can also carry a threshold (the share of rows that must pass), a name and a description. Check the current reference for the exact field names before you write a file for a real project.'
      }),

      B.code({
        id: 'm12-dq-cmd', t: 2, src: 'docs', title: 'Creating the scan', file: 'create_scan.sh', lang: 'bash', code: DQCMD,
        steps: [
          { say: 'A scan is created from the table to scan and the spec file. I checked that every flag exists in the help page of the installed `gcloud`: ' + dq[1].split(' ').length + ' flags, none missing. I did not run it. Press Next.', lines: null },
          { say: 'The **scan name** and the **location**. The location is one of the things that you cannot change later, like a dataset.', lines: G.span(DQCMD, /datascans create/, /location/) },
          { say: 'The **data source** is the full resource name of the BigQuery table, and the **spec file** is the YAML of the last screen. A scan can run on demand or on a schedule, and can publish its results to BigQuery or to the catalog.', lines: G.span(DQCMD, /data-source-resource/, /data-quality-spec-file/) }
        ],
        note: 'Pipelines can trigger a scan after a load, and read the result: a failed score then stops the next step. Dataform assertions do the same inside the SQL graph.'
      }),

      B.talk({
        id: 'm12-tags', t: 1, src: 'docs', title: 'Policy tags and masking',
        say: 'Column-level security in BigQuery works with tags. Press Next for the five steps. From documentation: check current names and the list of masking rules.',
        items: [
          ['A taxonomy of tags', 'A **taxonomy** is a tree of **policy tags**, for example `Sensitivity > PII` and `Sensitivity > Finance`. It lives in a project and a location, and is managed by the **data steward**, not by the pipeline.', 'A tree of sensitivity labels.'],
          ['Tag the column', 'A column in a table schema carries a policy tag. The next screen shows what that looks like in the API. Tagging is a change to the **schema**, so it can be reviewed in Terraform like any other.', 'The tag is part of the schema.'],
          ['Turn enforcement on', 'A tag does nothing until **fine-grained access control** is enforced for the taxonomy. Then a query that reads a tagged column needs a role on the tag, and fails without it. Selecting only untagged columns still works.', 'Enforcement makes the tag real.'],
          ['Roles on the tag', 'The **Fine-Grained Reader** role on a tag lets a reader see the plain value. Without it, the query that names the column is refused.', 'The role on the tag opens the column.'],
          ['Masking', 'A **data policy** attached to a tag says how to **mask** the column for readers who hold the **Masked Reader** role instead: a hash, a null, a default value, the first or last four characters, an e-mail mask, or a custom routine. The table keeps the real value, and the masked value is computed inside the query.', 'Mask for those who may see a shadow.']
        ],
        cols: 1,
        call: { k: 'warn', h: 'Check the list of masking rules in the documentation.', t: 'The rule names and exact outputs are in the reference, and the lab shows only the kind of result: a value, a hash, a null or a default.' }
      }),

      B.code({
        id: 'm12-tagfield', t: 1, src: 'rec', title: 'A column with a policy tag, as the client sends it', file: 'policy_tag_field.json', lang: 'json', code: TG,
        steps: [
          { say: 'I built this field with the real BigQuery client library and printed its API body, offline. It is a column called `email` with one **policy tag**. Press Next.', lines: null },
          { say: 'The column is an ordinary nullable `STRING`. Nothing about its type changes.', lines: G.span(TG, /"name"/, /"mode"/) },
          { say: '`policyTags` lists the **full resource names** of the tags: project, location, taxonomy and tag. The numbers in this one are made up. A column can have **one** policy tag.', lines: G.span(TG, /"policyTags"/, /\]/) }
        ],
        note: 'Recorded with google-cloud-bigquery ' + G.meta('google-cloud-bigquery') + ', offline. Nothing was created. In practice you set these tags in Terraform or in the schema file, so that a change is a pull request.'
      }),

      B.widget({ id: 'm12-lab', kind: 'mask', t: 1, src: 'docs', title: 'Lab: what each reader gets' }),

      B.talk({
        id: 'm12-row', t: 1, src: 'docs', title: 'Row access policies',
        say: 'Columns are one dimension of access. Rows are the other. Press Next for how a row access policy works.',
        items: [
          ['A filter, by principal', 'A **row access policy** is a `CREATE ROW ACCESS POLICY` statement that names who it is for (`GRANT TO`) and a **filter** (`FILTER USING`). A person in the group sees only the rows where the filter is true. The table itself is unchanged.', 'A WHERE that depends on who asks.'],
          ['Several policies add up', 'A table can have several policies. A reader sees the **union** of the rows that their policies allow. Once a table has any row policy, a reader who is in **none** of them sees **no rows**. Plan the policy for the pipeline account too.', 'No policy for you means no rows.'],
          ['What it costs', 'The filter runs on every query by that reader. It makes cached results and some optimisations less useful. For a few big groups it is fine, and for thousands of individual users, use a mapping table and one policy that checks it.', 'Filters run on every query.']
        ],
        cols: 1
      }),

      B.code({
        id: 'm12-row-sql', t: 1, src: 'docs', title: 'A row access policy for the managers of one store', file: 'row_policy.sql', lang: 'sql', code: ROWSQL,
        steps: [
          { say: 'This is the statement. I did not run it. Press Next.', lines: null },
          { say: 'The policy has a **name**, and it belongs to one table.', lines: G.span(ROWSQL, /^CREATE ROW ACCESS POLICY/, /^ON/) },
          { say: '`GRANT TO` names a **group**. Members of `managers-s01` are covered. Everyone else is not, which matters, as the earlier screen explained.', lines: G.span(ROWSQL, /GRANT TO/) },
          { say: '`FILTER USING` is the condition: only the rows of store s01.', lines: G.span(ROWSQL, /FILTER USING/) }
        ],
        note: 'The policy is a filter, so DuckDB can apply the same condition to the made-up orders. The next screen does.'
      }),

      B.rows({
        id: 'm12-row-rows', t: 1, src: 'rec', title: 'What a manager of one store sees',
        steps: [{
          say: 'I applied the filter of the policy to the made-up orders in DuckDB. The table has **' + n0(RP.orders) + '** orders in **' + RP.stores_in_the_table + '** stores. A manager of store s01 would see **' + n0(RP.orders_visible_to_a_manager_of_s01) + '** of them, about **' + Math.round(RP.orders_visible_to_a_manager_of_s01 / RP.orders * 100) + '%**: store s01 is the big one. Everyone else, in the model of the policy, sees none of the other stores.',
          tabs: [{ layer: 'RECORDED', name: 'Rows visible under the policy', c: 'raw', cols: ['who', 'rows visible'], rows: [['pipeline account (needs its own policy or none)', 'depends on its policy'], ['manager of store s01', n0(RP.orders_visible_to_a_manager_of_s01)], ['a person in no policy', '0']], trk: 0 }],
          notes: ['A **model**: DuckDB applied the filter `store_id = "s01"`. BigQuery enforces the policy for you. The count is real for this data.']
        }]
      }),

      B.cmp({
        id: 'm12-where', t: 2, src: 'docs', title: 'Where to enforce access',
        say: 'There are six places to hold a line. Each one fits a different need. Press Next to read the pattern.',
        cols: ['Control', 'Holds the line at', 'Good for', 'Cost'],
        hl: 2,
        rows: [
          ['IAM on a dataset', 'a whole dataset', 'Layers: raw, staging, curated', 'Coarse: all tables in it'],
          ['Authorized view or dataset', 'a query result', 'Sharing a slice without sharing the table', 'A view to maintain for each slice'],
          ['Policy tags and masking', 'a column', 'Personal and sensitive columns', 'A taxonomy, and a steward to run it'],
          ['Row access policy', 'rows by reader', 'Regional managers, per-tenant data', 'A filter on every query'],
          ['A separate copy or project', 'the data itself', 'A strictly different audience, or another legal area', 'Duplicated data and a pipeline to keep it right'],
          ['VPC Service Controls', 'the network boundary', 'Blocking exfiltration with a valid token', 'Careful setup, as in mission 2']
        ],
        steps: [
          { upto: 2, say: 'Dataset and view levels are the coarse tools: a layer, or a slice.' },
          { upto: 4, say: 'Tags and row policies are the fine ones: a column, and a set of rows.' },
          { upto: 6, say: 'A copy and a perimeter are the strong ones. Use them when a mistake is very costly.' }
        ],
        pick: 'Use the **coarsest** control that does the job, and add finer ones only where a real need appears: IAM on the layer, **tags** on personal columns, a **row policy** for regional teams. A view is a good way to **share**, and a poor way to **protect**.'
      }),

      B.talk({
        id: 'm12-dlp', t: 2, src: 'docs', title: 'Finding sensitive data: Sensitive Data Protection',
        say: 'You cannot tag a column that you do not know about. Press Next for the service that looks. From documentation: I could not call it, and the next screen is a stand-in.',
        items: [
          ['Inspect', 'Sensitive Data Protection (the service formerly called DLP) **inspects** data against **infoTypes**: built-in detectors for e-mail addresses, phone numbers, card numbers, national ids and more, with a likelihood for each finding, and context rules to cut false alarms. It can scan BigQuery tables, Cloud Storage files and text.', 'Detectors with a likelihood.'],
          ['Discover', '**Discovery** scans profile all the tables of a project or an organization on a schedule, and report which columns look sensitive, their risk and where the data goes. The results can be **tagged into the catalog**, so a policy tag follows.', 'Profile everything, regularly.'],
          ['De-identify', 'It can also **transform** data: mask part of a value, replace it with a token, encrypt it in a format-preserving way, bucket a number, or shift a date. Tokens let analysts join on a customer without seeing who it is.', 'Transform, and keep joins possible.'],
          ['Cost and speed', 'Inspection is billed by the amount of data scanned, so scan a **sample** first, and scan new data, not everything every day. A scan is a way to find the gap, not a replacement for tagging at design time.', 'Sample first, then schedule.']
        ],
        cols: 1
      }),

      B.rows({
        id: 'm12-scan', t: 1, src: 'rec', title: 'A stand-in scan: which columns look like personal data',
        steps: [
          {
            say: 'I wrote a **stand-in** for a scanner out of two regular expressions: one for an e-mail address and one for a phone number. I ran it on every text column of two made-up tables. It found the two columns that matter: **customers.email** (' + Math.round(scan('customers.email')[2] * 100) + '% of values look like an e-mail) and **customers.phone** (' + Math.round(scan('customers.phone')[3] * 100) + '% look like a phone number). The other six columns, including `orders.status` and `orders.channel`, matched nothing.',
            tabs: [{ layer: 'RECORDED', name: 'Share of values that match, by column', c: 'raw', cols: PS.cols, rows: PS.rows.map(function (r) { return [r[0], n0(r[1]), Math.round(r[2] * 100) + '%', Math.round(r[3] * 100) + '%']; }), trk: 0 }],
            notes: ['Recorded: DuckDB regular expressions on made-up tables. This is **not** Sensitive Data Protection, which has hundreds of detectors, likelihoods and context. It shows the idea, and its limit: it only finds what looks like the patterns that someone wrote.']
          },
          {
            say: 'The finding is the start of a task: **is the column tagged?** If `customers.email` has no policy tag, then anybody with read access to the dataset can see every address. A scan that finds an untagged column is an incident waiting, and a scan that finds none, on a schedule, is a control you can show an auditor.',
            tabs: [{ layer: 'RULE', name: 'Turning a finding into a control', c: 'raw', cols: ['Step', 'Who', 'Result'], rows: [['The scan finds a column that looks like e-mail addresses', 'a scheduled scan', 'a finding'], ['The steward confirms and picks the tag', 'a person', 'a policy tag on the column'], ['Enforcement and masking take effect', 'the platform', 'readers without the role see a mask'], ['The next scan finds nothing untagged', 'a scheduled scan', 'a clean report']], trk: 0 }],
            notes: ['A pattern in a column called `notes` or `comments` is the classic leak: free text that people fill with addresses and phone numbers. Scan free text columns first.']
          }
        ]
      }),

      B.talk({
        id: 'm12-retention', t: 2, src: 'docs', title: 'Retention and deletion across the layers',
        say: 'A rule that says "delete this person\'s data" or "keep this for a year" has to hold in every layer. Press Next for the engineering. This is practice and not legal advice: ask your legal and privacy teams which rules apply to you.',
        items: [
          ['Deletion by key', 'A person asks to be deleted. Their rows are in **raw** (every delivery), **staging**, **curated**, the marts and the snapshots, and maybe in Cloud Storage files. A deletion job must reach all of them, by a key. If the key is not in a table, you cannot find the rows: plan the keys at design time.', 'Delete by a key, in every layer.'],
          ['History keeps copies', '**Time travel** and **fail-safe** keep deleted data for days, and **snapshots** and **object versions** keep it for as long as you set. State this in the policy: a deletion is complete after the longest copy has expired, or after you have deleted the copies too.', 'A delete is complete when the copies are gone.'],
          ['Expiry is a feature', '**Partition expiration** and **table expiration** delete by age without a job. A lifecycle rule does the same for files. Use them for data that has a retention limit, and keep the rule in the table definition, as the DDL of mission 4 did.', 'Let the table delete by age.'],
          ['Evidence', 'Keep a **record** of each deletion request: when it arrived, which keys, which layers, when each was done. The audit logs show the DML that ran. A deletion that cannot be shown is hard to defend.', 'Keep proof that it was done.']
        ],
        cols: 1
      }),

      B.decide({
        id: 'm12-dec', t: 2, src: 'rec', title: 'Decision: regional managers, and phone numbers for nobody',
        scenario: 'Managers of each store may see the orders of **their own store** only. Analysts may see all orders, but **not the phone and e-mail** of customers. Marketing sees the e-mail masked as a hash, so they can count unique customers. There are ' + RP.stores_in_the_table + ' stores today and more every year.',
        opts: [
          { t: 'A separate copy of the orders table for each store, and one more without the personal columns', d: 'Each audience gets a plain table, and IAM on the dataset is enough.', lose: 'Twelve copies, growing, each with its own pipeline, schema changes to apply twelve times, and a risk that one copy drifts.' },
          { t: 'One table, **policy tags** on the personal columns with masking for marketing, and **a row access policy** for each manager group', d: 'One copy of the data. The tags and policies are code in Terraform, and a new store is one new policy.', lose: '' },
          { t: 'A view for each audience, with the columns and the filter written in SQL', d: 'No new features to learn.', lose: 'The views must be kept in step by hand, the base table is still readable by anybody with access to its dataset, and a missing column in one view leaks.' }
        ],
        pick: 1,
        why: 'The controls match the two dimensions of the need: tags and masking for **columns**, row policies for **rows**. They keep one copy of the data, and the rules live next to the tables, in review.',
        when: 'For a one-off share with a single partner, an authorized view of the slice is quicker and fine, as long as it is reviewed and its dataset is authorized.'
      }),

      B.bug({
        id: 'm12-bug', t: 1, q: 'Analysts are granted read access to the `raw` dataset "so that they can see the orders". A week later a privacy review finds that they can read customer e-mail addresses. Click the line that grants too much.',
        file: 'grant.sql', lang: 'sql', code: BUGG, bad: [2],
        hint: 'What else is in the raw dataset?',
        why: 'Access is granted on the **dataset**, so it reaches every table in it, including the table of customers with e-mail and phone. The raw layer keeps the data as it arrived, personal columns included. Grant on the **curated** dataset, where the columns are tagged and masked, and keep raw for the pipeline.',
        fix: FIXG,
        cheer: 'Grant on the layer that is meant to be read.'
      }),

      B.bug({
        id: 'm12-bug2', t: 2, q: 'A marketing view is meant to share orders without personal data. A reviewer rejects it. Click the line that must change.',
        file: 'share_view.sql', lang: 'sql', code: BUGV, bad: [2],
        hint: 'Which columns does this view expose?',
        why: 'The view selects `o.*` and the e-mail and the phone from the customers table, so it exposes personal data to everyone who can read the view, and an authorized view bypasses the tags of the underlying table. Name only the columns that the audience needs. A view that shares a slice must be written like a contract.',
        fix: FIXV,
        cheer: 'A view shares what it names.'
      }),

      B.incident({
        id: 'm12-inc', t: 1, src: 'rec', title: 'Incident: e-mail addresses in a table that everyone can read', time: '10:15',
        alert: '**A scan found a column of e-mail addresses in `staging.campaign_contacts`, which the whole analyst group can read.** The column has no policy tag. The table was created last month by a pipeline that loads a partner file.',
        clues: ['The column looks like e-mail addresses in 100 percent of values', 'The dataset is readable by the analyst group', 'Nobody tagged the column, because nobody knew it was there', 'The same file is loaded every night'],
        opts: [
          { t: 'Remove access to the column (tag it, with enforcement), check who read it in the audit log, tell the owner of the data, and add a scan and a tagging step to the pipeline', fb: '' },
          { t: 'Delete the table', fb: 'It removes the evidence and the data, and the next night the pipeline recreates it.' },
          { t: 'Tell the analysts not to look at that column', fb: 'It is not a control. Anybody can run a query.' },
          { t: 'Wait for the next scheduled review', fb: 'The data is exposed now, and each day is more exposure.' }
        ],
        best: 0,
        why: 'The first job is to close the access: a policy tag with enforcement makes the column unreadable without a role. Then find out who read it, from the audit log, and report as your process requires. Then fix the cause: a pipeline that loads personal data must tag it as part of its own definition.',
        checks: [
          ['Close the access', 'Create or reuse a policy tag for personal data, put it on the column and make sure enforcement is on.'],
          ['Find the reads', 'Query the audit log for jobs that read the table since it was created. Who, and when?'],
          ['Tell the owner', 'Report the finding to the owner of the data and to your privacy contact, as your process says.'],
          ['Prevent', 'Tag columns in the schema of the pipeline, scan new tables on a schedule, and alert on a finding that is untagged.']
        ],
        tell: 'A scan found e-mail addresses in a staging table that the whole analyst group could read. I put a policy tag on the column so that it became unreadable without a role, read the audit log to see who had queried it, informed the data owner and our privacy contact, and changed the pipeline so that its schema includes the tag and a scan runs on new tables.',
        prevent: ['A tag on every personal column, defined in the pipeline\'s own schema', 'A scheduled scan of new tables, with an alert on untagged findings', 'Access granted on curated datasets, not on raw or staging']
      }),

      B.quiz({
        id: 'm12-q1', t: 1,
        q: 'A column has a policy tag, and enforcement is on. A reader without a role on the tag runs `SELECT order_id, customer_id`. What happens?',
        opts: [
          { t: 'It fails, because the table has a tagged column', fb: 'Only a query that names the tagged column is refused.' },
          { t: 'It works: the query does not touch the tagged column', fb: '' },
          { t: 'It returns masked values', fb: 'Masking applies to a masked reader of a tagged column. These columns are not tagged.' },
          { t: 'It returns no rows', fb: 'That is the effect of a row policy, not a column tag.' }
        ],
        ok: 1,
        why: 'A tag protects a column. A query that does not read it is unaffected. A `SELECT *` would fail for that reader, which is why analysts should read curated views or name their columns.'
      }),

      B.quiz({
        id: 'm12-q2', t: 1,
        q: 'A table has a row access policy for group A. A person who is in no group runs a query on it. What do they see?',
        opts: [
          { t: 'All the rows', fb: 'Once a table has a row policy, readers outside every policy get none.' },
          { t: 'No rows', fb: '' },
          { t: 'The rows of group A', fb: 'Only members of the group.' },
          { t: 'An error', fb: 'The query runs and returns an empty result.' }
        ],
        ok: 1,
        why: 'This surprises people on the day they add the first policy: the pipeline account, and everybody else who read the table, suddenly sees nothing. Add a policy for them too.'
      }),

      B.quiz({
        id: 'm12-q3', t: 1,
        q: 'Which control hides the phone number of a customer from analysts but lets marketing count distinct customers by a hash of the e-mail?',
        opts: [
          { t: 'Row access policy', fb: 'It filters rows, not columns.' },
          { t: 'A policy tag with a masking rule, and the masked reader role for marketing', fb: '' },
          { t: 'IAM on the dataset', fb: 'It is all or nothing for the dataset.' },
          { t: 'A VPC perimeter', fb: 'It blocks calls from outside, not columns for people inside.' }
        ],
        ok: 1,
        why: 'Masking computes a shadow of the value inside the query. A hash keeps joins and distinct counts possible, and hides who.'
      }),

      B.quiz({
        id: 'm12-q4', t: 2,
        q: 'The stand-in scan found that 100 percent of `customers.email` looks like an e-mail address and 0 percent of `orders.status` does. What does a real scanner add?',
        opts: [
          { t: 'Nothing: two patterns are enough', fb: 'Patterns miss names, addresses, ids and context.' },
          { t: 'Many more detectors, a likelihood for each finding, context rules, and profiles of every table on a schedule', fb: '' },
          { t: 'It removes the data', fb: 'A scanner reports. Tagging and policies protect.' },
          { t: 'It makes tags unnecessary', fb: 'It feeds the tags.' }
        ],
        ok: 1,
        why: 'A scan finds the gap between what you tagged and what exists. The tags and policies are what close it.'
      }),

      B.quiz({
        id: 'm12-q5', t: 2,
        q: 'A person asks to be deleted. You delete their rows from `curated.customers`. What else must you consider?',
        opts: [
          { t: 'Nothing: curated is the source of truth', fb: 'Raw, staging, marts, snapshots and files keep copies.' },
          { t: 'Raw, staging, marts and snapshots, time travel and fail-safe, and files in buckets', fb: '' },
          { t: 'Only the audit log', fb: 'The audit log is evidence, not a copy of the data.' },
          { t: 'Only the dashboards', fb: 'A dashboard reads tables. The copies are in the tables and the files.' }
        ],
        ok: 1,
        why: 'A deletion reaches every layer by a key, and is complete after the longest copy has expired. Keep a record of it.'
      }),

      B.order({
        id: 'm12-ord', t: 1, q: 'Put the protection of a new personal column in order.',
        items: [
          'A scan or a review finds the column and its content',
          'The steward chooses the policy tag',
          'The tag goes into the schema as code, and is reviewed',
          'Enforcement is on for the taxonomy, and masking is defined',
          'Roles on the tag go to the groups that need them',
          'A scheduled scan checks that nothing is untagged'
        ],
        why: 'You cannot protect what you have not found. The tag is code, so it is reviewed. Enforcement and roles make it real, and the recurring scan proves it stays so.'
      }),

      B.qa({
        id: 'qa-colrow', t: 1, tag: 'Governance', secs: 90,
        q: 'How do you restrict who sees which column and which row in BigQuery?',
        pts: ['Columns: policy tags with enforcement', 'Roles on the tag: fine-grained reader, masked reader', 'Masking: hash, null, default, partial', 'Rows: row access policies', 'Readers in no policy see no rows', 'IAM on datasets for the layers'],
        short: 'For **columns** I use policy tags. A taxonomy of tags, managed by a data steward, is attached to sensitive columns in the schema, and enforcement is turned on. A reader needs the fine-grained reader role on the tag to read the value, and a reader with the masked reader role sees a masked value from a data policy, such as a hash or a null, computed inside the query. For **rows** I use row access policies: a filter for each group, such as the store of a manager. A reader who is in no policy sees no rows, so I add a policy for the pipeline.\n\nBelow those I use IAM on datasets for the layers: analysts read curated, only the pipeline reads raw. The tags and policies are code in Terraform, reviewed like anything else.',
        fu: [['What happens to SELECT * on a table with a tagged column?', 'It fails for a reader without a role on the tag. That is why analysts should read curated views or name their columns.'], ['Why not copy the table for each audience?', 'Copies drift, multiply with every new audience, and every schema change must be applied to all of them.']],
        trap: 'Describing only IAM on the dataset.',
        real: 'Tell me about a time you protected a column or a set of rows without copying data.'
      }),

      B.qa({
        id: 'qa-dqs', t: 1, tag: 'Governance', secs: 75,
        q: 'How do you make sure that the data in the warehouse is trustworthy?',
        pts: ['Rules on keys, nulls, ranges, sets, relations', 'Freshness and volume checks', 'Assertions in the graph that stop what depends on a bad table', 'Reconcile with the source', 'Alerts and owners', 'Each incident adds a rule'],
        short: 'I write quality rules close to the data and run them on every load. The basics are non-null and unique keys, ranges on amounts, sets of allowed values, and a SQL assertion for each business relation, such as "every order has a store". I add freshness and volume checks, because a table can be correct and a day late. In the transformation graph the rules are assertions that stop everything that depends on a failed table, and in Dataplex they are scans that publish scores.\n\nI also reconcile the warehouse against the source, and I give every table an owner who receives the alert. And I treat each incident as a missing rule: when something goes wrong, the fix includes a check that would have caught it. In my recorded run four checks passed and one, the repeats in the raw layer, found 600 rows, which was the expected answer for that layer.',
        fu: [['Where do you put the rules?', 'In the code that builds the table, with the table, so that they are reviewed and versioned.'], ['What do you do when a rule fails at night?', 'The pipeline stops at that table, the owner is alerted, and the runbook says whether to fix, to roll back, or to publish with a flag.']],
        trap: 'Saying that you check the data by eye.',
        real: 'Describe a rule that you added after an incident.'
      }),

      B.qa({
        id: 'qa-pii', t: 2, tag: 'Governance', secs: 90,
        q: 'How do you handle personal data in a warehouse?',
        pts: ['Know where it is: scans and a catalog', 'Tag it, enforce, mask', 'Least access: curated only, groups, no copies', 'Row policies for regional access', 'Retention and deletion by key across layers', 'Audit logs and records of requests'],
        short: 'First I need to know where it is. A scan on a schedule and a catalog tell me which columns hold personal data, and I put a policy tag on each one in the schema, with enforcement on and masking for the people who need a shadow of the value, for example a hash so that marketing can count customers. Access is least by design: analysts read the curated layer through groups, only the pipeline reads raw, and regional teams get row policies, never copies.\n\nI plan **deletion**: by a key, across raw, staging, curated, marts, snapshots and files, and I know that time travel and fail-safe keep copies for days, so a deletion is complete after the longest copy expires. I keep audit logs and a record of each request. Which rules apply is a question for the legal and privacy teams, and I build the controls they ask for.',
        fu: [['What is the first thing you check in a new dataset?', 'Which columns look sensitive, whether they are tagged, and who can read the dataset.'], ['How do you let someone join on a customer without seeing who it is?', 'A tokenised or hashed id, with a masking rule, so the join key exists and the identity does not.']],
        trap: 'Saying "we encrypt everything" as if it were an access policy.',
        real: 'Tell me how you would respond to a deletion request for one customer.'
      }),

      B.qa({
        id: 'qa-lineage', t: 2, tag: 'Governance', secs: 60,
        q: 'What is data lineage, and what do you use it for?',
        pts: ['The graph of which table or job produced which', 'Automatic for BigQuery jobs, integrations for Composer, Dataflow, Dataproc', 'Column level where available', 'Impact analysis before a change', 'Root cause of a wrong number', 'Only as complete as what it can see'],
        short: 'Lineage is the graph that shows which tables and jobs produced which, and at best which column came from which. In Google Cloud it is recorded for BigQuery jobs and through integrations for Composer, Dataflow and Dataproc, and it is shown in the catalog.\n\nI use it before a change, to list what depends on a column that I am about to rename or drop, and after an incident, to follow a wrong number back to its source. It is only as complete as what it can see: a manual export or an unsupported tool leaves a gap. To show the idea, I gave a SQL parser the daily sales query and it told me that `revenue_cents` comes from `total_cents`, and that the count of orders has no source column.',
        fu: [['Can lineage replace tests?', 'No. It says who depends on what, not whether the data is right.'], ['What breaks lineage?', 'Steps that the system does not see: a file copied by hand, a script outside the integrations, or dynamic SQL that hides the table names.']],
        trap: 'Describing lineage as documentation that someone writes by hand.',
        real: 'Describe a change that lineage would have made safer.'
      }),

      B.recap({
        id: 'm12-recap', n: 12, badge: 'Steward', color: '#FECACA',
        pts: [
          'A **catalog** makes data findable, a **glossary** defines the words, and **lineage** answers "what breaks" and "where from". The parser found that `revenue_cents` comes from `total_cents`.',
          '**Quality rules**: non-null, unique, set, range, pattern, row and table conditions, and **SQL assertions**. Add a rule after each incident.',
          '**Policy tags** protect columns, once **enforcement** is on. **Masked reader** sees a hash or a null. **Fine-grained reader** sees the value.',
          'A **row access policy** filters rows by reader. A reader in **no policy sees no rows**. In the model a manager of s01 saw **' + n0(RP.orders_visible_to_a_manager_of_s01) + '** of **' + n0(RP.orders) + '** orders.',
          'A **scan** finds the personal data that nobody tagged: the stand-in found **customers.email** and **customers.phone**. Tag, enforce, then scan again.',
          'Enforce at the **coarsest** place that works. A view **shares**, it does not protect. **Deletion** reaches every layer by a key, and is complete when the longest copy expires.'
        ],
        lines: [
          'I grant access on curated datasets, to groups.',
          'I tag a personal column in the schema, as code.',
          'I scan for what nobody tagged, on a schedule.'
        ]
      })
    ]
  });
})();
