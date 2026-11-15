"""Helpers for the recorder: a k3s cluster in a container, kubectl through docker exec, polling, and js/real.js.
Everything the recorder starts carries the name dkc-k3s or the namespace brewline, and the cluster is removed at the end."""
import json
import os
import pathlib
import re
import subprocess
import time

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent
PROJECT = HERE / 'project'
K3S_IMAGE = 'rancher/k3s:v1.37.2-k3s1'
NAME = 'dkc-k3s'
VOL = 'dkc-k3s-data'
CTR = ['ctr', '-a', '/run/k3s/containerd/containerd.sock', '-n', 'k8s.io']
SANDBOX = bool(os.environ.get('K8S_SANDBOX'))        # the sandbox that built the course: cgroup v1, no negative oom_score_adj, a small disk allowance, PyPI and Docker Hub only through a proxy

R = {'meta': {}, 'files': {}, 'text': {}, 'tables': {}, 'counts': {}}


class Out:
    def __init__(self, p, secs):
        self.rc, self.out, self.err, self.secs = p.returncode, p.stdout, p.stderr, secs

    @property
    def all(self):
        return (self.out or '') + (self.err or '')


def sh(args, check=True, timeout=600, input=None, env=None, cwd=None):
    t = time.time()
    for attempt in range(80):
        p = subprocess.run(args, capture_output=True, text=True, timeout=timeout, input=input, env=env, cwd=cwd)
        o = Out(p, time.time() - t)
        if o.rc and args and args[0] == 'docker' and re.search(r'429 Too Many Requests|toomanyrequests', o.all, re.I):
            print('Docker Hub answered 429 Too Many Requests; waiting 60 seconds (attempt %d)' % (attempt + 1), flush=True)
            time.sleep(60)
            continue
        break
    if check and o.rc:
        raise RuntimeError('command failed (%d): %s\n%s' % (o.rc, ' '.join(map(str, args)), o.all[-1500:]))
    return o


def dk(*a, **kw):
    return sh(['docker'] + [str(x) for x in a], **kw)


def kc(*a, check=True, input=None, timeout=300):
    """kubectl inside the k3s container, against the cluster in it."""
    args = ['docker', 'exec'] + (['-i'] if input is not None else []) + [NAME, 'kubectl'] + [str(x) for x in a]
    return sh(args, check=check, input=input, timeout=timeout)


def apply(name, check=True):
    return kc('apply', '-f', '-', input=(PROJECT / name).read_text(), check=check)


def delete(name, *extra):
    return kc('delete', '-f', '-', '--ignore-not-found', '--wait=true', *extra, input=(PROJECT / name).read_text(), check=False)


def wait_until(fn, timeout=120, every=0.5, what='a condition'):
    t = time.time()
    while time.time() - t < timeout:
        try:
            v = fn()
            if v:
                return v
        except Exception:      # noqa: BLE001
            pass
        time.sleep(every)
    raise RuntimeError('timed out after %ds waiting for %s' % (timeout, what))


def jp(kind, name, path, ns=None, check=False):
    a = ['get', kind, name, '-o', 'jsonpath=' + path] + (['-n', ns] if ns else [])
    return kc(*a, check=check).out.strip()


def clean_cluster():
    dk('rm', '-f', '-v', NAME, check=False)
    dk('volume', 'rm', '-f', VOL, check=False)


def node_ip():
    """The address of this machine. With the host network it is the address of the node, and the API server must not send its own traffic through the proxy."""
    o = dk('run', '--rm', '--network', 'host', 'alpine:3.22', 'sh', '-c', "ip -4 route get 1.1.1.1 | sed -n 's/.*src \\([0-9.]*\\).*/\\1/p'", check=False).out.strip()
    return o or '127.0.0.1'


def start_cluster():
    clean_cluster()
    dk('volume', 'create', VOL)
    if SANDBOX:
        dk('run', '--rm', '-v', VOL + ':/data', 'alpine:3.22', 'sh', '-c',
           "mkdir -p /data/agent/etc/kubelet.conf.d /data/agent/etc/containerd/config-v3.toml.d && "
           "printf 'apiVersion: kubelet.config.k8s.io/v1beta1\\nkind: KubeletConfiguration\\nfailCgroupV1: false\\nevictionHard:\\n  nodefs.available: 1Gi\\n  imagefs.available: 1Gi\\n' > /data/agent/etc/kubelet.conf.d/99-sandbox.conf && "
           "printf \"[plugins.'io.containerd.cri.v1.runtime']\\n  restrict_oom_score_adj = true\\n\" > /data/agent/etc/containerd/config-v3.toml.d/10-restrict-oom.toml")
    args = ['run', '-d', '--name', NAME, '--privileged', '--network', 'host', '-v', VOL + ':/var/lib/rancher/k3s', '--tmpfs', '/run', '--tmpfs', '/var/run']
    if SANDBOX and os.environ.get('HTTPS_PROXY'):
        px = os.environ['HTTPS_PROXY']
        args += ['-e', 'HTTPS_PROXY=' + px, '-e', 'HTTP_PROXY=' + px, '-e', 'NO_PROXY=127.0.0.1,localhost,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16,.svc,.cluster.local,' + node_ip(),
                 '-v', '/etc/ssl/certs/ca-certificates.crt:/etc/ssl/certs/ca-certificates.crt:ro']
    args += [K3S_IMAGE, 'server', '--disable', 'traefik', '--disable', 'servicelb', '--disable', 'metrics-server', '--write-kubeconfig-mode', '644']
    dk(*args)
    wait_until(lambda: 'True' in kc('get', 'node', '-o', 'jsonpath={.items[0].status.conditions[?(@.type=="Ready")].status}', check=False).out, 240, 3, 'the node to be Ready')
    wait_until(lambda: all(x.endswith('Running') for x in kc('get', 'pods', '-n', 'kube-system', '--no-headers', '-o', 'custom-columns=N:.metadata.name,S:.status.phase', check=False).out.split('\n') if x and 'helm-install' not in x) and
               'coredns' in kc('get', 'pods', '-n', 'kube-system', '--no-headers', check=False).out, 240, 3, 'the system pods')
    wait_until(lambda: kc('get', 'sa', 'default', check=False).rc == 0, 60, 1, 'the default service account')


def import_image(ref):
    """Copy an image from the Docker Engine into the containerd of the cluster, so that the cluster pulls nothing."""
    p1 = subprocess.Popen(['docker', 'save', ref], stdout=subprocess.PIPE)
    p2 = subprocess.run(['docker', 'exec', '-i', NAME] + CTR + ['images', 'import', '-'], stdin=p1.stdout, capture_output=True, text=True)
    p1.wait()
    if p2.returncode:
        raise RuntimeError('image import failed: ' + p2.stderr[-500:])


def put_file(key, path):
    R['files'][key] = pathlib.Path(path).read_text()


def write_real(path):
    path = pathlib.Path(path)
    path.write_text('window.LAB = window.LAB || {};\nLAB.real = ' + json.dumps(R, indent=1, sort_keys=True, ensure_ascii=False) + ';\n')
    return path


def table(cols, rows):
    return {'cols': cols, 'rows': rows}


AGE = re.compile(r'\b\d+(?:\.\d+)?(?:ms|s|m|h|d)(?:\d+(?:s|m|h|d))*\b')
HASH = re.compile(r'\b([a-z0-9][a-z0-9-]*?)-([a-z0-9]{9,10})-([a-z0-9]{5})\b')


def mask_ages(s):
    """Ages such as 12s or 3m20s change with every run."""
    return AGE.sub('<age>', s)
