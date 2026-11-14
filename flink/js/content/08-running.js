/* Mission 8: running a job. A Java job whose source can read much faster than the step after it: the busy, idle and backpressured time of each vertex, the backpressure report of the REST
   interface, and what changes when the slow step gets four parallel tasks instead of one. Deployment modes and the numbers to watch come from the documentation. Real Apache Flink 2.2.1. */
(function () {
  var B = LAB.b, G = LAB.get;
  var M1 = G.table('running.metrics_p1'), M4 = G.table('running.metrics_p4'), BP1 = G.text('running.backpressure_p1'), BP4 = G.text('running.backpressure_p4');
  var R1 = G.counts('running.rate_p1'), R4 = G.counts('running.rate_p4'), CP = G.counts('running.compare'), PIPE = G.file('code/app/Pipe.java');
  var n0 = function (x) { return Number(x).toLocaleString('en-US'); };
  var src = function (t) { return t.rows.filter(function (r) { return /^Source/.test(r[0]); })[0]; };
  var slow = function (t) { return t.rows.filter(function (r) { return /^slow/.test(r[0]); })[0]; };
  G.expect(src(M1)[4] >= 900 && slow(M1)[2] >= 900 && src(M4)[4] >= 900 && slow(M4)[2] >= 900, 'the source is blocked and the slow step is busy, with one task and with four');
  G.expect(R1.records_per_second >= 85 && R1.records_per_second <= 110 && R4.records_per_second >= 340 && R4.records_per_second <= 440 && CP.ratio >= 3.4 && CP.ratio <= 4.4, 'one task does about a hundred a second, four about four hundred');
  G.expect(JSON.parse(BP1).subtasks[0].ratio >= 0.9 && JSON.parse(BP4).subtasks[0].ratio >= 0.9, 'the backpressure report says high for both runs');
  var bp = JSON.parse(BP1);

  LAB.addChapter({
    id: 'm8', n: 8, title: 'Running Flink: backpressure and deployment', short: 'Run', blurb: 'A slow step, busy and backpressured time, more parallel tasks, and the ways to deploy a job', minutes: 35,
    focus: ['qual', 'mon'],
    goals: [
      'Read **busy**, **idle** and **backpressured** time, and find the **bottleneck** of a job.',
      'Explain **backpressure**: what is blocked, what is lost (nothing), and what grows (lag).',
      'Scale the **slow step** and predict the effect from its speed.',
      'Choose between **session** and **application** mode, and name the places where Flink runs.',
      'List the **numbers to watch** in a running job.'
    ],
    say: 'Mission 8 is the one for the person who is called at night. A job is running, the lag is growing, and the CPU is idle. Why? I made the situation on purpose: a source that can read a hundred thousand records a second, and a step that takes ten milliseconds for each, like a call to a service. I read what Flink said about each step, and then gave the slow step four tasks. Press Next.',
    scenes: [
      B.talk({
        id: 'm8-bp', t: 1, src: 'docs', title: 'Backpressure in four sentences',
        say: 'Four sentences, from the Flink documentation and from the recording. Press Next.',
        items: [
          ['The steps are connected by buffers', 'Between two tasks, records wait in network buffers. A task that cannot hand over a record because the buffers of the next task are full has to **wait**.', 'Full buffers mean wait.'],
          ['The slowest step sets the speed', 'If a step is slower than the one before it, the buffers in between fill up, and the step before it is **backpressured**. The job runs at the speed of its slowest step. Nothing is lost.', 'A job is as fast as its slowest step.'],
          ['Three times per second', 'Each task reports how many milliseconds of every second it was **busy** (working), **idle** (nothing to do) and **backpressured** (blocked on a full output). The three add up to 1000.', 'Busy, idle, blocked.'],
          ['What grows', 'A source that is blocked reads less. When the source is Kafka, the records wait in the topic, and the consumer **lag** grows. The job looks healthy and falls behind.', 'The lag grows.']
        ],
        cols: 1,
        call: { k: 'tip', h: 'The interview sentence:', t: 'Backpressure means a step cannot send because the next one is full. The step that is blocked is not the problem: the busy step after it is, and I look for the step with high busy time and a backpressured step in front of it.' }
      }),

      B.code({
        id: 'm8-code', t: 1, src: 'rec', title: 'A pipeline with a deliberately slow step', file: 'Pipe.java', lang: 'java', code: PIPE,
        steps: [
          { say: 'The job. A source, a slow step, a sink. Its only purpose is to show backpressure. Press Next.', lines: null },
          { say: 'The source reads a Kafka topic from the earliest offset. The topic holds ' + n0(R1.topic_records) + ' records, already there, so the source can read as fast as it likes.', lines: G.span(PIPE, /KafkaSource<String> source/, /\.build\(\);/) },
          { say: '`rebalance` puts a network step between the source and the slow step, so that they become two separate tasks. Without it, Flink would chain them into one, and you could not see which one waits.', lines: G.span(PIPE, /\.rebalance\(\)/) },
          { say: 'The slow step sleeps ten milliseconds for each record. That is a stand-in for a call to a database or a web service. One task can do at most a hundred records a second.', lines: G.span(PIPE, /new RichMapFunction/, /\.setParallelism\(p\.getInt/) },
          { say: 'The sink throws every record away. The `lookup-parallelism` argument says how many parallel tasks the slow step gets: one in the first run, four in the second.', lines: G.span(PIPE, /sinkTo\(new DiscardingSink/) }
        ],
        note: 'Recorded: this is the source that was compiled and run. A real slow step would be a lookup in a database, a call to an API, or a heavy computation.'
      }),

      B.rows({
        id: 'm8-m1', t: 1, src: 'rec', title: 'One task: where the time goes',
        steps: [
          {
            say: 'These are the numbers after the job had run for a while, with **one** task for the slow step. Look at the source: it was **backpressured about ' + src(M1)[4] + ' milliseconds of every second**. It was blocked almost all the time, because the step after it could not take more. Look at the slow step: **busy ' + slow(M1)[2] + ' milliseconds** of every second. It never rested.',
            tabs: [{ layer: 'RECORDED', name: 'busy, idle and backpressured time of each vertex', c: 'raw', cols: M1.cols, rows: M1.rows, trk: 1 }],
            notes: ['Recorded, from the metrics of the REST interface. The three columns add up to about 1000 for each vertex. The source had taken in ' + n0(src(M1)[5]) + ' records, the slow step ' + n0(slow(M1)[5]) + ': the source could only hand over what the slow step let through.']
          },
          {
            say: 'The REST interface has a report for it. For the source vertex it says the backpressure level is **' + bp['backpressure-level'] + '**, with a ratio of ' + bp.subtasks[0].ratio + ': the task was blocked all of the time. This is the same information that colours the vertex black in the web UI.',
            tabs: [{ layer: 'RECORDED', name: 'GET /jobs/<id>/vertices/<id>/backpressure', c: 'raw', cols: ['Response'], rows: BP1.split('\n').map(function (l) { return [l]; }), trk: 1 }],
            notes: ['Recorded. The status field says only that the sample was taken; read the level and the ratio.']
          },
          {
            say: 'And the speed. The slow step took in **' + R1.records_per_second + ' records a second**, against a ceiling of ' + R1.ceiling_per_second + ' (a hundred times ten milliseconds). The topic of ' + n0(R1.topic_records) + ' records would need about ' + Math.round(R1.topic_records / R1.records_per_second / 60) + ' minutes at this speed.',
            tabs: [{ layer: 'RECORDED', name: 'The speed of the slow step', c: 'raw', cols: ['What', 'Value'], rows: [['Parallel tasks', R1.lookup_parallelism], ['Time for each record', R1.sleep_ms + ' ms'], ['Ceiling', R1.ceiling_per_second + ' records a second'], ['Measured', R1.records_per_second + ' records a second']], trk: 3 }],
            notes: ['Recorded: the difference of the counter of records taken in, divided by the time between two readings that the recorder took at the moment the counter refreshed.']
          }
        ]
      }),

      B.widget({ id: 'm8-lab', kind: 'backpressurelab', t: 1, src: 'rec', title: 'Lab: slow step, more tasks, and the lag' }),

      B.rows({
        id: 'm8-m4', t: 1, src: 'rec', title: 'Four tasks for the slow step',
        steps: [
          {
            say: 'Same job, same topic, but `--lookup-parallelism 4`. The slow step now has four tasks, each of which can do a hundred records a second. The speed went from **' + R1.records_per_second + '** to **' + R4.records_per_second + '** a second: **' + CP.ratio + ' times**, as the ceiling predicted.',
            tabs: [{ layer: 'RECORDED', name: 'The same pipeline, with four tasks for the slow step', c: 'raw', cols: M4.cols, rows: M4.rows, trk: 1 }],
            notes: ['Recorded. The vertex of the slow step now has 4 parallel tasks, and the sink, which no longer shares its chain, is a vertex of its own. It is idle almost all the time.']
          },
          {
            say: 'But look at the source again: it is **still backpressured**, ' + src(M4)[4] + ' milliseconds of every second. Four tasks are four times faster, and the source can still read a thousand times more. To keep up with a source like that you would need hundreds of tasks, or a faster step. The right question is not "is there backpressure" but "does the lag grow, and is that acceptable".',
            tabs: [{ layer: 'RECORDED', name: 'The backpressure report with four tasks', c: 'raw', cols: ['Response'], rows: BP4.split('\n').map(function (l) { return [l]; }), trk: 1 }],
            notes: ['Recorded. In production the source is a topic that fills at a rate of its own. The job keeps up when its slowest step is faster than that rate.']
          }
        ]
      }),

      B.cmp({
        id: 'm8-watch', t: 1, src: 'docs', title: 'The numbers to watch',
        say: 'You cannot watch everything. These are the numbers that tell you whether a Flink job is healthy. They come from the metrics page of the documentation. Press Next.',
        cols: ['Number', 'Where', 'What it tells you'],
        hl: 0,
        rows: [
          ['busyTimeMsPerSecond, idleTimeMsPerSecond, backPressuredTimeMsPerSecond', 'Every task', 'Which step is the bottleneck: the busy one, behind the backpressured ones'],
          ['numRestarts and the state of the job', 'The job', 'Whether the job is failing and restarting'],
          ['lastCheckpointDuration, lastCheckpointSize, numberOfFailedCheckpoints', 'The job', 'Whether checkpoints are getting slower or bigger: state growth, backpressure'],
          ['currentOutputWatermark', 'Every operator', 'Whether event time moves: a stuck watermark means windows do not close'],
          ['The lag of the consumer group in Kafka', 'Kafka, as in the Kafka course', 'Whether the job keeps up with its source']
        ],
        steps: [
          { upto: 1, say: 'The three time metrics are the first thing to read. A step that is busy and has a backpressured step in front of it is the one to fix.' },
          { upto: 3, say: 'Restarts, and checkpoint duration and size, are the health of the job. A checkpoint that gets slower every day is usually state that grows, as in mission 6.' },
          { upto: 5, say: 'The watermark tells you whether time moves, as in mission 3. The lag in Kafka tells you whether the job keeps up. Put these five on a dashboard, and alert on how they change as well as on their values.' }
        ],
        pick: 'From the Flink documentation: the pages about metrics, back pressure monitoring and checkpoint monitoring. The consumer group lag is from the Kafka course.'
      }),

      B.flow({
        id: 'm8-bpflow', t: 1, src: 'docs', title: 'Where the waiting moves', g: 'backpressure', legend: true,
        steps: [
          { say: 'The same story as a picture. Press Next.', cap: 'A fast source, a slow step.' },
          { say: 'Step 1. The source reads as fast as the next step lets it.', on: ['k1'], focus: ['b_src', 'b_buf'], cap: 'The source reads.' },
          { say: 'Step 2. The buffers between the source and the slow step fill up. When they are full the source has to wait: it is **backpressured**.', on: ['k2'], focus: ['b_buf', 'b_slow'], cap: 'Full buffers.', tags: ['tg_bp'] },
          { say: 'Step 3. The slow step is **busy** all the time. The sink after it has little to do and is idle.', on: ['k3'], focus: ['b_slow', 'b_snk'], cap: 'The slow step works at its limit.' },
          { say: 'Step 4. The metrics show it: busy for the slow step, backpressured for the source.', on: ['k4'], focus: ['b_buf', 'b_met'], cap: 'Read the three numbers.' },
          { say: 'Step 5. More parallel tasks for the slow step raise its ceiling.', on: ['k5'], focus: ['b_met', 'b_fix'], cap: 'Scale the bottleneck.' }
        ]
      }),

      B.talk({
        id: 'm8-deploy', t: 1, src: 'docs', title: 'Two ways to run a job',
        say: 'The Flink documentation names two deployment modes. Press Next for each.',
        items: [
          ['Session mode', 'One cluster, one JobManager, a pool of TaskManagers. You **submit jobs to the running cluster**, as in this course. Jobs share the TaskManagers, so a job that eats memory or fails badly can hurt its neighbours. Starting a job is quick, because the cluster is already there.', 'One cluster, many jobs.'],
          ['Application mode', 'A cluster is started **for one application** and ends with it. The `main` method runs on the JobManager. Resources are isolated for each application, and a failing job cannot hurt another. This is the mode that production setups on Kubernetes use most.', 'One cluster per job.'],
          ['The old per-job mode', 'Older material describes a third mode, per-job. The current documentation lists only session and application mode, so read old tutorials with that in mind.', 'Not in the current docs.']
        ],
        cols: 1,
        call: { k: 'tip', h: 'The interview sentence:', t: 'Session mode shares one cluster between many jobs and starts them fast; application mode starts a cluster for each application and isolates them. I prefer application mode for production jobs.' }
      }),

      B.flow({
        id: 'm8-deployflow', t: 1, src: 'docs', title: 'Session and application clusters', g: 'deploy', legend: true,
        steps: [
          { say: 'Two shapes of cluster. Press Next.', cap: 'Shared or one for each.' },
          { say: 'Step 1. In **session mode** a client submits a job to a cluster that is already running.', on: ['k1'], focus: ['r_cli', 'r_sess'], cap: 'Submit to a running cluster.' },
          { say: 'Step 2. Job A runs on it.', on: ['k2'], focus: ['r_sess', 'r_a'], cap: 'Job A.' },
          { say: 'Step 3. And so does job B. They share the TaskManagers.', on: ['k3'], focus: ['r_sess', 'r_b'], cap: 'Job B shares the cluster.' },
          { say: 'Step 4. In **application mode** a cluster is started for one application.', on: ['k4'], focus: ['r_cli', 'r_app'], cap: 'A cluster for one application.' },
          { say: 'Step 5. Job C has the cluster to itself, and the cluster goes away when it ends.', on: ['k5'], focus: ['r_app', 'r_c'], cap: 'Its own cluster.' },
          { say: 'Step 6. On Kubernetes, the Flink Kubernetes Operator manages such clusters from a resource definition, and can take a savepoint to upgrade a job. I did not run it for this course.', on: ['k6'], focus: ['r_k8s', 'r_app'], cap: 'The operator manages them.' }
        ]
      }),

      B.cmp({
        id: 'm8-where', t: 2, src: 'docs', title: 'Where Flink runs',
        say: 'The places where a Flink cluster is started, and what each one gives you. I ran only the first. Press Next.',
        cols: ['Where', 'What it is', 'Good for'],
        hl: 0,
        rows: [
          ['Standalone', 'Processes that you start yourself: a JobManager and TaskManagers', 'Learning, tests, a fixed machine. This course'],
          ['Kubernetes', 'Native integration, and the Flink Kubernetes Operator with a FlinkDeployment resource', 'Most new production setups; upgrades with savepoints'],
          ['YARN', 'A Flink cluster inside a Hadoop cluster', 'Companies that already run Hadoop'],
          ['A managed service', 'A cloud provider runs the cluster, for example Amazon Managed Service for Apache Flink', 'Teams that do not want to run the cluster, at the price of its limits']
        ],
        steps: [
          { upto: 1, say: 'I ran a standalone cluster on one machine, with all the limits of that.' },
          { upto: 2, say: 'On Kubernetes the operator can start a cluster for each application, restart it, and upgrade it by stopping with a savepoint and starting from it.' },
          { upto: 3, say: 'YARN is still in use where Hadoop is.' },
          { upto: 4, say: 'A managed service takes the cluster away from you and gives you a job to upload. Check which Flink version and which connectors it supports.' }
        ],
        pick: 'From the deployment pages of the Flink documentation, and from the job descriptions in the README. I ran none of the last three.'
      }),

      B.quiz({
        id: 'm8-q1', t: 1,
        q: 'A source vertex shows 1000 ms of backpressured time per second, and the next vertex shows 990 ms of busy time. Which one do you fix?',
        opts: [
          { t: 'The busy vertex after the source: it is the bottleneck', fb: '' },
          { t: 'The source: it is the one that is blocked', fb: 'The source is blocked because the next step is slow. Making it faster would change nothing.' },
          { t: 'The sink, because it is last', fb: 'The sink was idle.' },
          { t: 'The JobManager', fb: 'The JobManager is not in the data path.' }
        ],
        ok: 0,
        why: 'Backpressure is propagated upstream. The blocked task is a symptom, the busy one behind it is the cause. In the recording the source showed ' + src(M1)[4] + ' ms backpressured and the slow step ' + slow(M1)[2] + ' ms busy.'
      }),

      B.quiz({
        id: 'm8-q2', t: 1,
        q: 'A step does 100 records a second per task. You need 400 a second. What do you do?',
        opts: [
          { t: 'Run it with four parallel tasks', fb: '' },
          { t: 'Raise the checkpoint interval', fb: 'It does not change the speed of the step.' },
          { t: 'Restart the job with more heap', fb: 'The step is limited by its time per record, not by memory.' },
          { t: 'Remove the source', fb: 'Without a source there is nothing to read.' }
        ],
        ok: 0,
        why: 'Four tasks give four times the ceiling. In the recording one task did ' + R1.records_per_second + ' a second and four did ' + R4.records_per_second + ': ' + CP.ratio + ' times.'
      }),

      B.quiz({
        id: 'm8-q3', t: 1,
        q: 'A job reads a Kafka topic, is backpressured, and runs for an hour. What happens to the records it does not read?',
        opts: [
          { t: 'They stay in the topic and the lag grows', fb: '' },
          { t: 'They are dropped by Flink', fb: 'Backpressure is flow control: nothing is dropped.' },
          { t: 'They are buffered in the JobManager', fb: 'The JobManager does not touch the data.' },
          { t: 'They are written to the checkpoint', fb: 'Checkpoints save state and positions, not unread input.' }
        ],
        ok: 0,
        why: 'Backpressure makes the source read less, and what it does not read waits in Kafka. The lag grows by the difference between the arrival rate and the speed of the job, so a job can be healthy and fall behind.'
      }),

      B.bug({
        id: 'm8-bug', t: 1, q: 'The job below must use the whole speed of its slow lookup, but it runs with a single task for it, whatever -p says. Click the line that fixes the parallelism of the slow step to one.',
        file: 'Job.java', lang: 'java',
        code: ['events', '    .rebalance()', '    .map(new SlowLookup())', '    .name("slow lookup")', '    .setParallelism(1)', '    .sinkTo(new DiscardingSink<>());'].join('\n'),
        bad: [5],
        hint: 'Which call overrides the default parallelism for one operator?',
        why: '`setParallelism(1)` on an operator overrides the parallelism of the job for that operator. The slow step stays at one task, and no number given to `flink run -p` changes it. Take the line out, or make it an argument, as the recorded job did.',
        fix: ['events', '    .rebalance()', '    .map(new SlowLookup())', '    .name("slow lookup")', '    .setParallelism(p.getInt("lookup-parallelism", 1))', '    .sinkTo(new DiscardingSink<>());'].join('\n'),
        cheer: 'Check where parallelism is pinned.'
      }),

      B.order({
        id: 'm8-ord', t: 1, q: 'Put in order how you find and fix a bottleneck in a running job.',
        items: [
          'Open the job and look at the busy, idle and backpressured time of every vertex',
          'Follow the backpressure upstream to the vertex that is busy and has nothing in front of it that is idle',
          'Find out why that step is slow: a call, a heavy function, a skewed key',
          'Give it more parallel tasks, or make it faster, then check the lag again'
        ],
        why: 'Backpressure points upstream of the cause, so you follow it to the busy step. Then you ask why, because more tasks do not help a skewed key. The last check is the lag of the source, which is what the business sees.'
      }),

      B.decide({
        id: 'm8-dec', t: 2, src: 'docs', title: 'Decision: session or application mode',
        scenario: 'Brewline will run thirty streaming jobs on Kubernetes. Some are critical (payments), some are experiments of the analytics team. A memory leak in one experiment must not stop the payment job. Releases happen weekly, and each job is upgraded with a savepoint. You choose how to deploy them.',
        opts: [
          { t: 'Application mode, a cluster for each job, managed by the Flink Kubernetes Operator', d: 'Each job has its own JobManager and TaskManagers. A failure stays inside it, and the operator handles the upgrade.', lose: '' },
          { t: 'One session cluster for all thirty jobs', d: 'Cheapest: one set of TaskManagers, fast to submit a job.', lose: 'The jobs share TaskManagers and the JobManager. One bad job can bring down the others, including payments.' },
          { t: 'A session cluster for critical jobs and one for experiments', d: 'Some isolation, and fewer clusters than thirty.', lose: 'Jobs inside a session still share fate. It is a compromise that needs rules about who goes where.' }
        ],
        pick: 0,
        why: 'Application mode gives each application its own cluster, so the resource isolation is by application, as the documentation says. With thirty jobs the operator keeps the cost of managing clusters low. The price is more JobManagers and a slower start for each job.',
        when: 'For ten small jobs of one team that trust each other, a session cluster is simpler and cheaper.'
      }),

      B.incident({
        id: 'm8-inc', t: 1, src: 'rec', title: 'Incident: the consumer lag grows, and every task of the job is nearly idle', time: '13:15',
        alert: '**The lag of the order-processing job has grown for an hour. CPU on the TaskManagers is 5 percent. Checkpoints succeed. Restarting did not help.** In the web UI the source is red with backpressure, and the vertex after it shows a thin sliver of busy time on one task and idle on the others.',
        clues: ['The source is backpressured', 'The vertex after it has one busy task and three idle ones', 'It calls a customer service for each record'],
        opts: [
          { t: 'Find why the step is slow: here the call to the service, and one hot key on one task; add tasks or fix the call, and split the hot key', fb: '' },
          { t: 'Add TaskManagers', fb: 'Three tasks are idle already. More machines do not make the busy one faster.' },
          { t: 'Restart the job with a higher checkpoint interval', fb: 'The checkpoints succeed. The interval is not the problem.' },
          { t: 'Scale the source to more partitions', fb: 'The source is blocked, not slow.' }
        ],
        best: 0,
        why: 'The source is blocked because the step after it is slow. Only one of its tasks is busy: one key (a very busy store, or a very busy customer) goes to a single task. In the recording, a step that took ten milliseconds for each record limited the whole job to a hundred records a second, and four tasks gave four times that. When one task is hot, more tasks do not help until the key is split.',
        checks: [['Look at the busy time of each task of the slow vertex', 'One is red, the others idle.'], ['Look at the keys', 'A single hot key goes to one task.'], ['Measure the call to the service', 'Its time for each record is the ceiling.']],
        tell: 'The step after the source is slow and only one of its tasks is busy, so the source is blocked and the lag grows. I look for the hot key and the cost of the call, then I split the key or cache the call, and I check the lag again.',
        prevent: ['Alert on lag and on backpressure together', 'Test with the skew of production keys', 'Cache or batch calls to external services']
      }),

      B.qa({
        id: 'qa-bp', t: 1, tag: 'Operations', secs: 90,
        q: 'What is backpressure, and how do you find and fix its cause?',
        pts: ['A step cannot send because the next one is full', 'Nothing is lost', 'Busy, idle, backpressured time', 'The busy step is the cause', 'Lag grows in the source'],
        short: '**Backpressure** means a task cannot hand records to the next one because its buffers are full, so it waits. The job runs at the speed of its slowest step and nothing is lost; the records wait in the source, so with Kafka the **lag** grows. Flink reports for each task how many milliseconds of every second it was **busy**, **idle** and **backpressured**. The blocked task is a symptom; the cause is the step behind it that is busy. In my recording the source was backpressured about ' + src(M1)[4] + ' ms of every second and the slow step busy about ' + slow(M1)[2] + ' ms; giving the slow step four tasks instead of one raised the speed from ' + R1.records_per_second + ' to ' + R4.records_per_second + ' records a second. I ask why the step is slow: a call to a service, a heavy function, a hot key.',
        fu: [['How does it affect checkpoints?', 'Barriers move with the records, so a backpressured job takes longer to checkpoint. Unaligned checkpoints help.'], ['Is backpressure always bad?', 'No. A short-lived one is flow control working. A permanent one with growing lag is the sign of a bottleneck.']],
        trap: 'Fixing the backpressured task. It is waiting; the busy one behind it is the problem.',
        real: 'Your job is backpressured at the source and only one task of the next vertex is busy. What do you do?'
      }),

      B.qa({
        id: 'qa-deploy', t: 1, tag: 'Operations', secs: 75,
        q: 'How would you deploy and upgrade Flink jobs in production?',
        pts: ['Application mode for isolation', 'Kubernetes with the operator, or a managed service', 'Stop with a savepoint, start the new version from it', 'Stable uids', 'Monitor restarts, checkpoints, lag, backpressure'],
        short: 'For production I prefer **application mode**: a cluster for each application, so one job cannot hurt another, usually on Kubernetes with the Flink Kubernetes Operator, or on a managed service if the team does not want to run clusters. **Session mode** shares one cluster between many jobs, which is quicker to start and weaker in isolation. An upgrade is: stop with a savepoint, deploy the new version, start it from the savepoint, with stable operator uids and a restore tested in CI. I monitor the number of restarts, checkpoint duration and size, the watermark, the busy and backpressured time, and the Kafka lag. I ran only a standalone cluster for this course, so the Kubernetes parts are from the documentation.',
        fu: [['What goes wrong in an upgrade?', 'A changed operator uid or query shape: the restore is refused, as in mission 7 and mission 4.'], ['What about high availability?', 'The JobManager is a single point of failure unless you configure high availability; I did not run it.']],
        trap: 'Saying that you restart the job to upgrade it. A restart without a savepoint starts with no state.'
      }),

      B.qa({
        id: 'qa-scale', t: 2, tag: 'Operations', secs: 60,
        q: 'The job cannot keep up with its input. How do you scale it?',
        pts: ['Find the bottleneck first', 'Raise parallelism of that step', 'Slots and max parallelism limits', 'Hot keys do not scale', 'Rescale through a savepoint'],
        short: 'First I find the **bottleneck** with the busy and backpressured time: scaling the wrong step changes nothing. For the busy step I raise the **parallelism**, which needs free slots (mission 1) and stays below the max parallelism, 128 by default. Four tasks gave four times the speed in my recording, as the ceiling predicted. A **hot key** cannot be spread by parallelism, because a key always goes to one task, so I split the key or pre-aggregate. Changing the parallelism of a running job means stopping it with a savepoint and starting it again with the new number; the state is stored by key group, so it can be restored. Last, I check the lag of the source again.',
        fu: [['Can Flink scale by itself?', 'There are adaptive scheduling and autoscaling options, which I did not run. By default you set the parallelism.'], ['What if the sink is the slow one?', 'Then it is the busy step: batch writes, more sink tasks, or a faster target.']],
        trap: 'Adding TaskManagers and slots without changing the parallelism of the busy step: the job does not use them.'
      }),

      B.recap({
        id: 'm8-recap', n: 8, badge: 'Operator', color: '#FFD5D5',
        pts: [
          '**Backpressure** is flow control: a full buffer makes the step before it wait. Nothing is lost; the lag of the source grows.',
          'The blocked task is the symptom. In the recording the source was **backpressured ' + src(M1)[4] + ' ms** of every second and the slow step **busy ' + slow(M1)[2] + ' ms**.',
          'One task did **' + R1.records_per_second + '** records a second against a ceiling of ' + R1.ceiling_per_second + '; four tasks did **' + R4.records_per_second + '** (' + CP.ratio + ' times). The source was still blocked, so the question is whether the lag grows.',
          '**Session mode** shares a cluster; **application mode** gives each application its own. Production usually means application mode on Kubernetes with the operator, or a managed service.',
          'Watch: busy, idle and backpressured time, restarts, checkpoint duration and size, the watermark, and the Kafka lag.'
        ]
      })
    ]
  });
})();
