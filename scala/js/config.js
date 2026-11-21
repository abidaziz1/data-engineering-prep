/* Scala for data engineers: tutorial settings. Edit and reload.
   coach: which illustrated coach teaches this course (see js/coach-skye.js). This course uses Coach Skye.
   coachPhoto: put a picture next to this file (for example coach.jpg) and set the path. Leave it empty to keep the illustration. */
window.LAB = window.LAB || {};
LAB.config = {
  id: 'scala',
  storageKey: 'dep.scala.v1',
  coachPhoto: '',
  coach: { id: 'skye', name: 'Skye', role: 'your Scala coach' },
  defaultTrack: 'senior',
  goalsTitle: 'After this mission you can:',
  welcome: {
    titleHtml: 'Scala<br><span>for data engineers</span>',
    sub: 'Build and versions · Case classes and matches · Collections · Errors as values · Typed Spark',
    say: 'Hi, I am Coach Skye. Spark is written in Scala, and the day you meet it is usually a stack trace: a version that does not match, a match that is not complete, a closure that cannot be sent. Every output here ran on the real Scala 2.13 compiler and Spark 4.0.1. Pick a path first.',
    question: 'Which path fits you?',
    note: 'Switch any time from the Map button. Progress saves in this browser. Scala 3, sbt and a cluster did not run for this course, and the screens say so. The outputs come from one real recording.'
  },
  rhythm: [
    { k: 'see', b: 'SEE', t: 'Watch the compiler, the JVM and Spark do their work' },
    { k: 'try', b: 'TRY', t: 'Labs, quizzes, bug hunts and design decisions' },
    { k: 'say', b: 'SAY', t: 'Answer the interview questions out loud' }
  ],
  tracks: [
    { id: 'junior', level: 1, name: 'Junior path', text: 'What a junior data engineer is asked about Scala, and expected to do.' },
    { id: 'senior', level: 2, name: 'Senior path', text: 'Adds binary versions in depth, laziness, errors that add up, and how Spark sends your code.' },
    { id: 'all', level: 3, name: 'Everything', text: 'Adds the finer points: what the compiler says about a missing encoder.' }
  ],
  tierLabels: { 2: 'Senior', 3: 'Extra' },
  srcLabels: { rec: 'Recorded', docs: 'From documentation' },
  levels: ['Newcomer', 'Builder', 'Pattern Matcher', 'Collector', 'Safe Parser', 'Spark Typist', 'Scala Partner'],
  miniMap: {
    caption: 'You are here in the Brewline Scala course:',
    row1: [['src', 'Build'], ['stg', 'Versions'], ['ing', 'Matches']],
    row2: [['mart', 'Collections'], ['mon', 'Errors'], ['air', 'Spark']]
  },
  langLabels: { sql: 'SQL', python: 'Python', scala: 'Scala', java: 'Java', xml: 'XML', json: 'JSON', bash: 'Shell', yaml: 'YAML', text: 'Text', ini: 'Config' }
};
