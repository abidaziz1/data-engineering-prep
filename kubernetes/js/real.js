window.LAB = window.LAB || {};
LAB.real = {
 "counts": {
  "cfg.after": {
   "env": "info",
   "file": "debug",
   "file_changed_within_120s": true
  },
  "cfg.before": {
   "env": "info",
   "file": "info"
  },
  "cfg.orders": {
   "bytes": 127918,
   "limit_bytes": 1048576,
   "rows": 5000
  },
  "cfg.secret": {
   "stored_differs_from_value": true,
   "stored_is_base64_of_value": true,
   "type": "Opaque"
  },
  "cluster.apiresources": {
   "kinds": 85
  },
  "deploy.heal": {
   "deleted_name_still_there": false,
   "new_names": 1,
   "pods_after": 3,
   "pods_before": 3,
   "ready_after": 3
  },
  "deploy.rolling": {
   "max_pods_seen": 4,
   "max_unavailable": 0,
   "min_ready_seen": 3,
   "replicasets": 2,
   "surge": 1
  },
  "deploy.scale": {
   "pods": 5
  },
  "deploy.state": {
   "pods": 3,
   "ready": 3,
   "replicas": 3,
   "replicasets": 1
  },
  "deploy.stuck": {
   "available_replicas": 3,
   "ready_replicas": 3,
   "replicas": 4,
   "rollout_exit_code": 1,
   "updated_replicas": 1
  },
  "deploy.undo": {
   "image": "python:3.13-slim",
   "ready": 3
  },
  "fail.badimage": {
   "event_reasons": [
    "BackOff",
    "Failed",
    "Pulling"
   ],
   "seen": [
    "ContainerCreating",
    "ErrImagePull",
    "ImagePullBackOff"
   ]
  },
  "fail.crash": {
   "backoff_event": true,
   "last_exit_code": 3,
   "last_reason": "Error",
   "restart_times_s": [
    1,
    15,
    38,
    95
   ],
   "restarts_at_least_3": true,
   "seen": [
    "ContainerCreating",
    "Error",
    "Running"
   ],
   "status_samples": {
    "ContainerCreating": 1,
    "Error": 203,
    "Running": 3
   }
  },
  "fail.oom": {
   "exit_code": 137,
   "limit": "64Mi",
   "phase": "Failed",
   "qos": "Burstable",
   "reason": "OOMKilled"
  },
  "fail.pending": {
   "node_assigned": false,
   "node_cpus": 4,
   "status": "Pending"
  },
  "job.cron": {
   "concurrency": "Forbid",
   "job_name_pattern": true,
   "jobs_created": 1,
   "manual_job_succeeded": true,
   "schedule": "* * * * *",
   "suspended": true
  },
  "job.deadline": {
   "condition": [
    "Failed",
    "DeadlineExceeded"
   ]
  },
  "job.never": {
   "backoff_limit": 2,
   "condition": [
    "Failed",
    "BackoffLimitExceeded"
   ],
   "failed": 3,
   "pod_status": [
    "Error"
   ],
   "pods": 3
  },
  "job.onfailure": {
   "condition": [
    "Failed",
    "BackoffLimitExceeded"
   ],
   "max_pods_seen": 1,
   "max_restarts_seen": 2,
   "pods_left_after_failure": 0
  },
  "job.parallel": {
   "completions": 4,
   "parallelism": 2,
   "peak_running": 2,
   "succeeded": 4
  },
  "job.ttl": {
   "deleted_by_the_cluster": true,
   "ttl_seconds": 5
  },
  "kz.facts": {
   "image_tag_2": true,
   "name_prefixed": true,
   "namespace_set": true,
   "replicas_3": true
  },
  "obj.bare_pod": {
   "recreated": false
  },
  "obj.phases": {
   "ends_running": true,
   "seen": [
    "ContainerCreating",
    "Running"
   ]
  },
  "obj.pod": {
   "has_ip": true,
   "image": "alpine:3.22",
   "labels": {
    "app": "hello"
   },
   "mounted_volumes": 1,
   "node": "vm",
   "phase": "Running",
   "qos": "BestEffort",
   "ready": true,
   "restart_count": 0,
   "restart_policy": "Always",
   "service_account": "default"
  },
  "probe.live": {
   "event_reasons": [
    "Killing",
    "Unhealthy"
   ],
   "last_exit_code": 137,
   "last_reason": "Error",
   "restarts_at_least_1": true
  },
  "probe.ready": {
   "after": {
    "endpoint_addresses": 1,
    "phase": "Running",
    "ready_column": "1/1"
   },
   "before": {
    "endpoint_addresses": 0,
    "listed_but_not_ready": 1,
    "phase": "Running",
    "ready_column": "0/1"
   }
  },
  "rbac.default_sa": {
   "list_pods": "no"
  },
  "rbac.get_pods_as_reader": {
   "rc": 0
  },
  "res.qos": {
   "besteffort": "BestEffort",
   "burstable": "Burstable",
   "guaranteed": "Guaranteed"
  },
  "sto.after_delete": {
   "pvc_still_there": true
  },
  "sto.after_pvc_delete": {
   "pv_count": 0,
   "pvc_count": 0,
   "rows_in_the_new_database": 0
  },
  "sto.pv": {
   "access_modes": [
    "ReadWriteOnce"
   ],
   "count": 1,
   "node_affinity": true,
   "phase": "Bound",
   "reclaim": "Delete",
   "storage_class": "local-path"
  },
  "sto.rows": {
   "after_load": 5000,
   "after_pod_deleted": 5000,
   "after_statefulset_recreated": 5000,
   "same_pod_name": true
  },
  "sto.sts": {
   "pods": [
    "pg-0"
   ],
   "pvc_name": "data-pg-0"
  },
  "svc.endpoints": {
   "addresses": 3,
   "pods": 3
  },
  "svc.ip_change": {
   "name_still_works": true,
   "old_ip_gone": true
  },
  "svc.wrong_port": {
   "wget_rc": 1
  },
  "svc.wrong_selector": {
   "endpoints_empty": true,
   "wget_rc": 1
  },
  "val.strict": {
   "rc": 1
  }
 },
 "files": {
  "app/Dockerfile": "FROM python:3.13-slim\nWORKDIR /app\nCOPY requirements.txt .\nRUN pip install --no-cache-dir -r requirements.txt\nCOPY load_orders.py worker.py ./\nCMD [\"python\", \"load_orders.py\", \"/data/orders.csv\"]\n",
  "app/load_orders.py": "\"\"\"Load one file of Brewline orders into Postgres. Running it twice does no harm.\"\"\"\nimport csv\nimport os\nimport sys\n\nimport psycopg\n\nSCHEMA = \"\"\"\nCREATE TABLE IF NOT EXISTS orders (\n    order_id   integer PRIMARY KEY,\n    store_id   text NOT NULL,\n    order_date date NOT NULL,\n    amount     numeric(10, 2) NOT NULL\n)\n\"\"\"\n\n\ndef read_rows(path):\n    with open(path, newline=\"\") as f:\n        return [(int(r[\"order_id\"]), r[\"store_id\"], r[\"order_date\"], r[\"amount\"])\n                for r in csv.DictReader(f)]\n\n\ndef main(path):\n    rows = read_rows(path)\n    with psycopg.connect(os.environ[\"DATABASE_URL\"]) as con:\n        con.execute(SCHEMA)\n        with con.cursor() as cur:\n            cur.executemany(\n                \"INSERT INTO orders VALUES (%s, %s, %s, %s) ON CONFLICT (order_id) DO NOTHING\",\n                rows)\n        total = con.execute(\"SELECT count(*) FROM orders\").fetchone()[0]\n    print(f\"read {len(rows)} rows from {path}, the table now has {total}\")\n\n\nif __name__ == \"__main__\":\n    main(sys.argv[1])\n",
  "app/requirements.txt": "psycopg[binary]==3.3.8\n",
  "app/worker.py": "\"\"\"A job that runs until it is stopped. With HANDLE_TERM=1 it finishes its batch when it gets SIGTERM.\"\"\"\nimport os\nimport signal\nimport sys\nimport time\n\n\ndef stop(signum, frame):\n    print(\"got SIGTERM, finishing the batch\", flush=True)\n    sys.exit(0)\n\n\nif os.environ.get(\"HANDLE_TERM\") == \"1\":\n    signal.signal(signal.SIGTERM, stop)\n\nprint(\"worker started as process\", os.getpid(), flush=True)\nwhile True:\n    time.sleep(0.2)\n",
  "configmap-settings-debug.yaml": "apiVersion: v1\nkind: ConfigMap\nmetadata:\n  name: settings\ndata:\n  LOG_LEVEL: debug\n",
  "configmap-settings.yaml": "apiVersion: v1\nkind: ConfigMap\nmetadata:\n  name: settings\ndata:\n  LOG_LEVEL: info\n",
  "cronjob-loader.yaml": "apiVersion: batch/v1\nkind: CronJob\nmetadata:\n  name: nightly\nspec:\n  schedule: \"* * * * *\"\n  concurrencyPolicy: Forbid\n  successfulJobsHistoryLimit: 2\n  failedJobsHistoryLimit: 2\n  jobTemplate:\n    spec:\n      backoffLimit: 1\n      template:\n        spec:\n          restartPolicy: Never\n          containers:\n            - name: loader\n              image: brewline/loader:1\n              args: [\"python\", \"load_orders.py\", \"/data/orders.csv\"]\n              env:\n                - name: DATABASE_URL\n                  value: postgresql://postgres:brewline-dev@pg:5432/brewline\n              volumeMounts:\n                - name: orders\n                  mountPath: /data\n                  readOnly: true\n          volumes:\n            - name: orders\n              configMap:\n                name: orders\n",
  "deploy-web-typo.yaml": "apiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: web\n  labels:\n    app: web\nspec:\n  replicas: 3\n  selector:\n    matchLabels:\n      app: web\n  strategy:\n    type: RollingUpdate\n    rollingUpdate:\n      maxSurge: 1\n      maxUnavailable: 0\n  template:\n    metadata:\n      labels:\n        app: web\n    spec:\n      containers:\n        - name: web\n          image: python:3.13-slimm\n          command: [\"sh\", \"-c\", \"echo 'web version 1' > index.html; exec python -m http.server 8080\"]\n          ports:\n            - containerPort: 8080\n          readinessProbe:\n            httpGet:\n              path: /\n              port: 8080\n            periodSeconds: 1\n",
  "deploy-web-v2.yaml": "apiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: web\n  labels:\n    app: web\nspec:\n  replicas: 3\n  selector:\n    matchLabels:\n      app: web\n  strategy:\n    type: RollingUpdate\n    rollingUpdate:\n      maxSurge: 1\n      maxUnavailable: 0\n  template:\n    metadata:\n      labels:\n        app: web\n    spec:\n      containers:\n        - name: web\n          image: python:3.13-slim\n          command: [\"sh\", \"-c\", \"echo 'web version 2' > index.html; exec python -m http.server 8080\"]\n          ports:\n            - containerPort: 8080\n          readinessProbe:\n            httpGet:\n              path: /\n              port: 8080\n            periodSeconds: 1\n",
  "deploy-web.yaml": "apiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: web\n  labels:\n    app: web\nspec:\n  replicas: 3\n  selector:\n    matchLabels:\n      app: web\n  strategy:\n    type: RollingUpdate\n    rollingUpdate:\n      maxSurge: 1\n      maxUnavailable: 0\n  template:\n    metadata:\n      labels:\n        app: web\n    spec:\n      containers:\n        - name: web\n          image: python:3.13-slim\n          command: [\"sh\", \"-c\", \"echo 'web version 1' > index.html; exec python -m http.server 8080\"]\n          ports:\n            - containerPort: 8080\n          readinessProbe:\n            httpGet:\n              path: /\n              port: 8080\n            periodSeconds: 1\n",
  "job-deadline.yaml": "apiVersion: batch/v1\nkind: Job\nmetadata:\n  name: deadline\nspec:\n  activeDeadlineSeconds: 5\n  backoffLimit: 6\n  template:\n    spec:\n      restartPolicy: Never\n      containers:\n        - name: slow\n          image: alpine:3.22\n          command: [\"sleep\", \"60\"]\n",
  "job-fail-never.yaml": "apiVersion: batch/v1\nkind: Job\nmetadata:\n  name: fail-never\nspec:\n  backoffLimit: 2\n  template:\n    spec:\n      restartPolicy: Never\n      containers:\n        - name: loader\n          image: alpine:3.22\n          command: [\"sh\", \"-c\", \"echo the load failed; exit 1\"]\n",
  "job-fail-onfailure.yaml": "apiVersion: batch/v1\nkind: Job\nmetadata:\n  name: fail-onfailure\nspec:\n  backoffLimit: 2\n  template:\n    spec:\n      restartPolicy: OnFailure\n      containers:\n        - name: loader\n          image: alpine:3.22\n          command: [\"sh\", \"-c\", \"echo the load failed; exit 1\"]\n",
  "job-loader.yaml": "apiVersion: batch/v1\nkind: Job\nmetadata:\n  name: loader\nspec:\n  backoffLimit: 2\n  template:\n    spec:\n      restartPolicy: Never\n      containers:\n        - name: loader\n          image: brewline/loader:1\n          args: [\"python\", \"load_orders.py\", \"/data/orders.csv\"]\n          env:\n            - name: DATABASE_URL\n              value: postgresql://postgres:brewline-dev@pg:5432/brewline\n          volumeMounts:\n            - name: orders\n              mountPath: /data\n              readOnly: true\n      volumes:\n        - name: orders\n          configMap:\n            name: orders\n",
  "job-parallel.yaml": "apiVersion: batch/v1\nkind: Job\nmetadata:\n  name: parallel\nspec:\n  completions: 4\n  parallelism: 2\n  template:\n    spec:\n      restartPolicy: Never\n      containers:\n        - name: part\n          image: alpine:3.22\n          command: [\"sh\", \"-c\", \"echo working on a part; sleep 4\"]\n",
  "job-ttl.yaml": "apiVersion: batch/v1\nkind: Job\nmetadata:\n  name: ttl\nspec:\n  ttlSecondsAfterFinished: 5\n  template:\n    spec:\n      restartPolicy: Never\n      containers:\n        - name: quick\n          image: alpine:3.22\n          command: [\"sh\", \"-c\", \"echo done\"]\n",
  "kustomize/base/deployment.yaml": "apiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: loader-api\nspec:\n  replicas: 1\n  selector:\n    matchLabels:\n      app: loader-api\n  template:\n    metadata:\n      labels:\n        app: loader-api\n    spec:\n      containers:\n        - name: api\n          image: brewline/loader:1\n          command: [\"python\", \"worker.py\"]\n",
  "kustomize/base/kustomization.yaml": "resources:\n  - deployment.yaml\n",
  "kustomize/overlays/prod/kustomization.yaml": "resources:\n  - ../../base\nnamePrefix: prod-\nnamespace: brewline-prod\nreplicas:\n  - name: loader-api\n    count: 3\nimages:\n  - name: brewline/loader\n    newTag: \"2\"\nlabels:\n  - pairs:\n      env: prod\n",
  "pod-badimage.yaml": "apiVersion: v1\nkind: Pod\nmetadata:\n  name: badimage\nspec:\n  containers:\n    - name: loader\n      image: alpine:3.22-nope\n",
  "pod-config.yaml": "apiVersion: v1\nkind: Pod\nmetadata:\n  name: config\nspec:\n  containers:\n    - name: app\n      image: alpine:3.22\n      command: [\"sleep\", \"3600\"]\n      envFrom:\n        - configMapRef:\n            name: settings\n      volumeMounts:\n        - name: settings\n          mountPath: /etc/settings\n  volumes:\n    - name: settings\n      configMap:\n        name: settings\n",
  "pod-crash.yaml": "apiVersion: v1\nkind: Pod\nmetadata:\n  name: crash\nspec:\n  containers:\n    - name: loader\n      image: alpine:3.22\n      command: [\"sh\", \"-c\", \"echo starting the load; exit 3\"]\n",
  "pod-hello.yaml": "apiVersion: v1\nkind: Pod\nmetadata:\n  name: hello\n  labels:\n    app: hello\nspec:\n  containers:\n    - name: hello\n      image: alpine:3.22\n      command: [\"sh\", \"-c\", \"echo hello from a pod; sleep 3600\"]\n",
  "pod-live.yaml": "apiVersion: v1\nkind: Pod\nmetadata:\n  name: live\nspec:\n  containers:\n    - name: app\n      image: alpine:3.22\n      command: [\"sh\", \"-c\", \"touch /tmp/alive; sleep 8; rm /tmp/alive; sleep 3600\"]\n      livenessProbe:\n        exec:\n          command: [\"test\", \"-f\", \"/tmp/alive\"]\n        initialDelaySeconds: 2\n        periodSeconds: 2\n        failureThreshold: 2\n",
  "pod-oom.yaml": "apiVersion: v1\nkind: Pod\nmetadata:\n  name: oom\nspec:\n  restartPolicy: Never\n  containers:\n    - name: loader\n      image: python:3.13-slim\n      command: [\"python\", \"-c\", \"x = bytearray(200 * 1024 * 1024); print('allocated', len(x) // 1048576, 'MB')\"]\n      resources:\n        limits:\n          memory: 64Mi\n",
  "pod-pending.yaml": "apiVersion: v1\nkind: Pod\nmetadata:\n  name: pending\nspec:\n  containers:\n    - name: loader\n      image: alpine:3.22\n      command: [\"sleep\", \"3600\"]\n      resources:\n        requests:\n          cpu: \"64\"\n",
  "pod-qos-besteffort.yaml": "apiVersion: v1\nkind: Pod\nmetadata:\n  name: qos-besteffort\nspec:\n  containers:\n    - name: app\n      image: alpine:3.22\n      command: [\"sleep\", \"3600\"]\n",
  "pod-qos-burstable.yaml": "apiVersion: v1\nkind: Pod\nmetadata:\n  name: qos-burstable\nspec:\n  containers:\n    - name: app\n      image: alpine:3.22\n      command: [\"sleep\", \"3600\"]\n      resources:\n        requests:\n          memory: 32Mi\n",
  "pod-qos-guaranteed.yaml": "apiVersion: v1\nkind: Pod\nmetadata:\n  name: qos-guaranteed\nspec:\n  containers:\n    - name: app\n      image: alpine:3.22\n      command: [\"sleep\", \"3600\"]\n      resources:\n        requests:\n          cpu: 100m\n          memory: 32Mi\n        limits:\n          cpu: 100m\n          memory: 32Mi\n",
  "pod-ready.yaml": "apiVersion: v1\nkind: Pod\nmetadata:\n  name: ready\n  labels:\n    app: ready\nspec:\n  containers:\n    - name: app\n      image: alpine:3.22\n      command: [\"sleep\", \"3600\"]\n      readinessProbe:\n        exec:\n          command: [\"test\", \"-f\", \"/tmp/ready\"]\n        periodSeconds: 1\n---\napiVersion: v1\nkind: Service\nmetadata:\n  name: ready\nspec:\n  selector:\n    app: ready\n  ports:\n    - port: 80\n",
  "pod-worker-nohandler.yaml": "apiVersion: v1\nkind: Pod\nmetadata:\n  name: worker-nohandler\nspec:\n  terminationGracePeriodSeconds: 5\n  containers:\n    - name: worker-nohandler\n      image: brewline/loader:1\n      command: [\"python\", \"worker.py\"]\n      env:\n        - name: HANDLE_TERM\n          value: \"0\"\n",
  "pod-worker.yaml": "apiVersion: v1\nkind: Pod\nmetadata:\n  name: worker\nspec:\n  terminationGracePeriodSeconds: 5\n  containers:\n    - name: worker\n      image: brewline/loader:1\n      command: [\"python\", \"worker.py\"]\n      env:\n        - name: HANDLE_TERM\n          value: \"1\"\n",
  "postgres.yaml": "apiVersion: v1\nkind: Secret\nmetadata:\n  name: pg\nstringData:\n  POSTGRES_PASSWORD: brewline-dev\n---\napiVersion: v1\nkind: Service\nmetadata:\n  name: pg\nspec:\n  clusterIP: None\n  selector:\n    app: pg\n  ports:\n    - port: 5432\n---\napiVersion: apps/v1\nkind: StatefulSet\nmetadata:\n  name: pg\nspec:\n  serviceName: pg\n  replicas: 1\n  selector:\n    matchLabels:\n      app: pg\n  template:\n    metadata:\n      labels:\n        app: pg\n    spec:\n      containers:\n        - name: postgres\n          image: postgres:16-alpine\n          envFrom:\n            - secretRef:\n                name: pg\n          env:\n            - name: POSTGRES_DB\n              value: brewline\n            - name: PGDATA\n              value: /var/lib/postgresql/data/pgdata\n          ports:\n            - containerPort: 5432\n          readinessProbe:\n            exec:\n              command: [\"pg_isready\", \"-h\", \"127.0.0.1\", \"-U\", \"postgres\", \"-d\", \"brewline\"]\n            periodSeconds: 2\n          volumeMounts:\n            - name: data\n              mountPath: /var/lib/postgresql/data\n  volumeClaimTemplates:\n    - metadata:\n        name: data\n      spec:\n        accessModes: [\"ReadWriteOnce\"]\n        resources:\n          requests:\n            storage: 1Gi\n",
  "rbac.yaml": "apiVersion: v1\nkind: ServiceAccount\nmetadata:\n  name: reader\n---\napiVersion: rbac.authorization.k8s.io/v1\nkind: Role\nmetadata:\n  name: pod-reader\nrules:\n  - apiGroups: [\"\"]\n    resources: [\"pods\", \"pods/log\"]\n    verbs: [\"get\", \"list\", \"watch\"]\n---\napiVersion: rbac.authorization.k8s.io/v1\nkind: RoleBinding\nmetadata:\n  name: read-pods\nsubjects:\n  - kind: ServiceAccount\n    name: reader\nroleRef:\n  kind: Role\n  name: pod-reader\n  apiGroup: rbac.authorization.k8s.io\n",
  "secret-token.yaml": "apiVersion: v1\nkind: Secret\nmetadata:\n  name: partner\ntype: Opaque\nstringData:\n  token: brewline-demo-token-4711\n",
  "svc-web-port.yaml": "apiVersion: v1\nkind: Service\nmetadata:\n  name: web-port\nspec:\n  selector:\n    app: web\n  ports:\n    - port: 8080\n      targetPort: 8000\n",
  "svc-web-wrong.yaml": "apiVersion: v1\nkind: Service\nmetadata:\n  name: web-wrong\nspec:\n  selector:\n    app: webb\n  ports:\n    - port: 8080\n      targetPort: 8080\n",
  "svc-web.yaml": "apiVersion: v1\nkind: Service\nmetadata:\n  name: web\nspec:\n  selector:\n    app: web\n  ports:\n    - port: 8080\n      targetPort: 8080\n"
 },
 "meta": {
  "arch": "amd64",
  "distribution": "k3s1",
  "k3s_image": "rancher/k3s:v1.37.2-k3s1",
  "kernel": "6.18.44-fc-v470",
  "kubectl": "1.37.2",
  "kubelet": "1.37.2",
  "kubernetes": "1.37.2",
  "os_image": "K3s v1.37.2+k3s1",
  "recorded_on": "2026-11-15",
  "runtime": "containerd://2.3.7-k3s1",
  "sandbox": true
 },
 "tables": {
  "fail.table": {
   "cols": [
    "pod",
    "what kubectl shows"
   ],
   "rows": [
    [
     "badimage",
     "ContainerCreating then ErrImagePull then ImagePullBackOff"
    ],
    [
     "crash",
     "Error or CrashLoopBackOff, restarts at 1, 15, 38, 95 s (exit code 3)"
    ],
    [
     "oom",
     "OOMKilled (exit code 137)"
    ],
    [
     "pending",
     "Pending (no node has 64 CPUs)"
    ]
   ]
  },
  "obj.events": {
   "cols": [
    "type",
    "reason",
    "message"
   ],
   "rows": [
    [
     "Normal",
     "Scheduled",
     "Successfully assigned brewline/hello to vm"
    ],
    [
     "Normal",
     "Pulled",
     "Container image \"alpine:3.22\" already present on machine and can be accessed by the pod"
    ],
    [
     "Normal",
     "Created",
     "Container created"
    ],
    [
     "Normal",
     "Started",
     "Container started"
    ]
   ]
  },
  "obj.system_pods": {
   "cols": [
    "namespace",
    "name",
    "ready",
    "status"
   ],
   "rows": [
    [
     "kube-system",
     "coredns",
     "1/1",
     "Running"
    ],
    [
     "kube-system",
     "helm-install-gateway-api-crd",
     "0/1",
     "Completed"
    ],
    [
     "kube-system",
     "local-path-provisioner",
     "1/1",
     "Running"
    ]
   ]
  },
  "probe.shutdown": {
   "cols": [
    "pod",
    "delete waited for the grace period (5 s)",
    "the handler ran",
    "terminationGracePeriodSeconds"
   ],
   "rows": [
    [
     "worker",
     "no",
     "yes",
     5
    ],
    [
     "worker-nohandler",
     "yes",
     "no",
     5
    ]
   ]
  },
  "rbac.reader": {
   "cols": [
    "can the service account reader ...",
    "answer"
   ],
   "rows": [
    [
     "list pods in brewline",
     "yes"
    ],
    [
     "get the log of a pod in brewline",
     "yes"
    ],
    [
     "delete pods in brewline",
     "no"
    ],
    [
     "list secrets in brewline",
     "no"
    ],
    [
     "list pods in default",
     "no"
    ],
    [
     "create deployments in brewline",
     "no"
    ]
   ]
  }
 },
 "text": {
  "cfg.secret_describe": "Name:         partner\nNamespace:    brewline\nType:  Opaque\nData\ntoken:  24 bytes",
  "cfg.secret_encoded": "YnJld2xpbmUtZGVtby10b2tlbi00NzEx",
  "cfg.secret_yaml": "apiVersion: v1\ndata:\n  token: YnJld2xpbmUtZGVtby10b2tlbi00NzEx\nkind: Secret\ntype: Opaque",
  "deploy.apply": "deployment.apps/web created",
  "deploy.curl_v2": "web version 2",
  "deploy.get": "NAME  READY  UP-TO-DATE  AVAILABLE  AGE\ndeployment.apps/web  3/3  3  3  <age>\n\nNAME  DESIRED  CURRENT  READY  AGE\nreplicaset.apps/web-<hash>  3  3  3  <age>\n\nNAME  READY  STATUS  RESTARTS  AGE\npod/web-<hash>-<id>  1/1  Running  0  <age>\npod/web-<hash>-<id>  1/1  Running  0  <age>\npod/web-<hash>-<id>  1/1  Running  0  <age>",
  "deploy.history": "deployment.apps/web \nREVISION  CHANGE-CAUSE\n1         <none>\n2         <none>",
  "deploy.rollout_status": "deployment \"web\" successfully rolled out",
  "deploy.rs": "NAME  DESIRED  CURRENT  READY  AGE\nweb-<hash>  0  0  0  <age>\nweb-<hash>  3  3  3  <age>",
  "deploy.scale": "deployment.apps/web scaled",
  "deploy.stuck_pods": "NAME  READY  STATUS  RESTARTS  AGE\nweb-<hash>-<id>  0/1  ErrImagePull  0  <age>\nweb-<hash>-<id>  1/1  Running  0  <age>\nweb-<hash>-<id>  1/1  Running  0  <age>\nweb-<hash>-<id>  1/1  Running  0  <age>",
  "deploy.stuck_status": "error: timed out waiting for the condition",
  "deploy.undo": "deployment.apps/web rolled back",
  "fail.badimage_message": "docker.io/library/alpine:3.22-nope: not found",
  "fail.crash_describe": "    State:          Terminated\n      Reason:       Error\n      Exit Code:    3\n    Last State:     Terminated\n      Reason:       Error\n      Exit Code:    3\n    Restart Count:  4",
  "fail.crash_event": "Back-off restarting failed container loader in pod crash_brewline(<pod uid>)",
  "fail.crash_get": "NAME  READY  STATUS  RESTARTS  AGE\ncrash  0/1  Error  4 (58s ago)  <age>",
  "fail.crash_logs": "starting the load",
  "fail.oom_logs": "",
  "fail.pending_event": "0/1 nodes are available: 1 Insufficient cpu. preemption: not helpful",
  "job.cron_get": "NAME  SCHEDULE  TIMEZONE  SUSPEND  ACTIVE  LAST SCHEDULE  AGE\nnightly  * * * * *  <none>  False  0  <none>  <age>",
  "job.cron_logs": "read 5000 rows from /data/orders.csv, the table now has 5000",
  "job.manual": "job.batch/manual created",
  "job.parallel_get": "NAME  STATUS  COMPLETIONS  DURATION  AGE\nparallel  Complete  4/4  14s  <age>",
  "kz.out": "apiVersion: apps/v1\nkind: Deployment\nmetadata:\n  labels:\n    env: prod\n  name: prod-loader-api\n  namespace: brewline-prod\nspec:\n  replicas: 3\n  selector:\n    matchLabels:\n      app: loader-api\n  template:\n    metadata:\n      labels:\n        app: loader-api\n    spec:\n      containers:\n      - command:\n        - python\n        - worker.py\n        image: brewline/loader:2\n        name: api",
  "obj.apply": "pod/hello created",
  "obj.explain": "KIND:       Pod\nVERSION:    v1\n\nFIELD: restartPolicy <string>\nENUM:\n    Always\n    Never\n    OnFailure",
  "obj.get": "NAME  READY  STATUS  RESTARTS  AGE\nhello  1/1  Running  0  <age>",
  "obj.labels": "hello",
  "obj.logs": "hello from a pod",
  "obj.namespaces": "brewline\ndefault\nkube-node-lease\nkube-public\nkube-system",
  "obj.nodes": "NAME  STATUS  ROLES  AGE  VERSION\nvm  Ready  control-plane  <age>  v1.37.2+k3s1",
  "probe.live_event": "Liveness probe failed: ",
  "rbac.apply": "serviceaccount/reader created\nrole.rbac.authorization.k8s.io/pod-reader created\nrolebinding.rbac.authorization.k8s.io/read-pods created",
  "rbac.forbidden": "Error from server (Forbidden): pods \"nothing\" is forbidden: User \"system:serviceaccount:brewline:reader\" cannot delete resource \"pods\" in API group \"\" in the namespace \"brewline\"",
  "rbac.list": "Resources Verbs\nselfsubjectreviews.authentication.k8s.io [create]\nselfsubjectaccessreviews.authorization.k8s.io [create]\nselfsubjectrulesreviews.authorization.k8s.io [create]\npods/log [get list watch]\npods [get list watch]",
  "sto.classes": "NAME  PROVISIONER  RECLAIMPOLICY  VOLUMEBINDINGMODE  ALLOWVOLUMEEXPANSION  AGE\nlocal-path (default)  rancher.io/local-path  Delete  WaitForFirstConsumer  false  <age>",
  "sto.job_get": "NAME  STATUS  COMPLETIONS  DURATION  AGE\nloader  Complete  1/1  3s  <age>",
  "sto.job_logs": "read 5000 rows from /data/orders.csv, the table now has 5000",
  "sto.pvc": "NAME  STATUS  VOLUME  CAPACITY  ACCESS MODES  STORAGECLASS  VOLUMEATTRIBUTESCLASS  AGE\ndata-pg-0  Bound  pvc-b2ccd3c7-4830-4ab9-86e3-54aec89ed25c  1Gi  RWO  local-path  <unset>  <age>",
  "sto.pvc_after_delete": "NAME  STATUS  VOLUME  CAPACITY  ACCESS MODES  STORAGECLASS  VOLUMEATTRIBUTESCLASS  AGE\ndata-pg-0  Bound  pvc-b2ccd3c7-4830-4ab9-86e3-54aec89ed25c  1Gi  RWO  local-path  <unset>  <age>",
  "svc.fqdn": "web version 1",
  "svc.get": "NAME  TYPE  CLUSTER-IP  EXTERNAL-IP  PORT(S)  AGE\nweb  ClusterIP  <ip>  <none>  8080/TCP  <age>",
  "svc.getent": "<cluster-ip>      web.brewline.svc.cluster.local  web.brewline.svc.cluster.local web\n<cluster-ip>      web.brewline.svc.cluster.local  web.brewline.svc.cluster.local",
  "svc.port_endpoint": "8000",
  "svc.port_wget": "wget: can't connect to remote host (<cluster-ip>): Connection refused",
  "svc.resolv": "search brewline.svc.cluster.local svc.cluster.local cluster.local\nnameserver 10.43.0.10\noptions ndots:5",
  "svc.short": "web version 1",
  "svc.wrong_describe": "Endpoints:",
  "svc.wrong_wget": "wget: can't connect to remote host (<cluster-ip>): Connection refused",
  "val.dry_run": "pod/hello created (server dry run)",
  "val.strict": "Error from server (BadRequest): error when creating \"STDIN\": Pod in version \"v1\" cannot be handled as a Pod: strict decoding error: unknown field \"spec.containers[0].imagee\""
 }
};
