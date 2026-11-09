/* Databricks and Azure Databricks tutorial settings. Edit and reload.
   coachPhoto: put a picture next to this file (for example coach.jpg) and set the path.
   Leave it empty to keep the illustrated Coach Sam. */
window.LAB = window.LAB || {};
LAB.config = {
  id: 'databricks',
  storageKey: 'dep.databricks.v1',
  coachPhoto: '',
  defaultTrack: 'senior',
  goalsTitle: 'After this mission you can:',
  welcome: {
    titleHtml: 'Databricks<br><span>and Azure Databricks, from first notebook to production</span>',
    sub: 'The platform · Spark · Delta Lake · Layout and cost · Pipelines and streaming · Unity Catalog · Declarative pipelines · Jobs · CI/CD · Azure security',
    say: 'Hi, I am Coach Sam. This course takes the Brewline coffee shop onto Databricks. You will see how Spark runs a query, what Delta Lake writes to storage, how a bronze, silver and gold pipeline is built, and what a run costs. Then governance, jobs, releases and Azure identity. You only need the Next button. First, tell me which path fits you.',
    question: 'Which path fits you?',
    note: 'Switch any time from the Map button. Progress saves in this browser. The Spark and Delta Lake output in this course was recorded from the real open-source engines (Apache Spark and Delta Lake), run on one machine with the Brewline data. Databricks Runtime is built on them. Nothing ran on Databricks or on Azure, so features that belong to the platform, such as Unity Catalog, Auto Loader, declarative pipelines, jobs, Photon and the Azure integration, come from documentation, and the screens say so. Independent study material, not affiliated with or endorsed by Databricks, Microsoft or the Apache Software Foundation.'
  },
  rhythm: [
    { k: 'see', b: 'SEE', t: 'Watch queries, transaction logs and pipelines work, step by step' },
    { k: 'try', b: 'TRY', t: 'Labs, quizzes, bug hunts and design decisions' },
    { k: 'say', b: 'SAY', t: 'Answer the interview questions out loud' }
  ],
  tracks: [
    { id: 'junior', level: 1, name: 'Junior path', text: 'What a junior data engineer is asked about Spark, Delta Lake and Databricks, and expected to do.' },
    { id: 'senior', level: 2, name: 'Senior path', text: 'Adds the design, tuning, governance, cost and release decisions that seniors own.' },
    { id: 'all', level: 3, name: 'Everything', text: 'Adds the newest features and the deepest follow-up questions.' }
  ],
  tierLabels: { 2: 'Senior', 3: 'Extra' },
  srcLabels: { rec: 'Recorded', docs: 'From documentation' },
  levels: ['Rookie', 'Platform Pilot', 'Spark Reader', 'Delta Keeper', 'Layout Tuner', 'Pipeline Builder', 'Stream Watcher', 'Catalog Steward', 'Pipeline Author', 'Job Runner', 'Cost Watcher', 'Release Engineer', 'Azure Guardian', 'Databricks Architect'],
  miniMap: {
    caption: 'You are here in the Brewline lakehouse:',
    row1: [['src', 'Cloud storage'], ['stg', 'Bronze'], ['int', 'Silver'], ['mart', 'Gold'], ['con', 'BI + ML']],
    row2: [['sf', 'Platform'], ['air', 'Spark'], ['mon', 'Delta + cost'], ['qual', 'Governance'], ['snap', 'Pipelines'], ['ci', 'CI/CD']]
  },
  sql: { role: 'data_engineers', wh: 'Serverless SQL warehouse', db: 'brewline.silver' },
  langLabels: { sql: 'Spark SQL', python: 'PySpark', yaml: 'YAML', json: 'JSON', text: 'Output' }
};
