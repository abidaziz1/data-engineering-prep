/* Mission 2: layers and the build cache. The builds on these screens ran on a real Docker Engine with BuildKit. */
(function () {
  var B = LAB.b, G = LAB.get;
  var DF = G.file('app/Dockerfile'), CF = G.file('app/Dockerfile.copy_first'), LINT = G.file('app/Dockerfile.lint'), IGN = G.file('app/.dockerignore');
  var SUM = G.table('cache.summary'), CTX = G.counts('build.context'), IMG = G.counts('build.image'), HIST = G.table('build.history'), CHK = G.counts('build.check');
  var n = G.n;
  var ran = function (order, change) { return SUM.rows.filter(function (r) { return r[0] === order && r[1] === change; })[0]; };
  var CODE_GOOD = ran('dependencies first', 'one line of load_orders.py'), CODE_BAD = ran('copy first', 'one line of load_orders.py'), REQ_GOOD = ran('dependencies first', 'requirements.txt');
  G.expect(CODE_GOOD[3] === 1 && CODE_GOOD[4] === false, 'a code change in the good order reruns one step and not pip');
  G.expect(CODE_BAD[3] === 2 && CODE_BAD[4] === true, 'a code change in the bad order reruns pip');
  G.expect(ran('dependencies first', 'nothing')[3] === 0 && ran('copy first', 'nothing')[3] === 0, 'a rebuild with no change runs nothing');
  G.expect(CTX.without_ignore.indexOf('MB') > 0 && CTX.with_ignore.indexOf('kB') > 0, 'the context is megabytes without .dockerignore and kilobytes with it');
  G.expect(CHK.warnings === 5, 'the build check found five warnings');

  /* the rules that docker build --check printed, with their first message line */
  var warn = [];
  var cl = G.text('build.check').split('\n');
  for (var i = 0; i < cl.length; i++) if (/^WARNING: /.test(cl[i])) warn.push([cl[i].replace(/^WARNING: /, '').split(' - ')[0], cl[i + 1]]);
  G.expect(warn.length === 5, 'five rules were parsed from the check output');

  LAB.addChapter({
    id: 'm2', n: 2, title: 'Layers and the build cache', short: 'Layers', blurb: 'Write the Dockerfile of the loader and make rebuilds fast', minutes: 17,
    focus: ['stg', 'ing'],
    goals: [
      'Write a **Dockerfile** for a Python job.',
      'Explain why a build is fast the second time: the **cache**.',
      'Put the instructions in the order that keeps the cache useful.',
      'Keep files out of the **build context** with `.dockerignore`.'
    ],
    say: 'The Brewline loader is a Python file and one package. This mission puts it in an image, and then breaks the build on purpose to show what a careless Dockerfile costs every time somebody changes a line of code.',
    scenes: [
      B.code({
        id: 'm2-dockerfile', t: 1, src: 'rec', title: 'The Dockerfile of the loader', file: 'Dockerfile', lang: 'dockerfile', code: DF,
        steps: [
          { say: 'Six lines. I built this file on the real engine and ran the image. Press Next to read it line by line.', lines: null },
          { say: '`FROM` names the **base image**: Debian with Python ' + G.meta('python_version') + ' already installed. Every build starts here.', lines: G.span(DF, /^FROM/) },
          { say: '`WORKDIR` sets the folder for the next instructions and for the command. Docker creates it. Use an absolute path.', lines: G.span(DF, /^WORKDIR/) },
          { say: 'The **list of packages** is copied first, alone. Remember this order: the next screens show what it saves.', lines: G.span(DF, /^COPY requirements/) },
          { say: '`RUN` executes a command at build time and keeps the files it changes as a layer. `--no-cache-dir` stops pip from keeping a download cache in the image.', lines: G.span(DF, /^RUN pip/) },
          { say: 'The code comes **after** the packages, because code changes every day and the packages do not.', lines: G.span(DF, /^COPY load_orders/) },
          { say: '`CMD` is the command that runs when a container starts. The **square brackets** are the exec form: Docker runs `python` directly. Mission 7 shows why that matters.', lines: G.span(DF, /^CMD/) }
        ],
        note: 'Built and run on a real engine. Inside the image, psycopg is version ' + IMG.psycopg_inside + '. The image is ' + n(IMG.size) + ' bytes, and the base image alone is ' + n(IMG.base_size) + '.'
      }),

      B.rows({
        id: 'm2-history', t: 1, src: 'rec', title: 'What the build made',
        steps: [
          {
            say: 'I asked Docker for the history of the image that I had just built: one row for each layer, newest on top.',
            tabs: [{ layer: 'RECORDED', name: 'docker history of the loader image', c: 'raw', cols: HIST.cols, rows: HIST.rows, trk: 0 }],
            notes: ['The `pip install` layer is **' + HIST.rows[2][0] + '**, almost all of what the image adds. The two `COPY` layers are a few kilobytes. A change in the **code** costs kilobytes. A change in the **packages** costs the whole install again, unless the cache helps.']
          }
        ]
      }),

      B.flow({
        id: 'm2-cache', t: 1, src: 'rec', title: 'The build cache', g: 'layers', legend: true,
        steps: [
          { say: 'The five steps of the loader build, in a row. For each one Docker asks: have I built exactly this step before, on exactly this layer below it? If yes, it takes the layer from the **cache**. Press Next.', focus: ['l1', 'l2', 'l3', 'l4', 'l5'], tags: ['tg_ro'], cap: 'Docker checks each step against the cache.' },
          { say: 'The **first build**: nothing is cached, so every step runs. This is the slow one, because pip downloads and installs the package.', on: ['e1', 'e2', 'e3', 'e4'], focus: ['l1', 'l2', 'l3', 'l4', 'l5'], status: { l1: 'run', l2: 'run', l3: 'run', l4: 'run', l5: 'run' }, cap: 'Every step runs.' },
          { say: 'The **same build again**. Nothing changed, so every step comes from the cache. In the recording, ' + ran('dependencies first', 'nothing')[3] + ' steps ran.', focus: ['l1', 'l2', 'l3', 'l4', 'l5'], status: { l1: 'ok', l2: 'ok', l3: 'ok', l4: 'ok', l5: 'ok' }, tags: ['tg_cache'], cap: 'All five from the cache.' },
          { say: 'You **change one line of load_orders.py**. The steps above it are the same, so they are cached. Only the last `COPY` has new content, so it runs. In the recording, **' + CODE_GOOD[3] + ' step** ran and pip did not.', focus: ['l1', 'l2', 'l3', 'l4', 'l5'], status: { l1: 'ok', l2: 'ok', l3: 'ok', l4: 'ok', l5: 'run' }, tags: ['tg_cache'], cap: 'Only the changed step runs.' },
          { say: 'You **change requirements.txt**. That step runs, and so does **every step after it**, because a layer depends on the layer below it. pip installs again. In the recording, **' + REQ_GOOD[3] + ' steps** ran.', focus: ['l3', 'l4', 'l5'], status: { l1: 'ok', l2: 'ok', l3: 'run', l4: 'run', l5: 'run' }, tags: ['tg_again'], cap: 'A changed step invalidates everything below it.' },
          { say: 'The rule: **put what changes rarely first, and what changes often last**. A cache hit needs the instruction, the files it copies and everything above it to be identical.', focus: ['l1', 'l2', 'l3', 'l4', 'l5'], cap: 'Rare changes on top, frequent changes at the bottom.' }
        ]
      }),

      B.widget({ id: 'm2-lab', kind: 'cache', t: 1, src: 'rec', title: 'Lab: which steps run again?' }),

      B.cmp({
        id: 'm2-order', t: 1, src: 'rec', title: 'Two orders, the same instructions',
        say: 'Both Dockerfiles install the same package and copy the same code. They differ in one thing: whether the code is copied before or after the install. Press Next to see the cost.',
        cols: ['What you change', 'Code copied first: steps that ran again', 'Packages first: steps that ran again'],
        hl: 0,
        rows: ['nothing', 'one line of load_orders.py', 'requirements.txt'].map(function (c) {
          var a = ran('copy first', c), b = ran('dependencies first', c);
          return [c, a[3] + ' of ' + a[2] + (a[4] ? ', pip ran again' : ''), b[3] + ' of ' + b[2] + (b[4] ? ', pip ran again' : '')];
        }),
        steps: [
          { upto: 2, say: 'With no change, both come from the cache. The difference shows only when you edit something.' },
          { upto: 3, say: 'A code change is the case that happens all day. With the code copied first, it reinstalls the packages every time. With the packages first, it copies one file.' }
        ]
      }),

      B.code({
        id: 'm2-bad', t: 1, src: 'rec', title: 'The same Dockerfile in the wrong order', file: 'Dockerfile.copy_first', lang: 'dockerfile', code: CF,
        steps: [
          { say: 'This is the Dockerfile that most people write first. It looks tidy: copy everything, then install.', lines: null },
          { say: '`COPY . .` copies **every file of the folder**, including the code. Its cache key is the content of all those files.', lines: G.span(CF, /^COPY \. \./) },
          { say: 'So one changed line of code changes the key of this step, and the `RUN pip install` below it can never be taken from the cache. Each edit costs a full install.', lines: G.span(CF, /^RUN pip/) }
        ],
        note: 'In the recording, a one-line code change ran ' + CODE_BAD[3] + ' of ' + CODE_BAD[2] + ' steps here, including pip, against ' + CODE_GOOD[3] + ' of ' + CODE_GOOD[2] + ' with the packages first.'
      }),

      B.bug({
        id: 'm2-bug', t: 1, q: 'Developers complain that every small code change makes the build install all packages again. Click the line that causes it.',
        file: 'Dockerfile', lang: 'dockerfile', code: CF, bad: [G.at(CF, /^COPY \. \./)],
        hint: 'Which line puts the code below the line that installs the packages?',
        why: '`COPY . .` comes before `RUN pip install`. Any change to any file changes this layer, and every layer below it, the install included, has to be built again.',
        fix: DF,
        cheer: 'Copy the list of packages, install, and only then copy the code.'
      }),

      B.order({
        id: 'm2-ord', t: 1, q: 'Put the instructions of a Python job in the order that keeps the build cache useful.',
        items: [
          'FROM python:3.13-slim',
          'WORKDIR /app',
          'COPY requirements.txt .',
          'RUN pip install --no-cache-dir -r requirements.txt',
          'COPY load_orders.py worker.py ./',
          'CMD ["python", "load_orders.py", "/data/orders.csv"]'
        ],
        why: 'The base and the folder never change. The package list changes now and then. The code changes all the time, so it goes last, and `CMD` makes no files at all.'
      }),

      B.rows({
        id: 'm2-context', t: 1, src: 'rec', title: 'The build context',
        steps: [
          {
            say: '`docker build .` sends the folder `.` to the engine. That folder is the **build context**: the only files that `COPY` can see. I added 20 files of 2 MB each, an old archive, to the folder, and built the Dockerfile that has `COPY . .`.',
            tabs: [{ layer: 'RECORDED', name: 'Context transferred by COPY . .', c: 'raw', cols: ['.dockerignore', 'bytes sent to the engine'], rows: [['none', CTX.without_ignore], ['with the file on the next screen', CTX.with_ignore]], trk: 0 }],
            notes: ['Without the ignore file the build sent **' + CTX.without_ignore + '**, and the archive would have gone into the image. With it, **' + CTX.with_ignore + '**. A `COPY` of named files sends only those files, which is another reason to copy files by name.']
          }
        ]
      }),

      B.code({
        id: 'm2-ignore', t: 1, src: 'rec', title: 'A .dockerignore file', file: '.dockerignore', lang: 'text', code: IGN,
        steps: [
          { say: 'A `.dockerignore` next to the Dockerfile lists what the build must not see. It works like `.gitignore`.', lines: null },
          { say: '`data/` keeps big local data out of the context. This is the folder that held the 40 MB of the last screen.', lines: G.span(IGN, /^data/) },
          { say: '`.git/` and `__pycache__/` are never needed in an image.', lines: G.span(IGN, /^\.git/, /pyc/) },
          { say: '`.env` keeps local secrets out. Mission 9 shows a real password in an image that skipped this line.', lines: G.span(IGN, /^\.env/) }
        ],
        note: 'Three things happen with one small file: the build is faster, the image is smaller, and nothing private is copied by accident.'
      }),

      B.rows({
        id: 'm2-check', t: 2, src: 'rec', title: 'Ask Docker to review the Dockerfile',
        steps: [
          {
            say: '`docker build --check` reads a Dockerfile and reports problems without building. I ran it on a Dockerfile with five habits that are best avoided. This is what it said, shortened to the rule and its message.',
            tabs: [{ layer: 'RECORDED', name: 'docker build --check', c: 'raw', cols: ['rule', 'what it says'], rows: warn, trk: 0 }],
            notes: ['The check **exited with code ' + CHK.rc + '**, so a CI job can fail on it. It does not run any instruction, so it is fast.']
          }
        ]
      }),

      B.code({
        id: 'm2-lint', t: 2, src: 'rec', title: 'The file that was checked', file: 'Dockerfile.lint', lang: 'dockerfile', code: LINT,
        steps: [
          { say: 'This Dockerfile builds. It also breaks five rules that the check knows.', lines: null },
          { say: '`maintainer` is deprecated. Use `LABEL org.opencontainers.image.authors=...`. The check also wants the instruction in upper case, like the others.', lines: G.span(LINT, /^maintainer/) },
          { say: '`WORKDIR app` is a relative path. If the base image changes its working folder, the job lands somewhere else. Write `/app`.', lines: G.span(LINT, /^WORKDIR/) },
          { say: '`ENV KEY value` is the old form. Use `ENV KEY=value`.', lines: G.span(LINT, /^ENV/) },
          { say: '`CMD python load_orders.py` is the **shell form**: it starts `sh -c "python ..."`, and the shell becomes process 1. Use the JSON form. Mission 7 shows what the shell does to a signal.', lines: G.span(LINT, /^CMD/) }
        ],
        note: 'The same file also has `COPY . .` before the install, which the check does not flag. The cache order is yours to review.'
      }),

      B.term({
        id: 'm2-typo', t: 1, src: 'rec', title: 'A Dockerfile that does not parse',
        say: 'The first word of the file has a typo. Read what Docker says.',
        lines: function () {
          return G.term([
            ['head -1 Dockerfile.bad', 'FORM python:3.13-slim'],
            ['docker build -f Dockerfile.bad .', G.text('build.bad')]
          ]);
        },
        after: 'Docker stops at line 1 and even suggests the fix. A parse error costs a second. A wrong `RUN` costs the minutes of every step before it, which is why you put the cheap, likely-to-fail steps early when you can.',
        afterKind: 'tip',
        doneSay: 'Read the first error line. Docker usually tells you what it expected.'
      }),

      B.quiz({
        id: 'm2-q1', t: 1,
        q: 'You change one line of `load_orders.py`. The Dockerfile copies `requirements.txt`, runs `pip install`, and then copies the code. Which steps run again?',
        opts: [
          { t: 'All of them', fb: 'The steps above the changed one have identical inputs, so they come from the cache.' },
          { t: 'Only the `COPY` of the code', fb: '' },
          { t: 'Only `RUN pip install`', fb: 'The install does not depend on the code in this order.' },
          { t: 'None, because Docker does not see the change', fb: 'Docker compares the content of the copied files.' }
        ],
        ok: 1, why: 'In the recording, ' + CODE_GOOD[3] + ' step ran: the last `COPY`. A step runs again when its own inputs changed, or when any step above it ran again.'
      }),

      B.quiz({
        id: 'm2-q2', t: 1,
        q: 'What does `.dockerignore` change?',
        opts: [
          { t: 'Which files of the build context the build can see', fb: '' },
          { t: 'Which files a running container can read from the host', fb: 'That is the job of volumes and bind mounts.' },
          { t: 'Which images may be pushed to a registry', fb: 'It has no effect on pushing.' },
          { t: 'Which Dockerfile instructions are skipped', fb: 'It only affects files.' }
        ],
        ok: 0, why: 'It filters the files that are sent to the engine as the build context. That makes the build faster and keeps secrets and big data out of the image.'
      }),

      B.quiz({
        id: 'm2-q3', t: 2,
        q: 'A build uses `RUN pip install -r requirements.txt` and the file lists `pandas` without a version. You rebuild after a week with a warm cache. Which pandas do you get?',
        opts: [
          { t: 'The newest pandas at the time of the rebuild', fb: 'The cache key does not include the package index.' },
          { t: 'The version from the cached layer, if nothing above the step changed', fb: '' },
          { t: 'An error, because the version is missing', fb: 'pip accepts a name without a version.' },
          { t: 'The oldest version that pip can find', fb: 'pip prefers the newest one.' }
        ],
        ok: 1, why: 'Docker caches the layer by the text of the instruction and the files it copies. It does not know that the package index changed. A cold build on a CI machine gets the new version, and a warm one on a laptop does not. Pin versions exactly.'
      }),

      B.decide({
        id: 'm2-dec', t: 2, src: 'docs', title: 'Decision: how to pin the packages',
        scenario: 'A nightly job broke after a rebuild: a library released a new major version and the job still used the old function names. The `requirements.txt` lists names with no versions. The team builds on a laptop with a warm cache and in CI with a cold one.',
        opts: [
          { t: 'Keep the names without versions and always build with `--no-cache` so that everything is fresh', d: 'Always the newest packages.', lose: 'That is the cause of the failure. Each build can get different versions, and you pay for a full install every time.' },
          { t: 'Pin every package, including the packages that they pull in, in a lock file, and update the lock file on purpose', d: 'Every build, warm or cold, installs the same versions. The cache is still useful.' },
          { t: 'Pin only the top-level packages', d: 'Better.', lose: 'The packages that they depend on can still change underneath you.' }
        ],
        pick: 1,
        why: 'The goal is the same image from the same inputs. A lock file with exact versions gives that, and the layer cache keeps rebuilds fast because the file changes only when you decide to update.',
        when: 'Leave versions open only for a throwaway experiment, and never for a job that runs without you.'
      }),

      B.incident({
        id: 'm2-inc', t: 2, src: 'rec', title: 'Incident: every build takes eight minutes', time: '16:20',
        alert: '**The team says that CI builds of the loader take about eight minutes, even for a one-line change.** The image has not grown. Nobody changed the base image.',
        clues: ['The Dockerfile starts with `COPY . .` and then runs `pip install -r requirements.txt`', 'The CI log shows the install step running on every commit, with no "CACHED"', 'The repository root also holds a 300 MB folder of sample data'],
        opts: [
          { t: 'Copy `requirements.txt` first, install, and copy the code last; add a `.dockerignore` for the data folder', fb: '' },
          { t: 'Buy a bigger CI machine', fb: 'The install is not slow because of the machine. It runs for no reason.' },
          { t: 'Add `--no-cache` so that builds are consistent', fb: 'That forces every step to run on every build, which is the problem.' },
          { t: 'Remove the tests from the build', fb: 'The tests are not the cost. The install is.' }
        ],
        best: 0,
        why: 'The recording shows the pattern: with the code copied first, a one-line change ran ' + CODE_BAD[3] + ' of ' + CODE_BAD[2] + ' steps, pip included. With the packages first it ran ' + CODE_GOOD[3] + '. The data folder adds to the cost of every context transfer, which the ignore file removes.',
        checks: [
          ['Read the log', 'Look for the word CACHED on each step. A step without it ran.'],
          ['Find the first step that changed', 'Everything below it ran again. Here it is `COPY . .`.'],
          ['Reorder', 'Package list, install, then code.'],
          ['Check the CI cache', 'CI runners often start with an empty cache. Push and pull a cache, or build on a persistent runner (from documentation).']
        ],
        tell: 'Builds were slow because the Dockerfile copied all the code before it installed the packages, so each commit reinstalled everything. I moved the install above the code copy, added a .dockerignore for the data folder, and the install step now comes from the cache on every commit that does not touch requirements.txt.',
        prevent: ['Review the **order of instructions** in every new Dockerfile', 'Run `docker build --check` in CI', 'Keep a `.dockerignore` in every build folder']
      }),

      B.qa({
        id: 'qa-cache', t: 1, tag: 'Docker', secs: 75,
        q: 'How does the Docker build cache work, and how do you order a Dockerfile for it?',
        pts: ['A layer is reused when the instruction, the copied files and the layer below are the same', 'A changed layer invalidates every layer after it', 'Rarely changing steps first: base, packages', 'Frequently changing steps last: the code'],
        short: 'Docker builds an image one instruction at a time. For each instruction it checks whether it has built the same instruction before on the same layer below it, and for a COPY it compares the content of the files. If yes, it takes the layer from the cache. When one step changes, that step and every step after it run again. So I order the Dockerfile from rarely to often changing: the base image, then the package list, then the install, and the code last. In the recording a one-line code change ran ' + CODE_GOOD[3] + ' step with that order and ' + CODE_BAD[3] + ' steps, pip included, when the code was copied first.',
        fu: [['What does `COPY . .` do to the cache?', 'Its key is the content of the whole folder, so any change anywhere invalidates it and everything below it.'], ['Does the cache know that a package has a new release?', 'No. It compares instructions and files. A cached install keeps the old version until a layer above it changes. Pin versions.']],
        trap: 'Putting `COPY . .` first because it looks tidy.',
        real: 'Say how much a rebuild cost before and after you reordered a file.'
      }),

      B.qa({
        id: 'qa-ignore', t: 1, tag: 'Docker', secs: 60,
        q: 'What is the build context, and why do you need a `.dockerignore`?',
        pts: ['The folder that is sent to the engine at build time', 'COPY can only read files in it', 'The ignore file removes files from it', 'Faster builds, smaller images, no secrets copied'],
        short: 'The build context is the folder that `docker build` sends to the engine. A COPY can only use files from it. Without an ignore file, a `COPY . .` also copies local data, caches, the git history and any .env file. In the recording an extra 40 MB of files made the build send ' + CTX.without_ignore + ', and with a .dockerignore it sent ' + CTX.with_ignore + '. The ignore file makes the build faster, keeps the image small, and keeps secrets out of it.',
        fu: [['Does `COPY requirements.txt .` send the whole folder?', 'BuildKit sends only the files that the COPY instructions need. `COPY . .` needs all of them.'], ['What goes in the ignore file?', 'Local data, `.git`, `__pycache__`, virtual environments, `.env` files, build output.']],
        trap: 'Thinking that .dockerignore only matters for size.',
        real: 'Describe a file that ended up in an image by accident.'
      }),

      B.qa({
        id: 'qa-pin', t: 2, tag: 'Docker', secs: 60,
        q: 'How do you make a Docker build reproducible?',
        pts: ['Pin the base image by tag, or better by digest', 'Pin every package version with a lock file', 'Do not rely on the cache for freshness', 'Rebuild on purpose, and test the rebuild'],
        short: 'Two things move under a Dockerfile: the base image tag and the packages. A tag like `python:3.13-slim` follows new patch releases, so I pin it by digest when I need the exact same base. For the packages I use a lock file with exact versions, including the packages that they depend on. The build cache does not know that a new release exists, so a warm laptop and a cold CI runner can build different images from the same Dockerfile unless the versions are pinned. I update the pins on purpose, rebuild and run the tests.',
        fu: [['Why not `--no-cache` always?', 'It makes every build slow and still gets the newest unpinned packages, which is what breaks jobs.'], ['How do you get the digest?', '`docker image inspect IMAGE --format "{{index .RepoDigests 0}}"`. Mission 9 shows it.']],
        trap: 'Believing that a cold build is the same as a reproducible build.',
        real: 'Say how you update pinned versions on a schedule.'
      }),

      B.qa({
        id: 'qa-buildkit', t: 3, tag: 'Docker', secs: 75,
        q: 'What does BuildKit do beyond caching layers?',
        pts: ['Builds independent stages in parallel and skips stages that nothing needs', 'Cache mounts for package caches, such as pip', 'Secret mounts that stay out of the image', 'Export and import of the cache for CI, and build checks'],
        short: 'BuildKit is the builder behind `docker build`. It works out which stages and steps depend on each other, so it can run independent ones in parallel, and it skips a stage that the target does not need. In the recording a plain build skipped the test stage. It also has features that the old builder lacked. A secret mount hands a value to one `RUN` step as a file and leaves nothing in the image, and I recorded that in mission 9. `docker build --check` reviews a Dockerfile, which I recorded too. A cache mount, `RUN --mount=type=cache,target=...`, keeps a package download cache between builds outside the image, and the cache can be exported and imported for CI runners that start empty. Those last two are from documentation and I did not run them.',
        fu: [['What is the gain of a cache mount?', 'A rebuild after a change to `requirements.txt` can reuse downloaded packages, so only the install runs. The cache is not part of the image.'], ['How do CI runners with no cache get fast builds?', 'By pulling a cache that an earlier build exported to a registry, with `--cache-from` and `--cache-to` (from documentation).']],
        trap: 'Talking about BuildKit as if it were only a faster `docker build`.',
        real: 'Say how long your CI builds took before and after you used the cache on the runners.'
      }),

      B.recap({
        id: 'm2-recap', n: 2, badge: 'Layer Reader', color: '#BFDBFE',
        pts: [
          'Each instruction makes a **layer**. An unchanged step comes from the **cache**.',
          'A changed step runs again, and **so does every step below it**.',
          'Order: base, **package list**, install, **code**, command. The code changes most, so it goes last.',
          'The wrong order ran **' + CODE_BAD[3] + ' of ' + CODE_BAD[2] + '** steps after a one-line change. The right order ran **' + CODE_GOOD[3] + '**.',
          '`.dockerignore` kept the context at **' + CTX.with_ignore + '** instead of **' + CTX.without_ignore + '**. `docker build --check` reviews a file in a second.'
        ],
        lines: [
          'I can write a Dockerfile for a Python job.',
          'I order instructions for the cache.',
          'I keep the build context small.'
        ]
      })
    ]
  });
})();
