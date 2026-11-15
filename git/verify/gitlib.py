"""Helpers for the recorder: run git in throwaway repositories with a fixed author and fixed dates, so that the commit ids repeat, and write js/real.js.
Everything the recorder makes lives in one temporary folder that is removed at the end. No setting of the machine is read or changed."""
import json
import os
import pathlib
import re
import shutil
import subprocess
import tempfile

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent
R = {'meta': {}, 'files': {}, 'text': {}, 'tables': {}, 'counts': {}}

WHO = {'maya': ('Maya Brewer', 'maya@brewline.example'), 'omar': ('Omar Diaz', 'omar@brewline.example'), 'priya': ('Priya Nair', 'priya@brewline.example')}
BASE = tempfile.mkdtemp(prefix='git-course-')
HOME = pathlib.Path(BASE) / 'home'
HOME.mkdir()
(HOME / 'gitconfig').write_text('[init]\n\tdefaultBranch = main\n[user]\n\tname = Maya Brewer\n\temail = maya@brewline.example\n')
_clock = [0]


def env(who='maya', at=None):
    name, mail = WHO[who]
    if at is None:
        _clock[0] += 1
        at = _clock[0]
    # 2026-03-02 09:00 UTC plus 37 minutes for each step, so that two commits never share a second
    t = 1772442000 + at * 2220
    d = '%d +0000' % t
    e = {'PATH': os.environ['PATH'], 'HOME': str(HOME), 'GIT_CONFIG_GLOBAL': str(HOME / 'gitconfig'), 'GIT_CONFIG_NOSYSTEM': '1', 'LC_ALL': 'C', 'TZ': 'UTC',
         'GIT_PAGER': 'cat', 'GIT_TERMINAL_PROMPT': '0', 'GIT_EDITOR': 'true', 'GIT_MERGE_AUTOEDIT': 'no',
         'GIT_AUTHOR_NAME': name, 'GIT_AUTHOR_EMAIL': mail, 'GIT_AUTHOR_DATE': d, 'GIT_COMMITTER_NAME': name, 'GIT_COMMITTER_EMAIL': mail, 'GIT_COMMITTER_DATE': d}
    return e


class Out:
    def __init__(self, p):
        self.rc, self.out, self.err = p.returncode, p.stdout, p.stderr

    @property
    def all(self):
        return (self.out or '') + (self.err or '')


def git(repo, *a, who='maya', check=True, input=None, at=None):
    p = subprocess.run(['git'] + [str(x) for x in a], cwd=str(repo), capture_output=True, text=True, env=env(who, at), input=input)
    o = Out(p)
    if check and o.rc:
        raise RuntimeError('git %s failed (%d): %s' % (' '.join(map(str, a)), o.rc, o.all[-800:]))
    return o


def sh(repo, script, who='maya', check=True):
    p = subprocess.run(['sh', '-c', script], cwd=str(repo), capture_output=True, text=True, env=env(who))
    o = Out(p)
    if check and o.rc:
        raise RuntimeError('%s failed (%d): %s' % (script, o.rc, o.all[-800:]))
    return o


def mkrepo(name, bare=False):
    p = pathlib.Path(BASE) / name
    p.mkdir(parents=True, exist_ok=True)
    git(p, 'init', '-q', *(['--bare'] if bare else []))
    return p


def write(repo, rel, text):
    f = pathlib.Path(repo) / rel
    f.parent.mkdir(parents=True, exist_ok=True)
    f.write_text(text)


def commit(repo, msg, files=None, who='maya', at=None, all_=False):
    """Write files {path: text}, stage everything that changed and commit. Returns the abbreviated id."""
    for k, v in (files or {}).items():
        write(repo, k, v)
    git(repo, 'add', '-A')
    git(repo, 'commit', '-q', '-m', msg, who=who, at=at)
    return git(repo, 'rev-parse', '--short', 'HEAD').out.strip()


def mask(s):
    s = s.replace(BASE, '~')
    s = re.sub(r'/tmp/git-course-[a-z0-9_]+', '~', s)
    # git draws progress with carriage returns. A terminal shows only what is left after the last one.
    return '\n'.join(l.split('\r')[-1].rstrip() for l in s.split('\n'))


def T(key, s):
    s = mask(s.replace('\x1b[K', ''))
    if 'Rebasing (' in s:
        # the progress of a rebase is overwritten on a terminal, so only the lines that stay are kept
        s = '\n'.join(l for l in s.split('\n') if l.strip() and not l.startswith('Rebasing ('))
    R['text'][key] = s.rstrip('\n')
    return R['text'][key]


def table(cols, rows):
    return {'cols': cols, 'rows': rows}


def write_real(path):
    path = pathlib.Path(path)
    path.write_text('window.LAB = window.LAB || {};\nLAB.real = ' + json.dumps(R, indent=1, sort_keys=True, ensure_ascii=False) + ';\n')
    return path


def cleanup():
    shutil.rmtree(BASE, ignore_errors=True)
