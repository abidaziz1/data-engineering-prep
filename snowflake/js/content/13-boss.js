/* Mission 13: case studies, the boss round, and a one-page review. */
(function () {
  var B = LAB.b;

  /* Boss round: questions come from the earlier missions, in mission order. Tier 1 is the junior path,
     tier 2 adds the senior questions, tier 3 adds the rest. */
  var BOSS = [
    ['qa-arch', 1], ['qa-size', 1], ['qa-cost', 2], ['qa-copy-pipe', 1], ['qa-ingest', 2], ['qa-variant', 1],
    ['qa-dedupe', 3], ['qa-tt', 1], ['qa-devcopy', 3], ['qa-stream', 1], ['qa-st-dt', 2], ['qa-prune', 1],
    ['qa-tune', 2], ['qa-rbac', 1], ['qa-secure', 2], ['qa-share', 3], ['qa-bill', 2], ['qa-deploy', 3], ['qa-cache', 3]
  ];

  LAB.addChapter({
    id: 'm13', n: 13, title: 'Boss round and cheat sheet', short: 'Boss round', blurb: 'Case studies, a mock interview, a one-page review', minutes: 40,
    focus: ['sf', 'air', 'ing', 'stg', 'raw', 'int', 'mon', 'qual', 'con', 'snap', 'mart', 'ci'],
    goals: [
      'Solve **case studies** that combine several topics from the course.',
      'Answer a **mock interview round** with a timer, and grade yourself honestly.',
      'Keep a **one-page review** of the numbers and decision rules.'
    ],
    say: 'This is the final mission. First two incident drills that mix topics, then a design decision, then the boss round: real interview questions with no notes. Be honest when you grade yourself. Honest grades make the scorecard worth reading.',
    scenes: [
      B.incident({
        id: 'm13-inc1', t: 1, title: 'Drill: revenue doubled for one day', time: '09:05',
        alert: 'Revenue for 14 March is **exactly double** on the finance dashboard. Last night an engineer reloaded that day\'s files to fix a missing column.',
        clues: ['The reload used `COPY INTO ... FORCE = TRUE`', 'RAW holds two rows for every order from that day, with different `_loaded_at` values', 'CORE is built with a plain SELECT from RAW, with no deduplication'],
        opts: [
          { t: 'Find the reloaded rows by file name and load time, remove the extra copy from RAW, then rebuild CORE and the marts', fb: '' },
          { t: 'Divide that day\'s figure by two in the dashboard', fb: 'It hides the problem, and every other report built on the same table is still wrong.' },
          { t: 'Truncate RAW and reload every file from S3', fb: 'It would work, but it is heavy and risky when you can see exactly which load to remove.' },
          { t: 'Wait for the month-end close to correct it', fb: 'Finance is using the number today. A wrong figure for a month is a reporting incident.' }
        ],
        best: 0,
        why: 'The audit columns exist for exactly this moment: **`_file` and `_loaded_at` tell you which load is the extra copy**. Remove that copy, then rebuild downstream so the numbers recover from the source of truth.',
        checks: [
          ['Confirm', 'In RAW, group by order ID and count. Find which `_file` and `_loaded_at` pairs are doubled.'],
          ['Contain', 'Pause downstream tasks or runs so doubled data stops spreading, and tell finance not to use the figure.'],
          ['Fix RAW', 'Delete the rows from the later, duplicate load. Keep the earlier load and the audit columns.'],
          ['Fix CORE', 'Rebuild CORE with a latest-row-per-order rule, so a repeat of this mistake cannot double revenue.'],
          ['Verify', 'Reconcile order count and revenue for the day against the source system.']
        ],
        tell: 'Revenue for one day was doubled because a reload with FORCE loaded the day\'s files a second time, and CORE did not deduplicate. I used the file name and load time in RAW to find the extra load, removed it, rebuilt CORE and the marts, and reconciled the day against the source. I also changed CORE to keep only the latest row per order, so a duplicate load can no longer inflate a number.',
        prevent: ['Take **FORCE = TRUE** out of runbooks, and document a safe reload path', '**Deduplicate** in CORE and add a **unique test** on the key', 'Reconcile **row counts and revenue** against the source every day', 'Alert when a day\'s revenue is far from its normal range']
      }),

      B.incident({
        id: 'm13-inc2', t: 2, title: 'Drill: two people, two answers', time: '14:30',
        alert: 'Maya sees revenue for **three countries** on the Finance dashboard. Leo sees only **one**. Both say they opened the same dashboard. A row access policy was added to `marts.fct_orders` last week.',
        clues: ['Leo\'s session runs as the role `ANALYST_EU`', 'Maya\'s session runs as `ADMIN_ALL`', 'The mapping table gives `ANALYST_EU` only France'],
        opts: [
          { t: 'Check which role each session ran as and what the policy mapping says, before touching any data', fb: '' },
          { t: 'Drop the row access policy so the numbers match', fb: 'It would remove a control that is probably working as designed, and expose rows to people who must not see them.' },
          { t: 'Re-run the pipeline to refresh the table', fb: 'The data is the same for everyone. The difference comes from the role, so a refresh changes nothing.' },
          { t: 'Give Leo ACCOUNTADMIN so that he sees everything', fb: 'That bypasses the control and gives a regional analyst the power to change the whole account.' }
        ],
        best: 0,
        why: 'Different results for different roles is **what a row access policy does**. First confirm that the difference is the policy working, then decide whether the mapping is right for each person.',
        checks: [
          ['Compare the sessions', 'Query history for each person: which role, which warehouse and which query text.'],
          ['Read the policy', '`SHOW ROW ACCESS POLICIES` and the policy body: what does it return for each role?'],
          ['Read the mapping', 'The mapping table: which countries does each role map to? Is that the intended access?'],
          ['Decide', 'If the mapping is right, explain it. If it is wrong, fix the mapping data and test as both roles.'],
          ['Make it visible', 'Add a note on the dashboard that rows are filtered by role, so nobody is surprised.']
        ],
        tell: 'Two people saw different totals on one dashboard. I compared their sessions and found they ran as different roles, and a row access policy added the week before filters by country for the regional role. So the dashboard was working as designed. I confirmed the mapping with the data owner, added a note on the dashboard that rows are filtered by role, and added a test that runs the dashboard query as each role.',
        prevent: ['Add a visible **"filtered by role"** note to dashboards over policy-protected tables', 'Test every policy **as each role** before release', 'Document the **mapping table owner** and review it regularly', 'Tell dashboard users when a new policy is introduced']
      }),

      B.decide({
        id: 'm13-dec', t: 2, title: 'Decision: one account or several?',
        scenario: 'Brewline now sells in the **US and the EU**. Law requires that **personal data of EU customers stays in the EU**. Finance wants **one global revenue dashboard**. Teams in both regions use the same product and reference data.',
        opts: [
          { t: 'One account in a US region for everything', d: 'The simplest design, one place for all data.', lose: 'It breaks the residency rule, because EU personal data would be stored in the US. Simplicity cannot outweigh a legal requirement.' },
          { t: 'One account per region, EU personal data stays in the EU, shared reference data is replicated, and aggregates are shared to a global view', d: 'Separate accounts for the US and the EU, connected by replication and sharing.' },
          { t: 'One account per team', d: 'Every team gets its own account.', lose: 'It does not address residency at all, and it fragments data, governance and cost for no reason.' }
        ],
        pick: 1,
        why: 'Residency is a **hard constraint**, so EU personal data lives in an EU account. Replication keeps **non-personal reference data** in sync, and **sharing** gives finance one global view of **aggregated** numbers without moving personal data. You pay for replication and for managing two accounts, which is the price of the rule.',
        when: 'A **single account** is right when no residency rule applies. Even then, many companies separate regions into accounts for blast-radius and latency reasons.'
      }),

      B.mockRound(BOSS.map(function (b) { return b[0]; }), BOSS.map(function (b) { return b[1]; })),

      B.cheat({
        id: 'm13-cheat', t: 1, title: 'One-page review',
        say: 'This is your last-minute page. Screenshot it, or print it with your browser. Everything here appears somewhere in the course.',
        sections: [
          { h: 'Numbers to remember', items: ['Credits per hour: XS 1, S 2, M 4, L 8, XL 16, 2XL 32. Doubles each size.', 'Per-second billing, 60 second minimum on each start. Cloud services free up to 10% of daily compute.', 'Micro-partitions hold 50 to 500 MB uncompressed. Result cache lasts 24 hours.', 'Time Travel: 1 day by default, up to 90 on Enterprise, at most 1 for transient. Fail-safe: 7 days, permanent tables only.', 'Load history: COPY 64 days, Snowpipe 14 days. Aim for 100 to 250 MB compressed files.', 'A stream goes stale when unread past the retention plus its extension, 14 days by default.'] },
          { h: 'Commands to type from memory', items: ['`QUALIFY ROW_NUMBER() OVER (PARTITION BY k ORDER BY t DESC) = 1`', '`payload:user.id::STRING` and `LATERAL FLATTEN(INPUT => payload:items)`', '`SELECT ... AT(OFFSET => -600)`, `BEFORE(STATEMENT => id)`, `UNDROP TABLE t`', '`CREATE TABLE t2 CLONE t1`, `ALTER TASK t RESUME`', '`SYSTEM$CLUSTERING_INFORMATION`, `SYSTEM$PIPE_STATUS`, `SYSTEM$STREAM_HAS_DATA`', '`SHOW GRANTS TO ROLE r`, `IS_ROLE_IN_SESSION(\'R\')`'] },
          { h: 'Decision rules', items: ['Slow query: profile first, warehouse size last.', 'Queueing: scale out. One slow query: fix it, then maybe scale up.', 'Load method: freshness target and what the source can do.', 'Pipelines: dbt for tested logic, dynamic tables for a lag target, streams and tasks for custom change handling.', 'Security: a role per job, policies in the deployment, MFA for people, keys for services.', 'Cost: split by service type first, then warehouse, then query.'] },
          { h: 'Say it in one line', items: ['Storage and compute are separate, so each workload gets its own warehouse.', 'Time Travel is for mistakes. Replication is for outages.', 'A result cache hit uses no compute, and a run-time function in the filter prevents it.', 'I deploy as code, test on a clone, and never put a secret in Git.', 'I confirm the cause with evidence before I change a setting.'] }
        ]
      }),

      B.recap({
        id: 'm13-recap', n: 13, badge: 'Snowflake Architect', color: '#FDE68A',
        pts: [
          'You can follow a query through **cloud services, a warehouse and storage**, and explain what each costs.',
          'You can **load, query, recover, pipeline, tune, secure, share and deliver** on Snowflake.',
          'You choose by **evidence**: profile before size, service type before warehouse, plan before deploy.',
          'You know which features are **new** and say so honestly: confirm status before you adopt.',
          'Next: practise the answers out loud, then try the same on a real Snowflake trial account.'
        ],
        lines: [
          'I diagnose with evidence, I fix the cause, and I measure the result.',
          'I design for failure: recovery, alerts, and a way back.',
          'I say what I know, and I say when I would check the docs.'
        ]
      })
    ].reduce(function (all, x) { return all.concat(x); }, [])
  });
})();
