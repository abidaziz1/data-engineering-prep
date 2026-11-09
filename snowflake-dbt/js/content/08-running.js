/* Mission 8: running dbt on Snowflake in production. */
(function () {
  var B = LAB.b, G = LAB.get;

  var JOB = [
    '#!/usr/bin/env bash',
    'set -euo pipefail',
    '',
    'dbt deps',
    'dbt source freshness --target prod',
    'dbt build --target prod --fail-fast',
    './ci/save_prod_manifest.sh target/manifest.json'
  ].join('\n');
  var BUGJOB = [
    '#!/usr/bin/env bash',
    'dbt deps',
    'dbt build --target prod || true',
    './ci/save_prod_manifest.sh target/manifest.json'
  ].join('\n');
  var BUGJOBFIX = JOB;
  var LIMITS = [
    'alter warehouse WH_TRANSFORM set',
    '    statement_timeout_in_seconds = 7200',
    '    statement_queued_timeout_in_seconds = 900;'
  ].join('\n');

  LAB.addChapter({
    id: 'm8', n: 8, title: 'Running it in production', short: 'Running', blurb: 'Schedulers, retries, alerts and keeping runs apart', minutes: 30,
    focus: ['ci'],
    goals: [
      'Compare four ways to **schedule** dbt on Snowflake, and pick one for a given team.',
      'Write a production job that **stops on failure**, checks freshness and **saves its manifest**.',
      'Explain **retry**, **alerts** and why only **one run** may write at a time.',
      'Describe the **release path** of a change from pull request to production.'
    ],
    say: 'Mission 8 puts it all on a schedule. Everything so far works on a laptop. Production adds a clock, an on-call person and the cost of two runs at the same time. The job is small, and the rules around it decide whether you sleep at night.',
    scenes: [
      B.cmp({
        id: 'm8-cmp', t: 1, title: 'Four ways to run dbt on a schedule',
        say: 'Press Next to compare them. This comparison comes from product documentation, not from a recording. Check what your version supports before you commit.',
        cols: ['Option', 'Where dbt runs', 'Where the credentials live', 'Strength', 'Watch out for'],
        hl: 3,
        rows: [
          ['A hosted dbt scheduler (dbt Cloud)', 'On the vendor\'s infrastructure', 'In the vendor\'s settings', 'Jobs, CI and docs in one place', 'Another vendor and another bill'],
          ['An orchestrator such as Airflow', 'Where the orchestrator runs it', 'In the orchestrator\'s secret store', 'dbt is one task among ingestion, ML and more, with cross-system dependencies', 'You operate it, and one `dbt build` task hides which model failed'],
          ['Snowflake Tasks with dbt Projects on Snowflake', 'Inside Snowflake, on a virtual warehouse', 'Snowflake roles, no separate key', 'One platform, one bill, runs next to your data', 'Check the supported dbt commands and versions'],
          ['A CI system with a cron trigger', 'On a CI runner', 'In the CI secrets', 'Almost nothing to set up', 'Weak retries and alerts, and runs can drift or overlap']
        ],
        steps: [
          { upto: 2, say: 'Hosted scheduler and orchestrator. Both give you retries, history and alerts. The orchestrator is the choice when dbt must wait for other systems.' },
          { upto: 3, say: 'Running inside Snowflake is the newest option. Snowflake lists dbt Projects on Snowflake as generally available since November 2025, with runs on a warehouse at the usual compute price. Tasks can start a project.' },
          { upto: 4, say: 'A cron trigger on a CI runner is enough to start. Plan the move when you need retries and paging.' }
        ],
        pick: 'Choose the option your team can **operate**. A small team with every input in Snowflake saves a system by running inside Snowflake or with a hosted scheduler. A team that orchestrates ingestion and machine learning too uses its **orchestrator**.'
      }),

      B.code({
        id: 'm8-job', t: 1, title: 'A production job in seven lines', file: 'ci/nightly.sh (written by hand, not recorded)', lang: 'bash', code: JOB,
        steps: [
          { say: 'Whatever runs the job, the job itself stays small. Press Next to read it.', lines: null },
          { say: 'The first rule: stop at the first failure. `set -e` makes the script exit with the exit code of the failed command, so the scheduler sees a failed job.', lines: G.span(JOB, /set -euo pipefail/, /set -euo pipefail/) },
          { say: 'Check that RAW is fresh before you build. If a loader stopped, a build only copies stale data into the marts.', lines: G.span(JOB, /source freshness/, /source freshness/) },
          { say: '`dbt build` runs models, tests, snapshots and seeds in graph order. `--fail-fast` stops at the first failure, so you do not pay for the rest of a run you will repeat.', lines: G.span(JOB, /dbt build/, /dbt build/) },
          { say: 'Save the manifest of this run. The next pull request check needs it as its state. This line runs only if the build passed.', lines: G.span(JOB, /save_prod_manifest/, /save_prod_manifest/) }
        ],
        note: 'The build leaves its results in `target/run_results.json`. Keep the `target` folder until the job is over, because `dbt retry` reads it to find where to restart.'
      }),

      B.bug({
        id: 'm8-bug', t: 1, q: 'The nightly build failed on one model at 03:12. The scheduler shows the job as **green**. Click the line that explains it.',
        file: 'ci/nightly.sh', lang: 'bash', code: BUGJOB, bad: G.at(BUGJOB, /\|\| true/),
        hint: 'What does the scheduler look at to decide that a job passed?',
        why: 'A scheduler looks at the exit code. `|| true` turns the failure of `dbt build` into a success, and the last command succeeds too. Nobody is paged, the failed model keeps yesterday\'s data, and the manifest of a broken run is saved. Remove `|| true` and add `set -euo pipefail`.',
        fix: BUGJOBFIX,
        cheer: 'A green job that failed is worse than a red job.'
      }),

      B.quiz({
        id: 'm8-q1', t: 1,
        q: 'The nightly build fails at 03:12. The job container is deleted when the job ends. What can you no longer do the next morning?',
        opts: [
          { t: 'Read the error in the scheduler log', fb: 'The log is kept by the scheduler, outside the container.' },
          { t: 'Run `dbt retry` to rerun only the failed and skipped models', fb: '' },
          { t: 'Run `dbt build` again from the start', fb: 'A fresh build needs only the code and the credentials.' },
          { t: 'Look at the query history in Snowflake', fb: 'The query history lives in Snowflake, not in the container.' }
        ],
        ok: 1, why: '`dbt retry` reads `target/run_results.json` from the failed run to decide what to rerun. If the container and its `target` folder are gone, there is nothing to read. Keep `target` as an artifact of the job, or retry inside the same job before the container ends.'
      }),

      B.order({
        id: 'm8-ord', t: 1, q: 'Put a night of production work in order.',
        items: [
          'The scheduler starts one job, and no other production run is active',
          'dbt checks the freshness of the sources',
          'dbt builds models and tests in graph order, and stops at the first failure',
          'On a failure the job exits with an error and the on-call person gets the failing model name',
          'After the fix, `dbt retry` reruns the failed and skipped nodes',
          'The job saves the manifest for the next pull request check'
        ],
        why: 'One run, a freshness check, a build that stops early, a loud failure, a cheap retry and a saved manifest. Each step removes a way to waste credits or to hide a failure.'
      }),

      B.code({
        id: 'm8-limits', t: 2, title: 'Stop a runaway statement', file: 'setup.sql (written by hand, not recorded)', lang: 'sql', code: LIMITS,
        steps: [
          { say: 'One bad join can run for hours and burn credits. Snowflake has two limits that you can set on the warehouse. Press Next.', lines: null },
          { say: 'The statement timeout cancels a statement that runs longer than the limit. Two hours is far above a normal model and far below a runaway one.', lines: G.span(LIMITS, /statement_timeout_in_seconds/, /statement_timeout_in_seconds/) },
          { say: 'The queue timeout cancels a statement that waits too long for a free slot on the warehouse. It turns a silent pile-up into an error you see.', lines: G.span(LIMITS, /statement_queued_timeout_in_seconds/, /statement_queued_timeout_in_seconds/) }
        ],
        note: 'The default statement timeout is two days, according to Snowflake\'s documentation. Set one that matches your slowest honest model, with a margin, and review it when the data grows.'
      }),

      B.decide({
        id: 'm8-dec', t: 2, title: 'Decision: where does the nightly job run?',
        scenario: 'Brewline\'s nightly dbt build must start **after three ingestion jobs finish**. Two of them run outside Snowflake. A failure must **page the on-call engineer**. The team has four people.',
        opts: [
          { t: 'A cron trigger on a CI runner at 03:00', d: 'The simplest to set up.', lose: 'It starts at 03:00 whether ingestion finished or not, so a late loader means a build on stale data. It has no paging and weak retries.' },
          { t: 'Tasks inside Snowflake', d: 'Everything stays in the account.', lose: 'A task can wait for Snowflake objects. It cannot see the two ingestion jobs that run outside, so you would add another system to tell it when they finish.' },
          { t: 'An orchestrator that runs ingestion, then dbt, then pages on failure', d: 'dbt is one task in a graph that includes the loaders.' }
        ],
        pick: 2,
        why: 'The requirement is a dependency across systems, plus paging. That is what an orchestrator is for. It runs dbt after the loaders report success, retries, and alerts.',
        when: 'If every input were in Snowflake and the team were this small, running inside Snowflake or on a hosted scheduler would remove a system to operate.'
      }),

      B.incident({
        id: 'm8-inc', t: 2, title: 'Incident: two open rows for the same customer', time: '03:25',
        alert: 'The test on `snap_customers` failed: **14 customers have two open rows**, where `dbt_valid_to` is empty. The nightly job finished at 03:20.',
        clues: ['A teammate started a manual rerun at 03:05 because the nightly job looked stuck', 'The nightly job and the manual run both ran `dbt snapshot`', 'The snapshot table is permanent with a longer Time Travel period'],
        opts: [
          { t: 'Restore snap_customers from before the double run, rerun the snapshot once, and allow one production run at a time', fb: '' },
          { t: 'Delete the extra rows by hand until the test passes', fb: 'You guess which rows are right, and the history has no other source.' },
          { t: 'Remove the test, because it keeps failing', fb: 'The test found a real problem. Removing it hides the damage.' },
          { t: 'Run the snapshot again to fix itself', fb: 'A third run reads the same duplicates and adds more rows.' }
        ],
        best: 0,
        why: 'Two snapshot runs at the same time both saw the same customers as changed, and both inserted a new open row. Snapshots cannot be rebuilt from RAW, so you restore a known good state from Time Travel, which is why the table is permanent. Then you stop it happening again.',
        checks: [
          ['Confirm the cause', 'In the query history, two sessions ran snapshot merges on the table between 03:05 and 03:20.'],
          ['Pause everything', 'Disable the schedule so nothing writes while you repair.'],
          ['Restore', 'Clone the snapshot table as of a moment before 03:05, check the counts per customer, then swap it into place.'],
          ['Run once', 'Run the snapshot once, with nothing else running, and rerun the test.'],
          ['Prevent', 'Allow one production run at a time in the scheduler, and require a check that no run is active before a manual start.']
        ],
        tell: 'Fourteen customers had two open snapshot rows because a manual rerun overlapped the nightly job, and both ran dbt snapshot. I paused the schedule, confirmed two sessions in the query history, restored the snapshot table from Time Travel as of just before the overlap, and ran the snapshot once. The test passed. We now allow only one production run at a time in the scheduler, and a manual start checks that nothing is running.',
        prevent: ['Set **one active run** per production job', 'Make **manual runs** check for an active run first', 'Keep snapshots **permanent** with a longer Time Travel period', 'Keep the **uniqueness test** on the open rows']
      }),

      B.qa({
        id: 'qa-run', t: 1, tag: 'Running', secs: 60,
        q: 'How would you run dbt in production on Snowflake?',
        pts: ['A scheduler starts one job; one active production run at a time', 'The job: deps, source freshness, build with fail-fast', 'Exit code drives alerts; the failing model name goes to the on-call person', 'dbt retry from run_results.json after a fix', 'Service user with key pair, narrow role, own warehouse', 'Save the manifest for CI'],
        short: 'A scheduler starts a small job. The job installs the packages, checks the freshness of the sources, runs `dbt build` with `--fail-fast` against the production target, and saves the manifest of the run for the pull request checks. It stops at the first failure, so the exit code is non-zero and the scheduler can alert the on-call person with the name of the failing model.\n\nOnly one production run can be active at a time, because two runs at once can corrupt a snapshot or rebuild a table under another run. After a fix I use `dbt retry`, which reads the results of the failed run and reruns only the failed and skipped nodes, so I keep the `target` folder until the job is done.\n\nThe job signs in as a service user with a key pair and a narrow role, on its own warehouse with a short auto-suspend and a statement timeout. For the scheduler, I choose what the team can operate: a hosted scheduler, an orchestrator when dbt waits for other systems, or Snowflake tasks when everything is in Snowflake.',
        fu: [
          ['Why check freshness first?', 'Because a build on stale RAW gives fresh-looking marts with old data, and nobody notices.'],
          ['What does fail-fast cost you?', 'Later models do not run in that attempt. It saves credits when you will rerun anyway.']
        ],
        trap: 'Saying "cron runs dbt run". The expected answer includes the exit code, retry, one run at a time and alerts.',
        real: 'Describe your scheduler, how often it failed, and what you changed.'
      }),

      B.qa({
        id: 'qa-fail', t: 2, tag: 'Running', secs: 75,
        q: 'A production dbt run fails halfway. What happens, and what do you do?',
        pts: ['dbt marks dependents of the failed node as skipped; independent branches continue', 'With fail-fast the run stops at the first failure', 'Tables that were already replaced stay replaced; failed ones keep their old version', 'The job exits non-zero and alerts with the model name', 'Read the Snowflake error and the compiled statement; fix; dbt retry', 'Check downstream consumers for a mix of old and new data'],
        short: 'dbt marks the models that depend on the failed one as skipped. Without fail-fast, independent branches carry on. With fail-fast, the run stops at the first failure. Each model is one statement, so a model that failed keeps its previous version, and models that finished stay updated. That means the marts can be a mix of new and old for a while, so I tell the consumers if it matters.\n\nThe job exits with an error, and the scheduler alerts the on-call person with the failing model name. I read the Snowflake error and the compiled statement in `target/compiled`, which usually shows the cause: a permission, a type, a timeout or a data problem. I fix it in a pull request, or in a quick patch if production is down.\n\nThen I run `dbt retry`, which reads the results of the failed run and reruns only the failed and skipped nodes. I confirm that the tests pass, and I write down what happened.',
        fu: [
          ['What does a failed test do?', 'In dbt build, a failed test stops the models that depend on the tested model, so bad data does not spread.'],
          ['What if the retry fails the same way?', 'Then the cause is not transient. Read the compiled statement and the query history, and fix the code or the data.']
        ],
        trap: 'Saying "I rerun the whole job". It pays for the same work twice.',
        real: 'Describe a failed run you fixed, with the error and the fix.'
      }),

      B.qa({
        id: 'qa-release', t: 2, tag: 'Running', secs: 90,
        q: 'Describe your release process for a dbt change on Snowflake, from pull request to production.',
        pts: ['Pull request: parse, build changed models in a PR schema with defer and clones', 'Tests and review; the role cannot touch production', 'Merge to main triggers or waits for the scheduled production run', 'Production: one run, build with fail-fast, grants and policies re-applied', 'Post-checks: freshness, row counts, reconciliation, dashboards', 'Rollback plan: revert and rebuild; Time Travel for what cannot be rebuilt'],
        short: 'It starts with a pull request. The check parses the project, which needs no connection, then builds the changed models and their children into a schema named after the pull request. It reads unchanged parents from production with defer, and it clones production tables when an incremental model changed. Tests run, a reviewer reads the diff and the statements, and the CI role has no write rights on production. The pull request schema is dropped at the end.\n\nOn merge, the change goes out with the next production run, or I start one. The job checks freshness, builds with fail-fast on its own warehouse, and the grants and policies are applied again by dbt after each replace. Then it saves the new manifest.\n\nAfter the run I check freshness, row counts and a reconciliation of revenue against RAW, and I look at the key dashboards.\n\nThe rollback plan is written before the release: revert the commit and rebuild the affected models. For data I cannot rebuild, such as snapshots, I rely on Time Travel with a longer retention.',
        fu: [
          ['How do you handle a breaking change to a public model?', 'With a new model version and a deprecation date, so consumers move on their own schedule.'],
          ['Who may start a production run by hand?', 'Few people, with a check that no other run is active.']
        ],
        trap: 'Describing only CI. The expected answer reaches production, the checks afterwards and the rollback.',
        real: 'Give the release path of your team, and where it failed once.'
      }),

      B.recap({
        id: 'm8-recap', n: 8, badge: 'Scheduler', color: '#A7F3D0',
        pts: [
          'A production job is small: **deps, freshness, build with fail-fast, save the manifest**.',
          'The **exit code** drives the alert. Never hide a failure with `|| true`.',
          '`dbt retry` reads the previous run. **Keep `target`** until the job ends.',
          '**One production run at a time**, especially with snapshots.',
          'Choose the scheduler the team can **operate**. Set a **statement timeout** on the warehouse.'
        ],
        lines: [
          'A green job that failed is worse than a red one.',
          'I write the rollback plan before the release.',
          'One run writes at a time.'
        ]
      })
    ]
  });
})();
