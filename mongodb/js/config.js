/* MongoDB for data engineers: tutorial settings. Edit and reload.
   coach: which illustrated coach teaches this course (see js/coach-mika.js). This course uses Coach Mika.
   coachPhoto: put a picture next to this file (for example coach.jpg) and set the path. Leave it empty to keep the illustration. */
window.LAB = window.LAB || {};
LAB.config = {
  id: 'mongodb',
  storageKey: 'dep.mongodb.v1',
  coachPhoto: '',
  coach: { id: 'mika', name: 'Mika', role: 'your MongoDB coach' },
  defaultTrack: 'senior',
  goalsTitle: 'After this mission you can:',
  welcome: {
    titleHtml: 'MongoDB<br><span>for data engineers</span>',
    sub: 'Documents · The aggregation pipeline · Indexes and explain · Validation, writes and change streams',
    say: 'Hi, I am Coach Mika. A data engineer meets MongoDB as a source: documents with shapes that nobody agreed on, pipelines that someone else wrote, and a change stream that feeds the lake. Every output here ran on a real mongod 8.0. This is a short course. Pick a path first.',
    question: 'Which path fits you?',
    note: 'Switch any time from the Map button. Progress saves in this browser. A sharded cluster, Atlas and the Kafka connector did not run for this course, and the screens say so. The outputs come from one real recording.'
  },
  rhythm: [
    { k: 'see', b: 'SEE', t: 'Watch a real server answer and explain itself' },
    { k: 'try', b: 'TRY', t: 'Labs, quizzes, bug hunts and design decisions' },
    { k: 'say', b: 'SAY', t: 'Answer the interview questions out loud' }
  ],
  tracks: [
    { id: 'junior', level: 1, name: 'Junior path', text: 'What a junior data engineer is asked about MongoDB, and expected to do.' },
    { id: 'senior', level: 2, name: 'Senior path', text: 'Adds compound-index order, transactions, the document size limit and the decisions that seniors own.' },
    { id: 'all', level: 3, name: 'Everything', text: 'Adds the finer points: what an update event holds when the document is already gone.' }
  ],
  tierLabels: { 2: 'Senior', 3: 'Extra' },
  srcLabels: { rec: 'Recorded', docs: 'From documentation' },
  levels: ['Newcomer', 'Document Writer', 'Pipeline Builder', 'Index Reader', 'Schema Keeper', 'MongoDB Partner'],
  miniMap: {
    caption: 'You are here in the Brewline MongoDB course:',
    row1: [['src', 'Documents'], ['stg', 'Pipeline'], ['ing', 'Indexes']],
    row2: [['mart', 'Validation'], ['mon', 'Streams']]
  },
  langLabels: { sql: 'SQL', python: 'Python', json: 'JSON', bash: 'Shell', yaml: 'YAML', text: 'Text', ini: 'Config' }
};
