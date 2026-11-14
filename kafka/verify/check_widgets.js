// Checks the recorded tables that the Apache Kafka labs and lessons read, with arithmetic and rules written here, in code that shares nothing with the widgets: the index of the log,
// murmur2 and CRC32 for the partition of a key, the skew of the stores, the assignment of partitions to consumers, the replication rules, the two commit strategies, compaction, the converters
// of Connect, change events, the Avro rules for schema changes, the windows of Kafka Streams, the ACLs, the metrics of a dead broker, the quota and the size of a cluster.
// The widgets themselves are driven in the browser by dev/e2e.js, which compares what they show with values worked out the same way.
// Run: node kafka/verify/check_widgets.js
const fs = require('fs'), path = require('path');
global.window = global; global.LAB = {};
const root = path.join(__dirname, '..', '..');
(0, eval)(fs.readFileSync(process.env.KAFKA_REAL_JS || path.join(root, 'kafka', 'js', 'real.js'), 'utf8'));   // KAFKA_REAL_JS lets verify_kafka.py feed it a broken copy
const R = LAB.real, C = k => R.counts[k], T = k => R.tables[k], X = k => R.text[k];
let checks = 0, fails = 0;
const eq = (got, want, what) => { checks++; if (JSON.stringify(got) !== JSON.stringify(want)) { fails++; console.log('FAIL:', what, '\n   got ', JSON.stringify(got), '\n   want', JSON.stringify(want)); } };
const near = (got, want, what, tol) => { checks++; if (!(Math.abs(got - want) <= (tol === undefined ? 1e-9 : tol))) { fails++; console.log('FAIL:', what, 'got', got, 'want', want); } };
const yes = (cond, what) => { checks++; if (!cond) { fails++; console.log('FAIL:', what); } };
const sum = a => a.reduce((x, y) => x + y, 0);
const STORES = ['s01', 's02', 's03', 's04', 's05', 's06', 's07', 's08', 's09', 's10', 's11', 's12'];

// ---- The cluster that was run --------------------------------------------------------------------------------------------------------------------------------
const M = R.meta;
eq(M.kafka, '4.4.0', 'Apache Kafka 4.4.0'); eq(M.company, 'Brewline', 'the made-up company'); yes(/^16\./.test(M.postgresql) || /16/.test(String(M.postgresql)), 'PostgreSQL 16'); eq(M.debezium, '3.7.1.Final', 'Debezium 3.7.1');
const FE = T('world.features').rows.reduce((o, r) => (o[r[0]] = r, o), {});
eq(FE['metadata.version'][3], '4.4-IV2', 'the metadata version of 4.4'); eq(FE['kraft.version'][3], '1', 'kraft.version 1'); eq(FE['group.version'][3], '1', 'the new group protocol is on');
const DF = T('world.defaults').rows.reduce((o, r) => (o[r[0]] = r[1], o), {});
eq(DF['num.partitions'], '1', 'one partition by default'); eq(DF['default.replication.factor'], '1', 'one copy by default'); eq(DF['log.retention.hours'], '168', 'seven days of retention');
eq(DF['log.segment.bytes'], '1073741824', 'a segment of 1 GiB'); eq(DF['auto.create.topics.enable'], 'true', 'topics are created by a typo'); eq(DF['log.index.interval.bytes'], '4096', 'an index entry about every 4 KiB');
eq(DF['unclean.leader.election.enable'], 'false', 'no unclean election by default');

