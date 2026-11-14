/* Mission 9: Kafka Connect. A distributed worker of Apache Kafka 4.4.0, the REST interface, converters, transforms, the offsets of a source connector, and a record that cannot be converted.
   The connectors are the FileStream source and sink that ship with Kafka: examples, not production connectors. The connectors that are separate projects (JDBC, S3, Elasticsearch) were not run. */
(function () {
  var B = LAB.b, G = LAB.get;
  var PL = G.table('connect.plugins'), WK = G.counts('connect.worker'), CV = G.table('connect.converters'), CR = G.counts('connect.created'), ST = G.counts('connect.status');
  var OF = G.counts('connect.offsets_after_20'), RR = G.counts('connect.restart_and_reset'), IT = G.table('connect.internal_topics'), OR = G.text('connect.offsets_record');
  var SP = G.text('connect.sink_plain'), SM = G.text('connect.sink_smt'), SC = G.counts('connect.sink_counts'), FT = G.counts('connect.failed_task'), DL = G.counts('connect.dead_letter'), AS = G.table('connect.all_status');
  var PY = G.file('code/connect.py');
  var CREATE = G.lines(PY, G.at(PY, /^    cfg = \{'connector\.class': CLS \+ 'SourceConnector', 'tasks\.max': '1', 'file': str\(src\), 'topic': 'orders-file'/), G.at(PY, /^    st = w\.wait_state\('src-orders'\)/));
  var SINK = G.lines(PY, G.at(PY, /^    sink = \{'connector\.class'/), G.at(PY, /^    w\.create\('sink-smt', smt\)/));
  var DLQ = G.lines(PY, G.at(PY, /^    w\.create\('sink-tolerant'/), G.at(PY, /'errors\.log\.enable': 'true'\}\)\)/));
  var n0 = function (x) { return Number(x).toLocaleString('en-US'); };
  G.expect(WK.status_code === 200 && PL.rows.some(function (r) { return /FileStreamSourceConnector/.test(r[0]); }) && PL.rows.some(function (r) { return /MirrorSourceConnector/.test(r[0]); }), 'the plugins of the worker');
  var conv = function (k) { var r = CV.rows.filter(function (x) { return x[0].indexOf(k) === 0; })[0]; G.expect(!!r, 'converter ' + k); return r; };
  G.expect(Number(conv('StringConverter')[1]) === 20 && Number(conv('JsonConverter, schemas.enable=true')[3]) > Number(conv('JsonConverter, schemas.enable=false')[3]) && Number(conv('JsonConverter, schemas.enable=false')[3]) > Number(conv('StringConverter')[3]), 'the same line, three sizes');
  G.expect(CR.status_code === 201 && ST.connector_state === 'RUNNING' && OF.position_equals_file_size === true, 'a source connector keeps the position of its file');
  G.expect(RR.records_after_a_restart === 25 && RR.records_after_delete_and_create_with_the_same_name === 25 && RR.records_after_the_offsets_were_reset === 50, 'offsets survive a restart and a delete, and a reset reads the file again');
  G.expect(FT.task_state === 'FAILED' && DL.records_in_the_dead_letter_topic === 1 && DL.lines_written === 10 && DL.task_state === 'RUNNING', 'a bad record fails a strict sink and goes to the dead letter topic of a tolerant one');
  G.expect(SC.lines_written_without_transforms === 50 && SC.lines_written_with_transforms === 50, 'both sinks wrote all fifty records');

  LAB.addChapter({
    id: 'm9', n: 9, title: 'Kafka Connect', short: 'Connect', blurb: 'Workers, connectors and tasks, converters, transforms, offsets, and a record that cannot be converted', minutes: 50,
    focus: ['ing', 'air', 'qual'],
    goals: [
      'Explain **workers, connectors and tasks**, and run a connector with the **REST interface**.',
      'Say what a **converter** is, and what the three recorded ones did to the same line.',
      'Explain where a source connector keeps its **offsets**, and what a restart, a delete and a reset do.',
      'Use **transforms** to change a record in flight.',
      'Handle **bad records**: fail, skip, or send to a **dead letter topic**.',
      'Say when to use Connect, and which connectors are **not** part of Apache Kafka.'
    ],
    say: 'Mission 9 is Kafka Connect. Most of what data engineers do with Kafka is move data in and out of other systems, and writing a consumer for each one is slow and easy to get wrong. Connect is the framework that does the repeating parts: the position, the retries, the parallelism, the formats. I ran a real Connect worker with the connectors that ship with Kafka, and I broke a record on purpose. Press Next.',
    scenes: [
      B.talk({
        id: 'm9-what', t: 1, src: 'docs', title: 'What Connect is',
        say: 'Connect is a runtime for connectors. Press Next for the five words that matter.',
        items: [
          ['Worker', 'A Java process that runs connectors. You run several for a cluster, and they share the work. The workers keep their state in **Kafka topics**, so the workers themselves have no disk to lose.', 'A process that runs connectors.'],
          ['Connector', 'A configuration and a class. A **source** connector reads from an outside system into topics. A **sink** connector writes from topics to an outside system. You create one with a JSON document and a REST call.', 'The job: copy this from there to here.'],
          ['Task', 'The part of a connector that does the work. A connector splits its work into tasks, up to `tasks.max`, and the workers run the tasks. A file source has one task. A database sink may have many.', 'The unit of parallelism.'],
          ['Converter', 'Turns the bytes in Kafka into data that a connector understands, and back: String, JSON, Avro, Protobuf. It is a setting of the worker or of the connector.', 'Bytes to data and back.'],
          ['Transform', 'A small step that changes a record on its way: add a field, drop a field, rename a topic, mask a value. Transforms are chained.', 'A tiny edit of each record.']
        ],
        cols: 1,
        call: { k: 'tip', h: 'The interview sentence:', t: 'Connect runs source and sink connectors as tasks on a cluster of workers, keeps its state in Kafka topics, and gives you converters, transforms, offsets and error handling for free.' }
      }),

      B.flow({
        id: 'm9-flow', t: 1, src: 'docs', title: 'Data through Connect', g: 'connect', legend: true,
        steps: [
          { say: 'A file is read into a topic, changed on the way, and written to another file. The same shape holds for a database and a warehouse. Press Next.', cap: 'In, through Kafka, and out.' },
          { say: 'Step 1. An **outside system** holds the data: here a file of order lines. A database, a queue or a storage bucket fits the same place.', on: ['k1'], focus: ['n_ext', 'n_srcc'], cap: 'An outside system.' },
          { say: 'Step 2. The **source connector** reads it, in one or more tasks, and turns each piece into a record. It decides the topic and the key.', on: ['k2'], focus: ['n_srcc', 'n_topic'], cap: 'The source connector writes records.' },
          { say: 'Step 3. The records are in a **Kafka topic**, which any other reader can use too. Connect does not own them.', on: ['k3'], focus: ['n_topic', 'n_snkc'], cap: 'Records are in a topic.' },
          { say: 'Step 4. The **sink connector** reads the topic, as a consumer group, and writes to the target system.', on: ['k4'], focus: ['n_snkc', 'n_tgt'], cap: 'The sink connector writes out.' },
          { say: 'Step 5. A record that **cannot be converted or written** can go to a **dead letter topic** instead of stopping the task.', on: ['k5'], focus: ['n_snkc', 'n_dlq'], cap: 'Bad records can be set aside.' },
          { say: 'Step 6. The connector keeps its **position**, its settings and its status in **internal topics**: `connect-offsets`, `connect-configs` and `connect-status`.', on: ['k6'], focus: ['n_srcc', 'n_int'], cap: 'The state lives in Kafka.' },
          { say: 'Step 7. **Transforms** sit in the chain and change each record: add, drop, rename, mask.', on: ['k7'], focus: ['n_smt', 'n_srcc'], cap: 'Transforms edit records in flight.' }
        ]
      }),

      B.rows({
        id: 'm9-plugins', t: 1, src: 'rec', title: 'A worker, and what it can run',
        steps: [
          {
            say: 'I started a Connect worker in **distributed** mode, with three internal topics of its own. Its REST interface answers on port ' + WK.rest_port + '. The first call asks for the **plugins** that it found: the classes that it can run as connectors.',
            tabs: [{ layer: 'RECORDED', name: 'GET /connector-plugins', c: 'raw', cols: PL.cols, rows: PL.rows }],
            notes: ['Recorded: Connect of Apache Kafka ' + WK.version + '. The two FileStream connectors were put on the plugin path by hand: the documentation says they are not on it by default. They are examples. The three Mirror connectors copy topics between clusters.']
          },
          {
            say: 'Notice what is **not** in the list. There is no JDBC connector, no S3 connector, no Elasticsearch connector and no Debezium. They are separate projects. You put their jars in a folder on the **plugin path**, and the worker finds them. Mission 10 does that for Debezium.',
            tabs: [{ layer: 'RECORDED', name: 'What is in the Apache Kafka download, and what is not', c: 'raw', cols: ['Connector', 'In the download?'],
              rows: [['FileStream source and sink', 'Yes, as examples. Add the jar to the plugin path'], ['MirrorMaker 2 (three connectors)', 'Yes'], ['JDBC source and sink', 'No: a separate project'], ['S3, GCS, Azure Blob sinks', 'No: separate projects'], ['Debezium (change data capture)', 'No: a separate project, mission 10']], trk: 2 }],
            notes: ['The first two rows are the recording above. The others are from documentation.']
          }
        ]
      }),

      B.code({
        id: 'm9-create', t: 1, src: 'rec', title: 'Create a source connector with one REST call', file: 'connect.py', lang: 'python', code: CREATE,
        steps: [
          { say: 'A connector is a name and a configuration. This is the whole of it. Press Next.', lines: null },
          { say: '`connector.class` says which connector. `tasks.max` is how many tasks may run. `file` is the file to read and `topic` the topic to write. The value converter is `StringConverter`: each line stays as the text that it is.', lines: G.span(CREATE, /cfg = /) },
          { say: '`w.create` sends the configuration to the worker with `POST /connectors`. The worker stores it in the `connect-configs` topic, and starts the connector and its task.', lines: G.span(CREATE, /w\.create/) },
          { say: 'Then the code waits for the connector and every task to report **RUNNING**, which it reads from `GET /connectors/{name}/status`.', lines: G.span(CREATE, /st = w\.wait_state/) }
        ],
        note: 'Recorded: this ran against a real Connect worker. The configuration of the other connectors in this mission only changes these settings.'
      }),

      B.rows({
        id: 'm9-status', t: 1, src: 'rec', title: 'The connector is running',
        steps: [
          {
            say: 'The worker answered **' + CR.status_code + ' Created**, and echoed the connector: name **' + CR.name + '**, type **' + CR.type + '**, and the settings that I gave it, plus the name. Then the status.',
            tabs: [{ layer: 'RECORDED', name: 'The reply to POST /connectors, and the status', c: 'raw', cols: ['What', 'Value'],
              rows: [['Status code', CR.status_code], ['Name', CR.name], ['Type', CR.type], ['Settings echoed', CR.config_keys.join(', ')], ['Connector state', ST.connector_state], ['Tasks', ST.tasks.map(function (t) { return 'task ' + t.id + ': ' + t.state; }).join(', ')]], trk: 0 }],
            notes: ['Recorded. The status has one state for the connector and one for each task. A connector can be RUNNING while its task is FAILED: look at both.']
          }
        ]
      }),

      B.rows({
        id: 'm9-conv', t: 1, src: 'rec', title: 'The same line in three formats',
        steps: [
          {
            say: 'I read the same file of twenty order lines three times, each with a different **value converter**. The first value in each topic is the same order. The bytes are not.',
            tabs: [{ layer: 'RECORDED', name: 'The first record of each topic, as Kafka stores it', c: 'raw', cols: CV.cols, rows: CV.rows }],
            notes: ['Recorded: the converters are StringConverter and JsonConverter, with and without schemas. The first column of the value is shortened to 150 characters.']
          },
          {
            say: 'The **StringConverter** stores the line exactly as it was: **' + conv('StringConverter')[3] + ' bytes**. The **JsonConverter** with schemas off stores the line as a **JSON string**: it is wrapped in quotes and every quote inside is escaped, **' + conv('JsonConverter, schemas.enable=false')[3] + ' bytes**. With schemas **on**, each record gets an **envelope**: the schema, `{"type":"string"}` here, and the payload, **' + conv('JsonConverter, schemas.enable=true')[3] + ' bytes**. A schema repeated in every record is a lot of bytes: this is why teams move to Avro and a registry.',
            tabs: [{ layer: 'RECORDED', name: 'What a converter does to the bytes', c: 'raw', cols: ['Converter', 'Bytes of the first value', 'What it did'],
              rows: [['StringConverter', conv('StringConverter')[3], 'nothing: the line is the value'], ['JsonConverter, schemas.enable=false', conv('JsonConverter, schemas.enable=false')[3], 'wrapped the line as a JSON string'], ['JsonConverter, schemas.enable=true', conv('JsonConverter, schemas.enable=true')[3], 'added a schema envelope']] }],
            notes: ['Recorded. The source gave a **string** value, so the JSON converters wrote a JSON string. To get a JSON object, the source connector has to produce structured data, which this example connector does not.']
          }
        ]
      }),

      B.widget({ id: 'm9-lab', kind: 'connectlab', t: 1, src: 'rec', title: 'Lab: build a pipeline' }),

      B.rows({
        id: 'm9-offsets', t: 1, src: 'rec', title: 'Where a source connector keeps its place',
        steps: [
          {
            say: 'A source connector must know how far it has read. For a file, that is a **position in bytes**. Connect stores it in the `connect-offsets` topic, and the REST interface can show it: `GET /connectors/src-orders/offsets`. After twenty lines the position was **' + n0(OF.offsets[0].offset.position) + '**, which is exactly the **size of the file**: ' + n0(OF.file_bytes) + ' bytes.',
            tabs: [{ layer: 'RECORDED', name: 'GET /connectors/src-orders/offsets', c: 'raw', cols: ['What', 'Value'], rows: [['Source partition', 'the file name'], ['Source offset', JSON.stringify(OF.offsets[0].offset)], ['Size of the file in bytes', OF.file_bytes], ['Position equals the size', OF.position_equals_file_size ? 'yes' : 'no']], trk: 1 }],
            notes: ['Recorded. The same record is in the topic `connect-offsets`; the next screen shows it.']
          },
          {
            say: 'This is the record in the topic. The **key** is the connector name and the source partition, the file. The **value** is the position. Because the key is the connector\'s **name**, the position belongs to the **name**.',
            tabs: [{ layer: 'RECORDED', name: 'The last record of connect-offsets', c: 'raw', cols: ['Line'], rows: OR.split('\n').map(function (l) { return [l]; }), trk: 0 }],
            notes: ['Recorded. The folder is replaced by a marker.']
          },
          {
            say: 'Now I did four things to the connector and counted the records in the topic each time. Five more lines were added to the file: the topic had **' + RR.records_after_5_more_lines + '**, and only the new lines were read. A **restart**: still **' + RR.records_after_a_restart + '**. I **deleted the connector and created it again with the same name**: still **' + RR.records_after_delete_and_create_with_the_same_name + '**: the position was kept. Then I **reset the offsets**, which needs the connector to be stopped: the file was read from the start, and the topic had **' + RR.records_after_the_offsets_were_reset + '**, every line twice.',
            tabs: [{ layer: 'RECORDED', name: 'Records in the topic after each step', c: 'raw', cols: ['Step', 'Records in the topic'],
              rows: [['The first 20 lines', RR.records_after_20_lines], ['5 more lines added to the file', RR.records_after_5_more_lines], ['The connector was restarted', RR.records_after_a_restart], ['Deleted and created again, same name', RR.records_after_delete_and_create_with_the_same_name], ['The offsets were reset (DELETE /offsets)', RR.records_after_the_offsets_were_reset]], trk: 4 }],
            notes: ['Recorded. The reset answered: ' + RR.reset_message + '. A new **name** would also have started from the beginning, because the key of the position includes the name.']
          },
          {
            say: 'The three internal topics are ordinary topics, with copies, and **compacted**: only the latest value of each key matters.',
            tabs: [{ layer: 'RECORDED', name: 'The internal topics of the worker', c: 'raw', cols: IT.cols, rows: IT.rows }],
            notes: ['Recorded. A production worker needs replication factor 3 on all three, which the recording set by hand.']
          }
        ]
      }),

      B.code({
        id: 'm9-sink-code', t: 2, src: 'rec', title: 'A sink with three transforms', file: 'connect.py', lang: 'python', code: SINK,
        steps: [
          { say: 'A sink connector that reads the topic and writes lines to a file, with three transforms in a chain. Press Next.', lines: null },
          { say: 'The sink reads `orders-file` and parses each value as JSON, with the JSON converter and no schema. The order of the fields in the output is whatever the parsed map gives.', lines: G.span(SINK, /sink = /, /schemas\.enable/) },
          { say: '`ReplaceField$Value` with `exclude` **drops** two fields: the customer and the channel.', lines: G.span(SINK, /transforms\.drop\.type/, /transforms\.drop\.exclude/) },
          { say: '`InsertField$Value` **adds** a field with a fixed value: `source=pos`.', lines: G.span(SINK, /transforms\.tag\.type/, /transforms\.tag\.static\.value/) },
          { say: '`MaskField$Value` **blanks** a field: the status. The three transforms run in the order of `transforms=drop,tag,mask`.', lines: G.span(SINK, /transforms\.mask\.type/, /transforms\.mask\.fields/) }
        ],
        note: 'Recorded: the transforms are part of Apache Kafka. A sink with no transforms ran next to this one, on the same fifty records.'
      }),

      B.rows({
        id: 'm9-smt', t: 2, src: 'rec', title: 'What the transforms did',
        steps: [
          {
            say: 'Two sinks read the same fifty records. The first has no transforms. Its first lines are the orders as they are, printed as a map. Press Next.',
            tabs: [{ layer: 'RECORDED', name: 'The sink with no transforms: two lines', c: 'raw', cols: ['Line'], rows: SP.split('\n').map(function (l) { return [l]; }) }],
            notes: ['Recorded. ' + SC.lines_written_without_transforms + ' lines were written.']
          },
          {
            say: 'The second has three transforms. Two fields are **gone** (`customer_id`, `channel`), one **new** field was added (`source=pos`), and the **status is blank**. Each order was changed on the way, and Kafka still holds the original.',
            tabs: [{ layer: 'RECORDED', name: 'The sink with three transforms: two lines', c: 'raw', cols: ['Line'], rows: SM.split('\n').map(function (l) { return [l]; }), trk: 1 }],
            notes: ['Recorded. ' + SC.lines_written_with_transforms + ' lines were written. The transforms: ' + SC.transforms.join('; ') + '.']
          }
        ]
      }),

      B.code({
        id: 'm9-dlq-code', t: 2, src: 'rec', title: 'Set bad records aside', file: 'connect.py', lang: 'python', code: DLQ,
        steps: [
          { say: 'Two sinks read the same topic, which has ten JSON lines and one line that is not JSON. The second is configured to survive it. Press Next.', lines: null },
          { say: '`errors.tolerance=all` tells the task to **continue** after an error in a converter, a transform or the sink.', lines: G.span(DLQ, /errors\.tolerance/) },
          { say: '`errors.deadletterqueue.topic.name` names the topic where the failed record goes, with `context.headers.enable` so that the reason travels with it. `errors.log.enable` writes a log line too.', lines: G.span(DLQ, /deadletterqueue\.topic\.name/, /errors\.log\.enable/) }
        ],
        note: 'Recorded. The first sink had the default, `errors.tolerance=none`.'
      }),

      B.rows({
        id: 'm9-fail', t: 1, src: 'rec', title: 'A record that cannot be converted',
        steps: [
          {
            say: 'The topic `bad-lines` has eleven records: ten JSON orders and, in the middle, one line that says "this line is not JSON". The first sink uses the default error handling. Its task **FAILED** with `' + FT.first_line_of_the_trace + '`. It wrote **' + FT.lines_written_before_it_failed + '** lines: the bad record was in its first batch.',
            tabs: [{ layer: 'RECORDED', name: 'The strict sink', c: 'raw', cols: ['What', 'Value'], rows: [['Connector state', FT.connector_state], ['Task state', FT.task_state], ['First line of the trace', FT.first_line_of_the_trace], ['Records in the topic', FT.records_in_the_topic], ['Lines written before it failed', FT.lines_written_before_it_failed]], trk: 2 }],
            notes: ['Recorded. The **connector** says RUNNING while its **task** is FAILED. A monitor that only looks at the connector sees nothing wrong.']
          },
          {
            say: 'The second sink, with `errors.tolerance=all` and a dead letter topic, wrote **' + DL.lines_written + ' lines** and kept running. The one bad record is in the topic `bad-lines-dlq`: value **"' + DL.dead_letter_value + '"**. Its **headers** say what went wrong.',
            tabs: [{ layer: 'RECORDED', name: 'The tolerant sink and its dead letter topic', c: 'raw', cols: ['What', 'Value'], rows: [['Task state', DL.task_state], ['Records read', DL.records_read_by_the_sink], ['Lines written', DL.lines_written], ['Records in the dead letter topic', DL.records_in_the_dead_letter_topic], ['The record', DL.dead_letter_value], ['Stage that failed', DL.stage], ['Source topic and offset', DL.source_topic + ', offset ' + DL.source_offset]] }],
            notes: ['Recorded. The dead letter record is the original record, so you can fix it and send it again.']
          },
          {
            say: 'These are the headers that the framework added. Each says something: where the record came from, which connector and task, at which stage, the class and message of the exception, and the stack trace.',
            tabs: [{ layer: 'RECORDED', name: 'The headers of the dead letter record', c: 'raw', cols: ['Header'], rows: DL.header_names.map(function (h) { return [h]; }), trk: 0 }],
            notes: ['Recorded. The exception message: ' + DL.exception_message + '.']
          },
          {
            say: 'All the connectors of the session, as one call shows them: `GET /connectors?expand=status`. One line is wrong, and you can see it: a **task FAILED** under a connector that is RUNNING.',
            tabs: [{ layer: 'RECORDED', name: 'GET /connectors?expand=status', c: 'raw', cols: AS.cols, rows: AS.rows }],
            notes: ['Recorded.']
          }
        ]
      }),

      B.cmp({
        id: 'm9-errors', t: 1, src: 'docs', title: 'Error handling: the three choices',
        say: 'When a record cannot be processed, a connector can do three things. Press Next.',
        cols: ['Setting', 'What happens', 'Good for', 'Danger'],
        hl: 1,
        rows: [
          ['errors.tolerance=none (the default)', 'The task fails at the first bad record', 'Data that must never be skipped', 'One bad record stops the pipeline until you fix it'],
          ['errors.tolerance=all, with no dead letter topic', 'Bad records are skipped, and the log says so if you ask it to', 'Almost never', 'Silent data loss. Nobody can recover the records'],
          ['errors.tolerance=all, with a dead letter topic', 'Bad records go to a topic, with headers that say why', 'Most pipelines', 'The topic must be watched, and the records replayed']
        ],
        pick: 'Choose the third, and alert on the size of the dead letter topic. Choose the first when losing a record is worse than stopping.'
      }),

      B.cmp({
        id: 'm9-which', t: 2, src: 'docs', title: 'Which connectors you will meet',
        say: 'Job descriptions name connectors by the system. Most are not part of Apache Kafka. Press Next.',
        cols: ['Connector', 'What it does', 'Part of Apache Kafka?', 'Notes'],
        hl: 2,
        rows: [
          ['FileStream source and sink', 'Reads and writes lines of a file', 'Yes, as examples', 'For learning, not for production'],
          ['MirrorMaker 2 connectors', 'Copy topics, offsets and checkpoints between clusters', 'Yes', 'Disaster recovery and migration'],
          ['JDBC source and sink', 'Poll tables, or write rows, over JDBC', 'No', 'Polling sees inserts and updates, not deletes'],
          ['Debezium', 'Read the change log of a database', 'No', 'Mission 10: inserts, updates and deletes, in order'],
          ['S3, GCS and Azure Blob sinks', 'Write topics as files in object storage', 'No', 'The usual way to feed a lake'],
          ['Elasticsearch and OpenSearch sinks', 'Index records for search', 'No', 'Often with an upsert by key']
        ],
        pick: 'Read the licence and the owner of every connector that you plan to use. Some are community projects, and some are commercial.'
      }),

      B.talk({
        id: 'm9-ops', t: 2, src: 'docs', title: 'Running Connect: the facts that decide an incident',
        say: 'Four facts about running Connect in production. Press Next.',
        items: [
          ['Distributed mode', 'Workers with the same `group.id` form a cluster. If a worker dies, its connectors and tasks are **reassigned** to the others. Standalone mode runs in one process and keeps its offsets in a local file: it is for tests.', 'Use distributed mode.'],
          ['tasks.max is a ceiling', 'The connector decides how many tasks it can use. A single file has one. A database sink may use as many as there are partitions. More tasks than partitions do nothing.', 'A ceiling, not a promise.'],
          ['Delivery guarantees depend on the connector', 'The documentation says that Connect can provide exactly-once for sink connectors, and for source connectors since version 3.3, but that **support depends on the type of connector** that you run.', 'Check the connector, as well as the framework.'],
          ['The REST interface needs protection', 'It can create and delete connectors, and read their configuration, which may hold passwords. Put it behind authentication, and use configuration providers for secrets.', 'Secure the REST port.']
        ],
        cols: 1
      }),

      B.quiz({
        id: 'm9-q1', t: 1,
        q: 'What is a Connect task?',
        opts: [
          { t: 'A scheduled job that restarts the worker', fb: 'Connect has no such job.' },
          { t: 'The part of a connector that does the work, run by a worker, and the unit of parallelism', fb: '' },
          { t: 'A message in a topic', fb: 'That is a record.' },
          { t: 'A REST call', fb: 'REST calls manage connectors.' }
        ],
        ok: 1,
        why: 'A connector splits its work into tasks, up to tasks.max. The workers run the tasks, and spread them over the cluster.'
      }),

      B.quiz({
        id: 'm9-q2', t: 1,
        q: 'The status of a connector says RUNNING, and the data stopped flowing. What do you check?',
        opts: [
          { t: 'Nothing: RUNNING means that it works', fb: 'The recording had a RUNNING connector with a FAILED task.' },
          { t: 'The state of each task, and its trace', fb: '' },
          { t: 'The disk of the worker', fb: 'The worker has no data of its own.' },
          { t: 'The brokers\' time zone', fb: 'Time zones do not stop a task.' }
        ],
        ok: 1,
        why: 'The connector and its tasks have separate states. A task that failed on a bad record leaves the connector RUNNING. Look at /status, and at the trace of the task.'
      }),

      B.quiz({
        id: 'm9-q3', t: 1,
        q: 'You delete a source connector and create it again with a different name. What does it do?',
        opts: [
          { t: 'It continues from where the old one stopped', fb: 'That happens with the same name.' },
          { t: 'It starts from the beginning, because the position is stored under the connector name', fb: '' },
          { t: 'It fails with a duplicate error', fb: 'A new name is allowed.' },
          { t: 'It reads only new data', fb: 'There is no position to start from, so it starts at the start.' }
        ],
        ok: 1,
        why: 'The key in connect-offsets includes the connector name. In the recording the same name kept the position, and a reset made the file be read again. A new name has no position at all.'
      }),

      B.quiz({
        id: 'm9-q4', t: 2,
        q: 'A sink uses errors.tolerance=all and no dead letter topic. What is the risk?',
        opts: [
          { t: 'The task stops at the first error', fb: 'That is the default, none.' },
          { t: 'Bad records are skipped and nobody can see or recover them', fb: '' },
          { t: 'The connector writes duplicates', fb: 'Skipping is not duplicating.' },
          { t: 'The dead letter topic fills the disk', fb: 'There is none.' }
        ],
        ok: 1,
        why: 'Tolerance without a dead letter queue means silent loss. Set a dead letter topic with headers, and alert on it.'
      }),

      B.bug({
        id: 'm9-bug', t: 1, q: 'This sink is meant to survive bad records without losing them. Click the line that loses them silently.',
        file: 'sink.json', lang: 'json',
        code: ['{', '  "connector.class": "FileStreamSink",', '  "topics": "orders-file",', '  "errors.tolerance": "all",', '  "file": "/data/orders.out"', '}'].join('\n'),
        bad: [4],
        hint: 'Where do the records go that cannot be written?',
        why: '`errors.tolerance=all` makes the task skip bad records, and nothing says where they should go. They are dropped. Add `errors.deadletterqueue.topic.name` and the context headers, so that each bad record is kept with the reason.',
        fix: ['{', '  "connector.class": "FileStreamSink",', '  "topics": "orders-file",', '  "errors.tolerance": "all",', '  "errors.deadletterqueue.topic.name": "orders-dlq",', '  "errors.deadletterqueue.context.headers.enable": "true",', '  "file": "/data/orders.out"', '}'].join('\n'),
        cheer: 'Tolerate errors, and keep the evidence.'
      }),

      B.order({
        id: 'm9-ord', t: 1, q: 'Put the life of a new connector in order.',
        items: [
          'You POST the connector\'s configuration to a worker',
          'The worker stores the configuration in the connect-configs topic',
          'The workers rebalance, and one of them runs the connector',
          'The connector asks for tasks, and the workers run them',
          'The tasks read or write, and commit their positions to connect-offsets',
          'The status of the connector and each task goes to connect-status'
        ],
        why: 'Everything goes through Kafka topics, so any worker can pick up any connector. The REST call only stores a configuration. The rebalance does the rest.'
      }),

      B.decide({
        id: 'm9-dec', t: 2, src: 'docs', title: 'Decision: how should orders reach the warehouse',
        scenario: 'The orders are in a Kafka topic. The warehouse is a database that has a sink connector for Kafka, with an upsert mode. The team knows Python and wants to keep control. You choose how to load it.',
        opts: [
          { t: 'Write a Python consumer for it, with the commits and the retries', d: 'Full control.', lose: 'You rebuild the position, the retries, the parallelism, the formats and the monitoring that Connect gives you, and you maintain them.' },
          { t: 'Run the sink connector in Connect, in upsert mode, with a dead letter topic', d: 'The framework does the repeating parts.', lose: '' },
          { t: 'Export files every hour and load them', d: 'Simple and familiar.', lose: 'The data is an hour late again, and the files multiply.' }
        ],
        pick: 1,
        why: 'A maintained sink connector handles the position, the retries and the parallelism, and an upsert keeps a repeat harmless. Write your own consumer only when the connector cannot do what you need.',
        when: 'If the logic between the topic and the database is complex, such as joins or business rules, a consumer or a stream job is the better place for it. Say that you would check what the connector can do first.'
      }),

      B.incident({
        id: 'm9-inc', t: 1, src: 'rec', title: 'Incident: the pipeline stopped at one bad order', time: '07:30',
        alert: '**No new orders reached the warehouse since 05:40.** The Connect status page shows the sink connector RUNNING. The consumer lag of its group grows on one partition only.',
        clues: ['One task of the sink has the state FAILED', 'The trace starts with a tolerance that was exceeded in the error handler', 'The failing record is a line that is not valid JSON'],
        opts: [
          { t: 'Read the task trace, find the bad record, fix or skip it, restart the task, and add a dead letter topic so that it cannot stop the pipeline again', fb: '' },
          { t: 'Restart the whole Connect cluster', fb: 'The task would fail again on the same record.' },
          { t: 'Raise tasks.max to spread the load', fb: 'It does not change the failing record.' },
          { t: 'Delete the connector and create it again', fb: 'It starts from the committed position, at the same bad record.' }
        ],
        best: 0,
        why: 'With the default error handling a task fails at the first record that cannot be converted, and stays failed. The connector is still RUNNING. The recording reproduced it: a task FAILED with the tolerance exceeded, and no line written. A dead letter topic would have set the record aside and kept the rest flowing.',
        checks: [
          ['Look at every task\'s state', 'GET /connectors?expand=status shows a FAILED task under a RUNNING connector.'],
          ['Read the trace', 'It names the stage and the record.'],
          ['Look at the offset of the group', 'It is stuck at the bad record.']
        ],
        tell: 'One malformed record failed a sink task, and the connector status still said RUNNING, so nobody noticed. We removed the record, restarted the task and added a dead letter topic and an alert on failed tasks.',
        prevent: ['Alert on tasks that are not RUNNING, as well as on the connector', 'Use a dead letter topic with headers', 'Validate records at the source, with a schema']
      }),

      B.incident({
        id: 'm9-inc2', t: 2, src: 'rec', title: 'Incident: every order was loaded twice', time: '12:40',
        alert: '**The warehouse has every order of the last month twice, after a maintenance window.** The team "cleaned up the Connect offsets" to fix a stuck connector.',
        clues: ['The offsets of the source connector were reset to the beginning', 'The sink connector has no upsert', 'The source reads a file that still holds the old lines'],
        opts: [
          { t: 'Remove the duplicates, make the sink an upsert, and treat offset resets as a change that needs a plan', fb: '' },
          { t: 'Reset the offsets again', fb: 'It would copy everything a third time.' },
          { t: 'Turn off the source connector for good', fb: 'It would stop the flow.' },
          { t: 'Increase tasks.max', fb: 'It does not fix duplicates.' }
        ],
        best: 0,
        why: 'Resetting the offsets of a source connector makes it read its input again. In the recording the topic went from 25 to 50 records, every line twice. A sink without an upsert writes them all again. Resetting is a replay, and replays need an idempotent sink.',
        checks: [
          ['Compare the record counts', 'A count that doubled at the time of the reset is the sign.'],
          ['Check the offsets of the connector', '`GET /connectors/{name}/offsets` shows the position.'],
          ['Check the sink mode', 'An upsert would have made the replay harmless.']
        ],
        tell: 'The connector offsets were reset, so the source read its input again and the sink inserted every row a second time. We removed the duplicates, and we make the sink an upsert, and plan any reset as a replay.',
        prevent: ['An upsert by key on every sink', 'A plan and a review for offset resets', 'Alert on a sudden jump in the record count']
      }),

      B.qa({
        id: 'qa-connect', t: 1, tag: 'Connect', secs: 75,
        q: 'What is Kafka Connect, and when do you use it?',
        pts: ['A framework to move data in and out of Kafka', 'Workers, connectors, tasks', 'Converters and transforms', 'State in Kafka topics: offsets, configs, status', 'Use it instead of custom consumers'],
        short: 'Kafka Connect is a runtime and a framework to move data between Kafka and other systems without writing code for each one. A cluster of **workers** runs **connectors**: **source** connectors read from an outside system into topics, **sink** connectors write topics out. A connector splits its work into **tasks**, which the workers spread over the cluster, so a failed worker\'s tasks move to the others. **Converters** turn the bytes in Kafka into data and back, **transforms** change records in flight, and the connector\'s position, settings and status live in **Kafka topics**. It gives you offsets, retries, parallelism and error handling for free. I use it for standard integrations, a database, object storage or a search index, and write my own consumer only when the logic is special.',
        fu: [['Where are the offsets of a source connector?', 'In the connect-offsets topic, keyed by the connector name and the source partition.'], ['Standalone or distributed?', 'Distributed for production, so that tasks move when a worker dies. Standalone is for tests.']],
        trap: 'Saying that Connect is a stream processor. It moves records and can make light changes; it does not join or aggregate.',
        real: 'We need to load a Kafka topic into Snowflake. How would you do it?'
      }),

      B.qa({
        id: 'qa-dlq', t: 2, tag: 'Connect', secs: 75,
        q: 'How do you handle bad records in a connector?',
        pts: ['errors.tolerance: none or all', 'Dead letter topic with context headers', 'Log the errors', 'A failed task under a RUNNING connector', 'Alert and replay'],
        short: 'The default is `errors.tolerance=none`: the task fails at the first record that cannot be converted, transformed or written, and stays failed, while the connector itself still says RUNNING. For most pipelines I set `errors.tolerance=all` and a **dead letter topic**, with `errors.deadletterqueue.context.headers.enable`, so that each bad record is kept with headers that say its topic, offset, stage and exception. I turn on error logging too. Then the pipeline keeps flowing, and I alert on the size of the dead letter topic, fix the cause and replay the records. In my recording, a bad JSON line failed the strict sink with no output, and the tolerant sink wrote ten lines and put the bad one in the dead letter topic with its headers. Tolerance **without** a dead letter queue is silent data loss.',
        fu: [['Does the dead letter queue cover everything?', 'It covers errors in converters, transforms and the sink\'s put. Source connectors have their own limits.'], ['How do you find a failed task?', 'GET /connectors?expand=status, and a monitor that looks at task states.']],
        trap: 'Using errors.tolerance=all alone, and calling it resilient.',
        real: 'A single bad record has stopped the pipeline twice this month. What do you change?'
      }),

      B.qa({
        id: 'qa-connect-off', t: 2, tag: 'Connect', secs: 75,
        q: 'How does a source connector avoid reading the same data twice?',
        pts: ['It stores a position for each source partition', 'In connect-offsets, keyed by connector name and source partition', 'Committed periodically', 'A restart continues from there', 'Delivery is at least once unless the connector supports exactly-once'],
        short: 'A source connector describes where it is in terms of the **source**: a **source partition**, such as a file name or a database table, and a **source offset**, such as a byte position or a log sequence number. The framework stores both in the `connect-offsets` topic, keyed by the **connector name** and the source partition, and commits them periodically. After a restart or a worker failure the connector asks for its last position and continues from there. In my recording, five lines added to a file were the only ones read, a restart and a delete with the same name repeated nothing, and a reset of the offsets made it read the file again, so every line was twice in the topic. The guarantee is at-least-once, because the position is committed after the records are sent. Exactly-once for source connectors exists since Kafka 3.3, but it depends on the connector.',
        fu: [['What changes the position?', 'Only the connector, or an explicit offsets request while the connector is stopped.'], ['What if the position is lost?', 'The connector starts again from the beginning, and the sink must cope with repeats.']],
        trap: 'Believing that Connect always gives exactly-once.',
        real: 'We renamed a connector and everything was loaded again. Why?'
      }),

      B.recap({
        id: 'm9-recap', n: 9, badge: 'Connector', color: '#A7F3D0',
        pts: [
          '**Workers** run **connectors**, which run **tasks**. The state lives in Kafka topics: `connect-configs`, `connect-offsets`, `connect-status`.',
          'A **source** reads an outside system into topics. A **sink** writes topics out. You create one with one REST call.',
          'A **converter** changed the same line from 104 to 124 bytes to 180 bytes, as a string, a JSON string and a schema envelope.',
          'A source keeps its **position** under the connector **name**. A restart and a delete with the same name repeated nothing, and a **reset** read everything again.',
          '**Transforms** change a record in flight. A **bad record** fails a task by default, while the connector says RUNNING. Use a **dead letter topic**.',
          'Most connectors, JDBC, S3 and Debezium among them, are **not** part of Apache Kafka.'
        ]
      })
    ]
  });
})();
