/* Mission 2: environments and packaging. A venv, a uv project, a lock file, version specifiers, and the same code on two pandas versions. */
(function () {
  var B = LAB.b, G = LAB.get;
  var VENV = G.text('m2/venv_session'), UVS = G.text('m2/uv_session'), LOCKC = G.text('m2/lock_check');
  var PYPROJ = G.file('m2/pyproject.toml'), LOCKX = G.file('m2/uv.lock.excerpt');
  var OLD = G.text('m2/pandas_versions.py@old'), NEW = G.text('m2/pandas_versions.py@new'), PV = G.file('m2/pandas_versions.py@new');
  var SPEC = G.counts('m2.specifiers.pandas');
  var PYV = G.meta('python'), PANDAS = G.meta('pandas');

  function spec(s) { var x = SPEC.specs.filter(function (y) { return y.spec === s; })[0]; G.expect(!!x, 'recorded specifier ' + s); return x.matches; }
  var RQ = G.at(LOCKX, /name = "requests"/);
  G.expect(LOCKX.split('\n')[RQ + 2] === 'dependencies = [' && LOCKX.split('\n')[RQ + 7] === ']', 'the dependencies of requests start three lines below its name');
  var S_TILDE = spec('~=3.0.2'), S_GE3 = spec('>=3');
  G.expect(S_TILDE.length === 1 && S_TILDE[0] === '3.0.6', '~=3.0.2 allows only 3.0.6 in the sample');
  G.expect(S_GE3.length === 4 && S_GE3[0] === '3.0.0' && S_GE3[3] === '3.1.1', '>=3 allows four of the sampled pandas releases');
  G.expect(/ModuleNotFoundError: No module named 'pandas'/.test(VENV), 'the new venv has no pandas');
  G.expect(/dtype of a column of strings: object/.test(OLD) && /dtype of a column of strings: str/.test(NEW), 'object on pandas 2.3.3, str on pandas 3.1.1');
  G.expect(/\[99, 2, 3\]/.test(OLD) && /\[1, 2, 3\]/.test(NEW.split('\n')[2]), 'the view write reaches the parent only on pandas 2.3.3');
  G.expect(/datetime64\[ns\]/.test(OLD) && /datetime64\[us\]/.test(NEW), 'ns on pandas 2.3.3, us on pandas 3.1.1');
  G.expect(/needs to be updated, but `--locked` was provided/.test(LOCKC), 'uv sync --locked refuses an out-of-date lock file');
  var OLDV = /with pandas ([\d.]+)/.exec(OLD)[1], NEWV = /with pandas ([\d.]+)/.exec(NEW)[1];
  var OLDPY = /^([\d.]+) with/.exec(OLD)[1], NEWPY = /^([\d.]+) with/.exec(NEW)[1];

  var DOCKER = ['FROM python:3.14-slim', 'WORKDIR /app', 'COPY . .', 'RUN pip install pandas requests', 'CMD ["python", "load_orders.py"]'].join('\n');
  var DOCKER_FIX = ['FROM python:3.14-slim', 'COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv', 'WORKDIR /app', 'COPY pyproject.toml uv.lock ./', 'RUN uv sync --locked --no-dev', 'COPY . .', 'CMD ["uv", "run", "python", "load_orders.py"]'].join('\n');

  LAB.addChapter({
    id: 'm2', n: 2, title: 'Environments and packaging', short: 'Environments', blurb: 'Virtual environments, uv, lock files and a run that you can repeat', minutes: 22,
    focus: ['sf'],
    goals: [
      'Explain what a **virtual environment** is and what is inside one.',
      'Create a project with **pyproject.toml** and a **lock file**, and say which files go into git.',
      'Read a **version specifier** such as `~=3.0.2` and say which releases it allows.',
      'Show how the **same code** gives different results on two library versions.',
      'Rebuild the same environment on another machine with one command.'
    ],
    say: 'Mission 2 is the part that people skip and then pay for. The same file ran on pandas ' + OLDV + ' and on pandas ' + NEWV + ' for the recording, and four things came out differently. Every terminal on these screens is a real run of venv, uv and pip with Python ' + PYV + '.',
    scenes: [
      B.talk({
        id: 'm2-talk', t: 1, src: 'docs', title: 'Why an environment',
        say: 'An environment is the answer to "which versions of which libraries does this job run with". Press Next for five points.',
        items: [
          ['Libraries change', 'pandas 3 stores strings and copies data differently from pandas 2. A job that worked last year can give another result, or fail, after an upgrade that nobody asked for.', 'Versions are part of the program.'],
          ['Your laptop is not the server', 'The server has another Python, other libraries and no one to fix an import by hand. If the job only works with what happens to be installed on your laptop, it does not work.', 'Rebuild, never copy.'],
          ['A virtual environment is a folder', 'It holds its own copy of the Python launcher and its own site-packages. Install into it and nothing else on the machine changes. Delete it and nothing else breaks.', 'One environment for each project.'],
          ['Two files describe it', '`pyproject.toml` lists what you ask for, in ranges. A lock file lists the exact versions and file hashes that were chosen. Both go into git. The `.venv` folder does not.', 'Commit the recipe, not the cake.'],
          ['One rule', 'Any machine that has the two files can rebuild the same environment with one command. If it cannot, fix that before you write more code.', 'Repeatable beats convenient.']
        ],
        cols: 1
      }),

      B.flow({
        id: 'm2-flow', t: 1, src: 'docs', title: 'Project files, then a run you can repeat', g: 'env', legend: true,
        steps: [
          { say: 'This is the path from a wish to a run. Two files in git, one folder per machine. Press Next to follow it.', cap: 'Files in git, an environment on each machine.' },
          { say: 'Step 1. You write the project file, `pyproject.toml`. It says what you want in ranges, such as `pandas>=3,<4`. It does not say which exact version you get.', on: ['a1'], focus: ['pp', 'lk'], cap: 'You ask for ranges.' },
          { say: 'Step 2. `uv lock` asks the package index, PyPI, which versions fit all the ranges together. It writes the exact versions, and a hash of every file, to `uv.lock`.', on: ['a2'], focus: ['pi', 'lk'], cap: 'The resolver picks exact versions.' },
          { say: 'Step 3. `uv sync` installs exactly the versions in the lock file into `.venv`. It does not look at the ranges again.', on: ['a3'], focus: ['lk', 'vn'], cap: 'Install what was chosen.' },
          { say: 'Step 4. `uv run` starts your job with the interpreter and the libraries of that `.venv`.', on: ['a4'], focus: ['vn', 'rn'], cap: 'Run inside the environment.' },
          { say: 'A laptop, a CI runner and a server all run the same `uv sync`. They get the same `.venv`, so a result on one machine means something on the others.', on: ['a5', 'a6', 'a7'], focus: ['m1', 'm2', 'm3', 'vn'], cap: 'The same environment everywhere.' }
        ]
      }),

      B.term({
        id: 'm2-venv', t: 1, src: 'rec', title: 'A virtual environment, made by Python itself',
        say: 'This is a real run. Python builds an environment with its own standard library module `venv`. Then the new environment is asked for pandas, and pip-style tools install it.',
        lines: function () { return G.plain(VENV); },
        after: 'Four facts from this run. A new environment is a folder with `bin`, `include`, `lib` and a small config file `pyvenv.cfg`. It does not see the libraries of the Python it was made from (`include-system-site-packages = false`). `import pandas` failed inside it with `ModuleNotFoundError`, because nothing was installed. After the install, the same import gave pandas ' + NEWV + '.',
        afterKind: 'tip',
        doneSay: 'A venv starts empty on purpose. It contains what you install into it, and nothing more.'
      }),

      B.quiz({
        id: 'm2-q1', t: 1, src: 'rec',
        q: 'In the recording, `import pandas` failed inside the new `.venv` although pandas is installed elsewhere on the machine. Why?',
        opts: [
          { t: 'The new environment has its own empty site-packages and does not see other installs', fb: '' },
          { t: 'pandas does not support Python ' + PYV, fb: 'The install into the same environment worked a few lines later, so the version is fine.' },
          { t: 'Python needs to be restarted after creating an environment', fb: 'Each command in the recording starts a fresh interpreter, and there is nothing to restart.' },
          { t: 'The import must be written as `from pandas import *`', fb: 'The form of the import does not matter. The package is simply not there.' }
        ],
        ok: 0, why: 'A virtual environment is isolated by design: `include-system-site-packages = false` is in its `pyvenv.cfg`. That is what lets two projects use two versions of the same library on one machine.'
      }),

      B.cmp({
        id: 'm2-tools', t: 1, src: 'docs', title: 'The tools: pip, venv, uv, pip-tools, Poetry and conda',
        say: 'Several tools make environments and install packages. Press Next to read what each is for. The recordings in this course use `venv` and `uv`.',
        cols: ['Tool', 'What it does', 'Watch for'],
        hl: 1,
        rows: [
          ['pip and venv', 'Standard tools. `venv` makes the environment, `pip install` adds packages.', 'No lock file of its own. `pip freeze` lists versions but does not record why or which hashes.'],
          ['uv', 'One tool for Python versions, environments, installs, projects and a lock file. Written in Rust, from Astral.', 'Newer than pip. Teams that run old tooling in CI need to adopt it on purpose.'],
          ['pip-tools', '`pip-compile` turns a short list of requirements into a fully pinned `requirements.txt`, with hashes if you ask.', 'Two files to keep in step, and no Python version management.'],
          ['Poetry', 'Projects, dependency groups, a lock file and publishing, in one command line tool.', 'Its own resolver and file format. Moving to or from it is a migration.'],
          ['conda', 'Installs Python and non-Python binaries (compilers, CUDA, system libraries) from its own channels.', 'A second package world next to PyPI. Mixing `conda` and `pip` in one environment needs care.']
        ],
        steps: [
          { upto: 2, say: 'The standard tools, and uv, which wraps and speeds up the same ideas.' },
          { upto: 5, say: 'Pip-tools, Poetry and conda each solve one piece well. Pick one per project and write it down.' }
        ],
        pick: 'For a new data project in pure Python, use **uv**: `pyproject.toml` plus `uv.lock`. Use **conda** when the job needs binaries that are not on PyPI. Whatever you pick, commit the lock file.'
      }),

      B.code({
        id: 'm2-pyproject', t: 1, src: 'rec', title: 'The project file', file: 'pyproject.toml', lang: 'text', code: PYPROJ,
        steps: [
          { say: 'This is the `pyproject.toml` that `uv init --package` made and `uv add` edited, in the recording that follows. It is the single file that describes the project.', lines: null },
          { say: 'Name, version and the Python versions it supports. `requires-python = ">=3.14"` means an installer must refuse any older interpreter.', lines: G.span(PYPROJ, /^\[project\]/, /^requires-python/) },
          { say: 'The dependencies are ranges, not exact versions: pandas 3 up to, but not including, 4, and requests 2.34.2 or newer. `uv add` wrote them for you.', lines: G.span(PYPROJ, /^dependencies = \[/, /^\]$/) },
          { say: 'A script entry point. After an install, the command `brewline-etl` runs the function `main` of the package `brewline_etl`. That is how a job becomes a command.', lines: G.span(PYPROJ, /^\[project\.scripts\]/, /^brewline-etl/) },
          { say: 'The build backend says how to turn the folder into an installable package. You rarely touch this.', lines: G.span(PYPROJ, /^\[build-system\]/, /^build-backend/) },
          { say: 'A dependency group for development. `uv add --dev pytest` put pytest here, so production installs can leave it out with `--no-dev`.', lines: G.span(PYPROJ, /^\[dependency-groups\]/, /^\]$/) }
        ],
        note: 'The file format is TOML. The same `[project]` table is read by pip, uv, Poetry (2.x) and most other tools, because it is a Python standard.'
      }),

      B.term({
        id: 'm2-uv', t: 1, src: 'rec', title: 'A project, step by step with uv',
        say: 'A real session: create a project, add two libraries, look at the tree, run something, and add pytest for development. Read what uv prints at each step.',
        lines: function () { return G.plain(UVS); },
        after: 'Three things to notice. `uv add` resolved **10 packages**, created `.venv` and installed them in one command. `uv tree --depth 1` shows what you asked for, `pandas` and `requests`, and `uv run` ran Python inside that environment without you activating anything. The timings are real and small because uv caches downloads.',
        afterKind: 'tip',
        doneSay: 'The commands are short because uv edits the project file for you. Read the file afterwards to see what it did.'
      }),

      B.code({
        id: 'm2-lock', t: 1, src: 'rec', title: 'What is inside uv.lock', file: 'uv.lock', lang: 'text', code: LOCKX,
        steps: [
          { say: 'This is the start of `uv.lock` and the entry for `requests`, cut down from the file that uv wrote. You never edit it. You commit it.', lines: null },
          { say: 'The header says which Python versions the lock covers. A lock is made for a range of Python versions, so one file works on a laptop, a server and in CI.', lines: G.span(LOCKX, /^requires-python/, /^requires-python/) },
          { say: 'Your own project is a package in the lock, with the ranges it asked for.', lines: G.span(LOCKX, /name = "brewline-etl"/, /^dependencies = \[/) },
          { say: 'For each library the lock stores the exact version and where it came from. `requests` 2.34.2 from the PyPI index.', lines: G.span(LOCKX, /name = "requests"/, /source = /) },
          { say: 'It stores the libraries that `requests` needs, so those are pinned too.', lines: [RQ + 3, RQ + 8] },
          { say: 'And it stores a **hash** of each file. An installer that downloads a file with a different hash must stop. That protects you from a changed file and from a build that is not the one you tested.', lines: G.span(LOCKX, /^sdist = /, /^sdist = /) }
        ],
        note: 'The lock was written by uv ' + G.meta('uv') + '. Another tool would write a different file, so do not mix tools in one project.'
      }),

      B.widget({ id: 'm2-lab-spec', kind: 'spec', t: 1, src: 'rec', title: 'Lab: which versions does this specifier allow?' }),

      B.quiz({
        id: 'm2-q2', t: 1, src: 'rec',
        q: 'A pyproject says `pandas~=3.0.2`. Which of the sampled releases (' + SPEC.versions.join(', ') + ') does it allow?',
        opts: [
          { t: 'Only ' + S_TILDE[0], fb: '' },
          { t: S_GE3.join(', '), fb: 'That is what `>=3` allows. The `~=` operator also sets an upper limit.' },
          { t: 'Every 3.0.x and 3.1.x release', fb: 'Compatible release with three parts stays inside 3.0.x, so the 3.1 releases are out.' },
          { t: 'Exactly 3.0.2, because there is no 3.0.2 in the list nothing matches', fb: '`~=3.0.2` means 3.0.2 or newer within 3.0.x. It is not an exact match.' }
        ],
        ok: 0, why: '`~=3.0.2` is the same as `>=3.0.2, ==3.0.*`. Of the sampled releases only 3.0.6 fits. With two parts, `~=3.0`, the limit moves up to 3.x and four releases fit.'
      }),

      B.quiz({
        id: 'm2-q3', t: 1, src: 'rec',
        q: 'Your pyproject says `pandas>=3` with no upper limit. Next year pandas 4.0 is released. What can happen at the next fresh resolve?',
        opts: [
          { t: 'The resolver may pick pandas 4.0, which can change behavior without any change in your code', fb: '' },
          { t: 'Nothing, because `>=3` means "version 3 only"', fb: 'It means 3 or newer, with no ceiling. Compare it with `==3.*` or `>=3,<4`.' },
          { t: 'The install fails, because 4.0 is newer than the file', fb: 'An installer is allowed to choose any release that matches. Nothing stops it.' },
          { t: 'The lock file is ignored from then on', fb: 'The lock file still holds the old version until you run `uv lock --upgrade`. The risk is at the next re-resolve.' }
        ],
        ok: 0, why: 'A range with no upper bound accepts a new major release. In the recording `>=3` allowed four sampled releases and would allow any later one. For libraries that make breaking changes in major versions, write `>=3,<4` and upgrade on purpose.'
      }),

      B.bug({
        id: 'm2-bug', t: 1, src: 'docs', q: 'This Dockerfile builds the image of the nightly job. The job passed all its tests, and after the next build it fails. Click the line that lets the library versions change between builds.',
        file: 'Dockerfile', lang: 'docker', code: DOCKER, bad: [4],
        hint: 'Which line decides the versions, and does it look at a lock file?',
        why: '`pip install pandas requests` takes whatever is newest on the day of the build. Two builds a month apart can contain different versions, and the tests ran on neither. Install from the lock file instead, so the image holds the versions that CI tested.',
        fix: DOCKER_FIX,
        cheer: 'The image should be built from the lock file, not from the index of the day.'
      }),

      B.term({
        id: 'm2-two', t: 1, src: 'rec', title: 'The same file on two library versions',
        say: 'Here is `pandas_versions.py`, a short file that probes four behaviors. It was run in two environments: Python ' + OLDPY + ' with pandas ' + OLDV + ', and Python ' + NEWPY + ' with pandas ' + NEWV + '. Read both outputs.',
        lines: function () { return G.plain(OLD, { cmd: 'old-env/bin/python pandas_versions.py' }).concat(G.plain(NEW, { cmd: 'new-env/bin/python pandas_versions.py' })); },
        after: 'The file did not change. Four lines of output did. The next screen lists them, and says what each one can break.',
        afterKind: 'warn',
        doneSay: 'Nothing was wrong with either version. The mistake would be not knowing which one a job ran on.'
      }),

      B.cmp({
        id: 'm2-diff', t: 1, src: 'rec', title: 'Four behaviors that changed, and what they can break',
        say: 'Each row is a line of the recording. Press Next to read what it can break in a pipeline.',
        cols: ['The probe', 'pandas ' + OLDV, 'pandas ' + NEWV, 'What it can break'],
        hl: 3,
        rows: [
          ['dtype of a column of strings', 'object', 'str', 'A schema check or a type map that expects `object` fails, and missing strings are now NaN-aware in a new way.'],
          ['change a column object, then read the frame', 'parent changed: [99, 2, 3]', 'parent unchanged: [1, 2, 3]', 'Code that relied on a view writing through to the frame silently stops working.'],
          ['dtype of parsed timestamps', 'datetime64[ns]', 'datetime64[us]', 'Parquet files and database columns get another time unit, and exact comparisons with an `ns` value differ.'],
          ['chained assignment, `df[mask]["a"] = 0`', 'SettingWithCopyWarning', 'ChainedAssignmentError', 'Both leave the frame unchanged. Pandas 3 says so loudly. Use `df.loc[mask, "a"] = 0`.']
        ],
        steps: [
          { upto: 2, say: 'Strings and views: the type changed, and the sharing changed. Both are about what a column is.' },
          { upto: 4, say: 'Timestamps and chained assignment: one is a silent unit change, one used to be a warning and is now an error type.' }
        ],
        pick: 'Pin the **major version** in `pyproject.toml`, keep a **lock file**, and read the release notes before you move to the next major. Mission 9 returns to pandas 3.'
      }),

      B.quiz({
        id: 'm2-q4', t: 1, src: 'rec',
        q: 'A job does `col = df["a"]`, then `col.iloc[0] = 99`, and relies on `df` showing 99. On pandas ' + OLDV + ' it worked. What does the recording say about pandas ' + NEWV + '?',
        opts: [
          { t: 'The frame still holds [1, 2, 3]: the change stays in the new object', fb: '' },
          { t: 'The frame holds [99, 2, 3], as before', fb: 'That is the pandas ' + OLDV + ' line of the recording.' },
          { t: 'It raises a KeyError', fb: 'The recording printed a list and no error.' },
          { t: 'It changes only when the column has strings', fb: 'The column in the recording held integers.' }
        ],
        ok: 0, why: 'Pandas 3 always copies on write, so `col` is a separate object once you change it. Change the frame itself with `df.loc[0, "a"] = 99`.'
      }),

      B.order({
        id: 'm2-order', t: 1, src: 'docs', q: 'Put the steps in order to set up the job on a new machine from the repository.',
        items: ['Install uv (or have Python and uv on the machine)', 'Clone the repository, which holds pyproject.toml and uv.lock', 'Run `uv sync --locked` to build .venv from the lock file', 'Run `uv run pytest` to check the environment', 'Run `uv run brewline-etl` to start the job'],
        why: 'The recipe comes from git, the environment comes from the lock file, and the tests prove the environment works before the job runs.',
        cheer: 'Say it as: clone, sync locked, test, run.'
      }),

      B.quiz({
        id: 'm2-q5', t: 1, src: 'docs',
        q: 'Which of these go into git for a uv project?',
        opts: [
          { t: '`pyproject.toml` and `uv.lock`, and `.python-version` if you pin the interpreter', fb: '' },
          { t: 'The `.venv` folder, so that others do not need to install anything', fb: 'The folder contains paths and compiled files that belong to one machine. Rebuild it from the lock file.' },
          { t: 'Only `pyproject.toml`, because the lock file is generated', fb: 'It is generated, and it is also the record of what was tested. Commit it.' },
          { t: '`pip freeze` output saved as notes.txt', fb: 'A freeze records versions but not hashes, groups or Python ranges. Use the lock file.' }
        ],
        ok: 0, why: 'The two files and the interpreter pin are the recipe. `.venv` is the result of following the recipe, and it is added to `.gitignore`.'
      }),

      B.term({
        id: 'm2-lockcheck', t: 2, src: 'rec', title: 'A pyproject that moved on without its lock file',
        say: 'Someone added `tenacity` to `pyproject.toml` by hand and did not update the lock. Watch what the strict commands do, and the fix.',
        lines: function () { return G.plain(LOCKC); },
        after: 'Both strict commands stop with "the lockfile needs to be updated". `uv lock` fixes it and prints what it added (tenacity). Run `uv lock --check` in CI. A pull request that changes `pyproject.toml` without a new `uv.lock` then fails before it reaches a server.',
        afterKind: 'tip',
        doneSay: 'The lock file is only useful if it is always in step with the project file. A one-line check in CI keeps it so.'
      }),

      B.cmp({
        id: 'm2-sync', t: 2, src: 'docs', title: 'uv sync, --locked and --frozen',
        say: 'Three ways to install from a lock file. The recording showed one of them. Press Next to read all three.',
        cols: ['Command', 'What it does', 'Use it when'],
        hl: 1,
        rows: [
          ['`uv sync`', 'Updates the lock file if it is out of date, then installs.', 'On your laptop while you are changing dependencies.'],
          ['`uv sync --locked`', 'Stops with an error if the lock file does not match `pyproject.toml`. Otherwise installs from it. (Recorded above.)', 'In CI and in a Docker build, so that nobody ships an unlocked change.'],
          ['`uv sync --frozen`', 'Installs from the lock file without checking that it matches `pyproject.toml`.', 'Rarely. Only if you know the lock file is right and want to skip the check.']
        ],
        steps: [
          { upto: 1, say: 'Plain `uv sync` is friendly. It repairs the lock file for you.' },
          { upto: 3, say: '`--locked` is the strict one for CI and images. `--frozen` skips the check and is for special cases.' }
        ],
        pick: 'Use `uv sync --locked` in CI and in images. Use plain `uv sync` only while you are working on the dependencies yourself.'
      }),

      B.decide({
        id: 'm2-decide', t: 2, src: 'docs', title: 'Decision: pin exactly, use ranges, or take the newest?',
        scenario: 'Brewline has two Python projects. `brewline-etl` is an application: it runs on servers and nothing imports it. `brewline-core` is a library of helpers that three other teams import. You must choose how each one declares its dependencies.',
        opts: [
          { t: 'Pin exact versions in pyproject.toml of both projects', d: '`pandas==3.1.1` and so on, everywhere.', lose: 'The library then forces its exact pins on every team that imports it, and they cannot upgrade anything without a conflict.' },
          { t: 'Application: ranges plus a lock file. Library: wide ranges, tested at the lowest and newest versions', d: 'The application gets repeatable installs from `uv.lock`. The library stays compatible with its users\' environments.', lose: '' },
          { t: 'No limits anywhere: always take the newest release', d: 'The simplest files, no upgrade work.', lose: 'An unrelated release can change behavior on a Friday night, as in the pandas 2 to 3 recording.' },
          { t: 'Copy the libraries into the repository (vendoring)', d: 'Nothing is downloaded at install time.', lose: 'You now own security fixes and updates for every copied library, and the repository grows.' }
        ],
        pick: 1,
        why: 'An application owns its environment, so it should freeze it in a lock file and upgrade on purpose. A library is a guest in other people\'s environments, so it should declare the widest range that it has tested, and leave the exact choice to the application.',
        when: 'Vendoring can be right for one small file that must not change and has no maintainers. Exact pins in pyproject are right for a short-lived experiment that nobody else imports.'
      }),

      B.cmp({
        id: 'm2-layout', t: 2, src: 'docs', title: 'Where the code lives: src layout or flat layout',
        say: 'A project can keep its package next to the project file, or under `src/`. Press Next to compare. `uv init --package` in the recording made the `src` layout.',
        cols: ['Layout', 'Looks like', 'Effect'],
        hl: 2,
        rows: [
          ['Flat', '`brewline_etl/` next to `pyproject.toml`', 'Tests and scripts run from the project folder can import the package straight from the folder, even if it was never installed. A broken install can go unnoticed.'],
          ['src layout', '`src/brewline_etl/`', 'The package can only be imported after it is installed in the environment. Tests run against what would be installed, so packaging mistakes show up early.']
        ],
        steps: [
          { upto: 1, say: 'Flat: simplest to start, easy to get wrong.' },
          { upto: 2, say: 'Src layout: one extra folder, and tests that exercise the installed package.' }
        ],
        pick: 'Use the **src layout** for anything that will be installed or tested in CI. Both are valid, and the Python Packaging User Guide describes the trade-off.'
      }),

      B.incident({
        id: 'm2-inc', t: 2, src: 'rec', title: 'Incident: Friday deploy, same code, failing schema check', time: '18:20',
        alert: 'The nightly job passed all tests on Thursday. After a Friday deploy it fails its first check: the schema contract says `status` must have dtype `object` and `ordered_at` must be `datetime64[ns]`. Nobody changed the job code.',
        clues: ['The deploy rebuilt the image from a Dockerfile that runs `pip install pandas requests`.', 'The old image held pandas ' + OLDV + '. The new image holds pandas ' + NEWV + '.', 'The check compares dtype names as strings.'],
        opts: [
          { t: 'Compare the versions in the old and the new image, then pin and rebuild from the lock file', fb: '' },
          { t: 'Edit the contract so that it accepts any dtype', fb: 'It silences the alarm and hides the next real change. Find out what changed first.' },
          { t: 'Roll back the job code', fb: 'The job code did not change, so a rollback of the code changes nothing.' },
          { t: 'Re-run the job until it passes', fb: 'The result is deterministic for a given environment. It will fail the same way.' }
        ],
        best: 0, why: 'Same code and a different result means the environment changed. In the recording, string columns went from `object` to `str` and timestamps from `ns` to `us` between the two versions.',
        checks: [
          ['List the libraries and versions in both images', '`pip freeze` in each image, or the lock file diff. A different pandas version explains most of it.'],
          ['Run the probe file in both environments', 'A short file like pandas_versions.py shows which behaviors differ. The recording changed four.'],
          ['Decide whether the new behavior is acceptable', 'For strings and units, update the contract on purpose and tell the consumers. For views, fix the code.'],
          ['Pin and rebuild from the lock file', 'Install with `uv sync --locked` so the image holds exactly what CI tested.'],
          ['Upgrade as a project, not as an accident', 'Move to the new major version in a branch with the tests and the contract updated together.']
        ],
        tell: 'The Friday deploy failed the schema check although the code was unchanged. I compared the two images and found pandas ' + OLDV + ' against ' + NEWV + ' because the image installed the newest pandas on every build. The new version stores strings as `str` and timestamps in microseconds. I pinned the major version and rebuilt from the lock file the same evening, and the next week I upgraded in a branch and updated the contract with the tests.',
        prevent: ['Install from the lock file with `uv sync --locked` in CI and in the image.', 'Pin the major version of every library that changes types.', 'Run `uv lock --check` in CI.', 'Upgrade major versions in their own pull request with the contract and the tests.']
      }),

      B.cmp({
        id: 'm2-py', t: 3, src: 'docs', title: 'Which Python version, and the free-threaded build',
        say: 'Python ships a new version every year, and each one is supported for about five years. Press Next to read how to choose, and what the free-threaded build is.',
        cols: ['Question', 'Answer', 'What to do'],
        hl: 2,
        rows: [
          ['How long is a version supported?', 'About two years of bug fix releases, then security fixes, for five years in total (PEP 602).', 'Run a version that still gets security fixes, and plan the next upgrade a year ahead.'],
          ['Which version for a new project?', 'The newest stable release that your key libraries have wheels for. This course used ' + PYV + '.', 'Set `requires-python` and pin the interpreter with `.python-version`.'],
          ['What is the free-threaded build?', 'A build of CPython without the global interpreter lock (GIL), installed as `python3.14t`. Threads can run Python code in parallel. Mission 10 records an experiment with it.', 'Treat it as optional. Many libraries ship separate wheels for it, so check before you use it.']
        ],
        steps: [
          { upto: 1, say: 'Support windows are the reason you cannot stay on one version forever.' },
          { upto: 2, say: 'New projects can take the newest stable version, as long as the libraries follow.' },
          { upto: 3, say: 'The free-threaded build exists, and it is a choice, not a default. Mission 10 measures what it does.' }
        ],
        pick: 'Pick the **newest stable Python that all your libraries support**, write it into `requires-python`, and put it in CI so that a new release is tested the week it arrives.'
      }),

      B.qa({
        id: 'qa-venv', t: 1, tag: 'Environments', secs: 60,
        q: 'What is a virtual environment, and why do you use one?',
        pts: ['A folder with its own interpreter link and site-packages', 'Isolates the libraries of one project from the others', 'Created and deleted without touching the system Python', 'Rebuilt from files, never copied'],
        short: 'A virtual environment is a folder with its own site-packages and a link to a Python interpreter. Libraries I install into it are visible only to that project. I use one for every project, because two projects often need different versions of the same library, and because the system Python belongs to the operating system. I never copy the folder to another machine. I rebuild it from the project file and the lock file with one command. In a recording, a new environment could not import pandas until I installed it, which shows the isolation.',
        fu: [['Where does the code of the standard library come from?', 'From the base interpreter that the environment points to. The environment adds its own site-packages on top.'], ['What does activating an environment do?', 'It puts the environment\'s `bin` first on your PATH so that `python` and `pip` mean the environment\'s. Tools like `uv run` do it for you.']],
        trap: 'Installing project libraries into the system Python, or with `sudo pip`. A later OS update can break both.',
        real: 'Name the tool you use and the command that rebuilds an environment from scratch.'
      }),

      B.qa({
        id: 'qa-lock', t: 1, tag: 'Environments', secs: 60,
        q: 'What is a lock file, and how is it different from requirements in pyproject.toml?',
        pts: ['pyproject.toml holds ranges, the lock holds exact versions', 'The lock also holds hashes and the transitive dependencies', 'Installing from the lock gives the same environment on every machine', 'Both are committed, and CI checks they match'],
        short: 'The project file says what I want in ranges, for example pandas 3 but not 4. A lock file says what was actually chosen: the exact version of every library, including the libraries that my libraries need, and a hash of each file. Installing from the lock file gives the same environment on a laptop, in CI and on a server, and a changed file fails the hash check. I commit both files. CI runs `uv lock --check` so that the lock never falls behind the project file, and installs with `uv sync --locked`.',
        fu: [['How do you upgrade a library?', 'I run the lock command with an upgrade for that package, read the diff of the lock file, run the tests, and commit both files together.'], ['Is requirements.txt a lock file?', 'Only if it is fully pinned, with hashes, and generated by a tool such as pip-compile. A hand-written list of names is not.']],
        trap: 'Adding the lock file to `.gitignore` because it is generated. It is the record of what was tested.',
        real: 'Say how your team upgrades libraries and who reviews the lock file change.'
      }),

      B.qa({
        id: 'qa-uv', t: 2, tag: 'Tools', secs: 60,
        q: 'Why would you choose uv over plain pip and venv, or over Poetry?',
        pts: ['One tool for Python versions, environments, installs and the lock file', 'A cross-platform lock file with hashes', 'Fast installs from a cache', 'Cost: another tool to adopt, and a file format that is its own'],
        short: 'uv does the jobs that I used to spread over pyenv, venv, pip and pip-tools: it installs Python versions, creates environments, installs packages, and writes a lock file with hashes that works across platforms. In the recording it resolved ten packages and installed them in milliseconds once the downloads were cached. Compared with plain pip it adds a real lock file. Compared with Poetry it is faster and also manages Python versions. The cost is adopting a newer tool, so I check what the team already uses, and I keep one tool per project.',
        fu: [['What if the team uses conda?', 'For packages that need compiled non-Python binaries, conda is a fair choice. I keep one tool per environment and do not mix conda and pip casually.'], ['Can CI use uv?', 'Yes. Install uv, then run `uv sync --locked` and `uv run pytest`.']],
        trap: 'Naming speed as the only reason. The lock file and the single workflow matter more for correctness.',
        real: 'If your team uses another tool, say how it handles Python versions and lock files.'
      }),

      B.qa({
        id: 'qa-repro', t: 2, tag: 'Reliability', secs: 60,
        q: 'How do you make a Python job reproducible in production?',
        pts: ['Pinned interpreter and a lock file', 'The image or environment is built from the lock file in CI', 'Config and secrets come from the environment, not the code', 'A test or a probe runs in the same environment before the deploy'],
        short: 'I pin the interpreter with `requires-python` and `.python-version`, and lock every library with hashes. CI builds the image with `uv sync --locked`, so production gets exactly the versions that the tests ran on. Settings and secrets come from the environment and not from the code, so the same image runs in every stage. Before a deploy, the tests and a small probe run in that same image. When a failure happens I can say which versions ran, because the image is tagged with the commit and the lock file is in git.',
        fu: [['How do you handle security updates?', 'A scheduled job proposes lock file updates in a pull request, the tests run, and a person merges.'], ['What if two jobs need different pandas versions?', 'Separate projects and environments. One environment per job is cheap.']],
        trap: 'Pinning in the Dockerfile with `pip install pandas==3.1.1` and skipping the lock file. Direct pins do not cover the libraries that pandas needs.',
        real: 'Describe how your last deploy guaranteed the same versions as the tests.'
      }),

      B.qa({
        id: 'qa-upgrade', t: 3, tag: 'Operations', secs: 60,
        q: 'You must move a large set of jobs from pandas 2 to pandas 3. How do you do it safely?',
        pts: ['Read the release notes for removed and changed behavior', 'Run the tests on both versions to find differences', 'Compare outputs on real samples, including dtypes and units', 'Move jobs one at a time, with the contract updated'],
        short: 'I start with the release notes for the changes that affect my code: the string type, copy on write, the time unit of timestamps, and removed deprecations. I run the test suite on both versions to find the failures, and I fix chained assignment and view assumptions with `.loc`. Then I run each job on a real sample in both environments and compare the outputs, including dtypes and the time unit in the written files. I move the jobs one by one, each with its contract and tests updated together, and I keep the old environment around until the last job has moved.',
        fu: [['What do you do about warnings on pandas 2?', 'I turn on the warnings for the behavior that changes, run the tests, and fix what they report before the upgrade.'], ['How do you handle the downstream tables?', 'I check whether the column types or time units in the files change, and I coordinate with the owners of the consumers before I deploy.']],
        trap: 'Upgrading everything at once because the unit tests pass. Unit tests rarely look at dtypes and time units.',
        real: 'If you have done a major upgrade, say what broke that the tests did not catch.'
      }),

      B.recap({
        id: 'm2-recap', n: 2, badge: 'Env Keeper', color: '#BFDBFE',
        pts: [
          'A **virtual environment** is an isolated folder of libraries. A new one starts empty, as `import pandas` failing in the recording showed.',
          '`pyproject.toml` holds **ranges**, `uv.lock` holds **exact versions and hashes**. Commit both, ignore `.venv`, and rebuild with `uv sync --locked`.',
          'The same file gave **four different results** on pandas ' + OLDV + ' and ' + NEWV + '. Pin the major version and upgrade on purpose.',
          '`~=3.0.2` means `>=3.0.2, ==3.0.*`. A range with no upper bound accepts the next major release.',
          'CI runs `uv lock --check` and `uv sync --locked`, so the lock file is always in step.'
        ],
        lines: [
          'I rebuild environments from a lock file. I never copy them.',
          'I pin the major version of libraries that change types, and I upgrade in their own pull request.',
          'I can tell you which versions a job ran on, because the lock file is in git.'
        ]
      })
    ]
  });
})();
