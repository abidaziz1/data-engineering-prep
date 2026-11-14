/* Apache Kafka for data engineers: tutorial settings. Edit and reload.
   coach: which illustrated coach teaches this course (see shared/js/coach.js). This course uses Coach Mara.
   coachPhoto: put a picture next to this file (for example coach.jpg) and set the path. Leave it empty to keep the illustration. */
window.LAB = window.LAB || {};
LAB.config = {
  id: 'kafka',
  storageKey: 'dep.kafka.v1',
  coachPhoto: '',
  coach: { id: 'mara', name: 'Mara', role: 'your Kafka coach' },
  defaultTrack: 'senior',
  goalsTitle: 'After this mission you can:',
  welcome: {
    titleHtml: 'Apache Kafka<br><span>for data engineers, from a message to a pipeline</span>',
    sub: 'The log on disk · Topics, partitions and keys · Producers · Replication and failure · Consumer groups · Delivery guarantees and transactions · Retention and compaction · Kafka Connect · Change data capture · Schemas · Kafka Streams · Security · Operations',
    say: 'Hi, I am Coach Mara. This course follows Brewline, the coffee retailer, as its team puts every till, app order and refund on Kafka. You will open a partition on disk and read the bytes, watch one store make one partition three times as busy as the rest, kill a broker in the middle of a write, lose a message on purpose, and watch a transaction cut in half. Every number comes from a real Apache Kafka 4.4.0 that I ran on one machine, three brokers in KRaft mode, with the real command line tools, the real clients, Kafka Connect, Kafka Streams and a real Debezium on PostgreSQL. Nothing ran on a cloud service, and I say what that changes. Pick a path and press Next.',
    question: 'Which path fits you?',
    note: 'Switch any time from the Map button. Progress saves in this browser. Nothing in this course ran on a managed service, on Kubernetes or on a model, and the Confluent Schema Registry and ksqlDB were not run. I say on every screen what is recorded and what comes from documentation.'
  },
  rhythm: [
    { k: 'see', b: 'SEE', t: 'Watch records, partitions, replicas and groups move, step by step' },
    { k: 'try', b: 'TRY', t: 'Labs, quizzes, bug hunts and design decisions' },
    { k: 'say', b: 'SAY', t: 'Answer the interview questions out loud' }
  ],
  tracks: [
    { id: 'junior', level: 1, name: 'Junior path', text: 'What a junior data engineer is asked about Kafka, and expected to do.' },
    { id: 'senior', level: 2, name: 'Senior path', text: 'Adds the durability, delivery, design and operations decisions that seniors own.' },
    { id: 'all', level: 3, name: 'Everything', text: 'Adds the newest features and the deepest follow-up questions.' }
  ],
  tierLabels: { 2: 'Senior', 3: 'Extra' },
  srcLabels: { rec: 'Recorded', docs: 'From documentation' },
  levels: ['Newcomer', 'Log Reader', 'Topic Builder', 'Partition Planner', 'Producer Pro', 'Replica Keeper', 'Group Member', 'Delivery Checker', 'Retention Keeper', 'Connector', 'Change Catcher', 'Schema Guard', 'Stream Builder', 'Gatekeeper', 'Operator', 'Kafka Architect'],
  miniMap: {
    caption: 'You are here in the Brewline Kafka course:',
    row1: [['src', 'Produce'], ['stg', 'Log'], ['ing', 'Replicate'], ['mart', 'Consume'], ['con', 'Stream']],
    row2: [['sf', 'Connect'], ['air', 'Schemas'], ['qual', 'Delivery'], ['mon', 'Operate'], ['ci', 'Secure'], ['snap', 'Retain']]
  },
  sql: { role: 'analyst', wh: 'Python 3 and the Kafka command line tools', db: 'brewline' },
  langLabels: { sql: 'SQL', python: 'Python', json: 'JSON', bash: 'Shell', yaml: 'YAML', text: 'Text', java: 'Java', js: 'JavaScript', properties: 'Properties' }
};
