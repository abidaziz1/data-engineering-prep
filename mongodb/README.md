# MongoDB for data engineers

A short, guided, press-Next course on the part of MongoDB that a data engineer meets: documents whose shape nobody agreed on (null is not missing, and a string is not a number), the aggregation pipeline and what each stage does to the number of documents, indexes and what `explain` says the server examined, schema validation, writes that are safe to repeat, transactions, and a change stream with a resume token that feeds the lake. Every lesson follows one coffee retailer, **Brewline**, and one coach, **Mika**.

Open **`index.html`** in a browser. No install, no account.

## What is recorded, and what is a stand-in

Every screen that teaches a fact carries one of two tags.

| Tag | What it means |
| --- | --- |
| **Recorded** | Real output written by `mongodb/verify/capture_mongodb.py` on one Linux machine: **mongod 8.0.38** (the image `mongo:8.0`) in a Docker container, run as a replica set of one member, and the driver **pymongo 4.20.1**. The code on the screens is the code that ran, against made-up Brewline data |
| **From documentation** | Everything that was not run: sharding, Atlas, Atlas Search, the Kafka connector, other drivers, `mongosh`, and the decisions. These screens say so |

The stand-ins and limits, said again where they matter:

- **One server, one member.** A change stream and a transaction need a replica set, so the recorder starts a replica set with a single member. No second member, no election, no failover and no write concern across members was run. What the lessons say about them is from documentation and is tagged so.
- **The data is made up.** 20,000 orders built from fixed rules with no random numbers: 12 stores, 4 SKUs and 3 regions. An order has 1, 2 or 3 lines, decided by its number, and a store always gets the same count of lines, so the 19,200 orders that the first `$match` keeps give 38,400 documents after an `$unwind`. A few small documents with odd shapes serve the lesson on types.
- **Nothing is timed.** The recording holds counts, plans, keys examined, documents examined, error codes and printed events. It never holds a number of milliseconds, so nothing here says how fast a query is.
- **The cost of an index is documentation.** The lessons say that every write must also change each index and that an index takes memory. That is not measured here.
- **`mongosh` did not run.** Every program is Python with pymongo. The shell, the other drivers and the Kafka connector are tagged From documentation.
- **A terminal replay is built from recorded values.** Every output line came from the recording. A command is written as `python name.py`, and temporary paths and the date are masked.

## Pick a path

| Path | Frames | Time | For |
| --- | --- | --- | --- |
| **Junior** | 166 | about 105 minutes | Starting out, or interviewing for a junior data engineer role where MongoDB is a source |
| **Senior** | 207 | about 2.5 hours | Everything in Junior, plus the order of the fields in a compound index, transactions, the size limit of a document, and the decisions that seniors own |
| **Everything** | 209 | about 2.5 hours | Adds one finer point: what an update event holds when the document is already gone |

Times are estimates from reading and speaking each step, and they include saying the interview answers out loud. Switch paths at any time from the **Map** button.

## The missions

| # | Mission | Junior | Senior | Everything |
| --- | --- | --- | --- | --- |
| 1 | **Documents and collections.** What goes inside a document, `null` against a missing field, the type of a value, the `_id` rule and the 16 MB limit | 17 min | 23 min | 23 min |
| 2 | **Queries and the aggregation pipeline.** `$match`, `$unwind`, `$group`, `$sort`, `$lookup`, and the number of documents after each stage | 19 min | 22 min | 22 min |
| 3 | **Indexes and explain.** A collection scan against an index scan, a compound index, a sort, and a covered query | 15 min | 21 min | 21 min |
| 4 | **Validation, writes and change streams.** A schema rule, a repeated write, an upsert, a transaction, a change stream and a resume token | 20 min | 27 min | 28 min |
| 5 | **Boss round.** Two drills, a decision, a coding round, a mock interview and a one-page review | 31 min | 41 min | 41 min |

Mission 0 is the start: pick a path and see the whole picture.

