/* Mission 9: who may do what, one set of manifests for many environments, and checks before you apply. Run on a real cluster. */
(function () {
  var B = LAB.b, G = LAB.get;
  var RB = G.file('rbac.yaml'), KB = G.file('kustomize/base/deployment.yaml'), KK = G.file('kustomize/base/kustomization.yaml'), KP = G.file('kustomize/overlays/prod/kustomization.yaml');
  var RT = G.table('rbac.reader'), DS = G.counts('rbac.default_sa'), KF = G.counts('kz.facts'), VS = G.counts('val.strict');
  var n = G.n;
  var ANS = {};
  RT.rows.forEach(function (r) { ANS[r[0]] = r[1]; });
  var WIDE = RB.replace('resources: ["pods", "pods/log"]', 'resources: ["*"]').replace('verbs: ["get", "list", "watch"]', 'verbs: ["*"]');
  G.expect(ANS['list pods in brewline'] === 'yes' && ANS['get the log of a pod in brewline'] === 'yes' && ANS['delete pods in brewline'] === 'no' && ANS['list secrets in brewline'] === 'no' && ANS['list pods in default'] === 'no' && ANS['create deployments in brewline'] === 'no', 'the reader can list pods and read logs in brewline and nothing else');
  G.expect(DS.list_pods === 'no', 'the default service account of the namespace cannot list pods');
  G.expect(/Forbidden/.test(G.text('rbac.forbidden')) && /cannot delete resource "pods"/.test(G.text('rbac.forbidden')), 'a delete as the reader is refused with Forbidden');
  G.expect(KF.name_prefixed && KF.replicas_3 && KF.image_tag_2 && KF.namespace_set, 'the prod overlay prefixes the name, sets three replicas, tag 2 and the namespace');
  G.expect(VS.rc !== 0 && /unknown field/.test(G.text('val.strict')), 'strict validation refuses a field that does not exist');
  G.expect(WIDE !== RB && /verbs: \["\*"\]/.test(WIDE), 'the broad role differs from the narrow one');

  LAB.addChapter({
    id: 'm9', n: 9, title: 'Access and packaging', short: 'Access', blurb: 'Who may do what, one set of manifests for many environments, and checks before you apply', minutes: 18,
    focus: ['qual', 'sf'],
    goals: [
      'Give a pipeline **only the access it needs** with a Role and a RoleBinding.',
      'Read a **Forbidden** error: user, verb, resource, namespace.',
      'Use **Kustomize** to change one base for each environment.',
      'Check a manifest with a **server-side dry run** before it reaches the cluster.'
    ],
    say: 'The loader needs to read pods, and nothing more. A pipeline that deploys to production should not be able to read the Secrets of another team. And the same manifests must run in test and in production with a few differences. This mission shows the access rules, a Kustomize overlay, and two ways to check a file before you apply it.',
    scenes: [
      B.cmp({
        id: 'm9-rbac', t: 1, src: 'docs', title: 'The four objects of access control',
        say: 'Kubernetes checks every request against **RBAC**: role-based access control. Four kinds of object make it. Press Next.',
        cols: ['Object', 'What it is', 'Scope'],
        hl: 0,
        rows: [
          ['ServiceAccount', 'An identity for a pod or a pipeline.', 'One namespace'],
          ['Role', 'A list of allowed verbs on resources, such as get and list on pods.', 'One namespace'],
          ['RoleBinding', 'Gives a Role to a user, a group or a service account.', 'One namespace'],
          ['ClusterRole and ClusterRoleBinding', 'The same, for the whole cluster, or for resources that have no namespace, such as nodes.', 'The cluster']
        ],
        steps: [
          { upto: 1, say: 'Pods run as a service account. If you set none, the pod uses the `default` account of its namespace.' },
          { upto: 3, say: 'A Role says what is allowed. A RoleBinding says who gets it. Nothing is allowed unless a rule says so: RBAC has **no deny rules**, only allows.' },
          { upto: 4, say: 'The cluster-wide versions are broader. Hand them out carefully. `cluster-admin` is the role that can do anything.' }
        ]
      }),

      B.code({
        id: 'm9-yaml', t: 1, src: 'rec', title: 'A service account that can read pods', file: 'rbac.yaml', lang: 'yaml', code: RB,
        steps: [
          { say: 'Three objects in one file. I applied it to the cluster. Press Next.', lines: null },
          { say: 'The identity: a service account called `reader`.', lines: G.span(RB, /kind: ServiceAccount/, /name: reader/) },
          { say: 'The Role: it may `get`, `list` and `watch` **pods** and **pod logs**. Not Secrets, not Deployments, and no delete.', lines: G.span(RB, /kind: Role$/m, /verbs/) },
          { say: 'The RoleBinding gives the Role `pod-reader` to the service account `reader`, in this namespace only.', lines: G.span(RB, /kind: RoleBinding/, /apiGroup/) }
        ],
        note: 'To run a pod as this account, add `serviceAccountName: reader` to its spec.'
      }),

      B.term({
        id: 'm9-canI', t: 1, src: 'rec', title: 'Ask the cluster what the account may do',
        say: '`kubectl auth can-i --as ...` asks the API server what an identity is allowed to do, without trying it.',
        lines: function () {
          var who = '--as system:serviceaccount:brewline:reader';
          return G.term([
            ['kubectl apply -f rbac.yaml', G.text('rbac.apply')],
            ['kubectl auth can-i list pods -n brewline ' + who, ANS['list pods in brewline']],
            ['kubectl auth can-i get pods/log -n brewline ' + who, ANS['get the log of a pod in brewline']],
            ['kubectl auth can-i delete pods -n brewline ' + who, ANS['delete pods in brewline']],
            ['kubectl auth can-i list secrets -n brewline ' + who, ANS['list secrets in brewline']],
            ['kubectl auth can-i list pods -n default ' + who, ANS['list pods in default']],
            ['kubectl auth can-i create deployments -n brewline ' + who, ANS['create deployments in brewline']]
          ]);
        },
        after: 'The answers match the Role exactly: **yes** for listing pods and reading their logs in `brewline`, **no** for everything else, including the **same** verb in another namespace. The Role belongs to one namespace, so it gives nothing in `default`. Secrets are **no**, which matters in a shared cluster.',
        afterKind: 'tip',
        doneSay: 'A Role allows what it lists, in its own namespace, and nothing else.'
      }),

      B.term({
        id: 'm9-forbidden', t: 1, src: 'rec', title: 'What a refusal looks like',
        say: 'I tried to delete a pod as the reader, for real this time, and also asked what the default account of the namespace may do.',
        lines: function () {
          return G.term([
            ['kubectl delete pod nothing -n brewline --as system:serviceaccount:brewline:reader', G.text('rbac.forbidden')],
            ['kubectl auth can-i list pods -n brewline --as system:serviceaccount:brewline:default', DS.list_pods],
            ['kubectl auth can-i --list -n brewline --as system:serviceaccount:brewline:reader   # the first rules', G.text('rbac.list')]
          ]);
        },
        after: 'A **Forbidden** error names everything you need: the **user** (`system:serviceaccount:brewline:reader`), the **verb** (`delete`), the **resource** (`pods`) and the **namespace**. The fix is a rule in a Role, or a different identity. The **default** service account of the namespace may list nothing (' + DS.list_pods + '), which is why a pod that needs the API must get an account of its own. The last list shows what the reader may do: the Role, and the self-review calls that every identity may make.',
        afterKind: 'tip',
        doneSay: 'Read a Forbidden error from left to right: who, what, on which resource, where.'
      }),

      B.cmp({
        id: 'm9-table', t: 1, src: 'rec', title: 'The reader, question by question',
        say: 'The same six questions as a table, as the cluster answered them. Press Next.',
        cols: ['Can the service account reader ...', 'Answer'],
        hl: 1,
        rows: RT.rows.map(function (r) { return [r[0], r[1]]; }),
        steps: [
          { upto: 2, say: 'The first two are what the Role grants.' },
          { upto: 6, say: 'The rest are refused: a delete, Secrets, the same verb in another namespace, and a create. The Role is narrow on purpose.' }
        ]
      }),

      B.bug({
        id: 'm9-bug', t: 2, src: 'docs', q: 'A review finds that the Role of the reporting pipeline is much too wide. Click the line that gives the most away.',
        file: 'rbac-wide.yaml', lang: 'yaml', code: WIDE, bad: [G.at(WIDE, /resources:/), G.at(WIDE, /verbs:/)],
        hint: 'The pipeline reads pods. Which lines grant more than that?',
        why: '`resources: ["*"]` and `verbs: ["*"]` allow every action on every resource of the namespace, Secrets and deletes included. Anyone who can run a pod as this account can then read the credentials of the whole namespace. List the resources and verbs that the job needs, and nothing else.',
        fix: RB,
        cheer: 'Least privilege: list what is needed.'
      }),

      B.code({
        id: 'm9-kz', t: 1, src: 'rec', title: 'One base, one overlay for production', file: 'overlays/prod/kustomization.yaml', lang: 'yaml', code: KP,
        steps: [
          { say: 'The **base** is the plain Deployment `loader-api` with one replica and the image `brewline/loader:1`. The **overlay** below changes it for production, without copying it. Press Next.', lines: null },
          { say: 'It starts from the base.', lines: G.span(KP, /resources:/, /base/) },
          { say: 'A prefix for every name, and a namespace for every object.', lines: G.span(KP, /namePrefix/, /namespace/) },
          { say: 'Three replicas instead of one.', lines: G.span(KP, /replicas:/, /count/) },
          { say: 'A new image tag, without touching the base file.', lines: G.span(KP, /images:/, /newTag/) },
          { say: 'A label on every object.', lines: G.span(KP, /labels:/, /env: prod/) }
        ],
        note: 'The base Deployment: ' + KB.split('\n').length + ' lines, with `replicas: 1`. Its `kustomization.yaml` has one line under `resources`: `' + KK.split('\n')[1].trim() + '`.'
      }),

      B.term({
        id: 'm9-kzcli', t: 1, src: 'rec', title: 'What the overlay makes',
        say: '`kubectl kustomize` builds the result and prints it, without applying anything.',
        lines: function () {
          return G.term([['kubectl kustomize overlays/prod', G.text('kz.out')]]);
        },
        after: 'The name became **prod-loader-api**, the namespace **brewline-prod**, the replicas **3**, the image **brewline/loader:2**, and the label **env: prod** is on the object. The base file was not changed. `kubectl apply -k overlays/prod` would apply this result. Test and production then differ by a few lines each, instead of two copies that drift apart. **Helm** solves the same problem with templates and values. It was not run here.',
        afterKind: 'tip',
        doneSay: 'A base plus small overlays: no copies of whole files.'
      }),

      B.cmp({
        id: 'm9-pack', t: 2, src: 'docs', title: 'Plain manifests, Kustomize or Helm',
        say: 'Three ways to ship the same application to several places. Press Next.',
        cols: ['', 'Plain YAML', 'Kustomize', 'Helm'],
        hl: 2,
        rows: [
          ['How it varies', 'You copy and edit files.', 'Patches over a base. No templates.', 'Templates with values. Many `if` and `range` in YAML.'],
          ['Built into kubectl', 'Yes', 'Yes: `kubectl kustomize`, `apply -k`', 'No: a separate program'],
          ['Third-party packages', 'No', 'Possible, but rare', 'Yes: charts for Kafka, Airflow, Postgres and more'],
          ['Fits', 'One environment, a few files.', 'Your own services in test, staging and production.', 'Installing software of others, and versioned releases.']
        ],
        steps: [
          { upto: 2, say: 'For your own services, Kustomize is often enough, and the output is plain YAML that you can read.' },
          { upto: 4, say: 'For software that other people ship, such as an Airflow or a Kafka, Helm charts are the usual form. Neither Helm nor a chart ran in this course: the table is from documentation.' }
        ]
      }),

      B.term({
        id: 'm9-val', t: 1, src: 'rec', title: 'Check a file before it is applied',
        say: 'A server-side dry run sends the manifest to the API server, which validates it and applies nothing. With `--validate=strict`, fields that do not exist are refused. I tried both.',
        lines: function () {
          return G.term([
            ['kubectl apply --dry-run=server -f pod-hello.yaml', G.text('val.dry_run')],
            ['kubectl apply --dry-run=server --validate=strict -f typo.yaml   # a pod with a field "imagee"', G.text('val.strict')]
          ]);
        },
        after: 'The first call says what **would** happen: `(server dry run)`. The second is refused with a message that names the field: **spec.containers[0].imagee**. A typo in a field name is the commonest mistake in YAML, and without strict checking an old client may drop the field without a word. Run a dry run in CI, before the real apply, on a cluster of the same version.',
        afterKind: 'tip',
        doneSay: 'A dry run on the server finds mistakes without a change.'
      }),

      B.order({
        id: 'm9-ord', t: 1, q: 'Put in order the steps to give a reporting pipeline read-only access to the pods of one namespace.',
        items: [
          'Create a service account for the pipeline in the namespace',
          'Write a Role that lists `get`, `list` and `watch` on `pods` and `pods/log`',
          'Bind the Role to the service account with a RoleBinding',
          'Check with `kubectl auth can-i --as ...` that the allowed calls give yes and the others no',
          'Run the pipeline as that service account'
        ],
        why: 'The identity comes first, then the rule, then the link between them. The check before use is the cheap step that catches both a rule that is too wide and one that is too narrow. The recording asked six questions and got the six answers that the Role predicts.'
      }),

      B.quiz({
        id: 'm9-q1', t: 1,
        q: 'A Role in `brewline` allows `list` on `pods`. A service account bound to it tries to list pods in `default`. What happens?',
        opts: [
          { t: 'It is refused: a Role works only in its own namespace', fb: '' },
          { t: 'It works: pods are the same everywhere', fb: 'Namespaces separate the rules.' },
          { t: 'It works, but only to read', fb: 'The verb is allowed, but not in that namespace.' },
          { t: 'The cluster creates a Role in `default`', fb: 'Nothing is created by itself.' }
        ],
        ok: 0, why: 'The recording: "list pods in default" gave ' + ANS['list pods in default'] + '.'
      }),

      B.quiz({
        id: 'm9-q2', t: 1,
        q: 'This message appears: `pods "x" is forbidden: User "system:serviceaccount:brewline:reader" cannot delete resource "pods" in the namespace "brewline"`. What do you change?',
        opts: [
          { t: 'Add the `delete` verb on `pods` to a Role that is bound to that account, if the job really needs it', fb: '' },
          { t: 'Give the account `cluster-admin`', fb: 'That would fix it, and give far too much.' },
          { t: 'Restart the API server', fb: 'The server is working as designed.' },
          { t: 'Delete the namespace', fb: 'That is destructive and does not fix the rule.' }
        ],
        ok: 0, why: 'The message names the user, the verb, the resource and the namespace. A narrow rule for exactly that is the fix, if the action is wanted at all.'
      }),

      B.quiz({
        id: 'm9-q3', t: 2,
        q: 'Why use an overlay instead of two full copies of the manifests, one for test and one for production?',
        opts: [
          { t: 'Copies drift apart. An overlay keeps one base and states only the differences', fb: '' },
          { t: 'Overlays make the pods faster', fb: 'The pods are the same.' },
          { t: 'Kubernetes cannot read two files', fb: 'It can.' },
          { t: 'Copies are not allowed', fb: 'They are allowed, and a bad idea.' }
        ],
        ok: 0, why: 'The overlay in the recording was ' + KP.split('\n').length + ' lines and changed the name, the namespace, the replicas, the image tag and a label.'
      }),

      B.decide({
        id: 'm9-dec', t: 2, src: 'docs', title: 'Decision: how does CI deploy to the production namespace?',
        scenario: 'A CI pipeline applies the manifests of the data services to the namespace `brewline-prod` after every merge. Three teams share the cluster. The security review asks that CI cannot touch other namespaces or read other teams\' Secrets.',
        opts: [
          { t: 'A service account in `brewline-prod` with a Role for the objects it applies, and a RoleBinding. CI uses a short-lived token for it', d: 'It can change only its own namespace, and only the kinds of object it deploys. A leaked token has a small reach.', lose: 'You write and keep the Role, and you add a verb when a new kind of object is deployed.' },
          { t: 'The admin kubeconfig, stored as a CI secret', d: 'It works at once for everything.', lose: 'A leak of that secret gives the whole cluster to whoever has it, and the audit log cannot tell people from pipeline.' },
          { t: '`cluster-admin` bound to a service account for CI', d: 'Fewer failed deploys.', lose: 'The same reach as the admin kubeconfig, with a different name.' }
        ],
        pick: 0,
        why: 'The review asks for a small reach, and a namespaced Role gives exactly that. The recording showed that the Role of the reader stopped at its namespace and refused every other verb. A cluster-wide role is the thing to avoid for a pipeline.',
        when: 'A platform team that runs the cluster may need a cluster-wide role for operators, with strong audit and review.'
      }),

      B.incident({
        id: 'm9-inc', t: 2, src: 'rec', title: 'Incident: the clean-up job fails with Forbidden', time: '01:20',
        alert: '**The nightly clean-up job fails since the access review.** Its log ends with `Error from server (Forbidden): pods "old-run-3" is forbidden: User "system:serviceaccount:brewline:reader" cannot delete resource "pods" in API group "" in the namespace "brewline"`.',
        clues: ['The review replaced a broad role by the `pod-reader` Role', 'The job deletes pods of finished runs, and was meant to', 'No other action of the job fails'],
        opts: [
          { t: 'Add a second Role that allows `delete` on `pods` for the clean-up account only, and bind it', fb: '' },
          { t: 'Go back to the broad role', fb: 'That undoes the review and gives everything again.' },
          { t: 'Give the account `cluster-admin`', fb: 'Far too wide for a delete of pods.' },
          { t: 'Run the clean-up by hand every night', fb: 'That swaps a rule problem for a manual one.' }
        ],
        best: 0,
        why: 'The error names the missing permission exactly: the verb delete on pods in brewline. The job really needs it, so the correct fix is to grant that and only that, to the account that runs the clean-up. The recording refused the same action for the reader with the same wording.',
        checks: [
          ['Read the error', 'User, verb, resource and namespace are all in the message.'],
          ['Ask the cluster', '`kubectl auth can-i delete pods --as ...` gives no.'],
          ['Grant narrowly', 'A Role with `delete` on `pods`, and a RoleBinding for the account.'],
          ['Prevent', 'Test every job with `auth can-i` in the pipeline of the access change, before the old role is removed.']
        ],
        tell: 'The access review removed a broad role, and the clean-up job lost its right to delete pods. The error named the user, the verb and the resource, so I added a narrow Role with delete on pods for that account only. I now test the permissions of every job with auth can-i before an access change is released.',
        prevent: ['Test jobs with **`kubectl auth can-i`** before you cut access', 'Grant **verbs on named resources**, never `*`', 'One service account per job, so that rights do not pile up']
      }),

      B.qa({
        id: 'qa-rbac', t: 1, tag: 'Kubernetes', secs: 75,
        q: 'How does RBAC work in Kubernetes?',
        pts: ['A Role lists verbs on resources in a namespace', 'A RoleBinding gives it to a user, group or service account', 'ClusterRole and ClusterRoleBinding work cluster-wide', 'Only allows: there are no deny rules'],
        short: 'RBAC checks every request to the API server against rules. A Role lists the verbs that are allowed on resources in one namespace. A RoleBinding gives the Role to a user, a group or a service account. The cluster-wide versions are ClusterRole and ClusterRoleBinding, and they also cover things that have no namespace. There are only allow rules, so what is not listed is refused. I tested it on a service account with a Role for `get`, `list` and `watch` on pods: the cluster said yes to listing pods and reading logs in its namespace, and no to deleting, to Secrets, and to the same verb in another namespace. Pods run as the `default` account unless you set another one, and that account could list nothing.',
        fu: [['How do you test a rule?', '`kubectl auth can-i VERB RESOURCE --as USER`. The recording used it.'], ['Where do users come from?', 'Outside: certificates, or a login provider such as the one of the cloud. From documentation.']],
        trap: 'Granting `cluster-admin` to make an error disappear.',
        real: 'Describe an access change that you made to a pipeline.'
      }),

      B.qa({
        id: 'qa-kustomize', t: 2, tag: 'Kubernetes', secs: 60,
        q: 'How do you keep test and production manifests in step?',
        pts: ['One base, and a small overlay for each environment', 'Kustomize patches without templates', 'Helm uses templates and values', 'Both are built before they are applied, and reviewed in git'],
        short: 'I keep one base of manifests and a small overlay for each environment, so that only the differences are written down. With Kustomize the overlay says the name prefix, the namespace, the number of replicas, the image tag and the labels, and `kubectl kustomize` prints the result without applying it. In the recording a ' + KP.split('\n').length + '-line overlay turned a one-replica base into `prod-loader-api` in `brewline-prod` with three replicas, the tag 2 and a label. Helm solves the same problem with templates and values, and is the usual form for installing software that others ship. In both cases the output is rendered in CI, checked with a server-side dry run, and applied from git, so that production never differs from what was reviewed.',
        fu: [['When do you choose Helm?', 'To install a chart that someone else maintains, or when a release needs rollbacks and a version. From documentation.'], ['What is GitOps?', 'A controller in the cluster applies what is in git, and reverts drift. From documentation.']],
        trap: 'Copying whole files for each environment.',
        real: 'Say how your environments differ, and where that is written.'
      }),

      B.qa({
        id: 'qa-validate', t: 2, tag: 'Kubernetes', secs: 60,
        q: 'How do you catch a bad manifest before it reaches production?',
        pts: ['Render it, then run a server-side dry run', 'Use strict validation so unknown fields fail', 'Run the check in CI on a cluster of the same version', 'Add policy checks and tests after that'],
        short: 'I render the manifests, then run `kubectl apply --dry-run=server`, which sends them to a real API server that validates and applies nothing. With `--validate=strict` a field that does not exist is an error: in the recording `imagee` was refused with the exact path `spec.containers[0].imagee`. I run it in CI on a cluster of the version that production has, because schemas change between versions. After that come policy checks, for example that every container has limits and no image uses `latest`, and a deploy to a test namespace with a smoke call through the Service. A rollout with a timeout and an undo is the last net.',
        fu: [['What does client-side validation miss?', 'Anything that depends on the server: admission rules, quotas, custom resources. From documentation.'], ['What is an admission controller?', 'A server component that can reject or change an object when it is created. From documentation.']],
        trap: 'Applying first and reading the error in production.',
        real: 'Describe a check in your deploy pipeline.'
      }),

      B.qa({
        id: 'qa-irsa', t: 3, tag: 'Kubernetes', secs: 60,
        q: 'How does a pod get permissions on a cloud service without storing keys?',
        pts: ['The pod runs as a Kubernetes service account', 'The cluster issues a signed token for that account', 'The cloud trusts the cluster as an identity provider and maps the account to a role', 'IRSA on AWS, Workload Identity on GCP and Azure'],
        short: 'The pod runs as a service account, and the cluster can issue a short-lived, signed token for it. The cloud is set up to trust the cluster as an identity provider and to map that service account to a role, so the pod exchanges its token for temporary cloud credentials. On AWS this is IRSA, or Pod Identity, on GCP and Azure it is Workload Identity. No key is stored in a Secret, nothing needs rotating by hand, and the audit log names the role. I would use this for the loader that reads from object storage, with a role that can read one bucket. It needs a cloud and a cluster that are linked, and none was available here, so this answer is from documentation.',
        fu: [['What is the risk of the default service account?', 'Pods that need no API access should not mount a token at all. `automountServiceAccountToken: false` turns it off.'], ['Who creates the role?', 'Usually infrastructure as code, which is the next course.']],
        trap: 'Creating one access key and sharing it through a Secret.',
        real: 'Describe how your pods authenticate to the cloud.'
      }),

      B.qa({
        id: 'qa-netpol', t: 3, tag: 'Kubernetes', secs: 60,
        q: 'What is a NetworkPolicy, and what is the default without one?',
        pts: ['By default every pod can reach every other pod', 'A NetworkPolicy selects pods and lists the traffic that is allowed', 'Once a pod is selected, other traffic in that direction is denied', 'The network plugin must enforce it'],
        short: 'Without any policy, every pod can talk to every other pod in the cluster, in every namespace. A NetworkPolicy selects pods by label and lists the traffic that is allowed to them, or from them. Once a pod is selected by a policy for ingress, any ingress that is not listed is denied. The typical set is a default deny for the namespace, and then an allow for each real path, such as the loader to Postgres on port 5432. The policy only works if the network plugin enforces it, and some do not. A packet that a policy drops ends in a time-out, and not in Connection refused, which is one of the ways to tell it apart from a wrong port. No policy ran on the recorded cluster.',
        fu: [['How do you test a policy?', 'Run a test pod and try the call, in both directions.'], ['Does it replace RBAC?', 'No. RBAC is about the API. A NetworkPolicy is about packets between pods.']],
        trap: 'Assuming that namespaces separate the network.',
        real: 'Say whether your clusters use network policies.'
      }),

      B.qa({
        id: 'qa-admission', t: 3, tag: 'Kubernetes', secs: 60,
        q: 'What is an admission controller, and how do teams use it for policy?',
        pts: ['It can change or reject an object when it is created or updated, after authentication and RBAC', 'Validating and mutating webhooks, and built-in validating policies', 'Tools such as Kyverno and OPA Gatekeeper turn rules into policies', 'Examples: no latest tag, limits required, no privileged pods'],
        short: 'After a request is authenticated and allowed by RBAC, it passes through admission. Admission controllers can change the object, for example to add a default, or reject it. Webhooks let you run your own rules, and newer clusters have built-in validating policies written in CEL. Tools such as Kyverno and OPA Gatekeeper package this as policies that the platform team writes: every container must have limits, no image may use the latest tag, no pod may run privileged. The server-side dry run of mission 9 passes through the same admission, which is why it catches more than a client-side check. No policy engine ran on this cluster, so the examples are from documentation.',
        fu: [['What happens if the webhook is down?', 'It depends on its failure policy: Fail blocks the request, and Ignore lets it through. From documentation.'], ['Where do you test a policy?', 'In CI with the same engine, and in a test namespace.']],
        trap: 'Relying on a review of YAML to enforce rules that a policy engine can enforce.',
        real: 'Say which rules your platform enforces at admission.'
      }),

      B.recap({
        id: 'm9-recap', n: 9, badge: 'Gatekeeper', color: '#FECACA',
        pts: [
          '**RBAC**: a **Role** lists verbs on resources, a **RoleBinding** gives it to an identity. Only allows.',
          'The reader could list pods and read logs in its namespace, and was refused a delete, Secrets, and the same verb in another namespace.',
          'A **Forbidden** error names the **user, verb, resource and namespace**.',
          '**Kustomize**: one base and an overlay: `prod-loader-api`, 3 replicas, tag 2, in `brewline-prod`.',
          '`--dry-run=server --validate=strict` refused the field `imagee` with its path.'
        ],
        lines: [
          'I give a job only the verbs it needs.',
          'I test access with auth can-i.',
          'I run a server-side dry run in CI.'
        ]
      })
    ]
  });
})();
