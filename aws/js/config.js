/* AWS for data engineers: tutorial settings. Edit and reload.
   coachPhoto: put a picture next to this file (for example coach.jpg) and set the path.
   Leave it empty to keep the illustrated Coach Sam. */
window.LAB = window.LAB || {};
LAB.config = {
  id: 'aws',
  storageKey: 'dep.aws.v1',
  coachPhoto: '',
  defaultTrack: 'senior',
  goalsTitle: 'After this mission you can:',
  welcome: {
    titleHtml: 'AWS<br><span>for data engineers, from the first bucket to production</span>',
    sub: 'The account and the bill · S3 · IAM · Glue and the catalog · Athena · Redshift · Streaming · Events and queues · Step Functions · Security · Cost · Infrastructure as code',
    say: 'Hi, I am Coach Sam. This course builds the Brewline coffee shop a data platform on AWS. You will see how a request is signed, how S3 lists and versions objects, how a policy allows or denies a call, how the catalog and Athena find data, what a scan costs, how a stream spreads over shards, what a queue does with a message that keeps failing, and how a template builds it all. You only need the Next button. First, tell me which path fits you.',
    question: 'Which path fits you?',
    note: 'Switch any time from the Map button. Progress saves in this browser. Nothing in this course ran on AWS. The behaviour of the AWS SDK, request signing, policy checks, file layouts, query scans and template checks was recorded or checked on one machine with open-source tools: boto3 and botocore (the real AWS SDK), moto (an open-source AWS emulator), DuckDB, cfn-lint and parliament. The screens that show it carry a Recorded tag. Everything else about the AWS services comes from documentation, and those screens say so. Prices are examples, and AWS changes them. Independent study material, not affiliated with or endorsed by Amazon Web Services or the open-source projects named here.'
  },
  rhythm: [
    { k: 'see', b: 'SEE', t: 'Watch requests, policies, streams and pipelines work, step by step' },
    { k: 'try', b: 'TRY', t: 'Labs, quizzes, bug hunts and design decisions' },
    { k: 'say', b: 'SAY', t: 'Answer the interview questions out loud' }
  ],
  tracks: [
    { id: 'junior', level: 1, name: 'Junior path', text: 'What a junior data engineer is asked about AWS, and expected to do.' },
    { id: 'senior', level: 2, name: 'Senior path', text: 'Adds the design, security, cost and delivery decisions that seniors own.' },
    { id: 'all', level: 3, name: 'Everything', text: 'Adds the newest features and the deepest follow-up questions.' }
  ],
  tierLabels: { 2: 'Senior', 3: 'Extra' },
  srcLabels: { rec: 'Recorded', docs: 'From documentation' },
  levels: ['Rookie', 'Cloud Scout', 'Bucket Keeper', 'Policy Reader', 'Catalog Keeper', 'Query Tuner', 'Warehouse Planner', 'Stream Watcher', 'Event Wrangler', 'Flow Builder', 'Security Steward', 'Cost Watcher', 'Stack Builder', 'AWS Architect'],
  miniMap: {
    caption: 'You are here in the Brewline platform on AWS:',
    row1: [['src', 'Sources'], ['stg', 'S3 raw'], ['int', 'S3 clean'], ['mart', 'Warehouse'], ['con', 'BI + ML']],
    row2: [['sf', 'Account + IAM'], ['air', 'Compute'], ['mon', 'Cost + ops'], ['qual', 'Security'], ['snap', 'Events'], ['ci', 'IaC + CI']]
  },
  sql: { role: 'brewline-analyst', wh: 'Athena workgroup: brewline', db: 'brewline_lake' },
  langLabels: { sql: 'Athena SQL', python: 'Python (boto3)', yaml: 'YAML', json: 'JSON', bash: 'AWS CLI', text: 'Text' }
};
