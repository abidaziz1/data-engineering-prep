"""Simulate the next day of loads into RAW: a changed order, a new order, and two customers that change.
Usage: python3 day2.py <path-to-duckdb-file>"""
import sys
import duckdb

con = duckdb.connect(sys.argv[1])
con.execute("insert into raw.orders values ('O-5010','C-77','2026-03-17 16:20:00','SHIPPED',20.00,'2026-03-18 09:00:00'), ('O-5011','C-91','2026-03-18 08:15:00','PLACED',28.50,'2026-03-18 09:00:00')")
con.execute("insert into raw.order_items values ('O-5011',1,'P-12',1,16.00,'2026-03-18 09:00:00'), ('O-5011',2,'P-11',1,12.50,'2026-03-18 09:00:00')")
con.execute("update raw.customers set tier = 'gold', _loaded_at = '2026-03-18 06:00:00' where customer_id = 'C-42'")
con.execute("update raw.customers set country = 'de', _loaded_at = '2026-03-18 06:00:00' where customer_id = 'C-77'")
print('day 2 loaded')
