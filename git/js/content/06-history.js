/* Mission 6: history as a tool. A real repository with 16 commits, one of which changed a tax rate to 0.8 by mistake. */
(function () {
  var B = LAB.b, G = LAB.get;
  var C = G.counts, X = G.text;
  var H = C('hist'), BI = C('hist.bisect'), BT = C('hist.bisect_tests'), PK = C('hist.pick'), ST = C('hist.stash'), WT = C('hist.worktree'), CK = G.file('checks/check.sh');
  var BADCHECK = '#!/bin/sh\npython3 loader/load_orders.py data/orders.csv\necho "load finished"\n';
  G.expect(H.commits === 16 && H.bad_position === 12, 'the repository has 16 commits and the bad one is the 12th');
  G.expect(BI.is_the_bad_commit === true && BI.found === H.bad_commit && BI.steps === BT.tests.length && BI.steps === 4, 'bisect run found the bad commit in four tests');
  G.expect(BT.tests.filter(function (t) { return t[0] === 'bad'; }).length === 1 && BT.tests[BT.tests.length - 1][0] === 'good', 'one test failed, and the last test passed on the commit before the bad one');
  G.expect(/Raise the tax rate to 0\.8/.test(X('hist.log_S')) && X('hist.log_S').indexOf(H.bad_commit) === 0, 'log -S finds the commit that introduced the text 0.8');
  G.expect(PK.different_id === true && PK.same_subject === true, 'a cherry-picked commit has the same subject and another id');
  G.expect(ST.clean_after_push === true && /half done readme/.test(X('hist.stash_list')), 'a stash cleans the working tree and is listed');
  G.expect(WT.folders === 2 && WT.branch_checked_out_twice === true && /already used by worktree/.test(X('hist.worktree_twice')), 'a branch cannot be checked out in two worktrees');

  LAB.addChapter({
    id: 'm6', n: 6, title: 'History as a tool', short: 'History', blurb: 'log, blame, bisect, cherry-pick, stash and worktrees: find out what happened, and move work around', minutes: 20,
    focus: ['mon', 'mart'],
    goals: [
      'Find **who changed what and when** with `log`, `log -S` and `blame`.',
      'Find the commit that broke a check with **`git bisect run`**.',
      'Move one commit to another branch with **cherry-pick**.',
      'Park work with **stash** and work on two branches with **worktrees**.'
    ],
    say: 'A repository is a record of every change, and Git has tools to ask it questions. The nightly check has failed since Monday, and the repository has sixteen commits since it last passed. We ask for the commit that changed a number, for the person who wrote a line, and we let Git find the guilty commit by itself, in four tests.',
    scenes: [
      B.term({
        id: 'm6-log', t: 1, src: 'rec', title: 'Ask the log',
        say: 'The repository has sixteen commits by Maya and Omar. I asked the log in four ways.',
        lines: function () {
          return G.term([
            ['git log --oneline -8', X('hist.log')],
            ['git log --stat --format="%h %an: %s" -3', X('hist.log_stat')],
            ['git log --oneline -- loader/tax_rate.txt', X('hist.log_path')],
            ['git shortlog -sn', X('hist.shortlog')]
          ]);
        },
        after: '`--oneline` is the short view. `--stat` adds the files that each commit touched. Naming a **path** after two dashes limits the log to commits that changed that file: three commits changed the tax rate, the last of them `' + H.bad_commit + '`. `shortlog -sn` counts commits for each author. These four are enough for most questions about "what happened here".',
        afterKind: 'tip',
        doneSay: 'log with a path shows the history of one file.'
      }),

      B.term({
        id: 'm6-pickaxe', t: 1, src: 'rec', title: 'Who introduced this text',
        say: 'The check says the tax rate is not plausible. Which commit put `0.8` into the repository? `git log -S` searches the changes for a string, and `git blame` shows the commit of each line.',
        lines: function () {
          return G.term([
            ['git log --oneline -S0.8', X('hist.log_S')],
            ['git blame -s --date=short loader/tax_rate.txt', X('hist.blame')],
            ['git blame --date=short -L1,4 models/orders_daily.sql', X('hist.blame_model')]
          ]);
        },
        after: '`-S0.8` is the **pickaxe**: it lists the commits in which the number of occurrences of `0.8` **changed**. One commit matched, `' + H.bad_commit + '`. `git blame` prints, for **each line**, the commit that last changed it, the author and the date. Lines with a `^` in front come from the first commit of the repository. Blame says **who last touched a line**, not who is responsible: the author may have moved it, or reformatted it.',
        afterKind: 'tip',
        doneSay: 'log -S finds when a text appeared. blame says who last changed a line.'
      }),

      B.flow({
        id: 'm6-bisect', t: 1, src: 'docs', title: 'Bisect: halve the suspects', g: 'bisect', legend: true,
        steps: [
          { say: 'Sixteen commits. The check passed on the first one and fails on the last one. Which commit broke it? Press Next.', focus: ['c1', 'c16'], tags: ['tg_good', 'tg_bad'], cap: 'First good, last bad.' },
          { say: 'Step 1. Git checks out the commit **in the middle** and runs your check. If it passes, everything before it is good and cleared. If it fails, everything after is cleared of blame as the cause, and the culprit is this commit or earlier.', focus: ['c1', 'c8', 'c16'], tags: ['tg_test'], cap: 'Test the middle.' },
          { say: 'Step 2. Each answer removes **about half** of the suspects. After the first test the culprit is between 8 and 16. Then Git tests the middle of that, again and again.', focus: ['c8', 'c12', 'c16'], cap: 'Half of them go at each step.' },
          { say: 'Step 3. After a few tests only two neighbours are left: the last good commit and the first bad one. The first bad one is the answer.', focus: ['c10', 'c11', 'c12'], cap: 'Two neighbours are left.' },
          { say: 'The number of tests is about **log2 of the number of commits**: sixteen commits need four, a thousand need ten. It works with any check that exits with 0 when good and non-zero when bad.', focus: ['c1', 'c16'], cap: 'The cost grows with the logarithm.' }
        ]
      }),

      B.code({
        id: 'm6-check', t: 1, src: 'rec', title: 'The check that bisect runs', file: 'checks/check.sh', lang: 'bash', code: CK,
        steps: [
          { say: 'A small script. Git only cares about its **exit code**. Press Next.', lines: null },
          { say: 'It reads the tax rate from the file that the loader reads.', lines: G.span(CK, /rate=/) },
          { say: 'If the rate is above 0.25 the script prints a message and **exits with 1**: bad.', lines: G.span(CK, /if awk/, /exit 1/) },
          { say: 'Otherwise it prints a message and ends with the exit code of its last command, **0**: good.', lines: G.span(CK, /echo "check passed/) }
        ],
        note: 'Exit code 125 means "this commit cannot be tested", and bisect skips it. A check must exit with 0 for good and 1 to 127 (except 125) for bad.'
      }),

      B.term({
        id: 'm6-bisectrun', t: 1, src: 'rec', title: 'git bisect run',
        say: 'I told Git the last commit is bad and the first is good, and let it run the check by itself.',
        lines: function () {
          return G.term([
            ['git bisect start && git bisect bad HEAD && git bisect good ' + '$(git rev-list --max-parents=0 HEAD)', '(' + BT.commits + ' commits, the first good and the last bad)'],
            ['git bisect run sh checks/check.sh', X('hist.bisect_run')],
            ['git bisect reset', '(back on main)']
          ]);
        },
        after: 'Git tested **' + BI.steps + ' commits** out of ' + BI.commits_between + ' in between and named the first bad one: **`' + BI.found + '`, "Raise the tax rate to 0.8 (a typo)"**. A person would have read sixteen diffs. `git bisect reset` returns to where you started. It is only as good as the check: if the check fails for a different reason on some commit, bisect points at the wrong commit.',
        afterKind: 'tip',
        doneSay: 'bisect run finds the first bad commit with log2 of n tests.'
      }),

      B.widget({ id: 'm6-lab', kind: 'bisect', t: 1, src: 'rec', title: 'Lab: four tests for sixteen commits' }),

      B.term({
        id: 'm6-pick', t: 1, src: 'rec', title: 'Move one commit to another branch',
        say: 'A release branch was cut six commits back. One commit from `main` is needed there. `git cherry-pick` copies it.',
        lines: function () {
          return G.term([
            ['git switch -c release HEAD~6', '(a branch at an older commit)'],
            ['git cherry-pick ' + PK.original, '[release ' + PK.copy + '] ' + PK.subject],
            ['git log --oneline -1', PK.copy + ' ' + PK.subject]
          ]);
        },
        after: 'The commit `' + PK.original + '` was **copied** onto `release`: the copy has the same subject and the same change, and a different id (**`' + PK.copy + '`**), because its parent is different. It is the same mechanism as a rebase, for one commit. Use it for a **hotfix** that must go to a release branch. Use it with care: the same change now exists twice, and a later merge of the two branches may show a conflict that is really a duplicate.',
        afterKind: 'tip',
        doneSay: 'cherry-pick copies one commit. The copy has a new id.'
      }),

      B.term({
        id: 'm6-stash', t: 1, src: 'rec', title: 'Park unfinished work',
        say: 'I edited the readme and then had to look at something else. `git stash` puts the edit aside.',
        lines: function () {
          return G.term([
            ['git stash push -m "half done readme"', X('hist.stash_push')],
            ['git status --short', '(nothing: the working tree is clean)'],
            ['git stash list', X('hist.stash_list')],
            ['git stash pop', X('hist.stash_pop')]
          ]);
        },
        after: 'The stash saved the edit and **cleaned the working tree**, so I could switch branches. `git stash list` shows what is parked. `git stash pop` brought the edit back and **dropped** the stash entry. A stash is a commit that no branch holds, so it is easy to forget: do not leave work there for weeks. Untracked files are not stashed unless you add `-u`.',
        afterKind: 'tip',
        doneSay: 'stash parks edits. pop brings them back.'
      }),

      B.term({
        id: 'm6-worktree', t: 2, src: 'rec', title: 'Two branches, two folders',
        say: 'A hotfix must be built while a long job is running in the first folder. A **worktree** gives the same repository a second working folder, on another branch.',
        lines: function () {
          return G.term([
            ['git worktree add ../hist_hotfix -b hotfix main', '(a new folder with its own working tree)'],
            ['git worktree list', X('hist.worktree_list')],
            ['git switch hotfix   # in the first folder', X('hist.worktree_twice')]
          ]);
        },
        after: 'Both folders share **one** `.git` store, so there is no second clone and nothing to download. Each folder has its own branch and its own files. Git **refuses to check out the same branch in two folders**, which protects you from two editors writing to one branch. Remove a worktree with `git worktree remove`. It is a tidy way to review a pull request without disturbing your own work.',
        afterKind: 'tip',
        doneSay: 'A worktree is a second folder on the same repository.'
      }),

      B.cmp({
        id: 'm6-find', t: 1, src: 'rec', title: 'Which tool finds what',
        say: 'Four questions, four tools. Press Next.',
        cols: ['You want to know', 'Use', 'Recorded result'],
        hl: 1,
        rows: [
          ['What changed in this file over time', '`git log -p FILE` or `git log --oneline` with the path', '3 commits changed the tax rate'],
          ['When did this text appear or disappear', '`git log -S"text"`', 'One commit: ' + H.bad_commit],
          ['Who last changed each line', '`git blame FILE`', 'The author and date of each line'],
          ['Which commit broke a check', '`git bisect run COMMAND`', BI.steps + ' tests for ' + BT.commits + ' commits']
        ],
        steps: [
          { upto: 2, say: 'The first two read the history for a file or a string.' },
          { upto: 4, say: 'Blame is for the line. Bisect is for the behaviour, and it needs a check that can say good or bad.' }
        ]
      }),

      B.bug({
        id: 'm6-bug', t: 2, src: 'docs', q: 'This check is given to `git bisect run`. Every commit comes out as good, even the one with the typo. Click the line that is the problem.',
        file: 'checks/check.sh', lang: 'bash', code: BADCHECK, bad: [3],
        hint: 'What is the exit code of a script? Which command runs last?',
        why: 'The exit code of a script is the exit code of its **last command**. `echo` always succeeds, so the script exits with 0 whatever the loader did, and bisect sees "good" for every commit and finds nothing. The check must fail when something is wrong: let the loader\'s code be the last one, or use `set -e`.',
        fix: '#!/bin/sh\nset -e\npython3 loader/load_orders.py data/orders.csv\necho "load finished"\n',
        cheer: 'The check decides. Make it able to fail.'
      }),

      B.order({
        id: 'm6-ord', t: 1, q: 'The nightly check fails on `main` and passed last Friday. Put the steps of finding the cause in order.',
        items: [
          'Find the last commit where the check passed: a tag, a green CI run, or last Friday\'s id',
          '`git bisect start`, then `git bisect bad` and `git bisect good LAST_GOOD`',
          '`git bisect run sh checks/check.sh`',
          'Read the commit that Git names, and its diff with `git show`',
          '`git bisect reset` to go back to your branch'
        ],
        why: 'Bisect needs one good and one bad commit as the ends, and a check that exits non-zero on the bad ones. The reset at the end matters: until you do it, your working tree is on an old commit.'
      }),

      B.quiz({
        id: 'm6-q1', t: 1,
        q: 'The history has 1,000 commits between a good and a bad one. About how many tests does `git bisect` need?',
        opts: [
          { t: 'About 10: each test halves the suspects', fb: '' },
          { t: 'About 500: half of them', fb: 'Bisect halves what is left at each step, so the count grows with a logarithm.' },
          { t: '1,000: one for each commit', fb: 'That is what a linear search needs.' },
          { t: 'Exactly 1: Git can see the cause', fb: 'Git only runs your check.' }
        ],
        ok: 0, why: 'In the recording ' + BT.commits + ' commits needed ' + BI.steps + ' tests. A thousand commits need about ten.'
      }),

      B.quiz({
        id: 'm6-q2', t: 1,
        q: 'You cherry-pick a commit from `main` onto `release`. What is true about the copy?',
        opts: [
          { t: 'It has the same change and message, and a different id', fb: '' },
          { t: 'It has the same id, because the content is the same', fb: 'The parent differs, so the id differs.' },
          { t: 'It is a link to the original commit', fb: 'It is a new, independent commit.' },
          { t: 'It moves the original from `main`', fb: 'The original stays where it was.' }
        ],
        ok: 0, why: 'The recording: `' + PK.original + '` on `main` and `' + PK.copy + '` on `release`, both with the subject "' + PK.subject + '".'
      }),

      B.quiz({
        id: 'm6-q3', t: 1,
        q: '`git blame` says that line 3 of a model was last changed by Omar. What does that prove?',
        opts: [
          { t: 'Only that his commit touched the line last. He may have moved or reformatted it', fb: '' },
          { t: 'That Omar wrote the logic of the line', fb: 'He may only have changed the spacing.' },
          { t: 'That Omar introduced the bug', fb: 'Blame does not say anything about a bug.' },
          { t: 'That nobody else has seen the line', fb: 'The history can have many authors for earlier versions.' }
        ],
        ok: 0, why: 'Blame is the **last** change to a line. To go further back, ask for the history of the line with `git log -L` or blame the parent commit.'
      }),

      B.decide({
        id: 'm6-dec', t: 2, src: 'docs', title: 'Decision: getting a hotfix onto a release branch',
        scenario: 'A bug in the loader was fixed on `main` in one small commit. The release branch `release-1.4` is what runs in production and must get only this fix. Main also has twenty other changes that are not ready.',
        opts: [
          { t: 'Cherry-pick the fix commit onto `release-1.4`', d: 'Only the fix goes. The release stays exactly as tested, plus one commit.', lose: 'The fix exists twice, with two ids. A later merge may show a duplicate conflict.' },
          { t: 'Merge `main` into `release-1.4`', d: 'One command, and the history is joined.', lose: 'It brings the twenty other changes into production.' },
          { t: 'Retype the fix by hand on the release branch', d: 'No Git feature needed.', lose: 'There is no record that it is the same change, and typos happen.' }
        ],
        pick: 0,
        why: 'A cherry-pick moves exactly one change and keeps the message and the author. The duplicate is a known cost, and many teams write the id of the original in the message with `git cherry-pick -x`.',
        when: 'If the release branch is meant to follow main closely, merging main into it regularly is better than cherry-picking.'
      }),

      B.incident({
        id: 'm6-inc', t: 2, src: 'rec', title: 'Incident: the nightly check has failed since Monday', time: '08:45',
        alert: '**`checks/check.sh` fails with `tax rate 0.8 is not plausible`.** The last green night was Friday. Since then sixteen commits from four people reached `main`, and nobody knows which one did it.',
        clues: ['`cat loader/tax_rate.txt` says `0.8`', 'The Friday commit is known and the check is a script that exits with 1 when bad', '`git log -S0.8` lists one commit'],
        opts: [
          { t: '`git bisect run sh checks/check.sh` between Friday and now, then fix or revert the commit that it names', fb: '' },
          { t: 'Read all sixteen diffs, one at a time', fb: 'It works, but a bisect takes four tests.' },
          { t: 'Revert every commit since Friday', fb: 'It undoes fifteen good changes to remove one bad one.' },
          { t: 'Change the check so that it accepts 0.8', fb: 'That hides a real error in the data.' }
        ],
        best: 0,
        why: 'The recording ran exactly this: ' + BT.commits + ' commits, ' + BI.steps + ' tests, and the answer `' + BI.found + '` ("Raise the tax rate to 0.8 (a typo)"). `git log -S0.8` gave the same commit from the other side.',
        checks: [
          ['Find the ends', 'Last good: Friday\'s id or tag. First bad: `main`.'],
          ['Run bisect', '`git bisect run sh checks/check.sh`.'],
          ['Read the commit', '`git show COMMIT` and the author\'s intention.'],
          ['Fix', 'A new commit with the right value, or `git revert`, and a test for a plausible range.']
        ],
        tell: 'The nightly check failed because of a tax rate that had a typo. I used git bisect with the check script between Friday and main, and it named the commit in four tests. I fixed the value in a new commit and added a range check to the loader.',
        prevent: ['A check that **exits non-zero** on bad data', '**Tag** or note the last good commit', 'Small commits, so that a bisect points at one idea']
      }),

      B.qa({
        id: 'qa-bisect', t: 1, tag: 'Git', secs: 75,
        q: 'How do you find the commit that introduced a bug?',
        pts: ['git bisect does a binary search over the history', 'You give it a good and a bad commit and a check', 'git bisect run automates it with a script that exits 0 or non-zero', 'It needs about log2(n) tests'],
        short: 'With `git bisect`. I mark a commit where it worked as good and one where it fails as bad, and Git checks out the commit in the middle. I run my check, say good or bad, and Git halves the range again, until it names the first bad commit. With `git bisect run` I give it a script that exits 0 when the commit is good and non-zero when it is bad, and the whole search is automatic. In my recording there were sixteen commits and Git needed ' + BI.steps + ' tests to name the commit that changed a tax rate to 0.8. It needs a check that can fail, small commits so that the answer is one idea, and a clean working tree. I finish with `git bisect reset`.',
        fu: [['What if a commit does not build?', 'The script exits with 125 to skip it. From documentation.'], ['What else finds a change?', '`git log -S` for a string and `git blame` for a line.']],
        trap: 'Reading every commit by hand, or writing a check that always succeeds.',
        real: 'Describe a time you tracked a regression to a commit.'
      }),

      B.qa({
        id: 'qa-stash', t: 1, tag: 'Git', secs: 60,
        q: 'What is git stash and when do you use it?',
        pts: ['It saves your uncommitted edits and cleans the working tree', 'You can switch branch and come back', 'git stash pop restores and drops the entry', 'It is not a place to keep work for weeks'],
        short: '`git stash` saves the uncommitted changes of tracked files and puts the working tree back to the last commit. I use it when I must switch branches in the middle of something, for example for an urgent fix. `git stash list` shows what is parked, and `git stash pop` brings the changes back and drops the entry, as in my recording where the readme edit left and came back. A stash is a commit that no branch holds, so it is easy to forget and a clean-up can lose it. Untracked files need `-u`. For anything that takes more than a short break I prefer a work-in-progress commit on a branch, or a worktree, which are visible and named.',
        fu: [['What if the pop conflicts?', 'The entry stays, and you resolve like a merge. From documentation.'], ['Is a stash shared?', 'No, it is local to your clone.']],
        trap: 'Keeping weeks of work in a stash.',
        real: 'Say how you handle an interruption in the middle of a change.'
      }),

      B.qa({
        id: 'qa-pick', t: 2, tag: 'Git', secs: 60,
        q: 'What does cherry-pick do, and what is the drawback?',
        pts: ['It applies the change of one commit onto the current branch as a new commit', 'The copy has the same message and a different id', 'Good for a hotfix on a release branch', 'The change exists twice, which may conflict on a later merge'],
        short: '`git cherry-pick COMMIT` applies the change of one commit on top of the current branch and makes a new commit with the same message and author. In the recording the copy on the release branch had another id than the original, because its parent is different. I use it to put one fix on a release branch without bringing in everything else on main. The drawback is that the change now exists twice with two unrelated ids, so Git cannot tell that they are the same, and a later merge of the two branches can show a conflict or a duplicate. `-x` adds the original id to the message, which helps people and tools to follow it.',
        fu: [['How do you pick a range?', '`git cherry-pick A..B`. From documentation.'], ['When is a merge better?', 'When the branches should stay in step.']],
        trap: 'Cherry-picking a lot instead of branching sensibly.',
        real: 'Describe how you ship a hotfix to a release.'
      }),

      B.qa({
        id: 'qa-worktree', t: 3, tag: 'Git', secs: 60,
        q: 'What is a git worktree and when would you use one?',
        pts: ['A second working folder for the same repository', 'It shares the .git store, so nothing is downloaded again', 'Each worktree has its own branch', 'Git refuses to check out one branch in two worktrees'],
        short: 'A worktree is an extra working folder that belongs to the same repository. `git worktree add ../hotfix -b hotfix main` creates a folder with its own files and its own branch, and both folders share one object store, so it costs nothing to set up. I use it to build a hotfix while a long job runs in the first folder, to review a pull request without stashing my work, and to run two versions side by side. Git protects you: in the recording `git switch hotfix` in the first folder was refused because the branch was already used by the other worktree. It is cleaner than a second clone, and cheaper than a stash that you will forget.',
        fu: [['How do you remove one?', '`git worktree remove PATH`, or delete the folder and run `git worktree prune`. From documentation.'], ['Does it work with large repositories?', 'Yes, that is one of the reasons to use it.']],
        trap: 'Cloning the repository again to look at another branch.',
        real: 'Say how you keep two lines of work apart on one machine.'
      }),

      B.recap({
        id: 'm6-recap', n: 6, badge: 'Historian', color: '#E9D5FF',
        pts: [
          '`log` with a path, `log -S` and `blame` answer who and when. `-S0.8` found `' + H.bad_commit + '`.',
          '`bisect run` found the bad commit of **' + BT.commits + '** in **' + BI.steps + '** tests. A check must exit non-zero on bad.',
          '`cherry-pick` copies a commit: `' + PK.original + '` became `' + PK.copy + '`.',
          '`stash` parks edits. A **worktree** is a second folder, and one branch cannot be in two.',
          'Small commits make every one of these tools sharper.'
        ],
        lines: [
          'I can find who changed a line and when.',
          'I can bisect with a script.',
          'I use a worktree instead of a stash for long detours.'
        ]
      })
    ]
  });
})();
