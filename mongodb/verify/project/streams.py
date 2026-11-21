from rules import database

db = database()
db.drop_collection('changes')
db.create_collection('changes')
coll = db.changes


def describe(e):
    changed = e.get('updateDescription', {}).get('updatedFields')
    full = e.get('fullDocument')
    return '%s %s%s%s' % (e['operationType'], e['documentKey']['_id'], ' changed %s' % changed if changed else '', ' full status=%s' % full['status'] if full else ' full=None')


with coll.watch(full_document='updateLookup') as stream:
    coll.insert_one({'_id': 'O-1', 'status': 'PLACED', 'total_cents': 1250})
    coll.update_one({'_id': 'O-1'}, {'$set': {'status': 'SHIPPED'}})
    coll.delete_one({'_id': 'O-1'})
    events = [stream.next() for _ in range(3)]
for e in events:
    print('event:', describe(e))
print('fields of an event:', sorted(events[0]))

with coll.watch(full_document='updateLookup') as stream:
    coll.insert_one({'_id': 'O-2', 'status': 'PLACED', 'total_cents': 900})
    first = stream.next()
    token = stream.resume_token
print('first stream saw:', describe(first))
coll.update_one({'_id': 'O-2'}, {'$set': {'status': 'REFUNDED'}})
coll.delete_one({'_id': 'O-2'})
print('written while nobody was watching: update, delete')
with coll.watch(resume_after=token, full_document='updateLookup') as stream:
    for _ in range(2):
        print('resumed from the token:', describe(stream.next()))
