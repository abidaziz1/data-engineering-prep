/* SQL for data engineers: tutorial settings. Edit and reload.
   coach: which illustrated coach teaches this course (see shared/js/coach.js and js/coach-tomas.js). This course uses Coach Tomas.
   coachPhoto: put a picture next to this file (for example coach.jpg) and set the path. Leave it empty to keep the illustration. */
window.LAB = window.LAB || {};
LAB.config = {
  id: 'sql',
  storageKey: 'dep.sql.v1',
  coachPhoto: '',
  coach: { id: 'tomas', name: 'Tomas', role: 'your SQL coach' },
  defaultTrack: 'senior',
  goalsTitle: 'After this mission you can:',
  welcome: {
    titleHtml: 'SQL<br><span>for data engineers, from SELECT to a plan you can read</span>',
    sub: 'How a query runs · NULLs · Joins and fan-out · Aggregation · Subqueries and CTEs · Window functions · Dates, text and JSON · Patterns · Changing data · Transactions · Indexes and plans · Modelling · Dialects and checks',
    say: 'Hi, I am Coach Tomas. This course follows the data team of Brewline, the coffee retailer, as they write the SQL that pipelines and dashboards depend on. You will see in which order a query really runs, why NULL breaks comparisons, how a join doubles a total, what a window frame includes, how two sessions disturb each other, and what a query plan says about the work. First, tell me which path fits you.',
    question: 'Which path fits you?',
    note: 'Switch any time from the Map button. Progress saves in this browser. Every result in this course was run on one machine with made-up Brewline data, on DuckDB, PostgreSQL 16 and SQLite, and I say on each screen which engine gave it. Nothing ran on Snowflake, BigQuery, Redshift, SQL Server, MySQL or Oracle: where a screen shows those dialects, it says translated, not run.'
  },
  rhythm: [
    { k: 'see', b: 'SEE', t: 'Watch a query run, clause by clause, on real data' },
    { k: 'try', b: 'TRY', t: 'Labs, quizzes, bug hunts and coding rounds that were run' },
    { k: 'say', b: 'SAY', t: 'Answer the interview questions out loud' }
  ],
  tracks: [
    { id: 'junior', level: 1, name: 'Junior path', text: 'What a junior data engineer is asked about SQL, and expected to write.' },
    { id: 'senior', level: 2, name: 'Senior path', text: 'Adds plans, transactions, modelling and the design decisions that seniors own.' },
    { id: 'all', level: 3, name: 'Everything', text: 'Adds the newest features and the deepest follow-up questions.' }
  ],
  tierLabels: { 2: 'Senior', 3: 'Extra' },
  srcLabels: { rec: 'Recorded', docs: 'From documentation' },
  levels: ['Rookie', 'Query Reader', 'Null Spotter', 'Join Keeper', 'Group Maker', 'Subquery Writer', 'Window Opener', 'Time Keeper', 'Pattern Finder', 'Loader', 'Lock Watcher', 'Plan Reader', 'Model Builder', 'Dialect Speaker', 'SQL Architect'],
  miniMap: {
    caption: 'You are here in the Brewline SQL course:',
    row1: [['src', 'Select'], ['stg', 'Join'], ['int', 'Group'], ['mart', 'Window'], ['con', 'Model']],
    row2: [['sf', 'Plans'], ['air', 'Locks'], ['qual', 'Checks'], ['mon', 'Dialects'], ['ci', 'Load'], ['snap', 'History']]
  },
  sql: { role: 'analyst', wh: 'DuckDB', db: 'brewline' },
  langLabels: { sql: 'SQL', json: 'JSON', bash: 'Shell', python: 'Python', text: 'Text', yaml: 'YAML' }
};
