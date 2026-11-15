# Kubernetes for data engineers

A guided, press-Next course on the part of Kubernetes that a data engineer meets: running a job and a database on a cluster that somebody else operates. Coach Nova follows **Brewline**, the coffee retailer, and one small job that loads a day of orders into Postgres. You start a real cluster, apply a pod and read what the cluster says, break pods on purpose, roll out a bad image and go back, point a Service at nothing, change a ConfigMap under a running pod, delete a database in three different ways, run the loader as a Job and a CronJob, delete a pod that ignores SIGTERM, and give a pipeline only the access it needs. Every terminal in the course is real output from a Kubernetes cluster that ran on one machine.

Open **`index.html`** in a browser. No install, no account.

## What is recorded, and what is a stand-in

**Managed clusters (EKS, GKE, AKS), Helm, operators, ingress controllers, network policies, autoscaling and service meshes did not run for this course.** Every screen carries one of two tags.

| Tag | What it means |
| --- | --- |
| **Recorded** | Real output written by `kubernetes/verify/capture_k8s.py` on one Linux machine: **Kubernetes 1.37.2** as **k3s v1.37.2+k3s1** (one node, containerd 2.3.7-k3s1, kernel 6.18.44, x86_64, cgroup version 1), started from the image `rancher/k3s:v1.37.2-k3s1` in a privileged container with the host network. The images were `alpine:3.22` (3.22.8), `python:3.13-slim` (Python 3.13.18) and `postgres:16-alpine` (PostgreSQL 16.16). The job is `load_orders.py` with psycopg 3.3.8, loading 5,000 made-up orders from a fixed rule |
| **From documentation** | What Kubernetes does elsewhere or that I did not run: EKS, GKE and AKS, Helm, operators, ingress controllers and the Gateway API, network policies, the Horizontal Pod Autoscaler, the cluster autoscaler and KEDA, CPU throttling, startup probes, indexed Jobs, volume snapshots, admission policies, workload identity (IRSA), blue/green and canary releases, node drains and PodDisruptionBudgets, and how a cluster with several nodes schedules. Nothing was timed, except the waits between the restarts of a crash loop, which the lesson shows as numbers |

The stand-ins and limits, said again where they matter:

- **One node.** Scheduling across nodes, zones, drains and taints were not run. The pod that asks for 64 CPUs stays Pending because the one node has 4.
- **The sandbox needed four accommodations**, which the recorder writes when `K8S_SANDBOX=1` is set: `failCgroupV1: false` for the kubelet, because the machine has cgroup version 1; eviction thresholds of 1 GiB, because the disk allowance is small and the node reported DiskPressure; `restrict_oom_score_adj = true` for containerd, because the sandbox refuses a negative `oom_score_adj`; and a `NO_PROXY` list with the address of the node, because `kubectl logs` went through the proxy of the sandbox and ended with EOF. None of them changes what a pod, a Service or a Job does.
- **Traefik, the service load balancer and the metrics server were switched off.** There is no ingress controller, no load balancer and no `kubectl top`. The Service types of mission 4 come from documentation.
- **No registry.** The loader image `brewline/loader:1` was built with `docker build` (on the host network and through the proxy, as in the Docker course) and copied into the containerd of the cluster with `ctr images import`, so the cluster pulled nothing. The base images were copied in the same way.
- **The Services use port 8080.** With port 80, a call to a Service that had no endpoints was answered by the proxy of the sandbox with HTTP 403, and was not refused by kube-proxy, as it is on a normal cluster. With port 8080 the call ended with `Connection refused`, which is what the lessons teach. The lessons also say that a wrong selector and a wrong `targetPort` give the same words, so the endpoints are what tells them apart.
- **The status CrashLoopBackOff did not show in the recording.** The recorder looked at the status column of the crash pod 207 times and it said `Error` 203 times (and `Running` 3, `ContainerCreating` 1). An earlier run of the same recorder did catch `CrashLoopBackOff` once, so a cluster may show either word. The lessons give the restart count, the growing waits and the `BackOff` event as the signs to trust, and say what the column said.
- **`kubectl logs --previous` could not read the log of an earlier run** on this cluster, so the crash lesson shows the log of the last run.
- **A terminal replay is built from recorded values.** Every output line came from the recording. Some replays print the full text that a command printed (the `get` tables, `describe`, the `kustomize` output). Others put the command next to the values that the recorder read after it, as with `jsonpath` queries. The names of pods, the hashes of ReplicaSets, ages and volume ids are masked in the replays, because they differ on every run.
- **The data is made up.** 5,000 orders in 12 stores, in March 2026, from a fixed rule. The token `brewline-demo-token-4711` and the password `brewline-dev` are made up too.
- **The Kubernetes documentation could not be read page by page.** The search summaries that I read named kubernetes.io pages for some claims and not for others. The claims to check are listed below.

