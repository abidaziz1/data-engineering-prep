/* Mission 6: storage and a database. A Postgres StatefulSet with a 1 GiB claim ran on a real cluster, with 5,000 orders in it. */
(function () {
  var B = LAB.b, G = LAB.get;
  var PG = G.file('postgres.yaml');
  var RW = G.counts('sto.rows'), PV = G.counts('sto.pv'), AD = G.counts('sto.after_delete'), AP = G.counts('sto.after_pvc_delete');
  var n = G.n;
  var EMP = [
    'apiVersion: apps/v1',
    'kind: Deployment',
    'metadata:',
    '  name: pg-temp',
    'spec:',
    '  replicas: 1',
    '  selector:',
    '    matchLabels:',
    '      app: pg-temp',
    '  template:',
    '    metadata:',
    '      labels:',
    '        app: pg-temp',
    '    spec:',
    '      containers:',
    '        - name: postgres',
    '          image: postgres:16-alpine',
    '          env:',
    '            - name: POSTGRES_PASSWORD',
    '              value: brewline-dev',
    '          volumeMounts:',
    '            - name: data',
    '              mountPath: /var/lib/postgresql/data',
    '      volumes:',
    '        - name: data',
    '          emptyDir: {}'
  ].join('\n');
  G.expect(RW.after_load === 5000 && RW.after_pod_deleted === 5000 && RW.after_statefulset_recreated === 5000 && RW.same_pod_name === true, 'the 5,000 orders survive a deleted pod and a deleted StatefulSet, and the pod keeps its name');
  G.expect(AD.pvc_still_there === true, 'deleting the StatefulSet leaves the claim');
  G.expect(PV.reclaim === 'Delete' && PV.phase === 'Bound' && PV.storage_class === 'local-path' && PV.count === 1, 'one bound volume with the reclaim policy Delete');
  G.expect(AP.pv_count === 0 && AP.rows_in_the_new_database === 0, 'deleting the claim removes the volume and the orders');

  LAB.addChapter({
    id: 'm6', n: 6, title: 'Storage and a database', short: 'Storage', blurb: 'A database in the cluster, and what survives when you delete things', minutes: 18,
    focus: ['stg', 'raw'],
    goals: [
      'Explain **PersistentVolumeClaim, PersistentVolume and StorageClass**.',
      'Run a database as a **StatefulSet** with its own volume.',
      'Say what survives a deleted **pod**, a deleted **StatefulSet** and a deleted **claim**.',
      'Decide when a database should **not** run in the cluster.'
    ],
    say: 'A pod has no memory of its own: when it is replaced, what it wrote inside is gone. A database needs a disk that stays. We start Postgres with a volume, put 5,000 orders in it, and delete three different things to see which deletion loses the orders.',
    scenes: [
      B.flow({
        id: 'm6-flow', t: 1, src: 'docs', title: 'A pod, a claim and a volume', g: 'storage', legend: true,
        steps: [
          { say: 'Five objects take part. Press Next, one link at a time.', focus: ['sts', 'pod', 'pvc', 'pv', 'disk'], cap: 'A database pod and its disk.' },
          { say: 'Step 1. A **StatefulSet** creates the pod `pg-0`. Its pods have fixed names: pg-0, pg-1, and so on.', on: ['e1'], focus: ['sts', 'pod'], cap: 'The pod has a fixed name.' },
          { say: 'Step 2. The pod asks for storage with a **PersistentVolumeClaim**: "I need 1 GiB that one node can write to." The StatefulSet makes one claim for each pod.', on: ['e2'], focus: ['pod', 'pvc'], cap: 'The pod asks for a disk.' },
          { say: 'Step 3. The cluster **binds** the claim to a **PersistentVolume**. With a storage class, the volume is created on demand.', on: ['e3'], focus: ['pvc', 'pv'], cap: 'The claim gets a volume.' },
          { say: 'Step 4. The volume is, in the end, a disk of the cloud or, on this cluster, a folder on the node.', on: ['e4'], focus: ['pv', 'disk'], cap: 'The volume sits on a real disk.' },
          { say: 'What you delete decides what is kept. A deleted pod comes back with the same claim.', focus: ['pod', 'pvc'], tags: ['tg_pod'], cap: 'Delete the pod: the data stays.' },
          { say: 'A deleted StatefulSet leaves the claim.', focus: ['sts', 'pvc'], tags: ['tg_pvc'], cap: 'Delete the StatefulSet: the claim stays.' },
          { say: 'A deleted claim takes the volume with it, when the reclaim policy is Delete.', focus: ['pvc', 'pv', 'disk'], tags: ['tg_rec'], cap: 'Delete the claim: the data goes.' }
        ]
      }),

      B.code({
        id: 'm6-yaml', t: 1, src: 'rec', title: 'Postgres as a StatefulSet', file: 'postgres.yaml', lang: 'yaml', code: PG,
        steps: [
          { say: 'Three objects in one file: a Secret for the password, a Service, and the StatefulSet. Press Next.', lines: null },
          { say: 'A **headless** Service (`clusterIP: None`). It has no address of its own, and its name resolves to the pods. Other pods connect to `pg`.', lines: G.span(PG, /clusterIP: None/) },
          { say: 'The StatefulSet has one replica, and `serviceName` names the headless Service that gives the pod its DNS name.', lines: G.span(PG, /kind: StatefulSet/, /replicas: 1/) },
          { say: 'The password comes from the Secret through `envFrom`. `PGDATA` points into a **subfolder** of the mounted volume, because the root of a new volume holds a `lost+found` folder that Postgres refuses.', lines: G.span(PG, /envFrom:/, /PGDATA/) },
          { say: 'The **readiness probe** runs `pg_isready` every 2 seconds. The pod gets traffic only when Postgres accepts connections.', lines: G.span(PG, /readinessProbe:/, /periodSeconds/) },
          { say: 'The volume is mounted at the data directory of Postgres.', lines: G.span(PG, /volumeMounts:/, /mountPath/) },
          { say: '`volumeClaimTemplates` is the line that makes it a database: the StatefulSet creates **one claim of 1 GiB for each pod**, named `data-pg-0` for the pod `pg-0`.', lines: G.span(PG, /volumeClaimTemplates:/, /storage: 1Gi/) }
        ],
        note: 'The password in this file is a made-up development value. Mission 5 showed where a real one belongs.'
      }),

      B.term({
        id: 'm6-apply', t: 1, src: 'rec', title: 'The claim and the volume that appeared',
        say: 'I applied the file and waited until the pod was ready. Then I read the storage objects.',
        lines: function () {
          return G.term([
            ['kubectl get storageclass', G.text('sto.classes')],
            ['kubectl apply -f postgres.yaml', 'secret/pg created\nservice/pg created\nstatefulset.apps/pg created'],
            ['kubectl get pvc', G.text('sto.pvc')],
            ['kubectl get pv -o jsonpath="{.items[0].spec.persistentVolumeReclaimPolicy}"', PV.reclaim]
          ]);
        },
        after: 'The cluster has a **StorageClass** called `' + PV.storage_class + '`, which makes volumes on demand. Nobody created the volume by hand: the claim `data-pg-0` was **Bound** to a new volume, as soon as the pod asked. The access mode is **' + PV.access_modes.join(', ') + '**: one node can write to it at a time. The volume is pinned to one node (' + (PV.node_affinity ? 'it has node affinity' : 'no node affinity') + '), because this class uses a folder of that node. A cloud class makes a disk of the cloud instead. The **reclaim policy** is **' + PV.reclaim + '**, which matters in a minute.',
        afterKind: 'tip',
        doneSay: 'A claim asks, a storage class provides, and the volume is bound to the claim.'
      }),

      B.term({
        id: 'm6-load', t: 1, src: 'rec', title: 'Put 5,000 orders into it',
        say: 'A small loader program, run as a Job, writes the orders into the table. Mission 7 is about Jobs. For now it is just the way the data got in.',
        lines: function () {
          return G.term([
            ['kubectl apply -f job-loader.yaml', 'job.batch/loader created'],
            ['kubectl logs job/loader', G.text('sto.job_logs')],
            ['kubectl get job loader', G.text('sto.job_get')],
            ['kubectl exec pg-0 -- psql -U postgres -d brewline -tAc "SELECT count(*) FROM orders"', String(RW.after_load)]
          ]);
        },
        after: 'The loader connected to `pg`, the name of the headless Service, and wrote **' + n(RW.after_load) + '** orders. The database holds them on the volume of the claim.',
        afterKind: 'tip',
        doneSay: 'The orders are in Postgres, on the volume.'
      }),

      B.widget({ id: 'm6-lab', kind: 'store', t: 1, src: 'rec', title: 'Lab: what survives a delete' }),

      B.term({
        id: 'm6-pod', t: 1, src: 'rec', title: 'Delete the pod',
        say: 'I deleted `pg-0`, waited until the StatefulSet had made a new one, and counted the orders again.',
        lines: function () {
          return G.term([
            ['kubectl delete pod pg-0', 'pod "pg-0" deleted'],
            ['kubectl get pods -l app=pg   # when ready again', 'pg-0   1/1   Running'],
            ['kubectl exec pg-0 -- psql -U postgres -d brewline -tAc "SELECT count(*) FROM orders"', String(RW.after_pod_deleted)]
          ]);
        },
        after: 'The new pod has **the same name**, `pg-0`, and found its claim, and Postgres started from its files: **' + n(RW.after_pod_deleted) + '** orders. This is the difference from a Deployment, where a new pod gets a new name and no memory of the old one.',
        afterKind: 'tip',
        doneSay: 'The pod is replaceable. The claim is not lost.'
      }),

      B.term({
        id: 'm6-sts', t: 1, src: 'rec', title: 'Delete the StatefulSet',
        say: 'Now the object that owns the pod. I deleted the StatefulSet, and looked at the claims.',
        lines: function () {
          return G.term([
            ['kubectl delete statefulset pg', 'statefulset.apps "pg" deleted'],
            ['kubectl get pvc', G.text('sto.pvc_after_delete')],
            ['kubectl apply -f postgres.yaml   # create it again', 'statefulset.apps/pg created'],
            ['kubectl exec pg-0 -- psql -U postgres -d brewline -tAc "SELECT count(*) FROM orders"', String(RW.after_statefulset_recreated)]
          ]);
        },
        after: 'The pod is gone, and **the claim is still there**. A StatefulSet does not delete its claims, on purpose: the data is worth more than the object that used it. The StatefulSet that I created again found `data-pg-0` and Postgres had its **' + n(RW.after_statefulset_recreated) + '** orders. The price is that claims of old StatefulSets pile up, and nobody notices the cost.',
        afterKind: 'tip',
        doneSay: 'The claim outlives the StatefulSet.'
      }),

      B.term({
        id: 'm6-pvc', t: 1, src: 'rec', title: 'Delete the claim',
        say: 'The last one. I deleted the StatefulSet and then the claim, and looked at the volumes. Then I created the StatefulSet again.',
        lines: function () {
          return G.term([
            ['kubectl delete statefulset pg && kubectl delete pvc data-pg-0', 'statefulset.apps "pg" deleted\npersistentvolumeclaim "data-pg-0" deleted'],
            ['kubectl get pv --no-headers | wc -l', String(AP.pv_count)],
            ['kubectl apply -f postgres.yaml   # a new StatefulSet, a new claim', 'statefulset.apps/pg created'],
            ['SELECT count(*) FROM orders   # in the new database', AP.rows_in_the_new_database + '   (the table does not exist yet)']
          ]);
        },
        after: 'The reclaim policy was **' + PV.reclaim + '**, so deleting the claim **deleted the volume** and everything on it: ' + AP.pv_count + ' volumes were left. The new StatefulSet got a new, empty volume and a database without the table. There is no recycle bin. The safe habits are a **backup before any delete of a claim**, the policy `Retain` for volumes that matter, and a snapshot class, which your cloud may offer. The policy in this recording came from the storage class of this cluster. Most cloud classes also default to Delete.',
        afterKind: 'warn',
        doneSay: 'A deleted claim with the policy Delete loses the data.'
      }),

      B.cmp({
        id: 'm6-sts-vs-dep', t: 2, src: 'docs', title: 'StatefulSet or Deployment',
        say: 'Both run pods. They answer different needs. Press Next.',
        cols: ['', 'Deployment', 'StatefulSet'],
        hl: 2,
        rows: [
          ['Pod names', 'Random: `web-7d9f-x2k4q`', 'Fixed and ordered: `pg-0`, `pg-1`'],
          ['Storage', 'Shared or none. All pods look the same.', 'One claim for each pod, and it follows the pod.'],
          ['Start and stop', 'All at once, in any order.', 'In order: pg-0 first, pg-1 when pg-0 is ready.'],
          ['Network name', 'Only through a Service', 'Each pod has its own DNS name through a headless Service'],
          ['Fits', 'Stateless services, APIs, workers', 'Databases and brokers, anything that has a memory and an identity']
        ],
        steps: [
          { upto: 2, say: 'The pod names and the storage are the point. A database pod must come back as itself, with its own disk.' },
          { upto: 5, say: 'Ordered start and a name for each pod help systems that form a group, such as Kafka or a Postgres primary with replicas. Kafka on Kubernetes usually comes with an **operator** that handles the rest. None of this was run here: the table is from documentation.' }
        ]
      }),

      B.cmp({
        id: 'm6-modes', t: 2, src: 'docs', title: 'Reclaim policy, access modes and the volume you get',
        say: 'Three settings that decide the behaviour of a volume. Press Next.',
        cols: ['Setting', 'Values', 'What it means'],
        hl: 0,
        rows: [
          ['Reclaim policy', '`Delete`, `Retain`', 'Delete: the volume goes with the claim. Retain: the volume stays, with its data, for a person to deal with.'],
          ['Access mode', '`ReadWriteOnce`, `ReadWriteOncePod`, `ReadOnlyMany`, `ReadWriteMany`', 'How many nodes (or pods) can use it, and how. A disk is usually ReadWriteOnce. ReadWriteMany needs a file system such as NFS or EFS.'],
          ['Volume binding', '`Immediate`, `WaitForFirstConsumer`', 'WaitForFirstConsumer creates the disk where the pod is scheduled. In a cloud with zones this avoids a disk in a zone with no node.']
        ],
        steps: [
          { upto: 1, say: 'The reclaim policy is the one that loses data. For a database that you cannot rebuild, set Retain, or take snapshots.' },
          { upto: 3, say: 'Access modes and binding decide where a pod can run. A ReadWriteOnce disk in zone a keeps the pod in zone a. The recording used `' + PV.access_modes.join(', ') + '`. The rest is from documentation.' }
        ]
      }),

      B.bug({
        id: 'm6-bug', t: 1, src: 'docs', q: 'This Postgres loses all its data every time its pod is replaced. Click the line that is the problem.',
        file: 'pg-temp.yaml', lang: 'yaml', code: EMP, bad: [G.at(EMP, /emptyDir/)],
        hint: 'Where does the data directory of the container write to?',
        why: '`emptyDir` is a scratch folder that lives and dies with the **pod**. It survives a restart of the container, and it is gone when the pod is replaced. A database needs a **PersistentVolumeClaim**, which is what `volumeClaimTemplates` of the StatefulSet makes.',
        fix: PG,
        cheer: 'A scratch folder is not a disk that stays.'
      }),

      B.order({
        id: 'm6-ord', t: 1, q: 'Put in order what happens when a StatefulSet pod asks for storage on this cluster.',
        items: [
          'The StatefulSet creates the claim `data-pg-0` from `volumeClaimTemplates`',
          'The storage class sees an unbound claim and makes a volume',
          'The cluster binds the claim to the new volume',
          'The pod `pg-0` is scheduled and the volume is mounted in its container',
          'Postgres starts and writes its files to the volume'
        ],
        why: 'The claim comes first, because the pod cannot start without its disk. In the recording the claim was Bound before the pod was ready, and the volume had the phase `' + PV.phase + '`.'
      }),

      B.quiz({
        id: 'm6-q1', t: 1,
        q: 'You delete the pod `pg-0` of a StatefulSet with a claim. What does the database have afterwards?',
        opts: [
          { t: 'All its data: the new pg-0 uses the same claim', fb: '' },
          { t: 'An empty data directory, because the pod is new', fb: 'The claim is not deleted with the pod.' },
          { t: 'Nothing, because the StatefulSet is deleted too', fb: 'Only the pod was deleted.' },
          { t: 'A copy of the data on another node', fb: 'There is one volume, and it is reused.' }
        ],
        ok: 0, why: 'The recording had ' + n(RW.after_pod_deleted) + ' orders after the delete, with the same pod name.'
      }),

      B.quiz({
        id: 'm6-q2', t: 1,
        q: 'You delete the PersistentVolumeClaim of a database. The reclaim policy of the volume is Delete. What do you have?',
        opts: [
          { t: 'No data: the volume and its files are deleted with the claim', fb: '' },
          { t: 'All the data, in a volume that stays without a claim', fb: 'That is the policy Retain.' },
          { t: 'A copy in the etcd of the cluster', fb: 'etcd holds the objects, not the files of a volume.' },
          { t: 'The data until the next restart of the node', fb: 'The volume is deleted at once.' }
        ],
        ok: 0, why: 'The recording left ' + AP.pv_count + ' volumes and the new database had no orders table.'
      }),

      B.quiz({
        id: 'm6-q3', t: 2,
        q: 'Which is a good reason to **not** run the production database inside the cluster?',
        opts: [
          { t: 'A managed database brings backups, failover and upgrades, which you would have to build and run', fb: '' },
          { t: 'Kubernetes cannot run databases', fb: 'It can, as this mission shows.' },
          { t: 'Pods are too slow for a database', fb: 'Speed is not the problem.' },
          { t: 'A StatefulSet cannot keep data', fb: 'It kept all 5,000 orders.' }
        ],
        ok: 0, why: 'Running the pod is the easy part. Backups, restores, failover and upgrades are the work, and a managed service does them for you.'
      }),

      B.decide({
        id: 'm6-dec', t: 2, src: 'docs', title: 'Decision: where does the orders database run?',
        scenario: 'Brewline needs a Postgres for the orders of 12 stores. Two engineers know Kubernetes well. Nobody has run a database failover. The business accepts at most one hour of lost data and four hours of downtime.',
        opts: [
          { t: 'A StatefulSet in the cluster, with a snapshot every hour', d: 'No new service to buy, and a fast start. You control the version.', lose: 'You build and test restore, failover and upgrades yourself. A deleted claim loses the data, as the recording showed.' },
          { t: 'A managed Postgres of the cloud, called by name from the pods', d: 'Backups with point-in-time restore, failover and patching are included. The pods stay stateless.', lose: 'A monthly bill, and the network path to the service needs setup.' },
          { t: 'A Deployment with an `emptyDir` and a nightly dump', d: 'The simplest thing that starts.', lose: 'Up to a day of lost data on every pod replacement. That is more than the one hour the business accepts.' }
        ],
        pick: 1,
        why: 'The limits of the business are one hour of data and four hours of downtime, and nobody has done a restore. A managed service meets both with the least own work. The StatefulSet is a good choice for a test environment, or for a team that has practised the restore.',
        when: 'In a test cluster, or when the data can be rebuilt from the source, a StatefulSet is fine and cheap.'
      }),

      B.incident({
        id: 'm6-inc', t: 2, src: 'rec', title: 'Incident: the orders table has vanished', time: '08:30',
        alert: '**The reports show no orders since this morning.** `kubectl get pods` shows a new `pg-0` that is 20 minutes old and ready. The table `orders` does not exist.',
        clues: ['Last night someone ran a clean-up script: `kubectl delete statefulset pg && kubectl delete pvc --all`', 'The storage class has the reclaim policy Delete', 'There is no snapshot and no dump from the last 24 hours'],
        opts: [
          { t: 'Restore from the last backup that exists, and reload the missing orders from the source systems with the loader', fb: '' },
          { t: 'Look for the old volume with `kubectl get pv`', fb: 'With the policy Delete the volume was deleted with the claim.' },
          { t: 'Restart the pod, so that the old data comes back', fb: 'There is no old data. The new pod has a new, empty volume.' },
          { t: 'Delete the new claim, so that the old one returns', fb: 'The old one does not exist any more.' }
        ],
        best: 0,
        why: 'The script deleted the claim, and with the policy Delete the volume and its files went too. This is what the recording showed: no volumes left and an empty new database. Recovery means a backup, and a reload of the rest from the source.',
        checks: [
          ['Check what exists', '`kubectl get pv,pvc`. An old volume would be listed as Released if the policy had been Retain.'],
          ['Find a backup', 'A dump, a snapshot of the disk, or the source systems.'],
          ['Reload', 'Run the loader again for the days that the backup does not have.'],
          ['Prevent', 'Retain on the storage class for databases, a daily backup that is **tested**, and no `--all` in scripts.']
        ],
        tell: 'A clean-up script deleted the claim of the database, and because the reclaim policy was Delete, the volume went with it. We restored the last dump and re-ran the loader for the gap. Now the storage class for databases uses Retain, backups run daily with a restore test every month, and scripts may not use `--all` on claims.',
        prevent: ['**Retain** for volumes that hold data you cannot rebuild', 'Backups that are **restored in a test** regularly', 'No bulk deletes of claims, and a review for clean-up scripts']
      }),

      B.qa({
        id: 'qa-pvc', t: 1, tag: 'Kubernetes', secs: 75,
        q: 'Explain PersistentVolume, PersistentVolumeClaim and StorageClass.',
        pts: ['A PersistentVolume is a piece of storage in the cluster', 'A claim is a request for storage by a pod', 'A StorageClass makes volumes on demand for claims', 'The claim is bound to a volume, and lives separately from the pod'],
        short: 'A PersistentVolume is a piece of storage that the cluster knows about, such as a disk of the cloud. A PersistentVolumeClaim is a pod\'s request for storage: how much, and with which access mode. A StorageClass says how to make volumes on demand, so that nobody creates them by hand. When a claim appears, the class makes a volume and the cluster binds the two. The claim lives separately from the pod, which is why data survives a replaced pod. In the recording the StatefulSet made the claim `data-pg-0`, the `' + PV.storage_class + '` class made the volume, and it showed as Bound.',
        fu: [['What is the reclaim policy?', 'What happens to the volume when its claim is deleted: Delete removes it, Retain keeps it. In the recording it was ' + PV.reclaim + '.'], ['What is ReadWriteOnce?', 'One node can write at a time. From documentation.']],
        trap: 'Thinking that a volume is deleted or kept with the pod.',
        real: 'Say what storage class your clusters use, and its reclaim policy.'
      }),

      B.qa({
        id: 'qa-sts', t: 1, tag: 'Kubernetes', secs: 75,
        q: 'When do you use a StatefulSet instead of a Deployment?',
        pts: ['When each pod needs a stable name', 'When each pod needs its own volume that follows it', 'When the start order matters', 'Databases, brokers and clustered systems'],
        short: 'When the pods are not interchangeable. A StatefulSet gives each pod a fixed name, such as `pg-0`, its own claim that follows the pod, a DNS name through a headless Service, and an ordered start. A database or a broker needs exactly that. I ran Postgres as a StatefulSet: deleting its pod brought back `pg-0` with the same claim and all 5,000 orders. For stateless services I use a Deployment, where the pods are replaceable and a new name is no problem. Even so, I would think hard before I run the production database in the cluster, because the backups and the failover are the real work.',
        fu: [['What does a headless Service do?', 'It has no address, and DNS returns the pods themselves, so that each pod has a name.'], ['What happens to the claims when you scale down?', 'They stay. From documentation.']],
        trap: 'Using a Deployment with one replica and an emptyDir for a database.',
        real: 'Say what stateful systems you have run on Kubernetes, or why not.'
      }),

      B.qa({
        id: 'qa-dbk8s', t: 2, tag: 'Kubernetes', secs: 75,
        q: 'Would you run a production database on Kubernetes?',
        pts: ['It is possible, with a StatefulSet and a volume', 'The work is backups, restore, failover and upgrades', 'A managed database does that work', 'An operator can help if you must run it yourself'],
        short: 'It works: I ran Postgres as a StatefulSet and the data survived a deleted pod and a deleted StatefulSet. It was also lost when I deleted the claim, with the policy Delete, so a delete is a risk. The real cost of production is backups with tested restores, failover and upgrades. A managed database does that for me, and keeps my pods stateless, so that is my default. If there is a reason to run it myself, such as cost or a feature, I use an operator that handles failover and backup, set the reclaim policy to Retain, and I practise the restore.',
        fu: [['What is an operator?', 'A controller that knows how to run one kind of system, for example a database, and keeps it healthy. From documentation.'], ['Which systems are fine in a cluster?', 'Those that are easy to rebuild, or that already replicate their data, like Kafka with enough replicas.']],
        trap: 'Saying yes without naming backups and failover.',
        real: 'Describe a database that you run, and how it is backed up.'
      }),

      B.qa({
        id: 'qa-csi', t: 3, tag: 'Kubernetes', secs: 60,
        q: 'What are CSI drivers, volume snapshots and volume expansion?',
        pts: ['CSI is the standard interface between Kubernetes and a storage system', 'A driver creates, attaches and mounts the volumes', 'A VolumeSnapshot is a point-in-time copy through the driver', 'Expansion needs a class that allows it, and often a restart or a file-system resize'],
        short: 'CSI, the Container Storage Interface, is the standard way for Kubernetes to talk to a storage system, so that EBS, Persistent Disk, Azure Disk, NFS and many others plug in without changes to Kubernetes. A driver creates volumes, attaches them to nodes and mounts them in pods. With a driver that supports it, a VolumeSnapshot takes a point-in-time copy of a claim, which you can restore into a new claim, and this is how many teams back up a database volume. A class can allow expansion, so that you raise the size in the claim and the driver grows the disk. In the recording the class was the local-path one of k3s, with expansion off, so snapshots and expansion are described from documentation.',
        fu: [['What is WaitForFirstConsumer?', 'The volume is made when the pod is scheduled, in the same zone as the node. The recorded class used it.'], ['Is a snapshot a backup?', 'It is a copy on the same storage system. A backup also needs a copy somewhere else, and a restore that you have tested.']],
        trap: 'Calling a snapshot of a volume your only backup.',
        real: 'Say which storage class your databases use and what its reclaim policy is.'
      }),

      B.recap({
        id: 'm6-recap', n: 6, badge: 'Data Keeper', color: '#FED7AA',
        pts: [
          'A pod asks with a **claim**. A **storage class** makes the **volume**. The claim is bound to it.',
          'A **StatefulSet** gives each pod a fixed name and its own claim: `pg-0` and `data-pg-0`.',
          'Delete the **pod**: ' + n(RW.after_pod_deleted) + ' orders stay. Delete the **StatefulSet**: the claim stays. Delete the **claim**: with `' + PV.reclaim + '`, the data is gone.',
          '`emptyDir` is scratch space. It is gone when the pod is replaced.',
          'A **managed database** is the default for production. Back up, and test the restore.'
        ],
        lines: [
          'I know what each delete removes.',
          'I set Retain for data I cannot rebuild.',
          'I test restores. A backup that was never restored is a hope.'
        ]
      })
    ]
  });
})();
