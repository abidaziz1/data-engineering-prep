// An independent model of the Brewline shop database and of the CDC pipeline, written for the checks of the CDC walkthrough. It shares nothing with the widget or with the project:
// the changes of the shop are written again here (the rows, the day of changes, the backlog, the two updates), the topic is a list of messages with their operations, and silver is a small
// simulation: the latest event of each row by position, merged only when newer, with deletes as marks. check_widgets.js and e2e_labs.js use it to say what the recording must contain.
'use strict';
const amount = i => 1000 + (i * 37) % 9000, store = i => 1 + (i * 7) % 12;

// the messages that each stage adds to the topic: [op, id, status]
const SNAPSHOT = Array.from({ length: 200 }, (_, k) => ['r', k + 1, 'PLACED']);
const CHANGES = Array.from({ length: 50 }, (_, k) => ['c', 201 + k, 'PLACED'])
  .concat(Array.from({ length: 30 }, (_, k) => ['u', 1 + k, 'SHIPPED']), Array.from({ length: 5 }, (_, k) => ['d', 31 + k, null]), [['u', 40, 'SHIPPED'], ['u', 40, 'REFUNDED']]);
const BACKLOG = Array.from({ length: 100 }, (_, k) => ['u', 101 + k, 'SHIPPED']);
const IDENTITY = [['u', 201, 'SHIPPED'], ['u', 202, 'SHIPPED']];
const STAGES = [['snapshot', SNAPSHOT, false], ['changes', CHANGES, false], ['replay', [], true], ['backlog', BACKLOG, false], ['identity', IDENTITY, false]];

function simulate() {
  const rows = new Map(), runs = {}, after = {}, versions = [{ version: 0, op: 'WRITE', ins: 0, upd: 0 }];
  let lsn = 1000, offset = 0, last = [], topic = 0;
  const offsets = {}, ops = { r: 0, c: 0, u: 0, d: 0 };
  const topicAfter = {};
  STAGES.forEach(([key, msgs, replayLast]) => {
    const events = msgs.map(([op, id, status]) => {
      const e = { op, id, status, lsn: op === 'r' ? 1000 : (lsn += 8), offset: offset++ };
      ops[op]++;
      return e;
    });
    topic += events.length;
    // the sample messages of the recording: where they sit in the topic
    events.forEach(e => {
      if (e.op === 'r' && e.id === 1) offsets.read = e.offset;
      if (e.op === 'c' && e.id === 201) offsets.create = e.offset;
      if (e.op === 'd' && e.id === 31) offsets.delete = e.offset;
      if (e.op === 'u' && e.id === 201) offsets.update = e.offset;
      if (e.op === 'u' && e.id === 202) offsets.update_full = e.offset;
    });
    // the batch of this run: the new messages, or the last batch again
    const batch = replayLast ? last : events;
    const latest = new Map();
    batch.forEach(e => { const c = latest.get(e.id); if (!c || e.lsn > c.lsn || (e.lsn === c.lsn && e.offset > c.offset)) latest.set(e.id, e); });
    let ins = 0, upd = 0;
    latest.forEach(e => {
      const row = rows.get(e.id);
      if (!row) { rows.set(e.id, { status: e.status, amount: amount(e.id), lsn: e.lsn, deleted: e.op === 'd' }); ins++; }
      else if (e.lsn > row.lsn) { if (e.op !== 'd') row.status = e.status; row.lsn = e.lsn; row.deleted = e.op === 'd'; upd++; }
    });
    if (!replayLast) last = events;
    runs[key] = { new_messages: replayLast ? 0 : events.length, events: batch.length, batches: batch.length ? 1 : 0, inserted: ins, updated: upd, left: latest.size - ins - upd, nothing_new: false, gate: [] };
    versions.push({ version: versions.length, op: 'MERGE', ins, upd });
    const live = [...rows.values()].filter(r => !r.deleted), revenue = live.reduce((a, r) => a + r.amount, 0);
    after[key] = { bronze: topic, silver: rows.size, silver_distinct: rows.size, live: live.length, deleted: rows.size - live.length, shipped: live.filter(r => r.status === 'SHIPPED').length, refunded: live.filter(r => r.status === 'REFUNDED').length,
      revenue, source: live.length, source_revenue: revenue };
    runs[key].gate = ['PASS every message of the topic is in bronze: ' + topic, 'PASS silver has one row for each order: ' + rows.size, 'PASS the live orders of silver equal the orders of the source: ' + live.length,
      'PASS the revenue of silver equals the revenue of the source: ' + revenue, 'PASS every live order of silver equals its row in the source: 0'];
    topicAfter[key] = topic;
  });
  return { runs, after, versions, ops, offsets, topic: topicAfter };
}

const runText = (key, r) => ['python -m cdc.run' + (key === 'replay' ? ' --replay-last-batch' : ''), 'bronze: ' + r.new_messages + ' new messages',
  'silver: ' + r.events + ' events in ' + r.batches + ' batch(es); merge inserted ' + r.inserted + ', updated ' + r.updated + ', left ' + r.left + ' alone'].concat(r.gate).join('\n');
module.exports = { simulate, runText, amount, store };
