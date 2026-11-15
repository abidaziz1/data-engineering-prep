// Checks the recorded numbers that the Git labs and lessons read, with rules written here, in code that shares nothing with the widgets:
// the hash of a blob and of a commit worked out again with SHA-1, the status code of a file from the three ids, how many commits a merge, a rebase and a
// squash leave, where a change is after each kind of reset, which commits a bisect may test, how sizes relate, and the sha256 of the LFS content.
// The widgets themselves are driven in a browser by git/verify/e2e_labs.js.
// Run: node git/verify/check_widgets.js        GIT_REAL_JS=<file> lets verify_git.py feed it a changed copy of the recording
const fs = require('fs'), path = require('path'), crypto = require('crypto');
global.window = global; global.LAB = {};
const root = path.join(__dirname, '..', '..');
(0, eval)(fs.readFileSync(process.env.GIT_REAL_JS || path.join(root, 'git', 'js', 'real.js'), 'utf8'));
const R = LAB.real, C = k => R.counts[k], T = k => R.tables[k], X = k => R.text[k], F = k => R.files[k];
let checks = 0, fails = 0;
const eq = (got, want, what) => { checks++; if (JSON.stringify(got) !== JSON.stringify(want)) { fails++; console.log('FAIL:', what, '\n   got ', JSON.stringify(got), '\n   want', JSON.stringify(want)); } };
const yes = (cond, what) => { checks++; if (!cond) { fails++; console.log('FAIL:', what); } };
const sha1 = buf => crypto.createHash('sha1').update(buf).digest('hex');
const gitHash = (type, body) => { const b = Buffer.from(body); return sha1(Buffer.concat([Buffer.from(type + ' ' + b.length + '\0'), b])); };

// ---- objects: the id of a blob and of a commit, worked out again --------------------------------------------------------------------------------------------
const TY = C('obj.types');
eq(gitHash('blob', F('models/orders_daily.sql')).slice(0, 7), TY.blob_id, 'the id of the model is the SHA-1 of "blob <size>", a zero byte and its text');
eq(gitHash('blob', F('loader/tax_rate.txt')).slice(0, 7), C('obj.one_byte').old_rate_blob, 'the id of the tax rate file is worked out the same way');
eq(gitHash('blob', '0.09\n').slice(0, 7), C('obj.one_byte').new_rate_blob, 'one changed character gives the id that the recording printed');
eq(gitHash('commit', X('obj.cat_commit') + '\n').slice(0, 7), TY.commit_id, 'the id of the first commit is the SHA-1 of its own text');
eq([TY.id_length, C('int.sha1').id_chars, C('int.sha256').id_chars], [40, 40, 64], 'ids have 40 characters in SHA-1 and 64 in SHA-256');
yes(/^tree [0-9a-f]{40}$/m.test(X('obj.cat_commit')) && !/^parent /m.test(X('obj.cat_commit')), 'the first commit has a tree line and no parent line');
eq(C('obj.dedupe').blobs_before, C('obj.dedupe').blobs_after_adding_a_copy, 'a copy of a file with the same text adds no blob');

// ---- the status code of a file, from the three ids ---------------------------------------------------------------------------------------------------------
const code = (wt, ix, hd) => wt === ix && ix === hd ? '(clean)' : ix === hd ? ' M' : wt === ix ? 'M ' : 'MM';
T('areas.steps').rows.forEach(r => eq(r[5].slice(0, 2) === '(c' ? '(clean)' : r[5].slice(0, 2), code(r[2], r[3], r[4]), 'the status of the step "' + r[0] + '" follows from the three ids'));
eq(T('areas.steps').rows.map(r => r[2] === r[3] && r[3] === r[4]).filter(Boolean).length, 2, 'the file is clean at the start and after the commit only');

// ---- branches: how many commits each join leaves, from the shape of the fork ------------------------------------------------------------------------------
const main = 3, feature = 2;            // A, B and M1 on main, F1 and F2 on feature
eq([C('mg').commits, C('rb').commits, C('sq').commits], [main + feature + 1, main + feature, main + 1], 'commits after a merge, a rebase and a squash');
eq([C('mg').parents, C('rb').merge_commits, C('sq').merge_commits], [2, 0, 0], 'only the merge makes a commit with two parents');
const ids = C('mr.ids');
yes(ids.F1 !== ids.F1r && ids.F2 !== ids.F2r && new Set([ids.A, ids.B, ids.M1, ids.F1, ids.F2, ids.M, ids.F1r, ids.F2r]).size === 8, 'a rebase gives new ids, and no two commits of the scenario share an id');
eq(T('mr.ids').rows.map(r => [r[2], r[3], r[4]]), [[ids.F1, ids.F1, ids.F1r], [ids.F2, ids.F2, ids.F2r], ['-', ids.M, '-']], 'the table of ids is the one of the counts');
eq(C('br.ref'), { content_is_the_commit_id: true, file_bytes: 41, id_chars: 40 }, 'a branch is a file of 41 bytes');
yes(/^ref: refs\/heads\/main$/.test(X('br.head')), 'HEAD says which branch you are on');

