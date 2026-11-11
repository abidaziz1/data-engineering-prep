/* Mission 14: debugging and operations. The method, the event log that the Spark UI is drawn from (read for real), the stage table, six runs to diagnose, the failures that really
   happen with their real messages, a corrupt file that is skipped without a word, and a task that fails once and is retried. Everything recorded was read from a real Spark 4.0.1. */
(function () {
  var B = LAB.b, G = LAB.get;
  var ET = G.table('eventlog.types'), TE = G.text('eventlog.task_end'), EL = G.counts('eventlog.layout'), ER = G.table('errors.messages'), CO = G.counts('errors.corrupt'), RT = G.counts('errors.retry');
  var SK = G.table('skew.aggregations'), SH = G.table('parts.shuffle'), SP = G.counts('mem.spill');
  var PY = G.file('code/session.py');
  var STG = G.lines(PY, G.at(PY, /^def stages/), G.at(PY, /return rows/));
  var EVC = G.file('code/errors.py');
  var CORR = G.lines(EVC, G.at(EVC, /^def corrupt_file/), G.at(EVC, /return res/));
  var FLAKY = G.lines(EVC, G.at(EVC, /^def flaky_task/), G.at(EVC, /return \[pick\(e, 'RuntimeError: '\)\]/));
  var n0 = function (x) { return Number(x).toLocaleString('en-US'); };
  var typeCount = function (k) { var r = ET.rows.filter(function (x) { return x[0] === k; })[0]; if (!r) throw new Error('no event type ' + k); return r[1]; };
  var msg = function (start) { var r = ER.rows.filter(function (x) { return x[0].indexOf(start) === 0; })[0]; if (!r) throw new Error('no error ' + start); return r[1]; };
  var JSONV = JSON.parse(TE);
  G.expect(typeCount('SparkListenerTaskEnd') === typeCount('SparkListenerTaskStart') && typeCount('SparkListenerJobStart') >= 1, 'every task that started also ended');
  G.expect(JSONV['Task Metrics']['Input Metrics']['Records Read'] > 0 && JSONV['Task Metrics']['Memory Bytes Spilled'] === 0, 'the task end event of the recording');
  G.expect(/UNRESOLVED_COLUMN/.test(msg('a column that does not exist')) && /maxResultSize/.test(msg('collect()')) && /ZeroDivisionError/.test(msg('a Python UDF')) && /FAILED_READ_FILE/.test(msg('two files')), 'the four error messages');
  G.expect(CO['ignoreCorruptFiles=true'] === 1000 && /FAILED_READ_FILE/.test(CO['default']), 'a corrupt file fails the read, and is skipped when it is ignored');
  G.expect(RT.master_local_2_4_error === null && RT.task_attempts_with_local_2_4.length === 2 && RT.task_attempts_with_local_2_4[0].failed === true && RT.task_attempts_with_local_2_4[1].failed === false, 'a task that fails once is retried when failures are allowed');
  var attempts = RT.task_attempts_with_local_2_4;

  LAB.addChapter({
    id: 'm14', n: 14, title: 'Debugging and operations', short: 'Debug', blurb: 'The method, the event log, the stage table, real failures and their real messages', minutes: 58,
    focus: ['mon', 'qual'],
    goals: [
      'Follow a **method**: symptom, where to look, cause, one change, the same measure again.',
      'Say what the **event log** is, read one, and rebuild a **stage table** from it.',
      'Name the **six causes** of most slow Spark runs from their numbers: skew, tiny tasks, spill, small files, no pruning, a cache that works.',
      'Recognise the **messages** of the failures that really happen, and their first fix.',
      'Explain why `ignoreCorruptFiles` can lose data without a word.',
      'Explain **task retries**, and why a test in local mode fails where a cluster would carry on.'
    ],
    say: 'Mission 14 is the last skill: finding out what is wrong. Everything in this mission is something that I read from a real run. I opened the event log, the file that the Spark UI is drawn from, and I rebuilt the stage table from it with twenty lines of Python. Then I made Spark fail in four ways and kept the messages. The method is simple, and the skill is looking at numbers instead of guessing.',
    scenes: [
      B.talk({
        id: 'm14-method', t: 1, src: 'docs', title: 'The method: look before you change',
        say: 'Most Spark tuning stories go wrong because someone changed a setting before looking. Press Next for the five steps.',
        items: [
          ['1. Name the symptom', '"Slow" is not a symptom. **Which stage** is slow, and since when? Failed with which message? Wrong in which number? Write it down.', 'Be specific.'],
          ['2. Find it in the UI or the log', 'The **Jobs** and **Stages** tabs show which stage is long. The task summary shows the minimum, median and maximum of the tasks. The **SQL** tab shows the plan with the rows of each operator. The **Executors** tab shows GC time and lost executors.', 'Which stage, which task.'],
          ['3. Name the cause from the numbers', 'Maximum far above the median: skew. Thousands of tiny tasks: too many partitions. Spill columns not zero: tasks too big. Read all files for a filter: no pruning. Mission 14 has a lab for this.', 'Numbers, not hunches.'],
          ['4. Change one thing', 'One setting, one line of code, one layout. Two changes at once teach you nothing.', 'One change.'],
          ['5. Measure the same thing again', 'The same stage table, on the same data. The maximum fell, the spill is gone, the files are fewer. Then write down what you did, for the next night.', 'Same measure, then a note.']
        ],
        cols: 1,
        call: { k: 'tip', h: 'Write the runbook:', t: 'the second time someone meets the same symptom, it should take five minutes, not five hours.' }
      }),

      B.cmp({
        id: 'm14-ui', t: 1, src: 'docs', title: 'The tabs of the Spark UI',
        say: 'The Spark UI is drawn from the event log, and it has the same tabs live and in the history server. I did not open the UI here, since the recordings had it off. This is from the documentation. Press Next.',
        cols: ['Tab', 'What it shows', 'You open it to'],
        hl: 2,
        rows: [
          ['Jobs', 'Every job, its stages and the time', 'See which job or stage took the time'],
          ['Stages', 'The tasks of a stage with min, median, max; shuffle read and write; spill', 'Find skew, spill and tiny tasks'],
          ['Storage', 'Cached DataFrames: size in memory and on disk', 'See what the cache really holds'],
          ['Environment', 'Every setting the application ran with', 'Check which value won'],
          ['Executors', 'Memory, GC time, tasks and shuffle for each executor', 'Find one busy executor or a lost one'],
          ['SQL / DataFrame', 'The plan of each query with the rows of each operator', 'See the join type, the scan filters, the exchanges'],
          ['Structured Streaming', 'Rate in and out, batch duration, state size for each query', 'Watch a stream fall behind']
        ],
        steps: [
          { upto: 3, say: 'Jobs, Stages and Storage are the first three. Stages is where you spend most of your time.' },
          { upto: 5, say: 'Environment answers "what setting was it really?", and Executors answers "which machine?".' },
          { upto: 7, say: 'The SQL tab explains what a query did, and the Streaming tab shows whether a stream keeps up.' }
        ],
        pick: 'If a job is gone and the UI with it, the **event log** and a history server bring the same pages back. That is why the event log is always on for production jobs.'
      }),

      B.flow({
        id: 'm14-flow', t: 1, src: 'docs', title: 'Where to look when a job is slow or fails', g: 'debug', legend: true,
        steps: [
          { say: 'This is the path of a diagnosis. Press Next to walk it.', cap: 'A diagnosis, step by step.' },
          { say: 'Step 1. A **symptom**: slow, failed or wrong. Say which, and when it started.', on: ['b1'], focus: ['g_sym', 'g_jobs'], tags: ['tg_evlog'], cap: 'Name the symptom.' },
          { say: 'Step 2. The **Jobs and Stages** tabs show which stage is long. Open that stage.', on: ['b2'], focus: ['g_jobs', 'g_task'], cap: 'Find the long stage.' },
          { say: 'Step 3. The **task table** of the stage shows the maximum against the median, the shuffle read, and the spill.', on: ['b3'], focus: ['g_task', 'g_sql'], cap: 'Compare the maximum with the median.' },
          { say: 'Step 4. The **SQL tab** tells you which operator and how many rows: the join, the scan, the exchange. Together with the task table it names the cause.', on: ['b4'], focus: ['g_sql', 'g_cause'], cap: 'Name the cause.' },
          { say: 'Step 5. **One change**: a setting, a line of code or a layout. Not three.', on: ['b5'], focus: ['g_cause', 'g_fix'], cap: 'Make one change.' },
          { say: 'Step 6. **Run it again** and read the same numbers. If the maximum did not fall, the cause was another one.', on: ['b6'], focus: ['g_fix', 'g_again'], cap: 'Measure again.' },
          { say: 'Step 7. **Write it down.** A runbook entry with the symptom, the numbers and the fix.', on: ['b7'], focus: ['g_again', 'g_note'], cap: 'Write the runbook.' }
        ]
      }),

      B.rows({
        id: 'm14-evlog', t: 1, src: 'rec', title: 'The event log: what is in the file behind the UI',
        steps: [
          {
            say: 'I ran one small query, a group by on the paid orders, with the event log on, and then counted the kinds of line in it. Each line of the file is one JSON object. Press Next.',
            tabs: [{ layer: 'RECORDED', name: 'Lines of the event log', c: 'raw', cols: ET.cols, rows: ET.rows, trk: 0 }],
            notes: ['Recorded: the event log of one query, with the lines counted by kind. Counts come from this query on two cores.']
          },
          {
            say: 'The application and the settings come first: one `ApplicationStart` and one `EnvironmentUpdate`, which holds **every setting** that the application ran with. This is what the Environment tab shows.',
            tabs: [{ layer: 'RECORDED', name: 'Lines of the event log', c: 'raw', cols: ET.cols, rows: ET.rows, trk: 1, chg: [[0, 1], [1, 1]] }],
            notes: ['A setting that surprised you is in this line.']
          },
          {
            say: 'Then the work: **' + typeCount('SparkListenerJobStart') + '** jobs, **' + typeCount('SparkListenerStageSubmitted') + '** stages and **' + typeCount('SparkListenerTaskEnd') + '** task ends. Every task that started also ended: ' + typeCount('SparkListenerTaskStart') + ' starts and ' + typeCount('SparkListenerTaskEnd') + ' ends. A query that has more starts than ends is still running, or crashed.',
            tabs: [{ layer: 'RECORDED', name: 'Lines of the event log', c: 'raw', cols: ET.cols, rows: ET.rows, trk: 3, chg: [[3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1]] }],
            notes: ['Three jobs for one query: adaptive execution runs a job for each shuffle stage, as mission 2 showed.']
          },
          {
            say: 'The SQL execution lines carry the **plan** of the query. The Spark UI draws its SQL tab from them. And the folder is called `' + EL.files[0].split('/')[0] + '`, with `' + EL.files.map(function (f) { return f.split('/')[1]; }).join('` and `') + '` inside. To switch it on, set `' + EL.spark_conf_to_turn_it_on.join('` and `') + '`.',
            tabs: [{ layer: 'RECORDED', name: 'Where the log is', c: 'raw', cols: ['file', 'what it is'], rows: EL.files.map(function (f) { return [f, /appstatus/.test(f) ? 'a marker that says whether the application is finished' : 'the events, as JSON lines']; }), trk: 1 }],
            notes: ['Spark 4 writes a rolling event log: a folder with `events_N_...` files. The name of the application is replaced by APP here.']
          }
        ]
      }),

      B.code({
        id: 'm14-taskend', t: 1, src: 'rec', title: 'One line of the log: a task has ended', file: 'SparkListenerTaskEnd.json', lang: 'json', code: TE,
        steps: [
          { say: 'This is one `SparkListenerTaskEnd` event of that query, with the fields that matter. The numbers that differ on every run are shown as "varies". Press Next.', lines: null },
          { say: 'Which kind of task, and how it ended. A `ShuffleMapTask` writes shuffle files for the next stage. The reason is `Success`. A failed task carries the error here instead.', lines: G.span(TE, /"Task Type"/, /"Reason"/) },
          { say: '`Task Info`: the index of the task in its stage, the attempt number (0 is the first try), the executor, and the data locality. `Failed` is false.', lines: G.span(TE, /"Task Info"/, /"Failed"/) },
          { say: '`Executor Run Time` and `JVM GC Time`: the time the task ran, and the part of it that the JVM spent in garbage collection. If GC is a large share of the run time, the executor is short of memory.', lines: G.span(TE, /"Executor Run Time"/, /"JVM GC Time"/) },
          { say: '`Memory Bytes Spilled` and `Disk Bytes Spilled`: **' + JSONV['Task Metrics']['Memory Bytes Spilled'] + '** here. This task spilled nothing. In the forced spill of mission 6 these were millions.', lines: G.span(TE, /"Memory Bytes Spilled"/, /"Disk Bytes Spilled"/) },
          { say: '`Input Metrics`: the bytes and the **' + n0(JSONV['Task Metrics']['Input Metrics']['Records Read']) + ' records** this task read. `Shuffle Write Metrics`: the **' + JSONV['Task Metrics']['Shuffle Write Metrics']['Shuffle Records Written'] + ' records** it wrote for the next stage. Twelve rows, one for each store: the partial aggregation of mission 3.', lines: G.span(TE, /"Input Metrics"/, /"Shuffle Records Written"/) }
        ],
        note: 'Recorded. Run time, GC time and byte counts change from run to run, so I show them as "varies". The record counts and the zero spill are the same every time.'
      }),

      B.code({
        id: 'm14-reader', t: 2, src: 'rec', title: 'A stage table in twenty lines of Python', file: 'session.py', lang: 'python', code: STG,
        steps: [
          { say: 'Every stage table in this course was built by this function, from the event log. Nothing is read from a screen or timed. Press Next.', lines: null },
          { say: 'It reads the events. A `StageSubmitted` event gives the name of the stage. A `TaskEnd` event that did not fail gives the metrics of one task: the input, the shuffle read, the shuffle write, and the spill.', lines: G.span(STG, /for e in events/, /'spill_mem'/) },
          { say: 'The tasks are grouped by stage and attempt. For each stage it computes the **minimum, median, maximum and sum** of each metric.', lines: G.span(STG, /for \(sid, att\), ts in sorted/, /return \{'min'/) },
          { say: 'And builds one row for each stage: the stage id, its name, the number of tasks, and the aggregates. This is the table behind the task summary of the Stages tab.', lines: G.span(STG, /rows\.append/, /spilled_disk/) }
        ],
        note: 'Recorded: the same code produced every stage table of missions 3, 5 and 6. You can write your own in an hour, from the JSON lines.'
      }),

      B.widget({ id: 'm14-lab', kind: 'diagnose', t: 1, src: 'rec', title: 'Lab: name the cause from the numbers' }),

      B.rows({
        id: 'm14-errors', t: 1, src: 'rec', title: 'Four real failures and their real messages',
        steps: [
          {
            say: 'I made Spark fail four ways that happen in production, and kept the first line of each message. Press Next.',
            tabs: [{ layer: 'RECORDED', name: 'First lines of four failures', c: 'raw', cols: ER.cols, rows: ER.rows.map(function (r) { return [r[0], r[1].slice(0, 120) + (r[1].length > 120 ? '...' : '')]; }), trk: 0 }],
            notes: ['Recorded: the first useful line of the error, with file names and sizes replaced. The full lines are on the next screens.']
          },
          {
            say: '**A column that does not exist.** ' + msg('a column that does not exist').slice(0, 210) + ' The analyzer caught it before any data was read, and **suggested** the right names. Fix: use the name it suggests.',
            tabs: [{ layer: 'RECORDED', name: 'First lines of four failures', c: 'raw', cols: ER.cols, rows: ER.rows.map(function (r) { return [r[0], r[1].slice(0, 120) + (r[1].length > 120 ? '...' : '')]; }), trk: 0, chg: [[0, 1]] }],
            notes: ['The error class `UNRESOLVED_COLUMN` and the SQLSTATE are stable; a script can catch them.']
          },
          {
            say: '**A collect that is too big.** ' + msg('collect()') + '. Spark stopped the job before the driver could run out of memory. The default limit is 1 GiB; I lowered it to 1 MiB to trigger it. Fix: do not collect. Write the result to files, or reduce it first.',
            tabs: [{ layer: 'RECORDED', name: 'First lines of four failures', c: 'raw', cols: ER.cols, rows: ER.rows.map(function (r) { return [r[0], r[1].slice(0, 120) + (r[1].length > 120 ? '...' : '')]; }), trk: 1, chg: [[1, 1]] }],
            notes: ['Raising `spark.driver.maxResultSize` to 0 (unlimited) removes the guard and moves the failure to an out-of-memory error of the driver.']
          },
          {
            say: '**A Python error in a UDF.** ' + msg('a Python UDF') + '. The real Python exception arrives wrapped in Spark messages, so look for the Python line in the stack. Fix: handle the input in the function. The row with 0 caused it.',
            tabs: [{ layer: 'RECORDED', name: 'First lines of four failures', c: 'raw', cols: ER.cols, rows: ER.rows.map(function (r) { return [r[0], r[1].slice(0, 120) + (r[1].length > 120 ? '...' : '')]; }), trk: 2, chg: [[2, 1]] }],
            notes: ['The message of a UDF failure is far down the log. Search the driver log for `Traceback`.']
          },
          {
            say: '**Two files that disagree on a type.** ' + msg('two files').slice(0, 260) + ' One file wrote `order_id` as a number, another as text. The read failed on the second one. Fix: make the writers agree, or read with an explicit schema and cast.',
            tabs: [{ layer: 'RECORDED', name: 'First lines of four failures', c: 'raw', cols: ER.cols, rows: ER.rows.map(function (r) { return [r[0], r[1].slice(0, 120) + (r[1].length > 120 ? '...' : '')]; }), trk: 3, chg: [[3, 1]] }],
            notes: ['This is the same trouble as the schema change of mission 7. A table format would have refused the bad write when it was made.']
          }
        ]
      }),

      B.code({
        id: 'm14-corrupt', t: 1, src: 'rec', title: 'A corrupt file, and a setting that hides it', file: 'errors.py', lang: 'python', code: CORR,
        steps: [
          { say: 'One folder of 1,000 good rows in two files, and a third file that is not Parquet at all. Press Next.', lines: null },
          { say: 'The folder is written with two good files. Then a file named `part-99999-garbage.snappy.parquet` is added, with the bytes of a sentence in it.', lines: G.span(CORR, /createDataFrame/, /f\.write\(b'this is not/) },
          { say: 'By default the read **fails**. The message is `' + CO['default'].slice(0, 100) + '...` Short, and it names the file.', lines: G.span(CORR, /res = \{\}/, /res\['default'\]/) },
          { say: 'With `spark.sql.files.ignoreCorruptFiles` set to true, the read **succeeds** and counts **' + n0(CO['ignoreCorruptFiles=true']) + '** rows: Spark skipped the bad file without a word.', lines: G.span(CORR, /ignoreCorruptFiles/) }
        ],
        note: 'Recorded. Here the skipped file held no real data, so the count is right. In real life the "corrupt" file might hold a day of orders.'
      }),

      B.code({
        id: 'm14-flaky', t: 2, src: 'rec', title: 'A task that fails once', file: 'errors.py', lang: 'python', code: FLAKY,
        steps: [
          { say: 'How does Spark treat a task that fails? I wrote a function that fails on its first call and works on the second. Press Next.', lines: null },
          { say: 'The function `flaky` looks for a marker file. If there is none, it creates it and raises an error. The next call finds the marker and works. So the first attempt of the task fails and the second succeeds.', lines: G.span(FLAKY, /def flaky/, /return x/) },
          { say: 'It runs as a UDF on a DataFrame of 100 rows in one partition, so there is exactly one task.', lines: G.span(FLAKY, /f = udf/, /collect/) }
        ],
        note: 'Recorded in two sessions: `local[2]`, and `local[2,4]`, which allows four failures of a task.'
      }),

      B.rows({
        id: 'm14-retry', t: 1, src: 'rec', title: 'Retries: local mode and a cluster differ',
        steps: [
          {
            say: 'The same job in two sessions. Press Next.',
            tabs: [{ layer: 'RECORDED', name: 'A task that fails once', c: 'raw', cols: ['session', 'task failures allowed', 'what happened'], rows: [['local[2]', RT.maxFailures_default_in_local_mode, 'the job failed: ' + RT.master_local_2_first_attempt_error[0]], ['local[2,4]', RT.maxFailures_default_on_a_cluster, RT.master_local_2_4_error === null ? 'the job succeeded' : 'failed']], trk: 0 }],
            notes: ['Recorded: `spark.task.maxFailures` is 1 in local mode and 4 on a cluster by default; `local[N,F]` sets it.']
          },
          {
            say: 'In plain `local[2]` the first failure **ends the job**: ' + RT.master_local_2_first_attempt_error[0] + '. On a cluster, with four tries, the same task would have been run again.',
            tabs: [{ layer: 'RECORDED', name: 'A task that fails once', c: 'raw', cols: ['session', 'task failures allowed', 'what happened'], rows: [['local[2]', RT.maxFailures_default_in_local_mode, 'the job failed: ' + RT.master_local_2_first_attempt_error[0]], ['local[2,4]', RT.maxFailures_default_on_a_cluster, RT.master_local_2_4_error === null ? 'the job succeeded' : 'failed']], trk: 0, chg: [[0, 2]] }],
            notes: ['So a test in local mode can fail for a flaky reason that a cluster would hide. And a flaky task on a cluster passes and costs time.']
          },
          {
            say: 'With `local[2,4]`, the event log shows **' + attempts.length + '** attempts of the task: attempt **' + attempts[0].attempt + '** failed (`' + attempts[0].reason + '`) and attempt **' + attempts[1].attempt + '** succeeded (`' + attempts[1].reason + '`). The job succeeded, with no error at all in the result.',
            tabs: [{ layer: 'RECORDED', name: 'Task attempts in the event log', c: 'raw', cols: ['attempt', 'failed', 'end reason'], rows: attempts.map(function (a) { return [a.attempt, String(a.failed), a.reason]; }), trk: 1, chg: [[0, 1], [1, 1]] }],
            notes: ['A job that succeeded after retries still has failed tasks in its log. A rising count of failed attempts is an early warning: look at the Stages tab for "failed" before the day it fails four times.']
          }
        ]
      }),

      B.cmp({
        id: 'm14-runbook', t: 1, src: 'docs', title: 'A runbook: symptom, cause, first fix',
        say: 'This is the table to keep. Every row is something that an earlier mission recorded or explained. Press Next.',
        cols: ['Symptom', 'Likely cause', 'Where to look', 'First fix'],
        hl: 3,
        rows: [
          ['A few tasks run for much longer than the rest', 'Skew', 'Stage table: max against median', 'Adaptive skew join, salt, or take out the hot key (mission 5)'],
          ['Thousands of tasks, each with no records', 'Too many shuffle partitions', 'Stage table: median records is 0', 'Let adaptive execution merge, or lower the setting (mission 3)'],
          ['"Spill (Disk)" is not zero', 'Tasks hold too much for their memory', 'Stage table: spill columns', 'More partitions, fewer cores per executor (mission 6)'],
          ['Job writes thousands of tiny files', 'Many tasks into many folders', 'The output folder: files and sizes', 'Repartition by the folder column (mission 7)'],
          ['A filter reads every file', 'No pruning or pushdown', 'SQL tab: PartitionFilters, PushedFilters', 'Filter the partition column; sort inside files (mission 7)'],
          ['The driver dies', 'collect, toPandas or a huge broadcast', 'Driver log: OutOfMemoryError', 'Reduce before you collect (missions 2, 4, 9)'],
          ['"Container killed ... memoryOverhead"', 'Memory outside the heap', 'YARN or pod message', 'Raise the overhead (mission 6)'],
          ['Job succeeded, numbers are wrong', 'Join multiplied rows, a NULL, a filter', 'Row counts before and after each step', 'Test the rule; reconcile (missions 4, 8, 12)']
        ],
        steps: [
          { upto: 3, say: 'The first three are the signs in the stage table: skew, tiny tasks and spill.' },
          { upto: 5, say: 'Files and pruning show in the output folder and in the scan of the plan.' },
          { upto: 8, say: 'Memory failures show in the messages. And a wrong number shows only if you count.' }
        ],
        pick: 'Keep this table in your team\'s wiki and **add a row** each time a night goes wrong. Next time it takes five minutes.'
      }),

      B.talk({
        id: 'm14-logs', t: 1, src: 'docs', title: 'Logs: where to read them',
        say: 'The UI is not the only place. Press Next for the logs.',
        items: [
          ['The driver log', 'Everything your program prints, and the Spark messages of the driver: plan errors, failed jobs, the final exception. In client mode it is your terminal. In cluster mode it is on the cluster.', 'Start here for errors.'],
          ['Executor logs', 'Each executor has `stdout` and `stderr`. A UDF `print` goes to `stdout` of the executor. On YARN: `yarn logs -applicationId <id>`. On Kubernetes: `kubectl logs <pod>`. The UI links to them from the Executors tab.', 'The task side.'],
          ['The event log', 'The record of jobs, stages and tasks. Not a log of messages. It feeds the UI and the history server, and a script like the one in this mission.', 'The structured record.'],
          ['Log levels', '`spark.sparkContext.setLogLevel("WARN")` quietens the console. The recordings used `OFF` to keep error output clean. In production use `WARN`, and raise a level only for a short investigation.', 'WARN in production.'],
          ['Your own messages', 'Log at the start: the effective settings, the input paths, the day. Log at the end: row counts in and out. When the job fails you need to know what it was doing.', 'Log the facts of the run.']
        ],
        cols: 1
      }),

      B.talk({
        id: 'm14-monitor', t: 2, src: 'docs', title: 'What to watch in production',
        say: 'Debugging after a failure is the second best thing. The best is an alert before it. Press Next for what to measure.',
        items: [
          ['Per run', 'Duration, rows in and out, bytes shuffled, bytes spilled, failed task attempts, and the cost in core-hours. A run that differs a lot from the last ten deserves a look.', 'Compare with the last runs.'],
          ['The stage ratio', 'The maximum task against the median, for the longest stages. An alert at ten times catches skew as it grows.', 'Max against median.'],
          ['Streams', 'Input rate against processed rate, the duration of a batch, and the state size. A stream whose batches take longer than its trigger is falling behind.', 'Does it keep up?'],
          ['Data', 'Row counts against the usual, the share of NULLs, the freshness of the output. Mission 12 lists the checks.', 'Checks as metrics.'],
          ['Cost', 'Cores times hours, by job. An executor count that stays high while the cluster is idle is money. Dynamic allocation and autoscaling help.', 'Idle machines cost money.']
        ],
        cols: 1,
        call: { k: 'tip', h: 'Start small:', t: 'write the numbers of each run into one table (job, day, duration, rows in, rows out, spill, failures). A chart of that table finds most problems.' }
      }),

      B.talk({
        id: 'm14-gc', t: 3, src: 'docs', title: 'Extra: garbage collection in the numbers',
        say: 'One column of the task summary tells you about memory pressure. Press Next.',
        items: [
          ['GC time against run time', 'In the task table, `JVM GC Time` is the part of the run time spent in garbage collection. A small share is normal. A share that grows toward a quarter of the run time means the heap is under pressure: too many objects, too little memory for each core, or a collect-like operation.', 'A large GC share means a tight heap.'],
          ['What to try', 'More partitions, so each task holds less. Fewer cores for each executor, so each gets more heap. Fewer Python objects (use built-in functions). And only then more memory.', 'Smaller tasks first.']
        ],
        cols: 1,
        call: { k: 'warn', h: 'No number here is a law:', t: 'the share that matters depends on the job. Compare with the same job last week.' }
      }),

      B.decide({
        id: 'm14-dec', t: 2, src: 'docs', title: 'Decision: what to change first',
        scenario: 'A Brewline job got three times slower after the data grew. The longest stage shows a median task of 18,000 records and a maximum of 163,000. "Spill (Disk)" is 12 GB on that stage and zero elsewhere. The cluster is quiet. You can raise executor memory, raise the number of shuffle partitions, or fix the hot key.',
        opts: [
          { t: 'Double the executor memory first', d: 'The spill goes away and the job passes.', lose: 'The cause is one task that is nine times the median. More memory hides it, costs more on every run, and a bigger key will spill again.' },
          { t: 'Find the hot key and handle it: adaptive skew join if it is a join, a salt or a separate path if it is a window or aggregation', d: 'It removes the cause: one task with a third of the data.', lose: '' },
          { t: 'Raise the shuffle partitions to 10,000', d: 'More tasks, smaller tasks.', lose: 'The hot key still goes to one task, whatever the number of partitions. The other tasks only get smaller.' }
        ],
        pick: 1,
        why: 'A maximum nine times the median, with spill on that stage only, is skew. The numbers name the cause. Fix the cause with one change, and measure the maximum again.',
        when: 'If the maximum were close to the median and the spill still large, then every task is too big, and more partitions or memory would be the fix.'
      }),

      B.bug({
        id: 'm14-bug', t: 1, q: 'A nightly read fails on one broken file, so a teammate sets this. The job now passes, and the totals are lower than finance expects. Click the line that causes it.',
        file: 'nightly.py', lang: 'python',
        code: ['spark.conf.set("spark.sql.files.ignoreCorruptFiles", "true")', 'orders = spark.read.parquet("/lake/orders/2026-11-05")', 'print(orders.count())'].join('\n'),
        bad: [1],
        hint: 'What happens to the rows of a file that Spark skips?',
        why: 'The setting makes Spark **skip** any file it cannot read, with no error and no count of what it skipped. In the recording the read of a folder with one bad file went from a failure to **' + n0(CO['ignoreCorruptFiles=true']) + '** rows with no message. If the bad file held a day of orders, they are simply missing. Find out why the file is broken, fix or replace it, and keep the failure.',
        fix: ['orders = spark.read.parquet("/lake/orders/2026-11-05")', 'print(orders.count())   # let a corrupt file fail the job, and fix the file'].join('\n'),
        cheer: 'A failure that you can see is better than a silent loss.'
      }),

      B.incident({
        id: 'm14-inc', t: 1, src: 'rec', title: 'Incident: the report job fails with maxResultSize', time: '02:30',
        alert: '**The weekly report job fails after 4 minutes with "Total size of serialized results of N tasks (N MiB) is bigger than spark.driver.maxResultSize".** It worked last month. The report code ends with `rows = df.collect()` followed by a loop that writes a file.',
        clues: ['The job collects a DataFrame to build a CSV in the driver', 'The data has grown tenfold this month', 'A colleague suggests setting maxResultSize to 0'],
        opts: [
          { t: 'Do not collect: write the report from the executors with `df.write.csv`, or aggregate first so that the result is small', fb: '' },
          { t: 'Set `spark.driver.maxResultSize` to 0, which is unlimited', fb: 'It removes the guard. The next failure is the driver running out of memory, which is harder to read.' },
          { t: 'Retry until it works', fb: 'The result is too big every time.' },
          { t: 'Add executors', fb: 'The executors are not the limit. The driver is.' }
        ],
        best: 0,
        why: '`collect()` sends every row to the one driver. The message is the guard doing its job: ' + msg('collect()') + '. The recording lowered the limit to 1 MiB to trigger it. Writing from the executors needs no driver memory at all.',
        checks: [
          ['Read the message', 'It names the setting and the size: the result is bigger than the limit.'],
          ['Find the collect', 'Search the code for `collect()` and `toPandas()`.'],
          ['Fix it', 'Write files with `df.write`, or aggregate to a small result before you bring it back.'],
          ['Guard', 'Review every collect: how many rows at the biggest day?']
        ],
        tell: 'The report collected the whole DataFrame to the driver, and the data had grown ten times, so it passed the result size limit. Raising the limit would only have moved the failure. I changed the job to write the file from the executors.',
        prevent: ['Keep maxResultSize at its default', 'Write from the executors', 'Review every collect']
      }),

      B.quiz({
        id: 'm14-q1', t: 1,
        q: 'In the Stages tab, the median task read 20 MB and the maximum task read 4 GB. What is the first thing to suspect?',
        opts: [{ t: 'A slow disk', fb: 'It would slow all tasks.' }, { t: 'Skew: one key holds far more data', fb: '' }, { t: 'Too many executors', fb: 'It does not make one task bigger.' }, { t: 'A bug in the UI', fb: 'The UI is drawn from the log.' }],
        ok: 1,
        why: 'A maximum 200 times the median is skew. Find the key. The lab and mission 5 show how.'
      }),

      B.quiz({
        id: 'm14-q2', t: 1,
        q: 'What is the Spark event log?',
        opts: [{ t: 'The printed output of your program', fb: 'That is the driver log.' }, { t: 'A file of JSON lines about jobs, stages and tasks, from which the Spark UI is drawn', fb: '' }, { t: 'A cache of query results', fb: 'No.' }, { t: 'The checkpoint of a stream', fb: 'No.' }],
        ok: 1,
        why: 'The recording counted ' + typeCount('SparkListenerTaskEnd') + ' task-end lines for one small query. The history server reads the same file.'
      }),

      B.quiz({
        id: 'm14-q3', t: 1,
        q: 'A read of a folder fails on one non-Parquet file. A teammate sets `ignoreCorruptFiles` to true and the job passes. What is the risk?',
        opts: [{ t: 'None, it is a safe setting', fb: 'It hides the data of every skipped file.' }, { t: 'Rows of the skipped files are missing, with no error', fb: '' }, { t: 'The job becomes slower', fb: 'Not the point.' }, { t: 'The setting is not allowed in Spark 4', fb: 'It exists.' }],
        ok: 1,
        why: 'The recording: the default read failed. With the setting it counted ' + n0(CO['ignoreCorruptFiles=true']) + ' rows, without a word about the file.'
      }),

      B.quiz({
        id: 'm14-q4', t: 2,
        q: 'On a cluster a task fails once and succeeds on the second try. What does the job report?',
        opts: [{ t: 'A failure', fb: 'With four tries allowed, it succeeds.' }, { t: 'Success, with one failed task attempt in the log', fb: '' }, { t: 'A warning to the user', fb: 'The result carries none.' }, { t: 'Nothing is recorded', fb: 'The log records every attempt.' }],
        ok: 1,
        why: 'The recording: attempt ' + attempts[0].attempt + ' was `' + attempts[0].reason + '` and attempt ' + attempts[1].attempt + ' was `' + attempts[1].reason + '`.'
      }),

      B.quiz({
        id: 'm14-q5', t: 2,
        q: 'Which first line of a message sends you to the driver code, not the executors?',
        opts: [{ t: 'ZeroDivisionError in a UDF', fb: 'That is the Python worker on an executor.' }, { t: 'Total size of serialized results ... is bigger than spark.driver.maxResultSize', fb: '' }, { t: 'FAILED_READ_FILE.PARQUET_COLUMN_DATA_TYPE_MISMATCH', fb: 'That happens on the executors while reading.' }, { t: 'Container killed for exceeding memory limits', fb: 'That is an executor container.' }],
        ok: 1,
        why: 'The result of a `collect` goes to the driver, so the limit and the fix are there.'
      }),

      B.order({
        id: 'm14-ord', t: 1, q: 'Put the steps of a diagnosis in order.',
        items: [
          'Name the symptom and when it started',
          'Open the longest stage and read the task summary',
          'Name the cause from the numbers',
          'Make one change',
          'Run again and read the same numbers',
          'Write the runbook entry'
        ],
        why: 'The numbers come before the change, and the same numbers prove it. The note makes the next night easy.'
      }),

      B.qa({
        id: 'qa-slowjob', t: 1, tag: 'Debugging', secs: 90,
        q: 'A Spark job is slow. How do you find out why?',
        pts: ['Which stage? Jobs and Stages tabs', 'Task summary: max against median, shuffle read, spill', 'SQL tab: join type, scan filters, exchanges', 'Name the cause: skew, tiny tasks, spill, small files, no pruning', 'One change, then the same measure', 'Write it down'],
        short: 'I start with **which stage** is slow, in the Jobs and Stages tabs, then open it and read the task summary: the minimum, median and maximum of duration, input, shuffle read and spill. A maximum far above the median is skew. Thousands of tasks with no records are too many partitions. Spill columns that are not zero mean the tasks are too big for their memory. Then the SQL tab shows the plan: the join type, the exchanges, and whether the scan filters were pushed. From these numbers I name the cause, make **one** change, and read the same stage table again. I never change three settings at once. And I write it down, so the next night is easier. If the UI is gone, I read the event log, which I can turn into the same table with a small script.',
        fu: [['What if the UI is not available?', 'The event log and a history server show the same pages. Or read the JSON lines.'], ['What do you look at for a stream?', 'The Streaming tab: input rate against processed rate, and the batch duration.']],
        trap: 'Changing settings first, and looking later.',
        real: 'Here is a stage table. What is wrong and what do you change?'
      }),

      B.qa({
        id: 'qa-oom-debug', t: 2, tag: 'Debugging', secs: 75,
        q: 'What failures do you meet most, and how do you recognise them?',
        pts: ['Unresolved column: caught at analysis, suggests names', 'collect too big: maxResultSize message', 'UDF Python error wrapped in Spark text', 'Parquet type mismatch between files', 'Container killed: overhead', 'Corrupt file: skipped silently if ignored'],
        short: 'Four I recorded. An **unresolved column** fails at analysis, before any data is read, and the message suggests the right names. A **collect that is too big** fails with the `spark.driver.maxResultSize` message: the fix is to write from the executors or reduce first, not to raise the limit. A **Python error in a UDF** arrives wrapped in Spark text, and I look for the Python line in the log. **Two files that disagree on a type** fail the read with a Parquet type mismatch that names the column, and the fix is a table format or an explicit schema. Besides these: "Container killed ... memoryOverhead" means memory outside the heap. And `ignoreCorruptFiles` turns a failure into a silent loss, so I leave it off.',
        fu: [['Where is the real Python exception?', 'In the executor log or the traceback in the driver log, below the Spark wrapper.'], ['How do you tell a driver problem from an executor problem?', 'By the message, and by which log it is in. A collect and a broadcast are driver side. A task error is executor side.']],
        trap: 'Reading only the first line of an error and guessing.',
        real: 'Your job fails with a long stack trace. What do you read first?'
      }),

      B.qa({
        id: 'qa-retry-ops', t: 2, tag: 'Debugging', secs: 60,
        q: 'What happens when a task fails, and what do you watch for?',
        pts: ['The task is retried: 4 failures allowed on a cluster', 'Local mode allows 1: a flaky test can fail', 'The job passes, with failed attempts in the log', 'A rising count of failed attempts is a warning', 'Speculation: a second copy of a slow task', 'Fix the cause: a bad node, a flaky service, memory'],
        short: 'Spark retries a failed task. `spark.task.maxFailures` is 4 on a cluster, so a task that fails once and works on the second try does not fail the job. In local mode it is 1, so the same job fails, unless the master is `local[2,4]`. I confirmed both. The event log shows attempt 0 as `ExceptionFailure` and attempt 1 as `Success`, and the job result shows no error. So I watch the **count of failed task attempts**: a job that passes with retries is telling me about a bad node, a flaky service or memory pressure, and it will fail on a bad day. Speculation can start a second copy of a slow task, which helps a slow machine and does nothing for skew.',
        fu: [['Does a retry repeat a side effect?', 'Yes. A task that wrote to a service before it failed writes again. Keep tasks idempotent.'], ['What about a failed stage?', 'If a stage fails because shuffle files are lost, the earlier stage reruns for the lost partitions.']],
        trap: 'Ignoring a job that succeeds after retries.',
        real: 'A job is green but costs more every week. What do you check?'
      }),

      B.recap({
        id: 'm14-recap', n: 14, badge: 'Debugger', color: '#FEF08A',
        pts: [
          'The method: **symptom, where to look, cause, one change, the same measure again, write it down**.',
          'The **event log** is JSON lines. One small query wrote **' + typeCount('SparkListenerTaskEnd') + '** task-end lines. A stage table is **twenty lines of Python** away from it.',
          'Six causes from the numbers: **skew, tiny tasks, spill, small files, no pruning, a cache that works**. The lab names them.',
          'Real messages: an **unresolved column** suggests names, a big **collect** hits `maxResultSize`, a **UDF** error is wrapped, a **type mismatch** names the column.',
          '`ignoreCorruptFiles` turned a failure into **' + n0(CO['ignoreCorruptFiles=true']) + '** rows with no message. Leave it off.',
          'A task that fails once is **retried**: attempt ' + attempts[0].attempt + ' failed, attempt ' + attempts[1].attempt + ' succeeded. Local mode allows ' + RT.maxFailures_default_in_local_mode + ' failure, a cluster ' + RT.maxFailures_default_on_a_cluster + '.'
        ],
        lines: [
          'I read the numbers before I change a setting.',
          'I change one thing and measure the same table.',
          'I never hide a failure to make a job green.'
        ]
      })
    ]
  });
})();
