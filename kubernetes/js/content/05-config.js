/* Mission 5: configuration and secrets. Every value was read from a pod on a real cluster. */
(function () {
  var B = LAB.b, G = LAB.get;
  var CM = G.file('configmap-settings.yaml'), PC = G.file('pod-config.yaml'), CD = G.file('configmap-settings-debug.yaml'), SE = G.file('secret-token.yaml');
  var BE = G.counts('cfg.before'), AF = G.counts('cfg.after'), SC = G.counts('cfg.secret'), OR = G.counts('cfg.orders');
  var n = G.n;
  G.expect(BE.env === 'info' && BE.file === 'info', 'before the change the variable and the file both say info');
  G.expect(AF.env === 'info' && AF.file === 'debug' && AF.file_changed_within_120s === true, 'after the change the variable still says info and the file says debug');
  G.expect(SC.stored_is_base64_of_value === true && SC.stored_differs_from_value === true && SC.type === 'Opaque', 'a Secret holds the value in base64, which decodes to the value');
  G.expect(OR.bytes < OR.limit_bytes && OR.rows === 5000, 'the orders fit in a ConfigMap of at most 1 MiB');

  LAB.addChapter({
    id: 'm5', n: 5, title: 'Configuration and secrets', short: 'Config', blurb: 'Settings and passwords outside the image, and what changes when you change them', minutes: 17,
    focus: ['raw', 'qual'],
    goals: [
      'Put settings in a **ConfigMap** and a password in a **Secret**.',
      'Know which one **changes** in a running pod, and which one does not.',
      'Say what **base64** in a Secret is, and what it is not.',
      'Choose where a **credential** belongs.'
    ],
    say: 'An image should run the same everywhere. What differs, such as the log level, the address of the database or a token, is given to the pod from outside. This mission uses a ConfigMap and a Secret in two ways, changes the ConfigMap while the pod runs, and reads what the pod sees.',
    scenes: [
      B.cmp({
        id: 'm5-ways', t: 1, src: 'docs', title: 'Three ways to give a program its settings',
        say: 'The same value can reach the program in three ways. Press Next.',
        cols: ['Way', 'The program reads', 'Changes while the pod runs?'],
        hl: 0,
        rows: [
          ['Environment variable', '`os.environ["LOG_LEVEL"]`', 'No. It is fixed when the container starts.'],
          ['A file in a mounted volume', 'a file, such as `/etc/settings/LOG_LEVEL`', 'Yes, after some time. The recording shows it.'],
          ['An argument of the command', '`sys.argv`', 'No. It is part of the pod spec.']
        ],
        steps: [
          { upto: 1, say: 'Environment variables are the simplest, and every language reads them. They are set once.' },
          { upto: 3, say: 'A mounted file can change under a running program, which helps for a feature flag and hurts for a program that reads it only at the start. Pick the way on purpose.' }
        ]
      }),

      B.code({
        id: 'm5-yaml', t: 1, src: 'rec', title: 'A ConfigMap and a pod that uses it twice', file: 'pod-config.yaml', lang: 'yaml', code: PC,
        steps: [
          { say: 'The ConfigMap `settings` has one key, LOG_LEVEL, with the value info. The pod gets it as a variable **and** as a file. Press Next.', lines: null },
          { say: '`envFrom` turns every key of the ConfigMap into an **environment variable**.', lines: G.span(PC, /envFrom:/, /name: settings/) },
          { say: 'The same ConfigMap as a **volume**: every key becomes a **file** in a folder.', lines: G.span(PC, /volumes:/, /name: settings$/m) },
          { say: 'The volume is mounted at `/etc/settings`, so the file is `/etc/settings/LOG_LEVEL`.', lines: G.span(PC, /volumeMounts:/, /mountPath/) }
        ],
        note: 'The ConfigMap itself is small: ' + CM.split('\n').length + ' lines, with the key under `data`.'
      }),

      B.term({
        id: 'm5-before', t: 1, src: 'rec', title: 'What the pod sees at the start',
        say: 'I applied the ConfigMap and the pod, and read the value both ways.',
        lines: function () {
          return G.term([
            ['kubectl apply -f configmap-settings.yaml -f pod-config.yaml', 'configmap/settings created\npod/config created'],
            ['kubectl exec config -- printenv LOG_LEVEL', BE.env],
            ['kubectl exec config -- cat /etc/settings/LOG_LEVEL', BE.file]
          ]);
        },
        after: 'Both ways give `' + BE.env + '`. Nothing is surprising yet.',
        afterKind: 'tip',
        doneSay: 'The variable and the file start with the same value.'
      }),

      B.term({
        id: 'm5-after', t: 1, src: 'rec', title: 'Change the ConfigMap while the pod runs',
        say: 'I applied a ConfigMap with LOG_LEVEL set to debug, and checked the file every 3 seconds until it said debug.',
        lines: function () {
          return G.term([
            ['kubectl apply -f configmap-settings-debug.yaml', 'configmap/settings configured'],
            ['kubectl exec config -- cat /etc/settings/LOG_LEVEL   # after it changed', AF.file],
            ['kubectl exec config -- printenv LOG_LEVEL', AF.env]
          ]);
        },
        after: 'The **file** changed, within 120 seconds of the apply: the kubelet refreshes mounted ConfigMaps on a timer, so the change is not instant. The **variable** did not change at all: it was set when the container started, and it stays `' + AF.env + '` until the pod is restarted. A change of a ConfigMap does **not** restart anything by itself.',
        afterKind: 'warn',
        doneSay: 'A mounted file follows the ConfigMap. An environment variable does not.'
      }),

      B.bug({
        id: 'm5-bug', t: 1, q: 'The team changed the ConfigMap to LOG_LEVEL=debug and the application still logs at info. Which part of the pod spec is why?',
        file: 'pod-config.yaml', lang: 'yaml', code: PC, bad: [G.at(PC, /envFrom:/)],
        hint: 'The application reads a variable. When does a variable get its value?',
        why: 'The value comes from `envFrom`, which is read **once, when the container starts**. The recording shows it: after the change the file said `' + AF.file + '` and the variable still said `' + AF.env + '`. Restart the pods with `kubectl rollout restart deploy/NAME`, or read the mounted file.',
        fix: PC,
        cheer: 'To pick up a variable, start the pod again.'
      }),

      B.term({
        id: 'm5-secret', t: 1, src: 'rec', title: 'A Secret, and what base64 is',
        say: 'A Secret holds a token. I applied it with `stringData`, which accepts plain text, and read how the cluster stored it.',
        lines: function () {
          return G.term([
            ['kubectl apply -f secret-token.yaml', 'secret/partner created'],
            ['kubectl get secret partner -o yaml   # the stored fields', G.text('cfg.secret_yaml')],
            ['kubectl get secret partner -o jsonpath="{.data.token}" | base64 -d', 'brewline-demo-token-4711'],
            ['kubectl describe secret partner   # shows sizes, not values', G.text('cfg.secret_describe')]
          ]);
        },
        after: 'The token is stored as **base64**: `' + G.text('cfg.secret_encoded') + '`. Anyone who can read the Secret decodes it with one command, as the third line shows, so **base64 is an encoding, not protection**. What a Secret adds is separate **permissions** (mission 9), the fact that `describe` shows sizes and not values, and a way to **encrypt** it at rest in the control plane, which this cluster did not do. The type is `' + SC.type + '`.',
        afterKind: 'warn',
        doneSay: 'A Secret is base64 and access rules. It is not encryption by itself.'
      }),

      B.code({
        id: 'm5-secretyaml', t: 1, src: 'rec', title: 'The manifest of the Secret', file: 'secret-token.yaml', lang: 'yaml', code: SE,
        steps: [
          { say: 'This file holds the real value. Do not commit it.', lines: null },
          { say: '`stringData` takes plain text and the API server stores it as base64 under `data`. Reading it back always gives `data`.', lines: G.span(SE, /stringData:/, /token:/) },
          { say: '`type: Opaque` is the default for any key and value. Other types exist for a registry login or a TLS certificate.', lines: G.span(SE, /type:/) }
        ],
        note: 'The token in this file is a made-up value for the recording.'
      }),

      B.term({
        id: 'm5-orders', t: 1, src: 'rec', title: 'The size of a ConfigMap',
        say: 'The loader job of mission 7 reads a file of orders. For the recording I stored that file as a ConfigMap.',
        lines: function () {
          return G.term([
            ['kubectl create configmap orders --from-file=orders.csv', 'configmap/orders created'],
            ['wc -c orders.csv; wc -l orders.csv', n(OR.bytes) + ' bytes, ' + n(OR.rows + 1) + ' lines (a header and ' + n(OR.rows) + ' orders)']
          ]);
        },
        after: 'The file is **' + n(OR.bytes) + ' bytes**. A ConfigMap or a Secret may not be larger than **' + n(OR.limit_bytes) + ' bytes** (1 MiB), because it is stored in etcd with everything else. Data files do not belong in a ConfigMap. This was only a short way to hand a small file to a job. A real pipeline reads from object storage or a database.',
        afterKind: 'tip',
        doneSay: 'ConfigMaps are for settings. Data lives in storage.'
      }),

      B.cmp({
        id: 'm5-where', t: 2, src: 'docs', title: 'Where a credential can live',
        say: 'Four places for the token of a partner API. Press Next.',
        cols: ['Place', 'Who can read it', 'The weak point'],
        hl: 0,
        rows: [
          ['In the image or in git', 'Everyone who can pull the image or clone the repository.', 'It stays in the history for ever, and rotating it means a new build.'],
          ['In a ConfigMap', 'Everyone who can read ConfigMaps of the namespace.', 'It is plain text, and ConfigMaps are listed and logged without care.'],
          ['In a Secret', 'Only who is allowed to read Secrets, and the pods that mount it.', 'Base64 only. Without encryption at rest and strict access, a backup of etcd holds it in the clear.'],
          ['In an external store, read at runtime', 'The identity of the pod, through the cloud or a vault.', 'More to set up. It is the best fit for production credentials, with rotation and an audit log.']
        ],
        steps: [
          { upto: 2, say: 'The first two are the usual mistakes. A credential in git is a credential that has leaked.' },
          { upto: 4, say: 'A Secret is the minimum on the cluster. For production, a manager such as AWS Secrets Manager, Azure Key Vault or HashiCorp Vault, read through an operator or a CSI driver, adds rotation and an audit log. This table is from documentation: none of the external stores ran.' }
        ]
      }),

      B.order({
        id: 'm5-ord', t: 1, q: 'Put in order the safe way to change a log level that the application reads from a variable.',
        items: [
          'Edit the value in the ConfigMap in the repository',
          'Apply the ConfigMap to the cluster',
          'Restart the Deployment with `kubectl rollout restart`',
          'The new pods start and read the new value',
          'Check the log level in one of the new pods'
        ],
        why: 'Applying the ConfigMap alone changes nothing for a variable: in the recording the variable still said `' + AF.env + '` after the change. The restart makes new pods, and they read the new value. A rolling restart keeps the service up.'
      }),

      B.quiz({
        id: 'm5-q1', t: 1,
        q: 'A ConfigMap key is used both as an environment variable and as a mounted file. You change the ConfigMap. What does a running pod see?',
        opts: [
          { t: 'The file changes after a while, and the variable stays as it was', fb: '' },
          { t: 'Both change at once', fb: 'The variable does not change.' },
          { t: 'Nothing changes until you delete the ConfigMap', fb: 'The file follows the ConfigMap.' },
          { t: 'The pod restarts and reads both again', fb: 'A change does not restart a pod.' }
        ],
        ok: 0, why: 'The recording: the file said `' + AF.file + '`, the variable said `' + AF.env + '`.'
      }),

      B.quiz({
        id: 'm5-q2', t: 1,
        q: 'Someone says: "The password is in a Secret, so it is encrypted." What is the accurate answer?',
        opts: [
          { t: 'It is base64, which anyone who can read the Secret decodes at once. It is protected by access rules, and by encryption only if the cluster has it switched on', fb: '' },
          { t: 'Yes, Kubernetes encrypts every Secret by default', fb: 'Not by default. The recording decoded it with one command.' },
          { t: 'No, a Secret is stored as plain text', fb: 'It is base64, which is an encoding.' },
          { t: 'It is hashed, so nobody can read it back', fb: 'A hash cannot be read back. A Secret can.' }
        ],
        ok: 0, why: 'The stored value `' + G.text('cfg.secret_encoded') + '` decodes to the token. That is an encoding.'
      }),

      B.quiz({
        id: 'm5-q3', t: 2,
        q: 'You want a 3 MB reference file in every pod of a job. Is a ConfigMap the right tool?',
        opts: [
          { t: 'No: the limit is 1 MiB, and data belongs in storage that the job reads', fb: '' },
          { t: 'Yes, there is no limit', fb: 'The limit is 1 MiB.' },
          { t: 'Yes, but only as a Secret', fb: 'A Secret has the same limit.' },
          { t: 'Yes, if you split it into three keys of 1 MB each', fb: 'The limit counts the whole object.' }
        ],
        ok: 0, why: 'The 5,000 orders were ' + n(OR.bytes) + ' bytes, about ' + Math.round(OR.bytes / OR.limit_bytes * 100) + ' % of the limit of ' + n(OR.limit_bytes) + '.'
      }),

      B.decide({
        id: 'm5-dec', t: 2, src: 'docs', title: 'Decision: where does the partner API token live?',
        scenario: 'The loader calls a partner API with a token that rotates every 90 days. The token must not appear in git. Three teams share the cluster. Security wants an audit log of who reads it.',
        opts: [
          { t: 'A Kubernetes Secret, applied by the pipeline', d: 'Simple, and the pod reads it as a variable or a file.', lose: 'The value passes through the pipeline and sits in etcd as base64, and any role that reads Secrets in the namespace can read it. Rotation is a manual change.' },
          { t: 'A secret manager of the cloud, read by the pod with its own identity, through an operator', d: 'Rotation and the audit log come with it. The cluster holds a reference, and not the value.', lose: 'An operator and an identity per service to set up and run.' },
          { t: 'An environment variable in the Deployment manifest', d: 'No extra object.', lose: 'The value sits in git, in the manifest, and in every `kubectl get deploy -o yaml`.' }
        ],
        pick: 1,
        why: 'The audit log and the rotation are requirements, and a Secret gives neither by itself. A Secret is the right answer when the setup is small and nobody asks for an audit.',
        when: 'For one team, one namespace and no audit duty, a Secret with encryption at rest and strict roles is enough.'
      }),

      B.incident({
        id: 'm5-inc', t: 2, src: 'rec', title: 'Incident: the debug flag did not take effect', time: '11:05',
        alert: '**A hot fix changed LOG_LEVEL to debug in the ConfigMap an hour ago.** The loader pods still log at info, and the team cannot see the problem they are chasing.',
        clues: ['`kubectl get cm settings -o yaml` shows `LOG_LEVEL: debug`', 'The pods were created yesterday', 'The Deployment reads the value through `envFrom`'],
        opts: [
          { t: '`kubectl rollout restart deploy/loader` so that new pods read the variable', fb: '' },
          { t: 'Wait, because the cluster applies the ConfigMap by itself', fb: 'A variable is fixed at the start of the container. The recording showed it.' },
          { t: 'Edit the ConfigMap again', fb: 'The value in the ConfigMap is already right.' },
          { t: 'Delete the ConfigMap', fb: 'The pods would not start without it.' }
        ],
        best: 0,
        why: 'The pods are older than the change, and they read the variable once. In the recording the file followed the change and the variable did not. A rolling restart gives new pods the new value, and keeps the service up.',
        checks: [
          ['Compare the ages', 'Pods older than the ConfigMap change keep the old variable.'],
          ['Check how it is read', '`envFrom` or `env`: set at start. A mounted file: follows with a delay.'],
          ['Restart', '`kubectl rollout restart deploy/NAME`.'],
          ['Prevent', 'Put a hash of the ConfigMap into the pod template (Helm and Kustomize can do it), so that a change rolls the pods.']
        ],
        tell: 'The change was in the ConfigMap, but the pods read the log level as an environment variable, which is fixed when the container starts. I restarted the Deployment so that new pods picked it up. To avoid it, we now include a hash of the ConfigMap in the pod template, so that every config change rolls the pods.',
        prevent: ['A **config hash** in the pod template, so that a change makes a rollout', 'Read **mounted files** for values that must change live', 'After a change, **look at the value in a pod**, not in the ConfigMap']
      }),

      B.qa({
        id: 'qa-config', t: 1, tag: 'Kubernetes', secs: 75,
        q: 'What is the difference between a ConfigMap and a Secret, and what happens to a pod when you change one?',
        pts: ['Both hold key-value data outside the image', 'A Secret is meant for credentials and has its own access rules', 'Mounted as files they update after some time', 'As environment variables they do not update until the pod restarts'],
        short: 'Both hold key-value data outside the image, so the same image runs in every environment. A ConfigMap is for settings, and a Secret is for credentials: it is base64, and what protects it is that reading Secrets needs its own permission, and optionally encryption at rest. A pod can read either as environment variables or as files. I recorded a change of a ConfigMap on a running pod: the mounted file followed within about two minutes, and the environment variable stayed at the old value, because variables are fixed when the container starts. So after a change I restart the Deployment, or I read the file for values that must change live.',
        fu: [['Is a Secret encrypted?', 'It is base64. Encryption at rest is a setting of the control plane. From documentation.'], ['How large can a ConfigMap be?', '1 MiB, because it lives in etcd.']],
        trap: 'Saying that a Secret is encrypted, or that a change reaches the pods at once.',
        real: 'Describe a config change that did not take effect and why.'
      }),

      B.qa({
        id: 'qa-secrets', t: 2, tag: 'Kubernetes', secs: 75,
        q: 'How do you handle credentials for a pipeline that runs on Kubernetes?',
        pts: ['Never in the image or in git', 'A Secret is the minimum, with encryption at rest and strict roles', 'Better: a secret manager and the identity of the pod', 'Rotation and an audit log decide'],
        short: 'Never in the image or in git. A Kubernetes Secret is the minimum: it keeps the value out of the manifest, and it needs its own permission to read, but it is only base64, so I check that encryption at rest is on and that few roles can read Secrets. For production I prefer a secret manager of the cloud or a vault, read at runtime with the identity of the pod, because it gives rotation and an audit log, and the cluster holds no value. I tested the Secret side: the stored value decoded with one command, so I never treat a Secret as a safe place on its own.',
        fu: [['How does a pod get a cloud identity?', 'Through a service account that is linked to a cloud role, such as IRSA on AWS or Workload Identity on GCP and Azure. From documentation.'], ['What about CI?', 'The pipeline applies a reference to the secret, and not the value, where it can.']],
        trap: 'Calling base64 encryption.',
        real: 'Say where the credentials of your pipelines are kept.'
      }),

      B.qa({
        id: 'qa-twelve', t: 2, tag: 'Kubernetes', secs: 60,
        q: 'Why keep configuration out of the image?',
        pts: ['One image for every environment', 'A change needs no build', 'Credentials stay out of the registry', 'The same artifact is tested and released'],
        short: 'The image should be the same artifact in development, staging and production, so that what was tested is what runs. Anything that differs, such as addresses, log levels and credentials, is given at run time through ConfigMaps and Secrets. A config change then needs no build, and the credentials never sit in a registry where many people can pull. The cost is that I have to know how the value is read: in the recording a mounted file followed a change and an environment variable did not.',
        fu: [['What is the 12-factor rule?', 'Store config in the environment. It is the idea behind this. From documentation.'], ['How do you keep environments apart?', 'One namespace or cluster for each, and an overlay with the values of each. Mission 9 shows Kustomize.']],
        trap: 'Baking an environment name or a password into the image.',
        real: 'Describe how an image of yours differs between environments.'
      }),

      B.qa({
        id: 'qa-confighash', t: 3, tag: 'Kubernetes', secs: 60,
        q: 'How do you make a ConfigMap change roll the pods that use it?',
        pts: ['A change of a ConfigMap alone does not change the pod template', 'Put a hash of the config into an annotation of the template', 'Helm and Kustomize can do it, or use rollout restart', 'Immutable ConfigMaps with a new name for each version are another way'],
        short: 'A Deployment rolls its pods only when its pod template changes, and a change of a ConfigMap is not a change of the template: in the recording the file followed the change and the variable did not, and nothing restarted. The usual fix is to put a hash of the config into an annotation of the template, so that a new config means a new template and a rolling update. Helm can compute the hash in the chart, and Kustomize makes a ConfigMap with a hash in its name, which does the same. A manual `kubectl rollout restart` is the quick way. Immutable ConfigMaps, with a new name for each version, also make the change explicit and cheap for the cluster.',
        fu: [['What does `immutable: true` do?', 'It forbids changes to the object, and the kubelet stops watching it. From documentation.'], ['Is a rolling restart safe for a service?', 'Yes, with readiness probes and maxUnavailable 0, as in mission 3.']],
        trap: 'Editing a ConfigMap and assuming that pods have noticed.',
        real: 'Describe how a config change reaches the running pods in your setup.'
      }),

      B.recap({
        id: 'm5-recap', n: 5, badge: 'Config Keeper', color: '#FDE68A',
        pts: [
          'A **ConfigMap** holds settings, a **Secret** holds credentials. Both stay out of the image.',
          'A mounted **file** follows a change, after up to about two minutes. An **environment variable** does not: restart the pods.',
          'A Secret is **base64**: `' + G.text('cfg.secret_encoded') + '` decodes to the token. Access rules are the protection.',
          'Both are limited to **1 MiB**. Data does not belong in them.',
          'For production credentials use a **secret manager** and the identity of the pod.'
        ],
        lines: [
          'I know how each value reaches the program.',
          'I restart pods after a config change that they read as a variable.',
          'I never call base64 encryption.'
        ]
      })
    ]
  });
})();
