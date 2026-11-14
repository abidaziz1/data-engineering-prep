"""Mission 13: security. A broker that asks who you are (SASL with SCRAM, and TLS with client certificates) and what you may do (ACLs).

What is real: the broker, its authorizer, the clients and the errors that they report. The certificates are made here, with openssl and keytool, from a certificate authority that exists only
for this recording. What is not run: Kerberos, OAuth and OpenID Connect, and the role-based access control of commercial platforms. They are described from documentation.
"""
import os
import pathlib
import re
import subprocess
import time

from confluent_kafka import Consumer, KafkaException, Producer
from confluent_kafka.admin import AdminClient

import cluster as C
import kx
from world import norm

ADMIN = ('admin', 'admin-secret')
USERS = {'alice': 'alice-secret', 'bob': 'bob-secret'}
STORE_PASS = 'changeit'


def sh(*cmd, cwd=None):
    r = subprocess.run([str(x) for x in cmd], capture_output=True, text=True, cwd=cwd)
    if r.returncode:
        raise RuntimeError('%s failed: %s' % (cmd[:2], r.stderr))
    return r.stdout


def make_certificates(d):
    """A certificate authority, a certificate for the broker (valid for the name localhost only), one for the client carol, and a second authority that nobody trusts."""
    d.mkdir(parents=True, exist_ok=True)
    sh('openssl', 'req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', 'ca.key', '-out', 'ca.crt', '-subj', '/CN=Brewline Test CA', '-days', '30', cwd=d)
    sh('openssl', 'req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', 'other-ca.key', '-out', 'other-ca.crt', '-subj', '/CN=Some Other CA', '-days', '30', cwd=d)
    for name, subj, san in (('broker', '/CN=localhost', 'subjectAltName=DNS:localhost'), ('carol', '/CN=carol/OU=Brewline/O=Brewline/C=NL', None)):
        sh('openssl', 'req', '-newkey', 'rsa:2048', '-nodes', '-keyout', name + '.key', '-out', name + '.csr', '-subj', subj, cwd=d)
        ext = d / (name + '.ext')
        ext.write_text((san + '\n') if san else 'basicConstraints=CA:FALSE\n')
        sh('openssl', 'x509', '-req', '-in', name + '.csr', '-CA', 'ca.crt', '-CAkey', 'ca.key', '-CAcreateserial', '-out', name + '.crt', '-days', '30', '-extfile', ext.name, cwd=d)
    sh('openssl', 'pkcs12', '-export', '-in', 'broker.crt', '-inkey', 'broker.key', '-certfile', 'ca.crt', '-name', 'broker', '-out', 'broker.p12', '-passout', 'pass:' + STORE_PASS, cwd=d)
    sh('keytool', '-importcert', '-alias', 'ca', '-file', 'ca.crt', '-keystore', 'truststore.p12', '-storetype', 'PKCS12', '-storepass', STORE_PASS, '-noprompt', cwd=d)
    return d


def jaas(user, password):
    return 'org.apache.kafka.common.security.scram.ScramLoginModule required username="%s" password="%s";' % (user, password)


def client_conf(user, password):
    return {'security.protocol': 'SASL_PLAINTEXT', 'sasl.mechanisms': 'SCRAM-SHA-256', 'sasl.username': user, 'sasl.password': password}


def try_produce(bootstrap, topic, conf, n=3, timeout=15):
    """Send n records. Returns the delivery reports, and the errors that the client reports on its own (login and connection problems do not come with a delivery report)."""
    out, events = [], []
    p = Producer(dict({'bootstrap.servers': bootstrap, 'message.timeout.ms': timeout * 1000, 'socket.timeout.ms': 5000,
                       'error_cb': lambda e: events.append((e.name(), e.str()))}, **conf))
    for i in range(n):
        try:
            p.produce(topic, key='s01', value=kx.value(i), callback=lambda err, msg: out.append(err))
        except KafkaException as e:
            return [e.args[0]], events
    p.flush(timeout)
    p.poll(0)
    return (out or ['no delivery report']), events


