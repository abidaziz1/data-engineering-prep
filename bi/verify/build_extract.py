"""Build a Tableau extract (.hyper) from a CSV file, and append a later file to it. Uses the Hyper API, the engine behind a Tableau extract."""
from tableauhyperapi import Connection, CreateMode, HyperProcess, Telemetry, escape_string_literal

TABLE = """CREATE TABLE sales (
  order_id int NOT NULL, line_no int NOT NULL, order_date date NOT NULL,
  store_id text NOT NULL, region text NOT NULL, customer_id int NOT NULL,
  product_id int NOT NULL, category text NOT NULL, quantity int NOT NULL,
  line_amount double precision NOT NULL, status text NOT NULL)"""


def build(hyper, csv_file, extract):
    """A full refresh: a new file with every row of the CSV."""
    with Connection(hyper.endpoint, extract, CreateMode.CREATE_AND_REPLACE) as con:
        con.execute_command(TABLE)
        return con.execute_command(f"COPY sales FROM {escape_string_literal(csv_file)} WITH (format csv, header)")


def append(hyper, csv_file, extract):
    """An incremental refresh: add the rows of a newer file. Rows that are already in the extract are not looked at."""
    with Connection(hyper.endpoint, extract, CreateMode.NONE) as con:
        return con.execute_command(f"COPY sales FROM {escape_string_literal(csv_file)} WITH (format csv, header)")


def start(log_dir):
    return HyperProcess(telemetry=Telemetry.DO_NOT_SEND_USAGE_DATA_TO_TABLEAU, parameters={"log_dir": log_dir})
