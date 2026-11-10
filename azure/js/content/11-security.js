/* Mission 11: security. Key Vault, encryption and keys, private networks, and protection of columns, with monitoring.
   Recorded: envelope encryption with the cryptography library (AES-GCM for the data, the AES key wrap for the data key), which is the mechanism behind
   customer-managed keys, and a syntax check of the KQL with the Kusto language service of Microsoft. The Key Vault client calls were checked against the
   installed azure-keyvault-secrets library. Everything about the services, their settings and their limits comes from the Azure documentation, and
   nothing here ran on Azure. The Bicep was not compiled, because the Bicep program could not be run in the sandbox. */
(function () {
  var B = LAB.b, G = LAB.get;
  var EN = G.counts('security.envelope'), ENV_OUT = G.text('security.envelope_output'), ENV = G.file('security/envelope.py'), KS = G.counts('kql.security');
  function n0(n) { return Number(n).toLocaleString('en-US'); }
  var FP = ENV_OUT.match(/(?:before|after) rotation:\s+([0-9a-f]{16})/g).map(function (x) { return x.split(/\s+/).pop(); });

  G.expect(EN.plaintext_bytes === 1045000 && EN.ciphertext_bytes === 1045016 && EN.tag_bytes === 16 && EN.data_key_bytes === 32 && EN.wrapped_key_bytes === 40, 'a 1,045,000 byte file encrypts to 1,045,016 bytes, and a 32 byte key wraps to 40 bytes');
  G.expect(EN.wrapped_key_changed === true && EN.decrypts_after_rotation === true && EN.old_key_cannot_unwrap === true && EN.destroyed_key_cannot_unwrap === true && FP.length === 2 && FP[0] === FP[1], 'rotation changes the wrapped key and not the data, the data still decrypts, and an old or destroyed key cannot unwrap');
  G.expect(KS.storage_403.valid === true && KS.challenge.valid === true && KS.storage_403.errors.length === 0, 'both security queries pass the KQL syntax check');
  G.expect(G.meta('azure-keyvault-secrets') && G.meta('cryptography'), 'the versions of the libraries are recorded');

  var KV = [
    'from azure.identity import DefaultAzureCredential',
    'from azure.keyvault.secrets import SecretClient',
    '',
    'client = SecretClient(',
    '    vault_url="https://kv-brewline-prod.vault.azure.net",',
    '    credential=DefaultAzureCredential(),',
    ')',
    '',
    'password = client.get_secret("orders-db-password").value     # read once, when the job starts',
    '# use it to connect. Never print it, never log it, never put it in a message.'
  ].join('\n');

  var BICEP = [
    "resource lake 'Microsoft.Storage/storageAccounts@2023-01-01' = {",
    "  name: 'stbrewlinelakeprod'",
    "  location: 'westeurope'",
    "  kind: 'StorageV2'",
    "  sku: { name: 'Standard_ZRS' }",
    '  properties: {',
    '    isHnsEnabled: true',
    '    supportsHttpsTrafficOnly: true',
    "    minimumTlsVersion: 'TLS1_2'",
    '    allowBlobPublicAccess: false',
    '    allowSharedKeyAccess: false',
    "    publicNetworkAccess: 'Disabled'",
    '  }',
    '}'
  ].join('\n');

  var KQL = [
    'StorageBlobLogs',
    '| where TimeGenerated > ago(1d) and StatusCode == 403',
    '| summarize attempts = count() by CallerIpAddress, AuthenticationType',
    '| top 10 by attempts desc'
  ].join('\n');

  var BUG_PRINT = [
    'password = client.get_secret("orders-db-password").value',
    'print(f"connecting with password {password}")',
    'connection = connect(host, user, password)'
  ].join('\n');
  var FIX_PRINT = BUG_PRINT.replace('print(f"connecting with password {password}")', 'print("connecting to the orders database")');

  var BUG_NET = [
    "resource lake 'Microsoft.Storage/storageAccounts@2023-01-01' = {",
    "  name: 'stbrewlinelakeprod'",
    "  location: 'westeurope'",
    "  kind: 'StorageV2'",
    "  sku: { name: 'Standard_ZRS' }",
    '  properties: {',
    '    isHnsEnabled: true',
    "    minimumTlsVersion: 'TLS1_2'",
    '    networkAcls: {',
    "      defaultAction: 'Allow'",
    '    }',
    '  }',
    '}'
  ].join('\n');
  var FIX_NET = BUG_NET.replace("defaultAction: 'Allow'", "defaultAction: 'Deny'");

  var LOGS = [
    ['08:01', 'GetBlob', '200', '10.0.1.4'], ['08:03', 'GetBlob', '403', '203.0.113.9'], ['08:03', 'ListBlobs', '403', '203.0.113.9'], ['08:04', 'PutBlob', '201', '10.0.1.5'],
    ['08:05', 'GetBlob', '403', '198.51.100.7'], ['08:07', 'GetBlob', '403', '203.0.113.9'], ['08:09', 'GetBlob', '200', '10.0.1.4'], ['08:10', 'GetBlob', '403', '192.0.2.44'],
    ['08:11', 'ListBlobs', '403', '203.0.113.9'], ['08:12', 'GetBlob', '404', '10.0.1.4'], ['08:13', 'GetBlob', '403', '198.51.100.7']
  ];
  var CH_KQL = [
    'StorageBlobLogs',
    '| where StatusCode == 403',
    '| summarize attempts = count() by CallerIpAddress',
    '| top 3 by attempts desc'
  ].join('\n');
  var CH_COUNT = {};
  LOGS.filter(function (r) { return r[2] === '403'; }).forEach(function (r) { CH_COUNT[r[3]] = (CH_COUNT[r[3]] || 0) + 1; });
  var CH_ROWS = Object.keys(CH_COUNT).map(function (ip) { return [ip, CH_COUNT[ip]]; }).sort(function (a, b) { return b[1] - a[1]; }).slice(0, 3);
  G.expect(CH_ROWS.map(function (r) { return r[1]; }).join() === '4,2,1' && CH_ROWS[0][0] === '203.0.113.9', 'the sample log gives 4, 2 and 1 refusals for three callers');

  LAB.addChapter({
    id: 'm11', n: 11, title: 'Security for the data platform', short: 'Security', blurb: 'Key Vault, encryption and keys, private endpoints and DNS, protecting columns, and watching for misuse', minutes: 50,
    focus: ['qual', 'sf', 'mon'],
    goals: [
      'Keep secrets in **Key Vault**, read them with a **managed identity**, and recover from a deletion.',
      'Explain **envelope encryption**, and what rotating or destroying a **customer-managed key** does.',
      'Close the network with **private endpoints**, **private DNS** and a switched-off public door.',
      'Say how **Data Factory, Synapse, Functions and Spark** reach private resources.',
      'Protect **columns and rows** with masking, row filters and labels.',
      'Watch for misuse with **diagnostic logs and KQL**.'
    ],
    say: 'Mission 11 is the part that people skip until a review. I recorded what I could on a laptop: envelope encryption with a real crypto library, which is the mechanism behind a customer-managed key, and a syntax check of the KQL that watches for misuse. The settings and behavior of Key Vault, private endpoints and the rest come from the documentation, and the screens say so. One more warning: I could not compile the Bicep here.',
    scenes: [
      B.flow({
        id: 'm11-flow', t: 1, src: 'docs', title: 'A closed network for data jobs', g: 'net', legend: true,
        steps: [
          { say: 'Closing the network means that data and secrets can be reached only from inside, and that everything leaving goes through a door that you can see. Press Next to build it up.', cap: 'Inside only, with one visible exit.' },
          { say: 'Step 1. A worker in the compute subnet reaches the lake through a private endpoint: a network interface with a private IP address in your own subnet. The storage account has public access switched off, so the private endpoint is the only door.', on: ['n1', 'n2'], focus: ['wk', 'p1', 'sa'], cap: 'A private door to the lake.' },
          { say: 'Step 2. Key Vault gets the same treatment: a private endpoint, and public access off. A secret never travels over the internet.', on: ['n3', 'n4'], focus: ['wk', 'p2', 'kv'], cap: 'The same for secrets.' },
          { say: 'Step 3. A private DNS zone makes the name of the lake resolve to the private address, inside your network. Without it the worker looks up the public address and is refused, and the error looks like a firewall problem.', on: ['n5'], focus: ['wk', 'dn'], cap: 'DNS decides which door a name opens.' },
          { say: 'Step 4. Traffic to the internet, for example a package index or a partner API, leaves through a firewall that allows named hosts and logs the rest.', on: ['n6', 'n7'], focus: ['wk', 'fw', 'in'], cap: 'One exit, with a log.' }
        ]
      }),

      B.talk({
        id: 'm11-doors', t: 1, src: 'docs', title: 'Four doors, and who has the key to each',
        say: 'Security on a data platform is four questions. Press Next for each one, and where this course answers it.',
        items: [
          ['Who: identity', 'Entra ID, roles at the right scope, and managed identities, so that no secret is needed to sign in. Mission 3.', 'Mission 3.'],
          ['From where: network', 'Private endpoints, firewalls and DNS, so that the lake and the vault are not on the internet. This mission.', 'This mission.'],
          ['What is readable: data protection', 'Encryption at rest and in transit, keys that you can rotate, and masking or row filters for sensitive columns. This mission.', 'This mission.'],
          ['What is secret: Key Vault', 'The few values that must exist, such as a password for an old database, are kept in a vault, read at run time, and never written down. This mission.', 'This mission.'],
          ['Who saw what: monitoring', 'Diagnostic logs, alerts on denied calls and unusual callers, and a person who looks. This mission and the next.', 'Logs, alerts and KQL.']
        ],
        cols: 1
      }),

      B.talk({
        id: 'm11-kv', t: 1, src: 'docs', title: 'Key Vault in six points',
        say: 'Key Vault is the safe of an Azure platform. Press Next for six points that an interviewer will ask about.',
        items: [
          ['Three kinds of object', 'Secrets are values such as a password. Keys are cryptographic keys that stay inside the vault: you ask the vault to encrypt or sign, and it never hands the key over. Certificates are keys with a certificate attached.', 'A secret is read, and a key is used.'],
          ['Access by role', 'Give identities Azure roles on the vault. Key Vault Secrets User reads secret values, and Key Vault Secrets Officer manages them. Azure RBAC is the model that the documentation recommends, over the older access policies.', 'Roles, as everywhere in Azure.'],
          ['Soft delete', 'A deleted vault or secret stays recoverable for a retention period of 7 to 90 days, 90 by default. The period is set when the vault is created and cannot be changed after that.', 'Deleting is not final.'],
          ['Purge protection', 'It stops anyone from purging a deleted vault or secret until the retention period ends. It is optional and off by default, and the documentation recommends it for keys that encrypt data. Once on, it cannot be turned off.', 'The protection from a hurried or hostile purge.'],
          ['Recovery has a gap', 'Recovering a soft-deleted vault does not bring back its role assignments or its Event Grid subscriptions. You create them again, which is another reason to keep them in a template.', 'Roles are not part of the backup.'],
          ['A vault is a dependency', 'Every job that reads a secret depends on the vault being reachable. Read a secret once when the job starts, and keep it in memory. Do not call the vault for every row. Use one vault for each environment, so that a leak stays small.', 'Read once, and keep the blast radius small.']
        ],
        cols: 2
      }),

      B.cmp({
        id: 'm11-roles', t: 1, src: 'docs', title: 'Key Vault roles: who gets which',
        say: 'Key Vault roles are narrow on purpose. Press Next to compare four of them.',
        cols: ['Role', 'It can', 'Give it to', 'Watch for'],
        hl: 1,
        rows: [
          ['Key Vault Secrets User', 'read the value of secrets', 'a pipeline or an app that needs a secret', 'Give it on the vault, or on one secret, and not on the subscription.'],
          ['Key Vault Secrets Officer', 'create, change and delete secrets', 'the deployment identity, or a small admin group', 'Not to apps. An app that can write secrets can also destroy them.'],
          ['A key-use role', 'use a key to encrypt, wrap or sign, without reading or exporting it', 'the identity of a storage account that uses a customer-managed key', 'Check the exact role name for the service in its documentation.'],
          ['Key Vault Purge Operator', 'purge a soft-deleted vault', 'almost nobody', 'Purge is the step that cannot be undone. Keep this role empty until it is needed.']
        ],
        steps: [
          { upto: 2, say: 'The everyday roles. One reads, one manages, and they go to different identities.' },
          { upto: 4, say: 'The rare ones. Key use stays inside the vault, and purge is the last door, so keep it shut.' }
        ],
        pick: 'Give apps **Secrets User** on the vault, give the **deployment identity** the officer role, and keep **purge** for an emergency. Put every assignment in the template.'
      }),

      B.code({
        id: 'm11-kv-code', t: 1, src: 'docs', title: 'Read a secret without storing one', file: 'read_secret.py', lang: 'python', code: KV,
        steps: [
          { say: 'This is all the code that a job needs. There is no key in it and no connection string. Press Next.', lines: null },
          { say: 'The client takes the address of the vault and a credential. `DefaultAzureCredential` signs in as the managed identity of the job in Azure, or as you on a laptop, as mission 3 showed. The identity needs the role Key Vault Secrets User.', lines: G.span(KV, /^client = /, /^\)/) },
          { say: '`get_secret` returns an object, and `.value` is the secret. Read it once, when the job starts, and keep it in memory.', lines: G.span(KV, /get_secret/) },
          { say: 'The last line is the rule that the next bug hunt tests: use the secret to connect, and never print it, log it or send it in a message.', lines: G.span(KV, /^# use it/) }
        ],
        note: 'The names and arguments are those of azure-keyvault-secrets ' + G.meta('azure-keyvault-secrets') + ', checked with Python. The code was not run against a vault.'
      }),

      B.talk({
        id: 'm11-enc', t: 1, src: 'docs', title: 'Encryption at rest and in transit',
        say: 'Everything in Azure Storage is encrypted, whatever you do. The question is who holds the key. Press Next for the layers.',
        items: [
          ['Always on', 'Azure Storage encrypts all data at rest with 256-bit AES, and you cannot switch it off. You get it with no setting and no code.', 'Encryption is the default.'],
          ['Microsoft-managed keys', 'The default. Microsoft holds and rotates the keys. It is enough for many teams, and it gives you no control over the key and no way to revoke it.', 'Simple, and not yours.'],
          ['Customer-managed keys', 'You keep a key in Key Vault or in Managed HSM, and the storage account uses it to wrap its own keys. You control rotation. You can disable the key, and then the data is unreadable. Use purge protection on that vault.', 'Your key, your responsibility.'],
          ['A second layer', 'Infrastructure encryption adds a second layer of encryption, with a separate key that Microsoft manages. It is for rules that ask for two layers.', 'Two layers, for a rule.'],
          ['In transit', 'Turn on secure transfer, so that the account accepts only HTTPS, and set a minimum TLS version of 1.2. A client that cannot meet it is refused.', 'HTTPS only, TLS 1.2 or newer.']
        ],
        cols: 1
      }),

      B.code({
        id: 'm11-envelope-code', t: 1, src: 'rec', title: 'Envelope encryption: rotate a key without touching the data', file: 'envelope.py', lang: 'python', code: ENV,
        steps: [
          { say: 'This is the mechanism behind a customer-managed key. I wrote it with the cryptography library, and it ran. The data is encrypted by a data key, and a key encryption key wraps the data key. Press Next.', lines: null },
          { say: 'Three keys with fixed values, so that the run can be repeated. The data key encrypts the data. The two key encryption keys, KEKs, stand for two versions of a key that would live in Key Vault.', lines: G.span(ENV, /^data_key = /, /^kek_2026/) },
          { say: 'The data is a megabyte of order lines. AES-GCM encrypts it with the data key, and adds a 16 byte tag that detects any change. The data key itself is wrapped with the 2025 KEK. A 32 byte key becomes 40 bytes.', lines: G.span(ENV, /^ciphertext = /, /^wrapped = /) },
          { say: 'Rotation: unwrap the data key with the old KEK and wrap it again with the new one. Only the 40 bytes change. The megabyte of data is not read or written, which is why a key rotation costs almost nothing, even for a petabyte.', lines: G.span(ENV, /^# rotate/, /^rotated = /) },
          { say: 'The checks. The data still decrypts with the new key, and the fingerprint of the encrypted data is the same before and after the rotation.', lines: G.span(ENV, /^print\("wrapped data key changed/, /decrypts with the new key/) },
          { say: 'The last loop is the other side. The old KEK cannot open the new wrapper, and a key that has been destroyed opens nothing. If every copy of the KEK is gone, the data key cannot be recovered, and the data is unreadable for good.', lines: G.span(ENV, /^# the old key/, /cannot unwrap/) }
        ],
        note: 'Run with cryptography ' + G.meta('cryptography') + '. Azure Storage uses the same pattern, with its own account key wrapped by a key in Key Vault. The fixed nonce and keys are for a repeatable demo only: never reuse a nonce with a real key.'
      }),

      B.term({
        id: 'm11-envelope', t: 1, src: 'rec', title: 'What the run printed',
        say: 'Here is the real output of that script. Look for the two fingerprints: they are the same, because the rotation never touched the data.',
        lines: [{ c: 'cmd', t: '$ python envelope.py', d: 500 }].concat(ENV_OUT.split('\n').map(function (l) { return { c: /cannot unwrap|changed: True|decrypts with the new key: True/.test(l) ? 'ok' : /fingerprint/.test(l) ? 'hl' : 'out', t: l, d: 160 }; })),
        after: 'A 1,045,000 byte file became **1,045,016 bytes**: the 16 extra bytes are the tag. The data key is **32 bytes** and its wrapper is **40**. After the rotation the wrapper changed, the data did not (the fingerprint **' + FP[0] + '** appears twice), and the data still decrypts. In Azure this is why you can rotate a customer-managed key at any time, and why **disabling or destroying** the key makes the data unreadable, which is a kill switch and a risk. Turn on purge protection, so nobody destroys it by mistake.',
        afterKind: 'tip',
        doneSay: 'Rotation re-wraps the small key, and never re-encrypts the big data. Destroying the key is the one step that cannot be undone.'
      }),

      B.talk({
        id: 'm11-private', t: 1, src: 'docs', title: 'Private endpoints and the DNS that breaks them',
        say: 'Private endpoints are simple to describe and easy to get wrong. Press Next for what to know.',
        items: [
          ['A private endpoint', 'A network interface with a private IP address in your subnet, connected to one sub-resource of one service. Traffic to it stays on the Microsoft backbone and never takes a public route.', 'A private address for a service.'],
          ['One for each sub-resource', 'A storage account has separate sub-resources for blob, dfs, queue and so on, so a lake that is read through the Data Lake API needs an endpoint for `dfs`, and some tools need one for `blob` too. Key Vault has one for the vault.', 'The right sub-resource, or nothing works.'],
          ['DNS is the part that breaks', 'The account name must resolve to the private IP inside your network. A private DNS zone, such as `privatelink.dfs.core.windows.net`, linked to the virtual network, does that. Without it the name resolves to the public address, and with public access off, the call is refused.', 'A name that resolves wrongly looks like a firewall.'],
          ['Public access off, or a firewall', 'Switch public network access off, or set the default action to deny and allow a few networks or IP ranges. The first is cleaner when everything uses private endpoints, and the second suits a few known outside callers.', 'Close the public door on purpose.'],
          ['Approval', 'A private endpoint to a resource in another subscription, or a managed private endpoint from Data Factory or Synapse, must be approved by the owner of the target. A request that nobody approved sits pending, and the pipeline fails.', 'Someone must say yes.']
        ],
        cols: 1
      }),

      B.cmp({
        id: 'm11-services', t: 2, src: 'docs', title: 'How each service reaches private resources',
        say: 'Closing the lake is half of the work. The services that use it need a private way in. Press Next to compare. Settings differ by plan and change, so read the page of the service.',
        cols: ['Service', 'How it reaches private resources', 'Watch for'],
        hl: 1,
        rows: [
          ['Data Factory', 'An Azure integration runtime in a managed virtual network, with managed private endpoints that you create in the factory', 'The owner of the target must approve each endpoint. The runtime starts a little slower.'],
          ['Synapse', 'A workspace in a managed virtual network, with managed private endpoints', 'The network mode is chosen when the workspace is created, so check it before you build.'],
          ['Azure Functions', 'Virtual network integration for outbound calls and a private endpoint for inbound ones', 'Not every plan supports it. Check the plan.'],
          ['Databricks', 'Injection into your own virtual network, with no public IP address on the nodes', 'Set when the workspace is created. The Databricks tutorial in this repo covers it.'],
          ['Storage and Key Vault', 'Private endpoints, and public network access disabled or limited', 'DNS, and the exceptions for trusted Azure services, which you must understand.']
        ],
        steps: [
          { upto: 3, say: 'The orchestration and the code. Each one gets its private route in its own way, and each has a plan or a setting that makes it possible.' },
          { upto: 5, say: 'The processing and the stores. The stores are the target, and the services need an endpoint to each of them.' }
        ],
        pick: 'For every service that touches the lake or the vault, write down **how it reaches the private endpoint**, who **approves** it, and which **plan** allows it, before you switch public access off.'
      }),

      B.code({
        id: 'm11-bicep', t: 2, src: 'docs', title: 'A storage account with its doors closed', file: 'lake.bicep', lang: 'bicep', code: BICEP,
        steps: [
          { say: 'This is the lake account with the security settings that this mission discussed, written in Bicep. Press Next. The Bicep was not compiled here, so check the property names against the current reference.', lines: null },
          { say: 'The hierarchical namespace makes it ADLS Gen2, and the redundancy is ZRS, as in mission 2.', lines: G.span(BICEP, /isHnsEnabled/) },
          { say: 'Secure transfer means HTTPS only, and the minimum TLS version is 1.2. Clients that cannot meet them are refused.', lines: G.span(BICEP, /supportsHttpsTrafficOnly/, /minimumTlsVersion/) },
          { say: 'No anonymous access to containers. The documentation shows different defaults in different places, so always set it explicitly.', lines: G.span(BICEP, /allowBlobPublicAccess/) },
          { say: 'Shared key access off means that every request must be authorized with Entra ID. A request that is signed with the account key is refused, and that includes account and service SAS tokens, which are signed with the key. A user delegation SAS, signed with an Entra identity, still works.', lines: G.span(BICEP, /allowSharedKeyAccess/) },
          { say: 'Public network access disabled. The lake can now be reached only through private endpoints, which are separate resources in the same template.', lines: G.span(BICEP, /publicNetworkAccess/) }
        ],
        note: 'From the documentation, not compiled. The private endpoints, the DNS zones and the role assignments are separate resources. Mission 13 builds the whole set.'
      }),

      B.cmp({
        id: 'm11-protect', t: 2, src: 'docs', title: 'Protecting columns and rows',
        say: 'Encryption protects a disk. It does nothing about an analyst who may read a column that they should not. Press Next to compare the tools. Which engine supports which, differs, so check yours.',
        cols: ['Tool', 'What it does', 'Good for', 'Watch for'],
        hl: 1,
        rows: [
          ['Column-level permissions', 'Grant SELECT on some columns of a table, and not on others', 'hiding a column from a group, in the engine that supports it', 'A view with the safe columns is a simple alternative.'],
          ['Dynamic data masking', 'Shows a masked value, such as the first letters of an email, to users who lack a permission', 'casual protection in reports and tools', 'It is not encryption, and a user who can run queries may infer the value.'],
          ['Row-level security', 'A predicate that filters the rows that a user sees, for example by store or country', 'a European analyst who may see only European orders', 'The predicate is code that you must test, and it can slow queries.'],
          ['Sensitivity labels and classification', 'Tag columns and files as confidential or personal, and let policies follow the tag', 'knowing where sensitive data is, across services', 'A label describes data. A permission or a mask must enforce the rule.'],
          ['Client-side encryption', 'Encrypt a value before it reaches the database, with a key that the database never sees', 'values that even an administrator must not read', 'The server cannot search or compute on the value.']
        ],
        steps: [
          { upto: 3, say: 'Controls that the engine applies when a person queries. They shape what a user sees, and they are not a vault.' },
          { upto: 5, say: 'Labels and client-side encryption. One says where the sensitive data is, and the other keeps even administrators out.' }
        ],
        pick: 'Give analysts **views or column permissions** for the safe columns, add **row filters** where a person may see only part, **label** what is sensitive, and use **client-side encryption** only for values that nobody on the server may read.'
      }),

      B.code({
        id: 'm11-kql', t: 2, src: 'rec', title: 'Watch for refused calls with KQL', file: 'refused_calls.kql', lang: 'kql', code: KQL,
        steps: [
          { say: 'When storage diagnostics go to a Log Analytics workspace, every request becomes a row. This query finds who is being refused. Press Next.', lines: null },
          { say: '`StorageBlobLogs` is the table of blob requests. The filter keeps the last day and the status 403, which means that the caller was refused.', lines: G.span(KQL, /^\| where/) },
          { say: '`summarize` counts the refusals for each caller address and for each kind of authentication. A caller that was refused hundreds of times, from an address that you do not know, is the one to look at.', lines: G.span(KQL, /^\| summarize/) },
          { say: '`top 10 by attempts desc` keeps the ten most refused. An alert rule can run this query on a schedule and send a message when a caller passes a limit.', lines: G.span(KQL, /^\| top/) }
        ],
        note: 'The Kusto language service of Microsoft parsed this query without errors. That is a check of syntax only: it has no table schemas, so the table and column names come from the documentation of the storage logs.'
      }),

      B.talk({
        id: 'm11-monitor', t: 1, src: 'docs', title: 'Watching for misuse',
        say: 'Locks are not enough if nobody looks at the door. Press Next for what to switch on and what to alert on.',
        items: [
          ['Diagnostic logs', 'Send the logs of storage, Key Vault, Data Factory and Synapse to a Log Analytics workspace. Storage logs record each request with its status, caller address and kind of authentication.', 'No log, no evidence.'],
          ['Alerts on refusals', 'A burst of 403 responses, a caller that is not on your list, a secret read at three in the morning, a role assignment that nobody planned. Each of them is a query and an alert rule.', 'Alert on what should never happen.'],
          ['Defender for Storage', 'A Microsoft Defender plan for storage accounts that can flag unusual access and scan uploads for malware. It is paid for each account, so choose where it matters, and read the current page for what it covers.', 'A paid layer for the accounts that matter.'],
          ['Keep the logs, but not for ever', 'Logs bill for every GB that is ingested and for the days that they stay. Mission 12 puts numbers on it. Send the useful categories, and set a retention that matches the rule that you must meet.', 'Logs are a cost, so choose them.'],
          ['A person who looks', 'An alert that nobody reads is a decoration. Name an owner, and test the alert once a quarter with a harmless denied call.', 'Someone must own the alert.']
        ],
        cols: 1
      }),

      B.decide({
        id: 'm11-dec', t: 2, src: 'docs', title: 'Decision: how closed should the network be?',
        scenario: 'Brewline production holds customer data, and **six engineers** work on it. Pipelines run in Data Factory and Synapse. A partner uploads files from a **fixed set of IP addresses**. The team is small and has little network experience. Dev must stay easy to use.',
        opts: [
          { t: 'Public endpoints everywhere, and an IP allow list on each account', d: 'The least to build, and quick to explain.', lose: 'The lake and the vault stay reachable from the internet, a leaked key or token works from anywhere, and every new IP address is another change.' },
          { t: 'Private endpoints for the lake and the vault in production, managed virtual network runtimes for Data Factory and Synapse, public access off, and one allow-listed rule for the partner; keep dev simpler', d: 'Production is closed to the internet, pipelines reach the stores privately, and the partner has a narrow, logged door.' },
          { t: 'A full hub-and-spoke network with a firewall, forced tunneling and private endpoints for every service, in every environment', d: 'The strongest design on paper.', lose: 'More than six engineers with little network experience can run. The cost and the effort will be high, and dev becomes hard to use.' }
        ],
        pick: 1,
        why: 'The second design closes what matters in production, the lake and the vault, using the managed network features of the services, so the team builds little network of its own. The partner gets a narrow rule that is easy to audit. Dev keeps public access with an allow list, so people can work, and the template builds both from the same code.',
        when: 'A regulated business, or a large platform team, may need the full hub-and-spoke design. Choose by the data and the team, and let the next audit decide when to close more.'
      }),

      B.quiz({
        id: 'm11-q1', t: 1,
        q: 'A pipeline must read one secret from Key Vault and nothing else. Which role fits?',
        opts: [
          { t: 'Key Vault Secrets User, on the vault or on that one secret', fb: '' },
          { t: 'Key Vault Secrets Officer', fb: 'It can also create and delete secrets, which a reader does not need.' },
          { t: 'Owner on the subscription', fb: 'It gives management of everything, and the data role of the vault is a separate matter.' },
          { t: 'Key Vault Purge Operator', fb: 'It purges deleted vaults, and cannot read values.' }
        ],
        ok: 0, why: 'Secrets User reads the value of secrets and does nothing else. Give it at the narrowest scope that works, and put the assignment in the template.'
      }),

      B.quiz({
        id: 'm11-q2', t: 1,
        q: 'In the recording, the key encryption key was rotated. What changed in the stored data?',
        opts: [
          { t: 'Only the 40 byte wrapper of the data key. The encrypted data was not touched', fb: '' },
          { t: 'The whole megabyte was decrypted and encrypted again', fb: 'That is what rotation avoids. The fingerprint of the data was the same before and after.' },
          { t: 'Nothing, because rotation only renames the key', fb: 'The wrapper changed.' },
          { t: 'The data key changed, and the data was lost', fb: 'The data key is the same, and the data decrypted fine.' }
        ],
        ok: 0, why: 'Envelope encryption puts a small data key between the big data and the key that you manage. Rotation unwraps that small key with the old KEK and wraps it with the new one, so a petabyte rotates as fast as a kilobyte.'
      }),

      B.quiz({
        id: 'm11-q3', t: 1,
        q: 'A private endpoint exists and public access is off, yet a job in the virtual network gets a refusal. The job resolves the account name to a public address. What is missing?',
        opts: [
          { t: 'A private DNS zone linked to the virtual network', fb: '' },
          { t: 'A second storage account', fb: 'The account is fine. The name resolves to the wrong address.' },
          { t: 'A bigger virtual network', fb: 'The size of the network does not decide how a name resolves.' },
          { t: 'A SAS token', fb: 'A token does not change the address that the name resolves to.' }
        ],
        ok: 0, why: 'The private endpoint gives the account a private IP, and DNS must send the name to it. A private DNS zone such as `privatelink.dfs.core.windows.net`, linked to the network, does that. Without it the name resolves to the public address, which is closed.'
      }),

      B.quiz({
        id: 'm11-q4', t: 1,
        q: 'A new Key Vault is created with the default settings. Which statement is right?',
        opts: [
          { t: 'Soft delete keeps deleted items for 90 days, and purge protection is off unless you turn it on', fb: '' },
          { t: 'Deleted items are removed at once, and purge protection is on', fb: 'Soft delete retains them, and purge protection is optional.' },
          { t: 'Soft delete lasts 7 days and cannot be changed', fb: 'The default is 90 days. You can choose 7 to 90 when you create the vault.' },
          { t: 'Purge protection is on, and soft delete is off', fb: 'Both have it the other way round.' }
        ],
        ok: 0, why: 'Soft delete retains deleted vaults and objects, 90 days by default and 7 to 90 when you choose, set at creation. Purge protection is an extra, optional setting. Turn it on for vaults whose keys encrypt data.'
      }),

      B.quiz({
        id: 'm11-q5', t: 2,
        q: 'A storage account has `allowSharedKeyAccess: false`. What happens to a request that is signed with the account key?',
        opts: [
          { t: 'It is refused. Requests must be authorized with Entra ID', fb: '' },
          { t: 'It works, because the key is still valid', fb: 'The setting turns key-signed requests off.' },
          { t: 'It works for reads and fails for writes', fb: 'The setting does not split reads from writes.' },
          { t: 'It works, but is logged', fb: 'It is refused, and the refusal is logged.' }
        ],
        ok: 0, why: 'With shared key access off, requests signed with the account key are refused, and so are account and service SAS tokens, which are signed with that key. Authorization must come from Entra ID, including a user delegation SAS.'
      }),

      B.quiz({
        id: 'm11-q6', t: 2,
        q: 'You turn on a customer-managed key for the lake. Someone disables the key in Key Vault. What happens to the data?',
        opts: [
          { t: 'It becomes unreadable until the key is enabled again, so it is both a control and a risk', fb: '' },
          { t: 'Nothing, because the data is already decrypted in storage', fb: 'The storage account needs the key to reach its own data key.' },
          { t: 'It is deleted at once', fb: 'It is not deleted. It is unreadable while the key is disabled.' },
          { t: 'It falls back to Microsoft-managed keys', fb: 'It does not fall back. That would defeat the control.' }
        ],
        ok: 0, why: 'The storage account wraps its data key with your key. If the key is disabled, or destroyed, the data key cannot be unwrapped, as the recording showed with the destroyed key. That is a kill switch for you, and an outage if it happens by mistake, so use purge protection and alerts on key changes.'
      }),

      B.order({
        id: 'm11-ord', t: 2, q: 'Put the closing of the public door of the lake in order, so that no pipeline breaks.',
        items: [
          'List every service that reads or writes the lake, and how it will reach it',
          'Create the private endpoints for dfs and blob, and the private DNS zones linked to the network',
          'Create and approve the managed private endpoints of Data Factory and Synapse',
          'Test a read and a write from each service in dev, and from the compute subnet',
          'Switch public network access off in production, outside business hours',
          'Watch the logs for refused calls, and fix what they show'
        ],
        why: 'The private routes must exist and work before the public one goes away. DNS and approvals are the usual gaps, so test from each service first. Switch off at a quiet time and watch the refusals, so that a missed caller shows up in minutes.'
      }),

      B.bug({
        id: 'm11-bug', t: 1, src: 'docs', q: 'A job reads the database password from Key Vault. Click the line that undoes the point of the vault.',
        file: 'connect.py', lang: 'python', code: BUG_PRINT, bad: [2],
        hint: 'Where does the text of this line end up?',
        why: 'The `print` writes the password into the job log, which many people and tools can read, and which is kept for weeks. A secret that is read from a vault and then logged is no longer secret. Log what is being done, never the value.',
        fix: FIX_PRINT,
        cheer: 'Read the secret, use it, and never show it.'
      }),

      B.bug({
        id: 'm11-bug2', t: 2, src: 'docs', q: 'The lake has a private endpoint, and a scan still shows it reachable from the internet. Click the line that leaves the public door open.',
        file: 'lake.bicep', lang: 'bicep', code: BUG_NET, bad: [10],
        hint: 'What does the default action say about traffic that no rule names?',
        why: 'The default action `Allow` says that traffic that matches no rule is let in, so the account is open to the internet, whatever private endpoints exist. Set it to `Deny`, or switch public network access off. The private endpoint is an extra door, and it does not close the first one. The Bicep was not compiled here.',
        fix: FIX_NET,
        cheer: 'A new door does not close the old one.'
      }),

      B.challenge({
        id: 'm11-ch', t: 2, title: 'Coding round: who is being refused?', file: 'refused.kql', lang: 'kql',
        q: 'The table `StorageBlobLogs` holds the requests to the lake. **Write a KQL query that returns the three callers with the most refused (403) requests, with their counts**, most refused first.',
        data: [{ name: 'StorageBlobLogs (sample, one day)', cols: ['TimeGenerated', 'OperationName', 'StatusCode', 'CallerIpAddress'], rows: LOGS }],
        starter: '// the three callers with the most 403 responses\nStorageBlobLogs\n| ...',
        hints: ['Filter on `StatusCode == 403` first.', '`summarize attempts = count() by CallerIpAddress` makes one row for each caller.', '`top 3 by attempts desc` keeps the three biggest and sorts them.'],
        sol: CH_KQL,
        res: { msg: '3 rows', cols: ['CallerIpAddress', 'attempts'], rows: CH_ROWS.map(function (r) { return [r[0], String(r[1])]; }) },
        expl: ['KQL reads from top to bottom. `where` filters, `summarize` groups and counts, and `top` sorts and cuts.', 'The caller `' + CH_ROWS[0][0] + '` was refused ' + CH_ROWS[0][1] + ' times, on `GetBlob` and `ListBlobs`. A caller that tries to list and read, from an address that you do not know, is what an alert should catch.', 'The Kusto language service of Microsoft parsed this query without errors, a check of syntax only. The columns are those of the storage logs table, from the documentation.', 'In production the query would also filter on time, with `ago(1d)`, and an alert rule would run it on a schedule.'],
        cx: 'One pass over the log rows of the period, and a small aggregation by caller. The cost is the volume of logs that you ingest and scan.'
      }),

      B.incident({
        id: 'm11-inc', t: 2, src: 'docs', title: 'Incident: every pipeline fails after the lake was closed', time: '05:40',
        alert: '**All nightly copies to the lake failed at 02:00 with a "name or service not known" error, and a few with a refusal.** At 01:30 a change switched public network access off on the lake account. Private endpoints for the lake exist. Data Factory runs its copies on the default Azure integration runtime.',
        clues: ['The copies run on a runtime that uses public routes', 'The lake no longer accepts public traffic', 'A managed private endpoint needs approval by the owner of the target'],
        opts: [
          { t: 'Create a managed virtual network runtime and a managed private endpoint to the lake, approve it, move the linked service to the new runtime, test one copy, and rerun the night', fb: '' },
          { t: 'Switch public network access back on, and leave it', fb: 'It restores service and reopens the door, and nobody learns what was missing. Do it only as a short, deliberate step while the fix is built.' },
          { t: 'Add the IP addresses of Data Factory to the firewall', fb: 'The default runtime uses many addresses that change, and it is not a stable allow list.' },
          { t: 'Give the factory identity the Owner role on the lake', fb: 'The calls fail on the network path, not on roles, and Owner adds risk.' }
        ],
        best: 0,
        why: 'The change closed the public door before the private route for the factory existed. A copy can reach a closed lake through a managed virtual network runtime and a managed private endpoint that the owner of the lake approves. Test one copy, rerun the night, and keep a rule that a network change is tested from each service first.',
        checks: [
          ['Read the errors', 'Name not known or refused points to the network path and not to the role.'],
          ['Find the change', 'The activity log shows the setting that was switched off at 01:30.'],
          ['Build the private route', 'A managed virtual network runtime and a managed private endpoint, approved.'],
          ['Move and test', 'The linked service uses the new runtime. Test one copy.'],
          ['Rerun and prevent', 'Rerun the night, and test from each service before the next closing.']
        ],
        tell: 'The copies failed because the lake was closed to the public network at 01:30, while the factory still ran its copies on the default runtime, which uses public routes. I created a managed virtual network runtime and a managed private endpoint to the lake, approved the request on the storage side, moved the linked service to the new runtime, tested one copy, and reran the night. Network changes are now tested from each service in dev first, and made outside the load window.',
        prevent: ['**List** every service that reaches the lake before you close it', 'Test from **each service**, in dev first', '**Approve** managed private endpoints', 'Change the network **outside** the load window']
      }),

      B.incident({
        id: 'm11-inc2', t: 2, src: 'docs', title: 'Incident: a secret was pushed to Git', time: '11:15',
        alert: '**A notebook with a storage client secret was pushed to the main branch of a repository 40 minutes ago.** The secret belongs to a service principal that can write to the lake. The repository is visible to the whole company, and the commit is already in a fork.',
        clues: ['The secret is in a commit history that others have copied', 'Deleting the file does not remove it from history or from forks', 'The service principal can write to the lake'],
        opts: [
          { t: 'Treat the secret as leaked: rotate it now, remove the access of the old one, read the logs for any use, and then clean up the history and add secret scanning', fb: '' },
          { t: 'Delete the file and force-push, so that nobody can see it', fb: 'A fork, a clone or a cache already has it. Cleaning history is the last step, not the first.' },
          { t: 'Make the repository private and carry on', fb: 'People who have copied it keep the secret.' },
          { t: 'Wait for the security team to reply before acting', fb: 'The secret works from anywhere while you wait. Rotate first and tell them as you do it.' }
        ],
        best: 0,
        why: 'Once a secret has been pushed, assume that someone has it. Rotation ends its value, so it comes first. Then read the sign-in and storage logs for use of the old secret, clean up the history, and add push protection, so that the next one is stopped before it leaves a laptop. The better fix is a managed identity, with no secret to leak.',
        checks: [
          ['Rotate', 'Create a new secret, store it in Key Vault, update the consumers, delete the old secret.'],
          ['Check use', 'Sign-in logs of the service principal and the storage logs: any use from unknown addresses?'],
          ['Clean up', 'Remove it from the history and ask the owners of forks to delete them.'],
          ['Add a guard', 'Secret scanning and push protection on the repository.'],
          ['Remove the cause', 'Replace the service principal with a managed identity where possible.']
        ],
        tell: 'A client secret was pushed to main and had already been forked, so I treated it as leaked. I created a new secret in Key Vault, switched the consumers over, deleted the old secret, and read the sign-in and storage logs for the service principal to see whether it had been used from anywhere unknown. Then I removed it from the history, turned on secret scanning with push protection on the repository, and started to replace the service principal with a managed identity.',
        prevent: ['**Rotate** before you clean up', 'Turn on **push protection** for secrets', 'Prefer **managed identities**', 'Read the **logs** for use of the old secret']
      }),

      B.qa({
        id: 'qa-keyvault', t: 1, tag: 'Security', secs: 75,
        q: 'How do you use Key Vault in a data platform?',
        pts: ['Secrets are read, keys are used, certificates are keys with a certificate', 'Access by Azure roles: Secrets User for apps, Officer for deployment', 'Read a secret once at startup, and never log it', 'Soft delete 7 to 90 days, default 90, and purge protection for keys', 'Recovery does not restore role assignments: keep them in the template', 'One vault for each environment, private endpoint, public access off'],
        short: 'I keep the few values that must exist in Key Vault, and I read them with a managed identity, so no secret is in code. Secrets are values that are read, keys are cryptographic keys that stay in the vault and are used to encrypt or sign, and certificates are keys with a certificate.\n\nAccess is by Azure roles: Key Vault Secrets User for an app that reads, and Secrets Officer for the deployment identity, at the narrowest scope. A job reads a secret once, when it starts, and never prints it.\n\nI set soft delete, which keeps deleted items for 7 to 90 days, 90 by default, and purge protection for any vault that holds keys that encrypt data. Recovering a vault does not restore its role assignments, so they live in the template. I use one vault for each environment, with a private endpoint and public access off.',
        fu: [
          ['Why not access policies?', 'Roles are the model of the rest of Azure, they can be audited in one place, and they can be scoped to a single secret.'],
          ['What does purge protection do?', 'It stops anyone from purging a deleted vault or secret during the retention period. It is optional, and once on it cannot be turned off.']
        ],
        trap: 'Storing a secret in Key Vault and then printing it in a log.',
        real: 'Describe how a secret reached a job in a system you worked on.'
      }),

      B.qa({
        id: 'qa-private-endpoint', t: 2, tag: 'Security', secs: 90,
        q: 'How do you close a data lake to the internet without breaking the pipelines?',
        pts: ['List every service that reaches the lake, and how it will get there', 'Private endpoints for dfs and blob, and private DNS zones linked to the network', 'Managed virtual network runtimes and approved managed private endpoints for Data Factory and Synapse', 'Test each service in dev first', 'Switch public network access off outside the load window', 'Watch refused calls in the logs afterwards'],
        short: 'I start with a list of every service that reads or writes the lake and how each will reach it. Then I build the private routes: private endpoints for the dfs and blob sub-resources, and private DNS zones, such as the privatelink zone for dfs, linked to the virtual network, because a name that still resolves to the public address looks like a firewall problem.\n\nData Factory and Synapse reach the lake through a managed virtual network runtime and managed private endpoints, which the owner of the lake must approve. Functions use virtual network integration, on a plan that supports it, and Databricks is injected into the network.\n\nI test every service in dev first, then switch public network access off in production outside the load window, and watch the logs for refused calls. The whole thing is in a template, so that dev and prod match.',
        fu: [
          ['What is the usual mistake?', 'Closing the public door before the private route exists, or forgetting DNS or the approval of a managed endpoint.'],
          ['What about a partner that uploads files?', 'Give it a narrow rule, such as an IP range, or a SAS or a private route, and log it.']
        ],
        trap: 'Switching public access off and testing afterwards.',
        real: 'Describe a network change that broke something, and how you found the cause.'
      }),

      B.qa({
        id: 'qa-encryption', t: 2, tag: 'Security', secs: 90,
        q: 'How is data encrypted in Azure Storage, and what does a customer-managed key add?',
        pts: ['At rest with 256-bit AES, always on, with Microsoft-managed keys by default', 'In transit: secure transfer, HTTPS only, and TLS 1.2 or newer', 'Customer-managed keys in Key Vault or Managed HSM wrap the account keys', 'Envelope encryption: rotation re-wraps a small key, and does not touch the data', 'Disabling or destroying the key makes the data unreadable: a control and a risk', 'Purge protection and alerts on key changes'],
        short: 'Azure Storage encrypts all data at rest with 256-bit AES, always, with keys that Microsoft manages by default. In transit, I turn on secure transfer so that only HTTPS is accepted, with a minimum of TLS 1.2.\n\nA customer-managed key adds control. The key lives in Key Vault or Managed HSM, and the account uses it to wrap its own data key, which is envelope encryption. I showed it in code: rotation unwraps the small data key with the old key and wraps it with the new one, and the encrypted data is not touched, so rotation costs almost nothing, even for a very large lake.\n\nThe other side is risk. If the key is disabled or destroyed, the data key cannot be unwrapped, and the data is unreadable. So I use purge protection on the vault, give the account identity only a key-use role, and alert on changes to the key. Some rules also ask for a second layer, which infrastructure encryption provides.',
        fu: [
          ['Why not always use customer-managed keys?', 'They add work and risk: you own rotation and availability. Use them when a rule or a policy asks for control of the key.'],
          ['What is the kill switch?', 'Disabling the key. It makes the data unreadable until the key is enabled again.']
        ],
        trap: 'Thinking that customer-managed keys are always safer. They move the responsibility to you.',
        real: 'Describe a requirement that made you use your own key, and how you ran it.'
      }),

      B.qa({
        id: 'qa-data-protection', t: 2, tag: 'Security', secs: 75,
        q: 'How do you stop an analyst from seeing data that they should not?',
        pts: ['Give analysts views or column permissions for the safe columns', 'Row-level security: a predicate on the user, such as the country', 'Dynamic data masking is casual protection, not encryption', 'Sensitivity labels say where the sensitive data is, and a permission must enforce the rule', 'Client-side encryption for values that no server administrator may read', 'Test the filters, and log who reads the sensitive tables'],
        short: 'I combine several controls. The simplest is a view, or a column permission, that exposes only the safe columns, and analysts get access to the view. For rows I use a row-level security predicate, such as the country of the analyst, so a European analyst sees European orders. Dynamic data masking shows a masked value, and I treat it as casual protection and not encryption, because a user who can run queries may infer the value.\n\nSensitivity labels and classification tell me where the sensitive data is, across services, but a label describes data and does not enforce anything, so a permission or a mask must enforce the rule. For values that no administrator of the server may read, I use client-side encryption, knowing that the server then cannot search or compute on them.\n\nI test the filters like code, and I log reads of the sensitive tables.',
        fu: [
          ['Is masking enough for personal data?', 'No. It hides values in results, and does not stop inference or a user with higher rights. Combine it with permissions and views.'],
          ['What is the risk of row-level security?', 'A mistake in the predicate, and some cost in speed. Test it with real users.']
        ],
        trap: 'Relying on a label or a mask as if it were an access rule.',
        real: 'Describe how you protected a sensitive column in a place you worked.'
      }),

      B.qa({
        id: 'qa-security-monitoring', t: 2, tag: 'Security', secs: 60,
        q: 'How do you notice that someone is misusing the lake or the vault?',
        pts: ['Diagnostic logs to Log Analytics for storage, Key Vault, Data Factory and Synapse', 'KQL alerts on bursts of 403 responses and on unknown callers', 'Alerts on role assignments and key changes that nobody planned', 'Defender for Storage on the accounts that matter', 'Retention that matches the rule, and a log budget', 'An owner for each alert, tested every quarter'],
        short: 'I send diagnostic logs of storage, Key Vault, Data Factory and Synapse to a Log Analytics workspace, because no log means no evidence. Then I write queries and alert rules for what should never happen: a burst of 403 responses, a caller address that is not on my list, a secret read at an odd hour, and a role assignment or a key change that nobody planned. A KQL query that counts refused calls by caller address is a good start, and the Kusto parser checks its syntax.\n\nOn the accounts that matter I consider Microsoft Defender for Storage, which is paid for each account. I keep logs for the time that a rule demands and no longer, since logs bill for ingestion and for retention.\n\nEvery alert has an owner, and I test it each quarter with a harmless denied call, because an alert that nobody reads is decoration.',
        fu: [
          ['What would you alert on first?', 'Refused calls from unknown addresses, role assignments outside the pipeline, and any change to a key.'],
          ['What does a log cost?', 'Ingestion by the GB and retention by the day. Choose categories, and set the retention on purpose.']
        ],
        trap: 'Turning logs on and never writing an alert.',
        real: 'Describe an alert that caught a real problem, and who acted on it.'
      }),

      B.qa({
        id: 'qa-secure-lake', t: 2, tag: 'Security', secs: 120,
        q: 'Walk me through how you would secure a data lake on Azure from end to end.',
        pts: ['Identity: managed identities, least-privilege roles at the right scope, ACLs for folders, shared key access off', 'Network: private endpoints for dfs and blob, private DNS, public access off, managed network runtimes', 'Data: encryption at rest and TLS 1.2, a customer-managed key where required, views, masks and row filters', 'Secrets: Key Vault with soft delete and purge protection, read once at startup', 'Monitoring: diagnostic logs, KQL alerts, Defender, owners for alerts', 'Everything in templates, with a what-if before a change'],
        short: 'I think in four layers and a loop. For identity, every job gets a managed identity with a least-privilege data role at the narrowest scope, folders get ACLs where roles are too wide, and shared key access is off, so only Entra ID authorizes requests. For the network, the lake and the vault get private endpoints with private DNS zones, public network access is off, and Data Factory and Synapse use managed virtual network runtimes with approved managed private endpoints.\n\nFor data, encryption at rest is always on and I require HTTPS with TLS 1.2, I use a customer-managed key only where a rule asks for it, and analysts see views, masks and row filters, not raw tables. For secrets, I use Key Vault with soft delete and purge protection, and jobs read a secret once, at the start.\n\nThen the loop: diagnostic logs, KQL alerts for refused calls and unplanned role or key changes, Defender on the accounts that matter, and an owner for every alert. All of it is in templates, with a what-if before each change, so dev and prod match and a drift shows up.',
        fu: [
          ['What do you do first on a new platform?', 'Identity and a template. Everything after that is easier when each service has its own identity and nothing is created by hand.'],
          ['What do you test?', 'A denied call, a rotated secret, a restored vault, and the private route from each service.']
        ],
        trap: 'Starting with the network and leaving broad roles and shared keys in place.',
        real: 'Describe a security review you went through, and what it changed.'
      }),

      B.recap({
        id: 'm11-recap', n: 11, badge: 'Vault Keeper', color: '#FECACA',
        pts: [
          '**Key Vault** holds secrets, keys and certificates. Apps get **Secrets User**. **Soft delete** keeps 7 to 90 days, and **purge protection** is optional. A recovered vault loses its role assignments.',
          '**Envelope encryption**: a rotation re-wraps a **40 byte** key and leaves the data alone. A **destroyed key** makes the data unreadable for good.',
          '**Private endpoints** need **private DNS**, and a closed public door. Test every service first. Managed private endpoints need **approval**.',
          'Turn **shared key access off**, require **TLS 1.2**, and set the properties in the template.',
          '**Views, masks and row filters** limit what a person sees. **Logs and KQL alerts** show who is refused.'
        ],
        lines: [
          'I read a secret once, and I never print it.',
          'I close the public door only after the private route works.',
          'I keep every role assignment in the template.'
        ]
      })
    ]
  });
})();
