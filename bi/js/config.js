/* BI dashboards for data engineers: tutorial settings. Edit and reload.
   coach: which illustrated coach teaches this course (see js/coach-bea.js). This course uses Coach Bea.
   coachPhoto: put a picture next to this file (for example coach.jpg) and set the path. Leave it empty to keep the illustration. */
window.LAB = window.LAB || {};
LAB.config = {
  id: 'bi',
  storageKey: 'dep.bi.v1',
  coachPhoto: '',
  coach: { id: 'bea', name: 'Bea', role: 'your BI coach' },
  defaultTrack: 'senior',
  goalsTitle: 'After this mission you can:',
  welcome: {
    titleHtml: 'BI dashboards<br><span>for data engineers: Power BI, Tableau and Looker</span>',
    sub: 'What a BI tool does with your tables · The model: grain, keys and joins that multiply · Import, extract or live · Measures and the semantic layer · Refresh and freshness · Performance and aggregates · Row-level security · The model as files in Git',
    say: 'Hi, I am Coach Bea. You build the tables, and somebody else builds the dashboard. This short course is about the part in between, because that is where your tables are judged. Brewline, the coffee retailer, has one sales dashboard in three tools. You will see a join double a number, an extract miss a refund, a refresh policy skip a month, and a filter decide who sees which region. It is the basics, for engineers. Pick a path first.',
    question: 'Which path fits you?',
    note: 'Switch any time from the Map button. Progress saves in this browser. Power BI, Tableau and Looker did not run for this course. The numbers come from SQL on a made-up star schema, from the engine behind a Tableau extract, from a LookML parser and from a Tableau file library, and I say on each screen what is recorded and what comes from documentation.'
  },
  rhythm: [
    { k: 'see', b: 'SEE', t: 'Watch a click on a dashboard become a query on your tables' },
    { k: 'try', b: 'TRY', t: 'Labs, quizzes, bug hunts and design decisions' },
    { k: 'say', b: 'SAY', t: 'Answer the interview questions out loud' }
  ],
  tracks: [
    { id: 'junior', level: 1, name: 'Junior path', text: 'What a junior data engineer is asked about BI tools, and expected to do.' },
    { id: 'senior', level: 2, name: 'Senior path', text: 'Adds the refresh, performance, security and deployment decisions that seniors own.' },
    { id: 'all', level: 3, name: 'Everything', text: 'Adds the finer points and the deepest follow-up questions.' }
  ],
  tierLabels: { 2: 'Senior', 3: 'Extra' },
  srcLabels: { rec: 'Recorded', docs: 'From documentation' },
  levels: ['Newcomer', 'Map Reader', 'Grain Keeper', 'Mode Chooser', 'Measure Writer', 'Refresh Planner', 'Query Tuner', 'Gatekeeper', 'Model Shipper', 'BI Partner'],
  miniMap: {
    caption: 'You are here in the Brewline BI course:',
    row1: [['src', 'Warehouse'], ['stg', 'Model'], ['ing', 'Mode'], ['mart', 'Measures'], ['air', 'Refresh']],
    row2: [['mon', 'Speed'], ['qual', 'Security'], ['ci', 'Files']]
  },
  sql: { role: 'bi_reader', wh: 'The Brewline warehouse (DuckDB in this course)', db: 'analytics' },
  langLabels: { sql: 'SQL', python: 'Python', json: 'JSON', bash: 'Shell', yaml: 'YAML', text: 'Text', lookml: 'LookML', dax: 'DAX', tmdl: 'TMDL', xml: 'XML', http: 'HTTP', tableau: 'Tableau calculation' }
};
