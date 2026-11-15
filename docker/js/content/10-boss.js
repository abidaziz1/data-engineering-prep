/* Mission 10: boss round. Two drills that mix the missions, a design decision, a coding round, a mock interview and a one-page review. */
(function () {
  var B = LAB.b, G = LAB.get;
  var n = G.n, mb = function (x) { return (x / 1e6).toLocaleString('en-US', { maximumFractionDigits: x < 1e8 ? 1 : 0 }) + ' MB'; };
  var SUM = G.table('cache.summary').rows, CTX = G.counts('build.context'), BASES = G.table('small.bases').rows, HV = G.counts('small.heavy'), RM = G.counts('small.rm');
  var VM = G.table('volumes.matrix').rows, AN = G.counts('volumes.anonymous'), D = G.counts('net.default'), MD = G.counts('net.modes'), RACE = G.counts('compose.race');
  var OOM = G.table('jobs.oom').rows, SIG = G.table('jobs.signals').rows, CP = G.counts('jobs.cpus'), F = G.counts('registry.facts'), US = G.counts('sec.user'), CA = G.counts('sec.caps'), PL = G.counts('registry.platforms');
  var ran = function (o, c) { return SUM.filter(function (r) { return r[0] === o && r[1] === c; })[0]; };
  var CODE_BAD = ran('copy first', 'one line of load_orders.py'), CODE_GOOD = ran('dependencies first', 'one line of load_orders.py');
  var sig = function (p) { return SIG.filter(function (r) { return r[0].indexOf(p) === 0; })[0]; };
  var QA = [['qa-container', 1], ['qa-image', 1], ['qa-exec', 2], ['qa-cache', 1], ['qa-ignore', 1], ['qa-pin', 2], ['qa-small', 1], ['qa-stages', 2], ['qa-alpine', 2], ['qa-volumes', 1],
    ['qa-bind', 2], ['qa-dbcontainer', 2], ['qa-localhost', 1], ['qa-ports', 1], ['qa-netmodes', 2], ['qa-compose', 1], ['qa-depends', 1], ['qa-down', 2], ['qa-exitcodes', 1], ['qa-signals', 1],
    ['qa-limits', 2], ['qa-restart', 2], ['qa-tags', 1], ['qa-registry', 1], ['qa-multiarch', 2], ['qa-root', 1], ['qa-secrets', 1], ['qa-sock', 2], ['qa-hardening', 3],
    ['qa-namespaces', 3], ['qa-buildkit', 3], ['qa-overlay', 3], ['qa-publish', 3], ['qa-pid1', 3], ['qa-cgroups', 3], ['qa-immutable', 3]];
  var NR = G.file('app/Dockerfile.nonroot');

  LAB.addChapter({
    id: 'm10', n: 10, title: 'Boss round', short: 'Boss round', blurb: 'Two drills, a design decision, a coding round, a mock interview and a one-page review', minutes: 32,
    focus: ['src', 'stg', 'ing', 'mart', 'air', 'mon', 'qual', 'ci'],
    goals: [
      'Solve **drills** that combine several missions.',
      'Write a **Dockerfile** from a list of requirements.',
      'Answer a **mock interview round** with a timer, and grade yourself honestly.',
      'Keep a **one-page review** of the rules and the recorded numbers.'
    ],
    say: 'This is the last mission. Two drills in which more than one thing is wrong, one design decision, one coding round, and then the interview questions with no notes. Grade yourself honestly. An honest grade is the only one worth reading.',
    scenes: [
      B.incident({
        id: 'm10-inc1', t: 1, src: 'rec', title: 'Drill: two failures in one night', time: '02:45',
        alert: '**The loader failed at 02:10 with "connection refused". Somebody changed the setting and restarted it. Now it dies at 02:40 with exit code 137 and an empty log.** The stack is Compose, a Postgres service and the loader.',
        clues: ['The first error says `connection to server at "127.0.0.1", port 5432 failed`', 'The setting that was changed is the host name in `DATABASE_URL`', '`docker inspect` of the second failure shows `OOMKilled: true`, and the loader has `mem_limit: 64m`'],
        opts: [
          { t: 'Two separate problems: the first was `localhost`, now fixed. The second is a memory limit. Measure the peak and size the limit, or read the input in chunks', fb: '' },
          { t: 'One problem: the network. Publish port 5432 again', fb: 'The first error is solved. 137 with `OOMKilled` is not a network error.' },
          { t: 'Restart the loader with `restart: always` until it passes', fb: 'It would be killed again at the same point, in a loop.' },
          { t: 'Remove the memory limit so the job always finishes', fb: 'The limit protects the host. Size it, do not remove it.' }
        ],
        best: 0,
        why: 'Fixing the first error exposed the second, which is normal. In the recording `localhost` was refused (' + G.counts('net.localhost').rc + ') and the container name worked. A job that went over its limit ended with ' + OOM[1][2] + ' and `OOMKilled=' + OOM[1][3] + '`, and printed nothing.',
        checks: [
          ['Read the first error', '127.0.0.1 inside a container is the container. Use the service name.'],
          ['Read the second exit code', '137 is SIGKILL. `OOMKilled` tells you whether the memory limit did it.'],
          ['Measure', 'Peak memory of a run, then set the limit above it.'],
          ['Retest the whole path', 'Run the job in Compose again from a clean state.']
        ],
        tell: 'The first failure was the loader connecting to localhost, which in a container is the loader itself, so we used the service name. That exposed a second one: the container was killed with 137 by its 64 MB memory limit, which is why the log was empty. I measured the peak, changed the job to read in chunks, and set a limit with room above it.',
        prevent: ['Host names are **settings**, not literals', 'Alert on **137** and `OOMKilled`', 'Run the stack end to end in CI']
      }),

      B.incident({
        id: 'm10-inc2', t: 2, src: 'rec', title: 'Drill: the same image, different behaviour', time: '09:30',
        alert: '**A fix was merged on Monday and built by CI. On Wednesday two of five workers still run the old code, and the CI build has a different pandas version than a laptop build of the same commit.**',
        clues: ['The Dockerfile has `FROM python:3.13-slim` and `pip install pandas` with no version', 'The scheduler runs `loader:latest` with the pull policy "if not present"', 'The laptop has a warm build cache from last month'],
        opts: [
          { t: 'Pin the packages exactly, and the base by digest. Deploy by the digest that CI records. Stop using `latest` in the schedule', fb: '' },
          { t: 'Always build with `--no-cache` on laptops', fb: 'It makes builds slow and still takes the newest unpinned packages.' },
          { t: 'Pull `latest` by hand on the two workers', fb: 'It fixes today and leaves the cause.' },
          { t: 'Tell developers to rebuild every morning', fb: 'There is no guarantee that two builds agree.' }
        ],
        best: 0,
        why: 'Two causes, both recorded. A cached install keeps the old package version, because the cache compares instructions and files and not the package index. And a local `latest` ran build 1 after the registry had build 2 (' + F.ran_after_pull + ' only after a pull), while a digest ran "' + F.run_by_digest + '" no matter what the tag did.',
        checks: [
          ['Compare versions', '`pip freeze` in both images.'],
          ['Compare digests', '`docker image inspect IMAGE --format "{{index .RepoDigests 0}}"` on each worker.'],
          ['Pin', 'A lock file for the packages, a digest for the base and for the deployment.'],
          ['Log', 'Have the job print its image digest and its package versions at start.']
        ],
        tell: 'There were two causes. Packages without versions let a warm cache and a cold CI build produce different images, and the workers ran latest with a pull policy that never re-pulled. I pinned the packages with a lock file and the base by digest, made CI write the digest into the deployment, and made the job log what it is running.',
        prevent: ['A **lock file** and a base **digest**', 'No `latest` in a schedule', 'Log the **image digest** at start-up']
      }),

      B.decide({
        id: 'm10-dec', t: 2, src: 'docs', title: 'Decision: how to package twelve nightly jobs',
        scenario: 'Brewline has twelve nightly jobs written in Python: loaders, checks and exports. They share the same libraries and a lot of code. A scheduler runs each one as a container. The team asks whether to build twelve images or one.',
        opts: [
          { t: 'Twelve images, one for each job, each with its own Dockerfile', d: 'Each is small and independent.', lose: 'Twelve builds, twelve registries entries, twelve sets of base images to patch. The shared code is copied twelve times.' },
          { t: 'One image with all the code, and a different command for each job', d: 'One build, one set of packages to patch, one digest to deploy. The scheduler passes the job name as the command.', lose: 'A change in any job rebuilds the image that all jobs use, and the image carries packages that a job does not use. Test them all.' },
          { t: 'One long-running container that runs all jobs with a scheduler inside', d: 'Only one container to manage.', lose: 'A memory leak or a crash in one job takes down the others, and you lose the exit code and the limits of each job.' }
        ],
        pick: 1,
        why: 'One image with a command per job gives one thing to build, scan and pin, and the scheduler still starts a separate container for each job, with its own exit code, limits and logs. Split the image when the dependencies really differ, for example one job needs a large library that the others do not.',
        when: 'Choose separate images when the jobs have different dependencies, owners or release cycles.'
      }),

      B.challenge({
        id: 'm10-ch', t: 1, title: 'Coding round: the Dockerfile of the loader', file: 'Dockerfile', lang: 'dockerfile',
        q: 'Write the **Dockerfile** of the Brewline loader. The folder has `requirements.txt` and `load_orders.py`. It must: start from `python:3.13-slim`; **reinstall packages only when `requirements.txt` changes**; not keep a pip cache; run as a **user that is not root** with ID 10001; use the **exec form** of `CMD` so that it receives SIGTERM; and run `python load_orders.py /data/orders.csv`.',
        starter: 'FROM python:3.13-slim\n# ...',
        hints: ['Copy the list of packages and install before you copy the code. The code changes more often.', 'Create the user with `useradd --create-home --uid 10001 app` before you copy the code, and copy with `--chown=app:app`.', '`USER app` goes after the packages are installed and before `CMD`. The command is a JSON list.'],
        sol: NR,
        res: { cols: ['check', 'what the recording printed'], rows: [['`id` in this image', US.nonroot_image], ['steps that ran again after a one-line code change, packages first', CODE_GOOD[3] + ' of ' + CODE_GOOD[2]], ['steps that ran again with the code copied first', CODE_BAD[3] + ' of ' + CODE_BAD[2]]], msg: 'from the recording' },
        expl: ['The packages are installed as root, in a layer that the cache keeps until `requirements.txt` changes.', 'The code is copied after them, with `--chown`, so that the user owns it.', '`USER app` makes the container run as user 10001, and the exec form of `CMD` makes the job process 1, so that `docker stop` reaches it.'],
        cx: 'The build cost is dominated by the install. With the order above, a code change copies one file. The image is the base plus the packages plus a few kilobytes.'
      })
    ].concat(B.mockRound(QA.map(function (x) { return x[0]; }), QA.map(function (x) { return x[1]; }))).concat([
      B.cheat({
        id: 'm10-cheat', t: 1, src: 'rec', title: 'One page to review',
        say: 'This is your last-minute review. Every number comes from the recording. Items marked (docs) come from documentation and were not run. Take a screenshot or print the page.',
        sections: [
          { h: 'Containers and images', items: ['A container is a process on the host kernel, with its own process list, files and network. The recording printed one kernel for the host and the container', 'An image is read-only layers. A container adds a writable layer that dies with `docker rm`', 'Exited containers keep their exit code and logs. `--rm` removes them. Leave `-it` out of anything that runs by itself'] },
          { h: 'Build and cache', items: ['A changed step and every step below it run again. Packages first, code last: a one-line change ran ' + CODE_GOOD[3] + ' step, and ' + CODE_BAD[3] + ' steps with the code first', 'A cached install keeps the old package version. Pin versions (docs)', '`.dockerignore`: ' + CTX.with_ignore + ' instead of ' + CTX.without_ignore + ' sent to the engine', '`docker build --check` reviews a Dockerfile'] },
          { h: 'Size', items: ['Base images: ' + mb(BASES[0][1]) + ' full, ' + mb(BASES[1][1]) + ' slim, ' + mb(BASES[2][1]) + ' alpine', 'Alpine saved ' + ((1 - HV.alpine.size / HV.slim.size) * 100).toFixed(0) + ' % with pandas and pyarrow', 'A file deleted in a later layer stays: ' + mb(RM.later_layer - RM.same_layer) + ' extra for 50 MB. Delete in the same RUN', 'A plain docker build does not run the test stage'] },
          { h: 'Data', items: ['Writable layer: gone with the container. Named volume and bind mount: stay. tmpfs: gone on stop', 'No flag still made an anonymous volume: rows survived a restart and not a remove, ' + AN.dangling_volumes_left_by_rm + ' dangling volume left', 'Files belong to a user ID. Root writes root-owned files on a bind mount'] },
          { h: 'Networks and Compose', items: ['localhost is the container. Use the name of the other container or service. The default bridge has no names', '`-p` without an address binds 0.0.0.0. Bridge, host and none: ' + MD.interfaces_bridge + ', ' + MD.interfaces_host + ' and ' + MD.interfaces_none + ' interfaces', 'depends_on as a list: the loader ended with ' + RACE.exit_code + '. A healthcheck over TCP and `service_healthy` fixes it', '`down` keeps volumes, `down -v` deletes the data. A profile keeps a job out of `up`'] },
          { h: 'Jobs', items: ['137 is SIGKILL (memory limit: OOMKilled, no output). 143 is SIGTERM. 127 not found, 126 not executable', 'docker stop: SIGTERM to PID 1, then SIGKILL. Shell form: process ' + sig('shell form (sh -c)')[1] + ', exit ' + sig('shell form (sh -c)')[3] + '. Exec form with a handler: exit ' + sig('exec form, handles')[3] + '. `--init`: ' + sig('exec form, no handler, docker run --init')[3], '`--cpus 0.5`: Python still saw ' + CP.cpus_0_5.cpu_count + ' CPUs', 'on-failure:N for jobs, unless-stopped for services (docs)'] },
          { h: 'Shipping and safety', items: ['A tag moves, a digest does not. A machine that has an image does not check whether its tag moved. `latest` is not the newest', 'Multi-platform tag: ' + PL.platforms.length + ' platforms (python:3.13-slim)', 'Default user is root: ' + US.default_image + '. Capabilities ' + CA.default_count + ' by default, ' + CA.dropped_count + ' with `--cap-drop ALL`', 'No secrets in ARG, ENV or a copied .env. A secret mount left nothing. The Docker socket is root on the host'] }
        ]
      }),

      B.recap({
        id: 'm10-recap', n: 10, badge: 'Docker Partner', color: '#BAE6FD',
        pts: [
          'You can explain a **container, an image and a layer**, and what happens to the files.',
          'You can write a **Dockerfile** that rebuilds fast, stays small and runs as a user.',
          'You can **keep and find the data**, connect containers **by name**, and run a **stack** in the right order.',
          'You can read an **exit code**, make a job **stop cleanly**, and size its **limits**.',
          'You can **ship by digest** and keep **secrets out of images**.'
        ],
        lines: [
          'I package jobs so that they run the same everywhere.',
          'I know what is in my image and who can read it.',
          'I can talk to the people who run the cluster.'
        ]
      })
    ])
  });
})();
