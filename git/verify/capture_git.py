#!/usr/bin/env python3
"""Records what real git prints and does, for the Git course. Everything happens in one temporary folder that is removed at the end.
The author, the committer and every date are fixed, so the commit ids repeat from run to run.
Usage: python3 git/verify/capture_git.py [--out path] [--only a,b]"""
import argparse
import os
import pathlib
import random
import re
import shutil
import subprocess
import sys
import time

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from gitlib import R, BASE, git, sh, mkrepo, write, commit, T, table, write_real, cleanup, mask, env, HOME, HERE, ROOT   # noqa: E402

PROJECT = HERE / 'project'
SECTIONS = []


def section(fn):
    SECTIONS.append(fn)
    return fn


def pf(rel):
    return (PROJECT / rel).read_text()


def short(repo, rev='HEAD'):
    return git(repo, 'rev-parse', '--short', rev).out.strip()


def put_project(repo, files=('README.md', 'loader/load_orders.py', 'loader/tax_rate.txt', 'models/orders_daily.sql')):
    for f in files:
        write(repo, f, pf(f))


def bump(n):
    """A deterministic text for the n-th change of a note file."""
    return 'note %d\n' % n


def meta():
    M = R['meta']
    M['git'] = git(BASE, '--version').out.strip().replace('git version ', '')
    M['git_lfs'] = subprocess.run(['git', 'lfs', 'version'], capture_output=True, text=True, env=env()).stdout.split()[0].replace('git-lfs/', '')
    M['os'] = 'Linux x86_64'
    M['recorded_on'] = time.strftime('%Y-%m-%d')
    for rel in ('README.md', '.gitignore', 'loader/load_orders.py', 'loader/tax_rate.txt', 'models/orders_daily.sql', 'dags/nightly.py', 'checks/check.sh', 'hooks/pre-commit', '.gitattributes'):
        R['files'][rel] = pf(rel)


# ------------------------------------------------------------------ 1. objects and the three areas
@section
def objects():
    C, X = R['counts'], R['text']
    r = mkrepo('brewline')
    put_project(r)
    T('obj.status_untracked', git(r, 'status', '--short').out)
    git(r, 'add', 'README.md', 'loader', 'models')
    T('obj.status_staged', git(r, 'status', '--short').out)
    o = git(r, 'commit', '-m', 'Add the loader and the daily model', at=1)
    T('obj.commit_out', o.out)
    first = short(r)
    T('obj.log', git(r, 'log', '--oneline').out)
    T('obj.cat_commit', git(r, 'cat-file', '-p', 'HEAD').out)
    tree = git(r, 'rev-parse', 'HEAD^{tree}').out.strip()
    T('obj.cat_tree', git(r, 'cat-file', '-p', tree).out)
    blob = git(r, 'rev-parse', 'HEAD:models/orders_daily.sql').out.strip()
    T('obj.cat_blob', git(r, 'cat-file', '-p', blob).out)
    C['obj.types'] = {'commit': git(r, 'cat-file', '-t', 'HEAD').out.strip(), 'tree': git(r, 'cat-file', '-t', tree).out.strip(), 'blob': git(r, 'cat-file', '-t', blob).out.strip(),
                      'id_length': len(blob), 'commit_id': git(r, 'rev-parse', 'HEAD').out.strip()[:7], 'tree_id': tree[:7], 'blob_id': blob[:7]}
    T('obj.ls_files', git(r, 'ls-files', '-s').out)
    ho = git(r, 'hash-object', 'models/orders_daily.sql').out.strip()
    C['obj.same_blob'] = {'hash_object': ho[:7], 'in_the_tree': blob[:7], 'equal': ho == blob}
    # the same text twice is stored once
    def nobj(kind):
        return len([l for l in git(r, 'cat-file', '--batch-all-objects', '--batch-check').out.splitlines() if l.split()[1] == kind])
    before = nobj('blob')
    write(r, 'models/orders_daily_copy.sql', pf('models/orders_daily.sql'))
    git(r, 'add', 'models/orders_daily_copy.sql')
    C['obj.dedupe'] = {'blobs_before': before, 'blobs_after_adding_a_copy': nobj('blob'), 'files_in_the_tree': len(git(r, 'ls-files').out.split()), 'same_id': git(r, 'rev-parse', ':models/orders_daily_copy.sql').out == git(r, 'rev-parse', ':models/orders_daily.sql').out}
    git(r, 'rm', '-q', '-f', 'models/orders_daily_copy.sql')
    # a change to one byte gives a different id
    f = r / 'loader' / 'tax_rate.txt'
    f.write_text('0.09\n')
    C['obj.one_byte'] = {'before': blob[:7], 'old_rate_blob': git(r, 'rev-parse', 'HEAD:loader/tax_rate.txt').out.strip()[:7], 'new_rate_blob': git(r, 'hash-object', 'loader/tax_rate.txt').out.strip()[:7]}
    f.write_text(pf('loader/tax_rate.txt'))

    # the three areas: where a file is, after each step
    rows = []
    path = 'models/orders_daily.sql'

    def state(step, cmd):
        wt = git(r, 'hash-object', path).out.strip()[:7]
        ix = git(r, 'rev-parse', ':' + path).out.strip()[:7]
        hd = git(r, 'rev-parse', 'HEAD:' + path).out.strip()[:7]
        st = git(r, 'status', '--short', path).out.rstrip('\n') or '(clean)'
        rows.append([step, cmd, wt, ix, hd, st])
    state('the file as committed', '')
    write(r, path, pf(path).replace('sum(amount) as revenue', 'sum(amount) as revenue,\n    avg(amount) as avg_amount'))
    state('edit the file', '(an editor)')
    git(r, 'add', path)
    state('stage it', 'git add')
    write(r, path, pf(path).replace('sum(amount) as revenue', 'sum(amount) as revenue,\n    avg(amount) as avg_amount,\n    max(amount) as max_amount'))
    state('edit it again', '(an editor)')
    git(r, 'add', path)
    state('stage it again', 'git add')
    git(r, 'commit', '-q', '-m', 'Add average and maximum amounts')
    state('commit', 'git commit')
    R['tables']['areas.steps'] = table(['step', 'command', 'working tree', 'index', 'last commit', 'git status --short'], rows)
    # diff and diff --staged
    write(r, path, pf(path).replace('sum(amount) as revenue', 'sum(amount) as revenue,\n    avg(amount) as avg_amount,\n    max(amount) as max_amount').replace('from raw_orders', 'from raw_orders -- the source'))
    write(r, 'README.md', pf('README.md') + 'Run the check before you push.\n')
    git(r, 'add', 'README.md')
    T('obj.diff', git(r, 'diff').out)
    T('obj.diff_staged', git(r, 'diff', '--staged').out)
    T('obj.status_long', git(r, 'status').out)
    git(r, 'restore', '--staged', 'README.md')
    git(r, 'restore', 'README.md', path)

    # .gitignore
    write(r, '.gitignore', pf('.gitignore'))
    write(r, 'data/orders.csv', 'order_id,store_id,amount\n1,s01,4.50\n')
    write(r, 'run.log', 'started\n')
    T('ign.status', git(r, 'status', '--short').out)
    T('ign.status_ignored', git(r, 'status', '--short', '--ignored').out)
    T('ign.check', git(r, 'check-ignore', '-v', 'data/orders.csv').out)
    git(r, 'add', '.gitignore')
    commit(r, 'Ignore rebuilt data and logs')
    # a file that was committed before it was ignored stays tracked
    write(r, 'old.log', 'a log that was committed by mistake\n')
    git(r, 'add', '-f', 'old.log')
    git(r, 'commit', '-q', '-m', 'Commit a log by mistake')
    write(r, 'old.log', 'a log that was committed by mistake\nmore\n')
    C['ign.tracked'] = {'check_ignore_rc': git(r, 'check-ignore', 'old.log', check=False).rc, 'check_ignore_no_index_rc': git(r, 'check-ignore', '--no-index', 'old.log', check=False).rc,
                        'still_shows_as_modified': 'old.log' in git(r, 'status', '--short').out, 'status': git(r, 'status', '--short', 'old.log').out.strip()}
    git(r, 'rm', '-q', '--cached', 'old.log')
    C['ign.tracked']['status_after_rm_cached'] = git(r, 'status', '--short', 'old.log').out.strip() or '(clean)'
    git(r, 'commit', '-q', '-m', 'Stop tracking the log')
    C['ign.tracked']['status_after_commit'] = git(r, 'status', '--short', 'old.log').out.strip() or '(clean)'


