/* Apache Spark for data engineers: tutorial settings. Edit and reload.
   coach: which illustrated coach teaches this course (see shared/js/coach.js). This course uses Coach Kai.
   coachPhoto: put a picture next to this file (for example coach.jpg) and set the path. Leave it empty to keep the illustration. */
window.LAB = window.LAB || {};
LAB.config = {
  id: 'spark',
  storageKey: 'dep.spark.v1',
  coachPhoto: '',
  coach: { id: 'kai', name: 'Kai', role: 'your Spark coach' },
  defaultTrack: 'senior',
  goalsTitle: 'After this mission you can:',
  welcome: {
    titleHtml: 'Apache Spark<br><span>for data engineers, from a query plan to production</span>',
    sub: 'The plan · Partitions and shuffles · Joins · Skew and adaptive execution · Memory and caching · Files and layout · Spark SQL and ANSI mode · Python and UDFs · Structured Streaming · Delta Lake · Tests · spark-submit · Debugging from the event log',
    say: 'Hi, I am Coach Kai. This course follows Brewline, the coffee retailer, as its data team learns to run Apache Spark properly. You will read the plan that Spark builds for a query, count the tasks of a shuffle, watch a hot store slow one task down, see what a cache really holds, find out why a folder of small files hurts, and replay a stream with a watermark. Every number comes from a real Spark 4.0.1 that I ran on one machine and read back from its event log, the file that the Spark UI is drawn from. Nothing ran on a cluster, and I say what that changes. Pick a path and press Next.',
    question: 'Which path fits you?',
    note: 'Switch any time from the Map button. Progress saves in this browser. Nothing in this course ran on a cluster, on YARN, on Kubernetes or on a hosted service, and no Kafka or Iceberg was run. I say on every screen what is recorded and what comes from documentation.'
  },
  rhythm: [
    { k: 'see', b: 'SEE', t: 'Watch plans, tasks, partitions and batches move, step by step' },
    { k: 'try', b: 'TRY', t: 'Labs, quizzes, bug hunts and design decisions' },
    { k: 'say', b: 'SAY', t: 'Answer the interview questions out loud' }
  ],
  tracks: [
    { id: 'junior', level: 1, name: 'Junior path', text: 'What a junior data engineer is asked about Spark, and expected to do.' },
    { id: 'senior', level: 2, name: 'Senior path', text: 'Adds the tuning, design, streaming and operations decisions that seniors own.' },
    { id: 'all', level: 3, name: 'Everything', text: 'Adds the newest features and the deepest follow-up questions.' }
  ],
  tierLabels: { 2: 'Senior', 3: 'Extra' },
  srcLabels: { rec: 'Recorded', docs: 'From documentation' },
  levels: ['Rookie', 'Cluster Reader', 'Plan Reader', 'Partition Planner', 'Join Chooser', 'Skew Tamer', 'Cache Keeper', 'File Folder', 'SQL Smith', 'UDF Skeptic', 'Stream Watcher', 'Table Builder', 'Test Writer', 'Submitter', 'Debugger', 'Spark Architect'],
  miniMap: {
    caption: 'You are here in the Brewline Spark course:',
    row1: [['src', 'Read'], ['stg', 'Plan'], ['ing', 'Shuffle'], ['mart', 'Write'], ['con', 'Stream']],
    row2: [['sf', 'Memory'], ['air', 'Joins'], ['qual', 'Tests'], ['mon', 'Debug'], ['ci', 'Submit'], ['snap', 'Tables']]
  },
  sql: { role: 'analyst', wh: 'Spark SQL 4.0.1, local mode', db: 'brewline' },
  langLabels: { sql: 'Spark SQL', python: 'PySpark', json: 'JSON', bash: 'Shell', yaml: 'YAML', text: 'Text', scala: 'Scala', js: 'JavaScript' }
};
