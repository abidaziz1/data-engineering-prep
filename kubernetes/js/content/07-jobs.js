/* Mission 7: Jobs and CronJobs. Every Job ran on a real cluster, and the numbers were counted while it ran. */
(function () {
  var B = LAB.b, G = LAB.get;
  var JL = G.file('job-loader.yaml'), JF = G.file('job-fail-onfailure.yaml'), CJ = G.file('cronjob-loader.yaml'), LO = G.file('app/load_orders.py');
  var NV = G.counts('job.never'), OF = G.counts('job.onfailure'), PA = G.counts('job.parallel'), DL = G.counts('job.deadline'), TT = G.counts('job.ttl'), CR = G.counts('job.cron'), RW = G.counts('sto.rows');
  var n = G.n;
  G.expect(NV.pods === NV.backoff_limit + 1 && NV.condition[1] === 'BackoffLimitExceeded' && NV.pod_status.join() === 'Error', 'a failing Job with restartPolicy Never and backoffLimit 2 makes three pods and fails with BackoffLimitExceeded');
  G.expect(OF.max_pods_seen === 1 && OF.max_restarts_seen >= 2 && OF.pods_left_after_failure === 0 && OF.condition[1] === 'BackoffLimitExceeded', 'with OnFailure one pod restarts, the Job fails, and no pod is left to read');
  G.expect(PA.peak_running === PA.parallelism && PA.succeeded === PA.completions, 'a Job with completions 4 and parallelism 2 runs two pods at a time and ends with four successes');
  G.expect(DL.condition[1] === 'DeadlineExceeded' && TT.deleted_by_the_cluster === true, 'the deadline ends the Job, and the ttl removes a finished Job');
  G.expect(CR.jobs_created >= 1 && CR.suspended === true && CR.manual_job_succeeded === true && CR.concurrency === 'Forbid', 'the CronJob made a Job on schedule, can be suspended, and a Job can be made from it by hand');
  G.expect(/the table now has 5000$/.test(G.text('job.cron_logs')), 'the scheduled load found the 5,000 orders already there and added none');

  LAB.addChapter({
    id: 'm7', n: 7, title: 'Jobs and CronJobs', short: 'Jobs', blurb: 'A pod that runs to the end, retries, and runs on a schedule', minutes: 18,
    focus: ['mart', 'mon'],
    goals: [
      'Run a **batch task** as a Job, not as a Deployment.',
      'Read **backoffLimit, restartPolicy, completions and parallelism**.',
      'Schedule a Job with a **CronJob**.',
      'Write a load that is **safe to run twice**.'
    ],
    say: 'A pipeline step is not a service. It should start, do its work, end, and tell you whether it worked. A Job is the object for that. We run the loader as a Job, break it five ways, and put it on a schedule.',
    scenes: [
      B.flow({
        id: 'm7-flow', t: 1, src: 'docs', title: 'A CronJob, a Job and a pod', g: 'jobs', legend: true,
        steps: [
          { say: 'Three objects, one on top of the next. Press Next.', focus: ['cron', 'job', 'pod', 'pg'], cap: 'A schedule, a task, a pod.' },
          { say: 'Step 1. A **CronJob** makes a Job at the times of its schedule, like `0 2 * * *` for two o\'clock every night.', on: ['e1'], focus: ['cron', 'job'], cap: 'The CronJob makes a Job.' },
          { say: 'Step 2. The **Job** makes a pod and counts how many pods have ended well. It wants a number of successes, and one is the default.', on: ['e2'], focus: ['job', 'pod'], cap: 'The Job makes a pod.' },
          { say: 'Step 3. The pod runs the loader, which writes into the database and exits.', on: ['e3'], focus: ['pod', 'pg'], cap: 'The pod does the work.' },
          { say: 'Step 4. The pod ends, and the Job looks at the result. If it failed, the Job starts **another pod**, up to `backoffLimit` times.', on: ['e4'], focus: ['pod', 'job'], tags: ['tg_retry'], cap: 'A failure starts a new try.' },
          { say: 'A finished Job stays, with its pods and logs, until you delete it or until a **time to live** that you set removes it.', focus: ['job'], tags: ['tg_ttl'], cap: 'The cluster can clean up.' }
        ]
      }),

      B.code({
        id: 'm7-yaml', t: 1, src: 'rec', title: 'The loader as a Job', file: 'job-loader.yaml', lang: 'yaml', code: JL,
        steps: [
          { say: 'The Job that put the 5,000 orders into Postgres in mission 6. Press Next.', lines: null },
          { say: '`backoffLimit: 2` allows two retries after the first failure, so at most three pods.', lines: G.span(JL, /backoffLimit/) },
          { say: '`restartPolicy: Never` is required for a Job: `Always` is not allowed, because a Job must be able to end. With Never, a failed container is not restarted. A new **pod** is made instead.', lines: G.span(JL, /restartPolicy/) },
          { say: 'The image is the one built from the Dockerfile of the Docker course, with the loader in it. The command runs the loader on the file.', lines: G.span(JL, /image:/, /args:/) },
          { say: 'The database address is a Service name, `pg`, as mission 4 showed. The password would come from a Secret in a real setup.', lines: G.span(JL, /env:/, /value:/) },
          { say: 'The orders come in as a file from a ConfigMap, mounted read-only. Mission 5 showed the limit of 1 MiB.', lines: G.span(JL, /volumeMounts:/, /readOnly/) }
        ],
        note: 'The image `brewline/loader:1` was built on the machine and copied into the cluster, because the sandbox has no registry. A real cluster pulls it from a registry.'
      }),

      B.code({
        id: 'm7-loader', t: 1, src: 'rec', title: 'A loader that is safe to run twice', file: 'app/load_orders.py', lang: 'python', code: LO,
        steps: [
          { say: 'A Job can run more than once: a retry, a second schedule, a person who runs it again. The loader must cope. Press Next.', lines: null },
          { say: '`CREATE TABLE IF NOT EXISTS` makes the table only when it is not there.', lines: G.span(LO, /CREATE TABLE IF NOT EXISTS/) },
          { say: '`ON CONFLICT (order_id) DO NOTHING` skips a row that already exists. The order id is the primary key.', lines: G.span(LO, /ON CONFLICT/) },
          { say: 'The last line prints how many rows were read and how many the table holds.', lines: G.span(LO, /total = /, /print/) }
        ],
        note: 'A scheduled load ran later on this cluster, with the 5,000 orders already in the table. Its log said: "' + G.text('job.cron_logs') + '". It read 5,000 rows and added none.'
      }),

      B.widget({ id: 'm7-lab', kind: 'jobs', t: 1, src: 'rec', title: 'Lab: five Jobs, five behaviours' }),

      B.term({
        id: 'm7-never', t: 1, src: 'rec', title: 'A Job that fails, with restartPolicy Never',
        say: 'The program prints a line and exits with 1. `backoffLimit` is 2.',
        lines: function () {
          return G.term([
            ['kubectl apply -f job-fail-never.yaml', 'job.batch/fail-never created'],
            ['kubectl get pods -l job-name=fail-never --no-headers | wc -l   # when the Job has failed', String(NV.pods)],
            ['kubectl get pods -l job-name=fail-never -o jsonpath="{.items[*].status.containerStatuses[0].state.terminated.reason}"', NV.pod_status.join(' ') + '  (' + NV.pods + ' pods)'],
            ['kubectl get job fail-never -o jsonpath="{.status.conditions[?(@.type==\\"Failed\\")].reason}"', NV.condition[1]]
          ]);
        },
        after: 'The Job made **' + NV.pods + ' pods**: the first run and **' + NV.backoff_limit + ' retries**. All ended in `' + NV.pod_status.join(', ') + '`, and the Job got the condition **' + NV.condition[0] + '** with the reason **' + NV.condition[1] + '**. The failed pods stay, so you can read the log of **every** attempt. Retries wait longer each time, as with a crash loop.',
        afterKind: 'tip',
        doneSay: 'A failed pod is replaced by a new pod, up to backoffLimit.'
      }),

      B.term({
        id: 'm7-onfailure', t: 1, src: 'rec', title: 'The same Job with restartPolicy OnFailure',
        say: 'One word changed: `OnFailure`. I counted the pods and the restarts while the Job ran.',
        lines: function () {
          return G.term([
            ['kubectl apply -f job-fail-onfailure.yaml', 'job.batch/fail-onfailure created'],
            ['kubectl get pods -l job-name=fail-onfailure   # the most pods at one time', String(OF.max_pods_seen) + ' pod'],
            ['kubectl get pods ... restartCount   # the highest value that I saw', String(OF.max_restarts_seen)],
            ['kubectl get job fail-onfailure -o jsonpath="{.status.conditions[?(@.type==\\"Failed\\")].reason}"', OF.condition[1]],
            ['kubectl get pods -l job-name=fail-onfailure --no-headers | wc -l   # after the failure', String(OF.pods_left_after_failure)]
          ]);
        },
        after: 'Now the **same pod** restarts its container: one pod, and a restart count that reached **' + OF.max_restarts_seen + '**. When the limit was reached the Job failed with the same reason, and then it **removed the pod**: **' + OF.pods_left_after_failure + '** pods were left, so the log was gone. The choice is a trade: OnFailure keeps the pod count low, and Never keeps the evidence. For a pipeline step I choose **Never**, so that the log of every failure is still there.',
        afterKind: 'warn',
        doneSay: 'OnFailure restarts the container, and a failed Job removes its pod and log.'
      }),

      B.term({
        id: 'm7-parallel', t: 1, src: 'rec', title: 'Many pods for one Job',
        say: 'Four parts of work, two pods at a time: `completions: 4` and `parallelism: 2`. Each part sleeps four seconds. I counted the running pods every 0.4 seconds.',
        lines: function () {
          return G.term([
            ['kubectl apply -f job-parallel.yaml', 'job.batch/parallel created'],
            ['kubectl get pods -l job-name=parallel   # the most Running at one time', String(PA.peak_running)],
            ['kubectl get job parallel', G.text('job.parallel_get')]
          ]);
        },
        after: 'The Job kept **' + PA.peak_running + '** pods running and never more, until **' + PA.succeeded + '** had succeeded. This is how you split a backfill into parts. Each pod must know its part, which is what an **indexed Job** (`completionMode: Indexed`) gives: a number for each pod. That mode was not run here.',
        afterKind: 'tip',
        doneSay: 'completions is how many successes, parallelism is how many at once.'
      }),

      B.term({
        id: 'm7-deadline', t: 1, src: 'rec', title: 'A deadline, and a Job that cleans up',
        say: 'Two more settings. A Job that needs 60 seconds has a deadline of 5. A Job that finishes at once has a time to live of 5 seconds.',
        lines: function () {
          return G.term([
            ['kubectl apply -f job-deadline.yaml', 'job.batch/deadline created'],
            ['kubectl get job deadline -o jsonpath="{.status.conditions[?(@.type==\\"Failed\\")].reason}"', DL.condition[1]],
            ['kubectl apply -f job-ttl.yaml', 'job.batch/ttl created'],
            ['kubectl get job ttl   # about ' + TT.ttl_seconds + ' seconds after it finished', TT.deleted_by_the_cluster ? 'Error from server (NotFound): jobs.batch "ttl" not found' : 'still there']
          ]);
        },
        after: '`activeDeadlineSeconds` ends the Job with **' + DL.condition[1] + '** whatever the pods are doing, even though `backoffLimit` is 6 and was not used up. It is the guard against a job that hangs. `ttlSecondsAfterFinished` makes the cluster **delete** the finished Job and its pods: the Job was gone ' + TT.ttl_seconds + ' seconds after it ended, and its log went with it. Ship the logs somewhere before the time to live runs out.',
        afterKind: 'tip',
        doneSay: 'A deadline stops a hanging job. A time to live cleans up after a finished one.'
      }),

      B.code({
        id: 'm7-cron', t: 1, src: 'rec', title: 'The CronJob', file: 'cronjob-loader.yaml', lang: 'yaml', code: CJ,
        steps: [
          { say: 'The same loader on a schedule. For the recording the schedule is every minute. A real nightly load would be `0 2 * * *`. Press Next.', lines: null },
          { say: '`schedule` is a cron expression: minute, hour, day of month, month, day of week. The time zone is that of the control plane, unless you set `timeZone`.', lines: G.span(CJ, /schedule:/) },
          { say: '`concurrencyPolicy: Forbid` skips a run while the last one is still going. `Allow` would start a second Job at the same time, and `Replace` would stop the first.', lines: G.span(CJ, /concurrencyPolicy/) },
          { say: 'How many finished Jobs to keep, for the ones that worked and the ones that failed. Older ones are removed.', lines: G.span(CJ, /successfulJobsHistoryLimit/, /failedJobsHistoryLimit/) },
          { say: '`jobTemplate` is a Job, just as in the file at the start of this mission.', lines: G.span(CJ, /jobTemplate:/, /backoffLimit/) }
        ],
        note: 'In a cluster the CronJob runs in the time of the control plane. Daylight saving changes and a missed window (a control plane that was down) are the usual surprises.'
      }),

      B.term({
        id: 'm7-croncli', t: 1, src: 'rec', title: 'The CronJob on the cluster',
        say: 'I applied it, waited for the first minute, and read what it made. Then I suspended it and made a Job from it by hand.',
        lines: function () {
          return G.term([
            ['kubectl apply -f cronjob-loader.yaml', 'cronjob.batch/nightly created'],
            ['kubectl get cronjob', G.text('job.cron_get')],
            ['kubectl get jobs   # after the first minute', 'nightly-<number>   (' + CR.jobs_created + ' Job made by the schedule)'],
            ['kubectl logs job/nightly-<number>', G.text('job.cron_logs')],
            ['kubectl patch cronjob nightly -p \'{"spec":{"suspend":true}}\'', 'cronjob.batch/nightly patched'],
            ['kubectl create job manual --from=cronjob/nightly', G.text('job.manual')]
          ]);
        },
        after: 'The schedule made a Job whose name is the name of the CronJob and a number taken from the time. The loader found the **5,000 orders already there** and added none: the load is **idempotent**. `suspend: true` stops new runs without deleting anything, and `kubectl create job --from` runs the same template **now**, which is how you re-run a night by hand.',
        afterKind: 'tip',
        doneSay: 'A CronJob makes Jobs. Suspend stops it, and create job --from runs it now.'
      }),

      B.cmp({
        id: 'm7-airflow', t: 2, src: 'docs', title: 'A CronJob or an orchestrator',
        say: 'A CronJob starts a pod on a clock. Whether that is enough depends on what else you need. Press Next.',
        cols: ['You need', 'CronJob', 'Airflow, Dagster or similar'],
        hl: 2,
        rows: [
          ['One task at a fixed time', 'Fits. A few lines of YAML.', 'More than you need.'],
          ['Step B after step A, with the data of A', 'No: there is no dependency between Jobs.', 'A DAG of tasks, with retries for each.'],
          ['Re-run the days that failed last week', 'By hand, one `create job --from` at a time.', 'A backfill for a range of dates, from the UI or the CLI.'],
          ['A view of what ran and what failed', '`kubectl get jobs` and your logs.', 'A web UI with history, logs and alerts.'],
          ['Run every task as a pod', 'Yes, by design.', 'Yes, with the Kubernetes executor or the pod operator.']
        ],
        steps: [
          { upto: 2, say: 'One step at a clock time is the CronJob case. Once there are two steps that depend on each other, you start to build an orchestrator by hand.' },
          { upto: 5, say: 'Orchestrators often run their tasks as pods on the cluster, so they sit on top of what this mission shows. The Airflow course covers one. This table is from documentation: no orchestrator ran on this cluster.' }
        ]
      }),

      B.bug({
        id: 'm7-bug', t: 1, q: 'The team wants to read the log of **every** failed attempt of this Job. After a failure there are no pods and no logs. Click the line that is why.',
        file: 'job-fail-onfailure.yaml', lang: 'yaml', code: JF, bad: [G.at(JF, /restartPolicy/)],
        hint: 'Which setting decides whether a failure restarts the container or starts a new pod?',
        why: '`OnFailure` restarts the container in the same pod. When the limit is reached, the Job fails and **removes the pod**, and the log goes with it. The recording left ' + OF.pods_left_after_failure + ' pods. With `Never` each attempt is a pod of its own and every one stays: ' + NV.pods + ' pods in the other recording.',
        fix: JF.replace('restartPolicy: OnFailure', 'restartPolicy: Never'),
        cheer: 'Choose Never when you want the evidence.'
      }),

      B.order({
        id: 'm7-ord', t: 1, q: 'Put in order what happens when a Job with `backoffLimit: 2` and `restartPolicy: Never` runs a program that always fails.',
        items: [
          'The Job creates the first pod',
          'The program exits with 1 and the pod ends as Error',
          'The Job counts one failure and creates a second pod, after a wait',
          'The second pod fails, and the Job creates a third pod',
          'The third pod fails, and the limit is reached',
          'The Job gets the condition Failed with the reason BackoffLimitExceeded'
        ],
        why: 'The first run plus two retries make three pods. The recording had ' + NV.pods + ' pods, all in ' + NV.pod_status.join(', ') + ', and the reason ' + NV.condition[1] + '.'
      }),

      B.quiz({
        id: 'm7-q1', t: 1,
        q: 'A Job has `backoffLimit: 2` and `restartPolicy: Never`, and its program always fails. How many pods does it create?',
        opts: [
          { t: '3: the first run and two retries', fb: '' },
          { t: '2: the limit', fb: 'The limit counts the retries, and the first run comes on top.' },
          { t: '1: a Job never retries', fb: 'It retries up to the limit.' },
          { t: 'As many as it takes until it works', fb: 'The limit stops it.' }
        ],
        ok: 0, why: 'The recording: ' + NV.pods + ' pods, then ' + NV.condition[1] + '.'
      }),

      B.quiz({
        id: 'm7-q2', t: 1,
        q: 'A nightly load is started by a CronJob twice for the same night, because of a retry. What protects the data?',
        opts: [
          { t: 'A load that is idempotent: a second run changes nothing', fb: '' },
          { t: 'The CronJob never runs twice', fb: 'Retries and manual runs happen.' },
          { t: 'The cluster removes duplicate rows', fb: 'The cluster knows nothing about your rows.' },
          { t: 'A bigger backoffLimit', fb: 'That makes more retries, not safer ones.' }
        ],
        ok: 0, why: 'In the recording a scheduled run read 5,000 rows into a table that already held them, and the table still had 5,000.'
      }),

      B.quiz({
        id: 'm7-q3', t: 2,
        q: 'A Job hangs: the pod runs for hours and never fails. Which setting ends it?',
        opts: [
          { t: '`activeDeadlineSeconds`', fb: '' },
          { t: '`backoffLimit`', fb: 'It counts failures. A hanging pod does not fail.' },
          { t: '`ttlSecondsAfterFinished`', fb: 'It acts after the Job has finished.' },
          { t: '`parallelism`', fb: 'It sets how many pods run at once.' }
        ],
        ok: 0, why: 'The recorded Job needed 60 seconds under a deadline of 5, and ended with ' + DL.condition[1] + '.'
      }),

      B.decide({
        id: 'm7-dec', t: 2, src: 'docs', title: 'Decision: how do you run the nightly order load?',
        scenario: 'The load runs at 02:00, takes 10 minutes, and must finish before the 06:00 report. It is one step today, and a second step (build the daily summary) is planned. The team of two already runs the cluster and has no orchestrator.',
        opts: [
          { t: 'A CronJob that runs the loader', d: 'It starts in minutes, and you already know how to run it. `concurrencyPolicy: Forbid` and a deadline give basic safety.', lose: 'The second step has no way to wait for the first, and nobody sees a missed night unless an alert exists.' },
          { t: 'Adopt an orchestrator now and run the load as one of its tasks', d: 'Dependencies, backfills and a UI come with it.', lose: 'A new system to install, secure and learn, for a pipeline that has one step today.' },
          { t: 'A Deployment with a loop and a sleep of 24 hours', d: 'No Job objects.', lose: 'A pod that never ends, no record of runs, no retries, and drift of the time.' }
        ],
        pick: 0,
        why: 'One step and a small team: a CronJob is enough, with an alert on failed Jobs. When the second step arrives and depends on the first, that is the moment to move to an orchestrator, and the Job manifest moves with it.',
        when: 'Choose the orchestrator at once if there are already several dependent steps, backfills, or many pipelines.'
      }),

      B.incident({
        id: 'm7-inc', t: 2, src: 'rec', title: 'Incident: the nightly load ran twice', time: '03:10',
        alert: '**Two Jobs of the nightly load are listed for 02:00.** The first one failed on a database timeout and was retried. The second was started by a person, who did not know that the retry existed.',
        clues: ['`kubectl get jobs` shows `nightly-...` and a `manual-...` Job', 'The loader uses `INSERT ... ON CONFLICT (order_id) DO NOTHING`', 'The report at 06:00 shows the right totals'],
        opts: [
          { t: 'Nothing to repair: the loader is idempotent. Add `concurrencyPolicy: Forbid` and an alert so that two runs cannot overlap unnoticed', fb: '' },
          { t: 'Delete the rows that were loaded last night and load again', fb: 'The data is right, and a delete adds risk.' },
          { t: 'Remove the CronJob and run the load by hand every night', fb: 'That makes the problem worse.' },
          { t: 'Set `backoffLimit` to 0 so that no retry happens', fb: 'A retry after a timeout is useful. The loader copes with it.' }
        ],
        best: 0,
        why: 'The loader skips rows that exist, so a second run changes nothing. The recording showed it: a scheduled run read 5,000 rows into a table that already had 5,000 and left it at 5,000. The gap is that two runs could overlap, so the Forbid policy and an alert are the fix.',
        checks: [
          ['Compare the counts', 'Row counts before and after the second run.'],
          ['Check the loader', 'Is the write idempotent: a key, and ON CONFLICT or a MERGE?'],
          ['Limit overlap', '`concurrencyPolicy: Forbid`, so a second run waits or is skipped.'],
          ['Prevent', 'Alert on failed Jobs, and one place to start a manual run that checks for a running one.']
        ],
        tell: 'The nightly load ran twice because a retry and a manual run overlapped. No data was harmed, because the loader is idempotent: it skips rows that already exist. To avoid overlap I set concurrencyPolicy to Forbid and added an alert on failed Jobs.',
        prevent: ['Write loads that are **idempotent**', '**concurrencyPolicy: Forbid** for jobs that must not overlap', 'An **alert on failed Jobs** and a deadline for hanging ones']
      }),

      B.qa({
        id: 'qa-job', t: 1, tag: 'Kubernetes', secs: 75,
        q: 'What is a Job, and how does it differ from a Deployment?',
        pts: ['A Job runs a pod to completion', 'A Deployment keeps pods running for ever', 'A Job retries failures up to backoffLimit', 'restartPolicy must be Never or OnFailure'],
        short: 'A Deployment keeps a service running: if its pods end, it starts new ones. A Job runs a task to the end: it creates a pod, waits for it to succeed, and ends. If the pod fails, the Job starts another, up to `backoffLimit`, and then it is marked Failed. In the recording a program that always failed, with backoffLimit 2, made three pods and the reason BackoffLimitExceeded. The restart policy must be Never or OnFailure. I use Never for pipeline steps, so that the log of each failed attempt stays. For work in parts I use `completions` and `parallelism`.',
        fu: [['What does OnFailure do differently?', 'It restarts the container in the same pod, and a failed Job removes the pod with its log. In the recording ' + OF.pods_left_after_failure + ' pods were left.'], ['How do you stop a Job that hangs?', '`activeDeadlineSeconds`. The recorded Job ended with ' + DL.condition[1] + '.']],
        trap: 'Running a batch task as a Deployment, which restarts it for ever.',
        real: 'Describe a batch step that you ran as a Job.'
      }),

      B.qa({
        id: 'qa-cron', t: 1, tag: 'Kubernetes', secs: 75,
        q: 'How do you run a pipeline step every night on Kubernetes, and what can go wrong?',
        pts: ['A CronJob with a schedule and a job template', 'concurrencyPolicy for overlap, a deadline for hangs', 'The load must be idempotent', 'Watch failed Jobs: nobody looks at a quiet failure'],
        short: 'A CronJob with the schedule and the Job template. I set `concurrencyPolicy: Forbid` so that two runs cannot overlap, `activeDeadlineSeconds` so that a hang ends, and a history limit so that old Jobs are removed. The load has to be idempotent, because retries and manual runs happen: in the recording a scheduled run found all 5,000 orders already in the table and added none. What goes wrong is silence: a CronJob that fails every night shows only in `kubectl get jobs`, so I alert on failed Jobs. If steps depend on each other I move to an orchestrator.',
        fu: [['How do you run a night again?', '`kubectl create job --from=cronjob/NAME`. It worked in the recording.'], ['What about the time zone?', 'The control plane time, unless `timeZone` is set. From documentation.']],
        trap: 'A CronJob with no alert, and a load that is not safe to run twice.',
        real: 'Describe how you find out that a scheduled job failed.'
      }),

      B.qa({
        id: 'qa-idem', t: 2, tag: 'Pipelines', secs: 60,
        q: 'Why does a load that runs in a Job have to be idempotent?',
        pts: ['Jobs retry after a failure', 'Schedules and people run them again', 'Kubernetes gives at-least-once, not exactly-once', 'Use keys and ON CONFLICT or MERGE, or write a partition'],
        short: 'Because a Job runs at least once, and not exactly once. A pod that fails is retried, a schedule can fire twice, and a person can run it by hand. A load that adds rows blindly would then double the data. So I give the target a key and write with `ON CONFLICT DO NOTHING` or a MERGE, or I replace a whole partition. The loader of the recording does the first, and a second run on the same file read 5,000 rows and left the table at 5,000. That makes retries safe, which means I can use a high backoffLimit without fear.',
        fu: [['What if the source changes between runs?', 'Then use DO UPDATE or a MERGE, so that the newer values win. From documentation.'], ['How is a partition replace idempotent?', 'The run deletes and writes the same partition, so the result is the same however often it runs.']],
        trap: 'Appending without a key.',
        real: 'Describe a load of yours that is safe to re-run, and how.'
      }),

      B.qa({
        id: 'qa-indexed', t: 3, tag: 'Kubernetes', secs: 60,
        q: 'How do you split a backfill of 90 days across pods?',
        pts: ['An indexed Job: completionMode Indexed, completions 90, parallelism N', 'Each pod gets its number in an environment variable and a file name', 'The pod turns its number into a date or a range', 'Make each part idempotent, and set a backoffLimit per index'],
        short: 'With an indexed Job: `completionMode: Indexed`, `completions: 90` and a `parallelism` that the database can take. Kubernetes gives each pod an index from 0 to 89 in the variable `JOB_COMPLETION_INDEX`, and the program turns it into a day, a partition or a range of keys. A pod that fails is retried with the same index, so each part must be idempotent, which the loader of the recording was. I set `backoffLimit` per index with `backoffLimitPerIndex` where it exists, and a deadline for the whole Job. The recording ran the plain form, with completions 4 and parallelism 2, and the pods ran two at a time. The indexed mode itself was not run.',
        fu: [['How do you stop it from overloading the database?', 'Keep parallelism small and use a connection limit. From documentation.'], ['When would you use an orchestrator instead?', 'When the parts have dependencies, or you want backfills with a UI. Mission 7 compared the two.']],
        trap: 'Starting 90 pods at once against one database.',
        real: 'Describe how you split a large backfill.'
      }),

      B.recap({
        id: 'm7-recap', n: 7, badge: 'Job Scheduler', color: '#FBCFE8',
        pts: [
          'A **Job** runs a pod to the end. A **CronJob** makes Jobs on a schedule.',
          '`backoffLimit: ' + NV.backoff_limit + '` with `Never` made **' + NV.pods + '** pods and the reason **' + NV.condition[1] + '**. With `OnFailure` the pod and its log were gone.',
          '`completions` and `parallelism`: ' + PA.completions + ' parts, ' + PA.peak_running + ' at a time. `activeDeadlineSeconds` stops a hang. `ttlSecondsAfterFinished` cleans up.',
          '**Idempotent** loads: a scheduled run added nothing to the 5,000 orders that were there.',
          'A CronJob fits one step on a clock. **Dependencies** call for an orchestrator.'
        ],
        lines: [
          'I run batch steps as Jobs, with Never.',
          'I write loads that are safe to run twice.',
          'I set a deadline, an overlap policy and an alert.'
        ]
      })
    ]
  });
})();