# ------------------------------------------------------------------ 2. branches, merge and rebase
def scenario(name):
    """main: A B C. feature starts at B and gets F1 and F2. After that main gets M1."""
    r = mkrepo(name)
    put_project(r)
    ids = {}
    ids['A'] = commit(r, 'Add the loader and the daily model', at=1)
    write(r, 'dags/nightly.py', pf('dags/nightly.py'))
    ids['B'] = commit(r, 'Add the nightly DAG', at=2)
    git(r, 'switch', '-q', '-c', 'feature')
    write(r, 'checks/check.sh', pf('checks/check.sh'))
    git(r, 'update-index', '--chmod=+x', 'checks/check.sh') if False else None
    ids['F1'] = commit(r, 'Add the nightly check', at=3, who='omar')
    write(r, 'README.md', pf('README.md') + 'Run checks/check.sh before you push.\n')
    ids['F2'] = commit(r, 'Document the check', at=4, who='omar')
    git(r, 'switch', '-q', 'main')
    return r, ids


@section
def branches():
    C, X, T_ = R['counts'], R['text'], R['tables']
    r, ids = scenario('flow')
    # a branch is a small file with a commit id in it
    ref = r / '.git' / 'refs' / 'heads' / 'feature'
    C['br.ref'] = {'file_bytes': len(ref.read_bytes()), 'content_is_the_commit_id': ref.read_text().strip() == git(r, 'rev-parse', 'feature').out.strip(), 'id_chars': len(ref.read_text().strip())}
    T('br.ref_file', ref.read_text())
    T('br.head', (r / '.git' / 'HEAD').read_text())
    T('br.graph_before', git(r, 'log', '--oneline', '--graph', '--all', '--decorate').out)
    T('br.branch_list', git(r, 'branch', '-vv').out)
    # fast-forward: main did not move
    ff = shutil.copytree(r, pathlib.Path(BASE) / 'flow_ff')
    T('ff.merge', git(ff, 'merge', 'feature').out)
    T('ff.graph', git(ff, 'log', '--oneline', '--graph', '--decorate').out)
    C['ff'] = {'parents_of_head': len(git(ff, 'rev-list', '--parents', '-n1', 'HEAD').out.split()) - 1, 'head_is_feature': git(ff, 'rev-parse', 'HEAD').out == git(ff, 'rev-parse', 'feature').out}
    # main moves on: M1
    write(r, 'models/orders_daily.sql', pf('models/orders_daily.sql').replace('count(*) as orders', 'count(*) as order_count'))
    ids['M1'] = commit(r, 'Rename orders to order_count', at=5, who='maya')
    shutil.copytree(r, pathlib.Path(BASE) / 'flow_merge')
    shutil.copytree(r, pathlib.Path(BASE) / 'flow_rebase')
    shutil.copytree(r, pathlib.Path(BASE) / 'flow_squash')
    m = pathlib.Path(BASE) / 'flow_merge'
    o = git(m, 'merge', '--no-edit', 'feature', at=6)
    T('mg.merge', o.out)
    ids['M'] = short(m)
    T('mg.graph', git(m, 'log', '--oneline', '--graph', '--decorate').out)
    T('mg.cat_head', git(m, 'cat-file', '-p', 'HEAD').out)
    C['mg'] = {'parents': len(git(m, 'rev-list', '--parents', '-n1', 'HEAD').out.split()) - 1, 'commits': len(git(m, 'rev-list', 'HEAD').out.split()), 'feature_ids_unchanged': git(m, 'rev-parse', '--short', 'feature').out.strip() == ids['F2']}
    # rebase
    rb = pathlib.Path(BASE) / 'flow_rebase'
    git(rb, 'switch', '-q', 'feature')
    o = git(rb, 'rebase', 'main', at=7)
    T('rb.rebase', o.all)
    new_ids = git(rb, 'log', '--format=%h', '-2').out.split()
    ids['F1r'], ids['F2r'] = new_ids[1], new_ids[0]
    T('rb.graph', git(rb, 'log', '--oneline', '--graph', '--decorate', '--all').out)
    git(rb, 'switch', '-q', 'main')
    T('rb.ff_merge', git(rb, 'merge', 'feature').out)
    C['rb'] = {'commits': len(git(rb, 'rev-list', 'HEAD').out.split()), 'merge_commits': len(git(rb, 'rev-list', '--merges', 'HEAD').out.split()), 'ids_changed': ids['F1'] != ids['F1r'] and ids['F2'] != ids['F2r']}
    # the rebase keeps author and author date, and changes the committer date
    C['rb']['author_date_kept'] = git(rb, 'log', '-1', '--format=%ad', '--date=iso-strict', 'HEAD').out.strip() == git(pathlib.Path(BASE) / 'flow', 'log', '-1', '--format=%ad', '--date=iso-strict', 'feature').out.strip()
    # squash
    sq = pathlib.Path(BASE) / 'flow_squash'
    o = git(sq, 'merge', '--squash', 'feature')
    T('sq.merge', o.all)
    git(sq, 'commit', '-q', '-m', 'Add and document the nightly check', who='omar', at=8)
    T('sq.graph', git(sq, 'log', '--oneline', '--graph', '--decorate').out)
    C['sq'] = {'commits': len(git(sq, 'rev-list', 'HEAD').out.split()), 'merge_commits': len(git(sq, 'rev-list', '--merges', 'HEAD').out.split())}
    R['tables']['mr.ids'] = table(['commit', 'message', 'id before', 'after a merge', 'after a rebase'], [
        ['F1', 'Add the nightly check', ids['F1'], ids['F1'], ids['F1r']],
        ['F2', 'Document the check', ids['F2'], ids['F2'], ids['F2r']],
        ['M', 'the merge commit', '-', ids['M'], '-']])
    C['mr.ids'] = ids
    # branch housekeeping
    o = git(m, 'branch', '-d', 'feature')
    T('br.delete', o.out)
    o2 = git(r, 'branch', '-d', 'feature', check=False)
    T('br.delete_unmerged', o2.all)
    C['br.delete_unmerged'] = {'rc': o2.rc}


