/* Mission 13: infrastructure as code with Bicep, and a pipeline that you can trust.
   Recorded: Checkov, a static analysis tool, read the Bicep files in azure/verify/iacproj and reported which of its rules each file passes, fails
   or skips, and a JSON schema (the one for GitHub Actions workflows, built into check-jsonschema) checked the workflow file, once good and once broken.
   The Bicep program could not be run in the sandbox, so no template was compiled and none was deployed, and what-if never ran. The behavior of Bicep,
   what-if, deployment modes, federated credentials and the other Azure services comes from the Azure documentation. Nothing here ran on Azure. */
(function () {
  var B = LAB.b, G = LAB.get;
  var CK = G.counts('iac.checkov'), WF = G.counts('iac.workflow'), BY = CK.by_file;
  var LAKE = G.file('iac/modules/lake.bicep'), FACTORY = G.file('iac/modules/factory.bicep'), MAIN = G.file('iac/main.bicep'), DEPLOY = G.file('iac/.github/workflows/deploy.yml');
  var WF_OK = G.text('iac.workflow_ok'), WF_ERR = G.text('iac.workflow_error');
  function names(f) { return BY[f]; }

  G.expect(CK.version && CK.framework === 'bicep' && CK.parsing_errors === 0 && CK.bicep_files.length === 7 && CK.resource_count === 18, 'Checkov read seven Bicep files and 18 resources with no parsing errors');
  G.expect(CK.passed === 24 && CK.failed === 2 && CK.skipped === 5, 'the scan passed 24 checks, failed 2 and skipped 5');
  G.expect(BY['examples/lake_open.bicep'].failed.join() === 'CKV_AZURE_35' && BY['examples/lake_public_off.bicep'].failed.join() === 'CKV_AZURE_35' && BY['examples/lake_secure.bicep'].failed.length === 0 && BY['modules/lake.bicep'].failed.length === 0 && BY['modules/factory.bicep'].failed.length === 0, 'only the open file and the public-off file without a default action fail, and both fail the default network rule');
  G.expect(CK.skipped_checks.length === 5 && CK.skipped_checks.every(function (c) { return c.reason.trim().length > 10; }), 'every skipped check carries a written reason');
  G.expect(WF.ok_exit_code === 0 && WF.broken_exit_code === 1 && /ok -- validation done/.test(WF_OK) && /'runs-on' is a required property/.test(WF_ERR), 'the workflow passes the schema, and the broken copy fails on runs-on');
  G.expect(/permissions:\n  id-token: write/.test(DEPLOY) && /environment: prod/.test(DEPLOY) && /needs: deploy-dev/.test(DEPLOY), 'the workflow asks for an identity token, waits for dev, and uses the prod environment');

  var SHORT = { 'CKV_AZURE_3': 'HTTPS only', 'CKV_AZURE_34': 'containers are private', 'CKV_AZURE_35': 'default network rule is deny', 'CKV_AZURE_36': 'trusted Azure services may pass', 'CKV_AZURE_43': 'account name follows the rules', 'CKV_AZURE_44': 'latest TLS version', 'CKV_AZURE_59': 'no public access', 'CKV_AZURE_103': 'factory uses Git', 'CKV_AZURE_104': 'factory public access is off', 'CKV_AZURE_206': 'storage uses replication' };
  function short(id) { return SHORT[id] || CK.names[id]; }
  function reasonOf(file, id) { var r = CK.skipped_checks.filter(function (c) { return c.file === file && c.id === id; })[0]; return r ? r.reason.trim() : ''; }
  function checkRows(file) {
    var f = BY[file];
    return f.failed.map(function (id) { return [id, 'FAILED', short(id)]; }).concat(f.skipped.map(function (id) { return [id, 'skipped', short(id)]; })).concat(f.passed.map(function (id) { return [id, 'passed', short(id)]; }));
  }
  function scanLines() {
    var out = [{ c: 'cmd', t: '$ checkov -d azure/verify/iacproj --framework bicep --output json --skip-download', d: 600 },
      { c: 'dim', t: '# Checkov ' + CK.version + ': ' + CK.passed + ' passed, ' + CK.failed + ' failed, ' + CK.skipped + ' skipped, ' + CK.resource_count + ' resources, ' + CK.parsing_errors + ' parsing errors (listed here by file)', d: 300 }];
    Object.keys(BY).sort().forEach(function (f) {
      out.push({ c: 'hl', t: f, d: 220 });
      BY[f].failed.forEach(function (id) { out.push({ c: 'err', t: '  FAILED   ' + id + '  ' + CK.names[id], d: 140 }); });
      BY[f].skipped.forEach(function (id) { out.push({ c: 'warn', t: '  skipped  ' + id + '  (' + reasonOf(f, id).slice(0, 52) + (reasonOf(f, id).length > 52 ? '...' : '') + ')', d: 140 }); });
      out.push({ c: 'ok', t: '  passed   ' + BY[f].passed.length + ' checks', d: 120 });
    });
    return out;
  }

  var BUG_LOGIN = [
    '      - uses: azure/login@v2',
    '        with:',
    '          creds: ${{ secrets.AZURE_CREDENTIALS }}',
    '      - name: Deploy to production',
    '        run: az deployment group create --resource-group rg-brewline-data-prod --template-file infra/main.bicep --parameters envName=prod'
  ].join('\n');
  var FIX_LOGIN = [
    '      - uses: azure/login@v2',
    '        with:',
    '          client-id: ${{ vars.AZURE_CLIENT_ID }}',
    '          tenant-id: ${{ vars.AZURE_TENANT_ID }}',
    '          subscription-id: ${{ vars.AZURE_SUBSCRIPTION_ID }}',
    '      - name: Deploy to production',
    '        run: az deployment group create --resource-group rg-brewline-data-prod --template-file infra/main.bicep --parameters envName=prod'
  ].join('\n');

  var BUG_MODE = [
    'az deployment group create \\',
    '  --resource-group rg-brewline-data-prod \\',
    '  --template-file infra/main.bicep \\',
    '  --mode Complete \\',
    '  --parameters envName=prod alertEmail=data-platform@brewline.example'
  ].join('\n');
  var FIX_MODE = BUG_MODE.replace('  --mode Complete \\\n', '');

  var GATE = [
    'import json',
    'import sys',
    '',
    'results = json.load(open("checkov.json"))["results"]',
    'failed = results["failed_checks"]',
    'for check in failed:',
    '    print(check["check_id"], check["file_path"], check["check_name"])',
    'sys.exit(1 if failed else 0)'
  ].join('\n');
  var FAILED = CK.failed_checks;

  LAB.addChapter({
    id: 'm13', n: 13, title: 'Infrastructure as code and delivery', short: 'IaC and delivery', blurb: 'Bicep modules, scans before deployment, a pipeline without stored secrets, what-if, approval and drift', minutes: 50,
    focus: ['ci', 'sf'],
    goals: [
      'Say why the platform should be **code**, and compare **Bicep, ARM, Terraform and scripts**.',
      'Read a **module**: parameters, resources, children, loops, outputs and role assignments.',
      'Use a **static scan** before deployment, and read what it says and what it misses.',
      'Build a **pipeline**: lint, scan, what-if, deploy to dev, approval, deploy to prod.',
      'Sign in with a **federated credential** and no stored secret.',
      'Detect and handle **drift**, and know why **Complete mode** is dangerous.'
    ],
    say: 'Mission 13 is how the platform gets built the same way twice. I could not run the Bicep program here, so no template was compiled or deployed, and I will say so wherever it matters. What I could run was a static scanner on the Bicep files, and a schema check on the workflow file. Those results are recorded. What-if, deployment modes and federated credentials come from the documentation.',
    scenes: [
      B.flow({
        id: 'm13-flow', t: 1, src: 'docs', title: 'The road of a change to production', g: 'cicd', legend: false,
        steps: [
          { say: 'A change to the platform is a pull request. Press Next to follow it to production, and watch where a check or a person stands in the way. The boxes change color as each stage finishes.', cap: 'A change is a pull request.', status: { git: 'wait', ci: 'wait', oidc: 'wait', dev: 'wait', tst: 'wait', apr: 'wait', prd: 'wait', drf: 'wait' } },
          { say: 'Step 1. An engineer opens a pull request that changes a Bicep file. Nothing is deployed. The pipeline lints the file, scans it, and runs a what-if: a list of what would be created, changed or deleted.', on: ['d1'], status: { git: 'ok', ci: 'run', oidc: 'wait', dev: 'wait', tst: 'wait', apr: 'wait', prd: 'wait', drf: 'wait' }, cap: 'Check before anything changes.' },
          { say: 'Step 2. After the review and the merge, the pipeline signs in to Entra ID with a federated credential. GitHub proves who the job is with a short-lived token, so there is no secret to store or rotate.', on: ['d2'], status: { git: 'ok', ci: 'ok', oidc: 'run', dev: 'wait', tst: 'wait', apr: 'wait', prd: 'wait', drf: 'wait' }, cap: 'Sign in without a secret.' },
          { say: 'Step 3. The same template deploys to the development subscription first, with the parameters of dev.', on: ['d3'], status: { git: 'ok', ci: 'ok', oidc: 'ok', dev: 'run', tst: 'wait', apr: 'wait', prd: 'wait', drf: 'wait' }, cap: 'Dev goes first.' },
          { say: 'Step 4. A smoke test runs: one small pipeline run and one query. If it fails, nothing goes further.', on: ['d4'], status: { git: 'ok', ci: 'ok', oidc: 'ok', dev: 'ok', tst: 'run', apr: 'wait', prd: 'wait', drf: 'wait' }, cap: 'Does it really work?' },
          { say: 'Step 5. For production a person approves. The environment named prod has required reviewers, and the job waits until one of them says go.', on: ['d5'], status: { git: 'ok', ci: 'ok', oidc: 'ok', dev: 'ok', tst: 'ok', apr: 'run', prd: 'wait', drf: 'wait' }, cap: 'A person says go.' },
          { say: 'Step 6. After the approval, the same template deploys to production, with the parameters of prod.', on: ['d6'], status: { git: 'ok', ci: 'ok', oidc: 'ok', dev: 'ok', tst: 'ok', apr: 'ok', prd: 'run', drf: 'wait' }, cap: 'The same template, other parameters.' },
          { say: 'Step 7. Every night a what-if against production looks for drift: a setting that somebody changed by hand. A difference raises an alert, and the fix goes through a pull request.', on: ['d7'], status: { git: 'ok', ci: 'ok', oidc: 'ok', dev: 'ok', tst: 'ok', apr: 'ok', prd: 'ok', drf: 'run' }, cap: 'Drift is found within a day.' },
          { say: 'And when a stage fails? A failed smoke test stops the chain: the approval is skipped, and production never sees the change.', status: { git: 'ok', ci: 'ok', oidc: 'ok', dev: 'ok', tst: 'fail', apr: 'skip', prd: 'skip', drf: 'wait' }, cap: 'A failure stops everything after it.' }
        ]
      }),

      B.talk({
        id: 'm13-why', t: 1, src: 'docs', title: 'Why the platform should be code',
        say: 'Brewline now has a second region to build. Press Next for five reasons that the platform should be code and not clicks.',
        items: [
          ['The same, every time', 'Dev and prod come from one template, and differ only in parameters such as the size, the redundancy and the budget. A setting that is right in dev is right in prod.', 'One template, many environments.'],
          ['Review before change', 'A change is a pull request. A colleague reads the diff, and a scan and a what-if run before a human decides. Nobody changes production on a Friday evening from a browser.', 'A second pair of eyes, by default.'],
          ['A history', 'Git records who changed what and why. When something breaks on Tuesday, the list of Monday\'s changes is one command.', 'The audit trail is free.'],
          ['Rebuild quickly', 'A lost resource group, a new region or a new customer is the same template and another parameter file. The European branch is exactly that.', 'Rebuild, not rediscover.'],
          ['Drift is visible', 'The template says what should exist, and a what-if says how the real thing differs. Without code you cannot even ask the question.', 'The template is the question and the answer.']
        ],
        cols: 1
      }),

      B.cmp({
        id: 'm13-tools', t: 1, src: 'docs', title: 'Bicep, ARM, Terraform or a script?',
        say: 'Four ways to build Azure from files or commands. Press Next to compare them. Pick by the team and the estate, and read what each one keeps as state.',
        cols: ['Tool', 'What it is', 'Good for', 'Watch for'],
        hl: 1,
        rows: [
          ['Bicep', 'A language for Azure that compiles to an ARM template. Azure Resource Manager holds the state, so there is no state file.', 'Azure-only teams. Microsoft states that new resource types and API versions work in Bicep from the day they appear.', 'It is Azure only. Learn what-if and the deployment modes.'],
          ['ARM template', 'The JSON that Azure takes. Bicep compiles to it, and exports from the portal produce it.', 'reading what an export contains, and older repositories', 'Verbose and hard to review. Write Bicep, and keep JSON as the output.'],
          ['Terraform', 'A language from HashiCorp with an Azure provider and a state file that you keep, for example in a blob container with a lock.', 'estates that span clouds, and teams that already use it', 'You own the state. A lost or damaged state is a project. A new Azure feature can reach the provider later.'],
          ['A script with the Azure CLI', 'Commands, one after another', 'a one-off task or a quick test', 'Not repeatable by default, with no what-if, and drift stays invisible.']
        ],
        steps: [
          { upto: 2, say: 'The Azure-native pair. Bicep is what you write and ARM is what it compiles to.' },
          { upto: 4, say: 'The other two. Terraform is a real alternative with a state to look after, and a script is for a task, and not for a platform.' }
        ],
        pick: 'For an Azure-only team, write **Bicep**. Choose **Terraform** when the estate spans clouds or the team already runs it. Use **scripts** for one-off tasks and never for the platform itself.'
      }),

      B.code({
        id: 'm13-lake', t: 1, src: 'rec', title: 'A module: the lake account', file: 'modules/lake.bicep', lang: 'bicep', code: LAKE,
        steps: [
          { say: 'This is a module of the Brewline set. It builds the lake account with its containers. Press Next.', lines: null },
          { say: 'Parameters are what differs between environments. The name and the location arrive from outside, and a flag says whether the account should be zone redundant.', lines: G.span(LAKE, /^param name/, /^param zoneRedundant/) },
          { say: 'The resource has a type with an API version, a name, and properties. The SKU is chosen by the flag: ZRS in prod, LRS in dev, as the cost mission suggested for data that can be rebuilt.', lines: G.span(LAKE, /^resource lake/, /^  \}$/) },
          { say: 'The security properties of mission 11: HTTPS only, TLS 1.2, no public containers, no shared key, no public network access, and an explicit deny rule.', lines: G.span(LAKE, /isHnsEnabled/, /bypass/) },
          { say: 'The first line inside the resource is a comment for the scanner. It skips one rule and writes the reason down, so a decision stays next to the code that it belongs to.', lines: G.span(LAKE, /checkov:skip/) },
          { say: 'A child resource has a `parent`. This one turns on soft delete for blobs and for containers, 14 days each, as mission 2 recommended.', lines: G.span(LAKE, /^resource blobs/, /^\}$/) },
          { say: 'A loop makes one container for each name in the list: raw, clean and curated. The three zones of the lake come from three lines of data.', lines: G.span(LAKE, /^resource zones/, /^\}\]$/) },
          { say: 'Outputs hand values to the caller. The factory module needs the name of the lake, so the lake module returns it.', lines: G.span(LAKE, /^output id/, /^output name/) }
        ],
        note: 'The file is `azure/verify/iacproj/modules/lake.bicep`. Checkov read it in the recording: ' + names('modules/lake.bicep').passed.length + ' checks passed, none failed, one was skipped with the reason in line 6. It was not compiled and not deployed.'
      }),

      B.code({
        id: 'm13-factory', t: 1, src: 'rec', title: 'A module: the factory, its identity and its role', file: 'modules/factory.bicep', lang: 'bicep', code: FACTORY,
        steps: [
          { say: 'The factory module shows the pattern of mission 3 as code: an identity, and a role assignment that names it. Press Next.', lines: null },
          { say: 'The role is a fixed id, and the comment says which role it is. Storage Blob Data Contributor lets the factory read and write the blobs of the lake.', lines: G.span(FACTORY, /^\/\/ Storage Blob/, /^var blobDataContributor/) },
          { say: 'The factory has a system-assigned identity, which Azure creates and deletes with it. Public network access is off, as in mission 11. The comment skips the rule about Git and gives the reason: only the dev factory is connected to Git.', lines: G.span(FACTORY, /^resource factory/, /^\}$/) },
          { say: '`existing` refers to a resource that another module created. The code reads the lake by name, and does not create it again.', lines: G.span(FACTORY, /^resource lake/, /^\}$/) },
          { say: 'The role assignment has three parts: who, which role, and which scope. The `scope` is the lake, and the `principalId` is the object id of the identity. A name made with `guid` is stable, so a second deployment finds the same assignment and changes nothing.', lines: G.span(FACTORY, /^resource grant/, /^\}$/) }
        ],
        note: 'The file is `azure/verify/iacproj/modules/factory.bicep`. Checkov passed the rule that checks for public network access off and skipped the Git rule, as the comment says. It was not compiled and not deployed, so the property names come from the reference and from mission 3.'
      }),

      B.code({
        id: 'm13-main', t: 1, src: 'rec', title: 'The main file wires the modules together', file: 'main.bicep', lang: 'bicep', code: MAIN,
        steps: [
          { say: 'The main file is small. It chooses the environment and calls the modules. Press Next.', lines: null },
          { say: 'The environment is one of two names, checked by `@allowed`. Everything else follows from it, so a typo such as `porod` fails before anything is deployed.', lines: G.span(MAIN, /^@allowed/, /^param envName/) },
          { say: 'The lake module gets a name made from the environment, and it is zone redundant only in prod.', lines: G.span(MAIN, /^module lake/, /^\}$/) },
          { say: 'The factory module receives the name that the lake module returned. That line also tells Bicep the order: the lake is built before the factory.', lines: G.span(MAIN, /^module factory/, /^\}$/) },
          { say: 'The budget module takes an amount that depends on the environment, 8,000 for prod and 800 for dev, and the address that gets the alerts, as mission 12 asked.', lines: G.span(MAIN, /^module budget/, /^\}$/) }
        ],
        note: 'The file is `azure/verify/iacproj/main.bicep`. Checkov has no rule for module calls, so it checked nothing here except that the file parses. It was not compiled, and the real deployment would be the first test of the wiring.'
      }),

      B.term({
        id: 'm13-scan', t: 1, src: 'rec', title: 'A static scan of the Bicep files',
        say: 'Here is Checkov reading all seven Bicep files of the set. It applies its own rules and reports each file. Watch the failures, and the skips with their reasons.',
        lines: scanLines(),
        after: 'The scan found **' + CK.failed + ' failures in ' + CK.resource_count + ' resources**, and both are the same rule on two example files. Five checks were **skipped**, and each skip carries a written reason, in a comment next to the resource. Checkov **parsed** every file with no errors, which is also a weak check of the syntax. It does not compile the template, it does not deploy it, and it has rules only for some resource types: the module calls and the budget were not judged at all.',
        afterKind: 'tip',
        doneSay: 'A scan reads the code, and it says nothing about whether the template deploys. Think of it as a spell checker for settings.'
      }),

      B.rows({
        id: 'm13-scan-rows', t: 2, src: 'rec', title: 'A scanner reads one property, and not your intent',
        steps: [
          {
            say: 'The first example is the open lake: its default network action is Allow. Checkov fails it on one rule, and it is right. Everything else passes, and the replication rule is skipped with a reason.',
            tabs: [{ layer: 'OPEN', name: 'examples/lake_open.bicep', c: 'mon', cols: ['check', 'result', 'the rule, in short'], rows: checkRows('examples/lake_open.bicep'), chg: [[0, 1]], trk: 0 }],
            notes: ['The failed rule reads: **' + CK.names.CKV_AZURE_35 + '**.']
          },
          {
            say: 'The second example looks safe: public network access is disabled, and nothing allows traffic. Checkov still fails the same rule, because it reads the default action, and the file does not state it. The intent was right and the file was silent.',
            tabs: [{ layer: 'PUBLIC OFF', name: 'examples/lake_public_off.bicep', c: 'qual', cols: ['check', 'result', 'the rule, in short'], rows: checkRows('examples/lake_public_off.bicep'), chg: [[0, 1]], trk: 0 }],
            notes: ['A scanner has a list of properties that it knows. When one is missing, it can flag a file that is safe by another route. Do not turn the rule off: state the property, so that the file says what you mean.']
          },
          {
            say: 'The third example states both: public access disabled, and a default action of Deny. Nothing fails, and the replication rule is skipped with the reason in a comment. The same intent, written so that a person and a tool both read it.',
            tabs: [{ layer: 'SECURE', name: 'examples/lake_secure.bicep', c: 'int', cols: ['check', 'result', 'the rule, in short'], rows: checkRows('examples/lake_secure.bicep'), trk: 0 }],
            notes: ['The skip says: **' + reasonOf('examples/lake_secure.bicep', 'CKV_AZURE_206') + '**. A skip with a reason is a decision. A skip without one is a hole.']
          }
        ]
      }),

      B.talk({
        id: 'm13-params', t: 1, src: 'docs', title: 'Parameters, secrets and names',
        say: 'A template is only reusable if the right things are parameters. Press Next for five habits.',
        items: [
          ['Parameters for what differs', 'The environment, the size, the redundancy and the budget are parameters. A parameter file for each environment holds the values, so the template stays the same and the files differ.', 'The template does not know the environment.'],
          ['Never a secret in a parameter file', 'A parameter marked `@secure()` is hidden from logs, and it is still a value that someone typed somewhere. Better, let the resource read the secret from Key Vault itself, or use a managed identity, so that no secret passes through the deployment at all.', 'Avoid the secret, not just hide it.'],
          ['Names with a rule', 'A storage account name must be unique in all of Azure, so the name needs a rule, such as a short prefix, the workload and the environment, and sometimes a hash from `uniqueString()`. Write the rule down once, in the template.', 'One naming rule, in code.'],
          ['Modules, one concern each', 'A module builds one thing and returns what others need. The lake module returns its name. Small modules are easy to review and to reuse for the European branch.', 'Small and reusable.'],
          ['Scope', 'A deployment targets a resource group, a subscription, a management group or the tenant. Role assignments and policies often live at a larger scope than the resources. Know the scope of each file.', 'Say where each file deploys.']
        ],
        cols: 1
      }),

      B.talk({
        id: 'm13-whatif', t: 1, src: 'docs', title: 'What-if and the two deployment modes',
        say: 'What-if is the preview of a deployment, and the mode decides what a deployment may delete. Press Next for both.',
        items: [
          ['What-if', 'The command `az deployment group what-if` compares the template with what exists, and lists each resource as Create, Modify, Delete, Ignore or NoChange, without changing anything. A reviewer reads it next to the diff in the pull request.', 'A preview of the change.'],
          ['A prediction, not a promise', 'What-if is a good guide and not a guarantee. Some properties that the service fills in can show up as changes, and it cannot know every effect of a change. Read it with judgment.', 'Useful, with noise.'],
          ['Incremental mode', 'The default. Resources that are in the template are created or updated, and resources that are not in the template are left alone. A manual change to a property that the template names is overwritten at the next deployment.', 'The template wins for what it names.'],
          ['Complete mode', 'Resources in the resource group that the template does not name are deleted. A Key Vault that someone created by hand, or a pool that a colleague added for a test, can disappear. Use it only with a what-if that you have read, and think about deployment stacks instead.', 'Complete means: delete the rest.'],
          ['Deployment stacks', 'A deployment stack manages a set of resources as a unit, and can delete resources that you remove from the template, and can deny changes from outside. Microsoft also points to stacks and template specs as the replacements of Azure Blueprints, which are being retired. Check the current dates and features.', 'A newer way to manage a set.']
        ],
        cols: 1
      }),

      B.code({
        id: 'm13-workflow', t: 1, src: 'rec', title: 'The pipeline file', file: '.github/workflows/deploy.yml', lang: 'yaml', code: DEPLOY,
        steps: [
          { say: 'This is the workflow of the pipeline from the picture, as a GitHub Actions file. A JSON schema checked its structure. Press Next.', lines: null },
          { say: 'The triggers. A pull request that touches `infra/` runs the checks, and a push to main runs the deployments. Nothing runs for a change in another folder.', lines: G.span(DEPLOY, /^on:/, /^      - 'infra\/\*\*'$/) },
          { say: 'The permissions. `id-token: write` lets the job ask GitHub for a short-lived identity token, and `contents: read` is all it needs for the code. Nothing more.', lines: G.span(DEPLOY, /^permissions:/, /contents: read/) },
          { say: 'The first job runs on a pull request. It signs in with `azure/login`, and passes ids, not a secret: a client id, a tenant id and a subscription id. Then it runs a what-if against dev.', lines: G.span(DEPLOY, /^  whatif:/, /--parameters envName=dev/) },
          { say: 'The dev deployment runs only on a push, and its environment is `dev`. It signs in the same way and deploys the same template.', lines: G.span(DEPLOY, /^  deploy-dev:/, /name: Deploy to dev/) },
          { say: 'The prod job needs the dev job to succeed. Its environment is `prod`, and that environment has required reviewers in the settings of the repository, so the job pauses until a person approves.', lines: G.span(DEPLOY, /^  deploy-prod:/, /environment: prod/) },
          { say: 'The last step deploys to the production resource group with the prod parameters. There is no `--mode Complete`, so the deployment is incremental.', lines: G.span(DEPLOY, /name: Deploy to production/, /envName=prod/) }
        ],
        note: 'The file is `azure/verify/iacproj/.github/workflows/deploy.yml`. The workflow schema of GitHub, which is built into check-jsonschema, accepted it, and rejected a copy with a misspelled key. That checks the structure only. The workflow was never run on GitHub, the action versions were not checked, and the smoke test of the picture is not in the file.'
      }),

      B.term({
        id: 'm13-workflow-check', t: 1, src: 'rec', title: 'Check the workflow before you push it',
        say: 'The schema check ran on the workflow file, and then on a copy where I misspelled one key. Look at the message: it names the job and the missing key.',
        lines: [
          { c: 'cmd', t: '$ check-jsonschema --builtin-schema vendor.github-workflows .github/workflows/deploy.yml', d: 600 },
          { c: 'dim', t: '# it prints a short ok message, and the exit code is ' + WF.ok_exit_code, d: 250 },
          { c: 'ok', t: 'validation done', d: 200 },
          { c: 'dim', t: '# the same file, with runs-on spelled run-on in the first job', d: 500 },
          { c: 'cmd', t: '$ check-jsonschema --builtin-schema vendor.github-workflows deploy_broken.yml', d: 600 },
          { c: 'err', t: WF_ERR, d: 200 },
          { c: 'dim', t: '# exit code: ' + WF.broken_exit_code + '   (the good file gave ' + WF.ok_exit_code + ')', d: 200 }
        ],
        after: 'The schema knows the keys that GitHub accepts, so a typo in a key fails in your terminal, and not in a run that waits in a queue. The exit code of **1** is what a pre-commit hook or a pipeline step uses to stop. The check cannot tell whether the commands in a `run:` step work, whether a secret exists, or whether the identity may deploy.',
        afterKind: 'tip',
        doneSay: 'Cheap checks first. A typo should die in seconds, before it costs a person an hour.'
      }),

      B.talk({
        id: 'm13-oidc', t: 1, src: 'docs', title: 'Sign in from GitHub without a secret',
        say: 'The pipeline must prove who it is to Azure. Press Next for the way that stores no secret at all.',
        items: [
          ['No stored secret', 'GitHub gives the job a short-lived OIDC token that says which repository and environment it runs for. Entra ID trusts GitHub as an issuer for one identity, and exchanges the token for an Azure token. There is no password to leak or rotate.', 'A token that lives for minutes.'],
          ['The federated credential', 'You add it to a user-assigned managed identity or an app registration. It names the issuer, `https://token.actions.githubusercontent.com`, the audience `api://AzureADTokenExchange`, and a subject such as `repo:brewline/data-platform:environment:prod`.', 'Trust one repository and one environment.'],
          ['One identity for each environment', 'The dev identity can deploy only to the dev resource group, and the prod identity trusts only the subject of the prod environment, where reviewers approve. A pull request from a fork can never reach production.', 'Environments are the boundary.'],
          ['The roles of the deployment identity', 'Contributor on the resource group builds the resources. Role assignments in the template need a role that may write role assignments, such as Role Based Access Control Administrator, scoped to that resource group and limited if possible. Avoid Owner.', 'Enough power for the template, and no more.'],
          ['The job asks for the token', 'The workflow must say `id-token: write`, or the job cannot request it. Keep the other permissions at `read`, so that a stolen job token can do little.', 'Permissions are opt-in.']
        ],
        cols: 1
      }),

      B.cmp({
        id: 'm13-levels', t: 2, src: 'docs', title: 'Five levels of checking, and what each one misses',
        say: 'No single check is enough. Press Next to compare five of them. Each catches a kind of mistake, and misses another.',
        cols: ['Level', 'Tool', 'It catches', 'It misses'],
        hl: 2,
        rows: [
          ['Lint', 'the Bicep linter and the compile step', 'syntax errors, wrong types, unused parameters', 'whether the settings are safe, or whether they work'],
          ['Static scan', 'Checkov, as in this mission', 'known bad settings, such as a default action that allows traffic', 'your intent: it can flag a safe file, so skips need a reason'],
          ['What-if', 'az deployment group what-if', 'what would change in a real environment', 'every effect. Some properties show as noise'],
          ['Deploy to dev and smoke test', 'the pipeline itself', 'permissions, names that clash, DNS, quotas, wiring between modules', 'problems that need production data or load'],
          ['Drift check', 'a nightly what-if on production', 'changes that someone made by hand', 'changes to properties that the template never names']
        ],
        steps: [
          { upto: 2, say: 'The cheap ones, before anything exists. They find typos and known bad settings in seconds.' },
          { upto: 4, say: 'The ones that look at a real environment. They find what no file can show: permissions, clashes and wiring.' },
          { upto: 5, say: 'The one that runs after the deployment, every night. It watches for the change that nobody made through the pipeline.' }
        ],
        pick: 'Stack them from the **cheapest to the most real**: lint, scan, what-if, dev and smoke test, and a nightly drift check. A level that is missing leaves a kind of mistake that nothing catches.'
      }),

      B.talk({
        id: 'm13-drift', t: 2, src: 'docs', title: 'Drift: the change that nobody made through the pipeline',
        say: 'The template says what should be there, and the real thing can disagree. Press Next for how drift happens and what to do.',
        items: [
          ['How it happens', 'An outage on a Friday, and somebody adds a firewall rule in the portal. It works, nobody writes it down, and the template does not know about it.', 'A fix that skipped the code.'],
          ['Find it', 'A nightly what-if against production lists the differences. Send the list to a channel. An empty list is the normal state, and anything else is a question for the owner.', 'Ask the question every night.'],
          ['Fix it the right way', 'Decide whether the manual change is right. If it is, put it in the template through a pull request. If it is not, let the next deployment remove it. Never just revert it silently, since the outage may come back.', 'The template changes, not the memory.'],
          ['Make it rare', 'Give people read access in production, and let the pipeline identity do the writing. Keep a break-glass account for real emergencies, audited, and review its use afterwards. Azure Policy can audit or deny settings that you do not want.', 'Write access is the cause.'],
          ['Locks and stacks', 'A delete lock can stop an accidental deletion of a critical resource, and deployment stacks can deny changes from outside the stack. Both add friction, so use them for the few resources that cannot be lost.', 'Friction for what matters most.']
        ],
        cols: 1
      }),

      B.talk({
        id: 'm13-stacks', t: 3, src: 'docs', title: 'Deployment stacks and template specs',
        say: 'Complete mode is risky and Incremental leaves strays. Press Next for what a deployment stack adds.',
        items: [
          ['A set that is managed together', 'A deployment stack remembers the resources that a template created, and treats them as one set. You update the stack, and you choose what happens to a resource that is no longer in the template.', 'Manage the set.'],
          ['The leftovers', 'On an update, resources that left the template can be detached, which leaves them alone, or deleted. The options in the command line are `detachAll`, `deleteResources` and `deleteAll`.', 'Detach or delete.'],
          ['Deny settings', 'A stack can also put a deny assignment on its resources, `denyDelete` or `denyWriteAndDelete`, with a list of principals and actions that are left out. A hand-made change then fails at once, instead of becoming drift.', 'Block the hand-made change.'],
          ['Template specs', 'A template spec stores a versioned template in Azure, so that teams deploy it by its resource id without copying files. A stack can be created from one.', 'A versioned template in Azure.'],
          ['Where it fits', 'Microsoft names stacks and template specs as the replacements of Azure Blueprints, which is being retired. Stacks became generally available in 2024 according to the announcement. Check the current page for limits.', 'The Blueprints replacement.']
        ],
        cols: 1
      }),

      B.decide({
        id: 'm13-dec', t: 2, src: 'docs', title: 'Decision: how should a change reach production?',
        scenario: 'Six engineers run the platform. Changes go to production from **laptops** with the Azure CLI, using a **shared account**. A change to the lake firewall is due this week, and last month a deployment removed a rule that someone had added by hand.',
        opts: [
          { t: 'Keep deploying from laptops, with a checklist in the wiki', d: 'No new tooling to build.', lose: 'No review, no trail of who did what, personal or shared credentials on laptops, and drift stays invisible. The checklist is read once and then forgotten.' },
          { t: 'A pipeline: pull request with lint, scan and what-if, merge deploys dev, a smoke test, an approval for prod, a federated credential, and a nightly drift check', d: 'Every change is reviewed and recorded, no secret is stored, production needs a person, and a manual change is found within a day.' },
          { t: 'Make the portal read-only for everyone, and let one platform engineer click the changes in', d: 'Fewer people can break things.', lose: 'One person becomes the bottleneck, nothing is reviewed, there is no history in Git, and the next click can be wrong too.' }
        ],
        pick: 1,
        why: 'The pipeline gives review, history and repeatability, and the federated credential removes the secret on the laptop. The what-if shows a deleted rule before it is deleted, and the nightly drift check finds a hand-made change within a day. The approval keeps a person in the loop for production only.',
        when: 'For a very small team with a few resources, the same pipeline can be simpler: one environment, no approval. Keep the review, the history and the no-secret sign-in, since those are cheap and they matter most.'
      }),

      B.quiz({
        id: 'm13-q1', t: 1,
        q: 'What does a Bicep file compile to?',
        opts: [
          { t: 'An ARM template, which is JSON that Azure Resource Manager takes', fb: '' },
          { t: 'A Terraform plan', fb: 'Terraform is a different tool with its own language.' },
          { t: 'A PowerShell script', fb: 'Bicep is declarative. It says what should exist and not which steps to take.' },
          { t: 'A container image', fb: 'It builds no image.' }
        ],
        ok: 0, why: 'Bicep is a more readable way to write ARM templates. The compiler turns it into the JSON that Azure takes, and Azure Resource Manager holds the state, so there is no state file to look after.'
      }),

      B.quiz({
        id: 'm13-q2', t: 1,
        q: 'What does what-if do?',
        opts: [
          { t: 'It compares the template with what exists, and lists what would be created, changed or deleted, without changing anything', fb: '' },
          { t: 'It deploys to a copy of the environment', fb: 'It does not deploy anything.' },
          { t: 'It checks the syntax of the file', fb: 'That is the compile or lint step.' },
          { t: 'It rolls back the last deployment', fb: 'It makes no change.' }
        ],
        ok: 0, why: 'What-if is a preview. Put its output next to the diff in the pull request, so that a reviewer sees both the code and the effect, including a delete that nobody meant.'
      }),

      B.quiz({
        id: 'm13-q3', t: 1,
        q: 'Which deployment mode deletes the resources of the group that the template does not name?',
        opts: [
          { t: 'Incremental', fb: 'It leaves resources that are not in the template alone.' },
          { t: 'Complete', fb: '' },
          { t: 'Both do, after 24 hours', fb: 'There is no delay.' },
          { t: 'Neither. Azure never deletes in a deployment', fb: 'Complete mode does.' }
        ],
        ok: 1, why: 'In Complete mode the template is the whole truth about the resource group, and anything else is removed. A Key Vault or a pool that was created by hand is one deployment away from being deleted. Incremental is the default for a reason.'
      }),

      B.quiz({
        id: 'm13-q4', t: 1,
        q: 'Why does the pipeline sign in with a federated credential and not a client secret stored in GitHub?',
        opts: [
          { t: 'There is no secret to leak or rotate: GitHub gives the job a short-lived token, and Entra ID trusts it for one repository and environment', fb: '' },
          { t: 'A client secret cannot be used by GitHub Actions', fb: 'It can, and it is the older method.' },
          { t: 'A federated credential gives more permissions', fb: 'Permissions come from role assignments in both cases.' },
          { t: 'It makes the deployment faster', fb: 'The reason is security, not speed.' }
        ],
        ok: 0, why: 'A stored secret can be copied, leaked in a log, and forgotten until it expires. A token that lives for minutes and is bound to a repository and an environment has none of those problems. The job must also say `id-token: write`.'
      }),

      B.quiz({
        id: 'm13-q5', t: 2,
        q: 'In the recording, Checkov failed a lake file that had public network access disabled and no default action. What does it teach?',
        opts: [
          { t: 'A scanner reads specific properties. A file can be safe by another route and still fail, so state both and do not turn the rule off', fb: '' },
          { t: 'Disabling public network access does not work', fb: 'The rule did not test that property.' },
          { t: 'Checkov is wrong and should be removed from the pipeline', fb: 'It is a useful check. Learn what it reads.' },
          { t: 'The file was not parsed', fb: 'The scan reported no parsing errors.' }
        ],
        ok: 0, why: 'The rule is about `networkAcls.defaultAction`. The file expressed the same intent in another property, so the tool could not see it. Stating the default action as Deny made the same file pass, and made it clearer for a person too.'
      }),

      B.quiz({
        id: 'm13-q6', t: 2,
        q: 'The workflow file had `run-on` in the first job instead of `runs-on`. What did the schema check report?',
        opts: [
          { t: 'It reported that `runs-on` is a required property of the job `whatif`', fb: '' },
          { t: 'Nothing. A misspelled key is ignored', fb: 'The schema rejected it.' },
          { t: 'That the Azure login failed', fb: 'The check never talks to Azure.' },
          { t: 'That the Bicep does not compile', fb: 'It reads only the workflow file.' }
        ],
        ok: 0, why: 'The recorded message names the job and the missing key, and the exit code was ' + WF.broken_exit_code + '. A typo like this fails in seconds in your terminal. In a pipeline it would fail after waiting for a runner.'
      }),

      B.order({
        id: 'm13-ord', t: 1, q: 'Put the life of one infrastructure change in order.',
        items: [
          'An engineer branches, edits the Bicep file and opens a pull request',
          'The pipeline lints and scans the file, and runs a what-if against dev',
          'A reviewer reads the diff and the what-if, and merges',
          'The pipeline signs in with a federated credential and deploys to dev',
          'A smoke test checks one pipeline run and one query',
          'A person approves the prod environment, and the pipeline deploys to prod',
          'A nightly what-if on prod looks for drift'
        ],
        why: 'The cheap checks and the preview come before the merge, so a mistake costs a comment and not an incident. Dev comes before prod, and a smoke test stands between them. Only production needs a person. The nightly check covers what the pipeline cannot see: a change made by hand.'
      }),

      B.bug({
        id: 'm13-bug', t: 1, src: 'docs', q: 'The prod job signs in with a secret that is stored in the repository settings. Click the line that is the problem.',
        file: 'deploy.yml', lang: 'yaml', code: BUG_LOGIN, bad: [3],
        hint: 'What does this line need to exist in GitHub?',
        why: 'The `creds` input needs a client secret saved in the repository. It can be copied, printed in a log by a careless step, and it expires and must be rotated. Pass the client id, the tenant id and the subscription id instead, give the job `id-token: write`, and trust the repository and environment with a federated credential. No secret is stored.',
        fix: FIX_LOGIN,
        cheer: 'Ids are not secrets. Passwords are.'
      }),

      B.bug({
        id: 'm13-bug2', t: 2, src: 'docs', q: 'After a deployment, a Key Vault that an engineer created by hand in the production group has disappeared. Click the line that caused it.',
        file: 'deploy.sh', lang: 'bash', code: BUG_MODE, bad: [4],
        hint: 'What does this mode do with resources that the template does not name?',
        why: 'In Complete mode, everything in the resource group that the template does not describe is deleted. The vault was not in the template, so the deployment removed it. Use the default Incremental mode, read the what-if before you deploy, and bring hand-made resources into the template. If you want deletions, use a deployment stack on purpose.',
        fix: FIX_MODE,
        cheer: 'Incremental is the default for a reason.'
      }),

      B.challenge({
        id: 'm13-ch', t: 2, title: 'Coding round: a gate for the scan', file: 'gate.py', lang: 'python',
        q: 'Checkov wrote its result to `checkov.json`. **Write a short script that prints one line for each failed check (the id, the file and the name) and exits with 1 when there is any failed check**, so that a pipeline step fails.',
        data: [{ name: 'failed_checks in checkov.json (the recorded scan)', cols: ['check_id', 'file_path', 'check_name'], rows: FAILED.map(function (c) { return [c.id, '/' + c.file, c.name]; }) }],
        starter: 'import json\nimport sys\n\nresults = json.load(open("checkov.json"))["results"]\n# print the failed checks, and exit with 1 if there are any\n',
        hints: ['The failed checks are in `results["failed_checks"]`.', 'Each one is a dictionary with `check_id`, `file_path` and `check_name`.', '`sys.exit(1)` ends the script with a failure code, and a pipeline treats any other code than 0 as a failed step.'],
        sol: GATE,
        res: { msg: 'prints ' + FAILED.length + ' lines, and exits with 1', cols: ['check_id', 'file_path', 'check_name'], rows: FAILED.map(function (c) { return [c.id, '/' + c.file, c.name]; }) },
        expl: ['The exit code is the contract between a script and a pipeline: 0 passes, anything else fails the step.', 'Skipped checks are not in `failed_checks`, so a documented skip does not stop the build. A skip without a reason should be caught in review.', 'Keep `checkov.json` as an artifact of the run, so that a reviewer can read it without running the scan again.', 'In the pipeline you would not use `--soft-fail`, since that option makes Checkov itself exit with 0.'],
        cx: 'One pass over the failed checks, so the cost is nothing. The value is that a failed check stops a deployment before it starts.'
      }),

      B.incident({
        id: 'm13-inc', t: 2, src: 'docs', title: 'Incident: a hand-made fix came back as an outage', time: '08:50',
        alert: '**The lake is refusing the nightly copies again, with the same error as on Friday.** On Friday evening an engineer added a firewall rule for the partner in the portal, and the outage ended. The pipeline deployed the lake template on Monday morning. The rule is gone, and the template has no such rule.',
        clues: ['The portal change was never written in the template', 'An incremental deployment sets the properties that the template names', 'Nobody ran a drift check'],
        opts: [
          { t: 'Add the rule to the template through a pull request, deploy it, add a nightly drift check, and limit who may write to production by hand', fb: '' },
          { t: 'Add the rule in the portal again, and tell everyone not to deploy', fb: 'The next deployment removes it again, and the pipeline is switched off in the process.' },
          { t: 'Switch the deployment to Complete mode so that the template is the whole truth', fb: 'Complete mode deletes whatever else is in the group. It does not add a rule that the template lacks.' },
          { t: 'Remove the lake module from the pipeline', fb: 'The pipeline would then ignore the lake, and drift would be invisible for good.' }
        ],
        best: 0,
        why: 'The deployment did what it should: it made the lake match the template. The template was missing a decision that someone had made in the portal. The fix is to make the decision part of the code, so that review, history and repeatability apply to it, and to look for the next such change every night with a what-if.',
        checks: [
          ['Read the diff', 'What does the template set for the network rules, and what was there on Friday?'],
          ['Restore service', 'Add the rule again in the portal, as a stop-gap, and say so.'],
          ['Make it code', 'Add the rule to the template in a pull request, with the reason.'],
          ['Find the next one', 'A nightly what-if on production, sent to a channel.'],
          ['Limit manual writes', 'Read access for people in prod, and a break-glass account that is audited.']
        ],
        tell: 'The outage returned because a rule added in the portal on Friday was not in the template, and Monday\'s incremental deployment set the network rules back to what the template said. I restored service with the rule as a stop-gap, then added it to the template in a pull request with the reason, and set up a nightly what-if on production that posts any difference to the team channel. I also removed write access to production for people, kept a break-glass account that is audited, and wrote down that emergency fixes must reach the template within a day.',
        prevent: ['Put every **emergency fix** in the template within a day', 'Run a **nightly what-if** on production', 'Give people **read access** in prod', 'Keep an audited **break-glass** account']
      }),

      B.incident({
        id: 'm13-inc2', t: 2, src: 'docs', title: 'Incident: a deployment deleted a Key Vault', time: '13:20',
        alert: '**Every pipeline that reads a secret fails since 13:05.** The production deployment ran at 13:00 in Complete mode, "to clean up old resources". The Key Vault of the platform had been created by hand two years ago and was not in the template. It was deleted with the rest of the resources that the template did not name.',
        clues: ['The deployment mode was Complete', 'The vault was never in the template', 'Soft delete is on for the vault'],
        opts: [
          { t: 'Recover the soft-deleted vault, create its role assignments again, put the vault in the template, and change the deployment to Incremental with a what-if review', fb: '' },
          { t: 'Create a new vault and copy the secrets from memory', fb: 'The secrets are gone from the new vault, and the recovered one is still there to be restored.' },
          { t: 'Purge the deleted vault so that the name can be reused', fb: 'Purge is the step that cannot be undone, and it would destroy the one copy that you can recover.' },
          { t: 'Give every pipeline a copy of the secrets in its own settings', fb: 'It spreads the secrets around and makes the next leak more likely.' }
        ],
        best: 0,
        why: 'A soft-deleted vault can be recovered within its retention period, and that is the way back. The role assignments are not part of the recovery, so they must be created again, which is easy when they are in a template. The cause was a mode that deletes what the template does not name, and a vault that the template did not know about.',
        checks: [
          ['Stop the pipeline', 'Disable further runs until the cause is clear.'],
          ['Recover the vault', 'Recover the soft-deleted vault in the retention period. Do not purge it.'],
          ['Restore access', 'Role assignments are not restored by recovery, so create them again.'],
          ['Fix the cause', 'Bring the vault into the template, and use Incremental mode.'],
          ['Prevent it', 'A what-if gate that blocks any Delete without a reviewer, purge protection on vaults, and a lock on the vault.']
        ],
        tell: 'A Complete mode deployment deleted the production Key Vault because it had been created by hand and was not in the template. I stopped the pipeline, recovered the soft-deleted vault, recreated its role assignments from the template set, and verified that the secrets were intact. I then added the vault to the template, switched the deployment to Incremental, made a what-if with any Delete a blocking review item, and turned on purge protection and a delete lock on the vault.',
        prevent: ['Use **Incremental** mode', 'Block any **Delete** in what-if until a person reads it', 'Turn on **soft delete and purge protection**', 'Bring **hand-made resources** into the template']
      }),

      B.qa({
        id: 'qa-iac-why', t: 1, tag: 'IaC', secs: 60,
        q: 'Why do you use infrastructure as code, and why Bicep on Azure?',
        pts: ['The same template for every environment, with parameters for the differences', 'Review in a pull request, history in Git', 'Rebuild or add a region quickly', 'What-if and drift checks show how reality differs', 'Bicep compiles to ARM, with no state file to look after', 'Azure only. Terraform for estates across clouds'],
        short: 'Code makes the platform repeatable and reviewable. Dev and prod come from one template and differ only in parameters. A change is a pull request, so a colleague reads it, a scan checks it, and a what-if shows its effect before anything happens, and Git keeps the history. A new region, like the European branch, is the same template with another parameter file. And a what-if against production shows how reality differs from the template, which is how I find drift.\n\nOn Azure I use Bicep: it is readable, it compiles to ARM, Azure Resource Manager holds the state so there is no state file to look after, and Microsoft states that new resource types are supported from the day they appear. For an estate that spans clouds, or a team that already runs Terraform, Terraform is a real alternative, and I would then look after its state carefully.',
        fu: [
          ['What is in a module?', 'One concern, with parameters in and outputs out, such as the lake account that returns its name.'],
          ['What do you not put in the template?', 'Secrets. A resource reads them from Key Vault, or uses a managed identity.']
        ],
        trap: 'Clicking a fix in the portal and calling it temporary.',
        real: 'Describe how an environment of yours was built, and what happened when it had to be rebuilt.'
      }),

      B.qa({
        id: 'qa-bicep-tf', t: 1, tag: 'IaC', secs: 60,
        q: 'Bicep or Terraform?',
        pts: ['Bicep: Azure only, compiles to ARM, no state file, quick support for new Azure features', 'Terraform: many clouds, a state file that you keep and lock', 'The team and the estate decide', 'Both have a plan or what-if before a change', 'Do not mix both for the same resources', 'Either beats scripts and clicks'],
        short: 'It depends on the estate and the team. Bicep is for Azure only. It compiles to an ARM template, Azure Resource Manager holds the state, so there is no state file to look after, and Microsoft states that new resource types work from the day that they appear. Terraform works across clouds, has providers for many services, and keeps its state in a file that I must store safely, for example in a blob container with a lock, and protect and back up.\n\nFor an Azure-only team I would write Bicep. For an estate with several clouds, or a team that already knows Terraform well, I would use Terraform, and I would put the state under access control.\n\nI would not manage the same resources with both tools, because each believes that it owns them. And either one is far better than scripts and portal clicks, because both give a preview and a history.',
        fu: [
          ['What does Bicep keep as state?', 'None of its own. Azure Resource Manager knows what exists, and what-if compares the template with that.'],
          ['What is the risk of Terraform state?', 'A lost or damaged state file, and secrets that end up inside it.']
        ],
        trap: 'Choosing by fashion, and then mixing both on the same resources.',
        real: 'Describe how your team chose its infrastructure tool.'
      }),

      B.qa({
        id: 'qa-cicd-infra', t: 2, tag: 'IaC', secs: 90,
        q: 'How do you deploy infrastructure safely to production?',
        pts: ['A pull request with lint, a static scan and a what-if', 'Merge deploys dev with the same template and dev parameters', 'A smoke test: one pipeline run and one query', 'An environment with required reviewers gates production', 'A federated credential: no stored secret, one identity for each environment', 'A nightly what-if for drift, and Incremental mode'],
        short: 'Everything goes through a pipeline. A pull request runs the Bicep linter and a static scan, such as Checkov, and a what-if against dev, and a reviewer reads the diff and the what-if together. After the merge, the pipeline deploys to dev with the dev parameters, then runs a smoke test: one small pipeline run and one query. Production sits behind an environment with required reviewers, so a person approves, and then the same template deploys with the prod parameters.\n\nThe pipeline signs in with a federated credential, so there is no secret to store, with one identity for each environment, trusted only for the repository and the environment, and the job has `id-token: write` and nothing more. I use Incremental mode and never Complete without a what-if that I have read. And a nightly what-if on production looks for drift and posts any difference to the team.',
        fu: [
          ['What does the scan miss?', 'Intent, and everything that needs a real environment. That is what the dev deployment and the smoke test are for.'],
          ['What does the approval add?', 'A person who sees the what-if of production before the change reaches it.']
        ],
        trap: 'A pipeline that deploys to prod on merge, with an Owner credential.',
        real: 'Describe a deployment pipeline that you built or used, and the check that caught something.'
      }),

      B.qa({
        id: 'qa-oidc-pipeline', t: 2, tag: 'IaC', secs: 75,
        q: 'How does a GitHub pipeline sign in to Azure without a stored secret?',
        pts: ['GitHub gives the job a short-lived OIDC token for its repository and environment', 'A federated credential on a managed identity or app registration trusts GitHub as issuer', 'Issuer, audience and subject: the subject names the repository and environment', 'The token is exchanged for an Azure token. Nothing to rotate', 'One identity for each environment, with roles at the narrowest scope', 'The workflow needs `id-token: write`'],
        short: 'The job asks GitHub for a short-lived OIDC token, which says which repository and environment it runs for. In Azure I add a federated credential to a user-assigned managed identity or an app registration. It trusts one issuer, the token service of GitHub Actions, with the audience for the token exchange, and a subject such as the repository and the prod environment. The azure login action exchanges the GitHub token for an Azure token, and no password is stored anywhere.\n\nI use one identity for each environment: dev can deploy only to the dev resource group, and the prod identity trusts only the prod environment, which has required reviewers, so a pull request from a fork can never reach production. The identity has Contributor on the resource group, and a role that may write role assignments if the template makes them, never Owner. And the workflow says `id-token: write`, with the other permissions at read.',
        fu: [
          ['What is in the subject?', 'The repository, and the environment, the branch or the pull request, so you can trust only what you mean to.'],
          ['What if the token leaks?', 'It lives for minutes and is tied to one repository and environment, which is the point.']
        ],
        trap: 'Using one identity with Owner on the subscription for every pipeline.',
        real: 'Describe how a pipeline of yours authenticated to the cloud, and how you removed a stored secret.'
      }),

      B.qa({
        id: 'qa-drift', t: 2, tag: 'IaC', secs: 75,
        q: 'What is drift, and how do you handle it?',
        pts: ['Drift: the real resources differ from the template because of a manual change', 'Find it: a nightly what-if on production, posted to a channel', 'Fix it through the template, by a pull request, if the change is right', 'Let the next deployment remove it if the change is wrong', 'Make it rare: read access in prod, a break-glass account, policy', 'Locks and deployment stacks for the few critical resources'],
        short: 'Drift is when the real resources differ from the template, usually because somebody fixed something by hand in the portal. I find it with a nightly what-if against production, which posts any difference to the team channel. An empty list is the normal state.\n\nWhen I find a difference I decide whether the manual change is right. If it is, I put it in the template through a pull request, with the reason, so that review and history apply. If it is not, the next deployment removes it. I never revert it silently, because the outage that caused the fix may come back, which is exactly what happened in the incident of this mission.\n\nTo make drift rare, people get read access in production and the pipeline identity does the writing, with an audited break-glass account for real emergencies, and Azure Policy to audit or deny the settings that I do not want. For the few resources that cannot be lost, I add a delete lock or a deployment stack.',
        fu: [
          ['Why not Complete mode to stop drift?', 'It deletes whatever the template does not name, which turns drift into data loss.'],
          ['What does the nightly check not see?', 'Changes to properties that the template never names.']
        ],
        trap: 'Reverting a hand-made fix silently.',
        real: 'Describe a change that was made by hand, and how it reached the code.'
      }),

      B.qa({
        id: 'qa-iac-test', t: 1, tag: 'IaC', secs: 75,
        q: 'How do you test infrastructure code?',
        pts: ['Lint and compile for syntax and types', 'A static scan, such as Checkov: known bad settings, with written reasons for skips', 'What-if: the effect against a real environment', 'Deploy to dev and run a smoke test', 'A nightly drift check on production', 'Know what each level misses'],
        short: 'In levels, from the cheapest. Lint and compile catch syntax and type errors in seconds. A static scan such as Checkov applies rules for known bad settings: in my recording it failed a lake file whose default network action was Allow, and it passed the same file when it said Deny. A scan can also flag a safe file, as it did when public access was off and the default action was not stated, so I state both, and I write a reason next to every skip.\n\nThen what-if, which shows what a change would do in a real environment, and a deployment to dev with a smoke test, one pipeline run and one query, which finds permissions, name clashes, DNS and wiring problems that no file can show. Finally a nightly drift check on production.\n\nEach level misses something, so I keep them all, and I treat a scan as a spell checker for settings and not as proof that the template deploys.',
        fu: [
          ['What did the recorded scan not judge?', 'The module calls and the budget. Checkov has rules only for some resource types.'],
          ['What would you add for data pipelines?', 'The data tests of mission 5: counts and keys against the source after the deployment.']
        ],
        trap: 'Trusting a green scan as proof that the template works.',
        real: 'Describe a mistake that a scan or a what-if caught before it reached production.'
      }),

      B.recap({
        id: 'm13-recap', n: 13, badge: 'Template Builder', color: '#E9D5FF',
        pts: [
          'The platform is **code**: one template, **parameters** for the differences, a pull request for every change, and Git as the history. **Bicep** compiles to ARM, with no state file.',
          'A **static scan** reads settings against rules. It failed the open lake on **one rule**, and it also failed a safe file that did not **state** its default action. Skip only with a **written reason**.',
          'The pipeline: **lint, scan, what-if**, deploy to **dev**, a **smoke test**, an **approval** for prod, then prod. A nightly **what-if** finds drift.',
          'Sign in with a **federated credential**: a short-lived token for one repository and environment, `id-token: write`, and no stored secret.',
          '**Incremental** mode leaves unnamed resources alone. **Complete** deletes them. Read the **what-if** before any delete.'
        ],
        lines: [
          'I read the what-if before I approve a change.',
          'I write the reason next to every skip.',
          'I never revert a hand-made fix silently.'
        ]
      })
    ]
  });
})();
