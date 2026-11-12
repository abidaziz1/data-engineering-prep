window.LAB = window.LAB || {};
LAB.real = {
 "counts": {
  "data.sizes": {
   "big": {
    "big_customers": 3000,
    "big_items": 90000,
    "big_orders": 30000
   },
   "big_agree": {
    "big_customers": [
     3000,
     3000,
     3000
    ],
    "big_items": [
     90000,
     90000,
     90000
    ],
    "big_orders": [
     30000,
     30000,
     30000
    ]
   },
   "mini": {
    "categories": 9,
    "customer_changes": 4,
    "customer_dim": 5,
    "customers": 8,
    "daily_active": 14,
    "daily_revenue": 10,
    "events": 24,
    "order_items": 19,
    "orders": 12,
    "orders_raw": 9,
    "payments": 12,
    "price_history": 8,
    "products": 6,
    "stores": 4
   }
  },
  "m1.stages": {
   "engine": "duckdb",
   "stages": [
    {
     "clause": "FROM and JOIN",
     "rows": 11,
     "table": "m1.stage.0"
    },
    {
     "clause": "WHERE",
     "rows": 8,
     "table": "m1.stage.1"
    },
    {
     "clause": "GROUP BY",
     "rows": 3,
     "table": "m1.stage.2"
    },
    {
     "clause": "HAVING",
     "rows": 2,
     "table": "m1.stage.3"
    },
    {
     "clause": "SELECT",
     "rows": 2,
     "table": "m1.stage.4"
    },
    {
     "clause": "ORDER BY",
     "rows": 2,
     "table": "m1.stage.5"
    },
    {
     "clause": "LIMIT",
     "rows": 2,
     "table": "m1.stage.6"
    }
   ]
  },
  "m2.truth": {
   "not": {
    "duckdb": [
     "false",
     "true",
     "NULL"
    ],
    "postgres": [
     "false",
     "true",
     "NULL"
    ],
    "sqlite": [
     "0",
     "1",
     "NULL"
    ]
   },
   "ops": [
    {
     "expr": "a AND b",
     "grid": {
      "duckdb": [
       [
        "true",
        "false",
        "NULL"
       ],
       [
        "false",
        "false",
        "false"
       ],
       [
        "NULL",
        "false",
        "NULL"
       ]
      ],
      "postgres": [
       [
        "true",
        "false",
        "NULL"
       ],
       [
        "false",
        "false",
        "false"
       ],
       [
        "NULL",
        "false",
        "NULL"
       ]
      ],
      "sqlite": [
       [
        "1",
        "0",
        "NULL"
       ],
       [
        "0",
        "0",
        "0"
       ],
       [
        "NULL",
        "0",
        "NULL"
       ]
      ]
     },
     "name": "AND"
    },
    {
     "expr": "a OR b",
     "grid": {
      "duckdb": [
       [
        "true",
        "true",
        "true"
       ],
       [
        "true",
        "false",
        "NULL"
       ],
       [
        "true",
        "NULL",
        "NULL"
       ]
      ],
      "postgres": [
       [
        "true",
        "true",
        "true"
       ],
       [
        "true",
        "false",
        "NULL"
       ],
       [
        "true",
        "NULL",
        "NULL"
       ]
      ],
      "sqlite": [
       [
        "1",
        "1",
        "1"
       ],
       [
        "1",
        "0",
        "NULL"
       ],
       [
        "1",
        "NULL",
        "NULL"
       ]
      ]
     },
     "name": "OR"
    },
    {
     "expr": "a = b",
     "grid": {
      "duckdb": [
       [
        "true",
        "false",
        "NULL"
       ],
       [
        "false",
        "true",
        "NULL"
       ],
       [
        "NULL",
        "NULL",
        "NULL"
       ]
      ],
      "postgres": [
       [
        "true",
        "false",
        "NULL"
       ],
       [
        "false",
        "true",
        "NULL"
       ],
       [
        "NULL",
        "NULL",
        "NULL"
       ]
      ],
      "sqlite": [
       [
        "1",
        "0",
        "NULL"
       ],
       [
        "0",
        "1",
        "NULL"
       ],
       [
        "NULL",
        "NULL",
        "NULL"
       ]
      ]
     },
     "name": "="
    },
    {
     "expr": "a <> b",
     "grid": {
      "duckdb": [
       [
        "false",
        "true",
        "NULL"
       ],
       [
        "true",
        "false",
        "NULL"
       ],
       [
        "NULL",
        "NULL",
        "NULL"
       ]
      ],
      "postgres": [
       [
        "false",
        "true",
        "NULL"
       ],
       [
        "true",
        "false",
        "NULL"
       ],
       [
        "NULL",
        "NULL",
        "NULL"
       ]
      ],
      "sqlite": [
       [
        "0",
        "1",
        "NULL"
       ],
       [
        "1",
        "0",
        "NULL"
       ],
       [
        "NULL",
        "NULL",
        "NULL"
       ]
      ]
     },
     "name": "<>"
    },
    {
     "expr": "a IS NOT DISTINCT FROM b",
     "grid": {
      "duckdb": [
       [
        "true",
        "false",
        "false"
       ],
       [
        "false",
        "true",
        "false"
       ],
       [
        "false",
        "false",
        "true"
       ]
      ],
      "postgres": [
       [
        "true",
        "false",
        "false"
       ],
       [
        "false",
        "true",
        "false"
       ],
       [
        "false",
        "false",
        "true"
       ]
      ],
      "sqlite": [
       [
        "1",
        "0",
        "0"
       ],
       [
        "0",
        "1",
        "0"
       ],
       [
        "0",
        "0",
        "1"
       ]
      ]
     },
     "name": "IS NOT DISTINCT FROM"
    },
    {
     "expr": "a IS DISTINCT FROM b",
     "grid": {
      "duckdb": [
       [
        "false",
        "true",
        "true"
       ],
       [
        "true",
        "false",
        "true"
       ],
       [
        "true",
        "true",
        "false"
       ]
      ],
      "postgres": [
       [
        "false",
        "true",
        "true"
       ],
       [
        "true",
        "false",
        "true"
       ],
       [
        "true",
        "true",
        "false"
       ]
      ],
      "sqlite": [
       [
        "0",
        "1",
        "1"
       ],
       [
        "1",
        "0",
        "1"
       ],
       [
        "1",
        "1",
        "0"
       ]
      ]
     },
     "name": "IS DISTINCT FROM"
    }
   ],
   "sample": "SELECT TRUE AND NULL",
   "vals": [
    "TRUE",
    "FALSE",
    "NULL"
   ]
  },
  "m3.fanout": {
   "combos": [
    {
     "items": false,
     "method": "sum",
     "payments": false,
     "result": {
      "duckdb": [
       "9",
       "9",
       "127.00"
      ],
      "postgres": [
       "9",
       "9",
       "127.00"
      ],
      "sqlite": [
       "9",
       "9",
       "127.0"
      ]
     },
     "sql": "SELECT count(*) AS rows, count(DISTINCT o.order_id) AS orders, sum(o.total) AS revenue\nFROM orders AS o\nWHERE o.status = 'paid'"
    },
    {
     "items": false,
     "method": "distinct",
     "payments": false,
     "result": {
      "duckdb": [
       "9",
       "9",
       "127.00"
      ],
      "postgres": [
       "9",
       "9",
       "127.00"
      ],
      "sqlite": [
       "9",
       "9",
       "127.0"
      ]
     },
     "sql": "SELECT count(*) AS rows, count(DISTINCT o.order_id) AS orders, sum(DISTINCT o.total) AS revenue\nFROM orders AS o\nWHERE o.status = 'paid'"
    },
    {
     "items": false,
     "method": "preaggregate",
     "payments": false,
     "result": {
      "duckdb": [
       "9",
       "9",
       "127.00"
      ],
      "postgres": [
       "9",
       "9",
       "127.00"
      ],
      "sqlite": [
       "9",
       "9",
       "127.0"
      ]
     },
     "sql": "SELECT count(*) AS rows, count(DISTINCT o.order_id) AS orders, sum(o.total) AS revenue\nFROM orders AS o\nWHERE o.status = 'paid'"
    },
    {
     "items": false,
     "method": "sum",
     "payments": true,
     "result": {
      "duckdb": [
       "10",
       "9",
       "145.50"
      ],
      "postgres": [
       "10",
       "9",
       "145.50"
      ],
      "sqlite": [
       "10",
       "9",
       "145.5"
      ]
     },
     "sql": "SELECT count(*) AS rows, count(DISTINCT o.order_id) AS orders, sum(o.total) AS revenue\nFROM orders AS o\nJOIN payments AS p ON p.order_id = o.order_id\nWHERE o.status = 'paid'"
    },
    {
     "items": false,
     "method": "distinct",
     "payments": true,
     "result": {
      "duckdb": [
       "10",
       "9",
       "127.00"
      ],
      "postgres": [
       "10",
       "9",
       "127.00"
      ],
      "sqlite": [
       "10",
       "9",
       "127.0"
      ]
     },
     "sql": "SELECT count(*) AS rows, count(DISTINCT o.order_id) AS orders, sum(DISTINCT o.total) AS revenue\nFROM orders AS o\nJOIN payments AS p ON p.order_id = o.order_id\nWHERE o.status = 'paid'"
    },
    {
     "items": false,
     "method": "preaggregate",
     "payments": true,
     "result": {
      "duckdb": [
       "9",
       "9",
       "127.00"
      ],
      "postgres": [
       "9",
       "9",
       "127.00"
      ],
      "sqlite": [
       "9",
       "9",
       "127.0"
      ]
     },
     "sql": "WITH paid_by_order AS (SELECT order_id, sum(amount) AS net_paid FROM payments GROUP BY order_id)\nSELECT count(*) AS rows, count(DISTINCT o.order_id) AS orders, sum(o.total) AS revenue\nFROM orders AS o\nLEFT JOIN paid_by_order AS p ON p.order_id = o.order_id\nWHERE o.status = 'paid'"
    },
    {
     "items": true,
     "method": "sum",
     "payments": false,
     "result": {
      "duckdb": [
       "15",
       "9",
       "228.00"
      ],
      "postgres": [
       "15",
       "9",
       "228.00"
      ],
      "sqlite": [
       "15",
       "9",
       "228.0"
      ]
     },
     "sql": "SELECT count(*) AS rows, count(DISTINCT o.order_id) AS orders, sum(o.total) AS revenue\nFROM orders AS o\nJOIN order_items AS i ON i.order_id = o.order_id\nWHERE o.status = 'paid'"
    },
    {
     "items": true,
     "method": "distinct",
     "payments": false,
     "result": {
      "duckdb": [
       "15",
       "9",
       "127.00"
      ],
      "postgres": [
       "15",
       "9",
       "127.00"
      ],
      "sqlite": [
       "15",
       "9",
       "127.0"
      ]
     },
     "sql": "SELECT count(*) AS rows, count(DISTINCT o.order_id) AS orders, sum(DISTINCT o.total) AS revenue\nFROM orders AS o\nJOIN order_items AS i ON i.order_id = o.order_id\nWHERE o.status = 'paid'"
    },
    {
     "items": true,
     "method": "preaggregate",
     "payments": false,
     "result": {
      "duckdb": [
       "9",
       "9",
       "127.00"
      ],
      "postgres": [
       "9",
       "9",
       "127.00"
      ],
      "sqlite": [
       "9",
       "9",
       "127.0"
      ]
     },
     "sql": "WITH items_by_order AS (SELECT order_id, count(*) AS lines FROM order_items GROUP BY order_id)\nSELECT count(*) AS rows, count(DISTINCT o.order_id) AS orders, sum(o.total) AS revenue\nFROM orders AS o\nLEFT JOIN items_by_order AS i ON i.order_id = o.order_id\nWHERE o.status = 'paid'"
    },
    {
     "items": true,
     "method": "sum",
     "payments": true,
     "result": {
      "duckdb": [
       "17",
       "9",
       "265.00"
      ],
      "postgres": [
       "17",
       "9",
       "265.00"
      ],
      "sqlite": [
       "17",
       "9",
       "265.0"
      ]
     },
     "sql": "SELECT count(*) AS rows, count(DISTINCT o.order_id) AS orders, sum(o.total) AS revenue\nFROM orders AS o\nJOIN order_items AS i ON i.order_id = o.order_id\nJOIN payments AS p ON p.order_id = o.order_id\nWHERE o.status = 'paid'"
    },
    {
     "items": true,
     "method": "distinct",
     "payments": true,
     "result": {
      "duckdb": [
       "17",
       "9",
       "127.00"
      ],
      "postgres": [
       "17",
       "9",
       "127.00"
      ],
      "sqlite": [
       "17",
       "9",
       "127.0"
      ]
     },
     "sql": "SELECT count(*) AS rows, count(DISTINCT o.order_id) AS orders, sum(DISTINCT o.total) AS revenue\nFROM orders AS o\nJOIN order_items AS i ON i.order_id = o.order_id\nJOIN payments AS p ON p.order_id = o.order_id\nWHERE o.status = 'paid'"
    },
    {
     "items": true,
     "method": "preaggregate",
     "payments": true,
     "result": {
      "duckdb": [
       "9",
       "9",
       "127.00"
      ],
      "postgres": [
       "9",
       "9",
       "127.00"
      ],
      "sqlite": [
       "9",
       "9",
       "127.0"
      ]
     },
     "sql": "WITH items_by_order AS (SELECT order_id, count(*) AS lines FROM order_items GROUP BY order_id),\n     paid_by_order AS (SELECT order_id, sum(amount) AS net_paid FROM payments GROUP BY order_id)\nSELECT count(*) AS rows, count(DISTINCT o.order_id) AS orders, sum(o.total) AS revenue\nFROM orders AS o\nLEFT JOIN items_by_order AS i ON i.order_id = o.order_id\nLEFT JOIN paid_by_order AS p ON p.order_id = o.order_id\nWHERE o.status = 'paid'"
    }
   ],
   "truth": "127.00"
  },
  "m3.jointypes": {
   "types": [
    {
     "rows": {
      "duckdb": 11,
      "postgres": 11,
      "sqlite": 11
     },
     "sql_key": "m3.jointype.inner",
     "type": "INNER"
    },
    {
     "rows": {
      "duckdb": 13,
      "postgres": 13,
      "sqlite": 13
     },
     "sql_key": "m3.jointype.left",
     "type": "LEFT"
    },
    {
     "rows": {
      "duckdb": 12,
      "postgres": 12,
      "sqlite": 12
     },
     "sql_key": "m3.jointype.right",
     "type": "RIGHT"
    },
    {
     "rows": {
      "duckdb": 14,
      "postgres": 14,
      "sqlite": 14
     },
     "sql_key": "m3.jointype.full",
     "type": "FULL"
    },
    {
     "rows": {
      "duckdb": 96,
      "postgres": 96,
      "sqlite": 96
     },
     "sql_key": "m3.jointype.cross",
     "type": "CROSS"
    }
   ]
  },
  "m4.sets": {
   "variants": [
    {
     "agree": true,
     "engines": [
      "duckdb",
      "postgres",
      "sqlite"
     ],
     "key": "m4.set.0",
     "label": "by store",
     "rows": 3
    },
    {
     "agree": true,
     "engines": [
      "duckdb",
      "postgres",
      "sqlite"
     ],
     "key": "m4.set.1",
     "label": "by channel",
     "rows": 3
    },
    {
     "agree": true,
     "engines": [
      "duckdb",
      "postgres",
      "sqlite"
     ],
     "key": "m4.set.2",
     "label": "by store and channel",
     "rows": 7
    },
    {
     "agree": true,
     "engines": [
      "duckdb",
      "postgres"
     ],
     "key": "m4.set.3",
     "label": "ROLLUP (store, channel)",
     "rows": 11
    },
    {
     "agree": true,
     "engines": [
      "duckdb",
      "postgres"
     ],
     "key": "m4.set.4",
     "label": "ROLLUP (channel, store)",
     "rows": 11
    },
    {
     "agree": true,
     "engines": [
      "duckdb",
      "postgres"
     ],
     "key": "m4.set.5",
     "label": "CUBE (store, channel)",
     "rows": 14
    },
    {
     "agree": true,
     "engines": [
      "duckdb",
      "postgres"
     ],
     "key": "m4.set.6",
     "label": "GROUPING SETS",
     "rows": 7
    }
   ]
  }
 },
 "files": {
  "data/big.duckdb.sql": "-- Made by arithmetic: no random numbers, so every engine holds the same rows.\n\nCREATE TABLE big_customers AS\nSELECT i AS customer_id, CASE i % 4 WHEN 0 THEN 'SG' WHEN 1 THEN 'MY' WHEN 2 THEN 'ID' ELSE 'AU' END AS country, CASE i % 3 WHEN 0 THEN 'gold' WHEN 1 THEN 'silver' ELSE 'bronze' END AS tier, DATE '2025-10-01' + ((i * 37) % 150)::INTEGER AS signup_date\nFROM generate_series(1, 3000) AS g(i);\n\nCREATE TABLE big_items AS\nSELECT order_id, line_no, product_id, qty, CASE product_id WHEN 1 THEN 3.50 WHEN 2 THEN 4.50 WHEN 3 THEN 5.00 WHEN 4 THEN 14.00 WHEN 5 THEN 12.00 ELSE 5.50 END AS unit_price\nFROM (\n  SELECT i AS order_id, l AS line_no, 1 + ((i * 3 + l) % 6) AS product_id, 1 + ((i + l) % 3) AS qty\n  FROM generate_series(1, 30000) AS g(i), generate_series(1, 3) AS h(l)\n) s;\n\nCREATE TABLE big_orders AS\nSELECT i AS order_id, 1 + ((i * 7919) % 3000) AS customer_id, 1 + ((i * 13) % 4) AS store_id,\n       TIMESTAMP '2026-01-01 00:00:00' + ((i * 4177) % 7776000) * INTERVAL '1 second' AS order_ts,\n       CASE WHEN i % 20 = 0 THEN 'cancelled' WHEN i % 25 = 0 THEN 'refunded' WHEN i % 97 = 0 THEN 'pending' ELSE 'paid' END AS status,\n       t.total AS total\nFROM generate_series(1, 30000) AS g(i)\nJOIN (SELECT order_id, sum(qty * unit_price) AS total FROM big_items GROUP BY order_id) t ON t.order_id = g.i;\n",
  "data/big.postgres.sql": "-- Made by arithmetic: no random numbers, so every engine holds the same rows.\n\nCREATE TABLE big_customers AS\nSELECT i AS customer_id, CASE i % 4 WHEN 0 THEN 'SG' WHEN 1 THEN 'MY' WHEN 2 THEN 'ID' ELSE 'AU' END AS country, CASE i % 3 WHEN 0 THEN 'gold' WHEN 1 THEN 'silver' ELSE 'bronze' END AS tier, DATE '2025-10-01' + ((i * 37) % 150)::INTEGER AS signup_date\nFROM generate_series(1, 3000) AS g(i);\n\nCREATE TABLE big_items AS\nSELECT order_id, line_no, product_id, qty, CASE product_id WHEN 1 THEN 3.50 WHEN 2 THEN 4.50 WHEN 3 THEN 5.00 WHEN 4 THEN 14.00 WHEN 5 THEN 12.00 ELSE 5.50 END AS unit_price\nFROM (\n  SELECT i AS order_id, l AS line_no, 1 + ((i * 3 + l) % 6) AS product_id, 1 + ((i + l) % 3) AS qty\n  FROM generate_series(1, 30000) AS g(i), generate_series(1, 3) AS h(l)\n) s;\n\nCREATE TABLE big_orders AS\nSELECT i AS order_id, 1 + ((i * 7919) % 3000) AS customer_id, 1 + ((i * 13) % 4) AS store_id,\n       TIMESTAMP '2026-01-01 00:00:00' + ((i * 4177) % 7776000) * INTERVAL '1 second' AS order_ts,\n       CASE WHEN i % 20 = 0 THEN 'cancelled' WHEN i % 25 = 0 THEN 'refunded' WHEN i % 97 = 0 THEN 'pending' ELSE 'paid' END AS status,\n       t.total AS total\nFROM generate_series(1, 30000) AS g(i)\nJOIN (SELECT order_id, sum(qty * unit_price) AS total FROM big_items GROUP BY order_id) t ON t.order_id = g.i;\n",
  "data/big.sqlite.sql": "-- Made by arithmetic: no random numbers, so every engine holds the same rows.\n\nCREATE TABLE big_customers AS\nWITH RECURSIVE g(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM g WHERE i < 3000)\nSELECT i AS customer_id, CASE i % 4 WHEN 0 THEN 'SG' WHEN 1 THEN 'MY' WHEN 2 THEN 'ID' ELSE 'AU' END AS country, CASE i % 3 WHEN 0 THEN 'gold' WHEN 1 THEN 'silver' ELSE 'bronze' END AS tier, date('2025-10-01', '+' || ((i * 37) % 150) || ' days') AS signup_date\nFROM g;\n\nCREATE TABLE big_items AS\nWITH RECURSIVE g(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM g WHERE i < 30000)\nSELECT order_id, line_no, product_id, qty, CASE product_id WHEN 1 THEN 3.50 WHEN 2 THEN 4.50 WHEN 3 THEN 5.00 WHEN 4 THEN 14.00 WHEN 5 THEN 12.00 ELSE 5.50 END AS unit_price\nFROM (\n  SELECT g.i AS order_id, l.l AS line_no, 1 + ((g.i * 3 + l.l) % 6) AS product_id, 1 + ((g.i + l.l) % 3) AS qty\n  FROM g, (SELECT 1 AS l UNION ALL SELECT 2 UNION ALL SELECT 3) l\n) s;\n\nCREATE TABLE big_orders AS\nWITH RECURSIVE g(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM g WHERE i < 30000)\nSELECT i AS order_id, 1 + ((i * 7919) % 3000) AS customer_id, 1 + ((i * 13) % 4) AS store_id,\n       datetime('2026-01-01 00:00:00', '+' || ((i * 4177) % 7776000) || ' seconds') AS order_ts,\n       CASE WHEN i % 20 = 0 THEN 'cancelled' WHEN i % 25 = 0 THEN 'refunded' WHEN i % 97 = 0 THEN 'pending' ELSE 'paid' END AS status,\n       t.total AS total\nFROM g\nJOIN (SELECT order_id, sum(qty * unit_price) AS total FROM big_items GROUP BY order_id) t ON t.order_id = g.i;\n",
  "data/mini.sql": "-- The Brewline mini data: a few dozen made-up rows. The same script runs on DuckDB, PostgreSQL and SQLite.\n\nCREATE TABLE stores (\n  store_id INTEGER PRIMARY KEY,\n  name VARCHAR,\n  city VARCHAR,\n  country VARCHAR\n);\n\nINSERT INTO stores VALUES\n  (1, 'Orchard', 'Singapore', 'SG'),\n  (2, 'Bukit Bintang', 'Kuala Lumpur', 'MY'),\n  (3, 'Kemang', 'Jakarta', 'ID'),\n  (4, 'Surry Hills', 'Sydney', 'AU');\n\nCREATE TABLE customers (\n  customer_id INTEGER PRIMARY KEY,\n  name VARCHAR,\n  email VARCHAR,\n  country VARCHAR,\n  tier VARCHAR,\n  signup_date DATE\n);\n\nINSERT INTO customers VALUES\n  (1, 'Ana Lim', 'ana@example.com', 'SG', 'gold', '2026-01-05'),\n  (2, 'Ben Ortiz', NULL, 'MY', 'silver', '2026-01-12'),\n  (3, 'Chen Wei', 'chen@example.com', 'SG', NULL, '2026-01-20'),\n  (4, 'Dara Putri', 'dara@example.com', 'ID', 'silver', '2026-02-02'),\n  (5, 'Eli Cohen', 'eli@example.com', 'AU', 'gold', '2026-02-10'),\n  (6, 'Fay Tan', NULL, NULL, NULL, '2026-02-14'),\n  (7, 'Gus Hall', 'gus@example.com', 'AU', 'silver', '2026-02-20'),\n  (8, 'Hana Ito', 'hana@example.com', 'SG', 'gold', '2026-03-01');\n\nCREATE TABLE products (\n  product_id INTEGER PRIMARY KEY,\n  sku VARCHAR,\n  name VARCHAR,\n  category VARCHAR,\n  unit_price DECIMAL(10,2)\n);\n\nINSERT INTO products VALUES\n  (1, 'ESP-01', 'Espresso', 'hot', 3.50),\n  (2, 'LAT-01', 'Latte', 'hot', 4.50),\n  (3, 'CLD-01', 'Cold brew', 'cold', 5.00),\n  (4, 'BEA-01', 'House beans 250g', 'beans', 14.00),\n  (5, 'MUG-01', 'Brewline mug', 'merch', 12.00),\n  (6, 'MAT-01', 'Matcha', 'hot', 5.50);\n\nCREATE TABLE orders (\n  order_id INTEGER PRIMARY KEY,\n  customer_id INTEGER,\n  store_id INTEGER,\n  order_ts TIMESTAMP,\n  status VARCHAR,\n  channel VARCHAR,\n  total DECIMAL(10,2)\n);\n\nINSERT INTO orders VALUES\n  (1001, 1, 1, '2026-03-01 02:15:00', 'paid', 'web', 11.50),\n  (1002, 1, 1, '2026-03-03 09:40:00', 'paid', 'store', 18.50),\n  (1003, 2, 2, '2026-03-02 16:30:00', 'paid', 'app', 5.00),\n  (1004, 3, 1, '2026-03-02 23:50:00', 'paid', 'web', 26.00),\n  (1005, 4, 3, '2026-03-04 03:05:00', 'cancelled', 'app', 9.00),\n  (1006, 5, 4, '2026-03-04 21:10:00', 'paid', 'web', 14.00),\n  (1007, 1, 1, '2026-03-05 08:00:00', 'paid', 'app', 7.00),\n  (1008, 7, 4, '2026-03-06 10:20:00', 'refunded', 'web', 12.00),\n  (1009, NULL, 2, '2026-03-06 11:00:00', 'paid', 'store', 9.50),\n  (1010, 3, 1, '2026-03-07 12:30:00', 'paid', 'web', 19.00),\n  (1011, 5, 4, '2026-03-08 04:45:00', 'paid', 'app', 16.50),\n  (1012, 2, 2, '2026-03-09 15:00:00', 'pending', 'app', 8.00);\n\nCREATE TABLE order_items (\n  order_id INTEGER,\n  line_no INTEGER,\n  product_id INTEGER,\n  qty INTEGER,\n  unit_price DECIMAL(10,2),\n  PRIMARY KEY (order_id, line_no)\n);\n\nINSERT INTO order_items VALUES\n  (1001, 1, 1, 2, 3.50),\n  (1001, 2, 2, 1, 4.50),\n  (1002, 1, 4, 1, 14.00),\n  (1002, 2, 2, 1, 4.50),\n  (1003, 1, 3, 1, 5.00),\n  (1004, 1, 4, 1, 14.00),\n  (1004, 2, 5, 1, 12.00),\n  (1005, 1, 2, 2, 4.50),\n  (1006, 1, 4, 1, 14.00),\n  (1007, 1, 1, 2, 3.50),\n  (1008, 1, 5, 1, 12.00),\n  (1009, 1, 2, 1, 4.50),\n  (1009, 2, 3, 1, 5.00),\n  (1010, 1, 4, 1, 14.00),\n  (1010, 2, 3, 1, 5.00),\n  (1011, 1, 2, 1, 4.50),\n  (1011, 2, 5, 1, 12.00),\n  (1012, 1, 2, 1, 4.50),\n  (1012, 2, 1, 1, 3.50);\n\nCREATE TABLE payments (\n  payment_id INTEGER PRIMARY KEY,\n  order_id INTEGER,\n  paid_ts TIMESTAMP,\n  method VARCHAR,\n  amount DECIMAL(10,2),\n  status VARCHAR\n);\n\nINSERT INTO payments VALUES\n  (1, 1001, '2026-03-01 02:16:00', 'card', 11.50, 'ok'),\n  (2, 1002, '2026-03-03 09:41:00', 'card', 10.00, 'ok'),\n  (3, 1002, '2026-03-03 09:42:00', 'wallet', 8.50, 'ok'),\n  (4, 1003, '2026-03-02 16:31:00', 'wallet', 5.00, 'ok'),\n  (5, 1004, '2026-03-02 23:51:00', 'card', 26.00, 'ok'),\n  (6, 1006, '2026-03-04 21:11:00', 'card', 14.00, 'ok'),\n  (7, 1007, '2026-03-05 08:01:00', 'wallet', 7.00, 'ok'),\n  (8, 1008, '2026-03-06 10:21:00', 'card', 12.00, 'ok'),\n  (9, 1008, '2026-03-06 15:00:00', 'card', -12.00, 'refund'),\n  (10, 1009, '2026-03-06 11:01:00', 'cash', 9.50, 'ok'),\n  (11, 1010, '2026-03-07 12:31:00', 'card', 19.00, 'ok'),\n  (12, 1011, '2026-03-08 04:46:00', 'card', 16.50, 'ok');\n\nCREATE TABLE events (\n  event_id INTEGER PRIMARY KEY,\n  customer_id INTEGER,\n  event_ts TIMESTAMP,\n  event_type VARCHAR,\n  page VARCHAR\n);\n\nINSERT INTO events VALUES\n  (1, 1, '2026-03-02 09:00:00', 'view', 'home'),\n  (2, 1, '2026-03-02 09:04:00', 'view', 'product'),\n  (3, 1, '2026-03-02 09:09:00', 'add_to_cart', 'product'),\n  (4, 1, '2026-03-02 09:15:00', 'checkout', 'cart'),\n  (5, 1, '2026-03-02 09:16:00', 'purchase', 'done'),\n  (6, 1, '2026-03-02 14:02:00', 'view', 'home'),\n  (7, 1, '2026-03-02 14:05:00', 'view', 'product'),\n  (8, 2, '2026-03-02 10:00:00', 'view', 'home'),\n  (9, 2, '2026-03-02 10:40:00', 'view', 'product'),\n  (10, 2, '2026-03-02 10:46:00', 'add_to_cart', 'product'),\n  (11, 2, '2026-03-02 16:20:00', 'view', 'product'),\n  (12, 2, '2026-03-02 16:27:00', 'add_to_cart', 'product'),\n  (13, 2, '2026-03-02 16:29:00', 'checkout', 'cart'),\n  (14, 2, '2026-03-02 16:30:00', 'purchase', 'done'),\n  (15, 3, '2026-03-02 11:00:00', 'view', 'home'),\n  (16, 3, '2026-03-02 11:01:00', 'view', 'product'),\n  (17, 3, '2026-03-02 11:02:00', 'add_to_cart', 'product'),\n  (18, 3, '2026-03-02 11:03:00', 'checkout', 'cart'),\n  (19, 3, '2026-03-02 23:42:00', 'view', 'product'),\n  (20, 3, '2026-03-02 23:45:00', 'add_to_cart', 'product'),\n  (21, 3, '2026-03-02 23:48:00', 'checkout', 'cart'),\n  (22, 3, '2026-03-02 23:50:00', 'purchase', 'done'),\n  (23, NULL, '2026-03-02 12:00:00', 'view', 'home'),\n  (24, NULL, '2026-03-02 12:30:00', 'view', 'product');\n\nCREATE TABLE daily_active (\n  customer_id INTEGER,\n  day DATE\n);\n\nINSERT INTO daily_active VALUES\n  (1, '2026-03-01'),\n  (1, '2026-03-02'),\n  (1, '2026-03-03'),\n  (1, '2026-03-05'),\n  (1, '2026-03-06'),\n  (1, '2026-03-09'),\n  (2, '2026-03-02'),\n  (2, '2026-03-03'),\n  (2, '2026-03-04'),\n  (2, '2026-03-05'),\n  (2, '2026-03-07'),\n  (3, '2026-03-01'),\n  (3, '2026-03-02'),\n  (3, '2026-03-04');\n\nCREATE TABLE categories (\n  category_id INTEGER PRIMARY KEY,\n  name VARCHAR,\n  parent_id INTEGER\n);\n\nINSERT INTO categories VALUES\n  (1, 'Menu', NULL),\n  (2, 'Drinks', 1),\n  (3, 'Coffee', 2),\n  (4, 'Espresso drinks', 3),\n  (5, 'Cold coffee', 3),\n  (6, 'Tea', 2),\n  (7, 'Retail', 1),\n  (8, 'Beans', 7),\n  (9, 'Merch', 7);\n\nCREATE TABLE price_history (\n  product_id INTEGER,\n  price DECIMAL(10,2),\n  valid_from DATE,\n  valid_to DATE\n);\n\nINSERT INTO price_history VALUES\n  (1, 3.00, '2026-01-01', '2026-02-28'),\n  (1, 3.50, '2026-03-01', '9999-12-31'),\n  (2, 4.50, '2026-01-01', '9999-12-31'),\n  (3, 4.50, '2026-01-01', '2026-03-04'),\n  (3, 5.00, '2026-03-05', '9999-12-31'),\n  (4, 14.00, '2026-01-01', '9999-12-31'),\n  (5, 12.00, '2026-01-01', '9999-12-31'),\n  (6, 5.50, '2026-01-01', '9999-12-31');\n\nCREATE TABLE orders_raw (\n  order_id INTEGER,\n  ingested_at TIMESTAMP,\n  status VARCHAR,\n  total DECIMAL(10,2)\n);\n\nINSERT INTO orders_raw VALUES\n  (1001, '2026-03-01 02:20:00', 'pending', 11.50),\n  (1001, '2026-03-01 02:25:00', 'paid', 11.50),\n  (1002, '2026-03-03 09:45:00', 'paid', 18.50),\n  (1002, '2026-03-03 09:45:00', 'paid', 18.50),\n  (1003, '2026-03-02 16:35:00', 'paid', 5.00),\n  (1004, '2026-03-02 23:55:00', 'paid', 26.00),\n  (1004, '2026-03-03 00:10:00', 'paid', 26.00),\n  (1005, '2026-03-04 03:10:00', 'pending', 9.00),\n  (1005, '2026-03-04 03:30:00', 'cancelled', 9.00);\n\nCREATE TABLE daily_revenue (\n  day DATE,\n  store_id INTEGER,\n  revenue DECIMAL(10,2)\n);\n\nINSERT INTO daily_revenue VALUES\n  ('2026-03-01', 1, 40),\n  ('2026-03-01', 2, 25),\n  ('2026-03-02', 1, 55),\n  ('2026-03-02', 2, 30),\n  ('2026-03-03', 1, 35),\n  ('2026-03-03', 2, 45),\n  ('2026-03-04', 1, 60),\n  ('2026-03-04', 2, 20),\n  ('2026-03-05', 1, 50),\n  ('2026-03-05', 2, 50);\n\nCREATE TABLE customer_dim (\n  customer_key INTEGER PRIMARY KEY,\n  customer_id INTEGER,\n  tier VARCHAR,\n  valid_from DATE,\n  valid_to DATE,\n  is_current BOOLEAN\n);\n\nINSERT INTO customer_dim VALUES\n  (1, 1, 'silver', '2026-01-05', '2026-02-14', FALSE),\n  (2, 1, 'gold', '2026-02-15', '9999-12-31', TRUE),\n  (3, 2, 'silver', '2026-01-12', '9999-12-31', TRUE),\n  (4, 4, 'silver', '2026-02-02', '9999-12-31', TRUE),\n  (5, 5, 'gold', '2026-02-10', '9999-12-31', TRUE);\n\nCREATE TABLE customer_changes (\n  customer_id INTEGER,\n  tier VARCHAR,\n  changed_on DATE\n);\n\nINSERT INTO customer_changes VALUES\n  (2, 'gold', '2026-03-10'),\n  (9, 'gold', '2026-03-10'),\n  (1, 'gold', '2026-03-10'),\n  (4, 'silver', '2026-03-10');\n",
  "m1.alias_group": "SELECT upper(status) AS s, count(*) AS n\nFROM orders\nGROUP BY s\nORDER BY s;\n",
  "m1.alias_order": "SELECT order_id, total * 2 AS doubled\nFROM orders\nORDER BY doubled DESC\nLIMIT 3;\n",
  "m1.alias_where": "SELECT order_id, total * 2 AS doubled\nFROM orders\nWHERE doubled > 30\nORDER BY order_id;\n",
  "m1.ch_store_revenue": "SELECT store_id,\n       count(*)   AS orders,\n       sum(total) AS revenue\nFROM orders\nWHERE status = 'paid'\nGROUP BY store_id\nORDER BY revenue DESC;\n",
  "m1.having_fixed": "SELECT country, count(*) AS n\nFROM customers\nGROUP BY country\nHAVING count(*) > 1\nORDER BY country;\n",
  "m1.limit_order": "SELECT order_id, total\nFROM orders\nORDER BY total DESC, order_id\nLIMIT 3;\n",
  "m1.revenue": "SELECT c.country,\n       count(*)                AS orders,\n       sum(o.total)            AS revenue,\n       round(avg(o.total), 2)  AS avg_order\nFROM orders AS o\nJOIN customers AS c ON c.customer_id = o.customer_id\nWHERE o.status = 'paid'\nGROUP BY c.country\nHAVING sum(o.total) > 10\nORDER BY revenue DESC\nLIMIT 3;\n",
  "m1.stage.0": "SELECT o.order_id, o.status, o.total, c.country\nFROM orders AS o\nJOIN customers AS c ON c.customer_id = o.customer_id\nORDER BY o.order_id\n",
  "m1.stage.1": "SELECT o.order_id, o.status, o.total, c.country\nFROM orders AS o\nJOIN customers AS c ON c.customer_id = o.customer_id\nWHERE o.status = 'paid'\nORDER BY o.order_id\n",
  "m1.stage.2": "SELECT c.country, count(*) AS n_rows, sum(o.total) AS sum_total, avg(o.total) AS avg_total\nFROM orders AS o\nJOIN customers AS c ON c.customer_id = o.customer_id\nWHERE o.status = 'paid'\nGROUP BY c.country\nORDER BY c.country\n",
  "m1.stage.3": "SELECT c.country, count(*) AS n_rows, sum(o.total) AS sum_total, avg(o.total) AS avg_total\nFROM orders AS o\nJOIN customers AS c ON c.customer_id = o.customer_id\nWHERE o.status = 'paid'\nGROUP BY c.country\nHAVING sum(o.total) > 10\nORDER BY c.country\n",
  "m1.stage.4": "SELECT c.country, count(*) AS orders, sum(o.total) AS revenue, round(avg(o.total), 2) AS avg_order\nFROM orders AS o\nJOIN customers AS c ON c.customer_id = o.customer_id\nWHERE o.status = 'paid'\nGROUP BY c.country\nHAVING sum(o.total) > 10\nORDER BY c.country\n",
  "m1.stage.5": "SELECT c.country, count(*) AS orders, sum(o.total) AS revenue, round(avg(o.total), 2) AS avg_order\nFROM orders AS o\nJOIN customers AS c ON c.customer_id = o.customer_id\nWHERE o.status = 'paid'\nGROUP BY c.country\nHAVING sum(o.total) > 10\nORDER BY revenue DESC\n",
  "m1.stage.6": "SELECT c.country, count(*) AS orders, sum(o.total) AS revenue, round(avg(o.total), 2) AS avg_order\nFROM orders AS o\nJOIN customers AS c ON c.customer_id = o.customer_id\nWHERE o.status = 'paid'\nGROUP BY c.country\nHAVING sum(o.total) > 10\nORDER BY revenue DESC\nLIMIT 3\n",
  "m1.where_vs_having_error": "SELECT country, count(*) AS n\nFROM customers\nWHERE count(*) > 1\nGROUP BY country;\n",
  "m2.avg_null": "SELECT round(avg(customer_id), 3)              AS avg_ignoring_null,\n       round(avg(coalesce(customer_id, 0)), 3) AS avg_null_as_zero,\n       count(*) - count(customer_id)           AS null_customers\nFROM orders;\n",
  "m2.case_null": "SELECT customer_id,\n       tier,\n       CASE tier WHEN 'gold' THEN 'top' WHEN 'silver' THEN 'mid' ELSE 'other' END AS bucket,\n       CASE WHEN tier IS NULL THEN 'unknown' ELSE tier END AS tier_or_unknown\nFROM customers\nORDER BY customer_id;\n",
  "m2.ch_changed": "SELECT c.customer_id, c.tier AS tier_in_customers, d.tier AS tier_in_dimension\nFROM customers AS c\nLEFT JOIN customer_dim AS d ON d.customer_id = c.customer_id AND d.is_current\nWHERE c.tier IS DISTINCT FROM d.tier\nORDER BY c.customer_id;\n",
  "m2.ch_changed_wrong": "SELECT c.customer_id, c.tier AS tier_in_customers, d.tier AS tier_in_dimension\nFROM customers AS c\nLEFT JOIN customer_dim AS d ON d.customer_id = c.customer_id AND d.is_current\nWHERE c.tier <> d.tier\nORDER BY c.customer_id;\n",
  "m2.ch_never": "SELECT c.customer_id, c.name\nFROM customers AS c\nWHERE NOT EXISTS (\n  SELECT 1\n  FROM orders AS o\n  WHERE o.customer_id = c.customer_id\n)\nORDER BY c.customer_id;\n",
  "m2.coalesce": "SELECT customer_id,\n       name,\n       coalesce(email, 'no email')  AS email_shown,\n       coalesce(tier, 'unranked')   AS tier_shown,\n       coalesce(country, '??')      AS country_shown\nFROM customers\nORDER BY customer_id;\n",
  "m2.concat_null": "SELECT customer_id,\n       'Hi ' || name || ' <' || email || '>'  AS with_pipes,\n       concat('Hi ', name, ' <', email, '>')  AS with_concat\nFROM customers\nWHERE customer_id IN (1, 2)\nORDER BY customer_id;\n",
  "m2.count_forms": "SELECT count(*)                AS all_rows,\n       count(tier)             AS tier_not_null,\n       count(DISTINCT tier)    AS tier_values,\n       count(DISTINCT country) AS country_values\nFROM customers;\n",
  "m2.distinct_null": "SELECT DISTINCT tier\nFROM customers\nORDER BY tier NULLS LAST;\n",
  "m2.div_zero": "SELECT 10 / 0 AS ten_over_zero;\n",
  "m2.guest_orders": "SELECT count(*)                     AS orders,\n       count(customer_id)           AS with_customer,\n       count(*) - count(customer_id) AS guest_orders\nFROM orders;\n",
  "m2.in_null_list": "SELECT customer_id, tier\nFROM customers\nWHERE tier IN ('gold', NULL)\nORDER BY customer_id;\n",
  "m2.like_case": "SELECT name\nFROM customers\nWHERE name LIKE 'ana%'\nORDER BY customer_id;\n",
  "m2.not_gold": "SELECT 'tier <> gold'                  AS filter, count(*) AS customers FROM customers WHERE tier <> 'gold'\nUNION ALL\nSELECT 'tier IS DISTINCT FROM gold'    AS filter, count(*) AS customers FROM customers WHERE tier IS DISTINCT FROM 'gold'\nUNION ALL\nSELECT 'NOT (tier = gold)'             AS filter, count(*) AS customers FROM customers WHERE NOT (tier = 'gold')\nUNION ALL\nSELECT 'tier <> gold OR tier IS NULL'  AS filter, count(*) AS customers FROM customers WHERE tier <> 'gold' OR tier IS NULL;\n",
  "m2.not_in": "SELECT 'NOT IN' AS method, count(*) AS never_ordered\nFROM customers\nWHERE customer_id NOT IN (SELECT customer_id FROM orders)\nUNION ALL\nSELECT 'NOT EXISTS', count(*)\nFROM customers AS c\nWHERE NOT EXISTS (SELECT 1 FROM orders AS o WHERE o.customer_id = c.customer_id)\nUNION ALL\nSELECT 'LEFT JOIN', count(*)\nFROM customers AS c\nLEFT JOIN orders AS o ON o.customer_id = c.customer_id\nWHERE o.order_id IS NULL;\n",
  "m2.not_in_fixed": "SELECT customer_id, name\nFROM customers\nWHERE customer_id NOT IN (SELECT customer_id FROM orders WHERE customer_id IS NOT NULL)\nORDER BY customer_id;\n",
  "m2.null_eq": "SELECT count(*)                                  AS customers,\n       count(email)                              AS with_email,\n       count(*) FILTER (WHERE email = NULL)      AS equals_null,\n       count(*) FILTER (WHERE email IS NULL)     AS is_null,\n       count(*) FILTER (WHERE email <> 'ana@example.com') AS not_ana\nFROM customers;\n",
  "m2.null_groups": "SELECT tier, count(*) AS customers\nFROM customers\nGROUP BY tier\nORDER BY tier NULLS LAST;\n",
  "m2.null_order": "SELECT customer_id, tier\nFROM customers\nORDER BY tier, customer_id;\n",
  "m2.null_order_explicit": "SELECT customer_id, tier\nFROM customers\nORDER BY tier NULLS FIRST, customer_id;\n",
  "m2.nullif": "SELECT 10 / NULLIF(0, 0) AS safe_division,\n       coalesce(10 / NULLIF(0, 0), -1) AS with_default;\n",
  "m2.where_and_or": "SELECT order_id, status, channel, total\nFROM orders\nWHERE channel = 'web' OR channel = 'app' AND status = 'paid'\nORDER BY order_id;\n",
  "m2.where_and_or_fixed": "SELECT order_id, status, channel, total\nFROM orders\nWHERE status = 'paid' AND (channel = 'web' OR channel = 'app')\nORDER BY order_id;\n",
  "m3.ch_country": "SELECT c.country, count(*) AS orders, sum(o.total) AS revenue\nFROM orders AS o\nJOIN customers AS c ON c.customer_id = o.customer_id\nWHERE o.status = 'paid'\n  AND EXISTS (SELECT 1 FROM payments AS p WHERE p.order_id = o.order_id AND p.status = 'ok')\nGROUP BY c.country\nORDER BY revenue DESC;\n",
  "m3.ch_country_wrong": "SELECT c.country, count(*) AS orders, sum(o.total) AS revenue\nFROM orders AS o\nJOIN customers AS c ON c.customer_id = o.customer_id\nJOIN payments AS p ON p.order_id = o.order_id AND p.status = 'ok'\nWHERE o.status = 'paid'\nGROUP BY c.country\nORDER BY revenue DESC;\n",
  "m3.ch_paid_by_order": "SELECT o.order_id, o.total, coalesce(sum(p.amount), 0) AS paid\nFROM orders AS o\nLEFT JOIN payments AS p ON p.order_id = o.order_id\nGROUP BY o.order_id, o.total\nORDER BY o.order_id;\n",
  "m3.distinct_trap": "SELECT count(*)               AS paid_orders,\n       sum(total)             AS plain_sum,\n       sum(DISTINCT total)    AS distinct_sum,\n       count(DISTINCT total)  AS different_totals\nFROM big_orders\nWHERE status = 'paid';\n",
  "m3.fanout_payments": "SELECT o.order_id, o.total, p.payment_id, p.amount\nFROM orders AS o\nJOIN payments AS p ON p.order_id = o.order_id\nWHERE o.status = 'paid'\nORDER BY o.order_id, p.payment_id;\n",
  "m3.fanout_sum": "SELECT 'orders only' AS joined_with, count(*) AS rows, sum(o.total) AS revenue\nFROM orders AS o\nWHERE o.status = 'paid'\nUNION ALL\nSELECT 'orders and payments', count(*), sum(o.total)\nFROM orders AS o\nJOIN payments AS p ON p.order_id = o.order_id\nWHERE o.status = 'paid';\n",
  "m3.grain_counts": "SELECT count(*)                 AS payment_rows,\n       count(DISTINCT order_id) AS orders_paid\nFROM payments;\n",
  "m3.grain_multi": "SELECT order_id, count(*) AS payments\nFROM payments\nGROUP BY order_id\nHAVING count(*) > 1\nORDER BY order_id;\n",
  "m3.jointype.cross": "SELECT c.customer_id, c.name, o.order_id, o.status\nFROM customers AS c\nCROSS JOIN orders AS o\nORDER BY c.customer_id NULLS LAST, o.order_id NULLS LAST\n",
  "m3.jointype.full": "SELECT c.customer_id, c.name, o.order_id, o.status\nFROM customers AS c\nFULL JOIN orders AS o ON o.customer_id = c.customer_id\nORDER BY c.customer_id NULLS LAST, o.order_id NULLS LAST\n",
  "m3.jointype.inner": "SELECT c.customer_id, c.name, o.order_id, o.status\nFROM customers AS c\nINNER JOIN orders AS o ON o.customer_id = c.customer_id\nORDER BY c.customer_id NULLS LAST, o.order_id NULLS LAST\n",
  "m3.jointype.left": "SELECT c.customer_id, c.name, o.order_id, o.status\nFROM customers AS c\nLEFT JOIN orders AS o ON o.customer_id = c.customer_id\nORDER BY c.customer_id NULLS LAST, o.order_id NULLS LAST\n",
  "m3.jointype.right": "SELECT c.customer_id, c.name, o.order_id, o.status\nFROM customers AS c\nRIGHT JOIN orders AS o ON o.customer_id = c.customer_id\nORDER BY c.customer_id NULLS LAST, o.order_id NULLS LAST\n",
  "m3.lateral": "SELECT c.customer_id, c.name, last_order.order_id, last_order.order_ts, last_order.total\nFROM customers AS c\nCROSS JOIN LATERAL (\n  SELECT o.order_id, o.order_ts, o.total\n  FROM orders AS o\n  WHERE o.customer_id = c.customer_id\n  ORDER BY o.order_ts DESC\n  LIMIT 1\n) AS last_order\nORDER BY c.customer_id;\n",
  "m3.left_on": "SELECT c.customer_id, c.name, count(o.order_id) AS paid_orders\nFROM customers AS c\nLEFT JOIN orders AS o ON o.customer_id = c.customer_id AND o.status = 'paid'\nGROUP BY c.customer_id, c.name\nORDER BY c.customer_id;\n",
  "m3.left_where": "SELECT c.customer_id, c.name, count(o.order_id) AS paid_orders\nFROM customers AS c\nLEFT JOIN orders AS o ON o.customer_id = c.customer_id\nWHERE o.status = 'paid'\nGROUP BY c.customer_id, c.name\nORDER BY c.customer_id;\n",
  "m3.natural": "SELECT count(*) AS rows\nFROM customers\nNATURAL JOIN stores;\n",
  "m3.onwhere_counts": "SELECT 'filter in ON' AS variant, count(*) AS rows\nFROM customers AS c LEFT JOIN orders AS o ON o.customer_id = c.customer_id AND o.status = 'paid'\nUNION ALL\nSELECT 'filter in WHERE', count(*)\nFROM customers AS c LEFT JOIN orders AS o ON o.customer_id = c.customer_id\nWHERE o.status = 'paid'\nUNION ALL\nSELECT 'no filter', count(*)\nFROM customers AS c LEFT JOIN orders AS o ON o.customer_id = c.customer_id;\n",
  "m3.preagg_orders": "WITH paid_by_order AS (\n  SELECT order_id, sum(amount) AS net_paid\n  FROM payments\n  GROUP BY order_id\n)\nSELECT o.order_id, o.status, o.total, p.net_paid\nFROM orders AS o\nLEFT JOIN paid_by_order AS p ON p.order_id = o.order_id\nORDER BY o.order_id;\n",
  "m3.preagg_revenue": "WITH paid_by_order AS (\n  SELECT order_id, sum(amount) AS net_paid\n  FROM payments\n  GROUP BY order_id\n)\nSELECT count(*) AS rows, sum(o.total) AS revenue\nFROM orders AS o\nLEFT JOIN paid_by_order AS p ON p.order_id = o.order_id\nWHERE o.status = 'paid';\n",
  "m3.range_join": "SELECT i.order_id, i.line_no, i.product_id, CAST(o.order_ts AS DATE) AS order_day,\n       i.unit_price AS charged, h.price AS list_price\nFROM order_items AS i\nJOIN orders AS o ON o.order_id = i.order_id\nJOIN price_history AS h\n  ON h.product_id = i.product_id\n AND CAST(o.order_ts AS DATE) BETWEEN h.valid_from AND h.valid_to\nWHERE i.unit_price <> h.price\nORDER BY i.order_id, i.line_no;\n",
  "m3.self_join": "SELECT c.category_id, c.name AS category, p.name AS parent\nFROM categories AS c\nLEFT JOIN categories AS p ON p.category_id = c.parent_id\nORDER BY c.category_id;\n",
  "m3.using": "SELECT customer_id, name, order_id\nFROM customers\nJOIN orders USING (customer_id)\nWHERE order_id < 1004\nORDER BY order_id;\n",
  "m4.approx": "SELECT count(DISTINCT customer_id)         AS exact,\n       approx_count_distinct(customer_id)  AS approximate\nFROM big_orders;\n",
  "m4.avg_of_avgs": "WITH per_store AS (\n  SELECT store_id, avg(total) AS avg_total\n  FROM orders\n  WHERE status = 'paid'\n  GROUP BY store_id\n)\nSELECT round(avg(avg_total), 2)                                           AS average_of_averages,\n       (SELECT round(avg(total), 2) FROM orders WHERE status = 'paid')    AS average_of_orders\nFROM per_store;\n",
  "m4.bare_column": "SELECT status, channel, count(*) AS orders\nFROM orders\nGROUP BY status\nORDER BY status;\n",
  "m4.basic": "SELECT status,\n       count(*)              AS orders,\n       sum(total)            AS revenue,\n       min(total)            AS smallest,\n       max(total)            AS largest,\n       round(avg(total), 2)  AS average\nFROM orders\nGROUP BY status\nORDER BY status;\n",
  "m4.ch_conditional": "SELECT store_id,\n       sum(CASE WHEN status = 'paid'      THEN total ELSE 0 END) AS paid,\n       sum(CASE WHEN status = 'cancelled' THEN total ELSE 0 END) AS cancelled,\n       sum(CASE WHEN status = 'refunded'  THEN total ELSE 0 END) AS refunded\nFROM orders\nGROUP BY store_id\nORDER BY store_id;\n",
  "m4.ch_daily": "SELECT CAST(order_ts AS DATE) AS day, count(*) AS orders, sum(total) AS revenue\nFROM orders\nWHERE status = 'paid'\nGROUP BY ROLLUP (CAST(order_ts AS DATE))\nORDER BY day NULLS LAST;\n",
  "m4.ch_repeat": "SELECT customer_id, count(*) AS paid_orders, sum(total) AS spent\nFROM orders\nWHERE status = 'paid' AND customer_id IS NOT NULL\nGROUP BY customer_id\nHAVING count(*) >= 2\nORDER BY spent DESC;\n",
  "m4.conditional": "SELECT store_id,\n       count(*)                                         AS orders,\n       sum(CASE WHEN status = 'paid' THEN total ELSE 0 END) AS paid_with_case,\n       sum(total) FILTER (WHERE status = 'paid')        AS paid_with_filter,\n       count(*) FILTER (WHERE status = 'paid')          AS paid_orders\nFROM orders\nGROUP BY store_id\nORDER BY store_id;\n",
  "m4.distinct_counts": "SELECT store_id,\n       count(*)                    AS orders,\n       count(customer_id)          AS with_customer,\n       count(DISTINCT customer_id) AS different_customers\nFROM orders\nGROUP BY store_id\nORDER BY store_id;\n",
  "m4.empty_sum": "SELECT sum(total)               AS sum_of_nothing,\n       count(*)                 AS rows,\n       coalesce(sum(total), 0)  AS sum_or_zero\nFROM orders\nWHERE status = 'does not exist';\n",
  "m4.having": "SELECT store_id, count(*) AS paid_orders, sum(total) AS revenue\nFROM orders\nWHERE status = 'paid'\nGROUP BY store_id\nHAVING sum(total) > 20\nORDER BY store_id;\n",
  "m4.median": "SELECT round(avg(total), 2)                                          AS average,\n       percentile_cont(0.5) WITHIN GROUP (ORDER BY total)           AS median,\n       percentile_cont(0.9) WITHIN GROUP (ORDER BY total)           AS p90\nFROM orders\nWHERE status = 'paid';\n",
  "m4.pivot": "SELECT status,\n       sum(CASE WHEN channel = 'web'   THEN total END) AS web,\n       sum(CASE WHEN channel = 'app'   THEN total END) AS app,\n       sum(CASE WHEN channel = 'store' THEN total END) AS store\nFROM orders\nGROUP BY status\nORDER BY status;\n",
  "m4.rollup_sqlite": "SELECT store_id, channel, sum(total) AS revenue\nFROM orders\nWHERE status = 'paid'\nGROUP BY ROLLUP (store_id, channel);\n",
  "m4.set.0": "SELECT store_id,\n       count(*) AS orders, sum(total) AS revenue\nFROM orders\nWHERE status = 'paid'\nGROUP BY store_id\nORDER BY store_id NULLS LAST\n",
  "m4.set.1": "SELECT channel,\n       count(*) AS orders, sum(total) AS revenue\nFROM orders\nWHERE status = 'paid'\nGROUP BY channel\nORDER BY channel NULLS LAST\n",
  "m4.set.2": "SELECT store_id, channel,\n       count(*) AS orders, sum(total) AS revenue\nFROM orders\nWHERE status = 'paid'\nGROUP BY store_id, channel\nORDER BY store_id NULLS LAST, channel NULLS LAST\n",
  "m4.set.3": "SELECT store_id, channel,\n       GROUPING(store_id) AS g_store, GROUPING(channel) AS g_channel,\n       count(*) AS orders, sum(total) AS revenue\nFROM orders\nWHERE status = 'paid'\nGROUP BY ROLLUP (store_id, channel)\nORDER BY store_id NULLS LAST, channel NULLS LAST\n",
  "m4.set.4": "SELECT channel, store_id,\n       GROUPING(channel) AS g_channel, GROUPING(store_id) AS g_store,\n       count(*) AS orders, sum(total) AS revenue\nFROM orders\nWHERE status = 'paid'\nGROUP BY ROLLUP (channel, store_id)\nORDER BY channel NULLS LAST, store_id NULLS LAST\n",
  "m4.set.5": "SELECT store_id, channel,\n       GROUPING(store_id) AS g_store, GROUPING(channel) AS g_channel,\n       count(*) AS orders, sum(total) AS revenue\nFROM orders\nWHERE status = 'paid'\nGROUP BY CUBE (store_id, channel)\nORDER BY store_id NULLS LAST, channel NULLS LAST\n",
  "m4.set.6": "SELECT store_id, channel,\n       GROUPING(store_id) AS g_store, GROUPING(channel) AS g_channel,\n       count(*) AS orders, sum(total) AS revenue\nFROM orders\nWHERE status = 'paid'\nGROUP BY GROUPING SETS ((store_id), (channel), ())\nORDER BY store_id NULLS LAST, channel NULLS LAST\n",
  "m4.string_agg": "SELECT country, count(*) AS customers, string_agg(name, ', ' ORDER BY name) AS names\nFROM customers\nGROUP BY country\nORDER BY country NULLS LAST;\n"
 },
 "meta": {
  "duckdb": "2.0.0",
  "note": "Recorded by sql/verify/capture_sq.py: DuckDB, PostgreSQL and SQLite ran every query on this machine with made-up Brewline data. sqlglot translated some queries for other dialects, and those were not run. Nothing ran on a cloud warehouse.",
  "postgres": "16.15",
  "psycopg": "3.3.8",
  "python": "3.13.18",
  "sqlglot": "30.31.0",
  "sqlite": "3.53.1"
 },
 "tables": {
  "data.categories": {
   "cols": [
    "category_id",
    "name",
    "parent_id"
   ],
   "rows": [
    [
     "1",
     "Menu",
     "NULL"
    ],
    [
     "2",
     "Drinks",
     "1"
    ],
    [
     "3",
     "Coffee",
     "2"
    ],
    [
     "4",
     "Espresso drinks",
     "3"
    ],
    [
     "5",
     "Cold coffee",
     "3"
    ],
    [
     "6",
     "Tea",
     "2"
    ],
    [
     "7",
     "Retail",
     "1"
    ],
    [
     "8",
     "Beans",
     "7"
    ],
    [
     "9",
     "Merch",
     "7"
    ]
   ]
  },
  "data.customer_changes": {
   "cols": [
    "customer_id",
    "tier",
    "changed_on"
   ],
   "rows": [
    [
     "1",
     "gold",
     "2026-03-10"
    ],
    [
     "2",
     "gold",
     "2026-03-10"
    ],
    [
     "4",
     "silver",
     "2026-03-10"
    ],
    [
     "9",
     "gold",
     "2026-03-10"
    ]
   ]
  },
  "data.customer_dim": {
   "cols": [
    "customer_key",
    "customer_id",
    "tier",
    "valid_from",
    "valid_to",
    "is_current"
   ],
   "rows": [
    [
     "1",
     "1",
     "silver",
     "2026-01-05",
     "2026-02-14",
     "false"
    ],
    [
     "2",
     "1",
     "gold",
     "2026-02-15",
     "9999-12-31",
     "true"
    ],
    [
     "3",
     "2",
     "silver",
     "2026-01-12",
     "9999-12-31",
     "true"
    ],
    [
     "4",
     "4",
     "silver",
     "2026-02-02",
     "9999-12-31",
     "true"
    ],
    [
     "5",
     "5",
     "gold",
     "2026-02-10",
     "9999-12-31",
     "true"
    ]
   ]
  },
  "data.customers": {
   "cols": [
    "customer_id",
    "name",
    "email",
    "country",
    "tier",
    "signup_date"
   ],
   "rows": [
    [
     "1",
     "Ana Lim",
     "ana@example.com",
     "SG",
     "gold",
     "2026-01-05"
    ],
    [
     "2",
     "Ben Ortiz",
     "NULL",
     "MY",
     "silver",
     "2026-01-12"
    ],
    [
     "3",
     "Chen Wei",
     "chen@example.com",
     "SG",
     "NULL",
     "2026-01-20"
    ],
    [
     "4",
     "Dara Putri",
     "dara@example.com",
     "ID",
     "silver",
     "2026-02-02"
    ],
    [
     "5",
     "Eli Cohen",
     "eli@example.com",
     "AU",
     "gold",
     "2026-02-10"
    ],
    [
     "6",
     "Fay Tan",
     "NULL",
     "NULL",
     "NULL",
     "2026-02-14"
    ],
    [
     "7",
     "Gus Hall",
     "gus@example.com",
     "AU",
     "silver",
     "2026-02-20"
    ],
    [
     "8",
     "Hana Ito",
     "hana@example.com",
     "SG",
     "gold",
     "2026-03-01"
    ]
   ]
  },
  "data.daily_active": {
   "cols": [
    "customer_id",
    "day"
   ],
   "rows": [
    [
     "1",
     "2026-03-01"
    ],
    [
     "1",
     "2026-03-02"
    ],
    [
     "1",
     "2026-03-03"
    ],
    [
     "1",
     "2026-03-05"
    ],
    [
     "1",
     "2026-03-06"
    ],
    [
     "1",
     "2026-03-09"
    ],
    [
     "2",
     "2026-03-02"
    ],
    [
     "2",
     "2026-03-03"
    ],
    [
     "2",
     "2026-03-04"
    ],
    [
     "2",
     "2026-03-05"
    ],
    [
     "2",
     "2026-03-07"
    ],
    [
     "3",
     "2026-03-01"
    ],
    [
     "3",
     "2026-03-02"
    ],
    [
     "3",
     "2026-03-04"
    ]
   ]
  },
  "data.daily_revenue": {
   "cols": [
    "day",
    "store_id",
    "revenue"
   ],
   "rows": [
    [
     "2026-03-01",
     "1",
     "40.00"
    ],
    [
     "2026-03-01",
     "2",
     "25.00"
    ],
    [
     "2026-03-02",
     "1",
     "55.00"
    ],
    [
     "2026-03-02",
     "2",
     "30.00"
    ],
    [
     "2026-03-03",
     "1",
     "35.00"
    ],
    [
     "2026-03-03",
     "2",
     "45.00"
    ],
    [
     "2026-03-04",
     "1",
     "60.00"
    ],
    [
     "2026-03-04",
     "2",
     "20.00"
    ],
    [
     "2026-03-05",
     "1",
     "50.00"
    ],
    [
     "2026-03-05",
     "2",
     "50.00"
    ]
   ]
  },
  "data.events": {
   "cols": [
    "event_id",
    "customer_id",
    "event_ts",
    "event_type",
    "page"
   ],
   "rows": [
    [
     "1",
     "1",
     "2026-03-02 09:00:00",
     "view",
     "home"
    ],
    [
     "2",
     "1",
     "2026-03-02 09:04:00",
     "view",
     "product"
    ],
    [
     "3",
     "1",
     "2026-03-02 09:09:00",
     "add_to_cart",
     "product"
    ],
    [
     "4",
     "1",
     "2026-03-02 09:15:00",
     "checkout",
     "cart"
    ],
    [
     "5",
     "1",
     "2026-03-02 09:16:00",
     "purchase",
     "done"
    ],
    [
     "6",
     "1",
     "2026-03-02 14:02:00",
     "view",
     "home"
    ],
    [
     "7",
     "1",
     "2026-03-02 14:05:00",
     "view",
     "product"
    ],
    [
     "8",
     "2",
     "2026-03-02 10:00:00",
     "view",
     "home"
    ],
    [
     "9",
     "2",
     "2026-03-02 10:40:00",
     "view",
     "product"
    ],
    [
     "10",
     "2",
     "2026-03-02 10:46:00",
     "add_to_cart",
     "product"
    ],
    [
     "11",
     "2",
     "2026-03-02 16:20:00",
     "view",
     "product"
    ],
    [
     "12",
     "2",
     "2026-03-02 16:27:00",
     "add_to_cart",
     "product"
    ],
    [
     "13",
     "2",
     "2026-03-02 16:29:00",
     "checkout",
     "cart"
    ],
    [
     "14",
     "2",
     "2026-03-02 16:30:00",
     "purchase",
     "done"
    ],
    [
     "15",
     "3",
     "2026-03-02 11:00:00",
     "view",
     "home"
    ],
    [
     "16",
     "3",
     "2026-03-02 11:01:00",
     "view",
     "product"
    ],
    [
     "17",
     "3",
     "2026-03-02 11:02:00",
     "add_to_cart",
     "product"
    ],
    [
     "18",
     "3",
     "2026-03-02 11:03:00",
     "checkout",
     "cart"
    ],
    [
     "19",
     "3",
     "2026-03-02 23:42:00",
     "view",
     "product"
    ],
    [
     "20",
     "3",
     "2026-03-02 23:45:00",
     "add_to_cart",
     "product"
    ],
    [
     "21",
     "3",
     "2026-03-02 23:48:00",
     "checkout",
     "cart"
    ],
    [
     "22",
     "3",
     "2026-03-02 23:50:00",
     "purchase",
     "done"
    ],
    [
     "23",
     "NULL",
     "2026-03-02 12:00:00",
     "view",
     "home"
    ],
    [
     "24",
     "NULL",
     "2026-03-02 12:30:00",
     "view",
     "product"
    ]
   ]
  },
  "data.order_items": {
   "cols": [
    "order_id",
    "line_no",
    "product_id",
    "qty",
    "unit_price"
   ],
   "rows": [
    [
     "1001",
     "1",
     "1",
     "2",
     "3.50"
    ],
    [
     "1001",
     "2",
     "2",
     "1",
     "4.50"
    ],
    [
     "1002",
     "1",
     "4",
     "1",
     "14.00"
    ],
    [
     "1002",
     "2",
     "2",
     "1",
     "4.50"
    ],
    [
     "1003",
     "1",
     "3",
     "1",
     "5.00"
    ],
    [
     "1004",
     "1",
     "4",
     "1",
     "14.00"
    ],
    [
     "1004",
     "2",
     "5",
     "1",
     "12.00"
    ],
    [
     "1005",
     "1",
     "2",
     "2",
     "4.50"
    ],
    [
     "1006",
     "1",
     "4",
     "1",
     "14.00"
    ],
    [
     "1007",
     "1",
     "1",
     "2",
     "3.50"
    ],
    [
     "1008",
     "1",
     "5",
     "1",
     "12.00"
    ],
    [
     "1009",
     "1",
     "2",
     "1",
     "4.50"
    ],
    [
     "1009",
     "2",
     "3",
     "1",
     "5.00"
    ],
    [
     "1010",
     "1",
     "4",
     "1",
     "14.00"
    ],
    [
     "1010",
     "2",
     "3",
     "1",
     "5.00"
    ],
    [
     "1011",
     "1",
     "2",
     "1",
     "4.50"
    ],
    [
     "1011",
     "2",
     "5",
     "1",
     "12.00"
    ],
    [
     "1012",
     "1",
     "2",
     "1",
     "4.50"
    ],
    [
     "1012",
     "2",
     "1",
     "1",
     "3.50"
    ]
   ]
  },
  "data.orders": {
   "cols": [
    "order_id",
    "customer_id",
    "store_id",
    "order_ts",
    "status",
    "channel",
    "total"
   ],
   "rows": [
    [
     "1001",
     "1",
     "1",
     "2026-03-01 02:15:00",
     "paid",
     "web",
     "11.50"
    ],
    [
     "1002",
     "1",
     "1",
     "2026-03-03 09:40:00",
     "paid",
     "store",
     "18.50"
    ],
    [
     "1003",
     "2",
     "2",
     "2026-03-02 16:30:00",
     "paid",
     "app",
     "5.00"
    ],
    [
     "1004",
     "3",
     "1",
     "2026-03-02 23:50:00",
     "paid",
     "web",
     "26.00"
    ],
    [
     "1005",
     "4",
     "3",
     "2026-03-04 03:05:00",
     "cancelled",
     "app",
     "9.00"
    ],
    [
     "1006",
     "5",
     "4",
     "2026-03-04 21:10:00",
     "paid",
     "web",
     "14.00"
    ],
    [
     "1007",
     "1",
     "1",
     "2026-03-05 08:00:00",
     "paid",
     "app",
     "7.00"
    ],
    [
     "1008",
     "7",
     "4",
     "2026-03-06 10:20:00",
     "refunded",
     "web",
     "12.00"
    ],
    [
     "1009",
     "NULL",
     "2",
     "2026-03-06 11:00:00",
     "paid",
     "store",
     "9.50"
    ],
    [
     "1010",
     "3",
     "1",
     "2026-03-07 12:30:00",
     "paid",
     "web",
     "19.00"
    ],
    [
     "1011",
     "5",
     "4",
     "2026-03-08 04:45:00",
     "paid",
     "app",
     "16.50"
    ],
    [
     "1012",
     "2",
     "2",
     "2026-03-09 15:00:00",
     "pending",
     "app",
     "8.00"
    ]
   ]
  },
  "data.orders_raw": {
   "cols": [
    "order_id",
    "ingested_at",
    "status",
    "total"
   ],
   "rows": [
    [
     "1001",
     "2026-03-01 02:20:00",
     "pending",
     "11.50"
    ],
    [
     "1001",
     "2026-03-01 02:25:00",
     "paid",
     "11.50"
    ],
    [
     "1002",
     "2026-03-03 09:45:00",
     "paid",
     "18.50"
    ],
    [
     "1002",
     "2026-03-03 09:45:00",
     "paid",
     "18.50"
    ],
    [
     "1003",
     "2026-03-02 16:35:00",
     "paid",
     "5.00"
    ],
    [
     "1004",
     "2026-03-02 23:55:00",
     "paid",
     "26.00"
    ],
    [
     "1004",
     "2026-03-03 00:10:00",
     "paid",
     "26.00"
    ],
    [
     "1005",
     "2026-03-04 03:10:00",
     "pending",
     "9.00"
    ],
    [
     "1005",
     "2026-03-04 03:30:00",
     "cancelled",
     "9.00"
    ]
   ]
  },
  "data.payments": {
   "cols": [
    "payment_id",
    "order_id",
    "paid_ts",
    "method",
    "amount",
    "status"
   ],
   "rows": [
    [
     "1",
     "1001",
     "2026-03-01 02:16:00",
     "card",
     "11.50",
     "ok"
    ],
    [
     "2",
     "1002",
     "2026-03-03 09:41:00",
     "card",
     "10.00",
     "ok"
    ],
    [
     "3",
     "1002",
     "2026-03-03 09:42:00",
     "wallet",
     "8.50",
     "ok"
    ],
    [
     "4",
     "1003",
     "2026-03-02 16:31:00",
     "wallet",
     "5.00",
     "ok"
    ],
    [
     "5",
     "1004",
     "2026-03-02 23:51:00",
     "card",
     "26.00",
     "ok"
    ],
    [
     "6",
     "1006",
     "2026-03-04 21:11:00",
     "card",
     "14.00",
     "ok"
    ],
    [
     "7",
     "1007",
     "2026-03-05 08:01:00",
     "wallet",
     "7.00",
     "ok"
    ],
    [
     "8",
     "1008",
     "2026-03-06 10:21:00",
     "card",
     "12.00",
     "ok"
    ],
    [
     "9",
     "1008",
     "2026-03-06 15:00:00",
     "card",
     "-12.00",
     "refund"
    ],
    [
     "10",
     "1009",
     "2026-03-06 11:01:00",
     "cash",
     "9.50",
     "ok"
    ],
    [
     "11",
     "1010",
     "2026-03-07 12:31:00",
     "card",
     "19.00",
     "ok"
    ],
    [
     "12",
     "1011",
     "2026-03-08 04:46:00",
     "card",
     "16.50",
     "ok"
    ]
   ]
  },
  "data.price_history": {
   "cols": [
    "product_id",
    "price",
    "valid_from",
    "valid_to"
   ],
   "rows": [
    [
     "1",
     "3.00",
     "2026-01-01",
     "2026-02-28"
    ],
    [
     "1",
     "3.50",
     "2026-03-01",
     "9999-12-31"
    ],
    [
     "2",
     "4.50",
     "2026-01-01",
     "9999-12-31"
    ],
    [
     "3",
     "4.50",
     "2026-01-01",
     "2026-03-04"
    ],
    [
     "3",
     "5.00",
     "2026-03-05",
     "9999-12-31"
    ],
    [
     "4",
     "14.00",
     "2026-01-01",
     "9999-12-31"
    ],
    [
     "5",
     "12.00",
     "2026-01-01",
     "9999-12-31"
    ],
    [
     "6",
     "5.50",
     "2026-01-01",
     "9999-12-31"
    ]
   ]
  },
  "data.products": {
   "cols": [
    "product_id",
    "sku",
    "name",
    "category",
    "unit_price"
   ],
   "rows": [
    [
     "1",
     "ESP-01",
     "Espresso",
     "hot",
     "3.50"
    ],
    [
     "2",
     "LAT-01",
     "Latte",
     "hot",
     "4.50"
    ],
    [
     "3",
     "CLD-01",
     "Cold brew",
     "cold",
     "5.00"
    ],
    [
     "4",
     "BEA-01",
     "House beans 250g",
     "beans",
     "14.00"
    ],
    [
     "5",
     "MUG-01",
     "Brewline mug",
     "merch",
     "12.00"
    ],
    [
     "6",
     "MAT-01",
     "Matcha",
     "hot",
     "5.50"
    ]
   ]
  },
  "data.stores": {
   "cols": [
    "store_id",
    "name",
    "city",
    "country"
   ],
   "rows": [
    [
     "1",
     "Orchard",
     "Singapore",
     "SG"
    ],
    [
     "2",
     "Bukit Bintang",
     "Kuala Lumpur",
     "MY"
    ],
    [
     "3",
     "Kemang",
     "Jakarta",
     "ID"
    ],
    [
     "4",
     "Surry Hills",
     "Sydney",
     "AU"
    ]
   ]
  },
  "m1.alias_group.duckdb": {
   "cols": [
    "s",
    "n"
   ],
   "rows": [
    [
     "CANCELLED",
     "1"
    ],
    [
     "PAID",
     "9"
    ],
    [
     "PENDING",
     "1"
    ],
    [
     "REFUNDED",
     "1"
    ]
   ]
  },
  "m1.alias_group.postgres": {
   "cols": [
    "s",
    "n"
   ],
   "rows": [
    [
     "CANCELLED",
     "1"
    ],
    [
     "PAID",
     "9"
    ],
    [
     "PENDING",
     "1"
    ],
    [
     "REFUNDED",
     "1"
    ]
   ]
  },
  "m1.alias_group.sqlite": {
   "cols": [
    "s",
    "n"
   ],
   "rows": [
    [
     "CANCELLED",
     "1"
    ],
    [
     "PAID",
     "9"
    ],
    [
     "PENDING",
     "1"
    ],
    [
     "REFUNDED",
     "1"
    ]
   ]
  },
  "m1.alias_order.duckdb": {
   "cols": [
    "order_id",
    "doubled"
   ],
   "rows": [
    [
     "1004",
     "52.00"
    ],
    [
     "1010",
     "38.00"
    ],
    [
     "1002",
     "37.00"
    ]
   ]
  },
  "m1.alias_order.postgres": {
   "cols": [
    "order_id",
    "doubled"
   ],
   "rows": [
    [
     "1004",
     "52.00"
    ],
    [
     "1010",
     "38.00"
    ],
    [
     "1002",
     "37.00"
    ]
   ]
  },
  "m1.alias_order.sqlite": {
   "cols": [
    "order_id",
    "doubled"
   ],
   "rows": [
    [
     "1004",
     "52"
    ],
    [
     "1010",
     "38"
    ],
    [
     "1002",
     "37.0"
    ]
   ]
  },
  "m1.alias_where.duckdb": {
   "cols": [
    "order_id",
    "doubled"
   ],
   "rows": [
    [
     "1002",
     "37.00"
    ],
    [
     "1004",
     "52.00"
    ],
    [
     "1010",
     "38.00"
    ],
    [
     "1011",
     "33.00"
    ]
   ]
  },
  "m1.alias_where.sqlite": {
   "cols": [
    "order_id",
    "doubled"
   ],
   "rows": [
    [
     "1002",
     "37.0"
    ],
    [
     "1004",
     "52"
    ],
    [
     "1010",
     "38"
    ],
    [
     "1011",
     "33.0"
    ]
   ]
  },
  "m1.ch_store_revenue": {
   "cols": [
    "store_id",
    "orders",
    "revenue"
   ],
   "rows": [
    [
     "1",
     "5",
     "82.00"
    ],
    [
     "4",
     "2",
     "30.50"
    ],
    [
     "2",
     "2",
     "14.50"
    ]
   ]
  },
  "m1.having_fixed": {
   "cols": [
    "country",
    "n"
   ],
   "rows": [
    [
     "AU",
     "2"
    ],
    [
     "SG",
     "3"
    ]
   ]
  },
  "m1.limit_order": {
   "cols": [
    "order_id",
    "total"
   ],
   "rows": [
    [
     "1004",
     "26.00"
    ],
    [
     "1010",
     "19.00"
    ],
    [
     "1002",
     "18.50"
    ]
   ]
  },
  "m1.revenue": {
   "cols": [
    "country",
    "orders",
    "revenue",
    "avg_order"
   ],
   "rows": [
    [
     "SG",
     "5",
     "82.00",
     "16.4"
    ],
    [
     "AU",
     "2",
     "30.50",
     "15.25"
    ]
   ]
  },
  "m1.stage.0": {
   "cols": [
    "order_id",
    "status",
    "total",
    "country"
   ],
   "rows": [
    [
     "1001",
     "paid",
     "11.50",
     "SG"
    ],
    [
     "1002",
     "paid",
     "18.50",
     "SG"
    ],
    [
     "1003",
     "paid",
     "5.00",
     "MY"
    ],
    [
     "1004",
     "paid",
     "26.00",
     "SG"
    ],
    [
     "1005",
     "cancelled",
     "9.00",
     "ID"
    ],
    [
     "1006",
     "paid",
     "14.00",
     "AU"
    ],
    [
     "1007",
     "paid",
     "7.00",
     "SG"
    ],
    [
     "1008",
     "refunded",
     "12.00",
     "AU"
    ],
    [
     "1010",
     "paid",
     "19.00",
     "SG"
    ],
    [
     "1011",
     "paid",
     "16.50",
     "AU"
    ],
    [
     "1012",
     "pending",
     "8.00",
     "MY"
    ]
   ]
  },
  "m1.stage.1": {
   "cols": [
    "order_id",
    "status",
    "total",
    "country"
   ],
   "rows": [
    [
     "1001",
     "paid",
     "11.50",
     "SG"
    ],
    [
     "1002",
     "paid",
     "18.50",
     "SG"
    ],
    [
     "1003",
     "paid",
     "5.00",
     "MY"
    ],
    [
     "1004",
     "paid",
     "26.00",
     "SG"
    ],
    [
     "1006",
     "paid",
     "14.00",
     "AU"
    ],
    [
     "1007",
     "paid",
     "7.00",
     "SG"
    ],
    [
     "1010",
     "paid",
     "19.00",
     "SG"
    ],
    [
     "1011",
     "paid",
     "16.50",
     "AU"
    ]
   ]
  },
  "m1.stage.2": {
   "cols": [
    "country",
    "n_rows",
    "sum_total",
    "avg_total"
   ],
   "rows": [
    [
     "AU",
     "2",
     "30.50",
     "15.25"
    ],
    [
     "MY",
     "1",
     "5.00",
     "5.0"
    ],
    [
     "SG",
     "5",
     "82.00",
     "16.4"
    ]
   ]
  },
  "m1.stage.3": {
   "cols": [
    "country",
    "n_rows",
    "sum_total",
    "avg_total"
   ],
   "rows": [
    [
     "AU",
     "2",
     "30.50",
     "15.25"
    ],
    [
     "SG",
     "5",
     "82.00",
     "16.4"
    ]
   ]
  },
  "m1.stage.4": {
   "cols": [
    "country",
    "orders",
    "revenue",
    "avg_order"
   ],
   "rows": [
    [
     "AU",
     "2",
     "30.50",
     "15.25"
    ],
    [
     "SG",
     "5",
     "82.00",
     "16.4"
    ]
   ]
  },
  "m1.stage.5": {
   "cols": [
    "country",
    "orders",
    "revenue",
    "avg_order"
   ],
   "rows": [
    [
     "SG",
     "5",
     "82.00",
     "16.4"
    ],
    [
     "AU",
     "2",
     "30.50",
     "15.25"
    ]
   ]
  },
  "m1.stage.6": {
   "cols": [
    "country",
    "orders",
    "revenue",
    "avg_order"
   ],
   "rows": [
    [
     "SG",
     "5",
     "82.00",
     "16.4"
    ],
    [
     "AU",
     "2",
     "30.50",
     "15.25"
    ]
   ]
  },
  "m2.avg_null": {
   "cols": [
    "avg_ignoring_null",
    "avg_null_as_zero",
    "null_customers"
   ],
   "rows": [
    [
     "3.091",
     "2.833",
     "1"
    ]
   ]
  },
  "m2.case_null": {
   "cols": [
    "customer_id",
    "tier",
    "bucket",
    "tier_or_unknown"
   ],
   "rows": [
    [
     "1",
     "gold",
     "top",
     "gold"
    ],
    [
     "2",
     "silver",
     "mid",
     "silver"
    ],
    [
     "3",
     "NULL",
     "other",
     "unknown"
    ],
    [
     "4",
     "silver",
     "mid",
     "silver"
    ],
    [
     "5",
     "gold",
     "top",
     "gold"
    ],
    [
     "6",
     "NULL",
     "other",
     "unknown"
    ],
    [
     "7",
     "silver",
     "mid",
     "silver"
    ],
    [
     "8",
     "gold",
     "top",
     "gold"
    ]
   ]
  },
  "m2.ch_changed.duckdb": {
   "cols": [
    "customer_id",
    "tier_in_customers",
    "tier_in_dimension"
   ],
   "rows": [
    [
     "7",
     "silver",
     "NULL"
    ],
    [
     "8",
     "gold",
     "NULL"
    ]
   ]
  },
  "m2.ch_changed.postgres": {
   "cols": [
    "customer_id",
    "tier_in_customers",
    "tier_in_dimension"
   ],
   "rows": [
    [
     "7",
     "silver",
     "NULL"
    ],
    [
     "8",
     "gold",
     "NULL"
    ]
   ]
  },
  "m2.ch_changed.sqlite": {
   "cols": [
    "customer_id",
    "tier_in_customers",
    "tier_in_dimension"
   ],
   "rows": [
    [
     "7",
     "silver",
     "NULL"
    ],
    [
     "8",
     "gold",
     "NULL"
    ]
   ]
  },
  "m2.ch_changed_wrong.duckdb": {
   "cols": [
    "customer_id",
    "tier_in_customers",
    "tier_in_dimension"
   ],
   "rows": []
  },
  "m2.ch_changed_wrong.postgres": {
   "cols": [
    "customer_id",
    "tier_in_customers",
    "tier_in_dimension"
   ],
   "rows": []
  },
  "m2.ch_changed_wrong.sqlite": {
   "cols": [
    "customer_id",
    "tier_in_customers",
    "tier_in_dimension"
   ],
   "rows": []
  },
  "m2.ch_never.duckdb": {
   "cols": [
    "customer_id",
    "name"
   ],
   "rows": [
    [
     "6",
     "Fay Tan"
    ],
    [
     "8",
     "Hana Ito"
    ]
   ]
  },
  "m2.ch_never.postgres": {
   "cols": [
    "customer_id",
    "name"
   ],
   "rows": [
    [
     "6",
     "Fay Tan"
    ],
    [
     "8",
     "Hana Ito"
    ]
   ]
  },
  "m2.ch_never.sqlite": {
   "cols": [
    "customer_id",
    "name"
   ],
   "rows": [
    [
     "6",
     "Fay Tan"
    ],
    [
     "8",
     "Hana Ito"
    ]
   ]
  },
  "m2.coalesce": {
   "cols": [
    "customer_id",
    "name",
    "email_shown",
    "tier_shown",
    "country_shown"
   ],
   "rows": [
    [
     "1",
     "Ana Lim",
     "ana@example.com",
     "gold",
     "SG"
    ],
    [
     "2",
     "Ben Ortiz",
     "no email",
     "silver",
     "MY"
    ],
    [
     "3",
     "Chen Wei",
     "chen@example.com",
     "unranked",
     "SG"
    ],
    [
     "4",
     "Dara Putri",
     "dara@example.com",
     "silver",
     "ID"
    ],
    [
     "5",
     "Eli Cohen",
     "eli@example.com",
     "gold",
     "AU"
    ],
    [
     "6",
     "Fay Tan",
     "no email",
     "unranked",
     "??"
    ],
    [
     "7",
     "Gus Hall",
     "gus@example.com",
     "silver",
     "AU"
    ],
    [
     "8",
     "Hana Ito",
     "hana@example.com",
     "gold",
     "SG"
    ]
   ]
  },
  "m2.concat_null.duckdb": {
   "cols": [
    "customer_id",
    "with_pipes",
    "with_concat"
   ],
   "rows": [
    [
     "1",
     "Hi Ana Lim <ana@example.com>",
     "Hi Ana Lim <ana@example.com>"
    ],
    [
     "2",
     "NULL",
     "Hi Ben Ortiz <>"
    ]
   ]
  },
  "m2.concat_null.postgres": {
   "cols": [
    "customer_id",
    "with_pipes",
    "with_concat"
   ],
   "rows": [
    [
     "1",
     "Hi Ana Lim <ana@example.com>",
     "Hi Ana Lim <ana@example.com>"
    ],
    [
     "2",
     "NULL",
     "Hi Ben Ortiz <>"
    ]
   ]
  },
  "m2.concat_null.sqlite": {
   "cols": [
    "customer_id",
    "with_pipes",
    "with_concat"
   ],
   "rows": [
    [
     "1",
     "Hi Ana Lim <ana@example.com>",
     "Hi Ana Lim <ana@example.com>"
    ],
    [
     "2",
     "NULL",
     "Hi Ben Ortiz <>"
    ]
   ]
  },
  "m2.count_forms": {
   "cols": [
    "all_rows",
    "tier_not_null",
    "tier_values",
    "country_values"
   ],
   "rows": [
    [
     "8",
     "6",
     "2",
     "4"
    ]
   ]
  },
  "m2.distinct_null": {
   "cols": [
    "tier"
   ],
   "rows": [
    [
     "gold"
    ],
    [
     "silver"
    ],
    [
     "NULL"
    ]
   ]
  },
  "m2.div_zero.duckdb": {
   "cols": [
    "ten_over_zero"
   ],
   "rows": [
    [
     "inf"
    ]
   ]
  },
  "m2.div_zero.sqlite": {
   "cols": [
    "ten_over_zero"
   ],
   "rows": [
    [
     "NULL"
    ]
   ]
  },
  "m2.guest_orders": {
   "cols": [
    "orders",
    "with_customer",
    "guest_orders"
   ],
   "rows": [
    [
     "12",
     "11",
     "1"
    ]
   ]
  },
  "m2.in_null_list.duckdb": {
   "cols": [
    "customer_id",
    "tier"
   ],
   "rows": [
    [
     "1",
     "gold"
    ],
    [
     "5",
     "gold"
    ],
    [
     "8",
     "gold"
    ]
   ]
  },
  "m2.in_null_list.postgres": {
   "cols": [
    "customer_id",
    "tier"
   ],
   "rows": [
    [
     "1",
     "gold"
    ],
    [
     "5",
     "gold"
    ],
    [
     "8",
     "gold"
    ]
   ]
  },
  "m2.in_null_list.sqlite": {
   "cols": [
    "customer_id",
    "tier"
   ],
   "rows": [
    [
     "1",
     "gold"
    ],
    [
     "5",
     "gold"
    ],
    [
     "8",
     "gold"
    ]
   ]
  },
  "m2.like_case.duckdb": {
   "cols": [
    "name"
   ],
   "rows": []
  },
  "m2.like_case.postgres": {
   "cols": [
    "name"
   ],
   "rows": []
  },
  "m2.like_case.sqlite": {
   "cols": [
    "name"
   ],
   "rows": [
    [
     "Ana Lim"
    ]
   ]
  },
  "m2.not_gold.duckdb": {
   "cols": [
    "filter",
    "customers"
   ],
   "rows": [
    [
     "tier <> gold",
     "3"
    ],
    [
     "tier IS DISTINCT FROM gold",
     "5"
    ],
    [
     "NOT (tier = gold)",
     "3"
    ],
    [
     "tier <> gold OR tier IS NULL",
     "5"
    ]
   ]
  },
  "m2.not_gold.postgres": {
   "cols": [
    "filter",
    "customers"
   ],
   "rows": [
    [
     "tier <> gold",
     "3"
    ],
    [
     "tier IS DISTINCT FROM gold",
     "5"
    ],
    [
     "NOT (tier = gold)",
     "3"
    ],
    [
     "tier <> gold OR tier IS NULL",
     "5"
    ]
   ]
  },
  "m2.not_gold.sqlite": {
   "cols": [
    "filter",
    "customers"
   ],
   "rows": [
    [
     "tier <> gold",
     "3"
    ],
    [
     "tier IS DISTINCT FROM gold",
     "5"
    ],
    [
     "NOT (tier = gold)",
     "3"
    ],
    [
     "tier <> gold OR tier IS NULL",
     "5"
    ]
   ]
  },
  "m2.not_in.duckdb": {
   "cols": [
    "method",
    "never_ordered"
   ],
   "rows": [
    [
     "NOT IN",
     "0"
    ],
    [
     "NOT EXISTS",
     "2"
    ],
    [
     "LEFT JOIN",
     "2"
    ]
   ]
  },
  "m2.not_in.postgres": {
   "cols": [
    "method",
    "never_ordered"
   ],
   "rows": [
    [
     "NOT IN",
     "0"
    ],
    [
     "NOT EXISTS",
     "2"
    ],
    [
     "LEFT JOIN",
     "2"
    ]
   ]
  },
  "m2.not_in.sqlite": {
   "cols": [
    "method",
    "never_ordered"
   ],
   "rows": [
    [
     "NOT IN",
     "0"
    ],
    [
     "NOT EXISTS",
     "2"
    ],
    [
     "LEFT JOIN",
     "2"
    ]
   ]
  },
  "m2.not_in_fixed.duckdb": {
   "cols": [
    "customer_id",
    "name"
   ],
   "rows": [
    [
     "6",
     "Fay Tan"
    ],
    [
     "8",
     "Hana Ito"
    ]
   ]
  },
  "m2.not_in_fixed.postgres": {
   "cols": [
    "customer_id",
    "name"
   ],
   "rows": [
    [
     "6",
     "Fay Tan"
    ],
    [
     "8",
     "Hana Ito"
    ]
   ]
  },
  "m2.not_in_fixed.sqlite": {
   "cols": [
    "customer_id",
    "name"
   ],
   "rows": [
    [
     "6",
     "Fay Tan"
    ],
    [
     "8",
     "Hana Ito"
    ]
   ]
  },
  "m2.null_eq.duckdb": {
   "cols": [
    "customers",
    "with_email",
    "equals_null",
    "is_null",
    "not_ana"
   ],
   "rows": [
    [
     "8",
     "6",
     "0",
     "2",
     "5"
    ]
   ]
  },
  "m2.null_eq.postgres": {
   "cols": [
    "customers",
    "with_email",
    "equals_null",
    "is_null",
    "not_ana"
   ],
   "rows": [
    [
     "8",
     "6",
     "0",
     "2",
     "5"
    ]
   ]
  },
  "m2.null_eq.sqlite": {
   "cols": [
    "customers",
    "with_email",
    "equals_null",
    "is_null",
    "not_ana"
   ],
   "rows": [
    [
     "8",
     "6",
     "0",
     "2",
     "5"
    ]
   ]
  },
  "m2.null_groups.duckdb": {
   "cols": [
    "tier",
    "customers"
   ],
   "rows": [
    [
     "gold",
     "3"
    ],
    [
     "silver",
     "3"
    ],
    [
     "NULL",
     "2"
    ]
   ]
  },
  "m2.null_groups.postgres": {
   "cols": [
    "tier",
    "customers"
   ],
   "rows": [
    [
     "gold",
     "3"
    ],
    [
     "silver",
     "3"
    ],
    [
     "NULL",
     "2"
    ]
   ]
  },
  "m2.null_groups.sqlite": {
   "cols": [
    "tier",
    "customers"
   ],
   "rows": [
    [
     "gold",
     "3"
    ],
    [
     "silver",
     "3"
    ],
    [
     "NULL",
     "2"
    ]
   ]
  },
  "m2.null_order.duckdb": {
   "cols": [
    "customer_id",
    "tier"
   ],
   "rows": [
    [
     "1",
     "gold"
    ],
    [
     "5",
     "gold"
    ],
    [
     "8",
     "gold"
    ],
    [
     "2",
     "silver"
    ],
    [
     "4",
     "silver"
    ],
    [
     "7",
     "silver"
    ],
    [
     "3",
     "NULL"
    ],
    [
     "6",
     "NULL"
    ]
   ]
  },
  "m2.null_order.postgres": {
   "cols": [
    "customer_id",
    "tier"
   ],
   "rows": [
    [
     "1",
     "gold"
    ],
    [
     "5",
     "gold"
    ],
    [
     "8",
     "gold"
    ],
    [
     "2",
     "silver"
    ],
    [
     "4",
     "silver"
    ],
    [
     "7",
     "silver"
    ],
    [
     "3",
     "NULL"
    ],
    [
     "6",
     "NULL"
    ]
   ]
  },
  "m2.null_order.sqlite": {
   "cols": [
    "customer_id",
    "tier"
   ],
   "rows": [
    [
     "3",
     "NULL"
    ],
    [
     "6",
     "NULL"
    ],
    [
     "1",
     "gold"
    ],
    [
     "5",
     "gold"
    ],
    [
     "8",
     "gold"
    ],
    [
     "2",
     "silver"
    ],
    [
     "4",
     "silver"
    ],
    [
     "7",
     "silver"
    ]
   ]
  },
  "m2.null_order_explicit.duckdb": {
   "cols": [
    "customer_id",
    "tier"
   ],
   "rows": [
    [
     "3",
     "NULL"
    ],
    [
     "6",
     "NULL"
    ],
    [
     "1",
     "gold"
    ],
    [
     "5",
     "gold"
    ],
    [
     "8",
     "gold"
    ],
    [
     "2",
     "silver"
    ],
    [
     "4",
     "silver"
    ],
    [
     "7",
     "silver"
    ]
   ]
  },
  "m2.null_order_explicit.postgres": {
   "cols": [
    "customer_id",
    "tier"
   ],
   "rows": [
    [
     "3",
     "NULL"
    ],
    [
     "6",
     "NULL"
    ],
    [
     "1",
     "gold"
    ],
    [
     "5",
     "gold"
    ],
    [
     "8",
     "gold"
    ],
    [
     "2",
     "silver"
    ],
    [
     "4",
     "silver"
    ],
    [
     "7",
     "silver"
    ]
   ]
  },
  "m2.null_order_explicit.sqlite": {
   "cols": [
    "customer_id",
    "tier"
   ],
   "rows": [
    [
     "3",
     "NULL"
    ],
    [
     "6",
     "NULL"
    ],
    [
     "1",
     "gold"
    ],
    [
     "5",
     "gold"
    ],
    [
     "8",
     "gold"
    ],
    [
     "2",
     "silver"
    ],
    [
     "4",
     "silver"
    ],
    [
     "7",
     "silver"
    ]
   ]
  },
  "m2.nullif.duckdb": {
   "cols": [
    "safe_division",
    "with_default"
   ],
   "rows": [
    [
     "NULL",
     "-1.0"
    ]
   ]
  },
  "m2.nullif.postgres": {
   "cols": [
    "safe_division",
    "with_default"
   ],
   "rows": [
    [
     "NULL",
     "-1"
    ]
   ]
  },
  "m2.nullif.sqlite": {
   "cols": [
    "safe_division",
    "with_default"
   ],
   "rows": [
    [
     "NULL",
     "-1"
    ]
   ]
  },
  "m2.where_and_or": {
   "cols": [
    "order_id",
    "status",
    "channel",
    "total"
   ],
   "rows": [
    [
     "1001",
     "paid",
     "web",
     "11.50"
    ],
    [
     "1003",
     "paid",
     "app",
     "5.00"
    ],
    [
     "1004",
     "paid",
     "web",
     "26.00"
    ],
    [
     "1006",
     "paid",
     "web",
     "14.00"
    ],
    [
     "1007",
     "paid",
     "app",
     "7.00"
    ],
    [
     "1008",
     "refunded",
     "web",
     "12.00"
    ],
    [
     "1010",
     "paid",
     "web",
     "19.00"
    ],
    [
     "1011",
     "paid",
     "app",
     "16.50"
    ]
   ]
  },
  "m2.where_and_or_fixed": {
   "cols": [
    "order_id",
    "status",
    "channel",
    "total"
   ],
   "rows": [
    [
     "1001",
     "paid",
     "web",
     "11.50"
    ],
    [
     "1003",
     "paid",
     "app",
     "5.00"
    ],
    [
     "1004",
     "paid",
     "web",
     "26.00"
    ],
    [
     "1006",
     "paid",
     "web",
     "14.00"
    ],
    [
     "1007",
     "paid",
     "app",
     "7.00"
    ],
    [
     "1010",
     "paid",
     "web",
     "19.00"
    ],
    [
     "1011",
     "paid",
     "app",
     "16.50"
    ]
   ]
  },
  "m3.ch_country": {
   "cols": [
    "country",
    "orders",
    "revenue"
   ],
   "rows": [
    [
     "SG",
     "5",
     "82.00"
    ],
    [
     "AU",
     "2",
     "30.50"
    ],
    [
     "MY",
     "1",
     "5.00"
    ]
   ]
  },
  "m3.ch_country_wrong": {
   "cols": [
    "country",
    "orders",
    "revenue"
   ],
   "rows": [
    [
     "SG",
     "6",
     "100.50"
    ],
    [
     "AU",
     "2",
     "30.50"
    ],
    [
     "MY",
     "1",
     "5.00"
    ]
   ]
  },
  "m3.ch_paid_by_order": {
   "cols": [
    "order_id",
    "total",
    "paid"
   ],
   "rows": [
    [
     "1001",
     "11.50",
     "11.50"
    ],
    [
     "1002",
     "18.50",
     "18.50"
    ],
    [
     "1003",
     "5.00",
     "5.00"
    ],
    [
     "1004",
     "26.00",
     "26.00"
    ],
    [
     "1005",
     "9.00",
     "0.00"
    ],
    [
     "1006",
     "14.00",
     "14.00"
    ],
    [
     "1007",
     "7.00",
     "7.00"
    ],
    [
     "1008",
     "12.00",
     "0.00"
    ],
    [
     "1009",
     "9.50",
     "9.50"
    ],
    [
     "1010",
     "19.00",
     "19.00"
    ],
    [
     "1011",
     "16.50",
     "16.50"
    ],
    [
     "1012",
     "8.00",
     "0.00"
    ]
   ]
  },
  "m3.distinct_trap": {
   "cols": [
    "paid_orders",
    "plain_sum",
    "distinct_sum",
    "different_totals"
   ],
   "rows": [
    [
     "27315",
     "1212532.00",
     "267.00",
     "6"
    ]
   ]
  },
  "m3.fanout_payments": {
   "cols": [
    "order_id",
    "total",
    "payment_id",
    "amount"
   ],
   "rows": [
    [
     "1001",
     "11.50",
     "1",
     "11.50"
    ],
    [
     "1002",
     "18.50",
     "2",
     "10.00"
    ],
    [
     "1002",
     "18.50",
     "3",
     "8.50"
    ],
    [
     "1003",
     "5.00",
     "4",
     "5.00"
    ],
    [
     "1004",
     "26.00",
     "5",
     "26.00"
    ],
    [
     "1006",
     "14.00",
     "6",
     "14.00"
    ],
    [
     "1007",
     "7.00",
     "7",
     "7.00"
    ],
    [
     "1009",
     "9.50",
     "10",
     "9.50"
    ],
    [
     "1010",
     "19.00",
     "11",
     "19.00"
    ],
    [
     "1011",
     "16.50",
     "12",
     "16.50"
    ]
   ]
  },
  "m3.fanout_sum.duckdb": {
   "cols": [
    "joined_with",
    "rows",
    "revenue"
   ],
   "rows": [
    [
     "orders only",
     "9",
     "127.00"
    ],
    [
     "orders and payments",
     "10",
     "145.50"
    ]
   ]
  },
  "m3.fanout_sum.postgres": {
   "cols": [
    "joined_with",
    "rows",
    "revenue"
   ],
   "rows": [
    [
     "orders only",
     "9",
     "127.00"
    ],
    [
     "orders and payments",
     "10",
     "145.50"
    ]
   ]
  },
  "m3.fanout_sum.sqlite": {
   "cols": [
    "joined_with",
    "rows",
    "revenue"
   ],
   "rows": [
    [
     "orders only",
     "9",
     "127.0"
    ],
    [
     "orders and payments",
     "10",
     "145.5"
    ]
   ]
  },
  "m3.grain_counts": {
   "cols": [
    "payment_rows",
    "orders_paid"
   ],
   "rows": [
    [
     "12",
     "10"
    ]
   ]
  },
  "m3.grain_multi": {
   "cols": [
    "order_id",
    "payments"
   ],
   "rows": [
    [
     "1002",
     "2"
    ],
    [
     "1008",
     "2"
    ]
   ]
  },
  "m3.jointype.cross": {
   "cols": [
    "customer_id",
    "name",
    "order_id",
    "status"
   ],
   "rows": [
    [
     "1",
     "Ana Lim",
     "1001",
     "paid"
    ],
    [
     "1",
     "Ana Lim",
     "1002",
     "paid"
    ],
    [
     "1",
     "Ana Lim",
     "1003",
     "paid"
    ],
    [
     "1",
     "Ana Lim",
     "1004",
     "paid"
    ],
    [
     "1",
     "Ana Lim",
     "1005",
     "cancelled"
    ],
    [
     "1",
     "Ana Lim",
     "1006",
     "paid"
    ],
    [
     "1",
     "Ana Lim",
     "1007",
     "paid"
    ],
    [
     "1",
     "Ana Lim",
     "1008",
     "refunded"
    ],
    [
     "1",
     "Ana Lim",
     "1009",
     "paid"
    ],
    [
     "1",
     "Ana Lim",
     "1010",
     "paid"
    ],
    [
     "1",
     "Ana Lim",
     "1011",
     "paid"
    ],
    [
     "1",
     "Ana Lim",
     "1012",
     "pending"
    ],
    [
     "2",
     "Ben Ortiz",
     "1001",
     "paid"
    ],
    [
     "2",
     "Ben Ortiz",
     "1002",
     "paid"
    ],
    [
     "2",
     "Ben Ortiz",
     "1003",
     "paid"
    ],
    [
     "2",
     "Ben Ortiz",
     "1004",
     "paid"
    ],
    [
     "2",
     "Ben Ortiz",
     "1005",
     "cancelled"
    ],
    [
     "2",
     "Ben Ortiz",
     "1006",
     "paid"
    ],
    [
     "2",
     "Ben Ortiz",
     "1007",
     "paid"
    ],
    [
     "2",
     "Ben Ortiz",
     "1008",
     "refunded"
    ],
    [
     "2",
     "Ben Ortiz",
     "1009",
     "paid"
    ],
    [
     "2",
     "Ben Ortiz",
     "1010",
     "paid"
    ],
    [
     "2",
     "Ben Ortiz",
     "1011",
     "paid"
    ],
    [
     "2",
     "Ben Ortiz",
     "1012",
     "pending"
    ],
    [
     "3",
     "Chen Wei",
     "1001",
     "paid"
    ],
    [
     "3",
     "Chen Wei",
     "1002",
     "paid"
    ],
    [
     "3",
     "Chen Wei",
     "1003",
     "paid"
    ],
    [
     "3",
     "Chen Wei",
     "1004",
     "paid"
    ],
    [
     "3",
     "Chen Wei",
     "1005",
     "cancelled"
    ],
    [
     "3",
     "Chen Wei",
     "1006",
     "paid"
    ],
    [
     "3",
     "Chen Wei",
     "1007",
     "paid"
    ],
    [
     "3",
     "Chen Wei",
     "1008",
     "refunded"
    ],
    [
     "3",
     "Chen Wei",
     "1009",
     "paid"
    ],
    [
     "3",
     "Chen Wei",
     "1010",
     "paid"
    ],
    [
     "3",
     "Chen Wei",
     "1011",
     "paid"
    ],
    [
     "3",
     "Chen Wei",
     "1012",
     "pending"
    ],
    [
     "4",
     "Dara Putri",
     "1001",
     "paid"
    ],
    [
     "4",
     "Dara Putri",
     "1002",
     "paid"
    ],
    [
     "4",
     "Dara Putri",
     "1003",
     "paid"
    ],
    [
     "4",
     "Dara Putri",
     "1004",
     "paid"
    ],
    [
     "4",
     "Dara Putri",
     "1005",
     "cancelled"
    ],
    [
     "4",
     "Dara Putri",
     "1006",
     "paid"
    ],
    [
     "4",
     "Dara Putri",
     "1007",
     "paid"
    ],
    [
     "4",
     "Dara Putri",
     "1008",
     "refunded"
    ],
    [
     "4",
     "Dara Putri",
     "1009",
     "paid"
    ],
    [
     "4",
     "Dara Putri",
     "1010",
     "paid"
    ],
    [
     "4",
     "Dara Putri",
     "1011",
     "paid"
    ],
    [
     "4",
     "Dara Putri",
     "1012",
     "pending"
    ],
    [
     "5",
     "Eli Cohen",
     "1001",
     "paid"
    ],
    [
     "5",
     "Eli Cohen",
     "1002",
     "paid"
    ],
    [
     "5",
     "Eli Cohen",
     "1003",
     "paid"
    ],
    [
     "5",
     "Eli Cohen",
     "1004",
     "paid"
    ],
    [
     "5",
     "Eli Cohen",
     "1005",
     "cancelled"
    ],
    [
     "5",
     "Eli Cohen",
     "1006",
     "paid"
    ],
    [
     "5",
     "Eli Cohen",
     "1007",
     "paid"
    ],
    [
     "5",
     "Eli Cohen",
     "1008",
     "refunded"
    ],
    [
     "5",
     "Eli Cohen",
     "1009",
     "paid"
    ],
    [
     "5",
     "Eli Cohen",
     "1010",
     "paid"
    ],
    [
     "5",
     "Eli Cohen",
     "1011",
     "paid"
    ],
    [
     "5",
     "Eli Cohen",
     "1012",
     "pending"
    ],
    [
     "6",
     "Fay Tan",
     "1001",
     "paid"
    ],
    [
     "6",
     "Fay Tan",
     "1002",
     "paid"
    ],
    [
     "6",
     "Fay Tan",
     "1003",
     "paid"
    ],
    [
     "6",
     "Fay Tan",
     "1004",
     "paid"
    ],
    [
     "6",
     "Fay Tan",
     "1005",
     "cancelled"
    ],
    [
     "6",
     "Fay Tan",
     "1006",
     "paid"
    ],
    [
     "6",
     "Fay Tan",
     "1007",
     "paid"
    ],
    [
     "6",
     "Fay Tan",
     "1008",
     "refunded"
    ],
    [
     "6",
     "Fay Tan",
     "1009",
     "paid"
    ],
    [
     "6",
     "Fay Tan",
     "1010",
     "paid"
    ],
    [
     "6",
     "Fay Tan",
     "1011",
     "paid"
    ],
    [
     "6",
     "Fay Tan",
     "1012",
     "pending"
    ],
    [
     "7",
     "Gus Hall",
     "1001",
     "paid"
    ],
    [
     "7",
     "Gus Hall",
     "1002",
     "paid"
    ],
    [
     "7",
     "Gus Hall",
     "1003",
     "paid"
    ],
    [
     "7",
     "Gus Hall",
     "1004",
     "paid"
    ],
    [
     "7",
     "Gus Hall",
     "1005",
     "cancelled"
    ],
    [
     "7",
     "Gus Hall",
     "1006",
     "paid"
    ],
    [
     "7",
     "Gus Hall",
     "1007",
     "paid"
    ],
    [
     "7",
     "Gus Hall",
     "1008",
     "refunded"
    ],
    [
     "7",
     "Gus Hall",
     "1009",
     "paid"
    ],
    [
     "7",
     "Gus Hall",
     "1010",
     "paid"
    ],
    [
     "7",
     "Gus Hall",
     "1011",
     "paid"
    ],
    [
     "7",
     "Gus Hall",
     "1012",
     "pending"
    ],
    [
     "8",
     "Hana Ito",
     "1001",
     "paid"
    ],
    [
     "8",
     "Hana Ito",
     "1002",
     "paid"
    ],
    [
     "8",
     "Hana Ito",
     "1003",
     "paid"
    ],
    [
     "8",
     "Hana Ito",
     "1004",
     "paid"
    ],
    [
     "8",
     "Hana Ito",
     "1005",
     "cancelled"
    ],
    [
     "8",
     "Hana Ito",
     "1006",
     "paid"
    ],
    [
     "8",
     "Hana Ito",
     "1007",
     "paid"
    ],
    [
     "8",
     "Hana Ito",
     "1008",
     "refunded"
    ],
    [
     "8",
     "Hana Ito",
     "1009",
     "paid"
    ],
    [
     "8",
     "Hana Ito",
     "1010",
     "paid"
    ],
    [
     "8",
     "Hana Ito",
     "1011",
     "paid"
    ],
    [
     "8",
     "Hana Ito",
     "1012",
     "pending"
    ]
   ]
  },
  "m3.jointype.full": {
   "cols": [
    "customer_id",
    "name",
    "order_id",
    "status"
   ],
   "rows": [
    [
     "1",
     "Ana Lim",
     "1001",
     "paid"
    ],
    [
     "1",
     "Ana Lim",
     "1002",
     "paid"
    ],
    [
     "1",
     "Ana Lim",
     "1007",
     "paid"
    ],
    [
     "2",
     "Ben Ortiz",
     "1003",
     "paid"
    ],
    [
     "2",
     "Ben Ortiz",
     "1012",
     "pending"
    ],
    [
     "3",
     "Chen Wei",
     "1004",
     "paid"
    ],
    [
     "3",
     "Chen Wei",
     "1010",
     "paid"
    ],
    [
     "4",
     "Dara Putri",
     "1005",
     "cancelled"
    ],
    [
     "5",
     "Eli Cohen",
     "1006",
     "paid"
    ],
    [
     "5",
     "Eli Cohen",
     "1011",
     "paid"
    ],
    [
     "6",
     "Fay Tan",
     "NULL",
     "NULL"
    ],
    [
     "7",
     "Gus Hall",
     "1008",
     "refunded"
    ],
    [
     "8",
     "Hana Ito",
     "NULL",
     "NULL"
    ],
    [
     "NULL",
     "NULL",
     "1009",
     "paid"
    ]
   ]
  },
  "m3.jointype.inner": {
   "cols": [
    "customer_id",
    "name",
    "order_id",
    "status"
   ],
   "rows": [
    [
     "1",
     "Ana Lim",
     "1001",
     "paid"
    ],
    [
     "1",
     "Ana Lim",
     "1002",
     "paid"
    ],
    [
     "1",
     "Ana Lim",
     "1007",
     "paid"
    ],
    [
     "2",
     "Ben Ortiz",
     "1003",
     "paid"
    ],
    [
     "2",
     "Ben Ortiz",
     "1012",
     "pending"
    ],
    [
     "3",
     "Chen Wei",
     "1004",
     "paid"
    ],
    [
     "3",
     "Chen Wei",
     "1010",
     "paid"
    ],
    [
     "4",
     "Dara Putri",
     "1005",
     "cancelled"
    ],
    [
     "5",
     "Eli Cohen",
     "1006",
     "paid"
    ],
    [
     "5",
     "Eli Cohen",
     "1011",
     "paid"
    ],
    [
     "7",
     "Gus Hall",
     "1008",
     "refunded"
    ]
   ]
  },
  "m3.jointype.left": {
   "cols": [
    "customer_id",
    "name",
    "order_id",
    "status"
   ],
   "rows": [
    [
     "1",
     "Ana Lim",
     "1001",
     "paid"
    ],
    [
     "1",
     "Ana Lim",
     "1002",
     "paid"
    ],
    [
     "1",
     "Ana Lim",
     "1007",
     "paid"
    ],
    [
     "2",
     "Ben Ortiz",
     "1003",
     "paid"
    ],
    [
     "2",
     "Ben Ortiz",
     "1012",
     "pending"
    ],
    [
     "3",
     "Chen Wei",
     "1004",
     "paid"
    ],
    [
     "3",
     "Chen Wei",
     "1010",
     "paid"
    ],
    [
     "4",
     "Dara Putri",
     "1005",
     "cancelled"
    ],
    [
     "5",
     "Eli Cohen",
     "1006",
     "paid"
    ],
    [
     "5",
     "Eli Cohen",
     "1011",
     "paid"
    ],
    [
     "6",
     "Fay Tan",
     "NULL",
     "NULL"
    ],
    [
     "7",
     "Gus Hall",
     "1008",
     "refunded"
    ],
    [
     "8",
     "Hana Ito",
     "NULL",
     "NULL"
    ]
   ]
  },
  "m3.jointype.right": {
   "cols": [
    "customer_id",
    "name",
    "order_id",
    "status"
   ],
   "rows": [
    [
     "1",
     "Ana Lim",
     "1001",
     "paid"
    ],
    [
     "1",
     "Ana Lim",
     "1002",
     "paid"
    ],
    [
     "1",
     "Ana Lim",
     "1007",
     "paid"
    ],
    [
     "2",
     "Ben Ortiz",
     "1003",
     "paid"
    ],
    [
     "2",
     "Ben Ortiz",
     "1012",
     "pending"
    ],
    [
     "3",
     "Chen Wei",
     "1004",
     "paid"
    ],
    [
     "3",
     "Chen Wei",
     "1010",
     "paid"
    ],
    [
     "4",
     "Dara Putri",
     "1005",
     "cancelled"
    ],
    [
     "5",
     "Eli Cohen",
     "1006",
     "paid"
    ],
    [
     "5",
     "Eli Cohen",
     "1011",
     "paid"
    ],
    [
     "7",
     "Gus Hall",
     "1008",
     "refunded"
    ],
    [
     "NULL",
     "NULL",
     "1009",
     "paid"
    ]
   ]
  },
  "m3.lateral.duckdb": {
   "cols": [
    "customer_id",
    "name",
    "order_id",
    "order_ts",
    "total"
   ],
   "rows": [
    [
     "1",
     "Ana Lim",
     "1007",
     "2026-03-05 08:00:00",
     "7.00"
    ],
    [
     "2",
     "Ben Ortiz",
     "1012",
     "2026-03-09 15:00:00",
     "8.00"
    ],
    [
     "3",
     "Chen Wei",
     "1010",
     "2026-03-07 12:30:00",
     "19.00"
    ],
    [
     "4",
     "Dara Putri",
     "1005",
     "2026-03-04 03:05:00",
     "9.00"
    ],
    [
     "5",
     "Eli Cohen",
     "1011",
     "2026-03-08 04:45:00",
     "16.50"
    ],
    [
     "7",
     "Gus Hall",
     "1008",
     "2026-03-06 10:20:00",
     "12.00"
    ]
   ]
  },
  "m3.lateral.postgres": {
   "cols": [
    "customer_id",
    "name",
    "order_id",
    "order_ts",
    "total"
   ],
   "rows": [
    [
     "1",
     "Ana Lim",
     "1007",
     "2026-03-05 08:00:00",
     "7.00"
    ],
    [
     "2",
     "Ben Ortiz",
     "1012",
     "2026-03-09 15:00:00",
     "8.00"
    ],
    [
     "3",
     "Chen Wei",
     "1010",
     "2026-03-07 12:30:00",
     "19.00"
    ],
    [
     "4",
     "Dara Putri",
     "1005",
     "2026-03-04 03:05:00",
     "9.00"
    ],
    [
     "5",
     "Eli Cohen",
     "1011",
     "2026-03-08 04:45:00",
     "16.50"
    ],
    [
     "7",
     "Gus Hall",
     "1008",
     "2026-03-06 10:20:00",
     "12.00"
    ]
   ]
  },
  "m3.left_on": {
   "cols": [
    "customer_id",
    "name",
    "paid_orders"
   ],
   "rows": [
    [
     "1",
     "Ana Lim",
     "3"
    ],
    [
     "2",
     "Ben Ortiz",
     "1"
    ],
    [
     "3",
     "Chen Wei",
     "2"
    ],
    [
     "4",
     "Dara Putri",
     "0"
    ],
    [
     "5",
     "Eli Cohen",
     "2"
    ],
    [
     "6",
     "Fay Tan",
     "0"
    ],
    [
     "7",
     "Gus Hall",
     "0"
    ],
    [
     "8",
     "Hana Ito",
     "0"
    ]
   ]
  },
  "m3.left_where": {
   "cols": [
    "customer_id",
    "name",
    "paid_orders"
   ],
   "rows": [
    [
     "1",
     "Ana Lim",
     "3"
    ],
    [
     "2",
     "Ben Ortiz",
     "1"
    ],
    [
     "3",
     "Chen Wei",
     "2"
    ],
    [
     "5",
     "Eli Cohen",
     "2"
    ]
   ]
  },
  "m3.natural.duckdb": {
   "cols": [
    "rows"
   ],
   "rows": [
    [
     "0"
    ]
   ]
  },
  "m3.natural.postgres": {
   "cols": [
    "rows"
   ],
   "rows": [
    [
     "0"
    ]
   ]
  },
  "m3.natural.sqlite": {
   "cols": [
    "rows"
   ],
   "rows": [
    [
     "0"
    ]
   ]
  },
  "m3.onwhere_counts.duckdb": {
   "cols": [
    "variant",
    "rows"
   ],
   "rows": [
    [
     "filter in ON",
     "12"
    ],
    [
     "filter in WHERE",
     "8"
    ],
    [
     "no filter",
     "13"
    ]
   ]
  },
  "m3.onwhere_counts.postgres": {
   "cols": [
    "variant",
    "rows"
   ],
   "rows": [
    [
     "filter in ON",
     "12"
    ],
    [
     "filter in WHERE",
     "8"
    ],
    [
     "no filter",
     "13"
    ]
   ]
  },
  "m3.onwhere_counts.sqlite": {
   "cols": [
    "variant",
    "rows"
   ],
   "rows": [
    [
     "filter in ON",
     "12"
    ],
    [
     "filter in WHERE",
     "8"
    ],
    [
     "no filter",
     "13"
    ]
   ]
  },
  "m3.preagg_orders": {
   "cols": [
    "order_id",
    "status",
    "total",
    "net_paid"
   ],
   "rows": [
    [
     "1001",
     "paid",
     "11.50",
     "11.50"
    ],
    [
     "1002",
     "paid",
     "18.50",
     "18.50"
    ],
    [
     "1003",
     "paid",
     "5.00",
     "5.00"
    ],
    [
     "1004",
     "paid",
     "26.00",
     "26.00"
    ],
    [
     "1005",
     "cancelled",
     "9.00",
     "NULL"
    ],
    [
     "1006",
     "paid",
     "14.00",
     "14.00"
    ],
    [
     "1007",
     "paid",
     "7.00",
     "7.00"
    ],
    [
     "1008",
     "refunded",
     "12.00",
     "0.00"
    ],
    [
     "1009",
     "paid",
     "9.50",
     "9.50"
    ],
    [
     "1010",
     "paid",
     "19.00",
     "19.00"
    ],
    [
     "1011",
     "paid",
     "16.50",
     "16.50"
    ],
    [
     "1012",
     "pending",
     "8.00",
     "NULL"
    ]
   ]
  },
  "m3.preagg_revenue.duckdb": {
   "cols": [
    "rows",
    "revenue"
   ],
   "rows": [
    [
     "9",
     "127.00"
    ]
   ]
  },
  "m3.preagg_revenue.postgres": {
   "cols": [
    "rows",
    "revenue"
   ],
   "rows": [
    [
     "9",
     "127.00"
    ]
   ]
  },
  "m3.preagg_revenue.sqlite": {
   "cols": [
    "rows",
    "revenue"
   ],
   "rows": [
    [
     "9",
     "127.0"
    ]
   ]
  },
  "m3.range_join.duckdb": {
   "cols": [
    "order_id",
    "line_no",
    "product_id",
    "order_day",
    "charged",
    "list_price"
   ],
   "rows": [
    [
     "1003",
     "1",
     "3",
     "2026-03-02",
     "5.00",
     "4.50"
    ]
   ]
  },
  "m3.range_join.postgres": {
   "cols": [
    "order_id",
    "line_no",
    "product_id",
    "order_day",
    "charged",
    "list_price"
   ],
   "rows": [
    [
     "1003",
     "1",
     "3",
     "2026-03-02",
     "5.00",
     "4.50"
    ]
   ]
  },
  "m3.self_join.duckdb": {
   "cols": [
    "category_id",
    "category",
    "parent"
   ],
   "rows": [
    [
     "1",
     "Menu",
     "NULL"
    ],
    [
     "2",
     "Drinks",
     "Menu"
    ],
    [
     "3",
     "Coffee",
     "Drinks"
    ],
    [
     "4",
     "Espresso drinks",
     "Coffee"
    ],
    [
     "5",
     "Cold coffee",
     "Coffee"
    ],
    [
     "6",
     "Tea",
     "Drinks"
    ],
    [
     "7",
     "Retail",
     "Menu"
    ],
    [
     "8",
     "Beans",
     "Retail"
    ],
    [
     "9",
     "Merch",
     "Retail"
    ]
   ]
  },
  "m3.self_join.postgres": {
   "cols": [
    "category_id",
    "category",
    "parent"
   ],
   "rows": [
    [
     "1",
     "Menu",
     "NULL"
    ],
    [
     "2",
     "Drinks",
     "Menu"
    ],
    [
     "3",
     "Coffee",
     "Drinks"
    ],
    [
     "4",
     "Espresso drinks",
     "Coffee"
    ],
    [
     "5",
     "Cold coffee",
     "Coffee"
    ],
    [
     "6",
     "Tea",
     "Drinks"
    ],
    [
     "7",
     "Retail",
     "Menu"
    ],
    [
     "8",
     "Beans",
     "Retail"
    ],
    [
     "9",
     "Merch",
     "Retail"
    ]
   ]
  },
  "m3.self_join.sqlite": {
   "cols": [
    "category_id",
    "category",
    "parent"
   ],
   "rows": [
    [
     "1",
     "Menu",
     "NULL"
    ],
    [
     "2",
     "Drinks",
     "Menu"
    ],
    [
     "3",
     "Coffee",
     "Drinks"
    ],
    [
     "4",
     "Espresso drinks",
     "Coffee"
    ],
    [
     "5",
     "Cold coffee",
     "Coffee"
    ],
    [
     "6",
     "Tea",
     "Drinks"
    ],
    [
     "7",
     "Retail",
     "Menu"
    ],
    [
     "8",
     "Beans",
     "Retail"
    ],
    [
     "9",
     "Merch",
     "Retail"
    ]
   ]
  },
  "m3.using.duckdb": {
   "cols": [
    "customer_id",
    "name",
    "order_id"
   ],
   "rows": [
    [
     "1",
     "Ana Lim",
     "1001"
    ],
    [
     "1",
     "Ana Lim",
     "1002"
    ],
    [
     "2",
     "Ben Ortiz",
     "1003"
    ]
   ]
  },
  "m3.using.postgres": {
   "cols": [
    "customer_id",
    "name",
    "order_id"
   ],
   "rows": [
    [
     "1",
     "Ana Lim",
     "1001"
    ],
    [
     "1",
     "Ana Lim",
     "1002"
    ],
    [
     "2",
     "Ben Ortiz",
     "1003"
    ]
   ]
  },
  "m3.using.sqlite": {
   "cols": [
    "customer_id",
    "name",
    "order_id"
   ],
   "rows": [
    [
     "1",
     "Ana Lim",
     "1001"
    ],
    [
     "1",
     "Ana Lim",
     "1002"
    ],
    [
     "2",
     "Ben Ortiz",
     "1003"
    ]
   ]
  },
  "m4.approx": {
   "cols": [
    "exact",
    "approximate"
   ],
   "rows": [
    [
     "3000",
     "2999"
    ]
   ]
  },
  "m4.avg_of_avgs": {
   "cols": [
    "average_of_averages",
    "average_of_orders"
   ],
   "rows": [
    [
     "12.97",
     "14.11"
    ]
   ]
  },
  "m4.bare_column.sqlite": {
   "cols": [
    "status",
    "channel",
    "orders"
   ],
   "rows": [
    [
     "cancelled",
     "app",
     "1"
    ],
    [
     "paid",
     "web",
     "9"
    ],
    [
     "pending",
     "app",
     "1"
    ],
    [
     "refunded",
     "web",
     "1"
    ]
   ]
  },
  "m4.basic": {
   "cols": [
    "status",
    "orders",
    "revenue",
    "smallest",
    "largest",
    "average"
   ],
   "rows": [
    [
     "cancelled",
     "1",
     "9.00",
     "9.00",
     "9.00",
     "9.0"
    ],
    [
     "paid",
     "9",
     "127.00",
     "5.00",
     "26.00",
     "14.11"
    ],
    [
     "pending",
     "1",
     "8.00",
     "8.00",
     "8.00",
     "8.0"
    ],
    [
     "refunded",
     "1",
     "12.00",
     "12.00",
     "12.00",
     "12.0"
    ]
   ]
  },
  "m4.ch_conditional": {
   "cols": [
    "store_id",
    "paid",
    "cancelled",
    "refunded"
   ],
   "rows": [
    [
     "1",
     "82.00",
     "0.00",
     "0.00"
    ],
    [
     "2",
     "14.50",
     "0.00",
     "0.00"
    ],
    [
     "3",
     "0.00",
     "9.00",
     "0.00"
    ],
    [
     "4",
     "30.50",
     "0.00",
     "12.00"
    ]
   ]
  },
  "m4.ch_daily": {
   "cols": [
    "day",
    "orders",
    "revenue"
   ],
   "rows": [
    [
     "2026-03-01",
     "1",
     "11.50"
    ],
    [
     "2026-03-02",
     "2",
     "31.00"
    ],
    [
     "2026-03-03",
     "1",
     "18.50"
    ],
    [
     "2026-03-04",
     "1",
     "14.00"
    ],
    [
     "2026-03-05",
     "1",
     "7.00"
    ],
    [
     "2026-03-06",
     "1",
     "9.50"
    ],
    [
     "2026-03-07",
     "1",
     "19.00"
    ],
    [
     "2026-03-08",
     "1",
     "16.50"
    ],
    [
     "NULL",
     "9",
     "127.00"
    ]
   ]
  },
  "m4.ch_repeat": {
   "cols": [
    "customer_id",
    "paid_orders",
    "spent"
   ],
   "rows": [
    [
     "3",
     "2",
     "45.00"
    ],
    [
     "1",
     "3",
     "37.00"
    ],
    [
     "5",
     "2",
     "30.50"
    ]
   ]
  },
  "m4.conditional.duckdb": {
   "cols": [
    "store_id",
    "orders",
    "paid_with_case",
    "paid_with_filter",
    "paid_orders"
   ],
   "rows": [
    [
     "1",
     "5",
     "82.00",
     "82.00",
     "5"
    ],
    [
     "2",
     "3",
     "14.50",
     "14.50",
     "2"
    ],
    [
     "3",
     "1",
     "0.00",
     "NULL",
     "0"
    ],
    [
     "4",
     "3",
     "30.50",
     "30.50",
     "2"
    ]
   ]
  },
  "m4.conditional.postgres": {
   "cols": [
    "store_id",
    "orders",
    "paid_with_case",
    "paid_with_filter",
    "paid_orders"
   ],
   "rows": [
    [
     "1",
     "5",
     "82.00",
     "82.00",
     "5"
    ],
    [
     "2",
     "3",
     "14.50",
     "14.50",
     "2"
    ],
    [
     "3",
     "1",
     "0",
     "NULL",
     "0"
    ],
    [
     "4",
     "3",
     "30.50",
     "30.50",
     "2"
    ]
   ]
  },
  "m4.conditional.sqlite": {
   "cols": [
    "store_id",
    "orders",
    "paid_with_case",
    "paid_with_filter",
    "paid_orders"
   ],
   "rows": [
    [
     "1",
     "5",
     "82.0",
     "82.0",
     "5"
    ],
    [
     "2",
     "3",
     "14.5",
     "14.5",
     "2"
    ],
    [
     "3",
     "1",
     "0",
     "NULL",
     "0"
    ],
    [
     "4",
     "3",
     "30.5",
     "30.5",
     "2"
    ]
   ]
  },
  "m4.distinct_counts.duckdb": {
   "cols": [
    "store_id",
    "orders",
    "with_customer",
    "different_customers"
   ],
   "rows": [
    [
     "1",
     "5",
     "5",
     "2"
    ],
    [
     "2",
     "3",
     "2",
     "1"
    ],
    [
     "3",
     "1",
     "1",
     "1"
    ],
    [
     "4",
     "3",
     "3",
     "2"
    ]
   ]
  },
  "m4.distinct_counts.postgres": {
   "cols": [
    "store_id",
    "orders",
    "with_customer",
    "different_customers"
   ],
   "rows": [
    [
     "1",
     "5",
     "5",
     "2"
    ],
    [
     "2",
     "3",
     "2",
     "1"
    ],
    [
     "3",
     "1",
     "1",
     "1"
    ],
    [
     "4",
     "3",
     "3",
     "2"
    ]
   ]
  },
  "m4.distinct_counts.sqlite": {
   "cols": [
    "store_id",
    "orders",
    "with_customer",
    "different_customers"
   ],
   "rows": [
    [
     "1",
     "5",
     "5",
     "2"
    ],
    [
     "2",
     "3",
     "2",
     "1"
    ],
    [
     "3",
     "1",
     "1",
     "1"
    ],
    [
     "4",
     "3",
     "3",
     "2"
    ]
   ]
  },
  "m4.empty_sum.duckdb": {
   "cols": [
    "sum_of_nothing",
    "rows",
    "sum_or_zero"
   ],
   "rows": [
    [
     "NULL",
     "0",
     "0.00"
    ]
   ]
  },
  "m4.empty_sum.postgres": {
   "cols": [
    "sum_of_nothing",
    "rows",
    "sum_or_zero"
   ],
   "rows": [
    [
     "NULL",
     "0",
     "0"
    ]
   ]
  },
  "m4.empty_sum.sqlite": {
   "cols": [
    "sum_of_nothing",
    "rows",
    "sum_or_zero"
   ],
   "rows": [
    [
     "NULL",
     "0",
     "0"
    ]
   ]
  },
  "m4.having": {
   "cols": [
    "store_id",
    "paid_orders",
    "revenue"
   ],
   "rows": [
    [
     "1",
     "5",
     "82.00"
    ],
    [
     "4",
     "2",
     "30.50"
    ]
   ]
  },
  "m4.median.duckdb": {
   "cols": [
    "average",
    "median",
    "p90"
   ],
   "rows": [
    [
     "14.11",
     "14.00",
     "20.40"
    ]
   ]
  },
  "m4.median.postgres": {
   "cols": [
    "average",
    "median",
    "p90"
   ],
   "rows": [
    [
     "14.11",
     "14.0",
     "20.400000000000002"
    ]
   ]
  },
  "m4.pivot.duckdb": {
   "cols": [
    "status",
    "web",
    "app",
    "store"
   ],
   "rows": [
    [
     "cancelled",
     "NULL",
     "9.00",
     "NULL"
    ],
    [
     "paid",
     "70.50",
     "28.50",
     "28.00"
    ],
    [
     "pending",
     "NULL",
     "8.00",
     "NULL"
    ],
    [
     "refunded",
     "12.00",
     "NULL",
     "NULL"
    ]
   ]
  },
  "m4.pivot.postgres": {
   "cols": [
    "status",
    "web",
    "app",
    "store"
   ],
   "rows": [
    [
     "cancelled",
     "NULL",
     "9.00",
     "NULL"
    ],
    [
     "paid",
     "70.50",
     "28.50",
     "28.00"
    ],
    [
     "pending",
     "NULL",
     "8.00",
     "NULL"
    ],
    [
     "refunded",
     "12.00",
     "NULL",
     "NULL"
    ]
   ]
  },
  "m4.pivot.sqlite": {
   "cols": [
    "status",
    "web",
    "app",
    "store"
   ],
   "rows": [
    [
     "cancelled",
     "NULL",
     "9",
     "NULL"
    ],
    [
     "paid",
     "70.5",
     "28.5",
     "28.0"
    ],
    [
     "pending",
     "NULL",
     "8",
     "NULL"
    ],
    [
     "refunded",
     "12",
     "NULL",
     "NULL"
    ]
   ]
  },
  "m4.set.0": {
   "cols": [
    "store_id",
    "orders",
    "revenue"
   ],
   "rows": [
    [
     "1",
     "5",
     "82.00"
    ],
    [
     "2",
     "2",
     "14.50"
    ],
    [
     "4",
     "2",
     "30.50"
    ]
   ]
  },
  "m4.set.1": {
   "cols": [
    "channel",
    "orders",
    "revenue"
   ],
   "rows": [
    [
     "app",
     "3",
     "28.50"
    ],
    [
     "store",
     "2",
     "28.00"
    ],
    [
     "web",
     "4",
     "70.50"
    ]
   ]
  },
  "m4.set.2": {
   "cols": [
    "store_id",
    "channel",
    "orders",
    "revenue"
   ],
   "rows": [
    [
     "1",
     "app",
     "1",
     "7.00"
    ],
    [
     "1",
     "store",
     "1",
     "18.50"
    ],
    [
     "1",
     "web",
     "3",
     "56.50"
    ],
    [
     "2",
     "app",
     "1",
     "5.00"
    ],
    [
     "2",
     "store",
     "1",
     "9.50"
    ],
    [
     "4",
     "app",
     "1",
     "16.50"
    ],
    [
     "4",
     "web",
     "1",
     "14.00"
    ]
   ]
  },
  "m4.set.3": {
   "cols": [
    "store_id",
    "channel",
    "g_store",
    "g_channel",
    "orders",
    "revenue"
   ],
   "rows": [
    [
     "1",
     "app",
     "0",
     "0",
     "1",
     "7.00"
    ],
    [
     "1",
     "store",
     "0",
     "0",
     "1",
     "18.50"
    ],
    [
     "1",
     "web",
     "0",
     "0",
     "3",
     "56.50"
    ],
    [
     "1",
     "NULL",
     "0",
     "1",
     "5",
     "82.00"
    ],
    [
     "2",
     "app",
     "0",
     "0",
     "1",
     "5.00"
    ],
    [
     "2",
     "store",
     "0",
     "0",
     "1",
     "9.50"
    ],
    [
     "2",
     "NULL",
     "0",
     "1",
     "2",
     "14.50"
    ],
    [
     "4",
     "app",
     "0",
     "0",
     "1",
     "16.50"
    ],
    [
     "4",
     "web",
     "0",
     "0",
     "1",
     "14.00"
    ],
    [
     "4",
     "NULL",
     "0",
     "1",
     "2",
     "30.50"
    ],
    [
     "NULL",
     "NULL",
     "1",
     "1",
     "9",
     "127.00"
    ]
   ]
  },
  "m4.set.4": {
   "cols": [
    "channel",
    "store_id",
    "g_channel",
    "g_store",
    "orders",
    "revenue"
   ],
   "rows": [
    [
     "app",
     "1",
     "0",
     "0",
     "1",
     "7.00"
    ],
    [
     "app",
     "2",
     "0",
     "0",
     "1",
     "5.00"
    ],
    [
     "app",
     "4",
     "0",
     "0",
     "1",
     "16.50"
    ],
    [
     "app",
     "NULL",
     "0",
     "1",
     "3",
     "28.50"
    ],
    [
     "store",
     "1",
     "0",
     "0",
     "1",
     "18.50"
    ],
    [
     "store",
     "2",
     "0",
     "0",
     "1",
     "9.50"
    ],
    [
     "store",
     "NULL",
     "0",
     "1",
     "2",
     "28.00"
    ],
    [
     "web",
     "1",
     "0",
     "0",
     "3",
     "56.50"
    ],
    [
     "web",
     "4",
     "0",
     "0",
     "1",
     "14.00"
    ],
    [
     "web",
     "NULL",
     "0",
     "1",
     "4",
     "70.50"
    ],
    [
     "NULL",
     "NULL",
     "1",
     "1",
     "9",
     "127.00"
    ]
   ]
  },
  "m4.set.5": {
   "cols": [
    "store_id",
    "channel",
    "g_store",
    "g_channel",
    "orders",
    "revenue"
   ],
   "rows": [
    [
     "1",
     "app",
     "0",
     "0",
     "1",
     "7.00"
    ],
    [
     "1",
     "store",
     "0",
     "0",
     "1",
     "18.50"
    ],
    [
     "1",
     "web",
     "0",
     "0",
     "3",
     "56.50"
    ],
    [
     "1",
     "NULL",
     "0",
     "1",
     "5",
     "82.00"
    ],
    [
     "2",
     "app",
     "0",
     "0",
     "1",
     "5.00"
    ],
    [
     "2",
     "store",
     "0",
     "0",
     "1",
     "9.50"
    ],
    [
     "2",
     "NULL",
     "0",
     "1",
     "2",
     "14.50"
    ],
    [
     "4",
     "app",
     "0",
     "0",
     "1",
     "16.50"
    ],
    [
     "4",
     "web",
     "0",
     "0",
     "1",
     "14.00"
    ],
    [
     "4",
     "NULL",
     "0",
     "1",
     "2",
     "30.50"
    ],
    [
     "NULL",
     "app",
     "1",
     "0",
     "3",
     "28.50"
    ],
    [
     "NULL",
     "store",
     "1",
     "0",
     "2",
     "28.00"
    ],
    [
     "NULL",
     "web",
     "1",
     "0",
     "4",
     "70.50"
    ],
    [
     "NULL",
     "NULL",
     "1",
     "1",
     "9",
     "127.00"
    ]
   ]
  },
  "m4.set.6": {
   "cols": [
    "store_id",
    "channel",
    "g_store",
    "g_channel",
    "orders",
    "revenue"
   ],
   "rows": [
    [
     "1",
     "NULL",
     "0",
     "1",
     "5",
     "82.00"
    ],
    [
     "2",
     "NULL",
     "0",
     "1",
     "2",
     "14.50"
    ],
    [
     "4",
     "NULL",
     "0",
     "1",
     "2",
     "30.50"
    ],
    [
     "NULL",
     "app",
     "1",
     "0",
     "3",
     "28.50"
    ],
    [
     "NULL",
     "store",
     "1",
     "0",
     "2",
     "28.00"
    ],
    [
     "NULL",
     "web",
     "1",
     "0",
     "4",
     "70.50"
    ],
    [
     "NULL",
     "NULL",
     "1",
     "1",
     "9",
     "127.00"
    ]
   ]
  },
  "m4.string_agg.duckdb": {
   "cols": [
    "country",
    "customers",
    "names"
   ],
   "rows": [
    [
     "AU",
     "2",
     "Eli Cohen, Gus Hall"
    ],
    [
     "ID",
     "1",
     "Dara Putri"
    ],
    [
     "MY",
     "1",
     "Ben Ortiz"
    ],
    [
     "SG",
     "3",
     "Ana Lim, Chen Wei, Hana Ito"
    ],
    [
     "NULL",
     "1",
     "Fay Tan"
    ]
   ]
  },
  "m4.string_agg.postgres": {
   "cols": [
    "country",
    "customers",
    "names"
   ],
   "rows": [
    [
     "AU",
     "2",
     "Eli Cohen, Gus Hall"
    ],
    [
     "ID",
     "1",
     "Dara Putri"
    ],
    [
     "MY",
     "1",
     "Ben Ortiz"
    ],
    [
     "SG",
     "3",
     "Ana Lim, Chen Wei, Hana Ito"
    ],
    [
     "NULL",
     "1",
     "Fay Tan"
    ]
   ]
  },
  "m4.string_agg.sqlite": {
   "cols": [
    "country",
    "customers",
    "names"
   ],
   "rows": [
    [
     "AU",
     "2",
     "Eli Cohen, Gus Hall"
    ],
    [
     "ID",
     "1",
     "Dara Putri"
    ],
    [
     "MY",
     "1",
     "Ben Ortiz"
    ],
    [
     "SG",
     "3",
     "Ana Lim, Chen Wei, Hana Ito"
    ],
    [
     "NULL",
     "1",
     "Fay Tan"
    ]
   ]
  }
 },
 "text": {
  "m1.alias_where.postgres.error": "column \"doubled\" does not exist",
  "m1.plan.duckdb": "TOP_N   (3 revenue DESC, rows 2)\n  FILTER (sum(total) > 10.00)   (rows 2)\n    HASH_GROUP_BY   (groups: #0, aggregates: sum(#1), count_star(), rows 3)\n      HASH_JOIN INNER   (customer_id = customer_id, rows 8)\n        SCAN customers   (filter: (customer_id <= 7), scanned 4, rows 4)\n        SCAN orders   (filter: (status = 'paid'), scanned 12, rows 9)",
  "m1.plan.postgres": "Limit  (cost=2.51..2.51 rows=1 width=75) (actual rows=2 loops=1)\n  ->  Sort  (cost=2.51..2.51 rows=1 width=75) (actual rows=2 loops=1)\n        Sort Key: (sum(o.total)) DESC\n        Sort Method: quicksort  Memory: 25kB\n        ->  HashAggregate  (cost=2.42..2.50 rows=1 width=75) (actual rows=2 loops=1)\n              Group Key: c.country\n              Filter: (sum(o.total) > '10'::numeric)\n              Batches: 1  Memory Usage: 24kB\n              Rows Removed by Filter: 1\n              ->  Hash Join  (cost=1.18..2.36 rows=8 width=8) (actual rows=8 loops=1)\n                    Hash Cond: (o.customer_id = c.customer_id)\n                    ->  Seq Scan on orders o  (cost=0.00..1.15 rows=9 width=9) (actual rows=9 loops=1)\n                          Filter: ((status)::text = 'paid'::text)\n                          Rows Removed by Filter: 3\n                    ->  Hash  (cost=1.08..1.08 rows=8 width=7) (actual rows=8 loops=1)\n                          Buckets: 1024  Batches: 1  Memory Usage: 9kB\n                          ->  Seq Scan on customers c  (cost=0.00..1.08 rows=8 width=7) (actual rows=8 loops=1)",
  "m1.plan.sqlite": "QUERY PLAN\n|--SCAN o\n|--SEARCH c USING INTEGER PRIMARY KEY (rowid=?)\n|--USE TEMP B-TREE FOR GROUP BY\n`--USE TEMP B-TREE FOR ORDER BY",
  "m1.psql": " country | customers \n---------+-----------\n AU      |         2\n ID      |         1\n MY      |         1\n SG      |         3\n         |         1\n(5 rows)",
  "m1.psql.command": "psql brewline -c \"SELECT country, count(*) AS customers FROM customers GROUP BY country ORDER BY country NULLS LAST;\"",
  "m1.where_vs_having_error.error": "aggregate functions are not allowed in WHERE",
  "m2.div_zero.postgres.error": "division by zero",
  "m4.bare_column.duckdb.error": "Binder Error: column \"channel\" must appear in the GROUP BY clause or must be part of an aggregate function.",
  "m4.bare_column.postgres.error": "column \"orders.channel\" must appear in the GROUP BY clause or be used in an aggregate function",
  "m4.rollup_sqlite.error": "no such function: ROLLUP"
 }
};
