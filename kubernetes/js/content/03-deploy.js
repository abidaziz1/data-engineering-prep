/* Mission 3: Deployments and rollouts. Every output was read from a real cluster while the Deployment ran. */
(function () {
  var B = LAB.b, G = LAB.get;
  var DY = G.file('deploy-web.yaml'), TY = G.file('deploy-web-typo.yaml');
  var ST = G.counts('deploy.state'), HE = G.counts('deploy.heal'), SC = G.counts('deploy.scale'), RO = G.counts('deploy.rolling'), SK = G.counts('deploy.stuck'), UN = G.counts('deploy.undo');
  var n = G.n;
  G.expect(ST.replicas === 3 && ST.replicasets === 1 && ST.pods === 3 && ST.ready === 3, 'the Deployment has one ReplicaSet and three ready pods');
  G.expect(HE.pods_after === 3 && HE.ready_after === 3 && HE.deleted_name_still_there === false && HE.new_names === 1, 'a deleted pod is replaced by one new pod and the count is three again');
  G.expect(SC.pods === 5, 'a scale to five gives five pods');
  G.expect(RO.max_pods_seen === 4 && RO.min_ready_seen === 3 && RO.replicasets === 2, 'the rolling update peaks at four pods and never has fewer than three ready');
  G.expect(SK.available_replicas === 3 && SK.updated_replicas === 1 && SK.rollout_exit_code !== 0, 'a stuck rollout keeps three available pods and one new pod');
  G.expect(UN.image === 'python:3.13-slim' && UN.ready === 3, 'the undo restores the image and three ready pods');
  G.expect(G.text('deploy.curl_v2') === 'web version 2', 'after the rollout a pod serves version 2');

  LAB.addChapter({
    id: 'm3', n: 3, title: 'Deployments and rollouts', short: 'Deploy', blurb: 'A Deployment keeps pods running, replaces them, and rolls out a new image', minutes: 18,
    focus: ['ing', 'mart'],
    goals: [
      'Explain **Deployment, ReplicaSet and pod**.',
      'Scale a Deployment and watch it **replace a deleted pod**.',
      'Control a **rolling update** with `maxSurge` and `maxUnavailable`.',
      'Recognise a **stuck rollout** and **roll back**.'
    ],
    say: 'A pod on its own is not replaced. A Deployment is the object that keeps a number of identical pods running, replaces the ones that die, and moves to a new image without a gap. We run one with three pods, delete one, update it, break the update on purpose, and go back.',
    scenes: [
      B.flow({
        id: 'm3-objects', t: 1, src: 'docs', title: 'Deployment, ReplicaSet, pods and a Service', g: 'objects', legend: true,
        steps: [
          { say: 'Four kinds of object take part. You write the first, and the cluster creates the others. Press Next.', focus: ['dep', 'rs', 'p1', 'p2', 'p3', 'svc'], cap: 'You write one object. The cluster makes the rest.' },
          { say: 'Step 1. A **Deployment** says: run this pod template, three times, and update it like this. It is the object that you edit.', on: ['e1'], focus: ['dep', 'rs'], cap: 'The Deployment owns a ReplicaSet.' },
          { say: 'Step 2. A **ReplicaSet** keeps the number of pods at what is wanted. It creates them, and creates another when one is lost.', on: ['e2', 'e3', 'e4'], focus: ['rs', 'p1', 'p2', 'p3'], tags: ['tg_own'], cap: 'The ReplicaSet owns the pods.' },
          { say: 'Step 3. A **Service** finds the same pods by their **label** and sends traffic to the ready ones. Mission 4 is about it.', on: ['e5', 'e6', 'e7'], focus: ['svc', 'p1', 'p2', 'p3'], tags: ['tg_label'], cap: 'The Service selects pods by label.' },
          { say: 'On an update the Deployment makes a **second ReplicaSet** for the new template, and moves pods from the old one to the new one. The old ReplicaSet stays, with zero pods, so that you can go back.', focus: ['dep', 'rs'], cap: 'A new template makes a new ReplicaSet.' }
        ]
      }),

      B.code({
        id: 'm3-yaml', t: 1, src: 'rec', title: 'The Deployment of the web service', file: 'deploy-web.yaml', lang: 'yaml', code: DY,
        steps: [
          { say: 'A small web server with three replicas. I applied this file. Press Next to read the parts that matter.', lines: null },
          { say: '`replicas: 3` is the number of pods that you want.', lines: G.span(DY, /replicas: 3/) },
          { say: 'The **selector** says which pods belong to this Deployment: those with the label `app: web`. It must match the labels of the template below.', lines: G.span(DY, /selector:/, /app: web/) },
          { say: 'The **strategy** is how an update happens. `maxSurge: 1` allows one pod more than wanted, and `maxUnavailable: 0` allows none fewer.', lines: G.span(DY, /strategy:/, /maxUnavailable/) },
          { say: 'The **template** is the pod that is created. Its labels are what the selector and the Service use.', lines: G.span(DY, /template:/, /app: web$/m) },
          { say: 'The **readiness probe** asks the pod over HTTP every second whether it is ready. A pod that is not ready gets no traffic, and the update waits for it.', lines: G.span(DY, /readinessProbe:/, /periodSeconds/) }
        ],
        note: 'The server writes a line into a file and serves it, so that the version of the pod can be read from outside.'
      }),

      B.term({
        id: 'm3-apply', t: 1, src: 'rec', title: 'Apply it and look at what was made',
        say: 'One manifest, and three kinds of object came out of it.',
        lines: function () {
          return G.term([
            ['kubectl apply -f deploy-web.yaml', G.text('deploy.apply')],
            ['kubectl get deploy,rs,pods -l app=web', G.text('deploy.get')]
          ]);
        },
        after: 'You wrote **one** object and the cluster made **' + ST.replicasets + ' ReplicaSet** and **' + ST.pods + ' pods**, and all ' + ST.ready + ' are ready. The name of the ReplicaSet is the name of the Deployment and a hash of the pod template. The names of the pods are the name of the ReplicaSet and five random characters. Both hashes change on every run, so the screen masks them.',
        afterKind: 'tip',
        doneSay: 'A Deployment owns a ReplicaSet, and the ReplicaSet owns the pods.'
      }),

      B.term({
        id: 'm3-heal', t: 1, src: 'rec', title: 'A pod is deleted, and comes back',
        say: 'The same thing that did not happen for the bare pod in mission 1. I deleted one of the three pods, and waited for the count to be three again.',
        lines: function () {
          return G.term([
            ['kubectl delete pod web-<hash>-<id>', 'pod "web-<hash>-<id>" deleted'],
            ['kubectl get pods -l app=web   # when three are ready again', HE.pods_after + ' pods, ' + HE.ready_after + ' ready, ' + HE.new_names + ' with a new name'],
            ['kubectl scale deploy web --replicas=5', G.text('deploy.scale')],
            ['kubectl get pods -l app=web --no-headers | wc -l', String(SC.pods)]
          ]);
        },
        after: 'The ReplicaSet saw two pods where it wanted three, and created one with **a new name**. The deleted pod is gone for good, and the count is three again. `scale` changes only the number in the Deployment, and the controller does the rest: ' + SC.pods + ' pods. Pods are **replaceable**: they have no identity that you should rely on. Names and addresses change.',
        afterKind: 'tip',
        doneSay: 'The wish is three. The controller makes it three.'
      }),

      B.flow({
        id: 'm3-roll', t: 1, src: 'docs', title: 'A rolling update, step by step', g: 'rollout', legend: true,
        steps: [
          { say: 'You change the image in the Deployment. The Deployment makes a second ReplicaSet for the new template. The Service sends traffic to ready pods from both. Press Next.', focus: ['rs1', 'rs2', 'svc'], tags: ['t0'], cap: 'The old version serves.' },
          { say: 'Step 1. With `maxSurge: 1` it may start **one extra pod**: a new one. It is not ready yet, so it gets no traffic.', on: ['e2'], focus: ['rs2'], tags: ['t1'], cap: 'A new pod starts, on top of the three.' },
          { say: 'Step 2. When the new pod is **ready**, an old pod can stop. There are still three ready pods in all, because `maxUnavailable` is 0.', on: ['e1', 'e2'], focus: ['rs1', 'rs2', 'svc'], tags: ['t2'], cap: 'A ready new pod lets an old one go.' },
          { say: 'Step 3. The same again, until all three pods are new, and the old ReplicaSet has zero pods.', focus: ['rs1', 'rs2', 'svc'], tags: ['t3'], cap: 'The update ends.' },
          { say: 'If the new pod **never becomes ready**, for example because of a typo in the image, the update stops here. The old pods keep serving, because `maxUnavailable` is 0 and none of them was removed.', focus: ['rs1', 'rs2'], tags: ['t4'], cap: 'A bad release stops itself.' }
        ]
      }),

      B.widget({ id: 'm3-lab', kind: 'roll', t: 1, src: 'rec', title: 'Lab: a rolling update, step by step' }),

      B.term({
        id: 'm3-rollout', t: 1, src: 'rec', title: 'The update on the real cluster',
        say: 'I applied a version of the file that serves "web version 2". While it ran, the recorder counted the pods and the ready pods twice a second.',
        lines: function () {
          return G.term([
            ['kubectl apply -f deploy-web-v2.yaml', 'deployment.apps/web configured'],
            ['kubectl rollout status deploy/web', G.text('deploy.rollout_status')],
            ['kubectl get rs -l app=web', G.text('deploy.rs')],
            ['kubectl rollout history deploy/web', G.text('deploy.history')],
            ['kubectl exec POD -- python -c "...urlopen(...)"', G.text('deploy.curl_v2')]
          ]);
        },
        after: 'During the update there were never more than **' + RO.max_pods_seen + '** pods, which is three plus one surge, and never fewer than **' + RO.min_ready_seen + '** ready. The Deployment has now **' + RO.replicasets + ' ReplicaSets**: the new one with 3 pods and the old one with 0. The history lists two revisions. The old ReplicaSet is kept so that the undo can use it.',
        afterKind: 'tip',
        doneSay: 'An update is a second ReplicaSet that grows while the first one shrinks.'
      }),

      B.code({
        id: 'm3-typo', t: 1, src: 'rec', title: 'A release with a typo', file: 'deploy-web-typo.yaml', lang: 'yaml', code: TY,
        steps: [
          { say: 'The same Deployment, with one character too many in the image tag. I applied it on top of the running version 2.', lines: null },
          { say: '`python:3.13-slimm` is not an image. The new pod cannot start, so it is never ready.', lines: G.span(TY, /image:/) }
        ],
        note: 'A typo in an image is one of the most common causes of a failed release.'
      }),

      B.term({
        id: 'm3-stuck', t: 1, src: 'rec', title: 'A rollout that does not finish',
        say: 'After 25 seconds I asked for the state of the rollout and of the pods.',
        lines: function () {
          return G.term([
            ['kubectl rollout status deploy/web --timeout=5s', G.text('deploy.stuck_status')],
            ['kubectl get pods -l app=web', G.text('deploy.stuck_pods')],
            ['kubectl get deploy web -o jsonpath="{.status}"   # the counts', 'replicas ' + SK.replicas + ', updated ' + SK.updated_replicas + ', ready ' + SK.ready_replicas + ', available ' + SK.available_replicas]
          ]);
        },
        after: '`rollout status` gave up (exit code ' + SK.rollout_exit_code + '). One **new** pod cannot pull its image (`ErrImagePull`, and `ImagePullBackOff` while it waits), and the **three old pods are still ready**, so the service keeps serving the old version. This is what `maxUnavailable: 0` buys: a bad release cannot take capacity away. The rollout does not fail by itself. It waits, so your pipeline needs a timeout, like `--timeout`, and a way to go back.',
        afterKind: 'warn',
        doneSay: 'A stuck rollout keeps the old pods. Set a timeout and watch for it.'
      }),

      B.term({
        id: 'm3-undo', t: 1, src: 'rec', title: 'Go back',
        say: 'One command returns to the previous revision.',
        lines: function () {
          return G.term([
            ['kubectl rollout undo deploy/web', G.text('deploy.undo')],
            ['kubectl get deploy web -o jsonpath="{.spec.template.spec.containers[0].image}"', UN.image],
            ['kubectl get pods -l app=web   # ready pods', String(UN.ready)]
          ]);
        },
        after: 'The Deployment is back on the image `' + UN.image + '`, and all **' + UN.ready + '** pods are ready. The undo uses the old ReplicaSet, which had been kept. A rollback is also a rollout, so it follows the same rules. Better still, never apply the typo: `kubectl apply --dry-run=server` and a test in CI catch many mistakes before the cluster does.',
        afterKind: 'tip',
        doneSay: 'rollout undo returns to the previous ReplicaSet.'
      }),

      B.cmp({
        id: 'm3-strategy', t: 2, src: 'docs', title: 'Update strategies and the two numbers',
        say: 'A Deployment has two strategies. The numbers of the first one decide how an update feels. Press Next.',
        cols: ['Setting', 'What it does', 'Use it when'],
        hl: 0,
        rows: [
          ['`RollingUpdate` (the default)', 'Replaces pods a few at a time.', 'The service must stay up during an update.'],
          ['`maxSurge`', 'How many pods above the wanted number may exist.', 'You have room for extra pods and want to keep capacity.'],
          ['`maxUnavailable`', 'How many pods below the wanted number may be missing.', 'You can accept a drop in capacity for a faster update.'],
          ['`Recreate`', 'Stops all old pods, then starts new ones.', 'Two versions must never run together, and a gap is fine.']
        ],
        steps: [
          { upto: 3, say: 'Surge and unavailable work together. Surge 1 and unavailable 0 keeps full capacity and needs room for one more pod. Surge 0 and unavailable 1 needs no room and loses one pod for a while. The lab showed both.' },
          { upto: 4, say: '`Recreate` is the exception. It causes a gap on purpose, for a program that cannot share its data with another version.' }
        ]
      }),

      B.bug({
        id: 'm3-bug', t: 1, q: 'This release never finishes. The new pod is in ImagePullBackOff. Click the line that is the problem.',
        file: 'deploy-web-typo.yaml', lang: 'yaml', code: TY, bad: [G.at(TY, /image: /)],
        hint: 'Which line names the image, and is every character right?',
        why: 'The tag is `3.13-slimm`, which does not exist. The old pods are still serving, so nothing is down, and nothing has been released. `kubectl describe pod` of the new pod shows the failed pull.',
        fix: DY,
        cheer: 'Read the image line twice, and run a server-side dry run in CI.'
      }),

      B.order({
        id: 'm3-ord', t: 1, q: 'Put a rolling update with `maxSurge: 1` and `maxUnavailable: 0` in order.',
        items: [
          'You change the image in the Deployment',
          'The Deployment creates a new ReplicaSet with zero pods',
          'One new pod starts, above the three that exist',
          'The new pod becomes ready',
          'One old pod stops',
          'This repeats until the new ReplicaSet has three pods and the old one has none'
        ],
        why: 'The new pod comes first and the old pod goes second, so that the number of ready pods never drops. In the recording the update peaked at ' + RO.max_pods_seen + ' pods and never had fewer than ' + RO.min_ready_seen + ' ready.'
      }),

      B.quiz({
        id: 'm3-q1', t: 1,
        q: 'You delete one pod of a Deployment with three replicas. What happens?',
        opts: [
          { t: 'The ReplicaSet creates a new pod, with a new name, and the count is three again', fb: '' },
          { t: 'Nothing, because the pod is gone', fb: 'That is a bare pod. This one has a controller.' },
          { t: 'The Deployment is deleted too', fb: 'Only the pod is deleted.' },
          { t: 'The same pod is restarted on the same node, with the same name', fb: 'A new pod is created.' }
        ],
        ok: 0, why: 'The recording: ' + HE.pods_after + ' pods again, ' + HE.ready_after + ' ready, with ' + HE.new_names + ' new name.'
      }),

      B.quiz({
        id: 'm3-q2', t: 1,
        q: 'A rollout is stuck on a new pod that cannot pull its image. With `maxUnavailable: 0`, what do users see?',
        opts: [
          { t: 'Errors, because the new pods are not ready', fb: 'The Service only sends traffic to ready pods.' },
          { t: 'The old version, which keeps serving on the old pods', fb: '' },
          { t: 'A mix of both versions', fb: 'The new pod is never ready.' },
          { t: 'Nothing, the service is down', fb: 'No old pod was removed.' }
        ],
        ok: 1, why: 'The recording had ' + SK.available_replicas + ' available pods and ' + SK.updated_replicas + ' new pod that was not ready.'
      }),

      B.quiz({
        id: 'm3-q3', t: 1,
        q: 'Which command goes back to the previous version of a Deployment?',
        opts: [
          { t: '`kubectl rollout undo deploy/web`', fb: '' },
          { t: '`kubectl delete deploy web`', fb: 'That removes the Deployment and its pods.' },
          { t: '`kubectl scale deploy web --replicas=0`', fb: 'That stops all pods.' },
          { t: '`kubectl rollout status deploy/web`', fb: 'That only reads the state.' }
        ],
        ok: 0, why: 'The recording ran it and the Deployment was back on `' + UN.image + '` with ' + UN.ready + ' ready pods.'
      }),

      B.decide({
        id: 'm3-dec', t: 2, src: 'rec', title: 'Decision: how to roll out the web service',
        scenario: 'The web service has 3 pods and a Service in front. The cluster has little spare memory: one extra pod fits, two do not. Updates happen about twice a day, and customers notice any drop in capacity.',
        opts: [
          { t: '`maxSurge: 0` and `maxUnavailable: 1`', d: 'No extra memory needed.', lose: 'During the update only two pods are ready. At peak hours that is a visible drop, twice a day.' },
          { t: '`maxSurge: 1` and `maxUnavailable: 0`', d: 'One extra pod, which fits. Three ready pods at every moment, and a bad release stops without taking capacity away.' },
          { t: 'Strategy `Recreate`', d: 'The simplest. All pods change at the same time.', lose: 'A gap of some seconds in every update, for a service that has no reason to accept one.' }
        ],
        pick: 1,
        why: 'The recording ran exactly this setting: at most ' + RO.max_pods_seen + ' pods, never fewer than ' + RO.min_ready_seen + ' ready, and a bad release that did not touch the old pods. Spare room for one pod is the price.',
        when: 'Use `maxUnavailable` when there is no room for extra pods, and capacity can drop for a short time.'
      }),

      B.incident({
        id: 'm3-inc', t: 2, src: 'rec', title: 'Incident: the release is stuck at one new pod', time: '15:20',
        alert: '**The pipeline waits for `kubectl rollout status` and times out.** The new version does not appear. Users report no errors.',
        clues: ['`kubectl get pods` shows one pod in ImagePullBackOff and three Running with the old template hash', 'The image tag in the commit has an extra character', '`maxUnavailable` is 0'],
        opts: [
          { t: 'Roll back with `kubectl rollout undo`, then fix the tag and release again', fb: '' },
          { t: 'Delete the three old pods so that new ones start', fb: 'The new pods would use the broken template and fail too, and you would lose capacity.' },
          { t: 'Scale the Deployment to zero and up again', fb: 'The same broken template would start.' },
          { t: 'Wait, because the cluster will fix it', fb: 'A wrong image name does not fix itself.' }
        ],
        best: 0,
        why: 'The recording shows the same picture: one new pod in ImagePullBackOff, three old pods ready, and a rollout that gave up. Nothing is down, so there is time to roll back and fix the tag in order.',
        checks: [
          ['Read the pods', 'One pod with a new hash that cannot start, and the old ones ready.'],
          ['Read the event', 'The image name that failed to pull is in `kubectl describe pod`.'],
          ['Go back', '`kubectl rollout undo deploy/NAME`.'],
          ['Prevent', '`kubectl apply --dry-run=server` and a check that the image exists, in CI.']
        ],
        tell: 'The release stalled because the image tag had a typo, so the new pod could not be pulled and was never ready. Because the rollout allowed no unavailable pods, the old pods kept serving and nobody was affected. I rolled back, fixed the tag, and added a check that the image exists before the deploy.',
        prevent: ['Check that the **image exists** before you deploy', 'Use a **timeout** on `rollout status` and roll back on failure', 'Keep `maxUnavailable: 0` for services that must stay up']
      }),

      B.qa({
        id: 'qa-deploy', t: 1, tag: 'Kubernetes', secs: 75,
        q: 'What is the relationship between a Deployment, a ReplicaSet and a pod?',
        pts: ['A Deployment describes the pod template, the number of replicas and the update strategy', 'It creates a ReplicaSet for each version of the template', 'A ReplicaSet keeps the right number of pods', 'A deleted pod is replaced, and an update moves pods between two ReplicaSets'],
        short: 'A Deployment is the object that I edit. It holds the pod template, the number of replicas and the update strategy. It creates a ReplicaSet for each version of the template, and a ReplicaSet creates and replaces the pods. In the recording one manifest gave ' + ST.replicasets + ' ReplicaSet and ' + ST.pods + ' pods. When I deleted a pod, the ReplicaSet created a new one, and when I changed the image, the Deployment made a second ReplicaSet and moved the pods across, keeping the old one with zero pods so that a rollback is possible. So I never manage pods directly. I change the Deployment.',
        fu: [['What decides whether a change makes a new ReplicaSet?', 'A change to the pod template. Changing replicas does not make a new one.'], ['How many old ReplicaSets are kept?', 'The `revisionHistoryLimit`, 10 by default. From documentation.']],
        trap: 'Editing pods by hand, or deleting pods to apply a change.',
        real: 'Describe a release that you did with a Deployment.'
      }),

      B.qa({
        id: 'qa-rollout', t: 1, tag: 'Kubernetes', secs: 75,
        q: 'How does a rolling update work, and what do maxSurge and maxUnavailable control?',
        pts: ['A new ReplicaSet grows while the old one shrinks', 'maxSurge: extra pods allowed above the wanted number', 'maxUnavailable: pods allowed to be missing', 'A pod must be ready before the next step, so a bad release stops'],
        short: 'The Deployment creates a new ReplicaSet and moves pods from the old one to the new one, a few at a time, waiting for each new pod to be ready. `maxSurge` is how many pods above the wanted number may exist, and `maxUnavailable` is how many may be missing. With surge 1 and unavailable 0, which I recorded, the update peaked at ' + RO.max_pods_seen + ' pods and never had fewer than ' + RO.min_ready_seen + ' ready. Because a new pod must become ready first, a release with a bad image stops: in the recording one new pod sat in ImagePullBackOff and the old pods kept serving. I add a timeout to `rollout status` and roll back if it fails.',
        fu: [['What is the role of the readiness probe?', 'It tells the Deployment and the Service when a new pod can take traffic. Without it a pod counts as ready as soon as it starts.'], ['When would you use Recreate?', 'When two versions must not run together, and a short gap is acceptable.']],
        trap: 'Assuming that a failed rollout rolls back by itself.',
        real: 'Say how you roll back a bad release.'
      }),

      B.qa({
        id: 'qa-rs', t: 2, tag: 'Kubernetes', secs: 60,
        q: 'What does `kubectl rollout undo` actually do?',
        pts: ['The Deployment keeps old ReplicaSets with zero pods', 'Undo sets the pod template back to the previous one', 'A rollback is another rolling update', 'It can only go back as far as the revision history'],
        short: 'The Deployment keeps its old ReplicaSets, scaled to zero, as the revision history. `kubectl rollout undo` sets the pod template of the Deployment back to the one of the previous revision, which makes the controller scale the old ReplicaSet up and the new one down, with the same rolling update rules as any other change. In the recording the history had two revisions and the undo restored `' + UN.image + '` with ' + UN.ready + ' ready pods. It can only go back as far as the history that the Deployment keeps, and it does not undo changes outside the template, such as the number of replicas.',
        fu: [['How do you go to a specific revision?', '`kubectl rollout undo deploy/NAME --to-revision=N`. From documentation.'], ['Is GitOps different?', 'There you revert the commit, and the controller applies it. From documentation.']],
        trap: 'Thinking that undo restores the whole cluster state.',
        real: 'Describe a rollback that you did.'
      }),

      B.cmp({
        id: 'm3-patterns', t: 3, src: 'docs', title: 'Rolling, blue/green and canary with plain objects',
        say: 'A Deployment gives you the rolling update. The other two release patterns need a little more. Press Next.',
        cols: ['Pattern', 'How with Kubernetes objects', 'Good for', 'Watch out'],
        hl: 0,
        rows: [
          ['Rolling', 'One Deployment and its strategy. The recorded course case.', 'Most services', 'Two versions run at the same time for a while.'],
          ['Blue/green', 'Two Deployments, and a Service whose selector you switch from one to the other.', 'A fast, complete cut-over and an instant way back', 'Twice the pods for a while. Data schemas must work for both versions.'],
          ['Canary', 'A second, small Deployment behind the same Service, or traffic rules of a mesh or an ingress controller.', 'Trying a release on a few percent of the calls', 'With a plain Service the share follows the pod counts, not a percentage you set.']
        ],
        steps: [
          { upto: 1, say: 'The rolling update is what mission 3 ran: a second ReplicaSet grew while the first one shrank.' },
          { upto: 3, say: 'Blue/green and canary are patterns on top of the same objects. A service mesh or a progressive-delivery tool automates them. None of the two ran on this cluster, so the table is from documentation.' }
        ]
      }),

      B.qa({
        id: 'qa-progress', t: 3, tag: 'Kubernetes', secs: 60,
        q: 'What does `progressDeadlineSeconds` do, and how does it relate to `rollout status`?',
        pts: ['It is the time after which a Deployment that makes no progress is marked as failed', 'The default is 600 seconds', 'The condition is Progressing=False with the reason ProgressDeadlineExceeded', 'The Deployment does not roll back by itself'],
        short: 'It sets how long a Deployment may go without progress before the controller marks it as failed: the condition Progressing becomes False with the reason ProgressDeadlineExceeded. The default is 600 seconds. `kubectl rollout status` watches that condition and exits with an error when it is reached, or when its own `--timeout` is. Nothing is rolled back for you. In the recording a typo in the image left the new pod in a pull error and three old pods available, and the command timed out. In a pipeline I set both timeouts, and run `rollout undo` when the status fails.',
        fu: [['Does the deadline count a paused rollout?', 'No: while a Deployment is paused it is not checked. From documentation.'], ['What is minReadySeconds?', 'How long a new pod must be ready before it counts as available. It slows a rollout on purpose.']],
        trap: 'Assuming that the Deployment rolls back when the deadline passes.',
        real: 'Say how your pipeline notices that a rollout did not finish.'
      }),

      B.recap({
        id: 'm3-recap', n: 3, badge: 'Rollout Driver', color: '#A5F3FC',
        pts: [
          'A **Deployment** owns a **ReplicaSet**, which owns the **pods**. A deleted pod is replaced, with a new name.',
          '`scale` changes the wanted number: ' + SC.pods + ' pods in the recording.',
          'A **rolling update** moves pods between two ReplicaSets. Surge 1 and unavailable 0: at most **' + RO.max_pods_seen + '** pods and at least **' + RO.min_ready_seen + '** ready.',
          'A bad image **stalls** the rollout and leaves the old pods serving. `rollout undo` goes back.',
          'Set a **timeout** on `rollout status`, and check that the image exists.'
        ],
        lines: [
          'I deploy through Deployments, never bare pods.',
          'I choose surge and unavailable on purpose.',
          'I can stop a bad release and go back.'
        ]
      })
    ]
  });
})();
