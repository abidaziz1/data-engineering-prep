/* Mission 1: images and containers. Everything on these screens was run on a real Docker Engine. */
(function () {
  var B = LAB.b, G = LAB.get;
  var K = G.counts('basics.kernel'), LIFE = G.counts('basics.life'), STOP = G.counts('basics.stop'), PR = G.counts('basics.processes'), TTY = G.counts('basics.tty');
  var LAY = { alpine: G.counts('basics.layers.alpine:3.22'), py: G.counts('basics.layers.python:3.13-slim'), pg: G.counts('basics.layers.postgres:16-alpine') };
  var n = G.n;
  G.expect(K.same === true, 'a container reports the kernel of the host');
  G.expect(STOP.exit_code === 137, 'a container whose PID 1 is a shell that ignores SIGTERM ends with 137');
  G.expect(TTY.rc !== 0, 'docker run -it fails without a terminal');
  G.expect(LAY.alpine.layers === 1 && LAY.py.layers > 1, 'alpine has one layer and the python image has several');

  LAB.addChapter({
    id: 'm1', n: 1, title: 'Images and containers', short: 'Containers', blurb: 'What a container is, what an image is, and what happens to the files', minutes: 15,
    focus: ['src', 'stg'],
    goals: [
      'Explain an **image**, a **container** and a **layer** in your own words.',
      'Say why a container is a **process** and not a small computer.',
      'Run, look into, stop and remove a container.',
      'Say what happens to the files that a container writes.'
    ],
    say: 'Before the Brewline job goes into an image, you need three words to mean the same thing to you and to an interviewer: image, container and layer. We will run real containers and look at what Docker says about them.',
    scenes: [
      B.flow({
        id: 'm1-engine', t: 1, src: 'docs', title: 'What docker run asks for', g: 'engine', legend: true,
        steps: [
          { say: 'You type `docker run alpine echo hello`. Four programs and one kernel take part. Press Next.', focus: ['cli', 'dmn', 'ctd', 'runc', 'proc', 'kern'], cap: 'A command, a chain of programs, one kernel.' },
          { say: 'Step 1. The `docker` command is only a client. It sends the request to the **Docker Engine**, a service that runs on the machine.', on: ['e1'], focus: ['cli', 'dmn'], cap: 'The client talks to the daemon.' },
          { say: 'Step 2. The engine passes the work to **containerd**, which stores images and manages the life of containers.', on: ['e2'], focus: ['dmn', 'ctd'], cap: 'containerd keeps the images and the state.' },
          { say: 'Step 3. **runc** sets up the container: a new set of namespaces, limits from cgroups, and the root file system made of the image layers.', on: ['e3'], focus: ['ctd', 'runc'], cap: 'runc builds the walls.' },
          { say: 'Step 4. runc starts **your process**. Inside the container it has ID 1 and sees no other process.', on: ['e4'], focus: ['runc', 'proc'], cap: 'Your command runs as process 1.' },
          { say: 'Step 5. The process makes system calls to the **kernel of the host**. There is no second kernel. A container is a process with a restricted view, not a small machine.', on: ['e5'], focus: ['proc', 'kern'], tags: ['tg_same'], cap: 'One kernel for every container.' }
        ]
      }),

      B.term({
        id: 'm1-hello', t: 1, src: 'rec', title: 'The first container',
        say: 'Three commands on the real engine of this course. Watch the kernel version in particular.',
        lines: function () {
          return G.term([
            ['docker run --rm alpine:3.22 echo hello from a container', G.text('basics.hello')],
            ['uname -r', K.host],
            ['docker run --rm alpine:3.22 uname -r', K.container],
            ['docker run --rm alpine:3.22 sh -c \'. /etc/os-release; echo $PRETTY_NAME\'', K.container_os]
          ]);
        },
        after: 'The container reports **the same kernel as the machine** (' + K.host + '), and its own distribution, ' + K.container_os + ', while the host runs ' + K.host_os + '. The files come from the image. The kernel comes from the host. That is the whole difference from a virtual machine.',
        afterKind: 'tip',
        doneSay: 'The image brings a file system. The host brings the kernel.'
      }),

      B.cmp({
        id: 'm1-vm', t: 1, src: 'docs', title: 'A container and a virtual machine',
        say: 'People compare the two all the time. Press Next to read what differs.',
        cols: ['', 'Container', 'Virtual machine'],
        hl: 0,
        rows: [
          ['Kernel', 'The kernel of the host, shared by every container.', 'Its own kernel, inside a guest operating system.'],
          ['What starts', 'One process, with a restricted view of the machine.', 'A whole operating system.'],
          ['Start-up', 'As fast as starting a process, plus preparing the file system.', 'The time that an operating system needs to boot.'],
          ['Size', 'The layers of an image: megabytes for a small one.', 'A disk image with an operating system, often gigabytes.'],
          ['Isolation', 'Namespaces and cgroups of one kernel. A kernel flaw reaches every container.', 'A hypervisor between the guest and the host.'],
          ['Typical use', 'One job or service, started and stopped often.', 'A long-lived machine, or a hard boundary between tenants.']
        ],
        steps: [
          { upto: 3, say: 'The first rows are about weight. A container is a process, so it starts at once and costs little.' },
          { upto: 6, say: 'The last rows are about the boundary. A container shares the kernel, so it is a weaker wall than a virtual machine. Mission 9 returns to that.' }
        ]
      }),

      B.rows({
        id: 'm1-states', t: 1, src: 'rec', title: 'The life of a container',
        steps: [
          {
            say: 'I created a container, started it, let its command end and removed it. After each step I asked Docker for its state.',
            tabs: [{ layer: 'RECORDED', name: 'State after each command', c: 'raw', cols: G.table('basics.states').cols, rows: G.table('basics.states').rows, trk: 0 }],
            notes: ['`docker create` makes the container and does not start it. `docker start` starts the process. When the command ends, the container is **exited**, and it is still there.']
          },
          {
            say: 'An exited container keeps two things: the exit code and the output.',
            tabs: [{ layer: 'RECORDED', name: 'What stays after the command ended', c: 'raw', cols: ['exit code', 'output that `docker logs` still shows'], rows: [[LIFE.exit_code, LIFE.logs_after_exit]], trk: 0 }],
            notes: ['This is why you can read the log of a job after it failed. It is also why exited containers pile up on a build server if nobody removes them. `docker run --rm` removes the container when it ends.']
          }
        ]
      }),

      B.term({
        id: 'm1-ps', t: 1, src: 'rec', title: 'A container sees only itself',
        say: 'The same command, `ps`, on the host and in a container.',
        lines: function () {
          return G.term([
            ['ps -e --no-headers | wc -l', String(PR.on_host)],
            ['docker run --rm alpine:3.22 ps -o pid,args', G.text('basics.ps')]
          ]);
        },
        after: 'The host runs **' + n(PR.on_host) + '** processes. The container sees **' + PR.in_container + '**: the `ps` command itself, with process ID **1**. That is a **PID namespace**. Remember process ID 1: mission 7 shows why it is special.',
        afterKind: 'tip',
        doneSay: 'Inside the container your command is process 1.'
      }),

      B.term({
        id: 'm1-exec', t: 1, src: 'rec', title: 'Look into a running container',
        say: 'A container that prints a line every second, started in the background. Then the commands that you use to look at it and to stop it.',
        lines: function () {
          return G.term([
            ['docker run -d --name web alpine:3.22 sh -c \'while true; do echo tick; sleep 1; done\'', '(the id of the container)'],
            ['docker exec web ps -o pid,args', G.text('basics.exec')],
            ['docker logs --tail 2 web', G.text('basics.logs')],
            ['docker stop -t 1 web', 'web'],
            ['docker inspect web --format \'{{.State.Status}} {{.State.ExitCode}}\'', STOP.status + ' ' + STOP.exit_code]
          ]);
        },
        after: '`docker exec` starts a **second process** inside the same container, here `ps`, which is why it shows PID 1 (the loop) and PID 9 and 10. `docker logs` shows what the container wrote to standard output. And look at the exit code: **' + STOP.exit_code + '**. `docker stop` asked the shell politely to stop, the shell ignored it, and Docker ended it with a kill after one second. Mission 7 is about this.',
        afterKind: 'tip',
        doneSay: 'exec adds a process. logs reads the output. stop asks, then kills.'
      }),

      B.term({
        id: 'm1-diff', t: 1, src: 'rec', title: 'Where a container writes',
        say: 'A container writes a file, deletes one and changes one. Then I asked Docker what changed compared with the image.',
        lines: function () {
          return G.term([
            ['docker run --name w alpine:3.22 sh -c \'echo x > /tmp/a.txt; rm /etc/motd; echo y >> /etc/hostname\'', ''],
            ['docker diff w', G.text('basics.diff')],
            ['docker rm w', 'w']
          ]);
        },
        after: 'A is added, C is changed, D is deleted. The image was not touched: the container has its own **writable layer** on top. When you run `docker rm`, that layer goes with the container, and so do the files in it. Mission 4 is about the data that must survive this.',
        afterKind: 'warn',
        doneSay: 'The image is read-only. The container writes to its own layer, which dies with it.'
      }),

      B.rows({
        id: 'm1-layers', t: 1, src: 'rec', title: 'An image is a stack of layers',
        steps: [
          {
            say: 'I asked Docker how many layers three images have. Alpine has **' + LAY.alpine.layers + '**. The Python image has **' + LAY.py.layers + '**. Postgres has **' + LAY.pg.layers + '**.',
            tabs: [{ layer: 'RECORDED', name: 'Layers and size of three images', c: 'raw', cols: ['image', 'layers', 'size in bytes'], rows: [['alpine:3.22', LAY.alpine.layers, n(LAY.alpine.size)], ['python:3.13-slim', LAY.py.layers, n(LAY.py.size)], ['postgres:16-alpine', LAY.pg.layers, n(LAY.pg.size)]], trk: 0 }],
            notes: ['Each layer is a set of file changes. The size of an image is the sum of its layers. Layers are shared: two images that start from the same base store that base once.']
          },
          {
            say: 'This is the history of python:3.13-slim: which instruction made which layer. Instructions that change no files, such as `ENV` and `CMD`, make a layer of **0B**.',
            tabs: [{ layer: 'RECORDED', name: 'docker history python:3.13-slim', c: 'raw', cols: G.table('basics.history').cols, rows: G.table('basics.history').rows, trk: 0 }],
            notes: ['Of the ' + G.counts('basics.history_count').rows + ' rows, only ' + G.counts('basics.history_count').with_size + ' made a layer with files. The two biggest are the Debian base and the build of Python.']
          }
        ]
      }),

      B.talk({
        id: 'm1-words', t: 1, src: 'docs', title: 'Six words, used exactly',
        say: 'Interviewers listen for these words. Press Next for each one.',
        items: [
          ['Image', 'A read-only stack of layers plus some settings (the command to run, environment variables). It has a name and a tag, for example `python:3.13-slim`.', 'A recipe that cannot change.'],
          ['Container', 'A running, or stopped, instance of an image: a process with its own view of files, processes and the network, and a writable layer on top.', 'A running image.'],
          ['Layer', 'The file changes made by one instruction. Layers are cached and shared.', 'One step of the build.'],
          ['Registry', 'A server that stores images by name and tag. Docker Hub is one. A company runs its own, or uses one from a cloud.', 'A place to pull from and push to.'],
          ['Volume', 'Storage that Docker manages outside the writable layer, so that it survives `docker rm`.', 'Data that stays.'],
          ['Tag and digest', 'A tag such as `latest` is a name that can be moved to another image. A digest, `sha256:...`, names one exact image.', 'A tag is a label. A digest is the content.']
        ],
        cols: 2
      }),

      B.quiz({
        id: 'm1-q1', t: 1,
        q: 'You run `docker run --rm alpine uname -r` on a Linux server. What does it print?',
        opts: [
          { t: 'The kernel version of Alpine, a different one from the server', fb: 'An image has no kernel. Only the files come from the image.' },
          { t: 'The kernel version of the server', fb: '' },
          { t: 'An error, because Alpine has no kernel', fb: 'The command works. The kernel is the host\'s.' },
          { t: 'The version of the Docker Engine', fb: 'That is `docker version`.' }
        ],
        ok: 1, why: 'A container is a process on the host kernel. In the recording both printed ' + K.host + '.'
      }),

      B.quiz({
        id: 'm1-q2', t: 1,
        q: 'A job wrote a report to `/tmp/report.csv` inside its container, and then the container was removed with `docker rm`. Where is the report?',
        opts: [
          { t: 'In the image, because it was written inside the container', fb: 'Containers never change the image.' },
          { t: 'In the writable layer of the container, and that layer was removed with it', fb: '' },
          { t: 'In the Docker Hub registry', fb: 'Nothing is pushed unless you push.' },
          { t: 'On the host, in /tmp', fb: 'Only a bind mount or a volume writes to the host.' }
        ],
        ok: 1, why: 'The writable layer belongs to the container. `docker diff` showed A /tmp/a.txt, and `docker rm` removed it.'
      }),

      B.quiz({
        id: 'm1-q3', t: 1,
        q: 'Which command lets you read the output of a job that has already failed and exited?',
        opts: [
          { t: '`docker exec`', fb: 'exec needs a running container.' },
          { t: '`docker logs`', fb: '' },
          { t: '`docker ps` without options', fb: 'That lists running containers only, and shows no output.' },
          { t: '`docker rmi`', fb: 'That removes an image.' }
        ],
        ok: 1, why: 'An exited container keeps its output and its exit code until you remove it. The recording read "' + LIFE.logs_after_exit + '" after the command had ended.'
      }),

      B.bug({
        id: 'm1-bug', t: 1, q: 'This line is in a cron job on a build server. It fails every night. Click the part that causes it.',
        file: 'nightly.sh', lang: 'bash', code: '#!/bin/sh\n# runs from cron at 02:00\ndocker run --rm -it brewline/loader\n',
        bad: [3],
        hint: 'Which option asks for something that cron does not have?',
        why: '`-t` asks for a terminal and `-i` for input. Cron has neither, so Docker stops with: **' + G.text('basics.tty') + '**. Schedulers such as cron and Airflow do not give a job a terminal.',
        fix: '#!/bin/sh\ndocker run --rm brewline/loader\n',
        cheer: 'Use `-it` when you type in the container. Leave it out in anything that runs by itself.'
      }),

      B.order({
        id: 'm1-ord', t: 1, q: 'Put the life of a nightly job container in the order in which it happens.',
        items: [
          'docker pull brewline/loader:1.0 fetches the image',
          'docker create makes the container from the image',
          'docker start runs the process as ID 1',
          'The command ends, and the container is exited with an exit code',
          'docker logs reads the output of the finished job',
          'docker rm removes the container and its writable layer'
        ],
        why: 'The image comes first and is kept. The container is made from it, runs, ends and stays until you remove it. `docker run` does the create and start steps in one command, and `--rm` adds the last one.'
      }),

      B.qa({
        id: 'qa-container', t: 1, tag: 'Docker', secs: 75,
        q: 'What is a container, and how is it different from a virtual machine?',
        pts: ['A process on the host kernel', 'Its own namespaces: process IDs, file system, network', 'Limits from cgroups', 'No guest kernel, so it starts quickly and the wall is weaker'],
        short: 'A container is a normal process on the host, started with a restricted view of the machine. Linux namespaces give it its own process list, file system and network, and cgroups limit its memory and CPU. It does not have its own kernel. I saw this in the recording: a container reported the same kernel version as the host, ' + K.host + ', and saw one process where the host had ' + PR.on_host + '. A virtual machine boots a guest operating system on a hypervisor, so it is heavier and the wall is stronger. A container starts in about the time of a process, and a kernel bug can reach every container on the machine.',
        fu: [['Can a container run a different Linux distribution than the host?', 'Yes. The image brings its files, the host brings the kernel. It cannot bring a different kernel.'], ['Can you run a Linux container on a Mac or a Windows machine?', 'Docker Desktop runs a small Linux virtual machine and the containers run in it. That part is from documentation.']],
        trap: 'Saying that a container is "a lightweight virtual machine". It has no machine and no kernel of its own.',
        real: 'Say where you ran containers: a laptop, a CI job, a scheduler, a cloud service.'
      }),

      B.qa({
        id: 'qa-image', t: 1, tag: 'Docker', secs: 60,
        q: 'What is the difference between an image and a container?',
        pts: ['An image is read-only layers plus settings', 'A container is a running or stopped instance with a writable layer', 'Many containers can start from one image', 'Removing a container leaves the image'],
        short: 'An image is a stack of read-only layers with some settings, such as the command to run. A container is an instance of an image: a process plus its own writable layer on top. You can start many containers from one image, and they share the image layers. In the recording, three containers of alpine took 4.1 kB each on top of one shared image. If you remove a container, its writable layer and the files in it go, and the image stays. If a job must keep data, it writes to a volume.',
        fu: [['What is a layer?', 'The file changes made by one instruction of the Dockerfile. Layers are cached and shared between images.'], ['Why do exited containers matter on a build server?', 'Each keeps its writable layer and its logs until you remove it, so they fill the disk. Use `--rm`, or prune.']],
        trap: 'Mixing the two words. An image is not "running".',
        real: 'Describe an image that you built and where you stored it.'
      }),

      B.qa({
        id: 'qa-exec', t: 2, tag: 'Docker', secs: 60,
        q: 'What is the difference between `docker run`, `docker start` and `docker exec`?',
        pts: ['run: create a new container from an image and start it', 'start: start an existing stopped container', 'exec: start another process inside a running container', 'exec is for looking around, not for running the job'],
        short: '`docker run` creates a new container from an image and starts it. `docker start` starts a container that already exists and is stopped. `docker exec` starts an additional process inside a container that is running, for example a shell or `ps` to look around. In the recording, `exec ps` showed the loop as process 1 and the `ps` itself as a new process. I use `exec` to debug, and I do not rely on it for the job. The job is the main process, started by `run`, because that is what gets the signals and the exit code.',
        fu: [['What if the container exited?', 'exec fails, because there is no running process. Start it again, or run a new container from the image with a different command.'], ['How do you open a shell in a stopped job?', '`docker run --rm -it --entrypoint sh IMAGE`, a new container from the same image.']],
        trap: 'Using `exec` to run the production job in a container that is already running.',
        real: 'Say how you debugged a container that failed.'
      }),

      B.recap({
        id: 'm1-recap', n: 1, badge: 'Container Starter', color: '#BFDBFE',
        pts: [
          'A **container** is a process on the host kernel, with its own process list, files and network.',
          'An **image** is read-only layers. A container adds a **writable layer** that dies with it.',
          'An exited container keeps its **exit code and logs** until you remove it. `--rm` removes it for you.',
          'A shell as ID 1 ended with exit code **' + STOP.exit_code + '** when stopped.',
          'Leave **`-it`** out of anything that runs without a person.'
        ],
        lines: [
          'I can explain an image, a container and a layer.',
          'I know that the host kernel is shared.',
          'I know where a container writes, and what happens to it.'
        ]
      })
    ]
  });
})();
