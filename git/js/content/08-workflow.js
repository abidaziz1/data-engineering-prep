/* Mission 8: hooks, tags, CI and the habits of a team. Hooks, tags and a shallow clone ran in real repositories. Hosted platforms did not run. */
(function () {
  var B = LAB.b, G = LAB.get;
  var C = G.counts, X = G.text;
  var HK = G.file('hooks/pre-commit'), CI = G.file('.github/workflows/check.yml'), HR = C('hk.refused'), NV = C('hk.no_verify'), HC = C('hk.clone'), HP = C('hk.path'), TY = C('tag.types'), TP = C('tag.push'), FX = C('fx'), TS = C('tag.shallow'), TU = C('tag.unshallow');
  var SHALLOWCI = 'steps:\n  - uses: actions/checkout@v4\n  - run: git describe --tags\n';
  G.expect(HR.rc === 1 && HR.commits === 1 && /looks like a secret/.test(X('hk.refused')), 'the pre-commit hook refuses the commit and no commit is made');
  G.expect(NV.rc === 0 && NV.commits === 2, 'the same commit passes with --no-verify');
  G.expect(HC.hooks_in_the_clone.length === 0 && HC.samples > 0 && HC.the_original_has_pre_commit === true && HP.value === '.githooks', 'a clone has only sample hooks, and core.hooksPath can point at a folder in the repository');
  G.expect(TY.lightweight === 'commit' && TY.annotated === 'tag' && /Release 1\.1\.0/.test(X('tag.show_annotated')) && /^v1\.1\.0-\d+-g[0-9a-f]+$/.test(X('tag.describe')), 'a lightweight tag is a commit name and an annotated tag is an object with a message');
  G.expect(TP.after_plain_push.length === 0 && TP.after_follow_tags.join() === 'v1.1.0', 'a plain push sends no tags and --follow-tags sends the annotated one');
  G.expect(FX.commits_before === 4 && FX.commits_after === 3 && FX.dag_has_the_fix === true, 'a fixup commit is folded into the commit it fixes by an autosquash rebase');
  G.expect(TS.rc === 128 && /No names found/.test(X('tag.describe_shallow')) && TS.commits === 1 && TU.rc === 0 && TU.tags_in_the_clone.join() === 'v1.1.0', 'describe fails in a shallow clone and works after fetching the history and the tags');
  G.expect(/fetch-depth: 0/.test(CI), 'the workflow file fetches the whole history');

  LAB.addChapter({
    id: 'm8', n: 8, title: 'Hooks, tags and CI', short: 'Workflow', blurb: 'Stopping a bad commit early, naming a release, and what the team agrees on', minutes: 20,
    focus: ['ci', 'mon'],
    goals: [
      'Write a **pre-commit hook**, and know why it is not enough.',
      'Tell **lightweight and annotated tags** apart, and push them.',
      'Make CI see the **history it needs** for describe and tags.',
      'Choose a **branching strategy** and a **commit message** habit for a team.'
    ],
    say: 'A team is a set of habits that Git helps to enforce. A hook can stop a bad commit on your laptop, CI stops it on the server, a review stops it before main, and a tag names what shipped. We build a hook that refuses a key, see that it does not travel with the repository, and tag a release.',
    scenes: [
      B.flow({
        id: 'm8-flow', t: 1, src: 'docs', title: 'The path of a change to a release', g: 'flow', legend: true,
        steps: [
          { say: 'The path of a change in a team. Press Next.', focus: ['you', 'hook', 'repo', 'rem', 'ci', 'rev', 'main', 'tag'], cap: 'Many checks, one after another.' },
          { say: 'Step 1. You commit. A **pre-commit hook**, a script in your clone, runs first and can **stop the commit**. It is the fastest feedback, and it only works on machines where it is installed.', on: ['e1', 'e2'], focus: ['you', 'hook', 'repo'], tags: ['tg_bypass', 'tg_nohooks'], cap: 'The hook runs on your machine.' },
          { say: 'Step 2. You push the branch. The remote now has it, and **CI** starts: a job that checks out the commit on a clean machine and runs the same checks as the hook, and more.', on: ['e3', 'e4'], focus: ['repo', 'rem', 'ci'], cap: 'CI checks on a clean machine.' },
          { say: 'Step 3. A person **reviews** the change, and CI must be green. Many teams make both a rule of the **protected** main branch.', on: ['e5', 'e6'], focus: ['ci', 'rev', 'main'], cap: 'A review and a green CI.' },
          { say: 'Step 4. When main is ready to ship, you **tag** it. The tag names the exact commit that was released, so that a bug report for 1.2.0 can be reproduced.', on: ['e7'], focus: ['main', 'tag'], cap: 'A tag names the release.' }
        ]
      }),

      B.code({
        id: 'm8-hook', t: 1, src: 'rec', title: 'A pre-commit hook', file: 'hooks/pre-commit', lang: 'bash', code: HK,
        steps: [
          { say: 'A shell script named `pre-commit` in `.git/hooks`. Git runs it before every commit. A non-zero exit **cancels** the commit. Press Next.', lines: null },
          { say: 'It looks at the **staged** changes only: lines that are being added.', lines: G.span(HK, /git diff --cached/) },
          { say: 'The pattern: an AWS-style access key id, or a `token = ` followed by 16 or more characters. A real scanner has many more patterns.', lines: G.span(HK, /AKIA/) },
          { say: 'It prints why, and exits with 1.', lines: G.span(HK, /echo/, /exit 1/) }
        ],
        note: 'Hooks are plain scripts in any language. They need the execute bit.'
      }),

      B.term({
        id: 'm8-refused', t: 1, src: 'rec', title: 'The hook stops a commit',
        say: 'A settings file with the example AWS key was staged. I committed, and then tried again with `--no-verify`.',
        lines: function () {
          return G.term([
            ['git add loader/settings.py && git commit -m "Add settings"', X('hk.refused')],
            ['git rev-list --count HEAD   # commits so far', String(HR.commits)],
            ['git commit --no-verify -m "Add settings"', '(the commit is made)'],
            ['git rev-list --count HEAD', String(NV.commits)]
          ]);
        },
        after: 'The hook printed its message and exited with code ' + HR.rc + ': **no commit was made** (' + HR.commits + ' commit in the history). `--no-verify` **skips all hooks**: the same commit went through, and there are now ' + NV.commits + ' commits. A hook is a **helper for honest people**, not a lock. CI, which nobody can skip from their laptop, is the check that counts.',
        afterKind: 'warn',
        doneSay: 'A hook can be skipped. CI cannot.'
      }),

      B.term({
        id: 'm8-nohooks', t: 1, src: 'rec', title: 'Hooks do not travel with a clone',
        say: 'I cloned the repository that has the hook, and listed the hooks of the clone. Then I put the hook in a folder of the repository and pointed Git at it.',
        lines: function () {
          return G.term([
            ['ls .git/hooks   # in the original repository', 'pre-commit  (and the sample files)'],
            ['ls .git/hooks   # in a clone, without the .sample files', HC.hooks_in_the_clone.length ? HC.hooks_in_the_clone.join(' ') : '(nothing: only ' + HC.samples + ' sample files)'],
            ['git config core.hooksPath .githooks && git config --get core.hooksPath', HP.value]
          ]);
        },
        after: 'The clone has **no pre-commit hook**: only ' + HC.samples + ' `.sample` files. Everything inside `.git` is local, so a hook is **not** part of what you push, and every new laptop is unprotected until somebody installs it. The fix is to keep the hook **in the repository** (here `.githooks/`) and set `core.hooksPath` once per clone, or to use a tool such as the `pre-commit` framework, which installs hooks from a config file in the repository. Those tools did not run here.',
        afterKind: 'tip',
        doneSay: 'Hooks live in .git and are not cloned. Keep them in the repository.'
      }),

      B.term({
        id: 'm8-tags', t: 1, src: 'rec', title: 'Tags: lightweight and annotated',
        say: 'Two releases. `v1.0.0` is a lightweight tag. `v1.1.0` is annotated, with a message. Then two commits followed.',
        lines: function () {
          return G.term([
            ['git tag -l', X('tag.list')],
            ['git cat-file -t v1.0.0   # lightweight', TY.lightweight],
            ['git cat-file -t v1.1.0   # annotated', TY.annotated],
            ['git show --no-patch v1.1.0', X('tag.show_annotated')],
            ['git describe', X('tag.describe')]
          ]);
        },
        after: 'A **lightweight** tag is only a name for a commit: the object type is `' + TY.lightweight + '`. An **annotated** tag is an **object** (`' + TY.annotated + '`) with a tagger, a date and a message, and it can be signed. Use annotated tags for releases. `git describe` names the current commit from the nearest tag: **`' + X('tag.describe') + '`** reads as "two commits after v1.1.0, at commit ' + X('tag.describe').split('-g')[1] + '". A build can put that string in the version of a package.',
        afterKind: 'tip',
        doneSay: 'Annotated tags are objects with a message. describe builds a version name.'
      }),

      B.term({
        id: 'm8-pushtags', t: 1, src: 'rec', title: 'Tags are not pushed by default',
        say: 'I removed the tags from the remote, pushed `main`, and listed the tags there. Then I pushed with `--follow-tags`.',
        lines: function () {
          return G.term([
            ['git push origin main   # then: git tag -l on the remote', TP.after_plain_push.length ? TP.after_plain_push.join(' ') : '(no tags)'],
            ['git push --follow-tags origin main   # then: git tag -l on the remote', TP.after_follow_tags.join(' ')]
          ]);
        },
        after: 'A plain `git push` sends **commits and no tags**: the remote had none. `--follow-tags` sends the **annotated** tags that point to the commits being pushed, and `v1.1.0` arrived. The lightweight `v1.0.0` did **not** come with it, because `--follow-tags` only follows annotated ones. `git push --tags` sends every tag, annotated or not. A team usually pushes release tags on purpose, and protects them on the server.',
        afterKind: 'warn',
        doneSay: 'push does not send tags. --follow-tags sends annotated ones.'
      }),

      B.term({
        id: 'm8-fixup', t: 1, src: 'rec', title: 'Fold a fix into the commit it belongs to',
        say: 'A review found a mistake in the DAG, in the second of three commits. I committed the fix as a **fixup** of that commit, and ran an interactive rebase that applies it automatically.',
        lines: function () {
          return G.term([
            ['git commit --fixup HEAD~1   # after fixing the schedule in the DAG', '(a commit called "fixup! Add the nightly DAG")'],
            ['git log --oneline', X('fx.log_before')],
            ['git rebase -i --autosquash HEAD~3   # the editor only confirms', X('fx.rebase')],
            ['git log --oneline', X('fx.log_after')]
          ]);
        },
        after: 'The fixup commit was moved **under the commit that it fixes** and squashed into it: the history went from ' + FX.commits_before + ' to **' + FX.commits_after + ' commits**, and the DAG commit now holds the right schedule (' + FX.dag_has_the_fix + '). The reviewer sees one clean commit instead of "fix review comments". It rewrites commits, so it is for a branch that is **not shared yet**. `rebase.autoSquash true` makes it the default.',
        afterKind: 'tip',
        doneSay: 'fixup plus autosquash tidies a branch before it is shared.'
      }),

      B.code({
        id: 'm8-ci', t: 1, src: 'rec', title: 'A CI workflow', file: '.github/workflows/check.yml', lang: 'yaml', code: CI,
        steps: [
          { say: 'The workflow that runs the check of the project on a hosted CI. It is a GitHub Actions file, and the recording **parsed** it. The hosted run itself did not happen. Press Next.', lines: null },
          { say: 'It runs on every pull request and on every push to `main`.', lines: G.span(CI, /^on:/, /branches/) },
          { say: 'The first step checks out the code. **`fetch-depth: 0`** fetches the **whole history**: the default is a shallow checkout of one commit.', lines: G.span(CI, /uses: actions\/checkout/, /fetch-depth/) },
          { say: 'The second step runs the same script that the hook and bisect use.', lines: G.span(CI, /Run the checks/, /run:/) }
        ],
        note: 'The workflow was checked as YAML by the verifier. GitHub did not run it.'
      }),

      B.term({
        id: 'm8-shallow', t: 1, src: 'rec', title: 'Why CI needs the history',
        say: 'CI usually checks out one commit. I cloned the tagged repository with `--depth 1` and asked for a version name.',
        lines: function () {
          return G.term([
            ['git clone --depth 1 URL ci && cd ci && git tag -l', TS.tags_in_the_clone.length ? TS.tags_in_the_clone.join(' ') : '(no tags)'],
            ['git describe   # exit code ' + TS.rc, X('tag.describe_shallow')],
            ['git fetch --unshallow --tags && git describe', X('tag.describe_full')]
          ]);
        },
        after: 'The shallow clone has **' + TS.commits + ' commit and no tags**, so `git describe` fails: `' + X('tag.describe_shallow') + '`. Anything that needs history fails the same way: `describe`, `blame`, `bisect`, `git log` of a file, and a changelog built from commit messages. After `--unshallow --tags` it works: `' + X('tag.describe_full') + '`. In CI the fix is `fetch-depth: 0`, as in the workflow above, or a fetch of the tags in a later step.',
        afterKind: 'warn',
        doneSay: 'A shallow clone has no history and no tags.'
      }),

      B.cmp({
        id: 'm8-strategy', t: 2, src: 'docs', title: 'Branching strategies',
        say: 'How a team uses branches is a choice. Press Next.',
        cols: ['', 'Trunk-based', 'Feature branches and pull requests', 'Release branches (GitFlow)'],
        hl: 2,
        rows: [
          ['Branches', 'Everybody commits to `main`, or to branches that live less than a day', 'Short branches for each change, merged by a pull request', 'Long-lived `develop` and `release` branches next to `main`'],
          ['Good for', 'Small teams with strong tests and feature flags', 'Most teams. A reviewed unit for every change', 'Software shipped in numbered versions that are maintained in parallel'],
          ['Risk', 'A bad commit reaches everybody at once', 'Branches that live for weeks and conflict', 'Merge work and drift between the long branches'],
          ['Releases', 'A tag on main', 'A tag on main', 'A branch for each release, with cherry-picks of fixes']
        ],
        steps: [
          { upto: 2, say: 'Trunk-based and feature branches both keep one main line. They differ in how long a branch lives.' },
          { upto: 4, say: 'Release branches fit a product with versions in the field. A data pipeline that runs only the newest code rarely needs them. This table is from documentation: no platform ran here.' }
        ]
      }),

      B.cmp({
        id: 'm8-messages', t: 1, src: 'docs', title: 'A commit message that helps',
        say: 'Six months later the message is all you have. Press Next.',
        cols: ['Instead of', 'Write', 'Because'],
        hl: 1,
        rows: [
          ['`fix`', '`Fix the double count of refunds in orders_daily`', 'It says what and where, so `git log` is a table of contents'],
          ['`update model`', '`Add avg_amount to orders_daily for the margin report`', 'It says why: the next person knows when it can be removed'],
          ['`wip`, `asdf`, `final2`', '(tidy before you share: fixup, squash, amend)', 'A history is read by others, long after you wrote it'],
          ['A subject of 120 characters', 'A subject up to about 50 characters, a blank line, a body for the why', 'Tools cut long subjects, and the body is where the reason fits']
        ],
        steps: [
          { upto: 2, say: 'Name the change and the reason. The diff already says how.' },
          { upto: 4, say: 'Work-in-progress commits are fine on your own branch. Clean them up before the review.' }
        ]
      }),

      B.bug({
        id: 'm8-bug', t: 1, src: 'rec', q: 'This CI job names the build from `git describe`, and fails with "No names found". The tags exist on the remote. Click the line that is the problem.',
        file: 'ci.yml', lang: 'yaml', code: SHALLOWCI, bad: [2],
        hint: 'What does the checkout step fetch when you give it no options?',
        why: 'The default checkout is **shallow**: one commit and no tags, so `git describe` has nothing to name. The recording shows the same: a clone with `--depth 1` had ' + TS.commits + ' commit and ' + TS.tags_in_the_clone.length + ' tags, and `describe` failed with `' + X('tag.describe_shallow') + '`. Add `with: fetch-depth: 0` to the checkout step.',
        fix: 'steps:\n  - uses: actions/checkout@v4\n    with:\n      fetch-depth: 0\n  - run: git describe --tags\n',
        cheer: 'If a job reads history, fetch the history.'
      }),

      B.order({
        id: 'm8-ord', t: 1, q: 'Put the steps of cutting a release in order.',
        items: [
          'Make sure `main` is green in CI and has the commits that you want',
          '`git tag -a v1.2.0 -m "Release 1.2.0: ..."` on that commit',
          '`git push origin v1.2.0` (or `git push --follow-tags`)',
          'CI builds and publishes from the tag',
          '`git describe` on a later commit gives a name based on `v1.2.0`'
        ],
        why: 'Tag the commit that was **tested**, push the tag on purpose (a plain push does not), and build from the tag, so that the artifact is traceable to one commit.'
      }),

      B.quiz({
        id: 'm8-q1', t: 1,
        q: 'You add a pre-commit hook in `.git/hooks` and push. A colleague clones the repository. Does the hook run for them?',
        opts: [
          { t: 'No: hooks live in `.git`, which is not cloned. They need to install it', fb: '' },
          { t: 'Yes: hooks are part of the repository', fb: 'They are not.' },
          { t: 'Yes, but only on pull requests', fb: 'A hook runs on the machine where it is installed.' },
          { t: 'Yes, if they use the same branch', fb: 'The branch has nothing to do with it.' }
        ],
        ok: 0, why: 'The recording: the original had `pre-commit`, and the clone had ' + HC.hooks_in_the_clone.length + ' hooks and ' + HC.samples + ' sample files.'
      }),

      B.quiz({
        id: 'm8-q2', t: 1,
        q: 'You run `git push origin main` after tagging a release with `git tag -a v1.1.0`. What reaches the remote?',
        opts: [
          { t: 'The commits only. The tag stays local until you push it', fb: '' },
          { t: 'The commits and the tag', fb: 'A plain push does not send tags.' },
          { t: 'Only the tag', fb: 'The commits are sent.' },
          { t: 'Nothing, because tags block pushes', fb: 'They do not.' }
        ],
        ok: 0, why: 'The recording: after a plain push the remote had `' + (TP.after_plain_push.join(' ') || 'no tags') + '`, and after `--follow-tags` it had `' + TP.after_follow_tags.join(' ') + '`.'
      }),

      B.quiz({
        id: 'm8-q3', t: 2,
        q: 'What is the difference between a lightweight and an annotated tag?',
        opts: [
          { t: 'An annotated tag is an object with a tagger, a date and a message. A lightweight tag is only a name for a commit', fb: '' },
          { t: 'A lightweight tag cannot be pushed', fb: 'Both can be pushed with `--tags` or by name.' },
          { t: 'An annotated tag copies the files', fb: 'No tag copies files.' },
          { t: 'There is no difference', fb: 'The object types differ: `' + TY.annotated + '` and `' + TY.lightweight + '`.' }
        ],
        ok: 0, why: '`git cat-file -t` printed `' + TY.lightweight + '` for the lightweight tag and `' + TY.annotated + '` for the annotated one.'
      }),

      B.decide({
        id: 'm8-dec', t: 2, src: 'docs', title: 'Decision: how should this team use branches',
        scenario: 'Five data engineers keep dbt models, loaders and DAGs in one repository. The pipelines run from `main`. There is a CI check on every push, and two people review each change. Nothing is shipped as a numbered version.',
        opts: [
          { t: 'Short feature branches, pull requests with a review and green CI, squash merge to protected `main`, tags only for infrastructure releases', d: 'A reviewed unit for every change, one line of history, nothing runs that was not checked.', lose: 'Each change waits for a review. Branches that grow long cause conflicts.' },
          { t: 'GitFlow with `develop`, `release` and `hotfix` branches', d: 'A clear place for everything.', lose: 'Three long lines to keep in step for a pipeline that only ever runs the newest code.' },
          { t: 'Everybody commits straight to `main`', d: 'No waiting.', lose: 'A bad commit reaches the 02:00 run, and nobody read it.' }
        ],
        pick: 0,
        why: 'The pipelines always run the newest `main`, so the branching has to protect `main`, and nothing needs parallel versions. Reviews plus CI do that with the least machinery. Protection of the branch is a setting of the hosting platform, so it is from documentation here.',
        when: 'A team of two with excellent tests can commit to `main` and rely on CI and fast reverts.'
      }),

      B.incident({
        id: 'm8-inc', t: 2, src: 'rec', title: 'Incident: a key got through the hook', time: '11:30',
        alert: '**A secret scan of the repository found an access key committed yesterday by a new colleague.** The team has a pre-commit hook that refuses keys, and everybody was told to install it.',
        clues: ['The colleague cloned the repository last week on a new laptop', '`ls .git/hooks` on that laptop shows only `.sample` files', 'CI runs the tests and has no secret scan'],
        opts: [
          { t: 'Revoke the key. Keep the hook in the repository with `core.hooksPath`, or use a hook manager, and add a secret scan to CI', fb: '' },
          { t: 'Tell everybody to install the hook again, and trust them', fb: 'The recording shows why that failed: a clone has no hooks. It will fail again on the next laptop.' },
          { t: 'Delete the commit and force-push', fb: 'The key was exposed already, and a rewrite does not fix that.' },
          { t: 'Block pushes from new colleagues until they pass a test', fb: 'The problem is the process, not the person.' }
        ],
        best: 0,
        why: 'The recording: the original repository had `pre-commit` and the clone had ' + HC.hooks_in_the_clone.length + ' hooks and ' + HC.samples + ' samples. A hook that must be installed by hand protects only the people who remember. The key itself must be revoked first, because it is exposed.',
        checks: [
          ['Revoke the key', 'At the provider, now.'],
          ['Check the laptop', '`ls .git/hooks` shows whether the hook is there.'],
          ['Make the hook part of the repository', '`.githooks/` plus `git config core.hooksPath .githooks`, or the `pre-commit` framework.'],
          ['Add a server-side check', 'A secret scan in CI that nobody can skip.']
        ],
        tell: 'A key got into the repository because the pre-commit hook lives in .git and was not on the new laptop. I revoked the key, moved the hook into the repository with core.hooksPath, and added a secret scan to CI so that it does not depend on anybody\'s laptop.',
        prevent: ['Keep hooks **in the repository**', 'A **server-side check** in CI that cannot be skipped', 'An onboarding script that sets `core.hooksPath`']
      }),

      B.qa({
        id: 'qa-hooks', t: 1, tag: 'Git', secs: 60,
        q: 'What is a git hook, and what are its limits?',
        pts: ['A script that Git runs at a moment such as before a commit or a push', 'A non-zero exit from a pre-commit hook cancels the commit', 'Hooks live in .git/hooks, which is not cloned', '--no-verify skips them, so CI is the real check'],
        short: 'A hook is a script that Git runs at a fixed moment: before a commit, after a merge, before a push. A pre-commit hook that exits non-zero cancels the commit, which is how I stop a key, a leftover conflict marker or a badly formatted file on my own machine, with feedback in a second. The limits are real: the recording shows that hooks live in `.git/hooks` and a clone has only sample files, so every new laptop is unprotected until somebody installs the hook, and `git commit --no-verify` skips them all. So I keep the hook in the repository and set `core.hooksPath` or use a hook manager, and I treat the hook as a convenience and put the same check in CI, where it cannot be skipped.',
        fu: [['Which hooks run on the server?', 'pre-receive and update, on a server that you run. Hosted platforms use protected branches and CI instead. From documentation.'], ['What does `core.hooksPath` do?', 'It points Git at another folder for hooks, such as one in the repository.']],
        trap: 'Believing that a pre-commit hook enforces anything for the team.',
        real: 'Say what your team checks before a commit and what it checks in CI.'
      }),

      B.qa({
        id: 'qa-tags', t: 1, tag: 'Git', secs: 60,
        q: 'How do you version and release with git tags?',
        pts: ['An annotated tag is an object with a message, made for releases', 'A lightweight tag is only a name', 'Tags are not pushed by default', 'git describe names a commit from the nearest tag'],
        short: 'I tag the commit that was tested with an annotated tag, `git tag -a v1.2.0 -m "..."`, because it is an object with a tagger, a date and a message and can be signed. A lightweight tag is only a name for a commit, which I recorded as the object type `commit` against `tag`. Tags are not pushed by a plain push: the remote had none until I pushed with `--follow-tags`, which sends the annotated tags that belong to the pushed commits. CI builds from the tag so that the artifact is traceable to one commit, and `git describe` gives every other commit a name such as `v1.1.0-2-g...` from the nearest tag, which I use as a build version. In CI I fetch the full history, because a shallow clone has no tags and describe fails.',
        fu: [['How do you move a tag?', 'You should not: a tag that has been published is a promise. Make a new one.'], ['What is semantic versioning?', 'MAJOR.MINOR.PATCH, where a breaking change raises MAJOR. From documentation.']],
        trap: 'Moving or deleting a published release tag.',
        real: 'Say how you name a release of a pipeline.'
      }),

      B.qa({
        id: 'qa-ci', t: 2, tag: 'Git', secs: 60,
        q: 'What do you check in CI for a data repository?',
        pts: ['The same checks as the hooks, on a clean machine', 'Tests of the models and the loaders, linting, and a secret scan', 'No leftover conflict markers, and no large files', 'The history it needs: fetch depth for tags and describe'],
        short: 'The same things that a hook checks, plus the heavier ones, on a clean machine that nobody can skip. For a repository of models, loaders and DAGs that means the tests of the models and the loaders, a linter, a compile of the DAGs, a scan for secrets, `git diff --check` for leftover conflict markers, and a check that no large file was added. I also look at how the job gets the code: the default checkout is shallow, and in my recording a depth-1 clone had no tags and `git describe` failed, so a job that builds a version name needs `fetch-depth: 0`. The workflow file in the recording was parsed as YAML, and GitHub did not run it, so the hosted behaviour is from documentation.',
        fu: [['What is a required status check?', 'A setting of the platform that blocks a merge until a named CI job passes. From documentation.'], ['How do you keep CI fast?', 'Cache dependencies, run changed models only, and keep the checkout small when you can.']],
        trap: 'Running tests only on a developer\'s machine.',
        real: 'List the checks that run on your pull requests.'
      }),

      B.qa({
        id: 'qa-signing', t: 3, tag: 'Git', secs: 60,
        q: 'Can you trust the author of a commit? What does signing add?',
        pts: ['The author name and e-mail in a commit are only text, set by the committer', 'A signature with a GPG, SSH or S/MIME key proves who made the commit', 'Platforms show "verified" for signed commits', 'A hash does not prove authorship'],
        short: 'No. The author and committer of a commit are plain text that anybody can set: in my recordings I set them with environment variables to Maya, Omar and Priya, and Git accepted every one. A hash only shows that the content is unchanged. A **signature** adds proof: the committer signs the commit or the tag with a key (`git commit -S`, with a GPG or SSH key), and a platform can show it as verified. That matters when you must know who released something, for example a tag that builds a production artifact, and many teams require signed tags or commits on protected branches. I did not run signing in the recording, so this is from documentation.',
        fu: [['Does an annotated tag help?', 'It records a tagger, but still as text, unless it is signed.'], ['What are SSH signatures?', 'Since Git 2.34 you can sign with an SSH key instead of GPG. From documentation.']],
        trap: 'Treating the author field as proof of identity.',
        real: 'Say whether your repositories require signed commits.'
      }),

      B.qa({
        id: 'qa-protected', t: 3, tag: 'Git', secs: 60,
        q: 'What do protected branches and CODEOWNERS do?',
        pts: ['They are settings of a hosting platform, not of Git', 'A protected branch can forbid direct pushes and force pushes', 'It can require reviews and passing CI before a merge', 'CODEOWNERS names the people who must review changes to certain paths'],
        short: 'They are features of hosting platforms such as GitHub and GitLab, not of Git itself, and they did not run in my course, so this is from documentation. A **protected branch** can forbid direct pushes and force pushes, require a pull request with a number of approvals, and require named CI checks to pass before a merge. A **CODEOWNERS** file maps paths to people or teams, so that a change to `models/finance/` must be approved by the finance data owners. Together they make the rules of a team enforceable on the server, where a hook cannot be skipped: that is how you make "never force-push main" true at 2 a.m. They are worth setting up before the first incident and not after it.',
        fu: [['Do administrators bypass them?', 'Often, unless the rule says "include administrators". From documentation.'], ['Is a review a security control?', 'It is one layer, and it needs automatic checks beside it.']],
        trap: 'Relying on a written rule for what a setting can enforce.',
        real: 'Say which of your branches are protected and which checks they require.'
      }),

      B.recap({
        id: 'm8-recap', n: 8, badge: 'Release Keeper', color: '#BAE6FD',
        pts: [
          'A **pre-commit hook** stopped a commit with exit code ' + HR.rc + '. `--no-verify` skipped it. **A clone has ' + HC.hooks_in_the_clone.length + ' hooks.**',
          'Keep hooks **in the repository** (`core.hooksPath`) and repeat the checks in **CI**.',
          'An **annotated tag** is an object (`' + TY.annotated + '`). A plain push sends **no tags**. `--follow-tags` sent `' + TP.after_follow_tags.join(' ') + '`.',
          'A **shallow** clone has no history and no tags: `describe` failed. Use `fetch-depth: 0`.',
          '`fixup` plus `--autosquash` turned ' + FX.commits_before + ' commits into ' + FX.commits_after + '.'
        ],
        lines: [
          'I put the same check in a hook and in CI.',
          'I tag the tested commit with an annotated tag.',
          'I fetch the history that a CI job needs.'
        ]
      })
    ]
  });
})();
