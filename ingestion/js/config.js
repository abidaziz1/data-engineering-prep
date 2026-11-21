/* Data ingestion for data engineers: tutorial settings. Edit and reload.
   coach: which illustrated coach teaches this course (see js/coach-remy.js). This course uses Coach Remy.
   coachPhoto: put a picture next to this file (for example coach.jpg) and set the path. Leave it empty to keep the illustration. */
window.LAB = window.LAB || {};
LAB.config = {
  id: 'ingestion',
  storageKey: 'dep.ingestion.v1',
  coachPhoto: '',
  coach: { id: 'remy', name: 'Remy', role: 'your ingestion coach' },
  defaultTrack: 'senior',
  goalsTitle: 'After this mission you can:',
  welcome: {
    titleHtml: 'Data ingestion<br><span>for data engineers</span>',
    sub: 'What a connector does · Incremental loads · Schema drift · Airbyte and Fivetran · Running it for real',
    say: 'Hi, I am Coach Remy. Every pipeline starts with getting the data in, and most of the incidents start there too: a duplicate, a deleted row that never left, a new column at 2 a.m. I ran dlt and an Airbyte connector for real, and I explain Fivetran from its documentation. Pick a path first.',
    question: 'Which path fits you?',
    note: 'Switch any time from the Map button. Progress saves in this browser. Fivetran, the Airbyte platform and CDC tools did not run for this course, and the screens say so. The outputs come from one real recording.'
  },
  rhythm: [
    { k: 'see', b: 'SEE', t: 'Watch a real load, and what it leaves behind' },
    { k: 'try', b: 'TRY', t: 'Labs, quizzes, bug hunts and design decisions' },
    { k: 'say', b: 'SAY', t: 'Answer the interview questions out loud' }
  ],
  tracks: [
    { id: 'junior', level: 1, name: 'Junior path', text: 'What a junior data engineer is asked about ingestion, and expected to do.' },
    { id: 'senior', level: 2, name: 'Senior path', text: 'Adds deletes and silent updates, contracts, state and backfills, pricing, and the decisions that seniors own.' },
    { id: 'all', level: 3, name: 'Everything', text: 'Adds the finer points: why one load catches a change that another one misses.' }
  ],
  tierLabels: { 2: 'Senior', 3: 'Extra' },
  srcLabels: { rec: 'Recorded', docs: 'From documentation' },
  levels: ['Newcomer', 'Loader', 'Cursor Keeper', 'Drift Spotter', 'Connector Picker', 'Pipeline Owner', 'Ingestion Partner'],
  miniMap: {
    caption: 'You are here in the Brewline ingestion course:',
    row1: [['src', 'Landscape'], ['stg', 'Incremental'], ['ing', 'Drift']],
    row2: [['mart', 'Connectors'], ['mon', 'Production']]
  },
  langLabels: { sql: 'SQL', python: 'Python', json: 'JSON', bash: 'Shell', yaml: 'YAML', text: 'Text', ini: 'Config' }
};
