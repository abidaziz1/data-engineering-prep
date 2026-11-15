# Integration notes

These changes were applied to the live line in the same push as the course, so nothing here is left to paste. The list says what was touched, so a later change can find it. Numbers come from `node dev/stats.js kubernetes`, the smoke walks and `python3 kubernetes/verify/verify_k8s.py --recapture --browser`.

## What was touched outside `kubernetes/`

| File | Change |
| --- | --- |
| `index.html` | A ready card after the Docker card (junior about 3.5 hours, senior about 5 hours: 210 and 304 minutes), the plan chip Kubernetes turned ready, and the meta description |
| `README.md` | A table row, the planned row without Kubernetes, the layout block, the check-tools line and a paragraph about what the check needs, a bullet in the honest notes, and the coach sentence ("Nova teaches Kubernetes") |
| `package.json` | `kubernetes` added to the `lint` script, and the scripts `lint:kubernetes`, `smoke:kubernetes`, `e2e:kubernetes` (the generic test and `kubernetes/verify/e2e_labs.js`), `stats:kubernetes` and `verify:kubernetes` |
| `dev/analytics-test.js` | `kubernetes` added to the list of tutorials |
| `dev/requirements.txt` | A comment line with what `kubernetes/verify` needs |

## Choices worth knowing

- **Coach Nova** is set in `kubernetes/js/config.js` and drawn by `kubernetes/js/coach-nova.js`.
- **The cluster is k3s in a container, not kind, minikube or a cloud cluster.** kind was not available in the sandbox that built the course, and Docker was. A single k3s node is a real Kubernetes API server, scheduler, controllers and kubelet. It is not a multi-node cluster, so nothing in the course claims to show scheduling across nodes, node drains or zones.
- **The sandbox needed four accommodations**, all written by `k8slib.py` when `K8S_SANDBOX` is set: `failCgroupV1: false` for the kubelet (the machine has cgroup version 1), eviction thresholds of 1 GiB (the disk allowance is small and the node reported DiskPressure), `restrict_oom_score_adj = true` for containerd (the sandbox refuses a negative `oom_score_adj`), and a `NO_PROXY` list that holds the node address (otherwise `kubectl logs` went through the sandbox proxy and ended with EOF). Elsewhere none of them is needed.
- **The Services use port 8080.** With port 80, a call to a Service that had no endpoints was answered by the egress proxy of the sandbox with HTTP 403, and not refused by kube-proxy as it is on a normal cluster. Port 8080 gave `Connection refused`, which is what the lessons teach.
- **The recorder removes what it starts.** The container `dkc-k3s` and its volume `dkc-k3s-data` are removed at the end, and the namespace `brewline` lives and dies with the cluster.
- **The generic `dev/e2e.js` does not drive the labs.** `e2e:kubernetes` runs it first and then `kubernetes/verify/e2e_labs.js`.
- **Docker Hub limits the pulls of anonymous users.** The recorder pulls an image only when it is not on the machine, and waits a minute and tries again on a 429, as in the Docker course.
