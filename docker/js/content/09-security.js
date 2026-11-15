/* Mission 9: security and hygiene. Every result on these screens came from a real Docker Engine. The token in the examples is made up. */
(function () {
  var B = LAB.b, G = LAB.get;
  var US = G.counts('sec.user'), RW = G.counts('sec.root_write'), RO = G.counts('sec.readonly'), CA = G.counts('sec.caps'), CH = G.counts('sec.chown'), LK = G.counts('sec.leak'), SM = G.counts('sec.secretmount'), RE = G.counts('sec.run_env'), DE = G.counts('sec.dotenv'), SK = G.counts('sec.socket'), PN = G.counts('sec.pin');
  var NR = G.file('app/Dockerfile.nonroot'), LEAKY = G.file('app/Dockerfile.leaky'), SMF = G.file('app/Dockerfile.secretmount');
  var n = G.n;
  G.expect(US.default_image.indexOf('uid=0(root)') === 0 && US.nonroot_image.indexOf('uid=10001') === 0, 'the default image runs as root and the non-root image as user 10001');
  G.expect(RW.rc === 0 && G.text('sec.nonroot_write').indexOf('Permission denied') > 0, 'root can write in /usr/local and the app user cannot');
  G.expect(RO.rc_without_tmpfs !== 0 && RO.rc_with_tmpfs === 0, 'a read-only root file system refuses writes except on tmpfs');
  G.expect(CA.default_count === 14 && CA.dropped_count === 0 && CA.privileged_count > 30, 'capabilities: 14 by default, none dropped, many with --privileged');
  G.expect(CH.default_rc === 0 && CH.cap_drop_all_rc !== 0, 'chown works by default and fails without capabilities');
  G.expect(LK.arg_in_history && LK.env_in_history && LK.env_in_inspect, 'the token is in the history and in inspect');
  G.expect(SM.token_in_history === false && SM.files_that_contain_the_token.length === 0, 'a secret mount leaves no token in the image');
  G.expect(RE.visible_in_inspect === true, 'a variable given at run time is visible in docker inspect');
  G.expect(DE.without_ignore_rc === 0 && DE.with_ignore_rc !== 0, 'a .env file is copied without .dockerignore and not with it');
  G.expect(SK.container_sees_host_container === true && SK.reads_host_file === true, 'the docker socket and a mount of the host expose the host');

  LAB.addChapter({
    id: 'm9', n: 9, title: 'Security and hygiene', short: 'Safe', blurb: 'Run as a user, drop what you do not need, and keep secrets out of images', minutes: 17,
    focus: ['qual', 'raw'],
    goals: [
      'Run a job as a user that is **not root**.',
      'Limit what a container can do: **read-only file system, capabilities**.',
      'Keep **secrets** out of images, history and the build context.',
      'Say why the **Docker socket** is root on the host.'
    ],
    say: 'The loader holds the password of a database. This mission shows five ways that the password ends up where it should not be, and each one was recorded. Then it shows how to stop each of them.',
    scenes: [
      B.term({
        id: 'm9-root', t: 1, src: 'rec', title: 'Who are you inside the container?',
        say: 'Two images that run the same job: the loader of mission 2, and a version that creates a user. I ran `id` in each, and tried to write into a folder of the system.',
        lines: function () {
          return G.term([
            ['docker run --rm loader:1 id', US.default_image],
            ['docker run --rm loader:1 touch /usr/local/x', '(no output, exit code ' + RW.rc + ')'],
            ['docker run --rm loader:nonroot id', US.nonroot_image],
            ['docker run --rm loader:nonroot touch /usr/local/x', G.text('sec.nonroot_write')]
          ]);
        },
        after: 'The image of mission 2 runs as **root**, because Docker does that unless the image says otherwise. Root in a container is not the same as root on the host, but it is **root over the container and over any folder that you mount**. A job that runs as an ordinary user cannot change the system files of its own image, which limits what a bug or a bad dependency can do.',
        afterKind: 'warn',
        doneSay: 'No USER line means root.'
      }),

      B.code({
        id: 'm9-nonroot', t: 1, src: 'rec', title: 'A Dockerfile with a user', file: 'Dockerfile.nonroot', lang: 'dockerfile', code: NR,
        steps: [
          { say: 'The Dockerfile of the loader with four extra things. I built it and ran it for the screen before this one.', lines: null },
          { say: '`useradd` creates a user with a fixed **numeric ID**, 10001. A number is better than a name, because a mount of the host knows numbers and not names.', lines: G.span(NR, /useradd/) },
          { say: 'The packages are installed **as root**, before the user is chosen. They end up in the system folders, where the app user can read them and cannot change them.', lines: G.span(NR, /^RUN pip/) },
          { say: '`COPY --chown` makes the code belong to the user. Without it the files would belong to root.', lines: G.span(NR, /^COPY --chown/) },
          { say: '`USER app` is the line that matters. Every instruction after it, and the container itself, runs as that user.', lines: G.span(NR, /^USER/) }
        ],
        note: 'The `id` of this image printed ' + US.nonroot_image + '.'
      }),

      B.term({
        id: 'm9-readonly', t: 2, src: 'rec', title: 'A read-only file system',
        say: '`--read-only` makes the root file system of the container read-only. A job that writes only where you allow it cannot leave a file behind.',
        lines: function () {
          return G.term([
            ['docker run --rm --read-only alpine:3.22 sh -c \'echo x > /tmp/a\'', G.text('sec.readonly')],
            ['docker run --rm --read-only --tmpfs /tmp alpine:3.22 sh -c \'echo x > /tmp/a && echo written\'', RO.with_tmpfs_output]
          ]);
        },
        after: 'The first write failed with "Read-only file system". With a small **tmpfs** for `/tmp` the same write worked. Give the job the places that it needs, and nothing else. Many programs write to `/tmp`, so expect to add one.',
        afterKind: 'tip',
        doneSay: 'Read-only root, plus a tmpfs where the job needs to write.'
      }),

      B.rows({
        id: 'm9-caps', t: 2, src: 'rec', title: 'Capabilities',
        steps: [
          {
            say: 'Linux splits the power of root into **capabilities**. I read the set of capabilities of process 1 in three containers.',
            tabs: [{ layer: 'RECORDED', name: 'CapEff of process 1', c: 'raw', cols: ['how the container started', 'capability set (hex)', 'capabilities'], rows: [
              ['default', CA.default_hex, CA.default_count],
              ['`--cap-drop ALL`', CA.dropped_hex, CA.dropped_count],
              ['`--privileged`', CA.privileged_hex, CA.privileged_count]
            ], trk: 0 }],
            notes: ['A container starts with **' + CA.default_count + '** capabilities by default. `--cap-drop ALL` leaves **none**. `--privileged` gives about **' + CA.privileged_count + '**, nearly everything the kernel has.']
          },
          {
            say: 'To see what a capability does, I tried to change the owner of a file, in a container with the defaults and in one with none.',
            tabs: [{ layer: 'RECORDED', name: 'chown 1234 /f', c: 'raw', cols: ['how the container started', 'result'], rows: [['default', 'worked (exit code ' + CH.default_rc + ')'], ['`--cap-drop ALL`', CH.cap_drop_all_error + ' (exit code ' + CH.cap_drop_all_rc + ')']], trk: 0 }],
            notes: ['A job that only reads files and writes rows needs **no capabilities**. Drop them all, and add one back if the job fails and you know why. Avoid `--privileged` for anything that you did not write yourself.']
          }
        ]
      }),

      B.code({
        id: 'm9-leaky', t: 1, src: 'rec', title: 'A secret in a Dockerfile', file: 'Dockerfile.leaky', lang: 'dockerfile', code: LEAKY,
        steps: [
          { say: 'This Dockerfile handles a made-up token in the two ways that people do. I built it with `--build-arg API_TOKEN=brewline-demo-token-4711`.', lines: null },
          { say: '`ARG` is a **build-time** variable. It looks temporary. A `RUN` that uses it records the value in the image history.', lines: G.span(LEAKY, /^ARG/) },
          { say: '`ENV` sets a variable in the **image**, so every container made from it gets the value, and so does anybody who pulls it.', lines: G.span(LEAKY, /^ENV/) },
          { say: 'The `RUN` uses the argument. That is enough for the value to be written into the history of the layer.', lines: G.span(LEAKY, /^RUN/) }
        ],
        note: 'The token is made up. Never put a real one in a Dockerfile, even to test this.'
      }),

      B.term({
        id: 'm9-history', t: 1, src: 'rec', title: 'Where the token went',
        say: 'Then I asked Docker for the history and the settings of the image, as anybody who pulls it can.',
        lines: function () {
          return G.term([
            ['docker history --no-trunc --format \'{{.CreatedBy}}\' leaky:1 | grep -i token', G.text('sec.history_leak')],
            ['docker inspect leaky:1 --format \'{{json .Config.Env}}\' | grep -c brewline-demo-token', LK.env_in_inspect ? '1' : '0']
          ]);
        },
        after: 'The token is in **three places**: the `ARG` line, the `RUN` line that used it, and the `ENV` line. It is also in `docker inspect`. Deleting a file later does not help, as mission 3 showed, and neither does a later `ENV` line that clears the variable: the history keeps the old lines. **An image is not a safe place for a secret.**',
        afterKind: 'warn',
        doneSay: 'Anything in a Dockerfile can be read from the image.'
      }),

      B.code({
        id: 'm9-secretmount', t: 2, src: 'rec', title: 'A secret mount keeps the value out of the image', file: 'Dockerfile.secretmount', lang: 'dockerfile', code: SMF,
        steps: [
          { say: 'BuildKit can pass a secret to one `RUN` step **as a file**, and not put it in the image. I built this with `docker build --secret id=partner_token,src=./partner_token`.', lines: null },
          { say: 'The secret exists as a file at `/run/secrets/partner_token`, **only while this step runs**. Here the step counts its bytes, and writes the count and not the value.', lines: G.span(SMF, /^RUN --mount/, /note.txt/) }
        ],
        note: 'The image printed "' + SM.note + '". The token was not in the history (' + (SM.token_in_history ? 'found' : 'not found') + '), and a search of the file system of the image for the token found ' + SM.files_that_contain_the_token.length + ' files.'
      }),

      B.rows({
        id: 'm9-runtime', t: 1, src: 'rec', title: 'Secrets at run time and in the build context',
        steps: [
          {
            say: 'A secret that you pass when you start a container, with `-e`, does not go into the image. It is still visible.',
            tabs: [{ layer: 'RECORDED', name: 'docker run -e DB_PASSWORD=...', c: 'raw', cols: ['what I checked', 'result'], rows: [['the variable shows in `docker inspect`', RE.visible_in_inspect ? 'yes' : 'no']], trk: 0 }],
            notes: ['Anybody who can run `docker inspect`, and anybody whose process can read the environment of the job, sees it. Prefer a secret that your scheduler or platform injects, as a file or from a secrets manager (from documentation), and keep the value out of the command line.']
          },
          {
            say: 'A third way in is the build context. I put a `.env` file with a made-up connection string next to the Dockerfile that has `COPY . .`, and built it twice: without and with a `.dockerignore` that lists `.env`.',
            tabs: [{ layer: 'RECORDED', name: 'cat /app/.env in the image', c: 'raw', cols: ['.dockerignore', 'result'], rows: [['without the line', DE.without_ignore_content], ['with the line `.env`', DE.with_ignore_error]], trk: 0 }],
            notes: ['`COPY . .` copied the file into the image, with its password. This is the most common leak, because nobody wrote the secret into the Dockerfile. Mission 2 put `.env` in the ignore file.']
          }
        ]
      }),

      B.rows({
        id: 'm9-socket', t: 2, src: 'rec', title: 'The Docker socket is root on the host',
        steps: [
          {
            say: 'Some tools, such as a scheduler that starts containers, ask for the **Docker socket** to be mounted into their container. I started a harmless container, and then a second one with the socket.',
            tabs: [{ layer: 'RECORDED', name: 'docker run -v /var/run/docker.sock:/var/run/docker.sock docker:cli docker ps', c: 'raw', cols: ['what I checked', 'result'], rows: [['the second container lists the first one, which it did not start', SK.container_sees_host_container ? 'yes' : 'no'], ['a container with `-v /etc:/host-etc:ro` reads the hostname of the host', SK.reads_host_file ? 'yes' : 'no']], trk: 0 }],
            notes: ['A container with the socket can start **any** container, including one that mounts the whole host file system as root. Treat access to the socket, and membership of the `docker` group, as **root on the host**. Prefer a scheduler that talks to a remote API with narrow permissions (from documentation).']
          }
        ]
      }),

      B.talk({
        id: 'm9-pin', t: 2, src: 'docs', title: 'Base images: pin, update, scan',
        say: 'The part of the image that you did not write is most of it. Press Next for each point.',
        items: [
          ['Pin the base by digest', 'In the recording `python` resolved to `' + PN.digest_prefix + '...`. `FROM python:3.13-slim@sha256:...` always means that image.', 'A digest in FROM.'],
          ['Rebuild on a schedule', 'A pinned base does not get security fixes. Rebuild and test, for example weekly, and update the digest on purpose.', 'Pin, then update deliberately.'],
          ['Scan the image', 'Tools such as Docker Scout or Trivy list the known vulnerabilities in the packages of an image. Neither ran for this course, so I cannot show output.', 'From documentation.'],
          ['Keep the image small', 'Fewer packages are fewer things to patch. Mission 3 showed how much of an image the packages are.', 'Less in the image, less to fix.'],
          ['Use official or trusted bases', 'An image from a source that you do not know can contain anything.', 'Know who builds your base.']
        ],
        cols: 1
      }),

      B.talk({
        id: 'm9-extra', t: 3, src: 'docs', title: 'Beyond the defaults',
        say: 'Three things that go further than this course. All from documentation, and none of them ran here.',
        items: [
          ['Rootless mode', 'The Docker daemon itself runs as an ordinary user. A flaw that escapes a container then lands in that user\'s account and not in root.', 'The daemon without root.'],
          ['User namespaces', 'Root inside the container is mapped to an unprivileged user ID outside. A file written by "root" on a bind mount is then owned by that other ID.', 'Root inside, nobody outside.'],
          ['Stronger sandboxes', 'Runtimes such as gVisor and Kata Containers add a layer between the container and the host kernel, closer to a virtual machine in strength and cost.', 'More isolation, more overhead.']
        ],
        cols: 1
      }),

      B.bug({
        id: 'm9-bug', t: 1, q: 'The loader image is pushed to a registry that many people can read. Click the two lines that put a secret in it.',
        file: 'Dockerfile.leaky', lang: 'dockerfile', code: LEAKY, bad: [G.at(LEAKY, /^ARG/), G.at(LEAKY, /^ENV/)],
        hint: 'One line sets a value in the image for every container. Another one records a build argument in the history.',
        why: '`ENV PARTNER_TOKEN=...` is stored in the image. `ARG API_TOKEN` is used by a `RUN`, which records the value in the history. Both are readable by anybody who can pull the image, as the recording shows. Pass secrets at run time, or use a BuildKit secret mount for a build step.',
        fix: SMF,
        cheer: 'Nothing secret goes in an ARG or an ENV of an image.'
      }),

      B.order({
        id: 'm9-ord', t: 1, q: 'Put the hardening steps of the loader image in a sensible order.',
        items: [
          'Choose a slim base and pin it by digest',
          'Install the packages as root',
          'Create a user with a fixed numeric ID',
          'Copy the code with --chown to that user',
          'Switch with USER before CMD',
          'At run time: read-only root, drop capabilities, inject secrets'
        ],
        why: 'Packages need root to install, so they come first. The user is created, owns the code, and is selected last. The run-time options then limit what that user can do.'
      }),

      B.quiz({
        id: 'm9-q1', t: 1,
        q: 'A Dockerfile has no `USER` line. As whom does the job run?',
        opts: [
          { t: 'As root inside the container', fb: '' },
          { t: 'As a user named docker', fb: 'There is no such default.' },
          { t: 'As the user who ran `docker run` on the host', fb: 'That is not how it works.' },
          { t: 'As nobody', fb: '' }
        ],
        ok: 0, why: 'The recording printed "' + US.default_image + '". The image with a `USER` line printed "' + US.nonroot_image + '".'
      }),

      B.quiz({
        id: 'm9-q2', t: 1,
        q: 'You use `ARG API_TOKEN` and a `RUN` that reads it. Where can the value be found afterwards?',
        opts: [
          { t: 'Nowhere, because ARG exists only at build time', fb: 'The value is written into the history.' },
          { t: 'In `docker history --no-trunc` of the image', fb: '' },
          { t: 'Only in the build log', fb: '' },
          { t: 'Only on the machine that built the image', fb: 'It is in the image itself.' }
        ],
        ok: 1, why: 'The recording found the line `RUN |1 API_TOKEN=... /bin/sh -c ...` in the history. A BuildKit secret mount leaves nothing there.'
      }),

      B.quiz({
        id: 'm9-q3', t: 1,
        q: 'A tool asks you to start your job container with `-v /var/run/docker.sock:/var/run/docker.sock`. What do you give it?',
        opts: [
          { t: 'Read access to the list of containers', fb: 'It can also create and start them.' },
          { t: 'Control of the Docker Engine, which is root on the host', fb: '' },
          { t: 'Network access only', fb: '' },
          { t: 'Nothing, because a container is isolated', fb: 'The socket is a hole in the isolation.' }
        ],
        ok: 1, why: 'The recording: a container with the socket listed a container that it did not start, and a mount of the host file system read the hostname of the host.'
      }),

      B.decide({
        id: 'm9-dec', t: 2, src: 'rec', title: 'Decision: how does the job get the database password?',
        scenario: 'The loader needs a password for the production database. It runs as a container started by a scheduler on shared workers. The team has a secrets manager, and an image registry that all engineers can read.',
        opts: [
          { t: '`ENV DB_PASSWORD=...` in the Dockerfile, so that it always works', d: 'The simplest.', lose: 'The password is in the image, in the history and in `docker inspect`, for everybody who can read the registry.' },
          { t: 'The scheduler injects it at run time from the secrets manager, as a file or a variable that only this job gets', d: 'The image has no secret. The value exists only where the job runs, and rotating it needs no rebuild.' },
          { t: 'A BuildKit secret mount during the build', d: 'Keeps the value out of the history.', lose: 'It is right for a build step that needs a secret, such as a private package index. A job that needs the password at run time has still no password.' }
        ],
        pick: 1,
        why: 'A secret belongs to the place that runs the job, not to the artifact. The recording showed that `ARG`, `ENV` and `.env` copies all leave the value in the image, and that even `-e` is visible to anyone who can inspect the container, so use the narrowest channel your platform offers.',
        when: 'Use a build secret for a credential that only the build needs, such as a token for a private package index.'
      }),

      B.incident({
        id: 'm9-inc', t: 2, src: 'rec', title: 'Incident: a token is in the image on the registry', time: '10:20',
        alert: '**A scan of the registry found the partner API token in the image `brewline/loader:1.3`.** The image has been pullable by 60 engineers for a month.',
        clues: ['The Dockerfile has `ARG API_TOKEN` and a `RUN` that uses it', '`docker history --no-trunc` of the image shows the value', 'The image has been copied to two other registries and to laptops'],
        opts: [
          { t: 'Rotate the token first, then rebuild without it and remove the affected tags', fb: '' },
          { t: 'Delete the tag and carry on', fb: 'Copies of the image still exist, and the token still works.' },
          { t: 'Rebuild with a later `RUN` that clears the variable', fb: 'The history keeps the old lines.' },
          { t: 'Do nothing, because the registry is private', fb: '60 people and every copy of the image can read it.' }
        ],
        best: 0,
        why: 'The recording shows why the image cannot be cleaned: the history keeps the `ARG`, the `RUN` and the `ENV`. A secret that has been in an image is **exposed**, so the fix starts with making the secret worthless.',
        checks: [
          ['Rotate', 'Create a new token and revoke the old one, before anything else.'],
          ['Find the copies', 'Other registries, laptops and CI caches.'],
          ['Rebuild', 'Use a secret mount for the build, or inject the value at run time.'],
          ['Prevent', 'Scan images for secrets in CI, and block `ARG` and `ENV` with secret names.']
        ],
        tell: 'A partner token was readable in the history of our loader image because the Dockerfile took it as a build argument. I rotated the token first, so the leaked one was worthless, then rebuilt the image with the value injected at run time and removed the old tags. We added a secret scan to CI.',
        prevent: ['No secrets in **ARG**, **ENV** or the build context', 'A **secret scan** of images in CI', 'Short-lived tokens that are easy to rotate']
      }),

      B.qa({
        id: 'qa-root', t: 1, tag: 'Docker', secs: 60,
        q: 'Why should a container not run as root, and how do you change it?',
        pts: ['The default is root, so a flaw runs with those rights', 'Root owns files on a mounted folder', 'Create a user with a numeric ID and use USER', 'Add a read-only file system and drop capabilities'],
        short: 'A container runs as root unless the image says otherwise, and the recording printed uid=0(root) for my first image. Root in a container is not the host root, but it is root over everything that the container can reach, including mounted folders, and a flaw in the job or a dependency then runs with those rights. I create a user with a fixed numeric ID, copy the code with `--chown`, and switch with `USER`. At run time I can also use a read-only root file system with a tmpfs for `/tmp`, and drop all capabilities: the recording went from ' + CA.default_count + ' to ' + CA.dropped_count + '.',
        fu: [['Why a numeric ID?', 'A bind mount and the host know IDs, not names.'], ['What does `--privileged` do?', 'It gives the container almost every capability, ' + CA.privileged_count + ' in the recording, and access to devices. Avoid it.']],
        trap: 'Believing that root in a container is harmless.',
        real: 'Say how your images pick their user.'
      }),

      B.qa({
        id: 'qa-secrets', t: 1, tag: 'Docker', secs: 75,
        q: 'How do you handle secrets with Docker?',
        pts: ['Never in ARG, ENV, or files copied into the image', 'Image history and inspect show them', 'Build secrets: BuildKit secret mounts', 'Run-time secrets: injected by the platform, as files or a secrets manager'],
        short: 'Anything that is in an image can be read by anybody who can pull it. In the recording a token that I passed with ARG and ENV was in the history and in `docker inspect`, and a `.env` file that `COPY . .` took in was readable inside the image. So nothing secret goes into a Dockerfile or the build context, and `.dockerignore` lists `.env`. When a build step needs a credential, I use a BuildKit secret mount: the value was not in the history or the files of that image. At run time I let the platform inject the secret, as a file or from a secrets manager, because even a variable given with `-e` is visible in `docker inspect`.',
        fu: [['What if a secret leaked into an image?', 'Rotate it first. The history keeps it, so removing the tag is not enough.'], ['Is an environment variable safe?', 'It is better than the image. It is visible to anyone who can inspect the container or read its environment.']],
        trap: 'Believing that ARG is "only for the build".',
        real: 'Say how your jobs get their credentials.'
      }),

      B.qa({
        id: 'qa-sock', t: 2, tag: 'Docker', secs: 60,
        q: 'Is it safe to mount the Docker socket into a container?',
        pts: ['The socket is the API of the engine', 'Whoever has it can start any container, with any mount', 'That is root on the host', 'Use a narrow API, a rootless setup, or a separate build host'],
        short: 'No, treat it as root on the host. The socket is the API of the Docker Engine. In the recording a container with the socket listed a container that it had not started, and it could just as well have started one that mounts the whole host file system. A container that reads the host through a mount did exactly that: it printed the hostname of the host. When a scheduler or a CI job needs to start containers, I prefer a remote API with narrow permissions, a rootless daemon, or a dedicated build machine, so that a flaw in one job cannot take over a shared host.',
        fu: [['What about the docker group?', 'Membership gives the same power as the socket, so it is root on the host.'], ['What is the alternative for building images in CI?', 'A builder that needs no daemon on the shared host, or a remote builder. From documentation.']],
        trap: 'Mounting the socket "just for a moment".',
        real: 'Say which tool asked you for the socket.'
      }),

      B.qa({
        id: 'qa-hardening', t: 3, tag: 'Docker', secs: 75,
        q: 'What would you set on a production job container, in order of effect?',
        pts: ['A non-root user', 'No secrets in the image', 'Read-only root file system plus tmpfs', 'Drop all capabilities, no privileged, no socket, memory limit'],
        short: 'First a user that is not root, because everything else builds on it. Then no secrets in the image or the context, with the platform injecting them at run time. Then a read-only root file system with a tmpfs for the places that the job writes. Then drop all capabilities and add one back only for a known reason, with no privileged mode and no Docker socket. Last a memory limit, so that one job cannot take the host, and a pinned base that is rebuilt on a schedule. In the recording I measured the effect of three of these: user 10001 instead of root, ' + CA.dropped_count + ' capabilities instead of ' + CA.default_count + ', and a write error on a read-only root.',
        fu: [['What does seccomp do?', 'A profile that limits which system calls a container may make. Docker applies a default profile. From documentation.'], ['What does no-new-privileges do?', 'It stops a process from gaining more privileges through setuid binaries. From documentation.']],
        trap: 'Listing many options without an order of effect.',
        real: 'Say which of these your team enforces.'
      }),

      B.recap({
        id: 'm9-recap', n: 9, badge: 'Safe Hands', color: '#BFDBFE',
        pts: [
          'No `USER` line means **root**: ' + US.default_image + '. A user with an ID: ' + US.nonroot_image + '.',
          '`--read-only` plus a tmpfs, and `--cap-drop ALL` (' + CA.default_count + ' to ' + CA.dropped_count + ' capabilities), limit what a job can do.',
          'A token in **ARG, ENV or a copied .env** is readable from the image. A **secret mount** left nothing.',
          '`-e` is visible in `docker inspect`. Let the platform inject secrets.',
          'The **Docker socket** is root on the host. Pin the base by digest, and update it on purpose.'
        ],
        lines: [
          'I run jobs as an ordinary user.',
          'I keep secrets out of images.',
          'I know what the Docker socket gives away.'
        ]
      })
    ]
  });
})();
