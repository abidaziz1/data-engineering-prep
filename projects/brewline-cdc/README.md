# Brewline CDC: PostgreSQL, Debezium, Kafka, Spark and Delta Lake

A small change data capture pipeline for a coffee retailer, built the way a senior data engineer would defend it: the changes of the shop's database are read from its log, travel through Kafka, and become a table that always matches the database. Every change is applied once in effect, even when a message is delivered twice. A delete is a mark that an old event cannot undo. A gate compares the table with the database itself.

```
Postgres (orders)  ->  WAL + replication slot  ->  Debezium (Kafka Connect)  ->  Kafka topic
                                                                                     |
        silver (current state, soft deletes)  <-  stream with foreachBatch  <-  bronze (every message, as text)
                          \--- quality gate: silver against the rows of Postgres ---/
```

The database is a stand-in: `db/seed.sql` and `db/changes.sql` hold a small, deterministic shop. The services run on one machine, without containers, through `stack/local.py`.

## Run it

You need Java 17 or later, the PostgreSQL 16 server programs, an unpacked Apache Kafka 4.4.0, and the Debezium PostgreSQL connector 3.7.1.Final (the plugin archive of Maven Central, unpacked).

```bash
make setup                                   # a virtual environment with pyspark 4.0.1 and delta-spark 4.0.1
make test                                    # 8 tests, about two minutes: the parser and the merge, with no service
export KAFKA_HOME=... DEBEZIUM_PLUGINS=...   # see stack/local.py for what each one is
make stack                                   # PostgreSQL, Kafka and Kafka Connect; prints the settings to export
# in another terminal, with the settings that it printed exported:
psql -U postgres -d brewline -f db/schema.sql -f db/seed.sql    # the table, the publication, the role, and 200 orders
python connect/register.py                   # starts the connector: a snapshot, and then the changes
make run                                     # bronze, silver, and the gate
psql -U postgres -d brewline -f db/changes.sql && make run      # a day of changes
python -m cdc.run --replay-last-batch        # what a crash before the commit of a batch looks like
```

## What is in it

| File | What it does |
| --- | --- |
| `db/schema.sql` | The `orders` table, the publication that Debezium reads, and the role of the connector |
| `db/seed.sql`, `db/changes.sql`, `db/backlog.sql` | The shop: 200 orders, a day of inserts, updates and deletes, and 100 updates that happen while the connector is stopped |
| `connect/orders-connector.json` | The Debezium connector: the table, the slot, the publication, a snapshot first, and JSON without a schema |
| `connect/register.py` | Creates or updates the connector on a Connect worker |
| `cdc/envelope.py` | The change event as Spark columns: the key, the operation, the log position and the row |
| `cdc/bronze.py` | Reads the new messages of the topic into a Delta table, as text, with their partition and offset. A checkpoint remembers what was read |
| `cdc/silver.py` | Keeps the latest event of each order in a batch, and merges it into silver only when its log position is newer. A delete marks the row |
| `cdc/stream.py` | The streaming job: it reads the new rows of bronze and applies each micro-batch to silver |
| `cdc/quality.py` | The gate: the messages of the topic are in bronze, one silver row for each order, and the live orders equal the rows of Postgres |
| `cdc/run.py` | One run: bronze, silver, the gate, and an exit code of 1 if the gate fails |
| `stack/local.py` | PostgreSQL, Kafka and a Connect worker with the Debezium plugin, on one machine |
| `tests/` | The parser, and the merge: order, repeats, two events of one row in a batch, deletes |

## Design decisions

- **Read the log, not the table.** Debezium reads the write-ahead log through a replication slot, so it sees every update and every delete, and it does not query the table again and again.
- **Order by the log position, not by arrival.** Every event carries the `lsn` of the log. A message that arrives twice, or after a newer one, has an `lsn` that is not newer than the row, and the merge leaves the row alone.
- **One event for each row in a batch.** Delta Lake refuses a merge in which two source rows match one row of the table, so the batch keeps the latest event of each key first.
- **A delete is a mark.** The row stays, with `is_deleted` and the `lsn` of the delete. If the row were removed, an old event that arrives late would insert it again.
- **At-least-once everywhere, and a merge that is safe to repeat.** A connector that restarts can send a message again, and `foreachBatch` can run a batch again after a crash. Neither changes silver.
- **A gate that reads the source.** The gate compares silver with the rows of Postgres, so a message that never reached Kafka makes it fail.
- **A slot holds the log.** While the connector is stopped, Postgres keeps the log that the slot has not confirmed. That is what makes the connector safe to restart, and it is what fills the disk when nobody restarts it.

## What is not covered

No schema change (adding or renaming a column), no incremental snapshot of a large table, one partition only (so no ordering question between partitions), no schema registry or Avro, no TLS or login, no cloud storage, no cluster of brokers or workers, no scheduler and no alerts. The CI workflow is a sketch that did not run.

Two limits of the design itself:

- **Order is by `lsn` for one table and one partition.** Events of two tables, or of one table in two partitions, have no common order here.
- **A new field in the table changes the events.** The parser knows five columns, and a sixth is ignored until someone adds it.
