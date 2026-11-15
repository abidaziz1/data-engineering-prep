#!/usr/bin/env python3
"""Record what Kubernetes really does, for the Kubernetes course. Writes kubernetes/js/real.js.

It starts a real Kubernetes cluster (k3s, one node, in a container on a Docker Engine), loads the Brewline loader image into it, and runs the manifests of
verify/project against it with kubectl. Nothing is timed except to say that a wait took about as long as a setting. Names with a random suffix, addresses and
ages differ between runs; verify_k8s.py --recapture compares everything else and names those allowances.

Usage:  python3 kubernetes/verify/capture_k8s.py [--out path] [--only meta,objects,...] [--reuse]
Set K8S_SANDBOX=1 in the sandbox that built the course (cgroup v1, no negative oom_score_adj, builds only through a proxy). Elsewhere leave it unset.
"""
import argparse
import json
import os
import pathlib
import re
import shutil
import sys
import tempfile
import time

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from k8slib import *  # noqa: E401,F401,F403
import k8slib

SECTIONS = []


def section(fn):
    SECTIONS.append(fn)
    return fn


NS = 'brewline'
K = lambda *a, **kw: kc('-n', NS, *a, **kw)


def phases_until(pod, want, timeout=60):
    """The pod phases and the reasons that kubectl shows, in the order in which they appeared."""
    seen, t = [], time.time()
    while time.time() - t < timeout:
        row = K('get', 'pod', pod, '--no-headers', check=False).out.split()
        if row:
            s = row[2]
            if not seen or seen[-1] != s:
                seen.append(s)
            if s in want:
                break
        time.sleep(0.2)
    return seen


def std(*a, ns=None):
    """The table that kubectl prints, with the AGE column masked."""
    o = (K(*a) if ns else kc(*a)).out.strip().splitlines()
    out, head = [], None
    for ln in o:
        cells = re.split(r'\s{2,}', ln.strip())
        if 'AGE' in cells:
            head = cells
        elif head and 'AGE' in head and len(cells) >= len(head):
            cells[head.index('AGE')] = '<age>'
        out.append('  '.join(cells))
    return '\n'.join(out)


def events_of(kind, name):
    """The events of an object, as (type, reason, message) with the age left out, oldest first."""
    o = K('get', 'events', '--field-selector', 'involvedObject.kind=%s,involvedObject.name=%s' % (kind, name), '--sort-by=.lastTimestamp', '-o',
          'jsonpath={range .items[*]}{.type}|{.reason}|{.message}{"\\n"}{end}', check=False).out
    return [l.split('|', 2) for l in o.strip().splitlines() if l]


# ------------------------------------------------------------------ 0. the cluster and the files
@section
def meta():
    M, C = R['meta'], R['counts']
    v = json.loads(kc('version', '-o', 'json').out)
    M['kubernetes'] = v['serverVersion']['gitVersion'].split('+')[0].lstrip('v')
    M['kubectl'] = v['clientVersion']['gitVersion'].split('+')[0].lstrip('v')
    M['distribution'] = v['serverVersion']['gitVersion'].split('+')[1] if '+' in v['serverVersion']['gitVersion'] else ''
    node = json.loads(kc('get', 'node', '-o', 'json').out)['items'][0]['status']['nodeInfo']
    M['os_image'] = node['osImage']
    M['kernel'] = node['kernelVersion']
    M['runtime'] = node['containerRuntimeVersion']
    M['kubelet'] = node['kubeletVersion'].split('+')[0].lstrip('v')
    M['arch'] = node['architecture']
    M['k3s_image'] = K3S_IMAGE
    M['sandbox'] = SANDBOX
    M['recorded_on'] = time.strftime('%Y-%m-%d')
    for p in sorted(PROJECT.rglob('*')):
        if p.is_file() and p.suffix in ('.yaml', '.py', '.txt') or p.name == 'Dockerfile':
            R['files'][p.relative_to(PROJECT).as_posix()] = p.read_text()
    C['cluster.apiresources'] = {'kinds': len([l for l in kc('api-resources', '--no-headers').out.splitlines() if l.strip()])}
    kc('create', 'namespace', NS, check=False)


# ------------------------------------------------------------------ 1. the objects of the cluster
@section
def objects():
    C, T, X = R['counts'], R['tables'], R['text']
    X['obj.nodes'] = std('get', 'nodes')
    rows = [l.split()[:4] for l in kc('get', 'pods', '-A', '--no-headers').out.splitlines() if l.strip()]
    T['obj.system_pods'] = table(['namespace', 'name', 'ready', 'status'], [[r[0], re.sub(r'-[a-z0-9]{9,10}-[a-z0-9]{5}$|-[a-z0-9]{5}$', '', r[1]), r[2], r[3]] for r in rows])
    X['obj.namespaces'] = '\n'.join(l.split()[0] for l in kc('get', 'ns', '--no-headers').out.splitlines())
    # a pod from a file
    X['obj.apply'] = K('apply', '-f', '-', input=(PROJECT / 'pod-hello.yaml').read_text()).out.strip()
    seen = phases_until('hello', {'Running'})
    C['obj.phases'] = {'seen': seen, 'ends_running': seen[-1] == 'Running'}
    ev = events_of('Pod', 'hello')
    T['obj.events'] = table(['type', 'reason', 'message'], [[e[0], e[1], re.sub(r'\b\d+(\.\d+)?(ms|s)\b', '<time>', re.sub(r'hello-?\w*', 'hello', e[2]))] for e in ev])
    info = json.loads(K('get', 'pod', 'hello', '-o', 'json').out)
    st = info['status']
    C['obj.pod'] = {'phase': st['phase'], 'qos': st['qosClass'], 'node': info['spec']['nodeName'], 'has_ip': bool(st.get('podIP')), 'image': info['spec']['containers'][0]['image'],
                    'restart_count': st['containerStatuses'][0]['restartCount'], 'ready': st['containerStatuses'][0]['ready'], 'labels': info['metadata']['labels'],
                    'service_account': info['spec']['serviceAccountName'], 'restart_policy': info['spec']['restartPolicy']}
    C['obj.pod']['mounted_volumes'] = len(info['spec'].get('volumes', []))
    X['obj.logs'] = K('logs', 'hello').out.strip()
    X['obj.get'] = std('get', 'pod', 'hello', ns=NS)
    # labels select
    X['obj.labels'] = K('get', 'pods', '-l', 'app=hello', '--no-headers', '-o', 'custom-columns=NAME:.metadata.name').out.strip()
    # a bare pod is not replaced
    K('delete', 'pod', 'hello', '--wait=true')
    C['obj.bare_pod'] = {'recreated': K('get', 'pod', 'hello', check=False).rc == 0}
    # the explain command
    X['obj.explain'] = '\n'.join(kc('explain', 'pod.spec.restartPolicy').out.strip().splitlines()[:8])


