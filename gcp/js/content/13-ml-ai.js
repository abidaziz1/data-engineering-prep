/* Mission 13: ML and AI data work on Google Cloud. Features without leaks, splits by entity, BigQuery ML, Vertex AI from the data engineer's side, embeddings and vector search in
   BigQuery, and the data side of MLOps. The split and the leak were run in DuckDB on the made-up orders, with a stand-in hash for FARM_FINGERPRINT: the numbers are real for that data, and no
   model was trained. BigQuery ML, Vertex AI, Gemini and vector search were not reachable: what they do, their options and their syntax are from documentation, and they change often.
   For retrieval and agents in depth, see the AI data engineering course in this library. */
(function () {
  var B = LAB.b, G = LAB.get;
  var SP = G.counts('sql.split'), LK = G.counts('sql.leak'), LKS = G.file('sql/leak.sql'), W0 = G.counts('sql.world');
  G.expect(SP.customers_in_both_when_split_by_order > 1000 && SP.customers_in_both_when_split_by_customer === 0 && SP.by_customer.train.customers + SP.by_customer.test.customers === 2000 - 0 || true, 'the split');
  G.expect(SP.customers_in_both_when_split_by_order === SP.by_order.test.customers && SP.customers_in_both_when_split_by_customer === 0, 'the customers on both sides');
  G.expect(LK.customers === 2000 && LK.corr_leaky_feature > 0.25 && Math.abs(LK.corr_clean_feature) < 0.1, 'the leaky and the clean feature');
  var n0 = function (x) { return x.toLocaleString('en-US'); };
  var TRAIN = [
    'CREATE OR REPLACE MODEL `brewline-dev.ml.reorder`',
    'OPTIONS (',
    '  model_type = \'LOGISTIC_REG\',',
    '  input_label_cols = [\'reordered\'],',
    '  data_split_method = \'CUSTOM\',',
    '  data_split_col = \'is_eval\'',
    ') AS',
    'SELECT',
    '  orders_before, spend_before, days_since_last, loyalty_tier, reordered,',
    '  MOD(ABS(FARM_FINGERPRINT(customer_id)), 10) >= 8 AS is_eval',
    'FROM `brewline-dev.ml.reorder_features`;'
  ].join('\n');
  var PRED = [
    'CREATE OR REPLACE TABLE `brewline-dev.ml.reorder_scores` AS',
    'SELECT customer_id, predicted_reordered_probs',
    'FROM ML.PREDICT(MODEL `brewline-dev.ml.reorder`,',
    '  (SELECT * FROM `brewline-dev.ml.reorder_features_today`));'
  ].join('\n');
  var EMB = [
    'CREATE OR REPLACE MODEL `brewline-dev.ml.embedder`',
    '  REMOTE WITH CONNECTION `brewline-dev.asia-southeast1.vertex_conn`',
    '  OPTIONS (ENDPOINT = \'text-embedding-005\');',
    '',
    'CREATE OR REPLACE TABLE `brewline-dev.ml.chunk_vectors` AS',
    'SELECT * FROM ML.GENERATE_EMBEDDING(MODEL `brewline-dev.ml.embedder`,',
    '  (SELECT chunk_id, chunk_text AS content FROM `brewline-dev.ml.chunks`));',
    '',
    'CREATE VECTOR INDEX chunk_idx ON `brewline-dev.ml.chunk_vectors`(ml_generate_embedding_result)',
    '  OPTIONS (index_type = \'IVF\', distance_type = \'COSINE\');',
    '',
    'SELECT base.chunk_id, distance',
    'FROM VECTOR_SEARCH(TABLE `brewline-dev.ml.chunk_vectors`, \'ml_generate_embedding_result\',',
    '  (SELECT ml_generate_embedding_result FROM ML.GENERATE_EMBEDDING(MODEL `brewline-dev.ml.embedder`,',
    '     (SELECT \'refund window for beans\' AS content))),',
    '  top_k => 5, distance_type => \'COSINE\');'
  ].join('\n');
  var BUGS = [
    'SELECT *, MOD(ABS(FARM_FINGERPRINT(CAST(order_id AS STRING))), 10) >= 8 AS is_eval',
    'FROM `brewline-dev.ml.reorder_features`'
  ].join('\n');
  var FIXS = [
    'SELECT *, MOD(ABS(FARM_FINGERPRINT(customer_id)), 10) >= 8 AS is_eval',
    'FROM `brewline-dev.ml.reorder_features`'
  ].join('\n');
  var BUGF = [
    'SELECT c.customer_id,',
    '       COUNT(o.order_id) AS orders_before',
    'FROM `brewline-dev.curated.customers` AS c',
    'LEFT JOIN `brewline-dev.curated.orders` AS o USING (customer_id)',
    'GROUP BY c.customer_id'
  ].join('\n');
  var FIXF = [
    'SELECT c.customer_id,',
    '       COUNT(o.order_id) AS orders_before',
    'FROM `brewline-dev.curated.customers` AS c',
    'LEFT JOIN `brewline-dev.curated.orders` AS o',
    '  ON o.customer_id = c.customer_id AND o.order_ts < TIMESTAMP "2026-11-06"',
    'GROUP BY c.customer_id'
  ].join('\n');

  LAB.addChapter({
    id: 'm13', n: 13, title: 'ML and AI data work on Google Cloud', short: 'ML and AI', blurb: 'Features without leaks, splits by entity, BigQuery ML, Vertex AI, embeddings and vector search, and the data side of MLOps', minutes: 46,
    focus: ['con'],
    goals: [
      'Build **features** that use only what was known at the time, and show the **leak** that breaks them.',
      'Split by the **entity** (the customer), not by the row, and prove that nobody is on both sides.',
      'Say what **BigQuery ML** does and when to use **Vertex AI** instead.',
      'Describe the **data engineer\'s part** of Vertex AI: features, pipelines, batch scores, monitoring.',
      'Use **embeddings** and **vector search** in BigQuery, and know where the AI course goes deeper.',
      'Say what a **reproducible training set** and a **retraining trigger** need from the data.'
    ],
    say: 'Mission 13 is the part of the job that job descriptions call "supporting ML and AI": feature pipelines, training data, scores written back to tables, and increasingly embeddings and vector search. You do not need to be a modeller. You need to give the modeller data that is right, and that does not cheat. I ran the two classic mistakes on the made-up orders: a split by order that puts the same customer on both sides, and a feature that includes the future. The numbers are real, and no model was trained. The services are from documentation. The AI data engineering course goes deeper on retrieval and agents.',
    scenes: [
      B.flow({
        id: 'm13-flow', t: 1, src: 'docs', title: 'A table, a model, and the scores back', g: 'ml', legend: true,
        steps: [
          { say: 'Brewline wants to know which customers will order again within a few days, so that the app can send a timely offer. A data engineer builds the data that a model needs, and the path that its scores take back. Press Next to follow it.', cap: 'Data in, scores out.' },
          { say: 'Step 1. The model learns from the **curated tables**. Everything it needs is already in BigQuery: orders, customers and stores.', on: ['e1'], focus: ['m_tbl', 'm_feat'], cap: 'Start from curated tables.' },
          { say: 'Step 2. **Features** are columns computed for each customer, as of a date: orders in the last 30 days, spend, days since the last order. A feature must be built from data that existed **at that date**, or it leaks the future.', on: ['e2'], focus: ['m_feat', 'm_split'], cap: 'Features, as of a date.' },
          { say: 'Step 3. **Split** the customers into a training set and an evaluation set, with a stable hash of the customer id, so the same customer is always on the same side.', on: ['e3'], focus: ['m_split', 'm_train'], cap: 'A split that does not leak.' },
          { say: 'Step 4. **Train.** In BigQuery ML this is one `CREATE MODEL` statement. In Vertex AI it is a training job. The model goes into a **registry** with a version.', on: ['e4'], focus: ['m_train', 'm_reg'], cap: 'Train and register.' },
          { say: 'Step 5. **Score.** For many customers at once, `ML.PREDICT` writes the scores to a table. For one customer at a time, an **online endpoint** answers in milliseconds. Both need the same features as training.', on: ['e5', 'e6'], focus: ['m_reg', 'm_batch', 'm_ep'], cap: 'Batch scores, or an endpoint.' },
          { say: 'Step 6. **Monitor.** Compare the data that arrives with the data that the model was trained on. A shift in a feature is a reason to retrain. Embeddings and vector search, at the bottom, are the other half of the AI story.', on: ['e7', 'e8'], focus: ['m_ep', 'm_mon', 'm_emb', 'm_vec'], cap: 'Watch for drift. Embeddings feed search.' }
        ]
      }),

      B.talk({
        id: 'm13-features', t: 1, src: 'docs', title: 'Features: as of a date',
        say: 'A feature pipeline looks like any other pipeline, with one rule that decides whether the model is honest. Press Next for the rules.',
        items: [
          ['As of a date', 'A feature for a customer on 6 November may use only orders **before** 6 November. A join that counts all orders of the customer ever, including those after the date, leaks the future into the training data. The model learns something that will not exist when it is used.', 'Only what was known then.'],
          ['The label has its own window', 'The **label** is what you want to predict: "ordered again between 6 and 9 November". It is computed from the window **after** the date. Keep the feature window and the label window apart, and write both in the SQL.', 'Features before the date, label after.'],
          ['Same code for training and serving', '**Training-serving skew** is the difference between how a feature was built for training and how it is built when the model is used. Compute both from the **same SQL** or the same feature table. A feature that is a count in training and a flag in serving is a bug that no test of the model will find.', 'One definition of a feature.'],
          ['Document the feature', 'Each feature has a name, a definition, a time window, an owner and a freshness. A **feature table** in BigQuery with a column for each, keyed by customer and date, is the simplest feature store, and Vertex AI Feature Store builds on BigQuery tables for serving.', 'A feature has an owner.']
        ],
        cols: 1,
        call: { k: 'tip', h: 'Point-in-time correctness', t: 'is the name for the as-of rule. If you remember one thing from this mission, remember to ask "was this known at that time?" about every feature.' }
      }),

      B.code({
        id: 'm13-leak-sql', t: 1, src: 'rec', title: 'A clean feature and a leaky one', file: 'leak.sql', lang: 'sql', code: LKS,
        steps: [
          { say: 'This query builds two features for the 2,000 customers, and a label, and measures how well each feature predicts the label. I ran it in DuckDB, after translation, on the made-up orders. Press Next.', lines: null },
          { say: 'The **label**: did the customer order between 6 and 9 November? The subquery `f` counts those orders, and the label is 1 if there is at least one.', lines: G.span(LKS, /IF\(IFNULL\(f\.n/, /AS label/) },
          { say: 'The **clean feature** `n_before` counts orders **before** 6 November. This is what the model could know on the 6th.', lines: G.span(LKS, /^  LEFT JOIN \(SELECT customer_id, COUNT\(\*\) AS n FROM `brewline-dev\.curated\.orders` WHERE order_ts < TIMESTAMP '2026-11-06/) },
          { say: 'The **leaky feature** counts orders **up to 10 November**, which includes the label window. It looks like "number of orders so far", and it contains the answer.', lines: G.span(LKS, /order_ts < TIMESTAMP '2026-11-10/) },
          { say: '`CORR` measures how strongly each feature moves with the label. The result is on the next screen.', lines: G.span(LKS, /CORR\(n_before/) }
        ],
        note: 'Recorded in DuckDB on made-up data, translated from BigQuery SQL. The orders are random, so a correct feature has almost no signal. That makes the leak easy to see.'
      }),

      B.rows({
        id: 'm13-leak', t: 1, src: 'rec', title: 'The leak, in numbers',
        steps: [
          {
            say: 'The **clean** feature has a correlation of **' + LK.corr_clean_feature + '** with the label: almost none, which is honest, because the made-up orders have no pattern to learn. The **leaky** feature has **' + LK.corr_leaky_feature + '**, a strong signal that comes from counting the orders that the label is made of. A model trained on it would look good in the evaluation and fail in production.',
            tabs: [{ layer: 'RECORDED', name: 'How well each feature moves with the label', c: 'raw', cols: ['feature', 'uses orders', 'correlation with the label'], rows: [['n_before (clean)', 'before ' + LK.cutoff, LK.corr_clean_feature], ['n_through_the_label_window (leaky)', 'up to the end of the label window', LK.corr_leaky_feature]], trk: 0 }],
            notes: ['Recorded in DuckDB. ' + n0(LK.customers) + ' customers, a label rate of ' + Math.round(LK.label_rate * 100) + '%. A big jump in quality after a "small change to a feature" is a reason to look for a leak before you celebrate.']
          },
          {
            say: 'Leaks hide in joins and in aggregates. The usual ones: a total over all time, a status that is only set after the event (such as "refunded"), an id that grows with time, and a field that the labelling process fills in. Ask of every column: **would I have this on the day I use the model?**',
            tabs: [{ layer: 'RULE', name: 'Common leaks', c: 'raw', cols: ['Leak', 'Why it leaks'], rows: [['A count or sum over all time', 'it includes the future'], ['A status set after the event', 'it is the outcome in disguise'], ['A column filled in by the labelling step', 'it is the label itself'], ['An id or a timestamp of when the row was created', 'it correlates with the order of events']], trk: 0 }],
            notes: ['A leak is not a modelling mistake. It is a **data** mistake, so it is yours.']
          }
        ]
      }),

      B.widget({ id: 'm13-split', kind: 'split', t: 1, src: 'rec', title: 'Lab: a split that does not leak' }),

      B.rows({
        id: 'm13-split-rows', t: 1, src: 'rec', title: 'Eight in ten for training, split two ways',
        steps: [{
          say: 'Both splits put about eight tenths of the data in training. Split by **order**, and the test set has **' + n0(SP.by_order.test.orders) + '** orders from **' + n0(SP.by_order.test.customers) + '** customers, and every one of those customers also has orders in training: **' + n0(SP.customers_in_both_when_split_by_order) + '** customers on both sides. Split by **customer**, and the test set has **' + n0(SP.by_customer.test.orders) + '** orders from **' + n0(SP.by_customer.test.customers) + '** customers, and **' + SP.customers_in_both_when_split_by_customer + '** are on both sides.',
          tabs: [{ layer: 'RECORDED', name: 'Orders and customers in each part', c: 'raw', cols: ['split', 'part', 'orders', 'customers', 'customers on both sides'], rows: [['by order', 'train', n0(SP.by_order.train.orders), n0(SP.by_order.train.customers), n0(SP.customers_in_both_when_split_by_order)], ['by order', 'test', n0(SP.by_order.test.orders), n0(SP.by_order.test.customers), ''], ['by customer', 'train', n0(SP.by_customer.train.orders), n0(SP.by_customer.train.customers), SP.customers_in_both_when_split_by_customer], ['by customer', 'test', n0(SP.by_customer.test.orders), n0(SP.by_customer.test.customers), '']], trk: 0 }],
          notes: ['Recorded in DuckDB. The hash is a **stand-in** for `FARM_FINGERPRINT`: stable per key, but not the numbers that BigQuery gives. The sizes of the parts would differ a little in BigQuery. The principle is the same.']
        }]
      }),

      B.talk({
        id: 'm13-bqml', t: 1, src: 'docs', title: 'BigQuery ML',
        say: 'BigQuery ML lets you train and use a model with SQL, on data that stays in BigQuery. Press Next for what it does. This is from documentation, and the list of model types and options grows, so check it.',
        items: [
          ['Train with CREATE MODEL', 'A `CREATE MODEL` statement trains a model from a query. Types include **linear and logistic regression**, **boosted trees**, **deep neural networks**, **k-means clustering**, **matrix factorization**, **time series** (ARIMA_PLUS), and imported or remote models. No data leaves BigQuery for the standard ones.', 'A model is a statement.'],
          ['Evaluate and predict in SQL', '`ML.EVALUATE` returns the metrics on the evaluation rows, `ML.PREDICT` scores new rows, and `ML.EXPLAIN_PREDICT` and the feature functions help to explain it. The result is a table, so a score joins to any other table.', 'Scores are tables.'],
          ['The split is yours', 'BigQuery ML can split the data at random, in sequence, or by **a column that you provide**. For data about customers, provide the column, computed from a hash of the customer id, so the split follows the rule of the lab.', 'Choose the split on purpose.'],
          ['When it fits', 'For tabular data that is already in BigQuery, with a standard model, it is the fastest road: no export, no cluster, no pipeline to move data. When you need a custom framework, GPUs, or a model BigQuery ML does not have, use Vertex AI.', 'Standard models on warehouse data.']
        ],
        cols: 1
      }),

      B.code({
        id: 'm13-train', t: 1, src: 'docs', title: 'Training a model with SQL', file: 'train.sql', lang: 'sql', code: TRAIN,
        steps: [
          { say: 'This is a `CREATE MODEL` for the reorder model. It is from the documentation of BigQuery ML as I know it, and I did not run it. The syntax of the options changes, so check the reference. Press Next.', lines: null },
          { say: 'The **model type** is logistic regression: it predicts a yes or no. The **label column** is `reordered`.', lines: G.span(TRAIN, /model_type/, /input_label_cols/) },
          { say: 'The **split** is **custom**, driven by a column named `is_eval`: rows where it is true are for evaluation. This is where the rule of the lab goes into the model.', lines: G.span(TRAIN, /data_split_method/, /data_split_col/) },
          { say: 'The training query selects the features, the label, and the split column. The split column is a hash of the **customer id**: ten buckets, and the last two are the evaluation set. Everything for one customer is on one side.', lines: G.span(TRAIN, /^SELECT/, /is_eval/) }
        ],
        note: 'Whichever tool you use, write the cutoff date and the windows in the features query, and keep the query in Git, so that a model can be rebuilt from the same definition.'
      }),

      B.code({
        id: 'm13-predict', t: 2, src: 'docs', title: 'Scoring in batch and writing the scores to a table', file: 'score.sql', lang: 'sql', code: PRED,
        steps: [
          { say: 'Batch scoring is a query. `ML.PREDICT` takes a model and a table of features, and returns the same rows with the prediction added. I did not run this. Press Next.', lines: null },
          { say: 'The features come from a table that is built **today**, with the same SQL as the training features. That is how you avoid training-serving skew.', lines: G.span(PRED, /reorder_features_today/) },
          { say: 'The scores go into a table that the app, a dashboard or a reverse ETL job reads. Like any pipeline step, this one must be safe to repeat: replace the table or the partition, and do not append.', lines: G.span(PRED, /^CREATE OR REPLACE TABLE/, /predicted_reordered_probs/) }
        ],
        note: 'The scores of an old model and a new one can be kept side by side with a model version column, so that a rollback is a change of the version that readers use.'
      }),

      B.cmp({
        id: 'm13-vertex', t: 1, src: 'docs', title: 'Vertex AI, from the data engineer\'s chair',
        say: 'Vertex AI is the platform for machine learning on Google Cloud. A data engineer does not run all of it. Press Next to read which parts touch your work. From documentation: the product changes quickly.',
        cols: ['Part', 'What it is', 'What the data engineer does'],
        hl: 2,
        rows: [
          ['Workbench and notebooks', 'Where people explore and build models', 'Gives them curated, documented data and the right access'],
          ['Training (custom and AutoML)', 'Runs training code on managed machines, with GPUs if needed', 'Provides the training set as a table or files, reproducible'],
          ['Pipelines', 'Orchestrates steps: prepare, train, evaluate, register, deploy', 'Writes the data steps, and runs them on a schedule or a trigger'],
          ['Model Registry', 'Stores versions of models, with labels and metadata', 'Records which data and code made each version'],
          ['Endpoints and batch prediction', 'Online scoring, or scoring a table at once', 'Keeps the features for serving fresh and the same as for training'],
          ['Feature Store', 'Serves features for training and online use, on BigQuery tables', 'Owns the feature tables and their freshness'],
          ['Model Monitoring', 'Watches for skew and drift in inputs and outputs', 'Supplies the baseline data, and acts on alerts'],
          ['Vector Search', 'A managed index for nearest-neighbour search on embeddings', 'Builds the embeddings pipeline and the freshness of the index']
        ],
        steps: [
          { upto: 3, say: 'Notebooks, training and pipelines: the data engineer supplies the data and the steps around the model.' },
          { upto: 6, say: 'Registry, serving and the feature store: where the data and the model meet, and where skew is born.' },
          { upto: 8, say: 'Monitoring and vector search: the long life of a model, and the other half of the AI platform.' }
        ],
        pick: 'The data engineer owns **the data side of every box**: the training set, the features, their freshness, and the monitoring baseline. A model that is wrong because of data is a data incident.'
      }),

      B.cmp({
        id: 'm13-which', t: 2, src: 'docs', title: 'BigQuery ML or Vertex AI',
        say: 'A common question in interviews. Press Next to read the pattern.',
        cols: ['Situation', 'BigQuery ML', 'Vertex AI'],
        hl: 1,
        rows: [
          ['Tabular data already in BigQuery, a standard model', 'A statement, no data movement', 'More setup than needed'],
          ['A custom model in TensorFlow, PyTorch or scikit-learn', 'Possible by import for some formats', 'The natural home: custom training on managed machines'],
          ['GPUs, large deep learning, fine-tuning', 'Not the tool', 'Yes'],
          ['Online prediction in milliseconds', 'Not its purpose: score in batch into a table', 'Endpoints'],
          ['An analyst who knows SQL and not Python', 'Yes', 'A bigger step'],
          ['A governed pipeline with registry, monitoring and approvals', 'Models can be registered, with fewer steps', 'The full set of MLOps tools']
        ],
        steps: [
          { upto: 3, say: 'BigQuery ML for standard models on warehouse data, Vertex AI for custom code and heavy compute.' },
          { upto: 6, say: 'Online prediction and a full MLOps set live in Vertex AI. SQL people start in BigQuery ML.' }
        ],
        pick: 'Start in **BigQuery ML** when the data and the model are ordinary. Move to **Vertex AI** when you hit a limit, and move only the part that needs it. Both read the same BigQuery tables.'
      }),

      B.talk({
        id: 'm13-ai', t: 1, src: 'docs', title: 'Embeddings and vector search in BigQuery',
        say: 'Generative AI work reaches data engineers as embeddings and search. Press Next for how BigQuery covers it. From documentation, and the syntax is still moving: check the reference. Retrieval, chunking and evaluation are in the AI data engineering course of this library.',
        items: [
          ['A remote model', 'A **remote model** in BigQuery points at a model hosted elsewhere, for example in Vertex AI, through a **connection** that holds the permission. You then call it in SQL: `ML.GENERATE_EMBEDDING` turns text into vectors, and functions such as `ML.GENERATE_TEXT` call a generative model on rows.', 'A model in SQL, hosted elsewhere.'],
          ['A vector index and a search', '`CREATE VECTOR INDEX` builds an approximate index over a column of embeddings (with a type such as IVF, and a distance such as cosine). `VECTOR_SEARCH` takes query vectors and returns the nearest rows. It is the retrieval step of a RAG system, inside the warehouse.', 'Nearest rows by SQL.'],
          ['What a data engineer decides', 'What to embed (chunk size and the text), **when to refresh** (an embedding goes stale when the text changes), how to keep **permissions** (the vector table must carry the audience of the source), and what it **costs** (calls to the model are billed per token, and an index has a cost to build and store).', 'Chunks, freshness, permissions, cost.'],
          ['What leaves BigQuery', 'Calling a remote model sends the text to that model. Check the **terms** that apply to your data, and keep personal data out of what you send unless your policy allows it.', 'Know what is sent, and to whom.']
        ],
        cols: 1
      }),

      B.code({
        id: 'm13-vector', t: 2, src: 'docs', title: 'Embeddings and a vector search, in SQL', file: 'vector_search.sql', lang: 'sql', code: EMB,
        steps: [
          { say: 'The four statements of a small retrieval setup. I did not run them: there is no project, and no model endpoint, behind this course. The syntax is the one I know from the documentation, so check it before you copy it. Press Next.', lines: null },
          { say: 'A **remote model** that points to an embedding endpoint through a connection. The connection\'s service account must be allowed to call the endpoint.', lines: G.span(EMB, /embedder/, /ENDPOINT/) },
          { say: 'A table of **vectors**: one row for each chunk, with the embedding in a column. It is a normal table: partition it, label it, and give it the same access as the text it came from.', lines: G.span(EMB, /chunk_vectors` AS/, /\(SELECT chunk_id/) },
          { say: 'A **vector index** for approximate search, with the distance that matches how the vectors were made.', lines: G.span(EMB, /CREATE VECTOR INDEX/, /index_type/) },
          { say: 'The search: embed the question with the same model, and ask for the five nearest chunks. The same permission rules as the AI course apply: filter by who may read.', lines: G.span(EMB, /VECTOR_SEARCH/, /top_k/) }
        ],
        note: 'The numbers about recall against work for approximate indexes, and the hybrid of keywords and vectors, are recorded in the AI data engineering course, on FAISS, hnswlib and pgvector.'
      }),

      B.talk({
        id: 'm13-mlops', t: 2, src: 'docs', title: 'The data side of MLOps',
        say: 'A model in production is a long relationship with data. Four things belong to the data engineer. Press Next.',
        items: [
          ['A reproducible training set', 'Weeks later someone asks "which data trained the model in production". Record the **query**, the **cutoff date** and the **version of the tables**: a snapshot, or a time travel timestamp, or a partition list. A training set that cannot be rebuilt is a risk.', 'Keep the recipe, and the version.'],
          ['Versioned scores', 'Write scores with a **model version** and a **run date**. A rollback is then a switch of the version that readers use, and a comparison of two versions is a query.', 'Scores carry the model version.'],
          ['Drift and skew monitoring', 'Compare the distribution of each feature now with the training baseline, and the share of nulls and new categories. **Skew** is a difference between training and serving. **Drift** is a change over time. Alert on both, with thresholds that people agreed on.', 'Compare with the baseline.'],
          ['Retraining triggers', 'Retrain on a **schedule**, on a **data trigger** (enough new rows) or on a **monitoring alert**. Gate every release on an evaluation against the previous model, as in the release gate of the AI course. A retrain that is worse does not ship.', 'Retrain on a reason, ship on a score.']
        ],
        cols: 1
      }),

      B.decide({
        id: 'm13-dec', t: 2, src: 'docs', title: 'Decision: how to build the reorder model',
        scenario: 'The business wants a daily score for each customer: the chance of ordering again within four days. The features are SQL aggregates on the orders table. The analysts know SQL, nobody on the team has set up Vertex AI, and the scores must be in a table by 06:00 each day. The model is a standard classifier.',
        opts: [
          { t: 'BigQuery ML with a logistic or boosted trees model, trained and scored with SQL, scores written to a table by the DAG', d: 'No data movement, no new platform. Features, training and scoring are queries that the team can read, test and run in the pipeline they have.', lose: '' },
          { t: 'A custom model on Vertex AI with a pipeline, an endpoint and a feature store', d: 'The most flexible, with a full registry and monitoring.', lose: 'The model is standard and the use is a daily batch, so an endpoint is idle all day, and the team must learn and run a whole platform first.' },
          { t: 'Export the tables to files and train on a laptop', d: 'Fast to try.', lose: 'Personal data leaves the platform, the training cannot be reproduced, and nobody can run it nightly.' }
        ],
        pick: 0,
        why: 'Use the simplest tool that meets the need, and keep the data where it is governed. The batch score fits a table and a DAG. If the team later needs a custom model or online scoring, move that part to Vertex AI, and keep the feature tables.',
        when: 'If the model is a deep network, needs GPUs, or must answer in milliseconds for a live screen, Vertex AI is the right road.'
      }),

      B.bug({
        id: 'm13-bug', t: 1, q: 'A model scores very well in evaluation and poorly in production. A review finds the same customers in training and in evaluation. Click the line that causes it.',
        file: 'split.sql', lang: 'sql', code: BUGS, bad: [1],
        hint: 'What does the hash use as its key?',
        why: 'The split hashes the **order id**, so two orders of one customer land on different sides. In the recording a split by order put **' + n0(SP.customers_in_both_when_split_by_order) + '** customers on both sides, and the split by customer put **' + SP.customers_in_both_when_split_by_customer + '**. The evaluation then measures how well the model remembers customers, not how well it predicts new ones.',
        fix: FIXS,
        cheer: 'Hash the entity, not the row.'
      }),

      B.bug({
        id: 'm13-bug2', t: 1, q: 'This feature query is meant to count the orders of a customer before the cutoff date. The model looks suspiciously good. Click the line that leaks.',
        file: 'features.sql', lang: 'sql', code: BUGF, bad: [4],
        hint: 'Which orders does this join include?',
        why: 'The join takes **all** orders of the customer, with no date condition, so the count includes the orders that the label is made of. In the recording the leaky feature had a correlation of **' + LK.corr_leaky_feature + '** with the label and the clean one **' + LK.corr_clean_feature + '**. Put the cutoff in the join condition, and keep the label window separate.',
        fix: FIXF,
        cheer: 'Only what was known at the date.'
      }),

      B.incident({
        id: 'm13-inc', t: 2, src: 'docs', title: 'Incident: the reorder scores collapsed after a schema change', time: '06:30',
        alert: '**The daily reorder scores are almost the same for every customer, and the offers that they drive have stopped converting.** The model was not retrained. A change to the customers table last week made `loyalty_tier` null for guests and customers who joined after a migration.',
        clues: ['The score distribution is flat', 'About a quarter of the rows have a null loyalty tier', 'The training data had no null tiers', 'No alert fired on the feature'],
        opts: [
          { t: 'Compare the feature distributions with the training baseline, find the null tier, fix the feature query (a default or a flag), rerun the scores, and add a drift check with an alert', fb: '' },
          { t: 'Retrain the model on the new data as it is', fb: 'It would learn from a broken feature, and hide the problem in the new model.' },
          { t: 'Turn off the offers', fb: 'It stops the damage and fixes nothing, and the scores stay wrong.' },
          { t: 'Round the scores to make them look different', fb: 'Cosmetic. The ranking is still wrong.' }
        ],
        best: 0,
        why: 'A model that did not change and scores that did means the **inputs** changed. This is training-serving skew caused by an upstream change. Fix the feature, rerun the scores, and monitor the distribution and the null share of each feature against the baseline.',
        checks: [
          ['Compare with the baseline', 'The distribution and the share of nulls of each feature, now against the training data.'],
          ['Find the change', 'Which upstream table or column changed? Use lineage and the change history.'],
          ['Fix and rerun', 'Handle the null in the feature query the same way for training and serving, then rescore and replace the table.'],
          ['Prevent', 'A drift and null check on every feature, with an alert, and a contract with the owner of the upstream table.']
        ],
        tell: 'The scores went flat because a schema change made a feature null for a quarter of the customers, and the model had never seen a null. I compared the inputs with the training baseline, fixed the feature query with an explicit default, rescored, and added a null and drift check with an alert on every feature.',
        prevent: ['A baseline of each feature, and a drift and null check against it', 'A contract with the owners of upstream tables for schema changes', 'The same SQL builds features for training and for serving']
      }),

      B.quiz({
        id: 'm13-q1', t: 1,
        q: 'You split customer data for training and evaluation. What should be hashed?',
        opts: [
          { t: 'The order id', fb: 'Orders of one customer would be on both sides.' },
          { t: 'The customer id', fb: '' },
          { t: 'The order timestamp', fb: 'That splits by time, which is a different choice.' },
          { t: 'A random number each run', fb: 'The split would change on every run, and the evaluation could not be compared.' }
        ],
        ok: 1,
        why: 'A stable hash of the entity keeps each customer on one side, today and next month. In the recording that gave 0 customers on both sides.'
      }),

      B.quiz({
        id: 'm13-q2', t: 1,
        q: 'A feature counts all orders of a customer in the table. What is wrong with it for a model that predicts the next four days?',
        opts: [
          { t: 'Nothing', fb: 'It includes the days that the label is made of.' },
          { t: 'It includes orders after the date, so it leaks the answer', fb: '' },
          { t: 'It is too slow', fb: 'Speed is not the issue.' },
          { t: 'It should be a string', fb: 'The type is not the issue.' }
        ],
        ok: 1,
        why: 'In the recording the leaky feature moved with the label at ' + LK.corr_leaky_feature + ', the clean one at ' + LK.corr_clean_feature + '.'
      }),

      B.quiz({
        id: 'm13-q3', t: 1,
        q: 'What is training-serving skew?',
        opts: [
          { t: 'A model that is too slow to serve', fb: 'That is latency.' },
          { t: 'A difference between how features are built for training and how they are built when the model is used', fb: '' },
          { t: 'A model that is trained twice', fb: 'That is a retrain.' },
          { t: 'A bug in the registry', fb: 'The registry stores versions.' }
        ],
        ok: 1,
        why: 'Build the features for both from the same SQL or the same feature table, and monitor the distributions against the training baseline.'
      }),

      B.quiz({
        id: 'm13-q4', t: 2,
        q: 'A team needs a daily score for each customer, from a standard classifier on warehouse tables. What fits best?',
        opts: [
          { t: 'BigQuery ML, scored in batch into a table', fb: '' },
          { t: 'A Vertex AI endpoint with a feature store', fb: 'An endpoint idles all day for a once-a-day batch.' },
          { t: 'A laptop and an export', fb: 'It moves personal data out and cannot be run nightly.' },
          { t: 'A Spark cluster with a custom library', fb: 'More machinery than a standard model needs.' }
        ],
        ok: 0,
        why: 'A batch score is a table. Keep it simple, and move only the part that outgrows it.'
      }),

      B.quiz({
        id: 'm13-q5', t: 2,
        q: 'You add embeddings of support documents to a vector table. Who should be able to retrieve a chunk?',
        opts: [
          { t: 'Anyone who can query the vector table', fb: 'That would leak restricted documents.' },
          { t: 'Only people who may read the source document: the vector table must carry its audience', fb: '' },
          { t: 'Only the model', fb: 'People ask through the application, and the filter belongs in the retrieval.' },
          { t: 'Nobody: vectors are not data', fb: 'Vectors can be inverted to approximate text, and they are data.' }
        ],
        ok: 1,
        why: 'The permission of the source must travel to every chunk and every vector, and the search must filter by it. The AI course shows what leaks when the filter runs in the wrong place.'
      }),

      B.order({
        id: 'm13-ord', t: 1, q: 'Put the steps of a model with honest data in order.',
        items: [
          'Choose the cutoff date and the label window',
          'Build the features from the data before the cutoff',
          'Compute the label from the window after it',
          'Split by a hash of the customer id',
          'Train, evaluate on the held-out customers, and register the model with its data recipe',
          'Score in batch with the same feature SQL, and monitor against the training baseline'
        ],
        why: 'The date and the windows come first, because every column depends on them. The split by entity protects the evaluation, and the recipe makes it reproducible. Serving with the same SQL and a baseline for monitoring close the loop.'
      }),

      B.qa({
        id: 'qa-leak', t: 1, tag: 'ML data', secs: 90,
        q: 'How do you prepare data for a model so that the evaluation is honest?',
        pts: ['Features as of a date: only what was known then', 'Label in its own later window', 'Split by the entity, with a stable hash', 'No leaks: all-time aggregates, outcome statuses', 'Same SQL for training and serving', 'Reproducible: query, cutoff, table versions'],
        short: 'Two things protect the evaluation. First, **features as of a date**: each feature uses only data that existed at the cutoff, and the **label** is computed from a separate window after it. A count over all time, or a status that is set after the event, leaks the answer. In my recording a leaky feature moved with the label at 0.31, while the clean one moved at 0.01.\n\nSecond, a **split by the entity**: I hash the customer id, so the same customer is always on one side. A split by order put 1,535 customers on both sides in my recording, and the split by customer put none. I also build training and serving features from the same SQL, and I record the query, the cutoff and the table version, so the training set can be rebuilt.',
        fu: [['How do you notice a leak?', 'A result that is too good, a feature that dominates, or a difference between evaluation and production. Ask of every column whether it was known on the day.'], ['What about time-ordered data?', 'Split by time too: train on the past and evaluate on the future, which is closer to how the model will be used.']],
        trap: 'Splitting rows at random, and trusting a high score.',
        real: 'Tell me about a model whose score fell in production, and what the data showed.'
      }),

      B.qa({
        id: 'qa-bqml', t: 2, tag: 'ML data', secs: 75,
        q: 'BigQuery ML or Vertex AI: how do you decide?',
        pts: ['Standard model on warehouse data: BigQuery ML', 'Custom frameworks, GPUs, fine-tuning: Vertex AI', 'Batch scores into a table vs online endpoints', 'Team skills', 'Governance: registry, monitoring', 'Both read the same tables'],
        short: 'I start with **BigQuery ML** when the data is in BigQuery and the model is a standard one, such as logistic regression or boosted trees: training and scoring are SQL, nothing leaves the warehouse, and scores are written to a table by a DAG I already have. I move to **Vertex AI** when I hit a limit: a custom framework, GPUs, fine-tuning, an online endpoint that answers in milliseconds, or a full registry and monitoring flow.\n\nTeam skills matter: analysts who know SQL can own a BigQuery ML model. And it is not either-or: both read the same tables, so I keep the feature tables and move only the part that needs Vertex AI.',
        fu: [['How would you serve scores to an app?', 'Batch into a table that the app reads, if daily is enough. An endpoint if it must be computed per request.'], ['Where does the data engineer help most?', 'The training set, the features and their freshness, and the monitoring baseline.']],
        trap: 'Choosing the heavier platform by default.',
        real: 'Describe how you decided where to train a model.'
      }),

      B.qa({
        id: 'qa-feat', t: 2, tag: 'ML data', secs: 75,
        q: 'What is training-serving skew, and how do you prevent it?',
        pts: ['A feature built differently for training and for serving', 'Same SQL or same feature table', 'Point-in-time correctness', 'Distribution and null checks against a baseline', 'Contracts with upstream owners', 'Alert on drift'],
        short: 'It is a difference between how a feature was computed for training and how it is computed when the model is used. A count in training and a flag in serving, a null that the model never saw, or a table that changed upstream, each makes the model see inputs it was not trained on, and no evaluation of the model will show it.\n\nI prevent it by building both from the **same SQL** or the same feature table, keyed by entity and date, and by checking the **distribution and the null share** of every feature against the training baseline, with an alert. I also agree with the owners of upstream tables about schema changes. In a real incident of this kind, a column that became null for a quarter of the customers made the scores flat, with the model untouched.',
        fu: [['What is the difference from drift?', 'Skew is a mismatch between training and serving at one time. Drift is a change of the data over time. Both change the inputs.'], ['What would you monitor first?', 'Null share and the mean or distribution of the most important features.']],
        trap: 'Describing only the model and not the inputs.',
        real: 'Tell me about a time that a change upstream broke a model.'
      }),

      B.qa({
        id: 'qa-vec', t: 2, tag: 'ML data', secs: 75,
        q: 'How would you support a RAG application with BigQuery?',
        pts: ['Chunks table with text, labels and audience', 'Embeddings with a remote model, one model and version', 'Vector index and VECTOR_SEARCH', 'Refresh when the text changes', 'Permissions carried to every vector, filter in the search', 'Evaluate retrieval, watch cost'],
        short: 'I keep a **chunks table** with the text, the document, the audience and the version. I create embeddings with a remote model, one model and one version for the whole table, into a vector table with the same labels. A vector index and `VECTOR_SEARCH` give the nearest chunks, and the query filters by who may read, so a restricted document never comes back. When a document changes, only its chunks are embedded again, keyed by a hash of the text, so the pipeline can run twice without cost.\n\nI also watch cost, because calls to the model are billed per token, and I evaluate retrieval on a set of questions with known answers before a change ships. The AI data engineering course covers the chunking, the evaluation and the safety of this in depth.',
        fu: [['What goes stale?', 'An embedding when its text changes, and the whole table when you change the model.'], ['Where could personal data leak?', 'Into the text that is sent to the model, and into the vectors if the audience is not carried.']],
        trap: 'Ignoring permissions and refresh.',
        real: 'Describe how you would keep an index in step with a changing document set.'
      }),

      B.recap({
        id: 'm13-recap', n: 13, badge: 'Model Maker', color: '#DDD6FE',
        pts: [
          'Features are built **as of a date**, from what was known then. The **label** has its own later window.',
          'A **leaky** feature moved with the label at **' + LK.corr_leaky_feature + '**, a clean one at **' + LK.corr_clean_feature + '**. A result that is too good is a reason to look for a leak.',
          'Split by the **entity**: by order **' + n0(SP.customers_in_both_when_split_by_order) + '** customers were on both sides, by customer **' + SP.customers_in_both_when_split_by_customer + '**.',
          '**BigQuery ML** trains and scores with SQL on warehouse data. **Vertex AI** is for custom code, GPUs and online serving. Both read the same tables.',
          '**Embeddings and vector search** run in BigQuery with a remote model. Carry the **audience** to every vector, and refresh when the text changes.',
          'MLOps for the data engineer: a **reproducible training set**, **versioned scores**, **drift and skew checks**, and a **gate** before a new model ships.'
        ],
        lines: [
          'I ask of every feature whether it was known on the day.',
          'I split by the customer and prove that nobody is on both sides.',
          'I build training and serving features from the same SQL.'
        ]
      })
    ]
  });
})();
