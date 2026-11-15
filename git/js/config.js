/* Git for data engineers: tutorial settings. Edit and reload.
   coach: which illustrated coach teaches this course (see js/coach-finn.js). This course uses Coach Finn.
   coachPhoto: put a picture next to this file (for example coach.jpg) and set the path. Leave it empty to keep the illustration. */
window.LAB = window.LAB || {};
LAB.config = {
  id: 'git',
  storageKey: 'dep.git.v1',
  coachPhoto: '',
  coach: { id: 'finn', name: 'Finn', role: 'your Git coach' },
  defaultTrack: 'senior',
  goalsTitle: 'After this mission you can:',
  welcome: {
    titleHtml: 'Git<br><span>for data engineers</span>',
    sub: 'Commits and the three areas · Branches, merge and rebase · Conflicts · Undoing mistakes · Remotes · History as a tool · Data in a repository · Hooks, tags and CI · Inside Git',
    say: 'Hi, I am Coach Finn. Brewline keeps its loader, its models and its schedule in one repository, and four people push to it. You will make real commits and read what Git stores, merge and rebase the same branches and compare the ids, hit a conflict and resolve it, lose a commit with a hard reset and find it again, get a push refused, find the commit that broke a check with bisect, see why a 500 KB file that is rewritten every night makes a repository grow, remove a leaked key from history, and stop a bad commit with a hook. Every output ran in real Git. Pick a path first.',
    question: 'Which path fits you?',
    note: 'Switch any time from the Map button. Progress saves in this browser. GitHub, GitLab and Bitbucket, pull requests, branch protection and their CI did not run for this course. The outputs come from real Git 2.43 in throwaway repositories with made-up Brewline files, and I say on each screen what is recorded and what comes from documentation.'
  },
  rhythm: [
    { k: 'see', b: 'SEE', t: 'Watch what a command changes: files, ids and branches' },
    { k: 'try', b: 'TRY', t: 'Labs, quizzes, bug hunts and design decisions' },
    { k: 'say', b: 'SAY', t: 'Answer the interview questions out loud' }
  ],
  tracks: [
    { id: 'junior', level: 1, name: 'Junior path', text: 'What a junior data engineer is asked about Git, and expected to do.' },
    { id: 'senior', level: 2, name: 'Senior path', text: 'Adds the history, the workflow and the data decisions that seniors own.' },
    { id: 'all', level: 3, name: 'Everything', text: 'Adds the finer points: packs, shallow and partial clones, sparse checkouts, hash functions.' }
  ],
  tierLabels: { 2: 'Senior', 3: 'Extra' },
  srcLabels: { rec: 'Recorded', docs: 'From documentation' },
  levels: ['Newcomer', 'Snapshot Taker', 'Branch Keeper', 'Conflict Solver', 'Undo Pro', 'Collaborator', 'Historian', 'Repo Steward', 'Release Keeper', 'Git Inside-Out', 'Git Partner'],
  miniMap: {
    caption: 'You are here in the Brewline Git course:',
    row1: [['src', 'Commits'], ['stg', 'Branches'], ['ing', 'Conflicts'], ['mart', 'Undo'], ['air', 'Remotes']],
    row2: [['mon', 'History'], ['qual', 'Data'], ['ci', 'Workflow']]
  },
  langLabels: { sql: 'SQL', python: 'Python', json: 'JSON', bash: 'Shell', yaml: 'YAML', text: 'Text', ini: 'Config' }
};
