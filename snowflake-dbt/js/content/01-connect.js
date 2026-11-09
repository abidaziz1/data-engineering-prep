/* Mission 1: profiles, signing in, and the first statements dbt sends. */
(function () {
  var B = LAB.b, G = LAB.get;

  var P = G.file('profiles.yml');
  var KP = G.json('connect_debug_dev'), PW = G.json('connect_debug_pw'), SSO = G.json('connect_debug_sso');
  var PROD = G.text('connect_run_two_prod');
  var FIELDS = G.json('credential_fields').filter(function (f) { return f.charAt(0) !== '_'; });
  function diffKeys(a, b) { return Object.keys(Object.assign({}, a, b)).filter(function (k) { return JSON.stringify(a[k]) !== JSON.stringify(b[k]); }); }
  function names(list) { return list.map(function (k) { return '`' + k + '`'; }).join(', '); }
  var NODES = {
    stg_brewline__customers: 'stg_customers', stg_brewline__order_items: 'stg_items', stg_brewline__products: 'stg_products', stg_brewline__orders: 'stg_orders',
    int_orders__with_items: 'int_orders', dim_customers: 'dim_customers', dim_products_v1: 'dim_products', dim_products_v2: 'dim_products', fct_orders: 'fct_orders', fct_daily_revenue: 'fct_revenue'
  };

  var BUG = [
    'brewline:',
    '  target: prod',
    '  outputs:',
    '    prod:',
    '      type: snowflake',
    '      account: acme-brewline',
    '      user: DBT_SERVICE',
    '      password: Br3w-2026-Latte!',
    '      role: ACCOUNTADMIN',
    '      warehouse: WH_TRANSFORM',
    '      database: BREWLINE',
    '      schema: ANALYTICS',
    '      threads: 8'
  ].join('\n');
  var BUGFIX = [
    'brewline:',
    '  target: prod',
    '  outputs:',
    '    prod:',
    '      type: snowflake',
    '      account: "{{ env_var(\'SNOWFLAKE_ACCOUNT\') }}"',
    '      user: "{{ env_var(\'SNOWFLAKE_USER\') }}"',
    '      private_key_path: "{{ env_var(\'SNOWFLAKE_PRIVATE_KEY_PATH\') }}"',
    '      role: TRANSFORMER',
    '      warehouse: WH_TRANSFORM',
    '      database: BREWLINE',
    '      schema: ANALYTICS',
    '      threads: 8'
  ].join('\n');

  LAB.addChapter({
    id: 'm1', n: 1, title: 'Connecting dbt to Snowflake', short: 'Connect', blurb: 'Profile, sign-in, role and the first statements', minutes: 28,
    focus: ['sf'],
    goals: [
      'Read a **profile** line by line and say which role, warehouse, database and schema a run uses.',
      'Name the ways dbt can **sign in** and pick one for a laptop and one for a scheduler.',
      'Say what dbt sends **first**, before it builds anything.',
      'Explain what **threads** mean on Snowflake.'
    ],
    say: 'Mission 1 is about the connection. Before dbt builds a single table, it must know which account to call, who is calling, what that caller is allowed to do, and which compute to use. Get this right and the rest of the course works. Get it wrong and a typo can drop a database.',
    scenes: [
      B.talk({
        id: 'm1-talk', t: 1, title: 'A profile answers six questions',
        say: 'A profile is a small file with the connection settings. It answers six questions. Press Next for each.',
        items: [
          ['Which account?', 'The `account` line names your Snowflake account, for example `acme-brewline`. dbt turns it into the address it calls.', 'Where to call.'],
          ['Who is calling?', 'The `user` line, plus a way to prove it. Mission 1 shows the options. A scheduled job uses a service user. A person uses their own.', 'The caller.'],
          ['As which role?', 'The `role` line. Snowflake checks every statement against the privileges of this role. It decides what dbt may create, read and drop.', 'The role sets the limits.'],
          ['On which warehouse?', 'The `warehouse` line. It is the compute that runs your statements, and the one that bills credits while it runs.', 'The compute, and the bill.'],
          ['Where to build?', 'The `database` and `schema` lines. They are the default place for objects. A model can choose another schema, and dbt works out the full name.', 'The default location.'],
          ['How much at once?', 'The `threads` line. dbt opens that many connections and runs that many models at the same time, as far as the graph allows.', 'The parallelism.']
        ],
        cols: 2
      }),

      B.code({
        id: 'm1-code', t: 1, title: 'The Brewline profile', file: '~/.dbt/profiles.yml', lang: 'yaml', code: P,
        steps: [
          { say: 'This is the real profile used to record every statement in this course. It has three targets: dev, ci and prod. Press Next to read them.', lines: null },
          { say: 'The account and the user come from environment variables, and the key is a path to a file. The profile holds names and paths. It holds no password and no key.', lines: G.span(P, /account:/, /private_key_path/) },
          { say: 'Then the four defaults. This developer signs in as TRANSFORMER, uses the small development warehouse, and builds in their own schema inside BREWLINE_DEV.', lines: G.span(P, /role: TRANSFORMER/, /schema: DEV_ALICE/) },
          { say: 'The CI target uses another role, another warehouse and another database. The schema name comes from the pull request number, so each pull request gets its own.', lines: G.span(P, /^    ci:/, /threads/) },
          { say: 'Production uses the real database, a larger warehouse and 8 threads. Only the scheduler uses this target.', lines: G.span(P, /^    prod:/, /threads: 8/) }
        ],
        note: 'The first line, `brewline:`, is the profile name. `dbt_project.yml` says `profile: brewline`, and `target: dev` chooses the default entry. `--target prod` overrides it.'
      }),

      B.term({
        id: 'm1-debug', t: 1, title: 'dbt debug: the first command to run',
        say: 'When a connection misbehaves, run dbt debug first. Here is the output from the Brewline project.',
        lines: function () { return G.plain(G.text('debug_dev'), { cmd: 'dbt debug --target dev', hide: /python path:|os info:|python version:/ }); },
        after: 'Read the middle block: `role`, `warehouse`, `database` and `schema` are exactly what a run will use. The last lines show the connection test, which sends `select 1 as id`. In this recording the connection is the stand-in, so "connection ok" shows that dbt built its arguments and called the connector. Against a real account it also proves the key, the account and the network work.',
        afterKind: 'tip',
        doneSay: 'Check this block before you suspect anything else. Most connection problems are a wrong role, a wrong warehouse or a wrong account name.'
      }),

      B.cmp({
        id: 'm1-cmp', t: 1, title: 'Ways to sign in',
        say: 'The profile can prove who is calling in several ways. Press Next to compare them. I read each one from the adapter source of this version, so the list is not a guess.',
        cols: ['Way to sign in', 'Who uses it', 'What you must protect', 'Fit'],
        hl: 3,
        rows: [
          ['Key pair', 'Schedulers and service users', 'The private key file', 'The best default for a scheduled job. Snowflake holds only the public key.'],
          ['Password', 'Old setups, and some people', 'The password', 'Snowflake has announced limits on password-only sign-in. Check what your account enforces. Do not build new jobs on it.'],
          ['Browser SSO (`authenticator: externalbrowser`)', 'Developers on a laptop', 'Nothing in the file', 'Opens a browser window for the company login. A server cannot use it.'],
          ['OAuth (`authenticator: oauth`)', 'Tools that already hold a token from your identity provider', 'A short-lived token', 'Good when the platform issues and renews the token for you.'],
          ['Programmatic access token', 'Automation that needs a token for one user', 'The token', 'Passed in `token`. Needs a recent adapter version.'],
          ['Workload identity', 'Jobs that run on a cloud platform', 'No stored secret', 'The job proves its identity with the identity of the cloud workload it runs on.']
        ],
        steps: [
          { upto: 2, say: 'Key pair and password. One is built for machines. The other is for people, and Snowflake is moving away from it.' },
          { upto: 4, say: 'Browser SSO and OAuth. Both rely on your identity provider, so nobody types a Snowflake password.' },
          { upto: 6, say: 'Programmatic access tokens and workload identity are the newer options. Check that your dbt version supports them before you plan around them.' }
        ],
        pick: 'Use a **key pair** for every scheduler and service user. Use **browser SSO** on laptops. Choose workload identity when your platform offers it. Avoid passwords in new work.'
      }),

      B.flow({
        id: 'm1-flow', t: 1, title: 'What happens when you run dbt', g: 'session', legend: true,
        steps: [
          { say: 'Here is the life of one dbt command against Snowflake. Press Next to follow it.', cap: 'Five steps before and after the work itself.' },
          { say: 'First dbt reads the profile and picks the target. Nothing has touched the network yet.', on: ['s1'], focus: ['prof', 'conn'], cap: 'The target decides everything that follows.' },
          { say: 'Then dbt signs in. With a key pair it signs a token with the private key. Every thread opens its own session.', on: ['s2'], focus: ['conn', 'look'], cap: 'One session per thread.' },
          { say: 'Before it builds anything, dbt asks what already exists: the schemas and the objects in them. That decides whether a model is created or replaced.', on: ['s3'], focus: ['look', 'gen'], tags: ['tg_meta'], cap: 'These are SHOW and DESCRIBE calls.' },
          { say: 'Now dbt compiles each model into SQL and wraps it in the right statement: create view, create table, merge.', on: ['s4'], focus: ['gen', 'exec'], cap: 'This is where Jinja becomes SQL.' },
          { say: 'The statements run on the warehouse, in the order of the graph, up to the thread count at once. Credits are used here.', on: ['s5'], focus: ['exec', 'trail'], tags: ['tg_bill'], cap: 'The part that costs money.' }
        ]
      }),

      B.term({
        id: 'm1-run', t: 1, title: 'The statements of a real first run', g: 'dag',
        say: 'This is every statement dbt sent during the first run in a developer schema, from the recording. SHOW and DESCRIBE calls are dim. Watch the graph while the models are created.',
        lines: function () { return G.stmtLines('run_all_dev', { cmd: 'dbt run --target dev', meta: true, nodes: NODES, max: 92, pace: 0.8 }); },
        after: 'The first lines are metadata: dbt listed the schemas of BREWLINE_DEV, created `DEV_ALICE` because it did not exist, then asked which objects and functions it holds. Only then did the `create` statements start. In this run dbt opened ' + G.conns('run_all_dev') + ' connections with `threads: 4`, and each connection is its own Snowflake session.',
        afterKind: 'tip',
        doneSay: 'Nothing here is magic. dbt asks what exists, then sends one create statement per model. Next time a run surprises you, read the statements.'
      }),

      B.code({
        id: 'm1-conn', t: 2, title: 'What dbt hands to the Snowflake connector', file: 'arguments for snowflake.connector.connect, prod target', lang: 'json', code: PROD,
        steps: [
          { say: 'dbt reads the profile and builds a dictionary for the Snowflake connector. This one was recorded from the production target. The key itself is hidden in the recording.', lines: null },
          { say: 'The account and the user come straight from the profile.', lines: G.span(PROD, /"account"/, /"account"/) },
          { say: 'The application name tells Snowflake which program is connecting. Autocommit is on, so every statement commits by itself unless dbt opens a transaction with begin.', lines: G.span(PROD, /"application"/, /"autocommit"/) },
          { say: 'The private key is passed as bytes. The profile held only a path to the file.', lines: G.span(PROD, /"private_key"/, /"private_key"/) },
          { say: 'Role, warehouse, database and schema are the defaults for the session.', lines: G.span(PROD, /"role"/, /"role"/) },
          { say: 'The profile line `query_tag: dbt_brewline_prod` became a session parameter. Every statement in this session carries the tag, which makes the cost of the job visible in the query history.', lines: G.span(PROD, /"session_parameters"/, /^  \}/) }
        ],
        note: 'Against the key-pair dev profile, the password profile differs in ' + names(diffKeys(KP, PW)) + '. The browser SSO profile differs in ' + names(diffKeys(KP, SSO)) + '. The adapter accepts these profile fields: ' + names(FIELDS) + '.'
      }),

      B.bug({
        id: 'm1-bug', t: 1, q: 'This profile connects fine and the job runs. It will still fail a security review. Click a line that should not be there.',
        file: '~/.dbt/profiles.yml', lang: 'yaml', code: BUG, bad: [G.at(BUG, /password:/), G.at(BUG, /ACCOUNTADMIN/)],
        hint: 'One line holds a secret. Another gives a nightly job far more power than it needs.',
        why: 'Two lines are wrong. The **password** sits in a file that will end up in a repository, a backup or a screenshot. And **ACCOUNTADMIN** lets a nightly job do anything in the account, so one bad statement could drop a database. Use a key file path from an environment variable, and a role that owns only the schemas dbt builds in.',
        fix: BUGFIX,
        cheer: 'Seeing both in one glance is what a reviewer does.'
      }),

      B.quiz({
        id: 'm1-q1', t: 1,
        q: 'Which role should the scheduled production job use?',
        opts: [
          { t: 'ACCOUNTADMIN, so nothing ever fails on permissions', fb: 'It removes the failures by removing the limits. One bad statement can then drop a database.' },
          { t: 'TRANSFORMER, a role that owns the schemas dbt builds in and can read RAW', fb: '' },
          { t: 'The role of the analyst who wrote the models', fb: 'The job would break when that person changes teams, and it would carry all their other privileges.' },
          { t: 'PUBLIC, because every user has it', fb: 'PUBLIC has almost no privileges. dbt could not create anything.' }
        ],
        ok: 1, why: 'Give the job a role made for it. It needs to create and replace objects in the schemas dbt owns, and to read RAW. Nothing more. If a statement goes wrong, the damage stays inside those schemas.'
      }),

      B.quiz({
        id: 'm1-q2', t: 1,
        q: 'Where does the private key file for the nightly job live?',
        opts: [
          { t: 'In the repository, next to profiles.yml', fb: 'Anyone who can read the repository can then sign in as the service user.' },
          { t: 'In the scheduler\'s secret store, mounted as a file whose path goes in an environment variable', fb: '' },
          { t: 'In the config of the fct_orders model', fb: 'A model file is code that many people read and copy.' },
          { t: 'On the laptop of the person who set it up', fb: 'The job would stop the day that laptop is replaced.' }
        ],
        ok: 1, why: 'The secret store controls who can read the key and records who did. The profile only holds a path, so the file you commit has nothing to steal. The profile in this course does exactly that with `SNOWFLAKE_PRIVATE_KEY_PATH`.'
      }),

      B.order({
        id: 'm1-ord', t: 1, q: 'Put the start of a dbt run in order.',
        items: [
          'dbt reads profiles.yml and picks the target',
          'dbt signs in with the key and sets the role, warehouse, database and schema',
          'dbt asks Snowflake which schemas and objects already exist',
          'dbt compiles each model into SQL',
          'dbt sends the create statements in graph order, on up to `threads` connections',
          'dbt writes the results to target/run_results.json'
        ],
        why: 'Profile, sign in, look around, compile, run, record. The look-around step is why a run knows whether to create a table or replace it.'
      }),

      B.decide({
        id: 'm1-dec', t: 2, title: 'Decision: how does the nightly job sign in?',
        scenario: 'The nightly job runs in a container on your company platform. Security wants **no shared passwords**, and wants to **rotate the credential without a code change**.',
        opts: [
          { t: 'A password in a CI variable, rotated every 90 days', d: 'The simplest to set up.', lose: 'Rotation means changing the password in Snowflake and in the variable at the same moment, or the job fails. Snowflake has also announced limits on password-only sign-in.' },
          { t: 'Browser SSO using the lead engineer\'s session', d: 'No secret in the job.', lose: 'The browser flow needs a person. The job stops when the session ends, or when that engineer leaves.' },
          { t: 'A key pair for a service user, with the private key in the secret manager', d: 'The key is mounted as a file. The profile holds the path.' }
        ],
        pick: 2,
        why: 'A Snowflake user can hold two public keys at once. You add the new public key, put the new private key in the secret manager, test with dbt debug, and then remove the old public key. The job never loses access, and nothing in the repository changes.',
        when: 'If your platform issues workload identity for jobs, prefer it. Then there is no stored secret to rotate.'
      }),

      B.incident({
        id: 'm1-inc', t: 2, title: 'Incident: every job fails at sign-in', time: '06:10',
        alert: '**All dbt jobs failed overnight.** The error says the JWT token is invalid. Nothing in the dbt repository changed.',
        clues: ['Security rotated the key for DBT_SERVICE yesterday evening', 'Developers using browser sign-in are fine', 'The nightly job and the CI job read the same secret'],
        opts: [
          { t: 'Compare the public key on the Snowflake user with the key in the job secret', fb: '' },
          { t: 'Restart the scheduler', fb: 'A restart sends the same old key again.' },
          { t: 'Switch the job to ACCOUNTADMIN', fb: 'The role is not the problem. The sign-in fails before a role is chosen.' },
          { t: 'Grant the TRANSFORMER role to the user again', fb: 'Roles apply after sign-in. The failure comes before.' }
        ],
        best: 0,
        why: 'An invalid token on all jobs at once, right after a key rotation, points at the key. Browser users are fine because they do not use the key. Compare the key fingerprint stored on the user with the key in the secret.',
        checks: [
          ['Read the error', 'The error names the token, not the role or the warehouse. The failure happens at sign-in.'],
          ['Find what changed', 'Ask security. The key for DBT_SERVICE was rotated at 18:00 yesterday.'],
          ['Compare the keys', 'Read the fingerprint of the public key on the user with `desc user`, and compute the fingerprint of the private key in the secret. They differ.'],
          ['Fix the secret', 'Put the new private key in the secret store. Run `dbt debug` from the job container.'],
          ['Rerun and confirm', 'Rerun the nightly job and check that the models and tests pass.']
        ],
        tell: 'Every job failed at sign-in with an invalid token error after security rotated the service user\'s key. I compared the key fingerprint on the Snowflake user with the key in the job secret, and they differed because the secret had not been updated. I stored the new private key, ran dbt debug in the job container, and reran the jobs. To prevent it, we now add the new public key as the second key first, switch the secret, and remove the old key only after a green run.',
        prevent: ['Add the new public key as the **second key** before you remove the old one', 'Put `dbt debug` in the **rotation checklist**', 'Alert on **sign-in failures** for the service user', 'Give the key and the secret **one owner**']
      }),

      B.qa({
        id: 'qa-profile', t: 1, tag: 'Connect', secs: 60,
        q: 'How does dbt connect to Snowflake? Walk me through a profile.',
        pts: ['A profile is a YAML file with one entry per target', 'The project names its profile, and the target line picks the entry', 'Account, user, a way to prove who you are, then role, warehouse, database and schema', 'threads sets how many sessions dbt uses at once', 'Secrets stay out of the file: env_var and a key path', 'dbt debug shows what dbt found and tests the connection'],
        short: 'A profile is a small YAML file, usually `~/.dbt/profiles.yml`, with one entry for each target. The project names its profile in `dbt_project.yml`, and the target line or `--target` picks the entry. For Snowflake an entry has the account, the user, a way to prove who the user is, and four defaults: role, warehouse, database and schema. I also set threads, which is how many Snowflake sessions dbt may use at once.\n\nSecrets stay out of the file. Account and user come from `env_var()`, and the key is a path to a file that the scheduler mounts. For a scheduled job I use a service user with a key pair. On my laptop I use browser sign-in.\n\nWhen a profile misbehaves I run `dbt debug`. It prints what dbt found, which role and warehouse a run will use, and tests the connection. If I see a permission error, I check the role first, because the role decides what dbt may create.',
        fu: [
          ['What is the difference between a profile and a target?', 'A profile is the named set of connections. A target is one entry in it, such as dev or prod. The `target:` line picks the default.'],
          ['Where does dbt look for profiles.yml?', 'In the folder from `--profiles-dir` or DBT_PROFILES_DIR, then the current project folder, then `~/.dbt`.']
        ],
        trap: 'Listing the fields without saying why the role matters. The role decides what dbt may create, read and drop.',
        real: 'Say which role your job used, and what happened when it lacked a privilege.'
      }),

      B.qa({
        id: 'qa-auth', t: 2, tag: 'Connect', secs: 90,
        q: 'How would you authenticate a production dbt job to Snowflake, and how do you rotate the credential?',
        pts: ['A service user with key-pair authentication', 'Private key in the secret manager, mounted as a file; the profile holds only the path', 'Snowflake keeps only the public key', 'Rotation: add the new public key as the second key, switch the secret, test, remove the old key', 'A role that owns only the schemas dbt builds in, and a network policy on the user', 'Workload identity if the platform offers it'],
        short: 'For production I use a service user with key-pair authentication. The user exists only for the job. The private key lives in the scheduler\'s secret manager, which mounts it as a file, and the profile reads the file path from an environment variable. Snowflake keeps only the public key, so a leaked profile contains no credential.\n\nRotation uses the fact that a Snowflake user can hold two public keys. I add the new public key as the second key, put the new private key in the secret store, run `dbt debug` and one job, and only then remove the old public key. There is no moment when the job cannot sign in. I write it into a runbook with an owner and a date, because a rotation that nobody owns gets skipped until it breaks.\n\nI also give the user a role that owns only the schemas dbt builds in, and a network policy that limits where it can sign in from. If the platform offers workload identity, I prefer it, because then there is no secret to rotate.',
        fu: [
          ['What if you cannot use a key pair?', 'Ask for OAuth or a programmatic access token. If you must use a password, keep it in the secret manager and rotate it on a calendar.'],
          ['Why not ACCOUNTADMIN?', 'The job would hold every privilege in the account. A mistake in one model could drop a database. A narrow role keeps the damage small.']
        ],
        trap: 'Saying "I would store the password in an environment variable". It answers storage, and it skips rotation and the privileges of the role.',
        real: 'Describe how your team rotated a key or a password, and what broke.'
      }),

      B.recap({
        id: 'm1-recap', n: 1, badge: 'Connected', color: '#BFDBFE',
        pts: [
          'A **profile** holds one entry per target: account, user, sign-in, role, warehouse, database, schema and threads.',
          '**Key pair** for schedulers, **browser SSO** for laptops. Passwords are the weak choice.',
          'The **role** sets the limits. Give a job a role made for it, never ACCOUNTADMIN.',
          'dbt **looks around first**, then sends one statement per model. Each thread is its own session.',
          '`dbt debug` shows the role, warehouse and schema a run will use. Run it first.'
        ],
        lines: [
          'I keep the key out of the repository and the profile.',
          'I rotate with two public keys, so nothing stops.',
          'I read the statements dbt sends before I guess.'
        ]
      })
    ]
  });
})();
