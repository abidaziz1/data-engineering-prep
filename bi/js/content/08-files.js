/* Mission 8: the model as files. A LookML project read by a parser, a Tableau data source changed by a script, a Power BI table in TMDL from documentation. */
(function () {
  var B = LAB.b, G = LAB.get;
  var MODEL = G.file('lookml/brewline.model.lkml'), BROKEN = G.file('lookml/broken.view.lkml'), ERR = G.text('lookml.broken_error'), LF = G.table('lookml.fields'), LJ = G.table('lookml.joins'), LK = G.counts('lookml.summary');
  var TDS = G.file('tableau/brewline_sales.tds'), SW = G.file('tableau/switch_connection.py'), TC = G.table('tableau.connections'), TF = G.table('tableau.fields'), CH = G.counts('tableau.change');
  G.expect(/SyntaxError/.test(ERR), 'the parser reports a syntax error for the broken LookML file');
  G.expect(LJ.rows.every(function (r) { return r[2] === 'many_to_one' && r[4] === 'yes'; }), 'every join of the explore is many_to_one and its key is unique in the data');
  G.expect(CH.attributes_changed.length === 2 && CH.caption_of_the_connection_after === 'dev-warehouse.brewline.example' && CH.has_password === false, 'the script changed two attributes, left the caption, and the file holds no password');

  LAB.addChapter({
    id: 'm8', n: 8, title: 'The model as files: review, check, deploy', short: 'Files', blurb: 'LookML, Tableau XML and Power BI project files in Git, and what a pipeline can check', minutes: 18,
    focus: ['ci', 'stg', 'qual'],
    goals: [
      'Say which **files** hold the model in each tool.',
      'Read a **LookML explore** and check its joins against the data.',
      'Switch a **Tableau data source** from one server to another with a script.',
      'Describe a **deployment** of a model from a branch to production.'
    ],
    say: 'A model that lives only inside a tool cannot be reviewed. All three tools can store their model as text. Once it is text, it can go through the same steps as your pipeline code: a branch, a review, a check and a deployment.',
    scenes: [
      B.flow({
        id: 'm8-flow', t: 1, src: 'docs', title: 'A model goes the way of code', g: 'files', legend: true,
        steps: [
          { say: 'Five boxes that you know from your own code. The only new thing is what moves through them: a BI model. Press Next.', focus: ['edit', 'prod'], cap: 'The same road as pipeline code.' },
          { say: 'Step 1. The model is **text files**: TMDL for Power BI, XML for Tableau, LookML for Looker. A change is made on a branch.', on: ['f1'], focus: ['edit', 'pr'], cap: 'Text files on a branch.' },
          { say: 'Step 2. A **pull request** shows the change as a diff. One changed line of DAX or LookML can be read by a second person before any viewer sees a new number.', on: ['f2'], focus: ['pr', 'ci'], cap: 'A second person reads the change.' },
          { say: 'Step 3. **Checks** run: do the files parse, does every column that the model names exist in the warehouse, are the keys unique? This is the step that a data engineer can build.', on: ['f3'], focus: ['ci', 'test'], cap: 'Parse, names, keys.' },
          { say: 'Step 4. The model is published to a **test** workspace that points at the development warehouse, and then to **production**. Between the two, one thing must change: the connection.', on: ['f4'], focus: ['test', 'prod'], tags: ['tg_conn'], cap: 'Same model, another connection.' }
        ]
      }),

      B.cmp({
        id: 'm8-kinds', t: 1, src: 'docs', title: 'The files of each tool',
        say: 'What you would find in the repository. Press Next.',
        cols: ['', 'Power BI', 'Tableau', 'Looker'],
        hl: 0,
        rows: [
          ['Model', 'A project folder (`.pbip`) with the semantic model as **TMDL** files: one for each table, with columns, measures and partitions.', 'A **`.tds`** file for a data source: XML with the connection, the columns and the calculations.', '**`.view.lkml`** and **`.model.lkml`** files.'],
          ['Report', 'A report folder with JSON files for pages and visuals.', 'A **`.twb`** workbook: XML with the sheets and dashboards. It can embed its data source.', 'Dashboards, as LookML or kept in the instance.'],
          ['With data inside', '`.pbix`: one binary file with model, report and imported data.', '`.tdsx` and `.twbx`: a zip of the XML together with an extract.', 'Never. Looker holds no data.'],
          ['Git', 'Git integration for workspaces in Microsoft Fabric, or your own repository of project files.', 'Your own repository of XML files. Tableau Server keeps revisions of published content.', 'Built in. Every LookML project is a Git repository, and developers work on branches.'],
          ['Deploy', 'Deployment pipelines between workspaces, or the REST APIs from your own pipeline.', 'The REST API or `tabcmd publish`.', 'Merge to the production branch and deploy it.']
        ],
        steps: [
          { upto: 3, say: 'Text for the model, text for the report, and a packed format with data inside. Put the text in Git. Keep the packed files with data out of it.' },
          { upto: 5, say: 'Looker was built around Git. Power BI and Tableau got there later, and their text formats are what make a review possible.' }
        ]
      }),

      B.code({
        id: 'm8-explore', t: 1, src: 'rec', title: 'A LookML explore: the joins of the model', file: 'brewline.model.lkml', lang: 'lookml', code: MODEL,
        steps: [
          { say: 'You saw a view in mission 4. This is the other half: the **model file**, which says how views join. A parser read it. Looker did not run it.', lines: null },
          { say: 'The connection is a name. The address and the credentials of the warehouse are set by an admin in Looker, not in this file. That is why the same code can run against development and production.', lines: G.span(MODEL, /^connection:/) },
          { say: 'An **explore** starts at one view, here the order lines, and lists the views that may be joined to it.', lines: G.span(MODEL, /^explore: order_lines/, /persist_with/) },
          { say: 'Each join says **how**: the condition, and the `relationship`. `many_to_one` is a promise that the joined view has one row for each key. Looker uses the promise to keep sums correct. It does not check it against your data.', lines: G.span(MODEL, /join: orders/, /sql_on: \$\{order_lines\.order_id\}/) },
          { say: 'The row-level rule from mission 7 lives here too, three lines long.', lines: G.span(MODEL, /access_filter/, /user_attribute/) }
        ],
        note: 'Parsed by lkml ' + G.meta('lkml') + ': ' + LK.explores + ' explore with ' + LK.joins + ' joins, the connection name `' + LK.connection + '`, and an access filter on `' + LK.access_filter_field + '`.'
      }),

      B.rows({
        id: 'm8-check', t: 1, src: 'rec', title: 'A check that a pipeline can run',
        steps: [
          {
            say: 'Because the model is text, a script can read it. This is every field that the parser found in the four views: ' + LK.dimensions + ' dimensions, ' + LK.dimension_groups + ' dimension group and ' + LK.measures + ' measures.',
            tabs: [{ layer: 'RECORDED', name: 'Fields in the LookML views', c: 'raw', cols: LF.cols, rows: LF.rows, trk: 0 }],
            notes: ['My check then looked up every `${TABLE}.column` in the warehouse. Columns that the model names and the warehouse does not have: ' + LK.columns_not_in_the_warehouse.length + '. Run that check when you rename a column, before the dashboards find out.']
          },
          {
            say: 'The second check takes each join and asks the data whether the promise holds: does the joined view have exactly one row for each key?',
            tabs: [{ layer: 'RECORDED', name: 'The joins of the explore, checked against the tables', c: 'raw', cols: LJ.cols, rows: LJ.rows, trk: 0 }],
            notes: ['All three hold. These are my own checks, a few lines of Python on top of the parser. Looker has its own validator for LookML and its own content validator, which I did not run.']
          }
        ]
      }),

      B.term({
        id: 'm8-broken', t: 1, src: 'rec', title: 'A file that does not parse',
        say: 'The cheapest check of all: does the file parse? This is the real output of the parser on a view with a missing closing brace.',
        lines: function () { return G.plain(BROKEN + '\n\n' + ERR, { cmd: 'python -c "import lkml; lkml.load(open(\'broken.view.lkml\'))"', d: 45 }); },
        after: 'The dimension `order_id` is never closed, so the parser reaches the end of the file while it is still inside a block. A check like this takes a second in CI and stops a broken model before anybody opens a dashboard.',
        afterKind: 'tip',
        doneSay: 'Parse first. Then names. Then keys. Each check is cheaper than a wrong number in a meeting.'
      }),

      B.code({
        id: 'm8-tds', t: 1, src: 'rec', title: 'A Tableau data source is an XML file', file: 'brewline_sales.tds', lang: 'xml', code: TDS,
        steps: [
          { say: 'A Tableau data source saved as a `.tds` file. I wrote this one by hand, to the shape that Tableau saves, and a Tableau library read it. Tableau Desktop did not open it.', lines: null },
          { say: 'The connection: the kind of database, the server, the database name and the user. **There is no password in the file.** Credentials are entered when the file is published, or embedded on the server.', lines: G.span(TDS, /<named-connection /, /<\/named-connection>/) },
          { say: 'The table that the data source reads. Here it is the aggregate table from mission 6.', lines: G.span(TDS, /<relation /) },
          { say: 'The columns, each with a role: **dimension** or **measure**.', lines: G.span(TDS, /caption='Order date'/, /caption='Units'/) },
          { say: 'A calculated field. The formula is text inside the XML. Notice that it divides two sums. It does not average a ratio.', lines: G.span(TDS, /Calculation_aov/, /<\/column>/) }
        ],
        note: 'Read by the Tableau Document API ' + G.meta('tableaudocumentapi') + ': ' + CH.fields + ' fields, ' + CH.calculated_fields + ' of them calculated. That library is old, and it needed an extra package to import on Python ' + G.meta('python').split('.').slice(0, 2).join('.') + '.'
      }),

      B.code({
        id: 'm8-switch', t: 1, src: 'rec', title: 'Dev to prod without opening Tableau', file: 'switch_connection.py', lang: 'python', code: SW,
        steps: [
          { say: 'The step between test and production: point the same data source at another server. This script does it, and I ran it.', lines: null },
          { say: 'It opens the file, and for each connection sets the server and the database.', lines: G.span(SW, /ds = Datasource\.from_file/, /con\.dbname = dbname/) },
          { say: 'It saves under a new name and leaves the original alone.', lines: G.span(SW, /ds\.save_as/) }
        ],
        note: 'Result on the next screen. A deployment tool does the same thing through an API. The idea is that the model is identical in both places and only the connection differs.'
      }),

      B.rows({
        id: 'm8-switched', t: 1, src: 'rec', title: 'What the script changed, and what it did not',
        steps: [
          {
            say: 'Before and after. The server and the database changed. The user and the kind of database did not.',
            tabs: [{ layer: 'RECORDED', name: 'The connection in both files', c: 'raw', cols: TC.cols, rows: TC.rows, trk: 1 }],
            notes: ['Of ' + CH.attributes_in_the_file + ' attributes in the file, exactly ' + CH.attributes_changed.length + ' changed: ' + CH.attributes_changed.join(' and ') + '.']
          },
          {
            say: 'One thing did not change, and I only found it by comparing the two files: the **caption** of the connection still reads `' + CH.caption_of_the_connection_after + '`. A person who opens the production data source sees a label that says dev.',
            tabs: [{ layer: 'RECORDED', name: 'Fields of the data source', c: 'raw', cols: TF.cols, rows: TF.rows, trk: 0 }],
            notes: ['The data goes to the right server. The label is wrong. Compare the whole file after a scripted change. The fields you meant to change are not the whole story.']
          }
        ]
      }),

      B.quiz({
        id: 'm8-q1', t: 1,
        q: 'Which file should not be committed to Git?',
        opts: [
          { t: 'A `.view.lkml` file', fb: 'LookML is text and is meant for Git.' },
          { t: 'A `.pbix` or `.twbx` file with imported data inside', fb: '' },
          { t: 'A `.tds` file', fb: 'XML without data. It diffs well.' },
          { t: 'A TMDL file', fb: 'Text. One file for each table.' }
        ],
        ok: 1, why: 'The packed formats hold data, cannot be diffed, and can carry rows that some people must not see. Commit the text formats and build the packed ones in a pipeline.'
      }),

      B.quiz({
        id: 'm8-q2', t: 1,
        q: 'A LookML join says `relationship: many_to_one`, but the joined table has two rows for some keys. What happens?',
        opts: [
          { t: 'Looker refuses to run the explore', fb: 'Looker trusts the declaration. It does not test it against the data.' },
          { t: 'Queries run and some numbers are wrong, with no error', fb: '' },
          { t: 'The LookML validator reports it', fb: 'The validator checks the code. It does not read your rows.' },
          { t: 'Nothing. The relationship is only documentation', fb: 'Looker uses it to decide how to compute sums and counts.' }
        ],
        ok: 1, why: 'The relationship is a promise that the tool builds on. Only a test on the data can prove it, which is why the recording checked each join for repeated keys.'
      }),

      B.bug({
        id: 'm8-bug', t: 1, q: 'This LookML view fails the first check in CI. Click the line where the mistake is.',
        file: 'broken.view.lkml', lang: 'lookml', code: BROKEN, bad: [G.at(BROKEN, /sql: \$\{TABLE\}\.order_id ;;/)],
        hint: 'The parser says: `' + ERR + '`. Count the braces.',
        why: 'The block of the dimension `order_id` is never closed. A closing brace is missing after its `sql` line, so the measure below it is read as part of the dimension and the file ends one block too deep.',
        fix: 'view: orders_broken {\n  sql_table_name: analytics.fact_orders ;;\n\n  dimension: order_id {\n    primary_key: yes\n    type: number\n    sql: ${TABLE}.order_id ;;\n  }\n\n  measure: order_count {\n    type: count\n  }\n}',
        cheer: 'A parser in CI finds this in a second.'
      }),

      B.order({
        id: 'm8-ord', t: 2, q: 'A measure changes. Put the steps in order.',
        items: [
          'Create a branch and change the measure in the model file',
          'Open a pull request, so that the diff shows the changed formula',
          'CI parses the files and checks names and keys against the warehouse',
          'Publish to the test workspace, which points at the development warehouse',
          'Compare the new number with the old one on a known period',
          'Publish to production, with the production connection'
        ],
        why: 'The comparison in step five is the test that matters for a measure: the same period, the old number and the new one, and a sentence in the pull request that explains the difference.'
      }),

      B.qa({
        id: 'qa-git', t: 1, tag: 'Delivery', secs: 75,
        q: 'How do you put a BI model under version control and through CI?',
        pts: ['Store the model as text: TMDL, Tableau XML, LookML', 'Branch, pull request, a diff that a person can read', 'CI: parse, check column names against the warehouse, check keys', 'Deploy the same model to test and production with different connections'],
        short: 'First the model has to be text. Looker models are LookML files in a Git repository from the start. Power BI can save a model as a project with TMDL files, and Tableau data sources and workbooks are XML. Text can be reviewed: a changed measure is one changed line in a pull request. In CI I would run the cheap checks first: do the files parse, does every column that the model names exist in the warehouse, and are the keys behind each relationship unique. Then the model is published to a test workspace that points at the development warehouse, a few totals are compared, and the same model goes to production with the production connection. Files that contain imported data stay out of Git.',
        fu: [['What changes between test and production?', 'Only the connection, and perhaps the refresh settings.'], ['Which tool makes this easiest?', 'Looker, because Git and branches are built in. The other two need project files and the REST API or deployment pipelines.']],
        trap: 'Saying "we kept the .pbix in SharePoint".',
        real: 'Say honestly how far your team got: files in Git, review, or real CI.'
      }),

      B.qa({
        id: 'qa-lookml', t: 3, tag: 'Looker', secs: 60,
        q: 'What are views, explores and models in LookML?',
        pts: ['View: one table with its dimensions and measures', 'Explore: a starting view and the joins around it', 'Model: a connection plus a set of explores', 'Primary keys and join relationships keep aggregates correct'],
        short: 'A view describes one table: where it lives, its dimensions, which are the columns to group and filter by, and its measures. An explore is what an analyst queries: it starts at one view and lists the joins to other views, each with a condition and a relationship such as many to one. A model file names a connection to the warehouse and contains the explores. Two details matter for correct numbers. Each view declares a primary key, and each join declares its relationship. Looker uses both to compute sums and counts correctly when a join fans out, and it trusts them: if the key is not really unique, the numbers are wrong without an error.',
        fu: [['How would you test a declared relationship?', 'With a query that looks for repeated keys on the "one" side.'], ['Where does the SQL run?', 'In the warehouse, every time. LookML only generates it.']],
        trap: 'Mixing up view and explore. A view is a table. An explore is a set of joins.',
        real: 'If you have only read LookML and not written it, say so.'
      }),

      B.recap({
        id: 'm8-recap', n: 8, badge: 'Model Shipper', color: '#C7D2FE',
        pts: [
          'Every tool can store its model as **text**: TMDL, Tableau XML, LookML. Text can be reviewed.',
          'A LookML **relationship** and **primary key** are promises that the tool trusts. Test them on the data.',
          'Cheap checks in CI: **parse**, **column names** against the warehouse, **unique keys**.',
          'Between test and production only the **connection** changes. The script changed ' + CH.attributes_changed.length + ' of ' + CH.attributes_in_the_file + ' attributes.',
          'Compare the **whole file** after a scripted change: the caption still said dev.'
        ],
        lines: [
          'I can read the model files of all three tools.',
          'I can write a check for a model.',
          'I deploy the same model with another connection.'
        ]
      })
    ]
  });
})();
