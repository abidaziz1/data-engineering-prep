/* Microsoft Fabric for data engineers: tutorial settings. Edit and reload.
   coach: which illustrated coach teaches this course (see js/coach-faye.js). This course uses Coach Faye.
   coachPhoto: put a picture next to this file (for example coach.jpg) and set the path. Leave it empty to keep the illustration. */
window.LAB = window.LAB || {};
LAB.config = {
  id: 'fabric',
  storageKey: 'dep.fabric.v1',
  coachPhoto: '',
  coach: { id: 'faye', name: 'Faye', role: 'your Microsoft Fabric coach' },
  defaultTrack: 'senior',
  goalsTitle: 'After this mission you can:',
  welcome: {
    titleHtml: 'Microsoft Fabric<br><span>for data engineers</span>',
    sub: 'Capacity and workspaces · OneLake and Delta · Notebooks and Spark · Bronze, silver, gold · Table care · The Warehouse and Direct Lake · Pipelines · Capacity, security and delivery',
    say: 'Hi, I am Coach Faye. Brewline wants one place for its orders, its stores and its reports, and the team has chosen Microsoft Fabric. You will see how a workspace sits on a capacity, why a lakehouse table is a folder of Parquet files with a log, how a notebook lands, cleans and merges a daily file so that a rerun changes nothing, what a schema mismatch, a constraint and a vacuum do to a table, where the Warehouse and the SQL analytics endpoint fit, what a pipeline adds, why a Power BI model can read the files directly, and how capacity throttling decides whether your night job runs. The behavior of the tables was recorded on real Apache Spark and Delta Lake. Fabric itself did not run, and I tell you on every screen which is which. Pick a path first.',
    question: 'Which path fits you?',
    note: 'Switch any time from the Map button. Progress saves in this browser. Microsoft Fabric needs a Microsoft account and a capacity, so it did not run for this course. The table behavior comes from open-source Apache Spark 4.0.1 and Delta Lake 4.0.1 on one machine with made-up Brewline data, and everything about Fabric itself comes from documentation that I read through search summaries, because the documentation site could not be opened from where this was built. I say on each screen what is recorded and what is from documentation.'
  },
  rhythm: [
    { k: 'see', b: 'SEE', t: 'Watch what a table, a notebook and a capacity do' },
    { k: 'try', b: 'TRY', t: 'Labs, quizzes, bug hunts and design decisions' },
    { k: 'say', b: 'SAY', t: 'Answer the interview questions out loud' }
  ],
  tracks: [
    { id: 'junior', level: 1, name: 'Junior path', text: 'What a junior data engineer is asked about Fabric, and expected to do.' },
    { id: 'senior', level: 2, name: 'Senior path', text: 'Adds table care, the Warehouse decision, orchestration and the capacity and security decisions that seniors own.' },
    { id: 'all', level: 3, name: 'Everything', text: 'Adds the finer points: checkpoints, protocol versions, partition costs, change data feed, V-Order and Git item files.' }
  ],
  tierLabels: { 2: 'Senior', 3: 'Extra' },
  srcLabels: { rec: 'Recorded', docs: 'From documentation' },
  levels: ['Newcomer', 'Map Reader', 'Log Reader', 'Notebook Runner', 'Medallion Builder', 'Table Keeper', 'SQL Bridge', 'Pipeline Owner', 'Capacity Steward', 'Fabric Partner'],
  miniMap: {
    caption: 'You are here in the Brewline Fabric course:',
    row1: [['src', 'Capacity'], ['stg', 'OneLake'], ['ing', 'Spark'], ['mart', 'Medallion'], ['air', 'Table care']],
    row2: [['mon', 'SQL'], ['qual', 'Pipelines'], ['ci', 'Governance']]
  },
  langLabels: { sql: 'SQL', python: 'Python', json: 'JSON', bash: 'Shell', yaml: 'YAML', text: 'Text', ini: 'Config', tsql: 'T-SQL' }
};
