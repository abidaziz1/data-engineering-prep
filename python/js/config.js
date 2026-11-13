/* Python for data engineers: tutorial settings. Edit and reload.
   coach: which illustrated coach teaches this course (registered in js/coach-lena.js). This course uses Coach Lena.
   coachPhoto: put a picture next to this file (for example coach.jpg) and set the path. Leave it empty to keep the illustration. */
window.LAB = window.LAB || {};
LAB.config = {
  id: 'python',
  storageKey: 'dep.python.v1',
  coachPhoto: '',
  coach: { id: 'lena', name: 'Lena', role: 'your Python coach' },
  defaultTrack: 'senior',
  goalsTitle: 'After this mission you can:',
  welcome: {
    titleHtml: 'Python<br><span>for data engineers, from a script to a pipeline you can trust</span>',
    sub: 'Environments · Data structures · Generators · Files and formats · Dates and money · Retries and idempotency · APIs and databases · pandas, Polars and DuckDB · Speed and memory · Types · Tests · Shipping · Design',
    say: 'Hi, I am Coach Lena. This course follows Brewline, the coffee retailer, as its data team turns one fragile script into a pipeline that you can run twice, test and trust. You will watch a generator keep memory flat, meet an hour that does not exist, retry a request without sending the order twice, and join two tables without multiplying the rows. Pick your path to start.',
    question: 'Which path fits you?',
    note: 'Switch any time from the Map button. Progress saves in this browser. Every output in this course was recorded by running Python 3.14 and its libraries on one machine with made-up Brewline data, and the screens say which parts are documentation instead. Timings are medians from that machine and will differ on yours. Nothing ran on a cloud service.'
  },
  rhythm: [
    { k: 'see', b: 'SEE', t: 'Watch records, memory and requests move, step by step' },
    { k: 'try', b: 'TRY', t: 'Labs, quizzes, bug hunts and coding rounds that really run' },
    { k: 'say', b: 'SAY', t: 'Answer the interview questions out loud' }
  ],
  tracks: [
    { id: 'junior', level: 1, name: 'Junior path', text: 'What a junior data engineer is asked about Python, and expected to write.' },
    { id: 'senior', level: 2, name: 'Senior path', text: 'Adds the design, speed, testing and operations decisions that seniors own.' },
    { id: 'all', level: 3, name: 'Everything', text: 'Adds the newest features of Python 3.14 and the deepest follow-up questions.' }
  ],
  tierLabels: { 2: 'Senior', 3: 'Extra' },
  srcLabels: { rec: 'Recorded', docs: 'From documentation' },
  levels: ['Rookie', 'Script Writer', 'Env Keeper', 'Structure Chooser', 'Stream Builder', 'File Handler', 'Clock Keeper', 'Retry Planner', 'API Caller', 'Frame Wrangler', 'Profiler', 'Type Guard', 'Test Writer', 'Shipper', 'Pipeline Designer', 'Python Architect'],
  miniMap: {
    caption: 'You are here in the Brewline Python course:',
    row1: [['src', 'Read'], ['stg', 'Parse'], ['ing', 'Clean'], ['mart', 'Load'], ['con', 'Serve']],
    row2: [['sf', 'Environment'], ['air', 'Retries'], ['qual', 'Tests'], ['mon', 'Logs'], ['ci', 'Ship'], ['snap', 'Design']]
  },
  langLabels: { python: 'Python 3.14', sql: 'SQL', json: 'JSON', bash: 'Terminal', yaml: 'YAML', text: 'Text', docker: 'Dockerfile' }
};