def describe_outcome(res):
    """[result, what the client says, errors the client reported on its own]"""
    delivery, events = res if isinstance(res, tuple) else (res, [])
    seen = []
    for name, text in events:
        if name not in [x[0] for x in seen]:
            seen.append((name, text))
    ev = ' | '.join('%s: %s' % (n, t) for n, t in seen[:2])
    if all(e is None for e in delivery):
        return ['delivered', '', ev]
    e = next(x for x in delivery if x is not None)
    if isinstance(e, str):
        return [e, '', ev]
    return [e.name(), e.str(), ev]


def clean_ssl(text):
    t = re.sub(r'\(after \d+ms in state [A-Z_]+(, \d+ identical error\(s\) suppressed)?\)', '', text)
    t = re.sub(r'\d+ms', 'Nms', re.sub(r'error:[0-9A-F]+:', 'error:<code>:', t))
    t = re.sub(r'\b(sasl_plaintext|ssl)://[\w.]+:\d+/(bootstrap|\d+)', r'\1://<broker>', t)
    return re.sub(r'\s+', ' ', t).strip()


def record_security(rec):
    base = int(os.environ.get('KAFKA_BASE_PORT', 9092))
    work = pathlib.Path(__import__('tempfile').mkdtemp(prefix='kafka-capture-'))
    certs = make_certificates(work / 'certs')
    admin_props = work / 'admin.properties'
    admin_props.write_text('security.protocol=SASL_PLAINTEXT\nsasl.mechanism=SCRAM-SHA-256\nsasl.jaas.config=%s\n' % jaas(*ADMIN))
    props = {'authorizer.class.name': 'org.apache.kafka.metadata.authorizer.StandardAuthorizer', 'super.users': 'User:admin;User:ANONYMOUS', 'sasl.enabled.mechanisms': 'SCRAM-SHA-256',
             'sasl.mechanism.inter.broker.protocol': 'SCRAM-SHA-256', 'inter.broker.listener.name': 'SASL_PLAINTEXT',
             'listener.name.sasl_plaintext.scram-sha-256.sasl.jaas.config': jaas(*ADMIN),
             'ssl.keystore.type': 'PKCS12', 'ssl.keystore.location': str(certs / 'broker.p12'), 'ssl.keystore.password': STORE_PASS, 'ssl.key.password': STORE_PASS,
             'ssl.truststore.type': 'PKCS12', 'ssl.truststore.location': str(certs / 'truststore.p12'), 'ssl.truststore.password': STORE_PASS,
             'listener.name.ssl.ssl.client.auth': 'required'}
    extra = {'listeners': lambda n: 'SASL_PLAINTEXT://localhost:%d,CONTROLLER://localhost:%d,SSL://localhost:%d' % (n.broker_port, n.controller_port, n.broker_port + 2),
             'advertised.listeners': lambda n: 'SASL_PLAINTEXT://localhost:%d,SSL://localhost:%d' % (n.broker_port, n.broker_port + 2)}
    c = C.Cluster(nodes=1, props=props, listener_extra=extra, work=work / 'cluster', admin_config=admin_props,
                  format_args=['--add-scram', 'SCRAM-SHA-256=[name=admin,password=%s]' % ADMIN[1]])
    with c:
        run(c, rec, certs, admin_props)
    import shutil
    shutil.rmtree(work, ignore_errors=True)


