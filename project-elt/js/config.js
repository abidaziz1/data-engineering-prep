/* Project: the Brewline orders platform (dlt, DuckDB, dbt, Airflow). Tutorial settings. Edit and reload.
   coach: which illustrated coach teaches this walkthrough (see js/coach-ari.js). The projects of this library share Coach Ari.
   coachPhoto: put a picture next to this file (for example coach.jpg) and set the path. Leave it empty to keep the illustration. */
window.LAB = window.LAB || {};
LAB.config = {
  id: 'project-elt',
  storageKey: 'dep.project-elt.v1',
  coachPhoto: '',
  coach: { id: 'ari', name: 'Ari', role: 'your project coach' },
  defaultTrack: 'senior',
  goalsTitle: 'After this mission you can:',
  welcome: {
    titleHtml: 'Project: the Brewline<br><span>orders platform</span>',
    sub: 'dlt · DuckDB · dbt · Airflow · tests, a quality gate, a failure drill and a backfill',
    say: 'Hi, I am Coach Ari. This is a whole pipeline, small enough to read in an afternoon and honest enough to defend in a review. I ran every step for real: three days of a pretend shop through Airflow, a failure on day 3, its fix, and a backfill. The repository is in the folder projects/brewline-elt. Pick a path first.',
    question: 'Which path fits you?',
    note: 'Switch any time from the Map button. Progress saves in this browser. A cloud warehouse, a deployed Airflow and a CI run did not run for this project, and the screens say so. The outputs come from one real recording.'
  },
  rhythm: [
    { k: 'see', b: 'SEE', t: 'Watch the real pipeline run, fail and recover' },
    { k: 'try', b: 'TRY', t: 'Explore the runs, hunt bugs, and make the decisions' },
    { k: 'say', b: 'SAY', t: 'Defend the project out loud, as in an interview' }
  ],
  tracks: [
    { id: 'junior', level: 1, name: 'Walkthrough', text: 'Build it and run it: every file, every run, and what each tool does.' },
    { id: 'senior', level: 2, name: 'Senior path', text: 'Adds the trade-offs, the failure drills, and the questions that a reviewer asks about a pipeline.' },
    { id: 'all', level: 3, name: 'Everything', text: 'Adds a finer point: why dbt skipped seven things and not twenty-two.' }
  ],
  tierLabels: { 2: 'Senior', 3: 'Extra' },
  srcLabels: { rec: 'Recorded', docs: 'From documentation' },
  levels: ['Newcomer', 'Builder', 'Modeller', 'Operator', 'Defender'],
  miniMap: {
    caption: 'You are here in the Brewline platform project:',
    row1: [['src', 'Build'], ['stg', 'Model'], ['ing', 'Orchestrate']],
    row2: [['mart', 'Operate'], ['mon', 'Defend']]
  },
  langLabels: { sql: 'SQL', python: 'Python', json: 'JSON', bash: 'Shell', yaml: 'YAML', text: 'Text', ini: 'Config' }
};
