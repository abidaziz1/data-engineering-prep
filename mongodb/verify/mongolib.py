"""Helpers of the recorder for the MongoDB course: start a real mongod 8.0 in a Docker container on the host network (a one-member replica set, because change streams and transactions need one),
run the programs of verify/project against it, clean what they print, and write js/real.js. Everything the recorder starts carries the label mg-course and a name that starts with mgc-,
so a clean-up never touches anything else. No setting of the machine is read or changed."""
import json
import os
import pathlib
import re
import subprocess
import sys
import time

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent
PROJECT = HERE / 'project'
IMAGE = os.environ.get('MONGO_IMAGE', 'mongo:8.0')
PORT = int(os.environ.get('MONGO_PORT', '27117'))
NAME = 'mgc-mongo-%d' % PORT
R = {'meta': {}, 'files': {}, 'text': {}, 'tables': {}, 'counts': {}}
PY = sys.executable


def sh(cmd, **kw):
    return subprocess.run([str(c) for c in cmd], capture_output=True, text=True, **kw)


def start_server():
    """Returns the URI of a running replica set. MONGO_URI points the recorder at a server that is already running."""
    if os.environ.get('MONGO_URI'):
        return os.environ['MONGO_URI']
    sh(['docker', 'rm', '-f', NAME])
    r = sh(['docker', 'run', '-d', '--network', 'host', '--name', NAME, '--label', 'mg-course', IMAGE, '--replSet', 'rs0', '--bind_ip', '127.0.0.1', '--port', str(PORT)])
    if r.returncode:
        raise SystemExit('could not start mongod: ' + r.stderr[-300:])
    from pymongo import MongoClient
    uri = 'mongodb://127.0.0.1:%d/?directConnection=true' % PORT
    c = MongoClient(uri, serverSelectionTimeoutMS=2000)
    for _ in range(60):
        try:
            c.admin.command('replSetInitiate', {'_id': 'rs0', 'members': [{'_id': 0, 'host': '127.0.0.1:%d' % PORT}]})
            break
        except Exception as e:      # noqa: BLE001
            if 'already initialized' in str(e):
                break
            time.sleep(1)
    for _ in range(60):
        try:
            if c.admin.command('hello').get('isWritablePrimary'):
                return uri
        except Exception:           # noqa: BLE001
            pass
        time.sleep(1)
    raise SystemExit('mongod did not become primary')


def stop_server():
    if not os.environ.get('MONGO_URI'):
        sh(['docker', 'rm', '-f', NAME])


def program(name, uri, db='brewline', timeout=600):
    """Run one program of verify/project against the server. Returns (exit code, output)."""
    r = sh([PY, '-X', 'utf8', name], cwd=PROJECT, env=dict(os.environ, MONGO_URI=uri, MONGO_DB=db, PYTHONPATH=str(PROJECT), PYTHONDONTWRITEBYTECODE='1'), timeout=timeout)
    out = r.stdout.rstrip('\n') + (('\n' if r.stdout.strip() and r.stderr.strip() else '') + r.stderr.rstrip('\n') if r.stderr.strip() else '')
    return r.returncode, mask(out)


def mask(s):
    s = re.sub(r'datetime\.datetime\(([^)]*)\)', lambda m: 'datetime(%s)' % m.group(1), s)
    return '\n'.join(l.rstrip() for l in s.split('\n'))


def T(key, s):
    R['text'][key] = mask(s).strip('\n')
    return R['text'][key]


def write_real(path):
    path = pathlib.Path(path)
    path.write_text('window.LAB = window.LAB || {};\nLAB.real = ' + json.dumps(R, indent=1, sort_keys=True, ensure_ascii=False, default=str) + ';\n')
    return path
