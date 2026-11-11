/* Mission 1: the map of Spark for a data engineer. What Spark is, the driver and the executors, the cluster managers, which API to use, the words that come back all the
   time, and what job descriptions ask. The architecture comes from documentation. The recorded screens start a real session and read the version it reports. */
(function () {
  var B = LAB.b, G = LAB.get;
  var SESSION_FILE = G.file('code/session.py');
  var SES = G.lines(SESSION_FILE, G.at(SESSION_FILE, /^BASE = /), G.at(SESSION_FILE, /setLogLevel\('OFF'\)/));
  var CS = G.counts('conf.session'), V = G.counts('submit.version');
  G.expect(CS.master === 'local[4]' && CS.default_parallelism_local4 === 4, 'the recording ran in local mode with four cores');

  LAB.addChapter({
    id: 'm1', n: 1, title: 'The map of Spark', short: 'Map', blurb: 'The driver, the executors, the cluster managers, the APIs and the words to know', minutes: 32,
    focus: ['src', 'stg', 'ing'],
    goals: [
      'Say what **Spark** is, in one sentence, and name the pieces: SQL, DataFrames, streaming, machine learning.',
      'Draw the **driver**, the **cluster manager** and the **executors**, and say what each one does.',
      'Name the four **cluster managers**, and what a managed service like EMR or Dataproc adds.',
      'Choose between **SQL**, **DataFrames**, **Datasets** and **RDDs**, and say why DataFrames are the default.',
      'Use the words **application, job, stage, task, partition, shuffle** correctly.',
      'Say when Spark is the wrong tool.'
    ],
    say: 'Mission 1 is the map. Spark is a big engine with a small number of ideas, and the same few words come back in every mission: driver, executor, task, partition, shuffle. Learn them here, once, and everything later fits. I also read a small sample of job descriptions, so you know which parts of Spark are asked about the most. This is the only mission without a long recording: the architecture is from the documentation, and the one recorded screen starts a real Spark session.',
    scenes: [
      B.talk({
        id: 'm1-what', t: 1, src: 'docs', title: 'What Spark is, in five lines',
        say: 'Spark is a general engine for processing data that is too big for one machine, or too slow for one machine. Press Next for the five things to remember.',
        items: [
          ['One engine, several libraries', 'Spark runs **SQL and DataFrames**, **Structured Streaming** for data that keeps arriving, **MLlib** for machine learning and **GraphX** for graphs. They share one engine, one optimiser and one way to run on a cluster. This course is about the first two, and about streaming.', 'One engine under several libraries.'],
          ['Languages', 'You write Spark in **Scala, Java, Python, R or SQL**. Python (PySpark) and SQL are the most common in data engineering. The engine is written in Scala and runs on the Java virtual machine, so a PySpark job is a Python program that drives a JVM.', 'PySpark is Python on top of a JVM engine.'],
          ['Many machines, one program', 'Your program describes **what** to compute. Spark cuts the data into **partitions**, sends one **task** per partition to the machines it has, and collects the results. You do not write the networking or the retries.', 'You describe it, Spark spreads it out.'],
          ['Lazy by design', 'Nothing runs when you write `filter` or `join`. Spark only records the steps. When you ask for a result (an **action**), it builds a plan, optimises it as a whole, and runs it. Mission 2 is all about this.', 'Steps are recorded. An action runs them.'],
          ['In memory when it can, disk when it must', 'Spark keeps intermediate data in memory and in local files between steps, and it can cache a table across actions. Older MapReduce wrote every intermediate result to the distributed file system, which is much slower for work with many steps.', 'No write to the shared file system between steps.']
        ],
        cols: 1,
        call: { k: 'tip', h: 'Spark 4:', t: 'this course uses Spark ' + V.spark + ' (Scala ' + V.scala + ', Java ' + V.java + '). Spark 4 turned ANSI SQL mode on by default and added many SQL features. Mission 8 shows what that changes.' }
      }),

      B.flow({
        id: 'm1-arch', t: 1, src: 'docs', title: 'Driver, cluster manager, executors', g: 'cluster', legend: true,
        steps: [
          { say: 'This is a Spark application on a cluster. It is the picture to draw on a whiteboard when someone says "explain Spark\'s architecture". Press Next to walk through it.', cap: 'A Spark application on a cluster.' },
          { say: 'Step 1. You submit your code, with `spark-submit` or from a notebook. That starts the **driver**: one process that runs your `main` program and holds the **SparkSession**.', on: ['k1'], focus: ['k_app', 'k_drv'], cap: 'Your code starts the driver.' },
          { say: 'Step 2. The driver asks the **cluster manager** for executors: how many, with how many cores and how much memory. The cluster manager does not run your code. It only shares out machines.', on: ['k2'], focus: ['k_drv', 'k_cm'], cap: 'The driver asks for executors.' },
          { say: 'Step 3. The cluster manager starts the **executors** on worker machines. An executor is a process with some cores and some memory. It lives as long as the application, unless dynamic allocation gives it back.', on: ['k3'], focus: ['k_cm', 'k_exe'], cap: 'The cluster manager starts executors.' },
          { say: 'Step 4. The driver builds a plan, cuts it into stages and tasks, and **sends the tasks straight to the executors**. The data does not go through the driver. This is the line to remember: the driver plans, the executors work.', on: ['k4'], focus: ['k_drv', 'k_exe'], tags: ['tg_one'], cap: 'The driver sends tasks to the executors.' },
          { say: 'Step 5. Executors read and write the storage themselves: Parquet or Delta files in an object store or HDFS. Each core runs one task at a time, on one partition. So the number of cores sets how many partitions are worked on at once.', on: ['k5'], focus: ['k_exe', 'k_store'], tags: ['tg_task'], cap: 'One task is one partition on one core.' }
        ]
      }),

      B.cmp({
        id: 'm1-managers', t: 1, src: 'docs', title: 'Cluster managers',
        say: 'Spark does not own machines. It asks a cluster manager for them. There are four ways to run, and a managed service usually wraps one. Press Next to read the pattern.',
        cols: ['Where it runs', 'What it is', 'You meet it when'],
        hl: 1,
        rows: [
          ['Local mode', 'The driver and one executor in a single JVM on your machine. `local[4]` means four cores.', 'You develop, test and learn. This whole course was recorded in it.'],
          ['Standalone', 'Spark\'s own small cluster manager: a master and some workers.', 'A team runs its own small cluster, or a vendor image does.'],
          ['Hadoop YARN', 'The resource manager of a Hadoop cluster. Spark asks YARN for containers.', 'An on-premises Hadoop cluster, and managed services built on YARN such as Amazon EMR and Google Dataproc.'],
          ['Kubernetes', 'Spark starts the driver and the executors as pods. Images and namespaces do the isolation.', 'A company runs everything on Kubernetes, or a managed Spark on Kubernetes service.'],
          ['A managed platform', 'Databricks, Amazon EMR, Google Dataproc, Azure Synapse and Fabric, AWS Glue. Each hides the cluster manager and adds its own autoscaling, notebooks and billing.', 'Most jobs in industry. The Spark code is the same. The cost model and the settings are not.']
        ],
        steps: [
          { upto: 2, say: 'Local mode for learning and tests, and Standalone for a small private cluster.' },
          { upto: 4, say: 'YARN and Kubernetes are the two big ones in companies. The differences that matter to you are how containers are sized, how shuffle files are kept when an executor leaves, and how logs are collected.' },
          { upto: 5, say: 'Managed platforms are what you will most often use. Learn the settings in Spark terms first, then find the same setting in the platform.' }
        ],
        pick: 'The **application code is the same** on every manager. What changes is the submit command, the way executors are sized, and where logs and the event log go. Mission 13 covers it.'
      }),

      B.cmp({
        id: 'm1-api', t: 1, src: 'docs', title: 'SQL, DataFrame, Dataset, RDD: which one',
        say: 'Spark has four ways to write the same work. Press Next to read why DataFrames and SQL are the default, and when the others are used.',
        cols: ['API', 'What it is', 'Use it when'],
        hl: 1,
        rows: [
          ['SQL', 'A query as text, run by `spark.sql(...)` or in a notebook cell.', 'The logic is a query, analysts read it, or you want it testable as a file.'],
          ['DataFrame', 'A table with named columns, as a Python or Scala object: `select`, `filter`, `join`.', 'Your default. It builds the same plan as SQL, and mixes well with Python code.'],
          ['Dataset', 'A DataFrame with a type for each row, only in Scala and Java.', 'You write Scala or Java and want compile-time checks.'],
          ['RDD', 'A distributed list of objects, the oldest API. Spark cannot look inside your functions.', 'Rarely: unstructured data, or something that columns cannot say.']
        ],
        steps: [
          { upto: 2, say: 'SQL and DataFrames are two spellings of one thing. Both go through the same optimiser, called Catalyst. The next mission shows that the plan is the same, byte for byte.' },
          { upto: 4, say: 'Datasets and RDDs are special cases. In Python you will never use a Dataset, and an RDD is a sign to ask whether a DataFrame would do.' }
        ],
        pick: 'Use **DataFrames and SQL**. An RDD gives up the optimiser: Spark cannot reorder, prune or push down what it cannot see inside.'
      }),

      B.talk({
        id: 'm1-words', t: 1, src: 'docs', title: 'Eight words that come back all the time',
        say: 'Learn these eight once. Every later mission uses them. Press Next for each.',
        items: [
          ['Application', 'One run of your program, from `spark-submit` to exit. It has **one driver** and a set of executors.', 'One program run.'],
          ['Job', 'The work started by **one action**, such as `count()` or `write`. One action can start more than one job.', 'One action, at least one job.'],
          ['Stage', 'A group of tasks that can run **without moving data between machines**. Spark cuts a job into stages at every shuffle.', 'A cut at each shuffle.'],
          ['Task', 'The work of one stage on **one partition**. It is the unit that is sent to an executor and run on one core. A failed task is retried.', 'One partition, one core.'],
          ['Partition', 'A piece of the data. Many partitions make a DataFrame. A task works on exactly one.', 'A piece of the data.'],
          ['Shuffle', 'Data **moves between partitions** across the network, because rows with the same key must meet. It is the most expensive step in most jobs, and it is where stages are cut.', 'Rows meet across the cluster.'],
          ['Transformation and action', 'A **transformation** (`filter`, `select`, `join`) only adds a step. An **action** (`count`, `collect`, `write`) makes Spark run the plan.', 'Steps are lazy. Actions run.'],
          ['Event log', 'A file of everything that happened: jobs, stages, tasks and their numbers. The **Spark UI** is drawn from it, and a history server can show it after the application has ended.', 'The record of the run.']
        ],
        cols: 2,
        call: { k: 'tip', h: 'The chain to say out loud:', t: 'an action starts a job, a job has stages, a stage has tasks, and a task works on one partition.' }
      }),

      B.code({
        id: 'm1-session', t: 1, src: 'rec', title: 'Start a real session', file: 'session.py', lang: 'python', code: SES,
        steps: [
          { say: 'This is the code that started every recording in this course. It builds a local Spark session with an event log. Press Next.', lines: null },
          { say: 'A few settings first. The UI is off, because nobody opens it during a recording. The time zone is UTC so that dates mean the same on every machine. The number of shuffle partitions is 8, not the default 200, so that small runs stay small. I say so on every screen where it matters.', lines: G.span(SES, /^BASE = /, /^\s+'spark\.sql\.shuffle/) },
          { say: '`SparkSession.builder` starts the builder. `master("local[4]")` is the cluster manager: local mode with **four cores**, which means four tasks can run at once. `appName` is what the UI and the log call the application.', lines: G.span(SES, /SparkSession\.builder/) },
          { say: 'The event log is switched on with two settings: where to write, and not to compress it, so that I can read it back as plain JSON lines. This is how every number in the course was read: from the log, never from a stopwatch.', lines: G.span(SES, /eventLog\.enabled/) },
          { say: '`getOrCreate()` starts the driver, and, in local mode, the one executor inside it. The session is ready. `setLogLevel("OFF")` only silences the console.', lines: G.span(SES, /getOrCreate/, /setLogLevel/) }
        ],
        note: 'Recorded: this code ran with Spark ' + V.spark + ' on Java ' + V.java + '. In local mode "master" is `' + CS.master + '`, the default parallelism is ' + CS.default_parallelism_local4 + ', and there is ' + CS.executors_in_local_mode + ' executor inside the driver.'
      }),

      B.cmp({
        id: 'm1-jd', t: 1, src: 'docs', title: 'What job descriptions ask about Spark',
        say: 'I read a small sample of data engineer job descriptions and the writing about them. Spark came up in nearly all of them. This is the direction, not a count: how often a topic was named, and the mission that covers it. Press Next to read the pattern.',
        cols: ['What the postings name', 'How often', 'Where in this course'],
        hl: 2,
        rows: [
          ['Spark core, PySpark and Spark SQL', 'in nearly every posting for big data', 'Missions 2, 3, 8, 9'],
          ['Tuning: shuffles, partitions, broadcast joins, caching, memory, skew', 'the most emphasised, in most senior postings', 'Missions 3, 4, 5, 6'],
          ['Reading plans, logs and metrics to debug', 'often as a requirement or an interview topic', 'Missions 2 and 14'],
          ['Delta Lake, Iceberg or Hudi', 'in many: "one or more of"', 'Mission 11'],
          ['Structured Streaming, often with Kafka', 'common in senior postings', 'Mission 10, and a Kafka tutorial later'],
          ['Airflow or another orchestrator', 'frequent', 'A later tutorial on Airflow'],
          ['Cloud: EMR, Databricks, Dataproc, Synapse, Glue', 'most postings name one', 'Mission 13, and the cloud tutorials of this repository'],
          ['Hadoop stack: Hive, HDFS, HBase, Sqoop', 'in some, mostly older platforms', 'A later tutorial on Hadoop'],
          ['Flink as an alternative or extra', 'sometimes, as a plus', 'A later tutorial on Flink']
        ],
        steps: [
          { upto: 3, say: 'The core of Spark, and the tuning of it. If you can read a plan and explain a shuffle, you already answer the question that most postings are really asking.' },
          { upto: 6, say: 'Formats, streaming and the places where Spark runs. Postings usually say "one or more of", so learn the idea, not one brand.' },
          { upto: 9, say: 'The neighbours: orchestrators and older or newer engines. They get their own tutorials.' }
        ],
        pick: 'This is **directional**, from a few searches and the summaries they returned. It is not a count of postings. Read two or three postings for the roles you want, and check them against the table.'
      }),

      B.talk({
        id: 'm1-not', t: 2, src: 'docs', title: 'When Spark is the wrong tool',
        say: 'A senior answer includes "when not". Spark has a start-up cost and a coordination cost. Press Next for four cases.',
        items: [
          ['The data fits on one machine', 'A few gigabytes fit in memory on a laptop. A single-node engine (DuckDB, Polars, pandas) can be faster, because nothing moves across a network, and it is simpler to run and test.', 'Under a few GB, try one machine first.'],
          ['The warehouse already does it', 'If the data is in BigQuery, Snowflake or Synapse and the logic is SQL, the warehouse is cheaper to run and to read. Spark is for what SQL in the warehouse cannot say, or for files outside it.', 'SQL in the warehouse is often enough.'],
          ['Tiny, frequent jobs', 'A job that runs every minute on a few rows pays Spark\'s start-up time each time. A small service or a streaming job that stays up is better.', 'Start-up time is not free.'],
          ['Low-latency lookups', 'Spark is built for scans and aggregates. A user waiting for one row needs a database or a key-value store.', 'Not a database for single rows.']
        ],
        cols: 1,
        call: { k: 'tip', h: 'The honest version:', t: 'Spark is excellent when the data is large, the logic is non-trivial and files are the source of truth. Say that in an interview, and you sound like someone who has run it in production.' }
      }),

      B.quiz({
        id: 'm1-q1', t: 1,
        q: 'Where does the work of your DataFrame code run?',
        opts: [
          { t: 'In the driver, which sends the results to the executors', fb: 'It is the other way round.' },
          { t: 'In tasks on the executors, which the driver plans and sends', fb: '' },
          { t: 'In the cluster manager', fb: 'The cluster manager only shares out machines.' },
          { t: 'In the Spark UI', fb: 'The UI only shows what happened.' }
        ],
        ok: 1,
        why: 'The driver builds the plan and the tasks. The executors run the tasks, on their own cores, and read the data themselves.'
      }),

      B.quiz({
        id: 'm1-q2', t: 1,
        q: 'What is one task?',
        opts: [
          { t: 'One action', fb: 'An action starts a job.' },
          { t: 'The work of one stage on one partition', fb: '' },
          { t: 'One executor', fb: 'An executor runs many tasks.' },
          { t: 'One line of code', fb: 'A line of code can become many tasks, or none.' }
        ],
        ok: 1,
        why: 'A task is sent to an executor and runs on one core. The number of tasks in a stage is the number of partitions it works on.'
      }),

      B.quiz({
        id: 'm1-q3', t: 1,
        q: 'Which of these is NOT a cluster manager that Spark runs on?',
        opts: [
          { t: 'Hadoop YARN', fb: 'Spark runs on YARN.' },
          { t: 'Kubernetes', fb: 'Spark runs on Kubernetes.' },
          { t: 'Apache Airflow', fb: '' },
          { t: 'Spark standalone', fb: 'This is Spark\'s own cluster manager.' }
        ],
        ok: 2,
        why: 'Airflow is an orchestrator: it decides when jobs start. It can start a Spark job, but it does not give Spark its machines.'
      }),

      B.quiz({
        id: 'm1-q4', t: 2,
        q: 'You submit with `--deploy-mode client`. Where does the driver run?',
        opts: [
          { t: 'On a worker machine chosen by the cluster manager', fb: 'That is cluster mode.' },
          { t: 'On the machine that ran spark-submit', fb: '' },
          { t: 'Inside every executor', fb: 'There is exactly one driver.' },
          { t: 'In the cluster manager', fb: 'The cluster manager does not run your code.' }
        ],
        ok: 1,
        why: 'In client mode the driver is the process you started. If you close your laptop, the job stops. In cluster mode the driver runs on the cluster, which is what production jobs usually use.'
      }),

      B.quiz({
        id: 'm1-q5', t: 2,
        q: 'A daily job reads 2 GB of CSV, cleans it, and writes Parquet. Which is the best first idea?',
        opts: [
          { t: 'A 50-node Spark cluster, to be safe', fb: 'Most of the time and the bill would go to starting and coordinating.' },
          { t: 'A single-node engine or the warehouse\'s SQL, and Spark only if it stops being enough', fb: '' },
          { t: 'Flink, because it is faster', fb: 'It is a streaming engine, and the job is a small batch.' },
          { t: 'An RDD program', fb: 'It would give up the optimiser for no gain.' }
        ],
        ok: 1,
        why: 'Match the tool to the size and the shape. Spark earns its cost when the data or the logic is big. For small data it is overhead.'
      }),

      B.order({
        id: 'm1-ord', t: 1, q: 'Put what happens when you run spark-submit in order.',
        items: [
          'spark-submit starts the driver with your code',
          'The driver asks the cluster manager for executors',
          'The cluster manager starts executors on worker machines',
          'The driver builds a plan, cuts it into stages and tasks, and sends the tasks',
          'Executors run the tasks and read and write the data',
          'The application ends and the executors are released'
        ],
        why: 'Driver first, because it is the one that asks for machines. Executors come next. The tasks go straight from the driver to the executors, and the data goes between the executors and the storage.'
      }),

      B.decide({
        id: 'm1-dec', t: 2, src: 'docs', title: 'Decision: how should Brewline run its new order job',
        scenario: 'Brewline needs a nightly job. It reads about 3 GB of partner files, joins them to the stores table (12 rows), and writes a Parquet table. The data will probably grow tenfold over a year. The team knows Python and SQL. You choose how to run it.',
        opts: [
          { t: 'A large always-on Spark cluster, sized for the data in a year', d: 'No surprises later.', lose: 'You pay for it every night for a year, and most of the time it sits idle. Start small and measure.' },
          { t: 'PySpark in a managed service with autoscaling, a small starting size, and the job written so that it scales', d: 'It handles today\'s 3 GB, and the growth without a rewrite.', lose: '' },
          { t: 'A single script on one machine, forever', d: 'The cheapest today.', lose: 'At thirty gigabytes it may no longer fit, and the rewrite is a project. Choose a path that scales, even if you start small.' }
        ],
        pick: 1,
        why: 'PySpark with autoscaling fits both sizes: small now, and no rewrite when the data grows. Keep the first version simple, and watch the stage table for the first sign of skew or spill.',
        when: 'If the data will stay small for good, and the team already runs a warehouse, SQL there beats a new platform. Say that you would check the size first.'
      }),

      B.qa({
        id: 'qa-arch', t: 1, tag: 'Spark basics', secs: 75,
        q: 'Explain Spark\'s architecture.',
        pts: ['A driver, a cluster manager, executors', 'Driver: runs main, holds the session, plans, sends tasks', 'Cluster manager: shares out machines (local, standalone, YARN, Kubernetes)', 'Executors: cores and memory, run tasks, keep cache and shuffle files', 'One task = one partition on one core', 'Data does not pass through the driver'],
        short: 'A Spark application has one **driver** and many **executors**. The driver runs my program and holds the SparkSession. It turns my code into a plan, cuts the plan into stages and tasks, and sends the tasks to the executors. The **cluster manager**, which can be YARN, Kubernetes, Spark standalone or local mode, only shares out the machines: it starts the executors, and does not run my code. Each executor has some cores and some memory. A core runs one task at a time, and a task works on one partition. Executors read and write the storage themselves, so the data does not pass through the driver. That is why collecting a big result to the driver is a classic way to run out of memory.',
        fu: [['What happens if an executor dies?', 'The driver notices, and reruns its tasks on other executors. Shuffle files that it held may be lost, in which case the earlier stage runs again for those partitions, unless an external shuffle service kept them.'], ['What if the driver dies?', 'The application ends, because the driver holds the plan and the state. For a stream you restart from the checkpoint.']],
        trap: 'Saying the cluster manager runs the code, or that the data goes through the driver.',
        real: 'Draw the architecture and show me where a collect() hurts.'
      }),

      B.qa({
        id: 'qa-submit', t: 1, tag: 'Spark basics', secs: 60,
        q: 'What are a job, a stage and a task?',
        pts: ['Action starts a job', 'Job is cut into stages at shuffles', 'Stage = tasks that need no data movement', 'Task = one partition, one core', 'Failed tasks are retried', 'Seen in the Spark UI tabs'],
        short: 'An **action**, like `count` or a write, starts a **job**. Spark cuts the job into **stages** at every shuffle, because a shuffle is where data has to move between machines. A stage is a set of **tasks** that can all run without moving data. A task is the work of one stage on one partition, and it runs on one core of an executor. If a task fails, Spark retries it, by default up to four times on a cluster. In the UI, the Jobs tab lists jobs, the Stages tab shows the tasks of a stage with the minimum, median and maximum, and the SQL tab shows the plan.',
        fu: [['Does one action always start one job?', 'No. One action can start several jobs, for example when adaptive execution runs a stage first and plans the rest afterwards. Mission 2 shows it with real numbers.'], ['Where do you see skew?', 'In the Stages tab: the maximum task time or the maximum records, against the median.']],
        trap: 'Mixing up a job with a stage, or saying that a task is a line of code.',
        real: 'Open a Spark UI and tell me what you look at first.'
      }),

      B.qa({
        id: 'qa-vs', t: 2, tag: 'Spark basics', secs: 75,
        q: 'Why is Spark faster than Hadoop MapReduce, and when is it not?',
        pts: ['MapReduce writes to HDFS between every step', 'Spark plans the whole DAG and pipelines narrow steps', 'In-memory and local-disk intermediates', 'Catalyst and Tungsten optimise the plan and the code', 'Not faster for small data, or one-pass jobs', 'Start-up and coordination cost'],
        short: 'MapReduce writes the output of every map and reduce to the distributed file system, so a job with many steps reads and writes the cluster many times. Spark builds a **graph of the whole job**, runs the steps that need no data movement together in one pass, and keeps what it must pass on in memory or in local files. On top of that, the Catalyst optimiser rewrites the plan, and Tungsten generates efficient code. It is not always faster: a job that makes one pass over data has little to gain, and for small data Spark\'s start-up and coordination cost can be larger than the work.',
        fu: [['Is Spark in-memory only?', 'No. It uses memory first and spills to local disk when it has to. Shuffle files are always written to local disk.'], ['Does Spark replace Hadoop?', 'It replaces MapReduce as the engine. It often still reads from HDFS or runs on YARN, and many clusters use both.']],
        trap: 'Saying "Spark is 100 times faster" as a rule. It depends on the job.',
        real: 'Tell me about a job that you moved to Spark, and what you measured.'
      }),

      B.recap({
        id: 'm1-recap', n: 1, badge: 'Cluster Reader', color: '#BBF7D0',
        pts: [
          'Spark is **one engine** under SQL, DataFrames, streaming and machine learning. You describe the work, and it spreads it out.',
          'The **driver** plans and sends tasks. The **executors** work and keep the cache. The **cluster manager** only shares out machines.',
          'A **task** is one partition on one core. An action starts a **job**, a shuffle cuts it into **stages**.',
          'The cluster managers are **local, standalone, YARN, Kubernetes**, and managed services that wrap them.',
          'Use **DataFrames and SQL**. RDDs give up the optimiser.',
          'Spark is the **wrong tool** for small data, for warehouse SQL, and for single-row lookups.'
        ],
        lines: [
          'The driver plans. The executors work.',
          'One task is one partition on one core.',
          'I use DataFrames and SQL, and I check whether Spark is needed at all.'
        ]
      })
    ]
  });
})();