## What job descriptions ask for, and where this course covers it

I read a small sample of postings through two searches: data engineer roles that mention MongoDB, and senior data engineer roles in general. I read the search summaries and not every posting. The results were job boards that repeat each other, one result was a template and not a real posting, so this shows **direction and not a count**. Most senior postings do not ask for MongoDB at all, and ask for Python, Spark, SQL, Airflow and a cloud. Where MongoDB shows up, it is a source or a store behind a service.

| What postings ask for | Where | How it is covered |
| --- | --- | --- |
| NoSQL and MongoDB data modelling | 1 | **Recorded**: embedded array against a second collection, the 16 MB limit, the shapes that a loader meets. **Sharding and shard keys are not covered** |
| ETL and ELT pipelines in Python | 2, 4 | **Recorded**: the aggregation pipeline, a load that can be repeated, an upsert. The pipelines run on the server, and the Python side is pymongo |
| Query tuning and indexes | 3 | **Recorded**: five cases of `explain` with the plan, the keys and the documents examined |
| Data quality validation | 4 | **Recorded**: a validator, a refused write with code 121, a duplicate key (11000), a rolled back transaction |
| Streaming and change data capture, as a plus | 4 | **Recorded**: a change stream, a resume token, a stream that resumed and got what was written while nobody watched. **Rarely a hard requirement** in the sample |
| Spark, Airflow, Kafka, AWS or Azure around it | none | Courses of their own in this library |
| Atlas, Atlas Search, sharded clusters, backups | none | From documentation, in one screen that says what was not run |
| Five or more years of experience for mid to senior roles | all | The senior path is written for this. No course replaces the years |

The 14 interview questions are written from the topics that these postings share and from the usual MongoDB interview themes: embed or reference, `null` and missing, the aggregation pipeline, a covered query, validation, upsert, transactions and change streams. I did not check them against a list of real interview questions.

