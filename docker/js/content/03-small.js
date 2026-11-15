/* Mission 3: small images. The sizes on these screens are what docker image inspect reported for images built on a real Docker Engine. */
(function () {
  var B = LAB.b, G = LAB.get;
  var BASES = G.table('small.bases').rows, HV = G.counts('small.heavy'), RM = G.counts('small.rm'), ST = G.counts('small.stages'), MS = G.file('app/Dockerfile.multistage');
  var RML = G.file('app/Dockerfile.rm_later'), RMS = G.file('app/Dockerfile.rm_same');
  var n = G.n, mb = function (x) { return (x / 1e6).toLocaleString('en-US', { maximumFractionDigits: x < 1e8 ? 1 : 0 }) + ' MB'; };
  var FULL = BASES[0][1], SLIM = BASES[1][1], ALP = BASES[2][1];
  G.expect(HV.slim.ok === true && HV.alpine.ok === true, 'pandas and pyarrow installed on both slim and alpine');
  G.expect(FULL > SLIM * 5 && SLIM > ALP * 2, 'the full image is more than five times slim, and slim is more than twice alpine');
  G.expect(HV.alpine.size < HV.slim.size && HV.alpine.size > HV.slim.size * 0.8, 'alpine with pandas is smaller than slim, by less than a fifth');
  G.expect(RM.later_layer > RM.base + RM.file_bytes * 0.9 && RM.same_layer < RM.base + 100000, 'the deleted file stays in the image when it is deleted in a later layer');
  G.expect(ST.pytest_in_test === 'True' && ST.pytest_in_runtime === 'False' && ST.default_build_ran_pytest === false, 'pytest is only in the test stage, and a plain build does not run it');
  var saved = (1 - HV.alpine.size / HV.slim.size) * 100;

  LAB.addChapter({
    id: 'm3', n: 3, title: 'Small images and stages', short: 'Slim', blurb: 'Choose a base image, keep deleted files out, and build in stages', minutes: 13,
    focus: ['ing', 'mart'],
    goals: [
      'Choose a **base image** and say what it costs.',
      'Explain why **deleting a file in a later layer** does not make an image smaller.',
      'Use a **multi-stage build** to keep test tools out of the image you ship.',
      'Say what **Alpine** saves, and what it does not.'
    ],
    say: 'Every worker that runs the loader has to pull its image first. A smaller image starts sooner, costs less to store and has less in it to attack. In this mission you measure instead of guess: four experiments, each one built and measured on the real engine.',
    scenes: [
      B.rows({
        id: 'm3-bases', t: 1, src: 'rec', title: 'Three Python base images',
        steps: [
          {
            say: 'The official Python image comes in several flavours. I pulled three and asked Docker for their size.',
            tabs: [{ layer: 'RECORDED', name: 'The base image alone', c: 'raw', cols: ['image', 'size in bytes', 'layers'], rows: BASES.map(function (r) { return [r[0], n(r[1]), r[2]]; }), trk: 0 }],
            notes: ['The full image, `python:3.13`, is **' + mb(FULL) + '**. The slim variant is **' + mb(SLIM) + '** and the Alpine variant **' + mb(ALP) + '**. The full one carries compilers and development headers. For a job that installs ready-made wheels, you do not need them.']
          }
        ]
      }),

      B.widget({ id: 'm3-lab', kind: 'size', t: 1, src: 'rec', title: 'Lab: what makes an image large' }),

      B.rows({
        id: 'm3-alpine', t: 1, src: 'rec', title: 'Alpine, with real packages',
        steps: [
          {
            say: 'Alpine is a very small Linux. It uses a different C library, **musl**, which used to break many Python wheels. I installed pandas, pyarrow, numpy and psycopg on both bases from the same requirements file.',
            tabs: [{ layer: 'RECORDED', name: 'The same pip install on two bases', c: 'raw', cols: ['base', 'image size in bytes', 'pandas and pyarrow'], rows: [['python:3.13-slim', n(HV.slim.size), HV.slim.pandas], ['python:3.13-alpine', n(HV.alpine.size), HV.alpine.pandas]], trk: 0 }],
            notes: ['Both builds worked, because ready-made wheels exist for both. Alpine is **' + saved.toFixed(0) + ' %** smaller here. The base saves **' + mb(SLIM - ALP) + '**, and the packages add about **' + mb(HV.slim.size - SLIM) + '**. When the packages dominate, the base matters less.']
          }
        ]
      }),

      B.cmp({
        id: 'm3-choose', t: 2, src: 'rec', title: 'Choosing a base for a data job',
        say: 'There is no best base. This is what the recording and the documentation say about the three you measured. Press Next.',
        cols: ['Base', 'Size alone', 'What to know'],
        hl: 0,
        rows: [
          ['python:3.13', mb(FULL), 'Everything is there, including compilers. Pull time and storage are the cost. Use it when a package must be compiled and you cannot build a wheel elsewhere.'],
          ['python:3.13-slim', mb(SLIM), 'Debian without the extras. Most wheels work. A good default for a data job. A missing system library has to be added with the package manager (from documentation).'],
          ['python:3.13-alpine', mb(ALP), 'The smallest. It uses musl. Wheels for pandas and pyarrow existed in this recording. Some packages still have no musl wheel and compile slowly or fail (from documentation).']
        ],
        steps: [
          { upto: 2, say: 'Full against slim is a factor of ' + (FULL / SLIM).toFixed(1) + '. That is the saving worth taking.' },
          { upto: 3, say: 'Slim against Alpine is a factor of ' + (SLIM / ALP).toFixed(1) + ' for the base and ' + saved.toFixed(0) + ' % for a real data image. Test your own packages before you choose it.' }
        ]
      }),

      B.code({
        id: 'm3-rm', t: 1, src: 'rec', title: 'Deleting a file in a later layer', file: 'Dockerfile.rm_later', lang: 'dockerfile', code: RML,
        steps: [
          { say: 'A job downloads a 50 MB export, uses it, and removes it. Written as two `RUN` lines it looks clean. I used `dd` to make a file of 50 MB so that the test needs no network.', lines: null },
          { say: 'This layer **creates** the file. The layer is stored with the 50 MB in it.', lines: G.span(RML, /^RUN dd/) },
          { say: 'This layer **removes** it. A layer can only add changes, so it records "this file is gone". The 50 MB stays in the layer below.', lines: G.span(RML, /^RUN rm/) }
        ],
        note: 'Image size: ' + n(RM.later_layer) + ' bytes, against ' + n(RM.base) + ' for the base alone.'
      }),

      B.code({
        id: 'm3-rm-same', t: 1, src: 'rec', title: 'The same work in one layer', file: 'Dockerfile.rm_same', lang: 'dockerfile', code: RMS,
        steps: [
          { say: 'The creation and the removal now happen in **one `RUN`**, joined with `&&`. The layer is made when the command ends, and the file is not in it.', lines: G.span(RMS, /^RUN dd/) }
        ],
        note: 'Image size: ' + n(RM.same_layer) + ' bytes, which is the base plus a few kilobytes. The first version was ' + mb(RM.later_layer - RM.same_layer) + ' larger.'
      }),

      B.rows({
        id: 'm3-rm-hist', t: 1, src: 'rec', title: 'Where the bytes are',
        steps: [
          {
            say: 'The history of the first image shows both layers.',
            tabs: [{ layer: 'RECORDED', name: 'docker history of the image with two RUN lines', c: 'raw', cols: G.table('small.rm_history').cols, rows: G.table('small.rm_history').rows, trk: 0 }],
            notes: ['The `dd` layer is **' + G.table('small.rm_history').rows[1][0] + '**. The `rm` layer is **' + G.table('small.rm_history').rows[0][0] + '**. The same applies to a package manager cache, a downloaded archive or a build tool: delete it in the **same** `RUN` that created it.']
          }
        ]
      }),

      B.bug({
        id: 'm3-bug', t: 1, q: 'This image is 50 MB larger than it should be, although the file is deleted. Click the line that is the problem.',
        file: 'Dockerfile.rm_later', lang: 'dockerfile', code: RML, bad: [G.at(RML, /^RUN rm/)],
        hint: 'Which line removes the file, and in which layer was the file made?',
        why: 'The `rm` runs in its own layer. The file was made in the layer above, and that layer keeps its bytes. The removal hides the file and gives nothing back.',
        fix: RMS,
        cheer: 'Create and delete in the same `RUN`.'
      }),

      B.code({
        id: 'm3-stages', t: 1, src: 'rec', title: 'A build in stages', file: 'Dockerfile.multistage', lang: 'dockerfile', code: MS,
        steps: [
          { say: 'One file with three stages. Each `FROM` starts a new stage. A later stage can start from an earlier one, and the final image contains only the stage that you build.', lines: null },
          { say: 'The **base** stage installs the packages that the job needs at run time. Both other stages start from it.', lines: G.span(MS, /AS base/, /^RUN pip install --no-cache-dir -r requirements.txt/) },
          { say: 'The **test** stage adds `pytest`, copies the code and the tests, and runs them. If a test fails, the build fails.', lines: G.span(MS, /AS test/, /^RUN python -m pytest/) },
          { say: 'The **runtime** stage is what you ship. It starts from `base`, so it has no pytest and no tests.', lines: G.span(MS, /AS runtime/, /^CMD/) }
        ],
        note: 'The test image is ' + n(ST.test_image_size) + ' bytes and the runtime image ' + n(ST.runtime_image_size) + '. A person who gets the runtime image cannot import pytest.'
      }),

      B.term({
        id: 'm3-target', t: 1, src: 'rec', title: 'Run the tests with a target',
        say: 'Two builds of the same file. Watch which one runs the tests.',
        lines: function () {
          return G.term([
            ['docker build --target test -t loader:test .', G.text('small.pytest')],
            ['docker build -t loader:1 .', '(builds ' + ST.default_build_steps + ' steps, and none of them runs pytest)']
          ]);
        },
        after: 'A plain `docker build` builds the **last stage** and only the stages that it needs. The test stage is not needed by `runtime`, so the tests **did not run**. Run `docker build --target test .` in CI, then build the final image. In the recording, `pytest` was importable in the test image (' + ST.pytest_in_test + ') and not in the runtime image (' + ST.pytest_in_runtime + ').',
        afterKind: 'warn',
        doneSay: 'A stage that nothing needs is not built. Ask for the test stage by name.'
      }),

      B.talk({
        id: 'm3-habits', t: 1, src: 'docs', title: 'Habits for small images',
        say: 'Seven habits. The first three you have already measured. Press Next for each.',
        items: [
          ['Start from a slim base', 'The full Python image was ' + (FULL / SLIM).toFixed(1) + ' times the slim one in the recording.', 'Slim is the default.'],
          ['Delete in the same RUN', 'A later layer cannot return bytes. Package manager caches and downloads go in the layer that made them.', 'Same RUN, same layer.'],
          ['Use `--no-cache-dir` with pip', 'pip keeps a download cache by default. In an image it is dead weight.', 'No pip cache in an image.'],
          ['Build in stages', 'Compilers, test tools and build output stay in the stage that needs them.', 'Ship the runtime stage only.'],
          ['Copy files by name', '`COPY requirements.txt .` sends only that file. `COPY . .` sends the folder.', 'Name what you copy.'],
          ['Keep one job in one image', 'An image with a database, a web server and a job is hard to scale, stop and update.', 'One job, one image.'],
          ['Measure', '`docker history IMAGE` shows which layer is big. Look before you change anything.', 'Look at the layers first.']
        ],
        cols: 2
      }),

      B.quiz({
        id: 'm3-q1', t: 1,
        q: 'A Dockerfile downloads a 50 MB archive in one `RUN` and deletes it in the next. How big is the image compared with the base?',
        opts: [
          { t: 'The same size, because the file is gone', fb: 'The file is hidden, not removed from the layer.' },
          { t: 'About 50 MB larger', fb: '' },
          { t: 'About 100 MB larger, because of the delete', fb: 'A delete adds a few kilobytes.' },
          { t: 'It depends on the cache', fb: 'The cache decides speed, not size.' }
        ],
        ok: 1, why: 'The recording: ' + n(RM.later_layer) + ' bytes against ' + n(RM.base) + ' for the base. Layers only add.'
      }),

      B.quiz({
        id: 'm3-q2', t: 1,
        q: 'You run a plain `docker build .` on the three-stage Dockerfile of this mission. Do the tests run?',
        opts: [
          { t: 'Yes, every stage runs on every build', fb: 'BuildKit builds only what the final stage depends on.' },
          { t: 'No, the final stage does not use the test stage', fb: '' },
          { t: 'Only if you pass `--test`', fb: 'There is no such option.' },
          { t: 'Only the first time', fb: 'The cache does not change which stages are needed.' }
        ],
        ok: 1, why: 'The runtime stage starts from `base`, not from `test`. In the recording the plain build did not run pytest. Build `--target test` for the tests.'
      }),

      B.quiz({
        id: 'm3-q3', t: 2,
        q: 'You move a pandas and pyarrow job from `python:3.13-slim` to `python:3.13-alpine`. What is the most likely result?',
        opts: [
          { t: 'An image that is about a tenth smaller, if wheels exist for musl', fb: '' },
          { t: 'An image that is a tenth of the size', fb: 'The packages are larger than the base.' },
          { t: 'The same image, because pip decides the size', fb: 'The base is different, so the size is different.' },
          { t: 'A build that always fails, because Alpine has no wheels', fb: 'In this recording both builds worked. Check your own packages.' }
        ],
        ok: 0, why: 'The recording: ' + mb(HV.alpine.size) + ' against ' + mb(HV.slim.size) + ', ' + saved.toFixed(0) + ' % smaller. The packages added about ' + mb(HV.slim.size - SLIM) + ', more than any base.'
      }),

      B.decide({
        id: 'm3-dec', t: 2, src: 'rec', title: 'Decision: which base for the pandas job?',
        scenario: 'The nightly job uses pandas, pyarrow and psycopg. It runs on 40 Airflow workers, and each pulls the image once a day. The team asks whether to move from `python:3.13-slim` to `python:3.13-alpine` to save time and money.',
        opts: [
          { t: 'Move to Alpine, because it is the smallest', d: 'The base is ' + (SLIM / ALP).toFixed(1) + ' times smaller.', lose: 'With the packages the saving is ' + saved.toFixed(0) + ' %, and Alpine uses another C library. A package without a musl wheel would compile at build time, or fail at run time, on 40 workers.' },
          { t: 'Stay on slim and remove what the image does not need: no pip cache, no test tools, only the packages that the job imports', d: 'Keeps the common, well-tested base and shrinks the part that is large.' },
          { t: 'Use the full image, because it has everything', d: 'Nothing will be missing.', lose: 'The base alone is ' + mb(FULL) + ' and every worker pulls it.' }
        ],
        pick: 1,
        why: 'The packages are most of the image, so the base is not where the money is. Slim keeps the standard C library that most wheels target. Look for savings in what you install before you change the base.',
        when: 'Choose Alpine when every package you use has a musl wheel, you have tested the job on it, and the base size matters at your scale.'
      }),

      B.incident({
        id: 'm3-inc', t: 2, src: 'rec', title: 'Incident: workers need minutes to start', time: '03:05',
        alert: '**The nightly load starts 6 minutes late on every worker.** The scheduler is fine. The tasks wait in "queued" while the worker pulls the image.',
        clues: ['The loader image is based on `python:3.13`', 'It also contains the test tools and a 200 MB sample file that a `RUN` copied and deleted', 'Each worker pulls the image every morning'],
        opts: [
          { t: 'Move to `python:3.13-slim`, build in stages so test tools stay out, and create and delete the sample file in one `RUN` or leave it out of the image', fb: '' },
          { t: 'Add more workers so that the pulls happen in parallel', fb: 'Each new worker pulls the same large image. The delay stays.' },
          { t: 'Increase the scheduler timeout', fb: 'The tasks still wait for the pull. They just fail later.' },
          { t: 'Tell people to avoid the 03:00 slot', fb: 'The pull cost is the same at any hour.' }
        ],
        best: 0,
        why: 'The recording shows what is in an image: the full base was ' + mb(FULL) + ', slim ' + mb(SLIM) + ', and a file that is deleted in a later layer still counts, ' + mb(RM.later_layer - RM.same_layer) + ' for a 50 MB file. A smaller image is a shorter pull on every worker.',
        checks: [
          ['Look at the layers', '`docker history IMAGE` shows the size of each layer.'],
          ['Look at the base', 'Is it the full image, or slim?'],
          ['Look for files that were deleted later', 'A big layer followed by an `rm` is the sign.'],
          ['Pull on a clean machine and time it', 'Compare before and after on your own network (this recording does not time anything).']
        ],
        tell: 'Workers started late because each one pulled a 1.6 GB image. I moved the job to the slim base, built in stages so test tools stay out, and removed a sample file that was copied and deleted in a later layer. The image is a fraction of the size and the pull no longer delays the first task.',
        prevent: ['Set a **size budget** for images and check it in CI', 'Review `docker history` when an image grows', 'Use a slim base by default']
      }),

      B.qa({
        id: 'qa-small', t: 1, tag: 'Docker', secs: 75,
        q: 'How do you keep a Docker image small?',
        pts: ['A slim base instead of the full image', 'Delete files in the same RUN that made them', 'No pip cache; only the packages the job needs', 'Multi-stage builds, so test and build tools are not shipped'],
        short: 'I start from a slim base. In the recording the full Python image was ' + mb(FULL) + ' and slim ' + mb(SLIM) + '. Then I watch the layers: a file that is deleted in a later layer stays in the image, so I create and delete in the same RUN. I install with no pip cache, and only the packages that the job imports. And I use stages, so the test tools stay in a test stage, and the runtime stage has only what the job needs. I check `docker history` to see which layer is large before I change anything.',
        fu: [['Is Alpine always the smallest answer?', 'Its base is the smallest. With pandas and pyarrow the recording saved ' + saved.toFixed(0) + ' %, because the packages dominate, and Alpine uses another C library.'], ['Why does deleting a file not shrink the image?', 'A layer only adds changes. The delete is a change in a later layer. The file stays in the layer that made it.']],
        trap: 'Deleting files at the end of the Dockerfile and expecting the image to shrink.',
        real: 'Say how big your images were, and what you cut.'
      }),

      B.qa({
        id: 'qa-stages', t: 2, tag: 'Docker', secs: 75,
        q: 'What is a multi-stage build and when do you use one?',
        pts: ['Several FROM lines in one Dockerfile', 'Later stages can start from earlier ones or copy files from them', 'Only the stage you target ends up in the image', 'Use it to keep compilers, test tools and build output out of the shipped image'],
        short: 'A multi-stage Dockerfile has several `FROM` lines, and each starts a stage. A later stage can start from an earlier one, or copy files out of it, and the final image holds only the stage that you build. I use stages for two things. First, to run the tests in a test stage that has pytest, while the runtime stage does not. In the recording pytest was importable in one and not in the other. Second, to compile something in a builder stage and copy only the result into a small runtime stage. One thing to know: a plain `docker build` skips stages that the last stage does not use, so I build the test stage by name in CI.',
        fu: [['Does the test stage run on a plain build?', 'Not unless the final stage needs it. The recording showed that the plain build did not run pytest.'], ['How does a stage use files from another?', '`COPY --from=STAGE /path /path`.']],
        trap: 'Assuming that every stage runs, and shipping with tests that never ran.',
        real: 'Describe a build where you split test and runtime.'
      }),

      B.qa({
        id: 'qa-alpine', t: 2, tag: 'Docker', secs: 60,
        q: 'Would you use Alpine for a Python data job?',
        pts: ['It is very small: ' + mb(ALP) + ' against ' + mb(SLIM) + ' for slim', 'It uses musl, not glibc, so some wheels do not exist', 'With pandas and pyarrow it saved ' + saved.toFixed(0) + ' % in the recording', 'Measure and test, and prefer slim as the default'],
        short: 'My default is slim. Alpine has the smallest base, ' + mb(ALP) + ' against ' + mb(SLIM) + ', but it uses the musl C library, and a package that has no musl wheel gets compiled, which is slow and sometimes fails. I installed pandas, pyarrow and psycopg on both in the recording. Both worked, and Alpine was ' + saved.toFixed(0) + ' % smaller, because the packages are larger than any base. So I would use Alpine when every package has a musl wheel, I have tested the job on it, and the pull size matters at my scale. Otherwise slim and fewer packages.',
        fu: [['What is the difference between glibc and musl?', 'They are two implementations of the C standard library. Prebuilt Python wheels target one or the other.'], ['What else shrinks an image?', 'Fewer packages, no test tools in the runtime stage, and no pip cache.']],
        trap: 'Choosing Alpine for size without testing the packages.',
        real: 'Say whether you used Alpine and what happened.'
      }),

      B.qa({
        id: 'qa-overlay', t: 3, tag: 'Docker', secs: 75,
        q: 'How do image layers become the file system of a container, and why does a deleted file still cost space?',
        pts: ['A union file system stacks the read-only layers and one writable layer', 'Reading looks through the layers from the top', 'Changing a file copies it up into the writable layer', 'A delete is a marker in a higher layer, and the lower layer keeps the bytes'],
        short: 'The engine mounts the layers of the image read-only, one over another, and puts a writable layer on top. This is a union file system, and on Linux the usual driver is overlayfs. The recording ran on ' + G.meta('storage_driver') + '. A read finds the file in the highest layer that has it. A write to a file that lives in a lower layer first copies the file up into the writable layer, and the change happens there. A delete does not touch the lower layer: it adds a marker, called a whiteout, in a higher one, so the file disappears from view. That is why the 50 MB file of mission 3 was gone from the container and still counted ' + mb(RM.later_layer - RM.same_layer) + ' in the image. The whiteout and copy-up details are from documentation.',
        fu: [['What is the cost of copy-up?', 'The first write to a large file in a lower layer copies the whole file, which is why databases use volumes.'], ['Why does a volume avoid the problem?', 'It is a mount outside the union file system, so writes go straight to the disk.']],
        trap: 'Believing that `rm` in a later layer returns the space.',
        real: 'Say which image of yours shrank when you merged two RUN lines.'
      }),

      B.recap({
        id: 'm3-recap', n: 3, badge: 'Image Trimmer', color: '#BFDBFE',
        pts: [
          'The full Python image was **' + mb(FULL) + '**, slim **' + mb(SLIM) + '**, Alpine **' + mb(ALP) + '**.',
          'With pandas and pyarrow, Alpine saved **' + saved.toFixed(0) + ' %**. The packages are the weight.',
          'A file deleted in a **later layer** stays in the image: ' + mb(RM.file_bytes) + ' extra. Delete in the **same `RUN`**.',
          'A **multi-stage** build keeps pytest out of the runtime image. A plain build does **not run** the test stage.',
          'Look at `docker history` before you change anything.'
        ],
        lines: [
          'I choose a base from measurements.',
          'I know why a delete does not shrink an image.',
          'I keep test tools out of what I ship.'
        ]
      })
    ]
  });
})();
