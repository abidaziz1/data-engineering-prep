/* Mission 0: pick a path, see the whole picture, and learn what the tags mean. */
(function () {
  var B = LAB.b, G = LAB.get;
  var M = function (k) { return G.meta(k); };

  LAB.addChapter({
    id: 'm0', n: 0, noIntro: true, title: 'Start here', short: 'Start', blurb: 'Pick your path and see the whole picture', minutes: 6,
    scenes: [
      B.welcome({ id: 'welcome' }),

      B.flow({
        id: 'm0-map', t: 1, src: 'rec', title: 'A sync, from the shop to the models', g: 'sync', legend: true,
        steps: [
          { say: 'Brewline sells coffee, and its orders live in a shop system. The data team wants them in a table, every day, without duplicates and without surprises. This picture is the whole course. Press Next.', focus: ['shop', 'con', 'dst', 'mod', 'sta'], cap: 'The shop reaches a table.' },
          { say: 'Step 1. A **connector** reads the shop API, page by page. Mission 1 shows a first load of **100** orders and what the tool leaves behind.', on: ['e1'], focus: ['shop', 'con'], cap: 'The connector reads.' },
          { say: 'Step 2. It **writes** the rows into the destination, and adds tables and columns of its own. Mission 3 is about what happens when the rows change shape.', on: ['e2'], focus: ['con', 'dst'], cap: 'The rows are written.' },
          { say: 'Step 3. **Models**, for example dbt, turn the raw tables into clean ones after the load. Loading first and transforming later is called **ELT**.', on: ['e3'], focus: ['dst', 'mod'], tags: ['tg_elt'], cap: 'Transform after the load.' },
          { say: 'Step 4. The connector saves its **state**, the cursor, outside the data. Mission 2 is about the cursor, and mission 5 about what to do when it is wrong. This course ran **dlt ' + M('dlt') + '** and an **Airbyte** connector.', on: ['e4'], focus: ['con', 'sta'], tags: ['tg_state'], cap: 'The state is saved.' }
        ]
      }),

      B.cmp({
        id: 'm0-levels', t: 1, src: 'docs', title: 'Junior or senior: what changes',
        say: 'Ingestion is where most data incidents begin. Press Next to read what is expected at each level.',
        cols: ['Area', 'A junior is expected to', 'A senior is expected to'],
        hl: 2,
        rows: [
          ['Loading', 'Run a connector and check the row counts.', 'Choose full, incremental or change capture for each table, and say what each one misses.'],
          ['Repeats', 'Know that a retry can duplicate rows.', 'Make every load safe to repeat, with a merge or a replace, and prove it.'],
          ['Deletes', 'Know that rows get deleted at the source.', 'Say how a delete reaches the warehouse, and what a cursor never shows.'],
          ['Schema changes', 'Notice a new column.', 'Choose a contract (evolve, freeze or discard), and alert on a change.'],
          ['Tools and cost', 'Use the tool that the team chose.', 'Compare Fivetran, Airbyte, dlt and a custom job on control, cost and monitoring.']
        ],
        steps: [
          { upto: 3, say: 'The first three rows are about getting the right rows into the table. A junior does them. A senior can say what each choice loses.' },
          { upto: 5, say: 'Schema changes and cost decide whether a pipeline stays calm for a year. They carry most of the senior questions.' }
        ]
      }),

      B.talk({
        id: 'm0-how', t: 1, src: 'rec', title: 'How this course works',
        say: 'Five quick things before we start. Press Next for each.',
        items: [
          ['SEE, TRY, SAY', 'Every mission watches something work (**SEE**), makes you practise it (**TRY**), then asks the interview question out loud (**SAY**). Orange blocks in a diagram are data moving.', 'Watch first, practise second, say it third.'],
          ['Junior, Senior, Extra', 'A small tag on a screen tells you who it is for. No tag means everybody. **Senior** and **Extra** screens appear only on the wider paths.', 'The tag tells you whether a screen is on your path.'],
          ['Two kinds of screen', 'A **Recorded** tag means that I ran it and wrote down what it printed. A **From documentation** tag means that I read it and did not run it. Fivetran is always the second kind: it is a service with an account, and I did not use one.', 'Recorded means run. From documentation means read.'],
          ['What ran', '**dlt ' + M('dlt') + '** (an open-source Python library) loaded a pretend shop API into **DuckDB ' + M('duckdb') + '**, and the **Faker connector of Airbyte** ran on its own and through **PyAirbyte ' + M('airbyte') + '**. The programs on the screens are Python files that ran as they are. Nothing is timed.', 'The setup is on the next screen.'],
          ['The money question', 'Ingestion tools are bought by usage, so the course also teaches how the usage is counted, and how a design choice changes the bill. The prices of vendors change, so I show **how** they are counted and not the numbers.', 'You learn the model, not the price list.']
        ],
        cols: 1
      }),

      B.cmp({
        id: 'm0-ran', t: 2, src: 'rec', title: 'What I ran, and what I did not',
        say: 'This is the exact setup behind every recorded screen. Press Next to read it.',
        cols: ['Part', 'What it was', 'Status'],
        hl: 1,
        rows: [
          ['dlt and DuckDB', 'dlt ' + M('dlt') + ' loading into DuckDB ' + M('duckdb') + ', on Python ' + M('python_dlt'), 'Run'],
          ['The Airbyte connector', M('connector') + ', called directly and through PyAirbyte ' + M('airbyte') + ' on Python ' + M('python_airbyte'), 'Run'],
          ['The data', 'A pretend shop API: 100 orders on day 1, then changes on days 2 and 3, built from fixed rules', 'Run'],
          ['Fivetran', 'A service that needs an account and a paid plan', 'Not run'],
          ['The Airbyte platform, Meltano, Debezium', 'The platform needs a server. Debezium is in the Kafka course', 'Not run']
        ],
        steps: [
          { upto: 3, say: 'The first three rows ran. They are enough to see a load, a cursor, a delete, a new column and a sync mode behave.' },
          { upto: 5, say: 'The last two rows did not run. What I say about them comes from documentation, and the README lists what to check again.' }
        ]
      })
    ]
  });
})();
