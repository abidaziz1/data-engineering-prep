/* Mission 14: data for models. Training examples were made from the 27 Brewline facts, dirtied on purpose with repeats and spacing variants, cleaned by
   exact and near de-duplication, and split in two ways: at random, and grouped by fact. The counts and the leak (32 of 32 validation answers also in
   training under a random split, 0 under a grouped one) are recorded. No model was trained, so nothing here says how a trained model would score.
   Preference data, batch inference, features and MLOps come from documentation and common practice, and say so. */
(function () {
  var B = LAB.b, G = LAB.get;
  var FT = G.file('code/finetune.py'), CARD = G.file('finetune/card.json'), TRAIN = G.file('finetune/train_example.jsonl'), PREF = G.file('finetune/preference_example.jsonl');
  var DS = G.counts('finetune.dataset'), SP = G.table('finetune.split').rows;
  G.expect(DS.generated === 162 && DS.after_adding_repeats === 186 && DS.after_exact_dedup === 162 && DS.after_near_dedup === 161 && DS.facts === 27 && DS.repeats_added === 14 && DS.spacing_variants_added === 10, 'the dataset counts');
  G.expect(SP[0][1] === 129 && SP[0][2] === 32 && SP[0][3] === 32 && SP[1][1] === 131 && SP[1][2] === 30 && SP[1][3] === 0, 'the two splits');
  var CJ = JSON.parse(CARD);
  G.expect(CJ.rows === 161 && CJ.removed.exact_duplicates === 24 && CJ.removed.near_duplicates === 1 && CJ.contains_personal_data === false && CJ.known_gaps.length === 2, 'the dataset card');
  var BUG1 = [
    'examples = build_examples(facts, questions)          # about six phrasings of each fact',
    'train, valid = split_random(examples, share=0.2)',
    'model = fine_tune(base_model, train)',
    'print("validation score:", score(model, valid))'
  ].join('\n');
  var FIX1 = BUG1.replace('split_random(examples, share=0.2)', 'split_by_fact(examples, share=0.2)       # every phrasing of a fact stays on one side');
  var BUG2 = [
    'rows = load("chat_logs.jsonl")                       # everything that users wrote this month',
    'train = [r for r in rows if r["thumbs"] == "up"]',
    'model = fine_tune(base_model, train)'
  ].join('\n');
  var FIX2 = [
    'rows = load("chat_logs.jsonl")',
    'rows = [mask_pii(r) for r in rows if r["consent"]]            # only logs that may be used, with personal data masked',
    'reviewed = [r for r in rows if r["thumbs"] == "up" and r["reviewed_by_expert"]]',
    'train, valid = split_by_fact(reviewed)',
    'model = fine_tune(base_model, train)'
  ].join('\n');

  LAB.addChapter({
    id: 'm14', n: 14, title: 'Data for models', short: 'Data for models', blurb: 'Fine-tuning sets, de-duplication, honest splits, dataset cards, batch inference and MLOps data work', minutes: 46,
    focus: ['snap', 'int'],
    goals: [
      'Say **when to fine-tune** and when retrieval is the right tool.',
      'Build a **training set**: examples in the chat format, de-duplicated, free of personal data.',
      'Split **by group**, so that validation measures something new, and explain **leakage**.',
      'Write a **dataset card** that says what the data is and what it is not.',
      'Design **batch inference** pipelines for summaries, labels and embeddings at volume.',
      'Describe the **MLOps data work**: versions, lineage, a registry, and a way to retrain.'
    ],
    say: 'Mission 14 is the data work around models themselves. I made 162 training examples from the 27 Brewline facts, dirtied them on purpose, cleaned them, and split them two ways. With a random split, all 32 validation answers also appeared in training, so a validation score would have measured memory. With a split by fact, none did. No model was trained here. What the recording proves is what the data checks find. Everything about how a trained model behaves is documentation.',
    scenes: [
      B.talk({
        id: 'm14-talk', t: 1, src: 'docs', title: 'Four kinds of data for a model',
        say: 'Data reaches a model in several ways, and each has its own failure. Press Next for the ones that a data engineer builds.',
        items: [
          ['Training examples', 'For supervised fine-tuning: a question or instruction, and the answer that you want. Hundreds of good examples can change the format, the tone or a narrow behaviour. They teach how to answer, not facts that will change next month.', 'Pairs of an input and the answer you want.'],
          ['Preference data', 'For preference tuning: a prompt, a chosen answer and a rejected one. It teaches which of two answers is better, for example a current policy over a superseded one. The labels come from people or from rules, and they are expensive to get right.', 'A prompt, a better answer and a worse one.'],
          ['Evaluation data', 'The questions you score with, kept apart from everything the model has seen. It is the most important set. If it leaks into training, every score is meaningless.', 'Never train on it.'],
          ['Inputs for batch inference', 'Documents to summarise, classify, extract from or embed, at volume, with a model that is already trained. The data work is a pipeline: batching, retries, cost, checks and storage of the results with the model and prompt versions.', 'A big pipeline, a trained model.'],
          ['Where data engineers matter', 'Collecting and cleaning the data, removing duplicates and personal data, splitting honestly, versioning it, documenting it, and keeping a link from a model back to the data that made it.', 'Quality, splits, versions, lineage.']
        ],
        cols: 1
      }),

      B.flow({
        id: 'm14-flow', t: 1, src: 'docs', title: 'Data for a model, from source to production and back', g: 'models', legend: true,
        steps: [
          { say: 'This is the life of a training set. It is a loop, because production produces the examples of the next version. Press Next to follow it.', cap: 'A loop from data to model and back.' },
          { say: 'Step 1 and 2. Sources, such as reviewed answers, tickets and documents, are filtered and de-duplicated. Quality, personal data and repeats are removed here, before anything is trained.', on: ['g1', 'g2'], focus: ['f_src', 'f_clean'], cap: 'Filter, remove repeats and personal data.' },
          { say: 'Step 3 and 4. The examples are written in the training format and split by group. Every phrasing of one fact stays on one side, so that validation holds facts that training never saw.', on: ['g3', 'g4'], focus: ['f_fmt', 'f_split'], cap: 'Format, and split by group.' },
          { say: 'Step 5 and 6. A training run, full or with adapters, produces a model. It is evaluated against the current one on the golden set and the attack set. A model that is not better is not released.', on: ['g5', 'g6'], focus: ['f_train', 'f_eval'], cap: 'Train, then evaluate against the current model.' },
          { say: 'Step 7. A model that is better is registered with its version, the version of its data and its scores. That record is the lineage. Step 8. In production the model serves, and collects thumbs, edits and escalations, which become candidates for new examples, after review.', on: ['g7', 'g8', 'g9'], focus: ['f_reg', 'f_prod', 'f_fb', 'f_src'], cap: 'Register, serve, collect, review, repeat.' }
        ]
      }),

      B.code({
        id: 'm14-code', t: 1, src: 'rec', title: 'Making and checking a training set', file: 'finetune.py', lang: 'python', code: FT,
        steps: [
          { say: 'This is the code that made the Brewline training set and checked it. It makes examples from facts, removes repeats, splits two ways, and counts leaks. No model was trained, so it is only the data side.', lines: null },
          { say: '`examples` takes the 27 current facts and writes six prompts for each, from templates and from the real questions of the golden set. The old facts of the superseded handbook are skipped on purpose: a training set must not teach the old refund window.', lines: G.span(FT, /^def examples/, /return out/) },
          { say: '`norm` lower-cases and squeezes white space, so that two examples that differ only in spacing look the same. `drop_exact` hashes the normalised prompt and answer and keeps the first copy of each. In the recording it removed ' + (DS.after_adding_repeats - DS.after_exact_dedup) + ' rows from ' + DS.after_adding_repeats + '.', lines: G.span(FT, /^def norm/, /^    return out$/) },
          { say: '`split_random` shuffles the examples and cuts. It is what many tutorials use. With six phrasings of each fact it puts the same fact on both sides.', lines: G.span(FT, /^def split_random/, /return \[exs\[i\] for i in idx\[cut:\]\]/) },
          { say: '`split_by_fact` keeps every example of one fact on the same side, so that the validation set holds facts that training never saw. It is the split that you want when the point of the model is to answer about things it was not shown.', lines: G.span(FT, /^def split_by_fact/, /return \[e for e in exs if e\['fact'\] not in held\]/) },
          { say: '`leakage` counts the validation answers that also appear as a training answer. The recording gave ' + SP[0][3] + ' of ' + SP[0][2] + ' for the random split, and ' + SP[1][3] + ' of ' + SP[1][2] + ' for the grouped one.', lines: G.span(FT, /^def leakage/, /return sum\(1 for e in valid/) },
          { say: '`to_jsonl` writes the examples in the chat format, one JSON object to a line. That is the file that a fine-tuning job reads. The next screen shows two of its lines.', lines: G.span(FT, /^def to_jsonl/, /return '\\n'\.join/) }
        ],
        note: 'The 27 facts and their questions are made up for the story. A real set is built from real answers that a person reviewed.'
      }),

      B.widget({ id: 'm14-ft-lab', kind: 'finetune', t: 1, src: 'rec', title: 'Lab: clean the set, then split it honestly' }),

      B.code({
        id: 'm14-format', t: 1, src: 'rec', title: 'Training examples and preference pairs', file: 'train_example.jsonl', lang: 'json', code: TRAIN + '\n' + PREF,
        steps: [
          { say: 'The first two lines are training examples in the chat format, as the recorder wrote them. The last line is a preference pair. One JSON object to a line, so that a diff shows exactly what changed.', lines: null },
          { say: 'A training example is a list of messages. The user message is the input, and the assistant message is the answer that the model should learn to give. Here the answer is the sentence of the current handbook.', lines: [1, 1] },
          { say: 'The second example asks the same thing in another way: "A new colleague asks: Can a shopper get reimbursed for beans they have not opened?". Several phrasings of one fact teach that the same answer fits different questions, and they are exactly why a random split leaks.', lines: [2, 2] },
          { say: 'The last line is preference data: a prompt, a chosen answer and a rejected one. The rejected answer is the **old** policy, 30 days, and the chosen one is the current policy, 14 days, with its source. It teaches a preference between two answers, and a person or a rule has to decide the label.', lines: [3, 3] }
        ],
        note: 'The preference pair here is one line that I wrote for the course. Real preference sets hold thousands of pairs, and their labels are the expensive part.'
      }),

      B.code({
        id: 'm14-card', t: 1, src: 'rec', title: 'A dataset card', file: 'card.json', lang: 'json', code: CARD,
        steps: [
          { say: 'Every dataset leaves the pipeline with a card that says what it is. It is short, it is versioned with the data, and the model that is trained on it points at it. This is the card of the Brewline set.', lines: null },
          { say: 'The name and the version identify it. The rows count says ' + CJ.rows + ', after cleaning. The source and the split say where the examples came from and how they were divided.', lines: G.span(CARD, /"name"/, /"split"/) },
          { say: '`removed` records the cleaning: ' + CJ.removed.exact_duplicates + ' exact duplicates and ' + CJ.removed.near_duplicates + ' near duplicate. If a later model behaves oddly, you can see what was taken out and why.', lines: G.span(CARD, /"removed"/, /near_duplicates/) },
          { say: '`contains_personal_data` is a flag with a decision behind it. And `known_gaps` is the honest part: no examples that refuse a question, and one style of answer. A model trained on this set will not know how to refuse, and the card says so before anyone is surprised.', lines: G.span(CARD, /"contains_personal_data"/, /one answer style/) }
        ],
        note: 'A card is not paperwork: it is what lets the next engineer, or an auditor, trust the data without re-deriving it.'
      }),

      B.cmp({
        id: 'm14-choose', t: 1, src: 'docs', title: 'Fine-tuning, retrieval or a better prompt',
        say: 'You met this table in mission 1. Now with the data in hand, press Next to read it again, with the questions that decide.',
        cols: ['Option', 'Choose it when', 'The data it needs', 'What it cannot do'],
        hl: 2,
        rows: [
          ['A better prompt', 'You have not yet seen what the model does with a clear instruction and a few examples.', 'A few examples in the prompt.', 'Teach a lot of behaviour, or save tokens at scale.'],
          ['Retrieval', 'The answer depends on facts that change, must be cited, or may be seen by only some people.', 'Documents, with labels, in an index.', 'Change how the model writes or reasons.'],
          ['Fine-tuning', 'You need a fixed format, a tone, a narrow task done the same way, or a smaller cheaper model that copies a bigger one on one task.', 'Hundreds to thousands of reviewed examples, and an evaluation set that is kept apart.', 'Keep up with facts that change, show a source, or forget a fact on request.'],
          ['Preference tuning', 'Two answers can both look fine, and you know which one you prefer, such as a current policy over an old one.', 'Pairs of chosen and rejected answers, with careful labels.', 'Add knowledge. It shifts what the model prefers.']
        ],
        steps: [
          { upto: 1, say: 'Start with the prompt. It costs nothing, and it shows the gap that is left. Many projects stop here, or with retrieval.' },
          { upto: 2, say: 'Retrieval is the answer for facts. A fact that changes in March lives in an index that you can update and delete from. A tuned model has to be trained again.' },
          { upto: 3, say: 'Fine-tuning is for behaviour. A model tuned on policy sentences may recite the refund window of the week of training, and no source, and it cannot unlearn a deleted document. Use it for a format, a style or a narrow task, with an evaluation set that was never in the training data.' },
          { upto: 4, say: 'Preference tuning shifts choices between answers that are both plausible. Its data is the hardest to label, and it is where bad labels do the most harm.' }
        ],
        pick: 'Try the **prompt**, add **retrieval** for facts, and consider **fine-tuning** for a behaviour that the scores say a prompt cannot fix. In every case the **evaluation set comes first**.'
      }),

      B.talk({
        id: 'm14-adapters', t: 2, src: 'docs', title: 'How a fine-tune is trained, and what you host',
        say: 'You do not need to train a model to hold this job, and you should know the shapes. This is documentation-level, and the details move quickly. Press Next for each.',
        items: [
          ['Provider fine-tuning', 'Several providers offer a fine-tuning service. You upload a file of examples, the provider trains, and you call the tuned model by name. It is the simplest route. Check what the provider keeps, whether your data may be used for other purposes, and what happens to the tuned model when the base model is retired.', 'Upload, train, call. Read the data terms.'],
          ['Adapters', 'Parameter-efficient methods, such as LoRA, train a small set of extra weights on top of a frozen base model. They are much cheaper than training everything, and the adapter can be swapped. Teams that run open-weight models often use them.', 'Small extra weights on a frozen model.'],
          ['Running a model yourself', 'Open-weight models can be hosted on your own machines, which keeps data inside and needs GPUs, a serving stack, monitoring and the same release discipline as any other service. The cost and the work are real. Many teams find an API cheaper at their volume.', 'Control costs work and hardware.'],
          ['Distillation', 'A small model is trained to copy the answers of a bigger one on one task. It can cut cost and delay a lot, if the task is narrow and the evaluation shows that it holds the score. The terms of the bigger model may limit this, so check them.', 'A smaller model for one narrow task.']
        ],
        cols: 1
      }),

      B.talk({
        id: 'm14-batch', t: 1, src: 'docs', title: 'Batch inference: a pipeline that calls a model many times',
        say: 'Much AI data work is not a chat. It is summarising, classifying, extracting from or embedding a large collection of documents. Press Next for what makes such a job reliable, from documentation and common practice.',
        items: [
          ['Size it before you run it', 'Count the items, estimate the tokens of one, multiply by the price, and run a sample of a few hundred to measure the real number and the quality. A job that costs more than expected is cheaper to stop at the sample.', 'Sample first, then size the bill.'],
          ['Idempotent and resumable', 'Key each item by a hash of its content, the prompt version and the model version, skip what is already done, and write results as you go. A crash then costs the work since the last write, not the whole job.', 'The ideas of mission 5, again.'],
          ['Respect the limits', 'Cap the calls in flight, stay under the rate limit, honour retry-after, and use the provider\'s batch interface when the answers can wait. Park items that keep failing, with the reason.', 'Throttle, retry, and park failures.'],
          ['Check the output', 'Validate every result against a schema, as in mission 7, and sample a share for review by a person or a calibrated judge. A silent drop in quality across a million rows is the main risk.', 'Validate all, review a sample.'],
          ['Store the context of each result', 'Write the result with the model version, the prompt version, the input hash and the time. When the prompt improves, you know which rows to redo, and you can explain any row.', 'A result without its versions is a guess.']
        ],
        cols: 1
      }),

      B.talk({
        id: 'm14-mlops', t: 2, src: 'docs', title: 'The data side of MLOps, with and without training',
        say: 'Even with no training at all, the same data discipline applies to embeddings, indexes and evaluation sets. With training, more of it. Press Next for the parts.',
        items: [
          ['Version the data', 'A training set, an evaluation set and an index each have a version, stored as immutable snapshots, for example through snapshot tables of a lakehouse, or tools for data versioning. A model that cannot name its data cannot be reproduced.', 'Immutable snapshots, named by version.'],
          ['Lineage', 'Keep the chain from a model to its dataset, from the dataset to its sources, and from a source to its owner. When a source is withdrawn, lineage tells you which datasets and which models are affected.', 'A path back to the sources of a model.'],
          ['A registry', 'A place that lists each model version with its data version, its scores and who approved it, and that serves as the single source for what is in production. The alias of mission 5 and the pinned model of mission 13 are small registries.', 'Versions, scores, approvals.'],
          ['Point-in-time correctness', 'For classic features, a feature must be computed from what was known at the time of the label, not from the future. A leak from the future gives a model that looks excellent and fails live. A feature store helps by serving the value as of a time.', 'No peeking at the future.'],
          ['Drift and retraining', 'Watch the inputs and the scores over time, and decide in advance what triggers a new data pull, a new evaluation, or a retrain. A model that is never re-evaluated drifts silently as the world and the documents change.', 'Decide the triggers in advance.']
        ],
        cols: 1
      }),

      B.quiz({
        id: 'm14-q1', t: 1,
        q: 'You split 161 examples at random, 80 and 20 percent, and every fact has about six phrasings. In the recording, how many of the 32 validation answers also appeared in training?',
        opts: [
          { t: 'All ' + SP[0][3] + ': the same fact appears on both sides, so validation measures memory', fb: '' },
          { t: 'None, a random split is always honest', fb: 'Random across examples is not random across facts.' },
          { t: 'About half', fb: 'The recording counted all of them.' },
          { t: 'Only the exact duplicates', fb: 'Duplicates were already removed. The phrasings differ and the answers are the same.' }
        ],
        ok: 0, why: 'Each fact had several questions with one answer. A random split put some of them in training and some in validation. The grouped split kept every phrasing of a fact together and the count was ' + SP[1][3] + '.'
      }),

      B.quiz({
        id: 'm14-q2', t: 1,
        q: 'Exact de-duplication on normalised text removed ' + (DS.after_adding_repeats - DS.after_exact_dedup) + ' rows, although only ' + DS.repeats_added + ' were repeats. Why?',
        opts: [
          { t: 'The ' + DS.spacing_variants_added + ' spacing variants look different as text and are the same after normalising, so they were removed as well', fb: '' },
          { t: 'The hash function removes rows at random', fb: 'It is deterministic.' },
          { t: 'Exact de-duplication also removed near duplicates', fb: 'Near duplicates need a similarity measure. Exact matching did not.' },
          { t: 'The count is wrong', fb: 'It adds up: ' + DS.repeats_added + ' plus ' + DS.spacing_variants_added + '.' }
        ],
        ok: 0, why: 'Normalising lower-cases the text and squeezes white space, so rows that differ only in spacing get the same hash. Without normalising, a paste with extra spaces would count as a new example, and the model would see that fact more often.'
      }),

      B.quiz({
        id: 'm14-q3', t: 1,
        q: 'What does a preference pair teach that an ordinary training example does not?',
        opts: [
          { t: 'Which of two plausible answers is better, such as the current policy over the old one', fb: '' },
          { t: 'New facts', fb: 'Preference data shifts choices. It does not add knowledge.' },
          { t: 'How to call tools', fb: 'That is a different kind of data.' },
          { t: 'How to answer faster', fb: 'It does not change speed.' }
        ],
        ok: 0, why: 'A pair holds a prompt, a chosen answer and a rejected one. In the recorded example, the rejected answer is the superseded 30-day window and the chosen one is the current 14 days with its source.'
      }),

      B.quiz({
        id: 'm14-q4', t: 1,
        q: 'The dataset card lists as a known gap "no examples that refuse a question". What should you expect from a model trained on this set?',
        opts: [
          { t: 'It may answer questions that it should refuse, because it never saw a refusal. Add refusal examples, and test refusals', fb: '' },
          { t: 'It will refuse everything', fb: 'It has seen no refusals, so it has no reason to refuse.' },
          { t: 'Nothing, because gaps do not matter', fb: 'A gap in the data is a gap in the behaviour.' },
          { t: 'It will refuse correctly because the card says so', fb: 'A card describes the data. It does not change the model.' }
        ],
        ok: 0, why: 'A model learns from what it is shown. A set with no refusals teaches that every question gets an answer. The attack set and the refusal cases of the golden set exist to find this, and the card exists to say it before the model ships.'
      }),

      B.quiz({
        id: 'm14-q5', t: 2,
        q: 'The refund window changes from 30 to 14 days next month. A team plans to teach the model the new window by fine-tuning on the handbook sentences. What is the problem?',
        opts: [
          { t: 'Facts that change belong in retrieval. A tuned model must be trained again for each change, shows no source, and may keep reciting the old window', fb: '' },
          { t: 'Fine-tuning cannot learn sentences', fb: 'It can learn them. That is the trouble: it learns them as of the day of training.' },
          { t: 'The handbook is too short', fb: 'Length is not the issue.' },
          { t: 'There is no problem', fb: 'The process will fail on the next policy change.' }
        ],
        ok: 0, why: 'This is the split of mission 1. Retrieval reads the current document at question time. Fine-tuning changes how a model behaves and is a poor place to store a fact that will change. If the old facts are in the training set, they stay in the model.'
      }),

      B.order({
        id: 'm14-ord', t: 1, q: 'Put the preparation of a fine-tuning set in order.',
        items: [
          'Define the task, and build the evaluation set first, kept apart from everything else',
          'Collect reviewed examples from sources that may be used',
          'Mask personal data, and remove repeats and near-repeats',
          'Write the examples in the training format',
          'Split by group, so that validation holds things that training never saw',
          'Train a small version, and score it against the current model on the evaluation set',
          'Register the model with the data version and a dataset card'
        ],
        why: 'The evaluation set comes first so that it cannot be shaped by the training data. Cleaning comes before formatting, because repeats and private data are far easier to remove from a text than from a model. The card and the registry make the result usable by the next person.'
      }),

      B.bug({
        id: 'm14-bug', t: 1, src: 'rec', q: 'A fine-tuned model scores 99 percent on its validation set and does badly on new questions. Click the line that explains it.',
        file: 'train.py', lang: 'python', code: BUG1, bad: [2],
        hint: 'Where do the phrasings of one fact end up?',
        why: 'The examples have about six phrasings of each fact. A random split put some phrasings in training and others in validation, so the validation answers were already seen. In the recording that was all 32 of 32. Split by fact, so that validation holds facts that training never saw.',
        fix: FIX1,
        cheer: 'Split by the thing that must not leak.'
      }),

      B.bug({
        id: 'm14-bug2', t: 2, src: 'docs', q: 'This script builds a fine-tuning set from last month\'s chat logs. A privacy reviewer stops the release. Click the line.',
        file: 'build_set.py', lang: 'python', code: BUG2, bad: [1],
        hint: 'What is in the logs, and who agreed to what?',
        why: 'The logs hold everything that users wrote, including personal data, and a thumbs up is not a consent or a review. A trained model cannot delete a record. Use only data that may be used, mask personal data first, and have an expert review the examples. Split by group, too.',
        fix: FIX2,
        cheer: 'Only data that may be used, and reviewed.'
      }),

      B.decide({
        id: 'm14-dec', t: 2, src: 'rec', title: 'Decision: fine-tune for the policy questions?',
        scenario: 'The assistant answers policy questions with retrieval. A teammate proposes to fine-tune a model on the 161 examples of the Brewline set, "to make it faster and cheaper". The golden set shows hit at 3 of 0.875 for retrieval. The policy changes about twice a year.',
        opts: [
          { t: 'Fine-tune and drop retrieval, since the model now knows the policies', d: 'One fewer system to run, and shorter prompts.', lose: 'The model will recite the policies as of the day of training. After the next change it is wrong until it is trained again, it shows no source, and it cannot hide documents from a role.' },
          { t: 'Keep retrieval for the facts. Consider fine-tuning later, for a format or a style, with a held-out set and a gate', d: 'The facts stay current, and a tuned model has a narrower job.' },
          { t: 'Fine-tune on the held-out questions too, to get the best score', d: 'The highest number on the page.', lose: 'The score then measures memory. A set that was in training cannot tell you how the model does on something new.' }
        ],
        pick: 1,
        why: 'Facts that change twice a year are exactly what retrieval is for. If the goal is cost or speed, try a smaller model with retrieval first, and judge it on the golden set. Fine-tuning can have a job later, such as a fixed answer format, and then it needs a held-out set that was never trained on.',
        when: 'If the assistant had to answer in a very strict format, thousands of times a day, a tuned smaller model could pay off. Prove it on the held-out set against the prompt-only baseline.'
      }),

      B.incident({
        id: 'm14-inc', t: 2, src: 'rec', title: 'Incident: a fine-tuned model scored 99 percent, and failed in production', time: '15:40',
        alert: '**A fine-tuned model scored 99 percent on the validation set and was promoted. In production it fails many new questions.** The team split the examples at random. Every fact has about six phrasings. The validation set was never compared with the training set.',
        clues: ['A random split across examples, with six phrasings of each fact', 'In the recording, ' + SP[0][3] + ' of ' + SP[0][2] + ' validation answers also appeared in training', 'The grouped split had ' + SP[1][3] + ' such answers', 'Real questions were never in the validation set'],
        opts: [
          { t: 'Roll back to the previous model, rebuild the split by fact, add real held-out questions, re-score, and add a leakage check to the pipeline', fb: '' },
          { t: 'Train for longer to raise the real score', fb: 'The score was never real. More training makes the memory better.' },
          { t: 'Add the failed questions to the training set and promote again', fb: 'Then there is no held-out data left to tell you anything.' },
          { t: 'Report 99 percent anyway, since the model is good on known questions', fb: 'It misleads everyone who relies on the number.' }
        ],
        best: 0,
        why: 'The validation score measured how well the model remembered what it had been shown. Roll back first. Then fix the split so that every phrasing of a fact stays together, bring real questions that nobody trained on, and add a leakage check that fails the pipeline when validation answers appear in training.',
        checks: [
          ['Roll back', 'Move the alias or the pin back to the previous model.'],
          ['Measure the leak', 'Count validation answers that also appear in training. The recording\'s count was all of them.'],
          ['Fix the split', 'Group by fact, or by document, or by customer, whatever must not leak.'],
          ['Bring real data', 'Add questions from real use that were never in training, marked by an expert.'],
          ['Guard it', 'A check in the pipeline that fails when the leak count is above zero.']
        ],
        tell: 'A fine-tuned model scored 99 percent and failed in production, because our random split put different phrasings of the same fact in training and in validation, so every validation answer had been seen. I rolled back, rebuilt the split by fact, added real held-out questions marked by an expert, and re-scored. I added a leakage check that fails the pipeline when a validation answer appears in training.',
        prevent: ['**Split by the thing that must not leak**: the fact, the document, the customer, the date', 'A **leakage check** in the pipeline', 'Keep a **held-out set of real questions**', 'Be suspicious of a **score near 100 percent**']
      }),

      B.incident({
        id: 'm14-inc2', t: 2, src: 'docs', title: 'Incident: the tuned model still quotes the old refund window', time: '11:10',
        alert: '**Two months after the refund window changed from 30 to 14 days, the fine-tuned assistant still sometimes says 30.** The training set was built before the change, from both versions of the handbook. Retrieval returns the right chunk, and the tuned model sometimes ignores it.',
        clues: ['The training set holds sentences of the old and the new handbook', 'The model was trained before the change', 'It was never retrained', 'The golden set has a question whose answer changed, and it was not run on this model'],
        opts: [
          { t: 'Rebuild the set from current facts only, with the old window as a rejected answer in preference pairs, retrain, and run the question whose answer changed as a gate', fb: '' },
          { t: 'Tell the model in the prompt that the window is 14 days now', fb: 'It helps sometimes, and the tuned weights still pull toward the old answer.' },
          { t: 'Delete the old handbook from the lake', fb: 'It is already in the weights, and the history is lost.' },
          { t: 'Leave it, since retrieval is right most of the time', fb: 'It is wrong for refund money, and nobody knows how often.' }
        ],
        best: 0,
        why: 'Facts that were in the training set stay in the model until it is retrained. The fix is a set of current facts, with the old answer used as the rejected side of a preference pair, and the question whose answer changed as a release gate. For facts that change, lean on retrieval, and keep the tuned model for behaviour.',
        checks: [
          ['Confirm', 'Run the changed-answer question on the tuned model and on the base model with retrieval.'],
          ['Fix the data', 'Rebuild from current facts, and drop the superseded handbook. Use the old answer as a rejected example.'],
          ['Retrain and gate', 'Train, then score the question whose answer changed, and the whole golden set.'],
          ['Reduce the exposure', 'Prefer retrieval for facts, and let the tuned model carry format and style only.'],
          ['Process', 'Add "retrain or retire" to the steps of changing a policy.']
        ],
        tell: 'Our tuned model kept quoting the old 30-day window because it was trained on both handbook versions before the change and never retrained. I rebuilt the training set from current facts only, used the old answer as a rejected example in preference pairs, retrained, and made the question whose answer changed a release gate. I shifted facts back to retrieval and kept the tuned model for format and style.',
        prevent: ['**Facts that change** belong in retrieval', 'Train on **current** data, and keep **old answers as rejected** examples', 'A **changed-answer question** is a gate', 'Make **retrain or retire** a step of a policy change']
      }),

      B.qa({
        id: 'qa-ft', t: 1, tag: 'Data for models', secs: 90,
        q: 'When do you fine-tune a model, and when do you use retrieval?',
        pts: ['Retrieval for facts that change, need sources or permissions', 'Fine-tuning for behaviour: format, tone, a narrow task, a smaller model', 'Fine-tuning does not keep up with change and cannot forget', 'Try the prompt first, build the evaluation set first', 'They combine', 'Need: reviewed examples and a held-out set'],
        short: 'I use retrieval when the answer depends on facts that change, must be cited, or may be seen by only some people, because the knowledge sits in an index that I can update, filter and delete from. I fine-tune when the problem is behaviour: a fixed output format, a tone, a narrow task that must be done the same way every time, or a smaller and cheaper model that copies a bigger one on one task.\n\nFine-tuning is a poor home for a fact that will change. A tuned model recites what it was trained on, shows no source, needs retraining for every change, and cannot forget a deleted document. In my recording I kept the old policy out of the training set on purpose, and used it as the rejected side of a preference pair.\n\nThe order is: a good prompt, retrieval, an evaluation set that is kept apart from everything, and only then a fine-tune, if the scores show a behaviour gap that a prompt cannot close. The two combine, with a tuned model that reads retrieved text.',
        fu: [
          ['How many examples?', 'Hundreds of good, reviewed ones can change a narrow behaviour. Quality beats quantity, and the evaluation set decides if it worked.'],
          ['What if the provider retires the base model?', 'The tuned model goes with it. Keep the data and the evaluation, so that you can re-tune on the next base model.']
        ],
        trap: 'Fine-tuning to teach the company handbook.',
        real: 'Describe a case where you chose fine-tuning or retrieval and what the scores said.'
      }),

      B.qa({
        id: 'qa-ftdata', t: 1, tag: 'Data for models', secs: 90,
        q: 'How do you prepare data for fine-tuning?',
        pts: ['The evaluation set first, kept apart', 'Reviewed examples from sources that may be used', 'Mask personal data', 'Remove exact and near duplicates', 'Chat format, one example to a line', 'Split by group, a dataset card, a version'],
        short: 'I start with the evaluation set, and I keep it apart from everything else, so that the training data cannot shape it. Then I collect examples from sources that may be used, reviewed by a person who knows the subject. A thumbs up in a log is not a review, and a log is not consent.\n\nI mask personal data first, and remove repeats. In my recording I added repeats and spacing variants on purpose, normalised the text, hashed it and removed 24 rows, then ran a near-duplicate check that removed one more. I write the examples in the chat format, one JSON object to a line, so that a diff shows what changed.\n\nThen I split by group. In my test a random split put all 32 validation answers also in training, and a split by fact put none. Finally I write a dataset card with the source, the cleaning, the split, the personal-data decision and the known gaps, and I give the set a version.',
        fu: [
          ['What do you do about class imbalance or style?', 'Look at the distribution of topics and answer styles, add examples for the thin parts, and say in the card what is still missing.'],
          ['Can a model write the examples?', 'It can draft them. A person reviews them, and the evaluation set stays human-made.']
        ],
        trap: 'Training on whatever is in the logs.',
        real: 'Describe how you cleaned and split a training set.'
      }),

      B.qa({
        id: 'qa-leak', t: 1, tag: 'Data for models', secs: 60,
        q: 'What is data leakage between training and validation, and how do you avoid it?',
        pts: ['Information from the validation set is in the training set', 'It inflates the score and hides failures', 'Many phrasings of one fact: split by fact', 'Split by document, customer or date when those must not leak', 'Check: validation answers that appear in training', 'A very high score is a warning'],
        short: 'Leakage means that something about the validation set was available to the model in training, so the validation score no longer measures how it handles something new. It inflates the score and hides the failures until production.\n\nA common cause is many versions of the same thing across the split. In my test, each fact had about six phrasings, and a random split put some phrasings in training and some in validation, so all 32 validation answers also appeared in training. A split by fact kept every phrasing together and the count was zero.\n\nI avoid it by splitting on the thing that must not leak: the fact, the document, the customer, or the date for time series. I add a check to the pipeline that counts validation answers that appear in training, and fails when it is not zero. And a score near 100 percent makes me suspicious, not happy.',
        fu: [
          ['What about duplicates?', 'Duplicates across the split are a leak too, so I remove exact and near duplicates before I split.'],
          ['What about leakage from the future?', 'For features and time series, compute each feature from what was known at the time of the label, and split by date.']
        ],
        trap: 'A random split across examples, when the examples are not independent.',
        real: 'Describe a leak that you found and how you found it.'
      }),

      B.qa({
        id: 'qa-batch', t: 1, tag: 'Data for models', secs: 90,
        q: 'How do you design a batch inference pipeline that calls a model for millions of documents?',
        pts: ['Sample first, estimate tokens and cost', 'Idempotent: key by content, prompt version and model version', 'Resumable, writing results as you go', 'Cap calls in flight, honour limits, use a batch interface', 'Validate all outputs, review a sample', 'Store results with their versions'],
        short: 'I size it before I run it. I count the items, measure the tokens of a sample of a few hundred, multiply by the price, and read the quality of the sample, so that a surprise costs a few hundred calls and not the budget.\n\nThen I make it idempotent and resumable, with the ideas of my ingestion pipeline. Each item is keyed by a hash of its content, the prompt version and the model version, so a re-run skips what is done and a crash loses only the work since the last write. I cap the calls in flight, stay under the rate limit, honour retry-after, use the provider\'s batch interface if the answers can wait, and park items that keep failing, with the reason.\n\nI validate every output against a schema, and review a sample by a person or a calibrated judge, because a quiet drop in quality over a million rows is the main risk. And I store each result with the model version, the prompt version, the input hash and the time, so that after a better prompt I know which rows to redo.',
        fu: [
          ['How do you cut the cost?', 'A smaller model where the sample says it holds, a shorter prompt, caching of a repeated prefix, and the batch interface.'],
          ['How do you know the quality held at scale?', 'A rolling sample reviewed over the run, and alerts on the schema failure rate and on the distribution of the outputs.']
        ],
        trap: 'Running the whole job first and looking at the results after.',
        real: 'Describe a batch job with a model and how you controlled its cost and quality.'
      }),

      B.qa({
        id: 'qa-mlops', t: 2, tag: 'Data for models', secs: 60,
        q: 'What does the data side of MLOps look like when you fine-tune or run models?',
        pts: ['Versioned, immutable datasets and indexes', 'Lineage from model to data to sources to owners', 'A registry of model versions with data version and scores', 'Evaluation before release, and a way back', 'Monitoring and decided triggers for retraining', 'Point-in-time correctness for features'],
        short: 'I version the training set, the evaluation set and the indexes as immutable snapshots, so that a model can name the data that made it. I keep lineage, from a model to its dataset, from the dataset to its sources, and from a source to its owner, so that when a source is withdrawn or a record must be deleted, I know which datasets and models are affected.\n\nA registry lists each model version with its data version, its scores and who approved it, and it is the single answer to what is in production. A release needs an evaluation against the current model, and a way back, which is one write.\n\nI monitor inputs and scores over time, and I decide in advance what triggers a new data pull, an evaluation or a retrain, because a model that is never re-evaluated drifts silently. For classic features I insist on point-in-time correctness, so that a feature uses only what was known at the time of the label.',
        fu: [
          ['What if there is no training at all?', 'The same applies to embeddings, indexes and evaluation sets: versions, lineage, a registry of what is live, and gates.'],
          ['What would you build first?', 'Dataset versions and a registry that links a model to its data and its scores.']
        ],
        trap: 'Keeping the training data in a folder with no version.',
        real: 'Describe how you traced a model back to its data.'
      }),

      B.qa({
        id: 'qa-pref', t: 2, tag: 'Data for models', secs: 60,
        q: 'What is preference data, and why is it harder to get right than training examples?',
        pts: ['A prompt, a chosen answer and a rejected answer', 'It shifts which answer the model prefers', 'It does not add facts', 'Labels need judgement: people or careful rules', 'Bad or inconsistent labels do the most harm', 'Example: current policy over a superseded one'],
        short: 'Preference data is a set of pairs: a prompt, an answer that is chosen, and an answer that is rejected. It is used to shift which of two plausible answers a model prefers, for example a current policy over a superseded one, or a short answer over a rambling one. It does not add facts.\n\nIt is harder than ordinary examples because the label is a judgement. Two annotators can disagree about which answer is better, and an inconsistent or biased label teaches the wrong preference at scale. So I write down the criteria, use more than one reviewer on a sample, measure their agreement, and keep the pairs that people agree on.\n\nIn my recorded example the rejected answer was the old 30-day window and the chosen one was the current 14 days with its source, which is a case where a rule can decide the label. I would keep the set small and reviewed, and I would check the tuned model on the changed-answer questions of the golden set.',
        fu: [
          ['Where do the pairs come from?', 'From people who compare two answers, from rules such as current over superseded, or from a model that proposes pairs which a person reviews.'],
          ['What is the risk of a model labelling?', 'It repeats its own biases, such as a preference for long answers, so a human sample check is needed.']
        ],
        trap: 'Treating preference labels as obvious. They need written criteria and a check of agreement.',
        real: 'Describe how you defined and checked the labels of a preference set.'
      }),

      B.qa({
        id: 'qa-synthetic', t: 3, tag: 'Data for models', secs: 60,
        q: 'Can a model generate training data, and what are the risks?',
        pts: ['It is cheap and can cover many phrasings and edge cases', 'It copies the errors and the style of the generator', 'Training on generated data in a loop can degrade a model', 'Never let it write the evaluation set', 'A person reviews a sample, and the card says what is synthetic', 'Check the terms of the generating model'],
        short: 'Yes, a model can draft examples. It is cheap, and it can cover many phrasings and edge cases that a small team would not write. In my own recording the examples were made from templates and from the real questions, which is a small human version of the same idea.\n\nThe risks are real. Generated data repeats the mistakes and the style of the generating model, and it can make the training set look more varied than it is. Training repeatedly on generated data can degrade a model over generations. And if a model writes the evaluation set, it measures how well one model agrees with another, not how well the system serves users.\n\nSo a person reviews a sample, I keep the evaluation set human-made and apart, the dataset card says which parts are synthetic, and I split by group so that variants of the same item stay together. I also read the terms of the generating model, since some limit how its output may be used.',
        fu: [
          ['How would you check the diversity?', 'Look at the topics, the lengths and the phrasings, and measure near-duplicates, as in the cleaning of mission 14.'],
          ['When is it a good fit?', 'To add phrasings for a fixed set of facts or formats, with review, and not to invent new knowledge.']
        ],
        trap: 'Letting the same model write the training data and the test.',
        real: 'Describe how you used generated data and what you checked.'
      }),

      B.recap({
        id: 'm14-recap', n: 14, badge: 'Data Alchemist', color: '#FED7AA',
        pts: [
          '**Fine-tuning is for behaviour**, **retrieval is for facts**. Build the **evaluation set first** and keep it apart.',
          'Clean the set: **mask personal data**, **normalise and remove exact repeats**, then **near repeats**. In the recording **24 rows** left as exact repeats.',
          '**Split by the thing that must not leak.** A random split left **32 of 32** validation answers in training. A split by fact left **0**.',
          '**Preference pairs** teach a choice, such as current over old. Their labels need **written criteria**.',
          'Write a **dataset card**: source, cleaning, split, personal-data decision, **known gaps**. Version the data and keep **lineage** and a **registry**.',
          '**Batch inference** is a pipeline: sample first, idempotent, throttled, validated, with the **versions stored with each result**.'
        ],
        lines: [
          'I build the evaluation set first, and I never train on it.',
          'I split by what must not leak.',
          'I write down what the data is not.'
        ]
      })
    ]
  });
})();