# ------------------------------------------------------------------ 3. conflicts
@section
def conflicts():
    C, X = R['counts'], R['text']
    r = mkrepo('clash')
    put_project(r)
    commit(r, 'Add the loader and the daily model', at=1)
    git(r, 'switch', '-q', '-c', 'avg')
    write(r, 'models/orders_daily.sql', pf('models/orders_daily.sql').replace('sum(amount) as revenue', 'sum(amount) as revenue,\n    avg(amount) as avg_amount'))
    commit(r, 'Add the average amount', who='omar', at=2)
    git(r, 'switch', '-q', 'main')
    write(r, 'models/orders_daily.sql', pf('models/orders_daily.sql').replace('sum(amount) as revenue', 'sum(amount) as revenue,\n    max(amount) as max_amount'))
    commit(r, 'Add the maximum amount', who='maya', at=3)
    for n in ('abort', 'ours', 'resolve'):
        shutil.copytree(r, pathlib.Path(BASE) / ('clash_' + n))
    a = pathlib.Path(BASE) / 'clash_resolve'
    o = git(a, 'merge', 'avg', check=False)
    T('cf.merge', o.all)
    C['cf.merge'] = {'rc': o.rc}
    T('cf.status', git(a, 'status', '--short').out)
    T('cf.status_long', git(a, 'status').out)
    T('cf.markers', (a / 'models' / 'orders_daily.sql').read_text())
    T('cf.diff', git(a, 'diff').out)
    C['cf.stages'] = {'unmerged_entries': len(git(a, 'ls-files', '-u').out.splitlines()), 'stage_numbers': sorted(set(l.split()[2] for l in git(a, 'ls-files', '-u').out.splitlines()))}
    T('cf.ls_unmerged', git(a, 'ls-files', '-u').out)
    o = git(a, 'diff', '--check', check=False)
    T('cf.diff_check', o.out)
    C['cf.diff_check'] = {'rc': o.rc}
    resolved = pf('models/orders_daily.sql').replace('sum(amount) as revenue', 'sum(amount) as revenue,\n    avg(amount) as avg_amount,\n    max(amount) as max_amount')
    write(a, 'models/orders_daily.sql', resolved)
    R['files']['conflict/resolved.sql'] = resolved
    git(a, 'add', 'models/orders_daily.sql')
    T('cf.status_resolved', git(a, 'status', '--short').out)
    git(a, 'commit', '-q', '--no-edit', at=4)
    T('cf.graph', git(a, 'log', '--oneline', '--graph', '--decorate').out)
    C['cf.after'] = {'merge_commit': len(git(a, 'rev-list', '--merges', 'HEAD').out.split()), 'markers_left': '<<<<<<<' in (a / 'models' / 'orders_daily.sql').read_text()}
    # abort
    b = pathlib.Path(BASE) / 'clash_abort'
    git(b, 'merge', 'avg', check=False)
    o = git(b, 'merge', '--abort')
    C['cf.abort'] = {'rc': o.rc, 'status_clean': git(b, 'status', '--short').out.strip() == '', 'head_same': short(b) == short(r)}
    # take one side
    c = pathlib.Path(BASE) / 'clash_ours'
    git(c, 'merge', 'avg', check=False)
    git(c, 'checkout', '--theirs', 'models/orders_daily.sql')
    C['cf.theirs'] = {'has_avg': 'avg_amount' in (c / 'models' / 'orders_daily.sql').read_text(), 'has_max': 'max_amount' in (c / 'models' / 'orders_daily.sql').read_text()}
    # a conflict in a rebase: ours and theirs swap meaning
    d = pathlib.Path(BASE) / 'clash_rebase'
    shutil.copytree(r, d)
    git(d, 'switch', '-q', 'avg')
    o = git(d, 'rebase', 'main', check=False)
    T('cf.rebase', o.all)
    C['cf.rebase'] = {'rc': o.rc, 'in_progress': (d / '.git' / 'rebase-merge').exists()}
    T('cf.rebase_markers', (d / 'models' / 'orders_daily.sql').read_text())
    git(d, 'rebase', '--abort')
    # the same line changed twice: a rate
    e = mkrepo('clash_rate')
    put_project(e)
    commit(e, 'Add the loader and the daily model', at=1)
    git(e, 'switch', '-q', '-c', 'sales-tax')
    write(e, 'loader/tax_rate.txt', '0.09\n')
    commit(e, 'Raise the tax rate to 0.09', who='omar', at=2)
    git(e, 'switch', '-q', 'main')
    write(e, 'loader/tax_rate.txt', '0.07\n')
    commit(e, 'Lower the tax rate to 0.07', who='maya', at=3)
    o = git(e, 'merge', 'sales-tax', check=False)
    T('cf.rate_merge', o.all)
    T('cf.rate_markers', (e / 'loader' / 'tax_rate.txt').read_text())
    # the parser of the loader would read this file: what happens when the markers are committed
    pr = subprocess.run(['python3', '-c', "float(open('loader/tax_rate.txt').read())"], cwd=str(e), capture_output=True, text=True)
    C['cf.rate_markers'] = {'loader_reads_it': pr.returncode == 0}
    T('cf.rate_error', pr.stderr.strip().splitlines()[-1])
    git(e, 'merge', '--abort')