# ------------------------------------------------------------------ 2. pods that fail
@section
def failures():
    C, T, X = R['counts'], R['tables'], R['text']
    rows = []
    # a pod that cannot pull its image
    K('apply', '-f', '-', input=(PROJECT / 'pod-badimage.yaml').read_text())
    seen = phases_until('badimage', {'ImagePullBackOff'}, 90)
    C['fail.badimage'] = {'seen': seen}
    ev = events_of('Pod', 'badimage')
    C['fail.badimage']['event_reasons'] = sorted(set(e[1] for e in ev if e[1] in ('Pulling', 'Failed', 'BackOff')))
    X['fail.badimage_message'] = next((re.search(r'resolve reference "[^"]*": (.*)$', e[2]).group(1)[:160] for e in ev if e[1] == 'Failed' and re.search(r'resolve reference', e[2])), '')
    rows.append(['badimage', ' then '.join(seen)])
    K('delete', 'pod', 'badimage', '--wait=false')
    # a pod that crashes at once: record the statuses, and when each restart happened
    K('apply', '-f', '-', input=(PROJECT / 'pod-crash.yaml').read_text())
    seen, restarts, t0, samples = [], [], time.time(), {}
    while time.time() - t0 < 150 and len(restarts) < 4:
        row = K('get', 'pod', 'crash', '--no-headers', check=False).out.split()
        if row:
            samples[row[2]] = samples.get(row[2], 0) + 1
            if not seen or seen[-1] != row[2]:
                seen.append(row[2])
            rc = int(row[3]) if row[3].isdigit() else 0
            if rc > len(restarts):
                restarts.append(round(time.time() - t0))
        time.sleep(0.3)
    ev = [e for e in events_of('Pod', 'crash') if e[1] == 'BackOff']
    C['fail.crash'] = {'seen': list(dict.fromkeys(seen)), 'status_samples': samples, 'restart_times_s': restarts, 'restarts_at_least_3': len(restarts) >= 3,
                       'backoff_event': bool(ev),
                       'last_exit_code': int(jp('pod', 'crash', '{.status.containerStatuses[0].lastState.terminated.exitCode}', NS)),
                       'last_reason': jp('pod', 'crash', '{.status.containerStatuses[0].lastState.terminated.reason}', NS)}
    X['fail.crash_event'] = re.sub(r'\(([^)]*)\)$', '(<pod uid>)', ev[0][2]).replace('spec.containers{loader}: ', '') if ev else ''
    X['fail.crash_logs'] = K('logs', 'crash').out.strip()
    X['fail.crash_get'] = std('get', 'pod', 'crash', ns=NS)
    X['fail.crash_describe'] = '\n'.join(l for l in K('describe', 'pod', 'crash').out.splitlines() if re.match(r'\s+(State|Reason|Exit Code|Last State|Restart Count):', l))
    rows.append(['crash', 'Error or CrashLoopBackOff, restarts at %s s (exit code %d)' % (', '.join(map(str, restarts)), C['fail.crash']['last_exit_code'])])
    K('delete', 'pod', 'crash', '--wait=false')
    # a pod that goes over its memory limit
    K('apply', '-f', '-', input=(PROJECT / 'pod-oom.yaml').read_text())
    wait_until(lambda: jp('pod', 'oom', '{.status.phase}', NS) == 'Failed', 90, 1, 'oom pod to end')
    C['fail.oom'] = {'reason': jp('pod', 'oom', '{.status.containerStatuses[0].state.terminated.reason}', NS), 'exit_code': int(jp('pod', 'oom', '{.status.containerStatuses[0].state.terminated.exitCode}', NS)),
                     'phase': jp('pod', 'oom', '{.status.phase}', NS), 'limit': jp('pod', 'oom', '{.spec.containers[0].resources.limits.memory}', NS), 'qos': jp('pod', 'oom', '{.status.qosClass}', NS)}
    X['fail.oom_logs'] = K('logs', 'oom', check=False).out.strip()
    rows.append(['oom', '%s (exit code %d)' % (C['fail.oom']['reason'], C['fail.oom']['exit_code'])])
    K('delete', 'pod', 'oom', '--wait=false')
    # a pod that asks for more than the node has
    K('apply', '-f', '-', input=(PROJECT / 'pod-pending.yaml').read_text())
    wait_until(lambda: events_of('Pod', 'pending'), 60, 1, 'a scheduling event')
    ev = [e for e in events_of('Pod', 'pending') if e[1] == 'FailedScheduling']
    X['fail.pending_event'] = re.sub(r'\bpreemption: .*', 'preemption: not helpful', ev[0][2]) if ev else ''
    C['fail.pending'] = {'status': K('get', 'pod', 'pending', '--no-headers').out.split()[2], 'node_assigned': bool(jp('pod', 'pending', '{.spec.nodeName}', NS)), 'node_cpus': int(kc('get', 'nodes', '-o', 'jsonpath={.items[0].status.capacity.cpu}').out)}
    rows.append(['pending', 'Pending (no node has 64 CPUs)'])
    K('delete', 'pod', 'pending', '--wait=false')
    T['fail.table'] = table(['pod', 'what kubectl shows'], rows)


