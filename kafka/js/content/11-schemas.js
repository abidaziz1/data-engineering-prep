/* Mission 11: schemas. What is in a message, why JSON drifts, what a schema registry stores, the wire format with its five byte header, and which changes to an Avro schema break which readers.
   Real: Avro (fastavro) writing and reading real bytes with a writer schema and a reader schema, which is the rule that a registry applies, and the logs of a real cluster. Stand-in: the registry is 40 lines
   written for the lesson. The Confluent Schema Registry and its alternatives were not run. */
(function () {
  var B = LAB.b, G = LAB.get;
  var CH = G.table('schemas.changes'), RF = G.table('schemas.registry_flow'), RG = G.counts('schemas.registry'), WF = G.counts('schemas.wire_format'), SZ = G.table('schemas.sizes'), DR = G.counts('schemas.drift');
  var PY = G.file('code/schemas.py');
  var V1 = G.lines(PY, G.at(PY, /^V1 = /), G.at(PY, /^def field\(/) - 3);
  var COMPAT = G.lines(PY, G.at(PY, /^def can_read\(/), G.at(PY, /^    return b, f$/));
  var REG = G.lines(PY, G.at(PY, /^class MiniRegistry/), G.at(PY, /^        return sid$/));
  var n0 = function (x) { return Number(x).toLocaleString('en-US'); };
  var pct = function (x) { return Math.round(x * 100) + '%'; };
  var chg = function (k) { var r = CH.rows.filter(function (x) { return x[0].indexOf(k) === 0; })[0]; G.expect(!!r, 'change "' + k + '"'); return r; };
  G.expect(chg('add the field channel, with')[3] === 'full' && chg('add the field channel, no')[3] === 'forward only' && chg('remove the field status')[3] === 'backward only' && chg('remove the field customer_id')[3] === 'full', 'adding and removing fields');
  G.expect(chg('rename total_cents to amount_cents')[3] === 'none' && chg('rename total_cents to amount_cents, with')[3] === 'backward only', 'a rename, and a rename with an alias');
  G.expect(chg('widen')[3] === 'backward only' && chg('narrow')[3] === 'forward only' && chg('make customer_id required')[3] === 'forward only', 'widening, narrowing and making required');
  G.expect(RF.rows[2][1] === 'refused' && RF.rows[3][1] !== 'refused' && RF.rows[3][2] === 'refused', 'the registry modes');
  G.expect(WF.magic_byte === 0 && WF.message_bytes === WF.avro_payload_bytes + 5 && WF.decoded_equals_the_record === true && WF.first_five_bytes_hex.length === 10, 'the wire format');
  G.expect(SZ.rows[1][1] < SZ.rows[0][1] && DR.silently_missing_cents > 0 && DR.strict_consumer_error, 'sizes, and the drift of JSON');
  var avroShare = SZ.rows[1][3];
  var yn = function (x) { return x === 'yes' ? 'works' : 'FAILS'; };

  LAB.addChapter({
    id: 'm11', n: 11, title: 'Schemas and the registry', short: 'Schemas', blurb: 'The contract inside a message: JSON drift, Avro, the five byte header, and which changes break which readers', minutes: 50,
    focus: ['qual', 'ing', 'src'],
    goals: [
      'Explain why a **schema** is a contract between writers and readers, and what **JSON** lacks.',
      'Read the **wire format**: a magic byte, a four byte schema id, then the compact data.',
      'Say what a **schema registry** stores and what it refuses.',
      'Name the **compatibility modes** and say who must be upgraded first for each.',
      'Predict whether a change is **safe**: add, remove, rename, widen, narrow.',
      'Say why a **rename** is the change that breaks everything, and what an **alias** fixes.'
    ],
    say: 'Mission 11 is about what is inside a message. Kafka does not care: a record is bytes. But the people who read your topics do. I ran the same orders as JSON and as Avro in a real log, renamed a field to see a consumer fail, and wrote nine different changes to a schema to see which ones the old and new readers survive. The registry itself is a short stand-in that I wrote for the lesson, and I say so on every screen where it appears. Press Next.',
    scenes: [
      B.talk({
        id: 'm11-what', t: 1, src: 'docs', title: 'A message is bytes. Who says what is in it?',
        say: 'Kafka stores the bytes you give it and never looks inside. Press Next to see what that means for the people who read them.',
        items: [
          ['The producer team', 'Writes a record. Today it has `order_id`, `store_id`, `total_cents`, `status`. Tomorrow someone adds a field, or renames one.', 'They change the shape.'],
          ['The consumer teams', 'Five teams read the topic: the warehouse load, a dashboard, a fraud model, a search index, a cache. Each one wrote code for the shape that it saw.', 'They depend on the shape.'],
          ['Kafka', 'Stores bytes. It will accept the new shape without a word. Nothing in the broker knows that anything changed.', 'It does not check.'],
          ['A schema', 'A written description of the record: the names of the fields, their types, which ones are optional. If it is stored and checked, a change that breaks a reader can be **refused before it is produced**.', 'A contract that a machine can check.']
        ],
        cols: 1,
        call: { k: 'tip', h: 'The sentence to remember:', t: 'A topic with many readers is a public interface. A schema registry is how you stop one team from breaking the others without knowing it.' }
      }),

      B.rows({
        id: 'm11-drift', t: 1, src: 'rec', title: 'JSON: what a rename does',
        steps: [
          {
            say: 'JSON has no schema. I wrote ' + DR.orders + ' orders to a topic as JSON. At order number **' + DR.renamed_from_order + '** the producer team renamed `total_cents` to `amount_cents`. Nobody was told, and Kafka accepted every record.',
            tabs: [{ layer: 'RECORDED', name: 'What the topic holds', c: 'raw', cols: ['Orders', 'First order with the new name', 'True sum of the total'], rows: [[DR.orders, DR.renamed_from_order, n0(DR.true_total_cents) + ' cents']] }],
            notes: ['Recorded: a real topic with ten JSON records. The change is small, and it is a typical one: a field gets a clearer name.']
          },
          {
            say: 'Now two consumers read the topic and add up the totals. A **strict** one asks for `total_cents` and gets an error at the first renamed record. It stops. That is the good outcome: someone sees it.',
            tabs: [{ layer: 'RECORDED', name: 'The strict consumer', c: 'raw', cols: ['What it does', 'Result'], rows: [['Reads `total_cents` of each record', DR.strict_consumer_error], ['The sum when it stopped', n0(DR.total_before_it_stopped) + ' cents']], trk: 0 }],
            notes: ['Recorded.']
          },
          {
            say: 'A **lenient** consumer uses a default of zero when the field is missing. It does not stop. It finishes, and reports a number. The number is **wrong by ' + n0(DR.silently_missing_cents) + ' cents**, and nothing says so. This is the bad outcome. A dashboard shows it, a person decides something from it.',
            tabs: [{ layer: 'RECORDED', name: 'The lenient consumer', c: 'raw', cols: ['What it does', 'Result'], rows: [['Reads `total_cents`, or zero when it is missing', n0(DR.consumer_with_a_default_total_cents) + ' cents'], ['The true sum', n0(DR.true_total_cents) + ' cents'], ['Silently missing', n0(DR.silently_missing_cents) + ' cents']], trk: 2 }],
            notes: ['Recorded. The two consumers are twelve lines each. Both are reasonable code. The topic let the change through.']
          }
        ]
      }),

      B.flow({
        id: 'm11-flow', t: 1, src: 'docs', title: 'Where a schema registry sits', g: 'schemas', legend: true,
        steps: [
          { say: 'This is the design that most companies use. The idea is simple: the schema lives in a registry, and the message carries only a short number. Press Next.', cap: 'Schema in the registry, id in the message.' },
          { say: 'Step 1. The producer has a **new version of the schema** and offers it to the registry, under a name called the **subject**, often `orders-value`.', on: ['k1'], focus: ['h_prod', 'h_reg'], cap: 'The producer registers a schema.' },
          { say: 'Step 2. The registry gives the schema an **id**, and first **checks it against the older versions** with a rule for the subject: backward, forward, full or none.', on: ['k2'], focus: ['h_reg', 'h_chk'], cap: 'The registry checks compatibility.' },
          { say: 'Step 3. The producer writes the record to the topic: a **magic byte, the id, and the compact binary data**. The schema itself is not in the message.', on: ['k3'], focus: ['h_prod', 'h_top'], cap: 'The record carries only the id.' },
          { say: 'Step 4. The consumer\'s **deserializer** reads the id from the front of the record.', on: ['k4'], focus: ['h_top', 'h_des'], cap: 'The deserializer reads the id.' },
          { say: 'Step 5. It asks the registry for that schema **once**, keeps it in a **cache**, and decodes the data. After that, no more requests for that id.', on: ['k6', 'k5'], focus: ['h_des', 'h_cache', 'h_cons'], cap: 'One fetch for each id, then a cache.' },
          { say: 'Step 6. If a new schema **breaks the rule**, the registry refuses it at step 2. The producer gets an error in its own test, and no bad record is ever written. This is the whole point.', on: ['k7'], focus: ['h_chk', 'h_bad'], cap: 'A breaking change stops at the door.' }
        ]
      }),

      B.rows({
        id: 'm11-wire', t: 1, src: 'rec', title: 'The five bytes in front of the data',
        steps: [
          {
            say: 'This is what one Brewline order looks like on the wire, written by a real Avro library. The first byte is **' + WF.magic_byte + '**, the "magic byte", which says that this is the registry format. The next four bytes are the **schema id**: ' + WF.schema_id + '. Then come the data.',
            tabs: [{ layer: 'RECORDED', name: 'One order in the common wire format', c: 'raw', cols: ['Part', 'Bytes', 'What it is'],
              rows: [['The first five bytes, in hex', WF.first_five_bytes_hex, 'byte 0 = ' + WF.magic_byte + ' (magic), bytes 1 to 4 = ' + WF.schema_id + ' (the schema id, big endian)'], ['Avro data', WF.avro_payload_bytes, 'five fields, with no field names and no separators'], ['The whole message', WF.message_bytes, WF.avro_payload_bytes + ' + 5']], trk: 0 }],
            notes: ['Recorded. The five byte header is the convention of the Confluent serializers, so it is the one that tools expect. It is not part of Avro itself.']
          },
          {
            say: 'Look at the sizes. The JSON text of the same order is **' + WF.json_bytes_of_the_same_record + ' bytes**, because every record repeats the names of all its fields. The Avro message is **' + WF.message_bytes + '**. The names are in the schema, once, in the registry. The reader needs the schema to decode: without the id, the data is just bytes.',
            tabs: [{ layer: 'RECORDED', name: 'The same order, two formats', c: 'raw', cols: ['Format', 'Bytes for one order'], rows: [['JSON text', WF.json_bytes_of_the_same_record], ['Avro with the header', WF.message_bytes]], trk: 1 }],
            notes: ['Recorded. The decoded record equals the original: ' + (WF.decoded_equals_the_record ? 'yes' : 'no') + '.']
          }
        ]
      }),

      B.rows({
        id: 'm11-size', t: 2, src: 'rec', title: 'A thousand orders in a real log',
        steps: [
          {
            say: 'One order is not much. I wrote **1,000** orders to two topics on a real broker, one as JSON and one as Avro with the five byte header, and added up the bytes of the log files on disk.',
            tabs: [{ layer: 'RECORDED', name: 'Bytes in the log for 1,000 orders', c: 'raw', cols: SZ.cols, rows: SZ.rows.map(function (r) { return [r[0], n0(r[1]), r[2], r[3]]; }) }],
            notes: ['Recorded: the files of one partition on disk, each with the batch headers of mission 2. The saving is real, and it grows with long field names and with compression, which also works on JSON.']
          },
          {
            say: 'Avro uses about **' + pct(avroShare) + '** of the space of JSON here. But size is the smaller reason to use a schema. The larger reason is the contract: you cannot write a record that the schema does not accept, and a reader knows what it will get.',
            tabs: [{ layer: 'RECORDED', name: 'Why teams choose a schema', c: 'raw', cols: ['Reason', 'JSON without a schema', 'Avro with a registry'], rows: [['Smaller records', 'field names in every record', 'names once, in the schema'], ['A writer cannot send a wrong type', 'it can', 'the serializer refuses'], ['A change is checked', 'by hope', 'by the registry'], ['Readable with a text editor', 'yes', 'no: you need the schema'], ['Works with any language', 'yes', 'yes, with a library']] }],
            notes: ['The first row is the recording above. The rest is the usual argument. JSON Schema and Protobuf are the other common choices and follow the same pattern of an id and a registry (from documentation).']
          }
        ]
      }),

      B.code({
        id: 'm11-schema', t: 1, src: 'rec', title: 'A schema, written down', file: 'schemas.py', lang: 'python', code: V1,
        steps: [
          { say: 'This is the schema of an order, in Avro. An Avro schema is JSON that describes the record. Here it is written as a Python dictionary, so `None` is JSON `null`. Press Next.', lines: null },
          { say: 'The record has a **name** and a **namespace**, and a list of **fields**. Each field has a name and a type: `long`, `string`, `int`.', lines: [1, 2] },
          { say: '`customer_id` has the type `["null", "long"]`: a **union**. The value may be null (a guest) or a number. And it has a **default**: `None`. A default is what lets a schema change safely. Keep that word in mind.', lines: G.span(V1, /customer_id/) },
          { say: 'The other fields are required, with no default.', lines: G.span(V1, /total_cents/, /status/) }
        ],
        note: 'Recorded: the real schema of the Brewline orders in this lesson. fastavro parsed it and wrote the bytes above.'
      }),

      B.rows({
        id: 'm11-rule', t: 1, src: 'rec', title: 'The one rule: a writer schema and a reader schema',
        steps: [
          {
            say: 'Here is the idea behind every compatibility check. Data is **written** with one schema, the writer\'s. It is **read** with another, the reader\'s. Avro has exact rules for matching the two: fields are matched by **name**, a field that the reader has and the writer lacks needs a **default**, and a field that the reader lacks is **skipped**.',
            tabs: [{ layer: 'RECORDED', name: 'Matching a writer and a reader', c: 'raw', cols: ['The reader has...', 'The writer has...', 'What happens'], rows: [['a field with a name', 'the same name and type', 'the value is read'], ['a field with a default', 'no such field', 'the default is used'], ['a field with no default', 'no such field', 'an error: no default value'], ['no such field', 'a field', 'the value is skipped'], ['long', 'int', 'allowed: the int is promoted'], ['int', 'long', 'an error: schema mismatch']] }],
            notes: ['These are the Avro resolution rules. The rest of this mission applies them, and every result that follows was produced by running them in fastavro.']
          },
          {
            say: 'Two directions follow from it. **Backward compatible**: a **new** schema can read **old** data. **Forward compatible**: an **old** schema can read **new** data. A change can be one, both, or neither.',
            tabs: [{ layer: 'RECORDED', name: 'The two directions', c: 'raw', cols: ['Name', 'A reader with the...', 'reads data written with the...', 'So you may upgrade first'], rows: [['Backward', 'new schema', 'old schema', 'the consumers: they read old and new'], ['Forward', 'old schema', 'new schema', 'the producers: old consumers still work'], ['Full', 'both ways', 'both ways', 'either, in any order'], ['None', 'no check', 'no check', 'nobody: you coordinate by hand']] }],
            notes: ['Names as the registries use them. The words are easy to mix up: say which reader and which writer, and the confusion goes away.']
          }
        ]
      }),

      B.code({
        id: 'm11-code', t: 2, src: 'rec', title: 'The check, as code', file: 'schemas.py', lang: 'python', code: COMPAT,
        steps: [
          { say: 'This is how the lesson tests a change. It is short. Press Next.', lines: null },
          { say: 'Write a record with the **writer** schema. Then read the bytes with the **reader** schema. If the library raises an error, the pair is not compatible.', lines: G.span(COMPAT, /out = read/, /except Exception/) },
          { say: 'Backward: the **old** schema is the writer and the **new** one the reader. Forward: the other way round. That is the whole definition.', lines: G.span(COMPAT, /BACKWARD: the new/, /return b, f/) }
        ],
        note: 'Recorded: the real code. It uses the fastavro library, which implements the Avro rules. A real registry does the same check on the schemas themselves, without any data.'
      }),

      B.rows({
        id: 'm11-fields', t: 1, src: 'rec', title: 'Adding and removing a field',
        steps: [
          {
            say: 'Take the schema of an order and make four changes to it. For each, I wrote a record with one version and read it with the other, in both directions. **Adding a field with a default** works both ways: full.',
            tabs: [{ layer: 'RECORDED', name: 'Adding a field', c: 'raw', cols: ['Change', 'New reads old', 'Old reads new', 'Compatible as'], rows: [chg('add the field channel, with'), chg('add the field channel, no')].map(function (r) { return [r[0], yn(r[1]), yn(r[2]), r[3]]; }), trk: 0 }],
            notes: ['Recorded. The second row is the common mistake. **A new field without a default** cannot be filled in when a new reader meets an old record: `' + chg('add the field channel, no')[4] + '`.']
          },
          {
            say: 'Removing a field is the mirror image. Remove a field that **has a default** and both directions work. Remove one that has **no default** and old readers fail on new data, because they expect it and nothing fills it in.',
            tabs: [{ layer: 'RECORDED', name: 'Removing a field', c: 'raw', cols: ['Change', 'New reads old', 'Old reads new', 'Compatible as'], rows: [chg('remove the field status'), chg('remove the field customer_id')].map(function (r) { return [r[0], yn(r[1]), yn(r[2]), r[3]]; }) }],
            notes: ['Recorded. The first failure message is `' + chg('remove the field status')[4] + '`. This is why teams give every optional field a default from the start: it keeps the way open to add and remove it later.']
          }
        ]
      }),

      B.rows({
        id: 'm11-rename', t: 1, src: 'rec', title: 'Renaming a field',
        steps: [
          {
            say: 'A rename is a **remove and an add**, as far as Avro can tell: fields are matched by name. Rename `total_cents` to `amount_cents` and neither direction works. This is the change that broke the JSON consumers a few screens ago, and here it breaks the Avro ones too, but loudly.',
            tabs: [{ layer: 'RECORDED', name: 'A rename', c: 'raw', cols: ['Change', 'New reads old', 'Old reads new', 'Compatible as'], rows: [chg('rename total_cents to amount_cents')].map(function (r) { return [r[0], yn(r[1]), yn(r[2]), r[3]]; }) }],
            notes: ['Recorded. The first failure: `' + chg('rename total_cents to amount_cents')[4] + '`.']
          },
          {
            say: 'An **alias** helps in one direction. If the new schema says that `amount_cents` is also known as `total_cents`, a new reader can read old data. But an old reader still cannot read new data, because aliases belong to the reader.',
            tabs: [{ layer: 'RECORDED', name: 'A rename with an alias', c: 'raw', cols: ['Change', 'New reads old', 'Old reads new', 'Compatible as'], rows: [chg('rename total_cents to amount_cents'), chg('rename total_cents to amount_cents, with')].map(function (r) { return [r[0], yn(r[1]), yn(r[2]), r[3]]; }), trk: 1 }],
            notes: ['Recorded. So with an alias a rename is backward compatible only. The safe way to rename is to **add the new field**, write both for a while, move every reader, and only then remove the old one.']
          }
        ]
      }),

      B.rows({
        id: 'm11-types', t: 2, src: 'rec', title: 'Changing a type',
        steps: [
          {
            say: 'Types follow a promotion rule: an `int` can be **widened** to a `long`, but not the other way. A reader that expects a long can take an int. A reader that expects an int cannot take a long. So widening is **backward only**, and narrowing is **forward only**.',
            tabs: [{ layer: 'RECORDED', name: 'Widen and narrow', c: 'raw', cols: ['Change', 'New reads old', 'Old reads new', 'Compatible as'], rows: [chg('widen'), chg('narrow')].map(function (r) { return [r[0], yn(r[1]), yn(r[2]), r[3]]; }) }],
            notes: ['Recorded. The failures read `' + chg('widen')[4] + '` and `' + chg('narrow')[4] + '`.']
          },
          {
            say: 'One more. `customer_id` was **null or a number**. Making it a required number is forward only: old readers (who allow null) can read new data, but new readers cannot read old records that hold a null.',
            tabs: [{ layer: 'RECORDED', name: 'Making a field required', c: 'raw', cols: ['Change', 'New reads old', 'Old reads new', 'Compatible as'], rows: [chg('make customer_id required')].map(function (r) { return [r[0], yn(r[1]), yn(r[2]), r[3]]; }) }],
            notes: ['Recorded. The failure: `' + chg('make customer_id required')[4] + '`. Tightening a field is easy to do and hard to undo.']
          }
        ]
      }),

      B.widget({ id: 'm11-lab', kind: 'schemalab', t: 1, src: 'rec', title: 'Lab: will the registry accept it?' }),

      B.rows({
        id: 'm11-all', t: 1, src: 'rec', title: 'All nine changes at a glance',
        steps: [
          {
            say: 'Here are all nine, in one table. The pattern is worth knowing by heart. Adding with a default and removing a field that had one: safe. Everything else breaks at least one direction.',
            tabs: [{ layer: 'RECORDED', name: 'Nine changes to one schema', c: 'raw', cols: ['Change', 'New reads old', 'Old reads new', 'Compatible as'], rows: CH.rows.map(function (r) { return [r[0], yn(r[1]), yn(r[2]), r[3]]; }) }],
            notes: ['Recorded: every row is the result of writing and reading real Avro bytes with fastavro, not a table copied from a book.']
          }
        ]
      }),

      B.code({
        id: 'm11-reg', t: 2, src: 'rec', title: 'The registry in this lesson is a stand-in', file: 'schemas.py', lang: 'python', code: REG,
        steps: [
          { say: 'This is the stand-in registry. A real one is a service with a REST API and its own storage. Press Next.', lines: null },
          { say: 'It keeps, for each **subject**, a list of versions. Each schema gets a **number** the first time it is stored: the id.', lines: G.span(REG, /def __init__/, /next_id = /) },
          { say: 'Before it stores a new version, it checks the new schema against the **latest** one, in the direction that the mode asks for: backward, forward, or both for full. If the check fails it returns nothing: the schema is **refused**.', lines: G.span(REG, /if versions and mode/, /return None/) },
          { say: 'Otherwise it stores the schema and gives it the next id.', lines: G.span(REG, /sid = self\.next_id/, /return sid/) }
        ],
        note: 'This is the stand-in. The Confluent Schema Registry and its alternatives were not run. A real one stores its schemas in a compacted Kafka topic of its own, which is from documentation.'
      }),

      B.rows({
        id: 'm11-modes', t: 1, src: 'rec', title: 'The same four offers, two modes',
        steps: [
          {
            say: 'I offered the same four schemas to a subject set to **BACKWARD** and to one set to **FULL**. The first two are accepted by both. The third **adds a field with no default**, and both refuse it. Only the fourth separates them: it **removes a field**.',
            tabs: [{ layer: 'RECORDED', name: 'What each subject said', c: 'raw', cols: RF.cols, rows: RF.rows, trk: 3 }],
            notes: ['Recorded with the stand-in registry. A refused schema gets no id, and nothing is stored. The BACKWARD subject holds ' + RG.schemas_stored_in_the_backward_subject + ' schemas with the ids ' + RG.ids_in_the_backward_subject.join(', ') + '. The FULL subject holds ' + RG.schemas_stored_in_the_full_subject + '.']
          },
          {
            say: 'So the mode is a **policy about upgrade order**. BACKWARD lets you remove a field, because new consumers can read old data, but it means you **must upgrade the consumers first**. FULL is the strictest and lets you upgrade anything in any order.',
            tabs: [{ layer: 'RECORDED', name: 'The modes and the order', c: 'raw', cols: ['Mode', 'What it guarantees', 'Upgrade first'], rows: [['BACKWARD', 'new readers read old data', 'consumers'], ['FORWARD', 'old readers read new data', 'producers'], ['FULL', 'both', 'either'], ['NONE', 'no check', 'no one is safe'], ['BACKWARD_TRANSITIVE, FORWARD_TRANSITIVE, FULL_TRANSITIVE', 'the same, against **all** earlier versions, and not just the latest', 'as above']], trk: 0 }],
            notes: ['The first four rows are what the lab above computes. The last row is from the registry documentation. The default of the Confluent registry is BACKWARD (from documentation).']
          }
        ]
      }),

      B.cmp({
        id: 'm11-formats', t: 2, src: 'docs', title: 'Avro, Protobuf or JSON Schema',
        say: 'Three formats are in common use with a registry. Press Next to compare them.',
        cols: ['Question', 'Avro', 'Protobuf', 'JSON Schema'],
        hl: 1,
        rows: [
          ['How is a field matched?', 'By **name**', 'By **field number**, so a rename is free', 'By name'],
          ['The data', 'Compact binary, no field names', 'Compact binary, field numbers', 'JSON text: large'],
          ['A schema for a reader', 'Needs the writer schema to decode', 'Decodes with its own schema', 'Validates a JSON document'],
          ['Default for a missing field', 'Must be written in the schema', 'The zero value of the type', 'Optional by default'],
          ['Common in', 'Data pipelines, Hadoop, Kafka', 'Services, gRPC', 'Teams that cannot leave JSON'],
          ['Evolving', 'Add and remove with defaults, rename with an alias', 'Add fields, never reuse a number', 'Depends on the rules that you choose']
        ],
        pick: 'For a Kafka data pipeline, Avro with a registry is the common choice. If your services already use Protobuf, use Protobuf. Keep JSON for a topic that is small and has one reader.'
      }),

      B.talk({
        id: 'm11-practice', t: 2, src: 'docs', title: 'Habits that keep a schema healthy',
        say: 'Six habits, each one shown by a result above. Press Next.',
        items: [
          ['Give every optional field a default', 'It keeps both directions open: you can add and remove it later. The first four changes above show it.', 'A default is the key.'],
          ['Add, do not rename', 'Add the new field, write both, move the readers, then remove the old. A rename breaks every reader at once.', 'Rename in four steps.'],
          ['Choose the mode on purpose', 'BACKWARD is the common default and means: upgrade consumers first. FULL is safer for a topic with many unknown readers.', 'The mode is an upgrade policy.'],
          ['Check in CI, not in production', 'Test a new schema against the registry in a pull request. A refusal at that point costs nothing.', 'Fail early.'],
          ['One subject per topic and kind', 'The usual naming is `topic-key` and `topic-value`. Other strategies put several record types in one topic.', 'Name the subject.'],
          ['Treat a topic with a schema as an API', 'Version it, document it, and tell its readers about a change before you make it.', 'It is an interface.']
        ],
        cols: 1
      }),

      B.quiz({
        id: 'm11-q1', t: 1,
        q: 'A producer renames `total_cents` to `amount_cents` in a JSON topic. A consumer reads the field with a default of zero. What happens?',
        opts: [
          { t: 'Kafka refuses the new records', fb: 'Kafka does not look inside the bytes.' },
          { t: 'The consumer keeps running and its totals are silently too low', fb: '' },
          { t: 'The consumer fails with a clear error', fb: 'Only a strict consumer does. A lenient one does not.' },
          { t: 'The broker converts the old name', fb: 'The broker never converts anything.' }
        ],
        ok: 1,
        why: 'JSON has no schema, so nothing checks the change. The recording shows both consumers: the strict one stopped, the lenient one reported ' + n0(DR.consumer_with_a_default_total_cents) + ' cents against a true ' + n0(DR.true_total_cents) + '. The quiet failure is the dangerous one.'
      }),

      B.quiz({
        id: 'm11-q2', t: 1,
        q: 'What are the first five bytes of a message in the common registry wire format?',
        opts: [
          { t: 'The name of the schema', fb: 'The name is not in the message.' },
          { t: 'A magic byte of zero, then the four byte schema id', fb: '' },
          { t: 'The length of the message', fb: 'Kafka stores the length in the batch, not in the value.' },
          { t: 'A checksum', fb: 'A checksum is in the batch header.' }
        ],
        ok: 1,
        why: 'The recording shows `' + WF.first_five_bytes_hex + '`: byte 0 is the magic byte ' + WF.magic_byte + ', and bytes 1 to 4 hold the id ' + WF.schema_id + '. The data follow. The consumer asks the registry for that id once.'
      }),

      B.quiz({
        id: 'm11-q3', t: 1,
        q: 'You add a field called `coupon` with no default to an order schema. The subject is set to BACKWARD. What does the registry do?',
        opts: [
          { t: 'Accepts it', fb: 'A new reader could not read old records that lack the field.' },
          { t: 'Refuses it: a new reader cannot fill the field when it reads an old record', fb: '' },
          { t: 'Accepts it and fills the field with null', fb: 'Only a default can do that.' },
          { t: 'Accepts it as a new subject', fb: 'It stays on the same subject.' }
        ],
        ok: 1,
        why: 'The registry flow above shows it: the third offer, "add coupon, no default", was refused in both modes. The fix is one line: give the field a default.'
      }),

      B.quiz({
        id: 'm11-q4', t: 2,
        q: 'The subject is BACKWARD. You want to remove a field from the schema. Who must upgrade first?',
        opts: [
          { t: 'The producers', fb: 'That order is for FORWARD.' },
          { t: 'The consumers', fb: '' },
          { t: 'Nobody, in any order', fb: 'That is FULL, and the removal was refused by it in the recording.' },
          { t: 'The broker', fb: 'The broker does not read schemas.' }
        ],
        ok: 1,
        why: 'Removing a field without a default is **backward only**: a new reader can read old data, but an old reader cannot read new data. So the readers go first, and only then does the producer write the new shape.'
      }),

      B.bug({
        id: 'm11-bug', t: 1, q: 'This schema change was reviewed and merged, and it broke the warehouse load that reads the topic. Click the line that caused it.',
        file: 'order.avsc', lang: 'json',
        code: ['{"type": "record", "name": "Order", "namespace": "brewline", "fields": [', '  {"name": "order_id", "type": "long"},', '  {"name": "store_id", "type": "string"},', '  {"name": "amount_cents", "type": "int"},', '  {"name": "status", "type": "string"}', ']}'].join('\n'),
        bad: [4],
        hint: 'Compare the field names with the version before: order_id, store_id, total_cents, status.',
        why: 'The field `total_cents` was **renamed** to `amount_cents`. Avro matches fields by name, so to a reader of the old schema this is a removed field with no default plus a new one, and both directions fail. Add the new field with a default, write both for a while, move the readers, and then remove the old one. Or add `"aliases": ["total_cents"]`, which helps a new reader of old data only.',
        fix: ['{"type": "record", "name": "Order", "namespace": "brewline", "fields": [', '  {"name": "order_id", "type": "long"},', '  {"name": "store_id", "type": "string"},', '  {"name": "total_cents", "type": "int"},', '  {"name": "amount_cents", "type": ["null", "int"], "default": null},', '  {"name": "status", "type": "string"}', ']}'].join('\n'),
        cheer: 'Add, do not rename.'
      }),

      B.order({
        id: 'm11-ord', t: 1, q: 'Put a safe rename in order.',
        items: [
          'Add the new field `amount_cents` with a default, to the schema',
          'Register the schema: the registry checks it and gives it an id',
          'Producers write both `total_cents` and `amount_cents`',
          'Move every consumer to read `amount_cents`',
          'Stop writing `total_cents`',
          'Remove `total_cents` from the schema, now that no reader needs it'
        ],
        why: 'Each step is compatible with the one before it. A rename in one step breaks every reader at once. This pattern is called **expand and contract**.'
      }),

      B.decide({
        id: 'm11-dec', t: 2, src: 'docs', title: 'Decision: the compatibility mode for a shared topic',
        scenario: 'The `orders` topic is read by nine teams, some of which you have never met. Producers deploy twice a week, and the consumers deploy when they like. A new field is added about once a month, and a field is removed about once a year. You choose the mode of the subject.',
        opts: [
          { t: 'NONE: trust people to tell each other', d: 'No friction for the producer.', lose: 'The first rename breaks nine teams. You will not know it until someone complains.' },
          { t: 'FULL (or FULL_TRANSITIVE)', d: 'Old and new readers and writers can be mixed in any order. Producers and consumers never have to wait for each other.', lose: '' },
          { t: 'FORWARD: producers go first', d: 'Producers can move fast.', lose: 'Consumers that were upgraded cannot read old data, so a replay of the topic fails.' }
        ],
        pick: 1,
        why: 'With readers that you do not control and no upgrade order, the only safe promise is both directions. It costs some freedom: a new field needs a default, and a removed one must have had one. The check in the pull request makes that cheap.',
        when: 'For a topic that has one reader and one writer in the same team, BACKWARD is enough and easier. Say that you would ask who the readers are first.'
      }),

      B.incident({
        id: 'm11-inc', t: 1, src: 'rec', title: 'Incident: the dashboard shows a drop in revenue', time: '09:10',
        alert: '**Revenue on the finance dashboard dropped by a third since yesterday evening.** The orders system looks normal, and customers are buying. The dashboard is fed by a consumer of the `orders` topic. Producers released a new version at 17:00.',
        clues: ['The topic is JSON, with no schema registry', 'The consumer reads `total_cents` with a default of zero', 'The records written after 17:00 have a field called `amount_cents`'],
        opts: [
          { t: 'Read the new records, find the renamed field, fix the consumer to accept both names, then reprocess from 17:00, and move the topic to a schema with a compatibility check', fb: '' },
          { t: 'Roll back the producers and keep the consumer as it is', fb: 'It stops the damage, and the records written since 17:00 are still wrong in the dashboard.' },
          { t: 'Tell the dashboard team that revenue is low', fb: 'It is not low. The data is wrong.' },
          { t: 'Delete the topic and start again', fb: 'You would lose the data and not the cause.' }
        ],
        best: 0,
        why: 'This is the lenient consumer of the recording: it did not fail, so nobody was paged, and its sum was short by exactly the renamed records. The fix is in the consumer and the replay. The lasting fix is a registry with a check, so that the producer\'s change is refused in its own pull request.',
        checks: [
          ['Look at a record from before and after 17:00', 'The field name changed.'],
          ['Check what the consumer does with a missing field', 'A default of zero hides it.'],
          ['Find the first bad offset', 'Replay from there, as in mission 6.']
        ],
        tell: 'The producer team renamed a field in a JSON topic. The dashboard consumer used a default of zero, so the revenue was silently low. We fixed the consumer, replayed from the first bad offset, and are moving the topic to Avro with a compatibility check.',
        prevent: ['A schema registry with a compatibility mode on every shared topic', 'Consumers that fail on a missing field and do not default it', 'A data quality check on the dashboard: revenue should not drop by a third without a reason']
      }),

      B.incident({
        id: 'm11-inc2', t: 2, src: 'rec', title: 'Incident: the producer cannot register its schema', time: '15:40',
        alert: '**A producer team cannot deploy.** Their pull request fails with: "schema being registered is incompatible with an earlier schema". They only added a field called `coupon` to the order schema.',
        clues: ['The subject is set to BACKWARD', 'The new field has the type string and no default', 'Old records in the topic have no coupon'],
        opts: [
          { t: 'Give the field a default, or make its type a union with null and a default of null, and register again', fb: '' },
          { t: 'Set the subject to NONE so that it passes', fb: 'It passes, and the next break will reach production.' },
          { t: 'Create a new subject with another name', fb: 'The consumers read the old subject.' },
          { t: 'Remove the registry from the build', fb: 'That removes the protection.' }
        ],
        best: 0,
        why: 'This is the third offer in the recording: "add coupon, no default", refused. A new reader meets old records that have no coupon, so it needs a value to put there. A default gives it one, and the change is then compatible both ways.',
        checks: [
          ['Read the error and the mode', 'It says which direction failed.'],
          ['Look at the new field', 'A type without a default is the usual cause.'],
          ['Test the fix in the pull request', 'The registry has a test endpoint for compatibility.']
        ],
        tell: 'The registry refused a field with no default, because a new reader could not read old records. We added a default and the change was accepted.',
        prevent: ['A lint rule that every new field has a default', 'The compatibility check in the pull request', 'A template schema with the habit built in']
      }),

      B.qa({
        id: 'qa-schema', t: 1, tag: 'Schemas', secs: 75,
        q: 'Why use a schema registry with Kafka?',
        pts: ['A message is bytes: no contract', 'The registry stores schemas, gives ids', 'Checks compatibility on registration', 'The message carries only the id', 'Smaller, safer, evolvable'],
        short: 'Kafka stores bytes and never looks inside, so a topic with many readers has no contract: in a recording of mine, a producer renamed a JSON field and a lenient consumer\'s totals were silently short, with no error anywhere. A **schema registry** stores the schemas of a subject as versions, gives each a numeric id, and **checks every new version against the old ones** under a compatibility mode: backward, forward, full, or none. A breaking change is **refused at registration**, before a bad record exists. The message then carries only a **magic byte and a four byte id** in front of compact binary data, so it is also smaller: ' + pct(avroShare) + ' of the size of JSON in my recording of 1,000 orders. A consumer fetches each schema once and caches it.',
        fu: [['What is the subject?', 'The name under which versions of a schema are kept, usually the topic name plus -key or -value.'], ['Which format?', 'Avro is the common choice for pipelines, Protobuf for services, and JSON Schema when you must keep JSON.']],
        trap: 'Saying that the registry makes Kafka validate messages. The check is in the serializer and the registry, not in the broker.',
        real: 'A producer team wants to rename a field. What do you tell them?'
      }),

      B.qa({
        id: 'qa-compat', t: 2, tag: 'Schemas', secs: 75,
        q: 'Explain backward and forward compatibility, and which changes are safe.',
        pts: ['Backward: new schema reads old data', 'Forward: old schema reads new data', 'Full: both', 'Safe: add or remove a field with a default', 'Unsafe: rename, narrow, new required field'],
        short: '**Backward** compatible means a reader on the **new** schema can read data written with the **old** one, so you upgrade consumers first. **Forward** means a reader on the **old** schema can read **new** data, so producers go first. **Full** is both, in any order. I tested nine changes with real Avro: adding a field **with a default** and removing a field that **had a default** are full. Adding a field without a default is forward only, and removing one without a default is backward only. Widening int to long is backward only, and narrowing is forward only. A **rename** is neither, unless you add an alias, which gives backward only. So I add fields with defaults, never rename, and when I must change a name I add the new field, write both, move the readers, and then remove the old one.',
        fu: [['What is the transitive version?', 'The check runs against all earlier versions, and not just the latest.'], ['What about Protobuf?', 'Fields are matched by number, so a rename is free, but a number must never be reused.']],
        trap: 'Mixing up the two directions. Say who reads what.',
        real: 'Walk me through a safe rename of a field in a topic with six consumers.'
      }),

      B.qa({
        id: 'qa-wire', t: 2, tag: 'Schemas', secs: 60,
        q: 'What does an Avro record look like in a Kafka topic, and how does a consumer decode it?',
        pts: ['Magic byte, schema id, data', 'No field names in the data', 'Consumer asks the registry for the id', 'Cached after the first fetch', 'Writer and reader schema'],
        short: 'In the usual Confluent wire format a value is **five bytes of header** followed by the Avro data. Byte 0 is a magic byte, zero, and bytes 1 to 4 are the **schema id** as a big endian integer. The data have **no field names**: just the values in the order of the schema, so one of my test orders was ' + WF.avro_payload_bytes + ' bytes of data and ' + WF.message_bytes + ' with the header, against ' + WF.json_bytes_of_the_same_record + ' as JSON. The consumer reads the id, asks the registry for that schema **once**, caches it, and decodes with the **writer** schema, resolving it against its own **reader** schema. That is why a reader needs defaults for fields that old records lack.',
        fu: [['What if the registry is down?', 'Consumers that already cached the schemas keep working. A new id cannot be decoded until it is back, so the registry must be highly available.'], ['Where does the registry keep its data?', 'In a compacted topic of its own (from documentation).']],
        trap: 'Saying that the schema is in every message.',
        real: 'Why are Avro messages smaller than JSON?'
      }),

      B.recap({
        id: 'm11-recap', n: 11, badge: 'Schema Guard', color: '#DDD6FE',
        pts: [
          'A topic is an **interface** with many readers. **JSON has no schema**: a renamed field made a lenient consumer\'s totals silently wrong, and a strict one stop.',
          'A **registry** stores versions of a schema under a **subject**, gives each an **id**, and **refuses** a new version that breaks the **compatibility mode**.',
          'A message is a **magic byte, a four byte id, and compact data with no field names**: ' + WF.message_bytes + ' bytes against ' + WF.json_bytes_of_the_same_record + ' for JSON.',
          '**Backward**: a new reader reads old data, so upgrade **consumers** first. **Forward**: an old reader reads new data, so upgrade **producers** first. **Full**: both.',
          'With real Avro: add or remove a field **with a default** is safe. A **rename** breaks both ways, and an **alias** fixes one. Widening is backward only, narrowing is forward only.',
          'Every optional field gets a default. **Add, do not rename.** Check in the pull request. The registry here was a **stand-in**: a real one is a separate service.'
        ]
      })
    ]
  });
})();
