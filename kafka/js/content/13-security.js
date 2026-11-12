/* Mission 13: security. A real broker that asks who you are (SASL with SCRAM, TLS with client certificates) and what you may do (ACLs), with the errors that the clients really reported.
   Real: the broker, its StandardAuthorizer, the kafka-acls and kafka-configs tools, the clients, the certificates (made with openssl and keytool from a certificate authority that exists for this recording).
   Not run: Kerberos, OAuth and OpenID Connect, role based access control of commercial platforms, and encryption of the disk. They are from documentation, and the screens say so. */
(function () {
  var B = LAB.b, G = LAB.get;
  var SA = G.table('security.sasl'), TL = G.table('security.tls'), LS = G.counts('security.listeners');
  var UC = G.text('security.users_created'), UD = G.text('security.users_described'), DL = G.text('security.denied_log'), AT = G.text('security.acl_list_topic'), AA = G.text('security.acl_list_all'), PL = G.text('security.principal_log');
  var PY = G.file('code/security.py');
  var PROPS = G.lines(PY, G.at(PY, /^    props = \{/), G.at(PY, /'advertised\.listeners'/));
  var sa = function (k) { var r = SA.rows.filter(function (x) { return x[0].indexOf(k) === 0; })[0]; G.expect(!!r, 'sasl row "' + k + '"'); return r; };
  var tl = function (k) { var r = TL.rows.filter(function (x) { return x[0].indexOf(k) === 0; })[0]; G.expect(!!r, 'tls row "' + k + '"'); return r; };
  G.expect(sa('no login at all')[1] === '_MSG_TIMED_OUT' && sa('alice with the wrong password')[1] === '_MSG_TIMED_OUT' && /AUTHENTICATION/.test(sa('alice with the wrong password')[3]), 'a failed login looks like a timeout, and only the error callback names it');
  G.expect(sa('alice, right password, no ACL')[1] === 'TOPIC_AUTHORIZATION_FAILED' && sa('alice, after Write')[1] === 'delivered', 'an ACL turns a denial into a delivery');
  G.expect(sa('bob reads with a group, Read on the topic only')[1] === 'GROUP_AUTHORIZATION_FAILED' && sa('bob reads with a group, after Read')[1] === 'delivered' && sa('bob reads, after a deny')[1] === 'TOPIC_AUTHORIZATION_FAILED', 'a consumer needs the group too, and a deny wins');
  G.expect(sa('alice writes to brewline.orders')[1] === 'delivered' && sa('alice writes to brewline.refunds')[1] === 'delivered' && sa('alice writes to other.topic')[1] === 'TOPIC_AUTHORIZATION_FAILED', 'a prefixed ACL covers the topics with the prefix');
  G.expect(tl('trusted authority and a client certificate')[1] === 'TOPIC_AUTHORIZATION_FAILED' && tl('an ACL for the principal written')[1] === 'TOPIC_AUTHORIZATION_FAILED' && tl('an ACL for the principal exactly')[1] === 'delivered', 'the principal of a certificate is named by the broker');
  G.expect(LS.principal_of_a_certificate.indexOf('User:C=NL') === 0 && LS.subject_of_the_certificate.indexOf('CN=carol') === 0 && /DefaultDeny/.test(DL), 'the principal and the denial in the broker log');
  var dash = function (x) { return x === '' || x === undefined ? 'nothing' : x; };
  var clip = function (x) { x = dash(x); return x.length > 210 ? x.slice(0, 207) + '...' : x; };
  var sasl3 = function (keys) { return keys.map(function (k) { var r = sa(k); return [r[0], r[1] + (r[2] ? ': ' + r[2] : ''), clip(r[3])]; }); };
  var tls3 = function (keys) { return keys.map(function (k) { var r = tl(k); return [r[0], r[1] + (r[2] ? ': ' + r[2] : ''), clip(r[3])]; }); };

  LAB.addChapter({
    id: 'm13', n: 13, title: 'Security: who are you, and what may you do', short: 'Security', blurb: 'Listeners, SASL and TLS, principals and ACLs, with the real error that each mistake gives', minutes: 55,
    focus: ['gov', 'ci', 'qual'],
    goals: [
      'Say what a fresh Kafka cluster allows, and what the **three questions** are: encrypt, authenticate, authorize.',
      'Explain **listeners**, and the difference between **authentication** and **authorization**.',
      'Set up **SCRAM** users, and read the three different ways a login fails.',
      'Write **ACLs**: allow, deny, prefixed, and the **group** that a consumer needs.',
      'Explain **TLS with client certificates**, and how a certificate becomes a **principal**.',
      'Read the **authorizer log** to find out who was denied what.'
    ],
    say: 'Mission 13 is security, and the most useful thing I can give you is the error messages. I started a real broker with a SASL listener and a TLS listener, made users and certificates, and then made every mistake on purpose: no login, a wrong password, no ACL, a missing group, a deny rule, a certificate from the wrong authority, a certificate for the wrong name. Each one failed differently, and some of them fail in a way that does not say why. Press Next.',
    scenes: [
      B.talk({
        id: 'm13-what', t: 1, src: 'docs', title: 'An open cluster, and three questions',
        say: 'A Kafka cluster that you start with the sample settings has no security at all. Press Next.',
        items: [
          ['The default', 'The listener is **plaintext**: anyone who can reach the port can read and write **every topic**, and delete them. The connection is not encrypted and nobody is asked who they are.', 'Open to anyone on the network.'],
          ['Question 1: can others read the wire?', 'Encryption in transit: **TLS**. Without it a person on the network can read the records.', 'Encrypt.'],
          ['Question 2: who are you?', '**Authentication**: a login with a user and password (SASL: PLAIN or SCRAM), a Kerberos ticket, a token (OAuth), or a **client certificate** (TLS). The result is a name: the **principal**.', 'A name for the connection.'],
          ['Question 3: what may you do?', '**Authorization**: a list of rules, **ACLs**, that say which principal may do which operation on which resource. Without a rule the answer is **no**.', 'Allowed by a rule, or denied.'],
          ['In this mission', 'I ran a broker with SASL/SCRAM, TLS with client certificates, and the standard authorizer. Kerberos and OAuth were not run: they are described from the documentation.', 'Real: SCRAM, TLS, ACLs.']
        ],
        cols: 1,
        call: { k: 'tip', h: 'The sentence to remember:', t: 'Authentication says who you are. Authorization says what you may do. They fail with different errors, and mixing them up is the most common mistake.' }
      }),

      B.flow({
        id: 'm13-flow', t: 1, src: 'docs', title: 'How a broker decides', g: 'security', legend: true,
        steps: [
          { say: 'This is what happens each time a client talks to a broker. Press Next.', cap: 'Who, then what.' },
          { say: 'Step 1. The client connects to a **listener**: a port with a name and a protocol, such as `SASL_PLAINTEXT` or `SSL`. A broker can have several, for different kinds of clients.', on: ['k1'], focus: ['y_cl', 'y_lis'], cap: 'A client picks a listener.' },
          { say: 'Step 2. The listener **authenticates**: it checks a SCRAM login, or the client\'s certificate. A failure here ends the connection.', on: ['k2'], focus: ['y_lis', 'y_auth'], cap: 'Authentication.' },
          { say: 'Step 3. A successful login gives the connection a **principal**: a name such as `User:alice`. For a certificate it is made from the subject of the certificate.', on: ['k3'], focus: ['y_auth', 'y_pr'], cap: 'The result is a principal.' },
          { say: 'Step 4. For **every request**, the **authorizer** looks for an ACL that allows or denies this principal this operation. **A deny wins over an allow**, and no rule means no.', on: ['k4'], focus: ['y_pr', 'y_acl'], cap: 'Every request is checked.' },
          { say: 'Step 5. The rules are on **resources**: a topic, a consumer group, the cluster, a transactional id.', on: ['k5'], focus: ['y_acl', 'y_res'], cap: 'Rules sit on resources.' },
          { say: 'Step 6. Each denial is written to the **authorizer log**, with the principal, the operation and the resource. This is the first place to look.', on: ['k6'], focus: ['y_acl', 'y_log'], cap: 'Denials are logged.' },
          { say: 'Step 7. The client gets an **authorization error**, for example `TOPIC_AUTHORIZATION_FAILED`.', on: ['k7'], focus: ['y_log', 'y_no'], cap: 'The client is told no.' }
        ]
      }),

      B.code({
        id: 'm13-props', t: 2, src: 'rec', title: 'The broker settings for this mission', file: 'security.py', lang: 'python', code: PROPS,
        steps: [
          { say: 'These are the settings that I gave to the broker. Press Next.', lines: null },
          { say: 'The **authorizer** is the standard one that comes with Kafka and keeps its ACLs in the cluster metadata. **`super.users`** may do anything, so keep the list very short. `sasl.enabled.mechanisms` turns on SCRAM-SHA-256.', lines: G.span(PROPS, /authorizer\.class\.name/) },
          { say: 'The brokers talk to each other too, and they need a login. `inter.broker.listener.name` says which listener they use, and the JAAS line gives the login of the `admin` user.', lines: G.span(PROPS, /sasl\.mechanism\.inter\.broker\.protocol/, /jaas\.config/) },
          { say: 'The **keystore** holds the broker\'s own certificate and key. The **truststore** holds the authorities that it trusts. `client.auth` set to `required` makes the SSL listener ask every client for a certificate.', lines: G.span(PROPS, /ssl\.keystore\.type/, /client\.auth/) },
          { say: 'Finally the **listeners**: one for SASL on the normal port, one for the controller, and one for SSL two ports up. `advertised.listeners` is what clients are told to connect to.', lines: G.span(PROPS, /extra = /, /advertised\.listeners/) }
        ],
        note: 'Recorded: the real settings of the recording. The passwords are made up for a broker that existed for minutes. The listener is SASL_PLAINTEXT because it is the simplest to read: **in production use SASL_SSL**, so that the login and the data are encrypted. ' + LS.super_users[1]
      }),

      B.rows({
        id: 'm13-users', t: 1, src: 'rec', title: 'Users, stored in the cluster',
        steps: [
          {
            say: 'With SCRAM, the users and their credentials live **in the cluster**. I made two users with the configuration tool. The tool answers with one line for each.',
            tabs: [{ layer: 'RECORDED', name: 'kafka-configs --alter --add-config SCRAM-SHA-256=[password=...]', c: 'raw', cols: ['Output'], rows: UC.split('\n').map(function (l) { return [l]; }) }],
            notes: ['Recorded. The third user, `admin`, was created when the cluster was formatted, so that the brokers could log in to each other.']
          },
          {
            say: 'Ask the cluster to describe its users. You do not get the passwords back. You see the **mechanism** and the number of **iterations** of the hash. The server keeps a salted and hashed form, never the password.',
            tabs: [{ layer: 'RECORDED', name: 'kafka-configs --describe --entity-type users', c: 'raw', cols: ['Output'], rows: UD.split('\n').map(function (l) { return [l]; }) }],
            notes: ['Recorded. The login uses a challenge, so the password itself is not sent, even on a plaintext connection. The **data** still are plaintext, which is why you also want TLS.']
          }
        ]
      }),

      B.rows({
        id: 'm13-authn', t: 1, src: 'rec', title: 'Three ways a login fails',
        steps: [
          {
            say: 'First, **no login at all**: a client that speaks plaintext to the SASL port. Look carefully at what the program gets back. Not "access denied". A **timeout**: `_MSG_TIMED_OUT`. The client cannot tell why.',
            tabs: [{ layer: 'RECORDED', name: 'A client with no login', c: 'raw', cols: ['What was tried', 'What the producer got back', 'What only the error callback said'], rows: sasl3(['no login at all']) }],
            notes: ['Recorded with the confluent-kafka client. The delivery report said the message timed out. The error callback said that the broker was down. Neither says "you did not log in".']
          },
          {
            say: 'Second, **a wrong password**. The producer again gets only a **timeout** in its delivery report. The real reason, `invalid credentials`, appears **only in the client\'s error callback**, and in the broker log.',
            tabs: [{ layer: 'RECORDED', name: 'A wrong password', c: 'raw', cols: ['What was tried', 'What the producer got back', 'What only the error callback said'], rows: sasl3(['alice with the wrong password']) }],
            notes: ['Recorded. If your code does not set an error callback, a wrong password looks like a network problem. Many people lose an afternoon to this. **Authentication errors are not delivery errors.**']
          },
          {
            say: 'Third, **the right password with no ACL**. This one is different: the login works, and the answer is immediate and clear: `TOPIC_AUTHORIZATION_FAILED`. That is **authorization**, not authentication.',
            tabs: [{ layer: 'RECORDED', name: 'A valid login with no permission', c: 'raw', cols: ['What was tried', 'What the producer got back', 'What only the error callback said'], rows: sasl3(['alice, right password, no ACL']) }],
            notes: ['Recorded. So the error tells you where to look: a **timeout** points at the login or the network, and an **authorization failed** points at the ACLs.']
          }
        ]
      }),

      B.rows({
        id: 'm13-denied', t: 1, src: 'rec', title: 'The broker remembers every denial',
        steps: [
          {
            say: 'The authorizer wrote the denial to its log. This is the line for alice. It says who (`User:alice`), what (`DESCRIBE`), on which resource (`Topic:LITERAL:orders`), for which request (`Metadata`), and **why: `DefaultDeny`**, which means that no rule allowed it.',
            tabs: [{ layer: 'RECORDED', name: 'kafka-authorizer.log', c: 'raw', cols: ['Line of the log'], rows: [[DL]] }],
            notes: ['Recorded. The first request that was denied was a **Describe**, in a metadata request, before the Write. So a producer needs **Describe** as well as Write on the topic.']
          },
          {
            say: 'Now the fix, an ACL: **allow alice to Write and Describe the topic `orders`**. List it with the tool. Then the same producer, with the same login, delivers.',
            tabs: [{ layer: 'RECORDED', name: 'kafka-acls --list --topic orders', c: 'raw', cols: ['Output'], rows: AT.split('\n').map(function (l) { return [l.replace(/^\t/, '    ')]; }) },
              { layer: 'RECORDED', name: 'The producer, after the ACL', c: 'raw', cols: ['What was tried', 'What the producer got back', 'What only the error callback said'], rows: sasl3(['alice, after Write and Describe']) }],
            notes: ['Recorded. An ACL has a **principal**, a **host** (here `*`, any), an **operation**, a **permission type** (allow or deny) and a **resource**.']
          }
        ]
      }),

      B.rows({
        id: 'm13-group', t: 1, src: 'rec', title: 'A consumer needs the topic and the group',
        steps: [
          {
            say: 'Bob wants to read. I gave him **Read and Describe on the topic**. He joined a consumer group, and the first thing that happened was an error about the **group**, not the topic: `GROUP_AUTHORIZATION_FAILED`.',
            tabs: [{ layer: 'RECORDED', name: 'Bob, with Read on the topic only', c: 'raw', cols: ['What was tried', 'What the client got', 'What only the error callback said'], rows: sasl3(['bob reads with a group, Read on the topic only']) }],
            notes: ['Recorded. A consumer that uses a group needs **Read on the group** as well. The group is a resource with its own rules.']
          },
          {
            say: 'I added **Read on the group `bob-group`**. Now Bob read the first record.',
            tabs: [{ layer: 'RECORDED', name: 'Bob, after Read on the group', c: 'raw', cols: ['What was tried', 'What the client got', 'What only the error callback said'], rows: sasl3(['bob reads with a group, after Read on the group']) }],
            notes: ['Recorded.']
          },
          {
            say: 'Then I added a **deny** rule: Bob may not read the topic. The allow rule for the same operation was still there. Bob was refused: a **deny wins over an allow**.',
            tabs: [{ layer: 'RECORDED', name: 'Bob, after a deny rule', c: 'raw', cols: ['What was tried', 'What the client got', 'What only the error callback said'], rows: sasl3(['bob reads, after a deny rule']) }],
            notes: ['Recorded. I then removed the deny rule. Use deny rules sparingly: a short list of allow rules is easier to reason about.']
          }
        ]
      }),

      B.rows({
        id: 'm13-prefix', t: 1, src: 'rec', title: 'One rule for a family of topics',
        steps: [
          {
            say: 'A team usually owns many topics with a shared prefix, such as `brewline.`. A **prefixed ACL** covers them all, and the topics that are made later. Alice got one rule on the prefix. Then she wrote to three topics.',
            tabs: [{ layer: 'RECORDED', name: 'Alice, with an ACL on the prefix brewline.', c: 'raw', cols: ['What was tried', 'What the producer got back', 'What only the error callback said'], rows: sasl3(['alice writes to brewline.orders', 'alice writes to brewline.refunds', 'alice writes to other.topic']), trk: 2 }],
            notes: ['Recorded. Two topics with the prefix were allowed. `other.topic` had no rule and was refused.']
          },
          {
            say: 'This is the full list of rules at that point. Three resources: the topic `orders`, the prefix `brewline.`, and the group `bob-group`. Notice the **pattern type**: `LITERAL` is one exact name, and `PREFIXED` is a prefix.',
            tabs: [{ layer: 'RECORDED', name: 'kafka-acls --list', c: 'raw', cols: ['Output'], rows: AA.split('\n').map(function (l) { return [l.replace(/^\t/, '    ')]; }) }],
            notes: ['Recorded. A wildcard resource `*` also exists, and gives access to everything. Treat it like `super.users`.']
          }
        ]
      }),

      B.widget({ id: 'm13-lab', kind: 'aclslab', t: 1, src: 'rec', title: 'Lab: will the request be allowed?' }),

      B.rows({
        id: 'm13-tls', t: 1, src: 'rec', title: 'TLS: certificates from both sides',
        steps: [
          {
            say: 'The second listener is `SSL`, and it **asks every client for a certificate**. Three of my mistakes failed in the handshake. A client that does not trust the broker\'s authority fails with `certificate verify failed`.',
            tabs: [{ layer: 'RECORDED', name: 'The client does not trust the broker', c: 'raw', cols: ['What the client has', 'What the producer got back', 'What only the error callback said'], rows: tls3(['no trusted authority given', 'a different authority is trusted']) }],
            notes: ['Recorded. Again the delivery report only says that the message timed out. The reason is in the error callback: `SSL handshake failed`. The second case trusted **an authority, but not the one that signed the broker**.']
          },
          {
            say: 'A client that trusts the broker but **has no certificate of its own** is refused by the broker, with an alert that says that a certificate is required.',
            tabs: [{ layer: 'RECORDED', name: 'The client has no certificate', c: 'raw', cols: ['What the client has', 'What the producer got back', 'What only the error callback said'], rows: tls3(['trusted authority given, no client certificate']) }],
            notes: ['Recorded. This is **mutual TLS**: the broker proves who it is, and so does the client.']
          },
          {
            say: 'And **the name in the certificate has to match the address**. The broker\'s certificate says `localhost`. A client that connected to `127.0.0.1` failed to verify it, even though it was the same machine and the same authority.',
            tabs: [{ layer: 'RECORDED', name: 'Right certificate, wrong address', c: 'raw', cols: ['What the client has', 'What the producer got back', 'What only the error callback said'], rows: tls3(['connecting to 127.0.0.1']) }],
            notes: ['Recorded. The error text is the same as for an untrusted authority, so check both. In production, put every name that clients use in the certificate\'s subject alternative names.']
          },
          {
            say: 'Finally a client with a **good certificate from the right authority**. The handshake works. The result is the authorization error that you know: no ACL yet. TLS **authenticated** carol, and the authorizer **has not allowed her**.',
            tabs: [{ layer: 'RECORDED', name: 'A good certificate, no ACL', c: 'raw', cols: ['What the client has', 'What the producer got back', 'What only the error callback said'], rows: tls3(['trusted authority and a client certificate (carol)']) }],
            notes: ['Recorded.']
          }
        ]
      }),

      B.rows({
        id: 'm13-principal', t: 2, src: 'rec', title: 'What name does a certificate get?',
        steps: [
          {
            say: 'The ACL needs the **principal**, and for a certificate it is made from the subject. I wrote the rule with the subject exactly as the certificate shows it, **CN first**. It did not match. I read the real name from the **broker\'s log**: the broker writes the subject **the other way round**.',
            tabs: [{ layer: 'RECORDED', name: 'The subject, and what the broker calls it', c: 'raw', cols: ['What', 'Value'], rows: [['Subject of the certificate', LS.subject_of_the_certificate], ['The principal, as the authorizer logged it', LS.principal_of_a_certificate]], trk: 1 },
              { layer: 'RECORDED', name: 'The authorizer log line for carol', c: 'raw', cols: ['Line of the log'], rows: [[PL]] }],
            notes: ['Recorded. The broker wrote the name of the principal in its log, and I did not guess it.']
          },
          {
            say: 'With the rule written **CN first**, carol was still refused. With the rule written **exactly as the broker names it**, she delivered.',
            tabs: [{ layer: 'RECORDED', name: 'Two ACLs for carol', c: 'raw', cols: ['What the client has', 'What the producer got back', 'What only the error callback said'], rows: tls3(['an ACL for the principal written as the subject', 'an ACL for the principal exactly as the broker names it']), trk: 1 }],
            notes: ['Recorded. The first rule was **valid and did nothing**: an ACL for a principal that nobody has is not an error. Always read the principal from the log.']
          }
        ]
      }),

      B.cmp({
        id: 'm13-mech', t: 2, src: 'docs', title: 'Ways to authenticate',
        say: 'Kafka supports several mechanisms. Press Next to compare them.',
        cols: ['Mechanism', 'How it works', 'Good for', 'Watch out'],
        hl: 1,
        rows: [
          ['SASL/PLAIN', 'User and password, sent as they are', 'Behind TLS, with a password store', 'Plain text unless TLS is on'],
          ['SASL/SCRAM', 'Password proof by a challenge, hashed on the server (run in this mission)', 'A simple login that is safe on the wire', 'Enable TLS too, for the data'],
          ['TLS client certificates', 'The client proves who it is with a certificate (run in this mission)', 'Services, with an automated certificate authority', 'Expiry, and the name of the principal'],
          ['SASL/GSSAPI (Kerberos)', 'A ticket from a Kerberos server', 'Companies that already use Kerberos', 'Not run in this course: from documentation'],
          ['SASL/OAUTHBEARER', 'A token from an identity provider', 'Single sign on, short-lived credentials', 'Not run in this course: from documentation']
        ],
        pick: 'The two that were run are the ones that are simple to set up. In a big company the choice follows the identity system that exists: Kerberos or an OAuth provider.'
      }),

      B.talk({
        id: 'm13-practice', t: 2, src: 'docs', title: 'A security checklist for a cluster',
        say: 'Seven habits, each one visible in the recording above. Press Next.',
        items: [
          ['Encrypt everything', 'Use `SASL_SSL` or `SSL` for clients, and for the traffic between brokers. The recording used SASL_PLAINTEXT only because it is easy to read.', 'TLS on every listener.'],
          ['One identity for each application', 'A principal for the warehouse loader, one for the dashboard, one for each team. Then a denial in the log tells you who.', 'Do not share a login.'],
          ['Least privilege', 'Give each principal only what it needs: Write on one topic, or Read on one topic and one group. A prefixed rule for a family of topics.', 'Small rules.'],
          ['Keep super.users tiny', 'A super user skips all checks, and so does the user `ANONYMOUS` if you allow it. Count them.', 'Almost nobody.'],
          ['Read the logs', 'The authorizer log names the principal, the operation and the resource for every denial, and the broker log shows login failures.', 'Look there first.'],
          ['Set the error callback', 'In the clients, log what the client reports on its own. Without it a wrong password looks like a timeout.', 'Do not lose an afternoon.'],
          ['Plan certificate renewal', 'Certificates expire. Automate their renewal, and alert before they end.', 'An expired certificate is an outage.']
        ],
        cols: 1
      }),

      B.quiz({
        id: 'm13-q1', t: 1,
        q: 'A producer with the right password gets `TOPIC_AUTHORIZATION_FAILED`. What does that tell you?',
        opts: [
          { t: 'The password is wrong', fb: 'A wrong password shows up as a timeout, not as this error.' },
          { t: 'The login worked, and no ACL allows this principal to use the topic', fb: '' },
          { t: 'The broker is down', fb: 'A down broker gives a timeout.' },
          { t: 'The certificate expired', fb: 'That fails the handshake, before any ACL.' }
        ],
        ok: 1,
        why: 'The recording shows it: alice logged in with the right password and got an explicit authorization error. The log said `DefaultDeny`, which means that no rule allowed her.'
      }),

      B.quiz({
        id: 'm13-q2', t: 1,
        q: 'A producer is sure that its password is right, and its messages all time out. What do you check first?',
        opts: [
          { t: 'The ACLs of the topic', fb: 'An ACL problem gives an explicit authorization error.' },
          { t: 'The error callback of the client and the broker log: a failed login is reported there, not in the delivery report', fb: '' },
          { t: 'The number of partitions', fb: 'That is not related.' },
          { t: 'The retention of the topic', fb: 'That is not related.' }
        ],
        ok: 1,
        why: 'In the recording a wrong password and a missing login both gave `_MSG_TIMED_OUT` in the delivery report. Only the error callback said `invalid credentials` (or that the brokers were down).'
      }),

      B.quiz({
        id: 'm13-q3', t: 1,
        q: 'Bob has Read and Describe on a topic, and his consumer fails with `GROUP_AUTHORIZATION_FAILED`. What is missing?',
        opts: [
          { t: 'Write on the topic', fb: 'A consumer does not write.' },
          { t: 'Read on the consumer group', fb: '' },
          { t: 'A super user', fb: 'That gives too much.' },
          { t: 'A second listener', fb: 'The listener is fine.' }
        ],
        ok: 1,
        why: 'A consumer that uses a group needs Read on the group as well as Read on the topic. The recording shows the error and the fix.'
      }),

      B.quiz({
        id: 'm13-q4', t: 2,
        q: 'You wrote an ACL for the subject of a client certificate, CN first, and the client is still denied. Why?',
        opts: [
          { t: 'The ACL tool is broken', fb: 'It accepted a valid rule for another name.' },
          { t: 'The broker names the principal differently: for this certificate `' + LS.principal_of_a_certificate + '`', fb: '' },
          { t: 'Certificates cannot have ACLs', fb: 'They can.' },
          { t: 'The topic is internal', fb: 'It is not.' }
        ],
        ok: 1,
        why: 'The recording shows the subject `' + LS.subject_of_the_certificate + '` and the principal `' + LS.principal_of_a_certificate + '`. A rule for a principal that nobody has is valid and does nothing. Read the name from the authorizer log.'
      }),

      B.bug({
        id: 'm13-bug', t: 1, q: 'This producer is set up for a broker with a SASL listener, and every message times out. Click the line that is wrong.',
        file: 'producer.py', lang: 'python',
        code: ['conf = {', '    "bootstrap.servers": "broker1:9092",', '    "security.protocol": "PLAINTEXT",', '    "sasl.mechanisms": "SCRAM-SHA-256",', '    "sasl.username": "alice",', '    "sasl.password": os.environ["KAFKA_PASSWORD"],', '}'].join('\n'),
        bad: [3],
        hint: 'What protocol does a listener with a SASL login expect?',
        why: '`PLAINTEXT` means no login at all, so the SASL settings are ignored and the broker closes the connection. The client reports a **timeout**, which is what the recording showed for "no login at all". The protocol must be `SASL_SSL` (or `SASL_PLAINTEXT` for a test), to match the listener.',
        fix: ['conf = {', '    "bootstrap.servers": "broker1:9092",', '    "security.protocol": "SASL_SSL",', '    "sasl.mechanisms": "SCRAM-SHA-256",', '    "sasl.username": "alice",', '    "sasl.password": os.environ["KAFKA_PASSWORD"],', '}'].join('\n'),
        cheer: 'The protocol must match the listener.'
      }),

      B.order({
        id: 'm13-ord', t: 1, q: 'Put the checks that a broker makes for one request in order.',
        items: [
          'The client connects to a listener',
          'TLS: the certificates are checked, if the listener asks for them',
          'SASL: the login is checked',
          'The connection gets a principal',
          'For the request, the authorizer looks for a deny rule, and then for an allow rule',
          'If an allow rule matches and no deny, the request runs; otherwise the client gets an authorization error'
        ],
        why: 'Authentication comes first and gives a name. Authorization comes after, for every request, and defaults to no. That is why the two errors look so different.'
      }),

      B.decide({
        id: 'm13-dec', t: 2, src: 'docs', title: 'Decision: how should the warehouse loader get access',
        scenario: 'A loader reads every topic that starts with `brewline.` and commits its offsets with the group `warehouse-loader`. New `brewline.` topics appear every few weeks. The security team wants the smallest permissions that work. You choose.',
        opts: [
          { t: 'Make the loader a super user', d: 'It always works.', lose: 'It could also delete topics and read every other team\'s data. One leaked password gives access to everything.' },
          { t: 'A principal of its own, with Read and Describe on the prefix `brewline.`, and Read on the group `warehouse-loader`', d: 'Covers new topics by itself and nothing else.', lose: '' },
          { t: 'Read on the wildcard `*` for topics', d: 'Short to write.', lose: 'It reads every topic of every team.' }
        ],
        pick: 1,
        why: 'The recording shows both halves: a prefixed rule covers the topics with the prefix, and a consumer also needs Read on its group. A principal of its own means that a denial in the log names it.',
        when: 'If the loader also creates topics, it needs Create, and you would add it on the prefix. Say what the application does before you write the rule.'
      }),

      B.incident({
        id: 'm13-inc', t: 1, src: 'rec', title: 'Incident: every producer times out after the security change', time: '08:20',
        alert: '**All applications that write to Kafka timed out at 08:15, right after the platform team turned on SASL on the brokers.** The brokers are up. The producers log "Message timed out". Nobody sees an authentication error.',
        clues: ['The applications still use `security.protocol=PLAINTEXT`', 'The producers have no error callback', 'The broker log shows failed connections from many hosts'],
        opts: [
          { t: 'Give every application a SCRAM login and the right protocol, and read the error callback and the broker log; keep the old listener open for a short migration window', fb: '' },
          { t: 'Turn SASL off again and say nothing', fb: 'It brings the system back and leaves it open, and the same change will fail again.' },
          { t: 'Increase message.timeout.ms', fb: 'A longer timeout does not log anyone in.' },
          { t: 'Add more partitions', fb: 'That is not related.' }
        ],
        best: 0,
        why: 'This is the "no login at all" row of the recording: the delivery report says timeout, and the only hint is in the broker log and the error callback. The safe way to turn on authentication is to add a second listener first, move the clients, and then close the old one.',
        checks: [
          ['Read the broker log for failed authentications', 'It names the listener and the client address.'],
          ['Check the security.protocol of one application', 'PLAINTEXT against a SASL port times out.'],
          ['Set the error callback in one client', 'It will say what the client sees.']
        ],
        tell: 'We turned on SASL on the only listener, and the applications still spoke plaintext, so they timed out without a clear error. We added a SASL listener next to the old one, moved the applications, and then closed the old one.',
        prevent: ['Add the new listener beside the old one, then migrate, then close the old', 'Log the error callback in every client', 'Test a security change on a staging cluster with the real client configurations']
      }),

      B.incident({
        id: 'm13-inc2', t: 2, src: 'rec', title: 'Incident: the new consumer cannot read, but has Read on the topic', time: '13:45',
        alert: '**The new analytics service cannot read from `brewline.orders`.** It logs `GROUP_AUTHORIZATION_FAILED`. The security team swears that it has Read on the topic, and shows the rule.',
        clues: ['The rule is Read and Describe on the topic `brewline.orders`', 'The service uses the consumer group `analytics-v2`', 'There is no ACL on any group'],
        opts: [
          { t: 'Add Read on the group `analytics-v2` for the same principal', fb: '' },
          { t: 'Add Write on the topic', fb: 'The service does not write.' },
          { t: 'Make the service a super user', fb: 'It would work and give far too much.' },
          { t: 'Remove the group from the consumer', fb: 'A group consumer needs a group, or it must assign partitions itself.' }
        ],
        best: 0,
        why: 'This is the "Read on the topic only" row of the recording. A consumer that uses a group needs Read on the group, and the rule on the topic does not give it.',
        checks: [
          ['Read the error name', 'GROUP_ and TOPIC_ say which resource.'],
          ['List the ACLs of the group', 'None means a missing rule.'],
          ['Check the group id in the code', 'It must match the rule.']
        ],
        tell: 'A consumer needs Read on its group as well as Read on the topic. We added the group rule for the service\'s principal.',
        prevent: ['A standard rule set for a consumer: topic and group', 'A check in the onboarding of a new service', 'Group names that follow a naming rule, so that a prefixed ACL works']
      }),

      B.qa({
        id: 'qa-sec', t: 1, tag: 'Security', secs: 75,
        q: 'How do you secure a Kafka cluster?',
        pts: ['Encrypt with TLS', 'Authenticate: SASL or mTLS, a principal', 'Authorize with ACLs, least privilege', 'Super users kept tiny', 'Logs and monitoring'],
        short: 'Three layers. **Encrypt** the traffic with TLS, between clients and brokers and between brokers. **Authenticate** every client, with SASL (SCRAM, or OAuth, or Kerberos in some companies) or with TLS client certificates, which gives the connection a **principal**. **Authorize** with **ACLs**: each rule says that a principal may do an operation on a resource, such as Write on a topic or Read on a group. No rule means no, and a deny wins. I give each application its own principal and the least it needs, use prefixed rules for families of topics, and keep `super.users` almost empty. I monitor the **authorizer log**, which names every denial. In my recording I ran SCRAM and mutual TLS and made each mistake once, to know the errors.',
        fu: [['What does a consumer need?', 'Read on the topic and Read on its group.'], ['What about Kerberos or OAuth?', 'They are other ways to authenticate. They give a principal too, and the ACLs work the same way.']],
        trap: 'Saying that TLS is the same as authentication, or that authorization is on by default.',
        real: 'We want the loader to read only the topics of our team. How?'
      }),

      B.qa({
        id: 'qa-authn', t: 2, tag: 'Security', secs: 75,
        q: 'A producer cannot connect to a secured cluster. How do you tell an authentication problem from an authorization problem?',
        pts: ['Authentication: timeout or handshake error, in the error callback and broker log', 'Authorization: an explicit TOPIC_ or GROUP_ error', 'Authorizer log with DefaultDeny', 'TLS: certificate and name checks', 'Check the principal'],
        short: 'They fail very differently. **Authorization** failures are **explicit**: the client gets `TOPIC_AUTHORIZATION_FAILED` or `GROUP_AUTHORIZATION_FAILED`, and the broker\'s **authorizer log** names the principal, the operation and the resource, with `DefaultDeny` if no rule matched. **Authentication** failures are **not** delivery errors: in my recording a wrong password, no login, and a bad certificate all gave `_MSG_TIMED_OUT` to the producer, and only the **client\'s error callback** said `invalid credentials` or `SSL handshake failed`. So I log the error callback and read the broker log. For TLS I check that the client trusts the **authority that signed the broker\'s certificate**, that the **name in the certificate matches the address** the client uses, and, for mutual TLS, that the client has a certificate. Then I check the principal that the broker made of the certificate.',
        fu: [['Why did the certificate for 127.0.0.1 fail?', 'The certificate named `localhost`, so the name check failed.'], ['What if the ACL looks right?', 'Read the principal from the authorizer log: for a certificate it is the subject in a different order.']],
        trap: 'Looking at ACLs when the client cannot log in.',
        real: 'Producers started timing out after a security change. Walk me through it.'
      }),

      B.qa({
        id: 'qa-acl', t: 2, tag: 'Security', secs: 60,
        q: 'How do ACLs work in Kafka?',
        pts: ['Principal, operation, resource, allow or deny', 'Deny wins, default deny', 'Prefixed and literal patterns', 'Consumers need the group', 'Super users skip checks'],
        short: 'An ACL is **principal, host, operation, permission type, resource**. The resources are topics, consumer groups, the cluster, and transactional ids. The default is **deny**: no rule, no access. A **deny** beats an allow. The pattern is **literal**, one name, or **prefixed**, a family of names, which also covers topics created later. A producer needs **Write and Describe** on the topic, and a consumer needs **Read** on the topic **and Read on its group**: in my recording a consumer with only the topic rule failed with `GROUP_AUTHORIZATION_FAILED`. **Super users** skip all checks, so the list is kept tiny. You manage them with `kafka-acls`, and the standard authorizer keeps them in the cluster metadata.',
        fu: [['How do you see a denial?', 'In the authorizer log: principal, operation, resource, and the rule or `DefaultDeny`.'], ['What are the operations?', 'Read, Write, Create, Delete, Alter, Describe, ClusterAction and a few more (from documentation).']],
        trap: 'Forgetting the group, or using the wildcard resource.',
        real: 'Design the permissions for a new team with ten topics and three services.'
      }),

      B.recap({
        id: 'm13-recap', n: 13, badge: 'Gatekeeper', color: '#FECACA',
        pts: [
          'A default cluster is **open**. Security has three questions: **encrypt** (TLS), **authenticate** (SASL or a client certificate: a **principal**), **authorize** (ACLs).',
          'A **failed login is not a delivery error**: a wrong password and no login both gave `_MSG_TIMED_OUT`, and only the **error callback** and the broker log said why.',
          'An **authorization** failure is explicit: `TOPIC_AUTHORIZATION_FAILED`, and the authorizer log says `DefaultDeny`. **No rule means no. A deny wins.**',
          'A producer needs **Write and Describe** on the topic. A consumer needs **Read on the topic and Read on the group**.',
          'A **prefixed** ACL covers a family of topics. Keep **super.users** tiny.',
          'For a certificate the broker names the principal **`' + LS.principal_of_a_certificate + '`**: the subject in another order. Read it from the log. Mismatch of the **name** or the **authority** fails the handshake.'
        ]
      })
    ]
  });
})();
