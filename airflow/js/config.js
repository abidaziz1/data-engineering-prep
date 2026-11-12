/* Apache Airflow for data engineers: tutorial settings. Edit and reload.
   coach: which illustrated coach teaches this course (see js/coach-juno.js). This course uses Coach Juno.
   coachPhoto: put a picture next to this file (for example coach.jpg) and set the path. Leave it empty to keep the illustration. */
window.LAB = window.LAB || {};
LAB.config = {
  id: 'airflow',
  storageKey: 'dep.airflow.v1',
  coachPhoto: '',
  coach: { id: 'juno', name: 'Juno', role: 'your Airflow coach' },
  defaultTrack: 'senior',
  goalsTitle: 'After this mission you can:',
  welcome: {
    titleHtml: 'Apache Airflow<br><span>for data engineers, from a first DAG to a pipeline you can operate</span>',
    sub: 'The parts of Airflow 3 · DAGs and tasks · Schedules, logical dates and data intervals · Idempotent loads · XCom, mapping and assets · Retries and trigger rules · Sensors and deferral · Pools and executors · Connections and secrets · Tests · Operating · Deploying · Patterns and mistakes',
    say: 'Hi, I am Coach Juno. This course follows Brewline, the coffee retailer, as its nightly jobs move from cron to Apache Airflow. You will write a DAG and read what Airflow recorded when it ran, see why the data interval of a run is not the day it runs, break a load on purpose and re-run it safely, watch trigger rules decide what happens after a failure, and count the slots a sensor holds. Pick a path first.',
    question: 'Which path fits you?',
    note: 'Switch any time from the Map button. Progress saves in this browser. Every recorded screen comes from Apache Airflow 3.4.0 running on one machine with made-up Brewline data. Nothing in this course ran on a managed service, on Celery or on Kubernetes, and I say on each screen what is recorded and what comes from documentation.'
  },
  rhythm: [
    { k: 'see', b: 'SEE', t: 'Watch DAG runs, schedules and task states move, step by step' },
    { k: 'try', b: 'TRY', t: 'Labs, quizzes, bug hunts and design decisions' },
    { k: 'say', b: 'SAY', t: 'Answer the interview questions out loud' }
  ],
  tracks: [
    { id: 'junior', level: 1, name: 'Junior path', text: 'What a junior data engineer is asked about Airflow, and expected to do.' },
    { id: 'senior', level: 2, name: 'Senior path', text: 'Adds the design, capacity, testing and operations decisions that seniors own.' },
    { id: 'all', level: 3, name: 'Everything', text: 'Adds the newest features and the deepest follow-up questions.' }
  ],
  tierLabels: { 2: 'Senior', 3: 'Extra' },
  srcLabels: { rec: 'Recorded', docs: 'From documentation' },
  levels: ['Rookie', 'Cron Retiree', 'DAG Writer', 'Interval Reader', 'Safe Re-runner', 'Data Passer', 'Failure Planner', 'Sensor Tuner', 'Slot Counter', 'Secret Keeper', 'Test Writer', 'On-call Ready', 'Deployer', 'Pattern Spotter', 'Airflow Architect'],
  miniMap: {
    caption: 'You are here in the Brewline Airflow course:',
    row1: [['src', 'DAG files'], ['stg', 'Parse'], ['ing', 'Schedule'], ['air', 'Run'], ['mart', 'Data']],
    row2: [['sf', 'Metadata DB'], ['qual', 'Tests'], ['mon', 'Operate'], ['ci', 'Deploy'], ['con', 'Triggerer'], ['snap', 'Assets']]
  },
  sql: { role: 'airflow', wh: 'Airflow 3.4.0 metadata database (SQLite)', db: 'airflow' },
  langLabels: { sql: 'SQL', python: 'Python (Airflow 3)', json: 'JSON', bash: 'Shell', yaml: 'YAML', text: 'Text', toml: 'TOML', ini: 'Config' }
};
