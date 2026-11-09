/* Mission 9: case studies, the boss round, and a one-page review. */
(function () {
  var B = LAB.b, G = LAB.get;

  /* Boss round: questions come from the earlier missions, in mission order. Tier 1 is the junior path,
     tier 2 adds the senior questions, tier 3 adds the rest. */
  var BOSS = [
    ['qa-profile', 1], ['qa-auth', 2], ['qa-obj', 1], ['qa-transient', 2], ['qa-dyn', 3], ['qa-merge', 1], ['qa-strategy', 2], ['qa-late', 3],
    ['qa-cost', 1], ['qa-size', 2], ['qa-attrib', 3], ['qa-env', 1], ['qa-ci', 2], ['qa-clone', 3], ['qa-rbac', 1], ['qa-grants', 2],
    ['qa-pii', 3], ['qa-tt', 1], ['qa-rollback', 2], ['qa-protect', 3], ['qa-run', 1], ['qa-fail', 2], ['qa-release', 3]
  ];
  var WH_STMTS = G.stmts('cfg_warehouse').filter(function (s) { return /^use warehouse/i.test(s.sql); }).map(function (s) { return s.sql; });
  G.expect(WH_STMTS.length === 2, 'dbt switches warehouse before the model and back after it');

  LAB.addChapter({
    id: 'm9', n: 9, title: 'Boss round and cheat sheet', short: 'Boss round', blurb: 'Case studies, a mock interview, a one-page review', minutes: 40,
    focus: ['src', 'stg', 'int', 'mart', 'con', 'sf', 'air', 'mon', 'qual', 'snap', 'ci'],
    goals: [
      'Solve **case studies** that combine several missions.',
      'Answer a **mock interview round** against a timer, and grade yourself honestly.',
      'Keep a **one-page review** of the statements, settings and decision rules.'
    ],
    say: 'This is the last mission. First two drills that mix topics, then a design decision, then the boss round: real interview questions with no notes. Be honest when you grade yourself. Honest grades make the scorecard worth reading.',
    scenes: [
      B.incident({
        id: 'm9-inc1', t: 1, title: 'Drill: the first run on a new account fails', time: '16:40',
        alert: 'Your first `dbt run --target dev` on a new Snowflake account stops at the first model with an **access control error**: the role has insufficient privileges on a schema.',
        clues: ['`dbt debug` passed, so the account, the key and the profile are fine', 'The schema `DEV_ALICE` was created by an administrator last week', 'The role in the profile is TRANSFORMER'],
        opts: [
          { t: 'Check who owns the schema and what TRANSFORMER may do in it, then grant what dbt needs or let TRANSFORMER create the schema', fb: '' },
          { t: 'Switch the profile to ACCOUNTADMIN', fb: 'It makes the error go away by removing the limit. A job should never hold that role.' },
          { t: 'Run again with more threads', fb: 'Threads change how many statements run at once. They do not change privileges.' },
          { t: 'Reinstall dbt', fb: 'The connection works. The error is about what the role may do.' }
        ],
        best: 0,
        why: 'A passing `dbt debug` rules out the account, the key and the network. The error is about privileges. A schema that an administrator created belongs to the administrator\'s role, so TRANSFORMER has no right to create tables there. For a developer schema, the clean fix is to drop it and let dbt create it, so TRANSFORMER owns it.',
        checks: [
          ['Read the error', 'It names the role, the schema and the missing privilege.'],
          ['Check ownership', 'Run `show grants on schema` and look at the owner. It is SYSADMIN.'],
          ['Choose the fix', 'For a developer schema, drop it and let dbt create it with the TRANSFORMER role. For a shared schema, grant `create table` and `create view` on it.'],
          ['Rerun', 'Run the build again and watch the first model finish.'],
          ['Write it down', 'Add the rule to the setup script: schemas that dbt builds in are created by the dbt role.']
        ],
        tell: 'My first dbt run failed with an access control error. dbt debug passed, so the connection was fine, and the error named the schema and the missing privilege. The schema had been created by an administrator, so TRANSFORMER did not own it. I dropped the empty developer schema and let dbt create it, so the dbt role owns it, and the run passed. I added the rule to the setup script so the next engineer does not hit it.',
        prevent: ['Let the **dbt role create** the schemas it builds in', 'Keep the **setup script** in the repository', 'Run **dbt debug and one model** as a smoke test for a new account', 'Never fix a privilege error with **ACCOUNTADMIN**']
      }),

      B.incident({
        id: 'm9-inc2', t: 2, title: 'Drill: a developer run used the biggest warehouse', time: '10:05',
        alert: 'The credit report shows that **WH_TRANSFORM_XL ran for three hours** yesterday. The nightly build runs on WH_TRANSFORM. Nobody scheduled anything on the XL warehouse.',
        clues: ['The query history shows the user ALICE and the query tag `dbt_brewline_dev`', 'One model has `snowflake_warehouse=\'WH_TRANSFORM_XL\'` in its config', 'Alice builds that model on her laptop with the dev target'],
        opts: [
          { t: 'Find the model from the node id in the query comment, and make the override apply only to the prod target', fb: '' },
          { t: 'Drop the XL warehouse', fb: 'The nightly build needs it for the heavy model. You would break production to stop a development habit.' },
          { t: 'Ask Alice to stop building that model', fb: 'The config is the cause. The next developer who builds it will do the same.' },
          { t: 'Only add a resource monitor to the XL warehouse', fb: 'It limits the damage and leaves the cause. The monitor may also stop the nightly build.' }
        ],
        best: 0,
        why: 'A model-level warehouse setting applies in every target. In the recording of that setting, dbt sent `' + WH_STMTS[0] + '` before the model and `' + WH_STMTS[1] + '` after it. So any run of that model, on any target, uses the XL warehouse. Make the setting depend on the target.',
        checks: [
          ['Find the user and the tag', 'The query history groups the XL warehouse time under ALICE and the dev tag.'],
          ['Find the model', 'Read the node id from the query comment on the long statement.'],
          ['Read the config', 'The model sets `snowflake_warehouse` without looking at the target.'],
          ['Fix it', 'Use the XL warehouse on prod, and the warehouse of the profile everywhere else: `snowflake_warehouse = \'WH_TRANSFORM_XL\' if target.name == \'prod\' else target.warehouse`.'],
          ['Guard', 'Give developers a role without usage on the XL warehouse, so the setting cannot work from a laptop.']
        ],
        tell: 'The XL warehouse ran for three hours with nothing scheduled on it. The query history showed a developer running with the dev tag, and the node id in the query comment pointed at one model that sets snowflake_warehouse to the XL warehouse for every target. I changed the setting so the XL warehouse is used only on the prod target, and I removed the developers\' usage right on the XL warehouse so a config mistake cannot spend credits from a laptop.',
        prevent: ['Make **warehouse overrides** depend on the target', 'Give developer roles **no usage** on the large warehouses', 'Review the **credit report by user and tag** each week', 'Put a **resource monitor** with a notify level on every warehouse']
      }),

      B.decide({
        id: 'm9-dec', t: 2, title: 'Decision: your first week on a new Snowflake and dbt project',
        scenario: 'You join Brewline as the first data engineer. Data is loaded into Snowflake by a pipeline. There are **no environments, no roles beyond ACCOUNTADMIN, and one large warehouse that never suspends**. The analytics lead wants **one trusted revenue number** by the end of the month.',
        opts: [
          { t: 'Build everything first: masking on every column, blue and green schemas, CI with clones, and a hosted scheduler', d: 'A complete platform from day one.', lose: 'In a week you will have a lot of setup and no revenue number, and you will guess at needs that you have not seen yet.' },
          { t: 'Build the safe skeleton and one thin slice: a dbt role with a key pair, RAW read-only, dev and prod, warehouses that suspend in 60 seconds, grants in dbt, then the revenue chain with tests', d: 'Roles, warehouses and two environments first. The first number follows on top.' },
          { t: 'Keep ACCOUNTADMIN and the large warehouse and focus on the models', d: 'The fastest start.', lose: 'Every mistake is possible at full power, the bill is high and invisible, and changing roles later breaks every job at once.' }
        ],
        pick: 1,
        why: 'The skeleton costs a day, and it is much harder to add after jobs depend on a wrong setup. A dbt role, two environments and a warehouse that suspends give you safety, a bill you can read and a place to build. Then you follow one number from RAW to the dashboard. Add CI, masking and clones when the first need for each appears.',
        when: 'If the account already has narrow roles and separate warehouses, skip the skeleton and start with the slice.'
      }),

      B.mockRound(BOSS.map(function (b) { return b[0]; }), BOSS.map(function (b) { return b[1]; })),

      B.cheat({
        id: 'm9-cheat', t: 1, title: 'One-page review',
        say: 'This is your last-minute page. Screenshot it, or print it with your browser. Everything here appears somewhere in the course.',
        sections: [
          { h: 'What dbt sends', items: ['View: `create or replace view`. Table: `create or replace transient table ... as (select ...)`', 'Incremental: first run like a table, then a temporary view and a `merge` between begin and commit', 'Delete+insert: two statements in one transaction. Append: one insert. Microbatch: delete and insert per window, with no transaction in the recording', 'Without a `unique_key` a merge becomes a plain insert', 'Snapshot: transient by default. Make it permanent with `+transient: false`', 'Test: a `select count(*)` over the test SQL. Seed: bound values, for small files only'] },
          { h: 'Settings and what they cost', items: ['`transient=false`: Fail-safe and longer Time Travel, more storage', '`copy_grants`, `grants`: keep access after a replace', '`cluster_by`: background clustering uses credits', '`snowflake_warehouse`: `use warehouse` before and after the model', '`query_tag`: label for the cost report. `secure=true`: hides the view text', 'Dynamic table: Snowflake refreshes it on its own warehouse, even with dbt idle'] },
          { h: 'Cost', items: ['Credits = rate x time. XS is 1 an hour, each size doubles', 'Per second, at least 60 seconds each time a warehouse resumes', 'Idle time before auto-suspend is billed: use 60 seconds', 'One warehouse per workload. A thread is a session; past the limit, statements queue', 'dbt writes the model name into every statement: group the query history by it', '`--empty` and `state:modified+` build less. `dbt parse` opens no connection'] },
          { h: 'Environments', items: ['dev: schema per developer. ci: schema per pull request. prod: real layer schemas', '`generate_schema_name` puts everything in one schema outside prod', 'The role is the guard: CI cannot write to production', '`dbt clone` and `--defer`: realistic tables, no rebuild', 'Every CI command names its target. Always drop the pull request schema'] },
          { h: 'Security', items: ['Privileges go to roles. No ACCOUNTADMIN for jobs', 'Usage on database and schema, then select on the table, plus a warehouse', 'A replaced table is a new object: grants and policies are applied again', 'The grants config is the full list: dbt revokes the rest', 'Masking policy by role, attached in a post-hook. Secure views for sharing'] },
          { h: 'Recovery', items: ['Time Travel: 1 day by default, transient up to 1 day, permanent up to 90 on higher editions', 'Changed in place: clone at a time, compare, swap', 'Replaced or dropped: rename the new table, then `undrop`', 'Write the time zone in every restore time, or use the query id', 'Protect what you cannot rebuild: snapshots and RAW'] },
          { h: 'Running', items: ['Job: deps, freshness, `dbt build --fail-fast`, save the manifest', 'Never hide a failure with `|| true`. The exit code drives the alert', '`dbt retry` needs the previous `target` folder', 'One production run at a time, especially for snapshots', 'A statement timeout on the warehouse stops a runaway query'] },
          { h: 'Say it in one line', items: ['dbt sends SQL. Snowflake does the work and bills the warehouse.', 'Read the statement before you tune the model.', 'Idle time is the quiet cost.', 'The role protects production, not the macro.', 'A replaced table has no grants until dbt grants them.', 'Recovery follows what I cannot rebuild.'] }
        ]
      }),

      B.recap({
        id: 'm9-recap', n: 9, badge: 'Snowflake and dbt Architect', color: '#99F6E4',
        pts: [
          'You can follow a model from a **file to a statement** on Snowflake, and say what it costs and who can read it.',
          'You choose by **evidence**: the statement before the guess, the query history before the resize, the grants before the fix.',
          'You protect **production** with roles, targets and clones, and **history** with permanent tables.',
          'You know which facts came from **recordings** and which from **documentation**, and you say so.',
          'Next: practise the answers out loud, then run the Brewline project on a trial account.'
        ],
        lines: [
          'I read the statement and the first error before I change anything.',
          'I protect every key, every role and every public model.',
          'I say what I know, and I say when I would check the documentation.'
        ]
      })
    ].reduce(function (all, x) { return all.concat(x); }, [])
  });
})();
