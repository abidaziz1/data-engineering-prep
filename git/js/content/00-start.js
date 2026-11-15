/* Mission 0: pick a path, see the whole picture, and learn what the tags mean. */
(function () {
  var B = LAB.b, G = LAB.get;
  var M = function (k) { return G.meta(k); };

  LAB.addChapter({
    id: 'm0', n: 0, noIntro: true, title: 'Start here', short: 'Start', blurb: 'Pick your path and see the whole picture', minutes: 7,
    scenes: [
      B.welcome({ id: 'welcome' }),

      B.flow({
        id: 'm0-map', t: 1, src: 'docs', title: 'The four places a change goes through', g: 'master', legend: true,
        steps: [
          { say: 'Brewline keeps its loader, its models and its schedule in one repository. Git keeps every version of every file, and four people share them. This picture is the whole course. Press Next.', focus: ['wt', 'ix', 'repo', 'rem'], cap: 'Your files on the left, the shared copy on the right.' },
          { say: 'Step 1. You edit files in the **working tree**. Git sees the difference from the last commit, and does nothing else yet.', on: ['e1'], focus: ['wt', 'ix'], tags: ['tg_add'], cap: 'You edit files.' },
          { say: 'Step 2. `git add` copies the new text into the **index**, the list of what the next commit will contain. You choose what goes in.', on: ['e1'], focus: ['ix'], cap: 'You stage what belongs together.' },
          { say: 'Step 3. `git commit` saves the index as a **commit** in your local repository, in the `.git` folder. It is a snapshot with a message, an author and a date.', on: ['e2'], focus: ['ix', 'repo'], tags: ['tg_commit'], cap: 'A commit is a snapshot.' },
          { say: 'Step 4. `git push` sends your new commits to the **remote**, a shared repository. Other people see them only after this step.', on: ['e3'], focus: ['repo', 'rem'], tags: ['tg_push'], cap: 'A push shares the commits.' },
          { say: 'Step 5. `git fetch` brings the commits of other people into your repository. It does not touch your files. A merge or a rebase then combines the two lines of work.', on: ['e4'], focus: ['rem', 'repo'], tags: ['tg_fetch'], cap: 'A fetch brings their commits.' },
          { say: 'Step 6. `git restore` and `git switch` take files **out of** the repository into your working tree. That is how you go back to an older version.', on: ['e5'], focus: ['repo', 'wt'], tags: ['tg_restore'], cap: 'Files come back out of the repository.' },
          { say: 'The course: commits and the index (mission 1), branches, merge and rebase (2), conflicts (3), undoing mistakes (4), remotes (5), history as a tool (6), data in a repository (7), hooks, tags and CI (8), and how Git stores things (9).', focus: ['wt', 'ix', 'repo', 'rem'], cap: 'Nine short missions and a boss round.' }
        ]
      }),

      B.cmp({
        id: 'm0-levels', t: 1, src: 'docs', title: 'Junior or senior: what changes',
        say: 'Nobody hires a data engineer for Git alone. You are asked about it because pipelines, models and infrastructure live in repositories, and a mistake there reaches production. Press Next to read what is expected at each level.',
        cols: ['Area', 'A junior is expected to', 'A senior is expected to'],
        hl: 2,
        rows: [
          ['Commits', 'Stage, commit and write a message that says why.', 'Keep commits small and whole, so that each one can be reviewed, reverted and bisected.'],
          ['Branches', 'Branch, push and open a pull request.', 'Choose between merge, rebase and squash, and say what each does to the history.'],
          ['Conflicts', 'Read the markers and resolve a simple conflict.', 'Resolve a conflict in a model or a lock file without losing either side, and test the result.'],
          ['Mistakes', 'Undo a change that is not committed.', 'Recover a lost commit from the reflog, and revert something that was already pushed.'],
          ['Teamwork', 'Pull before you push.', 'Say why a push is refused, and use `--force-with-lease` instead of `--force`.'],
          ['Data', 'Keep data files out of git with `.gitignore`.', 'Handle large files, a leaked key and a noisy notebook, and say what a rewrite of history costs.'],
          ['Process', 'Follow the review and release steps of the team.', 'Set up hooks, CI, tags and protected branches that make the right thing easy.']
        ],
        steps: [
          { upto: 4, say: 'The first four rows are the daily skills: committing, branching, resolving and undoing. A junior does them. A senior can explain what Git did.' },
          { upto: 7, say: 'The last three decide how safe a team is. They carry most of the questions of a senior interview.' }
        ]
      }),

      B.talk({
        id: 'm0-how', t: 1, src: 'rec', title: 'How this course works',
        say: 'Five quick things before we start. Press Next for each.',
        items: [
          ['SEE, TRY, SAY', 'Every mission watches something work (**SEE**), makes you practise it (**TRY**), then asks the interview question out loud (**SAY**). Orange blocks in a diagram are a change moving. Numbers show the order.', 'Watch first, practise second, speak third.'],
          ['Junior, Senior, Extra', 'A small tag on a screen tells you who it is for. No tag means everybody. **Senior** and **Extra** screens appear only on the wider paths.', 'The tag tells you whether a screen is on your path.'],
          ['Two kinds of screen', 'A **Recorded** tag means that I ran it in real Git and wrote down what Git printed and did. A **From documentation** tag means that I read it and did not run it.', 'Recorded means run. From documentation means read.'],
          ['What ran', 'Git ' + M('git') + ' on throwaway repositories, with made-up Brewline files. Every author and every date was fixed, so a commit id is the same on every run. Every output is real.', 'Fixed dates give the same ids on every run.'],
          ['Where Git ends', 'GitHub, GitLab and Bitbucket add pull requests, reviews, protected branches and CI around Git. They need an account, so they did not run. The README lists them.', 'Hosted platforms are from documentation.']
        ],
        cols: 1
      }),

      B.cmp({
        id: 'm0-ran', t: 2, src: 'rec', title: 'What I ran, and what I did not',
        say: 'This is the exact setup behind every recorded screen. Press Next to read it.',
        cols: ['Part', 'What it was', 'Status'],
        hl: 1,
        rows: [
          ['Git', 'Version ' + M('git') + ' on ' + M('os') + ', with a fixed author, committer and date for every commit', 'Run'],
          ['Repositories', 'Throwaway folders with made-up Brewline files: a loader, a model, a DAG and a check. A bare repository on the same machine stood in for the remote', 'Run'],
          ['Git LFS', 'Version ' + M('git_lfs') + ': pointer files and the local store. No LFS server was used', 'Run, in part'],
          ['Two people', 'Maya, Omar and Priya are three authors in the same repository, made with different author names and dates', 'Run'],
          ['GitHub, GitLab, Bitbucket', 'Pull requests, reviews, branch protection, CODEOWNERS and their CI', 'Not run'],
          ['Other tools', 'git filter-repo, pre-commit frameworks, nbstripout and GitHub Actions themselves', 'Not run']
        ],
        steps: [
          { upto: 4, say: 'The first four rows ran. They are everything you need to see what a commit, a branch, a merge, a push and a rewrite do.' },
          { upto: 6, say: 'The last two did not run. What I say about them comes from documentation, and the README lists what to check again.' }
        ]
      })
    ]
  });
})();
