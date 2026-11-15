/* Kubernetes for data engineers: tutorial settings. Edit and reload.
   coach: which illustrated coach teaches this course (see js/coach-nova.js). This course uses Coach Nova.
   coachPhoto: put a picture next to this file (for example coach.jpg) and set the path. Leave it empty to keep the illustration. */
window.LAB = window.LAB || {};
LAB.config = {
  id: 'kubernetes',
  storageKey: 'dep.kubernetes.v1',
  coachPhoto: '',
  coach: { id: 'nova', name: 'Nova', role: 'your Kubernetes coach' },
  defaultTrack: 'senior',
  goalsTitle: 'After this mission you can:',
  welcome: {
    titleHtml: 'Kubernetes<br><span>for data engineers</span>',
    sub: 'Pods and the cluster · Pods that fail · Deployments and rollouts · Services and names · Config and secrets · Storage and a database · Jobs and cron jobs · Resources, probes and shutdown · Access',
    say: 'Hi, I am Coach Nova. Brewline\'s loader runs in a container. Now it must run on a cluster, every night, next to a database, and somebody else will run the cluster. You will start a real Kubernetes cluster, apply a pod and read what the cluster says, break pods on purpose, roll out a bad image, point a service at nothing, run the loader as a Job and a CronJob, kill a database pod and keep its data, and ask who may do what. Everything you see ran on a real cluster. Pick a path first.',
    question: 'Which path fits you?',
    note: 'Switch any time from the Map button. Progress saves in this browser. Managed clusters (EKS, GKE, AKS), Helm, operators and autoscaling did not run for this course. The outputs come from one real cluster with one node, with made-up Brewline data and a real Postgres, and I say on each screen what is recorded and what comes from documentation.'
  },
  rhythm: [
    { k: 'see', b: 'SEE', t: 'Watch a manifest become pods, and read what the cluster says' },
    { k: 'try', b: 'TRY', t: 'Labs, quizzes, bug hunts and design decisions' },
    { k: 'say', b: 'SAY', t: 'Answer the interview questions out loud' }
  ],
  tracks: [
    { id: 'junior', level: 1, name: 'Junior path', text: 'What a junior data engineer is asked about Kubernetes, and expected to do.' },
    { id: 'senior', level: 2, name: 'Senior path', text: 'Adds the rollout, storage, job and access decisions that seniors own.' },
    { id: 'all', level: 3, name: 'Everything', text: 'Adds the finer points and the deepest follow-up questions.' }
  ],
  tierLabels: { 2: 'Senior', 3: 'Extra' },
  srcLabels: { rec: 'Recorded', docs: 'From documentation' },
  levels: ['Newcomer', 'Cluster Reader', 'Pod Debugger', 'Rollout Driver', 'Service Mapper', 'Config Keeper', 'Data Keeper', 'Job Scheduler', 'Limit Setter', 'Gatekeeper', 'Kubernetes Partner'],
  miniMap: {
    caption: 'You are here in the Brewline Kubernetes course:',
    row1: [['src', 'Pods'], ['stg', 'Failures'], ['ing', 'Deploy'], ['mart', 'Services'], ['air', 'Config']],
    row2: [['mon', 'Storage'], ['qual', 'Jobs'], ['ci', 'Access']]
  },
  sql: { role: 'postgres', wh: 'The Postgres pod of the course', db: 'brewline' },
  langLabels: { sql: 'SQL', python: 'Python', json: 'JSON', bash: 'Shell', yaml: 'YAML', text: 'Text', dockerfile: 'Dockerfile' }
};
