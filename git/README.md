# Git for data engineers

A guided, press-Next course on the part of Git that a data engineer uses every day: committing a pipeline, branching and joining it, resolving a conflict in a model, undoing a mistake without losing work, sharing a repository with colleagues, finding the commit that broke the nightly run, keeping data and secrets out of history, and wiring a hook and a CI job to the repository. Coach Finn follows **Brewline**, the coffee retailer, and a small project of a loader, a model, a DAG and a check script. You watch where a change sits in the working tree, the index and the repository, join one fork three ways, run four kinds of reset, push into a shared repository until it refuses, let `git bisect` find the commit that changed the tax rate, and measure how a CSV that is rewritten grows a repository. Every terminal in the course is real output from Git 2.43.

Open **`index.html`** in a browser. No install, no account.

## What is recorded, and what is a stand-in

**GitHub, GitLab, Azure DevOps and Bitbucket did not run for this course.** Pull requests, branch protection, required reviews, merge queues, signed commits and hosted CI are described from documentation. Every screen carries one of two tags.

| Tag | What it means |
| --- | --- |
| **Recorded** | Real output written by `git/verify/capture_git.py` on one Linux machine: **Git 2.43.0** and **Git LFS 3.4.1**, x86_64, in throwaway repositories. The author, the committer and every date are fixed, so the commit ids repeat from run to run. The project is a loader, a model, a DAG, a check script and a hook, all made up |
| **From documentation** | What Git does elsewhere or that I did not run: hosted platforms and their rules, pull request flows, `git filter-repo`, SHA-256 repositories beyond the length of an id, server-side hooks, signed commits, merge queues, Git LFS against a server, and the defaults of Git versions other than 2.43. Nothing was timed |

The stand-ins and limits, said again where they matter:

- **The shared repository is a bare repository in a folder of the same machine.** Maya and Omar are two clones of it, and "the remote" is a path. There was no SSH, no HTTPS, no login and no rule of a hosting platform. The refusals in mission 5 are the ones that Git itself makes (`fetch first`, `stale info`, `non-fast-forward`). A platform adds its own, such as a protected branch that refuses every direct push.
- **Git 2.43.0 only.** Other versions print other hints. The text of `git status`, `git pull` and `git push` has changed between releases, and the default of `init.defaultBranch` and of `pull.rebase` is set by configuration. The recorder sets `init.defaultBranch` to `main` in a private config file and reads no setting of the machine.
- **The ids are fixed on purpose.** With a fixed author and fixed dates, the same steps give the same ids. A repository of your own gives other ids. The lessons teach what an id is made of and not the letters.
- **The data is made up.** A CSV of 20,000 orders in 12 stores, from a fixed rule, about 513 KiB. The sizes of the repository after `git gc` depend on the zlib and Git versions, so the lesson teaches the ratio (appended rows stay under one copy of the file, a re-sorted file takes about 1.75 copies) and not the kilobytes.
- **Git LFS ran against a local store.** `git lfs track`, `add` and `commit` made a pointer file of three lines and a copy of the content under `.git/lfs`. Nothing was pushed to an LFS server, and no host's storage limits or prices were looked at.
- **A partial clone ran over `file://`** with `uploadpack.allowFilter` switched on in the origin. A hosting platform decides for itself whether it supports `--filter=blob:none`.
- **`git filter-branch` ran, and `git filter-repo` did not.** The recorder rewrote history to remove a key with `filter-branch`, which Git's own manual tells people not to use. The lessons say to use `filter-repo` and say that this part is from documentation.
- **The workflow file was read, not run.** `check.yml` was parsed, and the claim that `actions/checkout` fetches one commit unless told otherwise is from documentation. What the recording shows is the effect on a clone: `git describe` finds no tag in a shallow clone.
- **A terminal replay is built from recorded values.** Every output line came from the recording. The paths of the temporary folder are replaced by `~`, and the progress lines that a terminal overwrites are removed.
- **Names and keys are made up.** Maya, Omar and Priya are made up. The key in the leak lesson is `AKIAIOSFODNN7EXAMPLE`, the example key of the AWS documentation, and not a working one.

## Pick a path

