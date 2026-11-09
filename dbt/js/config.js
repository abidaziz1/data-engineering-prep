/* dbt tutorial settings. Edit and reload.
   coachPhoto: put a picture next to this file (for example coach.jpg) and set the path.
   Leave it empty to keep the illustrated Coach Sam. */
window.LAB = window.LAB || {};
LAB.config = {
  id: 'dbt',
  storageKey: 'dep.dbt.v1',
  coachPhoto: '',
  defaultTrack: 'senior',
  goalsTitle: 'After this mission you can:',
  welcome: {
    titleHtml: 'dbt<br><span>From first model to production</span>',
    sub: 'Models · Sources · Tests · Jinja · Incremental · Snapshots · Docs · Governance · CI/CD',
    say: 'Hi, I am Coach Sam. I will teach you dbt by following one small company, Brewline, from its first model to a tested, documented, deployed project. You only need the Next button. First, tell me which path fits you.',
    question: 'Which path fits you?',
    note: 'Switch any time from the Map button. Progress saves in this browser. Every command output, compiled query and result table in this course was recorded from a real dbt Core 1.12 run on DuckDB. Snippets for other warehouses are labeled. Independent study material, not affiliated with or endorsed by dbt Labs or Fivetran.'
  },
  rhythm: [
    { k: 'see', b: 'SEE', t: 'Watch dbt compile, build and test, step by step' },
    { k: 'try', b: 'TRY', t: 'Quizzes, bug hunts, labs and coding problems' },
    { k: 'say', b: 'SAY', t: 'Answer the interview questions out loud' }
  ],
  tracks: [
    { id: 'junior', level: 1, name: 'Junior path', text: 'What a junior analytics or data engineer is asked about and expected to do in dbt.' },
    { id: 'senior', level: 2, name: 'Senior path', text: 'Adds the design choices, performance, governance and delivery work that seniors own.' },
    { id: 'all', level: 3, name: 'Everything', text: 'Adds the newest features and the deepest follow-up questions.' }
  ],
  tierLabels: { 2: 'Senior', 3: 'Extra' },
  levels: ['Rookie', 'Project Starter', 'Model Builder', 'Source Wrangler', 'Mart Designer', 'Jinja Writer', 'Test Author', 'Incremental Thinker', 'History Keeper', 'Governance Lead', 'Run Tuner', 'Release Captain', 'Toolbox Owner', 'dbt Architect'],
  miniMap: {
    caption: 'You are here in the dbt project:',
    row1: [['src', 'Sources'], ['stg', 'Staging'], ['int', 'Intermediate'], ['mart', 'Marts'], ['con', 'BI + apps']],
    row2: [['dbt', 'Jinja + macros'], ['qual', 'Tests'], ['air', 'Incremental'], ['snap', 'Snapshots'], ['mon', 'Docs + governance'], ['ci', 'CI/CD']]
  },
  sql: { role: 'dev_alice', wh: 'DuckDB, local', db: 'brewline.analytics' },
  langLabels: { sql: 'SQL', jinja: 'dbt model (SQL + Jinja)' }
};
