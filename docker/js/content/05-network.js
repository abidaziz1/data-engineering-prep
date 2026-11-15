/* Mission 5: networks, names and ports. Every result on these screens came from containers on a real Docker Engine. */
(function () {
  var B = LAB.b, G = LAB.get;
  var D = G.counts('net.default'), U = G.counts('net.user'), RC = G.counts('net.recreate'), P = G.counts('net.ports'), MD = G.counts('net.modes'), LH = G.counts('net.localhost'), BN = G.counts('net.byname');
  var n = G.n;
  G.expect(D.resolve_by_name_rc !== 0 && D.ping_by_ip_rc === 0, 'the default bridge has no names and IP addresses work');
  G.expect(U.resolve_by_name_rc === 0 && U.dns_server === true, 'a network that you create resolves container names with the embedded DNS server');
  G.expect(LH.rc !== 0 && BN.rc === 0, 'localhost fails and the container name works');
  G.expect(RC.address_changed === true && RC.name_still_resolves === true, 'the address of a recreated container changed and its name still resolves');
  G.expect(P.host_reaches_p1 === true && P.host_reaches_p3_from_localhost_15434 === false, 'a published port is reachable from the host and an unpublished one is not');
  G.expect(MD.interfaces_none === 1 && MD.interfaces_host > MD.interfaces_bridge, 'none has one interface and host has the interfaces of the host');

  LAB.addChapter({
    id: 'm5', n: 5, title: 'Networks, names and ports', short: 'Network', blurb: 'Why localhost fails, and how containers find each other', minutes: 15,
    focus: ['air', 'qual'],
    goals: [
      'Explain why **`localhost`** inside a container is not the database.',
      'Connect containers **by name** on a network that you create.',
      'Use `-p` to publish a port, and say who can then reach it.',
      'Tell the **bridge, host and none** networks apart.'
    ],
    say: 'The loader and the database are two containers now. The loader\'s first run ends with "connection refused", and every engineer meets this error once. By the end of this mission you will know why, and which of the nine ways to connect works.',
    scenes: [
      B.flow({
        id: 'm5-names', t: 1, src: 'docs', title: 'How a container finds another', g: 'net', legend: true,
        steps: [
          { say: 'Two containers, **loader** and **db**, and your own machine. Which of them can reach which? Press Next.', focus: ['loader', 'db', 'host'], cap: 'Three parties and a name service.' },
          { say: 'Step 1. The loader wants the database and knows only its **name**, `db`. It asks the DNS server that Docker runs on the network.', on: ['e1'], focus: ['loader', 'dns'], tags: ['tg_name'], cap: 'The loader asks for a name.' },
          { say: 'Step 2. Docker answers with the **address** of the container. This works on a network that you created, and not on the default bridge.', on: ['e2'], focus: ['dns', 'loader'], cap: 'The answer is an address.' },
          { say: 'Step 3. The loader connects to that address on **port 5432**. No port needs to be published for this: containers on one network reach each other directly.', on: ['e3'], focus: ['loader', 'db'], cap: 'Container to container, on the network.' },
          { say: 'Step 4. Your own machine is outside the network. It can reach the database only through a **published port**, started with `-p`.', on: ['e4'], focus: ['host', 'db'], tags: ['tg_port'], cap: 'The host needs a published port.' },
          { say: 'And one more fact, which causes most errors: inside the loader, the name **localhost** means the loader itself.', focus: ['loader'], tags: ['tg_local'], cap: 'localhost is the container itself.' }
        ]
      }),

      B.term({
        id: 'm5-default', t: 1, src: 'rec', title: 'The default bridge has no names',
        say: 'A container started with no network option joins the **default bridge**. I started one called `dkc-a` and tried to reach it from a second container.',
        lines: function () {
          return G.term([
            ['docker run -d --name dkc-a alpine:3.22 sleep 300', '(the id)'],
            ['docker run --rm alpine:3.22 getent hosts dkc-a', '(no output)    # exit code ' + D.resolve_by_name_rc],
            ['docker run --rm alpine:3.22 ping -c 1 172.17.0.2', '1 packets transmitted, 1 packets received    # exit code ' + D.ping_by_ip_rc]
          ]);
        },
        after: 'The name did not resolve, and the **IP address** worked. The default bridge connects containers, but gives them no names. An address can change when a container is recreated, so you do not want to put one in a configuration file.',
        afterKind: 'warn',
        doneSay: 'On the default bridge only addresses work.'
      }),

      B.term({
        id: 'm5-user', t: 1, src: 'rec', title: 'A network that you create has names',
        say: 'The same test on a network created with `docker network create`. The database container is called `dkc-db`.',
        lines: function () {
          return G.term([
            ['docker network create dkc-net', '(the id)'],
            ['docker run -d --name dkc-db --network dkc-net -e POSTGRES_PASSWORD=... postgres:16-alpine', '(the id)'],
            ['docker run --rm --network dkc-net alpine:3.22 sh -c \'getent hosts dkc-db; grep nameserver /etc/resolv.conf\'', G.text('net.user')]
          ]);
        },
        after: 'The name resolves. Docker puts a small **DNS server** at **127.0.0.11** in every container on such a network, and it knows the names of the containers. That is how the loader will find `db`. Docker Compose creates a network like this for every project, and you saw it in mission 0.',
        afterKind: 'tip',
        doneSay: 'Create the network, and the names come with it.'
      }),

      B.term({
        id: 'm5-localhost', t: 1, src: 'rec', title: 'Three host names for the same database',
        say: 'The loader, on the same network, with three values of `DATABASE_URL`. Only the host name differs. Read each result.',
        lines: function () {
          return G.term([
            ['docker run --rm --network dkc-net -e DATABASE_URL=postgresql://postgres:...@localhost:5432/brewline ... loader', G.text('net.localhost')],
            ['docker run --rm --network dkc-net -e DATABASE_URL=postgresql://postgres:...@database:5432/brewline ... loader', G.text('net.wrongname')],
            ['docker run --rm --network dkc-net -e DATABASE_URL=postgresql://postgres:...@dkc-db:5432/brewline ... loader', G.text('net.byname')]
          ]);
        },
        after: '**localhost** is refused, because it is the loader container, and nothing listens on 5432 there. **database** does not resolve, because no container has that name. **dkc-db** works, and the loader reads 5,000 rows. The rule: the host name is the **name of the other container**, or the service name in Compose.',
        afterKind: 'warn',
        doneSay: 'localhost is the container itself. Use the name of the other container.'
      }),

      B.widget({ id: 'm5-lab', kind: 'net', t: 1, src: 'rec', title: 'Lab: nine attempts to connect' }),

      B.rows({
        id: 'm5-ports', t: 1, src: 'rec', title: 'Publishing a port',
        steps: [
          {
            say: 'Three Postgres containers, started three ways. For each I asked `docker port`, and I tried to reach the port from the host.',
            tabs: [{ layer: 'RECORDED', name: 'Publishing', c: 'raw', cols: ['how it started', 'docker port says', 'reachable from the host'], rows: [
              ['`-p 127.0.0.1:15432:5432`', G.text('net.port1'), P.host_reaches_p1 ? 'yes, from this machine only' : 'no'],
              ['`-p 15433:5432`', G.text('net.port2'), 'yes, from anywhere that can reach this machine'],
              ['no `-p` flag', G.text('net.port3'), P.host_reaches_p3_from_localhost_15434 ? 'yes' : 'no']
            ], trk: 0 }],
            notes: ['`-p HOST:CONTAINER` forwards a port of the host to a port of the container. Written without an address, it binds **every interface** of the host (0.0.0.0). Write `127.0.0.1:` in front when only your own machine should connect.']
          },
          {
            say: 'A host port belongs to one container. I started a fourth container on a port that was taken.',
            tabs: [{ layer: 'RECORDED', name: 'Two containers, one host port', c: 'raw', cols: ['result'], rows: [[G.text('net.busy')]], trk: 0 }],
            notes: ['Use the same container port in many containers, and different host ports. Inside the network nobody needs a host port at all.']
          }
        ]
      }),

      B.rows({
        id: 'm5-addr', t: 1, src: 'rec', title: 'Addresses change, names do not',
        steps: [
          {
            say: 'I removed a container and started a new one with the same name, after another container had taken its address.',
            tabs: [{ layer: 'RECORDED', name: 'After recreating a container', c: 'raw', cols: ['what I checked', 'result'], rows: [['the IP address changed', RC.address_changed ? 'yes' : 'no'], ['the name still resolves', RC.name_still_resolves ? 'yes' : 'no']], trk: 0 }],
            notes: ['A configuration file that holds an address breaks the first time a container is recreated. A file that holds a **name** does not.']
          }
        ]
      }),

      B.cmp({
        id: 'm5-modes', t: 1, src: 'rec', title: 'Bridge, host and none',
        say: 'Three network modes that you will meet. I counted the network interfaces that a container sees in each. Press Next.',
        cols: ['Mode', 'Network interfaces seen', 'What it means'],
        hl: 0,
        rows: [
          ['bridge (default)', MD.interfaces_bridge, 'The container has its own address on a private network of Docker, and reaches the outside through the host. `-p` publishes ports.'],
          ['host', MD.interfaces_host, 'No separate network. The container uses the network of the host, and sees all its interfaces. `-p` does not apply. The recorder used it to build images in this sandbox.'],
          ['none', MD.interfaces_none, 'Only the loopback interface. The container cannot reach anything, and nothing can reach it.']
        ],
        steps: [
          { upto: 1, say: 'Bridge is the normal case: a private network, with `-p` for the ways in.' },
          { upto: 3, say: 'Host removes the walls of the network. It is simple and it is also the least isolated. None is for a job that needs no network at all.' }
        ]
      }),

      B.code({
        id: 'm5-bugcode', t: 1, src: 'docs', title: 'What Compose gives you', file: 'compose.yaml (the network part)', lang: 'yaml',
        code: 'services:\n  db:\n    image: postgres:16-alpine\n  loader:\n    image: brewline/loader:1.0\n    environment:\n      DATABASE_URL: postgresql://postgres:secret@db:5432/brewline',
        steps: [
          { say: 'You did not create a network here. Compose creates one for the project and puts both services on it.', lines: null },
          { say: 'The service name `db` becomes the **host name**. That is all the loader needs.', lines: [7, 7] }
        ],
        note: 'Mission 6 builds the whole stack. For now, notice that the host in the connection string is the name of the service.'
      }),

      B.bug({
        id: 'm5-bug', t: 1, q: 'The loader worked on a laptop with a local Postgres. In Compose it fails with "connection refused". Click the line that is the problem.',
        file: 'compose.yaml', lang: 'yaml',
        code: 'services:\n  db:\n    image: postgres:16-alpine\n    environment:\n      POSTGRES_PASSWORD: brewline-dev\n  loader:\n    image: brewline/loader:1.0\n    environment:\n      DATABASE_URL: postgresql://postgres:brewline-dev@localhost:5432/brewline\n',
        bad: [9],
        hint: 'Which host name does the loader use, and which container is it?',
        why: '`localhost` inside the loader is the loader. Nothing listens on 5432 there, so the connection is refused. The host name must be the **service name**, `db`.',
        fix: 'services:\n  db:\n    image: postgres:16-alpine\n    environment:\n      POSTGRES_PASSWORD: brewline-dev\n  loader:\n    image: brewline/loader:1.0\n    environment:\n      DATABASE_URL: postgresql://postgres:brewline-dev@db:5432/brewline\n',
        cheer: 'In a container, the other service is never localhost.'
      }),

      B.quiz({
        id: 'm5-q1', t: 1,
        q: 'Two containers are on the default bridge. The loader connects to `db` by its name. What happens?',
        opts: [
          { t: 'It works, because Docker knows the names of all containers', fb: 'Only on a network that you created.' },
          { t: 'The name does not resolve', fb: '' },
          { t: 'It connects to the host', fb: 'The name is simply not known.' },
          { t: 'Docker picks any container', fb: 'There is no guessing.' }
        ],
        ok: 1, why: 'The recording: `getent hosts` on the default bridge gave exit code ' + D.resolve_by_name_rc + ' with no answer, and the IP address worked. Create a network, or use Compose.'
      }),

      B.quiz({
        id: 'm5-q2', t: 1,
        q: 'You start Postgres with `docker run -d -p 5433:5432 postgres:16-alpine` on a server that is reachable from the office network. Who can connect to port 5433?',
        opts: [
          { t: 'Only processes on the same machine', fb: 'That would need `-p 127.0.0.1:5433:5432`.' },
          { t: 'Anybody who can reach the server, on every interface', fb: '' },
          { t: 'Only containers on the same network', fb: 'Published ports are for the outside. Containers on a network need no `-p`.' },
          { t: 'Nobody, until you open the firewall', fb: 'Docker adds its own rules for published ports.' }
        ],
        ok: 1, why: 'Without an address the port binds to 0.0.0.0. The recording shows `docker port` printing "' + G.text('net.port2') + '". Write `127.0.0.1:` first when only the local machine should connect.'
      }),

      B.quiz({
        id: 'm5-q3', t: 1,
        q: 'Do two containers on the same network need `-p` to talk to each other?',
        opts: [
          { t: 'Yes, on the port that they use', fb: '' },
          { t: 'No, `-p` is only for traffic from outside the network', fb: '' },
          { t: 'Only the database needs it', fb: '' },
          { t: 'Only if they run on different hosts', fb: '' }
        ],
        ok: 1, why: 'The loader reached `dkc-db` on port 5432 with nothing published. `-p` is for the host and the world outside the network.'
      }),

      B.decide({
        id: 'm5-dec', t: 2, src: 'docs', title: 'Decision: should the database port be published?',
        scenario: 'The team runs a Postgres container for the integration tests on a shared build host, and the loader runs in a container on the same host. A developer wants to connect with a SQL client from a laptop.',
        opts: [
          { t: 'Publish with `-p 5432:5432` so that everyone can connect', d: 'Easy for everybody.', lose: 'The port binds to every interface of a shared host. Anybody on the network can reach a database with a default password.' },
          { t: 'Do not publish. Put the loader and the database on one network. For a person who needs a client, publish on `127.0.0.1` and use an SSH tunnel', d: 'The only way in from outside is one that you control.' },
          { t: 'Use the host network for both containers', d: 'No ports to think about.', lose: 'Both share the network of the host. A port clash with another service is likely, and nothing is isolated.' }
        ],
        pick: 1,
        why: 'The loader does not need a published port. A published port is an entrance from outside. Open as few as possible, and bind them to the loopback address when you can.',
        when: 'Publish on all interfaces only for a service that is meant to be public, behind a firewall or a proxy.'
      }),

      B.incident({
        id: 'm5-inc', t: 2, src: 'rec', title: 'Incident: connection refused after the move to containers', time: '09:15',
        alert: '**The loader fails on its first run in Compose:** `connection to server at "127.0.0.1", port 5432 failed: Connection refused`. The same code works on a laptop.',
        clues: ['`DATABASE_URL` has `@localhost:5432` in it', 'Postgres is running in the service `db` of the same Compose file', '`docker compose ps` shows both containers up'],
        opts: [
          { t: 'Change the host in `DATABASE_URL` to the service name, `db`', fb: '' },
          { t: 'Publish port 5432 of the database to the host', fb: 'That does not help a container that connects to its own localhost.' },
          { t: 'Add `network_mode: host` to the loader', fb: 'It can work by accident, and it removes the isolation that you wanted.' },
          { t: 'Restart the database', fb: 'The database is fine. The loader asks the wrong host.' }
        ],
        best: 0,
        why: 'The recording shows the same error and the same fix: `localhost` is refused, `database` does not resolve, and the container name works. On a laptop `localhost` was the database. In a container it is the loader.',
        checks: [
          ['Read the host in the error', '"127.0.0.1" means the container itself.'],
          ['List the names', '`docker compose ps` shows the service names. They are the host names.'],
          ['Test from inside', '`docker compose run --rm loader getent hosts db` should print an address.'],
          ['Make the host a setting', 'Read it from an environment variable, so that each environment sets its own.']
        ],
        tell: 'The loader failed because it connected to localhost, which inside a container is the loader itself. I changed the host to the service name, db, which Compose resolves through its network, and the load worked.',
        prevent: ['Keep the **host a setting**, never a literal', 'Test a job in Compose before the scheduler runs it', 'Do not publish a port just to make a container connect']
      }),

      B.qa({
        id: 'qa-localhost', t: 1, tag: 'Docker', secs: 60,
        q: 'Why does a container get "connection refused" when it connects to localhost, and what do you use instead?',
        pts: ['Each container has its own network namespace', 'localhost is the container itself', 'Use the name of the other container or service', 'The name works on a network that you created, and in Compose'],
        short: 'Each container has its own network namespace, so `localhost` and 127.0.0.1 mean the container itself. If the database runs in another container, nothing listens on that port in this one, and the connection is refused. I use the name of the other container, or the service name in Compose, on a network that I created, because Docker runs a DNS server there. In the recording the host `localhost` was refused, `database` did not resolve, and `dkc-db` worked. I keep the host in an environment variable, so that a laptop can use localhost and a stack can use the service name.',
        fu: [['Why does the default bridge not resolve names?', 'It has no name service. That is why you create a network, or use Compose, which does it for you.'], ['Can you reach the host from a container?', 'On Docker Desktop through `host.docker.internal`, and on Linux with an extra setting. That is from documentation.']],
        trap: 'Fixing the error by publishing a port or by using the host network.',
        real: 'Describe the first time you saw this error.'
      }),

      B.qa({
        id: 'qa-ports', t: 1, tag: 'Docker', secs: 60,
        q: 'What does `-p 8080:80` do, and what is the risk?',
        pts: ['Forwards port 8080 of the host to port 80 of the container', 'Without an address it binds every interface', '127.0.0.1:8080:80 limits it to the local machine', 'Containers on a network need no published port'],
        short: '`-p 8080:80` forwards port 8080 of the host to port 80 of the container. It is only needed when something outside the Docker network, such as my laptop or a browser, has to reach the container. Written like that it binds every interface of the host, so anybody who can reach the machine can reach the port. In the recording `docker port` showed 0.0.0.0:15433 for that form and 127.0.0.1:15432 when I wrote the address. For a database I publish on 127.0.0.1 or not at all. Containers on the same network reach each other without any published port.',
        fu: [['Does `EXPOSE` publish a port?', 'No. It only documents the port. In the recording a container without `-p` had nothing published.'], ['What happens if the host port is taken?', 'Docker refuses to start the container: "' + G.text('net.busy') + '".']],
        trap: 'Publishing a database port on all interfaces of a shared server.',
        real: 'Say how you let people reach a service without opening it to everyone.'
      }),

      B.qa({
        id: 'qa-netmodes', t: 2, tag: 'Docker', secs: 75,
        q: 'What are the bridge, host and none networks, and when would you use each?',
        pts: ['bridge: a private network of Docker, with ports published by `-p`', 'host: the network of the host, no isolation', 'none: only loopback', 'User-defined bridge networks add names'],
        short: 'Bridge is the default: each container gets an address on a private network of Docker, reaches the outside through the host, and is reached through published ports. A bridge that I create also gives container names through Docker DNS, so I use that or Compose for anything with two services. Host mode removes the separation, so the container uses the network of the host: it is simple, it is the least isolated, and ports can clash. None leaves only the loopback interface, for a job that needs no network. In the recording a container saw ' + MD.interfaces_bridge + ' interfaces on bridge, ' + MD.interfaces_host + ' on host and ' + MD.interfaces_none + ' on none.',
        fu: [['Why not host mode everywhere?', 'Everything shares the host network: no isolation, and `-p` does not apply.'], ['How do containers on two machines talk?', 'Through published ports or an overlay network of an orchestrator such as Kubernetes (from documentation).']],
        trap: 'Using host mode to avoid thinking about ports.',
        real: 'Say which mode your jobs ran in.'
      }),

      B.recap({
        id: 'm5-recap', n: 5, badge: 'Network Mapper', color: '#BFDBFE',
        pts: [
          '**localhost** in a container is the container. Use the **name** of the other container or service.',
          'Names work on a network that you **create**, and in Compose. The default bridge has none (exit code ' + D.resolve_by_name_rc + ').',
          'The IP address changed when a container was recreated. The **name** still resolved.',
          '`-p` is for the host and the outside. Without an address it binds **0.0.0.0**.',
          'Bridge, host and none: **' + MD.interfaces_bridge + '**, **' + MD.interfaces_host + '** and **' + MD.interfaces_none + '** interfaces in the recording.'
        ],
        lines: [
          'I can explain the localhost error.',
          'I connect containers by name.',
          'I publish as few ports as possible.'
        ]
      })
    ]
  });
})();