Example postings in the sample: [MongoDB Software Engineer 3](https://startup.jobs/software-engineer-3-mongodb-7980718) (ETL and ELT in Python and Spark, Airflow, data quality validation), [MongoDB Senior Data Engineer, GenAI](https://aijobs.net/job/202926-senior-data-engineer-genai/).

## What you work through

- **Follow Brewline.** One loader and one lake feed. A count of orders without a coupon that is off by one, a quantity that arrived as text, a report where some stores show two or three times their revenue, a pipeline that returns nothing, an index that does not fit the query, a retry that stops with a duplicate key, and a restart that missed a change.
- **3 animated diagrams, shown on 4 screens.** What goes inside a document, a pipeline and its stages, and a write travelling to a change stream and a resume token.
- **3 labs.** Three ways to group the orders (by SKU, by store, by region with a `$lookup`), five queries and what the server examined, and five writes (a valid payment, an amount as text, an unknown currency, the same order again, an upsert run twice, a transaction that aborted).
- **7 terminal replays, 5 code walkthroughs and 4 comparison tables.** The commands with their real output, and the files `load.py`, `shapes.py`, `pipelines.py`, `indexes.py`, `design.py` and `streams.py`.
- **15 quizzes, 9 bug hunts, 4 ordering games, 5 decisions with a recommended answer and 6 incident drills,** each drill with a first-move choice, a triage checklist, a way to tell the story and prevention steps.
- **14 interview questions,** each with a timer, a 60-second model answer, a key-point checklist, likely follow-ups and the mistake people make most often. The boss round plays all of them in a mock interview, and one coding round (the three best stores by revenue, with a rounded-down average).

## How it was checked

| Check | Result |
| --- | --- |
| Content lint (ids, tiers, code line ranges, diagram references, answer length, writing rules, the source tag on every screen, and every number the lessons quote against the recording) | Clean. 6 chapters, 105 screens: 82 for everyone, 21 for Senior, 2 extra. 29 screens are tagged Recorded and 11 From documentation. Quizzes, games and interview questions carry no tag |
| Every frame walked in Chromium (`dev/smoke.js`), with console, network, text size, overflow and markup checks | No errors on any path. Walked 166 frames on the Junior path, 207 on the Senior path and 209 on the Everything path |
| The same walk at phone width (390 by 844), Everything path | No horizontal overflow, no errors |
| Interaction test (`node dev/e2e.js mongodb`): every quiz, bug hunt, ordering game, decision, incident, interview question, coding problem and boss question, plus keys, text size, Map, paths, saving and reset | 373 checks passed, 0 failed |
| The 3 labs driven in the browser (`mongodb/verify/e2e_labs.js`): every chip of every lab, compared with the recording and with values worked out in the test | 104 checks passed |
| Recorded output (`mongodb/verify/capture_mongodb.py`) | 9 files, the texts, the tables and the counts: 32 recorded items in all. The recorder takes about 10 seconds against a mongod that is already running, and about 30 seconds with the container start. It removes the container it made |
| The files, parsed (`mongodb/verify/verify_mongodb.py`) | The 6 programs of the recording are the files on disk, and the 7 code screens that show one show it exactly. Every Python snippet of the lessons (32, with the bug hunts, their fixes and the solution of the coding round) goes through the Python parser. Parsing checks syntax and nothing else |
| The coding round, run | The solution on the screen is run on the server against the 20,000 orders and compared with the three best stores that plain Python worked out from the rules of the data. Four wrong solutions are all caught: one that counts refunded orders, one that sorts the lowest revenue first, one that keeps two stores, one that multiplies instead of dividing |
| Bug hunts run | 8 of the 9 hunts are run on a real mongod 8.0, each snippet next to its fix. Seen: `null` matches a missing field and the fix tells them apart, the text `"4"` is not the number 4, an `$unwind` before a `$group` counts the order total once for each line (stores get 1, 2 or 3 times their revenue, worked out independently), a `$match` after a `$group` finds nothing, an index with the sort field first examines more keys than the index with the equality fields first, an index on `status` alone walks almost the whole collection, a second `insert_many` stops with a duplicate key and the upsert does not, and the full document of an update is `None` after a delete. The 9th (a change stream consumer with no token) is checked as text, and its claim is run in a small experiment: a stream opened with no token missed the change written while it was down, and a resumed stream got it |
| Recapture (`verify_mongodb.py --recapture`) | The whole recording is made again on this machine and compared with `js/real.js`: 32 items, 0 differ. Nothing is timed, so only one thing is allowed to differ: the date |
| Lab data (`mongodb/verify/check_widgets.js`) | 27 checks written in code that shares nothing with the widgets: the 20,000 orders rebuilt from the rules of the data and grouped in plain JavaScript, the counts after each stage, the documents examined by each of the five queries, the events of the stream, and the cents by store of the coding round |
| Controls | 31 deliberately broken inputs, and each one is refused: Python with a syntax error (3), wrong solutions of the coding round (4), 15 changes to the recording that the widget checker must refuse (a match that left 19,201 documents, a store with one cent too little, a collection scan that examined 19,999 documents, a covered query that read a document, a validator that accepted a negative amount, an upsert that modified a document on the second run, an abort that left a document, a resumed stream that missed an event, and seven more), 3 changes to the recording that the recapture comparison must refuse, and 6 changes to the widget code that the browser test must catch |

### What was not checked

- **A sharded cluster, Atlas, Atlas Search, the Kafka connector, other drivers and `mongosh` did not run.** Anything that the lessons say about them is tagged From documentation.
- **One server version, one driver.** mongod 8.0.38 and pymongo 4.20.1. Another version may print other plan names or other error texts.
- **No timings.** The recording counts documents, keys and events, and never seconds. Nothing here says how fast a query runs, and the cost of an index is documentation.
- **A replica set of one member.** Election, failover, read preference and write concern across members were not run.
- **Only the screens listed under "Screens looked at" were reviewed by eye.** Every other screen was checked by the tests above and was not looked at.

### Re-check before you rely on it

| Claim | Where it comes from | Link |
| --- | --- | --- |
| The 16 MB limit of a document, the `_id` rule and the error for a document that is too large | **Recorded**: the server reported the limit, and a document of 17 MB was refused | none |
| The order of the fields in a compound index (equality, then sort, then range: the ESR rule) | The equality-then-sort case is recorded. The name ESR and the rule for ranges are **from my memory of the MongoDB documentation, not looked up** | none |
| A change stream needs a replica set or a sharded cluster, and the oplog keeps changes for a limited time, so a resume token that is too old fails | A replica set of one member is recorded. The retention of the oplog is **from my memory, not looked up and not run** | none |
| Atlas, Atlas Search, sharding and the choice of a shard key | **From documentation, not looked up** | none |
| The job postings: direction only, from search summaries | Pages of job boards. A small sample | [MongoDB Software Engineer 3](https://startup.jobs/software-engineer-3-mongodb-7980718) |

## Screens looked at

These are the only screens that were reviewed by eye, at 1440 by 900:

- Three diagrams: what goes inside a document (the step with the embedded lines), the pipeline (the step of the `$unwind`), and the change stream (the step with the resume token), plus the same stream diagram on the map screen.
- The three labs in their first state: three ways to group the orders, five queries and what the server examined, and five writes.
- The welcome screen and the first screen of the coding round.
- Coach Mika, who is in every one of those screens.

Looking found one fault that the tests could not see, and it is fixed: in the stream diagram the subtitle "insert, update, delete" ran out of the box of the first node, on the map screen and on the stream screen. It now reads "any change". On the welcome screen the "Do this" box under the coach bubble is partly hidden by the footer on a 900 pixel screen. The Scala welcome screen does the same, so it comes from the shared page and was not changed in this course. Every screen that is not listed here was checked by the tests above and was not looked at.

## Files

```
mongodb/
  index.html, css/mongodb.css  the page and its colours
  js/config.js                 the course settings: Coach Mika, the paths, the levels
  js/graphs.js                 3 diagram specs
  js/widgets.js                the 3 labs
  js/content/                  one file per mission, 00 to 05
  js/real.js                   the recording: files, texts, tables and counts written by capture_mongodb.py
  verify/project/              the Brewline programs that ran: rules, load, shapes, pipelines, indexes, design, streams, challenge
  verify/mongolib.py           helpers of the recorder: a mongod in a Docker container, running the programs, masks and the writer of js/real.js
  verify/capture_mongodb.py    runs the programs and writes js/real.js
  verify/verify_mongodb.py     parses and runs the code, runs the bug hunts, compares a new recording with js/real.js, runs the controls
  verify/check_widgets.js      recomputes the numbers of the labs from the rules of the data
  verify/e2e_labs.js           drives the three labs in Chromium
  verify/dump_mongodb.js       lists the code, the commands and the strings of the course for verify_mongodb.py
  verify/requirements.txt      what the machine needs
  verify/INTEGRATION.md        what the hub page, the root README and package.json needed
```

## Run the checks

```bash
python3 -m venv mongo-env && mongo-env/bin/pip install pymongo
docker pull mongo:8.0
mongo-env/bin/python mongodb/verify/verify_mongodb.py                       # parse and run the code, the bug hunts, lab data and controls
mongo-env/bin/python mongodb/verify/verify_mongodb.py --recapture --browser # also record everything again and compare, and drive the labs (needs Playwright)
mongo-env/bin/python mongodb/verify/capture_mongodb.py                      # write a new mongodb/js/real.js
node dev/lint-content.js mongodb && node dev/e2e.js mongodb                # lint and interaction test
node dev/smoke.js mongodb --path all                                        # walk every frame
node mongodb/verify/check_widgets.js && node mongodb/verify/e2e_labs.js     # the lab data, and the labs in a browser
```