## Pick a path

| Path | Frames | Time | For |
| --- | --- | --- | --- |
| **Junior** | 357 | about 3.5 hours | Starting out, or interviewing for a junior data engineer role |
| **Senior** | 477 | about 5 hours | Everything in Junior, plus the rollout, storage, job and access decisions that seniors own |
| **Everything** | 551 | about 6 hours | Adds the finer points: control plane parts, eviction, private registries, release patterns, how a Service address works, ingress, immutable config, CSI, indexed Jobs, disruption budgets, autoscaling, workload identity, network policies and admission |

Times are estimates from reading and speaking each step, and they include saying the interview answers out loud. Switch paths at any time from the **Map** button.

## The missions

| # | Mission | Junior | Senior | Everything |
| --- | --- | --- | --- | --- |
| 1 | The cluster and its objects | 19 min | 25 min | 28 min |
| 2 | Pods that fail | 19 min | 25 min | 30 min |
| 3 | Deployments and rollouts | 19 min | 26 min | 29 min |
| 4 | Services and names | 16 min | 23 min | 28 min |
| 5 | Configuration and secrets | 12 min | 22 min | 24 min |
| 6 | Storage and a database | 18 min | 25 min | 28 min |
| 7 | Jobs and CronJobs | 21 min | 27 min | 30 min |
| 8 | Limits, probes and shutdown | 20 min | 27 min | 32 min |
| 9 | Access and packaging | 14 min | 24 min | 31 min |
| 10 | Boss round | 46 min | 73 min | 104 min |
| | **Total** | **210 min** | **304 min** | **371 min** |

A short mission 0 sets up the course: the whole picture, what a junior and a senior are asked, how the screens work and what ran. Mission 10 has two drills that mix missions (a pod that no node can take followed by a memory kill, and a loader that runs against a database that is Running but not ready), a design decision (how to run twelve nightly steps), a coding round (write the CronJob of the loader), a mock interview of 43 questions, a scorecard and a one-page cheat sheet of recorded numbers.

## What job descriptions ask for, and where this course covers it

I read a small sample of postings through search: five queries, for data engineer and data platform roles in the United States, London, Bangalore, Singapore and Sydney. I read the search summaries and not every posting, many results were recruiter and aggregator pages that repeat each other, and some were months old, so this shows **direction and not a count**.

| What postings ask for | Where | How it is covered |
| --- | --- | --- |
| Kubernetes and Docker as core skills next to Spark, Airflow, Snowflake and dbt, with "deploying, managing and troubleshooting" containerized workloads. Several 2026 US postings (a contract in Cupertino, a Data Engineer II role) | 1 to 8 | **Recorded**: applying, reading and breaking pods, rolling out and rolling back, Services, Jobs. Troubleshooting is the most-used skill in the course: `get`, `describe`, `logs` and the events |
| Kubernetes as the executor of an orchestrator, "Airflow on Kubernetes", Kubernetes-based executors | 7 | **Recorded**: a Job and a CronJob, retries, deadlines and idempotent loads. The comparison with an orchestrator is **from documentation**. The Airflow course covers Airflow |
| Kubernetes (EKS) with Terraform and Python pipelines on AWS in London, with IRSA named in one posting | 5, 9 | **Recorded**: Secrets, RBAC and a Kustomize overlay. EKS, IRSA and Terraform are **from documentation**, and Terraform has its own course |
| Docker and Kubernetes as "good to have", "plus" or "familiarity" in Bangalore postings, and as mandatory with Docker Compose in a few | all | The Docker course covers Compose. Here, **Recorded**: everything that a user of a cluster does |
| Operating Kubernetes and Kafka, running Spark clusters on Kubernetes in production, with Helm and Terraform, in Singapore data platform postings | 6, 8, 9 | **Recorded**: a StatefulSet with a volume, limits, probes and shutdown. Spark on Kubernetes, Kafka operators and Helm are **from documentation** or covered in the Spark and Kafka courses |
| Self-hosted Kubernetes with infrastructure as code and Kafka, Flink, Spark and Airflow on top, in Sydney postings | 6 to 9 | **Recorded** for the objects. The platforms themselves are **from documentation** |
| Helm charts, operators, GitOps, service meshes, autoscaling, multi-cluster work | not here | Helm, GitOps, autoscaling and admission are in the Extra path **from documentation**. The rest is not covered |