// ---- conflicts ---------------------------------------------------------------------------------------------------------------------------------------------------
eq(C('cf.stages'), { stage_numbers: ['1', '2', '3'], unmerged_entries: 3 }, 'a conflicted file has three versions in the index');
const ls = X('cf.ls_unmerged').split('\n').map(l => l.split(/\s+/));
eq(ls.map(l => l[2]), ['1', '2', '3'], 'ls-files -u lists stages 1, 2 and 3 in order');
eq(ls[0][1].slice(0, 7), TY.blob_id, 'stage 1 is the blob of the common ancestor: the model of the first commit');
yes(new Set(ls.map(l => l[1])).size === 3, 'the three versions of the file are three different blobs');
yes(/^<<<<<<< HEAD$/m.test(X('cf.markers')) && /^=======$/m.test(X('cf.markers')) && /^>>>>>>> avg$/m.test(X('cf.markers')), 'the markers of a merge name the branch');
yes(/^>>>>>>> [0-9a-f]{7} \(Add the average amount\)$/m.test(X('cf.rebase_markers')), 'the markers of a rebase name the commit that is replayed');
yes(!/<<<<<<<|>>>>>>>/.test(F('conflict/resolved.sql')) && /avg\(amount\)/.test(F('conflict/resolved.sql')) && /max\(amount\)/.test(F('conflict/resolved.sql')), 'the resolved file has both columns and no marker');
eq(X('cf.diff_check').split('\n').length, 3, 'diff --check names the three marker lines');
yes(C('cf.rate_markers').loader_reads_it === false && /could not convert string to float/.test(X('cf.rate_error')), 'the loader cannot read a number with markers around it');
eq(C('cf.abort'), { head_same: true, rc: 0, status_clean: true }, 'abort leaves the repository as it was');

// ---- undo: where the change is after each command, from the rules of reset ---------------------------------------------------------------------------------
// start: the last commit changed the rate from 0.08 to 0.09. [rate in HEAD, rate in the index, rate in the file, commits]
const before = '0.08', after = '0.09';
const model = {
  'start': [after, after, after, 3], 'git reset --soft HEAD~1': [before, after, after, 2], 'git reset --mixed HEAD~1': [before, before, after, 2],
  'git reset --hard HEAD~1': [before, before, before, 2], 'git revert HEAD': [before, before, before, 4]
};
T('un.reset').rows.forEach(r => eq([r[2], r[3], r[4], r[5]], model[r[0]], 'after "' + r[0] + '" the three places and the history are as the rules say'));
eq(T('un.reset').rows.length, 5, 'five commands');
const lost = C('un.lost'), rec = C('un.recovered');
eq([lost.log_after_reset, lost.file_after_reset, rec.log_after_recovery, rec.file_after_recovery, rec.head_is_the_lost_commit], [3 - 2, before, 3, after, true], 'a hard reset of two commits leaves one, and the reflog brings back three');
yes(X('un.reflog').split('\n')[1].startsWith(lost.lost_id) && /HEAD@\{1\}: commit: Raise the tax rate/.test(X('un.reflog')), 'the dropped commit is the second entry of the reflog');
yes(/unreachable commit/.test(X('un.fsck')) && X('un.fsck').indexOf('0'.repeat(0) + '') >= 0, 'fsck lists the dropped commit as unreachable');
yes(C('un.amend').id_before !== C('un.amend').id_after && C('un.amend').commits === 3, 'an amend keeps the number of commits and changes the id');
eq(X('un.clean_n').split('\n').map(l => l.replace('Would remove', 'Removing')), X('un.clean_f').split('\n'), 'clean -n lists exactly what clean -f removes');