| Path | Frames | Time | For |
| --- | --- | --- | --- |
| **Junior** | 301 | about 3 hours | Starting out, or interviewing for a junior data engineer role |
| **Senior** | 410 | about 4.5 hours | Everything in Junior, plus the history, data and release decisions that seniors own |
| **Everything** | 465 | about 5.5 hours | Adds the finer points: how objects are stored, packs and deltas, shallow, partial and sparse clones, worktrees, SHA-256, notebooks in diffs and releases from tags |

Times are estimates from reading and speaking each step, and they include saying the interview answers out loud. Switch paths at any time from the **Map** button.

## The missions

| # | Mission | Junior | Senior | Everything |
| --- | --- | --- | --- | --- |
| 1 | Commits and the three areas | 18 min | 24 min | 27 min |
| 2 | Branches, merge and rebase | 16 min | 22 min | 25 min |
| 3 | Conflicts | 17 min | 23 min | 26 min |
| 4 | Undoing mistakes | 16 min | 22 min | 25 min |
| 5 | Remotes and collaboration | 16 min | 22 min | 24 min |
| 6 | History as a tool | 16 min | 23 min | 25 min |
| 7 | Data in a repository | 16 min | 25 min | 27 min |
| 8 | Hooks, tags and CI | 18 min | 25 min | 30 min |
| 9 | Inside Git and at scale | 6 min | 14 min | 17 min |
| 10 | Boss round | 44 min | 69 min | 91 min |
| | **Total** | **189 min** | **276 min** | **324 min** |

A short mission 0 sets up the course: the four places a change goes through, what a junior and a senior are asked, how the screens work and what ran. Mission 10 has two drills that mix missions, a decision (how a team should branch and release), a coding round (write the pre-commit hook that refuses a secret), a mock interview of 37 questions, a scorecard and a one-page cheat sheet.

## What job descriptions ask for, and where this course covers it

I read a small sample of postings through search: five queries, one general and one each for data engineer roles in London, Bangalore, Singapore and Sydney. I read the search summaries and not every posting, many results were job boards and recruiters that repeat each other, and some were months old, so this shows **direction and not a count**.

| What postings ask for | Where | How it is covered |
| --- | --- | --- |
| Git as a baseline skill: "use version control systems (Git, GitLab, etc.) to manage code changes and track project history". Entry-level templates accept basic Git | 1, 2 | **Recorded**: the three areas, ids, commits, branches, and a clean `git status` after each step |
| Pull requests, code reviews, a clear commit history and meaningful commit messages | 2, 8 | **Recorded**: merge, rebase and squash side by side, `--fixup` with `--autosquash`. The pull request itself is **from documentation** |
| Branching and merging strategy: "good understanding of branching / merging strategies", trunk-based or GitFlow, branch protection rules and merge conventions (Sydney postings) | 2, 8 | **Recorded**: what each way of joining leaves in history. Branch protection and the choice between trunk-based and GitFlow are **from documentation** |
| Git workflows and CI/CD for data: DAGs, dbt models and configuration under version control, GitHub Actions, GitLab CI, "GitOps principles" (London, Germany, Sydney, Singapore) | 6, 8 | **Recorded**: a pre-commit hook that runs and refuses, a bisect over the nightly check. The workflow file is read and **not run**, and GitHub Actions is **from documentation** |
| Git next to Linux, Docker, Jira and shell scripting, "proficient in Linux environments and Git" (Bangalore postings) | all | The Docker and Kubernetes courses cover the rest. Here, everything runs in a shell |
| Keeping pipeline code and infrastructure code under version control, validated by automated tests (Singapore, Sydney) | 8 | **Recorded** for the check script and the hook. Terraform has its own course |
| Large files, notebooks and secrets in a repository | 7 | Not named in the postings that I read. It is here because a data engineer meets these three: **recorded** sizes of an appended and a re-sorted CSV, an LFS pointer, a notebook diff, and a key that was committed and removed |
| Monorepo tooling, release engineering, merge queues, signed commits | not here | **From documentation** in short notes, or not covered |

I did not survey interview sites. The 37 interview questions are written from the topics above and from what Git commonly asks of someone who works with a team: what a commit is, merge or rebase, how to undo a pushed commit, what `--force-with-lease` does, how to find the commit that broke a job, and what to do when a secret is committed.

## What you work through

