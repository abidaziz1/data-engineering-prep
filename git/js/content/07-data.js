/* Mission 7: data in a repository. Sizes were measured in real repositories, and the key is the example key that AWS publishes in its documentation. */
(function () {
  var B = LAB.b, G = LAB.get;
  var C = G.counts, X = G.text, n = G.n;
  var SZ = C('data.sizes'), CL = C('data.clones'), LB = C('leak.before'), LR = C('leak.rewrite'), LG = C('leak.after_gc'), NB = C('nb'), LF = C('lfs'), PTR = X('lfs.pointer'), GA = G.file('.gitattributes'), CELL = G.file('notebooks/explore_cell.json');
  var DOTENV = 'git add -A\ngit commit -m "Add local settings"\ngit push origin main\n';
  G.expect(SZ.append.after_gc_kib < SZ.append.file_bytes / 1024 && SZ.rewrite.after_gc_kib > SZ.rewrite.file_bytes / 1024, 'seven appended versions take less than one copy after gc and seven shuffled versions take more than one');
  G.expect(SZ.rewrite.after_gc_kib > 3 * SZ.append.after_gc_kib, 'the re-sorted file takes at least three times what the appended file takes');
  G.expect(CL.depth1.shallow === 'true' && CL.depth1.commits === 1 && CL.full.commits === 7 && CL.blobless.commits === 7 && CL.depth1.kib < CL.full.kib && CL.blobless.kib < CL.full.kib, 'a shallow and a blobless clone are smaller than a full clone, and the blobless one has every commit');
  G.expect(LB.show_old === true && LB.file_in_head === false && LB.found_in_history === 2, 'the key is gone from the last commit and still in two commits of the history');
  G.expect(LR.found_in_history === 0 && LR.old_blob_still_in_the_repository === true && LG.old_blob_still_in_the_repository === false && LR.commit_ids_changed === true, 'a rewrite removes the key from the history, the old object stays until reflog expiry and gc, and the commit ids change');
  G.expect(NB.cells === 40 && NB.source_lines_changed_between_runs === 0 && NB.lines_changed_after_rerun === 158, 'running a notebook again with no change of code changes 158 lines');
  G.expect(LF.pointer_bytes < 200 && LF.lfs_store_bytes === LF.file_bytes && LF.git_objects_bytes < 2000 && /^version https:\/\/git-lfs\.github\.com\/spec\/v1/.test(PTR), 'a file tracked by LFS is a pointer of about 130 bytes in git and the content in the LFS store');

  LAB.addChapter({
    id: 'm7', n: 7, title: 'Data in a repository', short: 'Data', blurb: 'Why big files hurt, how a leaked key stays in history, and what a notebook does to a diff', minutes: 21,
    focus: ['qual', 'mon'],
    goals: [
      'Say why a file that is **rewritten** makes a repository grow, and an appended one does not.',
      'Choose between a **full, shallow and partial clone**.',
      'Remove a **leaked key** from history, and know what that does not fix.',
      'Keep **notebooks and large files** from poisoning the history.'
    ],
    say: 'Git was made for source code, and a data engineering repository fills up with things that are not: exports, notebooks, keys. Nothing is deleted from history unless you rewrite it, so the mistakes of the first week are still there in the third year. We measure how a CSV grows a repository, clone it three ways, leak a key and remove it, and look at what a notebook does to a diff.',
    scenes: [
      B.term({
        id: 'm7-size', t: 1, src: 'rec', title: 'How a data file grows a repository',
        say: 'A CSV of 20,000 orders, about ' + Math.round(SZ.append.file_bytes / 1024) + ' KiB, committed seven times. In one repository 500 rows were added each time. In the other the same rows came back in a different order each time. I measured the `.git` folder before and after `git gc`.',
        lines: function () {
          return G.term([
            ['du -sk .git   # append 500 rows each time, 7 versions, before gc', n(SZ.append.loose_kib) + ' KiB (' + SZ.append.loose_objects + ' objects)'],
            ['git gc && du -sk .git', n(SZ.append.after_gc_kib) + ' KiB'],
            ['du -sk .git   # the whole file re-sorted each time, before gc', n(SZ.rewrite.loose_kib) + ' KiB'],
            ['git gc && du -sk .git', n(SZ.rewrite.after_gc_kib) + ' KiB']
          ]);
        },
        after: 'Before `gc` both repositories hold every version as a separate compressed object. After `gc` Git packs them and stores similar versions as **deltas**. The appended file took **' + n(SZ.append.after_gc_kib) + ' KiB** for seven versions, less than one copy (' + SZ.append.times_the_file + ' times), because each version is the previous one plus a few rows. The re-sorted file took **' + n(SZ.rewrite.after_gc_kib) + ' KiB**, about **' + SZ.rewrite.times_the_file + ' copies**: when every line moves there is nothing small to store. A nightly export that comes back in another order is the worst case for a repository.',
        afterKind: 'warn',
        doneSay: 'Appended data deltas well. A rewritten file is stored almost in full each time.'
      }),

      B.widget({ id: 'm7-lab', kind: 'size', t: 1, src: 'rec', title: 'Lab: how a data file grows a repository' }),

      B.term({
        id: 'm7-clone', t: 1, src: 'rec', title: 'Full, shallow and blobless clones',
        say: 'The repository of the re-sorted file has seven commits. I cloned it three ways.',
        lines: function () {
          return G.term([
            ['git clone file://.../big_rewrite full', n(CL.full.kib) + ' KiB, ' + CL.full.commits + ' commits'],
            ['git clone --depth 1 file://... shallow', n(CL.depth1.kib) + ' KiB, ' + CL.depth1.commits + ' commit   (' + X('data.depth_status') + ')'],
            ['git clone --filter=blob:none file://... blobless', n(CL.blobless.kib) + ' KiB, ' + CL.blobless.commits + ' commits']
          ]);
        },
        after: 'A **full clone** has every commit and every file version: ' + n(CL.full.kib) + ' KiB. A **shallow clone** (`--depth 1`) has only the last commit, and is **' + n(CL.depth1.kib) + ' KiB**: good for CI, which only needs the current files, and not for `git log`, `blame` or `describe`. A **blobless clone** (`--filter=blob:none`) keeps **all ' + CL.blobless.commits + ' commits** but downloads file contents only when they are needed, so it is **' + n(CL.blobless.kib) + ' KiB** at the start. The checked-out file is there in all three. The old versions of the file are what a full clone pays for.',
        afterKind: 'tip',
        doneSay: 'Shallow keeps one commit. Blobless keeps all commits and loads files on demand.'
      }),

      B.cmp({
        id: 'm7-where', t: 1, src: 'docs', title: 'Where data files belong',
        say: 'Most data does not belong in git. The question is what to do with each kind. Press Next.',
        cols: ['The file', 'In git?', 'Instead'],
        hl: 2,
        rows: [
          ['A small reference table (a list of stores, a mapping)', 'Yes', 'It changes rarely and benefits from review and history'],
          ['A sample file for tests, a few kilobytes', 'Yes', 'Keep it small and fixed'],
          ['A nightly export or a table dump', 'No', 'Object storage or the warehouse. Name the file by date. Ignore it in git'],
          ['A model file (parquet, binary), large and rarely changed', 'Pointers', 'Git LFS, or a data version tool such as DVC. The pointer is in git, the content elsewhere'],
          ['Secrets, keys, `.env`', 'Never', 'A secret manager, and `.env` in `.gitignore`']
        ],
        steps: [
          { upto: 2, say: 'Small, stable, reviewable files are good in git. They are text, and their history is useful.' },
          { upto: 5, say: 'Everything else has a better home. This table is advice from documentation: the choice of an object store or a data version tool depends on your platform.' }
        ]
      }),

      B.term({
        id: 'm7-leak', t: 1, src: 'rec', title: 'A key that was committed, and removed',
        say: 'A developer committed a `.env` with the example key from the AWS documentation, noticed it two commits later, and removed the file. The last commit has no `.env` any more.',
        lines: function () {
          return G.term([
            ['git cat-file -e HEAD:.env; echo $?   # is the file in the last commit?', LB.file_in_head ? '0' : '1   (no)'],
            ['git log --oneline -SAKIAIOSFODNN7EXAMPLE --all', X('leak.log_S')],
            ['git show 2a13658:.env', X('leak.show')]
          ]);
        },
        after: 'The file is **not in the last commit** (' + (LB.file_in_head ? 'yes' : 'no') + '), and `git log -S` finds the key in **' + LB.found_in_history + ' commits**: the one that added it and the one that removed it. `git show` prints it in clear text. **Deleting a file does not delete it from the history.** Anyone who clones the repository can read it, and so can any fork or cache of the repository. This particular key is the example that AWS prints in its documentation, so it is harmless, and the lesson is the same for a real one.',
        afterKind: 'warn',
        doneSay: 'A deleted file is still in the history.'
      }),

      B.term({
        id: 'm7-rewrite', t: 1, src: 'rec', title: 'Rewrite history to remove it',
        say: 'On the same repository I rewrote every commit without the file, with `git filter-branch`. I then asked whether the old object was still there, expired the reflog, ran a gc, and asked again.',
        lines: function () {
          return G.term([
            ['git filter-branch -f --index-filter "git rm --cached --ignore-unmatch -q .env" -- --all', G.grep(X('leak.filter_branch'), /WARNING|Ref /)],
            ['git log --oneline -SAKIAIOSFODNN7EXAMPLE | wc -l', String(LR.found_in_history)],
            ['git cat-file -e <old blob>; echo $?   # still stored?', LR.old_blob_still_in_the_repository ? '0   (yes)' : '1'],
            ['git reflog expire --expire=now --all && git gc -q --prune=now', ''],
            ['git cat-file -e <old blob>; echo $?', LG.old_blob_still_in_the_repository ? '0' : '1   (gone)']
          ]);
        },
        after: 'The rewrite made **every commit new** (the ids changed: ' + LR.commit_ids_changed + '), and the key is **no longer in any commit** (' + LR.found_in_history + ' matches). But the **old object was still in the repository** (' + LR.old_blob_still_in_the_repository + ') until the reflog was expired and `git gc --prune=now` ran: then it was gone (' + (!LG.old_blob_still_in_the_repository) + '). Git itself prints a **warning** and recommends `git filter-repo` instead, a separate tool that I did not run. **Rewriting does not reach the copies that other people already have**, nor a server that kept the old objects. The key must be **revoked and replaced** anyway.',
        afterKind: 'warn',
        doneSay: 'Rewrite, expire, gc: the local object is gone. The key is still compromised.'
      }),

      B.code({
        id: 'm7-notebook', t: 1, src: 'rec', title: 'A notebook is a JSON file with outputs', file: 'notebooks/explore_cell.json', lang: 'json', code: CELL,
        steps: [
          { say: 'This is one cell of a notebook, as it sits in the `.ipynb` file. Press Next.', lines: null },
          { say: 'The **source** of the cell: the only part that a person wrote.', lines: G.span(CELL, /"source"/, /\],/) },
          { say: 'The **execution count** changes every time you run the cell.', lines: G.span(CELL, /execution_count/) },
          { say: 'The **outputs** are stored in the file: printed text, tables, images as base64. They change when the data changes.', lines: G.span(CELL, /"outputs"/, /\]\s*$/m) }
        ],
        note: 'A real cell can hold a chart as a long base64 string, which is why a notebook with plots makes a large and unreadable diff.'
      }),

      B.term({
        id: 'm7-nbdiff', t: 1, src: 'rec', title: 'Run the notebook again',
        say: 'A notebook of 40 cells was committed, and then run again from the top. Not one line of code changed.',
        lines: function () {
          return G.term([
            ['git diff --shortstat notebooks/explore.ipynb   # after running it again', NB.diff_after_rerun],
            ['git diff --shortstat HEAD~1 -- notebooks/explore.ipynb   # with the outputs stripped', '(the outputs and counters are removed: the file shrinks)']
          ]);
        },
        after: 'The diff says **' + NB.lines_changed_after_rerun + ' lines changed** in a notebook whose **code did not change**: only the execution counters and the outputs differ. A reviewer cannot see the real change in the noise, and two people who both run the notebook get a **conflict** in every cell. The fixes are to **strip outputs before the commit** (the tool `nbstripout` does it with a git filter or a hook), and to review notebooks as rendered files. I did not run `nbstripout`, so that part is from documentation.',
        afterKind: 'warn',
        doneSay: 'Outputs and counters make a notebook diff unreadable. Strip them.'
      }),

      B.code({
        id: 'm7-lfs', t: 1, src: 'rec', title: 'Git LFS: a pointer in git, the file elsewhere', file: '.gitattributes', lang: 'text', code: GA,
        steps: [
          { say: 'One line in `.gitattributes` sends every parquet file through the LFS filter. Press Next.', lines: null },
          { say: 'The pattern. Every file that matches is stored by LFS.', lines: G.span(GA, /\*\.parquet/) }
        ],
        note: 'git-lfs ' + G.meta('git_lfs') + ' was installed in the repository with `git lfs install --local`.'
      }),

      B.term({
        id: 'm7-lfsrun', t: 1, src: 'rec', title: 'What git stores for an LFS file',
        say: 'I committed a parquet-like file of 400 KiB with the rule above, and looked at what git holds.',
        lines: function () {
          return G.term([
            ['git lfs track', X('lfs.track')],
            ['git show HEAD:data/orders.parquet', PTR],
            ['git lfs ls-files', X('lfs.ls_files')],
            ['du -b .git/lfs/objects   # the content, in the LFS store', n(LF.lfs_store_bytes) + ' bytes'],
            ['du -b .git/objects   # what git itself holds', n(LF.git_objects_bytes) + ' bytes']
          ]);
        },
        after: 'Git holds a **pointer of ' + LF.pointer_bytes + ' bytes**, ' + LF.pointer_lines + ' lines: the version of the format, the **sha256 of the content**, and its size. The **400 KiB** (' + n(LF.lfs_store_bytes) + ' bytes) sit in the LFS store, and on a server they are uploaded separately and downloaded only for the commits that you check out. The history stays small, and a clone fetches the large files it needs. Two limits: the **server must support LFS**, and a file that was committed **before** LFS tracking stays in the history in full. No LFS server ran here, so the upload and download are from documentation.',
        afterKind: 'tip',
        doneSay: 'LFS keeps a pointer in git and the content in a separate store.'
      }),

      B.bug({
        id: 'm7-bug', t: 1, src: 'docs', q: 'A colleague wants to share settings, and runs these three lines. The repository is public. Click the line that exposes the key.',
        file: 'share.sh', lang: 'bash', code: DOTENV, bad: [1],
        hint: 'Which command stages every file, including ones that should never be in git?',
        why: '`git add -A` stages **everything** that is not ignored: if `.env` is not in `.gitignore`, the key goes in. Once it is pushed to a public repository, it is public for good, even if you delete it a minute later: bots scan new commits. The habit that prevents it: `.env` in `.gitignore` from the first commit, `git status` before `git add -A`, and a secret scan in a hook or in CI.',
        fix: 'git status\ngit add models loader\ngit commit -m "Add the loader"\ngit push origin main\n',
        cheer: 'Read git status before you add everything.'
      }),

      B.order({
        id: 'm7-ord', t: 1, q: 'A key was pushed to the company repository an hour ago. Put the steps of the response in order.',
        items: [
          '**Revoke** the key at the provider and create a new one',
          'Check the logs of the provider for use of the old key',
          'Remove the key from the code and read it from a secret store',
          'Rewrite the history to remove the key, if policy requires it, and tell everyone to re-clone',
          'Add `.env` to `.gitignore` and a secret scan to CI'
        ],
        why: 'Revoking comes first because the key is already exposed, and nothing that you do to the repository changes that. Rewriting history is cosmetic for security, and costly for the team, so it comes after the real fix.'
      }),

      B.quiz({
        id: 'm7-q1', t: 1,
        q: 'You committed a key, and removed the file in the next commit. Is the key still available to someone who clones?',
        opts: [
          { t: 'Yes: it is in the earlier commit, and `git show` prints it', fb: '' },
          { t: 'No: the last commit does not have the file', fb: 'The history keeps every earlier version.' },
          { t: 'Only if they run `git reflog`', fb: 'The key is in a normal commit, and the reflog is not needed to find it.' },
          { t: 'Only on the server, not in a clone', fb: 'A clone has the full history.' }
        ],
        ok: 0, why: 'The recording: the file was not in `HEAD`, `git log -S` found the key in ' + LB.found_in_history + ' commits, and `git show` printed it.'
      }),

      B.quiz({
        id: 'm7-q2', t: 1,
        q: 'A nightly job commits `orders.csv` re-sorted every night. Why does the repository grow fast?',
        opts: [
          { t: 'Every line moves, so the packs cannot store small differences, and each version is stored almost in full', fb: '' },
          { t: 'Git stores one copy per file name', fb: 'It stores one object per version.' },
          { t: 'CSV files cannot be compressed', fb: 'They compress, but the differences between versions are what is lost.' },
          { t: 'The reflog stores every version a second time', fb: 'The reflog lists positions of HEAD and stores no copies.' }
        ],
        ok: 0, why: 'The recording: seven re-sorted versions took ' + n(SZ.rewrite.after_gc_kib) + ' KiB after gc, seven appended ones ' + n(SZ.append.after_gc_kib) + ' KiB.'
      }),

      B.quiz({
        id: 'm7-q3', t: 2,
        q: 'CI only needs to run a check on the files of the last commit. Which clone is the best fit?',
        opts: [
          { t: 'A shallow clone with `--depth 1`', fb: '' },
          { t: 'A full clone', fb: 'It downloads every version of every file.' },
          { t: 'A bare clone', fb: 'A bare clone has no working files to check.' },
          { t: 'A mirror clone', fb: 'It copies every ref and is the heaviest.' }
        ],
        ok: 0, why: 'The shallow clone of the recording had ' + CL.depth1.commits + ' commit and ' + n(CL.depth1.kib) + ' KiB, against ' + n(CL.full.kib) + ' KiB for the full one. Remember that `git describe` and `blame` need history.'
      }),

      B.decide({
        id: 'm7-dec', t: 2, src: 'docs', title: 'Decision: where do the 300 MB models and exports go',
        scenario: 'The team has a 300 MB trained model that changes monthly, a 2 GB nightly export, and a 5 MB mapping table that analysts edit weekly. The repository is hosted on a platform that offers LFS. CI runs on every push.',
        opts: [
          { t: 'Mapping table in git, model in LFS, export in object storage', d: 'Each kind lives where it fits. The history stays small, the mapping is reviewable, and the model has a pointer with a version.', lose: 'LFS has a storage limit and a cost on hosted platforms, and every developer needs the LFS client.' },
          { t: 'Everything in git', d: 'One place and one tool.', lose: 'The repository grows by gigabytes, clones take minutes, and the history cannot be shrunk without a rewrite.' },
          { t: 'Everything in object storage, with a text file in git that names the versions', d: 'Git stays tiny.', lose: 'You build and maintain the tooling that LFS or a data version tool already provides.' }
        ],
        pick: 0,
        why: 'The sizes decide. A 2 GB export every night has no place in a repository, as the recording of a rewritten file showed. A 300 MB model that changes monthly is what LFS was made for. A small table that people review stays as text.',
        when: 'If the platform has no LFS, a data version tool or a naming convention in object storage does the same job.'
      }),

      B.incident({
        id: 'm7-inc', t: 2, src: 'rec', title: 'Incident: a key is in the history of a public repository', time: '13:20',
        alert: '**A scanner of the cloud provider reports that an access key from the Brewline repository was found on a public site.** The key was committed in a `.env` three weeks ago and deleted the next day. It is still in `git log`.',
        clues: ['`git log -S` finds the key in two commits', 'Four people have clones, and the repository was mirrored once', 'The provider log shows calls from an unknown address this morning'],
        opts: [
          { t: 'Revoke the key now, replace it, review the provider\'s logs, then clean the history if policy asks for it', fb: '' },
          { t: 'Rewrite the history with filter-repo and tell nobody', fb: 'The key is already public. Rewriting does not take it back, and the team needs to know.' },
          { t: 'Delete the repository and create a new one', fb: 'The key is still valid, and the copies are still out there.' },
          { t: 'Wait: the file was deleted three weeks ago', fb: 'Deleting a file does not remove it from history.' }
        ],
        best: 0,
        why: 'The recording shows both halves: the key was in `HEAD`\'s ancestors after the file was deleted (' + LB.found_in_history + ' commits), and a rewrite plus a gc made the local object disappear (' + (LG.old_blob_still_in_the_repository ? 'no' : 'yes') + '). Neither touches copies that other people or sites already have. The key must be **revoked first**.',
        checks: [
          ['Revoke and replace', 'At the provider, now.'],
          ['Look for use', 'The provider\'s access logs for the old key.'],
          ['Find where it is', '`git log -S KEY --all` lists the commits. Check forks and mirrors.'],
          ['Prevent', '`.env` in `.gitignore`, a secret scanner in a hook and in CI, and a secret manager.']
        ],
        tell: 'A key committed three weeks ago was found by a scanner. Deleting the file had not removed it from history. I revoked and replaced the key first, checked the provider logs, then removed it from the history for tidiness and asked everyone to re-clone. We added a secret scanner to CI and a hook.',
        prevent: ['Keep secrets in a **secret manager**', 'A **secret scanner** in a hook and CI', '`.env` in **`.gitignore`** from the start']
      }),

      B.qa({
        id: 'qa-bigfiles', t: 1, tag: 'Git', secs: 75,
        q: 'Why are large and binary files a problem in git, and what do you do?',
        pts: ['Every version of a file stays in the history for ever', 'Binary and rewritten files do not delta well, so each version is nearly a full copy', 'A clone downloads all of them', 'Use LFS or object storage, and keep data out of git'],
        short: 'Because git keeps every version of every file in the history, and a clone downloads all of it. Text that changes a little compresses well, because packs store deltas: seven appended versions of a 500 KiB CSV took less than one copy in my recording. A file that is rewritten, or a binary, does not delta: seven re-sorted versions took about 1.7 copies, nearly a full copy each. Nothing can be removed without rewriting history. So I keep data out of git, with an ignore rule and object storage, and for the few large files that must be versioned I use Git LFS, which keeps a pointer of about 130 bytes in git and the content in a separate store, or a data version tool.',
        fu: [['What is a shallow clone for?', 'CI, when only the last commit is needed.'], ['How do you shrink a bloated repository?', 'Rewrite history with `git filter-repo`, then everybody re-clones. From documentation.']],
        trap: 'Committing a data export "just once".',
        real: 'Say how big your repositories are and what makes them big.'
      }),

      B.qa({
        id: 'qa-secret', t: 1, tag: 'Git', secs: 75,
        q: 'A secret was committed and pushed. What do you do?',
        pts: ['Revoke and replace the secret first: it is compromised', 'Deleting the file does not remove it from history', 'Rewriting history helps tidiness, not security', 'Prevent: .gitignore, a secret manager, a scanner in CI'],
        short: 'First I **revoke and replace** the secret at the provider, because once it has been pushed it is compromised: deleting the file does not help, since the earlier commit still holds it, as I recorded with `git log -S` and `git show`. Then I check the provider\'s logs for use of the old key. If policy asks for it, I rewrite the history with `git filter-repo`, and everybody re-clones, and I know that this does not reach forks, mirrors and caches. In my recording a `filter-branch` rewrite removed the key from every commit, and the old object stayed in the repository until the reflog was expired and `git gc --prune=now` ran. For prevention I keep secrets in a secret manager, `.env` in `.gitignore`, and a secret scan in a pre-commit hook and in CI.',
        fu: [['Why not just force-push a clean history?', 'Other clones and the platform\'s caches still have the old commits.'], ['What tool does git recommend?', '`git filter-repo`. The recording printed this in the warning of `filter-branch`.']],
        trap: 'Rewriting history and calling the incident closed.',
        real: 'Describe how your team handles a leaked secret.'
      }),

      B.qa({
        id: 'qa-lfs', t: 2, tag: 'Git', secs: 60,
        q: 'How does Git LFS work, and what are its limits?',
        pts: ['A rule in .gitattributes sends matching files through a filter', 'Git stores a small pointer with the sha256 and the size', 'The content is stored on an LFS server and fetched when needed', 'It needs server support, and old commits keep the full file'],
        short: 'You add a rule such as `*.parquet filter=lfs` to `.gitattributes`. For matching files, Git stores a **pointer** of about 130 bytes instead of the content: three lines with the version of the format, the sha256 of the content and its size. I recorded it: a 400 KiB file left only a few hundred bytes in `.git/objects`, and the content was in `.git/lfs/objects`. A push uploads the content to an LFS server, and a checkout downloads only the files that the checked-out commit needs. The limits: the platform must support LFS and may charge for it, every developer needs the client, and a file that was committed in full **before** the rule stays in the history in full. No LFS server ran in the course, so the transfer is from documentation.',
        fu: [['How do you move old files to LFS?', '`git lfs migrate import` rewrites history. From documentation.'], ['Is LFS a backup?', 'No. It is a storage place for large files, with the same need for backups.']],
        trap: 'Adding an LFS rule and expecting the old history to shrink.',
        real: 'Say how your team versions large files.'
      }),

      B.qa({
        id: 'qa-notebook', t: 2, tag: 'Git', secs: 60,
        q: 'How do you keep notebooks usable in git?',
        pts: ['The .ipynb file holds code, outputs and counters', 'Re-running changes lines even when the code did not change', 'Strip outputs before the commit (nbstripout)', 'Review the rendered notebook, or keep logic in modules'],
        short: 'A notebook is a JSON file that holds the code, the outputs and the execution counters. Running it again changes the counters and the outputs even when no code changed: in my recording 40 cells gave a diff of 158 lines with the code untouched, and two people who both run it get a conflict in every cell. I strip the outputs before the commit, with `nbstripout` as a git filter or a pre-commit hook, so that the file holds code only, and I review notebooks as rendered pages when the platform can. Better still, I move real logic into Python modules that are tested and reviewed as plain text, and keep the notebook as a thin layer for exploration. I did not run `nbstripout` here, so that part is from documentation.',
        fu: [['What about a notebook with a chart?', 'The image is base64 text in the file, and it makes the diff huge. Strip it.'], ['Is there an alternative format?', 'Jupytext pairs a notebook with a plain `.py` file. From documentation.']],
        trap: 'Committing notebooks with outputs, and reviewing them by reading JSON.',
        real: 'Say how your team handles notebooks in review.'
      }),

      B.qa({
        id: 'qa-filterrepo', t: 3, tag: 'Git', secs: 60,
        q: 'How do you remove a file from the whole history, and what does it cost?',
        pts: ['git filter-repo is the recommended tool, filter-branch is the old one', 'Every commit after the change gets a new id', 'Everybody must re-clone, and open branches must be rebuilt', 'Old objects stay until the reflog expires and gc runs'],
        short: 'I use `git filter-repo`, which git recommends, and not `filter-branch`: in my recording `filter-branch` printed a warning that it has "a glut of gotchas" and pointed to filter-repo, which I did not run. The rewrite makes a new commit for every commit from the first affected one onward, so **every id changes**, open branches and pull requests no longer line up, and every clone must be thrown away and made again. The old objects are still in the local repository until the reflog is expired and `git gc --prune=now` runs, as the recording showed. And forks, mirrors and the platform\'s caches keep the old history. So I do it only when I must, with notice to the team, and for secrets I revoke first.',
        fu: [['What is BFG?', 'A separate tool for the same job, mostly for large files and secrets. From documentation.'], ['Can you protect against it?', 'Branch protection stops a force push of the rewritten branch.']],
        trap: 'Rewriting shared history without warning.',
        real: 'Say whether you have ever rewritten a shared history, and how you told the team.'
      }),

      B.recap({
        id: 'm7-recap', n: 7, badge: 'Repo Steward', color: '#FBCFE8',
        pts: [
          'Appended data deltas well (' + n(SZ.append.after_gc_kib) + ' KiB). A **rewritten** file did not (' + n(SZ.rewrite.after_gc_kib) + ' KiB, ' + SZ.rewrite.times_the_file + ' copies).',
          '**Shallow** and **blobless** clones are small: ' + n(CL.depth1.kib) + ' and ' + n(CL.blobless.kib) + ' KiB against ' + n(CL.full.kib) + ' KiB.',
          'A deleted key is **still in history**. Revoke it first. A rewrite plus gc removes the local copy, not the copies of others.',
          'A notebook rerun changed **' + NB.lines_changed_after_rerun + ' lines** with no code change. Strip outputs.',
          '**LFS**: a pointer of ' + LF.pointer_bytes + ' bytes in git and the content in a store.'
        ],
        lines: [
          'I keep data and secrets out of git.',
          'I revoke a leaked key before I touch history.',
          'I strip notebook outputs.'
        ]
      })
    ]
  });
})();
