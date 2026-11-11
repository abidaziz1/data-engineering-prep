"""Mission 11: schemas. What is in a message, what a registry of schemas stores, and which changes to a schema break which readers.

What is real: Avro (the fastavro library) writing and reading real bytes with a writer schema and a reader schema, which is exactly the rule that a schema registry applies when it checks
compatibility, and the topics in a real cluster. What is a stand-in: the registry. MiniRegistry below is about forty lines written for the lesson. The Confluent Schema Registry and its
alternatives are separate services that were not run; the lessons that describe them are from documentation.
"""
import copy
import io
import json

import fastavro
from fastavro import parse_schema, schemaless_reader, schemaless_writer

import cluster as C
import kx
from world import parse_dump

V1 = {'type': 'record', 'name': 'Order', 'namespace': 'brewline', 'fields': [
    {'name': 'order_id', 'type': 'long'}, {'name': 'store_id', 'type': 'string'}, {'name': 'customer_id', 'type': ['null', 'long'], 'default': None},
    {'name': 'total_cents', 'type': 'int'}, {'name': 'status', 'type': 'string'}]}


def field(schema, name):
    return next(f for f in schema['fields'] if f['name'] == name)


def changed(fn):
    s = copy.deepcopy(V1)
    fn(s)
    return s


def drop(name):
    return lambda s: s['fields'].remove(field(s, name))


def rename(old, new, alias=False):
    def f(s):
        fl = field(s, old)
        fl['name'] = new
        if alias:
            fl['aliases'] = [old]
    return f


CHANGES = [
    ('add the field channel, with a default', changed(lambda s: s['fields'].append({'name': 'channel', 'type': 'string', 'default': 'app'})), {'channel': 'web'}),
    ('add the field channel, no default', changed(lambda s: s['fields'].append({'name': 'channel', 'type': 'string'})), {'channel': 'web'}),
    ('remove the field status (it had no default)', changed(drop('status')), {}),
    ('remove the field customer_id (it had a default)', changed(drop('customer_id')), {}),
    ('rename total_cents to amount_cents', changed(rename('total_cents', 'amount_cents')), {'amount_cents': 450, 'total_cents': None}),
    ('rename total_cents to amount_cents, with an alias', changed(rename('total_cents', 'amount_cents', alias=True)), {'amount_cents': 450, 'total_cents': None}),
    ('widen total_cents from int to long', changed(lambda s: field(s, 'total_cents').update(type='long')), {}),
    ('narrow order_id from long to int', changed(lambda s: field(s, 'order_id').update(type='int')), {}),
    ('make customer_id required (it was null or long)', changed(lambda s: (field(s, 'customer_id').update(type='long'), field(s, 'customer_id').pop('default'))), {'__old__': {'customer_id': None}}),
]

SAMPLE = {'order_id': 7, 'store_id': 's03', 'customer_id': 1007, 'total_cents': 450, 'status': 'paid'}


def sample_for(schema, extra):
    rec = {f['name']: SAMPLE.get(f['name']) for f in schema['fields']}
    for k, v in extra.items():
        if k in rec:
            rec[k] = v
    for f in schema['fields']:
        if rec.get(f['name']) is None and f['name'] not in ('customer_id',):
            rec[f['name']] = SAMPLE.get(f['name']) if SAMPLE.get(f['name']) is not None else {'channel': 'web', 'amount_cents': 450}.get(f['name'])
    if 'customer_id' in rec and rec['customer_id'] is None and field(schema, 'customer_id')['type'] == 'long':
        rec['customer_id'] = 1007
    return rec


def write(schema, record):
    buf = io.BytesIO()
    schemaless_writer(buf, parse_schema(schema), record)
    return buf.getvalue()


def read(writer, reader, data):
    return schemaless_reader(io.BytesIO(data), parse_schema(writer), parse_schema(reader))


def can_read(writer, reader, record):
    """Write a record with the writer schema, and try to read it with the reader schema."""
    try:
        out = read(writer, reader, write(writer, record))
        return True, out, ''
    except Exception as e:                       # the library raises its own error types; what matters is the message
        return False, None, (type(e).__name__ + ': ' + str(e)).replace('\n', ' ')[:140]