// ---- remotes -----------------------------------------------------------------------------------------------------------------------------------------------------
const rm = k => X('rm.' + k);
yes(/\[rejected\].*\(fetch first\)/.test(rm('push_rejected')) && C('rm.push_rejected').rc === 1, 'the first refusal says fetch first');
yes(/ahead 1, behind 1/.test(rm('status_diverged')) && /behind 1/.test(rm('status_behind')) && !/ahead/.test(rm('status_behind')), 'the status counts ahead and behind');
eq([C('rm.pull_plain').rc, C('rm.pull_merge').merge_commits, C('rm.pull_rebase').merge_commits, C('rm.pull_rebase').commits], [128, 1, 0, 3], 'a plain pull stops, a merge pull makes one merge commit, a rebase pull makes none');
yes(/non-fast-forward/.test(rm('push_amended')) && /stale info/.test(rm('force_with_lease')) && /forced update/.test(rm('force')), 'three different refusals and the forced update');
eq([C('rm.force').omar_commit_still_on_remote, C('rm.force').remote_main_is_maya, C('rm.force_with_lease').rc, C('rm.force').rc], [true, true, 1, 0], 'force overwrote the branch and lease refused');
yes(/^[0-9a-f]{40}$/.test(rm('remote_ref')) && /\[branch "main"\]/.test(rm('config')) && /remote = origin/.test(rm('config')), 'a tracking branch is a file with an id, and the config names the remote');

// ---- bisect: every test is consistent with where the bad commit is -------------------------------------------------------------------------------------------
const bt = C('hist.bisect_tests'), bad = C('hist').bad_position;
let lo = bt.start.find(x => x[0] === 'good')[1], hi = bt.start.find(x => x[0] === 'bad')[1];
bt.tests.forEach(t => { eq(t[0], t[1] >= bad ? 'bad' : 'good', 'the test of commit ' + t[1] + ' says ' + (t[1] >= bad ? 'bad' : 'good') + ', because the bad commit is number ' + bad); yes(t[1] > lo && t[1] < hi, 'commit ' + t[1] + ' lies between the known good (' + lo + ') and the known bad (' + hi + ')'); if (t[0] === 'good') lo = t[1]; else hi = t[1]; });
eq([lo + 1, hi], [bad, bad], 'the last good and the first bad commit are neighbours, and the first bad one is the bad commit');
yes(bt.tests.length <= Math.ceil(Math.log2(bt.commits - 1)), 'bisect needs at most log2 of the number of commits tests: ' + bt.tests.length);
eq([C('hist.bisect').is_the_bad_commit, C('hist.bisect').steps], [true, bt.tests.length], 'bisect named the bad commit');
yes(X('hist.bisect_run').indexOf(C('hist').bad_commit) >= 0 && /is the first bad commit/.test(X('hist.bisect_run')), 'the recorded run names the commit');
yes(C('hist.pick').different_id && C('hist.pick').same_subject, 'a cherry-pick has the same subject and a different id');

// ---- data: sizes against each other, and the content of the LFS pointer ----------------------------------------------------------------------------------
const sz = C('data.sizes'), fileKiB = sz.append.file_bytes / 1024;
yes(sz.append.after_gc_kib < sz.append.loose_kib && sz.rewrite.after_gc_kib < sz.rewrite.loose_kib, 'gc makes a repository smaller');
yes(sz.append.after_gc_kib < fileKiB && sz.rewrite.after_gc_kib > fileKiB, 'seven appended versions take less than one copy, and seven re-sorted ones more than one');
eq(+(sz.rewrite.after_gc_kib * 1024 / sz.rewrite.file_bytes).toFixed(2), sz.rewrite.times_the_file, 'times the file is after gc over the size of one version');
eq(sz.append.file_bytes, sz.rewrite.file_bytes, 'both repositories held the same file');
const tb = T('data.sizes').rows;
eq([tb[0][3], tb[0][4], tb[1][3], tb[1][4]], [sz.append.loose_kib, sz.append.after_gc_kib, sz.rewrite.loose_kib, sz.rewrite.after_gc_kib], 'the table of sizes is the one of the counts');
const cl = C('data.clones');
yes(cl.depth1.shallow === 'true' && cl.depth1.commits === 1 && cl.full.commits === 7 && cl.blobless.commits === 7 && cl.depth1.kib < cl.full.kib && cl.blobless.kib < cl.full.kib && cl.full.file_there && cl.depth1.file_there && cl.blobless.file_there, 'clones: depth 1 has one commit, the others seven, and all of them have the file');
const content = Buffer.alloc(400 * 1024); for (let i = 0; i < content.length; i++) content[i] = (i * 7 + (i >> 3)) % 251;
const lf = C('lfs'), ptr = X('lfs.pointer');
eq(crypto.createHash('sha256').update(content).digest('hex'), /oid sha256:([0-9a-f]{64})/.exec(ptr)[1], 'the oid in the LFS pointer is the sha256 of the 400 KiB content, worked out again');
eq([lf.file_bytes, +/size (\d+)/.exec(ptr)[1], lf.pointer_bytes, Buffer.byteLength(ptr + '\n')], [content.length, content.length, Buffer.byteLength(ptr + '\n'), Buffer.byteLength(ptr + '\n')], 'the size in the pointer is the size of the content, and the pointer is as long as recorded');
yes(lf.lfs_store_bytes === lf.file_bytes && lf.git_objects_bytes < 2000 && lf.pointer_lines === 3, 'the content is in the LFS store and git holds only a pointer of three lines');
const nb = C('nb'), m = /(\d+) insertions?\(\+\), (\d+) deletions?\(-\)/.exec(nb.diff_after_rerun);
eq([nb.lines_changed_after_rerun, +m[1] + +m[2]], [158, 158], 'the lines changed are the insertions and deletions of the diff');
eq(JSON.parse(F('notebooks/explore_cell.json')).source, ['print(0)'], 'the recorded cell holds one line of code');
const lk = C('leak.before'), lr = C('leak.rewrite');
yes(lk.found_in_history === 2 && lk.show_old && !lk.file_in_head && lr.found_in_history === 0 && lr.old_blob_still_in_the_repository && !C('leak.after_gc').old_blob_still_in_the_repository, 'the key is in two commits, then in none, and the old object goes with the gc');
yes(/AKIAIOSFODNN7EXAMPLE/.test(X('leak.show')) && X('leak.log_S').split('\n').length === 2, 'the key is the example key of the AWS documentation, in two commits');

