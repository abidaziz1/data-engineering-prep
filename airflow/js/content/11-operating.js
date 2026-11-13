/* Mission 11: operating Airflow, and upgrading to Airflow 3. Health, the command line, questions for the metadata database, cleanup, DAG versions, and the old imports.
   The health answer, the cheat sheet, the six queries, the cleanup dry run, the DAG versions and the import checks are recorded from Apache Airflow 3.4.0 (airflow/verify/capture_af.py).
   The changes of 3.4.0 are from its release notes, and the notes on schedulers and databases are from the documentation. */
(function () {
  var B = LAB.b, G = LAB.get;
  var HE = G.counts('af.health'), MD = G.counts('af.metadb'), MT = G.counts('af.metadb_tables'), VR = G.counts('af.versions'), IM = G.counts('af.imports'), RF = G.counts('af.ruff'), OLD = G.file('dags_broken/old_style.py');
  var DR = G.text('af.db_clean_dry_run'), BRK = G.counts('af.broken');
  G.expect(HE.scheduler.status === 'healthy' && HE.triggerer.status === 'healthy' && HE.dag_processor.status === 'healthy' && HE.metadatabase.status === 'healthy', 'the recorded health answer');
  G.expect(MT.count === 61 && MT.names.indexOf('xcom_v2') >= 0 && MT.names.indexOf('dag_version') >= 0, 'the recorded metadata tables');
  G.expect(VR.versions_before.join() === '1' && VR.versions_after.join() === '1,2' && VR.runs[1].dag_version === 2 && VR.runs[1].tasks === 4, 'the recorded DAG versions');
  G.expect(IM.filter(function (x) { return x.status === 'fails'; }).length === 3 && RF.findings_old_style === 8, 'the recorded import checks and ruff findings');
  var importRows = IM.map(function (x) { return [x.stmt.replace(/^from /, 'from ').replace(' import ', ' import '), x.status === 'works' ? (x.warnings.length ? 'works, warns' : 'works') : 'fails', (x.warnings[0] || x.error || '').replace(/`/g, '').slice(0, 110)]; });
  var cleanedTables = (DR.match(/purged from tables \[([^\]]*)\]/) || [0, ''])[1].replace(/'/g, '').split(', ');
  var rowsFound = (DR.match(/Found (\d+) rows meeting deletion criteria\.\s*$/) || [0, '0'])[1];

  function healthLines() { return G.plain(JSON.stringify(HE, null, 2), { cmd: 'curl http://127.0.0.1:<port>/api/v2/monitor/health', d: 25 }); }
  function cheatLines() { return G.plain(G.text('af.cheat_sheet').split('\n').slice(0, 22).join('\n'), { cmd: 'airflow cheat-sheet', d: 35 }); }
  function cleanLines() { return G.plain(DR.split('\n').slice(0, 5).join('\n').replace(/\s+$/gm, ''), { cmd: 'airflow db clean --dry-run --clean-before-timestamp 2026-03-15', d: 60 }); }
  function metaTabs() {
    return ['states', 'tries', 'runs', 'run_types', 'pools'].map(function (k) {
      return { layer: 'SQL', name: MD[k].question, c: 'raw', cols: MD[k].cols, rows: MD[k].rows, trk: 0 };
    });
  }

  LAB.addChapter({
    id: 'm11', n: 11, title: 'Operating Airflow, and upgrading to 3', short: 'Operating', blurb: 'Health, the command line, the metadata database, cleanup and the move from Airflow 2', minutes: 70,
    focus: ['mon'],
    goals: [
      'Read the **health** of the scheduler, the DAG processor, the triggerer and the database.',
      'Use the **command line** and a few **read-only queries** to answer questions on call.',
      'Explain what **`airflow db clean`** removes and why you run it with a dry run first.',
      'Plan an **upgrade from Airflow 2**: imports, removed arguments, behaviour changes, order of steps.',
      'Know what changed in **3.4**: Python 3.11, psycopg3, one run for each asset event, draining, task loops.'
    ],
    say: 'Mission 11 is the day-to-day and the move to Airflow 3. I recorded the health answer of a running stack, the command line cheat sheet, six questions that I asked the metadata database, a cleanup dry run, a DAG that changed between two runs, and which old imports still work in 3.4.0. The release notes tell the rest.',
    scenes: [
      B.talk({
        id: 'm11-talk', t: 1, src: 'docs', title: 'What you watch when you run Airflow',
        say: 'Press Next for each. Most incidents begin with one of these going quiet.',
        items: [
          ['The four processes', 'The **scheduler** makes runs and starts tasks. The **DAG processor** parses files. The **triggerer** wakes deferred tasks. The **API server** serves the UI and the APIs. Each one reports a heartbeat. If one stops, a part of Airflow stops while the rest looks fine.', 'Heartbeats tell you who is alive.'],
          ['The metadata database', 'It holds everything: DAGs, runs, task states, XCom, connections. It must be PostgreSQL or MySQL in production. SQLite, which the recording used, allows one writer at a time and is for development.', 'If it is slow, Airflow is slow.'],
          ['More than one scheduler', 'Airflow supports **more than one scheduler** at the same time, for speed and for high availability, with no extra coordination, using row-level locks in the database. The documentation lists PostgreSQL 12+ and MySQL 8.0+ as ready for it.', 'A second scheduler is cheap insurance.'],
          ['Runs and tasks', 'Watch for failed runs, runs that take longer than usual, tasks that wait in `scheduled` or `queued`, and sensors that wait for days.', 'The pipeline\'s own health.'],
          ['Growth and cleanup', 'Every run and every try is a row, and every XCom is a row. Without cleanup the metadata database grows for ever, and the UI slows down with it.', 'Retention is part of the design.']
        ],
        cols: 1
      }),

      B.term({
        id: 'm11-health', t: 1, src: 'rec', title: 'The health endpoint of a running stack',
        say: 'This is the real answer of the API server for `/api/v2/monitor/health`, taken from the recorded stack of four processes with a SQLite database. The heartbeat times are replaced by `<time>`.',
        lines: healthLines,
        after: 'Four parts report: the **metadatabase**, the **scheduler**, the **DAG processor** and the **triggerer**. Each shows a status, a host name and the time of its last heartbeat. A monitoring check calls this endpoint and alerts when any status is not `healthy`, or when a heartbeat is older than a few intervals. The command `airflow jobs check` gives the same answer for one job type, as mission 1 showed.',
        afterKind: 'tip',
        doneSay: 'Alert on every part and do not rely on the UI. A silent scheduler still serves a working UI.'
      }),

      B.term({
        id: 'm11-cheat', t: 1, src: 'rec', title: 'The command line, at a glance',
        say: 'This is the real output of `airflow cheat-sheet`, the first lines of it. It lists every command with a one-line description.',
        lines: cheatLines,
        after: 'The first group is the processes: `api-server`, `dag-processor`, `scheduler`, `triggerer`, and `standalone`, which runs them together for development. The rest of the sheet has groups for `dags`, `tasks`, `pools`, `connections`, `variables`, `backfill`, `db` and more. You do not need to remember them. `airflow <group> --help` lists what you need.',
        afterKind: 'tip',
        doneSay: 'Know the groups. Look up the exact command when you need it.'
      }),

      B.cmp({
        id: 'm11-oncall', t: 1, src: 'rec', title: 'Questions on call, and the command that answers them',
        say: 'Press Next. Each row is a question that you will be asked at some night, and a command that I used in the recording or in an earlier mission.',
        cols: ['The question', 'The command', 'Where you saw it'],
        hl: 1,
        rows: [
          ['Is the scheduler alive?', '`airflow jobs check --job-type SchedulerJob`', 'Mission 1: "' + G.text('af.jobs_check') + '"'],
          ['Which pools exist and how big are they?', '`airflow pools list`', 'Mission 8'],
          ['Why does this task not start?', '`airflow tasks failed-deps <dag> <task> <run>`', 'Mission 8'],
          ['What would this template render to?', '`airflow tasks render <dag> <task> <date>`', 'Mission 2'],
          ['Does this DAG run?', '`airflow dags test <dag> <date>`', 'Mission 2'],
          ['Which connections are stored?', '`airflow connections list`', 'Mission 9'],
          ['What would a backfill do?', '`airflow backfill create ... --dry-run`', 'Mission 3'],
          ['What would the cleanup delete?', '`airflow db clean --dry-run ...`', 'On the next screens']
        ],
        steps: [
          { upto: 4, say: 'The first four are about a task and a run: alive, blocked, rendered, runnable.' },
          { upto: 8, say: 'The others look at settings and at what a bulk action would do. Make `--dry-run` a habit for anything that changes many rows.' }
        ]
      }),

      B.rows({
        id: 'm11-meta', t: 1, src: 'rec', title: 'Ask the metadata database',
        steps: [
          {
            say: 'The metadata database has ' + MT.count + ' tables in Airflow 3.4.0. For a read-only question on call, a short SQL query is often faster than the UI. These are five that I ran against the recorded stack, with their answers. The recording used SQLite, and the same SQL works on PostgreSQL.',
            tabs: metaTabs(),
            notes: ['The queries are `SELECT` only. Never write to this database by hand. The task instance table keeps every try as a row, so the first query filters on `working_set = 1` to count each task instance once. The XCom table is `xcom_v2` in 3.4.0, and the table of DAG versions is `dag_version`.']
          }
        ]
      }),

      B.term({
        id: 'm11-clean', t: 1, src: 'rec', title: 'airflow db clean, as a dry run',
        say: 'Old runs, tries and XComs pile up. `airflow db clean` removes rows older than a date. This is the real start of the dry run: it lists what would go, and deletes nothing.',
        lines: cleanLines,
        after: 'The command named ' + cleanedTables.length + ' tables: `' + cleanedTables.join('`, `') + '`. For each one it counts the rows that meet the criteria, for example **' + rowsFound + ' rows of `dag_run`** in the recording. Run it with `--dry-run`, read the counts, then run it without. Choose a retention that your audits allow, and run it on a schedule, for example as a weekly DAG.',
        afterKind: 'tip',
        doneSay: 'Retention is a decision. A dry run shows its size before you commit.'
      }),

      B.rows({
        id: 'm11-versions', t: 2, src: 'rec', title: 'DAG versions: the run keeps the version it used',
        steps: [
          {
            say: 'Airflow 3 stores a **version** of a DAG when its structure changes. I ran a DAG with three tasks, added a fourth task to the file, and ran it again.',
            tabs: [{
              layer: 'DAG VERSIONS', name: 'The two runs', c: 'raw',
              cols: ['Run', 'DAG version', 'Tasks in the run'],
              rows: VR.runs.map(function (r) { return [r.run, String(r.dag_version), String(r.tasks)]; }),
              trk: 0
            }],
            notes: ['The versions after the change were ' + VR.versions_after.join(' and ') + '. The first run kept its three tasks, and the second run used version 2 with four. In the UI you can open the DAG as it was for an old run. Without versions, a changed DAG would rewrite its own past.']
          }
        ]
      }),

      B.rows({
        id: 'm11-imports', t: 1, src: 'rec', title: 'Which Airflow 2 imports still work in 3.4.0',
        steps: [
          {
            say: 'I tried the old and the new import path of the names that DAGs use most, in Airflow 3.4.0. This is what each one did.',
            tabs: [{
              layer: 'IMPORTS', name: 'Old and new paths', c: 'raw',
              cols: ['Import', 'Result', 'What Airflow said'],
              rows: importRows,
              trk: 0
            }],
            notes: ['Most old paths still **work and warn**, and the warning names the new path. Three **fail**: `days_ago`, `airflow.datasets.Dataset` and `apply_defaults` are gone. The new paths are `airflow.sdk` for the core names and `airflow.providers.standard` for the common operators.']
          }
        ]
      }),

      B.cmp({
        id: 'm11-upgrade', t: 2, src: 'rec', title: 'The upgrade from Airflow 2: what to change',
        say: 'Press Next. The first rows break at import time, the later ones change behaviour. Recorded means that I ran it in 3.4.0.',
        cols: ['Area', 'In Airflow 2', 'In Airflow 3.4', 'How you find it'],
        hl: 2,
        rows: [
          ['`schedule_interval`', 'Accepted', 'Removed: TypeError at import (recorded in mission 2)', 'ruff `AIR301`, the import test'],
          ['`days_ago`, `apply_defaults`, `Dataset`', 'Available', 'Removed: ImportError (recorded above)', 'ruff `AIR301`, the import test'],
          ['`airflow.operators.*`, `airflow.decorators`', 'The place of the operators', 'Work and warn. Use `airflow.providers.standard` and `airflow.sdk`', 'ruff `AIR311` and `AIR312`'],
          ['The metadata database in a task', 'A session was possible', 'RuntimeError (recorded in mission 9)', 'Search for `create_session`'],
          ['`execution_date` in the context', 'A normal value', 'Replaced by `logical_date`, which a manual run may not have (mission 3)', 'Test a manual run'],
          ['`max_active_tasks`', 'A limit for the whole DAG', 'A limit for each DAG run (mission 8)', 'A staging run under load'],
          ['Catchup default', 'On', 'Off (mission 3)', 'Read the DAGs that relied on it'],
          ['The REST API', 'Version 1 paths', 'The paths of version 2, as in `/api/v2/monitor/health`', 'Check scripts that call the API']
        ],
        steps: [
          { upto: 3, say: 'The first three groups are code. ruff finds nearly all of them, and the import test finds the rest.' },
          { upto: 8, say: 'The others are behaviour. No linter sees them. Rehearse the upgrade in staging with a copy of real DAGs and test a manual run, a backfill and a mapped task.' }
        ]
      }),

      B.talk({
        id: 'm11-what34', t: 2, src: 'docs', title: 'What 3.4.0 changed, for people who upgrade',
        say: 'Press Next. These come from the release notes of Airflow 3.4.0, dated 6 November 2026.',
        items: [
          ['Python 3.11 or newer', 'Support for Python 3.10 is removed. Python 3.10 reaches its end of life in October 2026, and Airflow drops a Python version when it does. Check your images before you upgrade.', 'Check the Python of your image.'],
          ['psycopg3 for PostgreSQL', 'The default driver for the metadata database is now psycopg3, for the sync and the async engine. A bare `postgresql://` URL is rewritten. To keep another driver you install its extra and configure it yourself.', 'Test your connection string.'],
          ['One run for each asset event', 'A DAG that schedules on one asset, or on an OR of assets, now creates **one run for each event** and not one run for all queued events. Schedules that need several events still batch. The recording in mission 5 shows both.', 'A burst of updates makes a burst of runs.'],
          ['Draining', 'A DAG can be in a `draining` state: the scheduler creates no new scheduled or asset-triggered runs, running ones finish, and the DAG then becomes paused. It is a graceful pause for a deployment window.', 'Pause without cutting runs.'],
          ['Task loops and DAG importers', 'Task loops (mission 5) and DAGs in other languages (mission 1) are new. The importer framework and the language SDKs are marked experimental.', 'New, and not yet stable.'],
          ['The `Dataset` alias is removed', 'Use `Asset` from `airflow.sdk`. The recorded import of `airflow.datasets` fails.', 'A search and replace.'],
          ['Downgrading is slow', 'A migration in 3.4.0 stores new XCom rows in a new table, `xcom_v2`. Upgrading was tested on a table of 300 million rows and does not touch the data. A **downgrade** has to copy the new rows back, which can take long, so back up first, especially on MySQL.', 'Plan the way back before you go.']
        ],
        cols: 1
      }),

      B.quiz({
        id: 'm11-q1', t: 1,
        q: 'The UI loads, and no new run has been created for an hour. Which part do you check first?',
        opts: [
          { t: 'The scheduler: its heartbeat in the health endpoint and its log', fb: '' },
          { t: 'The API server, because the UI is part of it', fb: 'The UI works, so the API server is up.' },
          { t: 'The triggerer', fb: 'It wakes deferred tasks. It does not create runs.' },
          { t: 'The DAG processor', fb: 'It parses files. New runs come from the scheduler.' }
        ],
        ok: 0, why: 'The scheduler creates runs. The health answer lists each part with its own status and heartbeat, and the recorded one showed all four as `' + HE.scheduler.status + '`.'
      }),

      B.quiz({
        id: 'm11-q2', t: 1,
        q: 'What does `airflow db clean --dry-run` do?',
        opts: [
          { t: 'It deletes old rows after asking for a confirmation', fb: 'A dry run deletes nothing.' },
          { t: 'It lists the tables and counts the rows that the cleanup would remove, and deletes nothing', fb: '' },
          { t: 'It repairs corrupt tables', fb: 'It has no repair role.' },
          { t: 'It cleans the log folder', fb: 'It works on the database.' }
        ],
        ok: 1, why: 'The recorded dry run named ' + cleanedTables.length + ' tables and counted rows for each, for example ' + rowsFound + ' rows in `dag_run`. Run it first for every bulk delete.'
      }),

      B.quiz({
        id: 'm11-q3', t: 1,
        q: 'Which database do you use for the metadata of a production Airflow?',
        opts: [
          { t: 'SQLite, because it is the default', fb: 'It is the default for development. It allows one writer at a time.' },
          { t: 'PostgreSQL or MySQL', fb: '' },
          { t: 'Any database that speaks SQL', fb: 'The supported ones are listed.' },
          { t: 'The one that is cheapest', fb: 'Choose a supported one.' }
        ],
        ok: 1, why: 'The documentation lists PostgreSQL 12+ and MySQL 8.0+ for running more than one scheduler, and says that SQLite is the default backend for starting without an external database. The recording used SQLite for one machine, and its CLI sometimes had to retry on "database is locked".'
      }),

      B.quiz({
        id: 'm11-q4', t: 1,
        q: 'You search the metadata database for failed runs. Which table do you read?',
        opts: [
          { t: '`dag_run`', fb: '' },
          { t: '`xcom_v2`', fb: 'That table holds task return values.' },
          { t: '`slot_pool`', fb: 'That table holds the pools.' },
          { t: '`connection`', fb: 'That table holds connections.' }
        ],
        ok: 0, why: 'The recorded query `' + MD.runs.sql.slice(0, 80) + '...` reads `dag_run`. It found ' + MD.runs.rows.length + ' DAGs with failed runs in the recording, all of them on purpose.'
      }),

      B.quiz({
        id: 'm11-q5', t: 2,
        q: 'You upgrade from Airflow 2 and a DAG file uses `from airflow.utils.dates import days_ago`. What happens in 3.4.0?',
        opts: [
          { t: 'It works and warns', fb: 'That is true for many old paths, but not this one.' },
          { t: 'It fails to import, and the DAG shows an import error', fb: '' },
          { t: 'It works silently', fb: 'Nothing is silent here.' },
          { t: 'The scheduler crashes', fb: 'A DAG file with an error does not crash the scheduler.' }
        ],
        ok: 1, why: 'The recorded error was `' + IM.filter(function (x) { return x.stmt.indexOf('days_ago') >= 0; })[0].error + '`. The DAG processor stores the error and shows it in the UI, and the other DAGs keep running.'
      }),

      B.quiz({
        id: 'm11-q6', t: 2,
        q: 'A DAG\'s structure changes between two runs: a task is added. In Airflow 3, which version does the first (old) run show?',
        opts: [
          { t: 'The new version, with the new task', fb: 'That would rewrite the past.' },
          { t: 'Its own version, with the old tasks', fb: '' },
          { t: 'An error', fb: 'Old runs stay readable.' },
          { t: 'No version: only the latest is stored', fb: 'Airflow 3 stores each version.' }
        ],
        ok: 1, why: 'The recorded runs used version ' + VR.runs[0].dag_version + ' with ' + VR.runs[0].tasks + ' tasks and version ' + VR.runs[1].dag_version + ' with ' + VR.runs[1].tasks + '. The DAG version table keeps both.'
      }),

      B.quiz({
        id: 'm11-q7', t: 2,
        q: 'You plan the upgrade to 3.4.0 for Saturday. A colleague says you can always go back on Sunday. What does the release note warn about?',
        opts: [
          { t: 'Nothing: a downgrade is as fast as an upgrade', fb: 'The note says otherwise.' },
          { t: 'A downgrade must copy the new XCom rows back to the old table, which can be slow, and on MySQL a failure can leave the schema partly downgraded', fb: '' },
          { t: 'A downgrade is not possible', fb: 'It is possible and can be slow.' },
          { t: 'A downgrade deletes all DAGs', fb: 'The note does not say that.' }
        ],
        ok: 1, why: 'The release note says that 3.4.0 stores new XCom rows in `xcom_v2`, that upgrading was tested on a table of 300 million rows without touching the data, and that downgrading has to copy the written values back. It advises a backup before a downgrade on MySQL.'
      }),

      B.quiz({
        id: 'm11-q8', t: 2,
        q: 'A DAG schedules on one asset and its producer updates the asset five times in a minute. What does Airflow 3.4.0 do by default?',
        opts: [
          { t: 'One run that takes all five events', fb: 'That was the behaviour before 3.4.' },
          { t: 'Five runs, one for each event', fb: '' },
          { t: 'The first event only', fb: 'No event is dropped.' },
          { t: 'It depends on the executor', fb: 'The executor is not involved.' }
        ],
        ok: 1, why: 'The release notes say that single-asset schedules and OR expressions create one run for each event, and that batching can be turned back on with `batch_asset_events`. The recording of mission 5 shows three events and three runs.'
      }),

      B.bug({
        id: 'm11-bug1', t: 2, q: 'This DAG was written for Airflow 2. It does not import in Airflow 3.4.0. Click a line that makes it fail.',
        file: 'old_style.py', lang: 'python', code: OLD, bad: [G.at(OLD, /import days_ago/), G.at(OLD, /schedule_interval/), G.at(OLD, /start_date=days_ago/)],
        hint: 'The recorded import error names a function that is gone.',
        why: 'The recorded error: `' + BRK['old_style.py'].import_errors['old_style.py'].replace(/\s*\(\/[^)]*\)/, '') + '`. Ruff found eight things: `schedule_interval` and `provide_context` (removed), `days_ago` (removed), and the old imports of `DAG`, `Variable`, `BashOperator` and `PythonOperator` (moved or deprecated), plus a naming rule. Fix the removals first.',
        fix: OLD.replace('from datetime import datetime\n', 'import pendulum\n').replace('from airflow import DAG\nfrom airflow.decorators import task\nfrom airflow.models import Variable\nfrom airflow.operators.bash import BashOperator\nfrom airflow.operators.python import PythonOperator\nfrom airflow.utils.dates import days_ago\nfrom airflow.utils.trigger_rule import TriggerRule\n', 'from airflow.providers.standard.operators.bash import BashOperator\nfrom airflow.providers.standard.operators.python import PythonOperator\nfrom airflow.sdk import DAG, Variable\nfrom airflow.task.trigger_rule import TriggerRule\n').replace('context["execution_date"]', 'context["logical_date"]').replace('schedule_interval="@daily"', 'schedule="@daily"').replace('start_date=days_ago(2)', 'start_date=pendulum.datetime(2026, 3, 1, tz="UTC")').replace('{{ execution_date }}', '{{ logical_date }}').replace('python_callable=load, provide_context=True, ', 'python_callable=load_rows, ').replace('def load(**context):', 'def load_rows(**context):').replace('load_orders = PythonOperator', 'load = PythonOperator').replace('extract >> load_orders', 'extract >> load'),
        cheer: 'Start with what is removed. The warnings can wait.'
      }),

      B.order({
        id: 'm11-ord', t: 1, q: 'Put the steps of a safe upgrade in order.',
        items: [
          'Read the release notes of the new version, and list the changes that touch your DAGs and your platform',
          'Run ruff with the AIR rules and the import test on your DAGs in an environment of the new version',
          'Back up the metadata database',
          'Upgrade a staging deployment, run `airflow db migrate`, and run a real set of DAGs, a manual run and a backfill',
          'Upgrade production in a quiet window, with the plan to go back, and watch the health of every part'
        ],
        why: 'Reading and linting cost nothing and find most of the work. A backup comes before the first migration. Staging finds the behaviour changes that no linter sees, and production comes last with a way back.'
      }),

      B.decide({
        id: 'm11-dec', t: 2, src: 'docs', title: 'Decision: how do you upgrade Brewline from Airflow 2 to 3?',
        scenario: 'Brewline runs Airflow 2.10 with 60 DAGs, PostgreSQL, and CeleryExecutor. Eight DAGs use the metadata database inside tasks, and many use old imports. The nightly pipeline must not miss a night. Which plan do you choose?',
        opts: [
          { t: 'Upgrade in place on Friday afternoon and fix what breaks over the weekend', d: 'It is the fastest.', lose: 'Eight DAGs fail at run time on the database access, nobody has rehearsed the migration, and a downgrade would be slow and risky. The weekend is the cost.' },
          { t: 'Lint and fix the DAGs first, rehearse the upgrade on staging with a copy of the database, then upgrade production in a quiet window with a backup', d: 'The removals and the database access are found and fixed before production, and the migration has been timed.' },
          { t: 'Build a second Airflow 3 and move the DAGs one by one', d: 'The old system keeps running. Nothing is cut over at once.', lose: 'Two systems share run history poorly, schedules must be turned off in one before they start in the other, and the team operates both for months. It is worth it only for very large installations.' }
        ],
        pick: 1,
        why: 'Most of the work is in the DAGs, and a linter and the import test find it. A rehearsal with a copy of the database finds the surprises and gives you the time of the migration. A backup and a quiet window cover the rest.',
        when: 'Choose the parallel deployment when the installation is large, the DAGs belong to many teams, or a failed night costs a lot.'
      }),

      B.incident({
        id: 'm11-inc', t: 2, src: 'docs', title: 'Incident: the sensors are deferred and never wake up', time: '06:15',
        alert: '**The 02:00 DAGs finished, except the partner files: all 12 deferrable sensors are `deferred` since 02:05, although the files arrived at 03:00. The scheduler and the UI look fine.**',
        clues: ['The health endpoint shows the triggerer with a heartbeat that is hours old', 'Deferrable sensors wait in the triggerer', 'The scheduler does not run triggers'],
        opts: [
          { t: 'Restart the triggerer, read its log for the reason it stopped, and add an alert on its heartbeat', fb: '' },
          { t: 'Restart the scheduler', fb: 'The scheduler is fine and does not run triggers.' },
          { t: 'Clear the 12 sensors without looking at the triggerer', fb: 'They defer again and wait for the same dead process.' },
          { t: 'Raise `triggerer.capacity`', fb: 'The triggerer is not running. Capacity does not matter.' }
        ],
        best: 0,
        why: 'A deferred task waits for an event from the triggerer. With no triggerer, the event never arrives, and the task stays deferred until a timeout. The health answer lists the triggerer on its own, so a check on it would have paged you at 02:30.',
        checks: [
          ['Health', 'Call the health endpoint or `airflow jobs check --job-type TriggererJob`. The recorded answer listed the triggerer with the others.'],
          ['Restart and watch', 'After the restart the triggers are picked up again. Watch the sensors wake up.'],
          ['Prevent', 'Alert on the heartbeat of every part, run more than one triggerer where you can, and keep a timeout on every sensor.']
        ],
        tell: 'The triggerer had stopped, so the deferred sensors never got their event. I restarted it, confirmed that the sensors woke up, and added an alert on the heartbeat of the triggerer.',
        prevent: 'A health check for every part, because the UI check alone proves only that the API server is up.'
      }),

      B.talk({
        id: 'm11-ext', t: 3, src: 'rec', title: 'Extra: what the metadata database tells you about a stack',
        say: 'Press Next. Three more questions that I asked the recorded database, and what they teach.',
        items: [
          ['How runs were started', 'The query on `run_type` found ' + MD.run_types.rows.map(function (r) { return r[1] + ' ' + r[0]; }).join(', ') + '. Scheduled, manual, backfill and asset-triggered runs are different things, and an incident review should know which kind it is looking at.', 'The run type is a column.'],
          ['Which tasks needed more tries', 'The query on `try_number` listed ' + MD.tries.rows.map(function (r) { return r[1] + ' (' + r[2] + ')'; }).join(', ') + '. In production, the same query shows the tasks that retry most: your flaky ones.', 'Find flaky tasks before they page you.'],
          ['The tables', 'The recorded database has ' + MT.count + ' tables. A few worth knowing: `dag_run`, `task_instance`, `xcom_v2`, `connection`, `variable`, `slot_pool`, `dag_version`, `asset_event`, `backfill`, `deadline`. Never write to them by hand.', 'A map of the data model.']
        ],
        cols: 1
      }),

      B.qa({
        id: 'qa-monitor', t: 1, tag: 'Operations', secs: 75,
        q: 'How do you monitor Airflow?',
        pts: ['Health of each part: scheduler, DAG processor, triggerer, API server, database', 'Heartbeats of every part, because the UI alone is not enough', 'Pipeline health: failed runs, late runs, tasks waiting', 'Growth of the metadata database'],
        short: 'I watch two things: the platform and the pipelines. For the platform I call the health endpoint of the API server, which reports the metadata database, the scheduler, the DAG processor and the triggerer, each with a status and a heartbeat, and I alert when any is not healthy or its heartbeat is old. A working UI proves only that the API server is alive.\n\nFor the pipelines I alert on failed runs after their retries, on runs that take longer than usual with a deadline alert, and on tasks that wait in scheduled or queued for too long, and I use short read-only queries on the metadata database to find flaky tasks.\n\nI also watch the size of the metadata database, and I run `airflow db clean` on a schedule, with a dry run first, because every run, try and XCom is a row.',
        fu: [['What is the first thing to check when nothing runs?', 'The heartbeat of the scheduler, then its log.']],
        trap: 'Saying that you check the UI. The UI works when the scheduler is dead.',
        real: 'Say how your team would notice that the scheduler stopped at 02:00.'
      }),

      B.qa({
        id: 'qa-upgrade', t: 2, tag: 'Airflow 3', secs: 90,
        q: 'How would you plan an upgrade from Airflow 2 to Airflow 3?',
        pts: ['Read the release notes, lint with the AIR rules, run the import test', 'Fix removals first, then moved imports', 'Find database access in tasks', 'Rehearse on staging with a copy, back up, quiet window, plan to go back'],
        short: 'I start with the work in the DAGs, because that is most of it. I read the release notes, run ruff with the AIR rules and an import test in an Airflow 3 environment. The removed names, like `schedule_interval` and `days_ago`, fail at import, so they go first. The moved imports, such as the standard operators, still work and warn, so they come next.\n\nThen the behaviour changes that no linter sees: tasks that open the metadata database, which Airflow 3 blocks, a manual run without a logical date, `max_active_tasks` as a per-run limit, and catchup off by default.\n\nI rehearse the migration on staging with a copy of the production database, time it, and run real DAGs, a manual run and a backfill. I take a backup, upgrade in a quiet window, and keep a plan to go back, because a downgrade can be slow.',
        fu: [['Which Python version does 3.4 need?', 'Python 3.11 or newer.'], ['What about the driver for PostgreSQL?', 'psycopg3 is the default in 3.4.']],
        trap: 'Upgrading first and fixing DAGs as they fail at night.',
        real: 'Say which Airflow version your team runs, and what would break first in an upgrade.'
      }),

      B.qa({
        id: 'qa-clean', t: 2, tag: 'Operations', secs: 60,
        q: 'The metadata database keeps growing. What do you do?',
        pts: ['Find what grows: XCom, task instances, logs of runs', 'airflow db clean with a dry run, on a schedule', 'Fix the cause: large XComs, many tiny tasks', 'Retention that audits allow'],
        short: 'First I find what grows, with a query on the table sizes. It is usually the XCom table, the task instances and the runs. Large return values explain the XCom table, and many small tasks or mapped copies explain the rest.\n\nThen I clean with `airflow db clean`. I always run it with a dry run first: the recorded dry run listed the tables it would purge, for example the XCom tables, the task instances, the deadlines and the DAG runs, and counted the rows for each. I choose a retention that the audit rules allow and run the command on a schedule.\n\nAnd I fix the cause, because cleanup only slows growth: I move big values out of XCom, and I group tiny tasks.',
        fu: [['Does the cleanup touch connections?', 'No. It works on run history tables, not on connections or variables.']],
        trap: 'Deleting rows by hand with SQL.',
        real: 'Say how long your team keeps run history, and who decided.'
      }),

      B.qa({
        id: 'qa-ha', t: 3, tag: 'Operations', secs: 60,
        q: 'How do you make the scheduler highly available?',
        pts: ['Run more than one scheduler', 'No extra coordination: row-level locks in the database', 'PostgreSQL 12+ or MySQL 8.0+', 'Watch the heartbeat of each'],
        short: 'Airflow supports more than one scheduler at the same time, for performance and for availability, and it needs no extra coordination. The schedulers coordinate through row-level locks in the metadata database, so the database must support them. The documentation lists PostgreSQL 12 and later and MySQL 8.0 and later as ready, and says that MariaDB did not implement the needed clauses until 10.6, so it is not a supported choice for several schedulers.\n\nSo I run two or three schedulers on separate hosts and watch the heartbeat of each in the health endpoint. The executor setting `parallelism` is per scheduler, so total capacity grows with their number. I also keep the database itself highly available, because every part depends on it.',
        fu: [['Does the triggerer scale the same way?', 'You can run several triggerers, and Airflow spreads triggers among them.']],
        trap: 'Running two schedulers on SQLite. It allows one writer at a time.',
        real: 'Say how many schedulers your team runs and what happens when one stops.'
      }),

      B.recap({
        id: 'm11-recap', n: 11, badge: 'On-call Ready', color: '#FED7AA',
        pts: [
          'Watch **each part**: the health endpoint reports the database, the scheduler, the DAG processor and the triggerer, each with a heartbeat. A working UI proves only that the API server is up.',
          'Use `--dry-run` for bulk actions. **`airflow db clean`** removes old runs, tries and XComs, so run it on a schedule. A few read-only queries answer most questions.',
          'Airflow 3 stores **DAG versions**, and each run keeps its version.',
          '**Upgrade from Airflow 2**: lint with the AIR rules, fix the removals (`schedule_interval`, `days_ago`, `Dataset`), find database access in tasks, rehearse on staging, back up, and keep a way back.',
          '**3.4.0**: Python 3.11 or newer, psycopg3, one run for each asset event, draining, task loops. Downgrading can be slow because of `xcom_v2`.'
        ],
        lines: [
          'I can read the health of a deployment.',
          'I can plan an upgrade from Airflow 2.',
          'I know what to clean and how to check it first.'
        ]
      })
    ]
  });
})();
