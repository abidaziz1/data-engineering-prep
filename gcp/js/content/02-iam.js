/* Mission 2: who can do what. Roles and inheritance, service accounts, ways to authenticate a job (and why a key file is the worst), workload identity
   federation for GitHub, perimeters, keys and organization policies. The deploy workflow is a real file that was checked against the schema of GitHub Actions and
   never run. The Terraform with a broad role is the file that Checkov scanned in mission 14. The services themselves are described from documentation. */
(function () {
  var B = LAB.b, G = LAB.get;
  var DEP = G.file('ci/deploy.yml'), CI = G.counts('ci.summary'), TF = G.file('iac/main.tf'), CK = G.counts('tf.checkov');
  var OK = G.file('ci/validate_deploy_ok.txt'), BAD = G.file('ci/validate_deploy_bad.txt');
  G.expect(CI.deploy_ok.exit_code === 0 && CI.deploy_bad.exit_code === 1 && CI.deploy.uses_a_key_file === false && CI.deploy.permissions['id-token'] === 'write', 'the deploy workflow checks');
  var ROLE_CHECKS = CK.baseline.failed.filter(function (x) { return /pipeline_role/.test(x); }).length;
  G.expect(ROLE_CHECKS === 2 && CK.baseline.failed.indexOf('CKV_GCP_117 google_project_iam_member.pipeline_role') >= 0, 'Checkov flags the owner role with two checks');
  function wrap(t, n) {
    return t.split('\n').reduce(function (a, l) {
      while (l.length > n) { var cut = l.lastIndexOf(' ', n); if (cut < 40) cut = n; a.push(l.slice(0, cut)); l = '    ' + l.slice(cut).trim(); }
      a.push(l); return a;
    }, []).join('\n');
  }
  function term(txt, cmd) { return G.plain(wrap(txt.replace(/ -- /g, ' - '), 92), { cmd: cmd, d: 90 }); }
  var WIF = [
    'gcloud iam workload-identity-pools create github \\',
    '  --location=global --display-name="GitHub"',
    '',
    'gcloud iam workload-identity-pools providers create-oidc brewline \\',
    '  --location=global --workload-identity-pool=github \\',
    '  --issuer-uri="https://token.actions.githubusercontent.com" \\',
    '  --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository" \\',
    '  --attribute-condition="assertion.repository == \'brewline/data-platform\'"',
    '',
    'gcloud iam service-accounts add-iam-policy-binding \\',
    '  sa-deploy@brewline-dev.iam.gserviceaccount.com \\',
    '  --role=roles/iam.workloadIdentityUser \\',
    '  --member="principalSet://iam.googleapis.com/projects/123456789/locations/global/workloadIdentityPools/github/attribute.repository/brewline/data-platform"'
  ].join('\n');
  var KEYBUG = [
    '      - id: auth',
    '        uses: google-github-actions/auth@v3',
    '        with:',
    '          credentials_json: ${{ secrets.GCP_SA_KEY }}',
    '      - run: gcloud storage rsync --recursive dags gs://composer-bucket-dev/dags'
  ].join('\n');
  var KEYFIX = [
    '      - id: auth',
    '        uses: google-github-actions/auth@v3',
    '        with:',
    '          workload_identity_provider: projects/123456789/locations/global/workloadIdentityPools/github/providers/brewline',
    '          service_account: sa-deploy@brewline-dev.iam.gserviceaccount.com',
    '      - run: gcloud storage rsync --recursive dags gs://composer-bucket-dev/dags'
  ].join('\n');
  var OWNER = G.lines(TF, G.at(TF, /resource "google_project_iam_member"/), G.span(TF, /resource "google_project_iam_member"/, /^}/)[1]);

  LAB.addChapter({
    id: 'm2', n: 2, title: 'Who can do what: IAM and security', short: 'IAM', blurb: 'Roles, service accounts, no key files, perimeters, keys and organization policies', minutes: 44,
    focus: ['sf'],
    goals: [
      'Read an **IAM policy** and say who can do what, and where the role comes from.',
      'Explain why a query needs **two** permissions: read on the data and a job in a project.',
      'Choose how a job **authenticates**: attached account, impersonation or federation, and never a key file.',
      'Set up **workload identity federation** for a GitHub deploy, with a condition.',
      'Say what a **perimeter**, a **customer-managed key** and an **organization policy** each prevent.',
      'Find the broad role in a Terraform file and explain the fix.'
    ],
    say: 'Mission 2 is access, and it comes before any data. Most cloud incidents are not clever attacks. They are a key file in a repository, a role that was too wide, or a bucket that was public. In this mission you grant roles on a hierarchy and see what reaches what, you see why a service account should never have a key, and you read a deploy workflow that proves who it is without any secret. The roles and services come from documentation. The workflow and the Terraform are real files that were checked by tools.',
    scenes: [
      B.flow({
        id: 'm2-flow', t: 1, src: 'docs', title: 'One request, with no key file', g: 'iam', legend: true,
        steps: [
          { say: 'A deploy job on GitHub must copy a file into a bucket in Brewline\'s project. It has no password and no key file. Press Next to follow the request. This is the safest way to let an outside system act in your cloud.', cap: 'A job with no secret in it.' },
          { say: 'Step 1. GitHub gives the running job a short-lived signed token that says which repository and which branch it is. The token is created for this run and expires.', on: ['a1'], focus: ['u_gh', 'u_wif'], cap: 'GitHub vouches for the job.' },
          { say: 'Step 2. In Google Cloud, a workload identity pool and provider say "I trust tokens from GitHub, but only for this repository". The condition on the provider is the lock. Without it, any repository on GitHub could ask.', on: ['a2'], focus: ['u_wif', 'u_sa'], cap: 'The provider trusts GitHub, with a condition.' },
          { say: 'Step 3. The job exchanges the GitHub token for a short-lived token of a service account, here sa-deploy. It now acts as that account, for about an hour, and then the token is useless.', on: ['a3'], focus: ['u_sa', 'u_tok'], cap: 'It acts as a service account, briefly.' },
          { say: 'Step 4. Every request carries that token. IAM looks at the roles that sa-deploy holds on the resource and on every level above it. A deny policy is checked first and wins over any allow.', on: ['a4'], focus: ['u_tok', 'u_iam'], cap: 'IAM checks the roles up the hierarchy.' },
          { say: 'Step 5. If the project sits in a VPC Service Controls perimeter, the call is also checked against it: where does the request come from, and is the service inside the perimeter. This stops a stolen token from copying data out.', on: ['a5'], focus: ['u_iam', 'u_perim'], cap: 'The perimeter checks where the call comes from.' },
          { say: 'Step 6 and 7. The request reaches the table, and the audit log records who did what. Nobody had a key to lose, and the log shows the repository and the service account for every call.', on: ['a6', 'a7'], focus: ['u_perim', 'u_res', 'u_log'], cap: 'The data is reached, and the call is logged.' }
        ]
      }),

      B.talk({
        id: 'm2-basics', t: 1, src: 'docs', title: 'Principals, roles and policies',
        say: 'IAM answers one question: may this principal do this action on this resource. Four words carry it. Press Next for each.',
        items: [
          ['Principal', 'Who asks: a **user**, a **group**, a **service account**, or a federated identity. A group is the right choice for people, because membership changes and the policy does not.', 'Grant to groups, not to people.'],
          ['Permission and role', 'A **permission** is one action, written `service.resource.verb`, for example `bigquery.tables.getData`. A **role** is a bundle of permissions. **Basic** roles (Owner, Editor, Viewer) are very broad. **Predefined** roles are made for one service. **Custom** roles are yours.', 'Use predefined roles. Avoid the basic ones.'],
          ['Binding and policy', 'A **binding** gives a role to principals on a resource. The **policy** of a resource is its list of bindings. A policy can also carry a **condition**, such as "until the end of the month" or "only for resources with this name".', 'Who, which role, on what, and under which condition.'],
          ['Inheritance', 'A binding on an organization, a folder or a project is inherited by every resource below. Allow roles are added up. An IAM **deny policy** is evaluated first and wins. So the widest grant sets the reach, and a deny is the way to hold a line.', 'A role reaches everything below its level.']
        ],
        cols: 1,
        call: { k: 'tip', h: 'The question to ask on every grant:', t: 'what is the smallest role, on the smallest resource, for the smallest group that does the job?' }
      }),

      B.widget({ id: 'm2-lab', kind: 'iam', t: 1, src: 'docs', title: 'Lab: who can read this table?' }),

      B.talk({
        id: 'm2-sa', t: 1, src: 'docs', title: 'Service accounts: identities for programs',
        say: 'A pipeline needs an identity, and it is not a person. That is a service account. Press Next for the four things to know.',
        items: [
          ['What it is', 'A **service account** is an identity for a workload. It lives in a project, has an email like `sa-pipeline@brewline-dev.iam.gserviceaccount.com`, and holds roles like any principal. One account per job, with the roles of that job, makes an audit log readable.', 'One job, one account.'],
          ['Attached to the workload', 'Composer, Dataflow workers, Cloud Run, Dataproc and Compute Engine **run as** a service account that you choose when you create them. Google provides the token to the code, and nothing is stored. To attach an account you need the **service account user** role on it.', 'The platform hands the token to the code.'],
          ['Impersonation', 'A person or another account with the **token creator** role on a service account can **impersonate** it: ask for a short-lived token for it. It is how an engineer tests with the exact permissions of a pipeline, without a key and with an audit trail of who did it.', 'Test as the pipeline, without its key.'],
          ['Keys are the risk', 'A **key file** is a long-lived secret that works from anywhere until someone deletes it. It gets copied, committed, pasted in a chat. The **organization policy** `iam.disableServiceAccountKeyCreation` stops anyone from making one. Newer organizations may have it switched on from the start, so check yours.', 'A key file is a password with no owner.']
        ],
        cols: 1
      }),

      B.cmp({
        id: 'm2-auth', t: 1, src: 'docs', title: 'How should a job authenticate?',
        say: 'Four ways, from best to worst. The right choice depends on where the job runs. Press Next to read the pattern.',
        cols: ['Way', 'Where it fits', 'Secret to protect', 'Verdict'],
        hl: 3,
        rows: [
          ['Attached service account', 'The job runs on Google Cloud: Composer, Dataflow, Cloud Run, Dataproc', 'none: the platform provides a short-lived token', 'Best'],
          ['Workload identity federation', 'The job runs outside Google Cloud: GitHub Actions, AWS, Azure, on premises', 'none: the outside system vouches for the job', 'Best for outside jobs'],
          ['Impersonation', 'A person or a script needs the rights of a service account for a while', 'none: a short-lived token with an audit trail', 'Good for people'],
          ['Service account key file', 'Only a legacy system that can do nothing else', 'the key, forever, wherever it was copied', 'Last resort, with a plan to remove it']
        ],
        steps: [
          { upto: 2, say: 'The first two have **no secret at all**. The platform or the outside system proves who the job is, and the token lasts about an hour.' },
          { upto: 3, say: 'Impersonation is for people. It gives a person the rights of a pipeline for a test, and the log says who did it.' },
          { upto: 4, say: 'A key file is a secret that you must store, rotate, and hope nobody copies. Treat every key as a finding.' }
        ],
        pick: 'Ask first **where the job runs**. On Google Cloud, attach an account. Outside, use federation. Anything else is a design smell, and a key file needs a ticket to remove it.'
      }),

      B.code({
        id: 'm2-wif', t: 1, src: 'rec', title: 'A deploy workflow with no secret', file: 'deploy.yml', lang: 'yaml', code: DEP,
        steps: [
          { say: 'This is a real workflow file for GitHub Actions. It deploys the Composer DAGs of Brewline. I checked it against the published schema of GitHub workflows, and I did not run it, because it would need a real project. Press Next to read the parts that matter.', lines: null },
          { say: 'The job asks for permission to **mint an OpenID Connect token**, `id-token: write`, and only read access to the repository. This permission is what lets GitHub give the job a token. Nothing else is granted.', lines: G.span(DEP, /^permissions:/, /id-token/) },
          { say: 'The `auth` action exchanges that token. It names the **provider** to talk to and the **service account** to act as. There is no key and no secret anywhere in the file: ' + (CI.deploy.uses_a_key_file ? 'a key was found.' : 'my check found no key file.'), lines: G.span(DEP, /google-github-actions\/auth/, /service_account:/) },
          { say: 'After that, every later step runs as `sa-deploy`. Here it is a single copy of the DAG files into the Composer bucket, with the smallest role that allows it. The service account has no other right.', lines: G.span(DEP, /gcloud storage rsync/) }
        ],
        note: 'Pin the versions of the actions that you use, and check the current major version before you copy the file: the versions here were the ones I knew, and they change.'
      }),

      B.code({
        id: 'm2-gcloud', t: 1, src: 'docs', title: 'The Google Cloud side of the same trust', file: 'setup_federation.sh', lang: 'bash', code: WIF,
        steps: [
          { say: 'The workflow works only if the cloud side trusts it. Three commands set it up once. I checked that every flag below exists in the help page of the installed `gcloud`. I did not run the commands, because they would change a project.', lines: null },
          { say: 'First a **pool**: a container for outside identities. One pool for GitHub is enough.', lines: G.span(WIF, /pools create/, /display-name/) },
          { say: 'Then a **provider** for GitHub\'s token issuer. The mapping says which claims of the token become attributes of the identity, and the **condition** is the lock: only tokens that come from the repository `brewline/data-platform` are accepted. Without a condition, a token from any repository would be valid.', lines: G.span(WIF, /providers create-oidc/, /attribute-condition/) },
          { say: 'Last, a binding: principals of the pool that come from this repository may act as `sa-deploy`. The role is **workload identity user**. That, and the roles of `sa-deploy` itself, are everything the job can do.', lines: G.span(WIF, /add-iam-policy-binding/, /member=/) }
        ],
        note: 'Whether the condition is mandatory has changed over time and may differ by provider type. Write one anyway, and check the current documentation.'
      }),

      B.term({
        id: 'm2-validate', t: 2, src: 'rec', title: 'The schema check, and a typo it catches',
        say: 'A workflow file is code, and a typo in it fails late. I validated the file against the published schema, then changed one key and validated it again. Watch the two answers.',
        lines: [].concat(
          term(OK, 'check-jsonschema --builtin-schema vendor.github-workflows deploy.yml'),
          [{ c: 'dim', t: '# the same file, with runs-on written as run-on', d: 500 }],
          term(BAD, 'check-jsonschema --builtin-schema vendor.github-workflows deploy.yml')
        ),
        after: 'The right file passes. The copy with `run-on` is refused, with exit code 1. A check like this belongs in the pipeline: it takes a second, and it catches the typo before a deploy does. A schema check does **not** prove that the workflow does what you mean.',
        afterKind: 'tip',
        doneSay: 'Validate the shape of the file in the pipeline, and test the behaviour in a dev project.'
      }),

      B.talk({
        id: 'm2-bq', t: 1, src: 'docs', title: 'Access in BigQuery has levels',
        say: 'BigQuery lets you set access at four levels, and a data engineer picks the level on purpose. Press Next for each.',
        items: [
          ['The project', 'Here sits the right to **run jobs**: the job user role. It decides who may spend the project\'s money and quota on queries. It does not give access to any data.', 'Running a query and reading data are different rights.'],
          ['The dataset', 'Most access is granted here: the data viewer role to analysts on `curated`, the data editor role to the pipeline on `staging`. A dataset is a natural unit, because it is a layer.', 'Grant on the dataset, to a group.'],
          ['The table or the view', 'A role can be given on one table. An **authorized view** lets a view read tables that the viewer cannot, so you can share a slice without sharing the table.', 'A view can share a slice.'],
          ['The column and the row', '**Policy tags** on columns and **row access policies** on tables decide who sees which column and which rows. Mission 12 builds them.', 'Finer than a table, when you need it.']
        ],
        cols: 1
      }),

      B.talk({
        id: 'm2-perim', t: 2, src: 'docs', title: 'Perimeters, keys and logs',
        say: 'Three controls sit around IAM. They do not replace it. They stop the mistakes that a good policy cannot. Press Next for each.',
        items: [
          ['VPC Service Controls', 'A **perimeter** is a boundary around projects and services. Calls from outside the perimeter to BigQuery or Cloud Storage inside it are refused, even with a valid token. It blocks **exfiltration**: a stolen credential, or a person who copies a table to their own bucket. A **dry-run** mode logs what would be blocked before you enforce.', 'A valid token is not enough from the wrong place.'],
          ['Customer-managed keys', 'Data is encrypted at rest with Google-managed keys by default. With a **customer-managed key** in Cloud KMS you hold the key: you can rotate it and disable it, which makes the data unreadable. The key admin and the data admin should be different people. Services that write data need the right to use the key.', 'You can turn the key off.'],
          ['Audit logs', '**Admin activity** logs, who changed a policy or created a resource, are always on. **Data access** logs, who read which data, must be turned on for most services, and the BigQuery job history gives a good view of reads. The logs are how you answer "who did that" after an incident.', 'Write the log before you need it.']
        ],
        cols: 1,
        call: { k: 'warn', h: 'Check before you rely on a default:', t: 'which audit logs are on by default, and which key rules apply, differs by service and changes over time. Read the current documentation for each service that you use.' }
      }),

      B.cmp({
        id: 'm2-org', t: 2, src: 'docs', title: 'Organization policies for a data platform',
        say: 'An organization policy is a rule that no project owner can switch off by accident. Here are the ones a data team asks for first. Press Next for each group.',
        cols: ['Constraint', 'What it prevents'],
        hl: 1,
        rows: [
          ['iam.disableServiceAccountKeyCreation', 'Making key files for service accounts'],
          ['iam.allowedPolicyMemberDomains', 'Granting a role to an account outside your company domains'],
          ['gcp.resourceLocations', 'Creating resources outside the locations that you allow'],
          ['storage.uniformBucketLevelAccess', 'Buckets that use object-level ACLs instead of IAM alone'],
          ['storage.publicAccessPrevention', 'Making a bucket or an object public'],
          ['sql.restrictPublicIp', 'Cloud SQL instances with a public address']
        ],
        steps: [
          { upto: 3, say: 'Identity rules. No key files, no outside members, and resources only where you allow them.' },
          { upto: 6, say: 'Storage and database rules. No public buckets, one access model for objects, and no database open to the internet.' }
        ],
        pick: 'A policy applies at the organization, a folder or a project, and lower levels may be allowed to override it. The names above are the ones I know from the documentation. **Check the current list of constraints** before you write yours.'
      }),

      B.decide({
        id: 'm2-dec', t: 1, src: 'docs', title: 'Decision: how does the nightly Composer job read BigQuery?',
        scenario: 'The nightly orders DAG runs in Cloud Composer, and it needs to read raw and write staging. Three ideas are on the table in the design review.',
        opts: [
          { t: 'Create a service account key for the DAG, store the file in a secret, and read it in the code', d: 'It works from any machine, so a developer can test with it.', lose: 'The key is a long-lived secret that can be copied from the secret, from a laptop, from a log. Rotating it breaks the jobs, so nobody does.' },
          { t: 'Run the Composer environment as a dedicated service account, with write on staging and read on raw', d: 'The platform provides a short-lived token to the code, and nothing is stored. The roles are small.', lose: '' },
          { t: 'Let the DAG run as the default account of the project, which has the Editor role', d: 'Nothing to set up.', lose: 'The default account is wide, shared by many services, and the audit log cannot tell the jobs apart.' }
        ],
        pick: 1,
        why: 'An attached, dedicated service account has no secret to lose and a role list that you can read in a minute. Developers who need to test use **impersonation** of that account.',
        when: 'If the DAG must call a system outside Google Cloud that needs a secret, keep that one secret in Secret Manager, and give only this account access to it.'
      }),

      B.bug({
        id: 'm2-bug', t: 1, q: 'This Terraform file gives the pipeline its role. A reviewer says "this is too wide". Click the line they mean.',
        file: 'main.tf', lang: 'hcl', code: OWNER, bad: [3],
        hint: 'What does the Owner role allow?',
        why: 'The role on line 3 is **Owner** for the whole project: it can change policies, delete data and create more access. A pipeline that merges orders needs to write two datasets. Checkov, the scanner that you meet in mission 14, flags this role with **' + ROLE_CHECKS + '** checks: basic roles at project level, and rights to manage or impersonate service accounts.',
        fix: 'resource "google_project_iam_member" "pipeline_role" {\n  project = var.project\n  role    = "roles/bigquery.dataEditor"\n  member  = "serviceAccount:${google_service_account.pipeline.email}"\n}',
        cheer: 'The smallest role that does the job.'
      }),

      B.bug({
        id: 'm2-bug2', t: 1, q: 'A teammate adds the authentication step to the deploy workflow. The security team asks for it to be removed. Click the line they object to.',
        file: 'deploy.yml', lang: 'yaml', code: KEYBUG, bad: [4],
        hint: 'What is a secrets.GCP_SA_KEY?',
        why: 'The step stores a **service account key** as a repository secret. Anyone who can read the secret, change a workflow, or see a log that prints it, holds a key that works from anywhere until it is deleted. Use federation, as in the real file: a provider, a service account, and no secret.',
        fix: KEYFIX,
        cheer: 'Prove who the job is, without a secret.'
      }),

      B.incident({
        id: 'm2-inc', t: 1, src: 'docs', title: 'Incident: a service account key is in a public repository', time: '17:40',
        alert: '**A scanner reports a service account key in a public GitHub repository, committed three weeks ago.** The key belongs to `sa-etl-legacy`, which has write access to the raw and staging datasets.',
        clues: ['The key is in the history of the repository', 'The account can write two datasets', 'Nobody knows which jobs still use it'],
        opts: [
          { t: 'Disable the key at once, then read the audit log for use of that key, rotate what it could reach, and move the jobs to attached accounts or federation', fb: '' },
          { t: 'Delete the commit from the repository and carry on', fb: 'The key is already copied by anyone who cloned or scraped the repository. Removing the commit does nothing to the key.' },
          { t: 'Wait until the owner of the job is back', fb: 'The key is valid right now, from anywhere. Every hour is an hour of exposure.' },
          { t: 'Make the repository private', fb: 'A good step to add, but the key still works for whoever already has it.' }
        ],
        best: 0,
        why: 'The key is the problem, not the commit. Disable it first. Then use the audit log to see whether it was used from an unknown place, treat the data that it could write as untrusted until checked, and remove the reason that a key existed.',
        checks: [
          ['Stop the use', 'Disable the key (do not delete it yet, so that you can see what breaks and what used it).'],
          ['Read the log', 'Search the audit log for calls with that key, from addresses you do not know.'],
          ['Check the data', 'Look at the writes in raw and staging since the commit. Compare counts with the sources.'],
          ['Replace', 'Move the jobs to an attached service account or to federation, then delete the key.']
        ],
        tell: 'A scanner found a key in a public repository. I disabled it within minutes, checked the audit log for use from unknown places and compared the written data with the sources. Then I moved the jobs to an attached account and turned on the organization policy that blocks new keys.',
        prevent: ['Enforce `iam.disableServiceAccountKeyCreation`', 'Scan commits for secrets before they are pushed', 'Use attached accounts and federation, so there is no key to leak']
      }),

      B.quiz({
        id: 'm2-q1', t: 1,
        q: 'An analyst holds the data viewer role on the curated dataset and nothing else. Their query fails. Why?',
        opts: [
          { t: 'The dataset is too big', fb: 'Size is not the problem. This is a permission error.' },
          { t: 'A query is a job, and they have no permission to create a job in any project', fb: '' },
          { t: 'The data viewer role cannot read tables', fb: 'It can read tables. It is the job that is missing.' },
          { t: 'They need the owner role on the dataset', fb: 'Owner is far too wide, and it would not give them a job permission in a project either.' }
        ],
        ok: 1,
        why: 'Reading data and running a job are two rights. Give the analysts the job user role on the project that runs their queries, and the data viewer role on the dataset.'
      }),

      B.quiz({
        id: 'm2-q2', t: 1,
        q: 'You grant a role to a group on a folder. Which projects does it reach?',
        opts: [
          { t: 'Only the first project in the folder', fb: 'Inheritance is not limited to one project.' },
          { t: 'Every project in the folder, and the resources in them', fb: '' },
          { t: 'None, until you repeat the grant on each project', fb: 'A binding on a folder is inherited. That is its point.' },
          { t: 'Only projects created after the grant', fb: 'It reaches existing and future projects alike.' }
        ],
        ok: 1,
        why: 'The widest grant sets the reach. Grant on a folder only when every project in it should have the role.'
      }),

      B.quiz({
        id: 'm2-q3', t: 2,
        q: 'A federated provider for GitHub has no attribute condition. What is the risk?',
        opts: [
          { t: 'None: the token must still come from GitHub', fb: 'Any repository on GitHub can get such a token.' },
          { t: 'A workflow in any repository could get a token that the provider accepts', fb: '' },
          { t: 'The token will expire at once', fb: 'Expiry is not affected.' },
          { t: 'The service account cannot be impersonated', fb: 'It can, and that is the problem if the binding is also wide.' }
        ],
        ok: 1,
        why: 'The condition limits the provider to your repository, and the binding limits which identities may act as the service account. Write both.'
      }),

      B.quiz({
        id: 'm2-q4', t: 2,
        q: 'What does an IAM deny policy do that an allow role cannot?',
        opts: [
          { t: 'Nothing: they are the same', fb: 'A deny is evaluated first and wins.' },
          { t: 'It blocks an action even where a role elsewhere in the hierarchy allows it', fb: '' },
          { t: 'It encrypts the resource', fb: 'Encryption is a different control.' },
          { t: 'It limits the number of jobs per day', fb: 'That is a quota, not a deny.' }
        ],
        ok: 1,
        why: 'Allow roles are added up. A deny holds a line that a later grant cannot cross, which is useful for a rule such as "nobody deletes the production datasets".'
      }),

      B.order({
        id: 'm2-ord', t: 1, q: 'Put the setup of a new pipeline identity in a sensible order.',
        items: [
          'Create a service account for this job only',
          'List what the job reads and writes',
          'Grant the smallest role on each dataset or bucket',
          'Attach the account to the Composer environment or the Dataflow job',
          'Let engineers test by impersonating it',
          'Review the roles after a month, and remove what the job never used'
        ],
        why: 'Name the need before the grant, so the list of roles is short. Attaching removes the need for a key, and impersonation gives engineers a way to test as the pipeline. A review with real usage keeps the roles honest.'
      }),

      B.qa({
        id: 'qa-iam', t: 1, tag: 'Security', secs: 75,
        q: 'How do you give a pipeline access to BigQuery in a safe way?',
        pts: ['A dedicated service account for the job', 'Smallest roles on the smallest resources', 'Attach it to the platform, no key file', 'Job user role in the project, data roles on the datasets', 'Impersonation for testing', 'Audit log and a review of roles'],
        short: 'I create a service account for that one job and attach it to the platform that runs it, such as Composer or Dataflow. The platform gives the code a short-lived token, so there is no key to store or leak. I grant the smallest roles on the smallest resources: the data editor role on the staging dataset it writes, the data viewer role on raw, and the job user role on the project that runs its queries.\n\nFor testing, engineers impersonate the account instead of using a key, and the audit log shows who did it. Every month I look at what the account actually used and remove the rest.',
        fu: [['What if the job runs outside Google Cloud?', 'Workload identity federation: the outside system proves who it is with a token, and the pool maps it to a service account, with a condition on the repository or the account.'], ['Why not the Editor role?', 'It is broad, shared across services, and makes the audit log useless for telling jobs apart.']],
        trap: 'Describing roles without saying how the job proves who it is. The interviewer is listening for "no key file".',
        real: 'Tell me about a time you found a key or a role that was too wide, and how you fixed it.'
      }),

      B.qa({
        id: 'qa-wif', t: 2, tag: 'Security', secs: 90,
        q: 'How does a GitHub Actions job deploy to Google Cloud without a key?',
        pts: ['Workload identity federation', 'Job permission to mint an ID token', 'Pool and provider that trust GitHub, with a repository condition', 'Binding that lets the pool identity act as a service account', 'Short-lived token, smallest roles', 'Audit log shows repository and account'],
        short: 'With workload identity federation. The workflow asks for permission to get an OpenID Connect token from GitHub, and an auth step exchanges it for a short-lived token of a service account. In Google Cloud I create a pool and a provider for the GitHub issuer, with an attribute mapping and a **condition** that accepts only my repository. Then I bind the pool identity of that repository to the service account with the workload identity user role.\n\nThe service account holds only the roles the deploy needs. There is no secret in GitHub, the token lasts about an hour, and the audit log shows which repository and which account made each call.',
        fu: [['What goes wrong without the condition?', 'A workflow in any repository could obtain a token that the provider accepts. The binding to the service account must also be narrow.'], ['Can you restrict by branch?', 'Yes, by mapping and checking claims such as the reference, so only the main branch can deploy to production.']],
        trap: 'Saying "store the key in GitHub secrets". The whole point is to have no key.',
        real: 'Describe how you removed a long-lived secret from a pipeline.'
      }),

      B.qa({
        id: 'qa-perim', t: 2, tag: 'Security', secs: 75,
        q: 'What does VPC Service Controls protect against that IAM does not?',
        pts: ['IAM decides who; a perimeter decides from where', 'Exfiltration with a valid credential', 'Copying data to a project outside the perimeter', 'Access levels for approved networks and devices', 'Dry-run first, then enforce', 'Operational cost: services and partners must be allowed deliberately'],
        short: 'IAM decides **who** may do something. A perimeter decides **from where**, and between which projects and services. If a credential is stolen, or a person with legitimate access tries to copy a table into a bucket in their own project, IAM would allow the read, but the perimeter refuses the call that crosses its boundary. That protects against exfiltration.\n\nIt has a cost: every legitimate flow across the boundary, such as a partner or a service in another project, needs an explicit rule. So I start in dry-run mode, read the violations in the logs, and enforce only when the list is clean.',
        fu: [['Does it replace IAM?', 'No. They work together. A perimeter is an extra check on top of a correct policy.'], ['What breaks first?', 'Cross-project pipelines and tools outside the perimeter. They show up in the dry-run logs.']],
        trap: 'Describing it as a firewall. It controls API calls to services, not network packets.',
        real: 'Describe how you would allow a partner to read one table without opening the perimeter.'
      }),

      B.qa({
        id: 'qa-owner', t: 1, tag: 'Security', secs: 60,
        q: 'A pull request grants the Owner role to a pipeline account. What do you say?',
        pts: ['Owner can change policies and delete data', 'Ask what the job needs to read and write', 'Predefined roles on the datasets', 'Scan the Terraform in the pipeline to catch it', 'Document an exception if one is truly needed'],
        short: 'I would not approve it. Owner can change policies, delete resources and grant more access, which a pipeline never needs. I ask what the job reads and writes, and I replace the role with predefined roles on those datasets, for example data editor on staging and data viewer on raw, plus the job user role on the project.\n\nTo stop it from coming back I scan the Terraform in the pipeline, so the pull request fails on broad roles. If an exception is truly needed, it is written down with an owner and a date.',
        fu: [['What would catch it automatically?', 'A policy scan such as Checkov in CI, and an organization policy or deny policy for the most dangerous roles.'], ['And for people?', 'Groups with predefined roles, and time-limited extra access with a condition.']],
        trap: 'Saying that it is fine because the account is internal.',
        real: 'Tell me about a time you reduced a role without breaking a job.'
      }),

      B.recap({
        id: 'm2-recap', n: 2, badge: 'Key Keeper', color: '#BFDBFE',
        pts: [
          'IAM answers: **who** may do **what** on **which resource**. A role on a level reaches everything below it. A **deny** wins over any allow.',
          'A query needs **two rights**: read on the data and **a job** in a project.',
          'Give pipelines their own **service account**, attached to the platform. **Impersonate** to test.',
          'A **key file** is a secret with no owner. Use an attached account, or **federation** for outside jobs, with a **condition**.',
          'A **perimeter** blocks calls from the wrong place. A **customer-managed key** can be turned off. **Audit logs** answer "who did that".',
          '**Organization policies** make the right choice the only one: no keys, no public buckets, allowed locations.'
        ],
        lines: [
          'I grant the smallest role on the smallest resource to a group.',
          'I never create a key when a platform or federation can prove who the job is.',
          'I scan my Terraform for broad roles before anyone merges it.'
        ]
      })
    ]
  });
})();
