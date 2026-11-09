/* Snowflake and dbt tutorial settings. Edit and reload.
   coachPhoto: put a picture next to this file (for example coach.jpg) and set the path.
   Leave it empty to keep the illustrated Coach Sam. */
window.LAB = window.LAB || {};
LAB.config = {
  id: 'snowflake-dbt',
  storageKey: 'dep.snowflake-dbt.v1',
  coachPhoto: '',
  defaultTrack: 'senior',
  goalsTitle: 'After this mission you can:',
  welcome: {
    titleHtml: 'Snowflake + dbt<br><span>One pipeline, built end to end</span>',
    sub: 'Connecting · What dbt builds · Incremental and dynamic tables · Cost · Environments · Security · Recovery · Orchestration',
    say: 'Hi, I am Coach Sam. You may know Snowflake and dbt on their own. Now we put them together on Brewline: how dbt connects, what it creates in Snowflake, what a run costs, how CI uses clones, who may read what, and how you recover from a bad release. You only need the Next button. First, tell me which path fits you.',
    question: 'Which path fits you?',
    note: 'Switch any time from the Map button. Progress saves in this browser. The SQL that dbt sends to Snowflake was recorded from dbt-snowflake running on the Brewline project against a stand-in for the connection. Nothing ran on a Snowflake account, so every result, timing and cost figure is an example, and the screens say so. Independent study material, not affiliated with or endorsed by Snowflake Inc. or dbt Labs.'
  },
  rhythm: [
    { k: 'see', b: 'SEE', t: 'Watch the statements dbt sends to Snowflake, step by step' },
    { k: 'try', b: 'TRY', t: 'Labs, quizzes, bug hunts and design decisions' },
    { k: 'say', b: 'SAY', t: 'Answer the interview questions out loud' }
  ],
  tracks: [
    { id: 'junior', level: 1, name: 'Junior path', text: 'What a junior data engineer is asked about and expected to do with dbt on Snowflake.' },
    { id: 'senior', level: 2, name: 'Senior path', text: 'Adds the cost, security, environment and recovery decisions that seniors own.' },
    { id: 'all', level: 3, name: 'Everything', text: 'Adds the newest features and the deepest follow-up questions.' }
  ],
  tierLabels: { 2: 'Senior', 3: 'Extra' },
  levels: ['Rookie', 'Connected', 'Object Builder', 'Merge Master', 'Credit Watcher', 'Environment Keeper', 'Access Steward', 'Rewind Pilot', 'Scheduler', 'Snowflake and dbt Architect'],
  miniMap: {
    caption: 'You are here in the Snowflake and dbt platform:',
    row1: [['src', 'RAW in Snowflake'], ['stg', 'Staging'], ['int', 'Intermediate'], ['mart', 'Marts'], ['con', 'BI + sharing']],
    row2: [['sf', 'Account + roles'], ['air', 'Warehouses'], ['mon', 'Cost'], ['qual', 'Security'], ['snap', 'Recovery'], ['ci', 'CI/CD']]
  },
  sql: { role: 'TRANSFORMER', wh: 'WH_TRANSFORM', db: 'BREWLINE.MARTS' },
  langLabels: { sql: 'Snowflake SQL', jinja: 'dbt model (SQL + Jinja)' }
};
