/* Mission 12: Azure Databricks. Identity with Entra ID, storage access through an access connector, secrets in Key Vault, and a private network.
   Every screen comes from documentation: nothing ran on Azure. The Python and SQL are checked for syntax in the verification step, and the CLI commands are
   marked as examples to check with --help. */
(function () {
  var B = LAB.b, G = LAB.get;

  var AZ = [
    '# a storage account with a hierarchical namespace, which makes it ADLS Gen2',
    'az storage account create \\',
    '  --resource-group rg-brewline --name brewlinelake --location westeurope \\',
    '  --sku Standard_LRS --kind StorageV2 --enable-hierarchical-namespace true',
    '',
    '# let the identity of the access connector read and write blobs in that account',
    'az role assignment create \\',
    '  --assignee-object-id <object id of the access connector identity> \\',
    '  --assignee-principal-type ServicePrincipal \\',
    '  --role "Storage Blob Data Contributor" \\',
    '  --scope /subscriptions/<subscription id>/resourceGroups/rg-brewline/providers/Microsoft.Storage/storageAccounts/brewlinelake'
  ].join('\n');

  var SCOPE_CLI = [
    'databricks secrets create-scope --scope kv-brewline \\',
    '  --scope-backend-type AZURE_KEYVAULT \\',
    '  --resource-id /subscriptions/<subscription id>/resourceGroups/rg-brewline/providers/Microsoft.KeyVault/vaults/kv-brewline \\',
    '  --dns-name https://kv-brewline.vault.azure.net/'
  ].join('\n');

  var JDBC = [
    'password = dbutils.secrets.get(scope="kv-brewline", key="orders-db-password")',
    '',
    'orders = (spark.read.format("jdbc")',
    '    .option("url", "jdbc:sqlserver://orders-db.example.net:1433;database=orders")',
    '    .option("dbtable", "dbo.orders")',
    '    .option("user", "svc_brewline")',
    '    .option("password", password)',
    '    .load())'
  ].join('\n');

  var BUG = [
    'password = "Br3w-2026-Latte!"',
    '',
    'orders = (spark.read.format("jdbc")',
    '    .option("url", "jdbc:sqlserver://orders-db.example.net:1433;database=orders")',
    '    .option("dbtable", "dbo.orders")',
    '    .option("user", "svc_brewline")',
    '    .option("password", password)',
    '    .load())'
  ].join('\n');

  LAB.addChapter({
    id: 'm12', n: 12, title: 'Azure: identity, storage and network', short: 'Azure', blurb: 'Entra ID, the access connector, Key Vault and a private network', minutes: 40,
    focus: ['sf'],
    goals: [
      'Draw how **Entra ID**, the **access connector**, **ADLS Gen2**, **Key Vault** and the **virtual network** meet at a workspace.',
      'Put the **storage access setup** in order and say what each layer checks.',
      'Read a secret from a **Key Vault-backed scope** and keep it out of code.',
      'Choose between **automatic identity management** and **SCIM**, and between the kinds of **service principal**.',
      'Describe **VNet injection, secure cluster connectivity and Private Link**, and when to use them.'
    ],
    say: 'Mission 12 is the Azure side of Azure Databricks: who may sign in, how the platform reaches your storage without a password, where secrets live, and how the network is closed. Everything here comes from documentation and nothing ran on Azure, so every screen carries the blue tag. Some pages disagree with each other, or with older articles. Where that matters I say so, and the verification notes in the README list the pages I used.',
    scenes: [
      B.talk({
        id: 'm12-talk', t: 1, src: 'docs', title: 'The Azure pieces around a workspace',
        say: 'An Azure Databricks workspace is an Azure resource, and it uses other Azure services. Press Next for each piece.',
        items: [
          ['Microsoft Entra ID', 'The identity service. People sign in with their company account, and groups come from Entra ID. Service principals, the identities of programs, also live there.', 'Who you are.'],
          ['The workspace and its managed resource group', 'Creating a workspace also creates a **managed resource group**. When a classic cluster runs, its virtual machines, disks, IP addresses and network interfaces appear in that group, and they show up on your Azure bill.', 'Where the VMs appear.'],
          ['ADLS Gen2', 'Your data. An Azure storage account with a hierarchical namespace, which lets folders and permissions work like a file system. Delta tables are files here.', 'Where the tables live.'],
          ['The access connector', 'An Azure resource that holds a **managed identity** for Databricks. Unity Catalog uses that identity to read and write your storage, so no storage key or password exists anywhere.', 'The identity for storage access.'],
          ['Key Vault', 'Secrets such as the password of the orders database. A **Key Vault-backed secret scope** lets code read them, and the values never appear in the notebook.', 'Where secrets live.'],
          ['The virtual network', 'Classic compute can run in your own network, with no public IP addresses, and Private Link can keep traffic off the public internet.', 'Where the traffic flows.']
        ],
        cols: 2
      }),

      B.flow({
        id: 'm12-flow', t: 1, src: 'docs', title: 'How the pieces connect', g: 'azure', legend: true,
        steps: [
          { say: 'Here are the pieces around one workspace. The workspace runs its clusters inside your virtual network. Press Next to follow the five connections.', cap: 'Five arrows, one workspace.' },
          { say: 'Step 1. People and groups come from **Microsoft Entra ID**. Azure Databricks recommends **automatic identity management**, which mirrors Entra ID users, groups and service principals into the Databricks account, so a group change in Entra ID reaches Databricks without a sync job.', on: ['z1'], focus: ['ent', 'ws'], cap: 'One source of identity.' },
          { say: 'Step 2. Secrets sit in **Key Vault**. A secret scope that points at the vault lets code read a secret with `dbutils.secrets.get`. The workspace never keeps a copy.', on: ['z2'], focus: ['kv', 'ws'], cap: 'The password stays in the vault.' },
          { say: 'Step 3. For storage, Unity Catalog uses the **access connector** of the workspace. The connector is an Azure resource with a managed identity.', on: ['z3'], focus: ['ws', 'ac'], cap: 'A managed identity, not a key.' },
          { say: 'Step 4. The identity of the connector holds a role on the storage account, for example Storage Blob Data Contributor. This is the only place where the permission to touch the files is granted.', on: ['z4'], focus: ['ac', 'adl'], cap: 'One role assignment on the storage account.' },
          { say: 'Step 5. **Private endpoints** keep the traffic between the workspace, the compute and the storage on private addresses. This is Azure Private Link.', on: ['z5'], focus: ['ws', 'pl'], keepGroups: true, cap: 'Traffic on the private network.' },
          { say: 'Two more controls sit at the edge. An **IP access list** limits which addresses can reach the workspace. A **customer-managed key** lets you control the encryption key for some data. Check the documentation for which data the key covers.', focus: ['ipa', 'cmk'], keepGroups: true, cap: 'Optional, and common in regulated companies.' }
        ]
      }),

      B.order({
        id: 'm12-ord', t: 1, q: 'Put the storage access setup for Unity Catalog in order.',
        items: [
          'Create the ADLS Gen2 storage account, with the hierarchical namespace enabled',
          'Create an access connector for Azure Databricks, which holds a managed identity',
          'Give the identity of the access connector a role, such as Storage Blob Data Contributor, on the storage account',
          'In Unity Catalog, create a storage credential that uses the access connector',
          'Create an external location from a storage path and that credential',
          'Grant privileges on the external location to the groups and service principals that need them'
        ],
        why: 'Storage first, identity second, permission third, then the Unity Catalog objects on top, and finally the grants to people. If the role assignment is missing, the credential may be created but every read fails with a permission error. The hierarchical namespace cannot be added to a storage account later, so decide it when you create the account.'
      }),

      B.code({
        id: 'm12-az', t: 2, src: 'docs', title: 'The Azure side of the storage access', file: 'terminal', lang: 'bash', code: AZ,
        steps: [
          { say: 'These two commands cover the Azure part. I did not run them. They follow the documentation, and I advise running each with `--help` to check the flags of your CLI version.', lines: null },
          { say: 'A storage account becomes **ADLS Gen2** when the hierarchical namespace is enabled. Do it at creation.', lines: [1, 4] },
          { say: 'A **role assignment** gives the identity of the access connector the right to read and write blobs. The scope is the storage account. A narrower scope, such as one container, is possible.', lines: [6, 11] }
        ],
        note: 'The connector is created in the portal or with the CLI or Terraform, and its identity has an object id that you use as the assignee. The Unity Catalog steps that follow, the storage credential and the external location, are in mission 7. One more limit from the documentation: immutability (WORM) policies are not supported on the containers of an external location.'
      }),

      B.cmp({
        id: 'm12-roles', t: 2, src: 'docs', title: 'Who needs which permission',
        say: 'Three layers check access to a path, and each has its own owner. Press Next to read them.',
        cols: ['Layer', 'Who or what it checks', 'Where you set it'],
        hl: 2,
        rows: [
          ['Azure role assignment', 'The identity of the access connector may read and write blobs in the storage account.', 'Azure, on the storage account.'],
          ['Unity Catalog storage credential and external location', 'Which path the platform may reach with that identity, and who may use the location.', 'Unity Catalog: the credential, the location, and grants on the location.'],
          ['Unity Catalog table privileges', 'Which group may select or modify which table.', 'Unity Catalog grants: `USE CATALOG`, `USE SCHEMA`, `SELECT`, `MODIFY`.']
        ],
        steps: [
          { upto: 1, say: 'The Azure role is the outer wall. Without it, nothing works, whatever Unity Catalog says.' },
          { upto: 2, say: 'The external location decides what the platform may do with the path. Engineers and analysts do not get a storage role of their own.' },
          { upto: 3, say: 'Table privileges are the inner layer that people meet. Mission 7 covered them.' }
        ],
        pick: 'Give **no person** a role on the storage account for daily work. **Only the access connector** holds it. People reach data through Unity Catalog, so every access is checked and logged.'
      }),

      B.quiz({
        id: 'm12-q1', t: 1,
        q: 'Which Azure resource lets Unity Catalog read and write ADLS Gen2 without a stored password or key?',
        opts: [
          { t: 'An access connector for Azure Databricks, with a managed identity that holds a role on the storage account', fb: '' },
          { t: 'A storage account key in a Databricks notebook', fb: 'A key gives full access, sits in code and cannot be limited to a path.' },
          { t: 'A shared access signature in the cluster configuration', fb: 'It expires, it is a secret that must be stored somewhere, and it does not use Unity Catalog.' },
          { t: 'The personal Microsoft account of the admin', fb: 'The data platform would depend on one person.' }
        ],
        ok: 0, why: 'The access connector is an Azure resource whose managed identity Unity Catalog uses. You grant that identity a role on the storage account, so no key or password exists.'
      }),

      B.code({
        id: 'm12-secret', t: 1, src: 'docs', title: 'Read a secret from Key Vault', file: 'read_orders.py', lang: 'python', code: JDBC,
        steps: [
          { say: 'The orders database needs a password. It sits in Key Vault, and a secret scope called `kv-brewline` points at that vault.', lines: null },
          { say: '`dbutils.secrets.get` returns the secret as a string. If you print it in a notebook, the output shows `[REDACTED]`, not the value.', lines: [1, 1] },
          { say: 'The JDBC read uses the value as an option. The password is never written in the file, in Git or in the job definition.', lines: [3, 8] }
        ],
        note: 'The scope grants read access to every secret in the vault, to the people you give access to the scope. The documentation advises separate vaults to separate secrets by sensitivity. The `dbutils` object exists inside Databricks only, so unit tests pass the password as an argument.'
      }),

      B.code({
        id: 'm12-scope', t: 2, src: 'docs', title: 'Create the Key Vault-backed scope', file: 'terminal', lang: 'bash', code: SCOPE_CLI,
        steps: [
          { say: 'A **Key Vault-backed secret scope** is a Databricks name that points at a vault. You create it once. This is the CLI form from the documentation, and I did not run it.', lines: null },
          { say: 'The scope type is `AZURE_KEYVAULT`. You give the Azure resource id and the DNS name of the vault.', lines: [1, 4] }
        ],
        note: 'What the documentation says about creating it: you need the Key Vault Contributor, Contributor or Owner role on the vault, and creating the scope grants Get and List to the Azure Databricks service through a vault access policy. The command needs an Entra ID token of a user or a service principal, not a personal access token. The sources disagree on whether a vault that uses Azure RBAC works, so test it in your tenant before you plan around it.'
      }),

      B.bug({
        id: 'm12-bug', t: 1, q: 'A teammate\'s notebook reads the orders database and works. It will fail a security review. Click the line that is wrong.',
        file: 'read_orders_bad.py', lang: 'python', code: BUG, bad: [G.at(BUG, /^password = /)],
        hint: 'Look at where the password comes from.',
        why: 'The password is written in the code. It will end up in Git, in the notebook history and in every copy. Read it from a Key Vault-backed secret scope with `dbutils.secrets.get`, as in the earlier screen, and rotate the old password, because it is already exposed.',
        fix: JDBC,
        cheer: 'Finding a hard-coded secret is the first check of every review.'
      }),

      B.cmp({
        id: 'm12-identity', t: 2, src: 'docs', title: 'Identities on Azure Databricks',
        say: 'Several terms sound alike. Press Next to separate them. This follows the Microsoft documentation.',
        cols: ['Option', 'What it is', 'Use it for'],
        hl: 2,
        rows: [
          ['Automatic identity management', 'The account mirrors Entra ID users, groups, nested groups and service principals. No Entra ID application is needed. It is the recommended way, and it is on by default for accounts created after 1 August 2025.', 'Every new setup.'],
          ['SCIM provisioning', 'An older sync through a separate Entra ID application and the Cloud Application Administrator role.', 'Cases the new way does not cover, such as directories in another tenant. Do not mix it with the first option.'],
          ['Databricks-managed service principal', 'An identity that you create inside Databricks.', 'Jobs and CI that do not need Azure resources.'],
          ['Entra ID-managed service principal', 'An Entra ID application registered as a principal. The account creates it when it is first used.', 'Jobs and CI that also call Azure services.'],
          ['Azure managed identity', 'An identity of an Azure resource, with no credential to manage. Databricks treats it as a service principal.', 'Code that runs on Azure and signs in to Databricks.']
        ],
        steps: [
          { upto: 2, say: 'Start with automatic identity management for people and groups. It removes a sync job.' },
          { upto: 4, say: 'Pick the kind of service principal by what it must reach. Databricks recommends OAuth tokens for service principals whenever possible.' },
          { upto: 5, say: 'A managed identity removes the last credential, when the caller itself runs on Azure.' }
        ],
        pick: 'Use **automatic identity management** for people. Use **service principals with OAuth or federation** for jobs and CI. Avoid **personal access tokens** in automation, and note that a manually created Entra ID token expires within an hour.'
      }),

      B.cmp({
        id: 'm12-network', t: 2, src: 'docs', title: 'Closing the network',
        say: 'Each network control protects a different path. Press Next to read them. The advice comes from the Microsoft documentation of the network features.',
        cols: ['Control', 'What it does', 'Notes from the documentation'],
        hl: 2,
        rows: [
          ['VNet injection', 'Classic compute runs in a virtual network that you own and manage.', 'The network needs two subnets for the workspace, a host (public) and a container (private) subnet, delegated to Microsoft.Databricks/workspaces. The address ranges cannot be changed after deployment.'],
          ['Secure cluster connectivity', 'Cluster nodes get no public IP addresses.', 'Back-end Private Link needs it.'],
          ['Back-end Private Link', 'Compute in your network reaches the control plane over a private endpoint.', 'The workspace network needs a third subnet for the private endpoints.'],
          ['Front-end Private Link', 'People and tools reach the workspace through a private endpoint.', 'Often combined with an IP access list or a transit network.'],
          ['IP access list', 'Only listed address ranges may reach the workspace.', 'A simple first control, with no network redesign.'],
          ['Storage private endpoints and firewall', 'The storage account accepts traffic only from your network.', 'Serverless compute needs its own way in, through a network connectivity configuration. Check the documentation for the current options.']
        ],
        steps: [
          { upto: 2, say: 'VNet injection and secure cluster connectivity are the base: your network, no public addresses on the nodes.' },
          { upto: 4, say: 'Private Link closes the two doors of the control plane: the one the compute uses, and the one people use.' },
          { upto: 6, say: 'An IP list is the light version of a closed front door. The storage firewall closes the data. Each closed door must be opened for the compute that needs it.' }
        ],
        pick: 'For a **regulated company**, plan VNet injection, secure cluster connectivity, Private Link on both sides, and a storage firewall with private endpoints, and test serverless access early. For a **small team** without such a rule, an IP access list may be enough.'
      }),

      B.quiz({
        id: 'm12-q2', t: 2,
        q: 'The security team wants cluster nodes to have no public IP addresses and the compute to reach the Databricks control plane privately. Which two settings do you plan?',
        opts: [
          { t: 'Secure cluster connectivity, and back-end Private Link', fb: '' },
          { t: 'An IP access list, and a customer-managed key', fb: 'Both are useful controls. Neither removes public addresses from nodes or makes the compute-to-control-plane traffic private.' },
          { t: 'Front-end Private Link, and a cluster policy', fb: 'Front-end Private Link is for people reaching the workspace. It does not remove public IPs from the nodes.' },
          { t: 'A Key Vault-backed scope, and an access connector', fb: 'They protect secrets and storage access. They do not change how nodes connect.' }
        ],
        ok: 0, why: 'Secure cluster connectivity removes public IP addresses from the nodes. Back-end Private Link, which needs secure cluster connectivity, carries the compute-to-control-plane connection over a private endpoint.'
      }),

      B.decide({
        id: 'm12-dec', t: 2, src: 'docs', title: 'Decision: how closed should the network be?',
        scenario: 'Brewline will process **customer emails and payment references**. The auditor asks that **no data traffic crosses the public internet** and that the workspace is **reachable only from the office network and the VPN**. The team has **one platform engineer**.',
        opts: [
          { t: 'The default network with an IP access list', d: 'Quick. Only office and VPN ranges can open the workspace.', lose: 'It limits who reaches the front door. The compute and storage traffic still uses public addresses, so it does not meet the auditor\'s first requirement.' },
          { t: 'VNet injection with secure cluster connectivity, Private Link, and a storage firewall with private endpoints', d: 'The full private design.' },
          { t: 'Only a storage firewall', d: 'Close the data first.', lose: 'The workspace stays open to the internet and the compute keeps public addresses. It helps, but it meets neither requirement alone.' }
        ],
        pick: 1,
        why: 'The two requirements need private paths for data and a closed front door, and the full design covers both. Add an IP access list or front-end Private Link for the office-and-VPN rule. One platform engineer can run it if the network is defined in code, so build it with Terraform or Bicep and test serverless access early.',
        when: 'A team without a compliance rule can start with an IP access list and add the rest when a requirement arrives. Retrofitting VNet injection later means moving the workspace, so ask early.'
      }),

      B.incident({
        id: 'm12-inc', t: 2, src: 'docs', title: 'Incident: jobs fail on storage after a firewall change', time: '08:20',
        alert: '**Every job that reads the landing folder fails with a 403 authorization error from the storage account.** Yesterday the security team switched the storage account firewall to "selected networks". Nothing in the code changed. Classic jobs that run in the injected network still work. Serverless jobs and SQL warehouse queries fail.',
        clues: ['The storage account firewall now allows only selected networks', 'Classic compute runs in a subnet that is allowed', 'Serverless compute runs in the Databricks account, outside your network'],
        opts: [
          { t: 'Give serverless compute a path to the storage account: a network connectivity configuration with a private endpoint rule, as the documentation describes, and have the endpoint approved on the storage account', fb: '' },
          { t: 'Turn the firewall off again', fb: 'It undoes the control that security asked for, and the next audit finds it.' },
          { t: 'Give the access connector the Owner role on the subscription', fb: 'The error is about the network path, not about the role. A role cannot open a firewall, and Owner would be far too much.' },
          { t: 'Move every job to classic compute', fb: 'It hides the problem for jobs and leaves SQL warehouses and notebooks broken. It also raises cost.' }
        ],
        best: 0,
        why: 'Classic compute still works because its subnet is allowed by the firewall. Serverless compute comes from the Databricks account, so the firewall does not know it. The documentation describes a network connectivity configuration with private endpoint rules for that case. After you approve the endpoint on the storage account, serverless reads work again.',
        checks: [
          ['Read the error', 'A 403 from the storage account with a network message, not a role message.'],
          ['Compare the compute types', 'Classic works, serverless fails. The difference is where the compute runs.'],
          ['Ask what changed', 'The storage firewall. Date and owner are in the Azure activity log.'],
          ['Open the right path', 'Create a network connectivity configuration with a private endpoint rule to the storage account, and approve the endpoint.'],
          ['Test and document', 'Rerun a serverless job and a SQL query, and add the step to the firewall change checklist.']
        ],
        tell: 'Serverless jobs and SQL queries began to fail with a 403 from the storage account right after security changed the firewall to selected networks, while classic jobs in our own subnet kept working. That pointed at the network path, not at the identity: serverless compute runs outside our network, so the firewall did not know it. I set up a network connectivity configuration with a private endpoint rule to the storage account, the security team approved the endpoint, and the jobs ran again. We added serverless access to the checklist for firewall changes.',
        prevent: ['A **checklist** for storage firewall changes that names each compute type', '**Test serverless access** in dev before the change reaches production', 'Define the network **in code**, so a change is reviewed', 'Alert on **403 spikes** from the storage account']
      }),

      B.qa({
        id: 'qa-azure-id', t: 2, tag: 'Azure', secs: 90,
        q: 'How do you manage identities and access on Azure Databricks?',
        pts: ['Entra ID is the source: automatic identity management mirrors users, groups and service principals', 'Grant to groups, in Unity Catalog', 'Service principals for jobs and CI, with OAuth or federation', 'Managed identities where the caller runs on Azure', 'No personal access tokens in automation', 'Audit with the system tables'],
        short: 'Entra ID is the source of identity. I use automatic identity management, which Microsoft recommends, so users, groups and service principals are mirrored into the Databricks account without a separate sync. I do not mix it with SCIM, because the same identity could appear twice.\n\nAccess is granted to groups in Unity Catalog, not to people. Jobs and CI run as service principals. I prefer OAuth tokens or federation to personal access tokens, and a managed identity when the caller itself runs on Azure, because then there is no credential to rotate. I know that a manually created Entra ID token expires within an hour, so I do not use one in automation.\n\nFor storage, only the access connector holds a role on the storage account. People reach data through Unity Catalog, and I review the audit system tables for grant changes. I describe this from the documentation.',
        fu: [
          ['What is the difference between the two kinds of service principal?', 'A Databricks-managed one lives only in Databricks. An Entra ID-managed one is an Entra ID application, so it can also call Azure services.'],
          ['When do you still need SCIM?', 'For directories the new feature does not cover, such as another tenant. Check the documentation for the current limits.']
        ],
        trap: 'Saying "I use a personal access token for the pipeline". It ties the pipeline to a person.',
        real: 'Describe how your team provisions groups and which identity runs your production jobs.'
      }),

      B.qa({
        id: 'qa-storage', t: 2, tag: 'Azure', secs: 90,
        q: 'How does Unity Catalog reach ADLS Gen2 on Azure without storing keys, and what can go wrong?',
        pts: ['Access connector with a managed identity', 'Role assignment on the storage account for that identity', 'Storage credential, then external location, then grants', 'Hierarchical namespace on the account', 'Failures: missing role, firewall, wrong path', 'Immutability policies are not supported on external location containers'],
        short: 'I use an access connector for Azure Databricks, an Azure resource with a managed identity. I give that identity a role, such as Storage Blob Data Contributor, on the storage account. In Unity Catalog I create a storage credential that uses the connector, an external location from a path and the credential, and then I grant privileges on the location to groups. No key or password exists anywhere. The account needs the hierarchical namespace, which makes it ADLS Gen2.\n\nWhen it fails, I check three things in this order. Is the role assignment there? A missing role gives an authorization error even though the credential exists. Is the storage firewall open for the compute, classic and serverless? Is the path inside the external location? The documentation also lists limits, for example that immutability policies are not supported on the containers of an external location.\n\nI only know this from the documentation, so before a rollout I test a read and a write with each type of compute.',
        fu: [
          ['Why not use a storage account key?', 'It gives full access to the account, it is a secret to store and rotate, and Unity Catalog cannot limit it to a path.'],
          ['Who needs a role on the storage account?', 'Only the identity of the access connector. People use Unity Catalog grants.']
        ],
        trap: 'Skipping the role assignment in the explanation. It is the step that most often goes missing.',
        real: 'Describe a permission error on storage that you diagnosed, and the layer that caused it.'
      }),

      B.qa({
        id: 'qa-secure', t: 2, tag: 'Azure', secs: 90,
        q: 'How would you secure an Azure Databricks workspace for a regulated company?',
        pts: ['Identity: Entra ID, groups, service principals, no personal tokens', 'Data: Unity Catalog grants, masks, storage only through the access connector', 'Network: VNet injection, secure cluster connectivity, Private Link, storage firewall', 'Secrets in Key Vault, not in code', 'Audit and lineage through system tables', 'Test serverless and every compute path'],
        short: 'I think in four layers. Identity: Entra ID is the source, access goes to groups, and jobs run as service principals with no personal tokens. Data: Unity Catalog grants, column masks for personal data, and storage reached only through the access connector, so nobody holds a storage key.\n\nNetwork: VNet injection and secure cluster connectivity so nodes have no public addresses, Private Link for the compute-to-control-plane path and for user access, and a storage firewall with private endpoints. I would test serverless compute early, because it needs its own path to a firewalled storage account.\n\nSecrets live in Key Vault, behind a secret scope, and never in code. For audit I use the system tables for access and lineage, and I alert on changes to grants.\n\nI would define all of it in code, with Terraform or Bicep, so every change is reviewed. I know these features from the documentation, and I would test them in a dev environment first.',
        fu: [
          ['What about encryption?', 'Storage is encrypted by Azure by default. A customer-managed key is an option for some data, and the documentation lists which. Check it against the audit requirement.'],
          ['What is the first control you add?', 'Identity and grants, because they cost nothing and protect everything. Then the network.']
        ],
        trap: 'Naming only the network. Most data leaks come from over-broad grants and stored secrets.',
        real: 'Describe a control your team added after an audit finding, and how you tested it.'
      }),

      B.recap({
        id: 'm12-recap', n: 12, badge: 'Azure Guardian', color: '#BAE6FD',
        pts: [
          '**Entra ID** is the source of identity. Use **automatic identity management**, groups and **service principals**.',
          'Storage access: **ADLS Gen2**, an **access connector**, a **role** on the storage account, a **storage credential**, an **external location**, then grants.',
          'Only the **access connector** holds a role on the storage. People use Unity Catalog.',
          'Secrets live in **Key Vault**, read with `dbutils.secrets.get`. Never write a password in code.',
          '**VNet injection** and **secure cluster connectivity** keep nodes private. **Private Link** closes the control plane paths.',
          'A **storage firewall** needs a path for **serverless** compute too.'
        ],
        lines: [
          'I give the storage role to the access connector, not to people.',
          'I keep secrets in Key Vault and out of code.',
          'I test serverless access before a firewall change.'
        ]
      })
    ]
  });
})();
