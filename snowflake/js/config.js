/* Snowflake tutorial settings. Edit and reload.
   coachPhoto: put a picture next to this file (for example coach.jpg) and set the path.
   Leave it empty to keep the illustrated Coach Sam. */
window.LAB = window.LAB || {};
LAB.config = {
  id: 'snowflake',
  storageKey: 'dep.snowflake.v1',
  coachPhoto: '',
  defaultTrack: 'senior',
  goalsTitle: 'After this mission you can:',
  welcome: {
    titleHtml: 'Snowflake<br><span>From first query to production</span>',
    sub: 'Architecture · Loading · SQL · Time Travel · Pipelines · Performance · Security · Cost · CI/CD',
    say: 'Hi, I am Coach Sam. I will teach you Snowflake by following one small company, Brewline, from its first table to a governed, tuned, delivered platform. You only need the Next button. First, tell me which path fits you.',
    question: 'Which path fits you?',
    note: 'Switch any time from the Map button. Progress saves in this browser. Query results shown for Snowflake-only commands are examples, not output from a live account. Independent study material, not affiliated with or endorsed by Snowflake Inc.'
  },
  rhythm: [
    { k: 'see', b: 'SEE', t: 'Watch data move through Snowflake, step by step' },
    { k: 'try', b: 'TRY', t: 'Quizzes, bug hunts, labs and coding problems' },
    { k: 'say', b: 'SAY', t: 'Answer the interview questions out loud' }
  ],
  tracks: [
    { id: 'junior', level: 1, name: 'Junior path', text: 'What a junior data engineer is asked about and expected to do on Snowflake.' },
    { id: 'senior', level: 2, name: 'Senior path', text: 'Adds the design choices, tuning, security, cost and operations that seniors own.' },
    { id: 'all', level: 3, name: 'Everything', text: 'Adds the newest features and the deepest follow-up questions.' }
  ],
  tierLabels: { 2: 'Senior', 3: 'Extra' },
  levels: ['Rookie', 'Worksheet Starter', 'Warehouse Operator', 'Loader', 'Query Writer', 'Time Traveler', 'Pipeline Builder', 'Performance Tuner', 'Security Steward', 'Data Sharer', 'Snowpark Dev', 'Cost Guardian', 'Release Captain', 'Snowflake Architect'],
  miniMap: {
    caption: 'You are here in the Snowflake map:',
    row1: [['sf', 'Architecture'], ['air', 'Warehouses'], ['ing', 'Loading'], ['stg', 'Querying'], ['raw', 'Recovery'], ['int', 'Pipelines']],
    row2: [['mon', 'Performance'], ['qual', 'Security'], ['con', 'Sharing'], ['snap', 'Snowpark + AI'], ['mart', 'Cost'], ['ci', 'CI/CD']]
  },
  sql: { role: 'SYSADMIN', wh: 'WH_TRANSFORM', db: 'BREWLINE.CORE' },
  langLabels: { sql: 'Snowflake SQL' }
};
