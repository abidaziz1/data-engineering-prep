/* Mission 1: the server and its files. Every number is from the recording of a fresh PostgreSQL 16 server. */
(function () {
  var B = LAB.b, G = LAB.get;
  var C = G.counts, X = G.text, n = G.n;
  var PR = C('srv.processes'), DD = C('srv.datadir'), TB = C('srv.table'), PG = C('srv.page'), TO = C('srv.toast'), SL = C('srv.slots');
  var ST = G.table('srv.settings').rows;
  var set = function (k) { return ST.filter(function (r) { return r[0] === k; })[0]; };
  G.expect(PR.background_processes === 5 && PR.client_processes === 3 && PR.client_processes_after_two_closed === 1, 'five background processes and one process for each of three clients');
  G.expect(TB.pages_times_8192_equal_size === true && TB.bytes_equal_file === true && TB.rows_per_page === 97, 'the table file is its pages times 8,192 bytes');
  G.expect(TO.rows[1].value_bytes === 21000 && TO.rows[1].stored_bytes < 300 && TO.rows[2].stored_bytes === 20480 && TO.toast_chunks === 11, 'a compressible value is stored small and an incompressible one in eleven chunks');
  G.expect(SL.etl_connections_accepted === 7 && SL.superuser_connections_accepted === 3, 'ten slots, three of them reserved');
  G.expect(set('shared_buffers')[1] === '16384' && set('work_mem')[1] === '4096' && set('max_connections')[1] === '100', 'the default memory settings');
  var BUG = 'import psycopg\n\nfor order in orders:\n    con = psycopg.connect(DSN)\n    con.execute("INSERT INTO orders VALUES (%s, %s)", order)\n    con.commit()\n';

  LAB.addChapter({
    id: 'm1', n: 1, title: 'The server and its files', short: 'Server', blurb: 'processes, the data directory, pages, big values and connection slots', minutes: 18,
    focus: ['src', 'stg'],
    goals: [
      'Say what runs on a PostgreSQL server, and why **a connection is a process**.',
      'Find a table in the **data directory** and say why its size is a multiple of **8,192 bytes**.',
      'Say which settings need a **restart** and which a **reload**.',
      'Read the error of a server that has **no connection slots** left, and fix the cause.'
    ],
    say: 'Before we load anything, we open the box. A PostgreSQL server is a handful of processes, a folder of files and a block of shared memory. Knowing which is which makes every later mission easier: a slow query, a full disk and a refused connection all have a place on this map.',
    scenes: [
      B.term({
        id: 'm1-ps', t: 1, src: 'rec', title: 'The processes of a server',
        say: 'I started a fresh server, opened three client connections and listed the processes that belong to it.',
        lines: function () {
          return G.term([
            ['ps -o args= --ppid $POSTMASTER_PID', X('srv.ps')],
            ['psql -c "SELECT count(*) FROM pg_stat_activity WHERE backend_type = \'client backend\'"', String(PR.client_backends_in_pg_stat_activity)],
            ['# two of the clients disconnect, then: ps ... | grep -c "postgres: postgres postgres"', String(PR.client_processes_after_two_closed)]
          ]);
        },
        after: 'The server has **' + PR.background_processes + ' background processes** of its own: the checkpointer, the background writer, the WAL writer, the autovacuum launcher and the logical replication launcher. Each client got **one process** (' + PR.client_processes + ' clients, ' + PR.client_processes + ' processes). When two clients left, their processes ended and one was left. **A connection costs a process**, with its own memory, and that is why a server cannot hold ten thousand of them.',
        afterKind: 'tip',
        doneSay: 'One process for each connection, and a few helpers.'
      }),

      B.term({
        id: 'm1-datadir', t: 1, src: 'rec', title: 'The data directory',
        say: 'Everything that the server owns lives in one folder, the data directory, `$PGDATA`. This is what a new one holds.',
        lines: function () {
          return G.term([['ls $PGDATA', X('srv.datadir')]]);
        },
        after: 'Three of these matter in daily work. **`base`** holds one folder for each database, and in it one file for each table and index. **`pg_wal`** is the write-ahead log, which mission 3 opens. **`postgresql.conf`** and **`postgresql.auto.conf`** are the settings: `ALTER SYSTEM` writes the second one. The rest is bookkeeping (`pg_xact` keeps which transactions committed, `pg_replslot` the replication slots). **Never edit or delete a file here while the server is running.**',
        afterKind: 'warn',
        doneSay: 'base holds the tables. pg_wal holds the log. Leave the rest alone.'
      }),

      B.term({
        id: 'm1-files', t: 1, src: 'rec', title: 'Where a table lives',
        say: 'I loaded 200,000 orders and asked where the table is, and how big it is.',
        lines: function () {
          return G.term([
            ['SELECT pg_relation_filepath(\'orders\');', 'base/<database oid>/<file number>'],
            ['ls base/<database oid> | grep <file number>', X('srv.table_files')],
            ['SELECT pg_relation_size(\'orders\'), relpages FROM pg_class WHERE relname = \'orders\';', TB.bytes + ' | ' + TB.pages],
            ['SELECT current_setting(\'block_size\');', String(PG.pagesize)]
          ]);
        },
        after: 'A table is **a file**, named by a number. Next to it is `_fsm`, the **free space map**. A third file, `_vm`, the **visibility map**, appears after the first `VACUUM`, and mission 5 uses it. The size is **' + n(TB.bytes) + ' bytes**, which is **' + n(TB.pages) + ' pages of ' + n(PG.pagesize) + ' bytes**, exactly (' + TB.pages_times_8192_equal_size + '). PostgreSQL reads and writes **pages**, never single rows. A table of 1 GB or more is split into files of 1 GB, which the documentation says and which was not recorded here.',
        afterKind: 'tip',
        doneSay: 'A table is a file of 8 KB pages.'
      }),

      B.cmp({
        id: 'm1-page', t: 1, src: 'rec', title: 'What is on a page',
        say: 'I opened the first page of the table with the pageinspect extension. Press Next to read it.',
        cols: ['Question', 'What the server said', 'What it means'],
        hl: 1,
        rows: [
          ['How big is a page?', n(PG.pagesize) + ' bytes', 'The unit of every read and write. It was fixed when PostgreSQL was built.'],
          ['How many rows are on page 0?', String(PG.tuples_on_page_0) + ' row versions', 'Each order is about 80 bytes with its header, so about ' + TB.rows_per_page + ' fit.'],
          ['How much room is left on page 0?', PG.free_bytes_on_page_0 + ' bytes', 'The bulk load filled the page. An update of a row on this page has no room for a new version here.'],
          ['What is the average for the table?', TB.rows_per_page + ' rows for each page', n(TB.rows) + ' rows in ' + n(TB.pages) + ' pages.'],
          ['What is the file size?', n(TB.file_bytes) + ' bytes', 'The same as pg_relation_size: ' + TB.bytes_equal_file + '.']
        ],
        steps: [
          { upto: 3, say: 'A page has a header, a list of line pointers, and the row versions, which fill it from the end. The free space is in the middle.' },
          { upto: 5, say: 'Page 0 was full: ' + PG.free_bytes_on_page_0 + ' bytes were left. Remember that for mission 2, where an update needs room for a second copy of the row.' }
        ]
      }),

      B.term({
        id: 'm1-toast', t: 2, src: 'rec', title: 'Values that do not fit on a page',
        say: 'A row cannot be bigger than a page, so large values are moved out of the row. I stored a short text, a text of 21,000 characters that compresses well, and one of 20,480 characters that does not.',
        lines: function () {
          return G.term([
            ['SELECT id, octet_length(body), pg_column_size(body) FROM docs ORDER BY id;', 'id | value bytes | bytes stored\n' + X('srv.toast_table')],
            ['SELECT count(*) FROM pg_toast.pg_toast_<oid of docs>;', String(TO.toast_chunks) + ' chunks']
          ]);
        },
        after: 'The short value (' + TO.rows[0].value_bytes + ' bytes) took ' + TO.rows[0].stored_bytes + '. The long text that compresses well was stored in **' + TO.rows[1].stored_bytes + ' bytes**, a fraction of its ' + n(TO.rows[1].value_bytes) + ': PostgreSQL **compresses** a value of more than about 2 kB. The value that does not compress was stored **out of line** in the table\'s **TOAST** table, in **' + TO.toast_chunks + ' chunks** of about 2 kB. A query that does not select the column never reads those chunks, which is why `SELECT *` on a table with big text or JSON is slower than a list of columns.',
        afterKind: 'tip',
        doneSay: 'Big values are compressed or moved to a TOAST table. Select only the columns you need.'
      }),

      B.cmp({
        id: 'm1-settings', t: 1, src: 'rec', title: 'Settings, and what it takes to change one',
        say: 'Every setting has a context, which says when a change takes effect. These are the defaults of the server that I started, with the settings that this course changes or reads.',
        cols: ['Setting', 'Value', 'Context', 'Change takes effect'],
        hl: 3,
        rows: ST.filter(function (r) { return ['shared_buffers', 'work_mem', 'maintenance_work_mem', 'max_connections', 'wal_level', 'autovacuum', 'checkpoint_timeout', 'max_wal_size', 'synchronous_commit', 'statement_timeout', 'default_statistics_target', 'autovacuum_freeze_max_age'].indexOf(r[0]) >= 0; }).map(function (r) {
          var v = r[1], u = r[2];
          if (u === '8kB') v = (Number(v) * 8 / 1024) + ' MB';
          else if (u === 'kB') v = (Number(v) / 1024) + ' MB';
          else if (u === 'MB') v = n(v) + ' MB';
          else if (u === 's') v = n(v) + ' s';
          else if (u === 'ms') v = v === '0' ? '0 (off)' : v + ' ms';
          return [r[0], v, r[3], { postmaster: 'after a restart', sighup: 'after a reload', user: 'in the next session, or SET', internal: 'never (set at build time)' }[r[3]]];
        }),
        steps: [
          { upto: 6, say: 'The memory settings. `shared_buffers` is 128 MB and **needs a restart**. `work_mem` is 4 MB **for each sort or hash in each query**, and any session can change it with `SET`.' },
          { upto: 12, say: 'Connections and the log. `max_connections` needs a **restart**, which is why it is chosen with care. `wal_level` too. Mission 9 changes some of these and reads `pending_restart`.' }
        ]
      }),

      B.term({
        id: 'm1-slots', t: 1, src: 'rec', title: 'A server with no slots left',
        say: 'I started a server with `max_connections = 10` and `superuser_reserved_connections = 3`, then opened connections as a normal role, and then as the superuser.',
        lines: function () {
          return G.term([
            ['# role etl, a normal role: open connections until one is refused', String(SL.etl_connections_accepted) + ' accepted, then:'],
            ['psql -U etl', X('srv.slots_error_etl')],
            ['# role postgres, a superuser: open more', String(SL.superuser_connections_accepted) + ' accepted, then:'],
            ['psql -U postgres', X('srv.slots_error_all')]
          ]);
        },
        after: 'Ten slots, **three reserved** for superusers, so a normal role got **' + SL.etl_connections_accepted + '**. The eighth was refused with *remaining connection slots are reserved*, and a superuser could still log in to fix things, for **' + SL.superuser_connections_accepted + '** more. After those the message is **sorry, too many clients already**. The reserve is the reason you can still reach a server that the application has filled. The usual cause is not a small limit but **connections that are opened and never closed**.',
        afterKind: 'warn',
        doneSay: 'A full server still lets a superuser in. Find the leak first.'
      }),

      B.bug({
        id: 'm1-bug', t: 1, src: 'docs', q: 'A loader inserts 50,000 orders, and the server answers *too many clients* after a few hundred. Click the line that causes it.',
        file: 'loader.py', lang: 'python', code: BUG, bad: [4],
        hint: 'How many connections does this loop open, and when are they closed?',
        why: 'Each pass of the loop **connects again**, which starts a new backend process, and nothing closes the connection until garbage collection does. Many such loaders at once reach `max_connections`. Connect **once**, outside the loop, and load the rows in one transaction, or with `COPY` as mission 4 does. If many workers must share a server, a **pooler** holds the connections for them.',
        fix: 'import psycopg\n\nwith psycopg.connect(DSN) as con:\n    with con.cursor() as cur:\n        cur.executemany("INSERT INTO orders VALUES (%s, %s)", orders)\n',
        cheer: 'One connection, one transaction.'
      }),

      B.quiz({
        id: 'm1-q1', t: 1,
        q: 'Twelve pipeline tasks run at once, each with an open connection. How many backend processes does the server have for them?',
        opts: [
          { t: 'Twelve, one for each connection', fb: '' },
          { t: 'One, which serves all of them in turn', fb: 'That is how some other servers work. PostgreSQL starts a process for each connection.' },
          { t: 'Two, one for reading and one for writing', fb: 'There are background processes for the log and the checkpoints, but clients get one each.' },
          { t: 'As many as there are CPU cores', fb: 'The number of processes follows the number of connections, not the cores.' }
        ],
        ok: 0, why: 'The recording: ' + PR.clients_opened + ' clients were ' + PR.client_processes + ' processes, and after two left there was ' + PR.client_processes_after_two_closed + '.'
      }),

      B.quiz({
        id: 'm1-q2', t: 1,
        q: 'The file of a table is 16,891,904 bytes. How many pages does it have?',
        opts: [
          { t: '2,062, because the size is a multiple of 8,192', fb: '' },
          { t: '200,000, one for each row', fb: 'A page holds about ' + TB.rows_per_page + ' rows here, so the table has far fewer pages than rows.' },
          { t: 'It cannot be known without reading the file', fb: 'The file is always a whole number of pages: 16,891,904 divided by 8,192.' },
          { t: '16,891, one for each kilobyte', fb: 'A page is 8 kilobytes.' }
        ],
        ok: 0, why: 'The recording: ' + n(TB.bytes) + ' bytes is ' + n(TB.pages) + ' pages of ' + n(PG.pagesize) + ' bytes.'
      }),

      B.quiz({
        id: 'm1-q3', t: 1,
        q: 'You need a bigger `shared_buffers`. What does it take?',
        opts: [
          { t: 'Change it, then **restart** the server', fb: '' },
          { t: 'Change it and run `SELECT pg_reload_conf()`', fb: 'A reload applies settings whose context is sighup. shared_buffers has the context postmaster.' },
          { t: '`SET shared_buffers` in the session', fb: 'Only settings with the context user can be set in a session. Shared memory is created when the server starts.' },
          { t: 'Nothing, the server grows it by itself', fb: 'It is a fixed block of shared memory.' }
        ],
        ok: 0, why: 'In the table of settings, `shared_buffers` has the context **' + set('shared_buffers')[3] + '**. Mission 9 records `pending_restart` turning on after a change.'
      }),

      B.quiz({
        id: 'm1-q4', t: 2,
        q: 'A column holds JSON documents of 40 kB each, and a report reads only the order id. Which is true?',
        opts: [
          { t: 'The documents are stored out of line, so a query that does not select the column does not read them', fb: '' },
          { t: 'Every query reads the documents, because they are in the row', fb: 'Values of more than about 2 kB are compressed or moved to the TOAST table, and are fetched only when the column is selected.' },
          { t: 'PostgreSQL refuses rows of more than 8 kB', fb: 'It moves the big values out of the row, so rows can be far bigger than a page.' },
          { t: 'They are stored in the WAL only', fb: 'The log records changes. The values are in the table and its TOAST table.' }
        ],
        ok: 0, why: 'The recording: a value of ' + n(TO.rows[2].value_bytes) + ' bytes that did not compress was stored in ' + TO.toast_chunks + ' chunks in the TOAST table, and the rows of the table itself stayed small.'
      }),

      B.order({
        id: 'm1-ord', t: 1, q: 'The pipeline fails with `FATAL: remaining connection slots are reserved`. Put the steps in order.',
        items: [
          'Log in as a superuser, which uses the reserved slots',
          'Read `pg_stat_activity`: who holds the connections, and in which state',
          'Look for **idle** or **idle in transaction** sessions that have been open for a long time',
          'Fix the code that opens connections and does not close them, and cap the number of workers',
          'Only then think about a pooler or a higher `max_connections`'
        ],
        why: 'A higher limit only moves the wall, and each connection costs memory. The state and the age of the sessions in `pg_stat_activity` tell you whether the limit is too low or the code leaks.'
      }),

      B.decide({
        id: 'm1-dec', t: 2, src: 'docs', title: 'Decision: fifty tasks and one hundred connections',
        scenario: 'An orchestrator runs up to fifty tasks at once. Each task opens its own connection to the same PostgreSQL server, which has `max_connections = 100`. Dashboards use another thirty. At 02:00 the server starts refusing connections.',
        opts: [
          { t: 'Cap the concurrency of the tasks that use the server, reuse connections inside a task, and add a pooler if the numbers still do not fit', d: 'The server keeps a number of connections that it can serve. A pooler turns hundreds of client connections into a few dozen server connections.', lose: 'A pooler is one more component to run, and in transaction mode it breaks session state (temporary tables, prepared statements, advisory locks).' },
          { t: 'Raise `max_connections` to 1,000', d: 'The error goes away.', lose: 'Each connection is a process with its own memory, and a thousand of them compete for the same locks and CPU. The server becomes slower for everybody, and the change needs a restart.' },
          { t: 'Give each task its own server', d: 'No sharing, no limit.', lose: 'The cost and the work of fifty servers, and the data is not in one place any more.' }
        ],
        pick: 0,
        why: 'The limit is a symptom of too many concurrent clients. Cap the concurrency at the source, and use a pooler when many short-lived clients are unavoidable. Raising the limit is the last step and not the first. PgBouncer and other poolers did not run in this course: this answer is from documentation.',
        when: 'A server with a few dozen long-running clients needs none of this.'
      }),

      B.incident({
        id: 'm1-inc', t: 2, src: 'rec', title: 'Incident: the nightly jobs cannot connect', time: '02:12',
        alert: '**Four pipelines fail within a minute with `FATAL: sorry, too many clients already`.** The dashboards are slow. The on-call engineer can still log in as the admin role.',
        clues: ['`max_connections` is 100 and `pg_stat_activity` has 100 rows', '71 of them are `idle`, and the oldest has been open since 23:40', 'They all come from one application server, in the user `reporting`'],
        opts: [
          { t: 'Find the idle sessions by user and age, stop the leak at its source, and end the old sessions with `pg_terminate_backend`', fb: '' },
          { t: 'Restart the server', fb: 'It ends every session, including the healthy ones, and the leak starts again.' },
          { t: 'Raise `max_connections` and restart', fb: 'The leak will fill any limit, and the restart is an outage.' },
          { t: 'Wait, the idle sessions will end by themselves', fb: 'An idle session stays until the client closes it. Nothing times it out by default.' }
        ],
        best: 0,
        why: 'The slots are held by connections that do nothing. The state and the start time in `pg_stat_activity` show whose they are. The recording shows the error of a full server: ' + SL.etl_connections_accepted + ' normal connections were accepted, and the next one got *' + X('srv.slots_error_etl').split('FATAL:  ')[1] + '*.',
        checks: [
          ['Log in with the reserve', 'A superuser can use the slots that are reserved for superusers.'],
          ['Group the sessions', '`SELECT usename, state, count(*), min(backend_start) FROM pg_stat_activity GROUP BY 1, 2`.'],
          ['End the old ones', '`SELECT pg_terminate_backend(pid)` for the sessions that are idle and old, for that user only.'],
          ['Fix the cause', 'Close connections in the application, or pool them, and cap the workers.']
        ],
        tell: 'The server ran out of connection slots because an application held seventy idle connections. I ended the old idle sessions of that one user, and the pipelines connected again. The application now closes its connections and the batch workers are capped. The limit was not the problem.',
        prevent: ['Give each application its **own role** and a **connection limit** (`ALTER ROLE ... CONNECTION LIMIT`)', 'Set an **idle timeout** in the application, or use a pooler', 'Alert on the **number of sessions** as well as on errors']
      }),

      B.qa({
        id: 'qa-processes', t: 1, tag: 'PostgreSQL', secs: 60,
        q: 'What runs on a PostgreSQL server?',
        pts: ['The postmaster listens and starts a backend process for each connection', 'Background processes: checkpointer, background writer, WAL writer, autovacuum', 'Shared memory holds the buffers', 'The data directory holds the files, the WAL and the settings'],
        short: 'One main process, the postmaster, listens on the port and starts a **backend process for each client connection**. A few background processes work for everybody: the checkpointer and the background writer write changed pages to the files, the WAL writer flushes the log, and the autovacuum launcher starts workers that clean up dead rows. All of them share a block of memory with the buffer cache, and everything on disk is in the data directory: one file for each table and index under `base`, the write-ahead log in `pg_wal`, and the settings. I recorded a fresh server: five background processes, and three clients were three more processes. The process for each connection is why the number of connections is limited and why poolers exist.',
        fu: [['Why not threads?', 'It is the original design and it has worked well. Processes isolate failures. The cost is memory for each connection.'], ['What is the postmaster?', 'The first process, which starts the others and restarts them after a crash.']],
        trap: 'Describing PostgreSQL as one process with many threads.',
        real: 'Say how many connections your servers have, and who uses them.'
      }),

      B.qa({
        id: 'qa-pages', t: 1, tag: 'PostgreSQL', secs: 60,
        q: 'How does PostgreSQL store a table?',
        pts: ['As a file of 8 kB pages', 'A page has a header, line pointers and row versions', 'Reads and writes are by page, not by row', 'Large values go to a TOAST table'],
        short: 'A table is **a file of 8 kilobyte pages** in the data directory. A page holds a small header, a list of line pointers and the row versions, which fill the page from the end. PostgreSQL reads and writes whole pages through shared buffers, never single rows, which is why the size of a table is always a multiple of 8,192 bytes. I recorded a table of 200,000 orders: 2,062 pages, about 97 rows on each page, and a `_fsm` file next to it for free space. Values larger than about 2 kB are compressed or moved to the **TOAST** table of the table, so a row can be much bigger than a page. Because a page is the unit, `SELECT *` on wide rows reads more than a list of columns.',
        fu: [['What is the free space map?', 'A file that tells inserts which pages have room.'], ['Can the page size change?', 'Only when PostgreSQL is built. 8 kB is the default.']],
        trap: 'Saying that PostgreSQL stores rows one after another in a file that is read row by row.',
        real: 'Describe a table of yours that is wide, and what you select from it.'
      }),

      B.qa({
        id: 'qa-toast', t: 2, tag: 'PostgreSQL', secs: 60,
        q: 'What is TOAST?',
        pts: ['A way to store values that do not fit in a row', 'Over about 2 kB a value is compressed, or stored out of line in chunks', 'The row keeps a pointer', 'Selecting the column reads the chunks'],
        short: 'TOAST is how PostgreSQL stores large values. A row has to fit on an 8 kB page, so a value over about 2 kB is **compressed**, and if it is still large it is **moved out of line** into a TOAST table of the table, in chunks of about 2 kB, and the row keeps a pointer. In my recording a text of 21,000 characters that compresses well took 252 bytes, and one of 20,480 characters that does not compress was stored in 11 chunks. The consequence for a data engineer is that the table itself stays small and fast to scan, and a query that selects the big column pays for reading and decompressing the chunks. So select only the columns you need, and know that updating a big column rewrites it.',
        fu: [['Where can you see it?', '`reltoastrelid` in `pg_class` names the TOAST table, and `pg_column_size` shows the stored size.'], ['Can it be turned off?', 'The storage strategy of a column can be changed with `ALTER TABLE ... SET STORAGE`. From documentation.']],
        trap: 'Believing that a row can never be bigger than 8 kB.',
        real: 'Name a table with JSON or text columns and how big the values are.'
      }),

      B.qa({
        id: 'qa-connections', t: 1, tag: 'PostgreSQL', secs: 75,
        q: 'The application gets "too many clients already". What do you do?',
        pts: ['Log in as a superuser: slots are reserved for it', 'Look at pg_stat_activity by user, state and age', 'Find the leak or the missing cap on workers', 'Pooler or a higher limit only after that'],
        short: 'First I get in, which I can do with a superuser because some slots are reserved for them: in my recording ten slots with three reserved gave a normal role seven connections, and the eighth was refused. Then I read `pg_stat_activity` grouped by user and state. If most sessions are idle and old, the application leaks connections or has no cap on its workers, and I fix that and end the stale sessions with `pg_terminate_backend`. If the sessions are active, the server is overloaded and more connections would not help. A pooler such as PgBouncer is the next step, because each connection is a process with its own memory. Raising `max_connections` needs a restart and usually makes the server slower, so it comes last.',
        fu: [['Does a pooler have downsides?', 'In transaction mode it breaks session features: temporary tables, session settings, advisory locks, some prepared statements. From documentation.'], ['How do you limit one application?', '`ALTER ROLE app CONNECTION LIMIT 20`, so that it cannot fill the server.']],
        trap: 'Raising max_connections first.',
        real: 'Describe how connections were counted and capped where you worked.'
      }),

      B.qa({
        id: 'qa-settings', t: 2, tag: 'PostgreSQL', secs: 60,
        q: 'How do you change a setting, and when does it apply?',
        pts: ['Every setting has a context in pg_settings', 'user: SET in a session. sighup: edit and reload. postmaster: restart', 'ALTER SYSTEM writes postgresql.auto.conf', 'pending_restart shows a change that is waiting'],
        short: 'Each setting has a context in `pg_settings` that says when a change takes effect. Settings with the context **user**, such as `work_mem`, can be changed with `SET` for one session or with `ALTER ROLE` or `ALTER DATABASE` for a user or a database. Settings with the context **sighup**, such as `autovacuum_naptime`, are edited in the configuration and applied with `pg_reload_conf()`. Settings with the context **postmaster**, such as `shared_buffers`, `max_connections` and `wal_level`, need a **restart**. `ALTER SYSTEM` writes `postgresql.auto.conf`, which wins over `postgresql.conf`. In mission 9 I changed `shared_buffers` and saw `pending_restart` turn true while the value did not move, and `work_mem` apply at once.',
        fu: [['Where does a value come from?', 'The `source` and `sourcefile` columns of `pg_settings` say.'], ['Can you undo ALTER SYSTEM?', '`ALTER SYSTEM RESET name`, then a reload.']],
        trap: 'Editing postgresql.conf and expecting every setting to apply at once.',
        real: 'Name a setting you changed and how you applied it.'
      }),

      B.recap({
        id: 'm1-recap', n: 1, badge: 'Page Reader', color: '#BFDBFE',
        pts: [
          'A server is a **postmaster**, **' + PR.background_processes + ' background processes**, **one backend for each connection**, shared memory and a data directory.',
          'A table is a file of **8,192-byte pages**: ' + n(TB.pages) + ' pages, ' + TB.rows_per_page + ' rows on each, ' + n(TB.bytes) + ' bytes.',
          'Big values are **compressed or stored out of line** in a TOAST table.',
          'A setting changes with `SET` (user), a **reload** (sighup) or a **restart** (postmaster).',
          'A full server keeps slots for a superuser: ' + SL.etl_connections_accepted + ' of 10 for normal roles. Find the leak before you raise the limit.'
        ],
        lines: [
          'I can say what each process does.',
          'I can find a table on disk.',
          'I know which settings need a restart.'
        ]
      })
    ]
  });
})();
