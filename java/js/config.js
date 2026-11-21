/* Java for data engineers: tutorial settings. Edit and reload.
   coach: which illustrated coach teaches this course (see js/coach-hugo.js). This course uses Coach Hugo.
   coachPhoto: put a picture next to this file (for example coach.jpg) and set the path. Leave it empty to keep the illustration. */
window.LAB = window.LAB || {};
LAB.config = {
  id: 'java',
  storageKey: 'dep.java.v1',
  coachPhoto: '',
  coach: { id: 'hugo', name: 'Hugo', role: 'your Java coach' },
  defaultTrack: 'senior',
  goalsTitle: 'After this mission you can:',
  welcome: {
    titleHtml: 'Java<br><span>for data engineers</span>',
    sub: 'Build and run · Maven and dependencies · Records and streams · Money and time · Files and memory · JDBC and tests · Threads',
    say: 'Hi, I am Coach Hugo. Spark, Kafka and Flink run on the Java virtual machine, so an engineer who can read a stack trace, fix a dependency conflict and size a heap is worth a lot on a bad night. Every output here ran on the real JDK 21 and Maven. Pick a path first.',
    question: 'Which path fits you?',
    note: 'Switch any time from the Map button. Progress saves in this browser. Spark, Kafka, Flink and a database server did not run for this course: they have courses of their own, and the H2 database runs inside the program. The outputs come from OpenJDK 21 and Maven 3.9 on one machine with made-up Brewline data, and I say on each screen what is recorded and what comes from documentation.'
  },
  rhythm: [
    { k: 'see', b: 'SEE', t: 'Watch the compiler, Maven and the JVM do their work' },
    { k: 'try', b: 'TRY', t: 'Labs, quizzes, bug hunts and design decisions' },
    { k: 'say', b: 'SAY', t: 'Answer the interview questions out loud' }
  ],
  tracks: [
    { id: 'junior', level: 1, name: 'Junior path', text: 'What a junior data engineer is asked about Java, and expected to do.' },
    { id: 'senior', level: 2, name: 'Senior path', text: 'Adds the shaded jar, rounding and daylight saving, memory in a container, serialization and the decisions that seniors own.' },
    { id: 'all', level: 3, name: 'Everything', text: 'Adds the finer point: what the bytecode of a method looks like.' }
  ],
  tierLabels: { 2: 'Senior', 3: 'Extra' },
  srcLabels: { rec: 'Recorded', docs: 'From documentation' },
  levels: ['Newcomer', 'Builder', 'Stream Handler', 'Number Keeper', 'Memory Watcher', 'Query Writer', 'Thread Wrangler', 'Java Partner'],
  miniMap: {
    caption: 'You are here in the Brewline Java course:',
    row1: [['src', 'Build'], ['stg', 'Maven'], ['ing', 'Streams'], ['mart', 'Numbers'], ['air', 'Memory']],
    row2: [['mon', 'JDBC'], ['qual', 'Tests'], ['ci', 'Threads']]
  },
  langLabels: { sql: 'SQL', python: 'Python', java: 'Java', xml: 'Maven pom.xml', json: 'JSON', bash: 'Shell', yaml: 'YAML', text: 'Text', ini: 'Config' }
};
