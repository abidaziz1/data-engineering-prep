/* Mission 3: Microsoft Entra ID, Azure RBAC and managed identities. The credential chain of the Azure SDK and the request that a managed identity
   credential sends were recorded with azure-identity: the chain in a clean process with no login, and the requests against a local stand-in for
   the identity endpoint. The token claims are made up in the documented shape. Roles, scopes, ACLs and the decision order come from
   documentation, and nothing here ran on Azure. */
(function () {
  var B = LAB.b, G = LAB.get;
  var CH = G.counts('identity.chain'), MI = G.counts('identity.managed_identity_requests').cases, TK = G.counts('identity.token_claims');
  G.expect(CH.order.length === 9 && CH.order[0] === 'EnvironmentCredential' && CH.order[2] === 'ManagedIdentityCredential' && CH.order[5] === 'AzureCliCredential', 'the order of the default credential chain');
  G.expect(MI.length === 3 && MI.every(function (c) { return c.ok; }) && MI[0].requests[0].query['api-version'] === '2019-08-01' && MI[2].requests[0].path === '/metadata/identity/oauth2/token' && MI[0].requests[0].query.resource === 'https://storage.azure.com', 'the three managed identity requests');
  G.expect(MI[1].requests[0].query.client_id === '22222222-3333-4444-5555-666666666666' && MI[2].requests[0].headers.Metadata === 'true', 'the user-assigned request carries a client id');
  G.expect(TK.made_up === true && TK.claims.aud === 'https://storage.azure.com' && TK.claims.idtyp === 'app', 'the example token');

  function q(o) { return Object.keys(o).map(function (k) { return k + '=' + o[k]; }).join('&'); }
  function hdr(h) { return Object.keys(h).map(function (k) { return k + ': ' + h[k]; }); }
  function req(c, label, host) {
    var r = c.requests[0];
    return ['# ' + label, 'GET ' + host + (host.indexOf('<') === 0 ? '' : r.path) + '?' + q(r.query)].concat(hdr(r.headers)).join('\n');
  }
  var REQ = [
    req(MI[0], 'a function app, system-assigned identity', '<IDENTITY_ENDPOINT>'), '',
    req(MI[1], 'the same app, user-assigned identity', '<IDENTITY_ENDPOINT>'), '',
    req(MI[2], 'a virtual machine, the instance metadata service', 'http://169.254.169.254')
  ].join('\n');
  var CLAIMS_OBJ = {};
  TK.order.forEach(function (k) { CLAIMS_OBJ[k] = TK.claims[k]; });      /* the recording keeps the keys sorted, so use the order that the recorder wrote them in */
  var CLAIMS = JSON.stringify(CLAIMS_OBJ, null, 2);
  var PY_BUG = [
    'from azure.storage.blob import BlobServiceClient',
    '',
    'CONN = "DefaultEndpointsProtocol=https;AccountName=stbrewlinelakeprod;AccountKey=Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==;EndpointSuffix=core.windows.net"',
    'svc = BlobServiceClient.from_connection_string(CONN)',
    'container = svc.get_container_client("raw")'
  ].join('\n');
  var PY_FIX = [
    'from azure.identity import DefaultAzureCredential',
    'from azure.storage.blob import BlobServiceClient',
    '',
    'svc = BlobServiceClient("https://stbrewlinelakeprod.blob.core.windows.net", credential=DefaultAzureCredential())',
    'container = svc.get_container_client("raw")'
  ].join('\n');
  var BICEP_BUG = [
    "resource adfIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' existing = {",
    "  name: 'id-brewline-adf'",
    '}',
    '',
    "resource grant 'Microsoft.Authorization/roleAssignments@2022-04-01' = {",
    "  name: guid(lake.id, adfIdentity.id, 'blob-data-contributor')",
    '  scope: lake',
    '  properties: {',
    "    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', 'ba92f5b4-2d11-453d-a403-e96b0029c9fe')",
    '    principalId: adfIdentity.id',
    "    principalType: 'ServicePrincipal'",
    '  }',
    '}'
  ].join('\n');
  var BICEP_FIX = BICEP_BUG.replace('principalId: adfIdentity.id', 'principalId: adfIdentity.properties.principalId');

  LAB.addChapter({
    id: 'm3', n: 3, title: 'Entra ID, RBAC and managed identities', short: 'Identity', blurb: 'Who is who, roles and scopes, ACLs, managed identities, the credential chain and a 403 that is not what it seems', minutes: 44,
    focus: ['sf', 'qual'],
    goals: [
      'Tell a **user, a group, a service principal and a managed identity** apart, and say which needs a secret.',
      'Read a **role assignment**: who, which role, which scope, and what it inherits.',
      'Explain the difference between the **management plane and the data plane**, and why **Owner reads no blob**.',
      'Follow a request through **network, credential, role and ACL**, and say what each layer decides.',
      'Explain how **DefaultAzureCredential** finds an identity, and what a managed identity sends.',
      'Choose the right identity for a **pipeline, a function and a GitHub job**.'
    ],
    say: 'Mission 3 is identity, and it is where most Azure data projects get stuck on a 403. Who is calling, what role do they hold, at what scope, and which layer said no? I recorded the real credential chain of the Azure SDK and the request that a managed identity sends. The roles, scopes and ACL rules come from documentation, because the emulator cannot check them.',
    scenes: [
      B.talk({
        id: 'm3-talk', t: 1, src: 'docs', title: 'Who is who in Microsoft Entra ID',
        say: 'Entra ID is the directory behind every sign-in. It was called Azure Active Directory until 2023, and older pages still use the old name. Press Next for the five kinds of identity and thing that you will meet.',
        items: [
          ['Users and groups', 'A user is a person with a sign-in. A group is a set of users, and of other groups. Give roles to groups, not to people, so a new hire gets access by joining a group and a leaver loses it by leaving one.', 'Roles go to groups.'],
          ['Service principals', 'A service principal is the identity of an application inside one tenant. You create it by registering an application. It signs in with a secret, a certificate or a federated token. A secret expires, and an expired secret is a common reason for a pipeline to fail at night.', 'An app identity, with a credential to keep alive.'],
          ['Managed identities', 'A managed identity is a service principal that Azure creates and rotates for you. There is no secret to store. A system-assigned identity belongs to one resource and dies with it. A user-assigned identity is its own resource that you attach to one or many resources.', 'No secret to leak or expire.'],
          ['Federated credentials', 'A federated credential tells an app registration to trust tokens from another issuer, such as GitHub Actions or a Kubernetes cluster. The outside system proves who it is with its own token, and Entra swaps it for an Azure token. There is no secret.', 'Trust a token, not a password.'],
          ['Tokens', 'Entra signs in an identity and hands out a signed token for one resource, for about an hour. The token says who the caller is and who it is meant for. Storage checks the signature and the audience, and then looks at the role assignments.', 'A short-lived, signed proof.']
        ],
        cols: 1,
        call: { k: 'tip', h: 'A habit.', t: 'For every job, ask: what identity does it run as, and where is its secret? The best answer is a managed identity and no secret at all.' }
      }),

      B.flow({
        id: 'm3-flow', t: 1, src: 'docs', title: 'A managed identity asks for a token', g: 'identity', legend: true,
        steps: [
          { say: 'A function app wants to read a blob. Its code has no password. Press Next to follow how it gets a token and what the storage account does with it.', cap: 'No secret in the code.' },
          { say: 'Step 1. The code calls the Azure SDK with DefaultAzureCredential. The SDK looks for an identity it can use. In Azure it finds the managed identity of the host.', on: ['m1'], focus: ['app', 'ep'], cap: 'The SDK asks the host.' },
          { say: 'Step 2. The host runs a small identity endpoint that only local code can reach. The SDK asks it for a token for the resource that it wants, here storage. A header proves the request is from local code.', on: ['m2'], focus: ['ep', 'aad'], cap: 'The endpoint asks Entra ID.' },
          { say: 'Step 3. Entra ID knows which identity belongs to this host. It signs a token for the storage resource and sends it back. Step 4. The endpoint hands the token to the SDK.', on: ['m3', 'm4'], focus: ['aad', 'ep', 'app'], cap: 'A signed token comes back.' },
          { say: 'Step 5. The code sends the token to the storage account as a bearer token. Step 6. Storage checks the signature and then the role assignments of this identity. Step 7. A role that grants the data action allows the call.', on: ['m5', 'm6', 'm7'], focus: ['app', 'st', 'rb', 'ok'], cap: 'Storage checks the token, then the role.' }
        ]
      }),

      B.code({
        id: 'm3-req', t: 1, src: 'rec', title: 'The request a managed identity credential sends', file: 'identity-requests.txt', lang: 'text', code: REQ,
        steps: [
          { say: 'I pointed the real ManagedIdentityCredential at a small local server that plays the identity endpoint, and wrote down what the SDK sent. These are the SDK\'s own requests. The three cases are the three places your code may run.', lines: null },
          { say: 'In a function app or an App Service app the host sets two variables: the address of the endpoint and a secret header. The SDK sends `api-version=' + MI[0].requests[0].query['api-version'] + '` and the header `X-IDENTITY-HEADER`. I show it as `<secret>`, because only the host knows it.', lines: G.span(REQ, /^# a function app, system/, /^Metadata/) },
          { say: 'Look at the `resource` parameter. My code asked for the scope `https://storage.azure.com/.default`, and the SDK sent `resource=' + MI[0].requests[0].query.resource + '` without the `/.default`. A managed identity endpoint speaks resources, not scopes.', lines: G.span(REQ, /^GET <IDENTITY_ENDPOINT>\?api-version=2019-08-01&resource/) },
          { say: 'With a user-assigned identity the SDK adds `client_id`. A host can have several, so the code says which one. If you leave it out and the host has several, the call fails.', lines: G.span(REQ, /^# the same app/, /^Metadata/) },
          { say: 'On a virtual machine there is no secret header. The endpoint is the fixed address `169.254.169.254`, reachable only from that machine, and the request needs the header `Metadata: true`, which stops a browser or a proxy from sending it by accident.', lines: G.span(REQ, /^# a virtual machine/) }
        ],
        note: 'The server answered with a made-up token, so this proves what the SDK sends, not what Entra does. The endpoint address of a function app comes from an environment variable of the host, so it is shown as a placeholder. Never log the secret header.'
      }),

      B.code({
        id: 'm3-token', t: 1, src: 'docs', title: 'What is inside a token', file: 'token-claims.json', lang: 'json', code: CLAIMS,
        steps: [
          { say: 'A token is three parts joined by dots, and the middle part is JSON. This one is made up in the documented shape, signed by nobody, so no service would accept it. Read the claims that you check when you debug a 403.', lines: null },
          { say: '`aud` is the audience: who the token is for. A token for storage is refused by Key Vault. `iss` names the issuer and the tenant.', lines: G.span(CLAIMS, /"aud"/, /"iss"/) },
          { say: '`iat`, `nbf` and `exp` are the times: issued at, not before, and expiry. A clock that is off by minutes gives surprising 401 answers.', lines: G.span(CLAIMS, /"iat"/, /"exp"/) },
          { say: '`oid` is the object id of the identity. A role assignment names this id, not the client id and not the name. `tid` is the tenant. `idtyp` says an application, and not a user, is calling.', lines: G.span(CLAIMS, /"idtyp"/, /"tid"/) },
          { say: '`xms_mirid` appears for a managed identity and names the resource that it belongs to. It is the quick way to see which identity a job really used.', lines: G.span(CLAIMS, /"xms_mirid"/) }
        ],
        note: 'To read a real token, paste it into a decoder that runs on your own machine, never a website, because a token is a credential until it expires. The claim names above are from the documentation, and which ones appear depends on the token version and the kind of caller.'
      }),

      B.widget({ id: 'm3-chain-lab', kind: 'credchain', t: 1, src: 'rec', title: 'Lab: which credential signs in?' }),

      B.cmp({
        id: 'm3-planes', t: 1, src: 'docs', title: 'Two planes: management and data',
        say: 'Azure has two doors. Press Next to read them. Most 403 errors in data work come from holding a key to one door and standing at the other.',
        cols: ['', 'Management plane', 'Data plane'],
        hl: 2,
        rows: [
          ['Where it runs', 'Azure Resource Manager, which creates and configures resources', 'The service itself: the blob endpoint, the queue endpoint, the Key Vault endpoint'],
          ['What it does', 'Create a storage account, set a firewall, deploy a pipeline, list the account keys', 'Read and write blobs, send messages, get a secret value'],
          ['Example action', '`Microsoft.Storage/storageAccounts/write`', '`Microsoft.Storage/storageAccounts/blobServices/containers/blobs/read`, a data action'],
          ['Roles that grant it', 'Owner, Contributor, Reader, and resource roles such as Data Factory Contributor', 'Storage Blob Data Reader, Contributor and Owner, Storage Queue Data Contributor, Key Vault Secrets User'],
          ['The trap', 'Owner and Contributor can list the account keys. A key then opens the data plane, with no role.', 'A data role has no management rights. A person with only Storage Blob Data Reader cannot see the account settings.']
        ],
        steps: [
          { upto: 3, say: 'The two planes, and an action from each. Notice that the data action names a blob.' },
          { upto: 5, say: 'Who holds which door. The classic mistake is Owner with no data role, and a key that makes it work anyway, which is a reason to switch the key off.' }
        ],
        pick: 'Give people and pipelines **a data role at the narrowest scope that works**, give management roles to the few who deploy, and **switch off key access** so that no one can go around the roles.'
      }),

      B.widget({ id: 'm3-scopes-lab', kind: 'scopes', t: 1, src: 'docs', title: 'Lab: a role, a scope and who inherits it' }),

      B.cmp({
        id: 'm3-roles', t: 1, src: 'docs', title: 'The roles a data engineer meets',
        say: 'You do not need to learn hundreds of roles. Press Next to read the dozen that data work uses. Look for the word Data in the name: it marks a data plane role.',
        cols: ['Role', 'It lets the identity', 'Usually assigned'],
        hl: 1,
        rows: [
          ['Storage Blob Data Reader', 'read and list blobs and containers', 'on a container, to analysts and to engines that only read'],
          ['Storage Blob Data Contributor', 'read, write and delete blobs', 'on a container, to the pipeline that writes that zone'],
          ['Storage Blob Data Owner', 'do all of that, and set ACLs and ownership', 'to a small admin group, or to a pipeline that manages ACLs'],
          ['Storage Queue Data Contributor', 'read, write and delete queue messages', 'to a function that uses queues'],
          ['Azure Event Hubs Data Sender', 'send events', 'to a producer, on the event hub'],
          ['Azure Event Hubs Data Receiver', 'read events', 'to a consumer, on the event hub or a consumer group'],
          ['Key Vault Secrets User', 'read secret values', 'to an identity that needs a secret, on the vault'],
          ['Data Factory Contributor', 'create and change Data Factory resources', 'to engineers in development, and to the deploy identity'],
          ['Contributor', 'create and change every resource, but not assign roles', 'to the deploy identity of a resource group'],
          ['Reader', 'see every resource and its settings', 'to auditors and to people who monitor'],
          ['Monitoring Reader', 'read metrics and logs', 'to operations'],
          ['User Access Administrator', 'assign roles, and nothing else', 'to a small group, or to a deploy identity that creates role assignments']
        ],
        steps: [
          { upto: 4, say: 'Storage first. Reader and Contributor are the two you assign most. Owner is for whoever manages ACLs.' },
          { upto: 8, say: 'Streams, secrets and Data Factory. Data roles for the data, a management role for the factory itself.' },
          { upto: 12, say: 'Broad roles. Use them sparingly, at the smallest scope, for the fewest identities.' }
        ],
        pick: 'Start with **Storage Blob Data Reader for readers, Storage Blob Data Contributor for the pipeline that writes a zone**, and **assign at the container**, not the subscription.'
      }),

      B.flow({
        id: 'm3-access-flow', t: 1, src: 'docs', title: 'How storage decides a data request', g: 'access', legend: true,
        steps: [
          { say: 'One request to read a blob, and five things that can say no. Press Next to follow it. The order is the thing to remember: network, credential, role, role condition, ACL.', cap: 'A request is checked in layers.' },
          { say: 'Step 1 and 2. The request arrives, and the network rules look at where it came from. A firewall that does not allow the caller ends the check here, before any identity is read.', on: ['i1', 'i2'], focus: ['rq', 'nw', 'au'], cap: 'Network first.' },
          { say: 'Step 3. Who is calling? An account key or a SAS is allowed by the token itself, and RBAC and ACLs are never looked at. An Entra token goes on to the role assignments.', on: ['i3'], focus: ['au', 'rb'], tags: ['tg_sas'], cap: 'A key or a SAS is its own permission.' },
          { say: 'Step 4. Azure RBAC looks for a role that holds the data action, at this scope or above. A grant allows the call at once, and the check ends. An optional condition on the role can still narrow it.', on: ['i4', 'i5'], focus: ['rb', 'ab', 'ac'], cap: 'A grant ends the check.' },
          { say: 'Step 6 and 7. Only when no role grants, an ADLS Gen2 account checks the ACLs: execute on every folder above, and read or write on the file. A pass allows the call. Anything else is a 403.', on: ['i6', 'i7'], focus: ['ac', 'ok', 'no'], tags: ['tg_acl'], cap: 'ACLs are the last chance to say yes.' }
        ]
      }),

      B.widget({ id: 'm3-access-lab', kind: 'access', t: 1, src: 'docs', title: 'Lab: allow or deny, and why' }),

      B.talk({
        id: 'm3-acl', t: 2, src: 'docs', title: 'ACLs on an ADLS Gen2 account',
        say: 'ACLs are the POSIX-style permissions of Data Lake. Press Next for the rules that people forget.',
        items: [
          ['Read, write, execute', 'Every directory and file has an ACL with read (r), write (w) and execute (x). On a directory, execute means you may pass through it. To read a file you need execute on every directory above it, from the container root down, and read on the file.', 'Execute on the whole path.'],
          ['Owner, group, named entries, other', 'An ACL has an owning user, an owning group, entries for named users and groups, and an entry for everyone else. A mask limits the named entries. Use named groups, never named people, because each directory holds a limited number of entries.', 'Use groups, and keep the list short.'],
          ['Access and default ACLs', 'An access ACL decides who can use the item now. A default ACL, which sits on a directory, is copied into the access ACL of items created inside it later. It is not applied to items that already exist. To fix the existing ones you update the ACLs recursively.', 'Defaults are for the future only.'],
          ['A role grant skips ACLs', 'If a role such as Storage Blob Data Reader grants the read, the ACL is never evaluated. So an ACL cannot take away what a role gives. ACLs help for fine control below the container, for identities that hold no data role.', 'ACLs add access. They do not subtract it.'],
          ['Storage Blob Data Owner', 'This role acts as a superuser for ACL purposes. It can read and write everything and change ACLs, whatever the ACLs say. Give it to very few.', 'The one role that overrides ACLs.']
        ],
        cols: 1,
        call: { k: 'warn', h: 'Plan ACLs before data lands.', t: 'Set the default ACLs on a directory before the first file arrives. Fixing a million files afterwards takes a recursive update that runs for a long time.' }
      }),

      B.cmp({
        id: 'm3-who', t: 1, src: 'docs', title: 'Which identity for which job',
        say: 'A job needs an identity. Press Next to compare the options on one question: where does the secret live?',
        cols: ['Identity', 'Secret to look after', 'Use it for', 'The catch'],
        hl: 1,
        rows: [
          ['System-assigned managed identity', 'none', 'one resource: a factory, a function app, a workspace', 'It is created with the resource, so a template must assign roles after it exists, and a recreated resource is a new identity.'],
          ['User-assigned managed identity', 'none', 'several resources that share access, and templates that assign roles first', 'One more resource to manage, and every resource that uses it shares its rights.'],
          ['Service principal with a secret', 'a secret that expires', 'a tool that cannot use a managed identity', 'The secret is stored somewhere, expires, and leaks.'],
          ['Service principal with a certificate', 'a certificate that expires', 'the same, with a stronger credential', 'Still a credential to rotate.'],
          ['Federated credential', 'none', 'GitHub Actions, Kubernetes, other clouds', 'You must write the subject claim exactly.'],
          ['A person, signed in', 'the person\'s sign-in', 'exploring, with MFA', 'Never for a scheduled job.'],
          ['The storage account key', 'a key with full access', 'nothing new', 'It cannot be limited, and it skips the roles.']
        ],
        steps: [
          { upto: 2, say: 'The managed identities. No secret. Pick system-assigned for a single resource and user-assigned when several resources share one.' },
          { upto: 5, say: 'The ones with a credential, and the one that needs none because it trusts a token.' },
          { upto: 7, say: 'People and the account key. Keep both out of jobs.' }
        ],
        pick: 'Use a **managed identity** wherever the service supports it, a **federated credential** for GitHub, and a **service principal with a certificate** only as a last resort. Keep **no secret in code**.'
      }),

      B.talk({
        id: 'm3-oidc', t: 2, src: 'docs', title: 'GitHub Actions without a stored secret',
        say: 'A deployment job needs an identity too. Press Next to see how a GitHub workflow signs in to Azure with no secret.',
        items: [
          ['The idea', 'An app registration in Entra gets a federated credential: a statement that says "trust tokens from GitHub, for this repository and this branch or environment". The workflow asks GitHub for a token, and Entra swaps it for an Azure token.', 'Trust a token, not a password.'],
          ['The subject must match', 'The federated credential names an issuer, a subject such as `repo:brewline/data:environment:prod`, and an audience. If the workflow runs from another branch, the subject differs and the sign-in fails. This is the most common error.', 'Write the subject exactly.'],
          ['The workflow side', 'The job needs the permission `id-token: write`, and a login step with the client id, the tenant id and the subscription id. None of the three is a secret. The identity then needs only the roles that deployment needs, at a resource group.', 'Three ids and one permission.'],
          ['Why it is better', 'There is no secret to expire at night or to leak from a log. A stolen token works for minutes and only from GitHub. You can see in the sign-in logs which run asked.', 'Nothing long-lived to steal.']
        ],
        cols: 1
      }),

      B.talk({
        id: 'm3-pim', t: 3, src: 'docs', title: 'People: just-in-time access and conditional access',
        say: 'For people, a standing role is a risk. Press Next for three ways to shrink it.',
        items: [
          ['Privileged Identity Management', 'PIM makes a role eligible instead of active. The person asks for it, gives a reason, waits for approval if needed, and holds it for a few hours. The log shows who had what, and when.', 'A role you ask for, for a while.'],
          ['Conditional Access', 'Rules that decide when a sign-in is allowed: require multifactor sign-in, a managed device, a country, or a low sign-in risk. They apply to people and, in a limited way, to workload identities.', 'Rules for sign-in.'],
          ['Emergency access', 'Keep one or two break-glass accounts that are excluded from conditional access, protected by long secrets kept offline, and watched by an alert. They exist for the day sign-in itself breaks.', 'Plan for the day sign-in breaks.']
        ],
        cols: 1
      }),

      B.quiz({
        id: 'm3-q1', t: 1,
        q: 'A user holds **Owner** on the subscription. Signed in with Entra ID, the user reads a blob and gets `AuthorizationPermissionMismatch` (403). Why?',
        opts: [
          { t: 'Owner is a management role. It holds no data action, so it grants nothing on the data plane', fb: '' },
          { t: 'The role has not been assigned long enough to be active', fb: 'Propagation takes a few minutes at most, and Owner usually shows in the portal at once. The role itself holds no data action.' },
          { t: 'Owner can read blobs only in the portal, not with the SDK', fb: 'The portal and the SDK follow the same rules. The portal may use the account key when you can list it.' },
          { t: 'The blob is too large for an Owner to read', fb: 'Size does not matter.' }
        ],
        ok: 0, why: 'Owner, Contributor and Reader manage resources. Reading a blob needs a data action, which Storage Blob Data Reader, Contributor and Owner hold. The fix is to assign a data role, at the container, not to add more management rights.'
      }),

      B.quiz({
        id: 'm3-q2', t: 1,
        q: 'An Entra identity holds **Storage Blob Data Reader** on the container, and the file has an empty ACL. What happens when it reads the file?',
        opts: [
          { t: 'The read is denied, because the ACL gives nothing', fb: 'The ACL is not checked when a role grants the read.' },
          { t: 'The read is allowed, because a role that grants the action ends the check', fb: '' },
          { t: 'The read is allowed only if the ACL also gives read', fb: 'The two are not combined. A grant from a role is enough.' },
          { t: 'The read is allowed once, then blocked', fb: 'There is no such rule.' }
        ],
        ok: 1, why: 'Azure RBAC is checked first. If a role holds the data action at this scope or above, the call is allowed and ACLs are never evaluated. ACLs matter for an identity that holds no data role.'
      }),

      B.quiz({
        id: 'm3-q3', t: 1,
        q: 'Code with `DefaultAzureCredential` works on your laptop and fails in a function app with "ManagedIdentityCredential authentication unavailable". What is the likely cause?',
        opts: [
          { t: 'The function app has no managed identity switched on, so the endpoint has nothing to answer with', fb: '' },
          { t: 'The laptop is faster than the function app', fb: 'Speed is not the cause.' },
          { t: 'The code must be rewritten with a connection string', fb: 'That adds a secret, and it hides the real problem.' },
          { t: 'DefaultAzureCredential works only on laptops', fb: 'It works in Azure too, and that is its point.' }
        ],
        ok: 0, why: 'On your laptop the chain found `az login`, which comes later in the order than the managed identity. In Azure there is no developer sign-in, so the managed identity is used, and it must be enabled on the app, with a role on the lake. The recorded chain shows this order.'
      }),

      B.quiz({
        id: 'm3-q4', t: 1,
        q: 'You assign **Storage Blob Data Contributor** to an identity at the **resource group** `rg-brewline-data-prod`. Which data does it reach?',
        opts: [
          { t: 'Only the resource group, and no blobs', fb: 'A resource group holds resources, not blobs, but the role is inherited downward.' },
          { t: 'The blobs of every storage account in that resource group', fb: '' },
          { t: 'The blobs of every storage account in the subscription', fb: 'A resource group is below the subscription. The role does not climb upward.' },
          { t: 'Only the blobs that the identity created', fb: 'Roles do not track ownership of blobs.' }
        ],
        ok: 1, why: 'A role assignment applies to its scope and everything below it. At the resource group it reaches every storage account in it. That is why the narrow scope matters: assign at the container when one container is enough.'
      }),

      B.order({
        id: 'm3-ord', t: 1, q: 'Put the setup of a secretless pipeline identity in order.',
        items: [
          'Create the user-assigned managed identity',
          'Assign Storage Blob Data Contributor to it, on the container of the zone it writes',
          'Attach the identity to the Data Factory or the function app',
          'Change the code to use DefaultAzureCredential and the account URL',
          'Test with a small run and read the sign-in log',
          'Delete the old secret and switch off key access'
        ],
        why: 'Create the identity, give it exactly the access it needs, attach it, change the code, prove it, and then remove the secret. Removing the secret last means you can roll back until the new path works.'
      }),

      B.bug({
        id: 'm3-bug', t: 1, q: 'This job reads the lake. A security review rejects it. Click the line that causes the finding.',
        file: 'read_lake.py', lang: 'python', code: PY_BUG, bad: [3],
        hint: 'Look for a value that works for anyone who finds it.',
        why: 'Line 3 holds the account key in a connection string. The key is full access, skips every role and ACL, and cannot be limited. In a repository it is a leak. The fix is the account URL with `DefaultAzureCredential`, a managed identity and a data role.',
        fix: PY_FIX,
        cheer: 'No secret in code, ever.'
      }),

      B.bug({
        id: 'm3-bug2', t: 2, src: 'docs', q: 'This Bicep gives the factory identity a role on the lake. The deployment succeeds, and the pipeline still gets 403. Click the line that is wrong.',
        file: 'roles.bicep', lang: 'bicep', code: BICEP_BUG, bad: [10],
        hint: 'A role assignment names the principal by its object id.',
        why: 'The `principalId` of a role assignment is the object id of the identity. Line 10 gives the resource ID of the identity, which is a different value, so the assignment does not name the identity at all. `adfIdentity.properties.principalId` is the object id. The role id `ba92f5b4-2d11-453d-a403-e96b0029c9fe` is Storage Blob Data Contributor. The Bicep itself was not compiled here.',
        fix: BICEP_FIX,
        cheer: 'Name the principal by its object id.'
      }),

      B.decide({
        id: 'm3-dec', t: 2, src: 'docs', title: 'Decision: which identity does the Data Factory use?',
        scenario: 'Brewline has a Data Factory in development and one in production. The template should give each factory its roles **before the first run**, and a factory may be recreated by the template. The factory reads Azure SQL and writes the lake.',
        opts: [
          { t: 'A service principal with a secret that is kept in Key Vault', d: 'A familiar pattern.', lose: 'A secret that expires and must be rotated, with the vault as one more thing to protect. A managed identity gives the same access with nothing to rotate.' },
          { t: 'The system-assigned managed identity of each factory', d: 'Nothing to create. The factory has its identity from the start.', lose: 'The identity does not exist until the factory does, so the template must assign the roles after creating it, and a recreated factory is a new identity with no roles.' },
          { t: 'A user-assigned managed identity, created first, with its roles, then attached to each factory', d: 'The identity and its roles exist before the factory, and survive a recreated factory.' }
        ],
        pick: 2,
        why: 'With a user-assigned identity the template can create the identity, assign its roles, and only then create the factory, so the first run already has access. A recreated factory attaches the same identity and keeps working. There is no secret to rotate.',
        when: 'For a single factory that is never recreated, a system-assigned identity is simpler and is a fair choice. Share a user-assigned identity only between resources that should have exactly the same rights.'
      }),

      B.incident({
        id: 'm3-inc', t: 2, src: 'docs', title: 'Incident: 403 right after a role assignment', time: '11:20',
        alert: '**A new pipeline fails with `AuthorizationPermissionMismatch` (HTTP 403) when it writes to the `curated` container.** An engineer assigned the **Contributor** role to the factory identity on the storage account ten minutes ago, and the portal shows the assignment. The pipeline signs in with a managed identity.',
        clues: ['The role is Contributor, a management role', 'The error names the permission, not the network', 'The role is assigned on the account, which is the right scope'],
        opts: [
          { t: 'Assign Storage Blob Data Contributor to the identity, at the container or the account, and retry with a fresh token', fb: '' },
          { t: 'Wait an hour, because role assignments take a long time to apply', fb: 'Propagation takes minutes, not an hour. The role is the wrong kind, and waiting changes nothing.' },
          { t: 'Give the identity Owner on the subscription', fb: 'Owner holds no data action either, and it is far too broad.' },
          { t: 'Switch on the storage account key and put it in the pipeline', fb: 'It works and removes every control. It moves the problem and adds a secret.' }
        ],
        best: 0,
        why: 'Contributor manages the account but holds no data action, so the write has no role that grants it. `AuthorizationPermissionMismatch` means the caller is known and no role allows the call. The fix is a data role. A new token is needed only because tokens are cached until they expire.',
        checks: [
          ['Read the error', '`AuthorizationPermissionMismatch` is a role or ACL problem. A network problem looks different.'],
          ['Find the identity', 'Read the claims of the token, or the sign-in log: which object id called?'],
          ['List its roles', 'Show the role assignments at the container, the account and above. Is there a data role?'],
          ['Assign and retry', 'Assign the data role at the narrowest scope. Role changes can take a few minutes to apply, and an old token keeps the old rights until it expires.'],
          ['Set the rule', 'The template assigns data roles, and a test writes one blob after every deployment.']
        ],
        tell: 'A new pipeline failed to write to the curated container with AuthorizationPermissionMismatch. The engineer had given its identity the Contributor role on the account, which manages the account but holds no data action. I assigned Storage Blob Data Contributor on the curated container, waited a few minutes for it to apply, and retried with a fresh token. I added the data role to the template and a smoke test that writes one blob after every deployment.',
        prevent: ['Give **data roles** for data access, and **management roles** for management', 'Assign at the **narrowest scope** that works', 'Add a **smoke test** that writes one blob after each deployment', 'Read the **claims of the token** before changing a role']
      }),

      B.incident({
        id: 'm3-inc2', t: 2, src: 'docs', title: 'Incident: the nightly job stopped on the first of the month', time: '03:10',
        alert: '**The nightly load fails at 03:00 with "AADSTS7000222: the provided client secret keys are expired".** Nothing was deployed. The job signs in as a service principal. The secret was created a year ago, and the engineer who made it has left.',
        clues: ['A secret was created 12 months ago with the default life', 'The credential is in a pipeline variable', 'Nobody owns the app registration'],
        opts: [
          { t: 'Replace the service principal with a managed identity, so that there is no secret, and put an owner on the app registration that remains', fb: '' },
          { t: 'Create a new secret with no expiry and put it in the same variable', fb: 'Secrets are limited in life on purpose. This repeats the problem and keeps a secret that leaks.' },
          { t: 'Extend the old secret by changing the clock on the server', fb: 'Entra checks the date. It does not work.' },
          { t: 'Skip the load tonight and tell nobody', fb: 'The reports will be wrong, and the cause remains.' }
        ],
        best: 0,
        why: 'An expired secret stops the sign-in. A new secret fixes tonight and sets the next failure a year away. A managed identity has no secret, so there is nothing to expire. Where a secret must stay, give the app an owner group, set an alert before expiry and rotate on a schedule.',
        checks: [
          ['Read the error code', 'AADSTS7000222 names an expired secret.'],
          ['Find the app registration', 'Who owns it, and when do its credentials expire?'],
          ['Fix tonight', 'Create a short-lived secret only to unblock, and note the date.'],
          ['Fix for good', 'Move the job to a managed identity or a federated credential.'],
          ['Watch the rest', 'List every app registration with an expiring secret, and alert 30 days before.']
        ],
        tell: 'Our nightly load failed with an expired client secret, a year after the service principal was created by someone who has since left. I unblocked tonight with a short-lived secret, then moved the job to a managed identity so that there is no secret to expire, and I gave the remaining app registrations an owner group. I added a report of expiring credentials and an alert thirty days before expiry.',
        prevent: ['Prefer **managed identities** and **federated credentials**', 'Give every app registration an **owner group**', 'Alert **30 days before** a credential expires', 'Never keep a **secret in a pipeline variable** that nobody owns']
      }),

      B.qa({
        id: 'qa-entra', t: 1, tag: 'Identity', secs: 60,
        q: 'Explain the identities in Microsoft Entra ID: users, groups, service principals and managed identities.',
        pts: ['A tenant is the directory that holds identities', 'Users sign in, and groups collect users so roles go to groups', 'A service principal is the identity of an app, with a secret or certificate', 'A managed identity is a service principal that Azure manages, with no secret', 'System-assigned lives with one resource, user-assigned stands alone', 'Federated credentials trust an outside token such as GitHub'],
        short: 'Entra ID is the directory behind every sign-in. A tenant holds the identities. A user is a person, and a group collects users and other groups, and I give roles to groups so that access follows membership.\n\nA service principal is the identity of an application inside the tenant. It signs in with a secret, a certificate or a federated token, and a secret expires, which is a common reason for a night job to fail.\n\nA managed identity is a service principal that Azure creates and rotates for me, so there is no secret. A system-assigned one belongs to a single resource and is deleted with it. A user-assigned one is a resource of its own that I can attach to several resources, which also lets a template assign its roles before the resource exists.\n\nFor GitHub or Kubernetes I use a federated credential, where Entra trusts the token of the outside system and I store no secret.',
        fu: [
          ['What was Azure Active Directory?', 'The earlier name of Entra ID. Old documentation and error messages still say AAD, for example in the error codes that begin with AADSTS.'],
          ['When would you share a user-assigned identity?', 'When several resources need exactly the same access, or when a template must grant roles before the resource is created.']
        ],
        trap: 'Giving every job its own service principal with a secret because that was the old way.',
        real: 'Describe an identity you replaced with a managed identity and what it removed.'
      }),

      B.qa({
        id: 'qa-rbac', t: 1, tag: 'Identity', secs: 90,
        q: 'How does Azure RBAC work, and why can a user with Owner not read a blob?',
        pts: ['A role assignment is who, which role, which scope', 'A scope is a management group, subscription, resource group or resource', 'Assignments are inherited downward', 'Management plane and data plane have separate actions and roles', 'Owner and Contributor manage resources and hold no data action', 'Assign a data role at the narrowest scope that works'],
        short: 'A role assignment has three parts: who, which role, and which scope. The scope can be a management group, a subscription, a resource group or a single resource or container, and an assignment applies to that scope and everything below it.\n\nAzure has two planes. The management plane, Azure Resource Manager, creates and configures resources, and Owner, Contributor and Reader work there. The data plane is the service itself, where I read blobs or get secrets, and it has its own data actions and roles such as Storage Blob Data Reader, Storage Blob Data Contributor and Key Vault Secrets User.\n\nSo a user with Owner can manage the storage account but holds no data action, and an Entra token reads nothing until it also holds a data role. Owner can list the account keys, which would open the data without a role, and that is one more reason I switch key access off.\n\nI assign data roles to groups, at the container when one container is enough, and I put the assignments in the template.',
        fu: [
          ['Where do you check why a call was denied?', 'Read the claims of the token to learn the identity, list its role assignments at the container, the account and above, then check the network rules. The error code names which kind of problem it is.'],
          ['How long does a new assignment take?', 'A few minutes to apply, and a token that was issued before keeps its old rights until it expires.']
        ],
        trap: 'Fixing a 403 by giving Owner. It does not add a data action, and it is far too broad.',
        real: 'Describe a 403 you debugged and the layer that caused it.'
      }),

      B.qa({
        id: 'qa-mi', t: 1, tag: 'Identity', secs: 60,
        q: 'How does a managed identity get a token, and why is it better than a secret?',
        pts: ['The SDK asks a local identity endpoint of the host', 'The endpoint asks Entra ID, which signs a token for one resource', 'No secret in code, settings or the repository', 'Azure rotates the credential for the identity', 'Grant a data role, and the token carries who and for what', 'The token is short-lived, so a leak is short too'],
        short: 'In Azure, my code calls the SDK with `DefaultAzureCredential`. The SDK finds the managed identity of the host and sends a request to a local identity endpoint, with a header that only local code can set, naming the resource it wants, for example storage. The endpoint asks Microsoft Entra ID, which knows which identity belongs to this host and returns a signed token for that resource. The SDK sends it to the service as a bearer token, and the service checks the signature and then the role assignments of the identity.\n\nIt beats a secret because nothing is stored: no connection string in settings, no key in a repository, nothing to expire at night or to rotate by hand, since Azure rotates the credential for me. The token lives about an hour, so a stolen token is a short problem.\n\nI give the identity a data role at the narrowest scope. With a user-assigned identity I also pass the client id, because a host can have several.',
        fu: [
          ['What does the SDK send when the host has several identities?', 'It sends the client id of the one you want, so the endpoint knows which to use. Without it, the call can fail.'],
          ['Can a managed identity be used outside Azure?', 'No. It exists only for Azure resources. Use a federated credential or a service principal elsewhere.']
        ],
        trap: 'Saying a managed identity has a password that Azure hides. It has no password you can read at all.',
        real: 'Describe a pipeline you moved to a managed identity and how you tested it.'
      }),

      B.qa({
        id: 'qa-acl', t: 2, tag: 'Identity', secs: 90,
        q: 'On ADLS Gen2, when do ACLs apply, and how do they differ from RBAC?',
        pts: ['RBAC is checked first, and a grant ends the check', 'ACLs run only when no role grants the action', 'ACLs add access below the container, per directory and file', 'Execute is needed on every folder above, read or write on the file', 'Default ACLs apply to new items only, so set them before data lands', 'Use groups, and mind the limit on entries'],
        short: 'For an Entra token, Azure RBAC is checked first. If a role such as Storage Blob Data Reader holds the data action at this scope or above, the call is allowed and the ACLs are never looked at. Only when no role grants does the ACL check run. So an ACL can add access for an identity that holds no data role, but it can never take away what a role grants.\n\nAn ACL has read, write and execute on every directory and file, with owner, group, named entries and other. To read a file the caller needs execute on every directory above it, from the container root, and read on the file. A missing execute on one folder is the usual cause of a surprise 403.\n\nA default ACL on a directory is copied into new items later and does not touch the existing ones, so I set the defaults before data lands, and I use a recursive update when I must fix old data. I use named groups, because each item holds a limited number of entries.',
        fu: [
          ['Which role overrides ACLs?', 'Storage Blob Data Owner. It acts as a superuser for ACL purposes.'],
          ['Does a SAS check ACLs?', 'A SAS signed with the account key is allowed by the token itself, so it does not. Check the documentation for the user delegation case.']
        ],
        trap: 'Setting an ACL to deny someone who also holds a data role. The role wins, and the ACL never runs.',
        real: 'Describe a lake where you used ACLs and why roles were not enough.'
      }),

      B.qa({
        id: 'qa-chain', t: 1, tag: 'Identity', secs: 60,
        q: 'What is DefaultAzureCredential, and why does the same code work on a laptop and in Azure?',
        pts: ['A chain of credentials that is tried in a fixed order', 'The first one that returns a token wins', 'Environment variables, workload identity, managed identity, then developer sign-ins', 'On a laptop it finds az login, in Azure the managed identity', 'The order can pick a surprising identity', 'The error lists every credential that failed'],
        short: 'DefaultAzureCredential is a chain. It tries a list of credentials in a fixed order and uses the first one that returns a token. In the version I recorded, the order is environment variables, workload identity, managed identity, the shared token cache, Visual Studio Code, the Azure CLI, Azure PowerShell and the Azure Developer CLI.\n\nThat is why the same code works in both places. On my laptop nothing before the CLI is set, so it uses the identity of `az login`. In Azure it finds the managed identity of the host. I write no branch for it.\n\nThe chain can also surprise me. If a service principal secret is still set in the environment of a build agent, it is used first. When every credential fails, the error lists each one with its reason, and that list is where I start debugging. In production code I can use a more specific credential when I want no surprise.',
        fu: [
          ['How do you stop it using a developer sign-in on a server?', 'Use the managed identity credential directly, or exclude the developer credentials, so a missing identity fails loudly instead of using the wrong one.'],
          ['What is the first thing you read in the error?', 'The line for ManagedIdentityCredential when the code runs in Azure, since that is the one that should have worked.']
        ],
        trap: 'Assuming it always uses the managed identity. It uses whichever comes first in the order.',
        real: 'Describe a time the chain picked the wrong identity.'
      }),

      B.qa({
        id: 'qa-oidc', t: 2, tag: 'Identity', secs: 60,
        q: 'How does a GitHub Actions workflow deploy to Azure without a stored secret?',
        pts: ['An app registration with a federated credential for the repository and branch or environment', 'The workflow requests an OIDC token from GitHub', 'Entra checks issuer, subject and audience, and swaps it for an Azure token', 'The job needs id-token: write and the client, tenant and subscription ids', 'The identity gets only the deployment roles, at a resource group', 'The subject must match exactly'],
        short: 'I create an app registration in Entra and add a federated credential that says: trust tokens from GitHub, for this repository, and for this branch or environment. The workflow asks GitHub for an OIDC token, which needs the permission `id-token: write`, and the login step gives Entra the token with the client id, the tenant id and the subscription id. None of the three ids is a secret.\n\nEntra checks the issuer, the subject and the audience of the token. If they match the federated credential, it swaps the token for an Azure token. The identity holds only the roles that the deployment needs, for example Contributor on the resource group of the environment, and a role assignment role if the template assigns roles.\n\nThere is no secret to expire or to leak from a log, and a stolen token works for minutes. The most common failure is a subject that does not match, because the run came from another branch or environment, so I write the subject exactly and test a run from the allowed branch.',
        fu: [
          ['What would you put in the subject for production?', 'An environment subject such as repo:org/repo:environment:prod, so that only jobs that pass the environment approval can sign in.'],
          ['What if the workflow also needs to read a secret?', 'Give the same identity a Key Vault role and read it at run time. Do not copy the secret into GitHub.']
        ],
        trap: 'Using a client secret in a GitHub secret because the tutorial did. Federation removes it.',
        real: 'Describe a pipeline you moved to a federated credential.'
      }),

      B.recap({
        id: 'm3-recap', n: 3, badge: 'Identity Guard', color: '#FBCFE8',
        pts: [
          'A **managed identity** is a service principal with **no secret**. Use it wherever the service supports it, and a **federated credential** for GitHub.',
          'A role assignment is **who, which role, which scope**, and it reaches everything **below** that scope.',
          'There are **two planes**. Owner and Contributor manage resources and hold **no data action**. Reading a blob needs a **data role**.',
          'Storage checks **network, credential, role, role condition, then ACL**. A role that grants **ends the check**, and a SAS or a key skips roles and ACLs.',
          '**DefaultAzureCredential** tries a chain in a fixed order and uses the first that works. Read its error: it lists every credential that failed.'
        ],
        lines: [
          'I ask which identity a job runs as, and where its secret is.',
          'I give data roles for data and management roles for management.',
          'I read the layer that said no before I change a role.'
        ]
      })
    ]
  });
})();
