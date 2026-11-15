/* Mission 3: conflicts. Two branches changed the same lines of the model, and the same line of the tax rate. */
(function () {
  var B = LAB.b, G = LAB.get;
  var C = G.counts, X = G.text;
  var MK = X('cf.markers'), RES = G.file('conflict/resolved.sql'), ST = C('cf.stages'), CA = C('cf.after'), AB = C('cf.abort'), TH = C('cf.theirs'), RBC = C('cf.rebase'), RM = C('cf.rate_markers'), DC = C('cf.diff_check'), MC = C('cf.merge');
  G.expect(MC.rc === 1 && /CONFLICT \(content\)/.test(X('cf.merge')) && /^UU /.test(X('cf.status')), 'a merge that changes the same lines stops with a content conflict and the status UU');
  G.expect(ST.unmerged_entries === 3 && ST.stage_numbers.join() === '1,2,3', 'a conflicted file has three versions in the index: stages 1, 2 and 3');
  G.expect(CA.merge_commit === 1 && CA.markers_left === false && /M  models/.test(X('cf.status_resolved')), 'after the resolution the file is staged and the commit is a merge commit without markers');
  G.expect(AB.rc === 0 && AB.status_clean === true && AB.head_same === true, 'merge --abort brings the repository back to where it was');
  G.expect(TH.has_avg === true && TH.has_max === false, 'taking their side drops the change of our side');
  G.expect(RBC.rc === 1 && RBC.in_progress === true && /\(Add the average amount\)/.test(X('cf.rebase_markers')), 'a rebase stops on the same conflict and names the commit that it replays');
  G.expect(RM.loader_reads_it === false && /could not convert string to float/.test(X('cf.rate_error')), 'the loader cannot read a tax rate file that holds markers');
  G.expect(DC.rc === 2 && /leftover conflict marker/.test(X('cf.diff_check')), 'git diff --check names the leftover markers');
  var BADSQL = MK;
  var mk = function (re) { return G.at(MK, re); };

  LAB.addChapter({
    id: 'm3', n: 3, title: 'Conflicts', short: 'Conflicts', blurb: 'Two people change the same lines. What Git shows, and how to finish', minutes: 17,
    focus: ['ing', 'mon'],
    goals: [
      'Read **conflict markers** and the three versions that Git keeps.',
      'Resolve a conflict, test it, and **finish or abort** the merge.',
      'Know what **ours and theirs** mean in a merge and in a rebase.',
      'Stop a file with markers from reaching **main**.'
    ],
    say: 'A conflict is not an error. It is Git telling you that two people changed the same lines and that it will not guess. We make one in the daily model, read what Git left in the file and in the index, resolve it two ways, and see what a committed marker does to a loader.',
    scenes: [
      B.term({
        id: 'm3-clash', t: 1, src: 'rec', title: 'Two branches change the same line',
        say: 'Omar added the average amount to the model on the branch `avg`. Maya added the maximum amount on `main`. Both changed the line after `revenue`. Maya merged `avg`.',
        lines: function () {
          return G.term([
            ['git merge avg', X('cf.merge')],
            ['git status --short', X('cf.status')],
            ['git status', X('cf.status_long')]
          ]);
        },
        after: 'Git combined everything it could and **stopped**: `CONFLICT (content)` names the file. The merge is **in progress**, not failed: `git status` says `You have unmerged paths` and lists the choices. The status code **`UU`** means "unmerged, both modified". Nothing is lost: both changes are in the repository, and the file now holds both of them with markers around the disputed lines.',
        afterKind: 'tip',
        doneSay: 'A conflict stops the merge half way. Nothing is lost.'
      }),

      B.code({
        id: 'm3-markers', t: 1, src: 'rec', title: 'What Git wrote into the file', file: 'models/orders_daily.sql', lang: 'sql', code: MK,
        steps: [
          { say: 'This is the model in the working tree, in the middle of the merge. Press Next to read the markers.', lines: null },
          { say: '`<<<<<<< HEAD` starts **our** side: the text of the branch that you are on, `main`.', lines: [mk(/^<<<<<<< HEAD/), mk(/max\(amount\)/)] },
          { say: '`=======` separates the two sides.', lines: G.span(MK, /^=======/) },
          { say: 'The text up to `>>>>>>> avg` is **their** side: the branch that you are merging in. The marker names that branch.', lines: [mk(/avg\(amount\)/), mk(/^>>>>>>> avg/)] },
          { say: 'Everything outside the markers merged cleanly. You decide what the file should say between the markers, and you **delete the markers**.', lines: [G.at(MK, /select/), mk(/revenue,/)] }
        ],
        note: 'Both sides added a column after `revenue,`. The right answer here is to keep both. Git cannot know that, and so it asks.'
      }),

      B.term({
        id: 'm3-stages', t: 1, src: 'rec', title: 'The three versions behind the markers',
        say: 'The index keeps the file three times while a conflict is open. `git ls-files -u` lists them. `git diff --check` finds markers that are still there.',
        lines: function () {
          return G.term([
            ['git ls-files -u', X('cf.ls_unmerged')],
            ['git diff --check   # exit code ' + DC.rc, X('cf.diff_check')]
          ]);
        },
        after: 'The **three ids** are the three versions of the model: stage **1** is the common ancestor (the merge base), stage **2** is ours, and stage **3** is theirs. This is the three-way merge. Git compared each side with the base. Both sides changed the same place in different ways, so it could not choose. `git diff --check` is a safety net: it exits with code ' + DC.rc + ' and names every **leftover marker**, so you can run it before you commit.',
        afterKind: 'tip',
        doneSay: 'Stage 1 is the base, 2 is ours, 3 is theirs.'
      }),

      B.code({
        id: 'm3-resolved', t: 1, src: 'rec', title: 'The resolved file', file: 'models/orders_daily.sql', lang: 'sql', code: RES,
        steps: [
          { say: 'I edited the file to keep both columns and removed the three marker lines. Press Next.', lines: null },
          { say: 'Both columns, in one list. No marker is left.', lines: G.span(RES, /avg\(amount\)/, /max\(amount\)/) },
          { say: 'The rest is what the merge had already combined. Run the model or its tests before you commit: a file can be free of markers and still be wrong.', lines: G.span(RES, /from raw_orders/, /group by/) }
        ],
        note: 'This is a made-up resolution of a made-up conflict. In your repository the right answer depends on what the two people meant.'
      }),

      B.term({
        id: 'm3-finish', t: 1, src: 'rec', title: 'Finish the merge',
        say: 'I staged the file, which tells Git that the conflict is resolved, and committed.',
        lines: function () {
          return G.term([
            ['git add models/orders_daily.sql && git status --short', X('cf.status_resolved')],
            ['git commit --no-edit', '(the merge commit, with the default message)'],
            ['git log --oneline --graph --decorate', X('cf.graph')]
          ]);
        },
        after: '`git add` is how you say "this file is resolved": the status changed from `UU` to `M`. The commit is a **merge commit with two parents**, as in mission 2, and the markers left: ' + CA.markers_left + '. If you cannot or do not want to finish, `git merge --abort` goes back to the state before the merge: in the recording the status was clean (' + AB.status_clean + ') and `HEAD` was the same commit (' + AB.head_same + ').',
        afterKind: 'tip',
        doneSay: 'add marks it resolved. commit finishes. abort goes back.'
      }),

      B.term({
        id: 'm3-theirs', t: 1, src: 'rec', title: 'Taking one side whole',
        say: 'Git can take a whole file from one side. I tried `--theirs` on the conflicted model.',
        lines: function () {
          return G.term([
            ['git checkout --theirs models/orders_daily.sql', ''],
            ['grep -c avg_amount models/orders_daily.sql', TH.has_avg ? '1' : '0'],
            ['grep -c max_amount models/orders_daily.sql', TH.has_max ? '1' : '0']
          ]);
        },
        after: '`--theirs` took **the whole file** from `avg`: the average column is there (' + TH.has_avg + ') and the **maximum column of `main` is gone** (' + TH.has_max + '). It is the right tool when one side is simply correct, for example a file that is generated, and the wrong tool when both sides have something to keep. `--ours` does the opposite.',
        afterKind: 'warn',
        doneSay: 'checkout --theirs or --ours takes a whole file from one side.'
      }),

      B.term({
        id: 'm3-rebase', t: 1, src: 'rec', title: 'The same conflict in a rebase',
        say: 'On a copy, instead of merging, I rebased `avg` onto `main`.',
        lines: function () {
          return G.term([
            ['git switch avg && git rebase main', X('cf.rebase')],
            ['sed -n 5,11p models/orders_daily.sql', X('cf.rebase_markers').split('\n').slice(4, 11).join('\n')]
          ]);
        },
        after: 'The rebase stopped on the **commit that it was replaying**: `Add the average amount`. The markers have the same shape, with two differences. The branch name in the last marker is replaced by the commit that is being replayed. And the **sides swap**: during a rebase `HEAD` (our side) is the branch that you are rebasing **onto**, `main`, and **theirs** is your own commit. After you fix and `git add`, you continue with `git rebase --continue`, and **there may be a conflict again for the next commit**. `git rebase --abort` goes back.',
        afterKind: 'warn',
        doneSay: 'In a rebase, ours is the branch you rebase onto.'
      }),

      B.cmp({
        id: 'm3-sides', t: 1, src: 'rec', title: 'Ours and theirs',
        say: 'The words are easy to mix up. Press Next.',
        cols: ['', 'During a merge', 'During a rebase'],
        hl: 0,
        rows: [
          ['`HEAD` or ours', 'The branch you are on: `main`', 'The branch you rebase onto, with the commits already replayed'],
          ['Theirs', 'The branch you merge in: `avg`', 'The commit that is being replayed: yours'],
          ['The last marker names', 'The other branch: `>>>>>>> avg`', 'The replayed commit: `>>>>>>> ' + X('cf.rebase_markers').match(/>>>>>>> (\S+)/)[1] + '`'],
          ['To start again', '`git merge --abort`', '`git rebase --abort`'],
          ['To finish', '`git add`, then `git commit`', '`git add`, then `git rebase --continue`']
        ],
        steps: [
          { upto: 3, say: 'In a merge the sides read the way you expect. In a rebase they swap, because Git rebuilds your commits one at a time on top of the other branch.' },
          { upto: 5, say: 'Both give you a safe way out. If you are lost, abort and start again.' }
        ]
      }),

      B.term({
        id: 'm3-rate', t: 1, src: 'rec', title: 'Markers in a file that a program reads',
        say: 'Two branches changed the tax rate, a file with one number. I merged them, and I ran the loader\'s first line on the file with its markers.',
        lines: function () {
          return G.term([
            ['git merge sales-tax', X('cf.rate_merge')],
            ['cat loader/tax_rate.txt', X('cf.rate_markers')],
            ['python3 -c "float(open(\'loader/tax_rate.txt\').read())"', X('cf.rate_error')]
          ]);
        },
        after: 'Git cannot merge two different numbers on one line, so it wrote both with markers, and the file **is no longer a number**. The loader fails with a `ValueError`. This is why a conflict must **never be committed with the markers in**. A conflict in a file that a program reads, like a rate, a lock file or a config, needs a **decision**, not a mechanical merge: which rate is right?',
        afterKind: 'warn',
        doneSay: 'A file with markers is not valid data.'
      }),

      B.cmp({
        id: 'm3-kinds', t: 2, src: 'docs', title: 'Conflicts that data repositories get',
        say: 'A data repository has conflicts in more than SQL. Press Next.',
        cols: ['File', 'Why it conflicts', 'What to do'],
        hl: 2,
        rows: [
          ['A dbt model or a loader', 'Two people edited the same lines', 'Resolve by hand, keep what both meant, run the tests'],
          ['A lock file or a manifest of versions', 'Two branches added or upgraded different packages', 'Take one side, then **regenerate** the file with the tool. Never merge it by hand'],
          ['A notebook', 'The JSON holds outputs and counters that change on every run', 'Strip outputs before you commit (mission 7), or merge with a notebook-aware tool'],
          ['A generated file (docs, compiled output)', 'It is rebuilt on both branches', 'Do not commit it, or rebuild it after the merge'],
          ['A CSV or a data file', 'Both sides rewrote the file', 'Keep data out of git, or agree who owns each file']
        ],
        steps: [
          { upto: 2, say: 'For code, the markers are the tool. You read both sides and write the right text.' },
          { upto: 5, say: 'For generated and data files, merging text is the wrong idea. Pick a side and rebuild, or keep the file out of the repository. This table is from documentation: no lock file or notebook conflict was run.' }
        ]
      }),

      B.bug({
        id: 'm3-bug', t: 1, q: 'A colleague "resolved" the conflict in the model, staged it and committed. The model fails to compile. Click one of the lines that should not be in the file.',
        file: 'models/orders_daily.sql', lang: 'sql', code: BADSQL, bad: [mk(/^<<<<<<< HEAD/), mk(/^=======/), mk(/^>>>>>>> avg/)],
        hint: 'Which lines were written by Git and are not part of the SQL?',
        why: 'The three marker lines were written by Git to show the two sides. They are not SQL, so the model does not compile. `git add` does **not** check the content: it only says "I am done". `git diff --check` finds the leftover markers (here lines 6, 8 and 10, exit code ' + DC.rc + ').',
        fix: RES,
        cheer: 'Search for the markers before you stage.'
      }),

      B.order({
        id: 'm3-ord', t: 1, q: 'Put these steps in the order of resolving a conflict in a merge.',
        items: [
          '`git merge other` stops and prints `CONFLICT`',
          '`git status` lists the files that are `UU`',
          'Edit each file: keep what is right, delete the three kinds of marker',
          'Run the tests or the model, and `git diff --check`',
          '`git add` each file, then `git commit`'
        ],
        why: 'Staging comes last, because `git add` only records your decision. Testing comes before it, because a resolved file can still be wrong. If it goes badly, `git merge --abort` returns to the start.'
      }),

      B.quiz({
        id: 'm3-q1', t: 1,
        q: 'During a **rebase**, which side does `HEAD` (ours) hold in the conflict markers?',
        opts: [
          { t: 'The branch you rebase onto, with the commits replayed so far', fb: '' },
          { t: 'Your own commit that is being replayed', fb: 'That is theirs in a rebase.' },
          { t: 'The common ancestor', fb: 'The ancestor is stage 1 in the index, not in the file.' },
          { t: 'Always the same as in a merge', fb: 'The sides swap in a rebase.' }
        ],
        ok: 0, why: 'The recording: during the rebase the marker `HEAD` held the line from `main` (`max(amount)`), and the last marker named the replayed commit (`' + X('cf.rebase_markers').match(/>>>>>>> (.*)/)[1] + '`).'
      }),

      B.quiz({
        id: 'm3-q2', t: 1,
        q: 'You are in the middle of a merge and want to give up. What do you run?',
        opts: [
          { t: '`git merge --abort`', fb: '' },
          { t: '`git reset --hard` and delete the markers by hand', fb: 'It would work for the files, but the abort is the clean way and keeps the state consistent.' },
          { t: '`git commit` and fix it later', fb: 'That commits the markers.' },
          { t: '`git stash`', fb: 'A stash does not end a merge in progress.' }
        ],
        ok: 0, why: 'In the recording the abort left a clean status (' + AB.status_clean + ') and the same `HEAD` (' + AB.head_same + ').'
      }),

      B.quiz({
        id: 'm3-q3', t: 2,
        q: 'Both branches upgraded a different package, and `poetry.lock` conflicts. What is the best way to resolve it?',
        opts: [
          { t: 'Take one side of the file, then regenerate it with the tool, and commit the result', fb: '' },
          { t: 'Merge the lines by hand so that both upgrades stay', fb: 'The file has hashes and a content hash that the tool computes. Hand merging breaks it.' },
          { t: 'Delete the lock file and commit without it', fb: 'You lose reproducible installs.' },
          { t: 'Commit the markers and let CI decide', fb: 'CI would fail on a file that is not valid.' }
        ],
        ok: 0, why: 'A lock file is generated from the manifest. Take either side, run the tool again, and the result is right by construction. This is documentation advice: no lock file ran here.'
      }),

      B.decide({
        id: 'm3-dec', t: 2, src: 'docs', title: 'Decision: how to avoid the conflicts of a shared model',
        scenario: 'Four people edit `models/orders_daily.sql` and three other large models. Conflicts happen twice a week, and every one costs half an hour and sometimes a wrong resolution that is found a day later.',
        opts: [
          { t: 'Short branches that merge within a day, and a rebase on main before each push', d: 'Two people rarely change the same lines within a day. The conflicts that remain are small and fresh in mind.', lose: 'It asks for discipline and for work to be cut into small pieces.' },
          { t: 'A rule that only one person edits each model', d: 'No conflicts by construction.', lose: 'It blocks help, and a person on holiday blocks a model.' },
          { t: 'Resolve every conflict with `--theirs`, to be quick', d: 'No time lost.', lose: 'One side\'s changes disappear every time, and nobody notices until a number is wrong.' }
        ],
        pick: 0,
        why: 'The size of a conflict grows with the time two branches stay apart. Short branches and frequent rebases keep it small. A model that is split into smaller models also helps. Taking one side by habit is how data goes wrong silently.',
        when: 'A rule of single ownership works for a file that really has one owner, such as a generated one.'
      }),

      B.incident({
        id: 'm3-inc', t: 2, src: 'rec', title: 'Incident: the nightly load fails with a ValueError', time: '02:10',
        alert: '**The nightly load stopped with `ValueError: could not convert string to float` while reading `loader/tax_rate.txt`.** The last merge to `main` was at 17:40 and was approved with a green check.',
        clues: ['`cat loader/tax_rate.txt` shows `<<<<<<< HEAD` on the first line', 'The merge commit has two parents and touches only this file', 'The CI checks run the SQL tests and never read the rate'],
        opts: [
          { t: 'Fix the file with the right rate, commit, and add a check for leftover markers to CI', fb: '' },
          { t: 'Revert the whole day of work on `main`', fb: 'The fault is one file. A revert of the merge may do, but you need the decision about the rate either way.' },
          { t: 'Delete the file so that the loader uses a default', fb: 'There is no default, and a silent default hides the decision.' },
          { t: 'Re-run the load until it works', fb: 'The file does not change by itself.' }
        ],
        best: 0,
        why: 'The recording shows the same file after a merge of two different rates: `' + X('cf.rate_markers').split('\n')[0] + '`, and the same error: `' + X('cf.rate_error').slice(0, 70) + '`. The marker was committed because nothing checked for it. The fix needs a **decision about the rate** from the people who changed it, and a check so that it cannot happen again.',
        checks: [
          ['Find the commit', '`git log -p` on that file shows the merge that introduced the markers.'],
          ['Decide the value', 'Ask the authors of the two branches which rate is right.'],
          ['Fix and test', 'Write the number, and run the loader on a sample file.'],
          ['Prevent', 'Run `git diff --check` or a grep for the markers in CI and in a pre-commit hook.']
        ],
        tell: 'Two branches changed the tax rate. The merge was committed with conflict markers in the file, and the loader could not read it. I asked the two authors for the right rate, fixed the file, and added a check for conflict markers to CI.',
        prevent: ['Run **`git diff --check`** before you commit a merge', 'A **CI check** for conflict markers', 'A **hook** that refuses markers (mission 8)']
      }),

      B.qa({
        id: 'qa-conflict', t: 1, tag: 'Git', secs: 75,
        q: 'What is a merge conflict, and how do you resolve one?',
        pts: ['Both branches changed the same lines, or one deleted what the other changed', 'Git stops the merge and writes markers into the file', 'You edit the file, delete the markers, test, git add, then commit', 'git merge --abort goes back'],
        short: 'A conflict happens when two branches changed the same lines, or one deleted a file that the other changed, and Git cannot decide. It stops in the middle of the merge, writes `<<<<<<<`, `=======` and `>>>>>>>` markers around the two versions in the file, and marks the file unmerged: `UU` in the recording. I open the file, decide what the right text is, which is often both changes, delete the markers, run the model or the tests, run `git diff --check`, then `git add` the file and commit. If it is a mess I run `git merge --abort` and start again. Git keeps the base and both sides in the index as stages 1, 2 and 3, so I can always see what each side did.',
        fu: [['What do ours and theirs mean?', 'In a merge, ours is your branch. In a rebase they swap: ours is the branch you rebase onto.'], ['How do you reduce conflicts?', 'Short branches, frequent rebases on main, and smaller files.']],
        trap: 'Committing without removing the markers, or taking one side by habit.',
        real: 'Describe the last conflict you resolved and how you checked the result.'
      }),

      B.qa({
        id: 'qa-markers', t: 1, tag: 'Git', secs: 60,
        q: 'How do you stop conflict markers from reaching main?',
        pts: ['git diff --check names leftover markers', 'A CI step that fails on the marker lines', 'A pre-commit hook', 'Tests that read the files'],
        short: 'A file with markers is not valid SQL, a number or JSON, so the best protection is the checks that already read the files, plus one that looks for the marker lines. `git diff --check` exits with a non-zero code and names every leftover marker, which I recorded: lines 6, 8 and 10 of the model. I run it before I commit a merge, and I add the same grep to CI, because the recording also shows that a marker in a rate file reached a loader and failed it with a `ValueError`. A pre-commit hook catches it even earlier, on the laptop. A required review does not replace this: people skim past markers in a long diff.',
        fu: [['Why did the SQL tests not catch the rate file?', 'They never read it. A marker only breaks what reads the file.'], ['Can Git refuse to commit a file with markers?', 'Not by default. A hook can, and `git diff --check` is the tool for it.']],
        trap: 'Relying on the review alone.',
        real: 'Say what your CI checks besides tests.'
      }),

      B.qa({
        id: 'qa-stages', t: 2, tag: 'Git', secs: 60,
        q: 'Where does Git keep the versions of a file during a conflict?',
        pts: ['In the index, as three entries for the path', 'Stage 1 is the merge base', 'Stage 2 is ours and stage 3 is theirs', 'git ls-files -u lists them'],
        short: 'In the index. A normal path has one entry, at stage 0. During a conflict it has three: stage 1 is the common ancestor, the merge base, stage 2 is our side, and stage 3 is their side. `git ls-files -u` lists them, and I recorded it: three ids for `models/orders_daily.sql`, numbered 1, 2 and 3. The file in the working tree is only Git\'s attempt to show them in one place with markers. When I `git add` the file, the three entries are replaced by one entry at stage 0, and that is what "resolved" means. This also lets you ask for a whole side with `git checkout --ours FILE` or `--theirs`, and recreate the markers with `git checkout -m FILE`.',
        fu: [['What is the merge base?', 'The last commit that both branches have in common. `git merge-base A B` prints it.'], ['What does `checkout -m` do?', 'It recreates the conflicted file with markers, in case you made a mess. From documentation.']],
        trap: 'Thinking that the markers are the only copy of the two sides.',
        real: 'Explain a conflict in your repository in terms of the three versions.'
      }),

      B.qa({
        id: 'qa-rerere', t: 3, tag: 'Git', secs: 60,
        q: 'What is rerere, and when is it useful?',
        pts: ['It records how you resolved a conflict', 'It reuses the resolution when the same conflict appears again', 'Useful for long-running branches and repeated rebases', 'Enabled with rerere.enabled'],
        short: 'rerere means "reuse recorded resolution". When it is on, Git remembers the conflict and your resolution, and the next time the same conflict appears it applies your resolution by itself. It helps when you rebase a long branch again and again against a moving main, and hit the same conflict each time, or when you merge and then redo the merge. You enable it with `git config rerere.enabled true`. I did not run it in the recording, so this is from documentation. Check the result anyway: it applies the old resolution to the same text, and the code around it may have changed.',
        fu: [['Where does it store resolutions?', 'In `.git/rr-cache`. From documentation.'], ['Is it a team feature?', 'No, it is local to your clone, unless you share the cache.']],
        trap: 'Trusting an automatic resolution without testing.',
        real: 'Say whether you rebase long branches, and how you handle repeated conflicts.'
      }),

      B.recap({
        id: 'm3-recap', n: 3, badge: 'Conflict Solver', color: '#FECACA',
        pts: [
          'A **conflict** stops the merge half way. The status is `UU`. Nothing is lost.',
          'The file holds **markers**. The index holds the **base, ours and theirs** as stages 1, 2 and 3.',
          '**Resolve, test, `git diff --check`, `git add`, commit.** Or `git merge --abort`.',
          'In a **rebase** the sides swap: ours is the branch you rebase onto.',
          'A file with markers is not valid data: the loader failed with a `ValueError`.'
        ],
        lines: [
          'I resolve a conflict by deciding, not by taking a side.',
          'I run git diff --check before I commit a merge.',
          'I regenerate lock files instead of merging them.'
        ]
      })
    ]
  });
})();
