/* Mission 10: running code in Snowflake, Iceberg tables, the AI features and dbt on Snowflake. */
(function () {
  var B = LAB.b;

  var SNOWPARK = [
    'from snowflake.snowpark import Session',
    'from snowflake.snowpark.functions import col, sum as sum_',
    '',
    'session = Session.builder.configs(connection_parameters).create()',
    '',
    'orders = session.table("CORE.ORDERS")            # nothing runs yet',
    'value = (',
    '    orders.filter(col("STATUS") != "CANCELLED")',
    '          .group_by("CUSTOMER_ID")',
    '          .agg(sum_("TOTAL_USD").alias("LIFETIME_USD"))',
    ')                                                # still nothing has run',
    'value.write.mode("overwrite").save_as_table("MARTS.CUSTOMER_VALUE")   # now it runs, in Snowflake'
  ].join('\n');

  var UDF = [
    '-- A SQL function, used like any built-in',
    'CREATE OR REPLACE FUNCTION core.usd_to_cents(usd NUMBER)',
    '  RETURNS NUMBER',
    '  AS $$ ROUND(usd * 100) $$;',
    '',
    '-- A Python function that runs inside Snowflake',
    'CREATE OR REPLACE FUNCTION core.clean_email(email STRING)',
    '  RETURNS STRING',
    '  LANGUAGE PYTHON',
    "  RUNTIME_VERSION = '3.12'",
    "  HANDLER = 'clean'",
    'AS',
    '$$',
    'def clean(email):',
    '    return email.strip().lower() if email else None',
    '$$;',
    '',
    '-- A stored procedure: a script that can run several statements',
    'CREATE OR REPLACE PROCEDURE core.archive_old_orders(days NUMBER)',
    '  RETURNS STRING',
    '  LANGUAGE SQL',
    'AS',
    '$$',
    'BEGIN',
    "  DELETE FROM core.orders WHERE order_ts < DATEADD('day', -:days, CURRENT_TIMESTAMP());",
    "  RETURN 'done';",
    'END;',
    '$$;',
    '',
    'CALL core.archive_old_orders(1095);'
  ].join('\n');

  LAB.addChapter({
    id: 'm10', n: 10, title: 'Code, Iceberg and AI in Snowflake', short: 'Snowpark + AI', blurb: 'Snowpark, UDFs, Iceberg tables, Cortex, dbt on Snowflake', minutes: 24,
    focus: ['snap'],
    goals: [
      'Say **where code runs** in Snowflake and when to use SQL, a UDF or **Snowpark**.',
      'Explain **lazy evaluation** in a Snowpark DataFrame.',
      'Describe **Iceberg tables** and when to choose them over native tables.',
      'Name the **AI features** and **dbt Projects on Snowflake**, and say what a data engineer owns.'
    ],
    say: 'Mission 10 is where Snowflake meets code and AI. The newest parts change quickly, so I mark where you should confirm details. The skill that does not change is knowing when SQL is enough.',
    scenes: [
      B.cmp({
        id: 'm10-map', t: 1, title: 'Where code runs in Snowflake',
        say: 'Snowflake runs your code next to the data, so nothing leaves the platform. Press Next to compare the three main options.',
        cols: ['', 'SQL, views and tasks', 'UDFs and stored procedures', 'Snowpark (Python)'],
        rows: [
          ['What it is', 'Plain SQL statements, views, tasks and dynamic tables', 'Your own functions for row logic, and scripts that run several statements, in SQL, Python, Java, JavaScript or Scala', 'A DataFrame API that builds queries in Python, plus Python functions and procedures'],
          ['Use it for', 'Almost all transformation. Start here', 'Reusable logic, calls to a library, multi-step jobs', 'Python-based pipelines, feature engineering, logic that is clumsy in SQL'],
          ['It runs on', 'Your warehouse', 'Your warehouse, next to the data', 'Your warehouse. The DataFrame turns into SQL'],
          ['Watch out for', 'Very long SQL that nobody can read', 'Row-by-row functions are slow. Prefer set-based SQL', 'Lazy evaluation, and pulling big results to the client']
        ],
        steps: [
          { upto: 2, say: 'What each one is, and what it is for.' },
          { upto: 4, say: 'Where it runs and what to watch out for. In every case the data stays in Snowflake and the work uses your warehouse.' }
        ],
        pick: 'Use **SQL first**. Reach for a UDF or Snowpark only when SQL cannot express the logic, or when you need a Python library. Teams that skip this order end up with Python doing what a join could do.'
      }),

      B.code({
        id: 'm10-snowpark', t: 2, title: 'Snowpark: a DataFrame that runs in Snowflake', file: 'customer_value.py', lang: 'python', code: SNOWPARK,
        steps: [
          { say: 'Snowpark is Python code that looks like pandas or Spark, but runs inside Snowflake. Press Next to follow the lines.', lines: null },
          { say: 'A session connects to Snowflake. After this line, every operation is turned into SQL and runs on your warehouse.', lines: [1, 4] },
          { say: 'This line only points at a table. No data moves, and no query has run.', lines: [6, 6] },
          { say: 'Filtering, grouping and aggregating only build a plan. This is lazy evaluation: Snowpark collects the steps and sends one query later.', lines: [7, 11] },
          { say: 'Writing the result is an action. Now Snowpark generates one SQL statement and Snowflake runs it. The data never left Snowflake.', lines: [12, 12] }
        ],
        note: 'The trap is `to_pandas()`. It pulls the whole result into the client, so on a large table it runs out of memory and wastes the point of running in Snowflake. Aggregate in Snowflake first, and bring back only what you need.'
      }),

      B.code({
        id: 'm10-udf', t: 2, title: 'Functions and stored procedures', file: 'worksheet: udf.sql', lang: 'sql', code: UDF,
        steps: [
          { say: 'You can add your own functions and scripts to Snowflake. Press Next for three kinds.', lines: null },
          { say: 'A SQL function holds a reusable expression. Use it to keep one definition of a business rule, such as converting dollars to cents.', lines: [1, 4] },
          { say: 'A Python function runs inside Snowflake, in a sandbox, on your warehouse. Use it when SQL cannot express the logic, or when you need a library. The body sits between the dollar signs, and HANDLER names the function to call.', lines: [6, 16] },
          { say: 'A stored procedure is a script. It can run several statements, branch and loop. Use it for multi-step jobs, and call it from a task.', lines: [18, 30] }
        ],
        note: 'A function is called **once per row**, so a slow Python function multiplies. Prefer plain SQL or vectorized functions for big tables, and test the function on a sample before you apply it to billions of rows.'
      }),

      B.talk({
        id: 'm10-iceberg', t: 2, title: 'Iceberg tables',
        say: 'Open table formats are on most 2026 job descriptions. Press Next for what to know.',
        items: [
          ['What it is', '**Apache Iceberg** is an open table format. The data sits as Parquet files in storage you control, with Iceberg metadata beside it, so several engines can read the same table: Snowflake, Spark, Trino and others.', 'Iceberg is an open table format on files in your storage.'],
          ['Two ways to use it', 'A **Snowflake-managed** Iceberg table uses Snowflake as the catalog, and Snowflake reads and writes it. An **externally managed** table lives in another catalog, such as AWS Glue or an open catalog. Snowflake reads it, and write support depends on the catalog and release.', 'Managed by Snowflake, or managed by another catalog.'],
          ['When to choose it', 'Choose Iceberg when **several engines** must share one copy of the data, or when you must keep data in your own storage in an open format. Choose native tables for the best Snowflake performance and the full feature set.', 'Iceberg for sharing across engines. Native for speed and features.'],
          ['The trade-offs', 'Some native features behave differently or are unavailable on Iceberg tables, and you take on storage layout and maintenance choices. Compare the current feature support before you move a core table.', 'Check feature support first.']
        ],
        cols: 1
      }),

      B.talk({
        id: 'm10-ai', t: 2, title: 'The AI features, and what a data engineer owns',
        say: 'Snowflake now runs language models next to your data. This area moves fast, so treat the names as a map and check the documentation for status and regions. Press Next.',
        items: [
          ['AI functions in SQL', 'You can call a language model from SQL to classify, extract, summarize, translate or answer questions about a column. Functions such as `AI_CLASSIFY`, `AI_EXTRACT` and `AI_COMPLETE` run next to the data, so nothing is exported. Several reached general availability in late 2025.', 'Models run in SQL, next to the data.'],
          ['Cortex Search', 'A **search service** over text, built to retrieve the right passages for a question. It is a common building block for retrieval-augmented applications.', 'Cortex Search retrieves text for AI apps.'],
          ['Cortex Analyst and semantic views', '**Cortex Analyst** answers business questions in natural language over structured data. It relies on a **semantic view**, which defines metrics, dimensions and joins once, so answers use the company\'s own definitions.', 'A semantic view defines the metrics the model may use.'],
          ['Snowflake Intelligence', 'An agent experience for business users that combines Cortex Analyst and Cortex Search, so people can ask questions of both tables and documents in plain language.', 'Snowflake Intelligence is the natural-language front end.'],
          ['What you own', 'These features read whatever the role can read. Your job is **trusted data and clear definitions**, masking and access control on the inputs, **cost control** because model calls bill in credits, and **checking accuracy** with test questions.', 'Governed data, clear definitions, watched cost.']
        ],
        cols: 1
      }),

      B.talk({
        id: 'm10-dbt', t: 2, title: 'dbt Projects on Snowflake',
        say: 'dbt is on almost every Snowflake job description. Snowflake can now host dbt itself. Press Next.',
        items: [
          ['What it is', '**dbt Projects on Snowflake** lets you create, edit, test, run and schedule dbt Core projects inside Snowflake, in a workspace with Git integration. It became generally available in **November 2025**.', 'dbt can now run inside Snowflake.'],
          ['How it runs', '`EXECUTE DBT PROJECT` runs dbt commands such as `build` or `test` on a warehouse, and a task can schedule it. Snowflake runs a specific dbt version, so check which versions are supported before you plan an upgrade.', 'A command runs dbt. A task schedules it.'],
          ['When it helps', 'It suits small teams that want dbt without running a separate scheduler or CI runner. Larger teams often keep dbt in their own CI and orchestrator, for more control over environments, secrets and monitoring.', 'Simple for small teams. Control for large ones.'],
          ['How to talk about it', 'Name it, then compare on three points: where the code runs, how you test and review changes, and who owns the schedule. That shows judgment and not just awareness.', 'Name it, then compare it.']
        ],
        cols: 1
      }),

      B.quiz({
        id: 'm10-q1', t: 1,
        q: 'Where does Snowpark Python code run?',
        opts: [
          { t: 'Inside Snowflake, on your warehouse. The DataFrame operations become SQL', fb: '' },
          { t: 'On your laptop, which pulls the data down', fb: 'Only the small client script runs locally. The heavy work runs in Snowflake.' },
          { t: 'On a separate Spark cluster that Snowflake manages for you', fb: 'Snowpark does not use Spark. It uses your Snowflake warehouse.' },
          { t: 'In the cloud services layer, free of charge', fb: 'The work runs on a warehouse and costs credits like any other query.' }
        ],
        ok: 0, why: 'Snowpark builds SQL from your DataFrame code and Snowflake runs it on your **warehouse**, next to the data. Python UDFs and procedures also run inside Snowflake.'
      }),

      B.quiz({
        id: 'm10-q2', t: 2,
        q: 'In Snowpark, `df = session.table("CORE.ORDERS").filter(col("STATUS") == "SHIPPED")` has just run. What has Snowflake executed?',
        opts: [
          { t: 'Nothing yet. Snowpark waits until an action such as show, collect or write', fb: '' },
          { t: 'The filter, and the matching rows are now in memory', fb: 'Transformations are lazy. No query has been sent.' },
          { t: 'A full copy of the table into the client', fb: 'The data never moves until you ask for results.' },
          { t: 'A scan of the table, but only on the first run', fb: 'A scan happens when an action triggers the query, not when you define the DataFrame.' }
        ],
        ok: 0, why: 'DataFrames are **lazy**. Snowpark collects the steps and generates one SQL statement when you call an **action** such as `collect`, `show` or `write`.'
      }),

      B.quiz({
        id: 'm10-q3', t: 2,
        q: 'A Python UDF that cleans a text column makes a 3 billion row query very slow. What is the best first move?',
        opts: [
          { t: 'Try to express the logic in set-based SQL, and keep the UDF only for what SQL cannot do', fb: '' },
          { t: 'Move the table to a 6X-Large warehouse', fb: 'It hides the cost. A function called per row still scales with the row count.' },
          { t: 'Call the UDF twice so the second call uses the cache', fb: 'There is no per-row cache that helps here, and it doubles the work.' },
          { t: 'Export the table and clean it outside Snowflake', fb: 'It moves 3 billion rows out of the platform to do work that SQL could probably do in place.' }
        ],
        ok: 0, why: 'A UDF runs **once per row**. SQL functions and expressions run set-based and are much faster. Rewrite the common cases in SQL, and keep the UDF for the rare case where you need a library.'
      }),

      B.decide({
        id: 'm10-dec', t: 2, title: 'Decision: where to run the text cleanup',
        scenario: 'Brewline needs to normalize **50 million** product reviews with a Python text-cleaning library that has no SQL equivalent. The data lives in Snowflake. The team knows SQL and some Python, and wants to avoid new infrastructure.',
        opts: [
          { t: 'Export to an external Spark cluster', d: 'Move the data out, run the job, load the result back.', lose: 'You copy 50 million rows out and back, pay for a cluster, and add infrastructure and a second place for data to leak.' },
          { t: 'A Python UDF or Snowpark job that runs inside Snowflake', d: 'Keep the data in place and use the warehouse.' },
          { t: 'Rewrite it as nested SQL string functions', d: 'Avoid Python entirely.', lose: 'The library handles cases SQL cannot. A giant nested expression is hard to test and will not match the library\'s results.' }
        ],
        pick: 1,
        why: 'The data stays in Snowflake, the work runs on a warehouse you already manage, and the logic uses the library it needs. Test on a sample, run it in **batches** with a dedicated warehouse, and write the result to a table, so the cleanup is not repeated on every query.',
        when: 'Use **plain SQL** when it can express the rule, because it is faster and easier to review. Use an **external engine** only when you need something Snowflake does not offer, such as a GPU training job.'
      }),

      B.qa({
        id: 'qa-snowpark', t: 2, tag: 'Code in Snowflake', secs: 60,
        q: 'When would you use Snowpark or a Python UDF instead of SQL?',
        pts: ['SQL first: set-based and easy to review', 'Python when the logic needs a library or is clumsy in SQL', 'The code runs in Snowflake on a warehouse, next to the data', 'Snowpark is lazy: the DataFrame becomes SQL when an action runs', 'Avoid row-by-row UDFs on big tables and to_pandas on large results'],
        short: 'I use SQL first, because it is set-based, fast and easy to review. I reach for Snowpark or a Python UDF when the logic needs a Python library, or is clumsy to express in SQL, such as parsing messy text or building features for a model.\n\nBoth run inside Snowflake on a warehouse, next to the data, so nothing is exported. Snowpark is lazy: the DataFrame steps become one SQL statement when I run an action like write. I watch two traps. A UDF runs once per row, so on a big table I prefer set-based SQL and keep the UDF for what SQL cannot do. And to_pandas pulls everything to the client, so I aggregate in Snowflake first and bring back only the result.',
        fu: [
          ['What is the difference between a UDF and a stored procedure?', 'A UDF returns a value for each row and is used inside a query. A stored procedure is a script that runs several statements, can branch and loop, and is called with CALL, for example from a task.'],
          ['How do you test Snowpark code?', 'Run the logic on a small sample in a dev schema, compare the result with a SQL version if one exists, and run the same checks in CI on a clone.']
        ],
        trap: 'Saying "Snowpark is faster than SQL". It generates SQL, so it is not faster. Its value is expressiveness and Python libraries.'
      }),

      B.qa({
        id: 'qa-new', t: 3, tag: 'Current trends', secs: 60,
        q: 'Which recent Snowflake features are you following, and how would you use them?',
        pts: ['Dynamic tables for declarative, fresh marts, with a set refresh mode', 'Iceberg tables where several engines share data', 'AI functions and semantic views, with governed inputs and cost control', 'dbt Projects on Snowflake for small teams, compared with dbt in CI', 'A rule: confirm status and cost before adopting'],
        short: 'Four areas. Dynamic tables, for marts that need a freshness target, with the refresh mode set explicitly and the cost watched. Iceberg tables, when several engines need to share one copy of the data in open storage. The AI functions and semantic views, where I focus on governed inputs, clear metric definitions and credit cost, since a model answers from whatever the role can read. And dbt Projects on Snowflake, which suits small teams, though I would compare it with dbt in our own CI for environments and monitoring.\n\nMy rule for all of them is to confirm the current status, regions and cost in the documentation before I adopt one, and to pilot it on one pipeline with a measured before and after.',
        fu: [
          ['How do you decide whether to adopt a new feature?', 'I check its status and regional availability, test it on one low-risk pipeline, and compare cost, reliability and the effort to operate against what we run today.'],
          ['What would worry you about AI functions?', 'Cost per call at scale, sensitive data reaching the model without masking, and wrong answers that nobody checks. I would add test questions, masking and a credit budget.']
        ],
        trap: 'Naming features without saying how you would evaluate them. Seniors adopt features with a test, a cost check and a way back.'
      }),

      B.recap({
        id: 'm10-recap', n: 10, badge: 'Snowpark Dev', color: '#FBCFE8',
        pts: [
          '**SQL first.** UDFs, procedures and **Snowpark** run inside Snowflake on your warehouse, next to the data.',
          'Snowpark is **lazy**: steps build a plan, and an **action** runs it as one SQL statement. Avoid `to_pandas` on large results.',
          'A UDF runs **once per row**. Prefer set-based SQL on big tables.',
          '**Iceberg** tables share data across engines. Native tables give the best Snowflake performance and features.',
          'AI functions, Cortex Search, semantic views and Snowflake Intelligence read what a role can read. You own **governed data, clear definitions and cost**.'
        ],
        lines: [
          'I use SQL first and Snowpark only when I need a library or logic SQL cannot express.',
          'I govern the inputs to AI features and put a credit budget on them.',
          'Before I adopt a new feature I check its status, test it on one pipeline and measure cost.'
        ]
      })
    ]
  });
})();
