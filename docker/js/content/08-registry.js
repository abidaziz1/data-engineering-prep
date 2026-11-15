/* Mission 8: registries, tags and digests. The registry on these screens was the registry:2 image, running on the same machine as the engine. */
(function () {
  var B = LAB.b, G = LAB.get;
  var ST = G.table('registry.steps').rows, TG = G.table('registry.tags').rows, F = G.counts('registry.facts'), SV = G.counts('registry.save'), PL = G.counts('registry.platforms');
  var n = G.n;
  G.expect(F.same_digest_1_0_and_latest_before === true && F.latest_moved === true && F.tag_1_0_unchanged === true, 'latest moved while 1.0 stayed');
  G.expect(F.local_stale_until_pull === true && F.ran_after_pull === 'this is build 2' && F.run_by_digest === 'this is build 1', 'a local latest is stale until it is pulled, and a digest runs the same build');
  G.expect(SV.has_index_json === true && SV.runs_after_load === 'this is build 2', 'docker save and docker load carry an image');
  G.expect(PL.platforms.indexOf('linux/amd64') >= 0 && PL.platforms.indexOf('linux/arm64/v8') >= 0, 'the python image has amd64 and arm64 builds');

  LAB.addChapter({
    id: 'm8', n: 8, title: 'Registries, tags and digests', short: 'Registry', blurb: 'Push an image, move a tag, and run exactly what you meant to', minutes: 15,
    focus: ['ci', 'sf'],
    goals: [
      'Read an **image name**: registry, repository, tag and digest.',
      'Explain why **`latest` is a moving label**, and how a stale one runs old code.',
      'Pin an image by **digest**.',
      'Know what a **multi-platform** image is.'
    ],
    say: 'The image works on your laptop. The scheduler runs somewhere else, and it needs the image by name. This mission pushes the loader to a registry that runs on this machine, moves a tag, and shows how a job can run old code with every command looking right.',
    scenes: [
      B.flow({
        id: 'm8-ship', t: 1, src: 'docs', title: 'How an image reaches the machine that runs it', g: 'ship', legend: true,
        steps: [
          { say: 'The Brewline loader is built, tested and ready. A different machine has to run it tonight. Press Next.', focus: ['dev', 'ci', 'reg', 'sch', 'svc', 'k8s'], cap: 'A build, a registry, and a place that runs it.' },
          { say: 'Step 1. A person builds on a **laptop**, or **CI** does it on every commit. CI is the better place, because it builds in a clean, known environment.', on: ['e1'], focus: ['dev', 'ci'], cap: 'Build in CI.' },
          { say: 'Step 2. CI **pushes** the image to a **registry** under a name and a tag. The registry stores the layers and a small manifest that lists them.', on: ['e2'], focus: ['ci', 'reg'], cap: 'Push to a registry.' },
          { say: 'Step 3. A scheduler task pulls the image and runs a container. For example a task of Airflow that starts a container for each run.', on: ['e3'], focus: ['reg', 'sch'], tags: ['tg_pull'], cap: 'A scheduler pulls and runs.' },
          { say: 'Step 4. A managed service does the same: Amazon ECS, Google Cloud Run or Azure Container Instances pull the image and run it.', on: ['e4'], focus: ['reg', 'svc'], cap: 'A managed service pulls and runs.' },
          { say: 'Step 5. Kubernetes pulls the image to whichever machine of the cluster gets the job. That is the next course.', on: ['e5'], focus: ['reg', 'k8s'], cap: 'Kubernetes pulls to a node.' }
        ]
      }),

      B.cmp({
        id: 'm8-name', t: 1, src: 'docs', title: 'Reading an image name',
        say: 'An image name has up to four parts. Press Next to take them in turn.',
        cols: ['Part', 'Example', 'What it is'],
        hl: 0,
        rows: [
          ['Registry', '`localhost:5000`', 'The server. Left out for Docker Hub, where `python` means `docker.io/library/python`.'],
          ['Repository', '`brewline/loader`', 'The name of the image, often with a team or project in front.'],
          ['Tag', '`:1.0`', 'A label for one version. A tag can be moved to another image.'],
          ['Digest', '`@sha256:9047f7cd...`', 'The hash of the exact image. It never means anything else.']
        ],
        steps: [
          { upto: 2, say: 'The registry and the repository say **where** the image is. Without a tag Docker uses `latest`.' },
          { upto: 4, say: 'The tag says **which version**, and the digest says **which bytes**. A tag is a name that somebody can move. A digest is the content.' }
        ]
      }),

      B.term({
        id: 'm8-push', t: 1, src: 'rec', title: 'Push to a registry',
        say: 'The registry of this recording is the `registry:2` image, a small open-source registry, running on this machine. I built an image, gave it two tags and pushed both.',
        lines: function () {
          return G.term([
            ['docker run -d --name registry -p 127.0.0.1:5000:5000 registry:2', '(the id)'],
            ['docker tag localhost:5000/brewline/loader:1.0 localhost:5000/brewline/loader:latest', ''],
            ['docker push localhost:5000/brewline/loader:latest', G.text('registry.push')],
            ['curl -s http://127.0.0.1:5000/v2/_catalog', G.text('registry.catalog')],
            ['curl -s http://127.0.0.1:5000/v2/brewline/loader/tags/list', G.text('registry.tags_1')]
          ]);
        },
        after: 'The push of the second tag reported every layer as **already there**: the two tags point to the **same image**, so there was nothing new to upload. The registry lists one repository and two tags. Layers are stored once, whatever the number of tags that use them.',
        afterKind: 'tip',
        doneSay: 'A tag is a pointer. Two tags can point to one image.'
      }),

      B.rows({
        id: 'm8-tags', t: 1, src: 'rec', title: 'Tags move, digests do not',
        steps: [
          {
            say: 'I then built a second version of the image, pushed it as `1.1`, and moved the tag `latest` to it in the registry. The table shows where each tag points now.',
            tabs: [{ layer: 'RECORDED', name: 'Tags and what they run', c: 'raw', cols: G.table('registry.tags').cols, rows: TG, trk: 0 }],
            notes: ['`1.0` still points to the first build. `1.1` and `latest` point to the second. **Latest moved** without anything happening to the image it used to name. Anybody who ran `latest` yesterday and today ran two different programs.']
          },
          {
            say: 'The registry now lists three tags for one repository.',
            tabs: [{ layer: 'RECORDED', name: 'curl /v2/brewline/loader/tags/list', c: 'raw', cols: ['response'], rows: [[G.text('registry.tags_2')]], trk: 0 }],
            notes: ['A tag is a **mutable name** in the registry. Version tags such as `1.0` are only stable because nobody moves them. A registry can be set to refuse moving a tag (from documentation).']
          }
        ]
      }),

      B.widget({ id: 'm8-lab', kind: 'tags', t: 1, src: 'rec', title: 'Lab: which image do you run?' }),

      B.rows({
        id: 'm8-stale', t: 1, src: 'rec', title: 'The machine that did not pull',
        steps: [
          {
            say: 'A machine had pulled `latest` when it pointed to build 1. Then the tag was moved to build 2 in the registry. I ran the image on that machine without pulling, and then after a pull.',
            tabs: [{ layer: 'RECORDED', name: 'latest, in the registry and on one machine', c: 'raw', cols: G.table('registry.steps').cols, rows: ST, trk: 0 }],
            notes: ['`docker run` uses the image that is **already on the machine** and does not ask the registry whether the tag moved. The machine ran **build 1** until `docker pull` fetched the new digest. A scheduler task that runs `latest` on a worker that pulled it last week runs last week\'s code. Set the pull policy to **always**, or better, do not use `latest` (from documentation).']
          }
        ]
      }),

      B.term({
        id: 'm8-digest', t: 2, src: 'rec', title: 'Run by digest',
        say: 'A digest is the hash of the image manifest. I ran the first build by its digest, after `latest` had moved on.',
        lines: function () {
          return G.term([
            ['docker run --rm localhost:5000/brewline/loader:latest', ST[1][3]],
            ['docker run --rm localhost:5000/brewline/loader@sha256:<digest of build 1>', F.run_by_digest]
          ]);
        },
        after: 'The tag gave **build 2**, the digest gave **build 1**, and the digest always will. If you must be sure that tonight runs the exact image that passed the tests, put the **digest** in the deployment. Keep the tag next to it for people to read.',
        afterKind: 'tip',
        doneSay: 'A tag is for people. A digest is for machines.'
      }),

      B.rows({
        id: 'm8-save', t: 2, src: 'rec', title: 'No registry: docker save and docker load',
        steps: [
          {
            say: 'A machine with no access to a registry, such as an air-gapped network, can receive an image as a file. I saved an image to a tar file, removed it, loaded the file, and ran it.',
            tabs: [{ layer: 'RECORDED', name: 'docker save, then docker load', c: 'raw', cols: ['what I checked', 'result'], rows: [['size of the tar file', n(SV.tar_bytes) + ' bytes'], ['entries in the tar file', SV.members], ['has an index.json', SV.has_index_json ? 'yes' : 'no'], ['the loaded image prints', SV.runs_after_load]], trk: 0 }],
            notes: ['The file holds the layers and the manifest, so the image comes back exactly as it was. This is also a way to move an image between two machines with a USB stick or a file share.']
          }
        ]
      }),

      B.rows({
        id: 'm8-platforms', t: 2, src: 'rec', title: 'One name, several platforms',
        steps: [
          {
            say: 'I asked Docker Hub which platforms the tag `python:3.13-slim` has.',
            tabs: [{ layer: 'RECORDED', name: 'docker buildx imagetools inspect python:3.13-slim', c: 'raw', cols: ['platform'], rows: PL.platforms.map(function (p) { return [p]; }), trk: 0 }],
            notes: ['The tag points to an **index** that lists one image for each platform, **' + PL.platforms.length + '** of them. Docker picks the one that matches the machine. A laptop with an ARM chip and a server with an x86 chip then pull different images under the same name. If you build on one and run on the other without a multi-platform build, the container fails to start with an `exec format error` (from documentation).']
          }
        ]
      }),

      B.talk({
        id: 'm8-tagging', t: 2, src: 'docs', title: 'A tagging habit that works',
        say: 'Five rules that keep the question "what is running?" easy to answer. Press Next for each.',
        items: [
          ['Tag every build with the commit', 'For example `loader:3f9c2ab`. You can find the code that built the image.', 'The commit is the tag.'],
          ['Add a version tag when you release', '`loader:1.4.0`. People can read it, and nobody moves it.', 'Version tags are never moved.'],
          ['Use `latest` for convenience only', 'It is fine on a laptop. Never use it in a schedule.', 'Not in production.'],
          ['Deploy by digest', 'The deployment file holds the digest that CI recorded after the tests passed.', 'The digest is what ran.'],
          ['Set the pull policy', 'A scheduler that pulls only when the image is missing runs stale tags. Pull always for mutable tags, or use immutable ones.', 'Know when your runner pulls.']
        ],
        cols: 1
      }),

      B.cmp({
        id: 'm8-where', t: 2, src: 'docs', title: 'Where images are stored',
        say: 'You will meet these. None of them ran for this course. Press Next.',
        cols: ['Registry', 'Who runs it', 'Note'],
        hl: 0,
        rows: [
          ['Docker Hub', 'Docker', 'The default. Pulls are rate-limited for anonymous users. Check the current limits in the Docker documentation.'],
          ['Amazon ECR', 'AWS', 'Private registries inside an AWS account, with IAM for access.'],
          ['Google Artifact Registry', 'Google Cloud', 'The registry of Google Cloud for images and packages.'],
          ['Azure Container Registry', 'Microsoft', 'Private registries inside an Azure subscription.'],
          ['GitHub Container Registry', 'GitHub', 'Images next to the code, with the permissions of the repository.'],
          ['registry:2 (the one in the recording)', 'You', 'A small open-source registry. Fine for a lab, and not a managed service.']
        ],
        steps: [
          { upto: 4, say: 'Every cloud has one, and a team usually uses the registry of the cloud that runs its jobs, because access then follows the cloud account.' },
          { upto: 6, say: 'GitHub and a self-run registry cover the rest. The commands are the same for all of them: tag, push, pull.' }
        ]
      }),

      B.bug({
        id: 'm8-bug', t: 1, q: 'The loader was fixed and pushed an hour ago, and the nightly run still shows the old behaviour. Click the line that is the problem.',
        file: 'dag.py', lang: 'python',
        code: 'from airflow.providers.docker.operators.docker import DockerOperator\n\nload = DockerOperator(\n    task_id="load_orders",\n    image="registry.example.com/brewline/loader:latest",\n    auto_remove="success",\n    force_pull=False,\n)\n',
        bad: [5, 7],
        hint: 'Two lines together decide whether a worker uses the image it already has.',
        why: 'The tag is `latest`, which moves, and `force_pull=False` lets a worker use the copy that it pulled earlier. A worker that pulled `latest` last week runs last week\'s image, as in the recording. Use a version tag or a digest, and pull when the tag can move. (This file is from documentation and did not run.)',
        fix: 'from airflow.providers.docker.operators.docker import DockerOperator\n\nload = DockerOperator(\n    task_id="load_orders",\n    image="registry.example.com/brewline/loader@sha256:<digest from CI>",\n    auto_remove="success",\n)\n',
        cheer: 'A moving tag and no pull is a stale job.'
      }),

      B.order({
        id: 'm8-ord', t: 1, q: 'Put a release of the loader in order.',
        items: [
          'CI builds the image from the commit',
          'CI runs the tests in the test stage',
          'CI tags the image with the commit and the version',
          'CI pushes the tags to the registry and records the digest',
          'The deployment points to the digest',
          'The scheduler pulls that digest and runs the job'
        ],
        why: 'The image is tested before it is tagged and pushed, and what you deploy is the digest that was pushed. In the recording a digest ran build 1 after `latest` had moved to build 2.'
      }),

      B.quiz({
        id: 'm8-q1', t: 1,
        q: 'You push a new image under the tag `latest` and a worker that pulled `latest` yesterday runs the job tonight. Which build runs?',
        opts: [
          { t: 'The new one, because Docker checks the registry', fb: '`docker run` does not check.' },
          { t: 'The old one, unless the worker pulls again', fb: '' },
          { t: 'Whichever is smaller', fb: '' },
          { t: 'Both, one after the other', fb: '' }
        ],
        ok: 1, why: 'The recording: the machine ran "' + ST[1][3] + '" while the registry said build 2, and "' + ST[2][3] + '" after a `docker pull`.'
      }),

      B.quiz({
        id: 'm8-q2', t: 1,
        q: 'Two tags of one repository, `1.0` and `latest`, point to the same image. What does the second `docker push` upload?',
        opts: [
          { t: 'All layers again', fb: 'The registry already has them.' },
          { t: 'Only the new tag, no layers', fb: '' },
          { t: 'Nothing, and it fails', fb: 'It succeeds and adds the tag.' },
          { t: 'Only the base image', fb: '' }
        ],
        ok: 1, why: 'The recording reported each layer as already there. A registry stores a layer once.'
      }),

      B.quiz({
        id: 'm8-q3', t: 2,
        q: 'Which reference can never point to a different image later?',
        opts: [
          { t: '`loader:1.0`', fb: 'Nobody should move it. A registry can still allow it.' },
          { t: '`loader:latest`', fb: '' },
          { t: '`loader@sha256:...`', fb: '' },
          { t: '`loader`', fb: 'That is `latest`.' }
        ],
        ok: 2, why: 'A digest is the hash of the image manifest. Change anything and the hash changes. The recording ran build 1 by digest after both tags had moved on.'
      }),

      B.decide({
        id: 'm8-dec', t: 2, src: 'rec', title: 'Decision: how does the scheduler name the image?',
        scenario: 'The nightly loader runs on five workers, started by a scheduler. Releases happen about twice a week. Last month a hotfix did not reach two of the workers for three days.',
        opts: [
          { t: '`loader:latest`, with the pull policy "if not present"', d: 'The deployment file never changes.', lose: 'This is the cause of the three days. A worker that has the image never asks again.' },
          { t: 'A digest that CI writes into the deployment file after the tests pass', d: 'Every worker runs the same bytes. A release is a change to one line, which is visible in the history.' },
          { t: '`loader:latest` with "always pull"', d: 'Every run fetches the current image.', lose: 'It works, and every run depends on what the tag points to at that moment, including a half-finished release or a push by mistake.' }
        ],
        pick: 1,
        why: 'The recording shows the two failure modes: a stale local copy, and a tag that moved. A digest in a file removes both, and the commit history says when it changed.',
        when: 'A version tag that nobody moves is a fair second choice. Use `latest` in a notebook, not in a schedule.'
      }),

      B.incident({
        id: 'm8-inc', t: 2, src: 'rec', title: 'Incident: the fix is deployed, and the job still has the bug', time: '07:40',
        alert: '**A bug in the loader was fixed on Tuesday. The run on Thursday night still shows the old behaviour on two of five workers.**',
        clues: ['The image is referenced as `loader:latest`', '`docker images` on the two workers shows an image from last week', 'The pull policy of the scheduler is "if not present"'],
        opts: [
          { t: 'Reference the image by digest, written by CI after the tests, and pull on every run until then', fb: '' },
          { t: 'Delete the images on the workers by hand each Tuesday', fb: 'It works until somebody forgets.' },
          { t: 'Rebuild the image with a new base', fb: 'The image is not the problem. The workers run an old copy.' },
          { t: 'Add more workers', fb: 'Each new worker pulls `latest` once and stays stale.' }
        ],
        best: 0,
        why: 'The recording is this incident in miniature: the local `latest` ran build 1 until `docker pull`, and the digest of build 1 ran build 1 no matter what the tag did. Pin what you run.',
        checks: [
          ['Compare digests', '`docker image inspect IMAGE --format "{{index .RepoDigests 0}}"` on each worker, against the registry.'],
          ['Read the pull policy', 'A runner that pulls only when missing keeps the old copy.'],
          ['Pin', 'Put the digest in the deployment.'],
          ['Alert', 'Log the digest at the start of each run, so that a job always says what it is.']
        ],
        tell: 'Two workers ran last week\'s image because the job used the tag latest with a pull policy of "if not present", so they never fetched the fix. I changed the deployment to use the image digest that CI records after the tests pass, and I made the job log its own image digest at start-up, so we can see what ran.',
        prevent: ['No `latest` in a schedule', '**Digest** in the deployment file', 'Log the **version** at the start of every job']
      }),

      B.qa({
        id: 'qa-tags', t: 1, tag: 'Docker', secs: 75,
        q: 'What is the difference between an image tag and a digest, and why is `latest` risky?',
        pts: ['A tag is a movable name', 'A digest is the hash of the exact image', '`latest` is only a default name, not "the newest"', 'A machine that has an image does not check whether its tag moved'],
        short: 'A tag is a label that a registry maps to an image, and whoever pushes can move it. A digest is the hash of the image manifest, so it names one exact image forever. `latest` is just the tag that Docker uses when you give none. It does not mean the newest, and it moves. In the recording I pushed a new build and moved `latest` to it: a machine that had pulled the old one kept running build 1 until it pulled, and a run by the old digest still gave build 1. So I tag with the commit and a version, I never use `latest` in a schedule, and I deploy by digest.',
        fu: [['How do you find the digest?', '`docker image inspect IMAGE --format "{{index .RepoDigests 0}}"` after a pull or a push, or `docker buildx imagetools inspect`.'], ['Can a version tag move?', 'Yes, unless the registry is set to make tags immutable. Do not rely on convention for anything that matters.']],
        trap: 'Believing that `latest` is the newest image.',
        real: 'Say how your team tags and deploys images.'
      }),

      B.qa({
        id: 'qa-registry', t: 1, tag: 'Docker', secs: 60,
        q: 'What is a container registry, and how does an image get from your laptop to the machine that runs it?',
        pts: ['A server that stores images by repository, tag and digest', 'CI builds and pushes; the runner pulls', 'Layers are stored once; pushes upload only missing layers', 'Cloud registries tie access to the cloud account'],
        short: 'A registry is a server that stores images by repository and tag, and by digest. CI builds the image and pushes it with `docker push`, and the machine that runs the job pulls it, by tag or by digest. Only layers that the registry does not have are uploaded: when I pushed a second tag of the same image in the recording, every layer was reported as already there. Docker Hub is the default, and each cloud has its own, ECR, Artifact Registry and Container Registry, where access follows the cloud account. For a lab I ran the open-source registry:2 image on my machine.',
        fu: [['What is `docker save` for?', 'To move an image as a file when there is no registry, for example on a network that is cut off.'], ['What is a manifest?', 'A small document that lists the layers and the settings of an image. The digest is its hash.']],
        trap: 'Saying that the registry stores "containers". It stores images.',
        real: 'Say which registry your team uses and how access is controlled.'
      }),

      B.qa({
        id: 'qa-multiarch', t: 2, tag: 'Docker', secs: 60,
        q: 'What is a multi-platform image, and what goes wrong if you ignore it?',
        pts: ['One tag points to an index with an image per platform', 'Docker pulls the one that matches the machine', 'A build on an ARM laptop gives an arm64 image', 'Running it on x86 fails with exec format error unless built for both'],
        short: 'A multi-platform tag points to an index that lists one image for each platform, and Docker pulls the one that matches the machine. In the recording `python:3.13-slim` listed ' + PL.platforms.length + ' platforms, including amd64 and arm64. The trap is a team with ARM laptops and x86 servers: an image that you build on a laptop is arm64, and on the server the container fails to start with an `exec format error`. I build for the platform that runs the job, with `--platform linux/amd64`, or build for both with buildx in CI. This part is from documentation and I did not run a cross-platform build.',
        fu: [['How do you check the platform of an image?', '`docker image inspect IMAGE --format "{{.Architecture}}"`.'], ['Can an amd64 image run on an ARM machine?', 'With emulation, slowly, or not at all. From documentation.']],
        trap: 'Building on a laptop and shipping the same image to a different CPU type.',
        real: 'Say what your laptops and your servers run on.'
      }),

      B.qa({
        id: 'qa-immutable', t: 3, tag: 'Docker', secs: 60,
        q: 'How do you stop a tag from moving, and what is an image index?',
        pts: ['Some registries can make tags immutable', 'A pushed digest never changes; a tag is a pointer', 'An index lists one image for each platform', 'Deploy by digest when the registry cannot enforce immutability'],
        short: 'A tag is a pointer that the registry lets you move. In the recording the tag `latest` moved to a new build, while `1.0` and the old digest stayed. Several registries, such as Amazon ECR, offer a setting that makes tags immutable, so that a push to an existing tag is refused. I treat that setting as documentation, because I ran a plain registry that has no such switch. Without it, I deploy by digest. An **index**, also called a manifest list, is a small document that a multi-platform tag points to: it lists one image for each platform, ' + PL.platforms.length + ' for python:3.13-slim in the recording, and the engine chooses the one that matches the machine.',
        fu: [['What changes the digest of an image?', 'Any change to a layer, to the settings, or to the manifest. The same content gives the same digest.'], ['Do the layers of two tags share storage?', 'Yes. The recording uploaded no layers for the second tag of the same image.']],
        trap: 'Relying on the habit that nobody moves version tags.',
        real: 'Say whether your registry enforces immutable tags.'
      }),

      B.recap({
        id: 'm8-recap', n: 8, badge: 'Image Shipper', color: '#BFDBFE',
        pts: [
          'A name has a **registry**, a **repository**, a **tag** and a **digest**.',
          'Two tags pointed to **one image**, and the second push uploaded no layers.',
          '**latest moved** to build 2 while `1.0` stayed. A digest ran build 1 afterwards.',
          'A machine that has an image **does not check** whether its tag moved. The recording ran build 1 until a `docker pull`.',
          '`docker save` and `docker load` move an image as a file. A tag can list **' + PL.platforms.length + '** platforms.'
        ],
        lines: [
          'I tag with commits and versions, not latest.',
          'I deploy by digest.',
          'I know that a pulled image can be stale.'
        ]
      })
    ]
  });
})();
