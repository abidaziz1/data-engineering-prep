/* Docker for data engineers: tutorial settings. Edit and reload.
   coach: which illustrated coach teaches this course (see js/coach-otto.js). This course uses Coach Otto.
   coachPhoto: put a picture next to this file (for example coach.jpg) and set the path. Leave it empty to keep the illustration. */
window.LAB = window.LAB || {};
LAB.config = {
  id: 'docker',
  storageKey: 'dep.docker.v1',
  coachPhoto: '',
  coach: { id: 'otto', name: 'Otto', role: 'your Docker coach' },
  defaultTrack: 'senior',
  goalsTitle: 'After this mission you can:',
  welcome: {
    titleHtml: 'Docker<br><span>for data engineers</span>',
    sub: 'Images and containers · Layers and the build cache · Small images · Data and volumes · Networks · Compose · Jobs that run for a while · Registries and tags · Security',
    say: 'Hi, I am Coach Otto. Brewline, the coffee retailer, has one small job that loads a day of orders into Postgres. It runs on a laptop today, and it must run the same way in the pipeline tonight. You will put it in an image, watch the build cache, lose a database on purpose, find out why a container cannot reach localhost, start a stack with Compose, stop a job that ignores SIGTERM and push an image to a registry. Everything you see ran on a real Docker Engine. Pick a path first.',
    question: 'Which path fits you?',
    note: 'Switch any time from the Map button. Progress saves in this browser. Docker Desktop, other runtimes and cloud registries did not run for this course. The outputs come from one Docker Engine on one Linux machine, with made-up Brewline data and a real Postgres, and I say on each screen what is recorded and what comes from documentation.'
  },
  rhythm: [
    { k: 'see', b: 'SEE', t: 'Watch a build, a container or a network do its work' },
    { k: 'try', b: 'TRY', t: 'Labs, quizzes, bug hunts and design decisions' },
    { k: 'say', b: 'SAY', t: 'Answer the interview questions out loud' }
  ],
  tracks: [
    { id: 'junior', level: 1, name: 'Junior path', text: 'What a junior data engineer is asked about Docker, and expected to do.' },
    { id: 'senior', level: 2, name: 'Senior path', text: 'Adds the build, data, job and shipping decisions that seniors own.' },
    { id: 'all', level: 3, name: 'Everything', text: 'Adds the finer points and the deepest follow-up questions.' }
  ],
  tierLabels: { 2: 'Senior', 3: 'Extra' },
  srcLabels: { rec: 'Recorded', docs: 'From documentation' },
  levels: ['Newcomer', 'Container Starter', 'Layer Reader', 'Image Trimmer', 'Data Keeper', 'Network Mapper', 'Stack Builder', 'Job Runner', 'Image Shipper', 'Safe Hands', 'Docker Partner'],
  miniMap: {
    caption: 'You are here in the Brewline Docker course:',
    row1: [['src', 'Images'], ['stg', 'Layers'], ['ing', 'Slim'], ['mart', 'Data'], ['air', 'Network']],
    row2: [['mon', 'Compose'], ['qual', 'Jobs'], ['ci', 'Registry']]
  },
  sql: { role: 'postgres', wh: 'The Postgres container of the course', db: 'brewline' },
  langLabels: { sql: 'SQL', python: 'Python', json: 'JSON', bash: 'Shell', yaml: 'YAML', text: 'Text', dockerfile: 'Dockerfile', compose: 'Compose file' }
};