# ------------------------------------------------------------------ 4. undo
@section
def undo():
    C, X = R['counts'], R['text']

    def fresh(name):
        r = mkrepo(name)
        put_project(r)
        commit(r, 'Add the loader and the daily model', at=1)
        write(r, 'dags/nightly.py', pf('dags/nightly.py'))
        commit(r, 'Add the nightly DAG', at=2)
        write(r, 'loader/tax_rate.txt', '0.09\n')
        commit(r, 'Raise the tax rate to 0.09', at=3)
        return r

    base = fresh('undo_base')
    T('un.log', git(base, 'log', '--oneline').out)
    # state after each undo command, starting from: HEAD has the change, then a new uncommitted edit
    rows = []

    def snap(r):
        rate_wt = (r / 'loader' / 'tax_rate.txt').read_text().strip()
        rate_ix = git(r, 'show', ':loader/tax_rate.txt').out.strip()
        rate_hd = git(r, 'show', 'HEAD:loader/tax_rate.txt').out.strip()
        return rate_wt, rate_ix, rate_hd, short(r), len(git(r, 'rev-list', 'HEAD').out.split())

    cases = [('start', None), ('git reset --soft HEAD~1', ['reset', '--soft', 'HEAD~1']), ('git reset --mixed HEAD~1', ['reset', '--mixed', 'HEAD~1']), ('git reset --hard HEAD~1', ['reset', '--hard', 'HEAD~1']),
             ('git revert HEAD', ['revert', '--no-edit', 'HEAD'])]
    for i, (label, cmd) in enumerate(cases):
        r = fresh('undo_%d' % i)
        if cmd:
            git(r, *cmd, at=9)
        wt, ix, hd, head, n = snap(r)
        rows.append([label, head, hd, ix, wt, n])
    R['tables']['un.reset'] = table(['command', 'HEAD', 'rate in the last commit', 'rate in the index', 'rate in the file', 'commits in the history'], rows)
    # outputs of a few
    r = fresh('undo_out')
    T('un.revert', git(r, 'revert', '--no-edit', 'HEAD', at=9).out)
    T('un.revert_log', git(r, 'log', '--oneline').out)
    # restore: a working-tree edit and a staged edit
    r = fresh('undo_restore')
    write(r, 'README.md', pf('README.md') + 'a stray line\n')
    git(r, 'add', 'README.md')
    T('un.status_staged', git(r, 'status', '--short').out)
    git(r, 'restore', '--staged', 'README.md')
    T('un.status_after_unstage', git(r, 'status', '--short').out)
    git(r, 'restore', 'README.md')
    T('un.status_after_restore', git(r, 'status', '--short').out or '(clean)')
    C['un.restore'] = {'file_back': (r / 'README.md').read_text() == pf('README.md')}
    # a hard reset loses a commit, and the reflog finds it
    r = fresh('undo_reflog')
    lost = short(r)
    git(r, 'reset', '--hard', 'HEAD~2')
    T('un.reflog', git(r, 'reflog').out)
    C['un.lost'] = {'lost_id': lost, 'log_after_reset': len(git(r, 'rev-list', 'HEAD').out.split()), 'file_after_reset': (r / 'loader' / 'tax_rate.txt').read_text().strip()}
    T('un.fsck', git(r, 'fsck', '--lost-found', '--no-reflogs').all if False else git(r, 'fsck', '--unreachable', '--no-reflogs').all)
    git(r, 'reset', '--hard', 'HEAD@{1}')
    C['un.recovered'] = {'head_is_the_lost_commit': short(r) == lost, 'log_after_recovery': len(git(r, 'rev-list', 'HEAD').out.split()), 'file_after_recovery': (r / 'loader' / 'tax_rate.txt').read_text().strip()}
    # amend
    r = fresh('undo_amend')
    before = short(r)
    write(r, 'loader/tax_rate.txt', '0.085\n')
    git(r, 'add', '-A')
    git(r, 'commit', '-q', '--amend', '-m', 'Raise the tax rate to 0.085', at=9)
    C['un.amend'] = {'id_before': before, 'id_after': short(r), 'commits': len(git(r, 'rev-list', 'HEAD').out.split()), 'subject': git(r, 'log', '-1', '--format=%s').out.strip()}
    # clean
    r = fresh('undo_clean')
    write(r, 'scratch/notes.txt', 'x\n')
    write(r, 'scratch2.txt', 'y\n')
    T('un.clean_n', git(r, 'clean', '-n', '-d').out)
    T('un.clean_f', git(r, 'clean', '-f', '-d').out)
    # a deleted file comes back
    r = fresh('undo_deleted')
    (r / 'README.md').unlink()
    T('un.deleted_status', git(r, 'status', '--short').out)
    git(r, 'restore', 'README.md')
    C['un.deleted'] = {'file_back': (r / 'README.md').exists()}
    # an old version of one file, without moving HEAD
    r = fresh('undo_old')
    git(r, 'restore', '--source=HEAD~1', 'loader/tax_rate.txt')
    C['un.source'] = {'rate_in_file': (r / 'loader' / 'tax_rate.txt').read_text().strip(), 'head_moved': short(r) != short(base)}


# ------------------------------------------------------------------ 5. remotes
@section
def remotes():
    C, X = R['counts'], R['text']
    origin = mkrepo('origin.git', bare=True)
    git(origin, 'symbolic-ref', 'HEAD', 'refs/heads/main')
    maya = pathlib.Path(BASE) / 'maya'
    git(BASE, 'clone', '-q', str(origin), str(maya))
    put_project(maya)
    commit(maya, 'Add the loader and the daily model', at=1)
    o = git(maya, 'push', '-u', 'origin', 'main')
    T('rm.push_first', o.all)
    T('rm.remote_v', git(maya, 'remote', '-v').out)
    T('rm.branch_vv', git(maya, 'branch', '-vv').out)
    omar = pathlib.Path(BASE) / 'omar'
    o = git(BASE, 'clone', str(origin), str(omar))
    T('rm.clone', o.all)
    # both commit from the same base
    write(omar, 'dags/nightly.py', pf('dags/nightly.py'))
    commit(omar, 'Add the nightly DAG', who='omar', at=2)
    git(omar, 'push', '-q', 'origin', 'main', who='omar')
    write(maya, 'README.md', pf('README.md') + 'Questions go to #data.\n')
    commit(maya, 'Add a contact line', at=3)
    o = git(maya, 'push', 'origin', 'main', check=False)
    T('rm.push_rejected', o.all)
    C['rm.push_rejected'] = {'rc': o.rc}
    git(maya, 'fetch', '-q', 'origin')
    T('rm.status_diverged', git(maya, 'status', '-sb').out)
    T('rm.status_diverged_long', git(maya, 'status').out)
    T('rm.graph_diverged', git(maya, 'log', '--oneline', '--graph', '--all', '--decorate').out)
    o = git(maya, 'pull', check=False)
    T('rm.pull_plain', o.all)
    C['rm.pull_plain'] = {'rc': o.rc}
    # a pull is a fetch and a merge, or a fetch and a rebase
    snap = pathlib.Path(BASE) / 'maya_merge'
    shutil.copytree(maya, snap)
    o = git(snap, 'pull', '--no-rebase', '--no-edit', at=4)
    T('rm.pull_merge', o.all)
    C['rm.pull_merge'] = {'merge_commits': len(git(snap, 'rev-list', '--merges', 'HEAD').out.split())}
    o = git(maya, 'pull', '--rebase', at=4)
    T('rm.pull_rebase', o.all)
    T('rm.graph_rebased', git(maya, 'log', '--oneline', '--graph', '--decorate').out)
    C['rm.pull_rebase'] = {'merge_commits': len(git(maya, 'rev-list', '--merges', 'HEAD').out.split()), 'commits': len(git(maya, 'rev-list', 'HEAD').out.split())}
    o = git(maya, 'push', 'origin', 'main')
    T('rm.push_ok', o.all)
    T('rm.ls_remote', git(maya, 'ls-remote', 'origin').out)
    # behind: omar fetches
    git(omar, 'fetch', '-q', 'origin')
    T('rm.status_behind', git(omar, 'status', '-sb').out)
    T('rm.pull_ff', git(omar, 'pull', '--ff-only').out)
    # a force push over a teammate's commit, and --force-with-lease
    git(maya, 'commit', '-q', '--amend', '-m', 'Add a contact line (amended)', at=5)
    o = git(maya, 'push', 'origin', 'main', check=False)
    T('rm.push_amended', o.all)
    C['rm.push_amended'] = {'rc': o.rc}
    write(omar, 'models/note.sql', '-- a note\n')
    commit(omar, 'Add a note', who='omar', at=6)
    git(omar, 'push', '-q', 'origin', 'main', who='omar')           # the remote moves on, and Maya has not fetched
    o = git(maya, 'push', '--force-with-lease', 'origin', 'main', check=False)
    T('rm.force_with_lease', o.all)
    C['rm.force_with_lease'] = {'rc': o.rc, 'refused': 'stale info' in o.all or 'rejected' in o.all}
    omar_tip = short(omar)
    o = git(maya, 'push', '--force', 'origin', 'main', check=False)
    T('rm.force', o.all)
    C['rm.force'] = {'rc': o.rc, 'omar_commit_still_on_remote': git(origin, 'cat-file', '-t', git(omar, 'rev-parse', 'HEAD').out.strip(), check=False).rc == 0,
                     'remote_main_is_maya': git(origin, 'rev-parse', '--short', 'main').out.strip() == short(maya), 'omar_tip': omar_tip}
    # a tracking branch is a copy of where the remote was at the last fetch
    C['rm.tracking'] = {'remote_ref_file_exists': (maya / '.git' / 'refs' / 'remotes' / 'origin' / 'main').exists()}
    T('rm.remote_ref', (maya / '.git' / 'refs' / 'remotes' / 'origin' / 'main').read_text())
    T('rm.config', (maya / '.git' / 'config').read_text())


