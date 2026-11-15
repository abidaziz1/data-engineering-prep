/* Mission 1: commits and the three areas. Every output was printed by real Git in a throwaway repository with a fixed author and fixed dates. */
(function () {
  var B = LAB.b, G = LAB.get;
  var C = G.counts, X = G.text;
  var TY = C('obj.types'), SM = C('obj.same_blob'), DD = C('obj.dedupe'), OB = C('obj.one_byte'), IG = C('ign.tracked'), AR = G.table('areas.steps').rows, GI = G.file('.gitignore');
  var KEEP = '# keep one sample file, ignore the other csv files\n!data/sample.csv\ndata/*.csv\n';
  G.expect(TY.commit === 'commit' && TY.tree === 'tree' && TY.blob === 'blob' && TY.id_length === 40, 'the three object types and a 40 character id');
  G.expect(SM.equal === true && SM.hash_object === SM.in_the_tree, 'git hash-object gives the id that the tree holds for the same file');
  G.expect(DD.blobs_before === DD.blobs_after_adding_a_copy && DD.same_id === true && DD.files_in_the_tree === 5, 'a copy of a file with the same text adds a file to the tree and no object');
  G.expect(OB.old_rate_blob !== OB.new_rate_blob, 'one changed character gives another blob id');
  G.expect(AR.length === 6 && AR[2][5] === 'M  models/orders_daily.sql' && AR[4][5] === 'M  models/orders_daily.sql' && /^MM/.test(AR[3][5]) && AR[1][5].slice(0, 2) === ' M', 'the six steps give the status codes that the lesson reads');
  G.expect(AR[3][2] !== AR[3][3] && AR[3][3] !== AR[3][4], 'after the second edit the three places hold three different texts');
  G.expect(IG.check_ignore_rc === 1 && IG.check_ignore_no_index_rc === 0 && IG.status === 'M old.log' && IG.status_after_rm_cached === 'D  old.log' && IG.status_after_commit === '(clean)', 'a tracked file is not ignored until it is removed from the index');
  G.expect(/data\/\*\.csv/.test(X('ign.check')) && /!! data\//.test(X('ign.status_ignored')), 'the ignore rule and the ignored folder are named');

  LAB.addChapter({
    id: 'm1', n: 1, title: 'Commits and the three areas', short: 'Commits', blurb: 'What a commit is made of, and where a change is at each step', minutes: 18,
    focus: ['src', 'stg'],
    goals: [
      'Say what the **working tree, the index and the repository** each hold.',
      'Read a **commit, a tree and a blob**, and say why an id changes when one character does.',
      'Stage part of your work and read `git status` and `git diff` correctly.',
      'Keep files out of git with **.gitignore**, and know what it does not do.'
    ],
    say: 'Git does not store changes. It stores snapshots, and names each one by a hash. Once you see what a commit is made of, branches, merges and resets stop being mysterious. We make a commit in a real repository, open it up, and follow one file through the three places it can be.',
    scenes: [
      B.term({
        id: 'm1-first', t: 1, src: 'rec', title: 'The first commit',
        say: 'A new repository with the four files of the Brewline loader. I looked at the status, staged the files, looked again, and committed.',
        lines: function () {
          return G.term([
            ['git status --short', X('obj.status_untracked')],
            ['git add README.md loader models', ''],
            ['git status --short', X('obj.status_staged')],
            ['git commit -m "Add the loader and the daily model"', X('obj.commit_out')],
            ['git log --oneline', X('obj.log')]
          ]);
        },
        after: 'Before `git add` the files were **untracked** (`??`): Git saw them and did not care. After it they were **added** (`A`) to the index. The commit printed its short id, **' + TY.commit_id + '**, the message, and how many files and lines it holds. `--short` prints one line for each file: the first letter is the index, the second is the working tree.',
        afterKind: 'tip',
        doneSay: 'add puts a file in the index. commit saves the index.'
      }),

      B.term({
        id: 'm1-cat', t: 1, src: 'rec', title: 'Open the commit',
        say: '`git cat-file` prints the objects that Git stored. I read the commit, the tree that it points to, and one file.',
        lines: function () {
          return G.term([
            ['git cat-file -t HEAD', TY.commit],
            ['git cat-file -p HEAD', X('obj.cat_commit')],
            ['git cat-file -p ' + TY.tree_id, X('obj.cat_tree')],
            ['git cat-file -p ' + TY.blob_id + '   # the model', X('obj.cat_blob')]
          ]);
        },
        after: 'A **commit** is a small text: the id of a **tree**, the author and the committer with a time, and the message. The **tree** lists the files and folders of that moment, each with an id. A **blob** is the text of one file. Nothing says what changed. Git stores the **whole snapshot** and finds the difference when you ask for it. The ids are 40 characters long (' + TY.id_length + '), and the screens show the first 7.',
        afterKind: 'tip',
        doneSay: 'A commit points to a tree. A tree points to blobs.'
      }),

      B.flow({
        id: 'm1-objects', t: 1, src: 'docs', title: 'A commit, a tree and blobs', g: 'objects', legend: true,
        steps: [
          { say: 'This is what the last screen opened. Press Next.', focus: ['c2', 'root', 'models', 'loader', 'readme', 'sql', 'rate'], cap: 'Three kinds of object.' },
          { say: 'Step 1. A **commit** points to its **parent**, the commit before it. That chain is the history. The first commit has no parent.', on: ['e1'], focus: ['c2', 'c1'], cap: 'A commit points to its parent.' },
          { say: 'Step 2. It also points to one **tree**, the root folder of the project at that moment.', on: ['e2'], focus: ['c2', 'root'], cap: 'A commit points to a tree.' },
          { say: 'Step 3. A tree lists its entries. A folder is another tree. A file is a **blob**, which is only the text of the file. The name of the file lives in the tree, not in the blob.', on: ['e3', 'e4', 'e5'], focus: ['root', 'models', 'loader', 'readme'], cap: 'A tree lists folders and files.' },
          { say: 'Step 4. The blobs sit at the end. Two files with the same text, in any folder, use **one** blob. The next screen shows it.', on: ['e6', 'e7'], focus: ['models', 'loader', 'sql', 'rate'], tags: ['tg_same'], cap: 'The same text is stored once.' },
          { say: 'Every object is named by the **hash of its own content**. If one character of a file changes, its blob has a new id, so the tree has a new id, so the commit has a new id.', focus: ['c2', 'root', 'sql'], tags: ['tg_hash'], cap: 'The id is a function of the content.' }
        ]
      }),

      B.term({
        id: 'm1-hash', t: 1, src: 'rec', title: 'The id is the content',
        say: 'Three small experiments. First, I asked Git for the id of a file without storing it. Second, I added a copy of the file under another name. Third, I changed one character.',
        lines: function () {
          return G.term([
            ['git hash-object models/orders_daily.sql', SM.hash_object + '   (the same as the tree: ' + SM.in_the_tree + ')'],
            ['cp models/orders_daily.sql models/orders_daily_copy.sql && git add models/orders_daily_copy.sql', ''],
            ['git ls-files | wc -l   # files in the index', String(DD.files_in_the_tree)],
            ['git cat-file --batch-all-objects --batch-check | grep -c blob   # blobs', DD.blobs_before + ' before the copy, ' + DD.blobs_after_adding_a_copy + ' after'],
            ['echo 0.09 > loader/tax_rate.txt; git hash-object loader/tax_rate.txt   # was 0.08', OB.new_rate_blob + '   (the old text had ' + OB.old_rate_blob + ')']
          ]);
        },
        after: '`hash-object` computed the id from the text alone, and it matched the id in the tree: **the id is the content**. The copy added a **file** to the index and **no new object**, because its text is the same: ' + DD.blobs_after_adding_a_copy + ' blobs before and after. Changing `0.08` to `0.09` gave an id that has **nothing in common** with the old one (' + OB.old_rate_blob + ' and ' + OB.new_rate_blob + '). That is why Git can tell at once whether two files, two trees or two histories are equal.',
        afterKind: 'tip',
        doneSay: 'Same text, same id. One changed character, a different id.'
      }),

      B.term({
        id: 'm1-diff', t: 1, src: 'rec', title: 'Three places, two diffs',
        say: 'I edited the model and the readme, and staged only the readme. Then I asked for the diff in two ways, and for the status.',
        lines: function () {
          return G.term([
            ['git diff', X('obj.diff')],
            ['git diff --staged', X('obj.diff_staged')],
            ['git status', X('obj.status_long')]
          ]);
        },
        after: '`git diff` compares the **working tree with the index**: the unstaged edit to the model. `git diff --staged` compares the **index with the last commit**: the staged line of the readme. `git status` says the same in words, and prints the command that undoes each state. A commit now would contain **only the readme**. The edit to the model stays in the working tree, which is how you split one afternoon of work into two commits.',
        afterKind: 'tip',
        doneSay: 'diff is the working tree against the index. diff --staged is the index against the commit.'
      }),

      B.widget({ id: 'm1-lab', kind: 'areas', t: 1, src: 'rec', title: 'Lab: where is the newest text?' }),

      B.cmp({
        id: 'm1-codes', t: 1, src: 'rec', title: 'Reading git status --short',
        say: 'The two letters of `git status --short` are the whole story of a file. The first letter compares the index with the last commit. The second compares the working tree with the index. Press Next.',
        cols: ['Code', 'Meaning', 'Seen in the lab'],
        hl: 0,
        rows: [
          ['`??`', 'The file is new and Git does not track it yet.', 'The first screen of this mission.'],
          ['`A `', 'The file is staged as new.', 'After `git add` of a new file.'],
          ['` M`', 'Changed in the working tree, not staged.', AR[1][5]],
          ['`M `', 'Staged. The index holds the new text.', AR[2][5]],
          ['`MM`', 'Staged, and then edited again. The two texts differ.', AR[3][5]],
          ['`!!`', 'Ignored (only with `--ignored`).', 'The ignore screen below.']
        ],
        steps: [
          { upto: 2, say: 'New files: untracked, then added.' },
          { upto: 5, say: 'A tracked file in three states. `MM` is the one that surprises people: the commit takes the staged text and leaves the later edit behind.' },
          { upto: 6, say: 'Ignored files are hidden from the normal status.' }
        ]
      }),

      B.term({
        id: 'm1-ignore', t: 1, src: 'rec', title: 'Keep rebuilt files out of git',
        say: 'The project has a `.gitignore`. I created a data file and a log, and asked Git what it saw.',
        lines: function () {
          return G.term([
            ['git status --short   # with data/orders.csv and run.log on disk', X('ign.status')],
            ['git status --short --ignored', X('ign.status_ignored')],
            ['git check-ignore -v data/orders.csv', X('ign.check')]
          ]);
        },
        after: 'The data file and the log are **ignored**: the normal status does not list them, and `--ignored` shows them with `!!`. `git check-ignore -v` names the **rule and the line** that matched: `' + X('ign.check').split('\t')[0] + '`. Use it whenever you wonder why a file is or is not ignored.',
        afterKind: 'tip',
        doneSay: 'check-ignore -v names the rule that matched.'
      }),

      B.code({
        id: 'm1-ignorefile', t: 1, src: 'rec', title: 'The .gitignore of the project', file: '.gitignore', lang: 'text', code: GI,
        steps: [
          { say: 'Four rules and a comment. Press Next.', lines: null },
          { say: 'Rebuilt data does not belong in git. The pattern matches CSV files in the `data` folder.', lines: G.span(GI, /data\/\*\.csv/) },
          { say: 'Logs and local settings, including `.env`, which often holds a key.', lines: G.span(GI, /\*\.log/, /\.env/) },
          { say: 'Caches of Python. A pattern that ends in `/` matches folders.', lines: G.span(GI, /__pycache__/) }
        ],
        note: 'The file is committed, so that everybody who clones the repository ignores the same things.'
      }),

      B.term({
        id: 'm1-tracked', t: 1, src: 'rec', title: 'An ignored file that is already tracked',
        say: 'A log was committed by mistake, and `*.log` was ignored afterwards. Then the log changed.',
        lines: function () {
          return G.term([
            ['git check-ignore old.log   # exit code ' + IG.check_ignore_rc, '(no output: Git does not call it ignored)'],
            ['git check-ignore --no-index old.log   # exit code ' + IG.check_ignore_no_index_rc, 'old.log'],
            ['git status --short old.log', IG.status],
            ['git rm --cached old.log && git status --short old.log', IG.status_after_rm_cached],
            ['git commit -m "Stop tracking the log" && git status --short old.log', IG.status_after_commit]
          ]);
        },
        after: 'A rule in `.gitignore` applies only to **untracked** files. A file that is already committed stays tracked, and keeps showing as modified (`' + IG.status + '`), although a rule matches it (the `--no-index` question). The fix is `git rm --cached`: it removes the file from the **index** and leaves it on disk. After the commit the status is clean, and the rule works. The old versions stay in the history.',
        afterKind: 'warn',
        doneSay: 'Ignore rules do not apply to tracked files.'
      }),

      B.bug({
        id: 'm1-bug', t: 1, src: 'docs', q: 'The team wants to keep one sample file and ignore every other CSV in `data/`. `data/sample.csv` is being ignored anyway. Click the line that is the problem.',
        file: '.gitignore', lang: 'text', code: KEEP, bad: [2],
        hint: 'The last matching rule wins. Which rule comes last for data/sample.csv?',
        why: 'Git reads the rules from top to bottom, and **the last one that matches decides**. Here `data/*.csv` comes after `!data/sample.csv` and matches the sample file again, so it is ignored. A negation must come **after** the rule that it makes an exception to.',
        fix: '# keep one sample file, ignore the other csv files\ndata/*.csv\n!data/sample.csv\n',
        cheer: 'General rule first, then the exception.'
      }),

      B.order({
        id: 'm1-ord', t: 1, q: 'Put these steps in the order in which a change becomes a commit.',
        items: [
          'Edit `models/orders_daily.sql` in your editor',
          'Look at `git diff` to see what you changed',
          '`git add models/orders_daily.sql` to stage it',
          'Look at `git diff --staged` to see what the commit will hold',
          '`git commit -m "..."` to save the snapshot'
        ],
        why: 'The two diffs are the check before and after staging. A commit contains exactly what is in the index, so reading `git diff --staged` just before you commit is the cheapest review there is.'
      }),

      B.quiz({
        id: 'm1-q1', t: 1,
        q: 'You run `git add models/orders_daily.sql`, edit the file again, and run `git commit`. What does the commit contain?',
        opts: [
          { t: 'The text that was staged. The second edit stays in the working tree', fb: '' },
          { t: 'The second edit as well, because commit reads the file', fb: 'Commit reads the index, not the file.' },
          { t: 'Nothing, because the file changed after add', fb: 'The staged text is committed.' },
          { t: 'Git asks which version you want', fb: 'It does not ask.' }
        ],
        ok: 0, why: 'In the lab the status after the second edit was `' + AR[3][5].slice(0, 2) + '`, which means: staged text and a newer edit. After the commit the file showed ` M`: the edit was left behind.'
      }),

      B.quiz({
        id: 'm1-q2', t: 1,
        q: 'Two files in different folders have exactly the same text. How many blobs does Git store for them?',
        opts: [
          { t: 'One. The id is the hash of the content, and the tree has two entries that point to it', fb: '' },
          { t: 'Two, one for each path', fb: 'The path is stored in the tree, not in the blob.' },
          { t: 'Two, but one is a link to the other', fb: 'Git does not use links between blobs.' },
          { t: 'It depends on the size of the file', fb: 'Size does not matter for this.' }
        ],
        ok: 0, why: 'The recording added a copy of the model: the index had ' + DD.files_in_the_tree + ' files and the blob count stayed at ' + DD.blobs_after_adding_a_copy + '.'
      }),

      B.quiz({
        id: 'm1-q3', t: 1,
        q: 'A file `old.log` was committed. Then `*.log` was added to `.gitignore`. What happens when the log changes?',
        opts: [
          { t: 'It still shows as modified, because the rule applies only to untracked files', fb: '' },
          { t: 'It is ignored from now on', fb: 'It is already tracked, so the rule does not apply.' },
          { t: 'Git deletes it from the repository', fb: 'Git never deletes tracked files on its own.' },
          { t: 'Git warns and refuses to commit', fb: 'It just shows the file as modified.' }
        ],
        ok: 0, why: 'The recording: `git status --short` said `' + IG.status + '` until `git rm --cached` and a commit.'
      }),

      B.decide({
        id: 'm1-dec', t: 2, src: 'docs', title: 'Decision: one commit or three',
        scenario: 'In one afternoon you renamed a column in the model, fixed a typo in the loader, and added a paragraph to the readme about the check. All three changes are done and tested. The reviewer reads about 20 lines of diff in a minute.',
        opts: [
          { t: 'One commit: "Update the pipeline"', d: 'One step, one message.', lose: 'The reviewer must read three unrelated changes together. If the column rename breaks the dashboard, reverting it also reverts the typo fix and the readme.' },
          { t: 'Three commits, one for each change, with messages that say why', d: 'Each can be reviewed alone, reverted alone and found by bisect. `git add -p` lets you split a file into pieces.', lose: 'A little more care when you stage, and a history with more lines.' },
          { t: 'One commit at the end of every hour, with a timestamp as the message', d: 'Nothing is lost if the laptop dies.', lose: 'The history says when you worked and nothing about what changed. Nobody can find the commit that broke something.' }
        ],
        pick: 1,
        why: 'A commit is the unit that people review, revert and search. One purpose in each commit keeps all three possible. Work in progress can be saved often and tidied before you share it, which mission 6 shows.',
        when: 'For a first draft on your own branch, small saves are fine. Clean them up before the review.'
      }),

      B.incident({
        id: 'm1-inc', t: 2, src: 'rec', title: 'Incident: the log is in git and will not go away', time: '16:20',
        alert: '**`git status` lists `old.log` as modified after every run of the loader, although `*.log` is in `.gitignore`.** A colleague added the rule an hour ago and says it does not work.',
        clues: ['`git check-ignore old.log` prints nothing and exits with 1', '`git check-ignore --no-index old.log` prints the file name', 'The log of that one file shows a commit that added it'],
        opts: [
          { t: '`git rm --cached old.log`, commit, and keep the rule', fb: '' },
          { t: 'Delete `old.log` from the disk', fb: 'The next run of the loader writes it again, and the file is still tracked.' },
          { t: 'Add `old.log` to `.gitignore` again', fb: 'It is already matched. The rule never applies to a tracked file.' },
          { t: 'Run `git add --force old.log`', fb: 'That stages it again and keeps tracking it.' }
        ],
        best: 0,
        why: 'The file is **tracked**, and ignore rules apply only to untracked files. The recording shows the same picture: `check-ignore` says no, `check-ignore --no-index` says yes, and the status stays `M` until `git rm --cached` and a commit. The file stays on disk.',
        checks: [
          ['Ask the rule', '`git check-ignore -v --no-index FILE` names the rule that would match.'],
          ['Ask the index', '`git ls-files FILE` prints the file if it is tracked.'],
          ['Stop tracking', '`git rm --cached FILE`, then commit.'],
          ['Prevent', 'Add the rule **before** the first commit, and review `git status` before `git add -A`.']
        ],
        tell: 'The log was already tracked, and ignore rules do not apply to tracked files, so it kept showing as modified. I removed it from the index with git rm --cached, committed, and kept the rule. The file stayed on disk, and the old versions stay in history.',
        prevent: ['Put ignore rules in place **before** the first commit', 'Read `git status` before you use `git add -A`', 'Use `git check-ignore -v` when a rule seems to fail']
      }),

      B.cmp({
        id: 'm1-objtypes', t: 3, src: 'docs', title: 'The four kinds of object',
        say: 'Everything in a repository is one of four kinds of object. You have met three. Press Next.',
        cols: ['Object', 'Holds', 'Made by'],
        hl: 0,
        rows: [
          ['blob', 'The text of one file, and nothing else', '`git add`'],
          ['tree', 'A list of names with the ids of blobs and other trees', '`git add` and `git commit`'],
          ['commit', 'A tree id, parent ids, author, committer and a message', '`git commit`'],
          ['tag', 'An id, a name, a tagger and a message. Only **annotated** tags are objects', '`git tag -a`']
        ],
        steps: [
          { upto: 3, say: 'Blobs, trees and commits make every snapshot. Mission 8 records the fourth kind, the annotated tag.' },
          { upto: 4, say: 'A lightweight tag is not an object. It is only a name that points to a commit, like a branch that never moves.' }
        ]
      }),

      B.qa({
        id: 'qa-snapshots', t: 1, tag: 'Git', secs: 75,
        q: 'What is a commit, and does Git store changes or snapshots?',
        pts: ['A commit is a snapshot of the whole project: a tree, parents, author, date and message', 'The id is the hash of that content', 'Differences are computed when you ask, and pack files store deltas to save space', 'The parent link makes the history'],
        short: 'A commit is a snapshot of the whole project at one moment. It holds the id of a tree that lists every file, the id of its parent commit, an author, a committer, a date and a message, and its own id is the hash of all that. Git stores snapshots and computes differences when you ask for one with `git diff` or `git show`. In my recording I opened a commit with `git cat-file -p`: it was a few lines of text that pointed to a tree, and the tree pointed to blobs. The pack files that Git writes later store similar versions as deltas, but that is storage, not the model. Because every id depends on the content below it, one changed character gives a new id all the way up to the commit.',
        fu: [['Why are ids 40 characters long?', 'They are SHA-1 hashes, 160 bits. Git can also use SHA-256, which gives 64 characters. Mission 9 recorded both.'], ['Where is the file name stored?', 'In the tree, not in the blob. That is why two files with the same text share a blob.']],
        trap: 'Saying that a commit is a diff.',
        real: 'Describe how you explain a commit to a new colleague.'
      }),

      B.qa({
        id: 'qa-index', t: 1, tag: 'Git', secs: 60,
        q: 'What is the staging area, and why does Git have one?',
        pts: ['The index holds what the next commit will contain', 'It lets you commit part of your work', 'git diff compares the working tree with the index, and git diff --staged compares the index with the last commit', 'A commit reads the index, not your files'],
        short: 'The staging area, also called the index, is the list of file contents that the next commit will hold. It exists so that you decide what goes into a commit, instead of saving everything that changed. You can stage the model and leave a half-finished loader edit out, or stage part of a file with `git add -p`. `git diff` compares the working tree with the index, and `git diff --staged` compares the index with the last commit. In the recording I edited a file, staged it, and edited it again: the status was `MM`, and the commit took the staged text and left the later edit in the working tree. That is the one detail that surprises people.',
        fu: [['What does `git commit -a` do?', 'It stages every change to tracked files first. It does not add new files. From documentation.'], ['How do you stage half a file?', '`git add -p` asks for each block of change. From documentation.']],
        trap: 'Thinking that commit saves the files as they are on disk.',
        real: 'Describe a time you used the index to split work into two commits.'
      }),

      B.qa({
        id: 'qa-ignore', t: 2, tag: 'Git', secs: 60,
        q: 'How does .gitignore work, and what does it not do?',
        pts: ['Rules apply only to untracked files', 'The last matching rule wins, so exceptions come last', 'git check-ignore -v names the rule', 'It does not remove files that are already tracked, and it hides nothing from history'],
        short: 'A `.gitignore` lists patterns of files that Git should treat as not there. It applies only to **untracked** files: a file that is already committed stays tracked and keeps showing as modified until you run `git rm --cached` and commit, as I recorded with a log file. Rules are read top to bottom and the **last match wins**, so a `!` exception must come after the pattern it relaxes. `git check-ignore -v` tells you which rule matched. It also cannot protect you after the fact: a key that was committed once is in the history, whatever the file says now. So I commit the ignore file at the start, and I put `.env` and local data in it.',
        fu: [['Where else can you put ignore rules?', '`.git/info/exclude` for your own machine, and a global file named in `core.excludesFile`. From documentation.'], ['Does an empty folder get tracked?', 'No. Git tracks files. A folder exists only while it holds one.']],
        trap: 'Adding a rule and expecting a tracked file to disappear.',
        real: 'Say what your repositories ignore, and who maintains that list.'
      }),

      B.qa({
        id: 'qa-hashfn', t: 3, tag: 'Git', secs: 60,
        q: 'Why does every commit id change when a file changes, even in an old commit?',
        pts: ['A blob id is the hash of the file text', 'A tree id is the hash of its entries, which include blob and tree ids', 'A commit id is the hash of its tree id, its parent ids and its metadata', 'So a change below changes every id above it'],
        short: 'Because each id is computed from the content of the object, and an object contains the ids of the objects below it. A blob id comes from the text of the file. A tree contains the blob ids, so its id changes when a blob does. A commit contains the tree id and the parent id, so its id changes when the tree does, and so does every later commit that has it as an ancestor. This is a Merkle tree, and it is why a rebase gives new ids to every commit that it replays: the parent is different, so the content is different. In the recording a rebased commit kept its author, date and changes and got a new id.',
        fu: [['Can two different files have the same id?', 'In theory yes. For SHA-1 a collision was shown in 2017 and Git added a check. SHA-256 repositories are the long-term answer.'], ['Is a hash a security feature?', 'It detects corruption and changes. It does not prove who made a commit. Signing does. From documentation.']],
        trap: 'Saying that the id depends on the date only.',
        real: 'Explain to a colleague why their rebased commits have new ids.'
      }),

      B.recap({
        id: 'm1-recap', n: 1, badge: 'Snapshot Taker', color: '#FED7AA',
        pts: [
          'A **commit** points to a **tree**, a tree points to **blobs**, and a commit points to its **parent**. Ids are the hash of the content: 40 characters.',
          'The **index** holds the next commit. `git diff` is working tree against index. `git diff --staged` is index against commit.',
          '`MM` means staged and then edited again. The commit takes the staged text.',
          'The same text is stored **once**: ' + DD.blobs_after_adding_a_copy + ' blobs before and after a copy of a file.',
          '`.gitignore` works on **untracked** files. A tracked file needs `git rm --cached`.'
        ],
        lines: [
          'I read git status and git diff before I commit.',
          'I keep each commit to one purpose.',
          'I put ignore rules in place before the first commit.'
        ]
      })
    ]
  });
})();