def mask(s):
    s = re.sub(r'-[a-z0-9]{9,10}-[a-z0-9]{5}\b', '-<hash>-<id>', s)
    s = re.sub(r'\b(web|loader-api)-[a-z0-9]{9,10}\b', r'\1-<hash>', s)
    s = re.sub(r'\b(10\.4[23]\.\d+\.\d+|192\.0\.2\.\d+)\b', '<ip>', s)
    return s


def make_orders_csv(n=5000):
    class Lcg:
        def __init__(self, seed):
            self.s = seed

        def next(self):
            self.s = (self.s * 6364136223846793005 + 1442695040888963407) % (1 << 64)
            return self.s >> 33

        def below(self, k):
            return self.next() % k
    g = Lcg(20260331)
    stores = ['s%02d' % i for i in range(1, 13)]
    out = ['order_id,store_id,order_date,amount']
    for i in range(1, n + 1):
        store = stores[min(g.below(12), g.below(12))]
        day = 1 + g.below(31)
        amount = 300 + g.below(3700)
        out.append('%d,%s,2026-03-%02d,%d.%02d' % (i, store, day, amount // 100, amount % 100))
    return '\n'.join(out) + '\n'


def pods(sel, ns=NS):
    """The pods that match a selector and are not on their way out: name, ready, phase."""
    d = json.loads(kc('get', 'pods', '-n', ns, '-l', sel, '-o', 'json', check=False).out or '{"items":[]}')['items']
    out = []
    for p in d:
        if p['metadata'].get('deletionTimestamp'):
            continue
        cs = p['status'].get('containerStatuses') or [{}]
        out.append({'name': p['metadata']['name'], 'ready': bool(cs[0].get('ready')), 'phase': p['status']['phase']})
    return out


def ready_count(sel, ns=NS):
    return len([p for p in pods(sel, ns) if p['ready']])


def pod_names(sel, ns=NS):
    return sorted(p['name'] for p in pods(sel, ns))


# ------------------------------------------------------------------ 3. deployments
@section
def deploy():
    C, T, X = R['counts'], R['tables'], R['text']
    X['deploy.apply'] = K('apply', '-f', '-', input=(PROJECT / 'deploy-web.yaml').read_text()).out.strip()
    K('apply', '-f', '-', input=(PROJECT / 'svc-web.yaml').read_text())
    wait_until(lambda: ready_count('app=web') == 3, 120, 1, 'three ready web pods')
    X['deploy.get'] = mask(std('get', 'deploy,rs,pods', '-l', 'app=web', ns=NS))
    C['deploy.state'] = {'replicas': 3, 'replicasets': len(K('get', 'rs', '-l', 'app=web', '--no-headers').out.splitlines()), 'pods': len(pod_names('app=web')), 'ready': ready_count('app=web')}
    # a pod is deleted, and the deployment makes another
    before = pod_names('app=web')
    K('delete', 'pod', before[0], '--wait=false')
    wait_until(lambda: ready_count('app=web') == 3 and len(pod_names('app=web')) == 3 and before[0] not in pod_names('app=web'), 60, 0.5, 'a replacement')
    after = pod_names('app=web')
    C['deploy.heal'] = {'pods_before': len(before), 'pods_after': len(after), 'ready_after': ready_count('app=web'), 'deleted_name_still_there': before[0] in after, 'new_names': len(set(after) - set(before))}
    # scale
    X['deploy.scale'] = K('scale', 'deploy', 'web', '--replicas=5').out.strip()
    wait_until(lambda: ready_count('app=web') == 5, 60, 0.5, 'five pods')
    C['deploy.scale'] = {'pods': len(pod_names('app=web'))}
    K('scale', 'deploy', 'web', '--replicas=3')
    wait_until(lambda: len(pod_names('app=web')) == 3, 60, 0.5, 'three pods')
    # a rolling update: poll the pods while it runs
    wait_until(lambda: len(pod_names('app=web')) == 3 and ready_count('app=web') == 3, 60, 0.5, 'three pods')
    K('apply', '-f', '-', input=(PROJECT / 'deploy-web-v2.yaml').read_text())
    max_pods, min_ready, steps = 0, 99, 0
    t = time.time()
    while time.time() - t < 90:
        names = pod_names('app=web')
        rd = ready_count('app=web')
        max_pods, min_ready, steps = max(max_pods, len(names)), min(min_ready, rd), steps + 1
        st = K('rollout', 'status', 'deploy/web', '--timeout=1s', check=False).out
        if 'successfully rolled out' in st:
            break
    X['deploy.rollout_status'] = K('rollout', 'status', 'deploy/web').out.strip()
    C['deploy.rolling'] = {'max_pods_seen': max_pods, 'min_ready_seen': min_ready, 'surge': 1, 'max_unavailable': 0, 'replicasets': len(K('get', 'rs', '-l', 'app=web', '--no-headers').out.splitlines())}
    X['deploy.rs'] = mask(std('get', 'rs', '-l', 'app=web', ns=NS))
    X['deploy.history'] = K('rollout', 'history', 'deploy/web').out.strip()
    X['deploy.curl_v2'] = kc('exec', '-n', NS, pod_names('app=web')[0], '--', 'python', '-c', 'import urllib.request;print(urllib.request.urlopen("http://127.0.0.1:8080").read().decode().strip())').out.strip()
    # a rollout with a typo in the image
    K('apply', '-f', '-', input=(PROJECT / 'deploy-web-typo.yaml').read_text())
    time.sleep(25)
    st = K('rollout', 'status', 'deploy/web', '--timeout=5s', check=False)
    X['deploy.stuck_status'] = mask(st.all.strip().splitlines()[-1] if st.all.strip() else '')
    X['deploy.stuck_pods'] = mask(std('get', 'pods', '-l', 'app=web', ns=NS))
    d = json.loads(K('get', 'deploy', 'web', '-o', 'json').out)['status']
    C['deploy.stuck'] = {'ready_replicas': d.get('readyReplicas', 0), 'available_replicas': d.get('availableReplicas', 0), 'updated_replicas': d.get('updatedReplicas', 0), 'replicas': d.get('replicas', 0),
                         'rollout_exit_code': st.rc}
    X['deploy.undo'] = K('rollout', 'undo', 'deploy/web').out.strip()
    wait_until(lambda: ready_count('app=web') == 3 and len(pod_names('app=web')) == 3, 90, 1, 'the undo')
    C['deploy.undo'] = {'image': jp('deploy', 'web', '{.spec.template.spec.containers[0].image}', NS), 'ready': ready_count('app=web')}


# ------------------------------------------------------------------ 4. services and names
@section
def services():
    C, T, X = R['counts'], R['tables'], R['text']
    K('apply', '-f', '-', input=(PROJECT / 'deploy-web.yaml').read_text(), check=False)
    wait_until(lambda: ready_count('app=web') == 3 and len(pod_names('app=web')) == 3 and K('rollout', 'status', 'deploy/web', '--timeout=1s', check=False).rc == 0, 180, 2, 'three web pods and a finished rollout')
    X['svc.get'] = mask(std('get', 'svc', 'web', ns=NS))
    eps = K('get', 'endpointslices', '-l', 'kubernetes.io/service-name=web', '-o', 'jsonpath={.items[0].endpoints[?(@.conditions.ready==true)].addresses[0]}').out.split()
    C['svc.endpoints'] = {'addresses': len(eps), 'pods': len(pod_names('app=web'))}
    K('run', 'client', '--image=alpine:3.22', '--restart=Never', '--', 'sleep', '3600')
    wait_until(lambda: jp('pod', 'client', '{.status.phase}', NS) == 'Running', 60, 1, 'the client pod')
    ex = lambda *c: K('exec', 'client', '--', *c, check=False)
    X['svc.resolv'] = ex('cat', '/etc/resolv.conf').out.strip().replace(jp('svc', 'kubernetes', '{.spec.clusterIP}', 'default').rsplit('.', 1)[0], '10.43.0')
    cl = jp('svc', 'web', '{.spec.clusterIP}', NS)
    X['svc.getent'] = re.sub(re.escape(cl), '<cluster-ip>', ex('getent', 'hosts', 'web').out.strip()) + '\n' + re.sub(re.escape(cl), '<cluster-ip>', ex('getent', 'hosts', 'web.%s.svc.cluster.local' % NS).out.strip())
    X['svc.fqdn'] = ex('wget', '-qO-', 'http://web.%s.svc.cluster.local:8080' % NS).out.strip()
    X['svc.short'] = ex('wget', '-qO-', 'http://web:8080').out.strip()
    # a selector that matches no pod
    K('apply', '-f', '-', input=(PROJECT / 'svc-web-wrong.yaml').read_text())
    e1 = K('get', 'endpointslices', '-l', 'kubernetes.io/service-name=web-wrong', '-o', 'jsonpath={.items[0].endpoints}').out.strip()
    w = ex('wget', '-qO-', '-T', '3', 'http://web-wrong:8080')
    C['svc.wrong_selector'] = {'endpoints_empty': e1 in ('', '[]', 'null'), 'wget_rc': w.rc}
    wl = lambda o: re.sub(r'\(\d+\.\d+\.\d+\.\d+\)', '(<cluster-ip>)', ' '.join(l for l in o.all.strip().splitlines() if 'command terminated' not in l and 'exit code' not in l))
    X['svc.wrong_wget'] = wl(w)
    m = re.search(r'^Endpoints:.*$', K('describe', 'svc', 'web-wrong').out, re.M)
    X['svc.wrong_describe'] = m.group(0).rstrip() if m else ''
    # a service that forwards to the wrong port
    K('apply', '-f', '-', input=(PROJECT / 'svc-web-port.yaml').read_text())
    w2 = ex('wget', '-qO-', '-T', '3', 'http://web-port:8080')
    C['svc.wrong_port'] = {'wget_rc': w2.rc}
    X['svc.port_wget'] = wl(w2)
    X['svc.port_endpoint'] = mask(K('get', 'endpointslices', '-l', 'kubernetes.io/service-name=web-port', '-o', 'jsonpath={.items[0].ports[0].port}').out.strip())
    # a pod gets a new address when it is replaced, and the service name stays
    ip_of = lambda n: jp('pod', n, '{.status.podIP}', NS)
    p0 = pod_names('app=web')[0]
    ip0 = ip_of(p0)
    K('delete', 'pod', p0, '--wait=false')
    wait_until(lambda: ready_count('app=web') == 3 and len(pod_names('app=web')) == 3 and p0 not in pod_names('app=web'), 60, 0.5, 'a replacement pod')
    ips = sorted(ip_of(n) for n in pod_names('app=web'))
    C['svc.ip_change'] = {'old_ip_gone': ip0 not in ips, 'name_still_works': ex('wget', '-qO-', 'http://web:8080').out.strip() == 'web version 1'}
    K('delete', 'svc', 'web-wrong', 'web-port')
    K('delete', 'pod', 'client', '--wait=false')


# ------------------------------------------------------------------ 5. configuration and secrets
@section
def config():
    C, T, X = R['counts'], R['tables'], R['text']
    K('apply', '-f', '-', input=(PROJECT / 'configmap-settings.yaml').read_text())
    K('apply', '-f', '-', input=(PROJECT / 'pod-config.yaml').read_text())
    wait_until(lambda: jp('pod', 'config', '{.status.phase}', NS) == 'Running', 60, 1, 'the config pod')
    ex = lambda *c: K('exec', 'config', '--', *c, check=False).out.strip()
    C['cfg.before'] = {'env': ex('printenv', 'LOG_LEVEL'), 'file': ex('cat', '/etc/settings/LOG_LEVEL')}
    K('apply', '-f', '-', input=(PROJECT / 'configmap-settings-debug.yaml').read_text())
    t = time.time()
    changed = False
    while time.time() - t < 120:
        if ex('cat', '/etc/settings/LOG_LEVEL') == 'debug':
            changed = True
            break
        time.sleep(3)
    C['cfg.after'] = {'env': ex('printenv', 'LOG_LEVEL'), 'file': ex('cat', '/etc/settings/LOG_LEVEL'), 'file_changed_within_120s': changed}
    K('delete', 'pod', 'config', '--wait=false')
    # a secret
    K('apply', '-f', '-', input=(PROJECT / 'secret-token.yaml').read_text())
    enc = jp('secret', 'partner', '{.data.token}', NS)
    import base64
    C['cfg.secret'] = {'stored_is_base64_of_value': base64.b64decode(enc).decode() == 'brewline-demo-token-4711', 'stored_differs_from_value': enc != 'brewline-demo-token-4711', 'type': jp('secret', 'partner', '{.type}', NS)}
    X['cfg.secret_encoded'] = enc
    X['cfg.secret_describe'] = '\n'.join(l for l in K('describe', 'secret', 'partner').out.splitlines() if l.startswith(('Name', 'Type', 'token', 'Data', '----')) or 'bytes' in l)
    X['cfg.secret_yaml'] = '\n'.join(l for l in K('get', 'secret', 'partner', '-o', 'yaml').out.splitlines() if l.strip().startswith(('apiVersion', 'data', 'token', 'kind', 'type')))
    # the orders as a ConfigMap, for the loader
    csv = make_orders_csv()
    K('create', 'configmap', 'orders', '--from-file=orders.csv=/dev/stdin', input=csv)
    C['cfg.orders'] = {'bytes': len(csv.encode()), 'limit_bytes': 1048576, 'rows': csv.count('\n') - 1}
    K('delete', 'secret', 'partner')


# ------------------------------------------------------------------ 6. storage and a database
@section
def storage():
    C, T, X = R['counts'], R['tables'], R['text']
    X['sto.classes'] = std('get', 'storageclass')
    K('apply', '-f', '-', input=(PROJECT / 'postgres.yaml').read_text())
    pvc0 = K('get', 'pvc', 'data-pg-0', '--no-headers', check=False).out.split()
    wait_until(lambda: ready_count('app=pg') == 1, 180, 2, 'postgres to be ready')
    X['sto.pvc'] = std('get', 'pvc', ns=NS)
    pv = json.loads(kc('get', 'pv', '-o', 'json').out)['items']
    C['sto.pv'] = {'count': len(pv), 'reclaim': pv[0]['spec']['persistentVolumeReclaimPolicy'], 'storage_class': pv[0]['spec']['storageClassName'], 'access_modes': pv[0]['spec']['accessModes'], 'phase': pv[0]['status']['phase'],
                   'node_affinity': bool(pv[0]['spec'].get('nodeAffinity'))}
    C['sto.sts'] = {'pods': pod_names('app=pg'), 'pvc_name': 'data-pg-0'}
    sql = lambda q: K('exec', 'pg-0', '--', 'psql', '-U', 'postgres', '-d', 'brewline', '-tAc', q, check=False).out.strip()
    # the loader, as a job
    K('apply', '-f', '-', input=(PROJECT / 'job-loader.yaml').read_text())
    wait_until(lambda: jp('job', 'loader', '{.status.succeeded}', NS) == '1', 120, 2, 'the loader job')
    X['sto.job_logs'] = K('logs', 'job/loader').out.strip()
    X['sto.job_get'] = std('get', 'job', 'loader', ns=NS)
    C['sto.rows'] = {'after_load': int(sql('SELECT count(*) FROM orders'))}
    # the pod is deleted, and the data stays
    K('delete', 'pod', 'pg-0', '--wait=true')
    wait_until(lambda: ready_count('app=pg') == 1, 180, 2, 'postgres again')
    C['sto.rows']['after_pod_deleted'] = int(sql('SELECT count(*) FROM orders'))
    C['sto.rows']['same_pod_name'] = pod_names('app=pg') == ['pg-0']
    # the stateful set is deleted, and the volume claim stays
    K('delete', 'statefulset', 'pg', '--wait=true')
    X['sto.pvc_after_delete'] = std('get', 'pvc', ns=NS)
    C['sto.after_delete'] = {'pvc_still_there': K('get', 'pvc', 'data-pg-0', check=False).rc == 0}
    K('apply', '-f', '-', input=(PROJECT / 'postgres.yaml').read_text())
    wait_until(lambda: ready_count('app=pg') == 1, 180, 2, 'postgres from the old volume')
    C['sto.rows']['after_statefulset_recreated'] = int(sql('SELECT count(*) FROM orders'))
    K('delete', 'job', 'loader', '--wait=true')
    # the claim is deleted: the volume goes with it, and the data with the volume
    K('delete', 'statefulset', 'pg', '--wait=true')
    K('delete', 'pvc', 'data-pg-0', '--wait=true')
    wait_until(lambda: not json.loads(kc('get', 'pv', '-o', 'json').out)['items'], 60, 1, 'the volume to be removed')
    C['sto.after_pvc_delete'] = {'pv_count': len(json.loads(kc('get', 'pv', '-o', 'json').out)['items']), 'pvc_count': len(json.loads(K('get', 'pvc', '-o', 'json').out)['items'])}
    K('apply', '-f', '-', input=(PROJECT / 'postgres.yaml').read_text())
    wait_until(lambda: ready_count('app=pg') == 1, 180, 2, 'a new postgres')
    C['sto.after_pvc_delete']['rows_in_the_new_database'] = int(sql('SELECT count(*) FROM orders', ) or 0) if sql('SELECT to_regclass(\'orders\') IS NOT NULL') == 't' else 0
    # load the orders again, for the sections that follow
    K('apply', '-f', '-', input=(PROJECT / 'job-loader.yaml').read_text())
    wait_until(lambda: jp('job', 'loader', '{.status.succeeded}', NS) == '1', 120, 2, 'the loader job again')
    K('delete', 'job', 'loader', '--wait=true')


# ------------------------------------------------------------------ 7. jobs and cron jobs
@section
def jobs():
    C, T, X = R['counts'], R['tables'], R['text']
    def job_cond(name):
        d = json.loads(K('get', 'job', name, '-o', 'json').out)['status']
        return [(c['type'], c.get('reason', '')) for c in d.get('conditions', []) if c['status'] == 'True']
    K('apply', '-f', '-', input=(PROJECT / 'job-fail-never.yaml').read_text())
    wait_until(lambda: any(t == 'Failed' for t, _ in job_cond('fail-never')), 180, 2, 'fail-never to fail')
    pods = K('get', 'pods', '-l', 'job-name=fail-never', '--no-headers').out.splitlines()
    C['job.never'] = {'pods': len(pods), 'pod_status': sorted(set(l.split()[2] for l in pods)), 'condition': [list(x) for x in job_cond('fail-never') if x[0] == 'Failed'][0], 'backoff_limit': 2,
                      'failed': int(jp('job', 'fail-never', '{.status.failed}', NS))}
    K('apply', '-f', '-', input=(PROJECT / 'job-fail-onfailure.yaml').read_text())
    max_restarts, max_pods, t = 0, 0, time.time()
    while time.time() - t < 240 and not any(x[0] == 'Failed' for x in job_cond('fail-onfailure')):
        rc = K('get', 'pods', '-l', 'job-name=fail-onfailure', '-o', 'jsonpath={range .items[*]}{.status.containerStatuses[0].restartCount}{"\\n"}{end}', check=False).out.split()
        max_pods = max(max_pods, len(rc))
        max_restarts = max([max_restarts] + [int(x) for x in rc if x.isdigit()])
        time.sleep(2)
    C['job.onfailure'] = {'max_pods_seen': max_pods, 'max_restarts_seen': max_restarts, 'condition': [list(x) for x in job_cond('fail-onfailure') if x[0] == 'Failed'][0],
                          'pods_left_after_failure': len(K('get', 'pods', '-l', 'job-name=fail-onfailure', '--no-headers', check=False).out.splitlines())}
    # completions and parallelism
    K('apply', '-f', '-', input=(PROJECT / 'job-parallel.yaml').read_text())
    peak, t = 0, time.time()
    while time.time() - t < 120:
        run = len([1 for l in K('get', 'pods', '-l', 'job-name=parallel', '--no-headers').out.splitlines() if l.split()[2] == 'Running'])
        peak = max(peak, run)
        if jp('job', 'parallel', '{.status.succeeded}', NS) == '4':
            break
        time.sleep(0.4)
    C['job.parallel'] = {'completions': 4, 'parallelism': 2, 'peak_running': peak, 'succeeded': int(jp('job', 'parallel', '{.status.succeeded}', NS))}
    X['job.parallel_get'] = std('get', 'job', 'parallel', ns=NS)
    # a deadline
    K('apply', '-f', '-', input=(PROJECT / 'job-deadline.yaml').read_text())
    wait_until(lambda: any(t == 'Failed' for t, _ in job_cond('deadline')), 90, 2, 'the deadline')
    C['job.deadline'] = {'condition': [list(x) for x in job_cond('deadline') if x[0] == 'Failed'][0]}
    # the job cleans up after itself
    K('apply', '-f', '-', input=(PROJECT / 'job-ttl.yaml').read_text())
    wait_until(lambda: jp('job', 'ttl', '{.status.succeeded}', NS) == '1', 60, 1, 'the ttl job')
    t = time.time()
    gone = False
    while time.time() - t < 60:
        if K('get', 'job', 'ttl', check=False).rc != 0:
            gone = True
            break
        time.sleep(1)
    C['job.ttl'] = {'deleted_by_the_cluster': gone, 'ttl_seconds': 5}
    for j in ('fail-never', 'fail-onfailure', 'parallel', 'deadline'):
        K('delete', 'job', j, '--wait=false')
    # a cron job
    K('apply', '-f', '-', input=(PROJECT / 'cronjob-loader.yaml').read_text())
    X['job.cron_get'] = std('get', 'cronjob', ns=NS)
    wait_until(lambda: jp('cronjob', 'nightly', '{.status.lastScheduleTime}', NS), 110, 2, 'the first scheduled run')
    names = K('get', 'jobs', '--no-headers', '-o', 'custom-columns=N:.metadata.name').out.split()
    C['job.cron'] = {'jobs_created': len([n for n in names if n.startswith('nightly-')]), 'job_name_pattern': bool(re.match(r'^nightly-\d+$', names[0])), 'schedule': jp('cronjob', 'nightly', '{.spec.schedule}', NS),
                     'concurrency': jp('cronjob', 'nightly', '{.spec.concurrencyPolicy}', NS)}
    wait_until(lambda: jp('job', names[0], '{.status.succeeded}', NS) == '1', 90, 2, 'the scheduled job')
    X['job.cron_logs'] = K('logs', 'job/' + names[0]).out.strip()
    K('patch', 'cronjob', 'nightly', '-p', '{"spec":{"suspend":true}}')
    C['job.cron']['suspended'] = jp('cronjob', 'nightly', '{.spec.suspend}', NS) == 'true'
    X['job.manual'] = K('create', 'job', 'manual', '--from=cronjob/nightly').out.strip()
    wait_until(lambda: jp('job', 'manual', '{.status.succeeded}', NS) == '1', 90, 2, 'the manual job')
    C['job.cron']['manual_job_succeeded'] = True
    K('delete', 'cronjob', 'nightly', '--wait=true')
    K('delete', 'jobs', '--all', '--wait=false')


# ------------------------------------------------------------------ 8. resources, probes and shutdown
@section
def probes():
    C, T, X = R['counts'], R['tables'], R['text']
    qos = {}
    for q in ('besteffort', 'burstable', 'guaranteed'):
        K('apply', '-f', '-', input=(PROJECT / ('pod-qos-%s.yaml' % q)).read_text())
    for q in qos or ('besteffort', 'burstable', 'guaranteed'):
        wait_until(lambda: jp('pod', 'qos-' + q, '{.status.qosClass}', NS), 30, 1, 'a qos class')
        qos[q] = jp('pod', 'qos-' + q, '{.status.qosClass}', NS)
    C['res.qos'] = qos
    for q in qos:
        K('delete', 'pod', 'qos-' + q, '--wait=false')
    # readiness
    K('apply', '-f', '-', input=(PROJECT / 'pod-ready.yaml').read_text())
    wait_until(lambda: jp('pod', 'ready', '{.status.phase}', NS) == 'Running', 60, 1, 'the ready pod')
    time.sleep(3)
    ep = lambda: K('get', 'endpointslices', '-l', 'kubernetes.io/service-name=ready', '-o', 'jsonpath={.items[0].endpoints[?(@.conditions.ready==true)].addresses[0]}').out.split()
    all_ep = K('get', 'endpointslices', '-l', 'kubernetes.io/service-name=ready', '-o', 'jsonpath={.items[0].endpoints[*].addresses[0]}').out.split()
    before = {'ready_column': K('get', 'pod', 'ready', '--no-headers').out.split()[1], 'phase': jp('pod', 'ready', '{.status.phase}', NS), 'endpoint_addresses': len(ep()), 'listed_but_not_ready': len(all_ep) - len(ep())}
    K('exec', 'ready', '--', 'touch', '/tmp/ready')
    wait_until(lambda: len(ep()) == 1, 30, 0.5, 'the pod in the endpoints')
    after = {'ready_column': K('get', 'pod', 'ready', '--no-headers').out.split()[1], 'phase': jp('pod', 'ready', '{.status.phase}', NS), 'endpoint_addresses': len(ep())}
    C['probe.ready'] = {'before': before, 'after': after}
    K('delete', '-f', '-', '--wait=false', input=(PROJECT / 'pod-ready.yaml').read_text())
    # liveness
    K('apply', '-f', '-', input=(PROJECT / 'pod-live.yaml').read_text())
    wait_until(lambda: int(jp('pod', 'live', '{.status.containerStatuses[0].restartCount}', NS) or 0) >= 1, 90, 2, 'a liveness restart')
    ev = events_of('Pod', 'live')
    C['probe.live'] = {'restarts_at_least_1': True, 'event_reasons': sorted(set(e[1] for e in ev if e[1] in ('Unhealthy', 'Killing'))), 'last_reason': jp('pod', 'live', '{.status.containerStatuses[0].lastState.terminated.reason}', NS),
                       'last_exit_code': int(jp('pod', 'live', '{.status.containerStatuses[0].lastState.terminated.exitCode}', NS))}
    X['probe.live_event'] = next((e[2] for e in ev if e[1] == 'Unhealthy'), '')
    K('delete', 'pod', 'live', '--wait=false')
    # a pod that handles SIGTERM, and one that does not
    rows = []
    import subprocess
    for name in ('worker', 'worker-nohandler'):
        K('apply', '-f', '-', input=(PROJECT / ('pod-%s.yaml' % name)).read_text())
        wait_until(lambda: 'worker started' in K('logs', name, check=False).out, 60, 1, 'the worker to start')
        lg = subprocess.Popen(['docker', 'exec', NAME, 'kubectl', '-n', NS, 'logs', '-f', name], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        time.sleep(1)
        t = time.time()
        K('delete', 'pod', name, '--wait=true')
        took = time.time() - t
        try:
            out, _ = lg.communicate(timeout=10)
        except Exception:      # noqa: BLE001
            lg.kill()
            out = ''
        rows.append([name, 'yes' if took >= 4 else 'no', 'yes' if 'got SIGTERM' in out else 'no', 5])
    T['probe.shutdown'] = table(['pod', 'delete waited for the grace period (5 s)', 'the handler ran', 'terminationGracePeriodSeconds'], rows)


# ------------------------------------------------------------------ 9. access and packaging
@section
def access():
    C, T, X = R['counts'], R['tables'], R['text']
    X['rbac.apply'] = K('apply', '-f', '-', input=(PROJECT / 'rbac.yaml').read_text()).out.strip()
    who = 'system:serviceaccount:%s:reader' % NS
    can = lambda verb, res, ns=NS, sa=who: kc('auth', 'can-i', verb, res, '-n', ns, '--as', sa, check=False).out.strip()
    rows = [['list pods in brewline', can('list', 'pods')], ['get the log of a pod in brewline', can('get', 'pods/log')], ['delete pods in brewline', can('delete', 'pods')], ['list secrets in brewline', can('list', 'secrets')],
            ['list pods in default', can('list', 'pods', 'default')], ['create deployments in brewline', can('create', 'deployments')]]
    T['rbac.reader'] = table(['can the service account reader ...', 'answer'], rows)
    C['rbac.default_sa'] = {'list_pods': can('list', 'pods', NS, 'system:serviceaccount:%s:default' % NS)}
    denied = kc('get', 'pods', '-n', NS, '--as', who, check=False)
    C['rbac.get_pods_as_reader'] = {'rc': denied.rc}
    dn = kc('delete', 'pod', 'nothing', '-n', NS, '--as', who, check=False)
    X['rbac.forbidden'] = mask((dn.all.strip().splitlines() or [''])[-1])
    X['rbac.list'] = '\n'.join(re.split(r'\s{2,}', l.strip())[0] + ' ' + (re.split(r'\s{2,}', l.strip())[-1] if len(re.split(r'\s{2,}', l.strip())) > 2 else '') for l in kc('auth', 'can-i', '--list', '-n', NS, '--as', who, check=False).out.splitlines()[:6])
    # kustomize
    d = pathlib.Path(tempfile.mkdtemp(prefix='k8s-kz-'))
    shutil.copytree(PROJECT / 'kustomize', d / 'kustomize')
    dk('cp', str(d / 'kustomize'), NAME + ':/tmp/kustomize')
    X['kz.out'] = kc('kustomize', '/tmp/kustomize/overlays/prod').out.strip()
    C['kz.facts'] = {'name_prefixed': 'name: prod-loader-api' in X['kz.out'], 'replicas_3': 'replicas: 3' in X['kz.out'], 'image_tag_2': 'brewline/loader:2' in X['kz.out'], 'namespace_set': 'namespace: brewline-prod' in X['kz.out']}
    shutil.rmtree(d, ignore_errors=True)
    # strict validation of a manifest
    bad = kc('apply', '--dry-run=server', '--validate=strict', '-f', '-', input='apiVersion: v1\nkind: Pod\nmetadata:\n  name: typo\nspec:\n  containers:\n    - name: a\n      image: alpine\n      imagee: x\n', check=False, timeout=60)
    X['val.strict'] = (bad.all.strip().splitlines() or [''])[-1]
    C['val.strict'] = {'rc': bad.rc}
    okd = kc('apply', '--dry-run=server', '-f', '-', input=(PROJECT / 'pod-hello.yaml').read_text(), check=False, timeout=60)
    X['val.dry_run'] = okd.out.strip()
    K('delete', '-f', '-', '--ignore-not-found', input=(PROJECT / 'rbac.yaml').read_text(), check=False)



def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--out', default=str(ROOT / 'js' / 'real.js'))
    ap.add_argument('--only', default='')
    ap.add_argument('--reuse', action='store_true', help='use the cluster that is already running')
    a = ap.parse_args()
    only = set(filter(None, a.only.split(',')))
    running = dk('ps', '-q', '--filter', 'name=^%s$' % NAME, check=False).out.strip()
    try:
        if not (a.reuse and running):
            t = time.time()
            start_cluster()
            print('cluster       %5.1fs' % (time.time() - t), flush=True)
        # the images that the manifests use
        if not (a.reuse and running):
            t = time.time()
            for ref in ('alpine:3.22', 'python:3.13-slim', 'postgres:16-alpine'):
                if dk('image', 'inspect', ref, check=False).rc != 0:
                    dk('pull', '-q', ref)
                import_image(ref)
            build_args = []
            if os.environ.get('DK_BUILD_NETWORK'):
                build_args += ['--network', os.environ['DK_BUILD_NETWORK']]
            if os.environ.get('DK_BUILD_PROXY') and os.environ.get('HTTPS_PROXY'):
                build_args += ['--build-arg', 'HTTPS_PROXY=' + os.environ['HTTPS_PROXY'], '--build-arg', 'HTTP_PROXY=' + os.environ['HTTPS_PROXY']]
            dk('build', '-q', *build_args, '-t', 'brewline/loader:1', str(PROJECT / 'app'))
            import_image('brewline/loader:1')
            print('images        %5.1fs' % (time.time() - t), flush=True)
        for fn in SECTIONS:
            if only and fn.__name__ not in only:
                continue
            t = time.time()
            fn()
            print('%-13s %5.1fs' % (fn.__name__, time.time() - t), flush=True)
    finally:
        if not a.reuse:
            clean_cluster()      # --reuse leaves the cluster running, for work on the recorder
    p = write_real(a.out)
    print('wrote %s: %d files, %d texts, %d tables, %d sets of counts' % (p, len(R['files']), len(R['text']), len(R['tables']), len(R['counts'])))


if __name__ == '__main__':
    main()