- **Follow Brewline.** One project, one shared repository, three people. A model that two branches changed, a rate that went from 0.08 to 0.8 and broke the nightly check, a push that was refused, a force push that deleted a colleague's commit, a CSV that grew a repository, a key that was committed, and a clean-up job that failed on a shallow clone.
- **8 animated diagrams.** The four places a change goes through, a commit with its tree and blobs, a branch as a name for a commit, merge and rebase side by side, how far a reset goes, two clones and one shared repository, bisect, and the path of a change to a release.
- **6 labs.** Where the newest text is after each of six steps. Three ways to join one fork. Where a change went after four kinds of undo. Six pushes, with the words Git printed. How a data file grows a repository. Four tests for sixteen commits.
- **54 terminal replays, 8 code walkthroughs and 15 comparison tables.** The commands with their real output, the ignore file, the check script, the hook, the attributes file and the workflow.
- **26 quizzes, 8 bug hunts, 8 ordering games, 10 decisions with a recommended answer and 11 incident drills,** each drill with a first-move choice, a triage checklist, a way to tell the story and prevention steps.
- **37 interview questions,** each with a timer, a 60-second model answer, a key-point checklist, likely follow-ups and the mistake people make most often.

## How it was checked

| Check | Result |
| --- | --- |
| Content lint (ids, tiers, code line ranges, diagram references, answer length, writing rules, the source tag on every screen, and every number the lessons quote against the recording) | Clean. 11 chapters, 253 screens: 175 for everyone, 55 for Senior, 23 extra |
| Every frame walked in Chromium (`dev/smoke.js`), with console, network, text size, overflow and markup checks | No errors on any path. Walked 301 frames on the Junior path, 410 on the Senior path and 465 on the Everything path |
| The same walk at phone width (390 px), Everything path | No horizontal overflow, no errors. The script reports small text: the numbers of the shared interface and the diagram labels are 10.5 to 14.8 px |
| Interaction test (`node dev/e2e.js git`): every quiz, bug hunt, ordering game, decision, incident, interview question, coding problem and boss question, plus keys, text size, Map, paths, saving and reset | 850 checks passed, 0 failed |
| The 6 labs driven in the browser (`git/verify/e2e_labs.js`): every chip of every lab, compared with the recording and with values worked out in the test (the status code from three ids, the commits and merge commits counted in the printed graph, where the change is after each reset, whether a push changed the remote read from the words Git printed, the bars of the size lab, the suspects after each bisect test). The same file fails when a step shows an HTML tag, backticks, asterisks, `undefined` or `NaN` as text | 317 checks passed |
| Recorded output (`git/verify/capture_git.py`) | 12 files, 110 texts, 5 tables and 63 sets of counts, 194 items. The recorder takes about 15 seconds and removes everything it made |
| The code of the lessons, run (`git/verify/verify_git.py`) | The 10 project files of the recording are the files on disk (a resolved file and a notebook cell are made by the recorder), and the 10 code screens that show one show it exactly. The ignore file is used with `git check-ignore` (the bug hunt with the negation first ignores the sample file, its fix keeps it). Conflict markers are found by `git diff --check` (three lines). The three SQL files run in DuckDB and parse in sqlglot, and the resolved model returns the columns and values of both branches. The check script exits 0 at rates of 0.09 and 0.25 and 1 at 0.26 and 0.8, and the bug hunt without `set -e` exits 0 although the loader failed. The pre-commit hook refuses a key and a token, accepts a plain line, and `--no-verify` lets the same commit through. The attributes line sends only `.parquet` files to LFS. The workflow parses as YAML. The 2 shell files of the project and the 13 shell snippets of the lessons pass `sh -n` or `bash -n` |
| Four bug hunts run against a real shared repository (`verify_git.py`) | Each one is run next to its fix in clones of a bare repository: `reset --hard` and `--force` leave two commits on the remote while a colleague still holds the third, and `git revert HEAD` with a normal push leaves four commits and lets the colleague fast-forward. `--force` after a colleague pushed removes the colleague's commit, and `git pull --rebase` keeps it without a merge commit. `--force` after a rebase replaces a colleague's commit on a branch, and `--force-with-lease` refuses with `stale info`. `git add -A` puts an unignored `.env` on the remote, and a later commit that deletes it leaves the key in the history |
| Commands (`verify_git.py`) | 178 commands of the terminal replays and 24 `git` lines of the code screens are checked against the installed git: the command exists, a command with subcommands (`bisect`, `worktree`, `sparse-checkout`, `lfs`) is followed by one of them, and every flag exists. A flag that `git <command> -h` does not list (`--oneline`, `--graph`, `--max-parents`) is tried in a scratch repository, because a flag that Git does not know ends with an error there |
| Ids (`verify_git.py`) | The 47 commit ids that the lessons print are all ids that the recording printed |
| Recapture (`verify_git.py --recapture`) | The whole recording is made again on this machine and compared with `js/real.js`: 194 items, 0 differ in the last run, and in a run before that. The ids repeat because the author and every date are fixed. The comparison allows one thing: the date of the recording |
| Lab data (`git/verify/check_widgets.js`) | 86 checks written in code that shares nothing with the widgets: the id of a blob and of a commit worked out again with SHA-1, the status code of a file from three ids, how many commits a merge, a rebase and a squash leave, where a change is after each reset, which commits a bisect may test and that the tests fit the position of the bad commit, how the sizes of the repository relate to the size of the file, and the SHA-256 of the LFS content worked out again |
| Controls | 31 deliberately broken inputs, and each one is refused: an ignore file with no rule, a file with conflict markers given to DuckDB and to sqlglot, a shell script with an unclosed `if`, a workflow with a tab, six `git` commands (a flag that does not exist, a subcommand that does not exist, a `bisect` subcommand that does not exist, a `log` flag that is only found by trying it, a short flag, a command after a pipe that does not exist), an id that the recording never printed, ten changes to the recording that the widget checker must refuse (a wrong blob id, a merge that left five commits, a pull with rebase that made a merge commit, a status that does not follow from the ids, a soft reset that changed the index, a bisect that starts with a bad verdict, appended rows that take more than one copy, an LFS pointer with another hash, a pack with one object too many, a conflict with two stages), three recordings with one number, one word and one table cell changed, which the comparison must report, and, with `--browser`, six changes to the widget code that the lab test must fail |

