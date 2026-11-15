/* Mission 0: pick a path, see the whole picture, and learn what the tags mean. */
(function () {
  var B = LAB.b, G = LAB.get;
  var M = function (k) { return G.meta(k); };
  G.expect(G.meta('python_image') === 'python:3.13-slim', 'the course text names the python:3.13-slim image');

  LAB.addChapter({
    id: 'm0', n: 0, noIntro: true, title: 'Start here', short: 'Start', blurb: 'Pick your path and see the whole picture', minutes: 7,
    scenes: [
      B.welcome({ id: 'welcome' }),

      B.flow({
        id: 'm0-map', t: 1, src: 'docs', title: 'A Dockerfile becomes a container', g: 'master', legend: true,
        steps: [
          { say: 'Brewline has one small job: read a CSV file of the day\'s orders and load it into Postgres. Docker is how that job gets from your laptop to the pipeline and runs the same way in both places. This picture is the whole course. Press Next.', focus: ['df', 'run'], cap: 'A text file on the left, a running job on the right.' },
          { say: 'Step 1. A **Dockerfile** lists what the job needs: a base image, the packages, your code and the command to run. The **build context** is the folder of files that the build may copy from.', on: ['e1'], focus: ['df', 'build'], cap: 'The Dockerfile is the recipe.' },
          { say: 'Step 2. **Build** runs the instructions one after another. Each instruction that changes files makes a **layer**. Layers that did not change are taken from a cache.', on: ['e2'], focus: ['build', 'image'], tags: ['tg_layer'], cap: 'One layer for each step, cached when unchanged.' },
          { say: 'Step 3. The result is an **image**: a stack of read-only layers with a name. You can **push** it to a registry, and any other machine can **pull** it.', on: ['e3'], focus: ['image', 'reg'], tags: ['tg_push'], cap: 'An image is shared through a registry.' },
          { say: 'Step 4. `docker run` starts a **container** from the image. A container is one process with its own view of files, processes and the network. `docker rm` deletes the container and leaves the image.', on: ['e4'], focus: ['image', 'run'], tags: ['tg_gone'], cap: 'A container is a running image.' },
          { say: 'Step 5. A container forgets what it wrote when it is removed. Data that must stay goes into a **volume**.', on: ['e5'], focus: ['run', 'vol'], cap: 'Volumes keep data.' },
          { say: 'Step 6. Containers find each other through a **network**, by name. Mission 5 shows why `localhost` is the wrong name.', on: ['e6'], focus: ['run', 'net'], cap: 'Networks give names and ports.' },
          { say: 'That is the course: containers (mission 1), layers and the cache (2), small images (3), data (4), networks (5), Compose (6), jobs that run for a while (7), registries (8) and security (9).', focus: ['df', 'build', 'image', 'reg', 'run', 'vol', 'net'], cap: 'Nine missions and a boss round.' }
        ]
      }),

      B.cmp({
        id: 'm0-levels', t: 1, src: 'docs', title: 'Junior or senior: what changes',
        say: 'A data engineer is not hired to run a container platform. You are asked about Docker because every job you write will be packaged in one. Press Next to read what is expected at each level.',
        cols: ['Area', 'A junior is expected to', 'A senior is expected to'],
        hl: 2,
        rows: [
          ['Containers', 'Say what an image, a container and a layer are.', 'Explain that a container is a process on the host kernel, and what that means for limits and security.'],
          ['Building', 'Write a Dockerfile for a Python job.', 'Order the instructions for the cache, keep the image small, and build in stages.'],
          ['Data', 'Know that files in a container disappear.', 'Choose between a volume, a bind mount and a managed database, and plan backups.'],
          ['Networks', 'Know what `-p` does and why `localhost` fails.', 'Decide which ports leave the machine, and design names between services.'],
          ['Compose', 'Read a compose file and start a stack.', 'Make a stack start in the right order, and run one-off jobs from it.'],
          ['Jobs', 'Read an exit code and set a memory limit.', 'Make a job stop cleanly, restart sensibly, and report why it died.'],
          ['Shipping and safety', 'Tag and push an image.', 'Pin by digest, keep secrets out of images, and run as a user that is not root.']
        ],
        steps: [
          { upto: 3, say: 'The first three rows are about building and keeping data. A junior writes a Dockerfile that works. A senior makes it fast to rebuild, small to ship, and safe for the data.' },
          { upto: 7, say: 'The last four are about running the job for real: names, order, stopping and shipping. These are the questions that senior interviews spend their time on.' }
        ]
      }),

      B.talk({
        id: 'm0-how', t: 1, src: 'rec', title: 'How this course works',
        say: 'Five quick things before we start. Press Next for each.',
        items: [
          ['SEE, TRY, SAY', 'Every mission watches something work (**SEE**), makes you practise it (**TRY**), then asks the interview question out loud (**SAY**). Orange blocks in a diagram are data or a request moving. Numbers show the order.', 'Watch first, practise second, speak third.'],
          ['Junior, Senior, Extra', 'A small tag on a screen tells you who it is for. No tag means everybody. **Senior** and **Extra** screens appear only on the wider paths.', 'The tag tells you whether a screen is on your path.'],
          ['Two kinds of screen', 'A **Recorded** tag means that I ran it and wrote down what Docker did. A **From documentation** tag means that I read it and did not run it.', 'Recorded means run. From documentation means read.'],
          ['What ran', 'One Docker Engine on one Linux machine, with the Brewline loader job, a real Postgres and a small registry. Every terminal in this course is real output. I built every image, started every container and stopped every job that you will see.', 'Every terminal is real output.'],
          ['What I changed to make it run here', 'This machine could build only on the host network, so the recorder passed that flag. Compose could not build that way, so the recorder built the image first and Compose ran it. Nothing else differs from what you would run.', 'The README lists every change.']
        ],
        cols: 1
      }),

      B.cmp({
        id: 'm0-ran', t: 2, src: 'rec', title: 'What I ran, and what I did not',
        say: 'This is the exact setup behind every recorded screen. Press Next to read it.',
        cols: ['Part', 'What it was', 'Status'],
        hl: 1,
        rows: [
          ['Docker Engine', M('docker_engine') + ' on ' + M('host_os') + ', ' + M('arch') + ', kernel ' + M('kernel') + ', ' + M('storage_driver') + ' storage with the containerd image store, cgroup version ' + M('cgroup_version'), 'Run'],
          ['Build and Compose', 'Buildx ' + M('buildx') + ' and Docker Compose ' + M('compose'), 'Run'],
          ['Images', M('python_image') + ' (Python ' + M('python_version') + '), ' + M('postgres_image') + ' (Postgres ' + M('postgres_version') + '), ' + M('alpine_image') + ', registry:2 and docker:cli, all from Docker Hub', 'Run'],
          ['The job', 'load_orders.py with psycopg ' + M('psycopg') + ', 5,000 made-up orders from a fixed rule', 'Run'],
          ['Docker Desktop, Windows and macOS', 'Described from the Docker documentation', 'Not run'],
          ['Rootless mode, Podman, Swarm, Kubernetes', 'Mentioned where they matter, from documentation', 'Not run'],
          ['Cloud registries and scanners', 'Amazon ECR, Google Artifact Registry, Azure Container Registry, Docker Scout, Trivy', 'Not run']
        ],
        steps: [
          { upto: 4, say: 'The first four rows ran on one machine. They are the parts of Docker that an engineer can run without any account.' },
          { upto: 7, say: 'The last three did not run. What I say about them comes from documentation, and the README lists what to check again before you rely on it.' }
        ]
      })
    ]
  });
})();
