/* Mission 10: boss round. Two drills that mix the missions, a design decision, a coding round, a mock interview and a one-page review. */
(function () {
  var B = LAB.b, G = LAB.get;
  var C = G.counts, X = G.text, n = G.n;
  var ID = C('mr.ids'), MG = C('mg'), RB = C('rb'), SQ = C('sq'), ST = C('cf.stages'), RM = C('cf.rate_markers'), UL = C('un.lost'), UR = C('un.recovered'), AM = C('un.amend');
  var PR = C('rm.push_rejected'), FL = C('rm.force_with_lease'), FO = C('rm.force'), PRB = C('rm.pull_rebase'), BI = C('hist.bisect'), BT = C('hist.bisect_tests'), HR = C('hk.refused'), HC = C('hk.clone');
  var TY = C('tag.types'), TP = C('tag.push'), TS = C('tag.shallow'), TU = C('tag.unshallow'), SZ = C('data.sizes'), CL = C('data.clones'), LB = C('leak.before'), LR = C('leak.rewrite'), LG = C('leak.after_gc'), NB = C('nb'), LF = C('lfs');
  var PK = C('int.pack'), SH = C('int.shallow'), SP = C('int.sparse'), S256 = C('int.sha256'), IGN = C('ign.tracked'), BR = C('br.ref'), DD = C('obj.dedupe');
  var HK = G.file('hooks/pre-commit');
  var QA = [['qa-snapshots', 1], ['qa-index', 1], ['qa-ignore', 2], ['qa-hashfn', 3], ['qa-branch', 1], ['qa-mergerebase', 1], ['qa-squash', 2], ['qa-ort', 3], ['qa-conflict', 1], ['qa-markers', 1],
    ['qa-stages', 2], ['qa-rerere', 3], ['qa-reset', 1], ['qa-revert', 1], ['qa-reflog', 2], ['qa-gcexpire', 3], ['qa-fetchpull', 1], ['qa-rejected', 1], ['qa-lease', 2], ['qa-prune', 3],
    ['qa-bisect', 1], ['qa-stash', 1], ['qa-pick', 2], ['qa-worktree', 3], ['qa-bigfiles', 1], ['qa-secret', 1], ['qa-lfs', 2], ['qa-notebook', 2], ['qa-filterrepo', 3], ['qa-hooks', 1],
    ['qa-tags', 1], ['qa-ci', 2], ['qa-signing', 3], ['qa-protected', 3], ['qa-store', 2], ['qa-clones', 1], ['qa-sha', 3]];

  LAB.addChapter({
    id: 'm10', n: 10, title: 'Boss round', short: 'Boss round', blurb: 'Two drills, a design decision, a coding round, a mock interview and a one-page review', minutes: 31,
    focus: ['src', 'stg', 'ing', 'mart', 'air', 'mon', 'qual', 'ci'],
    goals: [
      'Solve **drills** that combine several missions.',
      'Write a **pre-commit hook** from a list of requirements.',
      'Answer a **mock interview round** with a timer, and grade yourself honestly.',
      'Keep a **one-page review** of the rules and the recorded numbers.'
    ],
    say: 'This is the last mission. Two drills in which more than one thing goes wrong, one design decision, one coding round, and then the interview questions with no notes. Grade yourself honestly. An honest grade is the only one worth reading.',
    scenes: [
      B.incident({
        id: 'm10-inc1', t: 1, src: 'rec', title: 'Drill: refused, forced, and then lost', time: '17:30',
        alert: '**Maya\'s push was refused with `fetch first`. She ran `git push --force`, and it worked. Omar now says his commit is gone from `main`. Maya tried to fix it with `git reset --hard HEAD~1` and says her own last commit has vanished from her log.**',
        clues: ['The push report says `forced update`', 'Omar\'s commit is in his clone and in his reflog', '`git reflog` in Maya\'s clone still lists her dropped commit'],
        opts: [
          { t: 'Two repairs. Omar pushes his commit again on a branch, and Maya makes a branch at her dropped commit from the reflog. Then combine all three lines on `main`, and protect `main`', fb: '' },
          { t: 'Force-push again from Omar\'s clone to put his commit back', fb: 'It overwrites Maya\'s newest work in turn.' },
          { t: 'Run `git gc` in both clones to tidy up', fb: '`gc` removes unreachable commits. It would delete the dropped one.' },
          { t: 'Everybody deletes their clone and clones again', fb: 'Omar\'s commit and Maya\'s dropped commit exist only in the old clones.' }
        ],
        best: 0,
        why: 'Three things happened, and each has a recorded answer. The first push was refused because the remote had newer work (exit code ' + PR.rc + '). The `--force` printed `forced update` and replaced `main`, but the commit still existed on the remote (' + FO.omar_commit_still_on_remote + ') and in Omar\'s clone. And the hard reset dropped a commit that the reflog kept: `' + UL.lost_id + '` was `HEAD@{1}` in the recording. `--force-with-lease` would have answered `stale info`.',
        checks: [
          ['Stop and protect', 'No gc, no more pushes. Nobody deletes a clone.'],
          ['Find the commits', 'Omar: `git log` or his reflog. Maya: `git reflog`, then `git branch rescue HEAD@{1}`.'],
          ['Put them back', 'Push Omar\'s commit on a branch, and combine the three lines with a rebase or a merge, by the normal route.'],
          ['Prevent', 'Protect `main` on the server, and use `--force-with-lease`.']
        ],
        tell: 'Maya\'s push was refused, and she forced it, which replaced main and dropped Omar\'s commit. Her hard reset then dropped her own commit. Omar still had his commit and her reflog still had hers, so we put both back on branches and combined them. We protected main and moved to force-with-lease.',
        prevent: ['**Protect** shared branches on the server', '`--force-with-lease`, never plain `--force`', 'A **branch before a risky reset**']
      }),

      B.incident({
        id: 'm10-inc2', t: 2, src: 'rec', title: 'Drill: the build is called 0.0.0 and the tag is missing', time: '10:00',
        alert: '**The release build of the loader is named `0.0.0-unknown`, and `git describe` in CI says `No names found, cannot describe anything`.** The release manager tagged `v1.2.0` an hour ago and says she pushed.',
        clues: ['She ran `git tag -a v1.2.0 -m ...` and then `git push origin main`', 'The CI job uses the default checkout step', '`git ls-remote --tags origin` lists no `v1.2.0`'],
        opts: [
          { t: 'Two causes. Push the tag (`git push origin v1.2.0` or `--follow-tags`), and fetch the full history and the tags in CI (`fetch-depth: 0`)', fb: '' },
          { t: 'Move the tag to a newer commit and push', fb: 'The tag is not missing because of its position. It was never pushed, and CI cannot see history.' },
          { t: 'Hard-code the version in the build', fb: 'It works once and the version drifts from the code.' },
          { t: 'Run `git gc` in CI', fb: 'The problem is what was fetched, not how it is stored.' }
        ],
        best: 0,
        why: 'Both causes were recorded. A plain `git push origin main` sent **' + (TP.after_plain_push.length) + ' tags**, and `--follow-tags` sent `' + TP.after_follow_tags.join(' ') + '`. And a depth-1 clone had ' + TS.commits + ' commit and ' + TS.tags_in_the_clone.length + ' tags, so `git describe` failed with `' + X('tag.describe_shallow') + '`; after `--unshallow --tags` it printed `' + X('tag.describe_full') + '`.',
        checks: [
          ['Ask the remote', '`git ls-remote --tags origin` shows whether the tag is there.'],
          ['Push the tag', '`git push origin v1.2.0`, or `--follow-tags` for annotated tags.'],
          ['Fix the checkout', '`fetch-depth: 0`, or fetch the tags in a later step.'],
          ['Prevent', 'Have CI build only from tags, and protect release tags on the server.']
        ],
        tell: 'There were two causes. The release tag had never left her laptop, because a plain push does not send tags, and the CI checkout was shallow, so describe had no history to name a version from. I pushed the tag, set fetch-depth to zero, and made the release job build from tags only.',
        prevent: ['`--follow-tags` or an explicit **tag push**', '**`fetch-depth: 0`** for jobs that read history', 'Build releases **from tags**']
      }),

      B.decide({
        id: 'm10-dec', t: 2, src: 'docs', title: 'Decision: how to stop secrets from reaching the repository',
        scenario: 'Brewline has had two leaked keys in two years. Twelve people commit. Some work on laptops that the company does not manage. The platform offers CI and protected branches. The team already uses a cloud secret manager for production.',
        opts: [
          { t: 'Layers: `.env` in `.gitignore`, a hook kept in the repository, a secret scan in CI that blocks merges, and secrets read from the secret manager', d: 'Each layer catches what the one before it misses. The CI scan cannot be skipped from a laptop. Nothing sensitive needs to be in a file at all.', lose: 'Some setup, and false alarms to tune.' },
          { t: 'A hook only, installed by each person', d: 'Quick feedback.', lose: 'Mission 8 recorded it: a clone has no hooks, and `--no-verify` skips them. A new laptop is unprotected.' },
          { t: 'Rotate every key every quarter and rely on that', d: 'Limits the age of any leak.', lose: 'A leaked key works for up to three months, and rotation does not tell you that it leaked.' }
        ],
        pick: 0,
        why: 'A hook is convenient and skippable, CI is enforceable but late, and a secret manager removes the files that leak. Together they cover the laptop, the server and the cause. Rotation is a good habit on top, not a replacement. The scanner and the platform settings are from documentation: only the hook ran in the course.',
        when: 'A team of two, with no unmanaged machines, can start with `.gitignore`, the secret manager and a CI scan.'
      }),

      B.challenge({
        id: 'm10-ch', t: 1, title: 'Coding round: the pre-commit hook', file: 'hooks/pre-commit', lang: 'bash',
        q: 'Write the **pre-commit hook** of the Brewline repository. It must look at the **staged** changes only, at the **lines that are added**, refuse the commit when an added line contains an **AWS access key id** (`AKIA` followed by at least 8 capital letters or digits) or `token = ` followed by 16 or more letters or digits, print one line that says why, and **exit with 1**. It must exit with **0** otherwise.',
        starter: '#!/bin/sh\n# ...',
        hints: ['`git diff --cached -U0` prints the staged changes with no context lines. Added lines start with `+`.', 'Use `grep -E` with the two patterns joined by `|`, and send the output to `/dev/null`: you only need the exit code.', 'The script must `exit 1` after `echo`, and needs no `exit 0` at the end, because the exit code of the last command is the exit code of the script.'],
        sol: HK,
        res: { cols: ['check', 'what the recording printed'], rows: [['the commit with a key in it', X('hk.refused')], ['commits in the history after the refusal', String(HR.commits)], ['exit code of the hook', String(HR.rc)], ['hooks that a clone gets', String(HC.hooks_in_the_clone.length)]], msg: 'from the recording' },
        expl: ['`git diff --cached -U0` is the staged change with no context, so only the lines of this commit are looked at.', '`grep -E` with two patterns finds an AWS style key or a token. The output goes to `/dev/null`, because only the exit code matters.', 'The hook prints why and **exits with 1**, which cancels the commit. Any other path ends with the exit code of the last command, 0 or 1 from `if`.'],
        cx: 'The hook is a convenience: keep it in the repository and set `core.hooksPath`, and repeat the check in CI, because a clone has no hooks and `--no-verify` skips them.'
      })
    ].concat(B.mockRound(QA.map(function (x) { return x[0]; }), QA.map(function (x) { return x[1]; }))).concat([
      B.cheat({
        id: 'm10-cheat', t: 1, src: 'rec', title: 'One page to review',
        say: 'This is your last-minute review. Every number comes from the recording in real Git ' + G.meta('git') + '. Items marked (docs) come from documentation and were not run. Take a screenshot or print the page.',
        sections: [
          { h: 'Commits and the three areas', items: ['A commit points to a tree, a tree to blobs, a commit to its parent. Ids are 40 characters, the hash of the content. The same text twice: ' + DD.blobs_after_adding_a_copy + ' blobs before and after', '`git diff`: working tree against index. `git diff --staged`: index against commit. `MM` is staged and then edited again', 'Ignore rules apply to untracked files. A tracked file needs `git rm --cached` (status `' + IGN.status + '`, then `' + IGN.status_after_rm_cached + '`)'] },
          { h: 'Branches, merge and rebase', items: ['A branch is a file of ' + BR.file_bytes + ' bytes with a commit id. HEAD says which branch you are on', 'Fast-forward: a pointer moves. Merge: one commit, ' + MG.parents + ' parents, ids kept. Rebase: ' + ID.F1 + ' became ' + ID.F1r + ', ' + ID.F2 + ' became ' + ID.F2r + '. Squash: ' + SQ.commits + ' commits, ' + SQ.merge_commits + ' merge commits, and `branch -d` refuses', 'Never rebase commits that others have'] },
          { h: 'Conflicts', items: ['`UU` in the status. The index holds stages 1, 2 and 3 (' + ST.stage_numbers.join(', ') + '): base, ours, theirs', 'Resolve, test, `git diff --check`, `git add`, commit. Or `git merge --abort`. In a rebase the sides swap', 'A file with markers is not valid data: ' + (RM.loader_reads_it ? '' : 'the loader failed with a ValueError')] },
          { h: 'Undo', items: ['`--soft` keeps the change staged, `--mixed` in the file, `--hard` nowhere. `revert` adds a commit and rewrites nothing', 'A hard reset left ' + UL.log_after_reset + ' commit, and the reflog brought back ' + UR.log_after_recovery + '. `amend`: ' + AM.id_before + ' became ' + AM.id_after, '`git clean -f` deletes untracked files for good. gc ends the reflog net'] },
          { h: 'Remotes', items: ['A push is accepted only if it adds. `fetch first`: fetch, combine, test, push. `pull --rebase`: ' + PRB.merge_commits + ' merge commits', '`--force-with-lease` answered `stale info`. `--force` printed `forced update`, and Omar\'s commit left `main` while it still existed (' + FO.omar_commit_still_on_remote + ')', 'Protect shared branches on the server (docs)'] },
          { h: 'History tools', items: ['`log -S`, `blame`, `log` with a path. `bisect run`: ' + BT.commits + ' commits, ' + BI.steps + ' tests, a check that exits non-zero on bad', '`cherry-pick` gives a new id. A branch cannot be in two worktrees. `stash` parks edits'] },
          { h: 'Data in a repository', items: ['Appended CSV: ' + n(SZ.append.after_gc_kib) + ' KiB for 7 versions. Re-sorted: ' + n(SZ.rewrite.after_gc_kib) + ' KiB (' + SZ.rewrite.times_the_file + ' copies). Clones: full ' + n(CL.full.kib) + ', shallow ' + n(CL.depth1.kib) + ', blobless ' + n(CL.blobless.kib) + ' KiB', 'A deleted key is still in history (' + LB.found_in_history + ' commits). Rewrite plus gc removes the local object (' + (LG.old_blob_still_in_the_repository ? 'still there' : 'gone') + '). Revoke first', 'A notebook rerun changed ' + NB.lines_changed_after_rerun + ' lines. LFS pointer: ' + LF.pointer_bytes + ' bytes'] },
          { h: 'Workflow', items: ['A hook can be skipped (`--no-verify`), and a clone has ' + HC.hooks_in_the_clone.length + ' hooks. Repeat the check in CI. `core.hooksPath` points at a folder in the repository', 'Annotated tags are objects (`' + TY.annotated + '`). A plain push sends ' + TP.after_plain_push.length + ' tags, `--follow-tags` sent `' + TP.after_follow_tags.join(' ') + '`', 'A shallow clone has ' + TS.commits + ' commit and no tags: `describe` failed. `fetch-depth: 0`'] },
          { h: 'Inside', items: ['Loose objects become a pack: ' + PK.objects + ' objects in ' + PK.packs + ' pack, ' + PK.delta_objects + ' as deltas', 'Shallow ' + SH.commits_with_depth_3 + ' of ' + SH.commits_after_unshallow + ' commits. Sparse ' + SP.files_on_disk + ' of ' + SP.tracked_files + ' files. SHA-256 ids have ' + S256.id_chars + ' characters'] }
        ]
      }),

      B.recap({
        id: 'm10-recap', n: 10, badge: 'Git Partner', color: '#BAE6FD',
        pts: [
          'You can explain a **commit, the index and the three areas**, and read `status` and `diff`.',
          'You can **branch, merge, rebase and squash**, and say what each does to the ids.',
          'You can **resolve a conflict**, undo a mistake with the right tool, and recover with the **reflog**.',
          'You can read a **refused push**, and use **force-with-lease** and protected branches.',
          'You can keep **data, secrets and notebooks** out of trouble, and use **hooks, tags and CI**.'
        ],
        lines: [
          'I can explain what Git did, and why that command.',
          'I can recover from my own mistakes.',
          'I can talk to the people who run the platform.'
        ]
      })
    ])
  });
})();