The interview themes that came up most in the summaries are missions here: what a pod, a Deployment and a Service are, how a rolling update works and how to roll back, why a pod does not run, how config and secrets reach a pod, how a database keeps its data, how to run a batch job, and who may do what.

## What you work through

- **Follow Brewline.** One job, one Postgres, one cluster. A release that never finishes, a Service that answers nothing, a debug flag that did not take effect, a table that vanished with a deleted claim, a nightly load that ran twice, a batch that was killed by a node drain, and a clean-up job that lost its right to delete.
- **8 animated diagrams.** What happens after `kubectl apply`, a Deployment and its ReplicaSet and pods, the life of a pod and how it stalls, a rolling update, how a call reaches a pod, a pod with its claim and volume, a CronJob with its Job and pod, and what happens when a pod is deleted.
- **6 labs.** Four pods that fail. A rolling update for three pairs of settings. Three Services, one that works. Five Jobs. What survives a delete. A pod with and without a SIGTERM handler.
- **38 terminal replays, 17 code walkthroughs and 19 comparison tables.** Manifests, a Python worker with a signal handler, a loader that is safe to run twice, and the commands with their real output.
- **27 quizzes, 10 bug hunts, 9 ordering games, 10 decisions with a recommended answer and 11 incident drills,** each drill with a first-move choice, a triage checklist, a way to tell the story and prevention steps.
- **43 interview questions,** each with a timer, a 60-second model answer, a key-point checklist, likely follow-ups and the mistake people make most often.

## How it was checked

| Check | Result |
| --- | --- |
| Content lint (ids, tiers, code line ranges, diagram references, answer length, writing rules, the source tag on every screen, and every number the lessons quote against the recording) | Clean. 11 chapters, 268 screens: 180 for everyone, 58 for Senior, 30 extra |
| Every frame walked in Chromium (`dev/smoke.js`), with console, network, text size, overflow and markup checks | No errors on any path. Walked 357 frames on the Junior path, 477 on the Senior path and 551 on the Everything path |
| The same walk at phone width (390 px), Everything path | No horizontal overflow, no errors. The script reports small text: the numbers of the shared interface and the diagram labels are 10.5 to 14.8 px |
| Interaction test (`node dev/e2e.js kubernetes`): every quiz, bug hunt, ordering game, decision, incident, interview question, coding problem and boss question, plus keys, text size, Map, paths, saving and reset | 930 checks passed, 0 failed |
| The 6 labs driven in the browser (`kubernetes/verify/e2e_labs.js`): every chip of every lab, compared with the recording and with values worked out in the test (the limits of a rolling update, how many pods a failing Job makes, what each delete removes, which pod handles a signal). The same file fails when a step shows an HTML tag, backticks, asterisks, `undefined` or `NaN` as text | 179 checks passed |
| Recorded output (`kubernetes/verify/capture_k8s.py`) | 38 files, 52 texts, 5 tables and 40 sets of counts. The recorder takes about 10 minutes and removes the cluster it started |
| The manifests and the code of the lessons (`kubernetes/verify/verify_k8s.py`) | The files of the recording are the files on disk (38 files), and the 16 code screens that show one show it exactly. All 32 manifests of the project and the 38 manifests that the lessons show (the bug hunts and their fixes, and the coding round) are sent to the API server of a real cluster as a strict server-side dry run and accepted. The one bug hunt whose manifest is broken on purpose is refused with the words that the lesson names. `kubectl kustomize` builds the overlay and its output equals the recording. 2 Python snippets and the 2 Python files of the project compile |
| Commands (`verify_k8s.py`) | 138 `kubectl` commands of the terminal replays are checked against `--help` of the installed kubectl: the command exists, a command that has subcommands is followed by one of them, every flag exists, and a flag that takes a value is read as one |
| Recapture (`verify_k8s.py --recapture`) | The whole recording is made again on a fresh cluster and compared with `js/real.js`: 146 items, 0 differ in the last run. The first full comparison found two differences, which are now allowances: the seconds at which the crash pod restarted (they differ by a second or two, so the comparison checks that there are at least three restarts, that the waits grow and that the first is near 10 seconds) and the padding of the `getent` columns (it depends on the length of the address, which is masked afterwards). The comparison allows exactly these and nothing else: the date, ages, pod hashes, addresses and volume ids, which of `ErrImagePull` and `ImagePullBackOff` the stuck pod shows, the durations of Jobs, the number of restarts that a `describe` shows, how many restarts of a failing Job the poll caught, and how many Jobs the CronJob had made when it was read |
| Lab data (`kubernetes/verify/check_widgets.js`) | 87 checks written in code that shares nothing with the widgets: the limits of a rolling update, the QoS class worked out from each manifest, what a Role allows worked out from its rules, what each delete removes, how many pods a failing Job makes, which pod handles a signal, base64 of the Secret, and how the numbers of the recording agree with the manifests that were applied |
| Controls | 26 deliberately broken inputs, and each one is refused: five manifests (a field that does not exist, a Deployment whose selector does not match its template, an object of an unknown kind, a Job with `restartPolicy: Always`, a Service whose port is not a number), a Kustomize overlay whose base does not exist, a shell script with an unclosed quote, Python with a syntax error, four `kubectl` commands (a flag that does not exist, a command that does not exist, a `rollout` subcommand that does not exist, a short flag that does not exist), seven changes to the recording that the widget checker must refuse (a rolling update that peaked at five pods, a failing Job with two pods, the QoS class of a pod, a reader that may delete pods, a volume left after a deleted claim, a worker that did not wait, a Service call answered by a server), a recording with one number changed, one with a crash loop whose waits do not grow and one with a changed name in the `getent` line, all three of which the comparison must report, and, with `--browser`, four changes to the widget code that the lab test must fail (the stop lab reversed, the storage lab saying that a deleted pod loses the data, the rolling update lab ignoring `maxUnavailable`, the Service lab with its verdict reversed) |

