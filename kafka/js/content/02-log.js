/* Mission 2: the log on disk. A partition is a folder of files. Five records and then twelve thousand, read with kafka-dump-log: batches, segments, the sparse index, the time index,
   checkpoints. Everything comes from a real broker of Apache Kafka 4.4.0, with the tools of the distribution. */
(function () {
  var B = LAB.b, G = LAB.get;
  var FS = G.table('log.files_small'), FB = G.table('log.files_big'), LB = G.table('log.batches'), LK = G.table('log.lookups');
  var BS = G.counts('log.batch_small'), OV = G.counts('log.overhead'), RL = G.counts('log.roll'), IX = G.counts('log.index'), TX = G.counts('log.timeindex'), OT = G.counts('log.offsets_by_time'), DR = G.counts('log.dirs');
  var DUMP = G.text('log.dump_small'), EPOCH = G.text('log.leader_epoch'), PM = G.text('log.partition_metadata'), HW = G.text('log.checkpoint_hw'), GO = G.text('log.get_offsets_command');
  var PY = G.file('code/world.py');
  var WRITE = G.lines(PY, G.at(PY, /kx\.create_topic\(c\.bootstrap, 'orders-big'/), G.at(PY, /kx\.send\(p, 'orders-big', 12000\)/));
  var n0 = function (x) { return Number(x).toLocaleString('en-US'); };
  var mb = function (x) { return Math.round(x / 1048576 * 100) / 100 + ' MiB'; };
  G.expect(BS.batches === 1 && BS.records === 5 && BS.compresscodec === 'none', 'five records make one batch');
  G.expect(RL.would_not_fit === true && RL.first_segment_bytes < RL.segment_limit_bytes, 'the log rolled because the next batch did not fit');
  G.expect(IX.first_batch_has_an_entry === false && IX.entries === IX.batches - 1, 'the first batch has no index entry');
  G.expect(OT.offset_at_event_6000s === 6000 && OT.earliest === 0 && OT.latest === 12000 && OT.offset_after_everything === null, 'offsets by time');
  var big = FB.rows.filter(function (r) { return /\.log$/.test(r[0]); });
  G.expect(big.length === 2, 'two segments after twelve thousand records');
  var idx = FB.rows.filter(function (r) { return /\.index$/.test(r[0]); });

  LAB.addChapter({
    id: 'm2', n: 2, title: 'The log on disk', short: 'Log', blurb: 'A partition is a folder of files: batches, segments, indexes and checkpoints', minutes: 45,
    focus: ['stg', 'snap', 'mon'],
    goals: [
      'Say what is **in the folder** of a partition, file by file.',
      'Read a **record batch**: its header, its offsets, its size and its checksum.',
      'Explain when a **segment** rolls, and why its name is an offset.',
      'Explain the **sparse index**, and how a fetch at an offset finds its bytes.',
      'Use **timestamps** to find an offset, and know what the time index is for.',
      'Say why Kafka is fast: **sequential writes, the page cache and batches**.'
    ],
    say: 'Mission 2 opens a partition. Most people use Kafka for years without looking at a file, and then the day comes when a disk is full, a broker starts slowly or an offset is gone, and the answer is in the folder. I wrote five records and then twelve thousand into one partition on a real broker, and read the files with the tool that ships with Kafka. Press Next.',
    scenes: [
      B.flow({
        id: 'm2-flow', t: 1, src: 'rec', title: 'One partition on one broker', g: 'log', legend: true,
        steps: [
          { say: 'This is a single partition on the broker that leads it. Press Next to follow a batch of records, and then two readers.', cap: 'One partition, one folder.' },
          { say: 'Step 1. The producer sends a **batch** of records. The broker appends the batch, as it came, to the end of the **active segment**, a file. It does not rewrite or reorder anything. Appending is the only way a log grows.', on: ['k1'], focus: ['l_p', 'l_act'], cap: 'Writes only append.' },
          { say: 'Step 2. When the active segment is full, the broker **rolls** it: the file is closed, and a new one starts. The name of a segment is the **offset of its first record**, so `00000000000000008700.log` begins at offset 8,700.', on: ['k2'], focus: ['l_act', 'l_old'], cap: 'A full segment is closed and a new one starts.' },
          { say: 'Step 3. Retention looks only at **closed** segments. It deletes a whole file at a time. The active segment is never deleted, whatever its age.', on: ['k3'], focus: ['l_old', 'l_ret'], cap: 'Deletion is by whole segment.' },
          { say: 'Step 4. Next to each segment sit **index files**. They are small, and they say where in the file a given offset is, roughly. Without them a reader would scan the file from the start.', on: ['k4'], focus: ['l_idx', 'l_act'], cap: 'Indexes find a place in a file.' },
          { say: 'Step 5. Consumer A wants offset 5,000. The broker finds the segment by its name, uses the index to get close, and reads from there. It sends the bytes as they are on disk.', on: ['k5'], focus: ['l_act', 'l_c1'], cap: 'A fetch at an offset.' },
          { say: 'Step 6. Consumer B starts from offset 0 and reads old segments. Old data is read as easily as new data. The log is the same file for every reader.', on: ['k6'], focus: ['l_old', 'l_c2'], cap: 'Any reader, any offset.' }
        ]
      }),

      B.rows({
        id: 'm2-small', t: 1, src: 'rec', title: 'Five records, five files',
        steps: [
          {
            say: 'I created a topic with one partition on broker 1, and sent five orders. Then I listed the folder of the partition on that broker. Five small files. Press Next.',
            tabs: [{ layer: 'RECORDED', name: 'The folder orders-demo-0 on broker 1', c: 'raw', cols: FS.cols, rows: FS.rows, trk: 0 }],
            notes: ['Recorded. The `.log` file holds the records. The two index files are shown at their full, pre-allocated size. The two small files hold the leader epoch and the topic id.']
          },
          {
            say: 'The sizes tell a story. The `.log` is **' + BS.bytes + ' bytes** for five orders. That is the data. The index and the time index are about **ten mebibytes** each, though they hold almost nothing: Kafka allocates them at their maximum size for the active segment, and trims them when the segment is closed.',
            tabs: [{ layer: 'RECORDED', name: 'Why the index files look so big', c: 'raw', cols: ['File', 'What it holds', 'Size in this folder'],
              rows: FS.rows.map(function (r) { return [r[0], { '.log': 'the records, as batches', '.index': 'offset to position in the .log', '.timeindex': 'timestamp to offset', 'leader-epoch-checkpoint': 'which leader wrote from which offset', 'partition.metadata': 'the id of the topic' }[r[0].replace(/^0+/, '')] || 'see the next screens', n0(r[1]) + ' bytes']; }), trk: 1 }],
            notes: ['Recorded. After the segment rolls, the closed segment\'s indexes shrink to the size of what they hold, as the next screens show.']
          }
        ]
      }),

      B.term({
        id: 'm2-dump', t: 1, src: 'rec', title: 'Open the log with kafka-dump-log',
        say: 'This is the output of `kafka-dump-log.sh` on the `.log` file of those five records. Watch the lines. The first line is the **batch**, and the lines that follow are its **records**.',
        lines: G.plain(DUMP, { cmd: 'kafka-dump-log.sh --files orders-demo-0/00000000000000000000.log --print-data-log' }),
        after: 'One batch holds all five records: offsets 0 to 4, `count: ' + BS.records + '`, `size: ' + BS.bytes + '`, `magic: ' + BS.magic + '` and `compresscodec: ' + BS.compresscodec + '`. Each record line shows its offset, its time, the size of its key and value, and its payload.',
        afterKind: 'tip',
        doneSay: 'A partition is a sequence of batches, and a batch is a sequence of records.'
      }),

      B.talk({
        id: 'm2-batch', t: 1, src: 'docs', title: 'Read a batch line',
        say: 'The batch line has many fields. Press Next for the ones that matter.',
        items: [
          ['baseOffset and lastOffset', 'The first and last offset in the batch. Here 0 and 4. The next batch starts at 5.', 'The offsets that the batch covers.'],
          ['count and size', 'The number of records and the bytes of the whole batch, header included.', 'How big, how many.'],
          ['CreateTime', 'The time that the producer put on the batch, here the largest of its records. A topic can be set to stamp the time of the write instead.', 'A timestamp, by the producer or the broker.'],
          ['magic', 'The version of the record format. **2** is the one in use since Kafka 0.11, and it is the only one that Kafka 4 writes.', 'The record format version.'],
          ['compresscodec', 'None, gzip, snappy, lz4 or zstd. The broker stores a batch as the producer sent it.', 'How the records inside are compressed.'],
          ['producerId, producerEpoch, baseSequence', 'Set by an **idempotent** or transactional producer: an id, a version and a sequence number, so that the broker can drop a duplicate. Here **' + BS.producerId + '**: this producer was not idempotent. Mission 4 and mission 7 use them.', 'Used to drop duplicates and to fence old producers.'],
          ['isTransactional and isControl', 'Whether the batch belongs to a transaction, and whether it is a marker (commit or abort) and not data. Mission 7 shows a control batch.', 'Flags for transactions.'],
          ['crc', 'A checksum of the batch. The producer, the broker and the consumer all use the same bytes, so nothing is rewritten on the way.', 'The same bytes from producer to consumer.']
        ],
        cols: 1,
        call: { k: 'tip', h: 'The interview sentence:', t: 'Records are written to the log in batches, exactly as the producer sent them, and each batch carries its offsets, its timestamps, its checksum and, for idempotent producers, an id and a sequence.' }
      }),

      B.rows({
        id: 'm2-overhead', t: 2, src: 'rec', title: 'What a batch costs in bytes',
        steps: [
          {
            say: 'I wrote a single record in a batch of its own and measured it. The key and the value were **' + OV.key_and_value_bytes + ' bytes**. The batch was **' + OV.batch_bytes + ' bytes**. The difference is **' + OV.bytes_that_are_not_data + ' bytes** of overhead.',
            tabs: [{ layer: 'RECORDED', name: 'One record in one batch', c: 'raw', cols: ['Part', 'Bytes'],
              rows: [['The key and the value', OV.key_and_value_bytes], ['The batch header (fixed)', OV.batch_header_bytes], ['Per-record fields: length, attributes, time and offset deltas, sizes, headers', OV.record_overhead_bytes], ['The whole batch', OV.batch_bytes]], trk: 0 }],
            notes: ['Recorded with kafka-dump-log. The 61 bytes of header are described in the documentation of the record batch format. They are the reason that tiny batches waste space: mission 4 measures it.']
          }
        ]
      }),

      B.code({
        id: 'm2-write', t: 1, src: 'rec', title: 'Write twelve thousand records', file: 'world.py', lang: 'python', code: WRITE,
        steps: [
          { say: 'To make the log roll I wrote twelve thousand orders into one partition. This is the code. Press Next.', lines: null },
          { say: 'The topic has **one partition on broker 1**, so that all the files are in one folder on one machine. `retention.ms=-1` stops retention from touching it, because my orders have timestamps from January: mission 8 shows why that matters. `segment.bytes=1048576` is the smallest segment size that Kafka 4 allows, one mebibyte.', lines: G.span(WRITE, /create_topic/) },
          { say: 'The producer sends twelve thousand orders. The key of each is the store. They are sent in batches of a hundred, so that every run makes the same batches.', lines: G.span(WRITE, /producer\(/, /send\(/) }
        ],
        note: 'Recorded: this code ran against a real broker. The minimum for segment.bytes is 1 MiB in this release, and the default is 1 GiB.'
      }),

      B.rows({
        id: 'm2-roll', t: 1, src: 'rec', title: 'The log rolls',
        steps: [
          {
            say: 'After twelve thousand records the folder looks different. There are **two segments**. The second one starts at offset **' + n0(RL.second_segment_first_offset) + '**, and its name says so. Press Next.',
            tabs: [{ layer: 'RECORDED', name: 'The folder orders-big-0 after 12,000 records', c: 'raw', cols: FB.cols, rows: FB.rows, trk: 0 }],
            notes: ['Recorded. Only the .log, .index and .timeindex files are shown. The offsets in the names are the first offset of each segment.']
          },
          {
            say: 'Why did it roll at **' + n0(RL.first_segment_bytes) + ' bytes** and not at 1,048,576? Because Kafka does not split a batch. The next batch was **' + n0(RL.next_batch_bytes) + ' bytes**, and ' + n0(RL.first_segment_bytes) + ' plus ' + n0(RL.next_batch_bytes) + ' is more than the limit. So the batch went into a new segment.',
            tabs: [{ layer: 'RECORDED', name: 'The arithmetic of the roll', c: 'raw', cols: ['Measure', 'Value'],
              rows: [['segment.bytes', n0(RL.segment_limit_bytes)], ['Bytes in the first segment', n0(RL.first_segment_bytes)], ['Batches in it', n0(RL.batches_in_first_segment)], ['Size of the batch that came next', n0(RL.next_batch_bytes)], ['Would it have fit?', RL.would_not_fit ? 'no' : 'yes']], trk: 1 }],
            notes: ['Recorded: the sizes of the batches were read with kafka-dump-log.']
          },
          {
            say: 'Look at the index files. The closed segment\'s index is only **' + n0(RL.index_bytes_closed) + ' bytes**: it was trimmed when the segment closed. The active segment\'s index is **' + n0(RL.index_bytes_active) + ' bytes**: ten mebibytes, pre-allocated. This is why a folder can look much bigger than the data that it holds.',
            tabs: [{ layer: 'RECORDED', name: 'Closed and active index files', c: 'raw', cols: ['File', 'Bytes'],
              rows: [['Closed segment: .index', n0(RL.index_bytes_closed)], ['Closed segment: .timeindex', n0(RL.timeindex_bytes_closed)], ['Active segment: .index', n0(RL.index_bytes_active)], ['Active segment: .timeindex', n0(RL.timeindex_bytes_active)]], trk: 2 }],
            notes: ['Recorded. `kafka-log-dirs.sh` reports **' + n0(DR.partition_bytes) + ' bytes** for this partition: the size of the log files, not of the pre-allocated indexes.']
          }
        ]
      }),

      B.rows({
        id: 'm2-batches', t: 2, src: 'rec', title: 'The batches, and where they start',
        steps: [
          {
            say: 'These are the first batches of the big segment. Each one holds a hundred records, because the producer was set to batches of a hundred. The **position** is where the batch starts in the file. It grows by the size of the previous batch.',
            tabs: [{ layer: 'RECORDED', name: 'The first batches of segment 0', c: 'raw', cols: LB.cols, rows: LB.rows, trk: 0 }],
            notes: ['Recorded with kafka-dump-log. Position and size are in bytes.']
          }
        ]
      }),

      B.rows({
        id: 'm2-index', t: 1, src: 'rec', title: 'The sparse index',
        steps: [
          {
            say: 'A broker must find offset 5,000 without reading five thousand records. The **offset index** helps. It does not list every record: it lists about one entry for every **4 KiB** of log. Each entry is eight bytes: an offset and a position in the file. Here are the first entries of the closed segment.',
            tabs: [{ layer: 'RECORDED', name: 'The first entries of the .index file', c: 'raw', cols: ['Offset', 'Position in the .log file'], rows: IX.first_entries, trk: 0 }],
            notes: ['Recorded. The index has ' + IX.entries + ' entries for ' + IX.batches + ' batches, ' + IX.bytes_per_entry + ' bytes each. The index interval is ' + n0(IX.index_interval_bytes) + ' bytes.']
          },
          {
            say: 'Notice that there is **no entry for the first batch**. An entry is added when more than 4 KiB have been written since the last entry, so the first batch never gets one. The broker then starts from the beginning of the file for offsets before the first entry. Then each batch here is over 4 KiB, so almost every batch has an entry.',
            tabs: [{ layer: 'RECORDED', name: 'Three lookups', c: 'raw', cols: LK.cols, rows: LK.rows, trk: 1 }],
            notes: ['Recorded: for each offset I found the last index entry at or below it, and counted the batches that the broker reads from that position until the offset is inside one.']
          }
        ]
      }),

      B.widget({ id: 'm2-lab', kind: 'offsetlab', t: 1, src: 'rec', title: 'Lab: find an offset in the log' }),

      B.rows({
        id: 'm2-time', t: 1, src: 'rec', title: 'Offsets and times',
        steps: [
          {
            say: 'A consumer often asks "where was I at noon?" rather than "which offset?". The **time index** answers: it maps a timestamp to an offset, with the same sparse rule. `kafka-get-offsets.sh` asks the broker. The records of this topic are one second apart, starting at ' + OT.first_event_time_ms + ' milliseconds.',
            tabs: [{ layer: 'RECORDED', name: 'kafka-get-offsets.sh on orders-big', c: 'raw', cols: ['Question', 'Answer'],
              rows: [['The earliest offset (--time -2)', OT.earliest], ['The next offset to be written (--time -1)', OT.latest], ['The first record at or after event 6,000 (a time)', OT.offset_at_event_6000s], ['A time before every record', OT.offset_before_everything], ['A time after every record', 'nothing: the tool prints no line']], trk: 0 }],
            notes: ['Recorded. The time index of the closed segment has ' + TX.entries + ' entries of ' + TX.bytes_per_entry + ' bytes: a timestamp and an offset.']
          }
        ]
      }),

      B.term({
        id: 'm2-getoffsets', t: 1, src: 'rec', title: 'Ask for the next offset',
        say: 'This is the command, and its answer. The format is `topic:partition:offset`.',
        lines: G.plain(GO.split('\n').slice(1).join('\n'), { cmd: GO.split('\n')[0] }),
        after: 'The next offset is **' + n0(OT.latest) + '**, one more than the last record. A consumer that has read everything has an offset equal to this number. The difference between this number and the consumer\'s offset is its **lag**.',
        afterKind: 'tip',
        doneSay: 'The next offset is the end of the log. Lag is the distance from it.'
      }),

      B.rows({
        id: 'm2-small-files', t: 2, src: 'rec', title: 'The small files: epoch, topic id and checkpoints',
        steps: [
          {
            say: 'Three more files matter when something goes wrong. `leader-epoch-checkpoint` lists the **leader epochs** and the offset where each began. `partition.metadata` holds the id of the topic. And in the data folder, `replication-offset-checkpoint` holds the **high watermark** of every partition.',
            tabs: [
              { layer: 'RECORDED', name: 'leader-epoch-checkpoint', c: 'raw', cols: ['Line'], rows: EPOCH.split('\n').map(function (l) { return [l]; }), trk: 0 },
              { layer: 'RECORDED', name: 'partition.metadata', c: 'raw', cols: ['Line'], rows: PM.split('\n').map(function (l) { return [l]; }), trk: 0 },
              { layer: 'RECORDED', name: 'replication-offset-checkpoint (our topic only)', c: 'raw', cols: ['Line'], rows: HW.split('\n').map(function (l) { return [l]; }), trk: 0 }
            ],
            notes: ['Recorded. The leader epoch file says: version 0, one entry, epoch 0 began at offset 0. After a failover it gains a line. Mission 5 shows one. The checkpoint says that the high watermark of orders-demo is 5: all five records are replicated and readable.']
          }
        ]
      }),

      B.cmp({
        id: 'm2-three', t: 1, src: 'docs', title: 'Offset, position and timestamp',
        say: 'Three numbers describe where a record is. They are easy to confuse. Press Next to compare them.',
        cols: ['Number', 'What it is', 'Who uses it', 'Where it lives'],
        hl: 1,
        rows: [
          ['Offset', 'The record\'s number in its partition, counted in records', 'Consumers and producers', 'In every batch and record'],
          ['Position', 'The byte where a batch starts inside one segment file', 'The broker only', 'In the .index file'],
          ['Timestamp', 'The time of the record: set by the producer, or by the broker', 'Retention, the time index, stream processing', 'In every batch and record, and in the .timeindex file'],
          ['Leader epoch', 'The number of the leader that wrote it', 'Followers, to truncate correctly', 'In every batch, and in the leader-epoch-checkpoint']
        ],
        pick: 'An offset is a promise made to clients. A position is a private detail of a segment file. Never mix them in code or in an interview answer.'
      }),

      B.talk({
        id: 'm2-fast', t: 1, src: 'docs', title: 'Why Kafka is fast',
        say: 'Kafka reads and writes the disk all day, and still serves a lot of traffic. The documentation gives four reasons. Press Next.',
        items: [
          ['Sequential I/O', 'A log only appends and reads forward, which is the access pattern that disks, and the operating system\'s read-ahead, are best at. Kafka does not keep a cache of its own: it relies on the **page cache**.', 'Append and read forward.'],
          ['Batches', 'The protocol groups records into batches. A request carries many records, the broker appends them in one go, and a consumer fetches a large chunk at a time. The documentation calls the speed-up "orders of magnitude".', 'Few big operations, not many small ones.'],
          ['One format', 'The producer, the broker and the consumer share one binary format, so a chunk of the log moves without being rewritten.', 'No conversion on the way.'],
          ['Zero copy', 'The broker can send bytes from the page cache to the network with the `sendfile` call, with one copy instead of four. **When TLS is on, sendfile is not used**, because TLS runs in user space.', 'sendfile, unless TLS is on.']
        ],
        cols: 1,
        call: { k: 'warn', h: 'A detail worth saying:', t: 'On a cluster where consumers are mostly caught up, the documentation says that you may see no read activity on the disks at all: the reads are served from memory.' }
      }),

      B.talk({
        id: 'm2-ts', t: 2, src: 'docs', title: 'Which time is in the record',
        say: 'A record has one timestamp, and two meanings are possible. Press Next.',
        items: [
          ['CreateTime', 'The default. The producer sets it, normally to the time that the event happened. The broker keeps it. This is what my orders used: January 2026, months before I ran the experiment.', 'The time of the event, set by the client.'],
          ['LogAppendTime', 'A topic setting. The broker replaces the timestamp with the time that it wrote the record. Useful when you cannot trust clients\' clocks.', 'The time of the write, set by the broker.'],
          ['What depends on it', 'The **time index**, **retention by time**, and **time windows** in stream processing all use the record\'s timestamp. A producer with a wrong clock, or a backfill of old events, changes how long records live. Mission 8 shows old records being deleted at once.', 'A wrong timestamp has consequences.']
        ],
        cols: 1
      }),

      B.quiz({
        id: 'm2-q1', t: 1,
        q: 'What is the name of a segment file, and why?',
        opts: [
          { t: 'The time when it was created, so that retention can sort them', fb: 'Retention uses the timestamps of the records, not the name.' },
          { t: 'The offset of its first record, so that a reader can pick the right file', fb: '' },
          { t: 'A random number, to avoid clashes', fb: 'The name is meaningful.' },
          { t: 'The number of records inside', fb: 'It is the first offset, not a count.' }
        ],
        ok: 1,
        why: 'The broker keeps the segments in order of their base offset. To read offset N it picks the segment with the largest base offset at or below N. No lookup table is needed: the name is the key.'
      }),

      B.quiz({
        id: 'm2-q2', t: 1,
        q: 'Why did the first segment of twelve thousand records stop at about ' + n0(RL.first_segment_bytes) + ' bytes and not at exactly 1 MiB?',
        opts: [
          { t: 'The broker rounds down to a multiple of 4 KiB', fb: 'There is no such rounding.' },
          { t: 'A batch is never split, so a segment closes when the next batch does not fit', fb: '' },
          { t: 'The index file was full', fb: 'The index was far from full.' },
          { t: 'Retention closed it', fb: 'Retention was switched off for this topic.' }
        ],
        ok: 1,
        why: 'The next batch of ' + n0(RL.next_batch_bytes) + ' bytes would have taken the file over ' + n0(RL.segment_limit_bytes) + ' bytes, so the broker rolled the segment and put the batch in the new one. Segments are slightly smaller than segment.bytes, never larger.'
      }),

      B.quiz({
        id: 'm2-q3', t: 1,
        q: 'The offset index has no entry for the very first batch of a segment. What does the broker do for a fetch at offset 10?',
        opts: [
          { t: 'It fails with an error', fb: 'The offset exists.' },
          { t: 'It reads the segment from its start until the offset is inside a batch', fb: '' },
          { t: 'It asks the controller', fb: 'The controller is not involved in a fetch.' },
          { t: 'It reads the time index', fb: 'The time index is for time lookups.' }
        ],
        ok: 1,
        why: 'With no index entry at or below the offset, the lookup begins at position 0 of the segment, and the broker scans forward batch by batch. The index is only a shortcut.'
      }),

      B.quiz({
        id: 'm2-q4', t: 1,
        q: 'A topic\'s folder takes 20 MiB on disk and holds 5 records. Why?',
        opts: [
          { t: 'The records are compressed', fb: 'Compression makes files smaller.' },
          { t: 'The index and time index of the active segment are pre-allocated at 10 MiB each', fb: '' },
          { t: 'Kafka keeps a copy of each record in a cache file', fb: 'There is no cache file.' },
          { t: 'The broker has not flushed the log', fb: 'Flushing does not change the size.' }
        ],
        ok: 1,
        why: 'The active segment\'s two index files are created at their maximum size, ten mebibytes each. They shrink when the segment closes. kafka-log-dirs counts only the log files.'
      }),

      B.bug({
        id: 'm2-bug', t: 1, q: 'This command is meant to read all the records of one partition from offset 0 and print their offsets. Click the line that makes it start in the wrong place.',
        file: 'read.sh', lang: 'bash',
        code: ['# read partition 0 of orders from the beginning', 'bin/kafka-console-consumer.sh --bootstrap-server localhost:9092 \\', '  --topic orders --partition 0 \\', '  --property print.offset=true'].join('\n'),
        bad: [3],
        hint: 'Where does a console consumer start when it has no committed offset and no instruction?',
        why: 'Without `--from-beginning` or `--offset`, a console consumer starts at the **end** of the log and shows only new records. Add `--from-beginning`, or `--offset 0`: `--offset` needs the `--partition` that is already there.',
        fix: ['# read partition 0 of orders from the beginning', 'bin/kafka-console-consumer.sh --bootstrap-server localhost:9092 \\', '  --topic orders --partition 0 --offset 0 \\', '  --property print.offset=true'].join('\n'),
        cheer: 'Say where to start. The default is the end.'
      }),

      B.order({
        id: 'm2-ord', t: 1, q: 'Put what the broker does for a fetch at offset 5,000 in order.',
        items: [
          'Pick the segment with the largest base offset at or below 5,000',
          'Look in that segment\'s offset index for the last entry at or below 5,000',
          'Start reading the log file at the position of that entry',
          'Skip batches until one contains offset 5,000',
          'Send the bytes of the batches to the consumer, as they are on disk'
        ],
        why: 'The name of the segment is the first lookup, the sparse index is the second, and a short scan finishes the job. Nothing is rewritten before it is sent.'
      }),

      B.decide({
        id: 'm2-dec', t: 2, src: 'docs', title: 'Decision: how big should a segment be',
        scenario: 'A topic gets 20 GB a day in each of its partitions, and keeps seven days. The default segment size is 1 GiB. A colleague suggests 100 MiB segments, "so that deletion is finer". Another suggests 10 GiB, "so that there are fewer files". You choose.',
        opts: [
          { t: '100 MiB: about 200 segments a day in each partition', d: 'Deletion is fine-grained.', lose: 'That is 1,400 segments per partition, each with three files. Brokers keep many files open, and rolling and recovery get slower.' },
          { t: 'Keep 1 GiB: about 20 segments a day, 140 in all', d: 'A good middle.', lose: '' },
          { t: '10 GiB: two segments a day', d: 'Very few files.', lose: 'Retention can delete only a whole closed segment, so data stays up to a segment longer than you asked, and a 10 GiB segment is slow to recover after a crash.' }
        ],
        pick: 1,
        why: 'The default of 1 GiB is a good balance: tens of files a day, and deletion granularity of about an hour of data. Change it only with a reason, and know that retention works in whole segments.',
        when: 'A topic with very little traffic never fills a segment, so time-based rolling (segment.ms) decides when its data can be deleted. Say that you would look at the rate first.'
      }),

      B.incident({
        id: 'm2-inc', t: 2, src: 'docs', title: 'Incident: a broker takes forty minutes to start', time: '04:35',
        alert: '**Broker 3 crashed at 03:50 and has been starting for forty minutes.** The log of the broker shows lines about loading partitions and recovering segments. Producers are working with the other two brokers.',
        clues: ['The broker was killed with SIGKILL, not stopped cleanly', 'It holds about 1,500 partition replicas', '`num.recovery.threads.per.data.dir` is 1'],
        opts: [
          { t: 'Wait, and then raise the recovery threads and stop brokers cleanly in future', fb: '' },
          { t: 'Delete the data folder and let it copy everything again', fb: 'You would throw away data and cause a huge copy for no reason.' },
          { t: 'Restart it again to see if it is faster', fb: 'A second kill restarts the recovery from the beginning.' },
          { t: 'Format the node again', fb: 'Formatting a node that holds data is wrong, and it will not start the broker faster.' }
        ],
        best: 0,
        why: 'After an unclean shutdown the broker cannot trust its indexes, so it scans the segments that were not closed cleanly and rebuilds them. A clean shutdown writes a marker file and skips this. The recovery uses a thread pool per data folder, and one thread is slow for many partitions.',
        checks: [
          ['Read the broker log', 'Look for lines about recovering log segments and how far it has got.'],
          ['Check the number of recovery threads', '`num.recovery.threads.per.data.dir` sets the pool.'],
          ['Check how it was stopped', 'A kill is the usual cause of a long start.']
        ],
        tell: 'The broker was killed, so on start it has to recover the logs of 1,500 partitions with one thread. We waited for it to finish, and we will raise the recovery threads and make sure that brokers are stopped cleanly.',
        prevent: ['Stop brokers with a normal shutdown so that they can hand over leadership', 'Set num.recovery.threads.per.data.dir higher on brokers with many partitions', 'Do not put more partitions on a broker than it can recover in your time limit']
      }),

      B.qa({
        id: 'qa-disk', t: 1, tag: 'Kafka basics', secs: 75,
        q: 'How does Kafka store data on disk?',
        pts: ['A partition is a folder', 'Segments: log files named by their first offset', 'Records are written in batches, as they came', 'Index files: offset and time', 'Retention deletes whole closed segments'],
        short: 'Each partition is a folder on the broker. Inside are **segment files**, named by the offset of their first record. Records are appended in **batches**, exactly as the producer sent them, to the active segment. When it reaches `segment.bytes`, or gets old enough, it is closed and a new one starts. Each segment has an offset index and a time index: both are **sparse**, with about one entry for every 4 KiB of log. To read an offset the broker picks the segment by name, uses the index to get near, and scans a few batches. Retention deletes whole closed segments, never part of one, and never the active segment.',
        fu: [['Why is the index sparse?', 'To stay small enough to keep in memory. A scan of a few kilobytes after the index entry is cheap.'], ['What is the active segment?', 'The newest one, the file being written. It is never deleted or compacted.']],
        trap: 'Saying that Kafka stores each record in its own file, or that it rewrites old files.',
        real: 'A disk is 90 percent full. Where do you look?'
      }),

      B.qa({
        id: 'qa-fast', t: 1, tag: 'Kafka basics', secs: 75,
        q: 'Why is Kafka fast?',
        pts: ['Sequential appends and reads', 'The page cache', 'Batches', 'One binary format, zero copy with sendfile', 'Compression of whole batches'],
        short: 'The log is **append-only**, so the disk is written and read sequentially, which is the fastest way to use it. Kafka leans on the operating system\'s **page cache** and does not run a cache of its own. Records are grouped into **batches**, so the network and the disk see few large operations instead of many small ones. The producer, broker and consumer share **one binary format**, so the broker can send bytes from the page cache to the network with **sendfile**, without copying them through user space, as long as TLS is off. And compression works on whole batches, which compresses better than single records. A consumer that is keeping up is often served entirely from memory.',
        fu: [['What changes with TLS?', 'sendfile cannot be used, because TLS runs in user space, so the broker copies the data and uses more CPU.'], ['What makes it slow?', 'Many tiny batches, a lot of consumers reading old data that is not in the page cache, and too many partitions per broker.']],
        trap: 'Saying that Kafka keeps messages in memory. It writes to disk and uses the page cache.',
        real: 'We turned on TLS and the brokers use more CPU. Why?'
      }),

      B.qa({
        id: 'qa-offsetfind', t: 2, tag: 'Kafka basics', secs: 75,
        q: 'How does a broker find a record by offset, or by time?',
        pts: ['The segment name is the base offset', 'The sparse offset index gives a position', 'A short scan finishes', 'The time index maps a time to an offset', 'Timestamps are CreateTime or LogAppendTime'],
        short: 'By offset, the broker picks the segment whose **base offset** is the largest one at or below the target. Then it looks in that segment\'s **sparse offset index** for the last entry at or below the target, which gives a byte position, and scans forward from there, batch by batch, until the offset is inside a batch. By time, it uses the **time index**, which maps timestamps to offsets with the same sparse rule: it finds the first offset whose timestamp is at or after the time asked. That is what a tool or a client calls when it asks for the offset at a time. The timestamp is the one in the record, set by the producer or, for a topic using LogAppendTime, by the broker.',
        fu: [['What if the time is after the last record?', 'There is no answer: the tool prints nothing, and a client usually seeks to the end.'], ['What if timestamps are out of order?', 'The time index uses the largest timestamp so far, so out-of-order records can make the lookup return a later offset than you expect.']],
        trap: 'Saying that the broker scans the whole log, or that the index lists every record.',
        real: 'We need to replay from midnight. How?'
      }),

      B.recap({
        id: 'm2-recap', n: 2, badge: 'Topic Builder', color: '#BBF7D0',
        pts: [
          'A partition is a **folder of segment files**. A segment is named by the **offset of its first record**.',
          'Records are written in **batches**, as the producer sent them, with a header of 61 bytes. A batch is never split.',
          'A segment **rolls** when the next batch would not fit, or when it gets old. Retention deletes **whole closed segments**.',
          'The **offset index** and the **time index** are sparse: one entry for about every 4 KiB. They are pre-allocated for the active segment and trimmed on close.',
          'The offset is a promise to clients. The position is the broker\'s private detail. The timestamp feeds retention and time lookups.',
          'Kafka is fast because of **sequential I/O, the page cache, batches, one format and sendfile**.'
        ]
      })
    ]
  });
})();
