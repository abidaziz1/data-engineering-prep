/* PostgreSQL for data engineers: tutorial settings. Edit and reload.
   coach: which illustrated coach teaches this course (see js/coach-ellie.js). This course uses Coach Ellie.
   coachPhoto: put a picture next to this file (for example coach.jpg) and set the path. Leave it empty to keep the illustration. */
window.LAB = window.LAB || {};
LAB.config = {
  id: 'postgresql',
  storageKey: 'dep.postgresql.v1',
  coachPhoto: '',
  coach: { id: 'ellie', name: 'Ellie', role: 'your PostgreSQL coach' },
  defaultTrack: 'senior',
  goalsTitle: 'After this mission you can:',
  welcome: {
    titleHtml: 'PostgreSQL<br><span>for data engineers</span>',
    sub: 'The server and its files · Row versions and vacuum · The write-ahead log · Loading with COPY · Indexes and statistics · Partitions · Replication · Backups and recovery · Roles and settings',
    say: 'Hi, I am Coach Ellie. Brewline loads its orders into PostgreSQL every night, and the same server feeds dashboards, a replica and a change data capture job. You will open a real server and look at its files, watch an update leave a dead row behind, see why a table grows although you deleted rows, crash a server and watch it recover, load 20,000 rows four ways, make a nightly load safe to run twice, shrink an index from 21 MB to 24 KB, drop a month of data without a single dead row, get a standby cancelled by a vacuum, lose a replication slot, restore to a point in time, and queue a whole application behind one migration. Every output ran on a real PostgreSQL 16 server. Pick a path first.',
    question: 'Which path fits you?',
    note: 'Switch any time from the Map button. Progress saves in this browser. Managed services (Amazon RDS and Aurora, Google Cloud SQL, Azure Database for PostgreSQL), connection poolers and most extensions did not run for this course. The outputs come from PostgreSQL 16.15 on throwaway servers with made-up Brewline data, and I say on each screen what is recorded and what comes from documentation.'
  },
  rhythm: [
    { k: 'see', b: 'SEE', t: 'Watch what the server does with a statement: pages, rows, log and locks' },
    { k: 'try', b: 'TRY', t: 'Labs, quizzes, bug hunts and design decisions' },
    { k: 'say', b: 'SAY', t: 'Answer the interview questions out loud' }
  ],
  tracks: [
    { id: 'junior', level: 1, name: 'Junior path', text: 'What a junior data engineer is asked about PostgreSQL, and expected to do.' },
    { id: 'senior', level: 2, name: 'Senior path', text: 'Adds replication, recovery, partitioning and the operational decisions that seniors own.' },
    { id: 'all', level: 3, name: 'Everything', text: 'Adds the finer points: page layout, wraparound, slots, checksums, rewrites and the lock queue.' }
  ],
  tierLabels: { 2: 'Senior', 3: 'Extra' },
  srcLabels: { rec: 'Recorded', docs: 'From documentation' },
  levels: ['Newcomer', 'Page Reader', 'Vacuum Keeper', 'Log Reader', 'Bulk Loader', 'Index Chooser', 'Partitioner', 'Replica Keeper', 'Restore Pro', 'Server Steward', 'PostgreSQL Partner'],
  miniMap: {
    caption: 'You are here in the Brewline PostgreSQL course:',
    row1: [['src', 'Server'], ['stg', 'Row versions'], ['ing', 'WAL'], ['mart', 'Loading'], ['air', 'Indexes']],
    row2: [['mon', 'Partitions'], ['qual', 'Replication'], ['ci', 'Recovery']]
  },
  langLabels: { sql: 'SQL', python: 'Python', json: 'JSON', bash: 'Shell', yaml: 'YAML', text: 'Text', ini: 'Config' }
};
