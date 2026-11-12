/* Mission 1: the map. What a Flink cluster is made of, how a query becomes a job graph, and how tasks, slots, parallelism and chaining fit together. Real Apache Flink 2.2.1, a standalone
   cluster of one JobManager and two TaskManagers on one machine, read through the processes, the files of the distribution, the SQL client and the REST interface. */
(function () {
  var B = LAB.b, G = LAB.get;
  var CL = G.counts('world.cluster'), PR = G.table('world.processes'), MEM = G.table('world.taskmanager_memory'), MS = G.counts('world.taskmanager_memory_sums'), DI = G.counts('world.distribution');
  var PL = G.table('world.plan'), PV = G.text('world.plan_vertices'), PJ = G.text('world.plan_json'), JB = G.counts('world.job'), SL = G.table('world.slots'), CH = G.table('world.chaining');
  var LS = G.text('world.flink_list'), RS = G.table('world.rest'), XP = G.text('world.explain'), SQLP = G.file('sql/world_p2.sql');
  var n0 = function (x) { return Number(x).toLocaleString('en-US'); };
  G.expect(PR.rows.length === 3 && PR.rows.filter(function (r) { return r[0] === 'TaskManager'; }).length === 2, 'one JobManager and two TaskManagers in the process list');
  G.expect(MS.sum_of_pieces_mib === MS.total_process_mib, 'the pieces of the TaskManager memory add up to the process size');
  G.expect(PL.rows.length === 2 && PL.rows[1][3] === 'HASH' && JB.vertices === 2 && JB.tasks === 4 && JB.slots_used === 2, 'two vertices joined by a hash, four tasks in two slots');
  var slotRow = function (p) { var r = SL.rows.filter(function (x) { return x[0] === p; })[0]; G.expect(!!r, 'slots row for parallelism ' + p); return r; };
  G.expect(slotRow(1)[2] === 1 && slotRow(2)[2] === 2 && slotRow(4)[2] === 4 && slotRow(4)[1] === 8 && slotRow(5)[3] === 'FAILED' && /NoResourceAvailableException/.test(slotRow(5)[4]), 'slots used equal the parallelism, and five does not fit');
  G.expect(CH.rows[0][1] === 2 && CH.rows[1][1] === 6 && CH.rows[1][2] === 12, 'chaining on gives two vertices, off gives six');
  var exe = G.span(PJ, /"description": "\[1\]/, /"description": "\[1\]/);
  var lib = DI.lib.filter(function (x) { return !/log4j/.test(x); });

  LAB.addChapter({
    id: 'm1', n: 1, title: 'The map: a cluster and a job', short: 'Cluster', blurb: 'JobManager, TaskManagers, slots, the job graph, parallelism and chaining', minutes: 40,
    focus: ['src', 'stg'],
    goals: [
      'Say what a **JobManager**, a **TaskManager** and a **slot** are, and how a client reaches them.',
      'Read a **job graph**: vertices, parallelism, and the way records are sent between them.',
      'Explain **operator chaining**, and what **slot sharing** means for the slots a job needs.',
      'Predict whether a job **starts** for a given parallelism, and read the error when it does not.',
      'Find a job in the **REST interface** and the command line.'
    ],
    say: 'Mission 1 is the map. Before time, state and checkpoints, you need to see what Flink is made of. I started a real cluster, one JobManager and two TaskManagers, and submitted a query. Then I asked the cluster what it was running, how many slots it used, and what it did when I asked for more slots than it had. Press Next.',
    scenes: [
      B.talk({
        id: 'm1-what', t: 1, src: 'docs', title: 'What Flink is',
        say: 'Five ideas make up Flink. Press Next.',
        items: [
          ['A stream processor', 'Flink runs a program over records that **keep arriving**, for as long as you leave it running. The program is called a **job**. A job can also run over a file or a table that has an end: Flink treats that as a stream that stops.', 'A job that does not have to end.'],
          ['Unbounded and bounded', 'A Kafka topic has no end, so it is **unbounded**. A file has one, so it is **bounded**. The same SQL and the same operators work for both. In a bounded run the result is final when the input ends.', 'The same query for both.'],
          ['State', 'To count orders for each store, a job must remember the count of every store. Flink keeps this **state** next to the code that uses it, and saves it, so that a restart does not start from zero.', 'Memory that survives a restart.'],
          ['Time', 'Orders arrive late and out of order. Flink works with the time at which an order **happened**, and uses a **watermark** to decide when a result is complete. Mission 3 is about it.', 'Event time, not arrival time.'],
          ['Exactly once', 'Flink saves a consistent **checkpoint** of its state and its position in the sources. After a failure it restores the checkpoint, and with a sink that supports transactions the results are written once. Mission 4 is about it.', 'No loss and no duplicate, with the right sink.']
        ],
        cols: 1,
        call: { k: 'tip', h: 'The interview sentence:', t: 'Flink is a distributed stream processor: it runs jobs over unbounded and bounded data, keeps state for each key, works in event time with watermarks, and uses checkpoints to recover with exactly-once results.' }
      }),

      B.flow({
        id: 'm1-cluster', t: 1, src: 'docs', title: 'A cluster: who does what', g: 'cluster', legend: true,
        steps: [
          { say: 'A standalone Flink cluster, the way I ran it. Press Next.', cap: 'One JobManager, two TaskManagers.' },
          { say: 'Step 1. You submit a job from a **client**: the SQL client, or the `flink run` command. The client sends the job to the **JobManager** over its REST interface.', on: ['k1'], focus: ['c_cli', 'c_jm'], cap: 'The client submits the job.' },
          { say: 'Step 2. The JobManager plans the job, asks for **slots**, and sends the **tasks** to the TaskManagers. It also coordinates checkpoints and decides what to do when a task fails.', on: ['k2'], focus: ['c_jm', 'c_tm1'], cap: 'The JobManager deploys tasks.' },
          { say: 'Step 3. The second TaskManager receives its tasks the same way. A TaskManager is a Java process with a fixed number of slots.', on: ['k3'], focus: ['c_jm', 'c_tm2'], cap: 'Tasks go to every TaskManager.' },
          { say: 'Step 4. The records move **directly between TaskManagers**. The JobManager does not touch the data.', on: ['k4'], focus: ['c_tm1', 'c_tm2'], cap: 'Data does not pass the JobManager.' },
          { say: 'Step 5. Each task saves snapshots of its state to **checkpoint storage**: a folder, an object store or HDFS. This is what a restart reads.', on: ['k5'], focus: ['c_tm1', 'c_store'], cap: 'State is saved outside the process.' },
          { say: 'Step 6. Sources and sinks live outside the cluster. Here the orders come from Kafka.', on: ['k6'], focus: ['c_kafka', 'c_tm1'], cap: 'Kafka feeds the job.' },
          { say: 'Step 7. The REST interface and the web UI, on port 8081, ask the JobManager what it knows: jobs, tasks, checkpoints, metrics. Everything that the web UI shows is a REST call, and so is the command line.', on: ['k7'], focus: ['c_rest', 'c_jm'], cap: 'The web UI is a REST client.' }
        ]
      }),

      B.rows({
        id: 'm1-proc', t: 1, src: 'rec', title: 'The real cluster: three Java processes',
        steps: [
          {
            say: 'This is the process list of the cluster that I started. Three plain Java programs. One **JobManager** (its main class is the standalone session cluster entrypoint) and two **TaskManagers**. Nothing else is needed: no database, no extra service.',
            tabs: [{ layer: 'RECORDED', name: 'ps, filtered to the Flink processes', c: 'raw', cols: PR.cols, rows: PR.rows, trk: 0 }],
            notes: ['Recorded. The heap that each process was started with is a fraction of its process size: ' + CL.jobmanager_process_mib + ' MiB for the JobManager and ' + CL.taskmanager_process_mib + ' MiB for each TaskManager.']
          },
          {
            say: 'The REST interface says the same in one line. Two TaskManagers, **' + CL.slots_per_taskmanager + ' slots each**, ' + CL.slots_total + ' in all. The version is ' + CL.version + '. This is the whole capacity of the cluster.',
            tabs: [{
              layer: 'RECORDED', name: 'GET /overview and the settings behind it', c: 'raw', cols: ['What', 'Value'],
              rows: [['Flink version', CL.version], ['TaskManagers', CL.taskmanagers], ['Slots per TaskManager', CL.slots_per_taskmanager], ['Slots in all', CL.slots_total], ['Default parallelism of a job', CL.default_parallelism],
                ['Heartbeat every', CL.heartbeat_interval_ms + ' ms'], ['A TaskManager is lost after', CL.heartbeat_timeout_ms + ' ms without an answer'], ['Where the REST interface listens', 'port ' + CL.rest_port]],
              trk: 3
            }],
            notes: ['Recorded. The heartbeat settings are lower than the defaults (10 s and 50 s) so that the lost TaskManager of mission 4 is noticed quickly.']
          }
        ]
      }),

      B.rows({
        id: 'm1-mem', t: 2, src: 'rec', title: 'Where the memory of a TaskManager goes',
        steps: [{
          say: 'One TaskManager is a process of **' + MS.total_process_mib + ' MiB**. Flink splits it into pieces, and a senior should know which piece does what. **Task heap** holds your code and the state of the heap state backend. **Managed memory** is reserved for RocksDB and for sorting. **Network buffers** carry records between tasks. The rest is Flink itself and the Java virtual machine.',
          tabs: [{ layer: 'RECORDED', name: 'The memory of one TaskManager, from its REST resource', c: 'raw', cols: MEM.cols, rows: MEM.rows, trk: 1 }],
          notes: ['Recorded. The pieces add up to the process size: ' + MS.sum_of_pieces_mib + ' MiB. The split follows fractions that the documentation gives: managed memory is 0.4 of the Flink memory by default, network memory 0.1.']
        }]
      }),

      B.flow({
        id: 'm1-graph', t: 1, src: 'docs', title: 'A query becomes tasks in slots', g: 'jobgraph', legend: true,
        steps: [
          { say: 'What happens to a query between you and the TaskManagers. Press Next.', cap: 'A query becomes a graph of tasks.' },
          { say: 'Step 1. You write SQL. This one counts orders for each store.', on: ['k1'], focus: ['g_sql', 'g_plan'], cap: 'The query.' },
          { say: 'Step 2. The **planner** turns the SQL into an optimized plan of operators: scan, filter, aggregate, sink.', on: ['k2'], focus: ['g_plan', 'g_graph'], cap: 'The planner makes a plan.' },
          { say: 'Step 3. The plan becomes a **job graph** of vertices. A vertex is one or more operators that run together in one thread.', on: ['k3'], focus: ['g_graph', 'g_exec'], cap: 'The job graph.' },
          { say: 'Step 4. Operators that need no shuffle are **chained** into one vertex. Here the source and its filter are vertex 1.', on: ['k4'], focus: ['g_graph', 'g_v1'], cap: 'Chained into vertices.' },
          { say: 'Step 5. A count for each store needs all orders of a store in one place, so the records between the two vertices are **hashed by key**. That is where records cross the network.', on: ['k5'], focus: ['g_v1', 'g_v2'], cap: 'A hash edge separates the vertices.' },
          { say: 'Step 6. Each vertex runs as **parallel tasks**. The tasks that sit at the same position in the graph share a **slot**, so a job needs as many slots as its highest parallelism.', on: ['k6'], focus: ['g_exec', 'g_slots'], cap: 'Tasks share slots.' }
        ]
      }),

      B.sql({
        id: 'm1-sql', t: 1, src: 'rec', title: 'The job that I submitted', file: 'world_p2.sql', code: SQLP,
        steps: [
          { say: 'This is the script that I gave to the SQL client. Four statements. Press Next.', lines: null },
          { say: '`parallelism.default` says how many parallel copies of each vertex to run. Two.', lines: G.span(SQLP, /parallelism\.default/) },
          { say: 'A **source table** that makes up orders, twenty a second, with random stores and prices. It is a table in name only: Flink reads it like a stream.', lines: G.span(SQLP, /CREATE TEMPORARY TABLE orders/, /fields\.store_id\.length/) },
          { say: 'A **sink table** that prints. It has a primary key on the store, because the query will update the count of a store again and again.', lines: G.span(SQLP, /CREATE TEMPORARY TABLE counts/) },
          { say: 'And the query. It keeps the orders over 350 cents, groups them by store, counts and sums. When the client runs it, the job is **submitted** and keeps running on the cluster. The next screens look at it.', lines: G.span(SQLP, /INSERT INTO counts/), run: true }
        ],
        result: { cols: PL.cols, rows: PL.rows, msg: 'the job graph that the cluster made from it' },
        note: 'Recorded: the table is the plan that the REST interface returned for this script. The statement ran for as long as the job was left running, and was then cancelled.'
      }),

      B.rows({
        id: 'm1-plan', t: 1, src: 'rec', title: 'The job graph of the running job',
        steps: [
          {
            say: 'Two vertices. Vertex 1 is the source and the filter, **chained**. Vertex 2 is the aggregation, a projection, a check and the sink, also chained. Between them the records are sent by **HASH**. Both have parallelism 2.',
            tabs: [{ layer: 'RECORDED', name: 'GET /jobs/<id>/plan', c: 'raw', cols: PL.cols, rows: PL.rows, trk: 1 }],
            notes: ['Recorded. The operators in a chain have the numbers that the planner gave them, for instance [4] for the aggregation.']
          },
          {
            say: 'The names that the web UI shows for the same vertices. A vertex is named after its chained operators. Once a job grows to twenty operators, these names are how you find the slow one.',
            tabs: [{ layer: 'RECORDED', name: 'The vertices and their status', c: 'raw', cols: ['Vertex'], rows: PV.split('\n').map(function (l) { return [l]; }), trk: 1 }],
            notes: ['Recorded. Four tasks (two vertices times two) were running, and the job used ' + JB.slots_used + ' slots.']
          },
          {
            say: 'The planner can show its plan without running anything. `EXPLAIN` prints the plan of the same query. You read it from the bottom up: scan, filter, then the hash exchange, then the aggregation.',
            tabs: [{ layer: 'RECORDED', name: 'EXPLAIN, the optimized execution plan', c: 'raw', cols: ['Plan'], rows: XP.split('\n').map(function (l) { return [l]; }), trk: 2 }],
            notes: ['Recorded. <code>Exchange(distribution=[hash[store_id]])</code> is the HASH edge between the two vertices.']
          }
        ]
      }),

      B.code({
        id: 'm1-json', t: 2, src: 'rec', title: 'The plan as the REST interface returns it', file: 'plan.json', lang: 'json', code: PJ,
        steps: [
          { say: 'This is the JSON that the web UI draws its graph from. Press Next.', lines: null },
          { say: 'The job has a **type**, `STREAMING`, and a name that Flink made from the INSERT statement.', lines: G.span(PJ, /"name":/, /"type":/) },
          { say: 'Each **node** is a vertex. This one is the aggregation: parallelism 2, and a description that lists the operators chained inside it.', lines: G.span(PJ, /"id": "v2"/, /"description"/) },
          { say: 'Its **input** is vertex 1, and `ship_strategy` is **HASH**: the records are partitioned by the key.', lines: G.span(PJ, /"inputs"/, /"ship_strategy"/) },
          { say: 'And the source vertex: a scan and a calc. It has no inputs.', lines: G.span(PJ, /"id": "v1"/, /"description": "\[1\]/) }
        ],
        note: 'Recorded: the plan of the job, with the long ids replaced by v1 and v2.'
      }),

      B.rows({
        id: 'm1-slots', t: 1, src: 'rec', title: 'Slots: the parallelism decides, not the number of tasks',
        steps: [
          {
            say: 'I ran the same job with parallelism 1, 2, 4 and 5 on the cluster of four slots. Look at the second and third columns. A job of parallelism 4 has **8 tasks**, two vertices times four, but uses only **4 slots**. Tasks of the same position share a slot.',
            tabs: [{ layer: 'RECORDED', name: 'One job, four parallelisms, a cluster of four slots', c: 'raw', cols: SL.cols.slice(0, 4), rows: SL.rows.map(function (r) { return r.slice(0, 4); }), trk: 2 }],
            notes: ['Recorded. The cluster has ' + CL.slots_total + ' slots in all.']
          },
          {
            say: 'Parallelism 5 needs five slots and the cluster has four. Flink does not wait. The job **fails at once** with a `NoResourceAvailableException`. This is the error you will see when someone raises the parallelism above the number of slots.',
            tabs: [{ layer: 'RECORDED', name: 'The error of the job with parallelism 5', c: 'raw', cols: ['Message'], rows: [[slotRow(5)[4]]], trk: 0 }],
            notes: ['Recorded. The cluster waits for a TaskManager to start only when the deployment can add one, for instance on Kubernetes.']
          }
        ]
      }),

      B.rows({
        id: 'm1-chain', t: 1, src: 'rec', title: 'Operator chaining: why the job had two vertices',
        steps: [{
          say: 'Chaining glues operators that do not need a shuffle into one task, so records pass by a method call instead of a network buffer. The same job with chaining switched off (`pipeline.operator-chaining.enabled` false) has **' + CH.rows[1][1] + ' vertices** instead of ' + CH.rows[0][1] + ', and ' + CH.rows[1][2] + ' tasks instead of ' + CH.rows[0][2] + '. The work is the same. The cost is more threads and more hand-overs.',
          tabs: [{ layer: 'RECORDED', name: 'The same job with chaining on and off, parallelism 2', c: 'raw', cols: ['Chaining', 'Vertices', 'Tasks', 'Names of the vertices'], rows: CH.rows, trk: 1 }],
          notes: ['Recorded. You switch chaining off, or start a new chain, on purpose only to find a slow operator in the web UI: each vertex then has its own busy time.']
        }]
      }),

      B.widget({ id: 'm1-lab', kind: 'parallelismlab', t: 1, src: 'rec', title: 'Lab: parallelism, chaining and slots' }),

      B.term({
        id: 'm1-cli', t: 2, src: 'rec', title: 'The command line and the REST interface',
        say: 'Two ways to ask the cluster what it is running. The `flink list` command first. Then the REST paths that the web UI uses: every one of them answered while the job ran.',
        lines: [].concat(
          G.plain(LS, { cmd: 'bin/flink list', d: 60 }),
          [{ c: 'dim', t: '# the REST interface, the same JobManager', d: 500 }],
          RS.rows.map(function (r) { return { c: r[2] === 'works' ? 'ok' : 'err', t: 'GET ' + r[0] + '   ' + r[1], d: 60 }; })
        ),
        after: 'Every path answered. The job id in the list is the one you pass to `flink stop`, `flink cancel` and to the REST paths. The checkpoints path is where mission 4 reads its numbers.',
        afterKind: 'tip',
        doneSay: 'The web UI, the command line and your own scripts all talk to the same REST interface of the JobManager.'
      }),

      B.quiz({
        id: 'm1-q1', t: 1,
        q: 'A job has two vertices and runs with parallelism 4. How many slots does it need?',
        opts: [
          { t: '4, because tasks of the same job share slots', fb: '' },
          { t: '8, one for every task', fb: 'In the recording a job with 8 tasks used 4 slots.' },
          { t: '2, one for every vertex', fb: 'Vertices do not decide it. The highest parallelism does.' },
          { t: '1, because one TaskManager runs the job', fb: 'A slot holds one task of each vertex, so parallelism 4 needs four slots.' }
        ],
        ok: 0,
        why: 'Slot sharing lets one slot run one task of every vertex of the job. The slots a job needs are the highest parallelism in it. In the recording, parallelism 4 meant 8 tasks in 4 slots.'
      }),

      B.quiz({
        id: 'm1-q2', t: 1,
        q: 'The cluster has 4 slots and a job asks for parallelism 5. What does Flink do?',
        opts: [
          { t: 'Runs it with 4 tasks and drops the fifth', fb: 'Flink never changes the parallelism you ask for.' },
          { t: 'Fails the job with NoResourceAvailableException', fb: '' },
          { t: 'Runs two tasks in one slot', fb: 'Tasks of the same vertex never share a slot.' },
          { t: 'Waits for ever until a slot appears', fb: 'In the recording the job failed at once.' }
        ],
        ok: 1,
        why: 'The scheduler could not get five slots, so the job failed. Lower the parallelism, or add a TaskManager.'
      }),

      B.bug({
        id: 'm1-bug', t: 1, q: 'The cluster of this course has four slots in all. This script is submitted, and the job fails at once. Click the line that causes it.',
        file: 'job.sql', lang: 'sql',
        code: ["SET 'parallelism.default' = '6';", "CREATE TEMPORARY TABLE orders (order_id BIGINT, store_id STRING) WITH ('connector' = 'datagen');", "CREATE TEMPORARY TABLE counts (store_id STRING, n BIGINT, PRIMARY KEY (store_id) NOT ENFORCED) WITH ('connector' = 'print');", 'INSERT INTO counts SELECT store_id, COUNT(*) FROM orders GROUP BY store_id;'].join('\n'),
        bad: [1],
        hint: 'How many slots does the job need, and how many does the cluster have?',
        why: 'Parallelism 6 needs six slots and the cluster has four, so the scheduler fails the job with `NoResourceAvailableException`. The query is fine.',
        fix: ["SET 'parallelism.default' = '4';", "CREATE TEMPORARY TABLE orders (order_id BIGINT, store_id STRING) WITH ('connector' = 'datagen');", "CREATE TEMPORARY TABLE counts (store_id STRING, n BIGINT, PRIMARY KEY (store_id) NOT ENFORCED) WITH ('connector' = 'print');", 'INSERT INTO counts SELECT store_id, COUNT(*) FROM orders GROUP BY store_id;'].join('\n'),
        cheer: 'Parallelism has to fit in the slots.'
      }),

      B.order({
        id: 'm1-ord', t: 1, q: 'Put what happens when you submit a SQL job to a running cluster in order.',
        items: [
          'The client sends the job to the JobManager over REST',
          'The planner has turned the SQL into a job graph of vertices',
          'The JobManager asks for as many slots as the highest parallelism',
          'The tasks are deployed to the slots of the TaskManagers',
          'Records flow between the tasks, and the job runs until it is cancelled'
        ],
        why: 'The client submits, the plan becomes a job graph, slots are requested and given, tasks are deployed, and then the data moves. If the slots are missing, the job fails at the third step.'
      }),

      B.incident({
        id: 'm1-inc', t: 1, src: 'rec', title: 'Incident: the new job fails the moment it starts', time: '09:40',
        alert: '**A colleague raised the parallelism of the order-counting job from 2 to 5 to "make it faster", and the job now fails at once.** The web UI shows the job as FAILED, with no task running. The cluster has two TaskManagers with two slots each.',
        clues: ['The error names NoResourceAvailableException', 'The cluster has 4 slots in all', 'The job asks for parallelism 5'],
        opts: [
          { t: 'Lower the parallelism to 4 or less, or start another TaskManager, then submit again', fb: '' },
          { t: 'Restart the JobManager', fb: 'The JobManager is fine. It told you correctly that there are not enough slots.' },
          { t: 'Turn operator chaining off', fb: 'That would add vertices and tasks, not slots.' },
          { t: 'Increase the heap of the TaskManagers', fb: 'Memory is not the problem. The number of slots is.' }
        ],
        best: 0,
        why: 'A job needs as many slots as its highest parallelism. In the recording parallelism 4 used 4 of 4 slots, and parallelism 5 failed at once with NoResourceAvailableException. A bigger number does not make it faster than the cluster allows.',
        checks: [['Read the exception of the job', 'It names the missing slots.'], ['Look at GET /overview', 'slots-total against the parallelism you asked for.'], ['Check the task slots setting of each TaskManager', 'taskmanager.numberOfTaskSlots.']],
        tell: 'The job asked for five slots and the cluster has four, so it failed at once. I lower the parallelism to four, or add a TaskManager, and I check the slots before I change parallelism.',
        prevent: ['Compare parallelism with the slots in a review', 'Alert when the slots in use come close to the slots in all', 'Keep the TaskManager count in code, next to the job']
      }),

      B.qa({
        id: 'qa-arch', t: 1, tag: 'Architecture', secs: 75,
        q: 'What are the JobManager, the TaskManagers and the slots?',
        pts: ['JobManager plans, schedules, coordinates checkpoints', 'TaskManagers run the tasks', 'A slot is a fixed share of a TaskManager', 'Tasks share slots', 'Records go between TaskManagers'],
        short: 'The **JobManager** is the control process. It receives a job, turns it into a job graph, asks for slots, deploys the tasks, triggers checkpoints and decides what to do on a failure. The **TaskManagers** are the worker processes: they run the tasks and move the records between them directly. Each TaskManager has a fixed number of **slots**, which divide its memory. In my recording there were two TaskManagers with two slots each. The tasks of one job share slots, one task of each vertex in a slot, so a job needs as many slots as its parallelism: eight tasks used four slots.',
        fu: [['Does data pass through the JobManager?', 'No. Records move directly between TaskManagers. The JobManager only controls.'], ['What if a TaskManager dies?', 'The JobManager notices through the heartbeat, restarts the tasks from the last checkpoint on the slots that are left.']],
        trap: 'Saying that the JobManager processes the data, or that a slot is a CPU core. A slot is a share of memory, and one task of each vertex runs in it.',
        real: 'We have eight slots and a job with parallelism ten. What happens, and what do you change?'
      }),

      B.qa({
        id: 'qa-chain', t: 1, tag: 'Architecture', secs: 60,
        q: 'What is operator chaining and why does Flink do it?',
        pts: ['Operators without a shuffle run in one task', 'Calls instead of network buffers', 'A hash edge breaks the chain', 'Can be turned off to find a slow operator', 'Fewer threads and less copying'],
        short: 'Chaining runs neighbouring operators in the **same task and thread**, so a record passes by a method call instead of through a serialized network buffer. Operators are chained when there is no shuffle between them: a source and a filter, or an aggregation and its sink. A `keyBy` or a hash exchange breaks the chain, because records have to go to another task. In my recording the job had two vertices with chaining and six without, for the same work: 4 tasks against 12. It is on by default. I switch it off only to give each operator its own busy-time numbers when I look for a slow one.',
        fu: [['Where is a chain broken?', 'At a hash or rebalance exchange, and when parallelism changes between two operators.'], ['Can I control it?', 'Yes: disableChaining or startNewChain in the DataStream API, and pipeline.operator-chaining.enabled for the job.']],
        trap: 'Saying that every operator is its own task. By default neighbouring operators share one.'
      }),

      B.qa({
        id: 'qa-par', t: 2, tag: 'Architecture', secs: 75,
        q: 'How do parallelism and slots relate, and how do you size them?',
        pts: ['Parallelism is the copies of a vertex', 'A job needs slots equal to its highest parallelism', 'Tasks share slots', 'Fails with NoResourceAvailable if too few', 'Size from the slowest step and the key skew'],
        short: '**Parallelism** is how many parallel tasks run each vertex. With slot sharing a slot runs one task of every vertex, so the job needs as many slots as its highest parallelism. In my recording parallelism 1, 2 and 4 used 1, 2 and 4 slots, and parallelism 5 on four slots failed at once. For sizing, I start from the slowest step: if one task handles about a hundred records a second and I need four hundred, I need four tasks there. I also look at the keys, because one key always goes to one task, so a very busy key limits what more parallelism can do.',
        fu: [['Can I change parallelism of a running job?', 'Not in place. You stop it with a savepoint and start it again with another parallelism. Mission 4 does it.'], ['What is max parallelism?', 'The number of key groups, 128 by default. It is fixed for the life of the state, and it caps the parallelism you can ever choose.']],
        trap: 'Believing that more parallelism is always faster. It is capped by the slots, by the number of keys and by the slowest or busiest key.'
      }),

      B.recap({
        id: 'm1-recap', n: 1, badge: 'Cluster Reader', color: '#FBCFE8',
        pts: [
          'A cluster is a **JobManager** (plans, schedules, coordinates) and **TaskManagers** (run tasks). The recording: three Java processes, ' + CL.slots_total + ' slots.',
          'A query becomes a **job graph** of vertices. A **hash** edge, from a key, separates them, and **chaining** glues the rest.',
          'A job needs as many **slots** as its highest parallelism. Parallelism 4 meant 8 tasks in 4 slots, and parallelism 5 failed at once.',
          'The **REST interface** on port ' + CL.rest_port + ' answers for the web UI, the command line and your scripts.',
          'A TaskManager splits its memory: task heap, managed memory, network buffers, and the rest.'
        ]
      })
    ]
  });
})();
