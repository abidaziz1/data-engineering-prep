/* Azure for data engineers: tutorial settings. Edit and reload.
   coach: which illustrated coach teaches this course (see shared/js/coach.js). This course uses Coach Noor.
   coachPhoto: put a picture next to this file (for example coach.jpg) and set the path. Leave it empty to keep the illustration. */
window.LAB = window.LAB || {};
LAB.config = {
  id: 'azure',
  storageKey: 'dep.azure.v1',
  coachPhoto: '',
  coach: { id: 'noor', name: 'Noor', role: 'your Azure coach' },
  defaultTrack: 'senior',
  goalsTitle: 'After this mission you can:',
  welcome: {
    titleHtml: 'Azure<br><span>for data engineers, from the first storage account to production</span>',
    sub: 'The tenant and the bill · Storage and ADLS Gen2 · Entra ID and RBAC · Data Factory · Spark and the catalog · Synapse · Event Hubs · Events and Functions · Security · Cost · Infrastructure as code',
    say: 'Hi, I am Coach Noor. This course follows Brewline, the coffee retailer, as it opens a European branch and builds its data platform on Azure. You will see how a storage account lists and locks a blob, how a SAS token is signed and refused, how a managed identity asks for a token, how a Data Factory pipeline is built and checked, how Synapse reads only the folders it needs, how Event Hubs splits work between readers and remembers where each one stopped, and how a template builds it all. You only need the Next button. First, tell me which path fits you.',
    question: 'Which path fits you?',
    note: 'Switch any time from the Map button. Progress saves in this browser. Nothing in this course ran on Azure. The behaviour of the Azure SDK, SAS signing, error codes, queues, leases, Event Hubs batches and checkpoints, and file layouts was recorded on one machine with open-source tools: the Azure SDK for Python (the real client library), Azurite (an open-source storage emulator from Microsoft), DuckDB and pyarrow. The screens that show it carry a Recorded tag. Everything else about the Azure services comes from documentation, and those screens say so. Prices are examples, and Microsoft changes them. Independent study material, not affiliated with or endorsed by Microsoft or the open-source projects named here.'
  },
  rhythm: [
    { k: 'see', b: 'SEE', t: 'Watch tokens, pipelines, partitions and queues work, step by step' },
    { k: 'try', b: 'TRY', t: 'Labs, quizzes, bug hunts and design decisions' },
    { k: 'say', b: 'SAY', t: 'Answer the interview questions out loud' }
  ],
  tracks: [
    { id: 'junior', level: 1, name: 'Junior path', text: 'What a junior data engineer is asked about Azure, and expected to do.' },
    { id: 'senior', level: 2, name: 'Senior path', text: 'Adds the design, security, cost and delivery decisions that seniors own.' },
    { id: 'all', level: 3, name: 'Everything', text: 'Adds the newest features and the deepest follow-up questions.' }
  ],
  tierLabels: { 2: 'Senior', 3: 'Extra' },
  srcLabels: { rec: 'Recorded', docs: 'From documentation' },
  levels: ['Rookie', 'Tenant Scout', 'Lake Keeper', 'Identity Guard', 'Pipeline Starter', 'Pipeline Operator', 'Lakehouse Reader', 'Serverless Querier', 'Pool Planner', 'Stream Keeper', 'Event Wrangler', 'Vault Keeper', 'Cost Watcher', 'Template Builder', 'Azure Architect'],
  miniMap: {
    caption: 'You are here in the Brewline platform on Azure:',
    row1: [['src', 'Sources'], ['stg', 'ADLS raw'], ['int', 'ADLS clean'], ['mart', 'Curated'], ['con', 'BI + ML']],
    row2: [['sf', 'Tenant + RBAC'], ['air', 'Compute'], ['mon', 'Cost + ops'], ['qual', 'Security'], ['snap', 'Events'], ['ci', 'IaC + CI']]
  },
  sql: { role: 'Entra ID: brewline-analyst', wh: 'Synapse serverless SQL', db: 'brewline_lake' },
  langLabels: { sql: 'T-SQL', tsql: 'T-SQL', kql: 'KQL', bicep: 'Bicep', python: 'Python (Azure SDK)', yaml: 'YAML', json: 'JSON', bash: 'Azure CLI', text: 'Text' }
};
