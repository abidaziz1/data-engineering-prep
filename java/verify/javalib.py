"""Helpers of the recorder for the Java course: run the real JDK and Maven in a temporary folder, clean what they print of the volatile parts, and write js/real.js.
Everything the recorder makes lives in one temporary folder that is removed at the end. No setting of the machine is read or changed (Maven uses its local repository, ~/.m2,
as it always does, and downloads what it is missing from Maven Central)."""
import json
import os
import pathlib
import re
import shutil
import subprocess
import tempfile

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent
PROJECT = HERE / 'project'
R = {'meta': {}, 'files': {}, 'text': {}, 'tables': {}, 'counts': {}}
WORK = pathlib.Path(tempfile.mkdtemp(prefix='java-capture-'))
M2 = str(pathlib.Path.home() / '.m2')


def mask(s):
    s = '\n'.join(l for l in str(s).split('\n') if not l.startswith('Picked up JAVA_TOOL_OPTIONS'))
    s = s.replace(str(WORK), '~').replace(M2, '~/.m2')
    s = re.sub(r'/tmp/java-capture-\w+', '~', s)
    return '\n'.join(l.rstrip() for l in s.split('\n'))


def T(key, s):
    R['text'][key] = mask(s).strip('\n')
    return R['text'][key]


def table(cols, rows):
    return {'cols': cols, 'rows': rows}


def run(cmd, cwd=None, timeout=300, env=None, check=False):
    """The exit code and the output (standard output and error together, in order) of a command, with the volatile parts removed."""
    e = dict(os.environ)
    if env:
        e.update(env)
    p = subprocess.run([str(c) for c in cmd], cwd=str(cwd or WORK), capture_output=True, text=True, timeout=timeout, env=e)
    out = mask(p.stdout.rstrip('\n') + (('\n' if p.stdout.strip() and p.stderr.strip() else '') + p.stderr.rstrip('\n') if p.stderr.strip() else ''))
    if check and p.returncode:
        raise RuntimeError('%s failed (%d): %s' % (' '.join(map(str, cmd)), p.returncode, out[-800:]))
    return p.returncode, out.strip('\n')


def mvn(args, cwd, timeout=600):
    return run(['mvn', '-B', '-ntp'] + list(args), cwd=cwd, timeout=timeout)


def tree_of(out):
    """The dependency tree of a `mvn dependency:tree` output: the lines after the plugin line, without the [INFO] prefix."""
    lines, on = [], False
    for l in out.split('\n'):
        if re.match(r'\[INFO\] --- .*dependency.*tree', l):
            on = True
            continue
        if on and (l.startswith('[INFO] ---') or l.startswith('[INFO] BUILD')):
            break
        if on and l.startswith('[INFO] '):
            lines.append(l[len('[INFO] '):])
    return lines


def grep(out, pattern):
    return '\n'.join(l for l in out.split('\n') if re.search(pattern, l))


def write_real(path):
    path = pathlib.Path(path)
    path.write_text('window.LAB = window.LAB || {};\nLAB.real = ' + json.dumps(R, indent=1, sort_keys=True, ensure_ascii=False, default=str) + ';\n')
    return path


def cleanup():
    shutil.rmtree(WORK, ignore_errors=True)
