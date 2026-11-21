/* Project: the Brewline CDC pipeline (PostgreSQL, Debezium, Kafka, Spark and Delta Lake). Tutorial settings. Edit and reload.
   coach: which illustrated coach teaches this walkthrough (see js/coach-ari.js). The projects of this library share Coach Ari.
   coachPhoto: put a picture next to this file (for example coach.jpg) and set the path. Leave it empty to keep the illustration. */
window.LAB = window.LAB || {};
LAB.config = {
  id: 'project-cdc',
  storageKey: 'dep.project-cdc.v1',
  coachPhoto: '',
  coach: { id: 'ari', name: 'Ari', role: 'your project coach' },
  defaultTrack: 'senior',
  goalsTitle: 'After this mission you can:',
  welcome: {
    titleHtml: 'Project: the Brewline<br><span>CDC pipeline</span>',
    sub: 'PostgreSQL · Debezium · Kafka · Spark streaming · Delta Lake · ordered by the log, with deletes and a gate',
    say: 'Hi, I am Coach Ari. This pipeline copies the changes of a shop database into a table that always matches it. I ran it for real: PostgreSQL, Debezium, Kafka and Spark. I deleted rows, crashed a batch and stopped the connector. The repository is projects/brewline-cdc. Pick a path first.',
    question: 'Which path fits you?',
    note: 'Switch any time from the Map button. Progress saves in this browser. A cluster, a schema registry, cloud storage and a Docker build did not run, and the screens say so.'
  },
  rhythm: [
    { k: 'see', b: 'SEE', t: 'Watch the real changes travel from the database to the table' },
    { k: 'try', b: 'TRY', t: 'Explore the runs, hunt bugs, and make the decisions' },
    { k: 'say', b: 'SAY', t: 'Defend the project out loud, as in an interview' }
  ],
  tracks: [
    { id: 'junior', level: 1, name: 'Walkthrough', text: 'Build it and run it: every file, every run, and what each message holds.' },
    { id: 'senior', level: 2, name: 'Senior path', text: 'Adds the trade-offs, the failure drills, and the questions that a reviewer asks about change data capture.' },
    { id: 'all', level: 3, name: 'Everything', text: 'Adds a finer point: what an update event says about the row before the change.' }
  ],
  tierLabels: { 2: 'Senior', 3: 'Extra' },
  srcLabels: { rec: 'Recorded', docs: 'From documentation' },
  levels: ['Newcomer', 'Capturer', 'Applier', 'Operator', 'Defender'],
  miniMap: {
    caption: 'You are here in the Brewline CDC project:',
    row1: [['src', 'Capture'], ['stg', 'Apply'], ['ing', 'Operate']],
    row2: [['mon', 'Defend']]
  },
  langLabels: { sql: 'SQL', python: 'Python', json: 'JSON', bash: 'Shell', yaml: 'YAML', text: 'Text', ini: 'Config' }
};
