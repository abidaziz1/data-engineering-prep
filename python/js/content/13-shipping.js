/* Mission 13: shipping. Real runs of a Typer command line, layered configuration, uv build, and the checks that CI runs (run here by hand). */
(function () {
  var B = LAB.b, G = LAB.get;
  var LOF = G.file('m13/load_orders.py'), CPF = G.file('m13/config_precedence.py'), PYP = G.file('m13/pyproject.toml'), TCF = G.file('m13/test_cli.py'), CIF = G.file('m13/ci.yml');
  var CLT = G.text('m13/cli'), CPT = G.text('m13/config_precedence.py'), CKT = G.text('m13/checks'), BDT = G.text('m13/build');
  var CF = G.counts('m13.config');

  function blk(file, name) { var a = G.at(file, new RegExp('^def ' + name + '\\(')), l = file.split('\n'), b = a; while (b < l.length && l[b] !== '') b++; return [a, b]; }
  function fn(file, name) { var r = blk(file, name); return G.lines(file, r[0], r[1]); }
  function last(file) { return file.replace(/\n+$/, '').split('\n').length; }
  function count(text, re) { return (text.match(re) || []).length; }

  G.expect(/--dry-run +--no-dry-run/.test(CLT) && /<int range> \[x>=1\]/.test(CLT) && /dry run: would load 3 rows from orders\.csv for 2026-03-14, in batches of 1000\nexit code: 0/.test(CLT) && /loaded 3 rows from orders\.csv for 2026-03-14, in batches of 1000\nexit code: 0/.test(CLT) && /Invalid value for '--day'[^\n]*\n[^\n]*\nexit code: 2/.test(CLT) && /Invalid value for 'source': file 'missing\.csv' does not exist\.[^\n]*\n[^\n]*\nexit code: 2/.test(CLT) && /the file has no rows\nexit code: 1/.test(CLT), 'the command line exits 0 for a dry run and a load, 2 for a bad date and a missing file, and 1 for an empty file');
  G.expect(/batch_size 1000 +from the default/.test(CPT) && /batch_size 500 +from the config file/.test(CPT) && /batch_size 200 +from the environment/.test(CPT) && /batch_size 50 +from the command line/.test(CPT) && /dry_run +True +from the command line/.test(CPT) && /KeyError: "unknown setting 'batchsize' in the command line"/.test(CPT) && /18 characters, never printed/.test(CPT) && /without it: BREWLINE_API_TOKEN is not set\./.test(CPT) && !/s3cr3t/.test(CPT), 'each layer overrides the last, a misspelled setting raises, and the token is never printed');
  G.expect(/All checks passed!/.test(CKT) && /Success: no issues found in 2 source files/.test(CKT) && /3 passed in [\d.]+s/.test(CKT), 'ruff, mypy and pytest pass on the small package');
  G.expect(/Successfully built dist\/brewline_loader-0\.1\.0-py3-none-any\.whl/.test(BDT) && /entry_points\.txt/.test(BDT) && /brewline_loader\/cli\.py/.test(BDT) && /Usage: brewline-load \[OPTIONS\] \{source\}/.test(BDT), 'uv built a wheel that contains the code and the entry point, and the installed command runs');
  G.expect(CF.cells['1|1|1'].batch_size.value === '50' && CF.cells['1|1|1'].batch_size.source === 'command line' && CF.cells['1|1|0'].batch_size.value === '200' && CF.cells['0|0|0'].api_url.source === 'default' && CF.cells['1|0|0'].api_url.source === 'config file', 'the lab cases follow the precedence');
  var LABEL = { '1|1|1': 'all three layers', '1|1|0': 'file and environment' };

  var BUG_SECRET = ['API_URL = "https://api.brewline.example/orders"', 'API_TOKEN = "sk_live_51Hq3xT..."  # copied from the dashboard', '', 'def fetch(session):', '    return session.get(API_URL, headers={"Authorization": f"Bearer {API_TOKEN}"})'].join('\n');
  var BUG_SECRET_FIX = ['import os', '', 'API_URL = os.environ.get("BREWLINE_API_URL", "https://api.brewline.example/orders")', '', 'def fetch(session):', '    token = os.environ["BREWLINE_API_TOKEN"]  # set by the scheduler, never in the code', '    return session.get(API_URL, headers={"Authorization": f"Bearer {token}"})'].join('\n');
  var CFROWS = CPT.split('\n').filter(function (l) { return /^ {2}(api_url|batch_size|dry_run)/.test(l); }).slice(-3).map(function (l) { var m = /^ {2}(\S+) +(\S+) +from the (.+)$/.exec(l); return [m[1], m[2] + ' (' + m[3] + ')']; });

  LAB.addChapter({
    id: 'm13', n: 13, title: 'Shipping: CLIs, config, secrets and CI', short: 'Shipping', blurb: 'Run it from the command line, from config, and from CI', minutes: 34,
    focus: ['ci', 'mon'],
    goals: [
      'Give a job a **command line** with options, help text and honest **exit codes**.',
      'Layer **settings**: defaults, a file, the environment and flags, and know which one wins.',
      'Keep **secrets** out of code and files, and out of the output.',
      'Build a **package** with `uv build` and install its command.',
      'Say what **CI** runs on every change, and run the same checks yourself.'
    ],
    say: 'Mission 13 is about the day someone other than you has to run your job. They need a command with a help page, settings that do not require editing code, a secret that is not in the repository, a package that installs, and checks that run before anything merges. Everything here ran on this machine with Typer ' + G.meta('typer') + ', uv ' + G.meta('uv') + ', pytest, ruff and mypy. The CI workflow file is the one thing that did not run here, and it says so.',
    scenes: [
      B.talk({
        id: 'm13-talk', t: 1, src: 'docs', title: 'Shipping means that anyone can run it',
        say: 'Press Next for five things that separate a script on your laptop from a job that a team owns.',
        items: [
          ['A command line', 'Options, a help page, and checks of the arguments. `--dry-run` shows what would happen and writes nothing.', 'Run it with flags.'],
          ['Exit codes', '0 means success, 1 means the job failed, 2 means the command was used wrongly. A scheduler reads nothing else.', 'Say how it ended.'],
          ['Settings in layers', 'Defaults in code, a file for the team, the environment for the server, flags for one run. The nearest layer wins.', 'No code edits to change a value.'],
          ['Secrets stay outside', 'A token comes from the environment or a secret store. It is not in the code, the file, the log or the help text.', 'Never in git.'],
          ['A package and CI', 'A wheel that installs with one command, and checks that run on every change.', 'Build it, check it, every time.']
        ],
        cols: 2
      }),

      B.code({
        id: 'm13-cli', t: 1, src: 'rec', title: 'A command line with Typer', file: 'load_orders.py', lang: 'python', code: LOF,
        steps: [
          { say: 'A command for the nightly load. Typer (' + G.meta('typer') + ') builds the options, the help page and the argument checks from the type hints. The output is real.', lines: null },
          { say: 'An app, and a function that is its command.', lines: G.span(LOF, /^app = /, /^def load\(/) },
          { say: 'The parameters are the interface. `source` is an argument that must be an existing file. `--day` has to be a date. `--batch-size` must be at least 1. `--dry-run` is a flag.', lines: G.span(LOF, /^def load\(/, /^\):/) },
          { say: 'A dry run prints the plan, and exits with 0 before anything is written.', lines: G.span(LOF, /^    if dry_run:/, /raise typer\.Exit\(0\)/) },
          { say: 'A file with no rows is a failure: the message goes to the error stream, and the exit code is 1.', lines: G.span(LOF, /^    if rows == 0:/, /raise typer\.Exit\(1\)/) },
          { say: 'This line lets `python load_orders.py` start the app. The packaged command (below) calls it without this line.', lines: G.span(LOF, /^if __name__/, /^    app\(\)/) }
        ]
      }),

      B.term({
        id: 'm13-cli-run', t: 1, src: 'rec', title: 'The help page and five runs',
        say: 'The real output. After each run, the shell prints the exit code with `echo "exit code: $?"`.',
        lines: function () { return G.plain(CLT); },
        after: 'The help page came from the type hints: the options, their types, the **range** of `--batch-size` and the defaults. A dry run and a real load **exited 0**. A date in the wrong format and a file that does not exist **exited 2**, with a clear message: Typer checked them before the function ran. And a file with no rows **exited 1**. Three different codes, three different meanings.',
        afterKind: 'tip',
        doneSay: '0 worked, 1 failed, 2 was used wrongly.'
      }),

      B.quiz({
        id: 'm13-q1', t: 1, src: 'rec',
        q: 'The command was run with `--day 14-03-2026`. What happened, according to the recording?',
        opts: [
          { t: 'It printed a usage error that names the option, and exited with 2, before the function ran', fb: '' },
          { t: 'It loaded the file with the date in the wrong format', fb: 'Typer parsed the value as a date, and refused it.' },
          { t: 'It exited with 1, like a failed load', fb: '1 was for the empty file. A wrong command line is 2.' },
          { t: 'It exited with 0 and a warning', fb: 'An invalid argument is an error.' }
        ],
        ok: 0, why: 'The type `date` and the option rules are checked first. A value that does not parse is a usage error: Typer prints the problem and exits with 2, so a scheduler can tell "someone called it wrongly" from "the job ran and failed".'
      }),

      B.cmp({
        id: 'm13-cmp', t: 1, src: 'docs', title: 'Three ways to write a command line',
        say: 'Python has a built-in module and two popular libraries. Press Next.',
        cols: ['Tool', 'How you describe the options', 'Good for'],
        hl: 0,
        rows: [
          ['`argparse` (standard library)', 'Calls such as `add_argument("--day", type=...)`.', 'No extra dependency. A small script, or a place where you cannot install anything.'],
          ['Click', 'Decorators on a function, one for each option.', 'Larger tools with groups of commands.'],
          ['Typer (built on Click)', 'The type hints of the function parameters.', 'The least code. The help page and the checks come from the signature.']
        ],
        steps: [
          { upto: 1, say: 'argparse is always there and a little verbose.' },
          { upto: 3, say: 'Click and Typer add structure and help pages. Typer reads your type hints, so the signature is the interface.' }
        ],
        pick: 'Any of them is fine. What matters is the **help page, the checks and the exit codes**.'
      }),

      B.code({
        id: 'm13-config', t: 1, src: 'rec', title: 'Settings in layers', file: 'config_precedence.py', lang: 'python', code: CPF,
        steps: [
          { say: 'Four places can set a value: defaults, a TOML file, environment variables and flags. Each value remembers where it came from. The output is real.', lines: null },
          { say: 'The defaults are in code. The name of the secret is a constant, because a secret is read from the environment only.', lines: G.span(CPF, /^DEFAULTS = /, /^SECRET = /) },
          { say: '`load_config` collects the layers, from the weakest to the strongest: the file, the environment variables that start with `BREWLINE_`, and the flags.', lines: blk(CPF, 'load_config') },
          { say: 'Each layer overrides the one before it. A key that is not a known setting raises `KeyError`, so a typo does not become a silent default.', lines: G.span(CPF, /^    for name, values in layers:/, /config\[key\] = /) },
          { say: 'The token is read from the environment, and the program exits with a clear message when it is missing.', lines: blk(CPF, 'api_token') },
          { say: 'The demo: the same file, environment and flags added one by one, and then the failure cases.', lines: [G.at(CPF, /^FILE = /), last(CPF)] }
        ]
      }),

      B.term({
        id: 'm13-config-run', t: 1, src: 'rec', title: 'Run it',
        say: 'The real output of `config_precedence.py`. Watch `batch_size`.',
        lines: function () { return G.plain(CPT, { cmd: 'python config_precedence.py' }); },
        after: '`batch_size` was **1000** from the default, **500** once the file was added, **200** when the environment variable was added, and **50** when the flag was added: each stronger layer won. The misspelled `batchsize` raised an error instead of being ignored. The token was used and its length was printed, but its value never appeared.',
        afterKind: 'tip',
        doneSay: 'The nearest layer wins. A typo is an error.'
      }),

      B.widget({ id: 'm13-lab-config', kind: 'config', t: 1, src: 'rec', title: 'Lab: which setting wins' }),

      B.quiz({
        id: 'm13-q2', t: 1, src: 'rec',
        q: 'The config file sets `batch_size = 500` and an environment variable sets 200. No flag is given. Which value does the job use, and from where?',
        opts: [
          { t: '200, from the environment', fb: '' },
          { t: '500, from the config file', fb: 'The environment is a stronger layer than the file.' },
          { t: '1000, from the default', fb: 'The default is the weakest layer.' },
          { t: 'It raises an error, because two layers set it', fb: 'Setting a value in several layers is normal. The strongest one wins.' }
        ],
        ok: 0, why: 'The order is default, file, environment, flag. The environment variable is nearer to the person who runs the job than the file in the repository, so it overrides it: 200. A flag would override both.'
      }),

      B.bug({
        id: 'm13-bug1', t: 1, src: 'docs', q: 'A new colleague finds this module in the repository and asks why it is a problem. Click the line.',
        file: 'client.py', lang: 'python', code: BUG_SECRET, bad: [2],
        hint: 'Who can read the repository, and its history?',
        why: 'A secret in code ends up in git, in every clone and every log of the file, and removing it later does not remove it from the history. Anyone with read access can use it. Read it from the environment, or from a secret store, and rotate the one that leaked.',
        fix: BUG_SECRET_FIX,
        cheer: 'Secrets come from the environment, not the repository.'
      }),

      B.code({
        id: 'm13-pkg', t: 1, src: 'rec', title: 'A package with a command', file: 'pyproject.toml', lang: 'text', code: PYP,
        steps: [
          { say: 'The same command line, in a package that can be built and installed. This is `pyproject.toml`, the one file that describes it. The next screens run the build.', lines: null },
          { say: 'The name, the version, the Python it needs and the libraries it depends on.', lines: G.span(PYP, /^\[project\]/, /^dependencies/) },
          { say: '`[project.scripts]` makes a **command**: `brewline-load` runs the function `app` in `brewline_loader.cli`.', lines: G.span(PYP, /^\[project\.scripts\]/, /^brewline-load/) },
          { say: 'The build backend, here Hatchling, turns the folder into a wheel. `uv build` reads this section.', lines: G.span(PYP, /^\[build-system\]/, /^build-backend/) },
          { say: 'Where the code lives, and where pytest finds it, so that the tests import `brewline_loader` without installing it.', lines: G.span(PYP, /^\[tool\.hatch/, /^pythonpath/) }
        ]
      }),

      B.term({
        id: 'm13-build-run', t: 1, src: 'rec', title: 'Build it, look inside it, install it',
        say: 'The real output. `uv build` makes a source archive and a wheel. The wheel is a zip file, so Python can list it. Then it is installed into a new virtual environment and the command is run.',
        lines: function () { return G.plain(BDT); },
        after: 'The wheel holds the **code** (`cli.py`), the **metadata**, and `entry_points.txt`, which creates the command. After `uv pip install`, `brewline-load --help` ran from the new environment, and the help page now says `brewline-load` instead of the file name. Anyone can install that wheel without your repository.',
        afterKind: 'tip',
        doneSay: 'One build, one file, one install.'
      }),

      B.code({
        id: 'm13-test', t: 1, src: 'rec', title: 'Test the command line', file: 'test_cli.py', lang: 'python', code: TCF,
        steps: [
          { say: 'Typer ships a `CliRunner` that calls the command in the same process and captures the exit code and the output. The tests ran in the CI checks below.', lines: null },
          { say: 'A helper writes a small file of orders in a temporary folder.', lines: blk(TCF, 'orders_file') },
          { say: 'A dry run exits with 0 and prints the plan.', lines: blk(TCF, 'test_dry_run_prints_the_plan') },
          { say: 'A bad date is a usage error: exit code 2. An empty file fails with 1.', lines: [blk(TCF, 'test_a_bad_date_is_a_usage_error')[0], last(TCF)] }
        ]
      }),

      B.flow({
        id: 'm13-flow', t: 1, src: 'docs', title: 'What CI runs on every change', g: 'ci', legend: true,
        steps: [
          { say: 'A pull request, then four checks in a row, then a package. Press Next.', cap: 'Nothing has run yet.' },
          { say: 'Step 1. Someone opens a pull request. CI starts on a clean machine, so it does not depend on anything that is only on your laptop.', on: ['k1'], focus: ['pr', 'lint'], cap: 'A clean machine.' },
          { say: 'Step 2. `ruff check` reads the code for mistakes and risky patterns.', on: ['k2'], focus: ['lint', 'types'], cap: 'Lint.' },
          { say: 'Step 3. `mypy` checks the type hints against the code.', on: ['k3'], focus: ['types', 'tests'], cap: 'Types.' },
          { say: 'Step 4. `pytest` runs the tests.', on: ['k4'], focus: ['tests', 'build'], cap: 'Tests.' },
          { say: 'Step 5. `uv build` builds the wheel. If it builds, the packaging is not broken.', on: ['k5'], focus: ['build', 'art'], cap: 'Build.' },
          { say: 'Each step is a command that you can run on your laptop. A red step stops the merge.', on: ['k1', 'k2', 'k3', 'k4', 'k5'], focus: ['pr', 'lint', 'types', 'tests', 'build', 'art'], tags: ['tg_stop', 'tg_same'], cap: 'The same commands, every change.' }
        ]
      }),

      B.code({
        id: 'm13-ci', t: 1, src: 'docs', title: 'The workflow file', file: 'ci.yml', lang: 'yaml', code: CIF,
        steps: [
          { say: 'The same steps as a GitHub Actions workflow. **This file was not run here**: it needs GitHub. Its commands were run by hand on the next screen.', lines: null },
          { say: 'It runs on every push to `main` and on every pull request.', lines: G.span(CIF, /^on:/, /^  pull_request:/) },
          { say: 'One job on a fresh Ubuntu machine. It checks out the code and installs uv.', lines: G.span(CIF, /^jobs:/, /setup-uv/) },
          { say: '`uv sync --locked` installs exactly what the lock file says and **fails** if the lock file is out of date (mission 2).', lines: G.span(CIF, /uv sync --locked/, /uv sync --locked/) },
          { say: 'Then the four checks: lint, types, tests and the build.', lines: G.span(CIF, /uv run ruff check/, /uv build/) }
        ]
      }),

      B.term({
        id: 'm13-checks-run', t: 1, src: 'rec', title: 'The same checks, run by hand',
        say: 'The commands of the workflow, run here in the package folder: ruff, mypy and pytest. The real output.',
        lines: function () { return G.plain(CKT); },
        after: 'All three passed: **ruff** found nothing, **mypy** checked 2 source files, and **pytest** ran 3 tests. In CI the same commands run on a clean machine on every change, and a failure blocks the merge. The workflow file itself was not run here.',
        afterKind: 'tip',
        doneSay: 'If it passes on your machine, CI is a repeat.'
      }),

      B.cmp({
        id: 'm13-env', t: 2, src: 'docs', title: 'Settings and secrets across environments',
        say: 'One job runs in several places. Press Next for what changes between them, and where each thing lives.',
        cols: ['Thing', 'Example', 'Where it lives'],
        hl: 0,
        rows: [
          ['Code', 'The transforms and the load', 'The repository, the same in every environment.'],
          ['Settings that differ', 'The API url, the batch size, the schema to write to', 'A config file, overridden by environment variables or flags.'],
          ['Secrets', 'An API token, a database password', 'The environment, from a secret store. Not in the repository, the config file or the log.'],
          ['The environment name', 'dev, test, prod', 'One explicit setting. A job that writes to prod must be told to, and must not default to it.']
        ],
        steps: [
          { upto: 2, say: 'Code is the same everywhere. Settings differ, so they live outside the code.' },
          { upto: 4, say: 'Secrets stay in the environment, and "which environment" is explicit.' }
        ],
        pick: 'Make the safe thing the default: **dev unless told otherwise**, and a dry run before a real run.'
      }),

      B.decide({
        id: 'm13-decide', t: 2, src: 'rec', title: 'Decision: where do the settings and the token live?',
        scenario: 'The nightly load needs an API url, a batch size and an API token. It runs on a laptop for development, in a test environment and in production. In the recording, a value was set in a config file, then overridden by an environment variable, then by a flag, and the token was read from the environment only.',
        opts: [
          { t: 'Constants in the code, edited for each environment', d: 'No config system.', lose: 'Every change is a code change and a release, and someone will forget to edit it back, and commit the token.' },
          { t: 'A config file in the repository that includes the token', d: 'One place for everything.', lose: 'The token is in git for ever, and every developer has the production one.' },
          { t: 'Defaults in code, a file for non-secret settings, environment variables and flags to override them, and the token only in the environment', d: 'The nearest layer wins, a secret never touches git, and a flag is one run.', lose: '' },
          { t: 'Ask for everything on the command line', d: 'Explicit.', lose: 'A long command that people copy, with the token in the shell history and the process list.' }
        ],
        pick: 2,
        why: 'The layered approach of the recording keeps each kind of thing where it belongs. The scheduler or the secret store provides the token as an environment variable, so it is not in the repository, the file, the flags or the output.',
        when: 'For one script that only you run, a constant and an environment variable may be enough. Add the file and the flags when a second person or a second environment arrives.'
      }),

      B.challenge({
        id: 'm13-ch1', t: 1, lang: 'python', file: 'config_precedence.py',
        q: '**Coding round: layered settings.** Write `load_config(file_text=None, env=None, args=None)`. The defaults are `{"api_url": ..., "batch_size": 1000, "dry_run": False}`. Layers from the weakest to the strongest: a TOML file (`tomllib.loads`), environment variables that start with `BREWLINE_` (strip the prefix, lower case, and never read `BREWLINE_API_TOKEN` here), and a dict of flags. Return `{setting: (value, source)}`. Convert environment strings to the type of the default. An unknown setting raises `KeyError`.',
        data: [{ name: 'the layers in the tests', cols: ['layer', 'sets'], rows: [['config file', 'api_url (staging), batch_size = 500'], ['environment', 'BREWLINE_BATCH_SIZE = "200"'], ['command line', 'batch_size = 50, dry_run = True']] }],
        starter: 'import tomllib\n\nDEFAULTS = {"api_url": "https://api.brewline.example/orders", "batch_size": 1000, "dry_run": False}\n\ndef load_config(file_text=None, env=None, args=None):\n    ...',
        hints: ['Start from `{key: (value, "default")}`. Then build a list of `(name, dict)` layers in order of strength.', 'Loop over the layers and over their items. Raise `KeyError` for a key that is not in `DEFAULTS`.', 'Convert with the type of the default: `type(DEFAULTS[key])(value)`. A `bool` default needs care: the text "false" is not False.'],
        sol: fn(CPF, 'as_type') + '\n\n' + fn(CPF, 'load_config'),
        res: { msg: 'the recorded run, with all three layers', cols: ['setting', 'value (where it came from)'], rows: CFROWS },
        expl: ['The order of the list of layers is the precedence: a later layer overwrites an earlier one, so the flags win.', 'Environment variables are always text. `int("200")` works, and for a bool the text has to be interpreted, so `as_type` handles it separately.', 'Raising on an unknown key means that a typo such as `batchsize` fails at start-up and does not silently run with the default.'],
        cx: 'O(settings).'
      }),

      B.incident({
        id: 'm13-inc', t: 2, src: 'rec', title: 'Incident: a test run wrote to production', time: '14:20',
        alert: 'A developer ran the load from their laptop to test a change, and 1,200 test rows appeared in the production orders table. The job has a config file, an environment variable and flags. Nobody remembers setting production anywhere.',
        clues: ['The default `api_url` and database in the code point to production.', 'The developer\'s shell profile exports `BREWLINE_DB_URL` for production, from a task last month.', 'The job has a `--dry-run` flag, which was not used.'],
        opts: [
          { t: 'Print the effective settings with the source of each, and make dev the default, with production only on an explicit flag', fb: '' },
          { t: 'Tell developers to be careful', fb: 'It is a trap that anyone can fall into. A default should not point at production.' },
          { t: 'Remove the environment variables from the code', fb: 'The environment layer is working as designed. The default and the missing guard are the problem.' },
          { t: 'Make the job read only the config file', fb: 'That loses the environment and the flags, and it does not make the default safe.' }
        ],
        best: 0, why: 'In the recording, every value carried its source: from the default, the file, the environment or the command line. Printing that table at the start of the job shows at once that the database came from the environment. A safe default and an explicit production switch close the trap.',
        checks: [
          ['Print the effective settings with their sources, at the start of every run', 'The database url says "from the environment", and the value is production.'],
          ['Look at the shell profile and the environment of the developer', 'An old export is still set.'],
          ['Make the default point at a development database', 'Nobody reaches production by omission.'],
          ['Require an explicit `--env prod` for production, and confirm the target in the first log line', 'A person has to ask for production.'],
          ['Clean the 1,200 rows with the idempotent delete of the day (mission 7)', 'And add a dry run to the checklist of a test run.']
        ],
        tell: 'A test run from a laptop wrote 1,200 rows to production because the default settings pointed at production and an old environment variable in the developer\'s shell also pointed there. I changed the default to development, made production an explicit flag that has to be given on purpose, and made the job print its effective settings with the source of each at the start. I removed the rows with the idempotent delete for the day.',
        prevent: ['The default environment is development, never production.', 'Production needs an explicit flag, and the first log line names the target.', 'The effective settings, with their sources, are printed at the start of every run.', 'A dry run comes first in the runbook.']
      }),

      B.qa({
        id: 'qa-cli', t: 1, tag: 'Shipping', secs: 60,
        q: 'How do you make a Python job easy for others to run?',
        pts: ['A command line with options and a help page', 'A dry run', 'Honest exit codes', 'Packaged, so it installs with one command'],
        short: 'I give it a command line, with Typer or argparse, so the options, their types and the help page are in one place and the arguments are checked before anything runs. I add a `--dry-run` that prints the plan and writes nothing. The exit code says how it ended: in a recording 0 meant success, 1 meant the job ran and failed on an empty file, and 2 meant the command was used wrongly, such as a date in the wrong format. I package it with `pyproject.toml` and `uv build`, so that it installs as a command, and the settings come from a file, the environment and flags, never from edits to the code.',
        fu: [['Why different exit codes?', 'A scheduler or a person can tell "someone called it wrongly" from "the job failed", and decide what to do.'], ['What goes in the help text?', 'What each option does, its default and its allowed range. It is the documentation that is always up to date.']],
        trap: 'A script with constants at the top that people edit and commit.',
        real: 'Describe how someone else runs your most important job.'
      }),

      B.qa({
        id: 'qa-config', t: 1, tag: 'Shipping', secs: 60,
        q: 'How do you handle configuration for different environments?',
        pts: ['Defaults in code, a file, environment variables, flags', 'The nearest layer wins', 'Print the effective settings with their source', 'A safe default environment'],
        short: 'In layers, from the weakest to the strongest: defaults in code, a config file for the team, environment variables for the machine, and flags for one run. The nearest layer to the person running the job wins. In a recording `batch_size` was 1000 from the default, 500 from the file, 200 from the environment and 50 from a flag. I make an unknown setting an error, so that a typo does not run with the default, and I print the effective settings with the source of each at the start of a run. The default environment is development, and production needs an explicit switch.',
        fu: [['Why print the sources?', 'It turns "why did it use that value?" into one line of the log.'], ['Where do secrets go?', 'Only in the environment or a secret store, never in the file.']],
        trap: 'A default that points at production.',
        real: 'Tell about a setting that surprised you in a different environment.'
      }),

      B.qa({
        id: 'qa-secrets', t: 1, tag: 'Shipping', secs: 60,
        q: 'How do you handle secrets, such as API tokens and passwords?',
        pts: ['Never in code, config files or the repository', 'Environment or a secret manager', 'Never printed or logged', 'Rotate a secret that leaked'],
        short: 'A secret never goes in the code, in a config file or in the repository, because git keeps it for ever and every clone has it. It comes from the environment, which the scheduler or a secret manager sets at run time. The job reads it with a clear error if it is missing, and never prints it: in a recording the program printed the length of the token and not its value. I keep it out of flags too, because command lines show up in the shell history and the process list. If one leaks, I rotate it at once, because deleting it from the history does not make it safe.',
        fu: [['What about a .env file for development?', 'Fine for a laptop, if it is in `.gitignore` and holds only development values.'], ['How do you check?', 'A secret scanner in CI and pre-commit that fails on anything that looks like a key.']],
        trap: '"It is a private repository, so it is fine."',
        real: 'Describe how secrets reach your jobs.'
      }),

      B.qa({
        id: 'qa-package', t: 2, tag: 'Shipping', secs: 60,
        q: 'How do you package a Python job so that it can be deployed?',
        pts: ['pyproject.toml with the name, version and dependencies', 'A build backend and uv build', 'An entry point that creates a command', 'A lock file for the exact versions'],
        short: 'I describe it in `pyproject.toml`: the name, the version, the Python it needs, the dependencies, and a `[project.scripts]` entry that creates a command. `uv build` turns it into a wheel and a source archive. In a recording the wheel held the code, the metadata and `entry_points.txt`, and after `uv pip install` the command `brewline-load` ran from a new environment. For the environment of a deployment I also commit the lock file and install with `uv sync --locked`, so that production has exactly the versions that the tests ran with. Some teams then put the wheel in a container image.',
        fu: [['What about a Docker image?', 'It is a common way to ship the environment. It was not run in this course, and the same pyproject and lock file are the input.'], ['Where does the wheel go?', 'To a package index that your team runs, or to the artifact store of the CI system.']],
        trap: 'Deploying by copying files and running pip install on the server.',
        real: 'Describe how a change gets from your laptop to production.'
      }),

      B.qa({
        id: 'qa-ci', t: 1, tag: 'Shipping', secs: 60,
        q: 'What runs in CI for a data project?',
        pts: ['Lint, types and tests on every pull request', 'A clean machine and a locked environment', 'A build of the package', 'A red step blocks the merge'],
        short: 'On every pull request, on a clean machine with the locked environment: the linter, the type checker, the tests, and a build of the package. A red step blocks the merge. Each step is a command that I can run on my laptop, and in a recording ruff, mypy and pytest passed by hand on a small package before any workflow ran them. For a data project I add tests that use small fixtures, and sometimes a smoke test of the job in dry-run mode. Deploying is a separate step, with its own approval, and it uses the artifact that CI built.',
        fu: [['What if the tests are slow?', 'Split them: fast unit tests on every push, slower integration tests on merge or nightly.'], ['Do you test against production data in CI?', 'No. Use fixtures or a development copy, and keep real data and real secrets out of CI.']],
        trap: 'A pipeline that passes on a laptop and fails in CI because it depends on something local.',
        real: 'Name what blocks a merge in your team today.'
      }),

      B.qa({
        id: 'qa-envs', t: 2, tag: 'Shipping', secs: 60,
        q: 'How do you stop a test run from touching production?',
        pts: ['The default environment is development', 'Production needs an explicit switch', 'Print the target first', 'A dry run, and separate credentials'],
        short: 'By making the safe path the default and the dangerous one deliberate. The default environment is development. Production needs an explicit flag and its own credentials, which a developer does not have on a laptop. The first line of the log names the target and the effective settings with their sources, so that a wrong target is visible at once. A `--dry-run` prints the plan and writes nothing. And the loads are idempotent (mission 7), so a mistake can be undone by replacing the day. In a recording every setting carried the name of its layer, which is how you find the surprising one.',
        fu: [['Separate accounts?', 'Yes. If a laptop has no production credentials, it cannot reach production, whatever the settings say.'], ['What about a confirmation prompt?', 'Useful for a manual run, and the scheduler needs the explicit flag instead.']],
        trap: 'Relying on people to be careful.',
        real: 'Tell about a guard that saved you.'
      }),

      B.recap({
        id: 'm13-recap', n: 13, badge: 'Release Captain', color: '#A7F3D0',
        pts: [
          'A **command line** gives options, a help page and checked arguments. Exit **0** worked, **1** failed, **2** was used wrongly.',
          'Settings come in **layers**: default 1000, file 500, environment 200, flag 50. The nearest layer wins, and an unknown setting is an **error**.',
          'A **secret** comes from the environment, never from code, a file, a flag or the output.',
          '`uv build` made a **wheel** with the code and `entry_points.txt`, and the installed command ran. `[project.scripts]` creates it.',
          '**CI** runs ruff, mypy, pytest and the build on every change. Those commands ran here by hand. The workflow file did not.'
        ],
        lines: [
          'My jobs have a command line, honest exit codes and a dry run.',
          'Settings are layered, secrets are outside, and development is the default.',
          'Every change runs lint, types, tests and a build before it merges.'
        ]
      })
    ]
  });
})();
