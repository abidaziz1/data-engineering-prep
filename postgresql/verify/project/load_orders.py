"""Load a file of orders into PostgreSQL: COPY into a temporary table, then one upsert that touches only the rows that changed."""
import pathlib
import sys

import psycopg

UPSERT = pathlib.Path(__file__).with_name('upsert.sql').read_text()


def load(dsn, csv_path):
    with psycopg.connect(dsn) as con:
        with con.transaction():
            con.execute('CREATE TEMP TABLE stg (LIKE orders) ON COMMIT DROP')
            with con.cursor().copy('COPY stg FROM STDIN (FORMAT csv, HEADER true)') as copy:
                with open(csv_path, 'rb') as f:
                    while chunk := f.read(65536):
                        copy.write(chunk)
            return con.execute(UPSERT).rowcount


if __name__ == '__main__':
    print(load(sys.argv[1], sys.argv[2]))