// ---- The log on disk: the index is sparse, and the roll leaves a segment a little under the limit ----------------------------------------------------------------
const IX = C('log.index'), RL = C('log.roll'), OV = C('log.overhead');
let pos = 0, first = 0; const BS = IX.batch_last_offsets.map((last, i) => { const b = { first, last, pos, size: IX.batch_sizes[i] }; pos += b.size; first = last + 1; return b; });
eq(BS.length, IX.batches, 'the number of batches'); eq(BS[0].first, 0, 'the first batch starts at offset 0'); BS.forEach((b, i) => yes(i === 0 || b.first === BS[i - 1].last + 1, 'batches follow each other without a gap'));
eq(sum(BS.map(b => b.size)), RL.first_segment_bytes, 'the batch sizes add up to the first segment'); eq(BS.length, RL.batches_in_first_segment, 'batches in the first segment');
eq(RL.second_segment_first_offset, BS[BS.length - 1].last + 1, 'the second segment starts after the last offset of the first');
yes(RL.first_segment_bytes + RL.next_batch_bytes > RL.segment_limit_bytes && RL.first_segment_bytes < RL.segment_limit_bytes && RL.would_not_fit === true, 'the next batch would not fit, so the segment rolled');
let since = 0; const ents = []; BS.forEach(b => { if (since > 4096) { ents.push([b.last, b.pos]); since = 0; } since += b.size; });
eq(ents, IX.all_entries, 'the index rule of 4096 bytes gives exactly the recorded entries'); eq(IX.first_batch_has_an_entry, false, 'the first batch has no entry'); eq(IX.entries * IX.bytes_per_entry, RL.index_bytes_closed, 'the closed index is its entries times 8 bytes');
eq(C('log.timeindex').entries * C('log.timeindex').bytes_per_entry, RL.timeindex_bytes_closed, 'the closed time index is its entries times 12 bytes');
const lookup = (es, off) => { let e = null; es.forEach(x => { if (x[0] <= off) e = x; }); let i = e ? BS.findIndex(b => b.pos === e[1]) : 0, n = 0; for (; i < BS.length; i++) { n++; if (BS[i].last >= off) break; } return [e ? e[0] : null, e ? e[1] : 0, n]; };
T('log.lookups').rows.forEach(r => { const got = lookup(IX.all_entries, r[0]); eq([typeof r[1] === 'number' ? r[1] : null, r[2], r[3]], got, 'the lookup of offset ' + r[0]); });
eq(OV.batch_bytes, OV.key_and_value_bytes + OV.batch_header_bytes + OV.record_overhead_bytes, 'one record in one batch: data plus header plus the fields of the record'); eq(OV.bytes_that_are_not_data, OV.batch_bytes - OV.key_and_value_bytes, 'the bytes that are not data');
const BA = T('producers.batching').rows; BA.forEach(r => eq(r[4], r[1] * 61, 'the batch headers of ' + r[0] + ' records per batch cost 61 bytes each')); yes(BA[0][2] > BA[1][2] && BA[1][2] > BA[2][2], 'bigger batches take fewer bytes');
const CO = T('producers.compression').rows; yes(CO.every(r => r[0] === r[1]), 'the codec in the batch header is the codec asked for'); CO.forEach(r => near(r[4], Math.round(r[3] / CO[0][3] * 100) / 100, 'the share of ' + r[0], 0.0051));

