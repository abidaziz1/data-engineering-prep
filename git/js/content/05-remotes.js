/* Mission 5: remotes. Maya and Omar are two clones of one shared repository on the same machine. */
(function () {
  var B = LAB.b, G = LAB.get;
  var C = G.counts, X = G.text;
  var PR = C('rm.push_rejected'), PP = C('rm.pull_plain'), PM = C('rm.pull_merge'), PRB = C('rm.pull_rebase'), PA = C('rm.push_amended'), FL = C('rm.force_with_lease'), FO = C('rm.force'), TR = C('rm.tracking');
  var BADPUSH = 'git add -A\ngit commit -m "Update the model"\ngit push --force origin main\n';
  G.expect(PR.rc === 1 && /\[rejected\]\s+main -> main \(fetch first\)/.test(X('rm.push_rejected')), 'a push that would drop the remote commit is rejected with fetch first');
  G.expect(PP.rc === 128 && /Need to specify how to reconcile divergent branches/.test(X('rm.pull_plain')), 'a plain pull of diverged branches stops and asks how to reconcile');
  G.expect(PM.merge_commits === 1 && PRB.merge_commits === 0 && PRB.commits === 3, 'pull --no-rebase makes a merge commit and pull --rebase makes none');
  G.expect(/\[ahead 1, behind 1\]/.test(X('rm.status_diverged')) && /\[behind 1\]/.test(X('rm.status_behind')), 'status -sb counts the commits ahead and behind');
  G.expect(PA.rc === 1 && /non-fast-forward/.test(X('rm.push_amended')), 'an amended commit is rejected as a non-fast-forward');
  G.expect(FL.rc === 1 && /stale info/.test(X('rm.force_with_lease')), 'force-with-lease refuses when the remote moved after the last fetch');
  G.expect(FO.rc === 0 && FO.omar_commit_still_on_remote === true && FO.remote_main_is_maya === true && /forced update/.test(X('rm.force')), 'a plain force push overwrites the branch while the old commit still exists in the remote');
  G.expect(TR.remote_ref_file_exists === true && /^[0-9a-f]{40}$/.test(X('rm.remote_ref')), 'a remote tracking branch is a file with a commit id');

  LAB.addChapter({
    id: 'm5', n: 5, title: 'Remotes and collaboration', short: 'Remotes', blurb: 'Clone, fetch, push, and why a push is refused', minutes: 19,
    focus: ['air', 'src'],
    goals: [
      'Say what a **remote**, a **tracking branch** and a **clone** are.',
      'Read a **rejected push** and fix it with fetch and rebase or merge.',
      'Tell `pull`, `fetch`, `pull --rebase` apart.',
      'Use **`--force-with-lease`** and know what a plain `--force` costs.'
    ],
    say: 'Git has no central server. Every clone is a full copy, and a remote is another copy that people agree to share. Most of what goes wrong in teams happens at the push. We use a real shared repository and two clones, make Git refuse a push, and read every word it says.',
    scenes: [
      B.flow({
        id: 'm5-flow', t: 1, src: 'docs', title: 'Two clones and one shared repository', g: 'remote', legend: true,
        steps: [
          { say: 'Maya and Omar both cloned the same repository. Each clone has the full history. Press Next.', focus: ['maya', 'origin', 'omar'], cap: 'Every clone is a full copy.' },
          { say: 'Step 1. Omar commits and **pushes first**. The remote accepts it, because it only adds a commit to what the remote has.', on: ['e1'], focus: ['omar', 'origin'], tags: ['tg_first'], cap: 'Omar pushes first.' },
          { say: 'Step 2. Maya made a commit from the same starting point and pushes. The remote has a commit that she does not. Accepting her push would **drop Omar\'s commit**, so the remote **refuses**.', on: ['e2'], focus: ['maya', 'origin'], tags: ['tg_refused'], cap: 'Maya is refused.' },
          { say: 'Step 3. Maya **fetches**: she gets Omar\'s commit into her clone without touching her files.', on: ['e3'], focus: ['origin', 'maya'], tags: ['tg_fetch'], cap: 'She fetches their commit.' },
          { say: 'Step 4. She combines the two lines with a merge or a rebase, and pushes again. Now her push **adds** to the remote, and it is accepted. Omar fetches and has her commit too.', on: ['e4'], focus: ['origin', 'omar'], cap: 'Combine, then push.' }
        ]
      }),

      B.term({
        id: 'm5-clone', t: 1, src: 'rec', title: 'Push to a new remote and clone it',
        say: 'Maya made the first commit, and pushed it to an empty shared repository. Omar cloned it.',
        lines: function () {
          return G.term([
            ['git push -u origin main', X('rm.push_first')],
            ['git remote -v', X('rm.remote_v')],
            ['git branch -vv', X('rm.branch_vv')],
            ['git clone ~/origin.git omar', X('rm.clone')]
          ]);
        },
        after: '`origin` is just the **name of a URL** in the settings of the repository. `git push -u` pushed `main` and told Git that the local `main` **follows** `origin/main`, which is what the `[origin/main]` in `git branch -vv` shows. A clone is a copy of everything, history included, plus the same setup. Here the "server" is a folder, and the commands are the same for a hosted one.',
        afterKind: 'tip',
        doneSay: 'A remote is a name for a URL. A clone is a full copy.'
      }),

      B.term({
        id: 'm5-reject', t: 1, src: 'rec', title: 'A push that is refused',
        say: 'Omar pushed a commit. Maya, who had not fetched, made a commit of her own and pushed.',
        lines: function () {
          return G.term([
            ['git push origin main', X('rm.push_rejected')],
            ['git fetch origin && git status -sb', X('rm.status_diverged')],
            ['git log --oneline --graph --all --decorate', X('rm.graph_diverged')]
          ]);
        },
        after: 'The push was refused with `(fetch first)`: the remote has work that Maya does not have, and Git will not let her **overwrite** it (exit code ' + PR.rc + '). Nothing changed anywhere. After the fetch, `status -sb` says **`ahead 1, behind 1`**: the two histories **diverged**. The graph shows both lines from the same starting commit. Maya has to combine them before she can push.',
        afterKind: 'tip',
        doneSay: 'Refused with fetch first means: the remote has newer work.'
      }),

      B.term({
        id: 'm5-pull', t: 1, src: 'rec', title: 'pull is fetch plus a choice',
        say: 'Maya ran `git pull`. Then she tried both ways that Git offered, each on a copy.',
        lines: function () {
          return G.term([
            ['git pull   # no setting for pull.rebase', X('rm.pull_plain')],
            ['git pull --no-rebase --no-edit', X('rm.pull_merge')],
            ['git pull --rebase', X('rm.pull_rebase')],
            ['git log --oneline --graph --decorate', X('rm.graph_rebased')]
          ]);
        },
        after: '`git pull` is **a fetch followed by a merge or a rebase**. With two diverged branches and no setting, Git **refuses to choose** (exit code ' + PP.rc + ') and lists the options. `--no-rebase` merged and made **' + PM.merge_commits + '** merge commit. `--rebase` replayed Maya\'s commit on top of Omar\'s: **' + PRB.merge_commits + '** merge commits and a straight line of ' + PRB.commits + ' commits. Set it once with `git config pull.rebase true` (or false, or `pull.ff only`) so that the question does not come up again.',
        afterKind: 'tip',
        doneSay: 'pull is a fetch plus a merge or a rebase. Choose once.'
      }),

      B.widget({ id: 'm5-lab', kind: 'push', t: 1, src: 'rec', title: 'Lab: six pushes' }),

      B.term({
        id: 'm5-ok', t: 1, src: 'rec', title: 'Push again, and fetch on the other side',
        say: 'After the rebase Maya pushed. Omar fetched and looked at his status, then pulled with `--ff-only`.',
        lines: function () {
          return G.term([
            ['git push origin main', X('rm.push_ok')],
            ['git ls-remote origin', X('rm.ls_remote')],
            ['git fetch && git status -sb   # on Omar\'s side', X('rm.status_behind')],
            ['git pull --ff-only', X('rm.pull_ff')]
          ]);
        },
        after: 'The push now **adds** to the remote: the report shows the old and the new id (`a..b`) of the branch. `git ls-remote` lists what the remote has, without fetching. Omar\'s `status -sb` says **`behind 1`**: he has nothing that the remote lacks, so `git pull --ff-only` only has to move his branch forward. `--ff-only` **refuses** instead of merging, which makes it a safe default for a branch that you do not commit to.',
        afterKind: 'tip',
        doneSay: 'A push adds. --ff-only refuses to merge.'
      }),

      B.term({
        id: 'm5-force', t: 1, src: 'rec', title: 'Force, and force with a lease',
        say: 'Maya amended her pushed commit, which gave it a new id, and tried to push. Then Omar pushed another commit that she had not fetched. She tried `--force-with-lease`, and then plain `--force`.',
        lines: function () {
          return G.term([
            ['git commit --amend -m "..." && git push origin main', X('rm.push_amended')],
            ['git push --force-with-lease origin main   # Omar pushed since her last fetch', X('rm.force_with_lease')],
            ['git push --force origin main', X('rm.force')]
          ]);
        },
        after: 'The amended commit is not a **descendant** of the one on the remote, so a normal push is refused as a **non-fast-forward**. `--force-with-lease` overwrites only if the remote is **where Maya last saw it**: Omar had pushed, so it refused with **stale info**, and Omar\'s commit was safe. Plain `--force` has no such check and printed `forced update`: Omar\'s newest commit is **no longer on `main`**. The commit still existed in the remote repository (' + FO.omar_commit_still_on_remote + '), but only its id, which Omar has in his clone, finds it.',
        afterKind: 'warn',
        doneSay: 'force-with-lease checks the remote. force does not.'
      }),

      B.term({
        id: 'm5-track', t: 1, src: 'rec', title: 'A tracking branch is a file',
        say: 'What does `origin/main` mean in `git status`? I looked inside the repository.',
        lines: function () {
          return G.term([
            ['cat .git/refs/remotes/origin/main', X('rm.remote_ref')],
            ['cat .git/config   # the part about origin and main', X('rm.config')]
          ]);
        },
        after: '`origin/main` is a file with a commit id, like a branch, and it is the place where **your clone last saw** `main` on the remote. Only `git fetch` and `git push` update it. This is why a status can say `up to date` while the remote has moved: it compares with the **last fetch**, not with the server. The config names the URL of `origin` and says that the local `main` merges from `origin/main`.',
        afterKind: 'tip',
        doneSay: 'origin/main is where you last saw main. fetch updates it.'
      }),

      B.cmp({
        id: 'm5-cmp', t: 1, src: 'rec', title: 'fetch, pull and push',
        say: 'Three commands, three directions. Press Next.',
        cols: ['Command', 'Touches the remote?', 'Touches your files?', 'What it does'],
        hl: 0,
        rows: [
          ['`git fetch`', 'Reads from it', 'No', 'Downloads commits and updates `origin/main`. Always safe'],
          ['`git pull`', 'Reads from it', 'Yes', 'A fetch, then a merge or a rebase into your branch'],
          ['`git pull --rebase`', 'Reads from it', 'Yes', 'A fetch, then your commits are replayed on top of theirs: ' + PRB.merge_commits + ' merge commits'],
          ['`git push`', 'Writes to it', 'No', 'Adds your commits, if they extend what the remote has'],
          ['`git push --force-with-lease`', 'Writes to it', 'No', 'Overwrites, only if nobody pushed since your last fetch'],
          ['`git push --force`', 'Writes to it', 'No', 'Overwrites whatever is there']
        ],
        steps: [
          { upto: 1, say: 'Fetch is the harmless one. When in doubt, fetch and look.' },
          { upto: 3, say: 'Pull changes your files and your history. Choose merge or rebase once, in the settings.' },
          { upto: 6, say: 'Pushes change what other people see. The last one has no brakes.' }
        ]
      }),

      B.bug({
        id: 'm5-bug', t: 1, src: 'docs', q: 'This is a daily routine that one engineer wrote for pushing a model change to the shared `main`. Click the line that can overwrite a colleague\'s commit.',
        file: 'daily.sh', lang: 'bash', code: BADPUSH, bad: [3],
        hint: 'One flag turns a safe push into one with no check.',
        why: '`--force` pushes **whatever you have**, whether or not the remote has newer commits. If Omar pushed a minute ago, his commit is dropped from `main`, as in the recording where `forced update` replaced Omar\'s commit. A normal `git push` refuses in that case, and tells you to fetch. If you do need to force after a rebase, `--force-with-lease` refuses when the remote moved.',
        fix: 'git add -A\ngit commit -m "Update the model"\ngit pull --rebase\ngit push origin main\n',
        cheer: 'A refused push is a feature. Do not silence it.'
      }),

      B.order({
        id: 'm5-ord', t: 1, q: 'Your push was refused with `fetch first`. Put the steps to finish in order.',
        items: [
          '`git fetch origin` to see what the remote has',
          '`git log --oneline --graph --all` to see how the histories diverged',
          '`git pull --rebase` (or a merge) to combine them',
          'Run the tests again on the combined result',
          '`git push origin main`'
        ],
        why: 'Combining changes the code that you are about to publish, so test it again. The fetch and the graph are cheap and show you whether the other commits touch your files before you combine.'
      }),

      B.quiz({
        id: 'm5-q1', t: 1,
        q: 'Your push says `! [rejected] main -> main (fetch first)`. What does it mean?',
        opts: [
          { t: 'The remote has commits that you do not have, and your push would drop them', fb: '' },
          { t: 'You do not have the right to push', fb: 'That is a different message: permission denied.' },
          { t: 'Your commit is too large', fb: 'Size is not the reason.' },
          { t: 'The remote is down', fb: 'A down remote gives a connection error.' }
        ],
        ok: 0, why: 'In the recording Omar had pushed first, and Maya\'s push was refused with exactly this line. Nothing changed on either side.'
      }),

      B.quiz({
        id: 'm5-q2', t: 1,
        q: 'What does `git status` mean by `behind 1` after a fetch?',
        opts: [
          { t: 'The remote has one commit that your branch does not have', fb: '' },
          { t: 'Your branch has one commit that the remote does not have', fb: 'That is `ahead 1`.' },
          { t: 'One file is not up to date', fb: 'It counts commits, not files.' },
          { t: 'The fetch failed once', fb: 'It has nothing to do with errors.' }
        ],
        ok: 0, why: 'On Omar\'s side the status line was `' + X('rm.status_behind').replace('## ', '') + '`. With nothing of his own to push, `git pull --ff-only` just moved the branch forward.'
      }),

      B.quiz({
        id: 'm5-q3', t: 2,
        q: 'You must force-push a rebased feature branch. Which command is the better choice?',
        opts: [
          { t: '`git push --force-with-lease`: it refuses if the remote moved since your last fetch', fb: '' },
          { t: '`git push --force`: it is the same, only shorter', fb: 'It has no check at all.' },
          { t: 'Delete the remote branch and push again', fb: 'It is a force push in two steps, with the same risk.' },
          { t: '`git push --mirror`', fb: 'That pushes every ref and is far more dangerous.' }
        ],
        ok: 0, why: 'In the recording `--force-with-lease` answered `stale info` and protected Omar\'s commit, while `--force` printed `forced update`.'
      }),

      B.decide({
        id: 'm5-dec', t: 2, src: 'docs', title: 'Decision: force pushes on a shared repository',
        scenario: 'Eight people push to the same repository. Feature branches are rebased by their owners. `main` and `release` hold what runs in production. Two force pushes to shared branches have already cost people an afternoon.',
        opts: [
          { t: 'Protect `main` and `release` on the server so that nobody can force-push them, and use `--force-with-lease` on personal branches', d: 'The branches that matter cannot be rewritten at all. Personal branches can be, safely.', lose: 'Rewriting `main` for a real emergency needs an administrator to lift the rule.' },
          { t: 'Ask everyone to never force-push', d: 'No setup needed.', lose: 'It depends on memory. The two incidents happened despite it.' },
          { t: 'Allow `--force` on every branch, and rely on backups', d: 'Nothing blocks anybody.', lose: 'A backup restores yesterday and does not tell you which commit was lost today.' }
        ],
        pick: 0,
        why: 'A rule that the server enforces works at 2 a.m., and a rule that people remember does not. Protection of shared branches is a setting of hosted platforms, so it is **from documentation** here: no platform ran in the course.',
        when: 'A repository of one or two people can run on trust and `--force-with-lease`.'
      }),

      B.incident({
        id: 'm5-inc', t: 2, src: 'rec', title: 'Incident: a colleague\'s commit is gone from main', time: '16:40',
        alert: '**Omar\'s commit "Add a note" is no longer on `main`, and he says he pushed it at 16:20.** The last push to `main` was a **forced update** by Maya at 16:30, after she amended her last commit.',
        clues: ['The push report of Maya shows `+ ... (forced update)`', 'Omar still has the commit in his clone and in his reflog', 'The repository on the server has not been cleaned up'],
        opts: [
          { t: 'Omar pushes the commit again, or a branch at it, and Maya fetches and rebases onto it; then turn on branch protection', fb: '' },
          { t: 'Ask Omar to write the note again', fb: 'His commit still exists in his clone.' },
          { t: 'Force-push again to put Omar\'s commit back', fb: 'That can drop Maya\'s newest work in turn.' },
          { t: 'Delete the repository on the server and recreate it', fb: 'You would lose every other clone\'s link and more.' }
        ],
        best: 0,
        why: 'This is the recorded case: `--force` replaced `main` with Maya\'s commit, and Omar\'s commit survived in the remote repository (' + FO.omar_commit_still_on_remote + ') and in his clone. Pushing it again brings it back, and Maya then combines the two lines. `--force-with-lease` would have refused, with `stale info`.',
        checks: [
          ['Find the commit', 'Omar\'s `git reflog` or `git log` has its id.'],
          ['Put it back', '`git push origin COMMIT:refs/heads/rescue`, then combine on `main` the normal way.'],
          ['Tell the team', 'Say which commits were affected and when.'],
          ['Prevent', 'Protect `main` on the server, and use `--force-with-lease`.']
        ],
        tell: 'Maya amended a pushed commit and force-pushed, which replaced main and dropped a commit that Omar had pushed ten minutes earlier. His clone still had it, so he pushed it back on a branch and we combined the two lines. We protected main so that nobody can force-push it, and we use force-with-lease.',
        prevent: ['**Protect** shared branches on the server', '`--force-with-lease` on personal branches', 'Do not **amend or rebase** what is pushed']
      }),

      B.qa({
        id: 'qa-fetchpull', t: 1, tag: 'Git', secs: 60,
        q: 'What is the difference between git fetch and git pull?',
        pts: ['fetch downloads commits and updates origin/main, and changes nothing else', 'pull is a fetch followed by a merge or a rebase', 'pull changes your files and your history', 'Choose merge or rebase with pull.rebase'],
        short: '`git fetch` downloads the new commits from the remote and updates the remote tracking branches such as `origin/main`. It does not touch your branch or your files, so it is always safe. `git pull` is a fetch followed by a merge or a rebase of your branch, so it changes your files and your history. When the branches have diverged, Git refuses to choose a strategy unless a setting says so: the recording stopped with `Need to specify how to reconcile divergent branches`. I set `pull.rebase true` or use `--ff-only`, and I fetch first when I want to look before I combine.',
        fu: [['What is `origin/main`?', 'The place where your clone last saw `main` on the remote. A fetch moves it.'], ['What does `git pull --ff-only` do?', 'It moves your branch forward, or refuses.']],
        trap: 'Saying that pull downloads and fetch merges.',
        real: 'Say which pull setting you use and why.'
      }),

      B.qa({
        id: 'qa-rejected', t: 1, tag: 'Git', secs: 75,
        q: 'Your push was rejected with "fetch first" or "non-fast-forward". Why, and what do you do?',
        pts: ['The remote has commits that you do not have', 'A push is accepted only if it adds to the remote branch', 'Fetch, combine with a merge or a rebase, test, push again', 'Never solve it with --force'],
        short: 'Git accepts a push only when it **extends** the remote branch: your new commit must have the remote tip as an ancestor. When someone pushed first, or when I rewrote a commit that was already pushed, my history is not a descendant of the remote one, and accepting it would drop their commits, so the remote refuses. The message is `fetch first` in the first case, as in my recording, and `non-fast-forward` in the second. I fetch, look at `git log --graph --all`, combine with `git pull --rebase` or a merge, run the tests again, and push. If I really rewrote history on my own branch, I use `--force-with-lease` and not `--force`, because the lease refuses when somebody pushed in the meantime.',
        fu: [['Is the rejected push harmful?', 'No. Nothing changes on either side.'], ['What if the branch is protected?', 'Then the server also refuses force pushes and may need a pull request. From documentation.']],
        trap: 'Pushing with --force to make the message go away.',
        real: 'Describe the last time a push was refused and what you did.'
      }),

      B.qa({
        id: 'qa-lease', t: 2, tag: 'Git', secs: 60,
        q: 'What is --force-with-lease, and why is it better than --force?',
        pts: ['It overwrites the remote only if it is where you last saw it', 'If somebody pushed since your last fetch, it refuses', 'Plain force has no check', 'It still rewrites history, so it is for your own branches'],
        short: '`--force-with-lease` is a force push with a condition: it overwrites the remote branch only if the remote still points where your clone last saw it, in `origin/branch`. If a colleague pushed after my last fetch, it refuses with `stale info`, which is what the recording showed: Omar had pushed, so Maya\'s lease push was refused and his commit was safe. Plain `--force` has no condition and printed `forced update`, and Omar\'s commit was gone from the branch. The lease is not perfect: if I fetch without looking and then force, it lets me overwrite what I fetched. `--force-if-includes` closes that gap. And it still rewrites history, so it is for personal feature branches, and protected branches should refuse any force.',
        fu: [['Where does the lease look?', 'At the remote tracking branch in your clone. From documentation.'], ['When is a force push legitimate?', 'After you rebase or amend your own pushed branch.']],
        trap: 'Believing that the lease makes a force push safe on a shared branch.',
        real: 'Say what your team allows for force pushes.'
      }),

      B.qa({
        id: 'qa-prune', t: 3, tag: 'Git', secs: 60,
        q: 'What are stale remote branches, and how do you clean up?',
        pts: ['A remote branch that was deleted on the server still shows as origin/name in your clone', 'git fetch --prune removes those tracking refs', 'git branch -d removes your local branches that are merged', 'fetch.prune true does it on every fetch'],
        short: 'When a branch is deleted on the server, for example after a pull request is merged, your clone keeps the remote tracking branch `origin/feature` until you ask it to forget: `git fetch --prune`, or `git config fetch.prune true` to do it on every fetch. Your own local branch is separate and stays until you delete it with `git branch -d`, which refuses if it is not merged, as the squash recording showed. `git branch -vv` marks local branches whose upstream is gone. I tidy up after each merged pull request, because a list of fifty old branches hides the three that matter. This is documentation: I did not delete a branch on the remote in the recording.',
        fu: [['How do you delete a remote branch?', '`git push origin --delete NAME`. From documentation.'], ['Does pruning delete commits?', 'No. It deletes names. The commits stay until gc.']],
        trap: 'Thinking that deleting a branch deletes its commits.',
        real: 'Say how your team cleans up merged branches.'
      }),

      B.recap({
        id: 'm5-recap', n: 5, badge: 'Collaborator', color: '#BBF7D0',
        pts: [
          'A **remote** is a name for a URL. A **clone** is a full copy. `origin/main` is where you **last saw** the remote.',
          'A push is accepted only if it **adds**. Refused with `fetch first`: fetch, combine, test, push.',
          '`pull` is a fetch plus a merge or a rebase. `pull --rebase` made ' + PRB.merge_commits + ' merge commits. Choose once.',
          '`--force-with-lease` answered **stale info** and saved a commit. `--force` printed `forced update`.',
          'Protect shared branches on the server.'
        ],
        lines: [
          'I fetch and read before I push.',
          'I use force-with-lease, never plain force.',
          'I set pull.rebase once.'
        ]
      })
    ]
  });
})();
