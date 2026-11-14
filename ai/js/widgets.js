/* Lab widgets for the documents, chunking, vectors, pipeline, evaluation and model API missions. Each one registers LAB.W.<kind>.
   Every number a lab shows comes from js/real.js, which ai/verify/capture_ai.py wrote after running real open-source tools on the Brewline
   documents: parsers, MinHash, FAISS, hnswlib, PostgreSQL with pgvector, BM25, the Anthropic and OpenAI client libraries against a local stand-in
   server. The embeddings are a stand-in (TF-IDF and an SVD), and no language model was used. A lab that only does arithmetic says so. */
(function () {
  var LAB = (window.LAB = window.LAB || {});
  var W = (LAB.W = LAB.W || {});
  var esc = LAB.esc, md = LAB.md, H = LAB.H, G = LAB.get;

  function chips(list, cur, act, fmt) {
    return list.map(function (k) { return '<button type="button" class="sel-chip' + (String(k) === String(cur) ? ' on' : '') + '" data-act="' + act + '" data-v="' + esc(String(k)) + '">' + esc(fmt ? fmt(k) : String(k)) + '</button>'; }).join('');
  }
  function row(label, inner) { return '<div class="lab-row"><span class="lab-l">' + esc(label) + '</span><div class="sel-chips">' + inner + '</div></div>'; }
  function table(cols, rows, rowCls, cellCls) {
    return '<div class="tbl-wrap"><table class="tbl"><thead><tr>' + cols.map(function (c) { return '<th>' + esc(c) + '</th>'; }).join('') + '</tr></thead><tbody>' +
      rows.map(function (r, ri) { return '<tr class="' + (rowCls ? rowCls(r, ri) || '' : '') + '">' + r.map(function (c, ci) { return '<td class="' + (cellCls ? cellCls(r, ri, ci) || '' : '') + '">' + md(String(c)) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>';
  }
  function fmtN(x, d) { return (Math.round(x * Math.pow(10, d || 0)) / Math.pow(10, d || 0)).toLocaleString('en-US', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }); }
  function usd(x) { return '$' + (x >= 100 ? fmtN(x, 0) : x >= 1 ? fmtN(x, 2) : x >= 0.01 ? fmtN(x, 3) : x === 0 ? '0' : x.toPrecision(2)); }
  function bytes(n) { return n >= 1e12 ? fmtN(n / 1e12, 2) + ' TB' : n >= 1e9 ? fmtN(n / 1e9, 2) + ' GB' : n >= 1e6 ? fmtN(n / 1e6, 1) + ' MB' : n >= 1e3 ? fmtN(n / 1e3, 1) + ' KB' : fmtN(n) + ' B'; }
  function code(file, lang, text, hl) { return H.code({ file: file, lang: lang, code: text, hl: hl || null }); }
  function bindCodes(box) { box.querySelectorAll('.code').forEach(function (c) { H.bindCode(c, c.textContent); }); }
  function big(b, span, cls) { return '<div class="big' + (cls ? ' ' + cls : '') + '"><b>' + b + '</b><span>' + span + '</span></div>'; }
  /* a horizontal bar: value from 0 to max */
  function bar(label, v, max, text, cls) {
    var pc = max > 0 ? Math.max(0, Math.min(100, v / max * 100)) : 0;
    return '<div class="lane"><span class="lane-n lane-wide">' + esc(label) + '</span><div class="lane-track"><div class="gbar' + (cls ? ' ' + cls : '') + '" style="left:0;width:' + pc + '%">&nbsp;</div></div><span class="lane-v">' + esc(text) + '</span></div>';
  }
  function callout(k, t) { return '<div class="callout ' + k + '">' + md(t) + '</div>'; }
  function isNum(x) { return x !== '-'; }

  /* ====================== Near-duplicate lab ====================== */
  (function () {
    function pairKey(p) { return p.join(' + '); }
    W.dedup = {
      steps: function () { return 2; },
      hint: 'Pick a pair, then a threshold. Read what gets grouped.',
      say: function (s, i) {
        return [
          'Two copies of the handbook sit in the folder, version 1 and version 2. They differ in two sentences. A set of shingles is every run of five words in a text, and Jaccard similarity is the share that two texts have in common. MinHash estimates it from a small signature, so you never compare whole texts. Pick a pair and compare the exact value with the estimate.',
          'Now the threshold. A locality-sensitive hash puts texts into buckets, and the threshold decides how similar two texts must be to count as the same. Too low groups unrelated files. Too high misses the copy you wanted. Pick a threshold and see which pairs come out.'
        ][i];
      },
      mood: function () { return 'think'; },
      render: function (box, s, i, A) {
        var st = A.local.dd || (A.local.dd = { p: 0, t: 0.5 }), h = '<div class="lab">', T = G.table('docs.dups'), L = G.counts('docs.lsh'), V = G.counts('docs.versions');
        if (i === 0) {
          var r = T.rows[st.p], d = Math.abs(r[2] - r[3]);
          h += row('Pair', chips(T.rows.map(function (x, n) { return n; }), st.p, 'dd-p', function (n) { return T.rows[n][0] + ' and ' + T.rows[n][1]; })) +
            '<div class="lab-out">' + big(r[2], 'exact Jaccard', r[2] > 0.5 ? 'warn' : '') + big(r[3], 'MinHash estimate (' + L.num_perm + ' hashes)') + big(fmtN(d, 3), 'difference') + '</div>' +
            (r[2] > 0.5
              ? callout('tip', 'Almost the same text. The two handbooks share **' + V.shared_sentences + ' sentences** and differ in two: ' + L.v1_v2_differ_in.map(function (x) { return '`' + x + '`'; }).join(' and ') + '. A plain text match would call them different. Keep both, and mark the old one as not current. Do not delete it.')
              : callout('tip', 'Different documents. They still share a little, because every Brewline file ends with the same polite lines. A value of ' + r[2] + ' is background noise, far from the 0.8 of the two handbooks.')) +
            '<p class="lab-note">Shingles are ' + L.shingle_words + '-word runs. The estimate is close to the exact value but never equal, and more hashes give a tighter estimate.</p>';
        } else {
          var sw = L.sweep.filter(function (x) { return x.threshold === st.t; })[0];
          h += row('Threshold', chips(L.sweep.map(function (x) { return x.threshold; }), st.t, 'dd-t')) +
            '<div class="lab-out">' + big(sw.pairs.length, 'pairs grouped', sw.pairs.length ? 'warn' : '') + '</div>' +
            (sw.pairs.length ? '<ul class="keylist">' + sw.pairs.map(function (p) { return '<li>' + esc(pairKey(p)) + '</li>'; }).join('') + '</ul>' : '<p class="lab-note">No pair reaches this threshold.</p>') +
            callout(st.t <= 0.3 ? 'warn' : st.t >= 0.9 ? 'warn' : 'good',
              st.t <= 0.3 ? 'At **0.3** the equipment sheet and the runbook are grouped, because they share boilerplate. A pipeline that deletes the second one of a group would lose a real document.' :
                st.t >= 0.9 ? 'At **0.9** even the two handbooks are missed. They are 0.81 alike, and the threshold is higher than that.' :
                  'At **' + st.t + '** only the two handbooks are grouped. That is the pair a person would call a copy. Choose the threshold on a sample you checked by hand.');
        }
        box.innerHTML = h + '</div>';
        A.bindWidget = function (act, el) { var v = el.getAttribute('data-v'); if (act === 'dd-p') st.p = +v; if (act === 'dd-t') st.t = +v; A.render(true); };
      }
    };
  })();

  /* ====================== Chunking lab ====================== */
  (function () {
    var VERDICT = {
      'fixed 500, no overlap': 'The simplest rule, and the only one that loses a fact: one sentence is cut in two and neither half answers the question. Keep it as the baseline, not as the plan.',
      'fixed 500, overlap 100': 'Overlap repeats the end of a chunk at the start of the next, so a cut fact still sits whole in one chunk. The price is 129 chunks instead of 81: more vectors, and near-copies of the same text in the results.',
      'whole sentences up to 500': 'Never cuts a sentence (0 percent), and every fact is whole. It does not know about headings, so a chunk can start in one section and end in the next.',
      'recursive 500': 'Tries the biggest separator first (blank line), then smaller ones, and only cuts a word as the last resort. Most chunks follow the paragraphs of the writer. It has the best keyword score here.',
      'by heading, up to 500': 'Chunks follow the structure of the document, so each one has a heading to show to the model. Many chunks are tiny (mean 177 characters), which is cheap to read and easy to lose context from.'
    };
    function stat(name) { return G.table('chunk.strategies').rows.filter(function (r) { return r[0] === name; })[0]; }
    W.chunker = {
      steps: function () { return 3; },
      hint: 'Pick a strategy, then a size. Watch what moves.',
      say: function (s, i) {
        return [
          'This is a real cut. A fixed rule of 500 characters, with no overlap, landed inside a phrase of the runbook: the assembly point in a fire. Read the end of the first chunk and the start of the next, and ask which one would answer the question.',
          'Five ways to cut the same 59 documents, each scored with the same 24 questions. The keyword and vector scores are hit at 3: is a right chunk in the top three? Pick a strategy and read the row. No strategy wins on everything.',
          'Size is the other knob. A bigger chunk holds more context and costs more to send to the model, because the top five chunks go into the prompt. A smaller chunk is precise and loses its surroundings. Pick a target size.'
        ][i];
      },
      mood: function (s, i) { return i === 0 ? 'oops' : 'think'; },
      render: function (box, s, i, A) {
        var st = A.local.ck || (A.local.ck = { s: 'recursive 500', z: 500 }), h = '<div class="lab">';
        if (i === 0) {
          var x = G.counts('chunk.split_example');
          h += '<div class="pair"><div><div class="compiled-h">End of chunk 1</div><div class="expr">' + esc('...' + x.end_of_first_chunk) + '<b style="background:#FDE68A;color:#0B1220">|</b></div></div>' +
            '<div><div class="compiled-h">Start of chunk 2</div><div class="expr"><b style="background:#FDE68A;color:#0B1220">|</b>' + esc(x.start_of_next_chunk + '...') + '</div></div></div>' +
            callout('warn', 'The cut is at character **' + x.offset + '**, inside the words `assembly point by the bus stop`. Chunk 1 holds `asse`, chunk 2 holds `mbly point by the bus stop`. A search for "assembly point" matches neither chunk well. The answer exists in the documents and not in any one chunk.') +
            '<p class="lab-note">Document: ' + esc(x.document) + '. Fact ' + esc(x.fact) + ' of the 24-question set. This is the only strategy of the five that loses a fact.</p>';
        } else if (i === 1) {
          var names = G.table('chunk.strategies').rows.map(function (r) { return r[0]; }), r = stat(st.s);
          h += row('Strategy', chips(names, st.s, 'ck-s')) +
            '<div class="lab-out">' + big(r[1], 'chunks') + big(r[2], 'characters on average') + big(r[3] + ' %', 'end in mid-sentence', r[3] > 15 ? 'bad' : r[3] > 0 ? 'warn' : 'good') + big(r[4], 'facts whole in one chunk', r[4].indexOf('26') === 0 ? 'bad' : 'good') + '</div>' +
            bar('keyword search hit@3', r[5], 1, String(r[5])) + bar('vector search hit@3', r[6], 1, String(r[6])) + bar('hybrid hit@3', r[7], 1, String(r[7])) +
            callout('tip', VERDICT[st.s]) +
            '<p class="lab-note">The vector search uses the stand-in embedding (TF-IDF and an SVD), not a neural model. Differences of 0.04 are one question out of 24, so read them as a direction.</p>';
        } else {
          var T = G.table('chunk.sweep'), sizes = T.rows.map(function (r) { return r[0]; }), q = T.rows.filter(function (r) { return r[0] === +st.z; })[0], maxc = Math.max.apply(null, T.rows.map(function (r) { return r[6]; }));
          h += row('Target size', chips(sizes, st.z, 'ck-z', function (k) { return k + ' characters'; })) +
            '<div class="lab-out">' + big(q[1], 'chunks') + big(q[2], 'characters on average') + big(q[3], 'facts whole') + '</div>' +
            bar('hybrid hit@3', q[4], 1, String(q[4])) + bar('hybrid hit@5', q[5], 1, String(q[5])) + bar('characters sent for the top 5', q[6], maxc, fmtN(q[6]) + ' characters', 'bad') +
            callout('tip', q[0] <= 150 ? 'Tiny chunks are cheap to send (' + fmtN(q[6]) + ' characters for five) and miss more questions, because one chunk rarely holds a whole answer.' : q[0] >= 1500 ? 'Large chunks catch the most at 5 (' + q[5] + ') and send **' + fmtN(q[6] / G.table('chunk.sweep').rows[0][6], 1) + ' times** the text of the smallest setting, on every question.' : 'Around 500 characters the score is at its best for hit at 3 in this set, and the prompt stays small. It is a result on 24 questions about 59 short documents. Test your own size on your own questions.');
        }
        box.innerHTML = h + '</div>';
        A.bindWidget = function (act, el) { var v = el.getAttribute('data-v'); if (act === 'ck-s') st.s = v; if (act === 'ck-z') st.z = +v; A.render(true); };
      }
    };
  })();

  /* ====================== Vector lab ====================== */
  (function () {
    var PRESETS = [
      { n: 'same direction, different length', a: [3, 4], b: [6, 8] },
      { n: 'a little different', a: [3, 4], b: [4, 3] },
      { n: 'at a right angle', a: [3, 4], b: [-4, 3] },
      { n: 'opposite directions', a: [3, 4], b: [-3, -4] }
    ];
    function dot(a, b) { return a[0] * b[0] + a[1] * b[1]; }
    function len(a) { return Math.sqrt(dot(a, a)); }
    function unit(a) { var l = len(a); return [a[0] / l, a[1] / l]; }
    function l2(a, b) { return Math.sqrt(Math.pow(a[0] - b[0], 2) + Math.pow(a[1] - b[1], 2)); }
    function cos(a, b) { return dot(a, b) / (len(a) * len(b)); }
    W.vectors = {
      steps: function () { return 3; },
      hint: 'Guess first, then read the number.',
      say: function (s, i) {
        return [
          'Each row is a pair of texts, turned into vectors by the stand-in embedding. Guess: close or far? The score is the cosine similarity, from minus one to one. The stand-in knows only the words of the Brewline files, so it finds shared words and a little more. A real embedding model also links synonyms. I could not run one here, so treat the low scores as the weakness of the stand-in.',
          'Three ways to compare two vectors. The dot product grows with length. Cosine only looks at the angle. Euclidean distance looks at the gap. Pick a pair, then switch on the unit length that most embedding models give their vectors, and see what happens to the three.',
          'A vector costs memory: the number of chunks, times the dimensions, times the bytes of each number. Choose all three, and read the total before you buy a server. The first rows are recorded. The calculator is plain arithmetic.'
        ][i];
      },
      mood: function (s, i) { return 'think'; },
      render: function (box, s, i, A) {
        var st = A.local.vc || (A.local.vc = { g: {}, p: 0, u: false, n: 1e6, d: 1536, b: 32 }), h = '<div class="lab">';
        if (i === 0) {
          var T = G.table('embed.pairs'), done = Object.keys(st.g).length, right = Object.keys(st.g).filter(function (k) { return (st.g[k] === 'close') === (T.rows[+k][2] >= 0.5); }).length;
          h += '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Text A</th><th>Text B</th><th>Your guess</th><th>Cosine</th></tr></thead><tbody>' +
            T.rows.map(function (r, n) {
              var g = st.g[n], cls = g ? ((g === 'close') === (r[2] >= 0.5) ? 'wgood' : 'wbad') : '';
              return '<tr><td>' + esc(r[0].length > 60 ? r[0].slice(0, 57) + '...' : r[0]) + '</td><td>' + esc(r[1].length > 60 ? r[1].slice(0, 57) + '...' : r[1]) + '</td><td>' +
                '<span class="sel-chips"><button type="button" class="sel-chip' + (g === 'close' ? ' on' : '') + '" data-act="vc-g" data-v="' + n + ':close">close</button><button type="button" class="sel-chip' + (g === 'far' ? ' on' : '') + '" data-act="vc-g" data-v="' + n + ':far">far</button></span></td>' +
                '<td class="' + cls + '">' + (g ? '<b>' + r[2] + '</b>' : '?') + '</td></tr>';
            }).join('') + '</tbody></table></div>' +
            '<p class="lab-note">Answered ' + done + ' of ' + T.rows.length + ', right ' + right + '. "Close" means a cosine of 0.5 or more.</p>' +
            (done === T.rows.length ? callout('tip', 'Pairs that share words score high: `power cut` and `electricity is cut` (' + T.rows[3][2] + '). Pairs that mean the same with other words score low: `tips` and `gratuities` (' + T.rows[4][2] + '). A question and the sentence that answers it (' + T.rows[6][2] + ') sit far apart, because they share few words. This is why the stand-in needs the keyword search beside it, and why a neural model, which maps meaning more than spelling, is the usual choice.') : '');
        } else if (i === 1) {
          var pr = PRESETS[st.p], a = pr.a, b = pr.b, an = st.u ? unit(a) : a, bn = st.u ? unit(b) : b;
          h += row('Pair', chips(PRESETS.map(function (x, n) { return n; }), st.p, 'vc-p', function (n) { return PRESETS[n].n; })) +
            row('Length', chips(['as given', 'unit length'], st.u ? 'unit length' : 'as given', 'vc-u')) +
            '<div class="lab-out">' + big('(' + an.map(function (x) { return fmtN(x, 2); }).join(', ') + ') and (' + bn.map(function (x) { return fmtN(x, 2); }).join(', ') + ')', 'the two vectors') + big(fmtN(dot(an, bn), 3), 'dot product') + big(fmtN(cos(an, bn), 3), 'cosine similarity') + big(fmtN(l2(an, bn), 3), 'Euclidean distance') + '</div>' +
            (st.u ? callout('good', 'With unit length, the **dot product equals the cosine**, and the distance is a function of the cosine: `d squared = 2 - 2 cos`. The three give the same ranking. In the recorded stand-in index (unit length), **' + G.counts('embed.metrics').same_top10_for_cosine_dot_and_l2 + ' of ' + G.counts('embed.metrics').questions + '** questions got the same top 10 from cosine, dot product and distance.') :
              callout('warn', 'Without unit length the three disagree. The first pair has cosine 1 (same direction), yet its dot product (50) and distance (5) say the vectors differ. A longer vector wins on dot product whatever it means. Read the model card: it says whether the vectors have unit length, and which measure the model was trained for.'));
        } else {
          var bytesPer = st.b / 8, total = st.n * st.d * bytesPer, Q = G.counts('embed.quantize'), D = G.counts('ann.data');
          h += row('Chunks', chips([1e5, 1e6, 1e7, 1e8], st.n, 'vc-n', function (k) { return fmtN(k); })) +
            row('Dimensions', chips([384, 768, 1536, 3072], st.d, 'vc-d')) +
            row('Bits per number', chips([32, 16, 8], st.b, 'vc-b')) +
            '<div class="lab-out">' + big(bytes(total), 'for the vectors alone', total > 64e9 ? 'bad' : total > 8e9 ? 'warn' : 'good') + big(fmtN(st.d * bytesPer) + ' bytes', 'for one vector') + '</div>' +
            callout('tip', 'An index on top (a graph for HNSW) adds more: the recorded HNSW index of ' + fmtN(D.vectors) + ' vectors with ' + D.dimensions + ' dimensions needed **' + bytes(G.table('ann.sizes').rows[1][3] * D.vectors) + '**, against ' + bytes(D.bytes_float32) + ' for the numbers themselves. Smaller numbers save memory: in the recorded stand-in the hit at 5 stayed at **' + Q['8']['hit@5'] + '** with 8 bits, 16 bits and 32 bits, on 24 questions. That does not promise the same on your data, so measure it.') +
            '<p class="lab-note">The sizes 384, 768, 1536 and 3072 are typical sizes of embedding models and are only examples. Arithmetic, not a recording.</p>';
        }
        box.innerHTML = h + '</div>';
        A.bindWidget = function (act, el) {
          var v = el.getAttribute('data-v');
          if (act === 'vc-g') { var a = v.split(':'); st.g[a[0]] = a[1]; }
          if (act === 'vc-p') st.p = +v;
          if (act === 'vc-u') st.u = v === 'unit length';
          if (act === 'vc-n') st.n = +v;
          if (act === 'vc-d') st.d = +v;
          if (act === 'vc-b') st.b = +v;
          A.render(true);
        };
      }
    };
    W.vectorsInfo = { cos: cos, dot: dot, l2: l2 };
  })();

  /* ====================== Approximate nearest neighbour lab ====================== */
  (function () {
    function rows(k) { return G.table(k).rows; }
    W.ann = {
      steps: function () { return 3; },
      hint: 'Turn one knob at a time. Watch recall and work.',
      say: function (s, i) {
        return [
          'This is a real HNSW graph from FAISS over ' + fmtN(G.counts('ann.data').vectors) + ' made-up vectors in ' + G.counts('ann.data').clusters + ' clusters. Recall at 10 is the share of the true ten nearest neighbours that the index returned. M is how many links each node keeps. efSearch is how many candidates the search keeps while it walks. Pick both and watch the work per query.',
          'An IVF index cuts the data into lists around centres. A query looks into the nprobe nearest lists only. More lists read means better recall and more work. Find the smallest nprobe that gives a recall of 0.95 or more.',
          'Memory and deletes. A compressed index (product quantisation) stores a few bytes per vector, and it can lose most of the recall. And a delete in an HNSW graph usually hides the point and keeps it. Pick an index type and read the cost.'
        ][i];
      },
      mood: function () { return 'think'; },
      render: function (box, s, i, A) {
        var st = A.local.an || (A.local.an = { m: 16, ef: 32, np: 4, ix: 0 }), h = '<div class="lab">', D = G.counts('ann.data');
        if (i === 0) {
          var T = rows('ann.hnsw'), r = T.filter(function (x) { return x[0] === st.m && x[1] === st.ef; })[0];
          h += row('M (links)', chips([8, 16, 32], st.m, 'an-m')) + row('efSearch', chips([8, 16, 32, 64, 128, 256], st.ef, 'an-e')) +
            '<div class="lab-out">' + big(r[2], 'recall at 10', r[2] >= 0.95 ? 'good' : r[2] >= 0.85 ? 'warn' : 'bad') + big(fmtN(r[3]), 'distances computed per query') + big(r[4] + ' %', 'of the ' + fmtN(D.vectors) + ' vectors compared') + '</div>' +
            bar('recall at 10', r[2], 1, String(r[2]), r[2] >= 0.95 ? '' : 'bad') + bar('work: share of the data compared', r[4], 100, r[4] + ' %') +
            callout('tip', r[2] >= 0.99 ? 'Near perfect, at **' + r[4] + ' percent** of the work of an exact search. Raising efSearch further costs more distances and buys little.' : r[2] >= 0.95 ? 'A common target. Compare it with the setting that gives 0.99: how much more work is that last bit of recall?' : 'Fast, and it misses **' + fmtN((1 - r[2]) * 10, 1) + ' of every 10** true neighbours on average. For a retrieval step that feeds a model, a missed chunk is a missed fact.') +
            '<p class="lab-note">Recorded with FAISS ' + G.meta('faiss-cpu') + ' on made-up Gaussian clusters. Real embeddings are not that tidy, so the best settings on your data differ. Build time is not compared, because it depends on the machine.</p>';
        } else if (i === 1) {
          var V = rows('ann.ivf'), r2 = V.filter(function (x) { return x[0] === st.np; })[0], best = V.filter(function (x) { return x[1] >= 0.95; })[0], hb = rows('ann.hnsw').filter(function (x) { return x[2] >= 0.95; }).sort(function (a, b) { return a[3] - b[3]; })[0];
          h += row('nprobe (lists read)', chips(V.map(function (x) { return x[0]; }), st.np, 'an-n')) +
            '<div class="lab-out">' + big(r2[1], 'recall at 10', r2[1] >= 0.95 ? 'good' : r2[1] >= 0.8 ? 'warn' : 'bad') + big(fmtN(r2[2]), 'vectors compared per query') + big(r2[3] + ' %', 'of the data') + '</div>' +
            bar('recall at 10', r2[1], 1, String(r2[1]), r2[1] >= 0.95 ? '' : 'bad') + bar('work: share of the data compared', r2[3], 100, r2[3] + ' %') +
            callout('tip', 'The smallest nprobe with a recall of 0.95 or more is **' + best[0] + '** (' + best[3] + ' percent of the data). The cheapest HNSW setting in the table with that recall compares **' + hb[4] + ' percent**. Both beat the exact search, and they pay for it with a build step and settings to tune.') +
            '<p class="lab-note">IVF needs training: the centres come from a sample of the data, so an index built on a few rows has poor lists. Build it after the data is loaded.</p>';
        } else {
          var S = rows('ann.sizes'), r3 = S[st.ix], P = rows('ann.pq'), del = G.counts('ann.delete');
          h += row('Index', chips(S.map(function (x, n) { return n; }), st.ix, 'an-i', function (n) { return S[n][0]; })) +
            '<div class="lab-out">' + big(r3[1] + ' bytes', 'of vector data for each vector') + big(r3[3] + ' bytes', 'for each vector, whole index') + big(r3[2], 'recall at 10', r3[2] >= 0.95 ? 'good' : 'bad') + '</div>' +
            table(P.length ? G.table('ann.pq').cols : [], P) +
            callout('warn', 'Compression is a trade. At 8 bytes per vector the recall fell to **' + P[0][2] + '**, and at 32 bytes it is **' + P[2][2] + '**. Check the recall on your own questions before you shrink an index, and keep the exact vectors to rerank the survivors.') +
            callout('tip', '**Deletes.** In ' + esc(del.library) + ' I marked item ' + del.deleted_label + ' as deleted. It left the results (' + (del.still_in_results_after_delete ? 'still there' : 'it is gone from the top 5') + '), and the index still held **' + fmtN(del.elements_after_mark_deleted) + ' of ' + fmtN(del.elements_before) + '** elements. The point is hidden, not freed. The memory comes back when you rebuild the index. When a document with personal data must be erased, plan the rebuild too.');
        }
        box.innerHTML = h + '</div>';
        A.bindWidget = function (act, el) { var v = el.getAttribute('data-v'); if (act === 'an-m') st.m = +v; if (act === 'an-e') st.ef = +v; if (act === 'an-n') st.np = +v; if (act === 'an-i') st.ix = +v; A.render(true); };
      }
    };
  })();

  /* ====================== pgvector lab ====================== */
  (function () {
    W.pgv = {
      steps: function () { return 3; },
      hint: 'Pick a tenant, then a setting. Read what the database returned.',
      say: function (s, i) {
        return [
          'This is PostgreSQL ' + G.counts('pg.versions').postgres.replace(/ on .*/, '') + ' with pgvector ' + G.counts('pg.versions').pgvector + ', running on this machine, with 30,000 rows that belong to three tenants. I asked for the ten nearest neighbours of a vector where tenant equals one of them. Pick a tenant. The small tenant gets back almost nothing.',
          'Two settings that move recall. In an HNSW index, hnsw.ef_search is the size of the candidate list. In an IVFFlat index, ivfflat.probes is the number of lists read. Pick a value and read the recall against an exact search.',
          'Things that go wrong in a table you did not plan. A limit above ef_search returns fewer rows than you asked for. The index can be bigger than the table. And an IVFFlat index built on a nearly empty table is documented to be poor. Read each one.'
        ][i];
      },
      mood: function (s, i) { return i === 0 ? 'oops' : 'think'; },
      render: function (box, s, i, A) {
        var st = A.local.pg || (A.local.pg = { t: 1, ef: 40, pr: 1 }), h = '<div class="lab">';
        if (i === 0) {
          var T = G.table('pg.filter'), r = T.rows.filter(function (x) { return x[0] === st.t; })[0], IT = G.counts('pg.iterative');
          h += row('Tenant', chips([1, 2, 3], st.t, 'pg-t', function (k) { return 'tenant ' + k; })) +
            '<div class="lab-out">' + big(r[1], 'of the rows belong to this tenant') + big(fmtN(r[2], 1), 'rows returned for LIMIT 10', r[2] < 10 ? 'bad' : 'good') + big(r[3], 'rows with iterative scan', 'good') + big(r[4], 'recall at 10 with iterative scan') + '</div>' +
            code('query.sql', 'sql', "SELECT id FROM chunks\nWHERE tenant = " + st.t + "\nORDER BY embedding <=> $1\nLIMIT 10;") +
            callout(r[2] < 10 ? 'warn' : 'tip', r[2] < 10 ? 'The index returns its **' + IT.ef_search_default + ' best candidates** (hnsw.ef_search), and then the filter removes the rows of other tenants. Tenant ' + st.t + ' owns ' + r[1] + ' of the rows, so on average **' + fmtN(r[2], 1) + '** of 10 survive. The query is correct and the answer is short. A silent short answer looks like "no relevant chunks".' : 'The big tenant owns most of the rows, so the filter removes few of the candidates, and ten rows come back. The trouble shows up for the small tenants.') +
            callout('tip', 'pgvector 0.8 can keep scanning the index until it has enough rows: `' + IT.setting + '`. The scan stops at **' + fmtN(+IT.max_scan_tuples_default) + '** tuples by default (`hnsw.max_scan_tuples`). With it, every tenant got 10 rows back, and the recall at 10 was about 0.98. Other fixes: a partial index for each large tenant, or a separate table or index for each tenant when there are few of them.');
        } else if (i === 1) {
          var E = G.table('pg.hnsw_recall'), I = G.table('pg.ivfflat'), er = E.rows.filter(function (x) { return x[0] === st.ef; })[0] || E.rows[2], ir = I.rows.filter(function (x) { return x[0] === st.pr; })[0] || I.rows[0];
          h += row('hnsw.ef_search', chips(E.rows.map(function (x) { return x[0]; }), st.ef, 'pg-e')) + row('ivfflat.probes', chips(I.rows.map(function (x) { return x[0]; }), st.pr, 'pg-p')) +
            '<div class="lab-out">' + big(er[1], 'HNSW recall at 10', er[1] >= 0.98 ? 'good' : er[1] >= 0.9 ? 'warn' : 'bad') + big(ir[1], 'IVFFlat recall at 10', ir[1] >= 0.98 ? 'good' : 'bad') + '</div>' +
            code('settings.sql', 'sql', 'SET hnsw.ef_search = ' + er[0] + ';\nSET ivfflat.probes = ' + ir[0] + ';') +
            callout('tip', 'Both are settings of one session or one query, so a service can raise them for the questions that matter and lower them for the cheap ones. The default of **' + G.counts('pg.iterative').ef_search_default + '** for ef_search gave **' + E.rows[2][1] + '** here. The IVFFlat index was built after the data was loaded. With one list read the recall was **' + I.rows[0][1] + '**, and with 5 it was **' + I.rows[1][1] + '**.') +
            '<p class="lab-note">Recall is measured against an exact search on the same table. The data is made-up Gaussian clusters, so the numbers are easy ones. Rebuild the test with your own vectors.</p>';
        } else {
          var L = G.counts('pg.limit'), tb = G.counts('pg.table'), pl = G.counts('pg.plan_hnsw'), ex = G.counts('pg.plan_exact'), er2 = G.counts('pg.ivfflat_early');
          h += '<div class="lab-out">' + big(L.rows_with_ef_search_40, 'rows for LIMIT ' + L.limit + ', ef_search 40', 'bad') + big(L.rows_with_ef_search_200, 'rows for LIMIT ' + L.limit + ', ef_search 200', 'good') + big(bytes(pl.index_bytes), 'the HNSW index') + big(bytes(tb.table_bytes), 'the table') + '</div>' +
            callout('warn', '**A limit above ef_search.** An HNSW scan cannot return more rows than its candidate list holds, so `LIMIT ' + L.limit + '` with the default list of 40 returned **' + L.rows_with_ef_search_40 + '** rows. Raise hnsw.ef_search to at least the limit.') +
            callout('warn', '**The index is bigger than the table.** ' + fmtN(tb.rows) + ' rows of ' + tb.dimensions + ' numbers take ' + bytes(tb.table_bytes) + '. The HNSW index took ' + bytes(pl.index_bytes) + ' (' + fmtN(pl.index_bytes_per_row, 0) + ' bytes per row), because the graph keeps links. Plan the memory of the database for the index, and use half-precision vectors (`halfvec`, ' + tb.column_bytes_halfvec64 + ' against ' + tb.column_bytes_vector64 + ' bytes of column data) when the recall allows.') +
            callout('tip', '**The plan.** The exact query shows `' + ex.plan[3].trim().replace('->  ', '') + '` under a `Sort`, so it reads every row. With the index the plan is `' + pl.plan[1].trim().replace('->  ', '') + '`. Use `EXPLAIN` to check that the planner picked the index, because a filter or a small table can make it pick the scan.') +
            callout('tip', '**IVFFlat built too early.** The documentation says to build the index after the data is loaded, because the lists come from the rows that exist. I built one on ' + er2.rows_when_built + ' rows and then loaded ' + fmtN(er2.rows_loaded_after) + ' more. In this test the recall at ' + er2.probes + ' probes was still **' + er2['recall@10'] + '**, because the made-up clusters are easy. I could not reproduce a loss here, and I keep the advice.');
        }
        box.innerHTML = h + '</div>';
        bindCodes(box);
        A.bindWidget = function (act, el) { var v = el.getAttribute('data-v'); if (act === 'pg-t') st.t = +v; if (act === 'pg-e') st.ef = +v; if (act === 'pg-p') st.pr = +v; A.render(true); };
      }
    };
  })();

  /* ====================== Retrieval scoring lab ====================== */
  (function () {
    var METRICS = ['hit@1', 'hit@3', 'hit@5', 'MRR@10'];
    var METHODS = ['BM25 rank', 'vector rank', 'hybrid rank'];
    function dcg(rels) { return rels.reduce(function (a, r, n) { return a + (r ? 1 / Math.log2(n + 2) : 0); }, 0); }
    /* ranked: array of 0/1 for the top 10; total: how many relevant chunks exist */
    function metrics(ranked, total) {
      var first = ranked.indexOf(1), ideal = dcg(new Array(Math.min(total, 10)).fill(1));
      return { hit1: ranked.slice(0, 1).indexOf(1) >= 0 ? 1 : 0, hit3: ranked.slice(0, 3).indexOf(1) >= 0 ? 1 : 0, hit5: ranked.slice(0, 5).indexOf(1) >= 0 ? 1 : 0, mrr: first >= 0 ? 1 / (first + 1) : 0, ndcg: ideal ? dcg(ranked) / ideal : 0 };
    }
    function score(ci, metric, kind) {
      var T = G.table('search.questions'), rows = T.rows.filter(function (r) { return !kind || kind === 'all' || r[1] === kind; }), n = rows.length, c = 0, m = 0;
      rows.forEach(function (r) {
        var x = r[ci];
        if (metric === 'hit@1' && isNum(x) && x <= 1) c++;
        if (metric === 'hit@3' && isNum(x) && x <= 3) c++;
        if (metric === 'hit@5' && isNum(x) && x <= 5) c++;
        if (metric === 'MRR@10' && isNum(x) && x <= 10) m += 1 / x;
      });
      return { n: n, count: c, value: metric === 'MRR@10' ? m / n : c / n };
    }
    W.rank = {
      steps: function () { return 3; },
      hint: 'Score the methods, then the toy list, then the fusion.',
      say: function (s, i) {
        return [
          'This is the scoreboard for the 24 Brewline questions and three ways to search. For each question the recording stores the rank of the first right chunk, and "-" means it was not in the top 10. Pick a method, a metric and a kind of question. Notice what the average hides: some kinds of question fail for one method and pass for another.',
          'Now compute it by hand. Here is one ranked list of ten chunks. Click the ones that are right. Hit at k asks whether any right chunk is in the top k. MRR looks only at the first right chunk. nDCG rewards every right chunk, and more when it is higher.',
          'Reciprocal rank fusion combines two ranked lists without comparing their scores. A chunk gets 1 over k plus its rank, from each list, and the scores are added. Pick a question and a k. This is the arithmetic for the right chunk only. The recorded hybrid rank is in the last column.'
        ][i];
      },
      mood: function () { return 'think'; },
      render: function (box, s, i, A) {
        var st = A.local.rk || (A.local.rk = { m: 0, mt: 'hit@3', k: 'all', rel: [0, 1, 0, 0, 1, 0, 0, 0, 0, 0], q: 8, rk: 60 }), h = '<div class="lab">', T = G.table('search.questions');
        if (i === 0) {
          var kinds = ['all', 'words', 'meaning', 'number', 'code', 'table', 'stale'], r = score(3 + st.m, st.mt, st.k), max = st.mt === 'MRR@10' ? 1 : 1;
          h += row('Method', chips(METHODS.map(function (x, n) { return n; }), st.m, 'rk-m', function (n) { return METHODS[n].replace(' rank', ''); })) + row('Metric', chips(METRICS, st.mt, 'rk-t')) + row('Questions', chips(kinds, st.k, 'rk-k', function (k) { return k + (k === 'all' ? '' : ' (' + T.rows.filter(function (x) { return x[1] === k; }).length + ')'); })) +
            '<div class="lab-out">' + big(fmtN(r.value, 3), st.mt + ' over ' + r.n + ' questions', r.value >= 0.85 ? 'good' : r.value >= 0.7 ? 'warn' : 'bad') + (st.mt === 'MRR@10' ? '' : big(r.count + ' of ' + r.n, 'questions with a right chunk in the top ' + st.mt.slice(4))) + '</div>' +
            T.rows.filter(function (x) { return st.k === 'all' || x[1] === st.k; }).map(function (x) { return bar(x[0] + ' ' + x[1], isNum(x[3 + st.m]) ? 11 - x[3 + st.m] : 0, 10, isNum(x[3 + st.m]) ? 'rank ' + x[3 + st.m] : 'not in top 10', isNum(x[3 + st.m]) && x[3 + st.m] <= 3 ? '' : 'bad'); }).join('') +
            callout('tip', st.k === 'meaning' ? 'The **meaning** questions are the hard ones: the words of the question are not the words of the answer. Compare the vector method with the keyword method here. Neither reaches the score it has on questions that repeat the words of the document.' : st.k === 'table' ? 'The table question is the one a vector search of the stand-in loses (rank ' + T.rows.filter(function (x) { return x[1] === 'table'; })[0][4] + '), because the parser flattened the table into a row of words. The keyword search finds it at rank 1.' : 'Averages hide the kind of question. Score by kind before you decide a method is better, and keep the questions where it fails.') +
            '<p class="lab-note">hit@k and MRR@10 are computed here from the recorded ranks and match the recorded scoreboard. nDCG needs every right chunk of a question and is shown in the next step.</p>';
        } else if (i === 1) {
          var ranked = st.rel, total = 2, m = metrics(ranked, total);
          h += '<div class="lab-out">' + big(m.hit3, 'hit at 3', m.hit3 ? 'good' : 'bad') + big(m.hit5, 'hit at 5', m.hit5 ? 'good' : 'bad') + big(fmtN(m.mrr, 3), 'MRR', m.mrr >= 0.5 ? 'good' : 'warn') + big(fmtN(m.ndcg, 3), 'nDCG at 10') + '</div>' +
            '<div class="skipgrid">' + ranked.map(function (x, n) { return '<button type="button" class="skf ' + (x ? 'read' : 'skipped') + '" data-act="rk-r" data-v="' + n + '"><b>' + (n + 1) + '</b><span>' + (x ? 'right' : 'wrong') + '</span></button>'; }).join('') + '</div>' +
            '<p class="lab-note">Two chunks in the whole index are right, so the ideal list has them at positions 1 and 2. Click a position to flip it.</p>' +
            callout('tip', '`MRR = 1 / rank of the first right chunk` = ' + (m.mrr ? '1/' + (ranked.indexOf(1) + 1) : '0') + '. `nDCG = DCG / ideal DCG`, where each right chunk adds `1 / log2(position + 1)`. Moving a right chunk from position 5 to position 1 changes hit at 3 and MRR a lot, and nDCG too. Use hit at k when you read k chunks, MRR when only the first matters, nDCG when order matters.');
        } else {
          var q = T.rows[st.q], b = q[3], v = q[4], hy = q[5], sc = (isNum(b) ? 1 / (st.rk + b) : 0) + (isNum(v) ? 1 / (st.rk + v) : 0);
          h += row('Question', chips(T.rows.map(function (x, n) { return n; }).filter(function (n) { return T.rows[n][1] === 'meaning' || n % 6 === 0; }), st.q, 'rk-q', function (n) { return T.rows[n][0]; })) + row('k', chips([10, 60], st.rk, 'rk-c')) +
            '<div class="callout tip"><b>' + esc(q[2]) + '</b></div>' +
            table(['BM25 rank', 'vector rank', 'RRF score of the right chunk', 'recorded hybrid rank'], [[isNum(b) ? b : 'not in top 10', isNum(v) ? v : 'not in top 10', (isNum(b) ? '1/(' + st.rk + '+' + b + ')' : '0') + ' + ' + (isNum(v) ? '1/(' + st.rk + '+' + v + ')' : '0') + ' = ' + fmtN(sc, 4), isNum(hy) ? hy : 'not in top 10']]) +
            callout('tip', 'A chunk that is high in **both** lists gets the most. A chunk that one list ranks first and the other misses still gets ' + fmtN(1 / (st.rk + 1), 4) + '. The constant k softens the first places: with a small k, rank 1 counts for much more than rank 2. Reciprocal rank fusion needs no score scaling, which is why it is a common first choice. Weights between the lists are a second knob that you tune on your questions.');
        }
        box.innerHTML = h + '</div>';
        A.bindWidget = function (act, el) {
          var v = el.getAttribute('data-v');
          if (act === 'rk-m') st.m = +v; if (act === 'rk-t') st.mt = v; if (act === 'rk-k') st.k = v;
          if (act === 'rk-r') st.rel[+v] = st.rel[+v] ? 0 : 1;
          if (act === 'rk-q') st.q = +v; if (act === 'rk-c') st.rk = +v;
          A.render(true);
        };
      }
    };
    W.rankInfo = { metrics: metrics, score: score, dcg: dcg };
  })();

  /* ====================== Access control lab ====================== */
  (function () {
    W.acl = {
      steps: function () { return 2; },
      hint: 'Move the filter, and count what leaks.',
      say: function (s, i) {
        return [
          'A store manager asks a question. The manager may read the all-staff and the manager documents, and not the finance and HR ones. I ran the 24 questions three ways: no filter, a filter applied to the top five after the search, and a filter inside the search. Pick one and count the restricted chunks in the top five.',
          'Ten of the 24 questions put a restricted chunk in the top five. For seven, the answer itself lives in a restricted document. The right behaviour there is to say "I cannot find that for your role", not to guess. Read the ten questions.'
        ][i];
      },
      mood: function (s, i) { return i === 0 ? 'oops' : 'think'; },
      render: function (box, s, i, A) {
        var st = A.local.ac || (A.local.ac = { f: 'none' }), h = '<div class="lab">', C = G.counts('search.acl');
        if (i === 0) {
          var slots = C.questions * 5, leaks = st.f === 'none' ? C.restricted_chunks_in_top5_no_filter : 0, lost = st.f === 'after' ? C.slots_lost_when_filtering_after_search : 0;
          h += row('Where the filter runs', chips(['none', 'after', 'inside'], st.f, 'ac-f', function (k) { return k === 'none' ? 'no filter' : k === 'after' ? 'after the search, on the top 5' : 'inside the search'; })) +
            '<div class="lab-out">' + big(leaks, 'restricted chunks in the top 5 (of ' + slots + ' places)', leaks ? 'bad' : 'good') + big(lost, 'places left empty', lost ? 'warn' : 'good') + big(st.f === 'none' ? C.questions_with_a_leak : 0, 'questions with a leak', st.f === 'none' ? 'bad' : 'good') + '</div>' +
            (st.f === 'none' ? callout('warn', 'Every question for a **' + esc(C.role) + '** returned a ranked list, and in **' + leaks + '** places the chunk came from a document that role may not read. Retrieval does not know about roles. Whatever sits in the index can come out.') :
              st.f === 'after' ? callout('warn', 'Nothing leaks, and **' + lost + '** places are empty, because the restricted chunks took them and were then removed. The model gets fewer chunks, sometimes none, and the answer gets worse for the people with the fewest rights. Post-filtering is safe and lossy.') :
                callout('good', 'The filter is part of the search, so a chunk that may not be read is never a candidate. Nothing leaks, and the five places are filled with chunks the role may read. Most vector databases and pgvector support a filter on a label next to the vector. The labels travel with each chunk from the document, set at ingestion.')) +
            '<p class="lab-note">Recorded with the stand-in embedding and BM25 fused by reciprocal rank. The role is ' + esc(C.role) + ', allowed: ' + C.allowed_audiences.join(', ') + '.</p>';
        } else {
          var T = G.table('search.acl_questions');
          h += table(T.cols, T.rows, null, function (r, ri, ci) { return ci === 2 ? (T.rows[ri][2] === 'yes' ? 'wbad' : 'wgood') : ''; }) +
            callout('tip', '**' + C.questions_whose_answer_is_in_a_restricted_document + ' of the ' + C.questions + '** questions have their answer in a document that this role may not read. If the system answers them, it has leaked, even with a perfect filter in front of the chunks, for example from the memory of the model or from a cache that another role filled. A cache key needs the role in it, and an evaluation set needs questions that must be refused.');
        }
        box.innerHTML = h + '</div>';
        A.bindWidget = function (act, el) { if (act === 'ac-f') st.f = el.getAttribute('data-v'); A.render(true); };
      }
    };
  })();

  /* ====================== Ingestion run lab ====================== */
  (function () {
    function runs() { return G.table('pipeline.runs').rows; }
    W.pipeline = {
      steps: function () { return 3; },
      hint: 'Pick a run. What did it cost?',
      say: function (s, i) {
        return [
          'I ran the same ingestion code six times on the 59 documents, changing one thing between runs. Pick a run and read what it did. A good pipeline does work in proportion to the change. The embeddings are the expensive part, so count them.',
          'A new embedding model means a new index. Never edit the live one. Build the new index beside it, score both on the same questions, and switch an alias in one small write. Step through it, and try to switch before the score is in.',
          'What happens if the query comes from one model and the index from another? Pick a combination and read the recorded result.'
        ][i];
      },
      mood: function () { return 'think'; },
      render: function (box, s, i, A) {
        var st = A.local.pl || (A.local.pl = { r: 0, a: 0, mx: 0 }), h = '<div class="lab">', N = G.counts('pipeline.notes');
        if (i === 0) {
          var R = runs(), r = R[st.r], maxE = Math.max.apply(null, R.map(function (x) { return x[5]; }));
          h += row('Run', chips(R.map(function (x, n) { return n; }), st.r, 'pl-r', function (n) { return R[n][0]; })) +
            '<div class="lab-out">' + big(r[2], 'chunks added') + big(r[3], 'chunks unchanged') + big(r[4], 'chunks removed') + big(r[5], 'embeddings computed', r[5] > 10 ? 'bad' : r[5] ? 'warn' : 'good') + big(r[6], 'label updates') + '</div>' +
            bar('embeddings computed', r[5], maxE, String(r[5]), r[5] > 10 ? 'bad' : '') +
            callout('tip', [
              'Every document is new, so every chunk is embedded: **' + r[5] + '**. This is the expensive run, and it should happen once.',
              'The files are the same, so the pipeline found nothing to do: **0** embeddings, **' + r[3] + '** chunks unchanged. A nightly job that re-embeds everything pays this bill every night for nothing.',
              'One sentence changed: 1 chunk gone, 1 chunk new, 1 embedding. The id of a chunk is a hash of its text, so only the changed chunk is different. The answer changed from `' + (N.answer_before_edit.match(/within (\d+) days/) || [0, '?'])[1] + ' days` to `' + (N.answer_after_edit.match(/within (\d+) days/) || [0, '?'])[1] + ' days`, and no other chunk was touched.',
              'A delete is a run too. The glossary was removed, its **' + N.glossary_chunks_deleted + '** chunks left the index, and searches found **' + N.glossary_hits_after_delete + '** of its words afterwards. Without this step an old document keeps answering questions.',
              'Only a label changed: the FAQ may now be read by managers only. One document row was updated and **0** embeddings were computed. Afterwards managers saw ' + N.faq_chunks_visible_to_managers_after + ' FAQ chunks and staff saw ' + N.faq_chunks_visible_to_staff_after + '.',
              'The handbook is marked as not current. Again a label, again no embedding. Searches with the current-only filter returned **' + N.current_only_hits_from_handbook_v2 + '** chunks of it.'
            ][st.r]) +
            '<p class="lab-note">Ingestion code: <code>ingest.py</code>, shown in the mission. The embedder is the stand-in, so "computed" means one call of it. With a hosted model each is a billed call.</p>';
        } else if (i === 1) {
          var steps = N.alias_steps, labels = ['Build the new index', 'Score both', 'Switch the alias', 'Keep the old one a day'], live = st.a >= 3 ? 'index-v2' : 'index-v1';
          h += '<div class="lab-out">' + big(live, 'the alias points here', live === 'index-v2' ? 'good' : '') + big(N['hit@3_old_model_index'], 'hit at 3, old index') + big(N['hit@3_new_model_index'], 'hit at 3, new index', 'good') + '</div>' +
            '<ol class="chain">' + [steps[1], steps[2], steps[3], steps[4]].map(function (t, n) { return '<li class="' + (n < st.a ? 'used' : '') + '"><div><b>' + labels[n] + '</b><br><span>' + esc(t) + '</span></div></li>'; }).join('') + '</ol>' +
            '<div class="sel-chips"><button type="button" class="sel-chip" data-act="pl-a" data-v="next"' + (st.a >= 4 ? ' disabled' : '') + '>' + (st.a >= 4 ? 'Done' : 'Do: ' + labels[st.a]) + '</button><button type="button" class="sel-chip" data-act="pl-a" data-v="reset">Reset</button></div>' +
            (st.a >= 3 ? callout('good', 'The switch is **one small write**. Going back is one write too, because index-v1 is still there. Compare it with editing the live index in place: a half-finished rebuild serves a mix of two models.') : callout('tip', 'While the alias still points to index-v1, every query is served by the old index and users notice nothing. The scores of both indexes decide whether to switch.'));
        } else {
          var V = G.counts('embed.versions'), opts = [
            ['old model, old index', 'hit@5 ' + V['old_model_old_index_hit@5'], 'good', 'The pair that was built together. This is the baseline.'],
            ['new model, new index', 'hit@5 ' + V['new_model_new_index_hit@5'], 'good', 'A rebuilt index with its own model. Also consistent.'],
            ['new query vector, old index, another size', 'error: ' + V.new_query_old_index_other_dimension.replace(/^matmul: /, '').split(' (')[1].replace(')', '').replace(/ is different/, ' differs'), 'bad', 'A different size fails loudly. That is the lucky case.'],
            ['new query vector, old index, same size', 'hit@5 ' + V['new_query_old_index_same_dimension_hit@5'], 'warn', N.mixing]
          ], o = opts[st.mx];
          h += row('Combination', chips(opts.map(function (x, n) { return n; }), st.mx, 'pl-m', function (n) { return opts[n][0]; })) +
            '<div class="lab-out">' + big(o[1], 'recorded result', o[2]) + '</div>' + callout(o[2] === 'bad' ? 'bad' : o[2] === 'warn' ? 'warn' : 'tip', o[3]) +
            callout('tip', 'Store the model id with every vector and with the index, and refuse a query from another model. That check costs a string comparison and removes a whole class of silent errors.');
        }
        box.innerHTML = h + '</div>';
        A.bindWidget = function (act, el) {
          var v = el.getAttribute('data-v');
          if (act === 'pl-r') st.r = +v; if (act === 'pl-m') st.mx = +v;
          if (act === 'pl-a') st.a = v === 'reset' ? 0 : Math.min(4, st.a + 1);
          A.render(true);
        };
      }
    };
  })();

  /* ====================== Tokens and cost lab ====================== */
  (function () {
    var PRICES = [0.25, 1, 3, 15];
    W.tokens = {
      steps: function () { return 3; },
      hint: 'Pick a text, then the numbers of your assistant.',
      say: function (s, i) {
        return [
          'A model reads tokens, not characters. This tokenizer is a small byte-level BPE that I trained on the Brewline text, so it is a stand-in for the tokenizer of any real model. Pick a text. English prose costs about four characters a token. Codes, numbers, JSON and other languages cost far more tokens for the same length.',
          'The bill of a retrieval assistant is the prompt: the rules, the chunks and the question, on every call. Pick how many chunks go in, how many questions arrive, and an example price. Prices here are examples to practise on. Read your own price page.',
          'Four levers cut the bill, and each has a cost in quality or in time. Switch them on and read the result. The multipliers are examples that you set. Providers publish their own, and they change.'
        ][i];
      },
      mood: function () { return 'think'; },
      render: function (box, s, i, A) {
        var st = A.local.tk || (A.local.tk = { x: 0, c: 5, t: 95, q: 1000, p: 1, rk: 0, ca: 0, sm: 0, bt: 0 }), h = '<div class="lab">', M = G.counts('tokens.model');
        if (i === 0) {
          var T = G.table('tokens.samples'), r = T.rows[st.x];
          h += row('Text', chips(T.rows.map(function (x, n) { return n; }), st.x, 'tk-x', function (n) { return T.rows[n][0]; })) +
            '<div class="lab-out">' + big(r[1], 'characters') + big(r[2], 'bytes') + big(r[3], 'tokens', r[4] < 2 ? 'bad' : r[4] < 4 ? 'warn' : 'good') + big(r[4], 'characters per token') + '</div>' +
            bar('characters per token', r[4], 5, String(r[4]), r[4] < 2 ? 'bad' : '') +
            callout('tip', r[4] >= 4 ? 'Plain English sits near the average of **' + M.chars_per_token_overall + '** characters per token over all ' + M.chunks + ' chunks (mean ' + M.tokens_per_chunk_mean + ' tokens per chunk, at most ' + M.tokens_per_chunk_max + ').' : r[0] === 'Thai' ? 'Thai takes **' + r[3] + ' tokens** for ' + r[1] + ' characters, because it is made of ' + r[2] + ' bytes and this tokenizer never saw Thai. A real multilingual tokenizer does much better, and still differs by language. A prompt in another script can cost several times more.' : 'Text that is not plain English splits into many small pieces. Product codes, long numbers and JSON cost tokens on every call, so shorten the field names that you send to a model.') +
            '<p class="lab-note">' + esc(M.kind) + '. Vocabulary of ' + fmtN(M.vocab) + ' pieces, trained on ' + fmtN(M.training_chars) + ' characters. Real tokenizers have 100,000 pieces or more, and their counts differ from these.</p>';
        } else if (i === 1) {
          var per = 300 + (st.rk ? 3 : st.c) * st.t + 40, out = 150, inP = PRICES[st.p], outP = inP * 5, perQ = per / 1e6 * inP + out / 1e6 * outP, day = perQ * st.q;
          h += row('Chunks in the prompt', chips([3, 5, 10, 20], st.c, 'tk-c')) + row('Tokens per chunk', chips([95, 200, 400], st.t, 'tk-t')) + row('Questions a day', chips([100, 1000, 10000], st.q, 'tk-q', function (k) { return fmtN(k); })) +
            row('Example price per million input tokens', chips(PRICES, st.p === undefined ? 1 : PRICES[st.p], 'tk-p', function (k) { return '$' + k; })) +
            '<div class="lab-out">' + big(fmtN(per), 'input tokens per question (300 for the rules, 40 for the question)') + big(usd(perQ), 'per question') + big(usd(day), 'per day') + big(usd(day * 30), 'per 30 days', day * 30 > 1000 ? 'bad' : day * 30 > 200 ? 'warn' : 'good') + '</div>' +
            callout('tip', 'The chunks are ' + fmtN(st.c * st.t) + ' of the ' + fmtN(per) + ' tokens, **' + Math.round(st.c * st.t / per * 100) + ' percent** of the input. That is why the size of a chunk and the number of chunks are cost decisions, and why the chunk sweep from the last mission matters. The output is 150 tokens at five times the input price, an example ratio.') +
            '<p class="lab-note">The mean of ' + M.tokens_per_chunk_mean + ' tokens per chunk comes from the recorded stand-in tokenizer. Arithmetic on example prices, not a quote.</p>';
        } else {
          var base = 300 + st.c * st.t + 40, inP2 = PRICES[st.p], k1 = st.rk ? 3 : st.c, tokens = 300 + k1 * st.t + 40, cacheShare = st.ca ? [0, 0.5, 0.9][st.ca] : 0, price = inP2 * (st.sm ? 0.2 : 1), batchF = st.bt ? 0.5 : 1;
          var cost = (tokens * (1 - cacheShare * 0.9) / 1e6 * price + 150 / 1e6 * price * 5) * batchF * st.q * 30, basecost = (base / 1e6 * inP2 + 150 / 1e6 * inP2 * 5) * st.q * 30;
          h += row('Rerank, send 3 chunks', chips(['off', 'on'], st.rk ? 'on' : 'off', 'tk-rk')) + row('Cache the shared prefix', chips(['none', '50 percent of the prompt', '90 percent of the prompt'], ['none', '50 percent of the prompt', '90 percent of the prompt'][st.ca], 'tk-ca')) +
            row('A model at a fifth of the price', chips(['off', 'on'], st.sm ? 'on' : 'off', 'tk-sm')) + row('Batch, answers in hours', chips(['off', 'on'], st.bt ? 'on' : 'off', 'tk-bt')) +
            '<div class="lab-out">' + big(usd(basecost), 'per 30 days, no levers') + big(usd(cost), 'per 30 days, these levers', cost < basecost * 0.5 ? 'good' : cost < basecost ? 'warn' : '') + big(basecost ? Math.round((1 - cost / basecost) * 100) + ' %' : '0 %', 'saved') + '</div>' +
            callout('tip', '**Rerank**: a second model orders ' + st.c + ' chunks and you send 3, which cuts input and can raise quality, and adds a call and some delay. **Cache**: a prefix that repeats (the rules, a long document) costs less on reuse with providers that support it, an example read price of one tenth here. **Smaller model**: cheaper per token, and you must test the answers. **Batch**: a discount for work that can wait, an example of one half here, and no use for a live chat. Measure the quality on your question set after each lever.') +
            '<p class="lab-note">The factors are examples that you can change in your head: cached reads at 10 percent of the input price, a model at 20 percent, a batch discount of 50 percent. Look up your provider.</p>';
        }
        box.innerHTML = h + '</div>';
        A.bindWidget = function (act, el) {
          var v = el.getAttribute('data-v');
          if (act === 'tk-x') st.x = +v; if (act === 'tk-c') st.c = +v; if (act === 'tk-t') st.t = +v; if (act === 'tk-q') st.q = +v; if (act === 'tk-p') st.p = PRICES.indexOf(+v);
          if (act === 'tk-rk') st.rk = v === 'on' ? 1 : 0; if (act === 'tk-ca') st.ca = ['none', '50 percent of the prompt', '90 percent of the prompt'].indexOf(v); if (act === 'tk-sm') st.sm = v === 'on' ? 1 : 0; if (act === 'tk-bt') st.bt = v === 'on' ? 1 : 0;
          A.render(true);
        };
      }
    };
  })();

  /* ====================== Retry and timeout lab ====================== */
  (function () {
    var SDKS = ['anthropic', 'openai'];
    function waits(maxRetries, init, max) { var w = [], n; for (n = 0; n < maxRetries; n++) w.push(Math.min(max, init * Math.pow(2, n))); return w; }
    W.retry = {
      steps: function () { return 2; },
      hint: 'Pick a failure. What does the SDK do on its own?',
      say: function (s, i) {
        return [
          'I pointed the real Anthropic and OpenAI client libraries at a local server that I scripted to fail in six ways, and wrote down every request. Pick an SDK and a failure. Read how many requests went out, what the caller finally got, and how long the SDK waited between them.',
          'The defaults are not safe on their own. The recorded SDKs retry twice, wait from half a second up to eight, and allow ten minutes to read an answer. Choose your numbers and read the worst case for one call, before you put it in a pipeline that has a deadline.'
        ][i];
      },
      mood: function () { return 'think'; },
      render: function (box, s, i, A) {
        var st = A.local.rt || (A.local.rt = { sdk: 'anthropic', f: 0, mr: 2, to: 600 }), h = '<div class="lab">', T = G.table('llm.retries'), K = G.counts('llm.constants');
        if (i === 0) {
          var rows = T.rows.filter(function (r) { return r[0] === st.sdk; }), r = rows[st.f];
          h += row('SDK', chips(SDKS, st.sdk, 'rt-s', function (k) { return k + ' ' + K[k].version; })) + row('Failure', chips(rows.map(function (x, n) { return n; }), st.f, 'rt-f', function (n) { return rows[n][1]; })) +
            '<div class="lab-out">' + big(r[2], 'requests sent') + big(r[3], 'retry count in each request') + big(r[4], 'what the caller got', /returned/.test(r[4]) ? 'good' : 'bad') + '</div>' +
            '<div class="callout tip"><b>Wait between requests:</b> ' + esc(r[5]) + '</div>' +
            callout('tip', /429 with retry-after/.test(r[1]) ? 'The server asked for a pause in a **retry-after** header, and the SDK waited that long. Honour the header: guessing a shorter pause is how a client gets blocked.' : /bad request/.test(r[1]) ? 'A 400 means the request itself is wrong. Retrying cannot fix it, and the SDK did not try again. A retry loop of your own must also skip these.' : /500 three times/.test(r[1]) ? 'Two retries, and then the error reaches your code. Decide what your job does then: park the item, and move on, or stop. Do not retry forever.' : /slower than the timeout/.test(r[1]) ? 'A slow answer counts as a failure after the timeout. The request is sent again, and the model may have started the first one, so a billed call may repeat.' : /retries switched off/.test(r[1]) ? 'With `max_retries=0` the first 429 is raised at once. Use it when your own queue handles the retry.' : 'The SDK retried on its own, with a wait that grows and has some random jitter, so many workers do not retry in the same moment.') +
            '<p class="lab-note">Both libraries are the real ones, and the server is a local stand-in that I scripted. No provider was called. A real service may behave differently, for example in the headers it sends.</p>';
        } else {
          var w = waits(st.mr, K.anthropic.initial_retry_delay, K.anthropic.max_retry_delay), sum = w.reduce(function (a, b) { return a + b; }, 0), worst = (st.mr + 1) * st.to + sum;
          h += row('Retries', chips([0, 2, 5], st.mr, 'rt-m')) + row('Timeout for one request (seconds)', chips([600, 60, 20], st.to, 'rt-t', function (k) { return k + (k === 600 ? ' (SDK default)' : ''); })) +
            '<div class="lab-out">' + big(w.length ? w.map(function (x) { return fmtN(x, 1); }).join(', ') : 'none', 'nominal waits between requests (seconds)') + big(fmtN(sum, 1) + ' s', 'waiting in total') + big(worst >= 3600 ? fmtN(worst / 60, 0) + ' min' : fmtN(worst, 0) + ' s', 'worst case for one call', worst > 600 ? 'bad' : worst > 120 ? 'warn' : 'good') + '</div>' +
            callout(worst > 600 ? 'warn' : 'tip', 'Worst case = (retries + 1) x timeout + waits. With the default read timeout of **' + K.anthropic.timeout.replace(/.*read=(\d+).*/, '$1') + ' seconds** and ' + st.mr + ' retries, one hung call can hold a worker for **' + (worst >= 3600 ? fmtN(worst / 60, 0) + ' minutes' : fmtN(worst, 0) + ' seconds') + '**. A pipeline with a deadline needs a timeout that matches it, and a budget for the whole job, not only for each call.') +
            '<p class="lab-note">The waits are the nominal values: the recorded waits were 0.4 to 0.5 seconds, then 0.8 to 1.0, which is the nominal value with a random jitter that takes up to a fifth off. The constants are from the recorded libraries: initial delay ' + K.anthropic.initial_retry_delay + ' s, maximum ' + K.anthropic.max_retry_delay + ' s, ' + K.anthropic.max_retries + ' retries.</p>';
        }
        box.innerHTML = h + '</div>';
        A.bindWidget = function (act, el) { var v = el.getAttribute('data-v'); if (act === 'rt-s') { st.sdk = v; st.f = 0; } if (act === 'rt-f') st.f = +v; if (act === 'rt-m') st.mr = +v; if (act === 'rt-t') st.to = +v; A.render(true); };
      }
    };
  })();

  /* A scene can show only some steps of a lab: {kind: 'tokens', parts: [0]} or {kind: 'tokens', parts: [1, 2]}. The lab then sees its own step numbers. */
  Object.keys(W).forEach(function (kind) {
    var w = W[kind];
    if (!w || typeof w.steps !== 'function' || w._parts) return;
    var steps = w.steps, say = w.say, mood = w.mood, render = w.render;
    function p(s, i) { return s && s.parts ? s.parts[i] : i; }
    w.steps = function (s) { return s && s.parts ? s.parts.length : steps(s); };
    w.say = function (s, i) { return say(s, p(s, i)); };
    w.mood = function (s, i) { return mood ? mood(s, p(s, i)) : 'happy'; };
    w.render = function (box, s, i, A, o) { return render(box, s, p(s, i), A, o); };
    w._parts = true;
  });
})();
