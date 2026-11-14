/* Apache Flink for data engineers, the basics: tutorial settings. Edit and reload.
   coach: which illustrated coach teaches this course (see shared/js/coach.js). This course uses Coach Ines.
   coachPhoto: put a picture next to this file (for example coach.jpg) and set the path. Leave it empty to keep the illustration. */
window.LAB = window.LAB || {};
LAB.config = {
  id: 'flink',
  storageKey: 'dep.flink.v1',
  coachPhoto: '',
  coach: { id: 'ines', name: 'Ines', role: 'your Flink coach' },
  defaultTrack: 'senior',
  goalsTitle: 'After this mission you can:',
  welcome: {
    titleHtml: 'Apache Flink<br><span>the basics, for data engineers</span>',
    sub: 'The cluster and the job graph · Flink SQL and the changelog · Event time, watermarks and windows · State, checkpoints and recovery · Savepoints · Kafka, files and change data capture · Joins and state that grows · The DataStream API · Backpressure and deployment',
    say: 'Hi, I am Coach Ines. This is the short course: the basics of Apache Flink, in the order that job descriptions and interviews ask for them. Brewline, the coffee retailer, wants its orders counted while they happen, not tomorrow. You will watch a query turn into a stream of changes, see a watermark decide which orders are late, kill a TaskManager in the middle of a job and check what the job wrote, stop a job with a savepoint and start it again with more parallel tasks, and see a slow step push back on a fast source. Every number comes from a real Apache Flink 2.2.1 that I ran on one machine, with the real SQL client, the real Kafka connector, a real Apache Kafka 4.4.0, a real PostgreSQL 16 and a Java job that I compiled. Nothing ran on a managed service, and I say what that changes. Pick a path and press Next.',
    question: 'Which path fits you?',
    note: 'Switch any time from the Map button. Progress saves in this browser. Nothing in this course ran on Kubernetes, on YARN or on a managed service such as Amazon Managed Service for Apache Flink. I say on every screen what is recorded and what comes from documentation.'
  },
  rhythm: [
    { k: 'see', b: 'SEE', t: 'Watch records, windows, barriers and tasks move, step by step' },
    { k: 'try', b: 'TRY', t: 'Labs, quizzes, bug hunts and design decisions' },
    { k: 'say', b: 'SAY', t: 'Answer the interview questions out loud' }
  ],
  tracks: [
    { id: 'junior', level: 1, name: 'Junior path', text: 'What a junior data engineer is asked about Flink, and expected to do.' },
    { id: 'senior', level: 2, name: 'Senior path', text: 'Adds the state, recovery, upgrade and operations decisions that seniors own.' },
    { id: 'all', level: 3, name: 'Everything', text: 'Adds the finer points and the deepest follow-up questions.' }
  ],
  tierLabels: { 2: 'Senior', 3: 'Extra' },
  srcLabels: { rec: 'Recorded', docs: 'From documentation' },
  levels: ['Newcomer', 'Cluster Reader', 'Table Streamer', 'Clock Keeper', 'State Keeper', 'Connector', 'Join Planner', 'Stream Coder', 'Operator', 'Flink Architect'],
  miniMap: {
    caption: 'You are here in the Brewline Flink course:',
    row1: [['src', 'Cluster'], ['stg', 'SQL'], ['ing', 'Time'], ['mart', 'State'], ['con', 'Connect']],
    row2: [['sf', 'Joins'], ['air', 'DataStream'], ['qual', 'Run']]
  },
  sql: { role: 'analyst', wh: 'Flink SQL and the Flink command line tools', db: 'brewline' },
  langLabels: { sql: 'SQL', python: 'Python', json: 'JSON', bash: 'Shell', yaml: 'YAML', text: 'Text', java: 'Java', js: 'JavaScript', properties: 'Properties' }
};
