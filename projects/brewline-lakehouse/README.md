# Brewline lakehouse: Spark and Delta Lake, bronze to gold

A small medallion lakehouse for a coffee retailer, built the way a senior data engineer would defend it: raw files that are never lost, a silver layer that validates, de-duplicates and merges safely, a quarantine for what breaks a rule, gold tables that are rebuilt for exactly the days that changed, and a quality gate that fails the run when the layers disagree.

```
landing files (JSON lines)  ->  bronze (raw text + where it came from)  ->  silver (validated, merged)  ->  gold (daily revenue)
                                                                        \->  quarantine (bad rows, with the reason)
                                                                                      quality gate after every run
```

Delta Lake gives every table a history, so a table can be read as it was at an earlier version. The source is a stand-in: `lakehouse/landing.py` writes the files of three days, with fixed rules, so that every run gives the same numbers.

## Run it

```bash
make setup               # a virtual environment with pyspark 4.0.1 and delta-spark 4.0.1 (Java 17 or later is needed)
make test                # 7 tests, about two minutes: the source, the rules, and the pipeline end to end
make day-1               # land the files of day 1, then bronze, silver, gold, and the gate
make day-2               # new orders, status changes with one refund, and a file that is delivered twice
make day-3               # a field that nobody announced, amounts that are text, and an old event that arrives late
python -m lakehouse.tour # the history of silver, the table at each version, and the quarantine
```

## What is in it

| File | What it does |
| --- | --- |
| `lakehouse/landing.py` | The pretend source: three days of order events, with dirty lines on purpose |
| `lakehouse/bronze.py` | Appends the raw text of every line of every new file, with its file and line number. A ledger of the ingested files makes the step safe to repeat |
| `lakehouse/rules.py` | The validation rules as Spark expressions, and the one place that parses the raw text |
| `lakehouse/silver.py` | Parses, quarantines the bad rows with their reason, keeps the latest event of each order in the batch, and merges into silver: an event is applied only when it is newer than the one in the table. The order date is set once, when the order is first inserted |
| `lakehouse/gold.py` | Daily revenue for each store, by the date when the order was placed, without the refunded orders. It recomputes the days of the orders that a run touched, and replaces each day as a whole |
| `lakehouse/quality.py` | The gate: every bronze row is valid or quarantined, one silver row for each order, and gold equals silver in revenue and in orders |
| `lakehouse/run.py` | One run for one day: the steps in order, and an exit code of 1 if the gate fails |
| `lakehouse/tour.py` | A look at the history and the versions of a Delta table |
| `tests/` | The source, the rules on a handful of records, and the pipeline over three days with a replay and a late event |

## Design decisions

- **Bronze keeps the text.** A line that is cut, or has the wrong type, or has a field that nobody announced, still reaches bronze. Parsing happens in silver, where a failure becomes a quarantined row with a reason and not a lost one.
- **Merge, and only when newer.** The merge updates a row only when the event is newer than the one in silver, so a file that is delivered twice, or an old event that arrives late, changes nothing.
- **Quarantine, not delete.** A row that breaks a rule is kept with the reason (`parse_error`, `bad_type`, `bad_amount`, `bad_status`, `unknown_store`). A replay quarantines the same rows again, so the quarantine can hold repeats.
- **Gold by order date.** An order stays on the day when it was placed, so a shipment never moves revenue between days. A refund restates the day of its order. Each affected day is replaced as a whole with `replaceWhere`, so a repeat leaves the same table.
- **A gate that fails the run.** Layers that disagree are a bug, and the exit code stops whatever comes next.

## What is not covered

No cloud storage, no cluster, no streaming, no schema registry, no table maintenance (`OPTIMIZE`, `VACUUM`), no access control, no scheduler, no alerts and no deployment. The Dockerfile and the CI workflow are sketches that did not run.

Three limits of the design itself:

- **The gate compares the layers with each other, not with the source.** A file that never arrived makes every layer agree. A manifest from the source, with its files and rows, would catch it.
- **The order date is the date of the first event that silver saw.** If the first event to arrive is a late one, the date is wrong.
- **No deletes.** The pretend source never deletes an order, and a stream of events cannot show a delete unless the source sends one.