# ------------------------------------------------------------------ 6. history as a tool
@section
def history():
    C, X = R['counts'], R['text']
    r = mkrepo('hist')
    put_project(r, files=('README.md', 'loader/load_orders.py', 'loader/tax_rate.txt', 'models/orders_daily.sql', 'checks/check.sh'))
    os.chmod(r / 'checks' / 'check.sh', 0o755)
    commit(r, 'Add the loader, the model and the check', at=1)
    subjects = ['Document the loader', 'Rename a column', 'Add a store filter', 'Document the model', 'Add a comment to the loader', 'Tidy the readme', 'Add a unit note',
                'Raise the tax rate to 0.09', 'Add a daily total', 'Fix a typo', 'Raise the tax rate to 0.8 (a typo)', 'Add a weekly total', 'Reword the readme', 'Add a monthly total', 'Document the check']
    bad = None
    for i, s in enumerate(subjects, start=2):
        files = {}
        if s.startswith('Raise the tax rate to 0.09'):
            files['loader/tax_rate.txt'] = '0.09\n'
        elif 'tax rate to 0.8' in s:
            files['loader/tax_rate.txt'] = '0.8\n'
        else:
            files['notes/n%02d.txt' % i] = '%s\n' % s
        cid = commit(r, s, files=files, who='maya' if i % 3 else 'omar', at=i)
        if 'tax rate to 0.8' in s:
            bad = cid
    C['hist'] = {'commits': len(git(r, 'rev-list', 'HEAD').out.split()), 'bad_commit': bad}
    T('hist.log', git(r, 'log', '--oneline', '-8').out)
    T('hist.log_stat', git(r, 'log', '--stat', '--format=%h %an: %s', '-3').out)
    T('hist.log_S', git(r, 'log', '--oneline', '-S0.8').out)
    T('hist.log_path', git(r, 'log', '--oneline', '--', 'loader/tax_rate.txt').out)
    T('hist.shortlog', git(r, 'shortlog', '-sn', 'HEAD').out)
    T('hist.blame', git(r, 'blame', '-s', '--date=short', 'loader/tax_rate.txt').out)
    T('hist.blame_model', git(r, 'blame', '--date=short', '-L1,4', 'models/orders_daily.sql').out)
    # bisect
    first = git(r, 'rev-list', '--max-parents=0', 'HEAD').out.strip()
    git(r, 'bisect', 'start')
    git(r, 'bisect', 'bad', 'HEAD')
    git(r, 'bisect', 'good', first)
    o = git(r, 'bisect', 'run', 'sh', 'checks/check.sh', check=False)
    lines = o.out.splitlines()
    T('hist.bisect_run', '\n'.join(l for l in lines if not l.startswith(('check passed', 'check failed'))))
    steps = len([l for l in lines if l.startswith('Bisecting:')])
    found = [l for l in lines if 'is the first bad commit' in l]
    first_bad = found[0].split()[0][:7] if found else ''
    logtxt = git(r, 'bisect', 'log', check=False).out
    git(r, 'bisect', 'reset', check=False)
    order = git(r, 'rev-list', '--reverse', 'HEAD').out.split()
    pos = {c[:7]: i + 1 for i, c in enumerate(order)}
    marks = [(m.group(1), pos[m.group(2)[:7]]) for m in re.finditer(r'^git bisect (good|bad) ([0-9a-f]{40})$', logtxt, flags=re.M)]
    C['hist']['bad_position'] = pos[bad]
    C['hist.bisect_tests'] = {'start': marks[:2], 'tests': marks[2:], 'commits': len(order)}
    C['hist.bisect'] = {'commits_between': C['hist']['commits'] - 1, 'steps': len(marks[2:]), 'found': first_bad, 'is_the_bad_commit': first_bad == bad, 'rc': o.rc}
    # cherry-pick
    git(r, 'switch', '-q', '-c', 'release', 'HEAD~6')
    pick = git(r, 'rev-parse', '--short', 'main~3').out.strip()
    msg = git(r, 'log', '-1', '--format=%s', pick).out.strip()
    git(r, 'cherry-pick', pick, at=40)
    C['hist.pick'] = {'original': pick, 'copy': short(r), 'subject': msg, 'same_subject': git(r, 'log', '-1', '--format=%s').out.strip() == msg, 'different_id': pick != short(r)}
    git(r, 'switch', '-q', 'main')
    # stash
    write(r, 'README.md', pf('README.md') + 'half done\n')
    T('hist.stash_push', git(r, 'stash', 'push', '-m', 'half done readme').all)
    T('hist.stash_list', git(r, 'stash', 'list').out)
    C['hist.stash'] = {'clean_after_push': git(r, 'status', '--short').out.strip() == ''}
    T('hist.stash_pop', git(r, 'stash', 'pop').out)
    git(r, 'restore', 'README.md')
    # a second working folder
    o = git(r, 'worktree', 'add', '-q', '../hist_hotfix', '-b', 'hotfix', 'main')
    T('hist.worktree_list', git(r, 'worktree', 'list').out)
    C['hist.worktree'] = {'folders': len(git(r, 'worktree', 'list').out.splitlines()), 'branch_checked_out_twice': git(r, 'switch', 'hotfix', check=False).rc != 0}
    T('hist.worktree_twice', git(r, 'switch', 'hotfix', check=False).all)


