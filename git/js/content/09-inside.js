/* Mission 9: inside Git and at scale. Packs, unreachable objects, shallow clones, sparse checkouts and the hash function. */
(function () {
  var B = LAB.b, G = LAB.get;
  var C = G.counts, X = G.text, n = G.n;
  var PK = C('int.pack'), TY = C('int.types'), LO = C('int.lost'), SP = C('int.sparse'), SH = C('int.shallow'), S256 = C('int.sha256'), S1 = C('int.sha1'), CL = C('data.clones'), SZ = C('data.sizes');
  G.expect(PK.objects === 28 && PK.delta_objects === 6 && PK.packs === 1 && PK.max_chain >= 1, 'the packed repository holds 28 objects in one pack, six of them as deltas');
  G.expect(TY.blob === 7 && TY.commit === 7 && TY.tree === 14, 'seven commits, fourteen trees and seven blobs');
  G.expect(LO.object_present === true && LO.object_present_after_gc === false && /unreachable commit/.test(X('int.fsck')), 'an unreachable commit is listed by fsck and removed by reflog expire and gc');
  G.expect(SP.files_on_disk === 3 && SP.tracked_files > SP.files_on_disk && SP.on_disk.indexOf('loader/load_orders.py') >= 0, 'a sparse checkout shows three of the tracked files');
  G.expect(SH.commits_with_depth_3 === 3 && SH.commits_after_unshallow === 16, 'a depth 3 clone has 3 commits and the unshallowed clone has all 16');
  G.expect(S256.ok === true && S256.id_chars === 64 && S1.id_chars === 40, 'a SHA-256 repository has 64 character ids and a SHA-1 one has 40');

  LAB.addChapter({
    id: 'm9', n: 9, title: 'Inside Git and at scale', short: 'Inside', blurb: 'Packs, what gc deletes, shallow and sparse clones, and the hash function', minutes: 16,
    focus: ['raw', 'ci'],
    goals: [
      'Say how Git **stores** objects: loose, then in packs with deltas.',
      'Know what **gc** removes and what keeps a commit alive.',
      'Use **shallow and sparse** clones for a large repository.',
      'Name the **hash function** and what SHA-256 changes.'
    ],
    say: 'Most of Git is the four objects of mission 1. The rest is how they are stored, how they are cleaned up, and what you can leave out of a clone when the repository is large. This mission opens the store, reads what a pack holds, and makes a commit disappear on purpose.',
    scenes: [
      B.term({
        id: 'm9-pack', t: 1, src: 'rec', title: 'Loose objects and a pack',
        say: 'The repository of the appended CSV, after `git gc`. I asked how many objects it has and how they are stored.',
        lines: function () {
          return G.term([
            ['git count-objects -v', X('int.count_objects')],
            ['git verify-pack -v .git/objects/pack/*.idx | tail -3', X('int.verify_tail')]
          ]);
        },
        after: 'Git first writes every object as a separate **loose** file, compressed. `git gc` collects them into one **pack**: here **' + PK.objects + ' objects in ' + PK.packs + ' pack**, `count: 0` loose. Of those, **' + PK.delta_objects + ' are stored as deltas**: a version of the CSV is kept as "the previous version, plus these changes", with a chain length of at most ' + PK.max_chain + '. The other ' + (PK.objects - PK.delta_objects) + ' are stored whole. This is the compression that made the appended file small in mission 7.',
        afterKind: 'tip',
        doneSay: 'gc packs loose objects and stores similar versions as deltas.'
      }),

      B.term({
        id: 'm9-types', t: 1, src: 'rec', title: 'Count the objects by type',
        say: 'Seven commits of one file. I asked Git for every object and counted the types.',
        lines: function () {
          return G.term([
            ['git cat-file --batch-all-objects --batch-check | awk \'{print $2}\' | sort | uniq -c', '      ' + TY.blob + ' blob\n      ' + TY.commit + ' commit\n     ' + TY.tree + ' tree']
          ]);
        },
        after: '**' + TY.commit + ' commits**, one for each change, **' + TY.blob + ' blobs**, one for each version of the file, and **' + TY.tree + ' trees**, two for each commit: the root and the `data` folder. Every commit needs a **new tree for each folder on the path to a changed file**, and the cost is small because unchanged files and folders are shared by id. A repository with 100,000 commits has about that many objects of each kind, and Git copes because everything is addressed by hash.',
        afterKind: 'tip',
        doneSay: 'A change makes one blob, and a tree for each folder above it.'
      }),

      B.term({
        id: 'm9-gc', t: 2, src: 'rec', title: 'What gc deletes',
        say: 'A commit was made and then dropped with `git reset --hard HEAD~1`. I looked for it with `git fsck`, then expired the reflog and ran a gc, and asked whether the object was still there.',
        lines: function () {
          return G.term([
            ['git fsck --unreachable --no-reflogs', X('int.fsck')],
            ['git cat-file -e <dropped commit>; echo $?   # is it stored?', LO.object_present ? '0   (yes)' : '1'],
            ['git reflog expire --expire=now --all && git gc -q --prune=now', ''],
            ['git cat-file -e <dropped commit>; echo $?', LO.object_present_after_gc ? '0' : '1   (gone)']
          ]);
        },
        after: '`fsck` lists the commit, its tree and its blob as **unreachable**: no branch, tag or reflog entry leads to them. They were still stored (' + LO.object_present + '). With the reflog expired and `--prune=now`, the gc **deleted them** and the id is gone (' + (!LO.object_present_after_gc) + '). By default the protection is **weeks**: reflog entries expire after 30 or 90 days, and gc prunes loose unreachable objects older than two weeks. Those are the documented defaults, and I used `now` to show the end of the line. This is what makes a secret leave a **local** repository.',
        afterKind: 'warn',
        doneSay: 'Unreachable objects live until reflog expiry and gc.'
      }),

      B.cmp({
        id: 'm9-alive', t: 2, src: 'rec', title: 'What keeps a commit alive',
        say: 'Git deletes only what nothing reaches. Press Next.',
        cols: ['Reaches the commit', 'Example', 'Ends when'],
        hl: 1,
        rows: [
          ['A branch', '`main`, `feature`', 'You delete the branch (and no other name reaches it)'],
          ['A tag', '`v1.1.0`', 'You delete the tag'],
          ['A remote tracking branch', '`origin/main`', 'You prune it, or fetch after it is deleted'],
          ['A stash entry', '`stash@{0}`', 'You drop or pop it'],
          ['The reflog', '`HEAD@{1}`', 'The entry expires: weeks, by default'],
          ['A parent of a reachable commit', 'every older commit of `main`', 'It does not end: history is a chain']
        ],
        steps: [
          { upto: 4, say: 'Names keep commits alive. Remove every name and the commit is only a candidate for the next gc.' },
          { upto: 6, say: 'The reflog is the last net, and the parent chain is why old commits never go away on their own. The recorded commit was reachable from none of these, and gc removed it.' }
        ]
      }),

      B.term({
        id: 'm9-shallow', t: 1, src: 'rec', title: 'A shallow clone, and unshallowing it',
        say: 'A repository of sixteen commits. I cloned it with `--depth 3`, counted the commits, and fetched the rest.',
        lines: function () {
          return G.term([
            ['git clone --depth 3 file://... shallow && git rev-list --count HEAD', String(SH.commits_with_depth_3)],
            ['git fetch --unshallow && git rev-list --count HEAD', String(SH.commits_after_unshallow)]
          ]);
        },
        after: 'The shallow clone knew only the **last ' + SH.commits_with_depth_3 + ' commits**: the history is cut off, and Git records the cut in a file named `shallow`. `git fetch --unshallow` brought the other ' + (SH.commits_after_unshallow - SH.commits_with_depth_3) + ', so that the clone has all **' + SH.commits_after_unshallow + '**. Shallow clones are for CI and for one-off builds. Commands that need history (`log`, `blame`, `bisect`, `describe`) work only as far back as the cut. In mission 7 a depth-1 clone was ' + n(CL.depth1.kib) + ' KiB against ' + n(CL.full.kib) + ' KiB for the full one.',
        afterKind: 'tip',
        doneSay: 'A shallow clone cuts the history. unshallow fills it in.'
      }),

      B.term({
        id: 'm9-sparse', t: 2, src: 'rec', title: 'A sparse checkout',
        say: 'A repository with ' + SP.tracked_files + ' tracked files. I asked for one folder only.',
        lines: function () {
          return G.term([
            ['git ls-files | wc -l', String(SP.tracked_files)],
            ['git sparse-checkout set loader', ''],
            ['find . -type f -not -path "./.git/*"', SP.on_disk.map(function (f) { return './' + f; }).join('\n')]
          ]);
        },
        after: 'All **' + SP.tracked_files + '** files are still in the repository and in the index, but the working tree holds only **' + SP.files_on_disk + '**: the folder `loader/` and the files at the top level (the default "cone" mode includes them). In a **monorepo** with models, loaders, DAGs and infrastructure for ten teams, a sparse checkout keeps your folder small. Combined with a blobless clone, which does not even download the files you leave out, a huge repository becomes quick to clone and to work in.',
        afterKind: 'tip',
        doneSay: 'sparse-checkout limits the working tree. The index still knows every file.'
      }),

      B.term({
        id: 'm9-sha256', t: 3, src: 'rec', title: 'SHA-1 and SHA-256',
        say: 'Git has used SHA-1 for the ids since the beginning. A newer object format uses SHA-256. I made a repository with each.',
        lines: function () {
          return G.term([
            ['git init --object-format=sha1 && git commit ... && git rev-parse HEAD | wc -c', String(S1.id_chars + 1) + '   (' + S1.id_chars + ' characters)'],
            ['git init --object-format=sha256 && git commit ... && git rev-parse HEAD | wc -c', String(S256.id_chars + 1) + '   (' + S256.id_chars + ' characters)']
          ]);
        },
        after: 'SHA-1 ids are **' + S1.id_chars + '** hex characters and SHA-256 ids are **' + S256.id_chars + '**. The reason for the change is security: a SHA-1 collision was shown in 2017, and Git added a check for that kind of attack. A SHA-256 repository is **not compatible** with a SHA-1 one: the ids differ, so the two cannot exchange commits directly, and hosting platforms support is limited. Git 2.43 marks the feature as experimental. This is why the verifier of this course would not try to push one.',
        afterKind: 'tip',
        doneSay: 'SHA-256 gives 64 character ids and is not compatible with SHA-1 repositories.'
      }),

      B.quiz({
        id: 'm9-q1', t: 2,
        q: 'You dropped a commit with `git reset --hard`. When does Git delete it for good?',
        opts: [
          { t: 'When nothing reaches it, the reflog entry has expired, and gc has pruned it', fb: '' },
          { t: 'At once, when you run the reset', fb: 'The recording found the commit with fsck right after the reset.' },
          { t: 'Never', fb: 'Unreachable objects are removed by gc.' },
          { t: 'When you push', fb: 'A push does not delete anything locally.' }
        ],
        ok: 0, why: 'In the recording the dropped commit was stored (' + LO.object_present + ') until `git reflog expire --expire=now --all` and `git gc --prune=now` ran: then it was gone (' + (!LO.object_present_after_gc) + ').'
      }),

      B.quiz({
        id: 'm9-q2', t: 1,
        q: 'Why can `git bisect` or `git describe` fail in a CI job?',
        opts: [
          { t: 'The checkout is shallow: it has one commit and no tags', fb: '' },
          { t: 'CI machines cannot run Git', fb: 'They run it all the time.' },
          { t: 'Bisect and describe need a graphical tool', fb: 'They are command line tools.' },
          { t: 'The commit is too new', fb: 'The age of a commit does not matter.' }
        ],
        ok: 0, why: 'A clone with `--depth 3` had ' + SH.commits_with_depth_3 + ' of ' + SH.commits_after_unshallow + ' commits. Mission 8 recorded `git describe` failing in a depth-1 clone.'
      }),

      B.decide({
        id: 'm9-dec', t: 2, src: 'docs', title: 'Decision: one repository or many for the data platform',
        scenario: 'Four teams maintain dbt models, Airflow DAGs, loaders and Terraform for one data platform. Today each has its own repository. Releases often need a change in two of them at once, and people ask for one place to search.',
        opts: [
          { t: 'One monorepo, with a CODEOWNERS file, path-based CI and sparse checkouts for people who only need a part', d: 'One change can touch models and the DAG that runs them, in one reviewed commit. One search, one history.', lose: 'CI must be smart about what changed. The repository grows, so clones need care (blobless, sparse).' },
          { t: 'Keep four repositories and coordinate with version numbers', d: 'Small clones, clear ownership, independent releases.', lose: 'Changes that span two repositories need two reviews and an order. Versions drift.' },
          { t: 'One repository for each pipeline step, many dozens of them', d: 'Maximum isolation.', lose: 'The overhead of a repository (CI, permissions, releases) is paid again for each, and nobody can see the whole platform.' }
        ],
        pick: 0,
        why: 'The pain is the changes that span repositories, and a monorepo removes it. The costs, large clones and slow CI, are the ones that this mission has tools for: blobless clones, sparse checkouts, and path filters. Many teams keep separate repositories when ownership and release cycles really differ. This decision is from documentation.',
        when: 'Keep separate repositories when teams release independently and rarely change the same things.'
      }),

      B.incident({
        id: 'm9-inc', t: 2, src: 'rec', title: 'Incident: the repository takes ten minutes to clone', time: '09:10',
        alert: '**New engineers wait ten minutes for `git clone`, and CI spends four minutes on the checkout.** The repository holds three years of nightly CSV exports, rewritten every night.',
        clues: ['`du -sh .git` is several gigabytes', '`git count-objects -vH` shows a large pack', 'The CSV files are committed and re-sorted every night'],
        opts: [
          { t: 'Use a shallow or blobless clone in CI and for newcomers now, and move the exports out of git and out of the history', fb: '' },
          { t: 'Run `git gc` and hope that it shrinks the pack', fb: 'The recording shows that a re-sorted file stays large after gc.' },
          { t: 'Delete the CSV files in a new commit', fb: 'The history still holds every version.' },
          { t: 'Buy faster disks', fb: 'The problem is the size of the history.' }
        ],
        best: 0,
        why: 'The recording shows both halves. The full clone of a repository with a re-sorted file was ' + n(CL.full.kib) + ' KiB and the depth-1 and blobless clones about ' + n(CL.depth1.kib) + ' and ' + n(CL.blobless.kib) + ' KiB: **the clone options help at once**. And seven re-sorted versions took ' + SZ.rewrite.times_the_file + ' copies after gc, against ' + SZ.append.times_the_file + ' for appended ones: **the history itself only shrinks if you rewrite it**.',
        checks: [
          ['Measure', '`git count-objects -vH` and the biggest blobs in the history.'],
          ['Quick relief', '`git clone --depth 1` for CI and `--filter=blob:none` for people.'],
          ['Fix the cause', 'Stop committing the exports. Rewrite history with `git filter-repo` if you must shrink it.'],
          ['Prevent', 'Ignore rules and a check in CI that refuses large files.']
        ],
        tell: 'The repository was slow to clone because it held every nightly export, and a re-sorted file does not compress between versions. I gave CI and newcomers shallow and blobless clones, stopped committing the exports, and planned a history rewrite for the old ones with the team informed.',
        prevent: ['**No exports** in git', 'A **CI check** for large files', '**Shallow or blobless** clones by default for CI']
      }),

      B.qa({
        id: 'qa-store', t: 2, tag: 'Git', secs: 60,
        q: 'How does Git store objects, and what does git gc do?',
        pts: ['New objects are loose compressed files named by their hash', 'gc packs them into pack files and stores similar objects as deltas', 'It removes unreachable objects past the expiry', 'Packs are why a repository of many versions stays small'],
        short: 'Every new object is written as a **loose** file: compressed, and named by its hash. `git gc` collects loose objects into **pack files** with an index, and inside a pack it stores similar objects, such as consecutive versions of a CSV, as **deltas** against each other. In my recording a repository of seven versions had 28 objects in one pack, six of them deltas, and the appended file took less than one copy. `gc` also **prunes unreachable objects** that are older than the expiry, which is how a dropped commit finally goes. It runs by itself after some commands when there are many loose objects. A file that is rewritten from scratch does not delta, so it stays large.',
        fu: [['What is `git repack`?', 'It makes packs, and `gc` calls it. From documentation.'], ['How do you see what is big?', '`git count-objects -vH`, and `git rev-list --objects --all` with the sizes. From documentation.']],
        trap: 'Saying that Git stores diffs.',
        real: 'Say how big your largest repository is, and why.'
      }),

      B.qa({
        id: 'qa-clones', t: 1, tag: 'Git', secs: 60,
        q: 'How do you work with a very large repository?',
        pts: ['A shallow clone keeps only recent commits', 'A blobless or treeless clone fetches contents when needed', 'A sparse checkout shows only some folders', 'Keep the history small: no exports, LFS for large files'],
        short: 'I combine three options. A **shallow clone** with `--depth` keeps only the newest commits, which is enough for CI. A **partial clone** with `--filter=blob:none` keeps every commit but downloads file contents on demand: in my recording it was ' + n(CL.blobless.kib) + ' KiB against ' + n(CL.full.kib) + ' KiB for the full clone, and still had all seven commits. A **sparse checkout** with `git sparse-checkout set FOLDER` leaves only the folders I work in on disk, ' + SP.files_on_disk + ' of ' + SP.tracked_files + ' files in the recording. And the best fix is to keep the history small in the first place: no exports, large files in LFS or object storage. Each option removes something, so I choose by what the job needs: `describe` and `bisect` need history.',
        fu: [['What is a treeless clone?', '`--filter=tree:0`, even leaner, and slower for history commands. From documentation.'], ['What is a monorepo?', 'One repository for many projects. It needs these options to stay usable.']],
        trap: 'Using a shallow clone for a job that needs tags.',
        real: 'Say how your CI checks out a large repository.'
      }),

      B.qa({
        id: 'qa-sha', t: 3, tag: 'Git', secs: 60,
        q: 'Which hash does Git use, and is SHA-1 a problem?',
        pts: ['Git uses SHA-1 for ids, 40 hex characters, by default', 'A collision was demonstrated in 2017 and Git added detection', 'SHA-256 repositories use 64 characters and are not compatible', 'The hash is for integrity, not for proof of authorship'],
        short: 'Git ids are SHA-1 hashes by default: 40 hex characters. In 2017 a practical collision was shown for SHA-1, and Git added a check that detects the known attack pattern, but the long-term answer is **SHA-256**: I made a repository with `--object-format=sha256` and the ids were 64 characters. A SHA-256 repository cannot exchange objects with a SHA-1 one, Git 2.43 marks the feature as experimental, and platform support is limited, so most teams are still on SHA-1. The hash gives integrity: it tells you that content did not change. It does not tell you who made a commit, which needs a signature.',
        fu: [['Is a collision likely by accident?', 'No. The risk is a deliberate attack.'], ['Can you convert a repository?', 'Not in place. It needs a conversion. From documentation.']],
        trap: 'Saying that the hash is a security feature that proves identity.',
        real: 'Say whether you have seen a repository that uses SHA-256.'
      }),

      B.recap({
        id: 'm9-recap', n: 9, badge: 'Git Inside-Out', color: '#DDD6FE',
        pts: [
          'Objects are **loose** until `git gc` packs them: **' + PK.objects + ' objects in ' + PK.packs + ' pack**, ' + PK.delta_objects + ' as deltas.',
          '**Names keep commits alive.** A dropped commit goes after reflog expiry and gc: found by `fsck`, then gone.',
          '**Shallow**, **blobless** and **sparse** clones leave things out: ' + SH.commits_with_depth_3 + ' of ' + SH.commits_after_unshallow + ' commits, ' + SP.files_on_disk + ' of ' + SP.tracked_files + ' files.',
          '**SHA-1** ids have ' + S1.id_chars + ' characters, **SHA-256** ids ' + S256.id_chars + ', and they are not compatible.',
          'A hash proves integrity, not who wrote the commit.'
        ],
        lines: [
          'I know what keeps a commit alive.',
          'I pick the clone type by what the job needs.',
          'I keep the history small.'
        ]
      })
    ]
  });
})();
