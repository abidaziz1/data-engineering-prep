/* Mission 7: jobs that run for a while: exit codes, memory, signals, restarts, logs and time zones. Everything was run on a real Docker Engine. */
(function () {
  var B = LAB.b, G = LAB.get;
  var EX = G.table('jobs.exit').rows, OOM = G.table('jobs.oom').rows, SIG = G.table('jobs.signals').rows, RS = G.table('jobs.restart').rows, EN = G.table('jobs.entry').rows;
  var CP = G.counts('jobs.cpus'), LG = G.counts('jobs.logs'), TZ = G.counts('jobs.tz'), LIM = G.counts('jobs.limit_seen').inside, WK = G.file('app/worker.py');
  var n = G.n;
  var exitOf = function (label) { return EX.filter(function (r) { return r[0] === label; })[0][1]; };
  var sig = function (prefix) { return SIG.filter(function (r) { return r[0].indexOf(prefix) === 0; })[0]; };
  G.expect(exitOf('exit 3') === 3 && exitOf('a command that does not exist') === 127 && exitOf('a file that is not executable') === 126 && exitOf('docker kill (SIGKILL)') === 137, 'the exit codes of the table');
  G.expect(OOM[1][2] === 137 && OOM[1][3] === true && OOM[0][2] === 0 && OOM[2][2] === 0, 'the 200 MB job is killed under 64m and fits under 512m');
  G.expect(sig('exec form, no handler')[3] === 137 && sig('exec form, handles')[3] === 0 && sig('shell form (sh -c)')[3] === 137 && sig('shell form with exec')[3] === 0, 'signals reach PID 1 only');
  G.expect(sig('exec form, no handler, docker run --init')[3] === 143, 'with --init the default action ends the job with 143');
  G.expect(CP.cpus_0_5.cpu_count === CP.no_limit.cpu_count && CP.cpuset_0.process_cpu_count === 1, 'a CPU quota is not visible to Python and a cpuset is');
  G.expect(RS[0][1] === 0 && RS[1][1] === 3 && RS[1][2] === 4, 'on-failure:3 restarted the job three times');
  G.expect(LG.kept_with_rotation < LG.printed / 5 && LG.kept_without_rotation === LG.printed, 'log rotation keeps a part of the lines');
  G.expect(TZ.default.indexOf('UTC') === 0 && TZ.with_TZ.indexOf('IST') === 0, 'a container runs in UTC unless TZ is set');

  LAB.addChapter({
    id: 'm7', n: 7, title: 'Jobs that run for a while', short: 'Jobs', blurb: 'Exit codes, memory, stopping cleanly, restarts, logs and time zones', minutes: 18,
    focus: ['qual', 'mon'],
    goals: [
      'Read an **exit code** and say what ended the job.',
      'Explain a kill by the **memory limit**, and why Python does not see a CPU quota.',
      'Make a job **stop cleanly** when it gets SIGTERM.',
      'Choose a **restart policy**, and limit the size of the logs.'
    ],
    say: 'A scheduler starts the loader, and from then on the loader is out of your sight. This mission is about what you will need at three in the morning: the exit code that says what happened, the signal that lets it stop in the middle of a batch, and the limits that decide when it is killed.',
    scenes: [
      B.rows({
        id: 'm7-exit', t: 1, src: 'rec', title: 'The exit code says how it ended',
        steps: [
          {
            say: 'I ran commands that end in five different ways and read the exit code of `docker run`.',
            tabs: [{ layer: 'RECORDED', name: 'Exit codes', c: 'raw', cols: ['what happened', 'exit code'], rows: EX, trk: 0 }],
            notes: ['**0** is success. A small number is the code that the program chose. **127** is "command not found" and **126** is "found, but cannot be run". Above 128 the shell reports a **signal**: 128 plus the signal number. **137** is 128 + 9, SIGKILL. **143** is 128 + 15, SIGTERM.']
          }
        ]
      }),

      B.term({
        id: 'm7-oom', t: 1, src: 'rec', title: 'Killed for using too much memory',
        say: 'A Python job that allocates 32 MB, then 200 MB, under a limit of 64 MB, then 200 MB under 512 MB. After each run I asked `docker inspect` how it ended.',
        lines: function () {
          return G.term(OOM.map(function (r) {
            return ['docker run --name mem -m ' + r[0] + ' python:3.13-slim python -c \'x = bytearray(' + parseInt(r[1], 10) + ' * 1024 * 1024); print("allocated", ...)\'', (r[4] ? r[4] + '\n' : '(no output)\n') + 'exit code ' + r[2] + '    OOMKilled=' + (r[3] ? 'true' : 'false')];
          }));
        },
        after: 'The middle run printed **nothing** and ended with exit code **137** and `OOMKilled=true`. The kernel killed the process when it passed 64 MB, so Python never had a chance to raise a `MemoryError` or write a log line. A job that disappears with 137 and no traceback has usually run out of memory. Inside the container, the limit read **' + n(LIM) + '** bytes.',
        afterKind: 'warn',
        doneSay: 'Exit 137 and no traceback: look for OOMKilled.'
      }),

      B.widget({ id: 'm7-lab1', kind: 'limits', t: 1, src: 'rec', title: 'Lab: limits and what the job sees' }),

      B.flow({
        id: 'm7-stop', t: 1, src: 'docs', title: 'What docker stop does', g: 'stop', legend: true,
        steps: [
          { say: 'A scheduler wants to stop a running job: a deploy, a scale-down, a timeout. It calls `docker stop`. Press Next.', focus: ['you', 'eng', 'pid1'], cap: 'Somebody asks the job to stop.' },
          { say: 'Step 1. The command goes to the **Docker Engine**.', on: ['e1'], focus: ['you', 'eng'], cap: 'The engine gets the request.' },
          { say: 'Step 2. The engine sends **SIGTERM** to the process with **ID 1** in the container. SIGTERM is a polite request: "please finish and exit".', on: ['e2'], focus: ['eng', 'pid1'], tags: ['tg_term'], cap: 'SIGTERM goes to PID 1 only.' },
          { say: 'Step 3. If that process **handles** the signal, it finishes its batch, closes its files and exits with 0. The job stopped by itself.', on: ['e3'], focus: ['pid1', 'ok'], cap: 'A handler makes a clean stop.' },
          { say: 'Step 4. If it does not exit within the **grace period**, the engine sends **SIGKILL**. The kernel ends the process at once. The exit code is 137, and the batch is half written.', on: ['e4'], focus: ['eng', 'kill'], tags: ['tg_grace'], cap: 'SIGKILL cannot be handled.' }
        ]
      }),

      B.code({
        id: 'm7-worker', t: 1, src: 'rec', title: 'A job that handles SIGTERM', file: 'worker.py', lang: 'python', code: WK,
        steps: [
          { say: 'A small job that loops until it is stopped. I use it for every signal test of this mission. Press Next.', lines: null },
          { say: 'The **handler** prints one line and exits with 0. A real job would finish the current batch, commit, and close its connections here.', lines: G.span(WK, /^def stop/, /sys.exit/) },
          { say: 'It is installed only when `HANDLE_TERM=1`. That lets the same file show both behaviours.', lines: G.span(WK, /^if os.environ/, /signal.signal/) },
          { say: 'The job prints its **process ID**. This number is the important output: it tells you whether your program is process 1.', lines: G.span(WK, /worker started/) }
        ],
        note: 'The signal module of the Python standard library is all that is needed. No framework.'
      }),

      B.widget({ id: 'm7-lab2', kind: 'stop', t: 1, src: 'rec', title: 'Lab: five ways to start the same job' }),

      B.cmp({
        id: 'm7-forms', t: 1, src: 'rec', title: 'Why the shell form fails',
        say: 'The same job, started in two forms. Both are in the lab. Press Next to read what the recording says.',
        cols: ['Form', 'Written as', 'The job is process', 'docker stop'],
        hl: 0,
        rows: [
          ['Exec form', '`CMD ["python", "worker.py"]`', String(sig('exec form, handles')[1]), 'The handler ran. Exit code ' + sig('exec form, handles')[3] + ', no waiting.'],
          ['Shell form', '`CMD python worker.py`, which means `sh -c "python worker.py"`', String(sig('shell form (sh -c)')[1]), 'The shell is process 1 and did not pass the signal on. Waited the full grace period, exit code ' + sig('shell form (sh -c)')[3] + '.'],
          ['Shell form with exec', '`CMD exec python worker.py`', String(sig('shell form with exec')[1]), '`exec` replaced the shell, so the job is process 1 again. Handler ran, exit code ' + sig('shell form with exec')[3] + '.']
        ],
        steps: [
          { upto: 1, say: 'The exec form starts your program directly. It is the one to write.' },
          { upto: 3, say: 'The shell form starts a shell, and the shell becomes process 1. A shell does not forward SIGTERM to its child. The `exec` keyword removes the shell from the chain.' }
        ]
      }),

      B.rows({
        id: 'm7-init', t: 2, src: 'rec', title: 'A job with no handler',
        steps: [
          {
            say: 'Some programs have no signal handler, and you cannot change them. The recording has two cases.',
            tabs: [{ layer: 'RECORDED', name: 'A job with no handler', c: 'raw', cols: ['how it started', 'waited for the grace period', 'exit code'], rows: [
              [sig('exec form, no handler')[0], sig('exec form, no handler')[2], sig('exec form, no handler')[3]],
              [sig('exec form, no handler, docker run --init')[0], sig('exec form, no handler, docker run --init')[2], sig('exec form, no handler, docker run --init')[3]]
            ], trk: 0 }],
            notes: ['Process 1 of a container is treated specially: the kernel does **not apply the default action** of a signal to it. A program with no handler just ignores SIGTERM, and Docker waits and kills it with exit code **137**. `docker run --init` puts a small init process at ID 1. It passes SIGTERM on, a program with no handler then ends in the default way, and the exit code is **143**.']
          }
        ]
      }),

      B.rows({
        id: 'm7-entry', t: 1, src: 'rec', title: 'ENTRYPOINT and CMD',
        steps: [
          {
            say: 'Two instructions decide what a container runs. I built a small image with `ENTRYPOINT ["echo", "entrypoint:"]` and `CMD ["default argument"]`, and ran it three ways.',
            tabs: [{ layer: 'RECORDED', name: 'What each command printed', c: 'raw', cols: G.table('jobs.entry').cols, rows: EN, trk: 0 }],
            notes: ['**ENTRYPOINT** is the program. **CMD** is the default arguments, and anything you write after the image name **replaces CMD** and is added after the ENTRYPOINT. `--entrypoint` replaces the program itself. A job image often sets only `CMD`, so that you can run another command in it for debugging.']
          }
        ]
      }),

      B.rows({
        id: 'm7-restart', t: 2, src: 'rec', title: 'Restart policies',
        steps: [
          {
            say: 'A job that always fails with exit code 1, started with two restart policies.',
            tabs: [{ layer: 'RECORDED', name: 'A job that exits with 1', c: 'raw', cols: G.table('jobs.restart').cols, rows: RS, trk: 0 }],
            notes: ['With the default, **no**, the job ran once. With **on-failure:3** Docker started it again three times, so it ran **' + RS[1][2] + '** times in all, and then gave up with the last exit code. `always` and `unless-stopped` restart a container whatever its exit code, which suits a service and not a job (from documentation).']
          }
        ]
      }),

      B.rows({
        id: 'm7-logs', t: 2, src: 'rec', title: 'Logs and their size',
        steps: [
          {
            say: 'A job that prints ' + n(LG.printed) + ' lines, with the default log settings and with a limit of 20 kB for each of 2 files.',
            tabs: [{ layer: 'RECORDED', name: 'Lines that `docker logs` can still show', c: 'raw', cols: ['log settings', 'lines kept'], rows: [['default (json-file, no limit)', n(LG.kept_without_rotation)], [LG.driver_and_options, n(LG.kept_with_rotation)]], trk: 0 }],
            notes: ['The default driver writes everything to a file on the host, and the file grows with the job. A chatty job can fill a disk. `--log-opt max-size` and `max-file` rotate the file and drop the oldest lines. For a job that matters, send the logs somewhere central as well (from documentation).']
          }
        ]
      }),

      B.rows({
        id: 'm7-tz', t: 1, src: 'rec', title: 'The clock and the time zone',
        steps: [
          {
            say: 'A container shares the **clock** of the host, and has its **own time zone setting**. I printed the time zone name and the offset three ways.',
            tabs: [{ layer: 'RECORDED', name: 'date +%Z %z', c: 'raw', cols: ['where', 'result'], rows: [['on the host', TZ.host], ['in a container, by default', TZ.default], ['in a container with `-e TZ=Asia/Kolkata`', TZ.with_TZ]], trk: 0 }],
            notes: ['A container uses UTC unless it is told otherwise. That is a good default for a data job: store and compare timestamps in UTC, and convert for display. Set `TZ` only when a program must print local time. The host here also runs in UTC, so a default of "same as the host" would not show a difference.']
          }
        ]
      }),

      B.talk({
        id: 'm7-habits', t: 1, src: 'docs', title: 'Habits for a job that nobody watches',
        say: 'Six habits. Press Next for each.',
        items: [
          ['Write CMD in the exec form', 'JSON brackets. The shell is not process 1 and the signal reaches your program.', 'Brackets, not a string.'],
          ['Handle SIGTERM', 'Finish the batch, commit or roll back, close connections, exit 0.', 'A clean stop is a feature.'],
          ['Set a memory limit, and size it', 'The job gets killed with 137 when it passes it. Measure the peak first.', '137 and no traceback is a memory limit.'],
          ['Read the worker count from a setting', 'A CPU quota is invisible to Python. `os.cpu_count()` returned ' + CP.cpus_0_5.cpu_count + ' under `--cpus 0.5`.', 'Do not size pools from the machine.'],
          ['Make the job safe to run twice', 'Restarts and retries happen. Inserts that ignore conflicts, writes that replace.', 'Idempotent jobs.'],
          ['Cap the logs', 'Rotate the files, or ship them.', 'A log is not free.']
        ],
        cols: 2
      }),

      B.bug({
        id: 'm7-bug', t: 1, q: 'Deploys of this job take ten seconds longer than they should, and the job is stopped in the middle of a batch. Click the line that is the problem.',
        file: 'Dockerfile', lang: 'dockerfile', code: 'FROM python:3.13-slim\nWORKDIR /app\nCOPY worker.py .\nCMD python worker.py\n',
        bad: [4],
        hint: 'Which form of CMD starts a shell first?',
        why: 'The string form is `sh -c "python worker.py"`. The shell is process 1 and does not forward SIGTERM, so the handler never runs, Docker waits for the grace period, and then kills the job with exit code ' + sig('shell form (sh -c)')[3] + '. Write `CMD ["python", "worker.py"]`.',
        fix: 'FROM python:3.13-slim\nWORKDIR /app\nCOPY worker.py .\nCMD ["python", "worker.py"]\n',
        cheer: 'Brackets in CMD, and the job gets its signal.'
      }),

      B.order({
        id: 'm7-ord', t: 1, q: 'Put what happens during `docker stop` of a job that handles SIGTERM in order.',
        items: [
          'The engine sends SIGTERM to process 1 of the container',
          'The handler runs and finishes the current batch',
          'The job closes its connections and exits with code 0',
          'The engine sees that the process has ended and marks the container exited',
          'The container stays, with its logs, until it is removed'
        ],
        why: 'The signal comes first, and the job does the clean-up itself. If it had not exited within the grace period, the engine would have sent SIGKILL. In the recording the job with a handler stopped at once with exit code ' + sig('exec form, handles')[3] + '.'
      }),

      B.quiz({
        id: 'm7-q1', t: 1,
        q: 'A nightly job ends with exit code 137 and no error in the log. What do you check first?',
        opts: [
          { t: 'Whether the container was killed by the memory limit: `docker inspect` and `OOMKilled`', fb: '' },
          { t: 'Whether the Python version is right', fb: 'A wrong version gives an error message and a small exit code.' },
          { t: 'Whether the network is up', fb: 'A network problem gives an exception in the log.' },
          { t: 'Whether the image is the latest', fb: 'That does not give 137.' }
        ],
        ok: 0, why: '137 is 128 plus signal 9. In the recording the job that went over its limit ended with exit code ' + OOM[1][2] + ', `OOMKilled=' + OOM[1][3] + '` and printed nothing.'
      }),

      B.quiz({
        id: 'm7-q2', t: 1,
        q: 'You start a job with `docker run --cpus 0.5`. Which value does `os.cpu_count()` return in Python on a 4-CPU machine?',
        opts: [
          { t: '0.5', fb: 'It returns a whole number.' },
          { t: '1', fb: 'It does not read the quota.' },
          { t: String(CP.no_limit.cpu_count), fb: '' },
          { t: '2', fb: '' }
        ],
        ok: 2, why: 'The recording: ' + CP.cpus_0_5.cpu_count + ' with `--cpus 0.5`, as with no limit. The quota limits CPU time, and the program still sees every CPU. `--cpuset-cpus 0` is visible in `os.process_cpu_count()`: ' + CP.cpuset_0.process_cpu_count + '.'
      }),

      B.quiz({
        id: 'm7-q3', t: 1,
        q: 'A job has `CMD python worker.py`, written as a plain string. `docker stop` waits for the grace period and ends with 137. Why?',
        opts: [
          { t: 'The shell is process 1 and does not pass the signal to Python', fb: '' },
          { t: 'Python cannot handle signals', fb: 'It can, with `signal.signal`.' },
          { t: 'Docker does not send SIGTERM', fb: 'It does, to process 1.' },
          { t: 'The grace period is too short', fb: 'A longer one would only wait longer.' }
        ],
        ok: 0, why: 'In the recording the shell form was process ' + sig('shell form (sh -c)')[1] + ', the shell was process 1, the handler did not run, and the exit code was ' + sig('shell form (sh -c)')[3] + '.'
      }),

      B.decide({
        id: 'm7-dec', t: 2, src: 'rec', title: 'Decision: what restart policy for the nightly loader?',
        scenario: 'The loader is started every night by a scheduler. Sometimes the database is restarting and the first connection fails. The job is safe to run twice. The team asks which restart policy to put on the container.',
        opts: [
          { t: '`--restart always`', d: 'It always comes back.', lose: 'A job that ends with 0 would be started again at once, and again, forever.' },
          { t: '`--restart on-failure:3`, or retries inside the scheduler', d: 'A failed run is retried a few times, and a successful run is left alone. Because the job is safe to run twice, a retry does no harm.' },
          { t: 'No policy, and no retry', d: 'Simple.', lose: 'One refused connection at 02:00 means a missing load until somebody notices.' }
        ],
        pick: 1,
        why: 'The recording: `on-failure:3` ran the failing job ' + RS[1][2] + ' times and stopped. That gives the job a few chances without a loop. Many teams keep retries in the scheduler instead, where each try is visible as a task.',
        when: 'Use `unless-stopped` for a service that must stay up, such as a database or an API.'
      }),

      B.incident({
        id: 'm7-inc1', t: 2, src: 'rec', title: 'Incident: the job disappears at 02:30 with exit code 137', time: '02:35',
        alert: '**The nightly job ends at about 02:30 every night with exit code 137.** The log stops in the middle of a batch. There is no traceback.',
        clues: ['`docker inspect` shows `OOMKilled: true`', 'The container was started with `-m 512m`', 'The input file grew by 40 percent this month'],
        opts: [
          { t: 'Measure the peak memory, then process the file in chunks or raise the limit to what it needs with some room', fb: '' },
          { t: 'Remove the memory limit', fb: 'The job would take memory from other jobs on the host and the host could kill something else.' },
          { t: 'Add a restart policy', fb: 'The job would run into the same limit again.' },
          { t: 'Change the exit code handling in the scheduler to ignore 137', fb: 'That hides a failed load.' }
        ],
        best: 0,
        why: 'The recording shows the same pattern: a job that asked for 200 MB under a 64 MB limit printed nothing, ended with exit code 137 and `OOMKilled=true`. The limit is a real wall. The input grew, and the job did not.',
        checks: [
          ['Confirm', '`docker inspect CONTAINER --format "{{.State.OOMKilled}}"`.'],
          ['Measure', 'Watch the peak with `docker stats` during a run, or read the cgroup memory file.'],
          ['Reduce', 'Read the file in chunks, and write each chunk before the next.'],
          ['Size', 'Set the limit above the measured peak, and alert on 137.']
        ],
        tell: 'The job was killed by the kernel when it went over its 512 MB limit. The log stopped mid-batch because the process had no chance to write anything. I measured the peak, changed the job to process the file in chunks, set a limit with room above the new peak, and added an alert for exit code 137.',
        prevent: ['Alert on **137** and on `OOMKilled`', 'Watch input growth against the limit', 'Process big files in chunks']
      }),

      B.incident({
        id: 'm7-inc2', t: 2, src: 'rec', title: 'Incident: half a batch after every deploy', time: '14:10',
        alert: '**After each deploy the loader has written half of a batch.** The scheduler stops the old container and starts the new one. The deploy takes ten seconds longer than it used to.',
        clues: ['The Dockerfile ends with `CMD python load.py` in the string form', 'The job has a SIGTERM handler that commits the batch', 'The deploy log shows the container ending with exit code 137'],
        opts: [
          { t: 'Write `CMD ["python", "load.py"]` so that the job is process 1 and receives SIGTERM', fb: '' },
          { t: 'Raise the grace period to 60 seconds', fb: 'The handler never runs, so a longer wait is only a longer delay.' },
          { t: 'Remove the handler, because it does not work', fb: 'The handler is fine. The signal never reaches it.' },
          { t: 'Stop the container with `docker kill`', fb: 'That is SIGKILL, the opposite of a clean stop.' }
        ],
        best: 0,
        why: 'The recording: in the shell form the shell was process 1 and the job was process ' + sig('shell form (sh -c)')[1] + '. The handler did not run, `docker stop` waited the whole grace period, and the exit code was ' + sig('shell form (sh -c)')[3] + '.',
        checks: [
          ['Read the exit code', '137 after a stop means SIGKILL, so the job did not exit by itself.'],
          ['Look at CMD', 'A string is the shell form.'],
          ['Look at the process id', 'Print `os.getpid()` at start. It should be 1.'],
          ['Test', '`docker stop -t 3` and read the exit code. 0 means a clean stop.']
        ],
        tell: 'The deploys were killing the loader in the middle of a batch because the Dockerfile used the shell form of CMD, so a shell was process 1 and swallowed SIGTERM. I changed it to the exec form, and now the handler commits the batch and the job exits with 0 well before the grace period.',
        prevent: ['`docker build --check` flags the shell form', 'Test `docker stop` in CI with a short grace period', 'Print the process ID at start-up']
      }),

      B.qa({
        id: 'qa-exitcodes', t: 1, tag: 'Docker', secs: 60,
        q: 'What do exit codes 0, 1, 126, 127, 137 and 143 mean?',
        pts: ['0 success, a small number is the program\'s own error', '126 cannot execute, 127 not found', 'Above 128: 128 plus a signal number', '137 is SIGKILL, often the memory limit, 143 is SIGTERM'],
        short: '0 is success and a small number such as 1 is an error that the program chose. 127 means the command was not found and 126 that the file cannot be run. Anything above 128 is a signal: 128 plus the signal number. 137 is 128 plus 9, SIGKILL, which is what the kernel sends when a container goes over its memory limit, or what Docker sends when a stop takes too long. 143 is 128 plus 15, SIGTERM. In the recording the job that went over 64 MB ended with 137, `OOMKilled=true` and no output, so for 137 I check `docker inspect` first.',
        fu: [['How do you tell a memory kill from a stop that timed out?', '`OOMKilled` in `docker inspect`. A stop that timed out has `OOMKilled=false`.'], ['What gives 143?', 'A process that has no handler and ends by SIGTERM, for example under `--init`.']],
        trap: 'Treating every non-zero exit code the same.',
        real: 'Say which exit code you met most often.'
      }),

      B.qa({
        id: 'qa-signals', t: 1, tag: 'Docker', secs: 75,
        q: 'How do you make a container stop cleanly?',
        pts: ['docker stop sends SIGTERM to PID 1, waits the grace period, then SIGKILL', 'Write CMD in the exec form so that your program is PID 1', 'Handle SIGTERM: finish the batch, close, exit 0', 'Use --init, or exec, when a shell or a program without a handler is in the way'],
        short: '`docker stop` sends SIGTERM to the process with ID 1 in the container, waits for the grace period, 10 seconds by default, and then sends SIGKILL. So the job has to be process 1 and has to handle the signal. I write CMD in the exec form, with brackets, because the string form starts a shell as process 1, and the shell does not pass the signal on. In the recording the shell form waited the whole grace period and ended with 137, and the exec form with a handler stopped at once with 0. For a program that I cannot change I use `docker run --init` or `exec` in a wrapper script. In the recording `--init` gave 143.',
        fu: [['Why does a program with no handler ignore SIGTERM as PID 1?', 'The kernel does not apply the default signal action to the init process of a PID namespace, so the signal does nothing.'], ['How long is the grace period?', '10 seconds by default. `docker stop -t N` changes it. This is from documentation.']],
        trap: 'Using the shell form and wondering why stops are slow.',
        real: 'Describe a job that you made stop cleanly.'
      }),

      B.qa({
        id: 'qa-limits', t: 2, tag: 'Docker', secs: 75,
        q: 'How do memory and CPU limits work in Docker, and what surprises people?',
        pts: ['-m sets a hard memory limit enforced by the kernel', 'Over the limit: killed with 137, no exception', '--cpus is a time quota, not a number of CPUs', 'Programs read the host CPU count, so size pools from a setting'],
        short: 'A memory limit set with `-m` is a hard wall: when the process goes over it the kernel kills it with SIGKILL, so the exit code is 137, `OOMKilled` is true and the program gets no chance to log anything. In the recording a 200 MB job under 64 MB printed nothing and ended that way. The surprise with the CPU is that `--cpus 0.5` is a time quota, not a number of CPUs, and Python still reported ' + CP.cpus_0_5.cpu_count + ' from `os.cpu_count()`, so a library that sizes its thread pool from that number starts too many workers. `--cpuset-cpus` pins CPUs and `os.process_cpu_count()` sees it, ' + CP.cpuset_0.process_cpu_count + ' in the recording. So I set worker counts from a setting.',
        fu: [['How do you size a memory limit?', 'Measure the peak of a real run, add room, and alert on 137.'], ['What is the difference between a limit and a reservation?', 'A limit is a ceiling that kills or throttles. A reservation is a soft target for scheduling. This is from documentation.']],
        trap: 'Sizing a thread pool from `os.cpu_count()` in a container.',
        real: 'Say how you sized the limits of your jobs.'
      }),

      B.qa({
        id: 'qa-restart', t: 2, tag: 'Docker', secs: 60,
        q: 'Which restart policy would you use for a batch job, and which for a service?',
        pts: ['no: the default, one run', 'on-failure:N: retry after a non-zero exit, N times', 'always and unless-stopped: restart whatever the exit code', 'Retries are safe only when the job is idempotent'],
        short: 'For a batch job I use `on-failure` with a small limit, or no policy and retries in the scheduler. In the recording a job that always failed ran four times under `on-failure:3`, three restarts, and then stayed exited, and with the default it ran once. `always` and `unless-stopped` restart a container whatever its exit code, so a job that ends with 0 would start again and again, and I keep them for services such as a database or an API. A retry is only safe when the job is idempotent, so my loader inserts with conflict handling.',
        fu: [['Where do you prefer retries?', 'In the scheduler, because every try is a visible task with its own log.'], ['What is a back-off?', 'Docker waits longer between restarts. From documentation.']],
        trap: 'Using `always` on a job.',
        real: 'Describe a retry that did harm, or one that saved a night.'
      }),

      B.qa({
        id: 'qa-pid1', t: 3, tag: 'Docker', secs: 75,
        q: 'Why is process 1 special in a container, and what is an init process for?',
        pts: ['The kernel does not apply the default signal action to process 1 of a PID namespace', 'A program with no handler ignores SIGTERM there', 'Process 1 also has to reap orphaned child processes', 'An init such as the one of --init forwards signals and reaps children'],
        short: 'Process 1 is the init process of the PID namespace of the container, and the kernel treats it specially: a signal whose default action would end the process, such as SIGTERM, is ignored unless the program has installed a handler. In the recording a Python job with no handler did not stop on `docker stop` and was killed after the grace period with 137, and with `docker run --init` it ended at once with 143. The second duty is cleaning up: when a child process loses its parent it is adopted by process 1, which must collect its exit status, or the child stays as a zombie. A normal program does not do that, and a small init does. The zombie part is from documentation and I did not record it.',
        fu: [['What does `--init` run?', 'A tiny init, tini in current Docker versions, which forwards signals and reaps children. From documentation.'], ['When do zombies matter?', 'A job that starts many short-lived subprocesses and never waits for them can fill the process table.']],
        trap: 'Thinking that SIGTERM always ends a process.',
        real: 'Say how you found out that a job ignored its stop signal.'
      }),

      B.qa({
        id: 'qa-cgroups', t: 3, tag: 'Docker', secs: 75,
        q: 'How does Docker enforce memory and CPU limits, and what differs between cgroup versions?',
        pts: ['The limits are written to the cgroup of the container, and the kernel enforces them', 'Over the memory limit: the OOM killer ends a process in that cgroup', '--cpus is a quota of CPU time, --cpuset-cpus pins CPUs', 'cgroup v1 and v2 use different files, and the engine hides that'],
        short: 'The engine creates a control group for the container and writes the limits into it. The kernel does the rest. Memory is a hard ceiling: when the group goes over it, the out-of-memory killer ends a process in the group, which is what gave exit code 137 and `OOMKilled=true` in the recording. `--cpus` becomes a quota of CPU time in each scheduling period, so a program can still see every CPU and just runs for a fraction of the time, as Python did with ' + CP.cpus_0_5.cpu_count + ' CPUs under `--cpus 0.5`. `--cpuset-cpus` pins the container to CPUs, and `os.process_cpu_count()` saw it, ' + CP.cpuset_0.process_cpu_count + '. This machine used cgroup version ' + G.meta('cgroup_version') + '. Version 2 is the default on newer systems and uses other file names, for example `memory.max` instead of `memory.limit_in_bytes`, which I did not run.',
        fu: [['Is swap limited too?', 'With `--memory-swap`. From documentation.'], ['How do you see usage?', '`docker stats`, or the files of the cgroup.']],
        trap: 'Reading the limit file of one cgroup version in a script that must run on both.',
        real: 'Say which cgroup version your hosts use.'
      }),

      B.recap({
        id: 'm7-recap', n: 7, badge: 'Job Runner', color: '#BFDBFE',
        pts: [
          'Exit code above 128 is a **signal**: **137** is SIGKILL, **143** is SIGTERM.',
          'Over the memory limit: killed, **137**, `OOMKilled=true`, no output.',
          '`--cpus` is a quota. Python still saw **' + CP.cpus_0_5.cpu_count + '** CPUs. Read worker counts from a **setting**.',
          '`docker stop` sends SIGTERM to **process 1**. The **shell form** of CMD made a shell process 1: waited, then **' + sig('shell form (sh -c)')[3] + '**.',
          '`on-failure:N` for a job, `unless-stopped` for a service. Rotate logs. Containers run in **UTC** by default.'
        ],
        lines: [
          'I read an exit code and know what ended the job.',
          'I write CMD in the exec form and handle SIGTERM.',
          'I choose limits and restart policies on purpose.'
        ]
      })
    ]
  });
})();
