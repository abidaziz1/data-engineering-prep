/* Lab widgets for the first half of the Apache Kafka course: the offset index, keys and partitions, in-sync replicas, consumer groups, a crash between processing and committing, and compaction.
   Each one registers LAB.W.<kind>. Every number that a lab shows comes from js/real.js, which kafka/verify/capture_kafka.py wrote after running the real Apache Kafka 4.4.0 in KRaft mode with three
   brokers on one machine. A lab that applies a rule to the recorded data, or only does arithmetic, says so on screen, and says which of its numbers were recorded. */
(function () {
  var LAB = (window.LAB = window.LAB || {});
  var W = (LAB.W = LAB.W || {});
  var esc = LAB.esc, md = LAB.md, H = LAB.H, G = LAB.get;

  function chips(list, cur, act, fmt) {
    return list.map(function (k) {
      return '<button type="button" class="sel-chip' + (String(k) === String(cur) ? ' on' : '') + '" data-act="' + act + '" data-v="' + esc(String(k)) + '">' + esc(fmt ? fmt(k) : String(k)) + '</button>';
    }).join('');
  }
  function row(label, inner) { return '<div class="lab-row"><span class="lab-l">' + esc(label) + '</span><div class="sel-chips">' + inner + '</div></div>'; }
  function table(cols, rows, rowCls, cellCls) {
    return '<div class="tbl-wrap"><table class="tbl"><thead><tr>' + cols.map(function (c) { return '<th>' + esc(c) + '</th>'; }).join('') + '</tr></thead><tbody>' +
      rows.map(function (r, ri) { return '<tr class="' + (rowCls ? rowCls(r, ri) || '' : '') + '">' + r.map(function (c, ci) { return '<td class="' + (cellCls ? cellCls(r, ri, ci) || '' : '') + '">' + md(String(c)) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>';
  }
  function fmtN(x, d) { return (Math.round(x * Math.pow(10, d || 0)) / Math.pow(10, d || 0)).toLocaleString('en-US', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }); }
  function mb(n) { return n >= 1099511627776 ? fmtN(n / 1099511627776, 2) + ' TiB' : n >= 1073741824 ? fmtN(n / 1073741824, 2) + ' GiB' : n >= 1048576 ? fmtN(n / 1048576, 1) + ' MiB' : n >= 1024 ? fmtN(n / 1024, 1) + ' KiB' : fmtN(n) + ' B'; }
  function big(b, span, cls) { return '<div class="big' + (cls ? ' ' + cls : '') + '"><b>' + b + '</b><span>' + span + '</span></div>'; }
  function bar(label, v, max, text, cls) {
    var pc = max > 0 ? Math.max(0, Math.min(100, v / max * 100)) : 0;
    return '<div class="lane"><span class="lane-n lane-wide">' + esc(label) + '</span><div class="lane-track"><div class="gbar' + (cls ? ' ' + cls : '') + '" style="left:0;width:' + pc + '%">&nbsp;</div></div><span class="lane-v">' + esc(text) + '</span></div>';
  }
  function callout(k, t) { return '<div class="callout ' + k + '">' + md(t) + '</div>'; }
  function pill(t, cls) { return '<span class="pill' + (cls ? ' ' + cls : '') + '">' + esc(t) + '</span>'; }
  function rec(label, cls, act, v) {
    return act ? '<button type="button" class="rec ' + (cls || '') + '" data-act="' + act + '" data-v="' + esc(String(v)) + '">' + esc(String(label)) + '</button>' : '<i class="rec ' + (cls || '') + '">' + esc(String(label)) + '</i>';
  }
  /* a note under a lab: the text may use **bold** and `code`, and may start with a pill, which is HTML that must not be escaped */
  function fixNotes(h) {
    return h.replace(/<p class="lab-note">([\s\S]*?)<\/p>/g, function (m, inner) {
      var pm = inner.match(/^(<span class="pill[^"]*">[^<]*<\/span>)\s*([\s\S]*)$/);
      return '<p class="lab-note">' + (pm ? pm[1] + ' ' + md(pm[2]) : md(inner)) + '</p>';
    });
  }
  var STORES = ['s01', 's02', 's03', 's04', 's05', 's06', 's07', 's08', 's09', 's10', 's11', 's12'];
  W._h = { fixNotes: fixNotes, chips: chips, row: row, table: table, fmtN: fmtN, mb: mb, big: big, bar: bar, callout: callout, pill: pill, rec: rec, STORES: STORES };

  /* ====================== Find an offset in the log ====================== */
  (function () {
    /* the batches of the first segment of the recording: first offset, last offset, where the batch starts in the file, and its size */
    function batches() {
      var IX = G.counts('log.index'), out = [], pos = 0, first = 0;
      IX.batch_last_offsets.forEach(function (last, i) { var size = IX.batch_sizes[i]; out.push({ first: first, last: last, pos: pos, size: size }); pos += size; first = last + 1; });
      return out;
    }
    /* the rule of the broker: before a batch is appended, if more than `interval` bytes were written since the last entry, the batch gets an entry (its last offset, its position) */
    function entries(bs, interval) {
      var since = 0, out = [];
      bs.forEach(function (b) { if (since > interval) { out.push([b.last, b.pos]); since = 0; } since += b.size; });
      return out;
    }
    function lookup(es, bs, off) {
      var lo = -1, start = 0, scanned = [];
      for (var i = 0; i < es.length; i++) { if (es[i][0] <= off) lo = i; else break; }
      if (lo >= 0) for (var j = 0; j < bs.length; j++) if (bs[j].pos === es[lo][1]) { start = j; break; }
      for (var k = start; k < bs.length; k++) { scanned.push(bs[k]); if (bs[k].last >= off) break; }
      return { entry: lo >= 0 ? es[lo] : null, scanned: scanned };
    }
    var OFFS = [0, 99, 100, 250, 1234, 5000, 8699], INTERVALS = [4096, 16384, 65536, 262144];
    W.offsetlab = {
      steps: function () { return 2; },
      hint: 'Pick an offset and see which index entry the broker uses, and which batches it reads.',
      say: function (s, i) {
        return [
          'You ask for an offset. The broker looks in the **sparse index** for the last entry at or below it, jumps to that position in the log file, and reads batches until the offset is inside one. Pick an offset. The index and the batches are the real ones from the recording.',
          'The index has an entry only when more than **index.interval.bytes** were written since the last one. A bigger interval makes a smaller index and more reading. 4 KiB is the recorded setting. The others use the same rule on the same recorded batches.'
        ][i];
      },
      mood: function (s, i) { return i ? 'happy' : 'think'; },
      render: function (box, s, i, A) {
        var st = A.local.ol || (A.local.ol = { off: 250, iv: 4096 }), bs = batches(), IX = G.counts('log.index'), h = '<div class="lab">';
        var off = st.off, es;
        if (i === 0) {
          es = IX.all_entries;
          var r = lookup(es, bs, off), startPos = r.scanned[0].pos, bytes = r.scanned.reduce(function (a, b) { return a + b.size; }, 0);
          var inBatch = bs.filter(function (b) { return b.first <= off && off <= b.last; })[0], fromStart = bs.indexOf(inBatch) + 1;
          h += row('Offset to read', chips(OFFS, off, 'ol-off'));
          h += '<div class="lab-out">' + big(r.entry ? r.entry[0] : 'none', 'index entry used (the last one at or below ' + off + ')', r.entry ? 'good' : 'warn') + big(fmtN(startPos), 'position where the broker starts reading') + big(r.scanned.length, 'batches read to find it') + big(mb(bytes), 'bytes read') + big(fromStart, 'batches to read without an index', 'warn') + '</div>';
          h += table(['First offset', 'Last offset', 'Position in the file', 'Batch bytes', 'Result'], r.scanned.map(function (b) { return [b.first, b.last, fmtN(b.pos), fmtN(b.size), b === inBatch ? 'the offset is in this batch' : 'read, and passed']; }),
            function (x, n) { return r.scanned[n] === inBatch ? 'hit' : ''; });
          h += callout('tip', r.entry ? 'The entry says: the batch that ends at offset **' + r.entry[0] + '** starts at position **' + fmtN(r.entry[1]) + '**. The broker starts there and reads **' + r.scanned.length + '** batch' + (r.scanned.length > 1 ? 'es' : '') + ' instead of ' + fromStart + '.' :
            'No entry is at or below **' + off + '**: the first entry is at ' + es[0][0] + ', because the first batch never gets one. The broker starts at the **beginning of the file** and reads ' + r.scanned.length + ' batch' + (r.scanned.length > 1 ? 'es' : '') + '.');
          h += '<p class="lab-note">Recorded: the ' + es.length + ' index entries and the ' + bs.length + ' batches of the first segment, read with kafka-dump-log. The search is the one that the broker does: the last entry at or below the offset, then a scan.</p>';
        } else {
          es = entries(bs, st.iv);
          var rr = lookup(es, bs, off), rec4 = st.iv === 4096;
          h += row('index.interval.bytes', chips(INTERVALS, st.iv, 'ol-iv', function (n) { return n === 4096 ? '4096 (recorded)' : fmtN(n); }));
          h += row('Offset to read', chips(OFFS, off, 'ol-off'));
          h += '<div class="lab-out">' + big(es.length, 'index entries' + (rec4 ? ' (recorded: ' + IX.entries + ')' : ''), rec4 ? 'good' : '') + big(mb(es.length * IX.bytes_per_entry), 'size of the index (' + IX.bytes_per_entry + ' bytes an entry)') + big(rr.scanned.length, 'batches read for offset ' + off, rr.scanned.length > 3 ? 'warn' : 'good') + '</div>';
          h += bar('Index entries', es.length, bs.length, es.length + ' of ' + bs.length + ' batches') + bar('Batches read', rr.scanned.length, Math.max(8, rr.scanned.length), String(rr.scanned.length));
          h += callout(rec4 ? 'tip' : 'warn', rec4 ? 'Every batch of the recording is about 11 KiB, more than the interval of 4 KiB, so **every batch after the first got an entry**: ' + es.length + ' entries for ' + bs.length + ' batches.' :
            'With an interval of **' + fmtN(st.iv) + '** bytes an entry is made about every **' + Math.max(1, Math.round(bs.length / Math.max(1, es.length))) + '** batches. The index is smaller, and a lookup reads up to that many batches.');
          h += '<p class="lab-note">' + (rec4 ? 'Recorded: the index of the first segment.' : 'Computed: the same rule applied to the recorded batch sizes. At 4096 it gives exactly the recorded ' + IX.entries + ' entries.') + ' Ten mebibytes are reserved for the index file anyway, and trimmed when the segment closes.</p>';
        }
        box.innerHTML = fixNotes(h + '</div>');
        A.bindWidget = function (act, el) {
          var v = Number(el.getAttribute('data-v'));
          if (act === 'ol-off') st.off = v; else if (act === 'ol-iv') st.iv = v;
          A.render(true);
        };
      }
    };
  })();

  /* ====================== Place the stores on partitions ====================== */
  (function () {
    function place(client, n) {
      var T = G.table(client === 'crc' ? 'keys.placement_other_client' : 'keys.placement'), ci = T.cols.indexOf(n + ' partitions');
      return T.rows.map(function (r) { return [r[0], r[ci]]; });
    }
    function counts() { var o = {}; G.table('keys.store_records').rows.forEach(function (r) { o[r[0]] = r[1]; }); return o; }
    W.partitionlab = {
      steps: function () { return 2; },
      hint: 'Pick the number of partitions and the client, and see how the stores spread out.',
      say: function (s, i) {
        return [
          'Twelve stores send orders with the store as the key. Pick how many partitions the topic has, and which client sends. The partition of each store is the one that a real broker reported. The records are the real counts of the 12,000 orders. Store s01 sells a third of them.',
          'You add partitions to a topic that is already in use. Old records stay where they are, but the hash of a key is now divided by a new number. Pick the old and the new size and see which keys move.'
        ][i];
      },
      mood: function (s, i) { return i ? 'oops' : 'think'; },
      render: function (box, s, i, A) {
        var st = A.local.pl || (A.local.pl = { n: 6, c: 'java', from: 3, to: 6 }), h = '<div class="lab">';
        if (i === 0) {
          var pl = place(st.c, st.n), cnt = counts(), per = [], k;
          for (k = 0; k < st.n; k++) per.push({ p: k, rec: 0, stores: [] });
          pl.forEach(function (r) { per[r[1]].rec += cnt[r[0]]; per[r[1]].stores.push(r[0]); });
          var total = per.reduce(function (a, x) { return a + x.rec; }, 0), mx = Math.max.apply(null, per.map(function (x) { return x.rec; })), even = total / st.n, empty = per.filter(function (x) { return x.rec === 0; }).length;
          h += row('Partitions', chips([3, 6, 12], st.n, 'pl-n'));
          h += row('Client', chips(['java', 'crc'], st.c, 'pl-c', function (x) { return x === 'java' ? 'Java and the console tools (murmur2)' : 'librdkafka default (CRC32)'; }));
          h += '<div class="lab-out">' + big(fmtN(mx / even, 2) + ' x', 'the busiest partition over an even share', mx / even > 1.5 ? 'warn' : 'good') + big(fmtN(mx), 'records in the busiest partition (' + Math.round(mx / total * 1000) / 10 + '%)') + big(empty, 'empty partitions', empty ? 'warn' : '') + '</div>';
          h += per.map(function (x) { return bar('partition ' + x.p + (x.stores.length ? ': ' + x.stores.join(' ') : ': no store'), x.rec, mx, fmtN(x.rec), x.rec === mx ? 'bad' : (x.rec === 0 ? 'off' : '')); }).join('');
          h += callout(mx / even > 1.5 ? 'warn' : 'tip', 'Records with the same key always meet in one partition, so **a hot key makes a hot partition**. Here the biggest partition is **' + fmtN(mx / even, 1) + '** times an even share, and more partitions do not remove it: store s01 alone is ' + fmtN(cnt.s01) + ' records.');
          h += '<p class="lab-note">Recorded: the partition of each store, as reported by the broker for a producer of each kind, and the number of records of each store (' + fmtN(total) + ' orders). Adding them up for each partition is arithmetic. For 6 partitions and murmur2 it gives exactly the recorded table of the lesson.</p>';
        } else {
          var from = place('java', st.from), to = place('java', st.to), moved = 0;
          h += row('From', chips([3, 6], st.from, 'pl-f'));
          h += row('To', chips([6, 12], st.to, 'pl-t'));
          var rows = from.map(function (r, n) { var m = r[1] !== to[n][1]; if (m) moved++; return [r[0], r[1], to[n][1], m ? 'moved' : 'same']; });
          h += '<div class="lab-out">' + big(moved + ' of 12', 'keys now go to another partition', moved ? 'warn' : 'good') + big(12 - moved, 'keys stayed') + '</div>';
          h += table(['Key', 'Partition before (' + st.from + ')', 'Partition after (' + st.to + ')', ''], rows, function (r) { return r[3] === 'moved' ? 'new' : ''; }, function (r, ri, ci) { return ci === 3 && r[3] === 'moved' ? 'wbad' : ''; });
          h += callout('warn', '**Records already written do not move.** A reader of store s01 that used to find everything in one partition now finds the old records in the old partition and the new ones in another, and the **order across the two is lost**. This is why you choose the partition count with room to grow.');
          h += '<p class="lab-note">Recorded: the partitions of the keys on topics of 3, 6 and 12 partitions. For 3 to 6 it is the table of the lesson, where a topic was grown from 3 to 6 partitions in the cluster.</p>';
        }
        box.innerHTML = fixNotes(h + '</div>');
        A.bindWidget = function (act, el) {
          var v = el.getAttribute('data-v');
          if (act === 'pl-n') st.n = Number(v); else if (act === 'pl-c') st.c = v;
          else if (act === 'pl-f') { st.from = Number(v); if (st.to <= st.from) st.to = st.from === 3 ? 6 : 12; }
          else if (act === 'pl-t') { st.to = Number(v); if (st.from >= st.to) st.from = 3; }
          A.render(true);
        };
      }
    };
  })();

  /* ====================== Which writes survive ====================== */
  (function () {
    /* three copies of a partition. The brokers that are up are in sync. What the producer is told, and how many copies hold the record at that moment. */
    function outcome(alive, acks, minIsr) {
      if (alive === 0) return { ok: false, err: 'no leader: the partition is offline', copies: 0 };
      if (acks === 'all' && alive < minIsr) return { ok: false, err: 'NOT_ENOUGH_REPLICAS', copies: 0 };
      return { ok: true, err: '', copies: acks === 'all' ? alive : 1 };
    }
    function recorded(alive, acks, minIsr) {
      var rows = G.table('replication.acks_when_short').rows, WD = G.counts('replication.while_one_is_down');
      if (alive === 1 && minIsr === 2) { var r = rows.filter(function (x) { return String(x[1]) === acks && /one replica/.test(x[0]); })[0]; return r ? r[3] : null; }
      if (alive === 3 && acks === 'all' && minIsr === 2) return rows.filter(function (x) { return /all three/.test(x[0]); })[0][3];
      if (alive === 2 && minIsr === 2 && acks === 'all') return 'delivered x' + WD.outcomes.delivered;
      return null;
    }
    W.isrlab = {
      steps: function () { return 2; },
      hint: 'Change the settings and read what the producer is told.',
      say: function (s, i) {
        return [
          'A partition with three copies. Choose how many brokers are up, what the producer asks for, and the minimum in-sync replicas of the topic. The lab says what the producer is told, and how many copies hold the record at that moment. Some combinations were run on the real cluster. The rest follow the same rule.',
          'The hardest case: the leader is gone, and the only broker that is up has an old copy. With unclean election off, the partition waits. With it on, a stale copy leads, and records that were acknowledged are lost. Both ran for real.'
        ][i];
      },
      mood: function (s, i) { return i ? 'oops' : 'think'; },
      render: function (box, s, i, A) {
        var st = A.local.is || (A.local.is = { a: 3, k: 'all', m: 2, u: 'false' }), h = '<div class="lab">';
        if (i === 0) {
          var o = outcome(st.a, st.k, st.m), rc = recorded(st.a, st.k, st.m);
          h += row('Brokers up', chips([3, 2, 1, 0], st.a, 'is-a'));
          h += row('Producer asks (acks)', chips(['1', 'all'], st.k, 'is-k', function (x) { return 'acks=' + x; }));
          h += row('min.insync.replicas', chips([1, 2, 3], st.m, 'is-m'));
          h += '<div class="lab-out">' + big(o.ok ? 'delivered' : (o.err.length > 22 ? 'refused' : o.err), o.ok ? 'the producer is told: success' : 'the producer is told: ' + o.err, o.ok ? 'good' : 'bad') + big(o.copies, 'copies that hold the record when the producer is told', o.copies >= 2 ? 'good' : (o.ok ? 'warn' : '')) +
            big(o.ok ? (o.copies >= 2 ? 'yes' : 'no') : 'n/a', 'does the record survive the loss of the leader right now?', o.ok ? (o.copies >= 2 ? 'good' : 'bad') : '') + '</div>';
          var why = [];
          if (st.a === 0) why.push('Every broker is down: nobody can lead the partition. Reads and writes fail.');
          else if (st.k === 'all' && st.a < st.m) why.push('`acks=all` waits for every in-sync replica, and the topic needs at least **' + st.m + '** of them. Only **' + st.a + '** ' + (st.a === 1 ? 'is' : 'are') + ' up. The leader **refuses** the write.');
          else if (st.k === 'all') why.push('`acks=all`: the leader answers after **all ' + st.a + ' in-sync replicas** have the record, and there are enough of them (' + st.a + ' of the ' + st.m + ' needed).');
          else why.push('`acks=1`: the leader answers as soon as **it** has written the record. **One copy** is all that is guaranteed. If the leader dies before the followers fetch, the record is gone, and the producer was told that it succeeded.');
          if (st.k === 'all' && st.m === 1) why.push('With `min.insync.replicas=1` the leader may be alone in the set, so `acks=all` can be as weak as `acks=1`.');
          h += callout(o.ok && o.copies >= 2 ? 'tip' : 'warn', why.join(' '));
          h += '<p class="lab-note">' + (rc ? pill('recorded', 'real') + ' This combination ran on the real cluster: the outcome was **' + esc(String(rc)) + '**.' : 'Not run in this form: the outcome follows the rule that the recorded cases show.') + ' Three copies, and every broker that is up is in sync.</p>';
        } else {
          var T = G.table('replication.unclean_election'), R = G.table('replication.unclean_result'), key = st.u === 'true' ? 'lossy' : 'safe';
          var ue = T.rows.filter(function (x) { return x[0] === key; })[0], rs = R.rows.filter(function (x) { return x[0] === key; })[0];
          h += row('unclean.leader.election.enable', chips(['false', 'true'], st.u, 'is-u'));
          h += '<div class="lab-out">' + big(ue[3], 'leader of the partition while broker 1 is down', ue[3] === 'none' ? 'warn' : '') + big(String(rs[3]), 'records that could be read meanwhile', ue[3] === 'none' ? 'bad' : '') + big(fmtN(rs[5]), 'acknowledged records missing at the end', rs[5] ? 'bad' : 'good') + '</div>';
          h += table(R.cols, [rs]);
          h += callout(rs[5] ? 'warn' : 'tip', rs[5] ? 'A broker with only **100 of the 150** records became the leader. The partition was available again at once. When broker 1 came back, it had to **cut its log back** to match the new leader, and the **' + rs[5] + ' acknowledged records** that only it had were lost for good.' :
            'The partition stayed **offline**: no replica was in sync, and Kafka refused to pick a stale one. Writers and readers waited. When broker 1 returned, nothing was lost: **all ' + rs[4] + ' records** were there.');
          h += '<p class="lab-note">' + pill('recorded', 'real') + ' Two topics on the real cluster: `' + key + '`, with the setting ' + st.u + '. Broker 1 was killed, and broker 2 came back with a copy that was 50 records short.</p>';
        }
        box.innerHTML = fixNotes(h + '</div>');
        A.bindWidget = function (act, el) {
          var v = el.getAttribute('data-v');
          if (act === 'is-a') st.a = Number(v); else if (act === 'is-k') st.k = v; else if (act === 'is-m') st.m = Number(v); else if (act === 'is-u') st.u = v;
          A.render(true);
        };
      }
    };
  })();

  /* ====================== Share the partitions ====================== */
  (function () {
    var NAMES = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'], PARTS = 6;
    /* the range assignor for one topic: contiguous partitions, the first members get one more when it does not divide */
    function range(n) {
      var base = Math.floor(PARTS / n), extra = PARTS % n, out = [], p = 0;
      for (var m = 0; m < n; m++) { var c = base + (m < extra ? 1 : 0), list = []; for (var k = 0; k < c; k++) list.push(p + k); p += c; out.push(list); }
      return out;
    }
    var EVENTS = ['B joins', 'C joins', 'B leaves'], PROTOS = { range: ['consumers.rebalance_range', 'Eager (range)'], cooperative: ['consumers.rebalance_cooperative', 'Cooperative'], newp: ['consumers.rebalance_new_protocol', 'New protocol (KIP-848)'] };
    W.grouplab = {
      steps: function () { return 2; },
      hint: 'Add members to the group and watch the partitions move.',
      say: function (s, i) {
        return [
          'A topic with six partitions and a group. **One partition goes to one member, and a member can have many.** Choose how many members are in the group. The assignment follows the range rule. The assignments of one, two and three members are the ones recorded on the real cluster.',
          'A member joins or leaves, and the partitions are shared again. Pick the protocol and the event, and read what really happened on the cluster: which partitions were taken away, and from whom.'
        ][i];
      },
      mood: function (s, i) { return i ? 'oops' : 'happy'; },
      render: function (box, s, i, A) {
        var st = A.local.gl || (A.local.gl = { n: 3, p: 'range', e: 'B joins' }), h = '<div class="lab">';
        if (i === 0) {
          var as = range(st.n), idle = st.n > PARTS ? st.n - PARTS : 0, recd = st.n <= 3;
          h += row('Members in the group', chips([1, 2, 3, 4, 6, 8], st.n, 'gl-n'));
          h += '<div class="pboxes">' + as.map(function (list, m) { return '<div class="pbox' + (list.length ? '' : ' idle') + '"><b>consumer ' + NAMES[m] + '</b><span>' + (list.length ? 'partitions ' + list.join(', ') : 'idle: nothing to read') + '</span></div>'; }).join('') + '</div>';
          h += '<div class="lab-out">' + big(PARTS, 'partitions in the topic') + big(Math.max.apply(null, as.map(function (l) { return l.length; })), 'most partitions of one member') + big(idle, 'idle members', idle ? 'warn' : 'good') + '</div>';
          h += callout(idle ? 'warn' : 'tip', idle ? 'The group has **more members than partitions**, so **' + idle + '** of them read nothing. More consumers do not make a topic faster than its partition count.' : 'Each partition is read by **one** member of the group, so the records of a partition are read in order. A second group would read all six again, with positions of its own.');
          h += '<p class="lab-note">' + (recd ? pill('recorded', 'real') + ' These are the assignments that the real consumers received, in the run with ' + st.n + ' member' + (st.n > 1 ? 's' : '') + '.' : 'Computed with the range rule, which gives the recorded assignments for one to three members.') + ' Six partitions, one topic.</p>';
        } else {
          var P = PROTOS[st.p], T = G.table(P[0]), S = G.counts('consumers.rebalance_summary')[st.p === 'newp' ? 'new_protocol' : st.p][st.e];
          var rows = T.rows.filter(function (r) { return r[0] === st.e; });
          h += row('Protocol', chips(['range', 'cooperative', 'newp'], st.p, 'gl-p', function (x) { return PROTOS[x][1]; }));
          h += row('Event', chips(EVENTS, st.e, 'gl-e'));
          h += '<div class="lab-out">' + big(S.partitions_revoked_in_all, 'partitions taken away from someone', S.partitions_revoked_in_all > 3 ? 'bad' : 'good') + big(S.partitions_revoked_from_members_that_stay, 'taken from members that stay in the group', S.partitions_revoked_from_members_that_stay ? 'warn' : 'good') + big(S.callbacks_with_no_partitions, 'callbacks with nothing to give up') + '</div>';
          h += table(['Consumer', 'Event', 'Partitions'], rows.map(function (r) { return [r[1], r[2], r[3]]; }), function (r) { return r[1] === 'revoked' ? 'dup' : ''; });
          h += callout(st.p === 'range' ? 'warn' : 'tip', st.p === 'range' ? 'Eager: **every** member gives up **every** partition, and then the group is shared again from zero. Nobody reads while that happens. With **' + S.partitions_revoked_in_all + '** partitions revoked for this event, the pause touches the whole group.' :
            'Only the partitions that **have to move** are taken away: **' + S.partitions_revoked_in_all + '**. The members that keep their partitions go on reading during the rebalance.');
          h += '<p class="lab-note">' + pill('recorded', 'real') + ' The callbacks that the real consumers received, in the order they happened, for the protocol and event that you picked. Six partitions.</p>';
        }
        box.innerHTML = fixNotes(h + '</div>');
        A.bindWidget = function (act, el) {
          var v = el.getAttribute('data-v');
          if (act === 'gl-n') st.n = Number(v); else if (act === 'gl-p') st.p = v; else if (act === 'gl-e') st.e = v;
          A.render(true);
        };
      }
    };
  })();

  /* ====================== Crash a worker ====================== */
  (function () {
    var TOTAL = 100;
    /* One hundred orders. The process dies after order n. 'commit': commit the position, then process, one record at a time (it dies after the commit of n, before processing n).
       'process': process, then commit every k records (it dies after processing n, before the commit that would follow it). */
    function crash(strategy, k, n, sink) {
      var out = { readBefore: n };
      if (strategy === 'commit') {
        out.readAfter = TOTAL - n; out.written = (n - 1) + out.readAfter; out.never = 1; out.twice = 0; out.rows = out.written; out.lost = n; out.dups = [];
      } else {
        var committed = Math.floor((n - 1) / k) * k;
        out.readAfter = TOTAL - committed; out.written = n + out.readAfter; out.never = 0; out.twice = n - committed; out.rows = sink === 'overwrite' ? TOTAL : out.written; out.lost = null;
        out.dups = [committed + 1, n];
      }
      return out;
    }
    function recorded(strategy, k, n, sink) {
      var CR = G.table('delivery.crash').rows;
      if (strategy === 'commit' && n === 61) return CR[0];
      if (strategy === 'process' && k === 10 && n === 65) return sink === 'overwrite' ? CR[2] : CR[1];
      return null;
    }
    W.crashlab = {
      steps: function () { return 2; },
      hint: 'Choose when to commit and when the worker dies, and count what the sink holds.',
      say: function (s, i) {
        return [
          'A consumer reads one hundred orders and writes each to a sink, then dies after one of them. Choose **when it commits its position**, when it dies, and what the sink does with an order that arrives twice. The cases of the lesson ran for real. The others follow the same rule.',
          'Now the transaction case. A producer wrote ten orders in a transaction that was never finished, because the process was killed. Pick how a consumer reads: it sees the open transaction or not.'
        ][i];
      },
      mood: function (s, i) { return i ? 'happy' : 'oops'; },
      render: function (box, s, i, A) {
        var st = A.local.cr || (A.local.cr = { s: 'process', k: 10, n: 65, k2: 'sink', iso: 'read_committed' }), h = '<div class="lab">';
        if (i === 0) {
          var o = crash(st.s, st.k, st.n, st.k2 === 'overwrite' ? 'overwrite' : 'append'), rc = recorded(st.s, st.k, st.n, st.k2 === 'overwrite' ? 'overwrite' : 'append');
          h += row('Strategy', chips(['commit', 'process'], st.s, 'cr-s', function (x) { return x === 'commit' ? 'commit, then process' : 'process, then commit every k'; }));
          if (st.s === 'process') h += row('k (records between commits)', chips([1, 5, 10, 20], st.k, 'cr-k'));
          h += row('The worker dies after order', chips([20, 45, 61, 65, 70, 99], st.n, 'cr-n'));
          h += row('The sink', chips(['sink', 'overwrite'], st.k2, 'cr-q', function (x) { return x === 'sink' ? 'adds a row each time' : 'overwrites by order id'; }));
          h += '<div class="lab-out">' + big(o.never, 'orders never processed', o.never ? 'bad' : 'good') + big(o.twice, 'orders processed twice', o.twice ? 'warn' : 'good') + big(o.rows, 'rows in the sink (100 orders)', o.rows === TOTAL ? 'good' : 'bad') + big(o.written, 'times the sink was written') + '</div>';
          h += table(['', 'Records read before the crash', 'Records read after the restart'], [['', o.readBefore, o.readAfter]]);
          h += callout(o.never ? 'warn' : (o.twice && st.k2 !== 'overwrite' ? 'warn' : 'tip'), st.s === 'commit' ? 'The position was committed **before** order ' + st.n + ' was processed. After the restart the consumer starts at ' + (st.n + 1) + ': order **' + st.n + ' is lost**. This is at-most-once.' :
            'The last commit was after order **' + (st.n - o.twice) + '**. The consumer had processed up to ' + st.n + ', so the restart reads **' + o.twice + '** order' + (o.twice > 1 ? 's' : '') + ' again (' + o.dups[0] + ' to ' + o.dups[1] + ')' + (st.k2 === 'overwrite' ? ', and the sink **overwrites them by order id**: **100 rows**, the right answer.' : ': **' + o.rows + ' rows** for 100 orders. This is at-least-once, and a sink that adds a row each time shows the repeats.'));
          h += '<p class="lab-note">' + (rc ? pill('recorded', 'real') + ' This case ran for real: read before the crash **' + rc[2] + '**, after the restart **' + rc[3] + '**, sink written **' + rc[4] + '** times, **' + rc[5] + '** never processed, **' + rc[6] + '** twice, **' + rc[7] + '** rows.' : 'Computed with the rule of the recorded cases: the position that was committed last decides where the restart begins.') + '</p>';
        } else {
          var TA = G.counts('delivery.tx_after_crash'), TR = G.counts('delivery.tx_after_restart'), committed = st.iso === 'read_committed';
          h += row('The consumer reads with', chips(['read_committed', 'read_uncommitted'], st.iso, 'cr-i'));
          h += '<div class="lab-out">' + big(committed ? TA.records_seen_by_a_read_committed_consumer : TA.records_seen_by_a_read_uncommitted_consumer, 'records visible after the crash', committed ? 'good' : 'warn') + big(TA.records_of_the_open_transaction, 'records of the transaction that never finished') +
            big(committed ? TR.read_committed_records : TR.read_uncommitted_records, 'records after the restart (100 orders)', committed ? 'good' : 'bad') + big(committed ? 'none' : TR.orders_seen_twice_by_read_uncommitted.length + ' orders', 'orders seen twice', committed ? 'good' : 'bad') + '</div>';
          h += callout(committed ? 'tip' : 'warn', committed ? 'A `read_committed` consumer stops at the **last stable offset**: it never sees the ' + TA.records_of_the_open_transaction + ' records of the open transaction. After the restart the transaction is done again and committed once, and the consumer sees **100** orders with no repeat.' :
            'A `read_uncommitted` consumer sees **all ' + TA.records_seen_by_a_read_uncommitted_consumer + '** records, including the ' + TA.records_of_the_open_transaction + ' of the transaction that was aborted. After the restart it also sees them written again: **' + TR.read_uncommitted_records + '** records for 100 orders.');
          h += '<p class="lab-note">' + pill('recorded', 'real') + ' A transactional producer was killed with kill -9 inside a transaction, and restarted. Two consumers read the topic with the two isolation levels.</p>';
        }
        box.innerHTML = fixNotes(h + '</div>');
        A.bindWidget = function (act, el) {
          var v = el.getAttribute('data-v');
          if (act === 'cr-s') st.s = v; else if (act === 'cr-k') st.k = Number(v); else if (act === 'cr-n') st.n = Number(v); else if (act === 'cr-q') st.k2 = v; else if (act === 'cr-i') st.iso = v;
          A.render(true);
        };
      }
    };
  })();

  /* ====================== Compact a topic ====================== */
  (function () {
    /* the log of the recording: five rounds of the status of each of the 12 stores, then a tombstone for s11 and s12, then a sixth value for s01 */
    function log() {
      var out = [], o = 0, r, s;
      for (r = 1; r <= 5; r++) for (s = 0; s < 12; s++) out.push({ o: o++, k: s, round: r, tomb: false });
      out.push({ o: o++, k: 10, round: 0, tomb: true }); out.push({ o: o++, k: 11, round: 0, tomb: true });
      out.push({ o: o++, k: 0, round: 6, tomb: false });
      return out;
    }
    function offsetsKept() { return G.table('retention.compacted').rows.map(function (r) { return r[0]; }); }
    W.compactlab = {
      steps: function () { return 2; },
      hint: 'Click the records that you think the cleaner keeps, then run it.',
      say: function (s, i) {
        return [
          'A compacted topic holds the status of each store. Five rounds of updates were written for twelve stores, then two stores closed, which is a **tombstone**: a record with a key and no value. Then one more update for s01. Click the records that you think the cleaner **keeps**, and press Run.',
          'A tombstone does not stay for ever. It is kept for a while, so that readers can see the delete, and a later pass of the cleaner removes it. See both moments.'
        ][i];
      },
      mood: function (s, i) { return i ? 'happy' : 'think'; },
      render: function (box, s, i, A) {
        var st = A.local.co || (A.local.co = { pick: {}, ran: false, later: false }), h = '<div class="lab">', recs = log(), keep = offsetsKept();
        if (i === 0) {
          h += '<div class="strip">' + recs.map(function (r) {
            var cls = 'k' + r.k + (r.tomb ? ' tomb' : '');
            if (st.ran) { var kept = keep.indexOf(r.o) >= 0, picked = !!st.pick[r.o]; cls += kept && picked ? ' right' : kept ? ' miss' : picked ? ' wrong' : ' dead'; }
            else if (st.pick[r.o]) cls += ' pick';
            return rec(r.o, cls, st.ran ? '' : 'co-p', r.o);
          }).join('') + '</div>';
          h += '<p class="lab-note">Each cell is a record: its **offset**, coloured by its key (s01 to s12). Black cells are tombstones.</p>';
          h += '<div class="lab-row"><button type="button" class="btn-sm primary" data-act="co-run"' + (st.ran ? ' disabled' : '') + '>Run the cleaner</button><button type="button" class="btn-sm" data-act="co-reset">Start again</button></div>';
          if (!st.ran) h += '<p class="lab-note">You picked **' + Object.keys(st.pick).length + '** records. Hint: the cleaner keeps **the last record of every key in the closed segments**. The newest segment is still active, and the cleaner never touches it.</p>';
          else {
            var right = keep.filter(function (o) { return st.pick[o]; }).length, extra = Object.keys(st.pick).filter(function (o) { return keep.indexOf(Number(o)) < 0; }).length;
            h += '<div class="lab-out">' + big(keep.length, 'records kept by the real cleaner', 'good') + big(right + ' of ' + keep.length, 'of those you picked', right === keep.length ? 'good' : 'warn') + big(extra, 'picked, but removed', extra ? 'bad' : 'good') + big(recs.length - keep.length, 'records removed') + '</div>';
            h += callout('tip', 'The cleaner kept offsets **' + keep.join(', ') + '**. For each key only its **last** record in the closed segments is left, and the **offsets did not change**: there are gaps where records were removed. The two tombstones (60 and 61) are the last records of s11 and s12, so they stay for now. **s01 appears twice**: offset 62 is in the **active segment**, which the cleaner does not clean, so the older value at offset 48 stays until the next pass.');
            h += '<p class="lab-note">' + pill('recorded', 'real') + ' The real cleaner ran on the real broker. The records that it kept are read from the log after cleaning. Green: you picked it and it stayed. Red outline: you missed it. Red: removed.</p>';
          }
        } else {
          var gone = G.counts('retention.compaction_tombstones_gone'), after = G.counts('retention.compaction_after');
          h += row('The moment', chips(['first', 'later'], st.later ? 'later' : 'first', 'co-m', function (x) { return x === 'first' ? 'after the first cleaning' : 'after the tombstones have aged'; }));
          if (!st.later) {
            h += '<div class="strip">' + keep.map(function (o) { var r = recs[o]; return rec(o, 'k' + r.k + (r.tomb ? ' tomb' : '')); }).join('') + '</div>';
            h += '<div class="lab-out">' + big(after.records, 'records in the log', 'good') + big(after.tombstones_still_there, 'tombstones still there', 'warn') + big(after.gaps_in_the_offsets, 'gaps in the offsets') + '</div>';
            h += callout('tip', 'The tombstones are **still in the log**. A reader that starts now still sees that s11 and s12 were deleted. They stay for `delete.retention.ms`.');
          } else {
            h += '<div class="strip">' + gone.keys.map(function (k) { var s = Number(k.slice(1)) - 1; return rec(k, 'k' + s); }).join('') + '</div>';
            h += '<div class="lab-out">' + big(gone.keys.length, 'keys left: ' + gone.keys[0] + ' to ' + gone.keys[gone.keys.length - 1], 'good') + big(gone.keys_that_were_deleted.join(' and '), 'deleted: no record at all', 'good') + big(gone.records, 'records in the log') + '</div>';
            h += callout('tip', 'After `delete.retention.ms` a later pass of the cleaner removed the **tombstones too**. Now there is nothing left of **' + gone.keys_that_were_deleted.join(' and ') + '**: a reader that starts from the beginning never learns that they existed. The cleaner only comes back when new data arrives, so the recording wrote a few more records to wake it.');
          }
          h += '<p class="lab-note">' + pill('recorded', 'real') + ' Both moments were read from the real log. The cleaner and its tombstone timer were set to run in seconds for the recording.</p>';
        }
        box.innerHTML = fixNotes(h + '</div>');
        A.bindWidget = function (act, el) {
          var v = el.getAttribute('data-v');
          if (act === 'co-p') { if (st.pick[v]) delete st.pick[v]; else st.pick[v] = true; }
          else if (act === 'co-run') st.ran = true;
          else if (act === 'co-reset') { st.pick = {}; st.ran = false; }
          else if (act === 'co-m') st.later = v === 'later';
          A.render(true);
        };
      }
    };
  })();
})();