# ------------------------------------------------------------------ 7. data in a repository
def lcg_rows(n, seed=20260302):
    s = seed
    out = []
    for i in range(1, n + 1):
        s = (s * 6364136223846793005 + 1442695040888963407) % (1 << 64)
        a = 300 + (s >> 33) % 3700
        s = (s * 6364136223846793005 + 1442695040888963407) % (1 << 64)
        out.append('%d,s%02d,2026-03-%02d,%d.%02d' % (i, 1 + (s >> 33) % 12, 1 + (s >> 40) % 28, a // 100, a % 100))
    return out


def kib(repo):
    """The size of the .git folder in KiB, by walking the files."""
    t = 0
    for p, _, fs in os.walk(str(repo / '.git')):
        for f in fs:
            t += os.path.getsize(os.path.join(p, f))
    return round(t / 1024)


@section
def data():
    C, X = R['counts'], R['text']
    rows = lcg_rows(30000)
    # 1. append-only versus rewrite everything
    sizes = {}
    for mode in ('append', 'rewrite'):
        r = mkrepo('big_' + mode)
        data_rows = rows[:20000]
        write(r, 'data/orders.csv', 'order_id,store_id,order_date,amount\n' + '\n'.join(data_rows) + '\n')
        commit(r, 'Add the orders file', at=1) if False else None
        git(r, 'add', '-f', 'data/orders.csv')
        git(r, 'commit', '-q', '-m', 'Add the orders file', at=1)
        size_one_file = (r / 'data' / 'orders.csv').stat().st_size
        for k in range(1, 7):
            if mode == 'append':
                data_rows = rows[:20000 + k * 500]
            else:
                data_rows = list(rows[:20000])
                random.Random(k).shuffle(data_rows)          # an export that comes back in another order each night
            write(r, 'data/orders.csv', 'order_id,store_id,order_date,amount\n' + '\n'.join(data_rows) + '\n')
            git(r, 'add', '-f', 'data/orders.csv')
            git(r, 'commit', '-q', '-m', 'Update the orders file %d' % k, at=1 + k)
        loose = kib(r)
        co = {l.split(': ')[0]: l.split(': ')[1] for l in git(r, 'count-objects', '-v').out.splitlines()}
        git(r, 'gc', '-q')
        packed = kib(r)
        sizes[mode] = {'file_bytes': size_one_file, 'versions': 7, 'loose_kib': loose, 'loose_objects': int(co['count']), 'after_gc_kib': packed, 'times_the_file': round(packed * 1024 / size_one_file, 2)}
    C['data.sizes'] = sizes
    R['tables']['data.sizes'] = table(['how the file changes', 'size of one version (KiB)', 'versions', '.git before gc (KiB)', '.git after gc (KiB)', 'after gc, in times one version'], [
        ['append 500 rows each time', round(sizes['append']['file_bytes'] / 1024), 7, sizes['append']['loose_kib'], sizes['append']['after_gc_kib'], sizes['append']['times_the_file']],
        ['re-sorted whole file each time', round(sizes['rewrite']['file_bytes'] / 1024), 7, sizes['rewrite']['loose_kib'], sizes['rewrite']['after_gc_kib'], sizes['rewrite']['times_the_file']]])
    # 2. clones: full, shallow, partial
    origin = pathlib.Path(BASE) / 'big_rewrite'
    url = 'file://' + str(origin)
    git(origin, 'config', 'uploadpack.allowFilter', 'true')
    git(origin, 'config', 'uploadpack.allowAnySHA1InWant', 'true')
    cl = {}
    for name, extra in (('full', []), ('depth1', ['--depth', '1']), ('blobless', ['--filter=blob:none'])):
        d = pathlib.Path(BASE) / ('clone_' + name)
        o = git(BASE, 'clone', '-q', *extra, url, str(d), check=False)
        cl[name] = {'rc': o.rc, 'kib': kib(d) if o.rc == 0 else None, 'commits': len(git(d, 'rev-list', '--all').out.split()) if o.rc == 0 else None,
                    'shallow': git(d, 'rev-parse', '--is-shallow-repository').out.strip() if o.rc == 0 else None,
                    'file_there': (d / 'data' / 'orders.csv').exists() if o.rc == 0 else None}
    C['data.clones'] = cl
    R['tables']['data.clones'] = table(['clone', 'size of .git (KiB)', 'commits in the history', 'the file is there'], [
        ['git clone', cl['full']['kib'], cl['full']['commits'], 'yes' if cl['full']['file_there'] else 'no'],
        ['git clone --depth 1', cl['depth1']['kib'], cl['depth1']['commits'], 'yes' if cl['depth1']['file_there'] else 'no'],
        ['git clone --filter=blob:none', cl['blobless']['kib'], cl['blobless']['commits'], 'yes' if cl['blobless']['file_there'] else 'no']])
    T('data.depth_status', 'is shallow: ' + str(cl['depth1']['shallow']))
    # 3. a secret in history
    r = mkrepo('leak')
    put_project(r)
    commit(r, 'Add the loader and the daily model', at=1)
    secret = 'AKIAIOSFODNN7EXAMPLE'
    write(r, '.env', 'AWS_ACCESS_KEY_ID=%s\nDB_PASSWORD=brewline-dev\n' % secret)
    git(r, 'add', '-f', '.env')
    git(r, 'commit', '-q', '-m', 'Add local settings', at=2)
    leak_id = short(r)
    write(r, 'README.md', pf('README.md') + 'See .env for settings.\n')
    commit(r, 'Document the settings', at=3)
    git(r, 'rm', '-q', '--cached', '.env')
    git(r, 'commit', '-q', '-m', 'Remove the settings file', at=4)
    (r / '.env').unlink()
    C['leak.before'] = {'file_in_head': git(r, 'cat-file', '-e', 'HEAD:.env', check=False).rc == 0, 'found_in_history': len(git(r, 'log', '--oneline', '-S' + secret).out.splitlines()),
                        'show_old': secret in git(r, 'show', leak_id + ':.env').out, 'commits': len(git(r, 'rev-list', 'HEAD').out.split())}
    T('leak.log_S', git(r, 'log', '--oneline', '-S' + secret, '--all').out)
    T('leak.show', git(r, 'show', leak_id + ':.env').out)
    blob = git(r, 'rev-parse', leak_id + ':.env').out.strip()
    o = git(r, 'filter-branch', '-f', '--index-filter', 'git rm --cached --ignore-unmatch -q .env', '--', '--all')
    T('leak.filter_branch', o.all)
    C['leak.rewrite'] = {'rc': o.rc, 'old_blob_still_in_the_repository': git(r, 'cat-file', '-e', blob, check=False).rc == 0, 'found_in_history': len(git(r, 'log', '--oneline', '-S' + secret).out.splitlines()),
                         'commit_ids_changed': leak_id != git(r, 'log', '--format=%h', '--grep=Add local settings').out.strip(), 'commits': len(git(r, 'rev-list', 'HEAD').out.split())}
    git(r, 'for-each-ref', '--format=delete %(refname)', 'refs/original/', check=False)
    sh(r, 'git for-each-ref --format="%(refname)" refs/original/ | xargs -r -n1 git update-ref -d')
    git(r, 'reflog', 'expire', '--expire=now', '--all')
    git(r, 'gc', '-q', '--prune=now')
    C['leak.after_gc'] = {'old_blob_still_in_the_repository': git(r, 'cat-file', '-e', blob, check=False).rc == 0}
    # a clone made before the rewrite still has it: show with a second repository
    # 4. a notebook
    nb = lambda counts, outputs: {'cells': [{'cell_type': 'code', 'execution_count': counts[i], 'metadata': {}, 'source': ['print(%d)' % i], 'outputs': ([{'name': 'stdout', 'output_type': 'stream', 'text': ['%d\n' % (i * counts[i])]}] if outputs else [])} for i in range(40)], 'metadata': {}, 'nbformat': 4, 'nbformat_minor': 5}
    import json
    r = mkrepo('nb')
    write(r, 'notebooks/explore.ipynb', json.dumps(nb(list(range(1, 41)), True), indent=1) + '\n')
    git(r, 'add', '-A')
    git(r, 'commit', '-q', '-m', 'Add the notebook', at=1)
    write(r, 'notebooks/explore.ipynb', json.dumps(nb(list(range(41, 81)), True), indent=1) + '\n')           # run the notebook again: only the counters and outputs change
    d1 = git(r, 'diff', '--shortstat').out.strip()
    git(r, 'commit', '-q', '-am', 'Run the notebook again', at=2)
    write(r, 'notebooks/explore.ipynb', json.dumps(nb([None] * 40, False), indent=1) + '\n')                  # stripped
    d2 = git(r, 'diff', '--shortstat', 'HEAD~1', '--', 'notebooks/explore.ipynb').out.strip()
    C['nb'] = {'cells': 40, 'source_lines_changed_between_runs': 0, 'diff_after_rerun': d1, 'lines_changed_after_rerun': int(re.search(r'(\d+) insertion', d1).group(1)) + int(re.search(r'(\d+) deletion', d1).group(1))}
    R['files']['notebooks/explore_cell.json'] = json.dumps(nb(list(range(1, 41)), True)['cells'][0], indent=1) + '\n'
    # 5. git lfs
    r = mkrepo('lfs')
    sh(r, 'git lfs install --local >/dev/null 2>&1')
    write(r, '.gitattributes', pf('.gitattributes'))
    blobdata = bytes((i * 7 + (i >> 3)) % 251 for i in range(400 * 1024))
    (r / 'data').mkdir()
    (r / 'data' / 'orders.parquet').write_bytes(blobdata)
    git(r, 'add', '.gitattributes', 'data/orders.parquet')
    git(r, 'commit', '-q', '-m', 'Track parquet files with LFS', at=1)
    ptr = git(r, 'show', 'HEAD:data/orders.parquet').out
    T('lfs.pointer', ptr)
    T('lfs.ls_files', sh(r, 'git lfs ls-files').out)
    lfs_dir = r / '.git' / 'lfs' / 'objects'
    lfs_bytes = sum(os.path.getsize(os.path.join(p, f)) for p, _, fs in os.walk(str(lfs_dir)) for f in fs)
    git_objects_bytes = sum(os.path.getsize(os.path.join(p, f)) for p, _, fs in os.walk(str(r / '.git' / 'objects')) for f in fs)
    C['lfs'] = {'file_bytes': len(blobdata), 'pointer_bytes': len(ptr.encode()), 'lfs_store_bytes': lfs_bytes, 'git_objects_bytes': git_objects_bytes, 'pointer_lines': len(ptr.strip().splitlines())}
    T('lfs.track', sh(r, 'git lfs track').out)


# ------------------------------------------------------------------ 8. workflow: hooks, tags, fixups
@section
def workflow():
    C, X = R['counts'], R['text']
    r = mkrepo('wf')
    put_project(r)
    commit(r, 'Add the loader and the daily model', at=1)
    # a pre-commit hook
    hook = r / '.git' / 'hooks' / 'pre-commit'
    hook.write_text(pf('hooks/pre-commit'))
    os.chmod(hook, 0o755)
    write(r, 'loader/settings.py', 'AWS_KEY = "AKIAIOSFODNN7EXAMPLE"\n')
    git(r, 'add', 'loader/settings.py')
    o = git(r, 'commit', '-m', 'Add settings', check=False, at=2)
    T('hk.refused', o.all)
    C['hk.refused'] = {'rc': o.rc, 'commits': len(git(r, 'rev-list', 'HEAD').out.split())}
    o = git(r, 'commit', '--no-verify', '-q', '-m', 'Add settings', check=False, at=2)
    C['hk.no_verify'] = {'rc': o.rc, 'commits': len(git(r, 'rev-list', 'HEAD').out.split())}
    # hooks are not part of a clone
    origin = pathlib.Path(BASE) / 'wf_origin.git'
    git(BASE, 'clone', '-q', '--bare', str(r), str(origin))
    cl = pathlib.Path(BASE) / 'wf_clone'
    git(BASE, 'clone', '-q', str(origin), str(cl))
    hooks = sorted(os.listdir(str(cl / '.git' / 'hooks')))
    C['hk.clone'] = {'hooks_in_the_clone': [h for h in hooks if not h.endswith('.sample')], 'samples': len([h for h in hooks if h.endswith('.sample')]), 'the_original_has_pre_commit': hook.exists()}
    # a hook that is in the repository, switched on by core.hooksPath
    sh(r, 'mkdir -p .githooks')
    shutil.copy(PROJECT / 'hooks' / 'pre-commit', r / '.githooks' / 'pre-commit')
    os.chmod(r / '.githooks' / 'pre-commit', 0o755)
    git(r, 'config', 'core.hooksPath', '.githooks')
    C['hk.path'] = {'value': git(r, 'config', '--get', 'core.hooksPath').out.strip()}
    # tags
    t = mkrepo('tags')
    put_project(t)
    commit(t, 'Add the loader and the daily model', at=1)
    git(t, 'tag', 'v1.0.0')
    commit(t, 'Add the nightly DAG', files={'dags/nightly.py': pf('dags/nightly.py')}, at=2)
    git(t, 'tag', '-a', 'v1.1.0', '-m', 'Release 1.1.0: the nightly DAG', at=3)
    commit(t, 'Fix a typo', files={'README.md': pf('README.md') + 'typo fixed\n'}, at=4)
    commit(t, 'Add a note', files={'notes.txt': 'n\n'}, at=5)
    T('tag.list', git(t, 'tag', '-l').out)
    C['tag.types'] = {'lightweight': git(t, 'cat-file', '-t', 'v1.0.0').out.strip(), 'annotated': git(t, 'cat-file', '-t', 'v1.1.0').out.strip()}
    T('tag.show_annotated', git(t, 'show', '--no-patch', 'v1.1.0').out)
    T('tag.describe', git(t, 'describe').out)
    T('tag.describe_tag', git(t, 'describe', '--tags', 'HEAD~1').out)
    # tags are not pushed by default
    to = pathlib.Path(BASE) / 'tags_origin.git'
    git(BASE, 'clone', '-q', '--bare', str(t), str(to))
    git(t, 'remote', 'add', 'origin', str(to))
    git(to, 'tag', '-d', 'v1.0.0', 'v1.1.0')
    o = git(t, 'push', 'origin', 'main')
    on_remote = git(to, 'tag', '-l').out.split()
    o2 = git(t, 'push', '--follow-tags', 'origin', 'main')
    on_remote2 = git(to, 'tag', '-l').out.split()
    C['tag.push'] = {'after_plain_push': on_remote, 'after_follow_tags': on_remote2}
    # CI usually makes a shallow clone: describe and tag lists need the history
    sc = pathlib.Path(BASE) / 'tags_shallow'
    git(BASE, 'clone', '-q', '--depth', '1', 'file://' + str(to), str(sc))
    o = git(sc, 'describe', check=False)
    T('tag.describe_shallow', o.all)
    C['tag.shallow'] = {'rc': o.rc, 'tags_in_the_clone': git(sc, 'tag', '-l').out.split(), 'commits': len(git(sc, 'rev-list', 'HEAD').out.split())}
    git(sc, 'fetch', '-q', '--unshallow', '--tags')
    o = git(sc, 'describe', check=False)
    T('tag.describe_full', o.all)
    C['tag.unshallow'] = {'rc': o.rc, 'tags_in_the_clone': git(sc, 'tag', '-l').out.split()}
    # fixup and autosquash
    f = mkrepo('fix')
    put_project(f)
    commit(f, 'Add the loader and the daily model', at=1)
    commit(f, 'Add the nightly DAG', files={'dags/nightly.py': pf('dags/nightly.py')}, at=2)
    commit(f, 'Add the check', files={'checks/check.sh': pf('checks/check.sh')}, at=3)
    before = git(f, 'log', '--format=%h %s').out
    write(f, 'dags/nightly.py', pf('dags/nightly.py').replace('0 2 * * *', '30 2 * * *'))
    git(f, 'add', '-A')
    git(f, 'commit', '-q', '--fixup', 'HEAD~1', at=4)
    T('fx.log_before', git(f, 'log', '--oneline').out)
    p = subprocess.run(['git', 'rebase', '-i', '--autosquash', 'HEAD~3'], cwd=str(f), capture_output=True, text=True, env=dict(env(at=5), GIT_SEQUENCE_EDITOR='true'))
    T('fx.rebase', p.stdout + p.stderr)
    T('fx.log_after', git(f, 'log', '--oneline').out)
    C['fx'] = {'commits_before': 4, 'commits_after': len(git(f, 'rev-list', 'HEAD').out.split()), 'dag_has_the_fix': '30 2 * * *' in git(f, 'show', 'HEAD~1:dags/nightly.py').out}
    # the workflow file for CI
    R['files']['.github/workflows/check.yml'] = pf('ci.yml') if (PROJECT / 'ci.yml').exists() else ''


# ------------------------------------------------------------------ 9. inside the repository and at scale
@section
def internals():
    C, X = R['counts'], R['text']
    r = pathlib.Path(BASE) / 'big_append'
    packs = sorted((r / '.git' / 'objects' / 'pack').glob('*.idx'))
    vp = git(r, 'verify-pack', '-v', str(packs[0])).out.splitlines()
    objs = [l for l in vp if re.match(r'^[0-9a-f]{40} ', l)]
    deltas = [l for l in objs if len(l.split()) >= 7]
    C['int.pack'] = {'objects': len(objs), 'delta_objects': len(deltas), 'max_chain': max([int(l.split()[5]) for l in deltas] or [0]), 'packs': len(packs)}
    T('int.verify_tail', '\n'.join(vp[-3:]))
    T('int.count_objects', git(r, 'count-objects', '-v').out)
    types = {}
    for l in git(r, 'cat-file', '--batch-all-objects', '--batch-check').out.splitlines():
        types[l.split()[1]] = types.get(l.split()[1], 0) + 1
    C['int.types'] = types
    # unreachable objects after a hard reset, then gc
    u = mkrepo('lost')
    put_project(u)
    commit(u, 'Add the loader and the daily model', at=1)
    commit(u, 'Add a note', files={'note.txt': 'n\n'}, at=2)
    lost = git(u, 'rev-parse', 'HEAD').out.strip()
    git(u, 'reset', '-q', '--hard', 'HEAD~1')
    T('int.fsck', git(u, 'fsck', '--unreachable', '--no-reflogs').all)
    C['int.lost'] = {'object_present': git(u, 'cat-file', '-e', lost, check=False).rc == 0}
    git(u, 'reflog', 'expire', '--expire=now', '--all')
    git(u, 'gc', '-q', '--prune=now')
    C['int.lost']['object_present_after_gc'] = git(u, 'cat-file', '-e', lost, check=False).rc == 0
    # sparse checkout
    sp = pathlib.Path(BASE) / 'sparse'
    git(BASE, 'clone', '-q', 'file://' + str(pathlib.Path(BASE) / 'hist'), str(sp))
    full_files = len(git(sp, 'ls-files').out.split())
    git(sp, 'sparse-checkout', 'set', 'loader')
    on_disk = sorted(str(p.relative_to(sp)) for p in sp.rglob('*') if p.is_file() and '.git' not in p.parts)
    C['int.sparse'] = {'tracked_files': full_files, 'files_on_disk': len(on_disk), 'on_disk': on_disk}
    # a shallow clone and unshallow
    sh_ = pathlib.Path(BASE) / 'shallow'
    git(BASE, 'clone', '-q', '--depth', '3', 'file://' + str(pathlib.Path(BASE) / 'hist'), str(sh_))
    before = len(git(sh_, 'rev-list', 'HEAD').out.split())
    git(sh_, 'fetch', '-q', '--unshallow')
    C['int.shallow'] = {'commits_with_depth_3': before, 'commits_after_unshallow': len(git(sh_, 'rev-list', 'HEAD').out.split())}
    # sha-256 repositories
    s = pathlib.Path(BASE) / 'sha256'
    s.mkdir()
    o = git(s, 'init', '-q', '--object-format=sha256', check=False)
    if o.rc == 0:
        write(s, 'a.txt', 'a\n')
        git(s, 'add', '-A')
        git(s, 'commit', '-q', '-m', 'sha-256', at=1)
        C['int.sha256'] = {'ok': True, 'id_chars': len(git(s, 'rev-parse', 'HEAD').out.strip())}
    else:
        C['int.sha256'] = {'ok': False, 'id_chars': 0}
    C['int.sha1'] = {'id_chars': len(git(r, 'rev-parse', 'HEAD').out.strip())}
    # the number of commits: ids are cheap
    T('int.rev_list_count', git(pathlib.Path(BASE) / 'hist', 'rev-list', '--count', 'HEAD').out)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--out', default=str(HERE.parent / 'js' / 'real.js'))
    ap.add_argument('--only', default='')
    a = ap.parse_args()
    only = set(filter(None, a.only.split(',')))
    try:
        meta()
        for fn in SECTIONS:
            if only and fn.__name__ not in only:
                continue
            t = time.time()
            fn()
            print('%-12s %5.1fs' % (fn.__name__, time.time() - t), flush=True)
    finally:
        cleanup()
    p = write_real(a.out)
    print('wrote %s: %d files, %d texts, %d tables, %d sets of counts' % (p, len(R['files']), len(R['text']), len(R['tables']), len(R['counts'])))


if __name__ == '__main__':
    main()
