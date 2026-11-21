/* Mission 8: capacity, security and delivery. All of it is from documentation, read through search summaries. */
(function () {
  var B = LAB.b, G = LAB.get;
  var PLAT = G.file('platform_example.json');

  LAB.addChapter({
    id: 'm8', n: 8, title: 'Capacity, security and delivery', short: 'Capacity and delivery', blurb: 'Throttling, roles, Git and deployment', minutes: 24,
    focus: ['ci', 'mon'],
    goals: [
      'Read the **throttling** stages and say what a job can still do in each.',
      'Say what the four **workspace roles** allow.',
      'Say what **Git integration** stores and what the `.platform` file is for.',
      'Plan **development, test and production** so that one cannot starve the other.'
    ],
    say: 'This is the mission that separates people who built a notebook from people who run Fabric for a team. Everything here is from documentation, which I read through search summaries because the documentation site could not be opened from where I built this. The numbers are the ones that I found, and the README lists them for a second look.',
    scenes: [
      B.flow({
        id: 'm8-flow', t: 1, src: 'docs', title: 'How a capacity decides what to run', g: 'capacity', legend: true,
        steps: [
          { say: 'Every notebook, query and refresh of every workspace on the capacity passes through the same path. Press Next.', focus: ['jobs', 'sm', 'cap', 'thr'], cap: 'Jobs, smoothing, capacity, throttling.' },
          { say: 'Step 1. A job uses **capacity units** while it runs. Your jobs are **interactive** (a person runs a query or opens a report) or **background** (a scheduled refresh or a pipeline).', on: ['e1'], focus: ['jobs', 'sm'], cap: 'Jobs use units.' },
          { say: 'Step 2. **Smoothing** spreads the cost of a job over time, so that a short spike does not need a capacity as large as the spike. Background work is smoothed over **24 hours**. The SQL work of a warehouse and an endpoint is mostly background.', on: ['e2'], focus: ['sm', 'cap'], tags: ['tg_bg'], cap: 'A spike is paid back later.' },
          { say: 'Step 3. A capacity that has used more than it has is **borrowing from the future**. Up to **10 minutes** of future use is free: **overage protection**.', on: ['e3'], focus: ['cap'], tags: ['tg_free'], cap: 'Ten minutes are free.' },
          { say: 'Step 4. After that, **throttling** starts in stages: interactive requests are delayed, then rejected, and after 24 hours of overuse background jobs are rejected too. The lab shows the stages.', on: ['e3'], focus: ['cap', 'thr'], tags: ['tg_rej'], cap: 'Then delay, then reject.' }
        ]
      }),

      B.widget({ id: 'm8-lab', kind: 'capacitylab', t: 1, src: 'docs', title: 'Lab: size, cores and throttling' }),

      B.talk({
        id: 'm8-smooth', t: 2, src: 'docs', title: 'Smoothing, bursting and what else you can set',
        say: 'Four more facts about a capacity. Press Next for each.',
        items: [
          ['Earlier jobs can still cost you', 'A large background job that finished hours ago can still be using future capacity through smoothing. When something is throttled, look at the **earlier** work too, as well as at what runs now.', 'The bill arrives later.'],
          ['Bursting', 'A Spark workload can use up to **three times** the cores of the size that you bought, for a while. It makes a big job finish sooner, and it is paid for through smoothing. A switch exists to stop **one job** from using all of the burst, which leaves room for other jobs.', 'Burst is borrowed.'],
          ['Surge protection', 'A capacity admin can set a limit at which the capacity starts to **reject background operations**, so that interactive users keep working. It protects people at the cost of the jobs.', 'Protect the interactive users.'],
          ['Queues', 'When no cores are free, Spark jobs wait in a **queue** whose length depends on the size of the capacity. A small capacity queues sooner. I did not quote the numbers, because the pages that I found disagree.', 'A small capacity queues sooner.']
        ],
        cols: 1
      }),

      B.cmp({
        id: 'm8-roles', t: 1, src: 'docs', title: 'The four workspace roles',
        say: 'People get access to a workspace through a role. Press Next to compare them.',
        cols: ['Role', 'Can', 'Cannot'],
        hl: 0,
        rows: [
          ['Admin', 'Everything in the workspace, including who has which role and deleting the workspace', 'Nothing inside the workspace'],
          ['Member', 'Create, edit and share content, and add people with lower roles', 'Manage the workspace as a whole'],
          ['Contributor', 'Create, edit and delete content', 'Share it, or manage who has access'],
          ['Viewer', 'See and read content', 'Change it']
        ],
        steps: [
          { upto: 2, say: 'Admin and Member run the workspace. Give them to few people.' },
          { upto: 4, say: 'Data engineers who build items need **Contributor**. Report readers need **Viewer**, or access to the report only. This is my summary of the documented roles, and the exact rights have details that the documentation lists.' }
        ]
      }),

      B.talk({
        id: 'm8-security', t: 2, src: 'docs', title: 'Who may read what',
        say: 'Roles are the coarse part. Four finer controls come up in interviews. Press Next for each.',
        items: [
          ['Item permissions', 'An item such as a lakehouse can be **shared** with a person who has no workspace role, with a chosen level of access. It is how a team gives one analyst one lakehouse.', 'Share an item, not the workspace.'],
          ['Row-level and column-level rules', 'Rules that hide rows or columns can be set in the **SQL endpoint or the Warehouse**, or in the **semantic model**. Remember mission 6: SQL-based security on the source can force a Direct Lake model to fall back.', 'Choose where the rule lives.'],
          ['OneLake access', 'OneLake has its own security features for folders and tables. They were changing while I read, so check what is generally available before you plan around them.', 'Check the current state.'],
          ['Lineage and labels', 'A governance tool such as Microsoft Purview can show lineage and apply sensitivity labels. Job posts for Fabric roles name it next to notebooks.', 'Know that it exists.']
        ],
        cols: 1
      }),

      B.talk({
        id: 'm8-git', t: 1, src: 'docs', title: 'Git integration: what is stored',
        say: 'Fabric can connect a workspace to a Git branch, so that items live in a repository like code. Press Next for each point.',
        items: [
          ['Items become folders', 'Each item is saved in a **folder** of the repository. A notebook folder contains the code as a `.py` file, and every item folder has a **`.platform`** file with its details.', 'An item is a folder.'],
          ['What `.platform` holds', 'The type of the item, its display name, a description, and a **`logicalId`**. The logical id links the item in the workspace to its files in the branch, even when the name or the folder changes.', 'The logical id is the link.'],
          ['Names and folders', 'Once a folder is created, Git integration **never changes its name**, even if you rename the item. A workspace cannot hold two items with the same logical id, although two workspaces on one branch can.', 'Folder names stay.'],
          ['Not everything is covered', 'Which item types are supported is a list that changes. The summaries that I read named notebooks, reports, mirrored databases and the real-time items, and did not confirm lakehouses or pipelines, so check the current list.', 'Check the supported items.']
        ],
        cols: 1
      }),

      B.code({
        id: 'm8-platform', t: 3, src: 'docs', title: 'The `.platform` file of a notebook', file: '.platform', lang: 'json', code: PLAT,
        steps: [
          { say: 'This is an example of the file, written from what the documentation says. It is **not an export** from Fabric, so the exact fields can differ. Press Next.', lines: null },
          { say: '`metadata` says what the item is: its **type**, its **display name** and a description.', lines: G.span(PLAT, /"metadata"/, /^  \},?$/) },
          { say: '`config` carries the **logical id**, the link between this folder and the item in a workspace. The version says which format of the file this is.', lines: G.span(PLAT, /"config"/, /^  \}$/) }
        ],
        note: 'The logical id here is all zeros, as a placeholder. A real one is generated by Fabric.'
      }),

      B.bug({
        id: 'm8-bug', t: 3, q: 'A developer duplicates a notebook folder in the repository to make a new notebook, and keeps the `.platform` file. The sync into the workspace fails. Click the line that causes it.',
        file: '.platform', lang: 'json',
        code: '{\n  "metadata": {\n    "type": "Notebook",\n    "displayName": "02_silver_copy"\n  },\n  "config": {\n    "version": "2.0",\n    "logicalId": "00000000-0000-0000-0000-000000000000"\n  }\n}\n',
        bad: [8],
        hint: 'What may a workspace hold only once?',
        why: 'The **logical id** links an item to its files, and a workspace cannot hold two items with the same one. The copy keeps the id of the original, so the two folders claim the same item. Give the copy its own id, or create it in the workspace and let Fabric write the file. This is from documentation, and I did not run the sync.',
        fix: '{\n  "metadata": {\n    "type": "Notebook",\n    "displayName": "02_silver_copy"\n  },\n  "config": {\n    "version": "2.0",\n    "logicalId": "11111111-2222-3333-4444-555555555555"\n  }\n}\n',
        cheer: 'One logical id for each item.'
      }),

      B.flow({
        id: 'm8-flow2', t: 2, src: 'docs', title: 'Development, test and production', g: 'platform', legend: false,
        steps: [
          { say: 'A team should not develop on the workspace that the business reads. Press Next.', focus: ['cap', 'ws'], cap: 'A capacity and workspaces.' },
          { say: 'Step 1. Keep **separate workspaces** for development, test and production. A notebook that is tried out in development cannot break a production table.', on: ['e1', 'e2'], focus: ['ws', 'lh'], cap: 'Separate workspaces.' },
          { say: 'Step 2. Put the **production** workspace on its own capacity, and development on a smaller one. A heavy experiment then cannot throttle the nightly pipeline, because the capacity is the shared part.', on: ['e1'], focus: ['cap'], tags: ['tg_share'], cap: 'The capacity is the shared part.' },
          { say: 'Step 3. Connect each workspace to a **Git branch** for the code, and use **deployment pipelines** to move items from one stage to the next. The details of what moves are in the documentation.', on: ['e2', 'e3', 'e4'], focus: ['ws', 'lh', 'wh', 'pl'], cap: 'Code in Git, items promoted by stage.' }
        ]
      }),

      B.quiz({
        id: 'm8-q1', t: 1, src: 'docs',
        q: 'A capacity has used 40 minutes of its future capacity. What is the stage in the documentation that I read?',
        opts: [
          { t: 'Interactive delay: interactive requests wait 20 seconds when they are submitted', fb: '' },
          { t: 'Overage protection: nothing is throttled', fb: 'That is for up to 10 minutes.' },
          { t: 'Interactive rejection', fb: 'That starts after 60 minutes.' },
          { t: 'Background rejection', fb: 'That needs more than 24 hours of overuse.' }
        ],
        ok: 0, why: 'Up to 10 minutes: overage protection. Between 10 and 60 minutes: interactive delay. Up to 24 hours: interactive rejection. Beyond that, background jobs are rejected too. Check the current page.'
      }),

      B.quiz({
        id: 'm8-q2', t: 1, src: 'docs',
        q: 'An F64 capacity gives how many Spark cores before bursting, by the documented rule of two cores for each capacity unit?',
        opts: [
          { t: '128', fb: '' },
          { t: '64', fb: 'That is the number of capacity units.' },
          { t: '384', fb: 'That is with bursting to three times.' },
          { t: '32', fb: 'It is not half of the units.' }
        ],
        ok: 0, why: '64 units times two cores is 128, and bursting allows up to three times as many: 384.'
      }),

      B.quiz({
        id: 'm8-q3', t: 1, src: 'docs',
        q: 'Which workspace role may create and edit items but not share them?',
        opts: [
          { t: 'Contributor', fb: '' },
          { t: 'Viewer', fb: 'A viewer cannot change content.' },
          { t: 'Member', fb: 'A member can also share.' },
          { t: 'Admin', fb: 'An admin can do everything.' }
        ],
        ok: 0, why: 'Contributor is the role for people who build, and it is a good default for data engineers.'
      }),

      B.order({
        id: 'm8-ord', t: 2, src: 'docs', q: 'Put the steps in order to find out why a nightly pipeline was rejected for lack of capacity.',
        items: ['Open the capacity metrics for the capacity and find the time of the rejection', 'Find the stage of throttling and the jobs that used the most units before it', 'Look at jobs from earlier hours, because background work is smoothed over 24 hours', 'Decide the fix: move or stop the heavy job, change the schedule, or size up', 'Write down the cause and add an alert for the stage that came first'],
        why: 'Time, stage, earlier jobs, fix, record. The cause is often a job that ran hours before the pipeline.'
      }),

      B.decide({
        id: 'm8-dec', t: 2, src: 'docs', title: 'Decision: one big capacity, or one for each stage?',
        scenario: 'Brewline has development, test and production workspaces. A data scientist runs large experiments in development. The nightly pipeline in production must never be rejected. The budget allows an F64 and a little more.',
        opts: [
          { t: 'A small capacity for development and test, and the F64 for production alone', d: 'A heavy experiment can only throttle development. Production has its own units, and a rejection there is a real signal.', lose: 'Idle units in production at times, and two capacities to manage and monitor.' },
          { t: 'All three workspaces on the F64', d: 'One pool, no waste, and easy to run.', lose: 'The experiment and the pipeline share units, so one can throttle the other. This is the case of the incident of mission 1.' },
          { t: 'A bigger single capacity', d: 'More units for everybody.', lose: 'It costs more and still shares the pool. A big enough experiment uses what it is given.' }
        ],
        pick: 0,
        why: 'The capacity is the shared part, so the way to protect the pipeline is not to share it with the experiments. It costs some idle units, and it makes a rejection mean something. This is from documentation and from the way that capacities work, and I did not run it.',
        when: 'A small team with light experiments can start on one capacity and watch the metrics.'
      }),

      B.incident({
        id: 'm8-inc', t: 2, src: 'docs', title: 'Incident: interactive requests are rejected on Friday evening', time: '18:40',
        alert: '**Analysts get "capacity limit" errors when they open reports, and a scheduled pipeline still runs.** At 15:00 a team started a backfill of three years of data with a large notebook. The capacity is an F64.',
        clues: ['Capacity metrics show that the capacity is in a throttling stage', 'The backfill notebook has been running for three hours', 'The nightly pipeline starts at 02:00'],
        opts: [
          { t: 'Stop or pause the backfill, let the debt be paid back, and rerun it in smaller pieces at night', fb: '' },
          { t: 'Restart the reports', fb: 'The reports are not the cause.' },
          { t: 'Double the capacity for the weekend without looking', fb: 'It may help, and it hides a job that is too big for the capacity. It also costs money.' },
          { t: 'Delete the backfill notebook', fb: 'You do not need to delete it. Stop the run and change how it runs.' }
        ],
        best: 0,
        why: 'Interactive requests are rejected when the capacity has used between 60 minutes and 24 hours of its future capacity. A three-hour backfill with burst cores is a way to get there. Background jobs are smoothed over 24 hours, so the effect lasts after the job stops. This is from documentation, and I did not run it.',
        checks: [
          ['Find the stage', 'Capacity metrics: which stage, and since when.'],
          ['Find the cause', 'A backfill that started at 15:00.'],
          ['Stop the growth', 'Stop or pause the job.'],
          ['Prevent it', 'Run backfills in pieces, off peak, and consider a surge protection limit.']
        ],
        tell: 'A large backfill used the capacity\'s future units, so it moved into the stage where interactive requests are rejected. I stopped the backfill, and I will run it again in smaller pieces at night. I will also look at surge protection so that analysts keep working next time.',
        prevent: ['Run **backfills** off peak and in pieces', 'Watch the **throttling stage**, and the average', 'Keep **experiments** off the production capacity']
      }),

      B.qa({
        id: 'qa-throttling', t: 1, tag: 'Fabric', secs: 75,
        q: 'How does throttling work in Fabric?',
        pts: ['Smoothing spreads the cost of a job', 'Future capacity is borrowed', 'Stages: 10 min free, 60 min delay, 24 h reject', 'Look at earlier jobs too'],
        short: 'Jobs use capacity units, and **smoothing** spreads their cost over time: background work over 24 hours, so a short spike does not need a capacity as large as the spike. A capacity that uses more than it has borrows from the future. In the documentation that I read through summaries, up to 10 minutes of future use is free, which is overage protection. Between 10 and 60 minutes interactive requests are delayed by 20 seconds, up to 24 hours they are rejected, and beyond that background jobs are rejected too. Because of smoothing, a big job that finished hours ago can still be the cause, so I look at earlier work in the capacity metrics. I did not run this, and I would check the thresholds on the current page.',
        fu: [['What is surge protection?', 'A limit that rejects background work early so that interactive users keep working.'], ['How do you avoid it?', 'Schedule heavy jobs off peak, separate capacities, and alerts.']],
        trap: 'Saying that a capacity simply fails when it is full.',
        real: 'Describe what you would look at first in the metrics.'
      }),

      B.qa({
        id: 'qa-cicd', t: 1, tag: 'Fabric', secs: 75,
        q: 'How do you ship a change from development to production in Fabric?',
        pts: ['Git integration for the code of items', 'Separate workspaces for each stage', 'Deployment pipelines promote items', 'Parameters differ by stage'],
        short: 'I keep **development, test and production** in separate workspaces. The development workspace is connected to a **Git branch**, so notebooks and other items are saved as folders in a repository, each with a `.platform` file that holds its type, name and a logical id. Changes are reviewed in the repository like any code. **Deployment pipelines** then promote items from one stage to the next, and settings that differ by stage, such as which lakehouse a notebook is attached to, are set per stage. I check which item types Git integration and deployment pipelines support at the moment, because that list changes. This is from documentation. I ran the notebooks on Spark, and I did not run Git integration.',
        fu: [['What is the logical id for?', 'It links an item to its files, even after a rename.'], ['Can you test a notebook outside Fabric?', 'The Spark code can be tested on local Spark, as I did.']],
        trap: 'Editing production directly.',
        real: 'Describe your review and release steps.'
      }),

      B.qa({
        id: 'qa-roles', t: 1, tag: 'Fabric', secs: 60,
        q: 'How do you control who can see what in Fabric?',
        pts: ['Workspace roles: admin, member, contributor, viewer', 'Share single items', 'Row and column rules in SQL or the model', 'Mind the Direct Lake fallback'],
        short: 'In layers. The coarse layer is the **workspace role**: Admin, Member, Contributor and Viewer, where engineers who build usually need Contributor and readers need Viewer or access to a single report. Then I can **share an item**, such as one lakehouse, with a person who has no role. For rows and columns there are rules in the **SQL endpoint or Warehouse** and in the **semantic model**, and I choose where the rule lives, because SQL-based security on the source can make a Direct Lake model fall back to DirectQuery. OneLake has its own security features that were changing, so I check what is generally available. Governance tools such as Purview add lineage and labels. This is from documentation.',
        fu: [['Who should be admin?', 'Few people.'], ['Where do you put a row rule?', 'Where it does not cause a fallback, usually in the model.']],
        trap: 'Making everyone a member.',
        real: 'Say how you would give one analyst access to one table.'
      }),

      B.qa({
        id: 'qa-cost', t: 2, tag: 'Fabric', secs: 60,
        q: 'How do you keep a Fabric bill and a capacity under control?',
        pts: ['Right-size, and separate production', 'Schedule heavy jobs off peak', 'Maintain tables so queries read less', 'Watch the capacity metrics'],
        short: 'The cost is the capacity, so I treat units as the thing to manage. I size the capacity from the metrics and not from a guess, keep production on its own capacity so that experiments cannot throttle it, and schedule heavy jobs and backfills off peak and in pieces. I also reduce the work itself: tables that are compacted and partitioned only when it pays make queries read fewer files, and a merge with a condition and a filtered source writes less. In my recording a filtered merge rewrote no files on a repeat, while the same merge without a condition rewrote four and filled the change feed. F capacities are Azure resources that can be paused and resized, from documentation, and I would check the current rules.',
        fu: [['Can you pause a capacity?', 'F SKUs can be paused. Check what happens to running items.'], ['What is the first metric?', 'The throttling stage and the jobs that used the most units.']],
        trap: 'Buying a bigger capacity to fix a slow job.',
        real: 'Describe a job that you made cheaper.'
      }),

      B.recap({
        id: 'm8-recap', n: 8, badge: 'Capacity Steward', color: '#99F6E4',
        pts: [
          '**Smoothing** spreads a job over time: background work over **24 hours**. A capacity borrows from the future.',
          'Stages: **10 minutes** free, to **60** interactive delay, to **24 hours** interactive rejection, then background rejection. From documentation.',
          'One unit is **two Spark cores**. F64 gives 128 cores, and 384 with bursting.',
          'Roles: **Admin, Member, Contributor, Viewer**. A row rule on the source can make Direct Lake fall back.',
          'Git integration saves items as folders with a **`.platform`** file and a **logical id**. Keep a **separate capacity** for production.'
        ],
        lines: [
          'I can read a throttling stage and say what to do.',
          'I can describe how a change gets to production.',
          'I can keep production safe from experiments.'
        ]
      })
    ]
  });
})();