def run(c, rec, certs, admin_props):
    sasl = c.bootstrap
    ssl_port = c.nodes[0].broker_port + 2
    # ---- who is there: users are stored in the cluster, with salted and hashed passwords ----
    created = []
    for user, pw in USERS.items():
        rc, out, err = c.tool('kafka-configs', '--alter', '--add-config', 'SCRAM-SHA-256=[password=%s]' % pw, '--entity-type', 'users', '--entity-name', user)
        created.append(out.strip() or err.strip())
    rec.text('security.users_created', '\n'.join(created))
    rec.text('security.users_described', c.tool('kafka-configs', '--describe', '--entity-type', 'users')[1])
    rc, out, err = c.topics('--create', '--topic', 'orders', '--partitions', '1', '--replication-factor', '1')
    rc, out, err = c.topics('--create', '--topic', 'brewline.orders', '--partitions', '1', '--replication-factor', '1')
    rc, out, err = c.topics('--create', '--topic', 'brewline.refunds', '--partitions', '1', '--replication-factor', '1')
    rc, out, err = c.topics('--create', '--topic', 'other.topic', '--partitions', '1', '--replication-factor', '1')

    rows = []

    def row(label, res):
        rows.append([label] + [clean_ssl(x) for x in describe_outcome(res)])

    # ---- failing before authorization: no login, a wrong password ----
    row('no login at all (security.protocol=PLAINTEXT on the SASL listener)', try_produce(sasl, 'orders', {}, n=1, timeout=8))
    row('alice with the wrong password', try_produce(sasl, 'orders', client_conf('alice', 'not-her-password'), timeout=8))
    # ---- logged in, but nothing allowed yet ----
    row('alice, right password, no ACL yet', try_produce(sasl, 'orders', client_conf('alice', USERS['alice'])))
    log = (c.node(1).dir / 'logs' / 'kafka-authorizer.log')
    time.sleep(1)
    denied = [re.sub(r'^\[[^\]]+\] ', '', l) for l in log.read_text(errors='ignore').splitlines() if 'Denied' in l and 'User:alice' in l] if log.exists() else []
    rec.text('security.denied_log', short_log(denied[0]) if denied else 'no line found')
    # ---- ACLs ----
    acl = lambda *a: c.tool('kafka-acls', '--add', *a)
    acl('--allow-principal', 'User:alice', '--operation', 'Write', '--operation', 'Describe', '--topic', 'orders')
    rec.text('security.acl_list_topic', c.tool('kafka-acls', '--list', '--topic', 'orders')[1])
    row('alice, after Write and Describe on the topic', try_produce(sasl, 'orders', client_conf('alice', USERS['alice'])))
    # bob reads: the topic is allowed, the group is not
    acl('--allow-principal', 'User:bob', '--operation', 'Read', '--operation', 'Describe', '--topic', 'orders')
    rows.append(['bob reads with a group, Read on the topic only'] + read_outcome(sasl, 'orders', 'bob-group', client_conf('bob', USERS['bob'])) + [''])
    acl('--allow-principal', 'User:bob', '--operation', 'Read', '--group', 'bob-group')
    rows.append(['bob reads with a group, after Read on the group'] + read_outcome(sasl, 'orders', 'bob-group', client_conf('bob', USERS['bob'])) + [''])
    # a deny rule wins over an allow rule
    acl('--deny-principal', 'User:bob', '--operation', 'Read', '--topic', 'orders')
    rows.append(['bob reads, after a deny rule for Read on the topic'] + read_outcome(sasl, 'orders', 'bob-group', client_conf('bob', USERS['bob'])) + [''])
    c.tool('kafka-acls', '--remove', '--deny-principal', 'User:bob', '--operation', 'Read', '--topic', 'orders', '--force')
    # a prefixed ACL covers every topic whose name starts with the prefix
    acl('--allow-principal', 'User:alice', '--operation', 'Write', '--operation', 'Describe', '--topic', 'brewline.', '--resource-pattern-type', 'prefixed')
    row('alice writes to brewline.orders (the ACL is on the prefix brewline.)', try_produce(sasl, 'brewline.orders', client_conf('alice', USERS['alice'])))
    row('alice writes to brewline.refunds', try_produce(sasl, 'brewline.refunds', client_conf('alice', USERS['alice'])))
    row('alice writes to other.topic', try_produce(sasl, 'other.topic', client_conf('alice', USERS['alice'])))
    rec.text('security.acl_list_all', c.tool('kafka-acls', '--list')[1])

    # ---- TLS: the SSL listener asks for a certificate from every client ----
    ssl_bs = 'localhost:%d' % ssl_port
    base = {'security.protocol': 'SSL'}
    tls = [['no trusted authority given (the system store does not know the CA)', 'SSL', dict(base)],
           ['trusted authority given, no client certificate', 'SSL', dict(base, **{'ssl.ca.location': str(certs / 'ca.crt')})],
           ['a different authority is trusted', 'SSL', dict(base, **{'ssl.ca.location': str(certs / 'other-ca.crt'), 'ssl.certificate.location': str(certs / 'carol.crt'),
                                                                     'ssl.key.location': str(certs / 'carol.key')})],
           ['trusted authority and a client certificate (carol), no ACL yet', 'SSL', dict(base, **{'ssl.ca.location': str(certs / 'ca.crt'), 'ssl.certificate.location': str(certs / 'carol.crt'),
                                                                                                  'ssl.key.location': str(certs / 'carol.key')})]]
    tls_rows = []
    for label, _, conf in tls:
        res = try_produce(ssl_bs, 'orders', conf, n=1, timeout=8)
        tls_rows.append([label] + [clean_ssl(x) for x in describe_outcome(res)])
    # the address in the certificate: connecting to 127.0.0.1, the certificate says localhost
    conf = dict(base, **{'ssl.ca.location': str(certs / 'ca.crt'), 'ssl.certificate.location': str(certs / 'carol.crt'), 'ssl.key.location': str(certs / 'carol.key')})
    res = try_produce('127.0.0.1:%d' % ssl_port, 'orders', conf, n=1, timeout=8)
    tls_rows.append(['connecting to 127.0.0.1, the certificate is for the name localhost'] + [clean_ssl(x) for x in describe_outcome(res)])
    time.sleep(1)
    seen = [re.sub(r'^\[[^\]]+\] ', '', l) for l in log.read_text(errors='ignore').splitlines() if 'CN=carol' in l and 'Denied' in l][:1] if log.exists() else []
    rec.text('security.principal_log', short_log(seen[0]) if seen else 'no line found')
    principal = re.search(r'Principal = (User:\S+) is Denied', seen[0]).group(1)               # the name that the broker made of the certificate: read from its log, not guessed
    guess = 'User:CN=carol,OU=Brewline,O=Brewline,C=NL'
    acl('--allow-principal', guess, '--operation', 'Write', '--operation', 'Describe', '--topic', 'orders')
    res = try_produce(ssl_bs, 'orders', dict(base, **{'ssl.ca.location': str(certs / 'ca.crt'), 'ssl.certificate.location': str(certs / 'carol.crt'), 'ssl.key.location': str(certs / 'carol.key')}), n=1)
    tls_rows.append(['an ACL for the principal written as the subject of the certificate reads (CN first)'] + [clean_ssl(x) for x in describe_outcome(res)])
    acl('--allow-principal', principal, '--operation', 'Write', '--operation', 'Describe', '--topic', 'orders')
    res = try_produce(ssl_bs, 'orders', dict(base, **{'ssl.ca.location': str(certs / 'ca.crt'), 'ssl.certificate.location': str(certs / 'carol.crt'), 'ssl.key.location': str(certs / 'carol.key')}), n=1)
    tls_rows.append(['an ACL for the principal exactly as the broker names it'] + [clean_ssl(x) for x in describe_outcome(res)])
    rec.table('security.tls', ['what the client has', 'delivery report', 'what the client says about it', 'errors that the client reports on its own'], tls_rows)
    rec.table('security.sasl', ['what was tried', 'delivery report', 'what the client says about it', 'errors that the client reports on its own'], rows)
    rec.counts('security.listeners', {'listeners': ['SASL_PLAINTEXT (SCRAM-SHA-256)', 'SSL (client certificates required)', 'CONTROLLER'], 'authorizer': 'StandardAuthorizer',
                                      'super_users': ['User:admin', 'User:ANONYMOUS (only the plaintext controller listener of this one-node recording lets anonymous in)'],
                                      'principal_of_a_certificate': principal, 'subject_of_the_certificate': 'CN=carol,OU=Brewline,O=Brewline,C=NL'})


def short_log(line):
    line = re.sub(r'\(kafka\.authorizer\.logger\)|\(org\.apache\.kafka\.metadata\.authorizer\.StandardAuthorizerData\)', '', line)
    line = re.sub(r'^\w+ ', '', line).strip()
    return re.sub(r'\s+', ' ', line)


def read_outcome(bootstrap, topic, group, conf):
    """Join a group and read from the topic: the first thing that happens, an error or a record."""
    c = Consumer(dict({'bootstrap.servers': bootstrap, 'group.id': group, 'auto.offset.reset': 'earliest', 'enable.auto.commit': False, 'socket.timeout.ms': 5000}, **conf))
    c.subscribe([topic])
    t0 = time.time()
    result = None
    while time.time() - t0 < 25 and result is None:
        m = c.poll(1)
        if m is None:
            continue
        if m.error():
            result = [m.error().name(), m.error().str()]
        else:
            result = ['delivered', 'read the first record']
    c.close()
    return result or ['nothing happened', 'no record and no error in 25 seconds']
