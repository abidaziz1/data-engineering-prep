/* Google Cloud for data engineers: tutorial settings. Edit and reload.
   coach: which illustrated coach teaches this course (see shared/js/coach.js). This course uses Coach Ravi.
   coachPhoto: put a picture next to this file (for example coach.jpg) and set the path. Leave it empty to keep the illustration. */
window.LAB = window.LAB || {};
LAB.config = {
  id: 'gcp',
  storageKey: 'dep.gcp.v1',
  coachPhoto: '',
  coach: { id: 'ravi', name: 'Ravi', role: 'your Google Cloud coach' },
  defaultTrack: 'senior',
  goalsTitle: 'After this mission you can:',
  welcome: {
    titleHtml: 'Google Cloud<br><span>for data engineers, from a bucket to a model</span>',
    sub: 'Projects and IAM · Cloud Storage · BigQuery · Partitions and cost · SQL for pipelines · Pub/Sub · Dataflow and Beam · Dataproc and Spark · Composer, Airflow and Dataform · CDC and transfers · Governance · BigQuery ML and Vertex AI · Operations and Terraform',
    say: 'Hi, I am Coach Ravi. This course follows Brewline, the coffee retailer, as its Asia-Pacific team builds a data platform on Google Cloud in the Singapore region. You will see who is allowed to do what, how a file lands in a bucket and why a bucket has no folders, how BigQuery bills a query and what a partition saves, how a load runs twice without harm, what Pub/Sub does with a message that nobody acknowledges, how a Beam window treats a late event, how Airflow retries a task, how a change in a database reaches the warehouse, who may see a column, and how it all ships with Terraform. You only need the Next button. First, tell me which path fits you.',
    question: 'Which path fits you?',
    note: 'Switch any time from the Map button. Progress saves in this browser. Nothing in this course ran on Google Cloud, because no project or account could be reached, so I say on every screen what is real and what is a stand-in. The real parts ran on one machine: the Cloud Storage client library on an emulator, a signed URL made offline, the request bodies that the BigQuery client builds, BigQuery SQL translated and run in DuckDB, Apache Beam on its local runners, Airflow 3 (Cloud Composer runs Airflow), a Dataform project compiled, a Cloud Run function tested with real CloudEvents, Terraform scanned with Checkov, Spark in local mode, and the gcloud and bq help pages. The stand-ins are the emulator (it is not Cloud Storage), DuckDB (it is not BigQuery, so bytes are an estimate from the documented sizes of the data types), and a small model of the delivery rules of Pub/Sub. Screens with a Recorded tag show what ran. Everything about the services themselves comes from documentation, and those screens say so. Prices are examples. Independent study material, not affiliated with or endorsed by Google.'
  },
  rhythm: [
    { k: 'see', b: 'SEE', t: 'Watch files, rows, messages and jobs move, step by step' },
    { k: 'try', b: 'TRY', t: 'Labs, quizzes, bug hunts and design decisions' },
    { k: 'say', b: 'SAY', t: 'Answer the interview questions out loud' }
  ],
  tracks: [
    { id: 'junior', level: 1, name: 'Junior path', text: 'What a junior data engineer is asked about Google Cloud, and expected to do.' },
    { id: 'senior', level: 2, name: 'Senior path', text: 'Adds the design, cost, security and operations decisions that seniors own.' },
    { id: 'all', level: 3, name: 'Everything', text: 'Adds the newest features and the deepest follow-up questions.' }
  ],
  tierLabels: { 2: 'Senior', 3: 'Extra' },
  srcLabels: { rec: 'Recorded', docs: 'From documentation' },
  levels: ['Rookie', 'Cloud Mapper', 'Key Keeper', 'Bucket Boss', 'Table Builder', 'Cost Cutter', 'SQL Smith', 'Stream Starter', 'Beam Rider', 'Spark Handler', 'Orchestrator', 'Data Mover', 'Steward', 'Model Maker', 'Operator', 'Cloud Architect'],
  miniMap: {
    caption: 'You are here in the Brewline Google Cloud platform:',
    row1: [['src', 'Sources'], ['ing', 'Land and stream'], ['stg', 'Process'], ['mart', 'Warehouse'], ['con', 'Serve and models']],
    row2: [['sf', 'Security'], ['air', 'Orchestration'], ['qual', 'Governance'], ['mon', 'Operations'], ['ci', 'Delivery'], ['snap', 'Cost']]
  },
  sql: { role: 'analyst@brewline-dev', wh: 'DuckDB (BigQuery SQL translated)', db: 'brewline-dev' },
  langLabels: { sql: 'BigQuery SQL', python: 'Python', json: 'JSON', bash: 'Shell', yaml: 'YAML', text: 'Text', hcl: 'Terraform', js: 'JavaScript' }
};
