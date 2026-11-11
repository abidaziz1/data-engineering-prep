/* Mission 7: files and layout. Parquet inside, how many files a write makes, folders that a filter skips, row groups that a filter skips, codecs, schema changes, bucketing and the
   overwrite mode that can empty a table. File counts are measured on disk and bytes read come from the event log of a real Spark 4.0.1. */
(function () {
  var B = LAB.b, G = LAB.get;
  var VA = G.table('files.variants'), TO = G.table('files.touched'), CO = G.table('files.codecs'), RG = G.table('files.rowgroups'), EV = G.counts('files.evolution'), BK = G.counts('files.bucketing'), OW = G.counts('files.overwrite');
  var BKP = G.text('files.bucketing_plan');
  var PY = G.file('code/layout.py');
  var VCODE = G.lines(PY, G.at(PY, /^def write_variants/), G.at(PY, /return rows/));
  var RGCODE = G.lines(PY, G.at(PY, /^def row_group_skipping/), G.at(PY, /setJobGroup\('', ''\)/));
  var EVCODE = G.lines(PY, G.at(PY, /^def schema_evolution/), G.at(PY, /return plain\.columns/));
  var OWCODE = G.lines(PY, G.at(PY, /^def overwrite_modes/), G.at(PY, /return result/));
  var n0 = function (x) { return Number(x).toLocaleString('en-US'); };
  var kb = function (x) { return n0(x) + ' KB'; };
  var variant = function (start) { var r = VA.rows.filter(function (x) { return x[0].indexOf(start) === 0; })[0]; if (!r) throw new Error('no file variant ' + start); return r; };
  var codec = function (c) { var r = CO.rows.filter(function (x) { return x[0] === c; })[0]; if (!r) throw new Error('no codec ' + c); return Number(r[1]); };
  var rg = function (file, push) { var r = RG.rows.filter(function (x) { return x[0] === file && x[1] === push; })[0]; if (!r) throw new Error('no row group case ' + file + ' ' + push); return r; };
  var one = variant('one task'), tasks200 = variant('200 tasks'), perDay200 = variant('folder for each day, 200 tasks'), perDay = variant('folder for each day, no shuffle'), perDayRep = variant('folder for each day, repartition'), perStore = variant('folder for each store'), cap = variant('at most');
  var sortedOn = rg('sorted by order_id', 'on'), sortedOff = rg('sorted by order_id', 'off'), shufOn = rg('shuffled by order_id', 'on'), shufOff = rg('shuffled by order_id', 'off');
  G.expect(Number(perDay200[1]) === Number(tasks200[1]) * 14 && Number(perDay[1]) === 14, 'files = tasks that wrote times folders each wrote to');
  G.expect(Number(sortedOn[2]) < Number(sortedOff[2]) / 5 && Number(shufOn[3]) === Number(shufOff[3]), 'row group skipping works on sorted data only');
  G.expect(BK.shuffles_without_buckets === 2 && BK.shuffles_when_bucketed === 0, 'bucketing removes both exchanges');
  G.expect(OW.default_mode === 'STATIC' && OW.static.rows_after < OW.dynamic.rows_after && OW.dynamic.folders_after.length === 3, 'static overwrite empties the table');
  G.expect(EV.columns_by_default.indexOf('channel') < 0 && EV.columns_with_mergeSchema.indexOf('channel') >= 0, 'mergeSchema finds the new column');
  var smaller = function (a, b) { return Math.round((1 - a / b) * 100); };

  LAB.addChapter({
    id: 'm7', n: 7, title: 'Files and layout', short: 'Files', blurb: 'Parquet inside, small files, folders and row groups that a filter skips, codecs, schema change, and an overwrite that empties a table', minutes: 55,
    focus: ['mart', 'raw'],
    goals: [
      'Describe what is **inside a Parquet file**: row groups, column chunks and the footer with min and max.',
      'Predict **how many files** a write makes: tasks that write times folders that each one writes to.',
      'Explain **partition pruning** and **predicate pushdown**, and why sorted data skips row groups and shuffled data does not.',
      'Choose a **compression codec** and say what it costs.',
      'Read a table whose files have **different schemas**, with and without `mergeSchema`.',
      'Explain **bucketing**, and the **overwrite mode** that can empty a partitioned table.'
    ],
    say: 'Mission 7 is about the files that Spark writes, because the next job has to read them. A good layout makes a read cheap and a bad one makes it slow, however good the code is. I wrote the same 400,000 orders seven ways and counted the files on disk. I measured the bytes a filter reads from sorted and from shuffled files. And I ran the overwrite that every team gets wrong once.',
    scenes: [
      B.talk({
        id: 'm7-parquet', t: 1, src: 'docs', title: 'Inside a Parquet file',
        say: 'Parquet is the default format of Spark, and it is columnar. Press Next for the parts that matter to a data engineer.',
        items: [
          ['Columnar', 'A row format like CSV stores one row after another. Parquet stores **one column after another**. A query that needs three columns of eight reads only those three, and each column compresses well, because its values look alike.', 'Read only the columns you name.'],
          ['Row groups and column chunks', 'A file is cut into **row groups**, each a block of rows (128 MB by default in the Parquet library, much less in my recording). Inside a row group, each column is a **column chunk**, and a chunk is cut into pages.', 'Rows in blocks, columns in chunks.'],
          ['The footer', 'At the end of the file is the **footer**: the schema, and for every column chunk its **minimum, maximum and null count**. A reader looks at the footer first, and can skip a row group whose range cannot match the filter.', 'Min and max let a reader skip.'],
          ['Typed and self-describing', 'The schema is in the file. Types are real (integers, dates, decimals), so there is no guessing, unlike CSV and JSON. Adding a column to the end is easy, which is why schema change is common.', 'The schema travels with the data.'],
          ['Other formats', '**ORC** is similar and common in the Hive world. **Avro** is row-based, with a schema, good for streams and exchange. **CSV and JSON** are text: large, slow, untyped, and a gzip-compressed text file cannot be split. Use them at the edges, and Parquet (or a table format on top) inside.', 'Text at the edges, Parquet inside.']
        ],
        cols: 1
      }),

      B.flow({
        id: 'm7-flow', t: 1, src: 'docs', title: 'A table on disk', g: 'files', legend: true,
        steps: [
          { say: 'A Spark table on disk is just folders and files. Press Next to follow a read from the folder down to the rows that you need.', cap: 'Folders, files, row groups, columns.' },
          { say: 'Step 1. The table is a folder. If it was written with `partitionBy`, it holds one **folder for each value** of the partition column, like `order_date=2026-11-01`. The name of the folder is the value.', on: ['l1'], focus: ['f_tbl', 'f_part'], tags: ['tg_prune'], cap: 'A folder for each value.' },
          { say: 'Step 2. A filter on the partition column lets Spark **skip whole folders** without opening a file. This is partition pruning, and it is the biggest saving a layout can give. It shows in the plan as `PartitionFilters`.', on: ['l2'], focus: ['f_part', 'f_file'], cap: 'Pruning skips folders.' },
          { say: 'Step 3. Inside a folder are Parquet files. Each file was written by one task. A file is cut into **row groups**.', on: ['l3'], focus: ['f_file', 'f_rg'], cap: 'Files hold row groups.' },
          { say: 'Step 4. In a row group, each column has its own **chunk**, compressed on its own. A query reads only the chunks of the columns it names.', on: ['l4'], focus: ['f_rg', 'f_col'], cap: 'A chunk for each column.' },
          { say: 'Step 5. The footer holds the **minimum and maximum** of every chunk. Spark reads the footer first.', on: ['l5'], focus: ['f_col', 'f_stat'], tags: ['tg_push'], cap: 'The footer has min and max.' },
          { say: 'Step 6. If the filter asks for `order_id` between 1000 and 1999, and a row group says its ids go from 5000 to 9000, Spark **skips** that row group. This is predicate pushdown. It shows in the plan as `PushedFilters`.', on: ['l6'], focus: ['f_stat', 'f_skip'], cap: 'The footer decides what to skip.' },
          { say: 'Step 7. Only the rows you need are read. And the trap, in the red tag: if there are thousands of tiny files, the cost of listing and opening them is larger than the saving of all the skipping.', on: ['l7'], focus: ['f_skip', 'f_read'], tags: ['tg_small'], cap: 'Many tiny files undo the gain.' }
        ]
      }),

      B.rows({
        id: 'm7-variants', t: 1, src: 'rec', title: 'The same orders written seven ways',
        steps: [
          {
            say: 'I wrote the 400,000 orders seven ways, and counted the Parquet files on disk and their sizes. Look at the second and fourth columns. Press Next.',
            tabs: [{ layer: 'RECORDED', name: 'Files on disk for each way of writing', c: 'raw', cols: VA.cols, rows: VA.rows.map(function (r) { return [r[0], n0(r[1]), n0(r[2]), r[3]]; }), trk: 0 }],
            notes: ['Recorded: the files under each folder, counted with Python. File sizes vary by a few hundred bytes between runs, so the totals are rounded to 10 KB.']
          },
          {
            say: 'The rule behind every row: **files = tasks that wrote, times the folders that each task wrote to**. `coalesce(1)` is one task, so **' + one[1] + '** file of ' + kb(one[2]) + '. `repartition(200)` is 200 tasks, so **' + tasks200[1] + '** files of ' + tasks200[3] + ' KB.',
            tabs: [{ layer: 'RECORDED', name: 'Files on disk for each way of writing', c: 'raw', cols: VA.cols, rows: VA.rows.map(function (r) { return [r[0], n0(r[1]), n0(r[2]), r[3]]; }), trk: 1, chg: [[0, 1], [1, 1]] }],
            notes: ['One big file cannot be read in parallel. Hundreds of small ones cost an open each.']
          },
          {
            say: 'Now with `partitionBy("dt")`, a folder for each day. If the 200 tasks come out of a shuffle, **each task holds a few rows of every day**, so each writes a file into every one of the 14 folders. 200 times 14 is **' + n0(perDay200[1]) + '** files of ' + perDay200[3] + ' KB each. This is the small-files problem, made by one innocent `repartition(200)`.',
            tabs: [{ layer: 'RECORDED', name: 'Files on disk for each way of writing', c: 'raw', cols: VA.cols, rows: VA.rows.map(function (r) { return [r[0], n0(r[1]), n0(r[2]), r[3]]; }), trk: 2, chg: [[2, 1], [2, 3]] }],
            notes: ['The total size also grew, from ' + kb(tasks200[2]) + ' to ' + kb(perDay200[2]) + ': tiny files compress badly and carry a footer each.']
          },
          {
            say: 'Without the shuffle, a task writes the days that it read, and **' + perDay[1] + '** files come out, ' + perDay[3] + ' KB each. With `repartition(14, "dt")`, all rows of a day go to one task: also **' + perDayRep[1] + '** files. Same count, but now it holds even if the input was not laid out by day.',
            tabs: [{ layer: 'RECORDED', name: 'Files on disk for each way of writing', c: 'raw', cols: VA.cols, rows: VA.rows.map(function (r) { return [r[0], n0(r[1]), n0(r[2]), r[3]]; }), trk: 4, chg: [[3, 1], [4, 1]] }],
            notes: ['`repartition("dt")` before `partitionBy("dt")` is the standard recipe: one task for each folder.']
          },
          {
            say: 'Two more. Partitioning by store **and** day gives **' + perStore[1] + '** files of ' + perStore[3] + ' KB: 14 days times 12 stores, small. And `maxRecordsPerFile` of 50,000 cuts a big output into **' + cap[1] + '** files of about ' + n0(Math.round(cap[3])) + ' KB. That option is the safe way to cap a file size.',
            tabs: [{ layer: 'RECORDED', name: 'Files on disk for each way of writing', c: 'raw', cols: VA.cols, rows: VA.rows.map(function (r) { return [r[0], n0(r[1]), n0(r[2]), r[3]]; }), trk: 6, chg: [[5, 1], [6, 1]] }],
            notes: ['More partition columns mean more folders and smaller files. Partition by a few columns of low cardinality.']
          }
        ]
      }),

      B.widget({ id: 'm7-lab', kind: 'layoutlab', t: 1, src: 'rec', title: 'Lab: write it, then read it' }),

      B.code({
        id: 'm7-vcode', t: 2, src: 'rec', title: 'How the seven files were written', file: 'layout.py', lang: 'python', code: VCODE,
        steps: [
          { say: 'The function that wrote the seven variants and counted the files. Press Next.', lines: null },
          { say: 'The docstring says the rule that you just saw: the number of files is the number of tasks that wrote, times the folders that each one wrote to.', lines: G.span(VCODE, /"""The same 400,000 orders/) },
          { say: 'The first two variants: `coalesce(1)` and `repartition(200)`, no folders.', lines: G.span(VCODE, /one task: coalesce/, /200 tasks: repartition/) },
          { say: 'The three that use `partitionBy("dt")`: after a shuffle of 200, with no shuffle, and with `repartition(14, "dt")`.', lines: G.span(VCODE, /folder for each day, 200 tasks/, /repartition by day/) },
          { say: 'Two folder columns, and a cap of 50,000 rows for each file.', lines: G.span(VCODE, /folder for each store and day/, /maxRecordsPerFile/) },
          { say: 'Each is written with `mode("overwrite")`, then the Parquet files under it are counted and their sizes added.', lines: G.span(VCODE, /for i, \(label, make\)/, /rows\.append/) }
        ],
        note: 'Recorded. The loop is the whole experiment: write, count, and divide the size by the count.'
      }),

      B.rows({
        id: 'm7-prune', t: 1, src: 'rec', title: 'Which filters skip folders',
        steps: [
          {
            say: 'The orders table is partitioned by day: **' + TO.rows[0][2] + '** folders. I asked how many files three filters had to open, counted with `input_file_name()`. Press Next.',
            tabs: [{ layer: 'RECORDED', name: 'Files opened by a filter', c: 'raw', cols: TO.cols, rows: TO.rows, trk: 0 }],
            notes: ['Recorded: the distinct file names that the tasks of each query read.']
          },
          {
            say: 'A filter on the partition column opened **' + TO.rows[0][1] + '** file of ' + TO.rows[0][2] + '. Thirteen folders were never listed for data. That is partition pruning.',
            tabs: [{ layer: 'RECORDED', name: 'Files opened by a filter', c: 'raw', cols: TO.cols, rows: TO.rows, trk: 0, chg: [[0, 1]] }],
            notes: ['In the plan: `PartitionFilters: [isnotnull(dt), (dt = 2026-11-05)]`.']
          },
          {
            say: 'Wrapping the column in a **cast** to a string still opened **' + TO.rows[1][1] + '** file. Spark understood the cast and rewrote the filter. That is a pleasant surprise, and **not a rule**: other functions on a partition column can hide it from the planner. Check the `PartitionFilters` line of the plan each time.',
            tabs: [{ layer: 'RECORDED', name: 'Files opened by a filter', c: 'raw', cols: TO.cols, rows: TO.rows, trk: 1, chg: [[1, 1]] }],
            notes: ['The cast is the case I tested. I did not record other functions, so I do not claim anything about them.']
          },
          {
            say: 'A filter on `store_id`, which is **not** a partition column, opened all **' + TO.rows[2][1] + '** files. The folders say nothing about stores. Only the row-group statistics inside each file could help, and the next screens show when they do.',
            tabs: [{ layer: 'RECORDED', name: 'Files opened by a filter', c: 'raw', cols: TO.cols, rows: TO.rows, trk: 2, chg: [[2, 1]] }],
            notes: ['The fix is not to partition by store, which makes many small folders. It is to sort inside the files by store.']
          }
        ]
      }),

      B.rows({
        id: 'm7-rg', t: 1, src: 'rec', title: 'Row groups: sorted files skip, shuffled files do not',
        steps: [
          {
            say: 'I wrote the orders twice, with small row groups: once sorted by `order_id`, once in a shuffled order. Then I asked for 1,000 orders, with filter pushdown on and off, and read the bytes and the records from the event log. Press Next.',
            tabs: [{ layer: 'RECORDED', name: 'Bytes and records read', c: 'raw', cols: RG.cols, rows: RG.rows.map(function (r) { return [r[0], r[1], n0(r[2]), n0(r[3])]; }), trk: 0 }],
            notes: ['Recorded: `spark.sql.parquet.filterPushdown` set to true and false, `order_id BETWEEN 1000 AND 1999`.']
          },
          {
            say: 'On the **sorted** file with pushdown **on**, Spark read **' + n0(sortedOn[2]) + '** bytes and **' + n0(sortedOn[3]) + '** records. With pushdown **off**, **' + n0(sortedOff[2]) + '** bytes and **' + n0(sortedOff[3]) + '** records. That is **' + Math.round(Number(sortedOff[2]) / Number(sortedOn[2])) + ' times** fewer bytes. The footer said which row groups could hold ids 1000 to 1999, and Spark skipped the rest.',
            tabs: [{ layer: 'RECORDED', name: 'Bytes and records read', c: 'raw', cols: RG.cols, rows: RG.rows.map(function (r) { return [r[0], r[1], n0(r[2]), n0(r[3])]; }), trk: 0, chg: [[0, 2], [0, 3]] }],
            notes: ['The range of ids in a row group is narrow when the data is sorted. That is the whole trick.']
          },
          {
            say: 'On the **shuffled** file, every row group holds ids from all over the range. The minimum is near 1 and the maximum near 400,000 in each, so **no row group can be ruled out**. With pushdown on, Spark read **' + n0(shufOn[2]) + '** bytes, even a little more than with it off (' + n0(shufOff[2]) + '). The idea is the same, and the data does not allow it.',
            tabs: [{ layer: 'RECORDED', name: 'Bytes and records read', c: 'raw', cols: RG.cols, rows: RG.rows.map(function (r) { return [r[0], r[1], n0(r[2]), n0(r[3])]; }), trk: 2, chg: [[2, 2], [3, 2]] }],
            notes: ['A filter pushed to the reader is a hint. Whether it skips anything depends on how the data was ordered when it was written.']
          },
          {
            say: 'So to make a filter cheap, **sort the data inside the files by the column that people filter on**. `sortWithinPartitions` after a `repartition` does it without a global sort. This is how you get the benefit of an index on a store or a customer, without a database.',
            tabs: [{ layer: 'RULE', name: 'What to do', c: 'raw', cols: ['filter by', 'layout'], rows: [['a date or a few values of low cardinality', '`partitionBy` that column'], ['a high-cardinality id or a store', '`sortWithinPartitions` by it, inside each folder'], ['a join key that repeats', 'bucket by it, if the same tables are joined often']], trk: 1 }],
            notes: ['Table formats such as Delta add statistics and clustering features on top. Mission 11 returns to this.']
          }
        ]
      }),

      B.code({
        id: 'm7-rgcode', t: 2, src: 'rec', title: 'How the row group experiment ran', file: 'layout.py', lang: 'python', code: RGCODE,
        steps: [
          { say: 'The function behind the table. Press Next.', lines: null },
          { say: 'The two files are made from the same 400,000 orders, five columns. One is sorted by `order_id`. The other is sorted by a **hash** of the id, which shuffles it.', lines: G.span(RGCODE, /for label, df in/) },
          { say: '`coalesce(1)` writes each as a single file, and `parquet.block.size` of 262,144 bytes makes row groups of 256 KiB, so that there are many in a small file. The real default is far bigger.', lines: G.span(RGCODE, /coalesce\(1\)\.write\.option/) },
          { say: 'Then the filter runs four times: for each file, with `spark.sql.parquet.filterPushdown` on and off. Each run has its own job group, so its tasks can be found in the event log.', lines: G.span(RGCODE, /for label in/, /setJobGroup\(group/) },
          { say: 'The query asks for 1,000 consecutive ids and sums a column. Only the ids in that range are needed.', lines: G.span(RGCODE, /BETWEEN 1000 AND 1999/) }
        ],
        note: 'Recorded: the setting that makes the row groups small is for the demonstration. With 128 MB row groups, a table of this size has a single row group.'
      }),

      B.cmp({
        id: 'm7-codecs', t: 1, src: 'rec', title: 'Compression codecs',
        say: 'The same orders written with four codecs. The size is recorded. The other columns are from the documentation. Press Next.',
        cols: ['Codec', 'Size on disk', 'Against no compression', 'Character'],
        hl: 1,
        rows: [
          ['none', kb(codec('none')), '-', 'Biggest, no CPU cost. Never the right choice for storage'],
          ['snappy', kb(codec('snappy')), smaller(codec('snappy'), codec('none')) + ' percent smaller', 'The default in Spark. Fast to write and to read, a modest saving'],
          ['gzip', kb(codec('gzip')), smaller(codec('gzip'), codec('none')) + ' percent smaller', 'Smaller than snappy, slower to write, slower to read'],
          ['zstd', kb(codec('zstd')), smaller(codec('zstd'), codec('none')) + ' percent smaller', 'Smallest in this test, with speed close to snappy. A good choice for cold and large data']
        ],
        steps: [
          { upto: 2, say: 'No compression and snappy. Snappy is the default because it is cheap in CPU.' },
          { upto: 4, say: 'gzip and zstd squeeze harder. Zstd matched gzip\'s saving or beat it, and is the usual choice when storage or network is the cost.' }
        ],
        pick: 'Codecs are chosen **per file when you write**: `df.write.option("compression", "zstd")`. A Parquet file stays splittable whatever the codec, because compression is applied to the pages inside, and not to the whole file.'
      }),

      B.rows({
        id: 'm7-evo', t: 2, src: 'rec', title: 'Two batches, two schemas',
        steps: [
          {
            say: 'Files change over time. Batch 1 has two columns. Batch 2 added a third, `channel`. They sit in two folders of one table. Spark ' + EV.columns_by_default.length + ' columns or ' + EV.columns_with_mergeSchema.length + '? Press Next.',
            tabs: [{ layer: 'RECORDED', name: 'The columns of the table', c: 'raw', cols: ['how it was read', 'columns'], rows: [['by default', EV.columns_by_default.join(', ')], ['with mergeSchema', EV.columns_with_mergeSchema.join(', ')]], trk: 0 }],
            notes: ['Recorded: the columns of the DataFrame in both reads. `batch` comes from the folder names `batch=1` and `batch=2`.']
          },
          {
            say: 'By default Spark reads the schema from **one** file. It did not pick a file with the new column, so `channel` is **missing**. No error, no warning. The column is simply not there.',
            tabs: [{ layer: 'RECORDED', name: 'The columns of the table', c: 'raw', cols: ['how it was read', 'columns'], rows: [['by default', EV.columns_by_default.join(', ')], ['with mergeSchema', EV.columns_with_mergeSchema.join(', ')]], trk: 0, chg: [[0, 1]] }],
            notes: ['Which file Spark picks is not guaranteed, so a result like this can change between runs and machines.']
          },
          {
            say: 'With `option("mergeSchema", "true")` Spark reads **every** footer and merges the schemas. The new column appears, and the old rows get NULL for it: orders 1 and 2 have no channel.',
            tabs: [{ layer: 'RECORDED', name: 'The rows with mergeSchema', c: 'raw', cols: ['order_id', 'total_cents', 'channel', 'batch'], rows: EV.rows_with_merge, trk: 0, chg: [[0, 2], [1, 2]] }],
            notes: ['It is slower, because every footer is read. A table format (Delta, Iceberg) keeps the schema in its own metadata, and does not have this problem.']
          }
        ]
      }),

      B.code({
        id: 'm7-evocode', t: 2, src: 'rec', title: 'The code of the schema test', file: 'layout.py', lang: 'python', code: EVCODE,
        steps: [
          { say: 'The function that wrote the two batches and read them two ways. Press Next.', lines: null },
          { say: 'Two small DataFrames: batch `a` with two columns, batch `b` with a third column `channel`.', lines: G.span(EVCODE, /a = spark\.createDataFrame/, /b = spark\.createDataFrame/) },
          { say: 'Each is written to its own folder, `batch=1` and `batch=2`, so that Spark treats `batch` as a partition column.', lines: G.span(EVCODE, /a\.write/, /b\.write/) },
          { say: 'Then two reads: the plain one, and the one with `mergeSchema`.', lines: G.span(EVCODE, /plain = /, /merged = /) }
        ],
        note: 'Recorded. The same files, two different tables, depending on one option.'
      }),

      B.rows({
        id: 'm7-bucket', t: 2, src: 'rec', title: 'Bucketing: moving the shuffle to write time',
        steps: [
          {
            say: 'Bucketing writes a table already split by a key: `bucketBy(8, "customer_id")` makes 8 buckets, and rows with the same key always land in the same bucket. I wrote the orders and the customers bucketed by `customer_id`, and joined them. Press Next.',
            tabs: [{ layer: 'RECORDED', name: 'Exchanges in the join plan', c: 'raw', cols: ['how the tables were written', 'Exchange lines in the plan'], rows: [['not bucketed', BK.shuffles_without_buckets], ['bucketed by customer_id, 8 buckets each', BK.shuffles_when_bucketed]], trk: 1 }],
            notes: ['Recorded: `explain()` of the join, with broadcasting off so that the join has to be a sort-merge join.']
          },
          {
            say: 'Without buckets, the join has **' + BK.shuffles_without_buckets + '** exchanges, one for each side. With buckets, **' + BK.shuffles_when_bucketed + '**. The rows that must meet are already in matching buckets, so the tasks just read the matching files together.',
            tabs: [{ layer: 'RECORDED', name: 'Exchanges in the join plan', c: 'raw', cols: ['how the tables were written', 'Exchange lines in the plan'], rows: [['not bucketed', BK.shuffles_without_buckets], ['bucketed by customer_id, 8 buckets each', BK.shuffles_when_bucketed]], trk: 1, chg: [[0, 1], [1, 1]] }],
            notes: ['The cost moved to write time. You pay once when you write, and every join after that is cheaper.']
          },
          {
            say: 'The scan says it: `Bucketed: true`. The `Sort` stays, because a bucket can hold several files, and Spark sorts inside a task to merge them. The `Exchange` is gone.',
            tabs: [{ layer: 'RECORDED', name: 'What the scan says', c: 'raw', cols: ['plan line', 'meaning'], rows: [['`FileScan parquet ... Bucketed: true`', 'the files are laid out by bucket'], ['`SortMergeJoin [customer_id], [customer_id]`', 'a sort-merge join, as usual'], ['no `Exchange` above the scans', 'no shuffle']], trk: 0 }],
            notes: ['The plan text is in the recording. Bucketing needs a table in a catalog (`saveAsTable`), and both tables need the same number of buckets.']
          },
          {
            say: 'When to use it: the same two big tables are joined on the same key again and again, and you control how they are written. When not: one-off joins, tables that change their key, or a platform where table formats offer clustering instead.',
            tabs: [{ layer: 'RULE', name: 'Bucketing in one table', c: 'raw', cols: ['use it when', 'avoid it when'], rows: [['the same big tables join on the same key often', 'the join is rare'], ['you write the tables yourself', 'you read tables of others'], ['you can fix the number of buckets', 'the key changes or the data grows a lot']], trk: 0 }],
            notes: ['Delta, Iceberg and Hudi each have their own answer, such as Z-ordering or clustering. They are not the same as Spark buckets.']
          }
        ]
      }),

      B.rows({
        id: 'm7-overwrite', t: 1, src: 'rec', title: 'The overwrite that empties a table',
        steps: [
          {
            say: 'A table holds three days. A daily job fixes **one** day and writes it with `mode("overwrite")` and `partitionBy("day")`. What is left? I tried it with the default setting and with `dynamic`. Press Next.',
            tabs: [{ layer: 'RECORDED', name: 'Folders and rows after the overwrite', c: 'raw', cols: ['partitionOverwriteMode', 'folders before', 'folders after', 'rows after'], rows: [['static (the default: ' + OW.default_mode + ')', OW.static.folders_before.join(', '), OW.static.folders_after.join(', '), OW.static.rows_after], ['dynamic', OW.dynamic.folders_before.join(', '), OW.dynamic.folders_after.join(', '), OW.dynamic.rows_after]], trk: 0 }],
            notes: ['Recorded: 30 rows in three days before. The job writes 5 rows for day 1.']
          },
          {
            say: 'With the **static** default, Spark deleted the **whole table** first, then wrote day 1. Two days are gone: **' + OW.static.rows_after + '** rows remain of 30. There was no warning, and the job succeeded.',
            tabs: [{ layer: 'RECORDED', name: 'Folders and rows after the overwrite', c: 'raw', cols: ['partitionOverwriteMode', 'folders before', 'folders after', 'rows after'], rows: [['static (the default: ' + OW.default_mode + ')', OW.static.folders_before.join(', '), OW.static.folders_after.join(', '), OW.static.rows_after], ['dynamic', OW.dynamic.folders_before.join(', '), OW.dynamic.folders_after.join(', '), OW.dynamic.rows_after]], trk: 0, chg: [[0, 2], [0, 3]] }],
            notes: ['Static means: overwrite the whole target path, no matter which partitions are in the new data.']
          },
          {
            say: 'With **dynamic** mode, Spark replaced only the folder that has data in the new DataFrame, `day=1`, and left the others. **' + OW.dynamic.rows_after + '** rows remain: 10 + 5 + 10. This is what people expect from "overwrite one day".',
            tabs: [{ layer: 'RECORDED', name: 'Folders and rows after the overwrite', c: 'raw', cols: ['partitionOverwriteMode', 'folders before', 'folders after', 'rows after'], rows: [['static (the default: ' + OW.default_mode + ')', OW.static.folders_before.join(', '), OW.static.folders_after.join(', '), OW.static.rows_after], ['dynamic', OW.dynamic.folders_before.join(', '), OW.dynamic.folders_after.join(', '), OW.dynamic.rows_after]], trk: 1, chg: [[1, 2], [1, 3]] }],
            notes: ['Set it for one write with `.option("partitionOverwriteMode", "dynamic")`, or for the session. Delta and Iceberg offer `replaceWhere` and `MERGE` for the same job, with safer rules.']
          }
        ]
      }),

      B.code({
        id: 'm7-owcode', t: 2, src: 'rec', title: 'The overwrite test', file: 'layout.py', lang: 'python', code: OWCODE,
        steps: [
          { say: 'The test, in one function. Press Next.', lines: null },
          { say: 'For each mode, a table of 30 rows is written in three folders, `day=0`, `day=1` and `day=2`. The folders are listed.', lines: G.span(OWCODE, /for mode in/, /before = /) },
          { say: 'The mode is set. Then the fix: 5 rows, all for day 1, written with `mode("overwrite")` and `partitionBy("day")`.', lines: G.span(OWCODE, /partitionOverwriteMode', mode/, /spark\.range\(100, 105\)/) },
          { say: 'The folders and the rows are read again. That gives the table you just saw.', lines: G.span(OWCODE, /after = /, /rows_after/) }
        ],
        note: 'Recorded. The setting is put back to its default after each mode.'
      }),

      B.talk({
        id: 'm7-sizes', t: 2, src: 'docs', title: 'File size targets and the knobs to reach them',
        say: 'There are good sizes for files, and a few tools to hit them. Press Next for each.',
        items: [
          ['The target', 'Files of about **128 MB to 1 GB**, after compression. Smaller files cost more in listing, opening and tasks. Much bigger files cut the parallelism and the benefit of skipping. A table with a hundred thousand files of a few KB is the classic cause of a slow job.', '128 MB to 1 GB.'],
          ['One task for each folder', '`repartition("dt")` before `partitionBy("dt")` sends all rows of a folder to one task, so a folder gets one file. For a folder that is much bigger than the target, repartition by the column and a bucket number, such as `dt` and `floor(rand() * n)`.', 'Repartition by the folder column.'],
          ['A cap on the file size', '`maxRecordsPerFile` cuts a file when it has that many rows. It is a cap, not a target. It cannot merge small files.', 'A cap, not a floor.'],
          ['Fix it afterwards', 'A **compaction** job reads the small files of a folder and rewrites them as a few big ones. Delta has `OPTIMIZE`, and Iceberg has `rewrite_data_files`. Mission 11 records Delta doing it.', 'Compact later, if you must.'],
          ['Partition columns', 'Partition by **low-cardinality** columns that people filter on: a day, a country. Not by a customer id, which makes millions of folders. If a folder would hold under a gigabyte, the partition is too fine.', 'Few values, big folders.']
        ],
        cols: 1,
        call: { k: 'tip', h: 'A quick health check of a table:', t: 'count the files and divide the size by the count. Under 100 MB per file is a warning. Under 10 MB is a problem.' }
      }),

      B.decide({
        id: 'm7-dec', t: 2, src: 'docs', title: 'Decision: the layout of the orders table',
        scenario: 'Brewline writes 2 billion orders a year, about 1 TB of Parquet. Nine out of ten queries filter on the last seven days. Many also filter on one store. Analysts say that a one-day report is slow. You design the layout.',
        opts: [
          { t: 'Partition by day, repartition by the day before the write, and sort inside each folder by store', d: 'Folders for days are skipped, row groups for stores are skipped, and a folder gets a few big files.', lose: '' },
          { t: 'Partition by day and by store', d: 'Both filters become folder filters.', lose: 'With many stores and years you get hundreds of thousands of folders with tiny files, and a listing that is slow even for one query.' },
          { t: 'No partitions, one huge sorted table', d: 'Simple to write.', lose: 'A one-day query cannot skip folders. It depends entirely on row-group statistics, and every append breaks the sort order.' }
        ],
        pick: 0,
        why: 'Use folders for the filter that cuts the most, and sorting for the second one. One file or a few big files per day keeps the listing short, and the sort gives the footer statistics something to skip with.',
        when: 'If only a handful of stores exist and every query names one, partitioning by store as well is fine. The danger is a column that grows.'
      }),

      B.bug({
        id: 'm7-bug', t: 1, q: 'A daily job writes the orders partitioned by day. After a week the table has thousands of files of a few KB and reads are slow. Click the line that causes it.',
        file: 'write_orders.py', lang: 'python',
        code: ['orders = spark.read.parquet("/lake/raw_orders")', 'daily = orders.repartition(200)', 'daily.write.partitionBy("dt").mode("append").parquet("/lake/orders_by_day")'].join('\n'),
        bad: [2],
        hint: 'How many tasks write, and how many folders does each task write to?',
        why: '`repartition(200)` makes 200 tasks, and each holds rows of many days, so each task writes a file into every folder it has rows for. The recording shows it: 200 tasks and 14 folders made **' + n0(perDay200[1]) + '** files of ' + perDay200[3] + ' KB, while `repartition("dt")` made **' + perDayRep[1] + '**.',
        fix: ['orders = spark.read.parquet("/lake/raw_orders")', 'daily = orders.repartition("dt")', 'daily.write.partitionBy("dt").mode("append").parquet("/lake/orders_by_day")'].join('\n'),
        cheer: 'Repartition by the folder column, so each folder gets few, big files.'
      }),

      B.incident({
        id: 'm7-inc', t: 1, src: 'rec', title: 'Incident: yesterday\'s fix deleted last year', time: '07:20',
        alert: '**The curated orders table has only one day in it.** A job that corrects the orders of one day ran at 06:00 and reported success. History for the other days is gone from the folder. The table is partitioned by day.',
        clues: ['The job writes a DataFrame with `mode("overwrite")` and `partitionBy("dt")`', 'The job has run for a year without a problem, but it used to write the whole table every night', 'Nobody set `spark.sql.sources.partitionOverwriteMode`'],
        opts: [
          { t: 'Restore from a backup or a table-format snapshot, then set the overwrite mode to dynamic for this write (or use `replaceWhere` or MERGE), and add a check on the number of partitions after a write', fb: '' },
          { t: 'Run the job again with the full data and say nothing', fb: 'You may not have the full data, and the next fix will do it again.' },
          { t: 'Change the mode to append', fb: 'That would duplicate the corrected day instead of replacing it.' },
          { t: 'Blame the person who wrote the job', fb: 'The default is a trap for everybody. Fix the trap.' }
        ],
        best: 0,
        why: 'With the default **static** mode, `overwrite` replaces the whole target path. In the recording, a table with 3 days was left with **' + OW.static.folders_after.length + '** folder and **' + OW.static.rows_after + '** of 30 rows. With `dynamic` it kept all **' + OW.dynamic.folders_after.length + '** folders and **' + OW.dynamic.rows_after + '** rows.',
        checks: [
          ['Stop the bleeding', 'Pause the jobs that write the table, so that nothing else overwrites it.'],
          ['Recover', 'Restore the folders from a backup, a versioned bucket or a table-format snapshot (Delta time travel).'],
          ['Fix the job', '`partitionOverwriteMode=dynamic` for this write, or use `replaceWhere` / MERGE in a table format.'],
          ['Guard', 'After a write, check the count of partitions and rows against the day before. Make the check fail the pipeline.']
        ],
        tell: 'A one-day correction wiped a year of history, because the default overwrite mode is static and replaces the whole path. I restored the table from the versioned bucket, switched the job to dynamic partition overwrite, and added a check that the partition count does not drop.',
        prevent: ['Set dynamic partition overwrite on any job that writes some partitions', 'Prefer a table format with replaceWhere or MERGE', 'Check partition counts after every write', 'Keep versioning or a backup on the bucket']
      }),

      B.quiz({
        id: 'm7-q1', t: 1,
        q: 'A job with 200 tasks writes with `partitionBy("dt")` into 14 folders, after a shuffle. About how many files does it write?',
        opts: [{ t: '14', fb: 'That is the number of folders.' }, { t: '200', fb: 'That is the number of tasks.' }, { t: 'About 2,800', fb: '' }, { t: '1', fb: 'There is no coalesce.' }],
        ok: 2,
        why: 'Files are tasks times the folders each task writes to. The recording: ' + n0(perDay200[1]) + ' files of ' + perDay200[3] + ' KB.'
      }),

      B.quiz({
        id: 'm7-q2', t: 1,
        q: 'A query filters on a column that is **not** a partition column, and the table has 14 daily folders. How many files does it open, at worst?',
        opts: [{ t: 'One', fb: 'Folders can only be skipped by a partition filter.' }, { t: 'All of them, unless row-group statistics let it skip inside the files', fb: '' }, { t: 'None', fb: 'It has to read something.' }, { t: 'Half', fb: 'There is no such rule.' }],
        ok: 1,
        why: 'In the recording, the `store_id` filter opened ' + TO.rows[2][1] + ' of ' + TO.rows[2][2] + ' files.'
      }),

      B.quiz({
        id: 'm7-q3', t: 1,
        q: 'Why did filter pushdown help on the sorted file and not on the shuffled one?',
        opts: [{ t: 'Pushdown only works on sorted files by design', fb: 'It works on any file. What differs is the data.' }, { t: 'In a sorted file each row group covers a narrow range, so the footer can rule most of them out', fb: '' }, { t: 'The shuffled file was bigger', fb: 'They hold the same rows.' }, { t: 'The shuffled file was not Parquet', fb: 'Both are Parquet.' }],
        ok: 1,
        why: 'Sorted: ' + n0(sortedOn[2]) + ' bytes with pushdown, ' + n0(sortedOff[2]) + ' without. Shuffled: ' + n0(shufOn[2]) + ' and ' + n0(shufOff[2]) + '.'
      }),

      B.quiz({
        id: 'm7-q4', t: 2,
        q: 'Batch 2 of a table adds a column. A plain `spark.read.parquet` does not show it. What do you do?',
        opts: [{ t: 'Nothing, the column does not exist', fb: 'It exists in the second batch.' }, { t: 'Read with `option("mergeSchema", "true")`, or keep the schema in a table format', fb: '' }, { t: 'Rewrite the first batch by hand', fb: 'That is the slow way.' }, { t: 'Turn off pushdown', fb: 'Not related.' }],
        ok: 1,
        why: 'By default Spark takes the schema of one file. The recording: ' + EV.columns_by_default.length + ' columns by default, ' + EV.columns_with_mergeSchema.length + ' with `mergeSchema`.'
      }),

      B.quiz({
        id: 'm7-q5', t: 1,
        q: 'A table has days 1, 2 and 3. A job writes new data for day 2 with `mode("overwrite")` and `partitionBy("day")`, using the default settings. What remains?',
        opts: [{ t: 'Days 1, 2 (new) and 3', fb: 'That needs dynamic mode.' }, { t: 'Only day 2', fb: '' }, { t: 'Days 1, 2 (old and new) and 3', fb: 'Overwrite does not append.' }, { t: 'The job fails', fb: 'It succeeds.' }],
        ok: 1,
        why: 'The default mode is ' + OW.default_mode + ': the whole path is replaced. In the recording ' + OW.static.rows_after + ' of 30 rows remained.'
      }),

      B.order({
        id: 'm7-ord', t: 1, q: 'Put the steps of writing a well laid out partitioned table in order.',
        items: [
          'Choose the partition column: a low-cardinality one that people filter on',
          'Repartition by that column so each folder is written by one task',
          'Sort inside each partition by the second most used filter column',
          'Cap the rows of a file if one folder is huge',
          'Write with the right overwrite mode (dynamic for some partitions)',
          'Count the files and check their size'
        ],
        why: 'The folder column decides the shuffle, the sort decides the footer statistics, and the last step proves that the layout did what you meant.'
      }),

      B.qa({
        id: 'qa-small', t: 1, tag: 'Files', secs: 75,
        q: 'What is the small files problem, and how do you avoid it?',
        pts: ['Files = tasks that write times folders each writes to', 'Each file costs a listing, an open and a task', 'repartition(200) then partitionBy(dt): 2,800 files of 5.5 KB', 'Fix: repartition by the folder column', 'Cap with maxRecordsPerFile; compact with OPTIMIZE', 'Target 128 MB to 1 GB'],
        short: 'The number of files a write makes is the number of tasks that write, times the folders each one writes into. If 200 tasks come out of a shuffle and the table is partitioned by day, every task writes a tiny file into every day: in my test 200 tasks and 14 folders made **2,800 files of about 5.5 KB**. Every file costs a listing, an open and often a task, so reads get slow. I avoid it by repartitioning by the folder column before `partitionBy`, so each folder gets one task, by capping the rows of a file with `maxRecordsPerFile`, and by compacting a table afterwards, for example with `OPTIMIZE` in Delta. I aim for files of 128 MB to 1 GB.',
        fu: [['What about too few files?', 'One big file cannot be read in parallel, and a gzip text file cannot be split at all.'], ['How do you check a table?', 'Count the files and divide the size by the count.']],
        trap: 'Saying that more partitions always make reads faster.',
        real: 'You inherit a table with 5 million files. Walk me through it.'
      }),

      B.qa({
        id: 'qa-pushdown', t: 1, tag: 'Files', secs: 75,
        q: 'What is the difference between partition pruning and predicate pushdown?',
        pts: ['Pruning: partition folders skipped by name', 'Pushdown: filter given to the reader to skip row groups by min and max', 'Plan: PartitionFilters and PushedFilters', 'Pushdown depends on sort order', 'Sorted: 261 KB read; shuffled: 4.7 MB', 'Columnar: only the named columns'],
        short: '**Partition pruning** works on folder names. If the table is partitioned by day and the filter is on the day, Spark never opens the files of other days, and the plan shows `PartitionFilters`. **Predicate pushdown** hands the filter to the Parquet reader, which looks at the **minimum and maximum** of each row group in the footer and skips groups that cannot match; the plan shows `PushedFilters`. Pushdown only helps if the data is ordered so that the groups have narrow ranges. I measured it: filtering on 1,000 ids read about 261 KB from a file sorted by id, and about 4.7 MB from the same rows shuffled. On top of that, Parquet reads only the columns that the query names.',
        fu: [['How do you make pushdown work for a store id?', 'Sort the data inside each partition by it, with `sortWithinPartitions`.'], ['Does a function on the partition column break pruning?', 'It can. A cast was understood in my test, other functions may not be. Check `PartitionFilters` in the plan.']],
        trap: 'Saying that a filter always skips data.',
        real: 'How did you make a slow filter fast without changing the query?'
      }),

      B.qa({
        id: 'qa-overwrite', t: 2, tag: 'Files', secs: 60,
        q: 'What does mode("overwrite") do on a partitioned table?',
        pts: ['Default partitionOverwriteMode is static', 'Static: the whole path is replaced', 'Dynamic: only partitions present in the new data', 'Recorded: 30 rows became 5 (static) or 25 (dynamic)', 'Safer: replaceWhere or MERGE in a table format', 'Check partition counts after a write'],
        short: 'It depends on `spark.sql.sources.partitionOverwriteMode`. The default is **static**: Spark deletes the whole target path and writes the new data, even if the new DataFrame holds only one partition. In my test a table of three days and 30 rows was left with one day and 5 rows. With **dynamic**, Spark replaces only the partitions that appear in the new data and leaves the others, and the table kept 25 rows. So for a job that rewrites some partitions I set dynamic mode on the write. With a table format, I would use `replaceWhere` or a MERGE, and I would check the partition count after every write, and keep a backup.',
        fu: [['What would you use with Delta?', '`replaceWhere` to replace a defined set of partitions, or MERGE for row-level changes. Time travel can undo a mistake.'], ['Does append have the same risk?', 'No, but it duplicates data if the job is run twice, so it needs a way to be idempotent.']],
        trap: 'Using overwrite for a partial rewrite without checking the mode.',
        real: 'Tell me about a job that deleted data, and what you changed after it.'
      }),

      B.recap({
        id: 'm7-recap', n: 7, badge: 'File Folder', color: '#BAE6FD',
        pts: [
          'A Parquet file has **row groups**, a **column chunk** for each column, and a **footer** with min and max.',
          '**Files = tasks that write times folders each one writes to.** 200 tasks into 14 folders made **' + n0(perDay200[1]) + '** files of ' + perDay200[3] + ' KB. `repartition("dt")` made **' + perDayRep[1] + '**.',
          'A filter on the **partition column** opened **' + TO.rows[0][1] + '** of ' + TO.rows[0][2] + ' files. A filter on `store_id` opened all of them.',
          'Pushdown on a **sorted** file read **' + n0(sortedOn[2]) + '** bytes. On a **shuffled** one it read **' + n0(shufOn[2]) + '**. Sort inside the files by the column people filter on.',
          'By default Spark reads the schema of **one** file. Use `mergeSchema`, or a table format. **Bucketing** removed both exchanges of a join.',
          'The default overwrite mode is **' + OW.default_mode + '**: a one-day fix left **' + OW.static.rows_after + '** of 30 rows. Use **dynamic**, or `replaceWhere`.'
        ],
        lines: [
          'I count the files after a write.',
          'I repartition by the folder column before partitionBy.',
          'I never overwrite a partitioned table without checking the mode.'
        ]
      })
    ]
  });
})();
