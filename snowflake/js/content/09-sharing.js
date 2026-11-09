/* Mission 9: secure data sharing, reader accounts and listings. */
(function () {
  var B = LAB.b;

  var SHARE = [
    '-- PROVIDER: share a secure view with a partner',
    'CREATE SECURE VIEW marts.v_partner_sales AS',
    '  SELECT order_day, orders, revenue_usd FROM marts.daily_revenue;',
    '',
    'CREATE SHARE brewline_partner_share;',
    'GRANT USAGE ON DATABASE brewline TO SHARE brewline_partner_share;',
    'GRANT USAGE ON SCHEMA brewline.marts TO SHARE brewline_partner_share;',
    'GRANT SELECT ON VIEW brewline.marts.v_partner_sales TO SHARE brewline_partner_share;',
    'ALTER SHARE brewline_partner_share ADD ACCOUNTS = partner_org.partner_account;',
    '',
    '-- CONSUMER: create a database from the share and query it',
    'CREATE DATABASE brewline_shared FROM SHARE brewline_org.brewline_account.brewline_partner_share;',
    'SELECT * FROM brewline_shared.marts.v_partner_sales ORDER BY order_day LIMIT 3;'
  ].join('\n');

  var BUGSHARE = [
    'CREATE VIEW marts.v_partner_sales AS',
    '  SELECT order_day, orders, revenue_usd FROM marts.daily_revenue;',
    'GRANT SELECT ON VIEW brewline.marts.v_partner_sales TO SHARE brewline_partner_share;'
  ].join('\n');

  LAB.addChapter({
    id: 'm9', n: 9, title: 'Sharing data', short: 'Sharing', blurb: 'Secure shares, reader accounts, listings', minutes: 16,
    focus: ['con'],
    goals: [
      'Explain how **secure data sharing** works without copying data.',
      'Share a **secure view** and create a database from a share.',
      'Choose between a **direct share, a reader account, a listing and a file export**.',
      'Say who **pays for what**, and what limits apply across regions.'
    ],
    say: 'Mission 9 is sharing. It is one of the features that sets Snowflake apart, and it comes up whenever a company works with partners, customers or other business units.',
    scenes: [
      B.flow({
        id: 'm9-flow', t: 1, title: 'Sharing without copying', g: 'sharing', legend: true,
        steps: [
          { say: 'Sharing in Snowflake means giving another account read access to your data. Nothing is copied or sent anywhere. Press Next to follow it.', cap: 'A share is a **set of permissions**, not a set of files.' },
          { say: 'The provider chooses what to expose: tables or, better, a secure view that returns only the columns and rows the partner should see.', on: ['sh1'], focus: ['g_prov', 'pdb', 'shr'], cap: 'A secure view lets you **limit columns and rows** before sharing.' },
          { say: 'The share points at the provider\'s micro-partitions. There is still one copy of the data, and it is the provider\'s.', on: ['sh2'], focus: ['shr', 'store'], cap: 'No copy means **no sync job, no stale data, no extra storage**.' },
          { say: 'The consumer creates a read-only database from the share. They see live data: when the provider updates a table, the consumer sees it on the next query.', on: ['sh3'], focus: ['store', 'cdb'], cap: 'The consumer cannot change or copy the provider\'s objects, only query them.' },
          { say: 'The consumer queries with their own warehouse. They pay for the compute, and the provider pays only for storage.', on: ['sh4'], focus: ['g_cons', 'cdb', 'cwh'], cap: 'Compute cost follows the person who **runs** the query.' }
        ]
      }),

      B.sql({
        id: 'm9-sql', t: 2, title: 'Share a secure view', file: 'worksheet: share.sql', code: SHARE,
        ctx: { role: 'ACCOUNTADMIN', wh: 'WH_TRANSFORM', db: 'BREWLINE.MARTS' },
        steps: [
          { say: 'Two sides, one worksheet. The provider shares. The consumer receives. Press Next.', lines: null },
          { say: 'The provider first builds a secure view. It exposes only daily totals, with no customer data, because a share exposes whatever the view returns.', lines: [1, 3] },
          { say: 'Then the share: a container for the objects, grants to put the view inside it, and the partner\'s account identifier. From this moment the partner can see it.', lines: [5, 9] },
          { say: 'On the consumer side, one statement creates a database from the share. Then they query it like any other database. Press Run.', lines: [11, 13], run: true }
        ],
        result: { cols: ['ORDER_DAY', 'ORDERS', 'REVENUE_USD'], rows: [['2026-03-14 00:00:00.000', '3', '107.50'], ['2026-03-15 00:00:00.000', '1', '55.00'], ['2026-03-16 00:00:00.000', '2', '60.50']], msg: '3 rows' },
        note: 'Creating shares needs the `CREATE SHARE` privilege, which ACCOUNTADMIN holds by default. Removing the account from the share, or dropping the share, **ends access at once**.'
      }),

      B.cmp({
        id: 'm9-options', t: 2, title: 'Four ways to give data to someone else',
        say: 'The right way depends on who is receiving and where they are. Interviewers ask this as a scenario question. Press Next to read each row.',
        cols: ['', 'Direct share', 'Reader account', 'Listing or Marketplace', 'File export'],
        rows: [
          ['The consumer needs', 'A Snowflake account in a region you can share with', 'Nothing. You create a managed account for them', 'A Snowflake account, in any region or cloud with replication', 'Any tool that reads files'],
          ['Who pays for compute', 'The consumer', 'The provider', 'The consumer', 'The consumer, outside Snowflake'],
          ['Freshness', 'Live', 'Live', 'Live, or refreshed on a schedule across regions', 'As fresh as the last export'],
          ['Best for', 'A partner already on Snowflake', 'A customer without Snowflake', 'Many consumers, other clouds, or a public data product', 'Legacy partners and one-off extracts']
        ],
        steps: [
          { upto: 2, say: 'What the consumer needs and who pays for compute. The reader account is the one where you pay.' },
          { upto: 4, say: 'Freshness and fit. File export is the only option that makes a copy that can go stale.' }
        ],
        pick: 'Share **live data** whenever you can, because nothing is copied and nothing goes stale. Use a **reader account** to onboard a customer who has no Snowflake account, a **listing** for many consumers or other clouds, and a **file export** only when nothing else works.'
      }),

      B.talk({
        id: 'm9-facts', t: 2, title: 'What to know before you share',
        say: 'Five facts that interviewers use to see whether you have shared data for real. Press Next for each.',
        items: [
          ['Only secure views and tables', 'A share can contain tables, secure views, secure materialized views and a few other object types. A normal view cannot be added, because its definition could leak data.', 'Share secure views, not plain ones.'],
          ['Consumers are read-only', 'A consumer cannot insert, update or delete in the shared database, and cannot grant it onward. They can build their own tables from query results in their own account.', 'Consumers query. They do not change.'],
          ['Cross-region and cross-cloud', 'A direct share works within one region and cloud. To reach another region or cloud, the data is **replicated** there first. Listings can do this automatically, which is called cross-cloud auto-fulfillment, and it costs replication storage and refresh compute.', 'Other regions need replication.'],
          ['Governance still applies', 'Masking policies and row access policies on the provider side apply to what the consumer sees. Design the secure view for the weakest audience, and review shares regularly.', 'Treat a share like a public interface.'],
          ['Marketplace and listings', 'A **listing** packages a share with a description, terms and usage data. It can be private to chosen accounts, or published on the **Snowflake Marketplace** for anyone, free or paid.', 'Listings turn a share into a product.']
        ],
        cols: 1
      }),

      B.bug({
        id: 'm9-bug', t: 2, q: 'The GRANT to the share fails with an error that this object cannot be shared. Click the line that causes it.',
        file: 'share_view.sql', lang: 'sql', code: BUGSHARE, bad: 1,
        hint: 'Which kind of view is allowed in a share?',
        why: 'Only **secure views** can be added to a share. A normal view exposes its definition, and the optimizer may reorder operations in a way that leaks rows. Create the view as `CREATE SECURE VIEW`, then grant it.',
        fix: 'CREATE SECURE VIEW marts.v_partner_sales AS\n  SELECT order_day, orders, revenue_usd FROM marts.daily_revenue;\nGRANT SELECT ON VIEW brewline.marts.v_partner_sales TO SHARE brewline_partner_share;'
      }),

      B.quiz({
        id: 'm9-q1', t: 1,
        q: 'A partner queries a share you provide. Who pays for the compute?',
        opts: [
          { t: 'The partner, with their own warehouse', fb: '' },
          { t: 'You, the provider, because it is your data', fb: 'The provider pays for storage. The account that runs the query pays for the compute, unless it is a reader account.' },
          { t: 'Nobody. Shared queries are free', fb: 'Every query needs a warehouse, and warehouses cost credits.' },
          { t: 'Snowflake pays and bills you a fixed fee', fb: 'There is no flat sharing fee. Costs follow storage and compute usage.' }
        ],
        ok: 0, why: 'The **consumer** pays for compute with their own warehouse. The provider pays only for storage. The exception is a **reader account**, which the provider creates and pays for.'
      }),

      B.quiz({
        id: 'm9-q2', t: 2,
        q: 'Your partner\'s Snowflake account is in a different cloud region. How do you share data with them?',
        opts: [
          { t: 'Replicate the data to their region, for example through a listing with auto-fulfillment, and share from there', fb: '' },
          { t: 'Add their account to a normal share. It works across regions', fb: 'A direct share works only inside one region and cloud.' },
          { t: 'Export CSV files and email them', fb: 'It works, but it copies data, goes stale and bypasses your governance.' },
          { t: 'Give them a login on your account', fb: 'That gives an outsider a user in your account, which is a security problem.' }
        ],
        ok: 0, why: 'Shares work inside one region and cloud, so for another region the data must be **replicated** first. Listings automate that, and you pay for the replicated storage and refresh compute.'
      }),

      B.decide({
        id: 'm9-dec', t: 2, title: 'Decision: a customer without Snowflake needs daily sales data',
        scenario: 'A retail partner wants **daily sales data** and **does not use Snowflake**. They have a small BI team and no data engineers. You want them to see **live** data and you do not want to build a transfer pipeline.',
        opts: [
          { t: 'Email a CSV every morning', d: 'Export from a query and send it.', lose: 'The copy is stale by lunchtime, someone must keep the job running, and the data leaves your governance as soon as it is sent.' },
          { t: 'Create a reader account and share a secure view with it', d: 'A managed account that you create, for read-only access.' },
          { t: 'Give them a user in your own account', d: 'They log in to your Snowflake and use a role you design.', lose: 'An outsider gets a seat in your account, so your audit, your network rules and your cost control now include them.' }
        ],
        pick: 1,
        why: 'A **reader account** gives the partner a managed, read-only Snowflake account without a contract of their own. They see **live data** through a secure view, and your masking and row rules still apply. You pay for their compute, so set a resource monitor on it.',
        when: 'If the partner **already has Snowflake**, use a direct share, and they pay for their own compute. If they insist on files, schedule an **unload to their cloud storage** and accept that the copy ages.'
      }),

      B.talk({
        id: 'm9-clean', t: 3, title: 'Clean rooms and Native Apps',
        say: 'Two newer ways to collaborate on data. Know what they are for. Details change quickly, so confirm them in the documentation.',
        items: [
          ['Data clean rooms', 'A **clean room** lets two companies analyze overlapping data, for example matching customers for an advertising campaign, without either side seeing the other\'s raw rows. Snowflake provides this as a managed experience built on sharing and policies.', 'Clean rooms allow joint analysis without exposing raw rows.'],
          ['Native Apps', 'A **Native App** packages code and data, and runs inside the **consumer\'s** account. The provider keeps the logic private and the consumer keeps their data in place. It is how some vendors deliver software on Snowflake.', 'Native Apps run provider code inside the consumer\'s account.']
        ],
        cols: 1
      }),

      B.qa({
        id: 'qa-share', t: 2, tag: 'Sharing', secs: 60,
        q: 'How does data sharing work in Snowflake, and what are its limits?',
        pts: ['A share is permissions on the provider\'s data, with no copy', 'The consumer creates a read-only database and pays for compute', 'Share secure views, and design them for the weakest audience', 'Direct shares work within one region and cloud, others need replication', 'Reader accounts and listings extend reach'],
        short: 'A share gives another account read access to my data without copying it. I put tables or secure views into a share, add the consumer account, and they create a read-only database from it. They see live data, query it with their own warehouse, and pay for the compute, while I pay for the storage.\n\nI share secure views and design them for the weakest audience, because the view decides which columns and rows leave. The limits are that consumers are read-only, and that a direct share works only inside one region and cloud. For another region I replicate the data, usually through a listing. For a customer with no Snowflake account I create a reader account, which I pay for, so I set a resource monitor on it.',
        fu: [
          ['How do you stop sharing?', 'Remove the account from the share or drop the share. Access ends immediately, because nothing was copied.'],
          ['How do you protect sensitive columns in a share?', 'I expose them only through a secure view that leaves the columns out or masks them, and I check masking and row policies as the consumer\'s role.']
        ],
        trap: 'Saying "Snowflake sends a copy of the data". The point of sharing is that nothing is copied, so it is live and cheap.'
      }),

      B.recap({
        id: 'm9-recap', n: 9, badge: 'Data Sharer', color: '#FBCFE8',
        pts: [
          'A **share** is permissions on the provider\'s data. **Nothing is copied.** Consumers get a **read-only** database.',
          'Share **secure views**, designed for the weakest audience. Normal views cannot be shared.',
          'The **consumer pays for compute**. The provider pays for storage. A **reader account** is paid by the provider.',
          'Direct shares work in one region and cloud. Other regions need **replication**, for example through a **listing**.',
          'File export is the last resort. It makes a copy that goes stale and leaves your governance.'
        ],
        lines: [
          'I share live data through secure views, so there is nothing to sync and nothing to go stale.',
          'I design the view for the weakest audience, because the view decides what leaves.',
          'For a customer without Snowflake I create a reader account and put a resource monitor on it.'
        ]
      })
    ]
  });
})();
