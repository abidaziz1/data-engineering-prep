/* Mission 13: running it for real. What spark-submit does, the flags this course names checked against the help of Spark 4.0.1, the order in which settings win (run five times),
   deploy modes, cluster managers, dynamic allocation and sizing. The recorded parts ran spark-submit in local mode. YARN, Kubernetes, EMR and Dataproc were not run: they are from documentation. */
(function () {
  var B = LAB.b, G = LAB.get;
  var FL = G.table('submit.flags'), VER = G.counts('submit.version'), PRE = G.table('submit.precedence'), RETRY = G.counts('errors.retry');
  var APP = G.file('code/app/app_conf.py');
  var n0 = function (x) { return Number(x).toLocaleString('en-US'); };
  var missing = FL.rows.filter(function (r) { return r[1] !== 'yes'; });
  var pre = function (start) { var r = PRE.rows.filter(function (x) { return x[0].indexOf(start) === 0; })[0]; if (!r) throw new Error('no precedence case ' + start); return r[1]; };
  G.expect(missing.length === 0 && FL.rows.length >= 20, 'every flag that the course names is in spark-submit --help');
  G.expect(pre('nothing set') === '200' && pre('--conf spark.sql.shuffle.partitions=50') === '50' && pre('a properties file') === '100' && pre('the properties file') === '50' && pre('--conf (50) and the program') === '20', 'the order of settings: program, flag, file, default');
  G.expect(RETRY.maxFailures_default_on_a_cluster === 4 && RETRY.maxFailures_default_in_local_mode === 1, 'task retries in local mode and on a cluster');
  var flagNames = FL.rows.map(function (r) { return r[0]; });
  var SUBMIT = [
    'spark-submit \\',
    '  --master yarn \\',
    '  --deploy-mode cluster \\',
    '  --name brewline-daily-revenue \\',
    '  --queue data-eng \\',
    '  --num-executors 20 \\',
    '  --executor-cores 4 \\',
    '  --executor-memory 14g \\',
    '  --driver-memory 4g \\',
    '  --conf spark.executor.memoryOverhead=2g \\',
    '  --conf spark.sql.shuffle.partitions=2000 \\',
    '  --conf spark.eventLog.enabled=true \\',
    '  --py-files deps.zip \\',
    '  jobs/daily_revenue.py --day 2026-11-05'
  ].join('\n');
  var used = SUBMIT.split('jobs/daily_revenue.py')[0].match(/--[a-z-]+/g).filter(function (f, i, a) { return a.indexOf(f) === i; });
  used.forEach(function (f) { G.expect(flagNames.indexOf(f) >= 0, 'the flag ' + f + ' in the example command was checked against spark-submit --help'); });

  LAB.addChapter({
    id: 'm13', n: 13, title: 'Running it for real', short: 'Submit', blurb: 'spark-submit, the order of settings, deploy modes, cluster managers, dynamic allocation and sizing', minutes: 52,
    focus: ['ci', 'air'],
    goals: [
      'Say what **spark-submit** does and read a command line.',
      'Tell **client** mode from **cluster** mode, and say which one a production job uses.',
      'State the **order in which settings win**: the program, the flags, the file, the default.',
      'Size an application: **executors, cores, memory, overhead, partitions**.',
      'Say what **dynamic allocation** does and what it needs.',
      'Describe the **cluster managers** and the managed services, and what changes in the command.'
    ],
    say: 'Mission 13 is where code leaves your laptop. A Spark job that passes its tests still has to be started with the right resources and the right settings, and most of what goes wrong here is a setting that is not what you think it is. I ran spark-submit on Spark 4.0.1 in local mode: I checked that every flag this course names exists, and I ran one small program five times to see which setting wins. Cluster managers, YARN, Kubernetes and the managed services are from documentation. I did not run any of them.',
    scenes: [
      B.talk({
        id: 'm13-what', t: 1, src: 'docs', title: 'What spark-submit does',
        say: 'spark-submit is the one way to start a Spark application on any cluster manager. Press Next for what it takes and what it does.',
        items: [
          ['The command', '`spark-submit [options] your_app [arguments]`. The app is a Python file, a zip, or a JAR with a main class. The arguments after it go to **your program**, not to Spark.', 'Options for Spark, arguments for you.'],
          ['What it decides', 'The **master** (which cluster manager), the **deploy mode** (where the driver runs), the **resources** (executors, cores, memory), and any **settings**. It ships your code and files to the cluster, and starts the driver.', 'Where, how big, with what settings.'],
          ['The same app, any manager', 'The program does not change between local, YARN and Kubernetes. Only the command changes. That is why you should keep the master out of the code, and put it in the command.', 'Do not hard-code the master.'],
          ['Where output goes', 'In client mode the driver prints to your terminal. In cluster mode the driver runs on a worker, and its output goes to the cluster\'s logs. The event log, if enabled, goes to the folder you configured.', 'Cluster mode: look in the cluster logs.']
        ],
        cols: 1
      }),

      B.flow({
        id: 'm13-flow', t: 1, src: 'docs', title: 'Code becomes a running application', g: 'submit', legend: true,
        steps: [
          { say: 'This is the path of a production job. Press Next to walk it.', cap: 'Code becomes an application.' },
          { say: 'Step 1. The code is written as a script or a package. Python dependencies that the cluster does not have are packed in a zip or an environment.', on: ['u1'], focus: ['u_code', 'u_test'], cap: 'Your code and its dependencies.' },
          { say: 'Step 2. **Tests and build** run in CI: the tests of mission 12, and the packaging. Only a green build is released.', on: ['u2'], focus: ['u_test', 'u_sub'], cap: 'A green build is released.' },
          { say: 'Step 3. `spark-submit` runs, with the master, the deploy mode, the resources and the settings. The tag on the left is the rule to remember: **settings in the program beat flags, flags beat the file.**', on: ['u3'], focus: ['u_sub', 'u_cm'], tags: ['tg_prec'], cap: 'The command carries the settings.' },
          { say: 'Step 4. The **cluster manager** finds room, and starts the driver. In cluster mode the driver starts on a worker.', on: ['u4'], focus: ['u_cm', 'u_drv'], tags: ['tg_mode'], cap: 'The driver is started.' },
          { say: 'Step 5. The driver asks for **executors** and sends them tasks.', on: ['u5'], focus: ['u_drv', 'u_exe'], cap: 'Executors run the tasks.' },
          { say: 'Step 6. While it runs, the driver writes the **event log**: one folder for each application.', on: ['u6'], focus: ['u_drv', 'u_log'], cap: 'The event log is written.' },
          { say: 'Step 7. After the application has ended, the **history server** reads the event log and shows the same pages as the live Spark UI. Mission 14 reads the log directly.', on: ['u7'], focus: ['u_log', 'u_hist'], cap: 'The history server shows it afterwards.' }
        ]
      }),

      B.rows({
        id: 'm13-flags', t: 1, src: 'rec', title: 'The flags, checked against the real help',
        steps: [
          {
            say: 'Flag names are easy to get wrong from memory. I ran `spark-submit --help` of Spark ' + VER.spark + ' (Scala ' + VER.scala + ', Java ' + VER.java + ') and looked for every flag that this course names. Press Next.',
            tabs: [{ layer: 'RECORDED', name: 'Flags found in spark-submit --help', c: 'raw', cols: FL.cols, rows: FL.rows, trk: 0 }],
            notes: ['Recorded: a regular expression for each flag, applied to the output of `spark-submit --help`.']
          },
          {
            say: 'All **' + FL.rows.length + '** flags are there: the ones for the cluster (`--master`, `--deploy-mode`, `--queue`), for the resources (`--driver-memory`, `--executor-memory`, `--executor-cores`, `--num-executors`), for settings (`--conf`, `--properties-file`) and for code and files (`--py-files`, `--files`, `--archives`, `--packages`, `--jars`).',
            tabs: [{ layer: 'RECORDED', name: 'Flags found in spark-submit --help', c: 'raw', cols: FL.cols, rows: FL.rows, trk: 8, chg: FL.rows.map(function (r, i) { return [i, 1]; }) }],
            notes: ['A flag that exists for one cluster manager only is documented as such: `--queue` is for YARN, and `--supervise` is for standalone and Mesos-style cluster mode.']
          }
        ]
      }),

      B.code({
        id: 'm13-cmd', t: 1, src: 'docs', title: 'A production command, line by line', file: 'submit.sh', lang: 'bash', code: SUBMIT,
        steps: [
          { say: 'A command for a nightly job on a YARN cluster. I did not run it, since there is no cluster here. But I checked that **every flag** in it exists in the help of Spark ' + VER.spark + '. Press Next.', lines: null },
          { say: '`--master yarn --deploy-mode cluster`: the cluster manager is YARN, and the driver runs on the cluster. If the machine that submitted it disappears, the job goes on.', lines: G.span(SUBMIT, /--master yarn/, /--deploy-mode/) },
          { say: '`--name` is what the UI and the logs call it. `--queue` is a YARN queue, which is how a team gets its share of the cluster.', lines: G.span(SUBMIT, /--name/, /--queue/) },
          { say: 'The resources: **20 executors**, each with **4 cores** and **14 GB** of heap, and **4 GB** for the driver. That is 80 cores in all.', lines: G.span(SUBMIT, /--num-executors/, /--driver-memory/) },
          { say: 'Settings with `--conf`: **2 GB of overhead** for each executor (a PySpark job needs it), 2,000 shuffle partitions for a big shuffle, and the event log switched on.', lines: G.span(SUBMIT, /memoryOverhead/, /eventLog/) },
          { say: '`--py-files deps.zip` ships the Python dependencies. Then the application, and its own argument: `--day 2026-11-05` is read by the program, not by Spark.', lines: G.span(SUBMIT, /--py-files/, /daily_revenue/) }
        ],
        note: 'From documentation, with every flag checked. A container on YARN asks for the heap plus the overhead: here 14 GB + 2 GB = 16 GB, so the cluster\'s largest container must be at least 16 GB.'
      }),

      B.code({
        id: 'm13-app', t: 1, src: 'rec', title: 'A program that reports its own settings', file: 'app_conf.py', lang: 'python', code: APP,
        steps: [
          { say: 'To see which setting wins, I wrote a tiny program that prints what it sees. Press Next.', lines: null },
          { say: 'It builds a session. If the environment variable `SET_IN_CODE` is set, it also sets `spark.sql.shuffle.partitions` **in the program**.', lines: G.span(APP, /b = SparkSession/, /spark = b\.getOrCreate/) },
          { say: 'Then it prints the value that the running session reports, with the master and the application name, as one JSON line.', lines: G.span(APP, /print\('RESULT/) }
        ],
        note: 'Recorded: a run of this program with spark-submit, five times, with the same setting in different places.'
      }),

      B.rows({
        id: 'm13-order', t: 1, src: 'rec', title: 'Which setting wins: five runs',
        steps: [
          {
            say: 'The same program, `spark.sql.shuffle.partitions`, and five ways to set it. The second column is what the program saw. Press Next.',
            tabs: [{ layer: 'RECORDED', name: 'The value the program saw', c: 'raw', cols: PRE.cols, rows: PRE.rows, trk: 0 }],
            notes: ['Recorded: `spark-submit --master local[2]` of Spark ' + VER.spark + '.']
          },
          {
            say: 'With nothing set, the program saw **' + pre('nothing set') + '**: the default. With `--conf spark.sql.shuffle.partitions=50`, it saw **' + pre('--conf spark.sql.shuffle.partitions=50') + '**. With a properties file that says 100, it saw **' + pre('a properties file') + '**.',
            tabs: [{ layer: 'RECORDED', name: 'The value the program saw', c: 'raw', cols: PRE.cols, rows: PRE.rows, trk: 2, chg: [[0, 1], [1, 1], [2, 1]] }],
            notes: ['Each source works alone. The question is what happens when two meet.']
          },
          {
            say: 'Both the file (100) and `--conf` (50): the program saw **' + pre('the properties file') + '**. **The flag beats the file.**',
            tabs: [{ layer: 'RECORDED', name: 'The value the program saw', c: 'raw', cols: PRE.cols, rows: PRE.rows, trk: 3, chg: [[3, 1]] }],
            notes: ['The file is `conf/spark-defaults.conf`, or a file given with `--properties-file`. It is the place for cluster-wide defaults.']
          },
          {
            say: 'The flag (50) and the program setting it to 20: the program saw **' + pre('--conf (50) and the program') + '**. **The program beats the flag.** Whoever wrote `config("spark.sql.shuffle.partitions", ...)` in the code won over the person who typed `--conf` in the command.',
            tabs: [{ layer: 'RECORDED', name: 'The value the program saw', c: 'raw', cols: PRE.cols, rows: PRE.rows, trk: 4, chg: [[4, 1]] }],
            notes: ['The order, from strongest: the program (`SparkConf` or `spark.conf.set`), then `spark-submit` flags, then the properties file, then the default. It matches the Spark documentation.']
          }
        ]
      }),

      B.widget({ id: 'm13-lab', kind: 'submitlab', t: 1, src: 'docs', title: 'Lab: precedence, and the size of an application' }),

      B.cmp({
        id: 'm13-managers', t: 1, src: 'docs', title: 'The command for each cluster manager',
        say: 'The program is the same everywhere. What changes is the master, and a few settings. This table is from the documentation, and I did not run any of these. Press Next.',
        cols: ['Where', '--master', 'What else changes'],
        hl: 1,
        rows: [
          ['Local', '`local[4]`', 'Nothing to configure. Tests and development'],
          ['Standalone', '`spark://host:7077`', 'A master and workers that you run. `--supervise` restarts the driver'],
          ['YARN', '`yarn`', '`--queue`, container sizes, `HADOOP_CONF_DIR` to find the cluster. Executor memory plus overhead must fit the largest container'],
          ['Kubernetes', '`k8s://https://host:443`', 'A container image with Spark and your code, a namespace, a service account, and `spark.kubernetes.*` settings'],
          ['Managed (EMR, Dataproc, Databricks, Synapse)', 'The platform sets it', 'A job or step API instead of a shell command. Cluster size and autoscaling are the platform\'s']
        ],
        steps: [
          { upto: 2, say: 'Local and standalone are the simplest. Local is what the whole course used.' },
          { upto: 4, say: 'YARN and Kubernetes are where most companies run Spark themselves. The questions are the container sizes on YARN, and the image on Kubernetes.' },
          { upto: 5, say: 'On a managed platform you rarely type `spark-submit`. You fill in a job definition, and the platform builds the command. The settings in this mission still apply.' }
        ],
        pick: 'In an interview, name the **master**, the **deploy mode**, and **where the settings come from**. Those three answer most questions about "how do you run it".'
      }),

      B.cmp({
        id: 'm13-modes', t: 1, src: 'docs', title: 'Client mode and cluster mode',
        say: 'The deploy mode decides where the driver lives. Press Next to read the two.',
        cols: ['', 'client', 'cluster'],
        hl: 2,
        rows: [
          ['Where the driver runs', 'On the machine that ran spark-submit', 'On a machine of the cluster'],
          ['If you close the terminal', 'The job stops', 'The job goes on'],
          ['Where you see the output', 'In your terminal', 'In the cluster logs, or the history server'],
          ['Network between driver and executors', 'Your machine must be reachable from the cluster', 'Inside the cluster, fast and stable'],
          ['Use it for', 'A shell, a notebook, a quick test', 'A scheduled production job']
        ],
        steps: [
          { upto: 3, say: 'The first three rows are what you notice. Client is attached to you. Cluster lives on its own.' },
          { upto: 5, say: 'A driver that talks to hundreds of executors needs a good network. That is why production jobs run in cluster mode: the driver is next to its executors.' }
        ],
        pick: 'A **scheduled job** runs in **cluster mode**. An **interactive** session runs in client mode, and the driver is on a machine that is close to the cluster, not on a laptop at home.'
      }),

      B.talk({
        id: 'm13-size', t: 1, src: 'docs', title: 'Sizing an application',
        say: 'There is no perfect size, but there are rules that avoid the worst. Press Next for each.',
        items: [
          ['Cores for each executor', 'Four or five cores is a common choice. More cores share one heap and one connection to storage, and one long garbage collection pause stops all of them. One core for each executor wastes the shared memory and runs too many JVMs.', '4 to 5 cores.'],
          ['Memory for each core', 'Count on **about 4 GB for each core** as a start, more for wide rows, joins and wide shuffles, less for narrow, simple work. Remember that the cores of an executor share its heap, as in mission 6.', 'About 4 GB a core.'],
          ['The overhead', '`spark.executor.memoryOverhead` is 10 percent of the heap, with a minimum of 384 MiB, by default. PySpark with pandas UDFs needs more. The container is the **heap plus the overhead**, and that sum must fit what YARN or Kubernetes allows.', 'Container = heap + overhead.'],
          ['Number of executors', 'Start from the cores you want: total cores = executors times cores each. Match the total to the **partitions**: a stage with 2,000 tasks on 80 cores runs in 25 waves, which is fine if the tasks are short.', 'Match cores to partitions.'],
          ['The driver', 'The driver needs memory for the plan, the broadcast copies and anything you collect. 2 to 8 GB is usual. A driver that is too small fails on a big broadcast or a collect.', 'Small, but not tiny.'],
          ['Measure, then change one thing', 'Run, read the stage table, change one number, run again. The lab above does the arithmetic. The stage table says whether it was right.', 'One change at a time.']
        ],
        cols: 2
      }),

      B.talk({
        id: 'm13-dynamic', t: 2, src: 'docs', title: 'Dynamic allocation, speculation and retries',
        say: 'Three settings that change how many executors you have and how failures are handled. Press Next.',
        items: [
          ['Dynamic allocation', 'With `spark.dynamicAllocation.enabled`, Spark adds executors when tasks are waiting and gives them back when they are idle, between a minimum and a maximum that you set. It saves money on jobs with uneven stages. Without it, you hold the executors you asked for for the whole run, and on YARN the default is **two** (`spark.executor.instances`).', 'Add when busy, release when idle.'],
          ['What it needs', 'An executor that leaves takes its **shuffle files** with it. So dynamic allocation needs an **external shuffle service** (YARN) or **shuffle tracking** (Kubernetes and others), which keeps the files, or tells Spark which executors still hold needed files.', 'Somewhere to keep the shuffle files.'],
          ['Retries', 'A failed task is retried. `spark.task.maxFailures` is **' + RETRY.maxFailures_default_on_a_cluster + '** on a cluster. In local mode the recording found **' + RETRY.maxFailures_default_in_local_mode + '**: a failure ends the job at once. To test retries on one machine use `local[2,4]`, which means two cores and four failures allowed.', '4 tries on a cluster, 1 in local mode.'],
          ['Speculation', 'With `spark.speculation` on, Spark starts a second copy of a task that is much slower than the others, and takes whichever finishes first. It helps with a slow machine. It does not help with skew, because the copy has the same data.', 'A second copy of the slow task.']
        ],
        cols: 1,
        call: { k: 'warn', h: 'Spot and preemptible machines:', t: 'they can disappear in the middle of a stage. Shuffle files on them are lost, and the stage repeats. Use them for tasks that are cheap to repeat, and keep a base of stable machines.' }
      }),

      B.talk({
        id: 'm13-deps', t: 1, src: 'docs', title: 'Dependencies, secrets and settings hygiene',
        say: 'Three things that cause incidents the first time a job runs on a cluster. Press Next.',
        items: [
          ['Python dependencies', 'The executors need the same libraries as your driver. Ship them: `--py-files deps.zip` for pure Python code, `--archives` with a packed environment for compiled libraries, or build an **image** on Kubernetes. Never `pip install` at the start of every run.', 'Ship the environment.'],
          ['Jars and packages', '`--packages group:artifact:version` downloads a library, such as the Delta package, when the application starts. On a cluster without internet, put the jars in your own repository, or ship them with `--jars`.', 'Packages need a source.'],
          ['Secrets', 'A `--conf` value shows in the **Environment tab** and in the **event log**. Do not put a password or a key in a setting. Use the platform\'s secret store, and read it in the program. `spark.redaction.regex` hides settings that match a pattern.', 'Settings are visible.'],
          ['Settings in one place', 'Cluster-wide defaults go in `spark-defaults.conf`. Job-specific resources go in the command. Settings that the **logic** depends on go in the code. And log all the effective settings at the start of the job, so that a post-mortem knows what ran.', 'Log what ran.']
        ],
        cols: 1
      }),

      B.talk({
        id: 'm13-connect', t: 3, src: 'docs', title: 'Extra: Spark Connect',
        say: 'Spark 4 pushes another way to talk to a cluster. Press Next for the idea.',
        items: [
          ['A thin client', 'With **Spark Connect**, your program is a small client that sends the plan to a Spark server and gets results back. The driver lives in the server, not in your process. The Spark 4.0.0 release notes list a lightweight Python package, `pyspark-client`, and a distribution with Connect enabled.', 'The driver moves to a server.'],
          ['What it changes', 'You do not start a JVM on your machine. Several clients share one server. A client crash does not kill the driver, and a driver problem does not kill your notebook. Some APIs that need the local JVM (RDDs, for example) are not available.', 'Decoupled client and server.']
        ],
        cols: 1,
        call: { k: 'tip', h: 'Not run here:', t: 'this course ran in classic local mode. Check the release notes of your Spark version for the status of each Connect feature.' }
      }),

      B.decide({
        id: 'm13-dec', t: 2, src: 'docs', title: 'Decision: how to spend 100 cores',
        scenario: 'A Brewline job may use 100 cores and 400 GB of memory on a YARN cluster, and its stages shuffle a lot. You can shape the 100 cores as 100 executors with 1 core each, 20 executors with 5 cores each, or one executor with 100 cores.',
        opts: [
          { t: '100 executors, 1 core and 4 GB each', d: 'Maximum isolation: one task per JVM.', lose: 'Every executor pays its own overhead, its own copy of each broadcast, and its own connection to storage. Memory is shared by no one.' },
          { t: '20 executors, 5 cores and about 20 GB each', d: 'Few enough to share overhead and broadcasts, small enough that a lost executor costs little.', lose: '' },
          { t: 'One executor, 100 cores and 400 GB', d: 'No network between tasks.', lose: 'One huge heap means long garbage collection pauses that stop 100 tasks, one connection to storage for all of them, and a single failure that loses everything.' }
        ],
        pick: 1,
        why: 'The middle size is the usual answer: 4 to 5 cores and about 4 GB for each core. Check the heap plus overhead against the largest container, and then read the stage table.',
        when: 'If tasks are very memory-hungry, use fewer cores for each executor, so that each task gets more of the heap.'
      }),

      B.bug({
        id: 'm13-bug', t: 1, q: 'The command says 2,000 shuffle partitions, but the Spark UI shows 200 and the job is slow. Click the line that causes it.',
        file: 'revenue.py', lang: 'python',
        code: ['# submitted with: spark-submit --conf spark.sql.shuffle.partitions=2000 revenue.py', 'from pyspark.sql import SparkSession', 'spark = (SparkSession.builder.appName("revenue")', '         .config("spark.sql.shuffle.partitions", "200")', '         .getOrCreate())'].join('\n'),
        bad: [4],
        hint: 'Which wins: the program or the command line?',
        why: 'Settings in the program beat flags. In the recording, with the flag at 50 and the program setting 20, the program saw **' + pre('--conf (50) and the program') + '**. Here the 200 in the code wins over the 2000 in the command. Remove the line from the code and keep the setting in one place.',
        fix: ['# submitted with: spark-submit --conf spark.sql.shuffle.partitions=2000 revenue.py', 'from pyspark.sql import SparkSession', 'spark = SparkSession.builder.appName("revenue").getOrCreate()'].join('\n'),
        cheer: 'One place for each setting, and log the effective value.'
      }),

      B.incident({
        id: 'm13-inc', t: 2, src: 'docs', title: 'Incident: a 200-core cluster, two executors', time: '04:20',
        alert: '**The nightly job takes 40 minutes and the cluster is nearly idle.** The Spark UI shows two executors for the whole run, and the stage table shows plenty of tasks waiting. Nobody changed the code. A new team member rewrote the submit command.',
        clues: ['The new command has no `--num-executors`', 'Dynamic allocation is not enabled', 'On YARN the default number of executors is two'],
        opts: [
          { t: 'Set the executors (`--num-executors`) or enable dynamic allocation with a minimum and a maximum, and log the effective settings at the start', fb: '' },
          { t: 'Increase `--executor-memory`', fb: 'Memory is not the limit. There are only two executors.' },
          { t: 'Add more partitions', fb: 'Tasks are waiting already. There are too few cores to run them.' },
          { t: 'Restart the cluster', fb: 'Nothing is wrong with it.' }
        ],
        best: 0,
        why: 'Without dynamic allocation, Spark on YARN uses `spark.executor.instances`, which is **2** by default. The job holds two executors for the whole run, and the other cores wait. The old command had `--num-executors`, and the rewrite dropped it.',
        checks: [
          ['Look at the Executors tab', 'The count of executors against what you intended.'],
          ['Read the effective settings', 'The Environment tab, or the log line that you wrote at the start of the job.'],
          ['Fix it', 'Restore `--num-executors`, or enable dynamic allocation with `minExecutors` and `maxExecutors`.'],
          ['Guard', 'Keep the submit command in version control, and compare the effective settings with the expected ones at the start of the run.']
        ],
        tell: 'The job was slow because it ran on two executors: the rewritten command had no executor count and dynamic allocation was off, so YARN gave the default of two. I restored the setting, and added a check at the start of the job that logs the effective settings and fails if the executor count is far from the expected one.',
        prevent: ['Submit commands in version control', 'Log the effective settings', 'Dynamic allocation with a minimum and a maximum']
      }),

      B.quiz({
        id: 'm13-q1', t: 1,
        q: 'A flag says `--conf spark.sql.shuffle.partitions=50`, and the program calls `config("spark.sql.shuffle.partitions", "20")`. What does the program see?',
        opts: [{ t: '50', fb: 'The program\'s own setting is stronger than a flag.' }, { t: '20', fb: '' }, { t: '200', fb: 'That is the default.' }, { t: 'An error', fb: 'Both are valid.' }],
        ok: 1,
        why: 'The recording: ' + pre('--conf (50) and the program') + '. The order is the program, then flags, then the file, then the default.'
      }),

      B.quiz({
        id: 'm13-q2', t: 1,
        q: 'A properties file says 100 and `--conf` says 50. What does the program see?',
        opts: [{ t: '100', fb: 'The flag is stronger than the file.' }, { t: '50', fb: '' }, { t: '150', fb: 'Settings are not added up.' }, { t: '200', fb: 'The default does not win over a set value.' }],
        ok: 1,
        why: 'The recording: ' + pre('the properties file') + '.'
      }),

      B.quiz({
        id: 'm13-q3', t: 1,
        q: 'A nightly job must survive the closing of the terminal that started it. Which deploy mode?',
        opts: [{ t: 'client', fb: 'The driver would stop with your terminal.' }, { t: 'cluster', fb: '' }, { t: 'local', fb: 'That is not a deploy mode.' }, { t: 'either', fb: 'They differ here.' }],
        ok: 1,
        why: 'In cluster mode the driver runs on the cluster. Scheduled jobs run that way.'
      }),

      B.quiz({
        id: 'm13-q4', t: 2,
        q: 'An executor has 14 GB of heap and the default overhead (10 percent). About how much does the container ask from YARN?',
        opts: [{ t: '14 GB', fb: 'The overhead is added.' }, { t: 'About 15.4 GB', fb: '' }, { t: '28 GB', fb: 'No.' }, { t: '1.4 GB', fb: 'That is the overhead only.' }],
        ok: 1,
        why: '14 GB plus 10 percent is 15.4 GB. The container is the heap plus the overhead, and it must fit the cluster\'s largest container.'
      }),

      B.quiz({
        id: 'm13-q5', t: 2,
        q: 'Why does dynamic allocation need an external shuffle service or shuffle tracking?',
        opts: [{ t: 'Executors that leave would take their shuffle files with them', fb: '' }, { t: 'To make tasks faster', fb: 'It does not.' }, { t: 'Because of the driver memory', fb: 'No.' }, { t: 'It does not need either', fb: 'It does.' }],
        ok: 0,
        why: 'The shuffle files are on the local disks of the executors. If an executor is released, the next stage would lose them, unless something else keeps them or Spark tracks which executors still hold them.'
      }),

      B.order({
        id: 'm13-ord', t: 1, q: 'Put the steps of releasing a Spark job to production in order.',
        items: [
          'Write the logic as functions and test them with a local session',
          'Run a small end-to-end job on a sample',
          'Package the code and the dependencies',
          'Write the submit command with the master, the deploy mode, the resources and the settings',
          'Run in cluster mode with the event log on',
          'Read the stage table and adjust one setting at a time'
        ],
        why: 'Tests first, then packaging and the command. The first real run is for reading the stage table, and the changes come one at a time.'
      }),

      B.qa({
        id: 'qa-submit-run', t: 1, tag: 'Running Spark', secs: 75,
        q: 'What does spark-submit do, and what do you put in the command?',
        pts: ['Starts an application on any cluster manager', 'Master, deploy mode, resources, settings, code and files', 'Arguments after the app go to the program', 'Cluster mode for production', 'Event log on', 'Keep the master out of the code'],
        short: '`spark-submit` starts a Spark application on any cluster manager from the same program. The command carries the **master**, such as `yarn` or `k8s://...`, the **deploy mode**, the **resources** (executors, cores, memory, driver memory), the **settings** with `--conf`, and the code and files with `--py-files`, `--files` or `--packages`. Arguments after the application go to my program. For production I use **cluster mode**, so the driver runs next to the executors and survives my terminal, and I switch on the event log. I keep the master out of the code. And I checked on Spark 4.0.1 that every flag I use exists in `--help`.',
        fu: [['Where do the arguments go?', 'Those after the app file go to the program\'s `sys.argv`. The options before it go to Spark.'], ['How do you ship Python libraries?', '`--py-files` for pure code, `--archives` with a packed environment, or an image on Kubernetes.']],
        trap: 'Hard-coding `.master("local[*]")` in the program, so the cluster flag is ignored.',
        real: 'Write the command to run your job on YARN in cluster mode.'
      }),

      B.qa({
        id: 'qa-config-order', t: 1, tag: 'Running Spark', secs: 60,
        q: 'In what order does Spark apply configuration?',
        pts: ['Program (SparkConf, builder, spark.conf.set)', 'spark-submit flags (--conf and named flags)', 'spark-defaults.conf or --properties-file', 'Defaults of Spark', 'Recorded: 20 over 50 over 100 over 200', 'Log the effective settings'],
        short: 'From the strongest: settings **in the program**, then **flags of spark-submit**, then the **properties file**, then the **default**. I tested it with one small program on Spark 4.0.1: with nothing set it saw 200, with a flag of 50 it saw 50, with a file of 100 it saw 100, with both it saw 50, and with the flag at 50 and the program setting 20 it saw 20. A consequence is that a setting hard-coded in the program silently beats the command line. So I keep each setting in one place, I log the effective settings at the start of the job, and I look at the Environment tab when a number surprises me.',
        fu: [['Where do you set cluster-wide defaults?', 'In `spark-defaults.conf`.'], ['Can every setting change at run time?', 'No. SQL settings can change in a session with `spark.conf.set`. Memory, cores and the master are read at start-up.']],
        trap: 'Believing that the command line always wins.',
        real: 'The UI shows a different value from the one on your command line. What do you check?'
      }),

      B.qa({
        id: 'qa-sizing', t: 2, tag: 'Running Spark', secs: 90,
        q: 'How do you size a Spark application?',
        pts: ['4 to 5 cores per executor; about 4 GB per core', 'Container = heap + overhead, within the largest container', 'Total cores matched to partitions; waves', 'Driver 2 to 8 GB', 'Dynamic allocation with a min and a max', 'Run, read the stage table, change one thing'],
        short: 'I start from rules and then measure. About **four or five cores for each executor** and **about 4 GB for each core**, more for wide joins. The container asks for the heap plus the **overhead**, 10 percent by default and more for PySpark with pandas UDFs, and that must fit the largest container of the cluster. I match the total cores to the partitions: 2,000 tasks on 80 cores is 25 waves, which is fine if the tasks are short. The driver gets 2 to 8 GB. For jobs with uneven stages I enable **dynamic allocation** with a minimum and a maximum, with a shuffle service or shuffle tracking. Then I run, read the stage table for spill, skew and idle cores, and change one number at a time.',
        fu: [['Why not one core for each executor?', 'Too many JVMs, too much overhead, and broadcasts copied to each.'], ['Why not one huge executor?', 'Long garbage collection pauses, one storage connection, one failure loses all.']],
        trap: 'Giving the biggest numbers allowed.',
        real: 'The job spills and uses 30 percent of its cores. What do you change?'
      }),

      B.recap({
        id: 'm13-recap', n: 13, badge: 'Submitter', color: '#C7D2FE',
        pts: [
          '`spark-submit` carries the **master**, the **deploy mode**, the **resources**, the **settings** and the code. The program is the same on every manager.',
          'All **' + FL.rows.length + '** flags of this course exist in the help of Spark ' + VER.spark + '. Cluster mode is for production, client mode for a shell.',
          'The order, recorded: the **program** (' + pre('--conf (50) and the program') + ') beats the **flag** (' + pre('--conf spark.sql.shuffle.partitions=50') + '), the flag beats the **file** (' + pre('a properties file') + '), the file beats the **default** (' + pre('nothing set') + ').',
          'A container is **heap plus overhead**. Start with 4 to 5 cores and about 4 GB a core, then read the stage table.',
          '**Dynamic allocation** adds and releases executors. It needs a shuffle service or shuffle tracking. Retries: **' + RETRY.maxFailures_default_on_a_cluster + '** on a cluster, **' + RETRY.maxFailures_default_in_local_mode + '** in local mode.',
          'YARN, Kubernetes and the managed platforms are **from documentation**: not run here.'
        ],
        lines: [
          'I keep the master out of the code.',
          'I put each setting in one place and log it.',
          'I read the stage table before I change a number.'
        ]
      })
    ]
  });
})();
