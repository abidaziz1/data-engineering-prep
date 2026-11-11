/* Mission 14: run the platform as code. Terraform and its plan, a scan of the files, a delivery pipeline, alerts on freshness and lag, who spent what, and recovery from a lost region.
   Real here: Checkov scanned a Terraform file for Google Cloud (the lab adds up the recorded single fixes), check-jsonschema checked a Cloud Build file and a GitHub Actions workflow against
   their schemas, DuckDB ran the cost query on a MADE-UP job log that has the columns the query reads, and gcloud and bq help pages showed that the flags in the lessons exist.
   Not real: Terraform itself was never run, no build ran in Cloud Build or GitHub, no alert fired, no budget was created. Cloud Logging, Monitoring, billing and budgets are described from
   documentation, which changes: check names and limits in the current reference. */
(function () {
  var B = LAB.b, G = LAB.get;
  var CK = G.counts('tf.checkov'), CKT = G.table('tf.checks'), CI = G.counts('ci.summary'), CB = G.file('ci/cloudbuild.yaml'), TF = G.file('iac/main.tf');
  var COST = G.table('sql.cost_by_label'), CW = G.counts('sql.cost_world'), COSTSQL = G.file('sql/cost_by_label.sql'), W0 = G.counts('sql.world');
  var CBOK = G.file('ci/validate_cloudbuild_ok.txt'), CBBAD = G.file('ci/validate_cloudbuild_bad.txt'), FL = G.table('cli.flags');
  G.expect(CK.baseline.failed_count === 11 && CK.baseline.passed === 3 && CK.all_fixed.failed_count === 0 && CK.all_fixed.passed === 15, 'the Checkov counts');
  G.expect(/allAuthenticatedUsers/.test(TF) && /roles\/owner/.test(TF) && /google_pubsub_topic/.test(TF), 'the Terraform file has the gaps that the lessons name');
  G.expect(CI.cloudbuild_ok.exit_code === 0 && CI.cloudbuild_bad.exit_code === 1 && CI.cloudbuild.step_ids.join() === 'unit-tests,sql-compile,terraform-checks,deploy-dags' && CI.cloudbuild.timeout === '900s', 'the Cloud Build file');
  G.expect(COST.rows.length === 3 && COST.rows[0][0] === 'dashboard_refresh' && COST.rows[1][0] === '(no label)' && COST.rows[2][0] === 'daily_orders' && CW.jobs === 763, 'the cost table');
  G.expect(CW.billed_bytes_per_job.dashboard_refresh < CW.billed_bytes_per_job['analysts, SELECT *'] && CW.runs_per_day.dashboard_refresh === 96, 'the made-up job log');
  var flagRow = function (cmd) { return FL.rows.filter(function (r) { return r[0] === cmd; })[0]; };
  G.expect(['gcloud billing budgets create', 'gcloud logging metrics create', 'gcloud monitoring policies create', 'gcloud storage rsync'].every(function (c) { return flagRow(c) && flagRow(c)[2] === '-'; }), 'the budget, metric, policy and rsync flags exist');
  var n0 = function (x) { return x.toLocaleString('en-US'); };
  var usd = function (x) { return '$' + x.toFixed(2); };
  var GIB = function (b) { return (b / 1024 / 1024 / 1024).toFixed(2) + ' GiB'; };
  function wrap(t, n) {
    return t.split('\n').reduce(function (a, l) {
      while (l.length > n) { var cut = l.lastIndexOf(' ', n); if (cut < 40) cut = n; a.push(l.slice(0, cut)); l = '    ' + l.slice(cut).trim(); }
      a.push(l); return a;
    }, []).join('\n');
  }
  function term(txt, cmd) { return G.plain(wrap(txt.replace(/ -- /g, ' - '), 92), { cmd: cmd, d: 90 }); }

  var METRIC = [
    'gcloud logging metrics create dataflow_errors \\',
    '  --description="Error lines of the orders-stream Dataflow job" \\',
    '  --log-filter=\'resource.type="dataflow_step" AND resource.labels.job_name:"orders-stream" AND severity>=ERROR\'',
    '',
    'gcloud monitoring policies create \\',
    '  --policy-from-file=orders_lag_policy.json'
  ].join('\n');
  var POLICY = [
    '{',
    '  "displayName": "Orders stream is behind",',
    '  "combiner": "OR",',
    '  "conditions": [',
    '    {',
    '      "displayName": "Oldest unacked message is older than 5 minutes",',
    '      "conditionThreshold": {',
    '        "filter": "resource.type = \\"pubsub_subscription\\" AND resource.labels.subscription_id = \\"orders-to-df\\" AND metric.type = \\"pubsub.googleapis.com/subscription/oldest_unacked_message_age\\"",',
    '        "comparison": "COMPARISON_GT",',
    '        "thresholdValue": 300,',
    '        "duration": "300s",',
    '        "aggregations": [{ "alignmentPeriod": "60s", "perSeriesAligner": "ALIGN_MAX" }]',
    '      }',
    '    }',
    '  ],',
    '  "notificationChannels": ["projects/brewline-dev/notificationChannels/1234567890"],',
    '  "documentation": {',
    '    "mimeType": "text/markdown",',
    '    "content": "Runbook: open the Dataflow job logs, then look at the backlog of orders-to-df."',
    '  }',
    '}'
  ].join('\n');
  G.expect(JSON.parse(POLICY).conditions[0].conditionThreshold.thresholdValue === 300 && /oldest_unacked_message_age/.test(JSON.parse(POLICY).conditions[0].conditionThreshold.filter), 'the alert policy is valid JSON');
  var BUDGET = [
    'gcloud billing budgets create \\',
    '  --billing-account=000000-AAAAAA-BBBBBB \\',
    '  --display-name="data-platform-dev" \\',
    '  --filter-projects=projects/brewline-dev \\',
    '  --budget-amount=500USD \\',
    '  --threshold-rule=percent=0.5 \\',
    '  --threshold-rule=percent=0.9 \\',
    '  --threshold-rule=percent=1.0,basis=forecasted-spend \\',
    '  --notifications-rule-pubsub-topic=projects/brewline-dev/topics/budget-alerts'
  ].join('\n');
  var BUGC = [
    'steps:',
    '  - id: deploy-dags',
    '    name: gcr.io/google.com/cloudsdktool/cloud-sdk',
    '    entrypoint: gcloud',
    '    args:',
    '      - storage',
    '      - rsync',
    '      - --recursive',
    '      - --delete-unmatched-destination-objects',
    '      - dags',
    '      - gs://${_COMPOSER_BUCKET}'
  ].join('\n');
  var FIXC = BUGC.replace('gs://${_COMPOSER_BUCKET}', 'gs://${_COMPOSER_BUCKET}/dags');
  var BUGB = [
    'gcloud billing budgets create \\',
    '  --billing-account=000000-AAAAAA-BBBBBB \\',
    '  --display-name="data-platform-dev" \\',
    '  --budget-amount=500USD \\',
    '  --threshold-rule=percent=1.0'
  ].join('\n');
  var FIXB = [
    'gcloud billing budgets create \\',
    '  --billing-account=000000-AAAAAA-BBBBBB \\',
    '  --display-name="data-platform-dev" \\',
    '  --budget-amount=500USD \\',
    '  --threshold-rule=percent=0.5 \\',
    '  --threshold-rule=percent=0.9 \\',
    '  --threshold-rule=percent=1.0,basis=forecasted-spend'
  ].join('\n');
  var names = {};
  CKT.rows.forEach(function (r) { names[r[0]] = r[1]; });
  var CHECKROWS = CK.baseline.failed.map(function (x) { var p = x.split(' '); return [p[0], p[1], names[p[0]]]; });
  var SCANROWS = [['the first version', CK.baseline], ['the bucket fixed', CK.fix_bucket], ['the dataset fixed', CK.fix_dataset], ['the table fixed', CK.fix_table], ['the role fixed', CK.fix_iam], ['the topic fixed', CK.fix_topic], ['all five fixed', CK.all_fixed]]
    .map(function (r) { return [r[0], r[1].failed_count, r[1].passed]; });
  var KB = CW.billed_bytes_per_job;
  var WEEKJOBS = [['dashboard refresh', CW.runs_per_day.dashboard_refresh, GIB(KB.dashboard_refresh), CW.runs_per_day.dashboard_refresh * CW.days], ['analysts, SELECT *', CW.runs_per_day['analysts, SELECT *'], GIB(KB['analysts, SELECT *']), CW.runs_per_day['analysts, SELECT *'] * CW.days], ['the nightly MERGE', CW.runs_per_day.daily_orders, GIB(KB.daily_orders), CW.runs_per_day.daily_orders * CW.days]];

  LAB.addChapter({
    id: 'm14', n: 14, title: 'Run it as code: Terraform, delivery, alerts and cost', short: 'Operations', blurb: 'A platform kept in Terraform, shipped by a pipeline, watched by alerts, and paid for with open eyes', minutes: 54,
    focus: ['mon', 'ci', 'snap'],
    goals: [
      'Read a **Terraform plan** for the words replace and destroy, and say what **state** and **drift** are.',
      'Scan Terraform in a pull request, and say what a scanner can and cannot judge.',
      'Describe a **delivery pipeline** for SQL, DAGs and infrastructure, with no key file.',
      'Alert on **freshness and lag**, and say why a symptom beats a cause as an alert.',
      'Read a **cost by pipeline** result, and choose the fix that cuts bytes.',
      'Set a **budget** with early alerts, and say what a budget does not do.'
    ],
    say: 'Mission 14 is what senior roles add to the list: the platform is code in Git, a pipeline ships it, alerts watch it, and someone knows what it costs. Job descriptions name Terraform and CI/CD often, and monitoring and cost control almost everywhere. I scanned a Terraform file with Checkov, checked a Cloud Build file against its schema, and ran a cost query on a made-up job log. Terraform itself never ran, and no alert fired: those parts are from documentation.',
    scenes: [
      B.flow({
        id: 'm14-cicd', t: 1, src: 'docs', title: 'A change travels from a pull request to production', g: 'cicd', legend: true,
        steps: [
          { say: 'Brewline keeps the platform in Git: the Terraform for the resources, the DAGs, the Dataform project and the tests. A change reaches production only through a pull request. Press Next to follow one.', cap: 'Everything goes through Git.' },
          { say: 'Step 1. The pull request starts the **checks**: unit tests for the pipeline code, a compile of the Dataform project, and a Terraform scan. They run on every push and take minutes.', on: ['d1'], focus: ['ci_pr', 'ci_chk'], cap: 'Checks come first.' },
          { say: 'Step 2. The job must talk to Google Cloud. It proves who it is with a **short-lived token** from the code host, which Google exchanges for an identity. There is no key file in Git or in a secret. Mission 2 showed this.', on: ['d2'], focus: ['ci_chk', 'ci_wif'], cap: 'No key file.' },
          { say: 'Step 3. **Terraform plan** compares the files with what exists, and lists what would be created, changed or destroyed. A plan changes nothing.', on: ['d3'], focus: ['ci_wif', 'ci_plan'], cap: 'A plan changes nothing.' },
          { say: 'Step 4. A person **reads the plan**. A line that says destroy or replace next to a table or a bucket is what they look for.', on: ['d4'], focus: ['ci_plan', 'ci_rev'], cap: 'Read the plan.' },
          { say: 'Step 5. After approval, the merge **applies** the change to the dev project first. Prod gets the same change when dev is healthy: the same code with other variables.', on: ['d5'], focus: ['ci_rev', 'ci_apply'], cap: 'Dev, then prod.' },
          { say: 'Step 6. The **DAG files** are copied to the Composer bucket, and the Dataform project is released. Code and infrastructure move together, from one commit.', on: ['d6', 'd7'], focus: ['ci_apply', 'ci_dags', 'ci_df'], cap: 'Code follows infrastructure.' },
          { say: 'Step 7. Then the **watch** starts: alerts, freshness checks and a look at the first run. A deploy is finished when the first run is healthy, not when the job turns green.', on: ['d8'], focus: ['ci_df', 'ci_mon'], cap: 'Done means healthy.' }
        ]
      }),

      B.talk({
        id: 'm14-git', t: 1, src: 'docs', title: 'What lives in Git, and what does not',
        say: 'The rule of the whole mission is short: nothing reaches production except from Git. Press Next for what goes in the repository.',
        items: [
          ['Infrastructure', 'Buckets, datasets, topics, subscriptions, service accounts, IAM bindings and Composer environments are written as **Terraform**. A click in the console leaves no record and cannot be reviewed. A file can.', 'Resources as files.'],
          ['Pipeline code', 'DAGs, Dataflow pipelines, Spark jobs, Cloud Run functions, Dataform and SQL files, and their tests. A small team can use one repository. The rule is that a deploy comes from a commit.', 'A deploy is a commit.'],
          ['Settings, not secrets', 'Names, regions, sizes and schedules go in files, with a value for each environment. **Secrets** do not: they live in Secret Manager and the code reads them at run time. A key that was committed once is leaked, even after you delete it.', 'Config yes, secrets no.'],
          ['Environments', 'Use **separate projects** for dev and prod, the same code, and different variables. A change is tried in dev first. Putting the environment in the project id (`brewline-dev`, `brewline-prod`) prevents a lot of mistakes.', 'Same code, other variables.']
        ],
        cols: 1,
        call: { k: 'tip', h: 'Ask two questions of every change:', t: 'where is it written down, and who reviewed it? "In the console" and "nobody" are not answers.' }
      }),

      B.code({
        id: 'm14-tf', t: 1, src: 'rec', title: 'The first Terraform file, and what a review would say', file: 'main.tf', lang: 'hcl', code: TF,
        steps: [
          { say: 'This file builds a small part of the platform: a bucket, a dataset, a table, a service account with a role, and a topic. It is real Terraform for the Google provider. I scanned it and never applied it. It works, and it has gaps that a reviewer catches. Press Next.', lines: null },
          { say: 'The **bucket** has a name and a location and nothing else: no uniform access, no public access prevention, no versioning, no access log.', lines: G.span(TF, /resource "google_storage_bucket"/, /^}/) },
          { say: 'The **dataset** names `allAuthenticatedUsers` as a reader. That is anyone who has a Google account, and that includes people outside the company.', lines: G.span(TF, /^  access \{/, /^  \}/) },
          { say: 'The **table** is partitioned by day and clustered by store, which is good. It has no deletion protection and no key of your own.', lines: G.span(TF, /^  time_partitioning/, /^  clustering/) },
          { say: 'The **service account** has the role **owner** on the whole project. Mission 2 showed why that is far too much for a pipeline.', lines: G.span(TF, /resource "google_project_iam_member"/, /^}/) },
          { say: 'The **topic** has no key of its own. These five resources hold the eleven gaps that the next screens list.', lines: G.span(TF, /resource "google_pubsub_topic"/, /^}/) }
        ],
        note: 'Recorded: Checkov ' + G.meta('checkov') + ' scanned this file. Terraform itself was not run, and no resource exists.'
      }),

      B.widget({ id: 'm14-iac', kind: 'iac', t: 1, src: 'rec', title: 'Lab: close the gaps that Checkov finds' }),

      B.rows({
        id: 'm14-checks', t: 1, src: 'rec', title: 'What the scan asked, and who decides',
        steps: [
          {
            say: 'Eleven checks failed on the first version, and three passed. Read what each asks. Some are plain hygiene, like closing a dataset to everybody. Others are **policy**: a rule that an organization chooses, like a key of your own on every table.',
            tabs: [{ layer: 'RECORDED', name: 'The checks that failed on the first version', c: 'raw', cols: ['check', 'resource', 'what it asks'], rows: CHECKROWS, trk: 0 }],
            notes: ['Recorded with Checkov ' + G.meta('checkov') + '. The wording is the scanner\'s own. Three of the checks say "customer supplied" keys, and the fix in the recorded file uses a Cloud KMS key that you manage. Whether you need such a key is a decision for your security team, because Google encrypts data at rest by default.']
          },
          {
            say: 'Each fix touches one resource, so the scans add up: with all five changes **' + CK.all_fixed.failed_count + '** checks failed and **' + CK.all_fixed.passed + '** passed. A scan in the pipeline turns this list into a gate: the pull request fails until the list is short, or until each exception is written down.',
            tabs: [{ layer: 'RECORDED', name: 'The scan after each change', c: 'raw', cols: ['file', 'checks failed', 'checks passed'], rows: SCANROWS, trk: 0 }],
            notes: ['A passing scan is not a secure system. It is a list of rules that somebody wrote. It cannot know which rules your company has chosen, and it cannot judge a design.']
          }
        ]
      }),

      B.talk({
        id: 'm14-tfloop', t: 1, src: 'docs', title: 'The Terraform loop: format, plan, apply',
        say: 'Four commands make the loop. Press Next for what each one does, and what to look for in the plan. From documentation: the options change, so check the reference of your version.',
        items: [
          ['Format and validate', '`terraform fmt` makes the files look the same, and `terraform validate` catches syntax and type mistakes without touching Google Cloud. Both are fast, so they run on every push.', 'Cheap checks first.'],
          ['Plan', '`terraform plan` reads the **state** (what Terraform believes exists), asks Google Cloud what is there, and compares both with your files. It lists each resource as create, update in place, or destroy and create again (replace). Save the plan and attach it to the pull request.', 'A plan is a diff.'],
          ['Apply', '`terraform apply` makes the changes. In a pipeline, apply the **saved plan** that a person approved, so that what runs is what was reviewed.', 'Apply what was approved.'],
          ['Find replace and destroy', 'Some settings cannot change in place. For a dataset, the location is one. For a table, the partitioning is one. The plan says which, with a line that tells you the resource **must be replaced**, and the data goes with the old resource. Deletion protection on a table turns that mistake from a loss into an error.', 'Search the plan for those words.']
        ],
        cols: 1
      }),

      B.talk({
        id: 'm14-tfstate', t: 2, src: 'docs', title: 'State, environments and drift',
        say: 'Three ideas decide whether Terraform stays pleasant in a team. Press Next. From documentation.',
        items: [
          ['State is a file with consequences', 'Terraform records what it created in a **state** file. Keep it in a **Cloud Storage bucket** with versioning (the `gcs` backend), and not on a laptop, so that the team shares it and it has history. The backend also **locks** the state during an apply, so that two runs cannot write at once. Treat the bucket as sensitive: state can hold values that you would not publish.', 'Shared, versioned, locked.'],
          ['One state for each environment', 'Dev and prod have **separate states**, ideally in separate projects and buckets. A mistake in dev cannot touch prod, and a plan stays small and fast.', 'Separate states.'],
          ['Drift', '**Drift** is a difference between the files and the real world, usually after a console change. A scheduled `terraform plan` that raises an alert on any difference finds it early. Then decide: write the change into the files, or undo it.', 'A scheduled plan finds drift.'],
          ['Import and modules', '`terraform import`, or an `import` block, brings an existing resource under Terraform, so that a platform built by hand can be adopted. A **module** packages a pattern, for example "a dataset with its access rules", so that every team gets the same safe default.', 'Adopt, then standardize.']
        ],
        cols: 1
      }),

      B.code({
        id: 'm14-cb', t: 1, src: 'rec', title: 'Cloud Build: check the code, then deploy it', file: 'cloudbuild.yaml', lang: 'yaml', code: CB,
        steps: [
          { say: 'This is the build file of the Brewline repository. It checks the code, then copies the DAGs. I checked it against the published schema of Cloud Build and never ran a build. Press Next.', lines: null },
          { say: 'Four steps run in order. **unit-tests** runs the Python tests of the pipeline code in a Python image.', lines: G.span(CB, /id: unit-tests/, /pytest/) },
          { say: '**sql-compile** compiles the Dataform project. It fails on a broken `ref`, a missing dependency or a cycle, before anything runs in BigQuery.', lines: G.span(CB, /id: sql-compile/, /cli compile/) },
          { say: '**terraform-checks** installs Checkov and scans the `iac` folder: the same scan that found the eleven gaps.', lines: G.span(CB, /id: terraform-checks/, /checkov -d iac/) },
          { say: '**deploy-dags** copies the folder `dags` into the `dags` folder of the Composer bucket with `gcloud storage rsync`. It runs last, so a failed check stops the deploy.', lines: G.span(CB, /id: deploy-dags/, /rsync/) },
          { say: 'The last lines set the bucket as a **substitution** (a variable with a name that starts with an underscore, so that each trigger can set its own), the logging choice, and a **timeout** of ' + CI.cloudbuild.timeout + ' for the whole build.', lines: G.span(CB, /^substitutions:/, /^timeout:/) }
        ],
        note: 'Which service account the build runs as is set on the trigger or in the file. Give it an account of its own with only the rights that these steps need. The default account has changed over time, so check which one your project uses.'
      }),

      B.term({
        id: 'm14-cbcheck', t: 2, src: 'rec', title: 'The schema check for the build file, and a typo it catches',
        say: 'A build file is code, and a typo in it fails late. I validated the file against the published schema, then changed one key and validated it again. Watch the two answers.',
        lines: [].concat(
          term(CBOK, 'check-jsonschema --builtin-schema vendor.cloudbuild cloudbuild.yaml'),
          [{ c: 'dim', t: '# the same file, with steps written as step', d: 500 }],
          term(CBBAD, 'check-jsonschema --builtin-schema vendor.cloudbuild cloudbuild.yaml')
        ),
        after: 'The right file passes. The copy with `step` is refused, and the exit code is 1. A check like this belongs in the pipeline: it takes a second. It checks the **shape** of the file, and it does not prove that the steps do what you want. Only a run in a dev project proves that.',
        afterKind: 'tip',
        doneSay: 'Validate the shape of the file in the pipeline, and test the behaviour in a dev project.'
      }),

      B.cmp({
        id: 'm14-cicmp', t: 2, src: 'docs', title: 'Where to run the pipeline: Cloud Build, GitHub Actions or Jenkins',
        say: 'Job descriptions name all three, and the honest answer is that the rules matter more than the tool. Press Next to read the pattern.',
        cols: ['Tool', 'Good at', 'Watch for'],
        hl: 1,
        rows: [
          ['Cloud Build', 'Runs inside your project, as a service account that you choose, close to Cloud Storage and Artifact Registry', 'One more system to learn when the team lives in GitHub already'],
          ['GitHub Actions', 'Sits next to the code and the reviews, with a large library of actions, and signs in to Google Cloud without a key file (mission 2)', 'Runners are outside your network unless you host them, and actions should be pinned to a version'],
          ['Jenkins or GitLab CI', 'What many companies already run, and what many postings name', 'You keep the servers or runners up, and the credentials they hold']
        ],
        steps: [
          { upto: 1, say: 'Cloud Build lives inside the project, and the identity is the one you give the build.' },
          { upto: 2, say: 'GitHub Actions lives next to the code. Federated sign-in removes the key file.' },
          { upto: 3, say: 'Jenkins and GitLab CI are common in older teams. The risk is the credentials on the server.' }
        ],
        pick: 'Use the tool that the team already runs, and keep the rules the same: checks on every pull request, no key files, a plan that a person reads, and the same code for every environment.'
      }),

      B.flow({
        id: 'm14-ops', t: 1, src: 'docs', title: 'Watching a pipeline run', g: 'ops', legend: true,
        steps: [
          { say: 'A pipeline that nobody watches fails quietly, and you hear about it from a manager. This is the watch around the Brewline platform. Press Next.', cap: 'Watch what you built.' },
          { say: 'Step 1. Every service writes **logs** to Cloud Logging: Dataflow workers, Composer tasks, load jobs, and audit records of who did what. You do not set this up. You learn to read it.', on: ['n1'], focus: ['o_job', 'o_log'], cap: 'Everything logs.' },
          { say: 'Step 2. A **metric** counts or measures something. Some come from the service, like the age of the oldest unacknowledged message. You can also build one from a log filter, for example "count the error lines of the Dataflow job".', on: ['n2'], focus: ['o_log', 'o_met'], cap: 'Logs become numbers.' },
          { say: 'Step 3. An **alert policy** watches a metric and fires when a condition holds for long enough: "the oldest message is older than five minutes, for five minutes".', on: ['n3'], focus: ['o_met', 'o_alert'], cap: 'A rule over time.' },
          { say: 'Step 4. The alert goes to a **channel**: chat, e-mail or a pager. It carries a link to a **runbook**: the first three things to check. An alert without a runbook is a riddle at three in the morning.', on: ['n4', 'n5'], focus: ['o_alert', 'o_chan', 'o_run'], cap: 'Alert, channel, runbook.' },
          { say: 'Step 5. Separately, BigQuery keeps a **history of jobs**, with the user, the bytes billed and the labels. You query it like any table, and one query by label shows which pipeline costs what.', on: ['n6', 'n7'], focus: ['o_job', 'o_jobs', 'o_dash'], cap: 'The job history.' },
          { say: 'Step 6. The **billing export** puts the cost lines into a BigQuery table, and a **budget** warns before the month ends. A cost view and a health view side by side tell you whether the platform works and whether it is affordable.', on: ['n8', 'n9'], focus: ['o_bill', 'o_dash', 'o_budget'], cap: 'Spend is data too.' }
        ]
      }),

      B.talk({
        id: 'm14-signals', t: 1, src: 'docs', title: 'What to watch on a data platform',
        say: 'Servers have CPU. Data has freshness. Press Next for the five things that I watch on a pipeline. From documentation: metric names change slowly and differ by service, so find them in Metrics Explorer for your project.',
        items: [
          ['Freshness', 'Did the data arrive on time? That is the question a business user asks. Measure the **age of the newest row** of each important table (`MAX(ingest_ts)`), and alert when it passes the promised limit.', 'How old is the newest row.'],
          ['Lag and backlog', 'For streams: the **age of the oldest unacknowledged message** of a Pub/Sub subscription, and the system lag and data freshness of a Dataflow job. A growing backlog means that the consumer is slower than the producer, or stuck.', 'Is the backlog growing.'],
          ['Failures and retries', 'Failed tasks and DAG runs in Composer, failed load jobs, a Dataflow job that is not running, rows in the dead-letter topic. A task that needs three tries every day is an outage that has not happened yet.', 'Count failures and retries.'],
          ['Volume and quality', 'A row count that falls by half is a failure that looks like success. Compare with the same weekday last week, and run the quality rules of mission 12 on a schedule.', 'Compare with last week.'],
          ['Cost', 'Bytes billed by pipeline, slot use, and the budget. The next screens show a result.', 'Spend by pipeline.']
        ],
        cols: 1,
        call: { k: 'tip', h: 'Page on symptoms, not on causes:', t: '"the orders table is late" wakes someone up, and "CPU is 80 percent" goes on a dashboard that they open after the alert.' }
      }),

      B.code({
        id: 'm14-alertcmd', t: 2, src: 'docs', title: 'A metric from a log filter, and an alert policy from a file', file: 'alerts.sh', lang: 'bash', code: METRIC,
        steps: [
          { say: 'Two commands: one makes a metric out of log lines, one creates an alert policy from a file. I checked that every flag exists in the help page of the installed `gcloud`, and I did not run them, because there is no project behind this course. Press Next.', lines: null },
          { say: 'A **logs-based metric** counts the log entries that match a filter. This one counts the error lines of the Dataflow job, whose name starts with `orders-stream`. The `:` in the filter means "contains".', lines: G.span(METRIC, /metrics create/, /log-filter/) },
          { say: 'An **alert policy** is a document: a condition, a threshold, a duration, where to send it and what to say. The command only loads the file, so the policy can sit in Git and in Terraform like everything else. The file is on the next screen.', lines: G.span(METRIC, /policies create/, /policy-from-file/) }
        ],
        note: 'The flags were found in the help pages of gcloud ' + G.meta('gcloud') + ' (offline). The filter syntax and the resource labels are from documentation. Check them against a real log entry before you rely on them.'
      }),

      B.code({
        id: 'm14-policy', t: 2, src: 'docs', title: 'An alert on the age of the oldest message', file: 'orders_lag_policy.json', lang: 'json', code: POLICY,
        steps: [
          { say: 'The alert policy for a stream that falls behind. It is a JSON file with the shape that the Monitoring API documents, and it parses as valid JSON. I did not load it. Press Next.', lines: null },
          { say: 'The **filter** picks the metric: the age of the oldest unacknowledged message, for the subscription that feeds the Dataflow job.', lines: G.span(POLICY, /"filter"/) },
          { say: 'The **condition**: greater than 300 seconds, for 300 seconds in a row. The duration keeps a short spike from waking anyone. The aggregation takes the maximum in each minute.', lines: G.span(POLICY, /"comparison"/, /"aggregations"/) },
          { say: 'Where to send it, and what to say. The **documentation** field is the runbook text that arrives with the alert.', lines: G.span(POLICY, /"notificationChannels"/, /^  \}/) }
        ],
        note: 'From documentation. The field names are those that I know of the AlertPolicy resource. Check them in the current reference, and create the policy once by hand in a dev project to see what it looks like in the console.'
      }),

      B.sql({
        id: 'm14-cost-sql', t: 1, src: 'rec', title: 'Which pipeline spends the money?', file: 'cost_by_label.sql', code: COSTSQL,
        steps: [
          { say: 'Mission 5 showed the query that lists the costly jobs. This version adds up the cost for each pipeline label, and I ran it on a **made-up job log**: ' + n0(CW.jobs) + ' jobs over ' + CW.days + ' days, with the columns that the query reads. The bytes of each kind of job come from the estimates of mission 5. Press Next.', lines: null },
          { say: 'A small query first, in a `WITH`: it reads the job history view of the region, and pulls the value of the `pipeline` label out of the array. A job without the label becomes `(no label)`.', lines: G.span(COSTSQL, /^WITH jobs AS/, /^\)/) },
          { say: 'The outer query counts the jobs, adds up the bytes billed in TiB, and multiplies by an **example** price of 6.25 US dollars for each TiB. The rate is an example and not a quote: use the current price list. Press Run.', lines: G.span(COSTSQL, /^SELECT$/, /ORDER BY/), run: true }
        ],
        result: { cols: ['pipeline label', 'jobs', 'TiB billed', 'example USD'], rows: COST.rows.map(function (r) { return [r[0], n0(r[1]), r[2].toFixed(2), usd(r[3])]; }), msg: COST.rows.length + ' rows' },
        note: 'Run in DuckDB, on a made-up table, after translation. The view name was replaced by the made-up table, because INFORMATION_SCHEMA does not exist outside BigQuery. The ranking comes from the made-up job counts: a picture of a common finding, not a measurement of a real system.'
      }),

      B.rows({
        id: 'm14-cost-read', t: 1, src: 'rec', title: 'Read the result like an owner',
        steps: [
          {
            say: 'The nightly pipeline, the job that everyone worries about, costs **' + usd(COST.rows[2][3]) + '** for the week. The dashboard costs **' + usd(COST.rows[0][3]) + '**, and the analysts without a label **' + usd(COST.rows[1][3]) + '**. A dashboard that runs ' + CW.runs_per_day.dashboard_refresh + ' times a day is ' + CW.runs_per_day.dashboard_refresh + ' small queries.',
            tabs: [{ layer: 'RECORDED', name: 'The three kinds of job in the made-up log', c: 'raw', cols: ['kind of job', 'runs a day', 'billed for each run', 'runs in the week'], rows: WEEKJOBS, trk: 0 }],
            notes: ['Cost follows **how often and how much**, not how important a job feels. The estimates are the logical bytes of the made-up table, pictured ' + n0(W0.scale) + ' times larger, at an example price.']
          },
          {
            say: 'Two fixes show up. The **dashboard** can read a small summary table, or a materialized view, and not the big table. The **analysts** need a rule: a label on every job, a limit of bytes billed for each query, and the habit of filtering on the partition. The nightly job is not the problem.',
            tabs: [{ layer: 'RULE', name: 'What to do about each', c: 'raw', cols: ['what the log shows', 'what to do'], rows: [['dashboard_refresh', 'point it at a summary table or a materialized view, and refresh less often if the business agrees'], ['(no label)', 'require labels, set `maximum_bytes_billed` for the group, and teach the partition filter'], ['daily_orders', 'leave it alone: it reads one day, which is the point of the partition filter']], trk: 0 }],
            notes: ['A finding without an owner is gossip. The label is what lets you send this table to the right person.']
          }
        ]
      }),

      B.code({
        id: 'm14-budget', t: 1, src: 'docs', title: 'A budget with early alerts', file: 'budget.sh', lang: 'bash', code: BUDGET,
        steps: [
          { say: 'A budget watches spend and sends alerts at thresholds. It warns. It does not stop anything. I checked every flag against the help page of the installed `gcloud` and did not create a budget. Press Next.', lines: null },
          { say: 'The billing account, a name, and the **project** to watch. Without `--filter-projects`, the budget covers the whole billing account.', lines: G.span(BUDGET, /billing-account/, /filter-projects/) },
          { say: 'The amount, in the currency of the billing account.', lines: G.span(BUDGET, /budget-amount/) },
          { say: 'Three **threshold rules**: half of the budget, ninety percent, and a third one on the **forecast**: an alert when the trend says that the month will end over budget. That one can arrive early in the month.', lines: G.span(BUDGET, /percent=0\.5/, /forecasted-spend/) },
          { say: 'The alerts go to a Pub/Sub topic. People can read the e-mails that a budget sends by default, but a topic lets a program react: post to a chat, or, with great care, turn something off.', lines: G.span(BUDGET, /notifications-rule/) }
        ],
        note: 'A budget alert arrives some time after the spend. To refuse spend before it happens, use `maximum_bytes_billed` on jobs and custom quotas. Warn and refuse are two different tools.'
      }),

      B.decide({
        id: 'm14-dec', t: 2, src: 'docs', title: 'Decision: the dashboard is the top spender',
        scenario: 'The cost view shows that the sales dashboard is the biggest query cost: it refreshes every 15 minutes and reads three columns of the whole orders table. The business needs the dashboard fresh to within 15 minutes. Finance asks you to cut the bill.',
        opts: [
          { t: 'Build a small summary table (or a materialized view) with what the dashboard shows, keep it up to date, and point the dashboard at it', d: 'The dashboard reads a fraction of the bytes and stays as fresh as the refresh of the summary. The screen shows the same numbers for a much smaller bill.', lose: '' },
          { t: 'Buy a slot reservation so that the queries stop being billed by the byte', d: 'The bill becomes predictable.', lose: 'It changes how the money is paid and not how much is read. The same wasteful scan now uses slots that other jobs need, and a commitment is a bill whether or not you use it.' },
          { t: 'Ask the dashboard owners to refresh once a day', d: 'The cheapest change, at once.', lose: 'It breaks the 15 minute promise that the business relies on. Cut the cost of the query before you cut the value of the product.' }
        ],
        pick: 0,
        why: 'Cut the bytes of each run first, and keep the promise that the business relies on. A summary table or a materialized view turns 96 scans of the big table into 96 reads of a small one. Decide about capacity only after the waste is gone.',
        when: 'If the same query repeats exactly, a cache or BI Engine can serve it. Slot capacity fits when the total is large and steady after the waste is gone, and the business wants a bill with a ceiling.'
      }),

      B.talk({
        id: 'm14-region', t: 2, src: 'docs', title: 'Regions, outages and a platform you can rebuild',
        say: 'Missions 3 and 4 covered the small failures: soft delete, versions, time travel and snapshots. Press Next for the big one: a region that is gone. From documentation.',
        items: [
          ['Three different failures', 'A **bad change** (a wrong MERGE), a **lost resource** (a deleted table or bucket) and a **region outage** need three different answers. The first two are covered by the undo tools of earlier missions. The third needs a plan made in advance.', 'Three failures, three answers.'],
          ['RTO and RPO', 'Ask the business for two numbers. **RTO**: how long can the platform be down? **RPO**: how much recent data can be lost? "No time and no data" is an answer that costs a great deal, so make people choose.', 'Ask for two numbers.'],
          ['Copies of the data', 'Files: a **dual-region** or multi-region bucket keeps copies in more than one place. Tables: copy the important datasets to a second region on a schedule, or use the cross-region features that BigQuery offers (check which ones your project can use). Streams: decide whether a second region must be able to take over, and test it.', 'Copies in a second place.'],
          ['A platform you can rebuild', 'The best recovery is **repeatable creation**: the Terraform and the pipeline code in Git recreate the project, the datasets and the jobs in another region, and the data comes back from the copies. Rehearse it once a year as a **game day**: a drill that finds the step that nobody wrote down.', 'Rebuild from Git, and rehearse.']
        ],
        cols: 1
      }),

      B.talk({
        id: 'm14-guard', t: 3, src: 'docs', title: 'Guardrails: organization policy and policy as code',
        say: 'Rules that depend on people remembering them fail on a busy day. Press Next for two layers of guardrails. From documentation.',
        items: [
          ['Organization policy', 'A **constraint** set on the organization or a folder limits what anyone can do in the projects below it, however they do it. Two that data teams meet: **resource locations** (`constraints/gcp.resourceLocations`) keeps data in the regions that you chose, and **no service account keys** (`constraints/iam.disableServiceAccountKeyCreation`) closes the key file door of mission 2.', 'A lock that applies to everyone.'],
          ['Policy in the pipeline', 'A scan in the pull request (Checkov, or a policy engine such as Open Policy Agent with Conftest) rejects a plan that breaks a rule before it reaches Google Cloud. The organization policy is the lock on the door. The scan is the checklist that tells a developer why the door is shut.', 'The scan explains, the lock enforces.'],
          ['Exceptions with an owner', 'A rule that cannot be bypassed gets bypassed in secret. Give it a visible exception: a ticket, a reason, an owner and an end date. Review the list every quarter.', 'Write exceptions down.'],
          ['Test the guardrail', 'Try to break each rule in a dev project on purpose, and read the message that people will see. A guardrail that nobody has tested is a hope.', 'Break it on purpose.']
        ],
        cols: 1
      }),

      B.talk({
        id: 'm14-scale', t: 3, src: 'docs', title: 'Terraform at scale',
        say: 'A repository of ten files is easy. A repository that twenty people change is a different job. Press Next for four habits. From documentation.',
        items: [
          ['Pin the versions', 'Pin the Terraform version and the provider versions, and commit the **lock file**, so that a plan on Tuesday means what it meant on Monday.', 'The same plan every day.'],
          ['Move, do not recreate', 'Renaming a resource in the files looks to Terraform like destroy and create. A **moved** block says that it is the same thing under a new name, and the plan shows no change.', 'Say that it moved.'],
          ['Modules and for_each', 'A **module** packages a pattern, for example "a dataset with its access rules and labels", so that every team gets the same safe default. `for_each` makes one copy for each name in a map. Version your modules like a library, because a change to one is a change for everyone who uses it.', 'A module is a contract.'],
          ['Blast radius', 'Split the state by owner and by how often it changes: network, shared data platform, then the datasets of each team. A small state means a small risk and a fast plan. One state for the whole company means that one bad apply can touch everything.', 'Small states, small mistakes.']
        ],
        cols: 1
      }),

      B.bug({
        id: 'm14-bug', t: 1, q: 'After a deploy, the Composer environment has no DAGs, and the plugins and data folders of its bucket are gone. Click the line that caused it.',
        file: 'cloudbuild.yaml', lang: 'yaml', code: BUGC, bad: [11],
        hint: 'Where do the files land, and what does the delete flag remove there?',
        why: 'The destination is the **bucket root**. With `--delete-unmatched-destination-objects`, rsync makes the destination look exactly like the source: it deletes everything in the bucket that is not in `dags`, including the `plugins` and `data` folders, and the DAG files land in the root, where Composer does not look for them. With the destination `gs://${_COMPOSER_BUCKET}/dags`, the delete flag only touches the DAG folder.',
        fix: FIXC,
        cheer: 'Name the exact folder.'
      }),

      B.bug({
        id: 'm14-bug2', t: 2, q: 'The team set a budget so that nobody gets a surprise. The bill still surprised them. Click the line that explains why.',
        file: 'budget.sh', lang: 'bash', code: BUGB, bad: [5],
        hint: 'When does the only alert arrive?',
        why: 'There is **one** threshold, at 100 percent. The alert arrives when the money is already spent, and billing data comes in with a delay on top. Add earlier thresholds (50 and 90 percent) and one on **forecasted spend**, so that the trend raises the alarm before the end of the month.',
        fix: FIXB,
        cheer: 'Warn early, and on the forecast.'
      }),

      B.incident({
        id: 'm14-inc', t: 1, src: 'docs', title: 'Incident: the dashboard still shows yesterday', time: '09:10',
        alert: '**At 09:10 the sales dashboard still shows yesterday\'s numbers, and the store managers are asking.** The Composer DAG is green. Nobody got an alert. The Dataflow job for the POS orders was last restarted two days ago, and its state is Running.',
        clues: ['The Dataflow job state is Running', 'The oldest unacked message of the subscription is nine hours old', 'The newest row in the orders table is nine hours old', 'No alert policy exists for lag or freshness'],
        opts: [
          { t: 'Look at the backlog and the job logs, find the stuck step, fix it and relaunch (draining first if needed), watch the backlog shrink, then add alerts on lag and freshness with a runbook', fb: '' },
          { t: 'Rerun the DAG', fb: 'The DAG is green, and it only reads the table. The table is stale because the stream is behind, so a rerun changes nothing.' },
          { t: 'Delete the subscription and create a new one', fb: 'You would throw away nine hours of orders. A backlog is data that is waiting, and not rubbish.' },
          { t: 'Tell the managers that the numbers will fix themselves', fb: 'They might, or the job may be stuck for good. Without a look at the backlog you do not know.' }
        ],
        best: 0,
        why: 'A job in a running state can still be stuck, and a green DAG only says that the DAG ran. The honest measures are **freshness** (the age of the newest row) and **lag** (the age of the oldest unacknowledged message). Without alerts on those two, the first alarm is a person. Fix it, watch it recover, and then close the hole in the monitoring.',
        checks: [
          ['Look at the backlog', 'The age of the oldest unacknowledged message, and whether it keeps growing.'],
          ['Look at the job', 'The Dataflow logs and the system lag: a stuck step, an error loop, or a worker that ran out of memory.'],
          ['Recover without losing data', 'Fix the cause, then relaunch or drain and relaunch. The messages wait in the subscription for as long as its retention.'],
          ['Close the hole', 'An alert policy on lag and one on freshness, each with a runbook.']
        ],
        tell: 'The dashboard was stale because the stream had been behind for nine hours, with the job in a running state and the DAG green. I looked at the age of the oldest unacked message and at the job logs, fixed the stuck step and relaunched, watched the backlog drain, and then added alerts on lag and freshness with a runbook, because a person should not be the first alarm.',
        prevent: ['An alert on the age of the oldest unacked message', 'A freshness check on the newest row of each key table', 'A runbook linked from every alert']
      }),

      B.quiz({
        id: 'm14-q1', t: 1,
        q: 'What does `terraform plan` do?',
        opts: [
          { t: 'Creates the resources that the files describe', fb: 'That is apply.' },
          { t: 'Compares the files with what exists and lists what would change, without changing anything', fb: '' },
          { t: 'Deletes the resources that are not in the files', fb: 'A plan never changes anything. Apply does.' },
          { t: 'Formats the files', fb: 'That is `terraform fmt`.' }
        ],
        ok: 1,
        why: 'A plan is a diff. Read it for the words replace and destroy before you approve.'
      }),

      B.quiz({
        id: 'm14-q2', t: 1,
        q: 'A pull request changes the partitioning of a table, and the plan says that the table must be replaced. What is the first thing to do?',
        opts: [
          { t: 'Merge it: a plan is only a warning', fb: 'A replace destroys the resource, and the data goes with it.' },
          { t: 'Stop and ask what happens to the data in the table, because replace means destroy and create again', fb: '' },
          { t: 'Apply it to prod first, to save time', fb: 'Dev first, always. And not before the data question is answered.' },
          { t: 'Delete the plan output', fb: 'The plan is the evidence. Read it.' }
        ],
        ok: 1,
        why: 'Replace means destroy and create again. Deletion protection on the table would turn this into an error instead of a loss, and a copy of the data would make the change safe.'
      }),

      B.quiz({
        id: 'm14-q3', t: 1,
        q: 'Why scan the Terraform files with a tool like Checkov in the pull request?',
        opts: [
          { t: 'To find syntax errors', fb: '`terraform validate` finds those.' },
          { t: 'To apply the rules that the team agreed on, on every change, before anything is created', fb: '' },
          { t: 'To make the plan faster', fb: 'It has no effect on the speed of a plan.' },
          { t: 'To replace the human review', fb: 'It helps the review. A scanner cannot judge a design or know what your company chose.' }
        ],
        ok: 1,
        why: 'A scanner is a list of rules that somebody wrote. It catches known gaps early and explains them. In the recording, a scan found 11 gaps in a small file, and the fixed file passed all 15 checks.'
      }),

      B.quiz({
        id: 'm14-q4', t: 2,
        q: 'A budget is set at 100 percent of 500 US dollars. What happens when the spend reaches 500?',
        opts: [
          { t: 'All jobs stop', fb: 'A budget does not stop anything.' },
          { t: 'An alert is sent, and nothing else, unless you built something that reacts to it', fb: '' },
          { t: 'The project is deleted', fb: 'Nothing like that happens.' },
          { t: 'The quota rises', fb: 'Budgets and quotas are separate tools.' }
        ],
        ok: 1,
        why: 'A budget warns, and it does so after the spend. Use early thresholds and a forecast to warn sooner. Use quotas and `maximum_bytes_billed` to refuse spend.'
      }),

      B.quiz({
        id: 'm14-q5', t: 2,
        q: 'Which is the best first alert for a streaming pipeline?',
        opts: [
          { t: 'CPU above 80 percent on any worker', fb: 'CPU is a cause. It may be high and harmless, or low while the job is stuck.' },
          { t: 'The age of the oldest unacknowledged message above a limit for a few minutes', fb: '' },
          { t: 'A new line in the log', fb: 'That would fire all day.' },
          { t: 'A daily e-mail with the job state', fb: 'A daily e-mail would tell you about a stuck job after a day.' }
        ],
        ok: 1,
        why: 'Alert on what a person must act on: the data is late. Put the causes on a dashboard that people open after the alert.'
      }),

      B.order({
        id: 'm14-ord', t: 1, q: 'Put the stages of a safe infrastructure change in order.',
        items: [
          'Open a pull request with the Terraform change',
          'Run format, validate, the scan and the tests',
          'Run a plan and read it for replace and destroy',
          'A person approves the plan',
          'Apply the approved plan to dev and look at it',
          'Apply the same change to prod',
          'Watch the alerts and the first run'
        ],
        why: 'The cheap checks come before the plan, the plan before the approval, and dev before prod. The last step is watching, because a deploy is finished when the platform is healthy.'
      }),

      B.qa({
        id: 'qa-iac', t: 1, tag: 'Operations', secs: 90,
        q: 'How do you manage the infrastructure of a data platform on Google Cloud?',
        pts: ['Terraform in Git, reviewed through pull requests', 'Plan in the pull request, apply the approved plan', 'Remote state in a versioned bucket, one for each environment', 'A scan such as Checkov, and organization policy', 'No key files: federated identity for the pipeline', 'A scheduled plan to catch drift'],
        short: 'I keep every resource in **Terraform**, in Git, and a change reaches a project only through a pull request. The pipeline runs `fmt`, `validate`, a scan with **Checkov**, and a **plan** that a person reads for the words replace and destroy. After approval it applies that same plan to dev, then to prod, with the same code and other variables. State lives in a versioned Cloud Storage bucket, one for each environment, and the backend locks it.\n\nThe pipeline signs in with **workload identity federation**, so there is no key file. In a recording I made, a scan of a small file found 11 gaps, from an owner role on a service account to a dataset open to all authenticated users, and the fixed file passed all 15 checks. A scheduled plan catches drift from console changes.',
        fu: [['What if somebody changes a resource in the console?', 'That is drift. A scheduled plan shows it. Either write the change into the files or undo it, and find out why the console was needed.'], ['How do you keep prod safe from a bad apply?', 'Deletion protection on tables and buckets, a plan that a person reads, separate state and projects, and a run in dev first.']],
        trap: 'Describing clicks in the console, or a key file in a secret.',
        real: 'Tell me about a risky infrastructure change and how you made it safe.'
      }),

      B.qa({
        id: 'qa-monitor', t: 1, tag: 'Operations', secs: 75,
        q: 'How would you monitor a data pipeline on Google Cloud?',
        pts: ['Freshness: the age of the newest row', 'Lag: the oldest unacked message, Dataflow system lag', 'Failures and retries in Composer and jobs', 'Volume and quality against last week', 'Alerts on symptoms, with a runbook', 'Dashboards for causes'],
        short: 'I watch the data first, and the machines second. For every important table I measure **freshness**: the age of its newest row. For streams I watch the **age of the oldest unacknowledged message** and the Dataflow system lag. I count failed tasks and retries in Composer, and compare row counts and quality rules with the same weekday last week.\n\nAlerts go on **symptoms**: "the orders table is more than 15 minutes old", and not "CPU is high". Each alert has a channel and a **runbook** with the first checks. Causes (CPU, memory, worker count) go on a dashboard that people open after an alert. In an incident that I wrote up, the DAG was green, the job was running, and the data was nine hours old: only a freshness alert would have caught it.',
        fu: [['What do you alert on first?', 'Freshness of the tables that people rely on, and lag on the stream. Both are symptoms that a person must act on.'], ['How do you avoid alert fatigue?', 'A duration on every condition, one alert for each symptom, a runbook, and a review of every alert that fired without an action.']],
        trap: 'Alerting on CPU and never on freshness.',
        real: 'Tell me about an outage that your monitoring missed.'
      }),

      B.qa({
        id: 'qa-showback', t: 2, tag: 'Operations', secs: 75,
        q: 'How do you make cloud spend visible to the teams that cause it?',
        pts: ['Labels on every resource and job: team, env, pipeline', 'Billing export to BigQuery', 'One query or dashboard for each team', 'Budgets per project with several thresholds and a forecast', 'Quotas and maximum bytes billed that refuse', 'A monthly review with the owners'],
        short: 'I make spend **attributable**, then **visible**, then **bounded**. Attributable means labels on every resource and query job (`team`, `env`, `pipeline`), enforced in the Terraform and the job configs, because a resource without a label is spend that nobody owns. Visible means the **billing export** in BigQuery and a view for each team, plus the job history for query cost. In a made-up job log that I ran, the biggest spender was a dashboard that refreshed every 15 minutes, and not the heavy nightly job, and the analyst queries without labels came second.\n\nBounded means a **budget** for each project with several thresholds and a forecast, **custom quotas** and `maximum_bytes_billed` that refuse a runaway job, and a short monthly review where each owner sees their own number.',
        fu: [['What if teams share one project?', 'Then labels carry all of the attribution, so enforce them, or split the projects by team. Separate projects are the cleaner boundary for budgets and quotas.'], ['Do budgets stop spending?', 'No. They alert. Quotas and limits on jobs refuse the spend.']],
        trap: 'One monthly e-mail with a single number for the whole company.',
        real: 'Describe how you gave a team ownership of its cloud bill.'
      }),

      B.qa({
        id: 'qa-cicd', t: 2, tag: 'Operations', secs: 90,
        q: 'How do you do CI/CD for data pipelines?',
        pts: ['Everything in Git: SQL, DAGs, Terraform, tests', 'Checks on every pull request: unit tests, Dataform compile, scan', 'No key files: federated identity', 'Plan, then apply after approval', 'Dev first, then prod, same code', 'Watch after the deploy'],
        short: 'Everything is code in Git: the DAGs, the Dataform or SQL files, the Terraform and the tests. A pull request runs **unit tests**, a **Dataform compile** that catches a broken `ref`, a **schema check** of the build files, and a **Terraform scan** and plan. The job signs in with **workload identity federation**, so there is no key file.\n\nAfter review the change goes to **dev**, then **prod**, with the same code and other variables. The DAG files are copied to the Composer bucket by the last step, so a failed check stops the deploy, and the destination is the exact `dags` folder, so that a sync can never delete the plugins. A deploy is finished when the first run is healthy and the alerts are quiet. I use the runner that the team has: Cloud Build, GitHub Actions or Jenkins.',
        fu: [['How do you test SQL in CI?', 'A compile for the graph, assertions on the output, and a small test dataset in a dev project. The quality checks of mission 12 are written as queries that return rows when something is wrong.'], ['What would make you stop a release?', 'A failed check, a plan with an unexpected replace or destroy, or an alert that is already firing.']],
        trap: 'Deploying from a laptop, or one pipeline for every environment with no review.',
        real: 'Walk me through how a change reaches production in your last team.'
      }),

      B.qa({
        id: 'qa-slo', t: 3, tag: 'Operations', secs: 60,
        q: 'How would you set a service level objective for a data pipeline?',
        pts: ['What users feel: freshness, completeness, correctness', 'A target and a window, agreed with the business', 'Measured by a query or a metric', 'An error budget', 'Alert on how fast the budget burns', 'Review it with the business'],
        short: 'I start from what users feel, which for data is **freshness**, **completeness** and **correctness**. Then I write a target with a window: "the orders table is less than 15 minutes old for 99 percent of minutes over 30 days". I measure it with the age of the newest row, recorded every minute, so the objective is a query and not an opinion.\n\nThe gap between 100 percent and the target is the **error budget**. If the pipeline spends it quickly, we stop adding features and fix reliability, and I alert on how fast the budget burns and not on every blip. I agree the numbers with the business first, because a stricter objective costs more, and a looser one that nobody agreed to is a surprise later.',
        fu: [['What do you do when the budget is spent?', 'Pause risky changes, fix the biggest cause of misses, and report it. The budget is a tool for choosing between speed and reliability.'], ['How do you measure correctness?', 'With reconciliation counts and sums against the source, and the quality rules of mission 12, run on a schedule.']],
        trap: 'An objective that nobody measures, or that nobody agreed to.',
        real: 'Tell me about a target that you set for a pipeline, and what happened when you missed it.'
      }),

      B.qa({
        id: 'qa-import', t: 3, tag: 'Operations', secs: 60,
        q: 'The platform was built by hand in the console. How do you bring it under Terraform?',
        pts: ['One layer at a time, shared pieces first', 'Write the resource, then import it', 'Plan until it shows no change', 'Change settings only after that', 'Deletion protection and a scan from day one', 'Stop console changes for imported layers'],
        short: 'I go one layer at a time, starting with the pieces that many things depend on, such as projects, service accounts and datasets. For each resource I write the Terraform, bring the existing resource under it with an **import** block, and run a plan until it says that nothing changes. That proves that the file describes what really exists. Only after that do I change a setting, in a separate pull request, so that adopting and changing never mix.\n\nI turn on deletion protection for tables and buckets before I start, run the scan in the pipeline from the first day, and agree with the team that console changes stop once a layer is imported. A scheduled plan then shows any drift. It is slow work, and it is the cheapest time to find the settings that nobody can explain.',
        fu: [['Why not generate everything at once?', 'A huge first plan is impossible to review, and one wrong import can plan a destroy. Small layers keep each plan readable.'], ['How do you handle secrets that are in the old setup?', 'Move them to Secret Manager first, rotate them, and let the code read them at run time.']],
        trap: 'Importing and changing settings in the same pull request.',
        real: 'Describe how you took over infrastructure that nobody had written down.'
      }),

      B.recap({
        id: 'm14-recap', n: 14, badge: 'Operator', color: '#BAE6FD',
        pts: [
          'Infrastructure is **Terraform in Git**. A **plan** is a diff: search it for replace and destroy. State is shared, versioned and locked, and a scheduled plan finds **drift**.',
          'A scan found **' + CK.baseline.failed_count + '** gaps in a small file, and the fixed file passed **' + CK.all_fixed.passed + '** checks. A scanner is a list of rules, and people decide which rules apply.',
          'The pipeline runs **tests, a Dataform compile, a schema check and a scan**, signs in with no key file, plans, waits for approval, and goes to dev before prod.',
          'Alert on **symptoms** (freshness, lag) with a duration and a runbook. Put causes on a dashboard.',
          'In a made-up job log, a **dashboard that ran ' + CW.runs_per_day.dashboard_refresh + ' times a day** cost more than anything else (' + usd(COST.rows[0][3]) + ' against ' + usd(COST.rows[2][3]) + ' for the nightly job). Cut bytes first, and decide about capacity later.',
          'A **budget** warns after the spend: add early thresholds and a forecast, and use quotas and `maximum_bytes_billed` to refuse. Plan the **region outage** with RTO and RPO, and rehearse a rebuild from Git.'
        ],
        lines: [
          'I read the plan for replace and destroy before I approve.',
          'I alert on freshness and lag, and every alert has a runbook.',
          'I find the spender with a query by label, and cut bytes first.'
        ]
      })
    ]
  });
})();