// ---- Keys and partitions: murmur2 of the Java client, CRC32 of librdkafka -------------------------------------------------------------------------------------
function murmur2(data) {
  const m = 0x5bd1e995, r = 24, len = data.length; let h = (0x9747b28c ^ len) >>> 0, i = 0;
  const mul = (a, b) => Number((BigInt(a) * BigInt(b)) & 0xffffffffn);
  for (let k4 = 0; k4 < (len >> 2); k4++) { let k = (data[i] | (data[i + 1] << 8) | (data[i + 2] << 16) | (data[i + 3] << 24)) >>> 0; k = mul(k, m); k = (k ^ (k >>> r)) >>> 0; k = mul(k, m); h = mul(h, m); h = (h ^ k) >>> 0; i += 4; }
  const rest = len & 3; if (rest === 3) h = (h ^ (data[i + 2] << 16)) >>> 0; if (rest >= 2) h = (h ^ (data[i + 1] << 8)) >>> 0; if (rest >= 1) { h = (h ^ data[i]) >>> 0; h = mul(h, m); }
  h = (h ^ (h >>> 13)) >>> 0; h = mul(h, m); h = (h ^ (h >>> 15)) >>> 0; return h;
}
const CRC = (() => { const t = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return b => { let c = 0xffffffff; for (const x of b) c = t[(c ^ x) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }; })();
const part = (key, n, f) => (f(Buffer.from(key)) & 0x7fffffff) % n;
const PL = T('keys.placement'), PC = T('keys.placement_other_client');
[3, 6, 12].forEach((n, ci) => { PL.rows.forEach(r => eq(r[ci + 1], part(r[0], n, murmur2), 'murmur2 puts ' + r[0] + ' in partition ' + part(r[0], n, murmur2) + ' of ' + n)); });
[3, 6, 12].forEach((n, ci) => { PC.rows.forEach(r => eq(r[ci + 1], CRC(Buffer.from(r[0])) % n, 'CRC32 (unsigned, as librdkafka divides it) puts ' + r[0] + ' in partition of ' + n)); });
eq(PL.rows.map(r => r[0]), STORES, 'the twelve stores'); eq(C('keys.placement_check').keys_where_the_two_partitioners_disagree_on_6, PL.rows.filter((r, i) => r[2] !== PC.rows[i][2]).length, 'the clients disagree on this many keys with 6 partitions');
const SR = T('keys.store_records').rows, SK = C('keys.skew_summary'); eq(sum(SR.map(r => r[1])), SK.records, 'the stores add up to 12,000 orders'); eq(SR[0][1], SK.busiest_store_records, 'the records of s01');
near(Math.round(SR[0][1] / SK.records * 1000) / 1000, SK.busiest_store_share, 'a third of the orders is s01', 1e-9);
const per6 = [0, 0, 0, 0, 0, 0]; PL.rows.forEach((r, i) => { per6[r[2]] += SR[i][1]; });
eq(T('keys.skew').rows.map(r => r[1]), per6, 'the records of each partition are the sums of the records of its stores'); eq(Math.max(...per6), SK.busiest_partition_records, 'the busiest partition');
eq(Math.round(Math.max(...per6) / (SK.records / 6) * 100) / 100, SK.busiest_over_even, 'busiest over even'); eq(T('keys.skew').rows.filter(r => r[1] === 0).length, 1, 'one partition is empty with 6 partitions');
const AD = T('keys.adding').rows; eq(AD.filter(r => r[3] === 'moved').length, C('keys.adding_summary').moved, 'keys that moved when 3 became 6'); eq(AD.map(r => [r[1], r[2]]), PL.rows.map(r => [r[1], r[2]]), 'the table of the move is the placement for 3 and 6');
AD.forEach(r => eq(r[3], r[1] === r[2] ? 'same' : 'moved', 'moved or same for ' + r[0]));

// ---- Replication: acks, the minimum in-sync set, and unclean election -----------------------------------------------------------------------------------------
const outcome = (alive, acks, min) => alive === 0 ? 'offline' : (acks === 'all' && alive < min) ? 'NOT_ENOUGH_REPLICAS' : 'delivered';
T('replication.acks_when_short').rows.forEach(r => { const alive = /one replica/.test(r[0]) ? 1 : 3; eq(r[3].replace(/ x\d+$/, ''), outcome(alive, String(r[1]), 2), 'acks=' + r[1] + ' with ' + alive + ' in sync'); });
const WD = C('replication.while_one_is_down'); eq(outcome(WD.in_sync_replicas, 'all', WD.min_insync_replicas), 'delivered', 'two in sync and a minimum of two accept acks=all'); eq(WD.outcomes.delivered, 500, 'all 500 delivered');
const UR = T('replication.unclean_result').rows, safe = UR.find(r => r[0] === 'safe'), lossy = UR.find(r => r[0] === 'lossy');
eq(safe[1] - safe[4], 0, 'nothing is missing without unclean election'); eq(lossy[1] - lossy[4], lossy[5], 'acknowledged minus at the end is the number missing'); eq(C('replication.unclean_lost').lost_count, lossy[5], 'the lost count'); eq(lossy[2], lossy[5], 'the records only the leader had are the ones that were lost');
eq(C('replication.unclean_lost').lost_order_ids_first_last, [101, 150], 'the lost orders'); eq(C('replication.unclean_lost').safe_lost_count, 0, 'the safe topic lost nothing');
const CP = T('replication.copies').rows; yes(new Set(CP.map(r => r[3])).size === 1 && new Set(CP.map(r => r[2])).size === 1, 'the three copies are byte for byte the same');

// ---- Consumer groups: the range assignment, lag, and the rebalance protocols ------------------------------------------------------------------------------------
const range = (n, parts) => { const base = Math.floor(parts / n), extra = parts % n; let p = 0; return Array.from({ length: n }, (_, m) => { const c = base + (m < extra ? 1 : 0), l = Array.from({ length: c }, (_, k) => p + k); p += c; return l.join(','); }); };
const RR = T('consumers.rebalance_range').rows, lastAssigned = (rows, step, who) => { const a = rows.filter(r => r[0] === step && r[1] === who && r[2] === 'assigned'); return a.length ? a[a.length - 1][3] : null; };
eq(lastAssigned(RR, 'A starts', 'A'), range(1, 6)[0], 'one member has all six'); eq([lastAssigned(RR, 'B joins', 'A'), lastAssigned(RR, 'B joins', 'B')], range(2, 6), 'two members share six');
eq([lastAssigned(RR, 'C joins', 'A'), lastAssigned(RR, 'C joins', 'B'), lastAssigned(RR, 'C joins', 'C')], range(3, 6), 'three members share six'); eq([lastAssigned(RR, 'B leaves', 'A'), lastAssigned(RR, 'B leaves', 'C')], range(2, 6), 'after B leaves, two share six');
const RS = C('consumers.rebalance_summary'); ['range', 'cooperative', 'new_protocol'].forEach(p => ['B joins', 'C joins', 'B leaves'].forEach(e => yes(RS[p][e].partitions_revoked_from_members_that_stay <= RS[p][e].partitions_revoked_in_all, p + ' ' + e + ': the revoked from members that stay cannot exceed all revoked')));
const revoked = (rows, step) => sum(rows.filter(r => r[0] === step && r[2] === 'revoked').map(r => r[3].split(',').length));
eq(revoked(RR, 'B joins'), RS.range['B joins'].partitions_revoked_in_all, 'the table of the eager run agrees with its summary for B joins'); eq(revoked(RR, 'C joins'), RS.range['C joins'].partitions_revoked_in_all, 'and for C joins');
eq(revoked(T('consumers.rebalance_cooperative').rows, 'B joins'), RS.cooperative['B joins'].partitions_revoked_in_all, 'cooperative: the table agrees with its summary for B joins'); yes(RS.range['B joins'].partitions_revoked_in_all === 6 && RS.cooperative['B joins'].partitions_revoked_in_all === 3, 'eager stops 6, cooperative 3');
const LG = C('consumers.lag_total'); eq(LG.records - LG.committed, LG.lag, 'lag is the end minus the committed offset'); const TS0 = C('consumers.too_slow'); yes(TS0.processing_took_seconds > TS0.max_poll_interval_ms / 1000, 'the processing took longer than the poll interval');
eq(TS0.commit_error[0], 'UNKNOWN_MEMBER_ID', 'a member that was removed cannot commit');

// ---- Delivery: the two commit strategies, a lost acknowledgement, a crash in a transaction ---------------------------------------------------------------------
const TOTAL = 100;
const crash = (strategy, k, n) => strategy === 'commit' ? { readBefore: n, readAfter: TOTAL - n, written: (n - 1) + (TOTAL - n), never: 1, twice: 0 } : (() => { const c = Math.floor((n - 1) / k) * k; return { readBefore: n, readAfter: TOTAL - c, written: n + TOTAL - c, never: 0, twice: n - c }; })();
const CR = T('delivery.crash').rows;
const c1 = crash('commit', 1, 61); eq([CR[0][2], CR[0][3], CR[0][4], CR[0][5], CR[0][6], CR[0][7]], [c1.readBefore, c1.readAfter, c1.written, c1.never, c1.twice, c1.written], 'commit first, dying after order 61');
const c2 = crash('process', 10, 65); eq([CR[1][2], CR[1][3], CR[1][4], CR[1][5], CR[1][6], CR[1][7]], [c2.readBefore, c2.readAfter, c2.written, c2.never, c2.twice, c2.written], 'process first, committing every 10, dying after order 65');
eq([CR[2][4], CR[2][6], CR[2][7]], [c2.written, c2.twice, TOTAL], 'the same crash into a sink that overwrites by order id leaves 100 rows');
const LA = T('delivery.lost_ack').rows; eq([LA[0][4] - LA[0][1], LA[1][4] - LA[1][1]], [LA[0][5], LA[1][5]], 'records minus orders are the extra copies'); eq(LA[1][5], 0, 'idempotence leaves no extra copies'); eq(LA[0][5], 5, 'five extra copies without it');
const TA = C('delivery.tx_after_crash'), TR = C('delivery.tx_after_restart');
eq(TA.records_seen_by_a_read_uncommitted_consumer - TA.records_seen_by_a_read_committed_consumer, TA.records_of_the_open_transaction, 'read_committed hides the open transaction'); eq(TR.read_uncommitted_records - TR.read_committed_records, TR.orders_seen_twice_by_read_uncommitted.length, 'read_uncommitted sees the repeats');
eq(TR.read_committed_distinct_orders, TR.read_committed_records, 'read_committed sees each order once'); eq(TR.read_committed_has_duplicates, false, 'and no duplicates');

// ---- Retention and compaction -------------------------------------------------------------------------------------------------------------------------------------
const log = []; for (let r = 1; r <= 5; r++) STORES.forEach(s => log.push([log.length, s, r])); log.push([log.length, 's11', 'tomb']); log.push([log.length, 's12', 'tomb']); log.push([log.length, 's01', 6]);
const lastOf = {}; log.slice(0, 62).forEach(x => { lastOf[x[1]] = x; }); const kept = Object.values(lastOf).concat([log[62]]).sort((a, b) => a[0] - b[0]);       // the last record of each key in the closed segments, and the active segment as it is
eq(T('retention.compacted').rows.map(r => [r[0], r[1], r[2] === 'tombstone (no value)' ? 'tomb' : r[2]]), kept, 'compaction keeps the last record of each key, with the offsets unchanged');
const CB = C('retention.compaction_before'), CA = C('retention.compaction_after'); eq(CB.records, 62, 'sixty-two records before'); eq(CB.keys, 12, 'twelve keys'); eq(CB.tombstones, 2, 'two tombstones'); eq(CA.records, kept.length, 'thirteen records after');
eq(CA.gaps_in_the_offsets, (kept[kept.length - 1][0] - kept[0][0] + 1) - kept.length, 'gaps in the offsets'); eq(CA.highest_offset_before, 61, 'the highest offset before'); eq(C('retention.compaction_tombstones_gone').keys, STORES.slice(0, 10), 'the deleted keys are gone');
const BT = C('retention.by_time_rule'); eq(BT.second_state_earliest % 50, 0, 'the log start moved by whole segments'); const BF = C('retention.backfill'); eq(BF.records_left, 0, 'the backfill of old records was deleted at once'); yes(BF.age_of_the_records_days * 86400000 > 7 * 86400000, 'older than the retention of seven days');
const BZ = C('retention.by_size_summary'); yes(BZ.bytes_left_in_the_log_files > BZ.retention_bytes && BZ.bytes_left_in_the_log_files < BZ.retention_bytes + BZ.segment_bytes + 1048576, 'size retention leaves up to one segment above the cap'); eq(BZ.written_records - BZ.records_left, BZ.earliest_offset, 'records removed = the new log start');

// ---- Kafka Connect: converters, errors, offsets --------------------------------------------------------------------------------------------------------------------
const CV = T('connect.converters').rows; eq(Buffer.byteLength(CV[0][2]), CV[0][3], 'the string converter stores the line as it is'); eq(Buffer.byteLength(CV[1][2]), CV[1][3], 'the JSON converter wrote the line as a JSON string'); yes(CV[2][3] > CV[1][3] && CV[1][3] > CV[0][3], 'the envelope is the biggest');
const FT = C('connect.failed_task'), DL = C('connect.dead_letter'); eq([FT.connector_state, FT.task_state, FT.lines_written_before_it_failed], ['RUNNING', 'FAILED', 0], 'a strict sink: the task fails, the connector says RUNNING'); eq(DL.lines_written + DL.records_in_the_dead_letter_topic, DL.records_read_by_the_sink, 'a tolerant sink: written plus dead letters is what it read');
eq(DL.header_names.length, 10, 'ten headers on a dead letter'); eq(C('connect.sink_counts').lines_written_with_transforms, C('connect.sink_counts').lines_written_without_transforms, 'the transforms change records, not how many');
const RS2 = C('connect.restart_and_reset'); eq([RS2.records_after_a_restart, RS2.records_after_delete_and_create_with_the_same_name], [25, 25], 'a restart or a re-creation under the same name repeats nothing'); eq(RS2.records_after_the_offsets_were_reset, RS2.records_after_5_more_lines + RS2.lines_in_the_file, 'a reset reads the whole file again');
eq(C('connect.offsets_after_20').offsets[0].offset.position, C('connect.offsets_after_20').file_bytes, 'the source position is the size of the file');

// ---- Change data capture ---------------------------------------------------------------------------------------------------------------------------------------------
const CH = T('cdc.changes').rows; eq(CH.map(r => r[2]), ['c', 'u', 'd', 'none: the value is null'], 'insert, update, delete, and the tombstone'); eq(CH[1][3], 'null', 'an update has no old row with the default identity');
eq(JSON.parse(CH[2][3]), { order_id: 3, store_id: '', customer_id: null, total_cents: 0, status: '' }, 'a delete carries the key, and empty values for the rest'); eq(CH[3][1], CH[2][1], 'the tombstone has the key of the delete');
const RF = C('cdc.replica_identity_full'); eq(Object.keys(RF.before).sort(), Object.keys(RF.after).sort(), 'with FULL the old row has every column'); yes(RF.before.total_cents !== RF.after.total_cents, 'and the change is visible');
const WH = C('cdc.wal_held_back'); yes(WH.backlog_bytes_while_stopped > 1e6 && WH.backlog_bytes_after_the_connector_caught_up < 1e5, 'the backlog while stopped, and after catching up'); near(WH.backlog_bytes_while_stopped / WH.rows_changed_while_stopped, Math.round(WH.backlog_bytes_while_stopped / WH.rows_changed_while_stopped), 'bytes per change', 1);
eq(WH.slot_active_while_stopped, 'f', 'the slot is inactive while the connector is stopped'); eq(WH.wal_segment_bytes, 16 * 1048576, 'a WAL segment is 16 MiB');
const AL = C('cdc.at_least_once'); eq(AL.records_after_the_restart - AL.records_before_the_crash, AL.extra_records, 'extra records after the crash'); eq(AL.events_delivered_twice, AL.events_of_the_last_four_updates, 'the last four updates were delivered twice');
const FL = C('cdc.flat'); eq(FL.snapshot_records + FL.live_records, FL.records, 'flat records'); eq(FL.tombstones, 0, 'rewrite leaves no tombstone');

// ---- Schemas: the rules of Avro, written again here, the wire format and the sizes -------------------------------------------------------------------------
const rule = { 'add the field channel, with a default': [1, 1], 'add the field channel, no default': [0, 1], 'remove the field status (it had no default)': [1, 0], 'remove the field customer_id (it had a default)': [1, 1],
  'rename total_cents to amount_cents': [0, 0], 'rename total_cents to amount_cents, with an alias': [1, 0], 'widen total_cents from int to long': [1, 0], 'narrow order_id from long to int': [0, 1], 'make customer_id required (it was null or long)': [0, 1] };
T('schemas.changes').rows.forEach(r => { const w = rule[r[0]]; eq([r[1], r[2]], w.map(x => x ? 'yes' : 'no'), 'Avro: ' + r[0]); eq(r[3], w[0] && w[1] ? 'full' : w[0] ? 'backward only' : w[1] ? 'forward only' : 'none', 'verdict of ' + r[0]); eq(r[4] === '', !!(w[0] && w[1]), 'a failure message only when a direction fails: ' + r[0]); });
const RFL = T('schemas.registry_flow').rows, acc = (v) => v !== 'refused'; eq(RFL.map(r => [acc(r[1]), acc(r[2])]), [[true, true], [true, true], [false, false], [true, false]], 'the stand-in registry decides as BACKWARD and FULL should');
eq(C('schemas.registry').ids_in_the_backward_subject, [1, 2, 3], 'the ids of the BACKWARD subject'); eq(C('schemas.registry').schemas_stored_in_the_full_subject, 2, 'the FULL subject kept two');
const WF = C('schemas.wire_format'); eq(WF.message_bytes, WF.avro_payload_bytes + 5, 'five bytes of header'); eq(WF.first_five_bytes_hex, '00' + ('00000000' + WF.schema_id.toString(16)).slice(-8), 'magic byte and schema id');
const zz = n => { n = n < 0 ? -2 * n - 1 : 2 * n; let b = 1; while (n >= 128) { n = Math.floor(n / 128); b++; } return b; }, str = s => zz(s.length) + s.length;
eq(zz(7) + str('s03') + (zz(1) + zz(1007)) + zz(450) + str('paid'), WF.avro_payload_bytes, 'the Avro bytes of order 7, worked out by hand'); eq(JSON.stringify({ order_id: 7, store_id: 's03', customer_id: 1007, total_cents: 450, status: 'paid' }).length, WF.json_bytes_of_the_same_record, 'the JSON bytes of the same order');
const SZ = T('schemas.sizes').rows; near(SZ[1][3], Math.round(SZ[1][1] / SZ[0][1] * 100) / 100, 'the share of Avro', 0.0051); near(SZ[0][2], SZ[0][1] / 1000, 'bytes per order', 0.0501);
const DR = C('schemas.drift'); eq(DR.true_total_cents - DR.consumer_with_a_default_total_cents, DR.silently_missing_cents, 'silently missing cents'); eq(DR.total_before_it_stopped, DR.consumer_with_a_default_total_cents, 'the strict and the lenient consumer agree up to the rename');

// ---- Kafka Streams -------------------------------------------------------------------------------------------------------------------------------------------------------
const SC = C('streams.counts_check'); eq(SC.records_in_the_output_topic, SC.orders_in, 'one update for each input record'); eq(SC.windows_with_a_count, SC.expected_windows, 'every window'); yes(SC.every_count_is_right, 'the counts are right');
const CN = C('streams.channel_counts'); eq(sum(Object.values(CN.counts)), SC.orders_in, 'the channels add up to the orders'); eq(CN.value_bytes, 8, 'a count is a long of eight bytes');
const IT = T('streams.internal_topics').rows; eq(IT.map(r => r[1]), [3, 3, 3], 'three partitions each'); yes(IT.find(r => /changelog/.test(r[0]) && /channel/.test(r[0]))[3] === 'compact', 'a changelog is compacted'); yes(IT.find(r => /repartition/.test(r[0]))[3] === 'delete', 'a repartition topic is deleted by time');
eq(C('streams.state_on_disk').task_folders.length, 6, 'two sub-topologies of three partitions are six tasks'); yes(X('streams.topology').split('Sub-topology').length === 3, 'two sub-topologies in the topology');
const LT = C('streams.late'), Tstream = 599, win = lateness => { const t = Tstream - lateness, we = Math.floor(t / 60) * 60 + 60; return we + LT.grace_seconds > Tstream; };
eq([win(20), win(594)], [LT.record_20_seconds_late_counted, LT.record_in_a_closed_window_counted], 'the rule of the grace gives the two recorded outcomes'); eq(LT.count_of_that_window[1] - LT.count_of_that_window[0], 1, 'the late record that was counted added one');
eq(LT.count_of_the_closed_window[1] - LT.count_of_the_closed_window[0], 0, 'the one that was dropped added nothing'); yes(LT.dropped_records_metric >= 1, 'and the metric counted it');
const RSt = C('streams.restart'); eq(RSt.output_records_before_the_restart, RSt.output_records_after_the_restart, 'a restart repeats nothing'); eq(RSt.count_after_the_state_was_deleted_and_one_more_order - RSt.count_of_the_window_after_three_new_orders, 1, 'the count continued after a restore');

// ---- Security: the authorizer, written again here ----------------------------------------------------------------------------------------------------------------
const rules = { r1: ['allow', 'alice', ['Write', 'Describe'], 'Topic', 'orders', 0], r2: ['allow', 'bob', ['Read', 'Describe'], 'Topic', 'orders', 0], r3: ['allow', 'bob', ['Read'], 'Group', 'bob-group', 0], r4: ['deny', 'bob', ['Read'], 'Topic', 'orders', 0], r5: ['allow', 'alice', ['Write', 'Describe'], 'Topic', 'brewline.', 1] };
const decide = (on, who, steps) => { for (const [op, res, name] of steps) { const m = on.map(i => rules[i]).filter(r => r[1] === who && r[2].includes(op) && r[3] === res && (r[5] ? name.startsWith(r[4]) : name === r[4])); if (m.some(r => r[0] === 'deny') || !m.length) return res.toUpperCase() + '_AUTHORIZATION_FAILED'; } return 'delivered'; };
const wr = t => [['Describe', 'Topic', t], ['Write', 'Topic', t]], rd = [['Read', 'Group', 'bob-group'], ['Describe', 'Topic', 'orders'], ['Read', 'Topic', 'orders']];
const SA = T('security.sasl').rows, sa = k => SA.find(r => r[0].indexOf(k) === 0)[1];
eq(sa('alice, right password, no ACL'), decide([], 'alice', wr('orders')), 'no ACL: denied'); eq(sa('alice, after Write'), decide(['r1'], 'alice', wr('orders')), 'Write and Describe: delivered');
eq(sa('bob reads with a group, Read on the topic only'), decide(['r1', 'r2'], 'bob', rd), 'Read on the topic only: the group is refused'); eq(sa('bob reads with a group, after Read on the group'), 'delivered', 'Read on the group'); eq(decide(['r1', 'r2', 'r3'], 'bob', rd), 'delivered', 'the rule agrees');
eq(sa('bob reads, after a deny rule'), decide(['r1', 'r2', 'r3', 'r4'], 'bob', rd), 'a deny wins'); eq(sa('alice writes to brewline.orders'), decide(['r1', 'r2', 'r3', 'r5'], 'alice', wr('brewline.orders')), 'a prefix covers brewline.orders');
eq(sa('alice writes to brewline.refunds'), decide(['r1', 'r2', 'r3', 'r5'], 'alice', wr('brewline.refunds')), 'and brewline.refunds'); eq(sa('alice writes to other.topic'), decide(['r1', 'r2', 'r3', 'r5'], 'alice', wr('other.topic')), 'but not other.topic');
yes(SA.filter(r => /no login|wrong password/.test(r[0])).every(r => r[1] === '_MSG_TIMED_OUT'), 'a failed login is a timeout for the producer'); yes(/AUTHENTICATION/.test(SA.find(r => /wrong password/.test(r[0]))[3]), 'and the error callback names it');
const TL = T('security.tls').rows; yes(TL.filter(r => /^_SSL|^_TRANSPORT/.test(r[3])).length === 4, 'four of the TLS cases fail in the handshake'); eq(TL.filter(r => /ACL for the principal/.test(r[0])).map(r => r[1]), ['TOPIC_AUTHORIZATION_FAILED', 'delivered'], 'only the principal as the broker names it works');
const LS = C('security.listeners'); eq(LS.principal_of_a_certificate, 'User:' + LS.subject_of_the_certificate.split(',').reverse().join(','), 'the principal is the subject in the other order'); yes(/DefaultDeny/.test(X('security.denied_log')), 'a denial with no rule is DefaultDeny');
yes(X('security.users_described').split('\n').every(l => /iterations=4096/.test(l)) && !/secret/.test(X('security.users_described')), 'the cluster describes SCRAM users without their passwords');

// ---- Operations: the metrics of a dead broker, a rolling restart, a move, a quota, and the size of a cluster ------------------------------------------------------
const MT = T('ops.metrics').rows, MRd = C('ops.metrics_reading'); const urp = MT.find(r => /^under-replicated/.test(r[0])); eq(urp[2].split(' / ').map(Number), [0, 0, 0], 'no partition is under-replicated when healthy'); eq(sum(urp[3].split(' / ').map(Number)), MRd.under_replicated_when_broker_1_is_dead, 'the under-replicated partitions add up');
eq(MRd.under_replicated_when_broker_1_is_dead, MRd.partitions_with_a_replica_on_broker_1, 'one for each partition that had a copy on broker 1'); eq(MRd.leaders_on_brokers_2_and_3_when_broker_1_is_dead, 3, 'brokers 2 and 3 lead all three partitions'); eq(MRd.offline_when_broker_1_is_dead, 0, 'no partition is offline');
eq(MT.find(r => /active controllers/.test(r[0])).slice(2), ['1', '1'], 'one active controller');
const RRs = C('ops.rolling_restart'); eq(RRs.orders_sent, RRs.records_in_the_topic, 'every order sent is in the topic'); eq(RRs.records_in_the_topic, RRs.distinct_orders, 'and none twice'); eq([RRs.lost, RRs.duplicates, RRs.errors], [0, 0, 0], 'nothing lost, nothing repeated, no error');
eq(T('ops.rolling_steps').rows.map(r => r[3]), ['all three in sync again', 'all three in sync again', 'all three in sync again'], 'in sync after each restart');
const RX = C('ops.reassign_result'); eq(RX.replicas_after, [2, 3, 4], 'the partition moved to brokers 2, 3, 4'); eq(RX.folder_exists_on_broker['1'], false, 'and left broker 1'); yes(RX.log_bytes_on_the_new_broker_equals_the_others, 'the new copy is as big as the others');
yes(/Clearing broker-level throttles/.test(X('ops.reassign_verify')) && /completed/.test(X('ops.reassign_verify')), 'verify removes the throttle'); yes(/throttle limit was set to 50000000/.test(X('ops.reassign_execute')), 'the throttle was set');
const QA = C('ops.quota'); eq(QA.burst_the_window_allows_bytes, QA.quota_bytes_per_second * QA.window_samples * QA.window_seconds_each, 'the burst is the quota times the window'); yes(QA.bytes_sent > QA.burst_the_window_allows_bytes, 'the test sent more than the burst');
near(QA.seconds_the_quota_forces_at_least, Math.round((QA.bytes_sent - QA.burst_the_window_allows_bytes) / QA.quota_bytes_per_second * 10) / 10, 'the minimum time forced by the quota', 0.0501); eq([QA.client_without_a_quota_waited_ms, QA.the_broker_asked_the_client_to_wait, QA.the_client_with_the_quota_took_longer], [0, true, true], 'only the client with a quota was told to wait');
yes(QA.client_with_the_quota_waited_ms_at_most > 0 && QA.client_with_the_quota_waited_ms_at_most <= 30000, 'the wait the broker asked for'); eq(QA.window_samples, 11, 'eleven samples in the window'); eq(QA.window_seconds_each, 1, 'one second each');
const disk = (mbps, days, rf, share) => mbps * 1048576 * 86400 * days * rf * share; eq(Math.round(disk(20, 7, 3, 1) / 1e12 * 10) / 10, 38.1, '20 MiB/s for a week with three copies is 38.1 TB before compression'); eq(CO.map(r => r[4]), [1, 0.16, 0.29, 0.31, 0.14], 'the compression shares');

// ---- Tests: pytest output, and the consumer that is safe to run twice ----------------------------------------------------------------------------------------------
const TS = C('tests.summary'); yes(/4 passed/.test(X('tests.pytest_clean')), 'four tests pass'); yes(/2 failed, 2 passed/.test(X('tests.pytest_bug')), 'two fail with the bug'); yes(/3 passed, 1 deselected/.test(X('tests.pytest_unit_only')), 'three need no broker');
eq([TS.clean.passed, TS.with_a_bug.failed, TS.with_a_bug.passed, TS.unit_tests_only.passed, TS.unit_tests_only.deselected], [4, 2, 2, 3, 1], 'the counts of the three runs'); eq([TS.clean.exit_code, TS.with_a_bug.exit_code, TS.unit_tests_only.exit_code], [0, 1, 0], 'the exit codes');
const ID = C('tests.idempotent_demo'); const apply = (batch, state, applied) => { const bad = []; for (const [o, v] of batch) { if (o <= (applied[0] === undefined ? -1 : applied[0])) continue; if (v === null) bad.push(o); else state[v] = 100 + v; applied[0] = o; } return bad; };
const msgs = (a, b, badAt) => Array.from({ length: b - a + 1 }, (_, k) => [a + k, a + k === badAt ? null : a + k]); const stt = {}, ap = {}; const b1 = apply(msgs(0, 6, 3), stt, ap); const after1 = Object.assign({}, stt); const b2 = apply(msgs(4, 9), stt, ap);
eq(b1, ID.bad_offsets, 'the bad message of the first run'); eq(b2.length, ID.bad_in_the_replay, 'none in the replay'); eq(Object.fromEntries(Object.entries(after1).map(([k, v]) => [k, v])), ID.state_after_the_first_pass, 'the state after the first run'); eq(Object.fromEntries(Object.entries(stt)), ID.state_after_the_replay, 'the state after the replay');
yes(Object.keys(after1).every(k => stt[k] === after1[k]) && ID.the_replay_changed_nothing_that_was_applied && ID.same_as_a_run_without_a_replay, 'the replay changed nothing that was already applied'); eq(ID.applied_position, { 0: 9 }, 'the position of the partition'); eq([ID.tests_passed, ID.exit_code], [ID.tests, 0], 'the tests of the consumer pass');

console.log(checks + ' checks, ' + fails + ' failed');
process.exit(fails ? 1 : 0);
