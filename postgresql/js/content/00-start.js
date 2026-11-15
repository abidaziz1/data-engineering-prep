/* Mission 0: pick a path, see the whole picture, and learn what the tags mean. */
(function () {
  var B = LAB.b, G = LAB.get;
  var M = function (k) { return G.meta(k); };

  LAB.addChapter({
    id: 'm0', n: 0, noIntro: true, title: 'Start here', short: 'Start', blurb: 'Pick your path and see the whole picture', minutes: 7,
    scenes: [
      B.welcome({ id: 'welcome' }),

      B.flow({
        id: 'm0-map', t: 1, src: 'docs', title: 'What a PostgreSQL server does with a statement', g: 'server', legend: true,
        steps: [
          { say: 'Brewline loads its orders into one PostgreSQL server every night, and dashboards, a replica and a change data capture job read from it. This picture is the whole course. Press Next.', focus: ['cl', 'pm', 'be', 'sb', 'wal', 'df', 'bg'], cap: 'A client on the left, the files on the right.' },
          { say: 'Step 1. Your pipeline connects. The **postmaster** is the one process that listens on the port.', on: ['e1'], focus: ['cl', 'pm'], cap: 'A client connects.' },
          { say: 'Step 2. For every connection the postmaster starts a **backend**: a process of its own. Two hundred connections are two hundred processes. Mission 1 counts them.', on: ['e2'], focus: ['pm', 'be'], tags: ['tg_proc'], cap: 'One backend for each client.' },
          { say: 'Step 3. The backend works on **8 kilobyte pages**. It reads the page it needs into **shared buffers** and changes it there. Missions 1 and 2 open a page.', on: ['e3'], focus: ['be', 'sb'], cap: 'Changes are made in memory.' },
          { say: 'Step 4. Before the change counts, the backend writes a record to the **write-ahead log**, and a commit waits until that record is on disk. Mission 3 reads the log and crashes a server.', on: ['e4'], focus: ['be', 'wal'], tags: ['tg_log'], cap: 'The log is written first.' },
          { say: 'Step 5. The changed pages are written to the **data files** later, in batches. That is why a crash does not lose a commit: the log can redo the work.', on: ['e5'], focus: ['sb', 'df'], cap: 'Pages are written later.' },
          { say: 'Step 6. Old row versions pile up, because an update writes a new version. **Autovacuum** cleans them up in the background. The rest of the course: loading data (4), indexes (5), partitions (6), replication (7), backups (8) and the running of a server (9).', on: ['e6'], focus: ['bg', 'df'], tags: ['tg_vac'], cap: 'Background processes keep it tidy.' }
        ]
      }),

      B.cmp({
        id: 'm0-levels', t: 1, src: 'docs', title: 'Junior or senior: what changes',
        say: 'You are asked about PostgreSQL because your pipelines write into it or read from it, and a server that is full, locked or lagging stops them. Press Next to read what is expected at each level.',
        cols: ['Area', 'A junior is expected to', 'A senior is expected to'],
        hl: 2,
        rows: [
          ['Loading', 'Load a file with COPY and make the load safe to run twice.', 'Choose between COPY, INSERT and MERGE, and say what each writes to the log and to the table.'],
          ['Updates', 'Know that an update leaves a dead row and that VACUUM cleans it.', 'Read bloat, explain what holds vacuum back, and tune autovacuum for one table.'],
          ['Indexes', 'Add a btree index for a slow filter and read EXPLAIN.', 'Choose BRIN, partial, covering and GIN indexes, and say what each one costs on every write.'],
          ['Big tables', 'Know that partitions exist.', 'Partition by time, check pruning in the plan, and drop old data without a DELETE.'],
          ['Replicas', 'Know that a standby is read-only and may be behind.', 'Explain a conflict with recovery, a replication slot that fills the disk, and logical replication for CDC.'],
          ['Recovery', 'Take a dump with pg_dump.', 'Restore to a point in time from a base backup and the archived log, and test the restore.'],
          ['Operations', 'Connect with a role that can only read.', 'Run a migration without queueing the application behind it, size the connections, and watch the server with pg_stat views.']
        ],
        steps: [
          { upto: 4, say: 'The first four rows are what your own code does to the server: load, update, index and grow a table. A junior does them. A senior can say why they cost what they cost.' },
          { upto: 7, say: 'The last three rows decide whether an outage is ten minutes or a day. They carry most of the questions of a senior interview.' }
        ]
      }),

      B.talk({
        id: 'm0-how', t: 1, src: 'rec', title: 'How this course works',
        say: 'Five quick things before we start. Press Next for each.',
        items: [
          ['SEE, TRY, SAY', 'Every mission watches something work (**SEE**), makes you practise it (**TRY**), then asks the interview question out loud (**SAY**). Orange blocks in a diagram are data moving. Numbers show the order.', 'Watch first, practise second, speak third.'],
          ['Junior, Senior, Extra', 'A small tag on a screen tells you who it is for. No tag means everybody. **Senior** and **Extra** screens appear only on the wider paths.', 'The tag tells you whether a screen is on your path.'],
          ['Two kinds of screen', 'A **Recorded** tag means that I ran it on a real PostgreSQL server and wrote down what it printed and did. A **From documentation** tag means that I read it and did not run it.', 'Recorded means run. From documentation means read.'],
          ['What ran', 'PostgreSQL ' + M('postgres') + ' on throwaway servers, started for the recording and removed afterwards, with made-up Brewline data. Plans and counts are real. Times are not quoted, except where a screen says "on this machine".', 'Counts repeat. Times do not.'],
          ['Where PostgreSQL ends', 'Amazon RDS and Aurora, Google Cloud SQL, Azure Database for PostgreSQL, connection poolers such as PgBouncer and most extensions need accounts or extra software, so they did not run. The README lists them.', 'Managed services are from documentation.']
        ],
        cols: 1
      }),

      B.cmp({
        id: 'm0-ran', t: 2, src: 'rec', title: 'What I ran, and what I did not',
        say: 'This is the exact setup behind every recorded screen. Press Next to read it.',
        cols: ['Part', 'What it was', 'Status'],
        hl: 1,
        rows: [
          ['PostgreSQL', M('version_line') + ' on ' + M('os') + ', from the Ubuntu package, one throwaway server for each experiment', 'Run'],
          ['Data', 'Orders, events and a few small tables from fixed rules (no random numbers), so that a count is the same on every run', 'Run'],
          ['Replication', 'A primary and a standby made with pg_basebackup, and a subscriber with logical replication, all on one machine over 127.0.0.1', 'Run'],
          ['Contrib extensions', 'pageinspect, pgstattuple, pg_walinspect, pg_visibility, pg_stat_statements and test_decoding', 'Run'],
          ['Statistics target', 'default_statistics_target was 10,000 on the servers that hold the big tables, so that ANALYZE reads every row and the estimates repeat. The default is 100', 'Changed'],
          ['Managed services, poolers, other extensions', 'Amazon RDS and Aurora, Cloud SQL, Azure, PgBouncer, pgvector, PostGIS, TimescaleDB, Citus', 'Not run']
        ],
        steps: [
          { upto: 4, say: 'The first four rows ran. They are everything you need to see what a page, a row version, a log record, a slot and a restore do.' },
          { upto: 6, say: 'The statistics target was changed so that a plan is the same on every run. The last row did not run. What I say about those comes from documentation, and the README lists what to check again.' }
        ]
      })
    ]
  });
})();
