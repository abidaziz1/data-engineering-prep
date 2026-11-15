/* Mission 2: branches, merge and rebase. The same repository was copied before each join, so the ids can be compared. */
(function () {
  var B = LAB.b, G = LAB.get;
  var C = G.counts, X = G.text;
  var BR = C('br.ref'), FF = C('ff'), MG = C('mg'), RB = C('rb'), SQ = C('sq'), ID = C('mr.ids'), DU = C('br.delete_unmerged');
  var PUSHRB = 'git switch feature\ngit rebase main\ngit push --force origin feature\n';
  G.expect(BR.file_bytes === 41 && BR.content_is_the_commit_id === true && BR.id_chars === 40, 'a branch is a file of 41 bytes that holds a commit id');
  G.expect(FF.parents_of_head === 1 && FF.head_is_feature === true && /Fast-forward/.test(X('ff.merge')), 'a merge into a branch that did not move is a fast-forward');
  G.expect(MG.parents === 2 && MG.feature_ids_unchanged === true && /Merge made by the 'ort' strategy/.test(X('mg.merge')), 'a merge of two moved branches makes a commit with two parents and keeps the ids');
  G.expect(RB.merge_commits === 0 && RB.ids_changed === true && RB.author_date_kept === true && ID.F1 !== ID.F1r && ID.F2 !== ID.F2r, 'a rebase gives the replayed commits new ids and keeps their author date');
  G.expect(SQ.merge_commits === 0 && SQ.commits === 4, 'a squash merge adds one commit and no merge commit');
  G.expect(DU.rc !== 0 && /not fully merged/.test(X('br.delete_unmerged')), 'git branch -d refuses a branch that is not merged');

  LAB.addChapter({
    id: 'm2', n: 2, title: 'Branches, merge and rebase', short: 'Branches', blurb: 'A branch is a name for a commit, and three ways to join two of them', minutes: 20,
    focus: ['stg', 'ing'],
    goals: [
      'Say what a **branch** and **HEAD** are, in terms of files.',
      'Tell a **fast-forward**, a **merge** and a **rebase** apart, by the ids they leave.',
      'Choose between merge, rebase and **squash** for a team.',
      'Know why you never rebase commits that other people have.'
    ],
    say: 'Branching is cheap in Git because a branch is only a name. Joining two branches is where the choices are: a merge keeps the history as it happened, a rebase rewrites it, and a squash flattens it. We join the same two branches three ways, from exact copies of one repository, and compare the commit ids.',
    scenes: [
      B.flow({
        id: 'm2-flow', t: 1, src: 'docs', title: 'A branch is a name for a commit', g: 'branches', legend: true,
        steps: [
          { say: 'Four commits and two branches. Press Next.', focus: ['a', 'b', 'm1', 'f1', 'f2', 'main', 'feat', 'head'], cap: 'Commits, and names that point to them.' },
          { say: 'Step 1. Each commit points to its **parent**. A is the first commit and B comes after it.', on: ['e1', 'e2'], focus: ['a', 'b', 'm1'], tags: ['tg_parent'], cap: 'Arrows point to the parent.' },
          { say: 'Step 2. **feature** started at B, so F1 and F2 are its commits. **main** went on without them and got M1. The history has **forked**.', on: ['e3', 'e4'], focus: ['b', 'f1', 'f2', 'm1'], cap: 'The history forked at B.' },
          { say: 'Step 3. A **branch** is a name that points to **one commit**: the newest of its line. Nothing else.', on: ['e5', 'e6'], focus: ['main', 'm1', 'feat', 'f2'], cap: 'A branch is a pointer.' },
          { say: 'Step 4. **HEAD** says which branch you are on. A new commit gets the current commit as its parent, and moves the branch that HEAD points to.', on: ['e7'], focus: ['head', 'main'], tags: ['tg_move'], cap: 'HEAD points to your branch.' }
        ]
      }),

      B.term({
        id: 'm2-ref', t: 1, src: 'rec', title: 'A branch is a small file',
        say: 'I created `feature` in a real repository and looked inside the `.git` folder.',
        lines: function () {
          return G.term([
            ['git branch -vv', X('br.branch_list')],
            ['cat .git/refs/heads/feature', X('br.ref_file')],
            ['wc -c < .git/refs/heads/feature', String(BR.file_bytes)],
            ['cat .git/HEAD', X('br.head')],
            ['git log --oneline --graph --all --decorate', X('br.graph_before')]
          ]);
        },
        after: 'The branch `feature` is a **file of ' + BR.file_bytes + ' bytes**: the 40 characters of a commit id and a new line. That is the whole branch. `HEAD` is a file that says `ref: refs/heads/main`, so you are on `main`. Creating or deleting a branch costs nothing, which is why Git users branch for every small task. `git log --graph --all` draws the pointers next to the commits.',
        afterKind: 'tip',
        doneSay: 'A branch is a 41 byte file with a commit id in it.'
      }),

      B.term({
        id: 'm2-ff', t: 1, src: 'rec', title: 'Fast-forward: nothing to combine',
        say: 'On a copy of the repository where `main` had not moved, I merged `feature`.',
        lines: function () {
          return G.term([
            ['git merge feature', X('ff.merge')],
            ['git log --oneline --graph --decorate', X('ff.graph')]
          ]);
        },
        after: '`main` was a **parent** of everything on `feature`, so Git only had to **move the pointer** of `main` forward. It says `Fast-forward`. No commit was made, no id changed, and the history is one line. A fast-forward is possible only when one branch is directly behind the other.',
        afterKind: 'tip',
        doneSay: 'A fast-forward moves a pointer. It makes no commit.'
      }),

      B.flow({
        id: 'm2-mr', t: 1, src: 'docs', title: 'Merge and rebase, side by side', g: 'mergerebase', legend: true,
        steps: [
          { say: 'The same fork as before: main has M1, feature has F1 and F2. Time runs to the right. Press Next.', focus: ['a1', 'b1', 'c1', 'f1', 'f2', 'a2', 'b2', 'c2'], cap: 'One fork, two ways to join it.' },
          { say: 'Merge. Git makes **one new commit with two parents**, the tip of main and the tip of feature. F1 and F2 stay exactly as they are.', on: ['e3', 'e6'], focus: ['c1', 'f2', 'mm'], tags: ['tg_merge'], cap: 'A merge adds a commit.' },
          { say: 'Rebase. Git takes F1 and F2, and **replays** them on top of M1. The copies are new commits with new ids, and the old ones are left behind with no branch.', on: ['e9', 'e10'], focus: ['c2', 'f1r', 'f2r'], tags: ['tg_rebase'], cap: 'A rebase copies commits.' },
          { say: 'The result of a rebase is a straight line, as if feature had started from M1. The result of a merge keeps the fork in the history.', focus: ['mm', 'f2r'], tags: ['tg_hist'], cap: 'Straight line, or a fork that shows.' }
        ]
      }),

      B.term({
        id: 'm2-merge', t: 1, src: 'rec', title: 'A merge commit',
        say: 'On a copy where `main` had moved on (M1), I merged `feature`. Then I opened the new commit.',
        lines: function () {
          return G.term([
            ['git merge --no-edit feature', X('mg.merge')],
            ['git log --oneline --graph --decorate', X('mg.graph')],
            ['git cat-file -p HEAD', X('mg.cat_head')]
          ]);
        },
        after: 'Git combined the changes and made **one commit with ' + MG.parents + ' parents**: the `parent` lines of the commit name the tip of `main` and the tip of `feature`. The graph shows the fork. The history now has **' + MG.commits + ' commits**, and `feature` still has the ids it had before (' + ID.F1 + ' and ' + ID.F2 + '). The `ort` strategy is the default way Git merges two branches.',
        afterKind: 'tip',
        doneSay: 'A merge adds a commit with two parents and changes no id.'
      }),

      B.term({
        id: 'm2-rebase', t: 1, src: 'rec', title: 'A rebase',
        say: 'On another exact copy, I rebased `feature` onto `main`, and then merged it.',
        lines: function () {
          return G.term([
            ['git switch feature && git rebase main', X('rb.rebase')],
            ['git log --oneline --graph --decorate --all', X('rb.graph')],
            ['git switch main && git merge feature', X('rb.ff_merge')]
          ]);
        },
        after: 'The two commits of `feature` were **replayed** on top of `main`, and their ids changed: **' + ID.F1 + ' became ' + ID.F1r + '** and **' + ID.F2 + ' became ' + ID.F2r + '**. The history is a straight line of ' + RB.commits + ' commits and has **' + RB.merge_commits + '** merge commits. The author and the author date stayed (' + RB.author_date_kept + '), because the replayed commit has the same changes. What changed is the parent, and the id depends on the parent. Merging `feature` into `main` afterwards was a fast-forward.',
        afterKind: 'warn',
        doneSay: 'A rebase copies commits. The copies have new ids.'
      }),

      B.widget({ id: 'm2-lab', kind: 'mr', t: 1, src: 'rec', title: 'Lab: three ways to join one fork' }),

      B.term({
        id: 'm2-squash', t: 1, src: 'rec', title: 'A squash merge',
        say: 'The third copy. A squash merge takes the **changes** of the branch and does not commit by itself.',
        lines: function () {
          return G.term([
            ['git merge --squash feature', X('sq.merge')],
            ['git commit -m "Add and document the nightly check"', '(one new commit on main)'],
            ['git log --oneline --graph --decorate', X('sq.graph')],
            ['git branch -d feature', X('br.delete_unmerged')]
          ]);
        },
        after: 'Both commits of `feature` ended up in **one commit** on `main`, so the history is short and has no merge commits (' + SQ.merge_commits + '). The price: Git does **not** record that `feature` was merged, because the new commit has one parent only. So `git branch -d feature` refuses (exit code ' + DU.rc + ') and you must delete it with `-D`, and the individual commits are only on the old branch.',
        afterKind: 'warn',
        doneSay: 'A squash puts the changes of a branch in one commit and forgets the branch.'
      }),

      B.cmp({
        id: 'm2-choose', t: 1, src: 'rec', title: 'Merge, rebase or squash',
        say: 'Three ways, three histories. The numbers are from the recording. Press Next.',
        cols: ['', 'Merge', 'Rebase, then fast-forward', 'Squash merge'],
        hl: 0,
        rows: [
          ['Commits in the history', String(MG.commits), String(RB.commits), String(SQ.commits)],
          ['Merge commits', '1', String(RB.merge_commits), String(SQ.merge_commits)],
          ['Ids of the feature commits', 'kept', 'new', 'not in main'],
          ['The history shows', 'a fork, as it happened', 'a straight line', 'a straight line, one commit per feature'],
          ['Good when', 'The branch is shared, or you want the record of the work', 'The branch is yours and you want a clean line before it joins', 'Many small or messy commits that nobody needs to see'],
          ['Careful because', 'Many merge commits make the log noisy', 'You rewrite commits: never on a shared branch', 'You lose the small steps, and bisect can only point at the whole feature']
        ],
        steps: [
          { upto: 3, say: 'The numbers differ in what survives. A merge changes nothing that exists. A rebase and a squash create new commits.' },
          { upto: 6, say: 'Teams choose by how they read history. There is no single right answer. What matters is that everybody knows the rule.' }
        ]
      }),

      B.bug({
        id: 'm2-bug', t: 2, src: 'docs', q: 'The branch `feature` was pushed and a colleague has pulled it. You rebased it onto `main` and want to publish the result. Click the line that can destroy your colleague\'s work.',
        file: 'publish.sh', lang: 'bash', code: PUSHRB, bad: [3],
        hint: 'After a rebase the remote branch and your branch no longer agree. Which command makes the remote agree by force?',
        why: 'The rebase gave your commits **new ids**, so the remote `feature` is not an ancestor of yours and a normal push is refused. `--force` overwrites the remote with no check: any commit that your colleague pushed in the meantime is thrown away, and their clone now holds commits that no branch contains. Mission 5 records `--force-with-lease`, which refuses when the remote moved. The better rule is not to rebase a branch that other people have.',
        fix: 'git switch feature\ngit rebase main\ngit push --force-with-lease origin feature\n',
        cheer: 'Rewrite only what is only yours, and lease the force.'
      }),

      B.order({
        id: 'm2-ord', t: 1, q: 'Put these steps in the order of a clean integration of your own feature branch with a rebase.',
        items: [
          'Run the tests on `feature`',
          '`git fetch origin` to see what `main` has now',
          '`git rebase origin/main` while on `feature`, and resolve conflicts',
          'Run the tests again on the rebased branch',
          '`git switch main` and `git merge --ff-only feature`'
        ],
        why: 'The rebase changes the commits, so the tests of the old commits prove nothing about the new ones: test again. `--ff-only` makes the final merge fail instead of creating a merge commit if `main` moved in the meantime.'
      }),

      B.quiz({
        id: 'm2-q1', t: 1,
        q: 'You rebase `feature` onto `main`. What happens to the ids of the commits of `feature`?',
        opts: [
          { t: 'They change: the commits are copied on a new parent', fb: '' },
          { t: 'They stay: only the pointer moves', fb: 'That is a fast-forward. A rebase creates copies.' },
          { t: 'They change only if there is a conflict', fb: 'The parent changes in every case, so every id changes.' },
          { t: 'Git adds a merge commit', fb: 'A rebase adds none.' }
        ],
        ok: 0, why: 'The recording: ' + ID.F1 + ' became ' + ID.F1r + ' and ' + ID.F2 + ' became ' + ID.F2r + ', with the same author, the same changes and the same author date.'
      }),

      B.quiz({
        id: 'm2-q2', t: 1,
        q: 'How many parents does a merge commit have?',
        opts: [
          { t: 'Two: the tips of the branches that were joined', fb: '' },
          { t: 'One: the branch you were on', fb: 'That is what a squash commit has.' },
          { t: 'None', fb: 'Only the first commit has no parent.' },
          { t: 'As many as there are commits on the other branch', fb: 'A merge commit has two parents. An octopus merge has more.' }
        ],
        ok: 0, why: 'The recording opened the merge commit with `git cat-file -p HEAD`: ' + MG.parents + ' parent lines.'
      }),

      B.quiz({
        id: 'm2-q3', t: 1,
        q: 'When can `git merge feature` be a fast-forward?',
        opts: [
          { t: 'When the current branch has not moved since `feature` started from it', fb: '' },
          { t: 'When there are no conflicts', fb: 'Conflicts are a different matter. A fast-forward needs no combining at all.' },
          { t: 'When `feature` has only one commit', fb: 'The number of commits does not decide it.' },
          { t: 'Always, if you pass `--ff`', fb: '`--ff` allows it. It cannot make it possible.' }
        ],
        ok: 0, why: 'In the first copy `main` had not moved, and the merge printed `Fast-forward`. In the second copy it had moved (M1), and the merge made a commit.'
      }),

      B.decide({
        id: 'm2-dec', t: 2, src: 'docs', title: 'Decision: how does the team join branches',
        scenario: 'Four engineers work on one repository of dbt models and loaders. Each branch is open for one to three days. The team reads `git log` to find which change broke a model, and runs a check on every merge. Two people have rebased shared branches by mistake in the past.',
        opts: [
          { t: 'Merge commits for every branch, with no rule about rebase', d: 'The history is exactly what happened. Nothing is rewritten, so nothing is lost.', lose: 'The log fills with merge commits, and a person can still rebase a shared branch by mistake.' },
          { t: 'Squash merge for every pull request, and no rebase of anything that is pushed', d: 'One commit on main for each change, with the pull request as its message. Bisect points to a reviewed unit. Nobody rewrites shared history.', lose: 'The small steps of a branch are lost on main, and a long feature becomes one large commit.' },
          { t: 'Rebase every branch and fast-forward only', d: 'A straight line with every small commit kept.', lose: 'People rebase pushed branches, which is the mistake that already happened, and every rebase needs a force push.' }
        ],
        pick: 1,
        why: 'The team reads history to find a cause, and wants a reviewed unit for each change. Squash gives that, and keeps rebase local to each person\'s unpushed work. If commits are carefully written and a team wants to keep them, a rebase with fast-forward works too, as long as the rule "never rebase what is pushed" is kept.',
        when: 'Use merge commits when the branch is shared among several people for weeks, or when the record of parallel work matters.'
      }),

      B.incident({
        id: 'm2-inc', t: 2, src: 'rec', title: 'Incident: every commit is there twice', time: '10:15',
        alert: '**After a pull, `git log` shows each of Omar\'s five commits twice, with different ids and the same messages.** Omar rebased `feature` on Friday and force-pushed. Maya had pulled `feature` on Thursday and pulled again today.',
        clues: ['The old commits and the new ones have the same author, date and changes', 'The ids differ, and one of the two sets has no branch', 'Maya\'s pull created a merge commit'],
        opts: [
          { t: 'Reset Maya\'s `feature` to the new remote branch, after she saves anything that is only local', fb: '' },
          { t: 'Revert the duplicate commits one by one', fb: 'You would undo the same changes twice and still have both sets in the history.' },
          { t: 'Delete the branch on the remote and push again', fb: 'The same duplicates would come back from the next clone.' },
          { t: 'Leave it: Git will remove the copies later', fb: 'Git keeps both sets until someone resets.' }
        ],
        best: 0,
        why: 'This is what a rebase does to a branch that someone else has: the commits were **copied** and got new ids (' + ID.F1 + ' became ' + ID.F1r + ' in the recording). Maya\'s pull saw two lines of history and merged them. The clean fix is to reset her branch to `origin/feature`, which holds the rebased commits.',
        checks: [
          ['Compare ids', '`git log --oneline` shows the same messages with two ids.'],
          ['Find what is only local', '`git log origin/feature..feature` lists Maya\'s own commits.'],
          ['Reset to the remote', '`git reset --hard origin/feature`, after she saves what is local.'],
          ['Prevent', 'Agree that pushed branches are not rebased, or use `--force-with-lease` and tell people.']
        ],
        tell: 'Omar rebased a branch that Maya already had, so his commits were copied with new ids, and her pull merged the old and the new lines. I saved her local commits, reset her branch to the remote one, and we agreed that pushed branches are not rebased.',
        prevent: ['Never rebase **commits that others have**', 'Use `--force-with-lease`, and **tell the team** when you force', 'Prefer **squash or merge** on shared branches']
      }),

      B.cmp({
        id: 'm2-switch', t: 3, src: 'docs', title: 'switch, restore and the old checkout',
        say: 'Older tutorials use `git checkout` for everything. Since Git 2.23 the jobs have their own commands. Press Next.',
        cols: ['You want to', 'Today', 'The old way'],
        hl: 1,
        rows: [
          ['Change branch', '`git switch feature`', '`git checkout feature`'],
          ['Make a branch and move to it', '`git switch -c feature`', '`git checkout -b feature`'],
          ['Throw away changes to a file', '`git restore FILE`', '`git checkout`, two dashes, the file'],
          ['Take a file from another commit', '`git restore --source=COMMIT FILE`', '`git checkout COMMIT`, two dashes, the file']
        ],
        steps: [
          { upto: 2, say: 'Switching branches and restoring files used to share one command, and the same word could move you or destroy your edits.' },
          { upto: 4, say: 'The new commands do one thing each. Both forms still work. Mission 4 records `git restore`.' }
        ]
      }),

      B.qa({
        id: 'qa-branch', t: 1, tag: 'Git', secs: 60,
        q: 'What is a branch in Git, and why is it cheap?',
        pts: ['A branch is a name that points to one commit', 'It is a small file with a commit id', 'HEAD says which branch you are on', 'A new commit moves the branch that HEAD points to'],
        short: 'A branch is a name for a commit: the newest commit of a line of work. In the repository it is a file that holds a 40 character id, ' + BR.file_bytes + ' bytes in the recording. `HEAD` says which branch you are on, and a new commit gets the current commit as its parent and moves that branch forward. So creating, switching and deleting branches copies nothing, and that is why Git users make one for every task. It also means that deleting a branch deletes only the name: the commits stay until Git cleans up unreachable objects.',
        fu: [['What is a detached HEAD?', 'HEAD points to a commit directly and not to a branch. New commits then belong to no branch, and you can lose them. From documentation.'], ['How do you see where branches are?', '`git branch -vv` and `git log --graph --all --decorate`.']],
        trap: 'Describing a branch as a copy of the files.',
        real: 'Say how many branches you have open right now and what each one is for.'
      }),

      B.qa({
        id: 'qa-mergerebase', t: 1, tag: 'Git', secs: 75,
        q: 'What is the difference between merge and rebase?',
        pts: ['Merge adds a commit with two parents and changes nothing that exists', 'Rebase copies your commits on a new base, with new ids', 'Rebase gives a straight history', 'Never rebase commits that other people have'],
        short: 'Both bring the work of one branch into another. A merge adds one commit with two parents and leaves every existing commit as it is, so the history shows that the work ran in parallel. A rebase takes your commits and replays them on top of the other branch, so the history is a straight line, but the replayed commits are **new commits with new ids**. In my recording the same two commits had ids ' + ID.F1 + ' and ' + ID.F2 + ' after a merge, and ' + ID.F1r + ' and ' + ID.F2r + ' after a rebase. That is why the rule is: rebase your own unpushed work, never commits that others have, because their clones still hold the old ones. I use rebase to keep a feature branch current, and a merge or a squash to join it.',
        fu: [['What is a fast-forward?', 'A merge where the current branch has not moved, so Git only moves the pointer. It makes no commit.'], ['Is a rebase a safe way to tidy history?', 'Only on commits that are not pushed. `git reflog` can bring the old ones back for a while.']],
        trap: 'Saying that a rebase does not change anything.',
        real: 'Describe the rule of your team for joining branches.'
      }),

      B.qa({
        id: 'qa-squash', t: 2, tag: 'Git', secs: 60,
        q: 'When would you squash, and what do you lose?',
        pts: ['A squash puts the changes of a branch in one commit on the target', 'The history is short and linear', 'The small steps are lost on main', 'Git does not record that the branch was merged'],
        short: 'I squash when a branch has many small or messy commits that nobody needs on main, for example "fix", "fix again", "wip". The squash merge takes the changes of the whole branch and makes one commit with one parent, so main reads as one commit per reviewed change, which also makes a revert or a bisect point at a reviewed unit. The cost is that the small steps are gone from main, a very long feature becomes one big commit, and Git does not record that the branch was merged: in the recording `git branch -d` refused the squashed branch, exit code ' + DU.rc + ', and it had to be deleted with `-D`. Platforms offer squash as a button on a pull request for this reason.',
        fu: [['Does a squash change the author?', 'The commit has the author who ran it. A co-author line can keep credit. From documentation.'], ['Is squashing safe on a shared branch?', 'It makes a new commit on the target and does not rewrite what exists, so yes, for the target. The branch itself is usually deleted.']],
        trap: 'Squashing a branch that three people built together, and erasing who did what.',
        real: 'Say which join your pull requests use and why.'
      }),

      B.qa({
        id: 'qa-ort', t: 3, tag: 'Git', secs: 60,
        q: 'What does Git do when it merges two branches, and what is a three-way merge?',
        pts: ['It finds the merge base, the last common ancestor', 'It compares each side with the base, not with each other', 'A change on one side only is taken, a change on both sides in the same place is a conflict', 'ort is the default strategy'],
        short: 'Git finds the **merge base**, the last commit that both branches share, and compares each branch with that base. A change made on one side only is taken. A change made on both sides in different places is combined. A change made on both sides at the same place is a **conflict**, because Git cannot tell which one you want. That is a three-way merge: base, ours and theirs. The recording printed `Merge made by the ort strategy`, which is the default implementation, and in the next mission the three versions of a conflicted file are visible in the index as stages 1, 2 and 3.',
        fu: [['What is `git merge-base`?', 'It prints the common ancestor of two commits. From documentation.'], ['What is an octopus merge?', 'A merge of more than two branches in one commit. From documentation.']],
        trap: 'Saying that Git compares the two branches with each other.',
        real: 'Explain a conflict you solved in terms of base, ours and theirs.'
      }),

      B.recap({
        id: 'm2-recap', n: 2, badge: 'Branch Keeper', color: '#FDE68A',
        pts: [
          'A **branch** is a file of ' + BR.file_bytes + ' bytes with a commit id. **HEAD** says which branch you are on.',
          'A **fast-forward** moves a pointer and makes no commit. A **merge** adds one commit with ' + MG.parents + ' parents and changes no id.',
          'A **rebase** copies commits: ' + ID.F1 + ' became ' + ID.F1r + '. Never rebase commits that others have.',
          'A **squash** gives one commit and no merge record: `branch -d` refused.',
          'Use `--force-with-lease`, never plain `--force`.'
        ],
        lines: [
          'I know which of merge, rebase and squash my team uses.',
          'I rebase only my own unpushed commits.',
          'I read git log --graph before I join branches.'
        ]
      })
    ]
  });
})();