def compatibility(old, new, old_record, new_record):
    """BACKWARD: the new schema reads data written with the old one (so the readers can be upgraded first).
    FORWARD: the old schema reads data written with the new one (so the writers can be upgraded first)."""
    b = can_read(old, new, old_record)
    f = can_read(new, old, new_record)
    return b, f


class MiniRegistry:
    """What a schema registry keeps: for each subject, the versions of its schema, and one number (the id) for each schema. It refuses a schema that breaks the mode that the subject is set to."""

    def __init__(self):
        self.subjects, self.next_id = {}, 1

    def register(self, subject, schema, mode='BACKWARD', old_record=None, new_record=None):
        versions = self.subjects.setdefault(subject, [])
        if versions and mode != 'NONE':
            latest = versions[-1]['schema']
            b, f = compatibility(latest, schema, old_record(latest), new_record(schema))
            ok = {'BACKWARD': b[0], 'FORWARD': f[0], 'FULL': b[0] and f[0]}[mode]
            if not ok:
                return None
        sid = self.next_id
        self.next_id += 1
        versions.append({'id': sid, 'version': len(versions) + 1, 'schema': schema})
        return sid


def record_schemas(c, rec):
    kx.delete_topics(c.bootstrap, ['fmt-json', 'fmt-avro', 'drift'])
    # ---- what each change does to the readers ----
    rows, verdicts = [], {}
    for label, new, extra in CHANGES:
        old_record = dict(SAMPLE, **extra.get('__old__', {}))        # for the last change the old data holds a null, which a required field cannot take
        new_record = sample_for(new, {k: v for k, v in extra.items() if k != '__old__'})
        b, f = compatibility(V1, new, old_record, new_record)
        verdict = 'full' if b[0] and f[0] else 'backward only' if b[0] else 'forward only' if f[0] else 'none'
        verdicts[label] = verdict
        rows.append([label, 'yes' if b[0] else 'no', 'yes' if f[0] else 'no', verdict, (b[2] or f[2])[:120]])
    rec.table('schemas.changes', ['change to the schema', 'new schema reads old data (backward)', 'old schema reads new data (forward)', 'compatible as', 'what went wrong (first failure)'], rows)

    # ---- the registry: the same offers to a subject set to BACKWARD and a subject set to FULL ----
    def offer(subject_mode):
        reg = MiniRegistry()
        out = []
        v2 = changed(lambda s: s['fields'].append({'name': 'channel', 'type': 'string', 'default': 'app'}))
        v3_coupon = copy.deepcopy(v2)
        v3_coupon['fields'].append({'name': 'coupon', 'type': 'string'})
        v3_drop = copy.deepcopy(v2)
        v3_drop['fields'] = [f for f in v3_drop['fields'] if f['name'] != 'status']
        offers = [('version 1: order_id, store_id, customer_id, total_cents, status', V1, {}),
                  ('add channel, with a default', v2, {'channel': 'web'}),
                  ('add coupon, no default', v3_coupon, {'coupon': 'SPRING'}),
                  ('remove status', v3_drop, {})]
        for label, schema, extra in offers:
            sid = reg.register('orders-value', schema, subject_mode, lambda s: dict(SAMPLE, channel='web') if any(f['name'] == 'channel' for f in s['fields']) else dict(SAMPLE),
                               lambda s, e=extra: sample_for(s, e))
            out.append((label, sid))
        return reg, out
    reg_b, flow_b = offer('BACKWARD')
    reg_f, flow_f = offer('FULL')
    rec.table('schemas.registry_flow', ['schema offered to the subject orders-value', 'subject set to BACKWARD: id given, or refused', 'subject set to FULL: id given, or refused'],
              [[lb, ib if ib else 'refused', iff if iff else 'refused'] for (lb, ib), (_, iff) in zip(flow_b, flow_f)])
    rec.counts('schemas.registry', {'schemas_stored_in_the_backward_subject': sum(len(v) for v in reg_b.subjects.values()), 'ids_in_the_backward_subject': [v['id'] for v in reg_b.subjects['orders-value']],
                                    'schemas_stored_in_the_full_subject': sum(len(v) for v in reg_f.subjects.values()), 'stand_in': True,
                                    'real_registry_stores_its_schemas_in': 'a compacted topic of its own, from documentation'})
    reg = reg_b

    # ---- the bytes of a message in the common wire format ----
    payload = write(V1, SAMPLE)
    framed = b'\x00' + (1).to_bytes(4, 'big') + payload
    magic, sid = framed[0], int.from_bytes(framed[1:5], 'big')
    back = read(reg.subjects['orders-value'][0]['schema'], V1, framed[5:])
    rec.counts('schemas.wire_format', {'first_five_bytes_hex': framed[:5].hex(), 'magic_byte': magic, 'schema_id': sid, 'avro_payload_bytes': len(payload), 'message_bytes': len(framed),
                                       'decoded_equals_the_record': back == SAMPLE, 'json_bytes_of_the_same_record': len(json.dumps(SAMPLE, separators=(',', ':')))})

    # ---- the same thousand orders as JSON and as Avro, in a real log ----
    for t in ('fmt-json', 'fmt-avro'):
        kx.create_topic(c.bootstrap, t, assignment=[[1]], config={'retention.ms': '-1'})
    p = kx.producer(c.bootstrap)
    parsed = parse_schema(V1)
    for i in range(1000):
        o = kx.order(i)
        p.produce('fmt-json', key=o['store_id'], value=json.dumps(o, separators=(',', ':')), timestamp=kx.T0 + i * 1000)
        o2 = {k: o[k] for k in ('order_id', 'store_id', 'customer_id', 'total_cents', 'status')}
        buf = io.BytesIO()
        buf.write(b'\x00' + (1).to_bytes(4, 'big'))
        schemaless_writer(buf, parsed, o2)
        p.produce('fmt-avro', key=o['store_id'], value=buf.getvalue(), timestamp=kx.T0 + i * 1000)
    p.flush(30)

    def log_size(topic):
        return sum(f.stat().st_size for f in (c.data_dir(1) / (topic + '-0')).glob('*.log'))
    j, a = log_size('fmt-json'), log_size('fmt-avro')
    rec.table('schemas.sizes', ['format of the value', 'bytes in the log for 1,000 orders', 'bytes per order', 'share of JSON'],
              [['JSON text', j, round(j / 1000, 1), 1.0], ['Avro with the 5 byte header', a, round(a / 1000, 1), round(a / j, 2)]])

    # ---- JSON has no schema: a renamed field ----
    kx.create_topic(c.bootstrap, 'drift', assignment=[[1]], config={'retention.ms': '-1'})
    p = kx.producer(c.bootstrap, **{'batch.num.messages': 1})
    for i in range(10):
        o = kx.order(i)
        if i >= 5:
            o['amount_cents'] = o.pop('total_cents')              # the producer team renamed a field
        p.produce('drift', key=o['store_id'], value=json.dumps(o, separators=(',', ':')), timestamp=kx.T0 + i * 1000)
    p.flush(30)
    msgs = kx.read_all(c.bootstrap, 'drift')
    true_total = sum(kx.order(i)['total_cents'] for i in range(10))
    strict, error = 0, None
    for m in msgs:
        try:
            strict += json.loads(m[3])['total_cents']
        except KeyError as e:
            error = 'KeyError: %s (at order %d)' % (e, json.loads(m[3])['order_id'])
            break
    quiet = sum(json.loads(m[3]).get('total_cents', 0) for m in msgs)
    rec.counts('schemas.drift', {'orders': 10, 'renamed_from_order': 6, 'true_total_cents': true_total, 'strict_consumer_error': error, 'total_before_it_stopped': strict,
                                 'consumer_with_a_default_total_cents': quiet, 'silently_missing_cents': true_total - quiet})
