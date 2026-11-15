/* Mission 4: undoing things. Each reset ran in a repository of its own, started from the same three commits. */
(function () {
  var B = LAB.b, G = LAB.get;
  var C = G.counts, X = G.text;
  var UR = G.table('un.reset').rows, LO = C('un.lost'), RC = C('un.recovered'), AM = C('un.amend'), DL = C('un.deleted'), SR = C('un.source'), RS = C('un.restore');
  var PUSHED = 'git reset --hard HEAD~1\ngit push --force origin main\n';
  var row = function (label) { return UR.filter(function (r) { return r[0] === label; })[0]; };
  var START = row('start'), SOFT = row('git reset --soft HEAD~1'), MIXED = row('git reset --mixed HEAD~1'), HARD = row('git reset --hard HEAD~1'), REV = row('git revert HEAD');
  G.expect(START[2] === '0.09' && START[3] === '0.09' && START[4] === '0.09' && START[5] === 3, 'the start has the change in the commit, the index and the file');
  G.expect(SOFT[2] === '0.08' && SOFT[3] === '0.09' && SOFT[4] === '0.09' && SOFT[5] === 2, 'reset --soft moves only the branch');
  G.expect(MIXED[2] === '0.08' && MIXED[3] === '0.08' && MIXED[4] === '0.09', 'reset --mixed also resets the index');
  G.expect(HARD[2] === '0.08' && HARD[3] === '0.08' && HARD[4] === '0.08', 'reset --hard also resets the file');
  G.expect(REV[5] === 4 && REV[4] === '0.08', 'revert adds a commit that undoes the change');
  G.expect(LO.log_after_reset === 1 && LO.file_after_reset === '0.08' && RC.head_is_the_lost_commit === true && RC.log_after_recovery === 3 && RC.file_after_recovery === '0.09', 'the reflog brings back a commit that a hard reset dropped');
  G.expect(AM.id_before !== AM.id_after && AM.commits === 3, 'amend replaces the last commit with a commit that has another id');
  G.expect(RS.file_back === true && DL.file_back === true && SR.rate_in_file === '0.08' && SR.head_moved === false, 'restore brings a file back without moving HEAD');
  G.expect(/unreachable commit/.test(X('un.fsck')), 'fsck lists the commit that no branch holds');

  LAB.addChapter({
    id: 'm4', n: 4, title: 'Undoing mistakes', short: 'Undo', blurb: 'restore, reset, revert and the reflog: what each one touches', minutes: 19,
    focus: ['mart', 'mon'],
    goals: [
      'Pick the right undo for **an edit, a staged file, a commit, and a pushed commit**.',
      'Say how far `git reset --soft, --mixed and --hard` go.',
      'Use `git revert` for **pushed** work.',
      'Find a commit that a reset dropped with the **reflog**.'
    ],
    say: 'Everybody makes mistakes in Git, and almost all of them can be undone. The tools differ in what they touch: the file, the index, the branch, or the history that other people have. We try each one on the same three commits and read where the change ends up.',
    scenes: [
      B.term({
        id: 'm4-restore', t: 1, src: 'rec', title: 'Undo an edit and a staged file',
        say: 'I added a stray line to the readme and staged it. Then I took it back in two steps.',
        lines: function () {
          return G.term([
            ['git add README.md && git status --short', X('un.status_staged')],
            ['git restore --staged README.md && git status --short', X('un.status_after_unstage')],
            ['git restore README.md && git status --short', X('un.status_after_restore')]
          ]);
        },
        after: '`git restore --staged` takes the file **out of the index** and leaves your edit in the file: the status went from `M ` to ` M`. `git restore FILE` then **throws the edit away**: the file is as in the last commit and the status is clean. The second step cannot be undone, because the edit was never committed. Ask yourself whether you want to keep the text before you run it.',
        afterKind: 'warn',
        doneSay: 'restore --staged unstages. restore throws the edit away.'
      }),

      B.flow({
        id: 'm4-flow', t: 1, src: 'docs', title: 'How far a reset goes', g: 'undo', legend: true,
        steps: [
          { say: 'Three places can change in a reset. Press Next.', focus: ['cmd', 'head', 'ix', 'wt'], cap: 'A reset can touch three things.' },
          { say: 'Step 1. Every `git reset` first moves the **branch** to the commit you name. `--soft` stops here: the index and the files are as they were, so the undone commit\'s changes are still staged.', on: ['e1', 'e2'], focus: ['cmd', 'head'], tags: ['tg_soft'], cap: '--soft moves only the branch.' },
          { say: 'Step 2. The default, `--mixed`, also **resets the index** to that commit. The changes are not staged any more, but they are still in your files.', on: ['e3'], focus: ['head', 'ix'], tags: ['tg_mixed'], cap: '--mixed also resets the index.' },
          { say: 'Step 3. `--hard` also **overwrites the files**. Edits that were never committed are gone. This is the one that loses work.', on: ['e3'], focus: ['ix', 'wt'], tags: ['tg_hard'], cap: '--hard also resets the files.' },
          { say: 'The commits that the branch left are not deleted at once. The **reflog** remembers where HEAD was, and that is how you get them back.', focus: ['head'], tags: ['tg_reflog'], cap: 'The reflog remembers.' }
        ]
      }),

      B.widget({ id: 'm4-lab', kind: 'undo', t: 1, src: 'rec', title: 'Lab: where did the change go?' }),

      B.term({
        id: 'm4-reset', t: 1, src: 'rec', title: 'The three resets, from the same start',
        say: 'Three repositories, each with the same three commits. The last commit changed the tax rate to 0.09. I ran a different reset in each and read the rate in the last commit, the index and the file.',
        lines: function () {
          return G.term([
            ['git reset --soft HEAD~1   # rate in the commit / index / file', SOFT[2] + ' / ' + SOFT[3] + ' / ' + SOFT[4] + '   (' + SOFT[5] + ' commits)'],
            ['git reset --mixed HEAD~1', MIXED[2] + ' / ' + MIXED[3] + ' / ' + MIXED[4] + '   (' + MIXED[5] + ' commits)'],
            ['git reset --hard HEAD~1', HARD[2] + ' / ' + HARD[3] + ' / ' + HARD[4] + '   (' + HARD[5] + ' commits)']
          ]);
        },
        after: 'After `--soft` the change is still **staged** (`0.09` in the index and the file). After `--mixed` it is **in the file only**. After `--hard` it is **nowhere** in the working copy. In all three the history lost its last commit. `--soft` is the tool for "I want to commit this again, with a better message or in two pieces". `--mixed` is for "I want to redo the staging". `--hard` is for "I want it gone".',
        afterKind: 'warn',
        doneSay: 'soft keeps it staged, mixed keeps it in the file, hard throws it away.'
      }),

      B.term({
        id: 'm4-revert', t: 1, src: 'rec', title: 'Undo a commit that is already pushed',
        say: 'A reset rewrites history, which is wrong once other people have the commit. `git revert` undoes it with **a new commit**.',
        lines: function () {
          return G.term([
            ['git revert --no-edit HEAD', X('un.revert')],
            ['git log --oneline', X('un.revert_log')]
          ]);
        },
        after: 'The history **grew** by one commit (' + REV[5] + ' commits), and the file has the old rate again (`' + REV[4] + '`). The commit that was undone is still there, and the revert says so in its message. Nothing was rewritten, so everybody who has the old history can simply pull. **Revert is the way to undo anything that has been shared.**',
        afterKind: 'tip',
        doneSay: 'revert adds a commit that undoes another. It rewrites nothing.'
      }),

      B.term({
        id: 'm4-reflog', t: 1, src: 'rec', title: 'Get back a commit that a reset dropped',
        say: 'I ran `git reset --hard HEAD~2`, which dropped two commits and the change of the file. Then I read the reflog and went back.',
        lines: function () {
          return G.term([
            ['git reset --hard HEAD~2', 'HEAD is now at ' + X('un.reflog').split(' ')[0] + ' Add the loader and the daily model'],
            ['git log --oneline | wc -l', String(LO.log_after_reset)],
            ['git reflog', X('un.reflog')],
            ['git reset --hard HEAD@{1}', 'HEAD is now at ' + LO.lost_id + ' Raise the tax rate to 0.09'],
            ['git log --oneline | wc -l', String(RC.log_after_recovery)],
            ['cat loader/tax_rate.txt', RC.file_after_recovery]
          ]);
        },
        after: 'The reset left **one** commit in the log and the old rate in the file (`' + LO.file_after_reset + '`). The **reflog** is a list of where `HEAD` has been, and it still had the lost commit `' + LO.lost_id + '` as `HEAD@{1}`. Resetting to it brought back all **' + RC.log_after_recovery + '** commits and the file (`' + RC.file_after_recovery + '`). The commits were never deleted: no branch pointed to them, but Git kept them. It keeps them for weeks (documentation says 90 days by default for reachable-from-reflog entries, 30 for unreachable ones).',
        afterKind: 'tip',
        doneSay: 'The reflog remembers where HEAD was. A hard reset is not final.'
      }),

      B.term({
        id: 'm4-unreach', t: 2, src: 'rec', title: 'What an unreachable commit looks like',
        say: '`git fsck` looks for objects that no branch, tag or reflog entry reaches. I asked it right after the reset, with the reflog ignored.',
        lines: function () {
          return G.term([['git fsck --unreachable --no-reflogs', X('un.fsck')]]);
        },
        after: 'The dropped commit `' + LO.lost_id + '` is listed as **unreachable commit**, with its trees and blobs. It is still in the object store, and `git cat-file -p` could read it. **`git gc` deletes such objects after the expiry time.** Mission 9 records an object that was there before a gc and gone after it. Until then the reflog, or the id, is your way back.',
        afterKind: 'tip',
        doneSay: 'A dropped commit is unreachable. It is deleted only by gc.'
      }),

      B.term({
        id: 'm4-amend', t: 1, src: 'rec', title: 'Fix the last commit',
        say: 'I amended the last commit, which is not pushed: a better rate and a better message.',
        lines: function () {
          return G.term([
            ['git commit --amend -m "Raise the tax rate to 0.085"   # after staging the new rate', '(the old id was ' + AM.id_before + ')'],
            ['git log --oneline -1', AM.id_after + ' ' + AM.subject],
            ['git rev-list --count HEAD', String(AM.commits)]
          ]);
        },
        after: 'The last commit was **replaced**: it has another id (**' + AM.id_before + ' became ' + AM.id_after + '**), and the history is still ' + AM.commits + ' commits long. An amend is a tiny rebase, so the same rule applies: **only for commits that nobody else has**. The old commit is in the reflog.',
        afterKind: 'warn',
        doneSay: 'amend replaces the last commit. Not for pushed commits.'
      }),

      B.term({
        id: 'm4-clean', t: 1, src: 'rec', title: 'Files that git does not track',
        say: '`git restore` does not touch untracked files. `git clean` does. I always ask with `-n` first.',
        lines: function () {
          return G.term([
            ['git clean -n -d   # a dry run', X('un.clean_n')],
            ['git clean -f -d', X('un.clean_f')],
            ['rm README.md && git status --short', X('un.deleted_status')],
            ['git restore README.md', '(the file is back: ' + DL.file_back + ')'],
            ['git restore --source=HEAD~1 loader/tax_rate.txt && cat loader/tax_rate.txt', SR.rate_in_file]
          ]);
        },
        after: '`git clean -n` **lists** what it would delete, and `-f` deletes it for good: untracked files are in no commit, so no tool can bring them back. A **deleted tracked file** is easy: `git restore` brings it from the last commit. `--source=HEAD~1` takes a file **from an older commit** without moving `HEAD`: the history is unchanged (HEAD moved: ' + SR.head_moved + '), and the file in the working tree now has the old text.',
        afterKind: 'warn',
        doneSay: 'clean deletes untracked files for good. Use -n first.'
      }),

      B.cmp({
        id: 'm4-which', t: 1, src: 'rec', title: 'Which undo for which mistake',
        say: 'One table to keep. Press Next.',
        cols: ['The mistake', 'The tool', 'What it touches', 'Can it be undone?'],
        hl: 1,
        rows: [
          ['An edit you do not want', '`git restore FILE`', 'The file', 'No: the edit was never saved'],
          ['A file staged by mistake', '`git restore --staged FILE`', 'The index', 'Yes, stage it again'],
          ['The last commit, not pushed: wrong message or a missing file', '`git commit --amend`', 'The last commit, which gets a new id', 'Yes, from the reflog'],
          ['Several commits, not pushed, to redo', '`git reset --soft` or `--mixed`', 'The branch, and maybe the index', 'Yes, from the reflog'],
          ['Everything since a commit, not pushed', '`git reset --hard`', 'The branch, the index and the files', 'Commits yes, edits no'],
          ['A commit that is pushed', '`git revert COMMIT`', 'Nothing: it adds a commit', 'Yes, revert the revert'],
          ['Untracked files', '`git clean -f`', 'Files that git does not know', 'No']
        ],
        steps: [
          { upto: 2, say: 'The first two are about the working tree and the index. Only the first one loses text.' },
          { upto: 5, say: 'Commits that only you have can be rewritten, and the reflog is the net under them.' },
          { upto: 7, say: 'Shared commits are reverted, never reset. Untracked files are the one thing that no Git command can restore.' }
        ]
      }),

      B.bug({
        id: 'm4-bug', t: 1, src: 'docs', q: 'A bad commit was pushed to `main` an hour ago and three colleagues have pulled it. This is the plan to undo it. Click the line that makes it dangerous.',
        file: 'undo.sh', lang: 'bash', code: PUSHED, bad: [2],
        hint: 'The first line is a local reset. Which line makes the remote agree with a history that other people do not have?',
        why: 'The reset rewrote **your** history, and the force push makes the remote match it. The three colleagues still have the bad commit, and their next push or pull brings it back, possibly with a merge. Anything that they pushed after the bad commit is **overwritten**. `git revert HEAD` followed by a normal push undoes the change with a new commit that everybody can pull.',
        fix: 'git revert HEAD\ngit push origin main\n',
        cheer: 'Pushed means shared. Share the fix too.'
      }),

      B.order({
        id: 'm4-ord', t: 1, q: 'You ran `git reset --hard` and lost two commits. Put the way back in order.',
        items: [
          'Stop, and do not run `git gc` or make other changes',
          'Run `git reflog` and find the entry from before the reset',
          'Check the entry with `git show HEAD@{1}` or `git log HEAD@{1}`',
          'Make a branch at it with `git branch rescue HEAD@{1}`, or reset to it',
          'Look at the files and the history to confirm that everything is back'
        ],
        why: 'A branch called `rescue` is the safest first step, because it gives the commit a name that nothing will clean up. Then you can reset, merge or cherry-pick from it at your own speed.'
      }),

      B.quiz({
        id: 'm4-q1', t: 1,
        q: 'You run `git reset --mixed HEAD~1`. Where is the change of the undone commit afterwards?',
        opts: [
          { t: 'In the working tree, not staged', fb: '' },
          { t: 'Staged in the index', fb: 'That is `--soft`.' },
          { t: 'Gone', fb: 'That is `--hard`.' },
          { t: 'In a new commit', fb: 'That is `git revert`.' }
        ],
        ok: 0, why: 'The recording: the rate in the file was `' + MIXED[4] + '` and in the index `' + MIXED[3] + '`.'
      }),

      B.quiz({
        id: 'm4-q2', t: 1,
        q: 'A commit is on the remote and others have it. How do you undo its change?',
        opts: [
          { t: '`git revert COMMIT` and a normal push', fb: '' },
          { t: '`git reset --hard` and a force push', fb: 'That rewrites history that others have.' },
          { t: '`git commit --amend` and a force push', fb: 'The same problem, with a new id.' },
          { t: 'Delete the remote branch and push again', fb: 'It has the same effect as the force push, and worse.' }
        ],
        ok: 0, why: 'The revert added a commit (' + REV[5] + ' commits in the history) and rewrote nothing.'
      }),

      B.quiz({
        id: 'm4-q3', t: 1,
        q: 'Which of these can **no** Git command bring back?',
        opts: [
          { t: 'A file of untracked, never committed text that `git clean -f` deleted', fb: '' },
          { t: 'A commit that `git reset --hard` dropped an hour ago', fb: 'The reflog still has it.' },
          { t: 'A file that was committed and then deleted in the working tree', fb: '`git restore` brings it back.' },
          { t: 'An old version of a file from three commits ago', fb: '`git restore --source` brings it back.' }
        ],
        ok: 0, why: 'Git can restore what it has stored. Text that was never staged or committed is in no object, so after `git clean -f` or `git restore FILE` it is gone.'
      }),

      B.decide({
        id: 'm4-dec', t: 2, src: 'docs', title: 'Decision: a bad commit is on main',
        scenario: 'A commit that changed a join in the daily model reached `main` at 14:00 and made the report double-count. It is 15:00. Six people have pulled. The loader runs at 17:00 from `main`.',
        opts: [
          { t: '`git revert` the commit and push, then fix the join properly on a branch', d: 'The report is correct before 17:00. History stays honest, and nobody needs to do anything but pull.', lose: 'The log has a commit and its revert, and the fix comes later as a new commit.' },
          { t: 'Reset `main` to before the commit and force-push', d: 'The history looks as if it never happened.', lose: 'Six clones hold the bad commit. The next push of any of them can bring it back, and their work on top of it is overwritten.' },
          { t: 'Leave it and fix the join in an hour', d: 'No history work.', lose: 'The 17:00 load double-counts and the numbers go to the dashboards.' }
        ],
        pick: 0,
        why: 'The commit is shared, so the tool is `revert`. It is fast, safe, and reversible: if the revert was wrong, revert the revert. Proper fixing can take its time on a branch.',
        when: 'A force push to a protected main is not possible on most platforms, which is a good reason to learn revert first.'
      }),

      B.incident({
        id: 'm4-inc', t: 2, src: 'rec', title: 'Incident: two hours of work vanished', time: '11:05',
        alert: '**Priya ran `git reset --hard HEAD~2` to drop two commits that were wrong, and `git log` now shows one commit.** A third commit, which was right and which she wanted, was one of the two. She has not run anything since.',
        clues: ['The three commits were never pushed', '`git reflog` still lists the commit with its message', 'Nothing has run `git gc` and the repository is one day old'],
        opts: [
          { t: '`git reflog`, find the entry from before the reset, make a branch at it, then cherry-pick or reset', fb: '' },
          { t: 'Re-write the work from memory', fb: 'The commits are still in the repository.' },
          { t: 'Clone the remote again', fb: 'The commits were never pushed, so the remote does not have them.' },
          { t: 'Run `git gc` to recover space and objects', fb: '`gc` deletes unreachable objects. It would make it worse.' }
        ],
        best: 0,
        why: 'The recording shows exactly this: after a `reset --hard HEAD~2` the log had ' + LO.log_after_reset + ' commit and the reflog listed `' + LO.lost_id + '` as `HEAD@{1}`. A reset to that entry brought back all ' + RC.log_after_recovery + ' commits and the file.',
        checks: [
          ['Do not run gc', 'Unreachable objects are only protected by the expiry time.'],
          ['Read the reflog', '`git reflog` lists the old positions of HEAD with their messages.'],
          ['Name the commit', '`git branch rescue HEAD@{1}` gives it a branch that nothing will remove.'],
          ['Take what you want', '`git cherry-pick COMMIT` for the one you need, or reset to the branch.']
        ],
        tell: 'A hard reset dropped commits that were not pushed. The reflog still had them, so I made a branch at the old HEAD, took the commit that was right, and left the wrong ones. Nothing was lost. We agreed to use soft or mixed resets, or a branch, when we are not sure.',
        prevent: ['Make a **branch** before a risky reset', 'Prefer **`--soft` or `--mixed`**', 'Know that the **reflog** exists, and that `gc` ends it']
      }),

      B.qa({
        id: 'qa-reset', t: 1, tag: 'Git', secs: 75,
        q: 'What is the difference between git reset --soft, --mixed and --hard?',
        pts: ['All three move the branch to the given commit', '--soft stops there: the changes stay staged', '--mixed also resets the index: the changes stay in the files', '--hard also resets the files: uncommitted edits are lost'],
        short: 'All three first move the current branch to the commit you name. `--soft` stops there, so the changes of the undone commits are still staged. `--mixed`, the default, also resets the index, so the changes are in your files but not staged. `--hard` also overwrites the files, so uncommitted edits are lost. I recorded all three from the same start: after the soft reset the rate `0.09` was in the index and the file, after the mixed one only in the file, after the hard one nowhere. The commits that a reset drops are not deleted: the reflog lists them for a while, so a hard reset of commits is recoverable and a hard reset of edits is not.',
        fu: [['What is HEAD~1?', 'The parent of HEAD. `HEAD~2` is the grandparent.'], ['Is `reset` safe on pushed commits?', 'No. It rewrites history that others have. Use `revert`.']],
        trap: 'Saying that --hard deletes commits for good.',
        real: 'Describe a reset that you ran, and which flag you used.'
      }),

      B.qa({
        id: 'qa-revert', t: 1, tag: 'Git', secs: 60,
        q: 'How do you undo a commit that is already on main?',
        pts: ['git revert makes a new commit that undoes it', 'History is not rewritten', 'Everybody can pull the fix', 'Reverting a merge needs -m to pick the parent'],
        short: 'With `git revert COMMIT`. It creates a new commit that applies the opposite change, so nothing in history is rewritten and everybody can simply pull it. In my recording the history went from three to four commits, and the file had the old rate again. I use it for anything that is shared, because a reset plus a force push rewrites history that other people have and can overwrite their work. If the revert was wrong I can revert the revert. For a merge commit I must say which parent to keep, with `-m 1`, and after reverting a merge Git remembers that the changes were merged, so merging the branch again needs a revert of the revert first.',
        fu: [['Can you revert several commits?', '`git revert A..B`, or one at a time. From documentation.'], ['What if the revert conflicts?', 'It stops like a merge: resolve, add, `git revert --continue`.']],
        trap: 'Using reset and force push on shared commits.',
        real: 'Describe how you rolled back a bad change on main.'
      }),

      B.qa({
        id: 'qa-reflog', t: 2, tag: 'Git', secs: 60,
        q: 'You lost commits with a hard reset. What can you do?',
        pts: ['The commits are unreachable but still stored', 'git reflog lists where HEAD and branches were', 'Make a branch at the old entry', 'gc removes unreachable objects after the expiry time'],
        short: 'Stay calm and do not run `git gc`. A reset only moves a pointer: the commits are still in the object store, just not reachable from a branch. `git reflog` lists the old positions of `HEAD`, so I find the entry from before the reset, make a branch at it with `git branch rescue HEAD@{1}`, and then reset or cherry-pick from it. In the recording a hard reset left one commit in the log and the reflog still had the dropped one as `HEAD@{1}`; resetting to it brought back three commits. The net has limits: edits that were never committed are in no object, and the reflog is local, so another clone does not have it. `git gc` removes unreachable objects after the expiry time, which is 30 days by default.',
        fu: [['Is the reflog shared?', 'No. It is local to your clone and is not pushed.'], ['How do you find a commit that has no reflog entry?', '`git fsck --lost-found` lists unreachable commits. From documentation.']],
        trap: 'Believing that a hard reset deletes the commits at once.',
        real: 'Describe a time that the reflog saved you.'
      }),

      B.qa({
        id: 'qa-gcexpire', t: 3, tag: 'Git', secs: 60,
        q: 'When does Git really delete a dropped commit?',
        pts: ['When no ref and no reflog entry reaches it', 'After the reflog entries expire (90 days for reachable, 30 for unreachable by default)', 'git gc prunes loose unreachable objects older than gc.pruneExpire (two weeks)', 'git gc --prune=now after reflog expire removes it at once'],
        short: 'Not when you reset. A dropped commit is protected first by the reflog, whose entries expire after 90 days if they are still reachable and 30 days if they are not, and then by the prune expiry: `git gc` deletes loose unreachable objects only when they are older than `gc.pruneExpire`, two weeks by default. In mission 9 I recorded the fast way: `git reflog expire --expire=now --all` and `git gc --prune=now` made an unreachable commit disappear, and a `cat-file` on its id then failed. That is the way to remove a leaked secret from a local repository, and the reason you should not run it while you still need a lost commit. The numbers are the documented defaults, and I did not wait for them.',
        fu: [['Does gc run by itself?', 'Yes, `git gc --auto` runs after some commands when there are many loose objects.'], ['Can a remote still have the commit?', 'Yes. A force-pushed-over commit stays on the server until its own gc.']],
        trap: 'Assuming that a commit disappears at once when you reset.',
        real: 'Say how long your team keeps unreachable commits, and who runs gc.'
      }),

      B.recap({
        id: 'm4-recap', n: 4, badge: 'Undo Pro', color: '#C7D2FE',
        pts: [
          '`restore` for files, `restore --staged` for the index, `amend` for the last commit, `reset` for several commits, `revert` for **pushed** ones.',
          '`--soft` keeps the change **staged**, `--mixed` **in the file**, `--hard` **nowhere**: ' + SOFT[3] + ' / ' + MIXED[4] + ' / ' + HARD[4] + ' in the lab.',
          '`revert` added a commit (' + REV[5] + ' commits) and rewrote nothing.',
          'The **reflog** found the commit `' + LO.lost_id + '` after a hard reset. `gc` ends it.',
          'Untracked files that `git clean -f` deletes are gone for good.'
        ],
        lines: [
          'I choose the undo by what it touches.',
          'I never reset or amend what is pushed.',
          'I make a branch before a risky reset.'
        ]
      })
    ]
  });
})();
