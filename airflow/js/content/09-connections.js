/* Mission 9: connections, secrets and providers. Where a task finds its secrets, which source wins, what the log shows, what a task may not do in Airflow 3, and what a provider is.
   The secrets run, the connection list, the failed database access and the installed providers are recorded from Apache Airflow 3.4.0 (airflow/verify/capture_af.py).
   The search order of the secrets backends is from the installed source. Secrets backends such as Vault or a cloud service were not run. */
(function () {
  var B = LAB.b, G = LAB.get;
  var SEC = G.counts('af.secrets'), DBA = G.counts('af.db_access'), PROV = G.table('af.providers'), SECRETS = G.file('dags/brewline_secrets.py'), DBFILE = G.file('dags/brewline_db_access.py');
  G.expect(SEC.masked === true && SEC.plain_password_visible === false && SEC.winner_host === 'api.partner.example', 'the recorded secrets run: env wins, masked');
  G.expect(/Direct database access via the ORM is not allowed/.test(DBA.error) && DBA.state === 'failed', 'the recorded failed database access');
  G.expect(PROV.rows.length === 7, 'the recorded providers are seven packages');

  var PW_BUG = [
    'from airflow.sdk import dag, task',
    'import pendulum',
    '',
    '',
    '@dag(schedule="@daily", start_date=pendulum.datetime(2026, 3, 1, tz="UTC"), catchup=False)',
    'def brewline_partner_export():',
    '    @task',
    '    def export():',
    '        api_key = "sk-live-9f3a77c1d2"',
    '        print("calling the partner API with", api_key[:6])',
    '',
    '    export()',
    '',
    '',
    'brewline_partner_export()'
  ].join('\n');
  var PW_FIX = PW_BUG.replace('from airflow.sdk import dag, task', 'from airflow.sdk import BaseHook, dag, task').replace('        api_key = "sk-live-9f3a77c1d2"\n        print("calling the partner API with", api_key[:6])', '        conn = BaseHook.get_connection("partner_api")\n        print("calling", conn.host, "as", conn.login)');
  var DB_FIX = [
    'import pendulum',
    'from airflow.sdk import dag, get_current_context, task',
    '',
    '',
    '@dag(dag_id="brewline_db_access", schedule=None, start_date=pendulum.datetime(2026, 3, 1, tz="UTC"), catchup=False)',
    'def brewline_db_access():',
    '    @task(retries=0)',
    '    def count_runs():',
    '        ti = get_current_context()["ti"]',
    '        print(ti.get_dr_count(dag_id="brewline_db_access"))',
    '',
    '    count_runs()',
    '',
    '',
    'brewline_db_access()'
  ].join('\n');
  var DB_ORM = DBFILE;

  function logLines() { return G.plain(SEC.task_log, { cmd: '# the log of the task use_secrets', d: 90 }); }
  function listLines() { return G.plain(G.text('af.connections_list'), { cmd: 'airflow connections list', d: 60 }); }
  function dbLines() { return G.plain('[error] Task failed with exception\n' + DBA.error, { cmd: '# the log of the task count_runs, which opens a database session', d: 120 }); }

  LAB.addChapter({
    id: 'm9', n: 9, title: 'Connections, secrets and providers', short: 'Secrets', blurb: 'Keep passwords out of code, know which source wins, and what a task may not do', minutes: 55,
    focus: ['qual'],
    goals: [
      'Use **connections** and **variables** instead of values in code, and read them with a hook or the SDK.',
      'Say where Airflow **looks first**: a secrets backend, environment variables, then the metadata database.',
      'Explain **masking** in logs, and what it does not cover.',
      'Explain why a task **cannot open the metadata database** in Airflow 3, and what to do instead.',
      'Say what a **provider** is, and read the list of installed providers.'
    ],
    say: 'Mission 9 is secrets. I stored a connection in the database and the same connection in an environment variable with different values, ran a task that prints its secrets, and recorded which one won and what the log showed. I also let a task reach for the metadata database and recorded the error that Airflow 3 gives.',
    scenes: [
      B.talk({
        id: 'm9-talk', t: 1, src: 'rec', title: 'Where a task finds its secrets',
        say: 'Press Next for each idea. The rule is simple: a secret never lives in the DAG file.',
        items: [
          ['A connection', 'A **connection** is a named set of settings for a system: a type, a host, a port, a login, a password, a schema, and extra fields. A task asks for it by its `conn_id`, for example `BaseHook.get_connection("brewline_api")`. The code never sees the password in the file.', 'Settings and secrets, named.'],
          ['A variable', 'A **variable** is a named value, such as a region or a threshold. A variable whose name looks secret, for example one with `secret` in the name, is masked in logs. Use a variable for a setting, and a connection for a login.', 'A named setting.'],
          ['Three places', 'A connection or variable can live in the **metadata database** (set in the UI or with `airflow connections add`), in an **environment variable** (`AIRFLOW_CONN_<ID>` and `AIRFLOW_VAR_<NAME>`), or in a **secrets backend** such as a vault. In the database they are encrypted with a Fernet key.', 'Choose the place by who manages the secret.'],
          ['Masking', 'Airflow hides the values of connection passwords and of sensitive variables in task logs and shows `***`. It replaces values that it knows about. It cannot hide a secret that your code transforms or prints in pieces.', 'A safety net, not a promise.'],
          ['Providers', 'A **provider** is a package that adds operators, hooks, sensors and connection types for one system: Postgres, HTTP, Amazon, Snowflake. You install the one you need. The standard operators now live in the **standard** provider.', 'Integrations are packages.']
        ],
        cols: 1
      }),

      B.code({
        id: 'm9-code', t: 1, src: 'rec', title: 'A task that reads connections and variables', file: 'brewline_secrets.py', lang: 'python', code: SECRETS,
        steps: [
          { say: 'This task asks for two connections and two variables and prints what it finds. I ran it with real values in the database and in the environment, and read the log.', lines: null },
          { say: '`BaseHook.get_connection("brewline_api")` returns a connection object with the host, the login and the password. The task never stores the secret.', lines: G.span(SECRETS, /conn = BaseHook/, /print\("password:/) },
          { say: '`Variable.get` reads a variable. The first is a plain setting. The second has `secret` in its name, so it is masked in the log.', lines: G.span(SECRETS, /print\("region:/, /print\("api_secret:/) },
          { say: 'The last line reads a second connection, to a warehouse, and prints only its host.', lines: G.span(SECRETS, /warehouse host/, /warehouse host/) }
        ],
        note: 'I put the same connection `brewline_api` in the database and in an environment variable, with different hosts and different passwords. The next screen shows which one the task got.'
      }),

      B.term({
        id: 'm9-term', t: 1, src: 'rec', title: 'The log of that task',
        say: 'This is the real log. Check three things: the host, the password line, and the warning.',
        lines: logLines,
        after: 'The host is `' + SEC.winner_host + '`. That is the host of the **environment variable**. The database held another host, and it lost. The password prints as `***`: Airflow masked it. The warning says that Airflow skips masking for a secret **shorter than five characters**, so a very short secret appears in the clear.',
        afterKind: 'tip',
        doneSay: 'The environment variable won. Remember that when a changed password does not take effect.'
      }),

      B.cmp({
        id: 'm9-order', t: 1, src: 'rec', title: 'Which source wins',
        say: 'The same connection id can exist in more than one place. Press Next for the order in which a task looks. It comes from the installed source of Airflow 3.4.0, and the recorded run agrees with it.',
        cols: ['Step', 'Source', 'What it is'],
        hl: 1,
        rows: [
          ['1', 'A secrets backend that you configured', 'Your vault or cloud secret service, set with `[secrets] backend`. It is searched first.'],
          ['2', 'Environment variables', '`AIRFLOW_CONN_<CONN_ID>` and `AIRFLOW_VAR_<NAME>` in the process of the task.'],
          ['3', 'The execution API of the API server', 'For a worker, the last place: the API server looks in the metadata database. The task never opens the database itself.']
        ],
        steps: [
          { upto: 1, say: 'If you configure a backend, it comes first. Without one, step 2 is first.' },
          { upto: 3, say: 'In the recording the environment variable `AIRFLOW_CONN_BREWLINE_API` had the host `api.partner.example`, and the database entry had `api.database.example`. The task saw the first. The list of connections warns about this: environment variables "may also define connections, including ones that override a database entry".' }
        ]
      }),

      B.term({
        id: 'm9-list', t: 1, src: 'rec', title: 'The connection list does not show environment connections',
        say: 'This is the real output of `airflow connections list`. Look at the warning at the bottom.',
        lines: listLines,
        after: 'The list shows the two connections that are stored in the **database**. The connection that came from an environment variable is not in it, although the task used it. When a UI edit has no effect, an environment variable with the same id may be overriding it.',
        afterKind: 'tip',
        doneSay: 'The list shows the database. The task sees the environment first.'
      }),

      B.code({
        id: 'm9-code-db', t: 1, src: 'rec', title: 'A task that reaches for the metadata database', file: 'brewline_db_access.py', lang: 'python', code: DB_ORM,
        steps: [
          { say: 'In Airflow 2 a task could open a session on the metadata database and read anything. This task does that to count the runs of the DAG. I ran it in Airflow 3.4.0.', lines: null },
          { say: 'The import of the ORM model and a session. This is the part that Airflow 3 blocks.', lines: G.span(DBFILE, /from airflow.models import DagRun/, /with create_session/) }
        ],
        note: 'The task ended with state ' + DBA.state + '.'
      }),

      B.term({
        id: 'm9-term-db', t: 1, src: 'rec', title: 'The error of Airflow 3',
        say: 'This is the real error from the log of that task.',
        lines: dbLines,
        after: 'Airflow 3 gives a task no way to the metadata database. A task talks to the **API server**, which keeps database credentials out of the code that runs on workers. To read something about a run, use what the SDK offers, for example `get_current_context()` or `ti.get_dr_count(...)`. The fix on the bug screen uses the second one, and I ran it.',
        afterKind: 'tip',
        doneSay: 'If a task needs the database, it needs an API or a store of its own.'
      }),

      B.cmp({
        id: 'm9-providers', t: 1, src: 'rec', title: 'Providers: the packages that were installed',
        say: 'A provider adds integrations. This is the list of providers in the recorded environment. Press Next to read what each one is for.',
        cols: ['Package', 'Version', 'What it gives you'],
        hl: 1,
        rows: [
          ['`apache-airflow-providers-standard`', G.meta('apache-airflow-providers-standard'), 'The common operators and sensors: Bash, Python, Empty, the file, time and external-task sensors, and their triggers.'],
          ['`apache-airflow-providers-common-sql`', G.meta('apache-airflow-providers-common-sql'), 'The base for SQL hooks and operators, such as `SQLExecuteQueryOperator`.'],
          ['`apache-airflow-providers-sqlite`', G.meta('apache-airflow-providers-sqlite'), 'The SQLite hook and connection type, which the recording used for its demo data.'],
          ['`apache-airflow-providers-http`', G.meta('apache-airflow-providers-http'), 'An HTTP hook, operator and sensor for calling APIs.'],
          ['`apache-airflow-providers-smtp`', G.meta('apache-airflow-providers-smtp'), 'Sending email.'],
          ['`apache-airflow-providers-common-io`, `-common-compat`', PROV.rows.filter(function (r) { return /common-io/.test(r[0]); })[0][1] + ', ' + PROV.rows.filter(function (r) { return /common-compat/.test(r[0]); })[0][1], 'Shared helpers for file systems, and for code that must run on several Airflow versions.']
        ],
        steps: [
          { upto: 2, say: 'The standard and SQL providers are what most DAGs import first. In Airflow 3 `BashOperator` and `PythonOperator` live in the standard provider, and the old import paths still work and warn (mission 11).' },
          { upto: 6, say: 'Other systems come from other packages: HTTP, SMTP, and in your own environment Postgres, Snowflake, Amazon, Google and more. Pin their versions, as you pin Airflow\'s.' }
        ]
      }),

      B.cmp({
        id: 'm9-where', t: 2, src: 'docs', title: 'Where should a secret live?',
        say: 'Four choices. Press Next to compare them. The right one depends on who manages the secret and how often it changes.',
        cols: ['Place', 'Good for', 'Watch out for'],
        hl: 1,
        rows: [
          ['In the DAG file or Git', 'Nothing. Never.', 'Anyone with read access to the repository sees the secret, for ever, in the history.'],
          ['The metadata database (the UI or `connections add`)', 'A small team, or development. It is encrypted with the Fernet key.', 'Whoever can use the UI or the API can read it. The key and the backups are secrets too.'],
          ['Environment variables', 'A deployment that injects secrets from its platform, for example a Kubernetes secret.', 'It overrides the database. Rotation means a restart, and the value is visible in the process environment.'],
          ['A secrets backend', 'Production: the secret has an owner, an audit trail and rotation in a vault or a cloud service.', 'It is searched first, so it overrides the others. It adds a dependency and calls on every lookup. I did not run one.']
        ],
        steps: [
          { upto: 2, say: 'The first is the mistake, and the second is acceptable while the team is small. Notice that both can be read by people who use Airflow.' },
          { upto: 4, say: 'The last two keep the secret with whoever owns it. A backend also gives rotation and an audit trail, which is why teams move there.' }
        ]
      }),

      B.quiz({
        id: 'm9-q1', t: 1,
        q: 'Where do you put the password of the warehouse that a DAG loads data into?',
        opts: [
          { t: 'In the DAG file, in a constant', fb: 'It would be in Git for ever.' },
          { t: 'In a connection, and the task asks for it by its id', fb: '' },
          { t: 'In an XCom of the first task', fb: 'XComs are stored in the database in plain values.' },
          { t: 'In a comment above the task', fb: 'A comment is still in the file.' }
        ],
        ok: 1, why: 'A connection keeps the login and the password out of the code. The task calls `BaseHook.get_connection("conn_id")`, and the password comes from the place that you chose.'
      }),

      B.quiz({
        id: 'm9-q2', t: 1,
        q: 'The recorded task printed `conn.password`. What did the log show?',
        opts: [
          { t: 'The password in clear text', fb: 'Airflow masks the passwords of connections.' },
          { t: '`***`', fb: '' },
          { t: 'Nothing: the line was skipped', fb: 'The line was printed, with a mask.' },
          { t: 'An error', fb: 'The task succeeded.' }
        ],
        ok: 1, why: 'The log line was `password: ***`. The masker replaces values that it knows to be secret. The same log also shows a warning about short secrets.'
      }),

      B.quiz({
        id: 'm9-q3', t: 1,
        q: 'What is the name of the environment variable for a connection with the id `brewline_api`?',
        opts: [
          { t: '`BREWLINE_API`', fb: 'The prefix is missing.' },
          { t: '`AIRFLOW_CONN_BREWLINE_API`', fb: '' },
          { t: '`AIRFLOW_VAR_BREWLINE_API`', fb: 'That prefix is for variables.' },
          { t: '`CONN_brewline_api`', fb: 'The prefix and the case are wrong.' }
        ],
        ok: 1, why: 'The recording used `AIRFLOW_CONN_BREWLINE_API`. The value is a URI or a JSON document. Variables use the prefix `AIRFLOW_VAR_`.'
      }),

      B.quiz({
        id: 'm9-q4', t: 1,
        q: 'A task has `from airflow.operators.bash import BashOperator`. What does Airflow 3.4.0 do?',
        opts: [
          { t: 'It fails to import', fb: 'The recording shows that it works.' },
          { t: 'It works and warns that the path is deprecated, and names the standard provider', fb: '' },
          { t: 'It works silently', fb: 'A deprecation warning is printed.' },
          { t: 'It installs the standard provider', fb: 'Airflow never installs packages.' }
        ],
        ok: 1, why: 'The recorded import printed: "' + G.counts('af.imports').filter(function (x) { return x.stmt === 'from airflow.operators.bash import BashOperator'; })[0].warnings[0] + '"'
      }),

      B.quiz({
        id: 'm9-q5', t: 2,
        q: 'You changed the password of `brewline_api` in the UI, and tasks still use the old one. What do you check first?',
        opts: [
          { t: 'Whether an environment variable `AIRFLOW_CONN_BREWLINE_API` exists, because it wins over the database', fb: '' },
          { t: 'Restart the DAG processor', fb: 'Connections are read when a task asks, not when files are parsed.' },
          { t: 'Delete the DAG run', fb: 'The run is not the cause.' },
          { t: 'Raise the retries', fb: 'A wrong password fails the same way every time.' }
        ],
        ok: 0, why: 'In the recording the environment variable won: the task got `' + SEC.winner_host + '`, not the host of the database entry. A configured secrets backend would win over both.'
      }),

      B.quiz({
        id: 'm9-q6', t: 2,
        q: 'A task uses `create_session()` to count rows in the metadata database. It worked in Airflow 2. What happens in Airflow 3.4.0?',
        opts: [
          { t: 'It works as before', fb: 'The recording shows an error.' },
          { t: 'It fails with a RuntimeError: direct database access via the ORM is not allowed', fb: '' },
          { t: 'It reads a stale copy', fb: 'There is no copy.' },
          { t: 'It works only on the LocalExecutor', fb: 'The block does not depend on the executor.' }
        ],
        ok: 1, why: 'The recorded error: `' + DBA.error + '`. Tasks talk to the API server. Use the SDK calls, or your own store.'
      }),

      B.quiz({
        id: 'm9-q7', t: 2,
        q: 'What does the warning "Skipping masking for a secret as it\'s too short" tell you?',
        opts: [
          { t: 'Short secrets, under five characters, are not masked in logs', fb: '' },
          { t: 'The log was cut', fb: 'The warning is about masking.' },
          { t: 'The password is wrong', fb: 'It says nothing about correctness.' },
          { t: 'Masking is turned off for the whole task', fb: 'Only the short value is skipped.' }
        ],
        ok: 0, why: 'The recorded warning says the value was shorter than five characters. Masking replaces text everywhere, so a very short secret would mask ordinary words. Do not use secrets that short.'
      }),

      B.quiz({
        id: 'm9-q8', t: 2,
        q: 'The recorded `airflow connections list` shows two connections. A third, `AIRFLOW_CONN_BREWLINE_API`, is used by tasks. Why is it not in the list?',
        opts: [
          { t: 'The list only shows connections in the metadata database', fb: '' },
          { t: 'The connection was deleted', fb: 'Tasks used it.' },
          { t: 'The list is limited to two', fb: 'There is no such limit.' },
          { t: 'It is hidden because it is secret', fb: 'The list prints only ids and types.' }
        ],
        ok: 0, why: 'The command prints a warning that it lists only connections stored in the database, and that environment variables may define connections, including ones that override a database entry.'
      }),

      B.bug({
        id: 'm9-bug1', t: 1, q: 'This task calls a partner API. The key is in the repository. Click the line that is wrong.',
        file: 'brewline_partner_export.py', lang: 'python', code: PW_BUG, bad: [G.at(PW_BUG, /api_key = /)],
        hint: 'Who can read this file, and for how long?',
        why: 'A key in the DAG file is in Git history for as long as the repository exists, and everyone with read access has it. Put it in a connection and read it by id. Rotate the key, because it is already exposed.',
        fix: PW_FIX,
        cheer: 'A secret in code is a secret that has leaked.'
      }),

      B.bug({
        id: 'm9-bug2', t: 2, q: 'This task counts the runs of its own DAG. It worked in Airflow 2 and fails in Airflow 3.4.0 with a RuntimeError. Click a line that is wrong.',
        file: 'brewline_db_access.py', lang: 'python', code: DB_ORM, bad: [G.at(DB_ORM, /from airflow.models import DagRun/), G.at(DB_ORM, /with create_session/)],
        hint: 'Read the error of the log: what is not allowed?',
        why: 'A task may not open a session on the metadata database in Airflow 3. The SDK gives a task the calls it needs: here `ti.get_dr_count(dag_id=...)` asks the API server for the count. I ran the fixed version and it printed the number of runs.',
        fix: DB_FIX,
        cheer: 'In Airflow 3, ask the API. Do not open the database.'
      }),

      B.order({
        id: 'm9-ord', t: 1, q: 'Put the setup of a new connection in order.',
        items: [
          'Create the credentials for Airflow in the other system, with only the rights that the DAG needs',
          'Store them as a connection, in the secrets backend or as the platform\'s secret',
          'Give the connection an id that the DAGs will use, such as `partner_api`',
          'Test the connection from a task or a test run, and read the log: the password must show as `***`',
          'Use the connection by id in the DAG, and never copy the secret into code'
        ],
        why: 'The secret is created with the smallest rights, stored where its owner manages it, and used only by name. The test checks the mask before anyone relies on it.'
      }),

      B.decide({
        id: 'm9-dec', t: 2, src: 'docs', title: 'Decision: where does the warehouse password live in production?',
        scenario: 'Brewline runs Airflow on Kubernetes. The platform team manages a company vault that rotates database passwords every 90 days and keeps an audit log. Eight engineers use the Airflow UI. Where does the warehouse password live?',
        opts: [
          { t: 'As a connection in the metadata database, set in the UI', d: 'Easy to set up. The team can fix it themselves.', lose: 'Eight engineers who can use the UI can read it. A rotation means somebody edits the connection by hand every 90 days, and there is no audit trail of who read it.' },
          { t: 'In the vault, read through a secrets backend', d: 'The platform team owns it, rotates it and logs every read. Airflow never stores it.' },
          { t: 'As an environment variable in the DAG\'s pod, copied from the vault by hand', d: 'No database entry.', lose: 'It overrides every other source, shows up in the pod environment, and a rotation needs a manual copy and a restart.' }
        ],
        pick: 1,
        why: 'The vault already has an owner, rotation and an audit log. A secrets backend searched first makes Airflow read from it, and the DAGs only use the connection id.',
        when: 'For a small team with one environment, a database connection is acceptable. Move to a backend when rotation or audit starts to matter.'
      }),

      B.incident({
        id: 'm9-inc', t: 2, src: 'rec', title: 'Incident: the new password does not work', time: '10:40',
        alert: '**The partner rotated the API password last night. You updated the connection `brewline_api` in the Airflow UI at 09:50. The 10:30 run still fails with "401 Unauthorized".** The log of the task shows `password: ***`.',
        clues: ['The UI shows the new password in the connection form', 'The deployment sets a Kubernetes secret as the environment variable `AIRFLOW_CONN_BREWLINE_API`', 'The recorded run: with a database entry and an environment variable for the same id, the task used the environment variable'],
        opts: [
          { t: 'Update the secret behind `AIRFLOW_CONN_BREWLINE_API`, or remove the variable so that the database entry is used, then restart what reads it', fb: '' },
          { t: 'Edit the connection in the UI again', fb: 'The database entry is not the one that the task reads.' },
          { t: 'Add retries to the task', fb: 'A wrong password fails the same way on every try.' },
          { t: 'Restart the DAG processor', fb: 'Connections are read when a task asks, not when files are parsed.' }
        ],
        best: 0,
        why: 'Environment variables win over the metadata database. The UI edit changed an entry that the task never reads. The recorded task used the host of the environment variable, not the host of the database entry.',
        checks: [
          ['Who wins', 'Look for an `AIRFLOW_CONN_<ID>` variable in the pod of the task. `airflow connections list` shows only the database and says so.'],
          ['Fix the right place', 'Change the secret that feeds the variable, and restart the pods that read it.'],
          ['Prevent it', 'Keep one source for each connection id, and document it. A secrets backend is better still, because it has one owner.']
        ],
        tell: 'A Kubernetes secret defined the connection as an environment variable, and that wins over the database. I updated the secret, restarted the workers, and decided that this id lives only in the vault from now on.',
        prevent: 'One source of truth for each connection id, owned by the team that owns the secret.'
      }),

      B.talk({
        id: 'm9-ext', t: 3, src: 'docs', title: 'Extra: the Fernet key and secrets backends',
        say: 'Press Next. This is how the pieces fit when you operate a deployment.',
        items: [
          ['The Fernet key', 'Connection passwords and sensitive variables in the metadata database are encrypted with the **Fernet key** from the configuration. If you lose the key, you lose the secrets. The command `airflow rotate-fernet-key` (it is on the recorded cheat sheet of the command line) re-encrypts them with a new key.', 'Back up the key like a password.'],
          ['A secrets backend', 'You set `[secrets] backend` to a class and `backend_kwargs` to its settings. Providers ship backends for common vaults and cloud services. The backend is searched before environment variables and the database, and the recorded installed source shows it is put first in the list.', 'One owner, one audit trail.'],
          ['Workers', 'In Airflow 3 a worker looks in a configured backend, then the environment, then asks the API server. A separate setting lets workers use a different backend from the server. I did not run a backend, so test yours with a task that prints a masked value.', 'Test where the task runs.']
        ],
        cols: 1
      }),

      B.qa({
        id: 'qa-secrets', t: 1, tag: 'Airflow', secs: 60,
        q: 'How do you handle secrets in Airflow?',
        pts: ['Never in code: connections and variables', 'Three sources: secrets backend, environment, metadata database', 'Masking in logs', 'A backend for production'],
        short: 'A secret never goes into a DAG file. I use connections for logins and variables for settings, and the task asks for them by id. Airflow can read them from a secrets backend such as a vault, from environment variables, or from the metadata database, where they are encrypted with a Fernet key.\n\nThe order matters: a configured backend is searched first, then environment variables, then the database through the API server. In my recording the same connection existed in the database and in an environment variable, and the environment variable won.\n\nLogs mask the values that Airflow knows are secret and show three stars, but not secrets shorter than five characters and not values that code transforms. For production I prefer a secrets backend, because the secret has an owner, rotation and an audit trail.',
        fu: [['What is in the metadata database?', 'Connections and variables, encrypted with the Fernet key.']],
        trap: 'Saying that masking makes it safe to print secrets. It is a net, not a licence.',
        real: 'Say where your team keeps its Airflow secrets and who can read them.'
      }),

      B.qa({
        id: 'qa-nodb', t: 2, tag: 'Airflow 3', secs: 75,
        q: 'In Airflow 3 a task cannot use the metadata database. Why, and what do you do when you need something from it?',
        pts: ['Tasks talk to the API server through the Task SDK', 'No database credentials on workers, which can run anywhere', 'The error is a RuntimeError', 'Use SDK calls, XCom, your own store, or the REST API'],
        short: 'In Airflow 3 the task process runs through the Task SDK and talks to the API server over HTTP. It does not hold database credentials. That keeps credentials off the workers, which can run in other networks, and it lets workers use other languages. If a task opens an ORM session, Airflow raises a RuntimeError saying that direct database access is not allowed, which I recorded.\n\nWhen a task needs information, I use what the SDK offers: the context of the run, XCom, the connection and variable calls, and helpers on the task instance such as counting DAG runs, which I ran. For anything else I use the REST API with a token, or a store of my own.\n\nWhen I upgrade a project, I scan for imports of the ORM and database sessions in tasks first. The AIR rules of ruff find many of them.',
        fu: [['How do you find them in a code base?', 'Search for create_session and airflow.models imports inside tasks, and run ruff with the AIR rules.']],
        trap: 'Wrapping the session in a helper module. It still fails at run time.',
        real: 'Name a task of yours that reads the metadata database, and what it needs.'
      }),

      B.qa({
        id: 'qa-providers', t: 1, tag: 'Airflow', secs: 60,
        q: 'What is a provider package?',
        pts: ['Operators, hooks, sensors and connection types for one system', 'Installed on its own, with its own version', 'The standard provider holds the common operators', 'Pin versions, test upgrades'],
        short: 'A provider is a Python package that adds integrations for one system or family: operators, hooks, sensors, triggers and connection types. Postgres, HTTP, Amazon, Google and Snowflake each have one. You install the ones you need, with `pip`, and each has its own version.\n\nIn Airflow 3 the common operators moved into the standard provider, so `BashOperator` and `PythonOperator` import from `airflow.providers.standard`. The old paths still work in 3.4.0 and print a deprecation warning, which I recorded.\n\nI pin the versions of Airflow and the providers together, with the constraints file that the project publishes, and I test upgrades in a copy, because a provider can change a default.',
        fu: [['Where do connection types come from?', 'The provider adds them. Install the package and the type appears in the UI.']],
        trap: 'Installing the latest provider on a pinned Airflow without checking the constraints.',
        real: 'List the providers that your Airflow uses and their versions.'
      }),

      B.qa({
        id: 'qa-order', t: 2, tag: 'Airflow', secs: 60,
        q: 'The same connection id exists in two places. Which one does a task use?',
        pts: ['A configured secrets backend first', 'Then environment variables', 'Then the metadata database', 'The connection list shows only the database'],
        short: 'The search order is a configured secrets backend first, then environment variables, then the metadata database, which a worker reaches through the API server. I read the order in the installed source, and I recorded the result of the last two: the same connection id with a different host in the database and in an environment variable, and the task used the environment variable.\n\nThis matters for rotation. If somebody edits the connection in the UI and an environment variable with the same id exists, the edit has no effect. And `airflow connections list` shows only what is in the database. It prints a warning that environment variables may define connections that override database entries.',
        fu: [['How do you avoid surprises?', 'One source for each id, and a note of where it lives.']],
        trap: 'Editing the UI and assuming that the task sees it.',
        real: 'Describe an incident where the wrong credentials were used, and why.'
      }),

      B.qa({
        id: 'qa-fernet', t: 3, tag: 'Operations', secs: 60,
        q: 'What is the Fernet key, and how do you rotate it?',
        pts: ['It encrypts connection passwords and sensitive variables in the metadata database', 'Losing it loses the secrets', 'airflow rotate-fernet-key re-encrypts them', 'Rotate in steps, with the old key still listed'],
        short: 'The Fernet key encrypts the connection passwords and the sensitive variables that Airflow stores in the metadata database. Without it the values cannot be read, so I keep it in a secret store and in the backup plan, like a password.\n\nTo rotate it I put the new key first and the old key second in the configuration, so that Airflow can still read old values. Then I run `airflow rotate-fernet-key`, which re-encrypts the stored values with the new key. After that I remove the old key. The command is on the cheat sheet of the command line that I recorded.\n\nIf a secrets backend holds the secrets, the database has fewer to protect, which is another reason to use one.',
        fu: [['Does it encrypt XComs?', 'No. It covers connections and sensitive variables.']],
        trap: 'Changing the key and restarting. Old values stop decrypting.',
        real: 'Say where your Fernet key lives and who can read it.'
      }),

      B.recap({
        id: 'm9-recap', n: 9, badge: 'Secret Keeper', color: '#FDE68A',
        pts: [
          'A **connection** holds the login for a system, a **variable** holds a setting. A task asks by **id**. A secret never goes into a DAG file.',
          'The lookup order: a configured **secrets backend**, then **environment variables**, then the metadata database through the API server. In the recording the **environment variable won**.',
          '**Masking** shows `***` for known secrets, not for secrets under five characters. `airflow connections list` shows only the database.',
          'In Airflow 3 a task **cannot open the metadata database**. It gets a RuntimeError. Use the SDK calls, such as `ti.get_dr_count`, or your own store.',
          'A **provider** adds operators, hooks and connection types. The common operators live in the **standard** provider. Pin versions with the constraints file.'
        ],
        lines: [
          'I keep secrets out of code.',
          'I know which source wins.',
          'I know what a task may not do in Airflow 3.'
        ]
      })
    ]
  });
})();