### What was not checked

- **Managed clusters, Helm, operators, ingress controllers, network policies, autoscaling and service meshes were not run.** Their screens come from documentation.
- **One node, one version.** Kubernetes 1.37.2 as k3s. Other distributions and versions differ in defaults and in what a status column says, as the crash loop showed.
- **Nothing was timed**, except the restart waits of the crash loop, and the lessons teach counts, exit codes, states and plans. How long a pull or a start takes depends on the machine and the network.
- **CPU throttling** was not measured. The lesson that a CPU limit slows and a memory limit kills is from documentation for the CPU half.
- **Startup probes, indexed Jobs, `rollout pause`, blue/green and canary, CSI snapshots, volume expansion, PodDisruptionBudgets and topology spread, admission policies, IRSA and network policies** are described from documentation.
- **The reject rule of kube-proxy** for a Service without endpoints was seen in the iptables of the node while I worked, and was not recorded. The lessons rely on the recorded `Connection refused` and say that kube-proxy does it.
- **Only the screens listed under "Screens looked at" were reviewed by eye.** Every other screen was checked by the tests above and was not looked at.
- **This is engineering practice and not security advice.** Ask your security team which rules apply to you.

### Re-check before you rely on it

| Claim | Where it comes from | Link |
| --- | --- | --- |
| Secret objects are stored unencrypted in etcd by default, and encryption at rest is a setting to configure. Base64 is an encoding. RBAC is a separate control, because a reader with permission still gets the decrypted value | The good practices page for Secrets, read through search | [Good practices for Kubernetes Secrets](https://www.kubernetes.io/docs/concepts/security/secrets-good-practices/) |
| A PersistentVolume with the reclaim policy Delete removes the storage with the claim. Dynamically provisioned volumes take the policy of their StorageClass, which defaults to Delete | The persistent volumes page, read through search. The recording shows it with the `local-path` class | [Persistent Volumes](https://kubernetes.io/docs/concepts/storage/persistent-volumes/) |
| Deleting a StatefulSet does not delete its claims by default. A retention policy can change that (`whenDeleted`, `whenScaled`) | KEP-1847, read through search. The recording shows the default | [KEP-1847: auto delete PVCs created by StatefulSet](https://www.kubernetes.dev/resources/keps/1847/) |
| `maxSurge` and `maxUnavailable` can be percentages: surge rounds up, unavailable rounds down. `progressDeadlineSeconds` defaults to 600 | The rolling update task page, read through search. **The 600 came from a summary of a third-party page**: I did not find it on an official page | [Update a Deployment without downtime](https://kubernetes.io/docs/tasks/run-application/update-deployment-rolling/) |
| A pod gets SIGTERM, then SIGKILL after `terminationGracePeriodSeconds`, 30 seconds by default. A memory kill is immediate | Third-party articles, read through search. **I did not find the official page in my results.** The recording shows the effect with a grace period of 5 seconds | [Pod lifecycle (v1.36 docs)](https://v1-36.docs.kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/) |
| The back-off between restarts starts near 10 seconds and doubles, with a cap of 5 minutes | Third-party guides. **Not confirmed on an official page.** The recording shows waits of 14, 23 and 57 seconds after the first restart, which grow. Newer versions may change the defaults | none |
| A Job needs `restartPolicy` Never or OnFailure, `backoffLimit` counts retries, `ttlSecondsAfterFinished` cleans up, and a CronJob has `concurrencyPolicy` Allow, Forbid or Replace | Third-party guides, read through search. **I did not find the official pages in my results.** The recording ran each behaviour | none |
| A ConfigMap or Secret is limited to 1 MiB, and a mounted ConfigMap updates after a delay | **Not found in my search results.** The recording shows a mounted file following a change within 120 seconds and a variable that did not | none |
| RBAC has only allow rules | Documentation, from memory of the RBAC page, and the behaviour of the recording (a Role that lists nothing allows nothing). **Not looked up in this session** | none |
| The job postings: direction only, from search summaries of five queries | Pages of job boards, recruiters and company career sites. A small sample | [Example posting: Spark, Hive, Airflow, Kubernetes](https://www.globallogic.com/emea-talent/careers/data-engineer-with-bigdata-spark-hive-and-airflow-basic-knowledge-working-with-kubernetes-irc274090/), [example: Spark on Kubernetes, Helm, Terraform, Singapore](https://builtinsingapore.com/job/data-platform-engineer/6407543) |

## Screens looked at

These are the only screens that were reviewed by eye, at 1440 by 900 unless stated:

- Eight diagrams, at the step that shows the most: what happens after `kubectl apply`, a Deployment with its ReplicaSet and pods, the life of a pod, a rolling update, how a call reaches a pod, a pod with its claim, a CronJob with its Job, and the deletion of a pod.
- Six labs, each in its first state: the pods that fail, the rolling update, the three Services, the five Jobs, what survives a delete, and the two workers.
- The welcome screen, with Coach Nova.

Looking found eight faults that the tests had missed, and all eight are fixed: two labels (`ImagePullBackOff` and `CrashLoopBackOff`) that were wider than their boxes in the pod diagram, a tag that ran off the edge of the storage diagram, a subtitle that was wider than its box in the CronJob diagram, a tag that covered the SIGKILL box in the deletion diagram, two labels that touched the edges of their boxes (the volume and the delete command), and a figure in the Service lab that wrapped over two lines and pushed the verdict out of view.

## Files

```
kubernetes/
  index.html, css/kubernetes.css  the page and its colours
  js/config.js               the course settings: Coach Nova, the paths, the eleven levels
  js/graphs.js               8 diagram specs
  js/widgets.js              the 6 labs
  js/content/                one file per mission, 00 to 10
  js/real.js                 the recording: files, tables, texts and counts written by capture_k8s.py
  verify/project/            the Brewline loader job and its manifests, the Dockerfile of the loader image, and a Kustomize base with an overlay
  verify/k8slib.py           helpers of the recorder: a k3s cluster in a container, kubectl through docker exec, polling, masks
  verify/capture_k8s.py      starts the cluster, applies and breaks the manifests, and writes js/real.js
  verify/verify_k8s.py       sends every manifest to the API server as a strict dry run, checks every kubectl command, compares a new recording with js/real.js, runs the controls
  verify/check_widgets.js    recomputes the rules of the labs from the recording
  verify/e2e_labs.js         drives the six labs in Chromium
  verify/dump_k8s.js         lists the code, the commands and the strings of the course for verify_k8s.py
  verify/requirements.txt    what the machine needs (no Python package)
  verify/INTEGRATION.md      what the hub page, the root README and package.json needed
```

## Run the checks

```bash
python3 kubernetes/verify/verify_k8s.py                       # manifests, kubectl commands, snippets, lab data and controls (about 2 minutes: it starts a k3s cluster and removes it)
python3 kubernetes/verify/verify_k8s.py --recapture --browser # also record again (about 10 minutes) and drive the labs in Chromium
python3 kubernetes/verify/capture_k8s.py                      # writes kubernetes/js/real.js
node dev/lint-content.js kubernetes
node dev/e2e.js kubernetes && node kubernetes/verify/e2e_labs.js
node dev/smoke.js kubernetes --path all
```

In the sandbox that built the course, set `K8S_SANDBOX=1 DK_BUILD_NETWORK=host DK_BUILD_PROXY=1` before the recorder or `--recapture`. Elsewhere leave all three unset. A check whose tool is missing says so and is skipped.

Independent study material. Not affiliated with or endorsed by the Cloud Native Computing Foundation, the Kubernetes project, SUSE and Rancher, Docker, Inc., Amazon, Google, Microsoft, the Postgres Global Development Group or any other vendor or project named here.
