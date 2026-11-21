/* Project: the Brewline lakehouse (Spark and Delta Lake). Tutorial settings. Edit and reload.
   coach: which illustrated coach teaches this walkthrough (see js/coach-ari.js). The projects of this library share Coach Ari.
   coachPhoto: put a picture next to this file (for example coach.jpg) and set the path. Leave it empty to keep the illustration. */
window.LAB = window.LAB || {};
LAB.config = {
  id: 'project-lakehouse',
  storageKey: 'dep.project-lakehouse.v1',
  coachPhoto: '',
  coach: { id: 'ari', name: 'Ari', role: 'your project coach' },
  defaultTrack: 'senior',
  goalsTitle: 'After this mission you can:',
  welcome: {
    titleHtml: 'Project: the Brewline<br><span>lakehouse</span>',
    sub: 'Spark · Delta Lake · bronze, silver, gold · a quarantine, a gate, a replay and a late event',
    say: 'Hi, I am Coach Ari. This is a whole medallion lakehouse, small enough to read in an afternoon. I ran it for real on Spark and Delta Lake for three days: a file delivered twice, a late event and a field that nobody announced. The repository is projects/brewline-lakehouse. Pick a path first.',
    question: 'Which path fits you?',
    note: 'Switch any time from the Map button. Progress saves in this browser. Cloud storage, a cluster, streaming and a Docker build did not run, and the screens say so.'
  },
  rhythm: [
    { k: 'see', b: 'SEE', t: 'Watch the real lakehouse run, replay and recover' },
    { k: 'try', b: 'TRY', t: 'Explore the runs, hunt bugs, and make the decisions' },
    { k: 'say', b: 'SAY', t: 'Defend the project out loud, as in an interview' }
  ],
  tracks: [
    { id: 'junior', level: 1, name: 'Walkthrough', text: 'Build it and run it: every file, every run, and what each layer holds.' },
    { id: 'senior', level: 2, name: 'Senior path', text: 'Adds the trade-offs, the failure drills, and the questions that a reviewer asks about a lakehouse.' },
    { id: 'all', level: 3, name: 'Everything', text: 'Adds a finer point: what Spark returns for a line that it cannot read.' }
  ],
  tierLabels: { 2: 'Senior', 3: 'Extra' },
  srcLabels: { rec: 'Recorded', docs: 'From documentation' },
  levels: ['Newcomer', 'Builder', 'Merger', 'Operator', 'Defender'],
  miniMap: {
    caption: 'You are here in the Brewline lakehouse project:',
    row1: [['src', 'Build'], ['stg', 'Silver and gold'], ['ing', 'Operate']],
    row2: [['mon', 'Defend']]
  },
  langLabels: { sql: 'SQL', python: 'Python', json: 'JSON', bash: 'Shell', yaml: 'YAML', text: 'Text', ini: 'Config' }
};