// ---- workflow and inside --------------------------------------------------------------------------------------------------------------------------------------
eq([C('hk.refused').rc, C('hk.refused').commits, C('hk.no_verify').commits, C('hk.clone').hooks_in_the_clone.length], [1, 1, 2, 0], 'the hook refuses, no-verify passes, and a clone has no hook');
yes(C('hk.clone').samples > 0 && /^#!\/bin\/sh/.test(F('hooks/pre-commit')) && /exit 1/.test(F('hooks/pre-commit')), 'a clone has sample hooks, and the hook exits with 1');
eq([C('tag.types').lightweight, C('tag.types').annotated, C('tag.push').after_plain_push, C('tag.push').after_follow_tags], ['commit', 'tag', [], ['v1.1.0']], 'tags: object types and what a push sends');
yes(/^v1\.1\.0-\d+-g[0-9a-f]{7}$/.test(X('tag.describe')) && /No names found/.test(X('tag.describe_shallow')) && C('tag.shallow').commits === 1 && C('tag.unshallow').rc === 0, 'describe names a commit, and fails in a shallow clone');
eq([C('fx').commits_before - 1, C('fx').commits_after], [3, 3], 'a fixup is folded into its target: four commits become three');
yes(/fetch-depth: 0/.test(F('.github/workflows/check.yml')), 'the workflow fetches the whole history');
const pk = C('int.pack'), cnt = X('int.count_objects'), vp = X('int.verify_tail');
eq([pk.objects, +/in-pack: (\d+)/.exec(cnt)[1], +/chain length = 1: (\d+) objects/.exec(vp)[1], +/non delta: (\d+) objects/.exec(vp)[1]], [28, 28, pk.delta_objects, pk.objects - pk.delta_objects], 'the pack: objects from count-objects, deltas and whole objects from verify-pack');
const ty = C('int.types');
eq([ty.blob + ty.tree + ty.commit, ty.commit, ty.blob, ty.tree], [pk.objects, 7, 7, 14], 'seven commits, seven blobs and two trees for each commit make the objects of the pack');
yes(C('int.lost').object_present && !C('int.lost').object_present_after_gc, 'the dropped commit is stored until the gc');
eq([C('int.shallow').commits_with_depth_3, C('int.shallow').commits_after_unshallow, C('hist').commits], [3, 16, 16], 'depth 3 gives 3 commits and unshallow all 16');
yes(C('int.sparse').files_on_disk === C('int.sparse').on_disk.length && C('int.sparse').on_disk.every(f => !f.startsWith('models/') && !f.startsWith('dags/')), 'a sparse checkout of loader holds no model and no DAG');
eq(C('hist').commits, +X('int.rev_list_count'), 'rev-list --count agrees with the number of commits');
yes(R.meta.git === '2.43.0' && /^\d+\.\d+\.\d+$/.test(R.meta.git_lfs), 'one version of git and one of git-lfs are in the meta');

console.log(fails ? fails + ' of ' + checks + ' checks FAILED' : checks + ' checks passed');
process.exit(fails ? 1 : 0);
