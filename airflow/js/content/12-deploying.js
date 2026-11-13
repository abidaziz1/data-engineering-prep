/* Mission 12: deploying. DAG bundles, images and dependencies, the cost of parsing, logging, and managed services.
   The start-up lines of the DAG processor and the parse timings are recorded from Apache Airflow 3.4.0 on one machine (airflow/verify/capture_af.py).
   Everything else is from the Airflow documentation of 3.4.0 (the DAG bundles page and the production deployment guide) and from public pages of managed services, found on 13 November 2026. I did not run Kubernetes, Celery or a managed service. */
(function () {
  var B = LAB.b, G = LAB.get;
  var PC = G.counts('af.parse_cost'), SU = G.counts('af.stack_startup');
  G.expect(PC.median_seconds['toplevel_slow.py'] > 1.9 && PC.median_seconds['light.py'] < 0.05, 'the recorded parse times');
  G.expect(SU['dag-processor'].some(function (l) { return /DAG bundles loaded: dags-folder/.test(l); }), 'the recorded DAG bundle line');

  var GITJSON = [
    '[',
    '  {',
    '    "name": "brewline-dags",',
    '    "classpath": "airflow.providers.git.bundles.git.GitDagBundle",',
    '    "kwargs": {',
    '      "git_conn_id": "brewline_git",',
    '      "subdir": "dags",',
    '      "tracking_ref": "main"',
    '    }',
    '  }',
    ']'
  ].join('\n');
  var GITBUG = GITJSON.replace('      "tracking_ref": "main"\n', '').replace('"subdir": "dags",', '"subdir": "dags"');
  var DOCKER_BUG = [
    'FROM python:3.12-slim',
    'RUN pip install apache-airflow apache-airflow-providers-standard apache-airflow-providers-http',
    'COPY dags/ /opt/airflow/dags/',
    'ENV AIRFLOW_HOME=/opt/airflow'
  ].join('\n');
  var DOCKER_FIX = [
    'FROM python:3.12-slim',
    'ARG AIRFLOW_VERSION=3.4.0',
    'ARG PYTHON_VERSION=3.12',
    'ARG CONSTRAINTS=https://raw.githubusercontent.com/apache/airflow/constraints-${AIRFLOW_VERSION}/constraints-${PYTHON_VERSION}.txt',
    'RUN pip install "apache-airflow==${AIRFLOW_VERSION}" apache-airflow-providers-http --constraint "${CONSTRAINTS}"',
    'COPY dags/ /opt/airflow/dags/',
    'ENV AIRFLOW_HOME=/opt/airflow'
  ].join('\n');

  function bundleLines() { return G.plain(SU['dag-processor'].join('\n'), { cmd: 'airflow dag-processor', d: 90 }); }

  LAB.addChapter({
    id: 'm12', n: 12, title: 'Deploying: bundles, images and managed services', short: 'Deploying', blurb: 'Get DAG files and packages to the right place, and choose where Airflow runs', minutes: 60,
    focus: ['ci'],
    goals: [
      'Say what a **DAG bundle** is, and which bundles **version** your code.',
      'Build an **image** with Airflow, providers and your packages **pinned** with the constraints file.',
      'Explain why **every part that runs your code** needs the files, and what top-level code costs at parse time.',
      'Plan **logging** and **configuration** for nodes that disappear.',
      'Compare **self-managed** Airflow with **managed services**, and name what each one changes.'
    ],
    say: 'Mission 12 is how code and packages reach the machines that run them. I recorded the lines where the DAG processor announces its DAG bundle, and I timed the parse of a light file and of a file that sleeps for two seconds. The rest comes from the documentation of Airflow 3.4.0 and from the public pages of managed services, which I looked up on 13 November 2026 and did not run.',
    scenes: [
      B.talk({
        id: 'm12-talk', t: 1, src: 'docs', title: 'Four things to deploy',
        say: 'Press Next for each. Teams that forget one of them find it at night.',
        items: [
          ['The DAG files', 'The code of your pipelines. Airflow reads it from a **DAG bundle**. The scheduler no longer holds the files itself: the **DAG processor** parses them, and **workers** import them to run a task. Every part that runs your code needs the right version of the files.', 'Files for the DAG processor and for the workers.'],
          ['The environment', 'The Python packages: Airflow, the providers, your libraries. They must be the **same** in every part, at versions that work together. Airflow publishes a constraints file for each release, and you install with it.', 'One set of packages, pinned.'],
          ['The platform', 'The processes and the database: scheduler, DAG processor, API server, triggerer, workers, and PostgreSQL or MySQL. This is what managed services run for you.', 'Who keeps the processes alive.'],
          ['Configuration and secrets', 'Settings, connections, the Fernet key and the signing keys. The production guide says to give sensitive settings, such as JWT signing keys, database credentials and Fernet keys, only to the parts that need them.', 'Least privilege for settings, too.']
        ],
        cols: 1
      }),

      B.flow({
        id: 'm12-flow', t: 1, src: 'docs', title: 'How a DAG change reaches production', g: 'deploy', legend: false,
        steps: [
          { say: 'This is the road that a DAG change takes. Press Next. The picture is a design from the documentation, and I did not run the services in it.', cap: 'Four steps, then three places to run.' },
          { say: 'Step 1. You edit DAGs on a laptop and run the tests of mission 10. A change that fails there never leaves the laptop.', on: ['e1'], focus: ['dev', 'git'], cap: 'Check before you push.' },
          { say: 'Step 2. The change goes to **Git** in a pull request. A person reviews it.', on: ['e2'], focus: ['git', 'ci'], cap: 'Review is part of the deploy.' },
          { say: 'Step 3. **CI** runs ruff, the import test in the production image, the unit tests and `dag.test()`. A red step stops the merge.', on: ['e3'], focus: ['ci', 'rel'], cap: 'Only checked code is released.' },
          { say: 'Step 4. A **release** becomes something Airflow can read: a new commit that a Git bundle tracks, files synced to a bucket, or a new image. The same files then run on any of three kinds of deployment.', on: ['e4a', 'e4b', 'e4c'], focus: ['rel', 'self', 'mgd', 'astro'], tags: ['tg_pick'], cap: 'Self-managed or managed. The DAG files are the same.' }
        ]
      }),

      B.term({
        id: 'm12-term', t: 1, src: 'rec', title: 'The DAG processor announces its bundle',
        say: 'These are the real first lines of the DAG processor of the recording. Look for the word "bundle".',
        lines: bundleLines,
        after: 'The DAG processor loaded a bundle called **`dags-folder`** and added it to the database. This is the **default**: Airflow adds a `LocalDagBundle` that points at the DAG folder, so a default installation behaves as Airflow 2 did. The recording set the intervals to 3 seconds. The line "Found 24 files for bundle" counts the files it parsed.',
        afterKind: 'tip',
        doneSay: 'Every DAG belongs to a bundle. The default bundle is a folder.'
      }),

      B.cmp({
        id: 'm12-bundles', t: 1, src: 'docs', title: 'The kinds of DAG bundle',
        say: 'A bundle is where Airflow reads DAG files from. Press Next to compare the common ones. The facts are from the documentation of Airflow 3.4.0 on DAG bundles.',
        cols: ['Bundle', 'Where the files are', 'Versioning', 'Use it for'],
        hl: 2,
        rows: [
          ['`LocalDagBundle` (the default)', 'A folder on disk, which you fill yourself.', 'No. Tasks always run with the latest code on disk.', 'Development, and simple setups that sync a folder.'],
          ['`GitDagBundle` (git provider)', 'A Git repository. You set `tracking_ref`: a branch, tag or commit.', 'Yes. A DAG run records the Git commit it was created with, and a rerun uses the same code.', 'Production, with a review and a history.'],
          ['`S3DagBundle`', 'A bucket in S3.', 'No. Tasks use the latest code in the bucket.', 'Teams that already deploy by copying to a bucket.'],
          ['A bundle for GCS', 'A bucket in Google Cloud Storage.', 'No. Tasks use the latest code in the bucket.', 'The same, on Google Cloud.']
        ],
        steps: [
          { upto: 1, say: 'The default is a folder. It is simple, and a change to a file is visible to the next task at once, even in the middle of a run.' },
          { upto: 2, say: 'A Git bundle is the one that versions your code. Each run keeps the commit it started with, so a rerun a week later uses the same code as the first run. This is also what makes DAG versions (mission 11) mean something.' },
          { upto: 4, say: 'The bucket bundles do not version. The documentation says tasks always run against the latest code. Weigh that before you pick one for production.' }
        ]
      }),

      B.code({
        id: 'm12-conf', t: 1, src: 'docs', title: 'Configuring a Git bundle', file: 'dag_bundle_config_list', lang: 'json', code: GITJSON,
        steps: [
          { say: 'Bundles are listed in the setting `[dag_processor] dag_bundle_config_list`, as JSON. This example is built from the documentation. I did not run it, because the Git provider was not installed in the recording.', lines: null },
          { say: 'A bundle has a **name** and a **classpath**. The classpath is the class that reads the files.', lines: G.span(GITJSON, /"name"/, /"classpath"/) },
          { say: '`kwargs` are the settings of that class. `git_conn_id` names an **Airflow connection** that holds the repository credentials, so no password is in the setting. `subdir` says which folder of the repository has the DAGs.', lines: G.span(GITJSON, /"git_conn_id"/, /"subdir"/) },
          { say: '`tracking_ref` is the **only required** setting for a Git bundle: a branch, a tag or a commit SHA. Here the bundle follows `main`.', lines: G.span(GITJSON, /"tracking_ref"/, /"tracking_ref"/) }
        ]
      }),

      B.widget({ id: 'm12-w-parse', kind: 'parse', t: 1, src: 'rec', title: 'Lab: what slow code at the top of a file costs' }),

      B.cmp({
        id: 'm12-parse', t: 1, src: 'rec', title: 'The parse timings of the recording',
        say: 'Press Next. I timed the import of two files with fresh parses. The light file is a DAG with one empty task. The other has `time.sleep(2)` at the top of the file.',
        cols: ['File', 'Median parse time', 'What it shows'],
        hl: 1,
        rows: [
          ['A light DAG file', (PC.median_seconds['light.py'] * 1000).toFixed(1) + ' ms', 'Parsing is cheap when the top of the file only defines the DAG.'],
          ['A file with `time.sleep(2)` at the top', PC.median_seconds['toplevel_slow.py'].toFixed(2) + ' s', 'Every parse pays the full two seconds. A call to an API or a database at the top would cost the same.'],
          ['100 light files in one parse', PC.hundred_files_seconds[0].toFixed(2) + ' s in total', 'Many light files are fine. The imports were already warm in this timing, so read it as a range.']
        ],
        steps: [
          { upto: 2, say: 'The DAG processor parses each file again and again. A slow file delays new versions of its own DAGs, and it ties up one of the parsing processes (' + G.cfg('dag_processor.parsing_processes') + ' by default).' },
          { upto: 3, say: 'The cost is per file and per parse. A thousand files that each wait two seconds need about a thousand seconds of parsing on two processes, as the lab showed. Keep the top of every file cheap.' }
        ],
        note: PC.note
      }),

      B.cmp({
        id: 'm12-where', t: 1, src: 'docs', title: 'Where to run Airflow',
        say: 'Press Next. Three kinds of deployment. The DAG files are the same. What changes is who runs the platform. I ran none of these, so for the managed services I rely on their public pages, which change often.',
        cols: ['Option', 'You manage', 'The service manages', 'Watch out for'],
        hl: 2,
        rows: [
          ['Self-managed on your own hosts or with Helm on Kubernetes', 'Everything: the processes, the database, the upgrades, the image, the logs.', 'Nothing.', 'Operating it is a job for someone. You choose the version and the day to upgrade.'],
          ['A cloud managed service: Amazon MWAA, Google Cloud Composer', 'Your DAGs, requirements and settings, inside the limits of the service.', 'The processes, the database, the scaling and the upgrades of its supported versions.', 'The service supports versions on its own timetable, and the newest Airflow may not be there yet. Some settings and plugins are limited.'],
          ['A vendor managed service: Astronomer', 'Your DAGs and your project, built into an image.', 'The platform and its release line, called Astro Runtime.', 'The Runtime is a vendor release of Airflow with its own numbering and Python versions.']
        ],
        steps: [
          { upto: 1, say: 'Self-managed gives you every choice and every task. It fits a team that has a platform group, or that needs the newest version at once.' },
          { upto: 3, say: 'Managed services remove the operation of the platform and add a version policy. When I looked on 13 November 2026, Amazon MWAA listed Airflow 3.3.1, the Composer release notes mentioned 3.2.2 for its generation 3, and Astro Runtime 3.3-2 was the newest Runtime I found. Airflow 3.4.0 had been released a week earlier and I did not find it on those pages. Check the pages before you plan.' }
        ]
      }),

      B.quiz({
        id: 'm12-q1', t: 1,
        q: 'Which DAG bundle records the Git commit of each DAG run, so that a rerun uses the same code?',
        opts: [
          { t: '`LocalDagBundle`', fb: 'It does not version. Tasks use the latest code on disk.' },
          { t: '`GitDagBundle`', fb: '' },
          { t: '`S3DagBundle`', fb: 'It does not version.' },
          { t: 'All of them', fb: 'Only the Git bundle versions in 3.4.0.' }
        ],
        ok: 1, why: 'The documentation says that `GitDagBundle` supports versioning: each DAG run records the commit it was created with. The folder and bucket bundles always run the latest code.'
      }),

      B.quiz({
        id: 'm12-q2', t: 1,
        q: 'Which bundle does a fresh Airflow 3.4.0 installation use?',
        opts: [
          { t: 'A Git bundle, tracking `main`', fb: 'That needs a provider and a configuration.' },
          { t: 'A `LocalDagBundle` that points at the DAG folder', fb: '' },
          { t: 'No bundle. Files are read from memory', fb: 'Every DAG belongs to a bundle.' },
          { t: 'An S3 bundle', fb: 'That needs a bucket and a connection.' }
        ],
        ok: 1, why: 'The recorded DAG processor log says: "DAG bundles loaded: dags-folder". The documentation says that Airflow adds a `LocalDagBundle` for the DAG folder by default, as in Airflow 2.'
      }),

      B.quiz({
        id: 'm12-q3', t: 1,
        q: 'You install Airflow with `pip install apache-airflow` in two images, a week apart. What can go wrong?',
        opts: [
          { t: 'Nothing: the same command gives the same result', fb: 'Dependencies move between the two days.' },
          { t: 'The images can contain different versions of dependencies, and Airflow may break', fb: '' },
          { t: 'pip refuses the second install', fb: 'It installs happily.' },
          { t: 'Airflow downgrades itself', fb: 'It does not.' }
        ],
        ok: 1, why: 'Airflow has many dependencies. Without a constraints file, pip picks the newest that it can, and two builds can differ. The project publishes a constraints file for each release and Python version, and the recording installed Airflow ' + G.meta('apache-airflow') + ' with it.'
      }),

      B.quiz({
        id: 'm12-q4', t: 1,
        q: 'Which database does the production guide say is only for testing?',
        opts: [
          { t: 'PostgreSQL', fb: 'A supported production database.' },
          { t: 'SQLite', fb: '' },
          { t: 'MySQL', fb: 'A supported production database.' },
          { t: 'None of them', fb: 'The guide names one.' }
        ],
        ok: 1, why: 'The guide says that the SQLite default is for testing, and that running it in production can lead to data loss in multiple scenarios. Use PostgreSQL or MySQL and run `airflow db migrate`, which is safe to run as often as you need.'
      }),

      B.quiz({
        id: 'm12-q5', t: 2,
        q: 'Why must the workers have the DAG files as well as the DAG processor?',
        opts: [
          { t: 'Airflow sends the DAG file to the worker with every task', fb: 'The production guide says that Airflow does not send DAG files.' },
          { t: 'Airflow sends only the instruction "run task X of DAG Y", and the worker imports its own copy of the files', fb: '' },
          { t: 'Workers read DAGs from the metadata database', fb: 'Tasks may not use the database in Airflow 3.' },
          { t: 'They do not need them', fb: 'A task cannot run without its code.' }
        ],
        ok: 1, why: 'The production guide says: Airflow sends simple instructions such as "execute task X of Dag Y", but does not send any DAG files or configuration. Every node needs the DAGs and the configuration for its role. That is what a DAG bundle is for.'
      }),

      B.quiz({
        id: 'm12-q6', t: 2,
        q: 'A pod of the Kubernetes executor writes its task log to its own disk and is deleted at the end of the task. Where is the log?',
        opts: [
          { t: 'Safe on the disk of the pod', fb: 'The pod and its disk are gone.' },
          { t: 'Gone, unless you configured remote log storage', fb: '' },
          { t: 'Always in the metadata database', fb: 'Logs are files, not rows.' },
          { t: 'In the scheduler\'s memory', fb: 'The scheduler does not keep logs of tasks.' }
        ],
        ok: 1, why: 'The production guide says that with disposable nodes you should configure log storage on a distributed file system such as S3 or GCS, or an external service. The setting `logging.remote_logging` is ' + G.cfg('logging.remote_logging') + ' by default. The guide also says that the logs appear in the remote store only after the task has finished.'
      }),

      B.quiz({
        id: 'm12-q7', t: 2,
        q: 'You deploy a new version of a DAG while a run is in the middle. The bundle is a `LocalDagBundle`. Which code does the rest of the run use?',
        opts: [
          { t: 'The code that the run started with', fb: 'That needs a versioned bundle.' },
          { t: 'The latest code on disk, so tasks of one run can see different code', fb: '' },
          { t: 'The run stops', fb: 'Nothing stops it.' },
          { t: 'Both versions, merged', fb: 'There is no merge.' }
        ],
        ok: 1, why: 'The documentation says that the local bundle does not support versioning, and that tasks always run with the latest code on disk. A Git bundle records the commit for the run, so the whole run uses one version.'
      }),

      B.quiz({
        id: 'm12-q8', t: 2,
        q: 'Brewline wants to use a feature of Airflow 3.4.0 that is not in 3.3. It runs on a managed service whose newest listed version is 3.3.1. What do you do?',
        opts: [
          { t: 'Write the DAG for 3.4 and deploy it. The service will cope', fb: 'A feature that is not in the running version fails at import or at run time.' },
          { t: 'Check which version the service offers, and wait, use another route, or self-manage, before you write the DAG', fb: '' },
          { t: 'Install Airflow 3.4.0 over the service\'s Airflow', fb: 'You cannot replace the platform of a managed service.' },
          { t: 'Ignore the version', fb: 'The running version decides what works.' }
        ],
        ok: 1, why: 'A managed service runs the versions that it supports. Airflow 3.4.0 was released on 6 November 2026, and the pages that I found a week later listed older versions. Check the page of your service, and test DAGs on the version that will run them.'
      }),

      B.bug({
        id: 'm12-bug1', t: 1, q: 'This image is rebuilt every week, and last week a rebuild broke the scheduler. Click the line that causes it.',
        file: 'Dockerfile', lang: 'bash', code: DOCKER_BUG, bad: [G.at(DOCKER_BUG, /pip install/)],
        hint: 'What fixes the versions of all the dependencies?',
        why: 'The command pins nothing, so each rebuild takes the newest versions of the dependencies, and one of them can break Airflow. Pin Airflow to a version and install with the constraints file that the project publishes for it and for your Python version.',
        fix: DOCKER_FIX,
        cheer: 'Pin Airflow, the providers and the dependencies together.'
      }),

      B.bug({
        id: 'm12-bug2', t: 2, q: 'The DAG processor reports an error for this bundle. Click the line to fix.',
        file: 'dag_bundle_config_list', lang: 'json', code: GITBUG, bad: [G.at(GITBUG, /"subdir"/)],
        hint: 'The documentation names one required setting for a Git bundle.',
        why: 'A Git bundle needs a `tracking_ref`: the branch, the tag or the commit that it follows. Without it the bundle does not know which code to read. Add `"tracking_ref": "main"` to the `kwargs`.',
        fix: GITJSON,
        cheer: 'A Git bundle must say what it tracks.'
      }),

      B.order({
        id: 'm12-ord', t: 1, q: 'Put a DAG change with a Git bundle in order, from the merge to the first run.',
        items: [
          'The change is merged into the branch that the bundle tracks',
          'The DAG processor fetches the new commit and parses the changed files',
          'The new DAG structure is stored as a new DAG version',
          'The scheduler creates the next run, which records the commit it was created with',
          'The tasks of that run use the code of that commit, even if a newer commit arrives later'
        ],
        why: 'The processor reads the new commit before the scheduler uses it. The run keeps the commit it started with, so a deploy in the middle of the run does not change its code.'
      }),

      B.decide({
        id: 'm12-dec', t: 2, src: 'docs', title: 'Decision: where does Brewline run Airflow?',
        scenario: 'Brewline is on AWS. Three engineers write DAGs, and none of them is a platform engineer. The DAGs need nothing newer than Airflow 3.2. The company has no Kubernetes cluster. Failed nights must be rare, and the bill should be predictable. Where does Airflow run?',
        opts: [
          { t: 'Self-managed on EC2 hosts that the engineers build', d: 'Every choice is yours, and any version works.', lose: 'The three engineers become the platform team: processes, the database, upgrades, logs and the nights when the scheduler stops. The feature that they would gain, a newer version, is one that they do not need.' },
          { t: 'A managed service on AWS, at a version that has the features they need', d: 'The platform, the database and its upgrades are the service\'s job. The engineers write DAGs and requirements.' },
          { t: 'Helm on a new Kubernetes cluster that they set up for Airflow', d: 'It scales and isolates tasks.', lose: 'They would learn and operate Kubernetes first, for 400 small tasks a night. The cluster is a bigger project than the pipeline.' }
        ],
        pick: 1,
        why: 'The deciding facts are the size of the team, the absence of a platform engineer and a version need that a managed service covers. The cost of operating the platform is the largest cost here.',
        when: 'Choose self-managed when you need a version or a setting that the service lacks, when you must run in your own network with full control, or when you have a platform team already.'
      }),

      B.incident({
        id: 'm12-inc', t: 2, src: 'docs', title: 'Incident: a run behaves differently halfway through', time: '03:50',
        alert: '**At 03:20 a deploy copied new DAG files to the shared folder while the nightly run was at its fourth task. The first three tasks ran the old code and the rest ran the new code. The result in the warehouse is a mix.**',
        clues: ['The bundle is a `LocalDagBundle` on the shared folder', 'The documentation says that a local bundle does not support versioning, and tasks always run the latest code on disk', 'The deploy script copies files during the run'],
        opts: [
          { t: 'Move to a versioned bundle such as a Git bundle, so that a run uses one commit. For now, rerun the run and deploy only between runs or while the DAG is draining', fb: '' },
          { t: 'Add retries to the tasks', fb: 'Retries repeat tasks on the new code. They do not make the code consistent.' },
          { t: 'Pause the DAG for ever', fb: 'It stops the pipeline.' },
          { t: 'Restart the workers after each deploy', fb: 'The shared folder is still read on the next task.' }
        ],
        best: 0,
        why: 'A local bundle has no versioning, so the code can change under a run. A Git bundle records the commit for each run. The draining state of Airflow 3.4 stops new scheduled runs while the running ones finish, which gives a safe window.',
        checks: [
          ['Repair', 'Rerun the run after the deploy. If the tasks are idempotent (mission 4), the rerun fixes the mix.'],
          ['Prevent', 'Use a versioned bundle, or deploy only when no run is active.'],
          ['Drain', 'A DAG can be set to draining before a deploy, so that no new run starts and the running ones finish.']
        ],
        tell: 'The local bundle has no versioning, so a deploy during the run changed the code under it. I reran the run, moved to a Git bundle that records the commit for each run, and made deploys wait for draining.',
        prevent: ['Use a **versioned bundle**, so each run records the code it ran', 'Deploy only in a **window that respects running runs**', 'Never change the files that a run is reading']
      }),

      B.talk({
        id: 'm12-ext', t: 3, src: 'rec', title: 'Extra: the knobs of the DAG processor',
        say: 'Press Next. These are the settings that decide how fast your files are read. The values are the defaults of Airflow 3.4.0 as the recording read them.',
        items: [
          ['How often', '`dag_processor.refresh_interval` is ' + G.cfg('dag_processor.refresh_interval') + ' seconds: how often the processor looks for new files and refreshes the bundle. `min_file_process_interval` is ' + G.cfg('dag_processor.min_file_process_interval') + ' seconds: a file is parsed at most that often. `bundle_refresh_check_interval` is ' + G.cfg('dag_processor.bundle_refresh_check_interval') + ' seconds.', 'A change can take minutes to show.'],
          ['How much', '`parsing_processes` is ' + G.cfg('dag_processor.parsing_processes') + ': the number of files parsed at the same time. More processes parse faster and use more memory and more database connections.', 'Size it for the number of files.'],
          ['How long', '`dagbag_import_timeout` is ' + G.cfg('core.dagbag_import_timeout') + ' seconds for one file, and `dag_file_processor_timeout` is ' + G.cfg('core.dag_file_processor_timeout') + ' seconds for the whole processing of a file. A file that is slower fails with a timeout, which is an import error in the UI.', 'Slow files end as errors.'],
          ['Stale DAGs', 'A DAG that disappeared from its file is marked stale after `stale_dag_threshold` (' + G.cfg('dag_processor.stale_dag_threshold') + ' seconds) without a parse. A short outage of the processor should not make DAGs vanish.', 'Know how long a DAG survives a missing file.']
        ],
        cols: 1
      }),

      B.qa({
        id: 'qa-deploy', t: 1, tag: 'Operations', secs: 75,
        q: 'How does a DAG change reach production in your setup, or how would you design it?',
        pts: ['Git, a pull request, CI checks', 'A release becomes a DAG bundle commit, a synced bucket or an image', 'DAG processor and workers need the same files', 'A staging run and a safe window'],
        short: 'The change goes through Git in a pull request, and CI runs ruff, the import test in the production image, the unit tests and `dag.test()`. After the merge, the files reach Airflow through a DAG bundle. I prefer a Git bundle, because it versions the code: each DAG run records the commit it was created with, so a rerun uses the same code and a deploy in the middle of a run does not change it.\n\nThe DAG processor needs the files to parse them, and the workers need them to run the task, because Airflow sends only the instruction "run task X of DAG Y". The packages come from an image that I build with the constraints file, so that every part has the same versions.\n\nI check a new version in staging first, and for a sensitive DAG I deploy while it is draining.',
        fu: [['What if you use a folder?', 'Then tasks run the latest code on disk. I deploy between runs.']],
        trap: 'Copying files to the folder by hand during the night.',
        real: 'Describe how a DAG change reaches production in your team today.'
      }),

      B.qa({
        id: 'qa-bundle', t: 2, tag: 'Airflow 3', secs: 75,
        q: 'What is a DAG bundle, and which would you use in production?',
        pts: ['A source of DAG files: folder, Git, S3, GCS', 'The default is a local folder bundle', 'Only the Git bundle versions the code', 'tracking_ref and a connection for credentials'],
        short: 'A DAG bundle is a source of DAG files that Airflow reads. The default is a local bundle that points at the DAG folder, which the recording showed as "dags-folder". There are also bundles for Git, S3 and GCS.\n\nThe important difference is versioning. According to the documentation the Git bundle supports it: each DAG run records the commit it was created with, so the whole run, and any rerun, uses the same code. The folder and bucket bundles do not version: tasks run with the latest code.\n\nIn production I use the Git bundle. I configure it with `dag_bundle_config_list`, with a `tracking_ref` for the branch or tag, a `subdir`, and a connection for the credentials so that no password is in the setting. The DAG processor and the workers both read the bundle.',
        fu: [['What is the only required setting of a Git bundle?', 'The tracking_ref.']],
        trap: 'Saying that the scheduler reads the files. The DAG processor does.',
        real: 'Say which bundle your deployment uses and whether you can rerun an old run with its old code.'
      }),

      B.qa({
        id: 'qa-image', t: 2, tag: 'Operations', secs: 60,
        q: 'How do you manage the Python dependencies of an Airflow deployment?',
        pts: ['One image for all parts, so that versions agree', 'Pin Airflow and install with the constraints file', 'Providers and your libraries pinned too', 'Test the image with the import test'],
        short: 'All the parts that run my code use the same image or the same set of packages, so that a DAG imports the same way in the DAG processor, in the workers and in CI. I pin Airflow to a version and install it with the constraints file that the project publishes for that version and my Python version, which keeps the many dependencies at versions that work together. The recording installed Airflow 3.4.0 that way.\n\nThe providers and my own libraries are pinned too, and I upgrade them on purpose, in a pull request, not by a rebuild that picks up whatever is newest. And I run the import test inside the final image, because a package that exists on a laptop and not in the image is how a DAG disappears from the UI.',
        fu: [['What about system libraries?', 'They go in the image too, and the image is tested.']],
        trap: 'Running pip install apache-airflow without a constraints file.',
        real: 'Say how your team pins Airflow and its providers.'
      }),

      B.qa({
        id: 'qa-managed', t: 2, tag: 'Design', secs: 75,
        q: 'Managed Airflow or self-managed: how do you choose?',
        pts: ['Who operates the platform: processes, database, upgrades', 'Version policy: managed services lag the newest Airflow', 'Limits: settings, plugins, network', 'Team size and needs'],
        short: 'The main question is who operates the platform. Self-managed means that my team runs the processes, the database, the upgrades, the image and the logs, and in return I choose any version and any setting. A managed service such as Amazon MWAA, Google Cloud Composer or Astronomer runs the platform, and I write DAGs and requirements inside its limits.\n\nThe trade-off is the version policy. When I looked on 13 November 2026, MWAA listed Airflow 3.3.1, Composer mentioned 3.2.2 and Astro Runtime 3.3-2 was the newest I found, and Airflow 3.4.0 was a week old. So a feature of the newest release may not be available yet, and I would check the service\'s page before I plan.\n\nFor a small team without platform engineers I choose managed, unless a version or a setting forces self-managed. I did not run any of them, so I would test on the real service.',
        fu: [['What do you lose with a managed service?', 'Some control: settings, plugins, network details and the pace of upgrades.']],
        trap: 'Assuming that a managed service always runs the newest Airflow.',
        real: 'Say where your Airflow runs and who is on call for the platform.'
      }),

      B.qa({
        id: 'qa-parsecost', t: 1, tag: 'Airflow', secs: 60,
        q: 'What does parsing cost, and how do you keep it low?',
        pts: ['The DAG processor imports every file again and again', 'Top-level code runs on every parse', 'Light files: milliseconds. A two-second sleep: two seconds on every parse', 'Keep the top level to imports and definitions'],
        short: 'The DAG processor imports every DAG file again and again, and everything at the top level of the file runs on every parse. In my recording a light DAG file took about two milliseconds, and a file with a two-second sleep at the top took two seconds on every parse. A call to an API or a database at the top costs the same.\n\nThat delays how fast new versions of the DAG appear, it ties up one of the parsing processes, and a file that exceeds the import timeout of 30 seconds shows an error. So I keep the top level to imports and the definition of the DAG and its tasks, and I move calls, reads and heavy imports into the tasks, where they run once per task instance on a worker.',
        fu: [['How do you find slow files?', 'The DAG processor logs the parse time of each file, and the timeouts cut off the worst ones.']],
        trap: 'Calling an API at the top to build the list of tasks. Use mapping instead.',
        real: 'Name the slowest DAG file in your repository and what it does at import time.'
      }),

      B.recap({
        id: 'm12-recap', n: 12, badge: 'Deployer', color: '#C7D2FE',
        pts: [
          'Deploy four things: the **DAG files**, the **environment** (pinned packages), the **platform** and the **configuration and secrets**.',
          'A **DAG bundle** is where Airflow reads DAG files. The default is a **local folder** with no versioning. The **Git bundle** records the commit of each run, so a rerun uses the same code.',
          'Airflow sends only "run task X of DAG Y". The **DAG processor and the workers** both need the files. Install Airflow with the **constraints file**, and use one image.',
          '**Parse cost**: top-level code runs on every parse. A two-second sleep cost two seconds each time in the recording. Keep the top level cheap.',
          '**Managed services** run the platform and follow their own version policy. On 13 November 2026 the ones I found were a version or two behind 3.4.0. Check the page before you plan.'
        ],
        lines: [
          'I can explain how a DAG change reaches production.',
          'I can pin an image with the constraints file.',
          'I can compare self-managed and managed Airflow.'
        ]
      })
    ]
  });
})();
