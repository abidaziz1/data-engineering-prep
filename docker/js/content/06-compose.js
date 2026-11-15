/* Mission 6: Docker Compose. The stacks on these screens ran on a real engine with Compose and a real Postgres. */
(function () {
  var B = LAB.b, G = LAB.get;
  var CY = G.file('compose.yaml'), NH = G.file('compose.nohealth.yaml'), PF = G.file('compose.profiles.yaml'), CFG = G.text('compose.config');
  var OB = G.counts('compose.objects'), DN = G.counts('compose.down'), DV = G.counts('compose.down_v'), RACE = G.counts('compose.race'), PR = G.counts('compose.profiles'), UP = G.counts('compose.up'), PS = G.table('compose.ps');
  var n = G.n;
  G.expect(RACE.loader_failed === true, 'without a healthcheck the loader fails because the database is not ready');
  G.expect(UP.loader_exit_code === 0 && G.text('compose.up') === G.text('compose.again'), 'with the healthcheck the loader loads, and running it again gives the same table');
  G.expect(OB.volumes_while_up.length === 1 && DN.volumes_after_down.length === 1 && DV.volumes_after_down_v.length === 0, 'down keeps the volume and down -v removes it');
  G.expect(DN.networks_after_down.length === 0 && OB.networks_while_up.length === 1, 'down removes the network');
  G.expect(PR.services_after_up.length === 1 && PR.services_after_up[0] === 'db' && PR.job_rc === 0, 'a profile keeps the loader out of up, and run starts it');
  G.expect(PS.rows[0][2] === 'healthy' && PS.rows[1][1] === 'exited', 'the database is healthy and the loader has exited');

  LAB.addChapter({
    id: 'm6', n: 6, title: 'Docker Compose', short: 'Compose', blurb: 'A database and a loader as one stack, started in the right order', minutes: 17,
    focus: ['mon', 'ci'],
    goals: [
      'Read a **compose.yaml** and say what each part does.',
      'Make a service wait until another one is **healthy**.',
      'Know what `down` and `down -v` remove.',
      'Run a **one-off job** from a stack with a profile.'
    ],
    say: 'Two containers, a network, a volume and a start order is too much to type with `docker run`. Compose writes it down in one file. We build the stack that loads the Brewline orders into Postgres, break it on purpose, and fix it.',
    scenes: [
      B.flow({
        id: 'm6-stack', t: 1, src: 'rec', title: 'One file, one project', g: 'compose', legend: true,
        steps: [
          { say: 'A **compose.yaml** describes the **services** of an application, the **volumes** and the **networks**. `docker compose up` makes it so. Press Next.', focus: ['file', 'db', 'loader', 'vol'], cap: 'One file describes the stack.' },
          { say: 'Step 1. Compose reads the file and starts the **db** service from the image `postgres:16-alpine`. It created a **network** for the project and a **volume** for the data.', on: ['e1'], focus: ['file', 'db'], cap: 'The db service starts first.' },
          { say: 'Step 2. The database writes its data into the named volume **pgdata**. In the recording the volume was called `' + OB.volumes_while_up[0] + '`: the project name, an underscore and the volume name.', on: ['e2'], focus: ['db', 'vol'], cap: 'Data goes to a named volume.' },
          { say: 'Step 3. The loader says `depends_on` the database with the condition **healthy**. Compose waits until the **healthcheck** of the database passes, and only then starts the loader.', on: ['e3'], focus: ['db', 'loader'], tags: ['tg_health'], cap: 'The loader waits for a healthy db.' },
          { say: 'Step 4. The loader is **built** from the folder `./app`. It reaches the database by the service name, `db`, on the project network.', on: ['e4'], focus: ['file', 'loader'], tags: ['tg_dns'], cap: 'The loader finds db by name.' }
        ]
      }),

      B.code({
        id: 'm6-yaml', t: 1, src: 'rec', title: 'The compose.yaml of the stack', file: 'compose.yaml', lang: 'yaml', code: CY,
        steps: [
          { say: 'This is the file that I ran. Press Next to go through it.', lines: null },
          { say: 'The **db** service. `image` says which image to run. Compose pulls it when it is missing.', lines: G.span(CY, /^  db:/, /^    image:/) },
          { say: 'The environment of the Postgres image: a password, and a database that is created at the first start.', lines: G.span(CY, /^    environment:/, /POSTGRES_DB/) },
          { say: 'A **named volume** for the data directory. The name is declared at the bottom of the file.', lines: G.span(CY, /^    volumes:/, /pgdata:\/var/) },
          { say: 'The **healthcheck**: Docker runs `pg_isready` inside the container every 2 seconds and marks the container healthy when it succeeds. The `-h 127.0.0.1` matters, and a later screen explains why.', lines: G.span(CY, /healthcheck:/, /retries/) },
          { say: 'The **loader** service is **built** from `./app` and not pulled.', lines: G.span(CY, /^  loader:/, /build:/) },
          { say: '`depends_on` with `condition: service_healthy` makes Compose **wait**. Without the condition it would only wait for the container to start.', lines: G.span(CY, /depends_on:/, /service_healthy/) },
          { say: 'The connection string uses the **service name** `db` as the host. The `./data` folder of the host is mounted **read-only** at `/data`, where the job looks for the CSV.', lines: G.span(CY, /DATABASE_URL/, /:ro/) },
          { say: 'The top-level `volumes` section declares the named volume.', lines: G.span(CY, /^volumes:/, /pgdata:$/) }
        ],
        note: 'The loader needs the image of mission 2. In this sandbox the recorder built it with `docker build` before Compose ran it. See the README for why.'
      }),

      B.code({
        id: 'm6-config', t: 2, src: 'rec', title: 'What Compose understood: docker compose config', file: 'docker compose config', lang: 'yaml', code: CFG,
        steps: [
          { say: '`docker compose config` prints the file as Compose understood it: defaults filled in, short forms made long. It is the first thing to run when a stack behaves strangely.', lines: null },
          { say: 'The **project name** is the prefix of everything Compose creates. By default it is the name of the folder. The recorder set it with `-p`.', lines: G.span(CFG, /^name:/) },
          { say: 'The short form `pgdata:/var/lib/postgresql/data` became a mount of type **volume**.', lines: G.span(CFG, /type: volume/, /volume: \{\}/) },
          { say: 'And `./data:/data:ro` became a mount of type **bind**, with `read_only: true`.', lines: G.span(CFG, /type: bind/, /bind: \{\}/) },
          { say: 'Compose added a **default network** and gave the volume its full name, with the project as a prefix.', lines: G.span(CFG, /^networks:/, /dkc-stack_pgdata/) }
        ],
        note: 'The absolute path of the host folder was shortened to ./data for this screen.'
      }),

      B.code({
        id: 'm6-nohealth', t: 1, src: 'rec', title: 'The same stack, without a healthcheck', file: 'compose.nohealth.yaml', lang: 'yaml', code: NH,
        steps: [
          { say: 'This file has no healthcheck, and `depends_on` is the short form: a list of names. It looks right and reads right.', lines: null },
          { say: 'The short form waits until the container of `db` has **started**. A started container is a running process. It is not yet a database that accepts connections.', lines: G.span(NH, /depends_on:/, /- db/) }
        ],
        note: 'This file is the one that fails on the next screen.'
      }),

      B.term({
        id: 'm6-race', t: 1, src: 'rec', title: 'The loader starts before the database is ready',
        say: 'I ran the stack without a healthcheck. Postgres needs a few seconds to prepare its data directory on the first start, and the loader does not wait for them.',
        lines: function () {
          return G.term([
            ['docker compose -f compose.nohealth.yaml up --abort-on-container-exit --exit-code-from loader', ''],
            ['# the last line of the loader', G.text('compose.race')],
            ['echo $?', String(RACE.exit_code)]
          ]);
        },
        after: 'The loader ended with **exit code ' + RACE.exit_code + '** and "Connection refused". The database container was up, and nothing listened on 5432 yet. This is a **race**: on a slow machine it fails, on a fast one it may pass, and that is why it is hard to find. A `healthcheck` plus `condition: service_healthy` removes the race.',
        afterKind: 'warn',
        doneSay: 'depends_on without a condition waits for a start, not for readiness.'
      }),

      B.term({
        id: 'm6-entry', t: 2, src: 'rec', title: 'Why the healthcheck asks over TCP',
        say: 'The Postgres image starts a temporary server during the first start, to run its set-up scripts. I searched the entrypoint script of the image for it.',
        lines: function () {
          return G.term([
            ['docker run --rm postgres:16-alpine sh -c \'grep -n -E "temporary|listen_addresses" /usr/local/bin/docker-entrypoint.sh | head -6\'', G.text('compose.entrypoint')]
          ]);
        },
        after: 'The temporary server is started with `listen_addresses=\'\'`: it accepts connections on a **unix socket only**, and not on the network. A `pg_isready` over the socket can report "ready" while the real server has not started yet, so the loader would still fail. `pg_isready -h 127.0.0.1` asks over **TCP**, which only the final server answers. I did not reproduce a failing socket check in this recording, so treat it as a reason from the script and the documentation.',
        afterKind: 'tip',
        doneSay: 'Ask for readiness the way a client will connect: over the network.'
      }),

      B.term({
        id: 'm6-up', t: 1, src: 'rec', title: 'The stack with a healthcheck',
        say: 'The file of the lessons, started in the background. Then the state of the services, and the log of the loader.',
        lines: function () {
          return G.term([
            ['docker compose up -d', '(creates the network and the volume, starts db, waits until it is healthy, starts the loader)'],
            ['docker compose ps -a --format \'{{.Service}} {{.State}} {{.Health}}\'', PS.rows.map(function (r) { return (r[0] + '    ').slice(0, 8) + r[1] + (r[2] ? '   ' + r[2] : ''); }).join('\n')],
            ['docker compose logs loader --no-log-prefix', G.text('compose.up')],
            ['docker inspect dkc-stack-loader-1 --format \'{{.State.ExitCode}}\'', String(UP.loader_exit_code)]
          ]);
        },
        after: 'The **db** is `running` and `healthy`. The **loader** is `exited` with code **' + UP.loader_exit_code + '**: it is a job, and its work is done. It read 5,000 rows and the table has 5,000. A job that ends is not a failure. A service that ends is.',
        afterKind: 'tip',
        doneSay: 'A job exits when it is done. A service keeps running.'
      }),

      B.rows({
        id: 'm6-down', t: 1, src: 'rec', title: 'What down removes',
        steps: [
          {
            say: 'I looked at the Docker objects of the project while it was up, after `docker compose down`, and after `docker compose down -v`.',
            tabs: [{ layer: 'RECORDED', name: 'Networks and volumes of the project', c: 'raw', cols: ['moment', 'network', 'volume'], rows: [
              ['while the stack is up', OB.networks_while_up.join(', '), OB.volumes_while_up.join(', ')],
              ['after `docker compose down`', DN.networks_after_down.length ? DN.networks_after_down.join(', ') : 'removed', DN.volumes_after_down.length ? DN.volumes_after_down.join(', ') : 'removed'],
              ['after `docker compose down -v`', 'removed', DV.volumes_after_down_v.length ? DV.volumes_after_down_v.join(', ') : 'removed']
            ], trk: 0 }],
            notes: ['`down` removes the containers and the network and **keeps the volume**. `down -v` removes the volumes as well, and with them the data. `-v` is the flag that deletes a database.']
          },
          {
            say: 'Because the volume was kept, I started the stack again and ran the loader a second time.',
            tabs: [{ layer: 'RECORDED', name: 'The loader on the second run', c: 'raw', cols: ['output'], rows: [[G.text('compose.again')]], trk: 0 }],
            notes: ['The table still has **5,000** rows after reading the same file twice. The loader inserts with `ON CONFLICT DO NOTHING`, so a second run changes nothing. A job that you can run twice is a job that a scheduler can retry.']
          }
        ]
      }),

      B.code({
        id: 'm6-prof', t: 1, src: 'rec', title: 'A job that is not part of up', file: 'compose.profiles.yaml (the loader service)', lang: 'yaml', code: PF,
        steps: [
          { say: 'A scheduler runs the loader once a night. The database must stay up, and the loader must not start by itself. A **profile** does that.', lines: null },
          { say: '`profiles: ["jobs"]` keeps the service out of a plain `docker compose up`. It starts only when you name the profile or run the service by name.', lines: G.span(PF, /profiles:/) }
        ],
        note: 'The `docker compose up -d` of this file started ' + PR.services_after_up.length + ' service: ' + PR.services_after_up.join(', ') + '.'
      }),

      B.term({
        id: 'm6-run', t: 1, src: 'rec', title: 'Run the job once',
        say: 'With the profile in place, `up` starts the database. The job is a separate command.',
        lines: function () {
          return G.term([
            ['docker compose -f compose.profiles.yaml up -d --wait', '(db is started and healthy)'],
            ['docker compose -f compose.profiles.yaml ps --format \'{{.Service}}\'', PR.services_after_up.join('\n')],
            ['docker compose -f compose.profiles.yaml --profile jobs run --rm loader', G.text('compose.job')],
            ['echo $?', String(PR.job_rc)]
          ]);
        },
        after: '`docker compose run --rm loader` starts **one** container of the service, waits for its dependencies, runs it to the end and removes it. The exit code is the exit code of the job. This is the form that Airflow or cron can call.',
        afterKind: 'tip',
        doneSay: 'up for the services. run for the jobs.'
      }),

      B.cmp({
        id: 'm6-vs', t: 2, src: 'docs', title: 'Compose, docker run and Kubernetes',
        say: 'Where Compose fits. Press Next.',
        cols: ['', 'docker run', 'Compose', 'An orchestrator such as Kubernetes'],
        hl: 0,
        rows: [
          ['What you describe', 'One container, in a command.', 'Several containers, networks and volumes, in a file.', 'Desired state for a cluster of machines.'],
          ['Machines', 'One.', 'One.', 'Many.'],
          ['Restarts, scaling, rolling updates', 'Restart policy only.', 'Restart policy and a few scale options.', 'Built in.'],
          ['Typical use', 'A quick test.', 'Local development, tests and CI, a small single-host service.', 'Production workloads at scale. The next course.']
        ],
        steps: [
          { upto: 2, say: 'Compose is what you use when everything runs on one machine, which is every laptop and most CI jobs.' },
          { upto: 4, say: 'It does not move containers between machines or replace failed hosts. That is the job of an orchestrator.' }
        ]
      }),

      B.bug({
        id: 'm6-bug', t: 1, q: 'This stack fails on the first start on a slow CI runner, and works when somebody runs it again. Click the line that is the problem.',
        file: 'compose.nohealth.yaml', lang: 'yaml', code: NH, bad: [G.at(NH, /depends_on:/)],
        hint: 'What does depends_on wait for when you give it a plain list?',
        why: 'The list form waits until the container of `db` has started. The database inside takes more seconds to accept connections, and the loader runs in that gap. Add a healthcheck to `db`, and use `condition: service_healthy` here.',
        fix: CY,
        cheer: 'A started container is not a ready database.'
      }),

      B.order({
        id: 'm6-ord', t: 1, q: 'Put the actions of `docker compose up -d` for the stack of this mission in the order in which they happen.',
        items: [
          'Create the project network',
          'Create the named volume',
          'Start the db container',
          'Wait until the healthcheck of db passes',
          'Start the loader container',
          'The loader reads the CSV, writes the rows and exits with code 0'
        ],
        why: 'The network and the volume come first, because containers attach to them. The loader waits for the healthy db, and then runs and ends. In the recording the loader read 5,000 rows and exited with ' + UP.loader_exit_code + '.'
      }),

      B.quiz({
        id: 'm6-q1', t: 1,
        q: 'In Compose, `depends_on: [db]` is written as a plain list. What does the service wait for?',
        opts: [
          { t: 'For the database to accept connections', fb: 'That needs a healthcheck and a condition.' },
          { t: 'For the container of db to have started', fb: '' },
          { t: 'For the image of db to be pulled', fb: 'The pull happens earlier.' },
          { t: 'Nothing, the order is random', fb: 'The order is respected, but only for the start.' }
        ],
        ok: 1, why: 'The recording shows the result: "Connection refused" and exit code ' + RACE.exit_code + ' in the race stack. The healthcheck made the same stack work.'
      }),

      B.quiz({
        id: 'm6-q2', t: 1,
        q: 'You run `docker compose down -v` on the stack with the named volume `pgdata`. What happens to the 5,000 orders?',
        opts: [
          { t: 'They stay, because the volume is named', fb: '`-v` removes the named volumes of the project.' },
          { t: 'They are deleted with the volume', fb: '' },
          { t: 'They are copied to the host folder', fb: 'Nothing is copied.' },
          { t: 'Compose asks before it deletes', fb: 'It does not ask.' }
        ],
        ok: 1, why: 'The recording: the volume `' + OB.volumes_while_up[0] + '` survived `down` and was gone after `down -v`.'
      }),

      B.quiz({
        id: 'm6-q3', t: 1,
        q: 'The loader container of the stack shows "exited (0)" after a minute. Is something wrong?',
        opts: [
          { t: 'Yes, containers should keep running', fb: 'Only services do. A job ends.' },
          { t: 'No, it is a job and it finished with exit code 0', fb: '' },
          { t: 'Yes, because the exit code is not 1', fb: '' },
          { t: 'Only if the database is also stopped', fb: '' }
        ],
        ok: 1, why: 'The loader read the CSV, wrote the rows and ended. In the recording `docker compose ps` showed the db as running and healthy, and the loader as exited with code ' + UP.loader_exit_code + '.'
      }),

      B.decide({
        id: 'm6-dec', t: 2, src: 'docs', title: 'Decision: how does the nightly loader run?',
        scenario: 'A scheduler starts the loader once a night. The Postgres service for the integration tests should stay up all day on the build host. Both are in one compose file.',
        opts: [
          { t: 'Leave the loader a normal service, and run `docker compose up` every night', d: 'One command.', lose: '`up` also touches the database service and starts everything that is not running. A normal service is meant to stay up.' },
          { t: 'Put the loader in a profile and call `docker compose run --rm loader`', d: 'The database stays up. Each run starts one container, waits for a healthy db, ends, and the exit code goes to the scheduler.' },
          { t: 'Add `restart: always` to the loader so that it never stops', d: 'It always runs.', lose: 'A job that ends would be restarted forever, and would load the same file again and again.' }
        ],
        pick: 1,
        why: 'A job is a command that ends. `run --rm` fits that: it passes the exit code on and leaves nothing behind.',
        when: 'Use a plain service with a restart policy for something that must stay up, such as a database or an API.'
      }),

      B.incident({
        id: 'm6-inc', t: 2, src: 'rec', title: 'Incident: CI fails now and then, and passes on a rerun', time: '11:05',
        alert: '**The integration test job fails about one run in five:** `psycopg.OperationalError: connection failed ... Connection refused`. A rerun passes. Nothing changed in the code.',
        clues: ['The compose file has `depends_on: [db]` as a plain list', 'The failures are more frequent when the runner is busy', 'The database log of a failed run shows "database system is ready to accept connections" after the loader error'],
        opts: [
          { t: 'Add a healthcheck to the database and `condition: service_healthy` to the dependency', fb: '' },
          { t: 'Add `sleep 10` before the loader starts', fb: 'It hides the race on a fast machine and loses it on a slow one.' },
          { t: 'Retry the whole job three times in CI', fb: 'It can pass the build and leaves the race in place for every other user of the file.' },
          { t: 'Pin the image to an older Postgres', fb: 'The version is not the cause.' }
        ],
        best: 0,
        why: 'The recording reproduced the error: without a healthcheck the loader ended with exit code ' + RACE.exit_code + '. The log line that comes after the error is the clue: the database was ready, a moment too late.',
        checks: [
          ['Compare the timestamps', 'The loader error comes before the line that says the database is ready.'],
          ['Look at depends_on', 'A plain list waits for a started container only.'],
          ['Add the healthcheck and the condition', 'Over TCP, with `-h 127.0.0.1`.'],
          ['Make the job retry on its own', 'A loader that retries a refused connection a few times is safer in every environment.']
        ],
        tell: 'The flaky failure was a start-up race: the loader started when the database container was running, a moment before Postgres accepted connections. I added a healthcheck over TCP and made the loader depend on it being healthy. The failures stopped, and I also made the loader retry its first connection.',
        prevent: ['Every dependency has a **healthcheck**', 'Use `condition: service_healthy`', 'Write jobs that **retry** a refused connection']
      }),

      B.qa({
        id: 'qa-compose', t: 1, tag: 'Docker', secs: 75,
        q: 'What is Docker Compose, and what do you use it for?',
        pts: ['A file that describes services, networks and volumes', 'docker compose up creates and starts them on one machine', 'It gives a network with service names', 'For local development, tests and CI, not for a cluster'],
        short: 'Compose describes a multi-container application in one YAML file: the services, the volumes and the networks. `docker compose up` creates the network and the volumes, starts the containers, and gives each service its name as a host name on the project network. I use it for a local stack, for integration tests in CI, and for a small service on one machine. In the recording it started Postgres and the loader, with the data in a named volume. It does not move containers between machines or replace a failed host. That is what an orchestrator does.',
        fu: [['How do two services find each other?', 'By service name, on the network that Compose creates for the project.'], ['What does `down` do?', 'It removes the containers and the network. Volumes stay unless you pass `-v`.']],
        trap: 'Describing Compose as a production orchestrator.',
        real: 'Say what stack you ran with Compose.'
      }),

      B.qa({
        id: 'qa-depends', t: 1, tag: 'Docker', secs: 60,
        q: 'How do you make a service wait for its database in Compose?',
        pts: ['depends_on in the short form waits for the container to start', 'Add a healthcheck to the database', 'Use condition: service_healthy', 'Let the job retry, too'],
        short: 'The short form of `depends_on` waits only until the container has started. In the recording that was not enough: the loader ran before Postgres accepted connections and ended with exit code ' + RACE.exit_code + '. So I give the database a healthcheck, `pg_isready` over TCP, and I write `condition: service_healthy` under `depends_on` of the loader. Compose then starts the loader only after the check passes. I also make the job retry a refused connection, because a healthcheck does not protect against a database that restarts later.',
        fu: [['What other conditions exist?', '`service_started`, `service_healthy` and `service_completed_successfully`, which waits for a one-shot service such as a migration to exit with 0 (from documentation).'], ['Why check over TCP?', 'The first start runs a temporary server that listens on a socket only.']],
        trap: 'Adding `sleep 10` to the command.',
        real: 'Describe a race that you fixed.'
      }),

      B.qa({
        id: 'qa-down', t: 2, tag: 'Docker', secs: 60,
        q: 'What do `docker compose down` and `docker compose down -v` do?',
        pts: ['down removes containers and networks of the project', 'Named volumes stay', 'down -v removes the named volumes and so the data', 'Use -v on purpose, for example in test cleanup'],
        short: '`docker compose down` stops and removes the containers and the network of the project and leaves the named volumes. With `-v` it removes the volumes as well. In the recording the volume of the stack survived `down` and was gone after `down -v`. A second run of the loader on the kept volume showed that the table still had 5,000 rows after reading the file again, because the insert ignores conflicts. I use `down -v` to reset a test stack and never on something that holds data I need.',
        fu: [['How do you keep data between runs of a test stack?', 'Use a named volume and `down` without `-v`.'], ['What removes only one service?', '`docker compose rm -sf SERVICE`, or `stop` and `rm` for that service.']],
        trap: 'Running `down -v` on a stack that holds the only copy of data.',
        real: 'Say how you reset your test stacks.'
      }),

      B.recap({
        id: 'm6-recap', n: 6, badge: 'Stack Builder', color: '#BFDBFE',
        pts: [
          'A **compose.yaml** describes services, volumes and networks. Compose creates a **network** and gives each service its **name** as a host name.',
          '`depends_on` as a list waits for a **started** container. The race ended with exit code **' + RACE.exit_code + '**.',
          'A **healthcheck** plus `condition: service_healthy` starts the loader when Postgres is ready. Check over **TCP**.',
          '`down` keeps the **volume**. `down -v` deletes the data.',
          'A **profile** keeps a job out of `up`. `docker compose run --rm` runs it and returns its **exit code**.'
        ],
        lines: [
          'I can read and write a compose file.',
          'I make services wait for readiness.',
          'I know what down -v deletes.'
        ]
      })
    ]
  });
})();