### What was not checked

- **Hosted platforms were not run.** Pull requests, branch protection, required reviews, merge queues, signed commits, CODEOWNERS and hosted CI come from documentation.
- **One version.** Git 2.43.0 and Git LFS 3.4.1. Other versions differ in hints, in defaults and in the text of some commands.
- **No network.** The remote is a folder. How fast a clone or a push is depends on the network and the host, and nothing was timed.
- **`git filter-repo`, SHA-256 repositories beyond the length of an id, server-side hooks and Git LFS against a server** were not run.
- **The sizes** are those of one machine and one file. They show the ratio and not the numbers that you will get.
- **Only the screens listed under "Screens looked at" were reviewed by eye.** Every other screen was checked by the tests above and was not looked at.
- **This is engineering practice and not security advice.** A key that was pushed has to be treated as public, and rotated. Ask your security team which rules apply to you.

### Re-check before you rely on it

| Claim | Where it comes from | Link |
| --- | --- | --- |
| `git filter-branch` is not recommended, and `git filter-repo` is the tool that the manual points to. The script prints a warning and waits unless `FILTER_BRANCH_SQUELCH_WARNING` is set | The manual page of git-filter-branch, read through search. The recording ran `filter-branch` and did not run `filter-repo` | [git-filter-branch(1)](https://man7.org/linux/man-pages/man1/git-filter-branch.1.html) |
| `actions/checkout` fetches one commit by default (`fetch-depth: 1`), and `fetch-depth: 0` fetches all history for all branches and tags. Tags are not fetched in a shallow clone unless `fetch-tags` is set | The README of the action, read through search summaries that came from mirrors and from a third-party explainer. **I did not open the official page.** The recording shows the effect of a shallow clone on `git describe`, and not the action | [actions/checkout](https://github.com/actions/checkout) |
| `--force-with-lease` refuses when the remote branch is not where your remote-tracking branch says it is | The recording (`stale info`). The page of git-push was **not read in this session** | [git-push](https://git-scm.com/docs/git-push) |
| The pointer file of Git LFS has a version, an `oid sha256:` line and a `size` line | The recording, and a SHA-256 of the content that the checker worked out again. The LFS specification was **not read in this session** | [Git LFS specification](https://github.com/git-lfs/git-lfs/blob/main/docs/spec.md) |
| Branch protection, required reviews, merge queues and the merge, squash and rebase buttons of a hosting platform work as the lessons describe | From memory of the documentation of GitHub and GitLab. **Not looked up in this session.** Names and defaults differ between platforms and change | none |
| A SHA-256 repository cannot be mixed with a SHA-1 one, and hosting support is limited | From documentation, from memory. The recording shows only the length of an id (64 characters). **Not looked up in this session** | none |
| The job postings: direction only, from search summaries of five queries | Pages of job boards, recruiters and company career sites. A small sample, and some may be closed | [Example posting: Deputy, Principal Data Engineer, Sydney](https://jobs.lever.co/deputy/833ab009-ba3a-4a66-b2b8-04c469aaf0a0), [example: Quantium, Sydney](https://job-boards.anz.greenhouse.io/quantium/jobs/4000784201), [example: DevOps CI/CD for Snowflake and dbt, North Sydney](https://employmenthero.com/jobs/position/wattlecore-technologies-pty-ltd-devops-ci-cd-engineer-snowflake-dbt-17fmt/), [example: GlobalLogic, Bangalore](https://www.globallogic.com/careers/data-engineer-irc301397/), [example: Marlabs, Bangalore](https://career.marlabs.com/job/Bangalore-Cloud-Data-Engineer/1263374000) |

## Screens looked at

These are the only screens that were reviewed by eye, at 1440 by 900 unless stated:

- Eight diagrams, at the step that shows the most: the four places a change goes through, a commit with its tree and blobs, the fork of a branch, merge and rebase side by side, how far a reset goes, the two clones and the shared repository, bisect, and the path of a change to a release (this one also at 390 by 844).
- Six labs, each after a click: the fourth step of the areas lab, the rebase case, the hard reset, the lease push, the size lab for the re-sorted file, and the third bisect test.
- Coach Finn, who is in every one of those screens.

Looking found three faults that the tests had missed, and all three are fixed: the label "checks, clean checkout" ran out of the CI box in the release diagram, the label "message, author, date" touched the edges of the commit box, and the sentence "The step was (an editor)" in the areas lab read badly and now says that the step was an edit in an editor. The tests found two faults that looking did not: in the bisect lab every commit that had been ruled out was still labelled "suspect" (the lab test counted the suspects against the range and failed), and the size lab test did not check the colour of the number of copies (a change to the widget that swapped the colours was accepted, so the check was added).

## Files

```
git/
  index.html, css/git.css     the page and its colours
  js/config.js                the course settings: Coach Finn, the paths, the levels
  js/graphs.js                8 diagram specs
  js/widgets.js               the 6 labs
  js/content/                 one file per mission, 00 to 10
  js/real.js                  the recording: files, tables, texts and counts written by capture_git.py
  verify/project/             the Brewline project: README, .gitignore, .gitattributes, loader, model, DAG, check script, hook and workflow
  verify/gitlib.py            helpers of the recorder: a fixed author and fixed dates, throwaway repositories, masks
  verify/capture_git.py       makes the repositories, runs the commands, and writes js/real.js
  verify/verify_git.py        runs the code of the lessons, checks every git command, compares a new recording with js/real.js, runs the controls
  verify/check_widgets.js     recomputes the rules of the labs from the recording
  verify/e2e_labs.js          drives the six labs in Chromium
  verify/dump_git.js          lists the code, the commands and the strings of the course for verify_git.py
  verify/requirements.txt     what the machine needs
  verify/INTEGRATION.md       what the hub page, the root README and package.json needed
```

## Run the checks

```bash
python3 git/verify/verify_git.py                       # the code of the lessons, every git command, lab data and controls (about 15 seconds)
python3 git/verify/verify_git.py --recapture --browser # also record again (about 15 seconds) and drive the labs in Chromium
python3 git/verify/capture_git.py                      # writes git/js/real.js
node dev/lint-content.js git
node dev/e2e.js git && node git/verify/e2e_labs.js
node dev/smoke.js git --path all
```

A check whose tool is missing says so and is skipped.

Independent study material. Not affiliated with or endorsed by the Git project, the Software Freedom Conservancy, GitHub, GitLab, Atlassian, Microsoft, Amazon or any other vendor or project named here.
