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
  },
  "m6.frames": {
   "combos": {
    "GROUPS|CURRENT ROW|CURRENT ROW": {
     "frame": "GROUPS BETWEEN CURRENT ROW AND CURRENT ROW",
     "rows": [
      [
       "20",
       "20",
       1
      ],
      [
       "25",
       "25",
       1
      ],
      [
       "30",
       "30",
       1
      ],
      [
       "35",
       "35",
       1
      ],
      [
       "40",
       "40",
       1
      ],
      [
       "45",
       "45",
       1
      ],
      [
       "50",
       "100",
       2
      ],
      [
       "50",
       "100",
       2
      ],
      [
       "55",
       "55",
       1
      ],
      [
       "60",
       "60",
       1
      ]
     ]
    },
    "GROUPS|CURRENT ROW|N FOLLOWING": {
     "frame": "GROUPS BETWEEN CURRENT ROW AND 1 FOLLOWING",
     "rows": [
      [
       "20",
       "45",
       2
      ],
      [
       "25",
       "55",
       2
      ],
      [
       "30",
       "65",
       2
      ],
      [
       "35",
       "75",
       2
      ],
      [
       "40",
       "85",
       2
      ],
      [
       "45",
       "145",
       3
      ],
      [
       "50",
       "155",
       3
      ],
      [
       "50",
       "155",
       3
      ],
      [
       "55",
       "115",
       2
      ],
      [
       "60",
       "60",
       1
      ]
     ]
    },
    "GROUPS|CURRENT ROW|UNBOUNDED FOLLOWING": {
     "frame": "GROUPS BETWEEN CURRENT ROW AND UNBOUNDED FOLLOWING",
     "rows": [
      [
       "20",
       "410",
       10
      ],
      [
       "25",
       "390",
       9
      ],
      [
       "30",
       "365",
       8
      ],
      [
       "35",
       "335",
       7
      ],
      [
       "40",
       "300",
       6
      ],
      [
       "45",
       "260",
       5
      ],
      [
       "50",
       "215",
       4
      ],
      [
       "50",
       "215",
       4
      ],
      [
       "55",
       "115",
       2
      ],
      [
       "60",
       "60",
       1
      ]
     ]
    },
    "GROUPS|N PRECEDING|CURRENT ROW": {
     "frame": "GROUPS BETWEEN 1 PRECEDING AND CURRENT ROW",
     "rows": [
      [
       "20",
       "20",
       1
      ],
      [
       "25",
       "45",
       2
      ],
      [
       "30",
       "55",
       2
      ],
      [
       "35",
       "65",
       2
      ],
      [
       "40",
       "75",
       2
      ],
      [
       "45",
       "85",
       2
      ],
      [
       "50",
       "145",
       3
      ],
      [
       "50",
       "145",
       3
      ],
      [
       "55",
       "155",
       3
      ],
      [
       "60",
       "115",
       2
      ]
     ]
    },
    "GROUPS|N PRECEDING|N FOLLOWING": {
     "frame": "GROUPS BETWEEN 1 PRECEDING AND 1 FOLLOWING",
     "rows": [
      [
       "20",
       "45",
       2
      ],
      [
       "25",
       "75",
       3
      ],
      [
       "30",
       "90",
       3
      ],
      [
       "35",
       "105",
       3
      ],
      [
       "40",
       "120",
       3
      ],
      [
       "45",
       "185",
       4
      ],
      [
       "50",
       "200",
       4
      ],
      [
       "50",
       "200",
       4
      ],
      [
       "55",
       "215",
       4
      ],
      [
       "60",
       "115",
       2
      ]
     ]
    },
    "GROUPS|N PRECEDING|UNBOUNDED FOLLOWING": {
     "frame": "GROUPS BETWEEN 1 PRECEDING AND UNBOUNDED FOLLOWING",
     "rows": [
      [
       "20",
       "410",
       10
      ],
      [
       "25",
       "410",
       10
      ],
      [
       "30",
       "390",
       9
      ],
      [
       "35",
       "365",
       8
      ],
      [
       "40",
       "335",
       7
      ],
      [
       "45",
       "300",
       6
      ],
      [
       "50",
       "260",
       5
      ],
      [
       "50",
       "260",
       5
      ],
      [
       "55",
       "215",
       4
      ],
      [
       "60",
       "115",
       2
      ]
     ]
    },
    "GROUPS|UNBOUNDED PRECEDING|CURRENT ROW": {
     "frame": "GROUPS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW",
     "rows": [
      [
       "20",
       "20",
       1
      ],
      [
       "25",
       "45",
       2
      ],
      [
       "30",
       "75",
       3
      ],
      [
       "35",
       "110",
       4
      ],
      [
       "40",
       "150",
       5
      ],
      [
       "45",
       "195",
       6
      ],
      [
       "50",
       "295",
       8
      ],
      [
       "50",
       "295",
       8
      ],
      [
       "55",
       "350",
       9
      ],
      [
       "60",
       "410",
       10
      ]
     ]
    },
    "GROUPS|UNBOUNDED PRECEDING|N FOLLOWING": {
     "frame": "GROUPS BETWEEN UNBOUNDED PRECEDING AND 1 FOLLOWING",
     "rows": [
      [
       "20",
       "45",
       2
      ],
      [
       "25",
       "75",
       3
      ],
      [
       "30",
       "110",
       4
      ],
      [
       "35",
       "150",
       5
      ],
      [
       "40",
       "195",
       6
      ],
      [
       "45",
       "295",
       8
      ],
      [
       "50",
       "350",
       9
      ],
      [
       "50",
       "350",
       9
      ],
      [
       "55",
       "410",
       10
      ],
      [
       "60",
       "410",
       10
      ]
     ]
    },
    "GROUPS|UNBOUNDED PRECEDING|UNBOUNDED FOLLOWING": {
     "frame": "GROUPS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING",
     "rows": [
      [
       "20",
       "410",
       10
      ],
      [
       "25",
       "410",
       10
      ],
      [
       "30",
       "410",
       10
      ],
      [
       "35",
       "410",
       10
      ],
      [
       "40",
       "410",
       10
      ],
      [
       "45",
       "410",
       10
      ],
      [
       "50",
       "410",
       10
      ],
      [
       "50",
       "410",
       10
      ],
      [
       "55",
       "410",
       10
      ],
      [
       "60",
       "410",
       10
      ]
     ]
    },
    "RANGE|CURRENT ROW|CURRENT ROW": {
     "frame": "RANGE BETWEEN CURRENT ROW AND CURRENT ROW",
     "rows": [
      [
       "20",
       "20",
       1
      ],
      [
       "25",
       "25",
       1
      ],
      [
       "30",
       "30",
       1
      ],
      [
       "35",
       "35",
       1
      ],
      [
       "40",
       "40",
       1
      ],
      [
       "45",
       "45",
       1
      ],
      [
       "50",
       "100",
       2
      ],
      [
       "50",
       "100",
       2
      ],
      [
       "55",
       "55",
       1
      ],
      [
       "60",
       "60",
       1
      ]
     ]
    },
    "RANGE|CURRENT ROW|N FOLLOWING": {
     "frame": "RANGE BETWEEN CURRENT ROW AND 10 FOLLOWING",
     "rows": [
      [
       "20",
       "75",
       3
      ],
      [
       "25",
       "90",
       3
      ],
      [
       "30",
       "105",
       3
      ],
      [
       "35",
       "120",
       3
      ],
      [
       "40",
       "185",
       4
      ],
      [
       "45",
       "200",
       4
      ],
      [
       "50",
       "215",
       4
      ],
      [
       "50",
       "215",
       4
      ],
      [
       "55",
       "115",
       2
      ],
      [
       "60",
       "60",
       1
      ]
     ]
    },
    "RANGE|CURRENT ROW|UNBOUNDED FOLLOWING": {
     "frame": "RANGE BETWEEN CURRENT ROW AND UNBOUNDED FOLLOWING",
     "rows": [
      [
       "20",
       "410",
       10
      ],
      [
       "25",
       "390",
       9
      ],
      [
       "30",
       "365",
       8
      ],
      [
       "35",
       "335",
       7
      ],
      [
       "40",
       "300",
       6
      ],
      [
       "45",
       "260",
       5
      ],
      [
       "50",
       "215",
       4
      ],
      [
       "50",
       "215",
       4
      ],
      [
       "55",
       "115",
       2
      ],
      [
       "60",
       "60",
       1
      ]
     ]
    },
    "RANGE|N PRECEDING|CURRENT ROW": {
     "frame": "RANGE BETWEEN 10 PRECEDING AND CURRENT ROW",
     "rows": [
      [
       "20",
       "20",
       1
      ],
      [
       "25",
       "45",
       2
      ],
      [
       "30",
       "75",
       3
      ],
      [
       "35",
       "90",
       3
      ],
      [
       "40",
       "105",
       3
      ],
      [
       "45",
       "120",
       3
      ],
      [
       "50",
       "185",
       4
      ],
      [
       "50",
       "185",
       4
      ],
      [
       "55",
       "200",
       4
      ],
      [
       "60",
       "215",
       4
      ]
     ]
    },
    "RANGE|N PRECEDING|N FOLLOWING": {
     "frame": "RANGE BETWEEN 10 PRECEDING AND 10 FOLLOWING",
     "rows": [
      [
       "20",
       "75",
       3
      ],
      [
       "25",
       "110",
       4
      ],
      [
       "30",
       "150",
       5
      ],
      [
       "35",
       "175",
       5
      ],
      [
       "40",
       "250",
       6
      ],
      [
       "45",
       "275",
       6
      ],
      [
       "50",
       "300",
       6
      ],
      [
       "50",
       "300",
       6
      ],
      [
       "55",
       "260",
       5
      ],
      [
       "60",
       "215",
       4
      ]
     ]
    },
    "RANGE|N PRECEDING|UNBOUNDED FOLLOWING": {
     "frame": "RANGE BETWEEN 10 PRECEDING AND UNBOUNDED FOLLOWING",
     "rows": [
      [
       "20",
       "410",
       10
      ],
      [
       "25",
       "410",
       10
      ],
      [
       "30",
       "410",
       10
      ],
      [
       "35",
       "390",
       9
      ],
      [
       "40",
       "365",
       8
      ],
      [
       "45",
       "335",
       7
      ],
      [
       "50",
       "300",
       6
      ],
      [
       "50",
       "300",
       6
      ],
      [
       "55",
       "260",
       5
      ],
      [
       "60",
       "215",
       4
      ]
     ]
    },
    "RANGE|UNBOUNDED PRECEDING|CURRENT ROW": {
     "frame": "RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW",
     "rows": [
      [
       "20",
       "20",
       1
      ],
      [
       "25",
       "45",
       2
      ],
      [
       "30",
       "75",
       3
      ],
      [
       "35",
       "110",
       4
      ],
      [
       "40",
       "150",
       5
      ],
      [
       "45",
       "195",
       6
      ],
      [
       "50",
       "295",
       8
      ],
      [
       "50",
       "295",
       8
      ],
      [
       "55",
       "350",
       9
      ],
      [
       "60",
       "410",
       10
      ]
     ]
    },
    "RANGE|UNBOUNDED PRECEDING|N FOLLOWING": {
     "frame": "RANGE BETWEEN UNBOUNDED PRECEDING AND 10 FOLLOWING",
     "rows": [
      [
       "20",
       "75",
       3
      ],
      [
       "25",
       "110",
       4
      ],
      [
       "30",
       "150",
       5
      ],
      [
       "35",
       "195",
       6
      ],
      [
       "40",
       "295",
       8
      ],
      [
       "45",
       "350",
       9
      ],
      [
       "50",
       "410",
       10
      ],
      [
       "50",
       "410",
       10
      ],
      [
       "55",
       "410",
       10
      ],
      [
       "60",
       "410",
       10
      ]
     ]
    },
    "RANGE|UNBOUNDED PRECEDING|UNBOUNDED FOLLOWING": {
     "frame": "RANGE BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING",
     "rows": [
      [
       "20",
       "410",
       10
      ],
      [
       "25",
       "410",
       10
      ],
      [
       "30",
       "410",
       10
      ],
      [
       "35",
       "410",
       10
      ],
      [
       "40",
       "410",
       10
      ],
      [
       "45",
       "410",
       10
      ],
      [
       "50",
       "410",
       10
      ],
      [
       "50",
       "410",
       10
      ],
      [
       "55",
       "410",
       10
      ],
      [
       "60",
       "410",
       10
      ]
     ]
    },
    "ROWS|CURRENT ROW|CURRENT ROW": {
     "frame": "ROWS BETWEEN CURRENT ROW AND CURRENT ROW",
     "rows": [
      [
       "20",
       "20",
       1
      ],
      [
       "25",
       "25",
       1
      ],
      [
       "30",
       "30",
       1
      ],
      [
       "35",
       "35",
       1
      ],
      [
       "40",
       "40",
       1
      ],
      [
       "45",
       "45",
       1
      ],
      [
       "50",
       "50",
       1
      ],
      [
       "50",
       "50",
       1
      ],
      [
       "55",
       "55",
       1
      ],
      [
       "60",
       "60",
       1
      ]
     ]
    },
    "ROWS|CURRENT ROW|N FOLLOWING": {
     "frame": "ROWS BETWEEN CURRENT ROW AND 1 FOLLOWING",
     "rows": [
      [
       "20",
       "45",
       2
      ],
      [
       "25",
       "55",
       2
      ],
      [
       "30",
       "65",
       2
      ],
      [
       "35",
       "75",
       2
      ],
      [
       "40",
       "85",
       2
      ],
      [
       "45",
       "95",
       2
      ],
      [
       "50",
       "100",
       2
      ],
      [
       "50",
       "105",
       2
      ],
      [
       "55",
       "115",
       2
      ],
      [
       "60",
       "60",
       1
      ]
     ]
    },
    "ROWS|CURRENT ROW|UNBOUNDED FOLLOWING": {
     "frame": "ROWS BETWEEN CURRENT ROW AND UNBOUNDED FOLLOWING",
     "rows": [
      [
       "20",
       "410",
       10
      ],
      [
       "25",
       "390",
       9
      ],
      [
       "30",
       "365",
       8
      ],
      [
       "35",
       "335",
       7
      ],
      [
       "40",
       "300",
       6
      ],
      [
       "45",
       "260",
       5
      ],
      [
       "50",
       "165",
       3
      ],
      [
       "50",
       "215",
       4
      ],
      [
       "55",
       "115",
       2
      ],
      [
       "60",
       "60",
       1
      ]
     ]
    },
    "ROWS|N PRECEDING|CURRENT ROW": {
     "frame": "ROWS BETWEEN 1 PRECEDING AND CURRENT ROW",
     "rows": [
      [
       "20",
       "20",
       1
      ],
      [
       "25",
       "45",
       2
      ],
      [
       "30",
       "55",
       2
      ],
      [
       "35",
       "65",
       2
      ],
      [
       "40",
       "75",
       2
      ],
      [
       "45",
       "85",
       2
      ],
      [
       "50",
       "95",
       2
      ],
      [
       "50",
       "100",
       2
      ],
      [
       "55",
       "105",
       2
      ],
      [
       "60",
       "115",
       2
      ]
     ]
    },
    "ROWS|N PRECEDING|N FOLLOWING": {
     "frame": "ROWS BETWEEN 1 PRECEDING AND 1 FOLLOWING",
     "rows": [
      [
       "20",
       "45",
       2
      ],
      [
       "25",
       "75",
       3
      ],
      [
       "30",
       "90",
       3
      ],
      [
       "35",
       "105",
       3
      ],
      [
       "40",
       "120",
       3
      ],
      [
       "45",
       "135",
       3
      ],
      [
       "50",
       "145",
       3
      ],
      [
       "50",
       "155",
       3
      ],
      [
       "55",
       "165",
       3
      ],
      [
       "60",
       "115",
       2
      ]
     ]
    },
    "ROWS|N PRECEDING|UNBOUNDED FOLLOWING": {
     "frame": "ROWS BETWEEN 1 PRECEDING AND UNBOUNDED FOLLOWING",
     "rows": [
      [
       "20",
       "410",
       10
      ],
      [
       "25",
       "410",
       10
      ],
      [
       "30",
       "390",
       9
      ],
      [
       "35",
       "365",
       8
      ],
      [
       "40",
       "335",
       7
      ],
      [
       "45",
       "300",
       6
      ],
      [
       "50",
       "215",
       4
      ],
      [
       "50",
       "260",
       5
      ],
      [
       "55",
       "165",
       3
      ],
      [
       "60",
       "115",
       2
      ]
     ]
    },
    "ROWS|UNBOUNDED PRECEDING|CURRENT ROW": {
     "frame": "ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW",
     "rows": [
      [
       "20",
       "20",
       1
      ],
      [
       "25",
       "45",
       2
      ],
      [
       "30",
       "75",
       3
      ],
      [
       "35",
       "110",
       4
      ],
      [
       "40",
       "150",
       5
      ],
      [
       "45",
       "195",
       6
      ],
      [
       "50",
       "245",
       7
      ],
      [
       "50",
       "295",
       8
      ],
      [
       "55",
       "350",
       9
      ],
      [
       "60",
       "410",
       10
      ]
     ]
    },
    "ROWS|UNBOUNDED PRECEDING|N FOLLOWING": {
     "frame": "ROWS BETWEEN UNBOUNDED PRECEDING AND 1 FOLLOWING",
     "rows": [
      [
       "20",
       "45",
       2
      ],
      [
       "25",
       "75",
       3
      ],
      [
       "30",
       "110",
       4
      ],
      [
       "35",
       "150",
       5
      ],
      [
       "40",
       "195",
       6
      ],
      [
       "45",
       "245",
       7
      ],
      [
       "50",
       "295",
       8
      ],
      [
       "50",
       "350",
       9
      ],
      [
       "55",
       "410",
       10
      ],
      [
       "60",
       "410",
       10
      ]
     ]
    },
    "ROWS|UNBOUNDED PRECEDING|UNBOUNDED FOLLOWING": {
     "frame": "ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING",
     "rows": [
      [
       "20",
       "410",
       10
      ],
      [
       "25",
       "410",
       10
      ],
      [
       "30",
       "410",
       10
      ],
      [
       "35",
       "410",
       10
      ],
      [
       "40",
       "410",
       10
      ],
      [
       "45",
       "410",
       10
      ],
      [
       "50",
       "410",
       10
      ],
      [
       "50",
       "410",
       10
      ],
      [
       "55",
       "410",
       10
      ],
      [
       "60",
       "410",
       10
      ]
     ]
    }
   },
   "engines": [
    "duckdb",
    "postgres",
    "sqlite"
   ],
   "query": "SELECT revenue,\n       sum(revenue) OVER (ORDER BY revenue <frame>) AS s,\n       count(*) OVER (ORDER BY revenue <frame>) AS n\nFROM daily_revenue",
   "range_n": 10,
   "revenues": [
    "20.00",
    "25.00",
    "30.00",
    "35.00",
    "40.00",
    "45.00",
    "50.00",
    "50.00",
    "55.00",
    "60.00"
   ],
   "row_n": 1
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
  "m4.string_agg": "SELECT country, count(*) AS customers, string_agg(name, ', ' ORDER BY name) AS names\nFROM customers\nGROUP BY country\nORDER BY country NULLS LAST;\n",
  "m5.calendar": "WITH RECURSIVE days(day) AS (\n  SELECT DATE '2026-03-01'\n  UNION ALL\n  SELECT day + 1 FROM days WHERE day < DATE '2026-03-10'\n)\nSELECT d.day, count(o.order_id) AS orders\nFROM days AS d\nLEFT JOIN orders AS o ON CAST(o.order_ts AS DATE) = d.day\nGROUP BY d.day\nORDER BY d.day;\n",
  "m5.calendar_sqlite": "WITH RECURSIVE days(day) AS (\n  SELECT '2026-03-01'\n  UNION ALL\n  SELECT date(day, '+1 day') FROM days WHERE day < '2026-03-10'\n)\nSELECT d.day, count(o.order_id) AS orders\nFROM days AS d\nLEFT JOIN orders AS o ON date(o.order_ts) = d.day\nGROUP BY d.day\nORDER BY d.day;\n",
  "m5.ch_second": "SELECT max(total) AS second_highest\nFROM orders\nWHERE status = 'paid'\n  AND total < (SELECT max(total) FROM orders WHERE status = 'paid');\n",
  "m5.ch_storeavg": "SELECT o.order_id, o.store_id, o.total\nFROM orders AS o\nWHERE o.status = 'paid'\n  AND o.total > (\n    SELECT avg(i.total)\n    FROM orders AS i\n    WHERE i.status = 'paid' AND i.store_id = o.store_id\n  )\nORDER BY o.order_id;\n",
  "m5.ch_subtree": "WITH RECURSIVE sub AS (\n  SELECT category_id, name, 0 AS depth\n  FROM categories\n  WHERE name = 'Drinks'\n  UNION ALL\n  SELECT c.category_id, c.name, s.depth + 1\n  FROM categories AS c\n  JOIN sub AS s ON c.parent_id = s.category_id\n)\nSELECT category_id, name, depth\nFROM sub\nORDER BY depth, category_id;\n",
  "m5.correlated": "SELECT c.customer_id,\n       c.name,\n       (SELECT max(o.total) FROM orders AS o WHERE o.customer_id = c.customer_id) AS biggest_order\nFROM customers AS c\nORDER BY c.customer_id;\n",
  "m5.cte": "WITH paid AS (\n  SELECT order_id, customer_id, total\n  FROM orders\n  WHERE status = 'paid' AND customer_id IS NOT NULL\n),\nper_customer AS (\n  SELECT customer_id, count(*) AS orders, sum(total) AS spent\n  FROM paid\n  GROUP BY customer_id\n)\nSELECT c.name, p.orders, p.spent\nFROM per_customer AS p\nJOIN customers AS c ON c.customer_id = p.customer_id\nWHERE p.spent > 30\nORDER BY p.spent DESC;\n",
  "m5.cte_reuse": "WITH per_store AS (\n  SELECT store_id, sum(total) AS revenue\n  FROM orders\n  WHERE status = 'paid'\n  GROUP BY store_id\n)\nSELECT store_id,\n       revenue,\n       round(100.0 * revenue / (SELECT sum(revenue) FROM per_store), 1) AS share_percent\nFROM per_store\nORDER BY revenue DESC;\n",
  "m5.cycle_union": "UPDATE categories SET parent_id = 9 WHERE category_id = 1;\nWITH RECURSIVE walk(category_id) AS (\n  SELECT 1\n  UNION\n  SELECT c.category_id\n  FROM categories AS c\n  JOIN walk AS w ON c.parent_id = w.category_id\n)\nSELECT count(*) AS categories_reached FROM walk;\n",
  "m5.cycle_union_all": "UPDATE categories SET parent_id = 9 WHERE category_id = 1;\nWITH RECURSIVE walk(category_id, depth) AS (\n  SELECT 1, 0\n  UNION ALL\n  SELECT c.category_id, w.depth + 1\n  FROM categories AS c\n  JOIN walk AS w ON c.parent_id = w.category_id\n  WHERE w.depth < 20\n)\nSELECT count(*) AS rows_produced, max(depth) AS deepest FROM walk;\n",
  "m5.derived": "SELECT customer_id, spent\nFROM (\n  SELECT customer_id, sum(total) AS spent\n  FROM orders\n  WHERE status = 'paid' AND customer_id IS NOT NULL\n  GROUP BY customer_id\n) AS per_customer\nWHERE spent > 30\nORDER BY spent DESC;\n",
  "m5.exists": "SELECT c.customer_id, c.name\nFROM customers AS c\nWHERE EXISTS (\n  SELECT 1\n  FROM orders AS o\n  WHERE o.customer_id = c.customer_id AND o.status = 'refunded'\n);\n",
  "m5.in_join": "SELECT c.customer_id, c.name\nFROM customers AS c\nJOIN orders AS o ON o.customer_id = c.customer_id\nWHERE o.store_id = 1\nORDER BY c.customer_id, o.order_id;\n",
  "m5.in_subquery": "SELECT customer_id, name\nFROM customers\nWHERE customer_id IN (SELECT customer_id FROM orders WHERE store_id = 1)\nORDER BY customer_id;\n",
  "m5.plan.corr": "SELECT c.customer_id,\n       (SELECT max(o.total) FROM big_orders AS o WHERE o.customer_id = c.customer_id) AS biggest\nFROM big_customers AS c\n",
  "m5.plan.exists": "SELECT c.customer_id\nFROM big_customers AS c\nWHERE EXISTS (SELECT 1 FROM big_orders AS o WHERE o.customer_id = c.customer_id AND o.status = 'refunded')\n",
  "m5.plan.materialized": "WITH o AS MATERIALIZED (SELECT * FROM big_orders) SELECT * FROM o WHERE order_id = 12345\n",
  "m5.plan.once": "WITH o AS (SELECT * FROM big_orders) SELECT * FROM o WHERE order_id = 12345\n",
  "m5.plan.twice": "WITH s AS (SELECT store_id, sum(total) AS revenue FROM big_orders WHERE status = 'paid' GROUP BY store_id)\nSELECT a.store_id, a.revenue, round(100.0 * a.revenue / (SELECT sum(revenue) FROM s), 1) AS share FROM s AS a ORDER BY a.store_id\n",
  "m5.scalar": "SELECT order_id, total\nFROM orders\nWHERE status = 'paid'\n  AND total > (SELECT avg(total) FROM orders WHERE status = 'paid')\nORDER BY order_id;\n",
  "m5.scalar_many": "SELECT c.name,\n       (SELECT o.order_id FROM orders AS o WHERE o.customer_id = c.customer_id) AS order_id\nFROM customers AS c\nORDER BY c.customer_id;\n",
  "m5.series_duckdb": "SELECT CAST(d AS DATE) AS day, count(o.order_id) AS orders\nFROM range(DATE '2026-03-01', DATE '2026-03-11', INTERVAL 1 DAY) AS g(d)\nLEFT JOIN orders AS o ON CAST(o.order_ts AS DATE) = CAST(d AS DATE)\nGROUP BY CAST(d AS DATE)\nORDER BY CAST(d AS DATE);\n",
  "m5.series_postgres": "SELECT CAST(d AS DATE) AS day, count(o.order_id) AS orders\nFROM generate_series(DATE '2026-03-01', DATE '2026-03-10', INTERVAL '1 day') AS g(d)\nLEFT JOIN orders AS o ON CAST(o.order_ts AS DATE) = CAST(d AS DATE)\nGROUP BY CAST(d AS DATE)\nORDER BY CAST(d AS DATE);\n",
  "m5.tree": "WITH RECURSIVE tree AS (\n  SELECT category_id, name, 0 AS depth, name AS path\n  FROM categories\n  WHERE parent_id IS NULL\n  UNION ALL\n  SELECT c.category_id, c.name, t.depth + 1, t.path || ' > ' || c.name\n  FROM categories AS c\n  JOIN tree AS t ON c.parent_id = t.category_id\n)\nSELECT category_id, depth, path\nFROM tree\nORDER BY path;\n",
  "m5.tree_iterations": "WITH RECURSIVE tree AS (\n  SELECT category_id, name, 0 AS iteration\n  FROM categories\n  WHERE parent_id IS NULL\n  UNION ALL\n  SELECT c.category_id, c.name, t.iteration + 1\n  FROM categories AS c\n  JOIN tree AS t ON c.parent_id = t.category_id\n)\nSELECT iteration, category_id, name\nFROM tree\nORDER BY iteration, category_id;\n",
  "m5.view": "CREATE VIEW paid_orders AS\nSELECT order_id, customer_id, store_id, total\nFROM orders\nWHERE status = 'paid';\nSELECT count(*) AS paid_orders, sum(total) AS revenue FROM paid_orders;\n",
  "m6.ch_drop": "WITH d AS (\n  SELECT store_id, day, revenue,\n         LAG(revenue) OVER (PARTITION BY store_id ORDER BY day) AS prev_revenue\n  FROM daily_revenue\n)\nSELECT store_id, day, revenue, prev_revenue\nFROM d\nWHERE revenue < prev_revenue\nORDER BY store_id, day;\n",
  "m6.ch_share": "SELECT order_id, store_id, total,\n       round(100.0 * total / sum(total) OVER (PARTITION BY store_id), 1) AS store_share\nFROM orders\nWHERE status = 'paid'\nORDER BY order_id;\n",
  "m6.ch_third": "WITH r AS (\n  SELECT day, store_id, revenue, RANK() OVER (ORDER BY revenue DESC) AS rnk\n  FROM daily_revenue\n)\nSELECT day, store_id, revenue\nFROM r\nWHERE rnk = 3\nORDER BY store_id;\n",
  "m6.group_by": "SELECT store_id, sum(total) AS store_paid\nFROM orders\nWHERE status = 'paid'\nGROUP BY store_id\nORDER BY store_id;\n",
  "m6.lag": "SELECT store_id, day, revenue,\n       LAG(revenue) OVER (PARTITION BY store_id ORDER BY day) AS prev_revenue,\n       revenue - LAG(revenue) OVER (PARTITION BY store_id ORDER BY day) AS change,\n       LEAD(revenue, 1, 0) OVER (PARTITION BY store_id ORDER BY day) AS next_revenue\nFROM daily_revenue\nORDER BY store_id, day;\n",
  "m6.last_value": "SELECT store_id, day, revenue,\n       FIRST_VALUE(revenue) OVER (PARTITION BY store_id ORDER BY day) AS first_day,\n       LAST_VALUE(revenue) OVER (PARTITION BY store_id ORDER BY day) AS last_default,\n       LAST_VALUE(revenue) OVER (PARTITION BY store_id ORDER BY day\n                                 ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS last_full\nFROM daily_revenue\nORDER BY store_id, day;\n",
  "m6.moving": "SELECT store_id, day, revenue,\n       round(avg(revenue) OVER (PARTITION BY store_id ORDER BY day ROWS BETWEEN 2 PRECEDING AND CURRENT ROW), 2) AS avg_3_days,\n       count(*) OVER (PARTITION BY store_id ORDER BY day ROWS BETWEEN 2 PRECEDING AND CURRENT ROW) AS rows_in_frame\nFROM daily_revenue\nORDER BY store_id, day;\n",
  "m6.named_window": "SELECT store_id, day, revenue,\n       sum(revenue) OVER w AS running,\n       max(revenue) OVER w AS best_so_far\nFROM daily_revenue\nWINDOW w AS (PARTITION BY store_id ORDER BY day)\nORDER BY store_id, day;\n",
  "m6.ntile": "SELECT day, store_id, revenue,\n       NTILE(4) OVER (ORDER BY revenue DESC, store_id) AS quartile\nFROM daily_revenue\nORDER BY revenue DESC, store_id;\n",
  "m6.over": "SELECT order_id, store_id, total,\n       sum(total) OVER () AS all_paid,\n       sum(total) OVER (PARTITION BY store_id) AS store_paid\nFROM orders\nWHERE status = 'paid'\nORDER BY order_id;\n",
  "m6.plan.query": "SELECT order_id, customer_id,\n       ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY order_ts) AS n\nFROM big_orders\n",
  "m6.qualify": "SELECT order_id, total\nFROM orders\nWHERE status = 'paid'\nQUALIFY ROW_NUMBER() OVER (ORDER BY total DESC) <= 3\nORDER BY total DESC;\n",
  "m6.rank": "SELECT day, store_id, revenue,\n       ROW_NUMBER() OVER (ORDER BY revenue DESC, store_id) AS row_num,\n       RANK()       OVER (ORDER BY revenue DESC) AS rnk,\n       DENSE_RANK() OVER (ORDER BY revenue DESC) AS dense_rnk\nFROM daily_revenue\nORDER BY revenue DESC, store_id;\n",
  "m6.rank_after_where": "SELECT order_id, status, total,\n       RANK() OVER (ORDER BY total DESC) AS rank_paid_only\nFROM orders\nWHERE status = 'paid'\nORDER BY rank_paid_only;\n",
  "m6.rank_all_orders": "SELECT order_id, status, total,\n       RANK() OVER (ORDER BY total DESC) AS rank_all\nFROM orders\nORDER BY rank_all;\n",
  "m6.rank_partition": "SELECT store_id, day, revenue,\n       RANK() OVER (PARTITION BY store_id ORDER BY revenue DESC) AS rank_in_store\nFROM daily_revenue\nORDER BY store_id, rank_in_store, day;\n",
  "m6.rownum_ties": "SELECT day, store_id, revenue,\n       ROW_NUMBER() OVER (ORDER BY revenue DESC) AS row_num\nFROM daily_revenue\nWHERE revenue >= 50\nORDER BY row_num;\n",
  "m6.running": "SELECT store_id, day, revenue,\n       sum(revenue) OVER (PARTITION BY store_id ORDER BY day) AS running_total\nFROM daily_revenue\nORDER BY store_id, day;\n",
  "m6.running_ties": "SELECT day, store_id, revenue,\n       sum(revenue) OVER (ORDER BY revenue) AS default_frame,\n       sum(revenue) OVER (ORDER BY revenue, store_id ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS rows_frame\nFROM daily_revenue\nORDER BY revenue, store_id;\n",
  "m6.share": "SELECT store_id,\n       sum(total) AS revenue,\n       round(100.0 * sum(total) / sum(sum(total)) OVER (), 1) AS share_percent\nFROM orders\nWHERE status = 'paid'\nGROUP BY store_id\nORDER BY revenue DESC;\n",
  "m6.top3_cte": "WITH ranked AS (\n  SELECT order_id, total, ROW_NUMBER() OVER (ORDER BY total DESC) AS rn\n  FROM orders\n  WHERE status = 'paid'\n)\nSELECT order_id, total, rn\nFROM ranked\nWHERE rn <= 3\nORDER BY rn;\n",
  "m6.where_error": "SELECT order_id, total\nFROM orders\nWHERE ROW_NUMBER() OVER (ORDER BY total DESC) <= 3;\n",
  "m7.arith_duckdb": "SELECT o.order_id,\n       date_diff('minute', o.order_ts, min(p.paid_ts)) AS first_payment_after,\n       date_diff('minute', o.order_ts, max(p.paid_ts)) AS last_payment_after\nFROM orders AS o\nJOIN payments AS p ON p.order_id = o.order_id\nGROUP BY o.order_id, o.order_ts\nORDER BY o.order_id;\n",
  "m7.arith_postgres": "SELECT o.order_id,\n       CAST(extract(epoch FROM min(p.paid_ts) - o.order_ts) / 60 AS INTEGER) AS first_payment_after,\n       CAST(extract(epoch FROM max(p.paid_ts) - o.order_ts) / 60 AS INTEGER) AS last_payment_after\nFROM orders AS o\nJOIN payments AS p ON p.order_id = o.order_id\nGROUP BY o.order_id, o.order_ts\nORDER BY o.order_id;\n",
  "m7.arith_sqlite": "SELECT o.order_id,\n       CAST(round((julianday(min(p.paid_ts)) - julianday(o.order_ts)) * 1440) AS INTEGER) AS first_payment_after,\n       CAST(round((julianday(max(p.paid_ts)) - julianday(o.order_ts)) * 1440) AS INTEGER) AS last_payment_after\nFROM orders AS o\nJOIN payments AS p ON p.order_id = o.order_id\nGROUP BY o.order_id, o.order_ts\nORDER BY o.order_id;\n",
  "m7.arrays_duckdb": "SELECT i.order_id,\n       list(p.name ORDER BY i.line_no) AS products,\n       len(list(p.name)) AS lines,\n       list_contains(list(p.name), 'Latte') AS has_latte\nFROM order_items AS i\nJOIN products AS p ON p.product_id = i.product_id\nWHERE i.order_id IN (1001, 1002, 1011)\nGROUP BY i.order_id\nORDER BY i.order_id;\n",
  "m7.arrays_postgres": "SELECT i.order_id,\n       array_agg(p.name ORDER BY i.line_no) AS products,\n       cardinality(array_agg(p.name)) AS lines,\n       'Latte' = ANY(array_agg(p.name)) AS has_latte\nFROM order_items AS i\nJOIN products AS p ON p.product_id = i.product_id\nWHERE i.order_id IN (1001, 1002, 1011)\nGROUP BY i.order_id\nORDER BY i.order_id;\n",
  "m7.arrays_sqlite": "SELECT order_id,\n       json_group_array(name) AS products,\n       count(*) AS lines,\n       max(name = 'Latte') AS has_latte\nFROM (\n  SELECT i.order_id, p.name\n  FROM order_items AS i\n  JOIN products AS p ON p.product_id = i.product_id\n  WHERE i.order_id IN (1001, 1002, 1011)\n  ORDER BY i.order_id, i.line_no\n)\nGROUP BY order_id\nORDER BY order_id;\n",
  "m7.bytes": "SELECT 'Zoë' AS s, length('Zoë') AS chars, octet_length('Zoë') AS bytes;\n",
  "m7.bytes_duckdb": "SELECT 'Zoë' AS s, length('Zoë') AS chars, strlen('Zoë') AS bytes;\n",
  "m7.ch_domain": "SELECT coalesce(split_part(email, '@', 2), 'unknown') AS domain, count(*) AS customers\nFROM customers\nGROUP BY coalesce(split_part(email, '@', 2), 'unknown')\nORDER BY customers DESC, domain;\n",
  "m7.ch_firstorder": "SELECT c.customer_id, c.name,\n       CAST(min(o.order_ts) AS DATE) - c.signup_date AS days_to_first_order\nFROM customers AS c\nJOIN orders AS o ON o.customer_id = c.customer_id\nGROUP BY c.customer_id, c.name, c.signup_date\nORDER BY c.customer_id;\n",
  "m7.ch_localday": "WITH store_tz(store_id, tz) AS (\n  VALUES (1, 'Asia/Singapore'), (2, 'Asia/Kuala_Lumpur'), (3, 'Asia/Jakarta'), (4, 'Australia/Sydney')\n)\nSELECT z.store_id,\n       CAST((o.order_ts AT TIME ZONE 'UTC') AT TIME ZONE z.tz AS DATE) AS local_day,\n       count(*) AS orders\nFROM orders AS o\nJOIN store_tz AS z ON z.store_id = o.store_id\nGROUP BY z.store_id, CAST((o.order_ts AT TIME ZONE 'UTC') AT TIME ZONE z.tz AS DATE)\nORDER BY z.store_id, local_day;\n",
  "m7.collation": "WITH w(word) AS (\n  VALUES ('banana'), ('Banana'), ('apple'), ('Éclair'), ('cherry'), ('Apple')\n)\nSELECT word FROM w ORDER BY word;\n",
  "m7.collation_en": "WITH w(word) AS (\n  VALUES ('banana'), ('Banana'), ('apple'), ('Éclair'), ('cherry'), ('Apple')\n)\nSELECT word FROM w ORDER BY word COLLATE en;\n",
  "m7.collation_icu": "WITH w(word) AS (\n  VALUES ('banana'), ('Banana'), ('apple'), ('Éclair'), ('cherry'), ('Apple')\n)\nSELECT word FROM w ORDER BY word COLLATE \"und-x-icu\";\n",
  "m7.collation_nocase": "WITH w(word) AS (\n  VALUES ('banana'), ('Banana'), ('apple'), ('Éclair'), ('cherry'), ('Apple')\n)\nSELECT word FROM w ORDER BY word COLLATE NOCASE, word;\n",
  "m7.domain": "SELECT customer_id, email, split_part(email, '@', 2) AS domain\nFROM customers\nORDER BY customer_id;\n",
  "m7.domain_sqlite": "SELECT customer_id, email, substr(email, instr(email, '@') + 1) AS domain\nFROM customers\nORDER BY customer_id;\n",
  "m7.fmt": "SELECT strftime(order_ts, '%Y-%m-%d %H:%M') AS minute_text,\n       strftime(order_ts, '%Y-%m') AS month_text\nFROM orders\nWHERE order_id = 1001;\n",
  "m7.fmt_postgres": "SELECT to_char(order_ts, 'YYYY-MM-DD HH24:MI') AS minute_text,\n       to_char(order_ts, 'YYYY-MM') AS month_text\nFROM orders\nWHERE order_id = 1001;\n",
  "m7.fmt_sqlite": "SELECT strftime('%Y-%m-%d %H:%M', order_ts) AS minute_text,\n       strftime('%Y-%m', order_ts) AS month_text\nFROM orders\nWHERE order_id = 1001;\n",
  "m7.json_data": "SELECT event_id, payload FROM app_events ORDER BY event_id;\n",
  "m7.json_fields_duckdb": "SELECT event_id,\n       payload ->> '$.device' AS device,\n       payload ->> '$.cart.coupon' AS coupon,\n       json_array_length(payload, '$.cart.items') AS items\nFROM app_events\nORDER BY event_id;\n",
  "m7.json_fields_postgres": "SELECT event_id,\n       payload::jsonb ->> 'device' AS device,\n       payload::jsonb #>> '{cart,coupon}' AS coupon,\n       jsonb_array_length(payload::jsonb #> '{cart,items}') AS items\nFROM app_events\nORDER BY event_id;\n",
  "m7.json_fields_sqlite": "SELECT event_id,\n       json_extract(payload, '$.device') AS device,\n       json_extract(payload, '$.cart.coupon') AS coupon,\n       json_array_length(payload, '$.cart.items') AS items\nFROM app_events\nORDER BY event_id;\n",
  "m7.json_flat_duckdb": "SELECT e.event_id, j.item.sku AS sku, j.item.qty AS qty\nFROM app_events AS e\nCROSS JOIN LATERAL (\n  SELECT unnest(from_json(e.payload -> '$.cart.items', '[{\"sku\":\"VARCHAR\",\"qty\":\"INTEGER\"}]')) AS item\n) AS j\nORDER BY e.event_id, sku;\n",
  "m7.json_flat_left_duckdb": "SELECT e.event_id, j.item.sku AS sku, j.item.qty AS qty\nFROM app_events AS e\nLEFT JOIN LATERAL (\n  SELECT unnest(from_json(e.payload -> '$.cart.items', '[{\"sku\":\"VARCHAR\",\"qty\":\"INTEGER\"}]')) AS item\n) AS j ON true\nORDER BY e.event_id, sku;\n",
  "m7.json_flat_left_postgres": "SELECT e.event_id, j.item ->> 'sku' AS sku, CAST(j.item ->> 'qty' AS INTEGER) AS qty\nFROM app_events AS e\nLEFT JOIN LATERAL jsonb_array_elements(e.payload::jsonb #> '{cart,items}') AS j(item) ON true\nORDER BY e.event_id, sku;\n",
  "m7.json_flat_left_sqlite": "SELECT e.event_id, json_extract(j.value, '$.sku') AS sku, json_extract(j.value, '$.qty') AS qty\nFROM app_events AS e\nLEFT JOIN json_each(e.payload, '$.cart.items') AS j\nORDER BY e.event_id, sku;\n",
  "m7.json_flat_postgres": "SELECT e.event_id, j.item ->> 'sku' AS sku, CAST(j.item ->> 'qty' AS INTEGER) AS qty\nFROM app_events AS e\nCROSS JOIN LATERAL jsonb_array_elements(e.payload::jsonb #> '{cart,items}') AS j(item)\nORDER BY e.event_id, sku;\n",
  "m7.json_flat_sqlite": "SELECT e.event_id, json_extract(j.value, '$.sku') AS sku, json_extract(j.value, '$.qty') AS qty\nFROM app_events AS e\nCROSS JOIN json_each(e.payload, '$.cart.items') AS j\nORDER BY e.event_id, sku;\n",
  "m7.month_end": "SELECT CAST(DATE '2026-01-31' + INTERVAL '1 month' AS DATE) AS plus_one_month,\n       CAST(DATE '2026-03-31' - INTERVAL '1 month' AS DATE) AS minus_one_month;\n",
  "m7.month_end_sqlite": "SELECT date('2026-01-31', '+1 month') AS plus_one_month,\n       date('2026-03-31', '-1 month') AS minus_one_month;\n",
  "m7.parts": "SELECT order_id, order_ts,\n       extract(isodow FROM order_ts) AS isodow,\n       extract(dow FROM order_ts) AS dow,\n       extract(week FROM order_ts) AS iso_week\nFROM orders\nWHERE order_id IN (1001, 1002, 1011)\nORDER BY order_id;\n",
  "m7.parts_sqlite": "SELECT order_id, order_ts,\n       CAST(strftime('%u', order_ts) AS INTEGER) AS isodow,\n       CAST(strftime('%w', order_ts) AS INTEGER) AS dow,\n       CAST(strftime('%V', order_ts) AS INTEGER) AS iso_week,\n       CAST(strftime('%W', order_ts) AS INTEGER) AS week_monday_first\nFROM orders\nWHERE order_id IN (1001, 1002, 1011)\nORDER BY order_id;\n",
  "m7.regex": "SELECT name, regexp_replace(name, '[aeiou]', '*', 'g') AS masked\nFROM customers\nORDER BY customer_id;\n",
  "m7.shift": "SELECT order_id, order_ts,\n       order_ts + INTERVAL '7 days' AS refund_deadline,\n       CAST(order_ts AS DATE) + 7 AS refund_deadline_day\nFROM orders\nWHERE order_id IN (1001, 1004)\nORDER BY order_id;\n",
  "m7.strings": "SELECT customer_id, name,\n       upper(name) AS shouted,\n       length(name) AS chars,\n       substr(name, 1, 3) AS first3,\n       replace(lower(name), ' ', '.') AS handle\nFROM customers\nORDER BY customer_id;\n",
  "m7.trunc": "SELECT date_trunc('week', order_ts) AS week_start,\n       count(*) AS orders,\n       sum(total) AS revenue\nFROM orders\nGROUP BY date_trunc('week', order_ts)\nORDER BY week_start;\n",
  "m7.trunc_sqlite": "SELECT date(order_ts, 'weekday 0', '-6 days') AS week_start,\n       count(*) AS orders,\n       sum(total) AS revenue\nFROM orders\nGROUP BY date(order_ts, 'weekday 0', '-6 days')\nORDER BY week_start;\n",
  "m7.tz_day": "WITH store_tz(store_id, tz) AS (\n  VALUES (1, 'Asia/Singapore'), (2, 'Asia/Kuala_Lumpur'), (3, 'Asia/Jakarta'), (4, 'Australia/Sydney')\n),\nlocal AS (\n  SELECT o.order_id,\n         CAST(o.order_ts AS DATE) AS utc_day,\n         CAST((o.order_ts AT TIME ZONE 'UTC') AT TIME ZONE z.tz AS DATE) AS local_day\n  FROM orders AS o\n  JOIN store_tz AS z ON z.store_id = o.store_id\n)\nSELECT order_id, utc_day, local_day\nFROM local\nWHERE utc_day <> local_day\nORDER BY order_id;\n",
  "m7.tz_local": "WITH store_tz(store_id, tz) AS (\n  VALUES (1, 'Asia/Singapore'), (2, 'Asia/Kuala_Lumpur'), (3, 'Asia/Jakarta'), (4, 'Australia/Sydney')\n)\nSELECT o.order_id, o.store_id, z.tz,\n       o.order_ts AS utc_ts,\n       (o.order_ts AT TIME ZONE 'UTC') AT TIME ZONE z.tz AS local_ts\nFROM orders AS o\nJOIN store_tz AS z ON z.store_id = o.store_id\nORDER BY o.order_id;\n",
  "m7.tz_sqlite": "SELECT order_id, order_ts AS utc_ts, datetime(order_ts, '+8 hours') AS singapore_ts\nFROM orders\nWHERE store_id = 1\nORDER BY order_id;\n",
  "m7.tz_sqlite_error": "SELECT order_ts AT TIME ZONE 'Asia/Singapore' FROM orders;\n"
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
  },
  "m5.calendar.duckdb": {
   "cols": [
    "day",
    "orders"
   ],
   "rows": [
    [
     "2026-03-01",
     "1"
    ],
    [
     "2026-03-02",
     "2"
    ],
    [
     "2026-03-03",
     "1"
    ],
    [
     "2026-03-04",
     "2"
    ],
    [
     "2026-03-05",
     "1"
    ],
    [
     "2026-03-06",
     "2"
    ],
    [
     "2026-03-07",
     "1"
    ],
    [
     "2026-03-08",
     "1"
    ],
    [
     "2026-03-09",
     "1"
    ],
    [
     "2026-03-10",
     "0"
    ]
   ]
  },
  "m5.calendar.postgres": {
   "cols": [
    "day",
    "orders"
   ],
   "rows": [
    [
     "2026-03-01",
     "1"
    ],
    [
     "2026-03-02",
     "2"
    ],
    [
     "2026-03-03",
     "1"
    ],
    [
     "2026-03-04",
     "2"
    ],
    [
     "2026-03-05",
     "1"
    ],
    [
     "2026-03-06",
     "2"
    ],
    [
     "2026-03-07",
     "1"
    ],
    [
     "2026-03-08",
     "1"
    ],
    [
     "2026-03-09",
     "1"
    ],
    [
     "2026-03-10",
     "0"
    ]
   ]
  },
  "m5.calendar_sqlite": {
   "cols": [
    "day",
    "orders"
   ],
   "rows": [
    [
     "2026-03-01",
     "1"
    ],
    [
     "2026-03-02",
     "2"
    ],
    [
     "2026-03-03",
     "1"
    ],
    [
     "2026-03-04",
     "2"
    ],
    [
     "2026-03-05",
     "1"
    ],
    [
     "2026-03-06",
     "2"
    ],
    [
     "2026-03-07",
     "1"
    ],
    [
     "2026-03-08",
     "1"
    ],
    [
     "2026-03-09",
     "1"
    ],
    [
     "2026-03-10",
     "0"
    ]
   ]
  },
  "m5.ch_second.duckdb": {
   "cols": [
    "second_highest"
   ],
   "rows": [
    [
     "19.00"
    ]
   ]
  },
  "m5.ch_second.postgres": {
   "cols": [
    "second_highest"
   ],
   "rows": [
    [
     "19.00"
    ]
   ]
  },
  "m5.ch_second.sqlite": {
   "cols": [
    "second_highest"
   ],
   "rows": [
    [
     "19"
    ]
   ]
  },
  "m5.ch_storeavg.duckdb": {
   "cols": [
    "order_id",
    "store_id",
    "total"
   ],
   "rows": [
    [
     "1002",
     "1",
     "18.50"
    ],
    [
     "1004",
     "1",
     "26.00"
    ],
    [
     "1009",
     "2",
     "9.50"
    ],
    [
     "1010",
     "1",
     "19.00"
    ],
    [
     "1011",
     "4",
     "16.50"
    ]
   ]
  },
  "m5.ch_storeavg.postgres": {
   "cols": [
    "order_id",
    "store_id",
    "total"
   ],
   "rows": [
    [
     "1002",
     "1",
     "18.50"
    ],
    [
     "1004",
     "1",
     "26.00"
    ],
    [
     "1009",
     "2",
     "9.50"
    ],
    [
     "1010",
     "1",
     "19.00"
    ],
    [
     "1011",
     "4",
     "16.50"
    ]
   ]
  },
  "m5.ch_storeavg.sqlite": {
   "cols": [
    "order_id",
    "store_id",
    "total"
   ],
   "rows": [
    [
     "1002",
     "1",
     "18.5"
    ],
    [
     "1004",
     "1",
     "26"
    ],
    [
     "1009",
     "2",
     "9.5"
    ],
    [
     "1010",
     "1",
     "19"
    ],
    [
     "1011",
     "4",
     "16.5"
    ]
   ]
  },
  "m5.ch_subtree.duckdb": {
   "cols": [
    "category_id",
    "name",
    "depth"
   ],
   "rows": [
    [
     "2",
     "Drinks",
     "0"
    ],
    [
     "3",
     "Coffee",
     "1"
    ],
    [
     "6",
     "Tea",
     "1"
    ],
    [
     "4",
     "Espresso drinks",
     "2"
    ],
    [
     "5",
     "Cold coffee",
     "2"
    ]
   ]
  },
  "m5.ch_subtree.postgres": {
   "cols": [
    "category_id",
    "name",
    "depth"
   ],
   "rows": [
    [
     "2",
     "Drinks",
     "0"
    ],
    [
     "3",
     "Coffee",
     "1"
    ],
    [
     "6",
     "Tea",
     "1"
    ],
    [
     "4",
     "Espresso drinks",
     "2"
    ],
    [
     "5",
     "Cold coffee",
     "2"
    ]
   ]
  },
  "m5.ch_subtree.sqlite": {
   "cols": [
    "category_id",
    "name",
    "depth"
   ],
   "rows": [
    [
     "2",
     "Drinks",
     "0"
    ],
    [
     "3",
     "Coffee",
     "1"
    ],
    [
     "6",
     "Tea",
     "1"
    ],
    [
     "4",
     "Espresso drinks",
     "2"
    ],
    [
     "5",
     "Cold coffee",
     "2"
    ]
   ]
  },
  "m5.correlated.duckdb": {
   "cols": [
    "customer_id",
    "name",
    "biggest_order"
   ],
   "rows": [
    [
     "1",
     "Ana Lim",
     "18.50"
    ],
    [
     "2",
     "Ben Ortiz",
     "8.00"
    ],
    [
     "3",
     "Chen Wei",
     "26.00"
    ],
    [
     "4",
     "Dara Putri",
     "9.00"
    ],
    [
     "5",
     "Eli Cohen",
     "16.50"
    ],
    [
     "6",
     "Fay Tan",
     "NULL"
    ],
    [
     "7",
     "Gus Hall",
     "12.00"
    ],
    [
     "8",
     "Hana Ito",
     "NULL"
    ]
   ]
  },
  "m5.correlated.postgres": {
   "cols": [
    "customer_id",
    "name",
    "biggest_order"
   ],
   "rows": [
    [
     "1",
     "Ana Lim",
     "18.50"
    ],
    [
     "2",
     "Ben Ortiz",
     "8.00"
    ],
    [
     "3",
     "Chen Wei",
     "26.00"
    ],
    [
     "4",
     "Dara Putri",
     "9.00"
    ],
    [
     "5",
     "Eli Cohen",
     "16.50"
    ],
    [
     "6",
     "Fay Tan",
     "NULL"
    ],
    [
     "7",
     "Gus Hall",
     "12.00"
    ],
    [
     "8",
     "Hana Ito",
     "NULL"
    ]
   ]
  },
  "m5.correlated.sqlite": {
   "cols": [
    "customer_id",
    "name",
    "biggest_order"
   ],
   "rows": [
    [
     "1",
     "Ana Lim",
     "18.5"
    ],
    [
     "2",
     "Ben Ortiz",
     "8"
    ],
    [
     "3",
     "Chen Wei",
     "26"
    ],
    [
     "4",
     "Dara Putri",
     "9"
    ],
    [
     "5",
     "Eli Cohen",
     "16.5"
    ],
    [
     "6",
     "Fay Tan",
     "NULL"
    ],
    [
     "7",
     "Gus Hall",
     "12"
    ],
    [
     "8",
     "Hana Ito",
     "NULL"
    ]
   ]
  },
  "m5.cte.duckdb": {
   "cols": [
    "name",
    "orders",
    "spent"
   ],
   "rows": [
    [
     "Chen Wei",
     "2",
     "45.00"
    ],
    [
     "Ana Lim",
     "3",
     "37.00"
    ],
    [
     "Eli Cohen",
     "2",
     "30.50"
    ]
   ]
  },
  "m5.cte.postgres": {
   "cols": [
    "name",
    "orders",
    "spent"
   ],
   "rows": [
    [
     "Chen Wei",
     "2",
     "45.00"
    ],
    [
     "Ana Lim",
     "3",
     "37.00"
    ],
    [
     "Eli Cohen",
     "2",
     "30.50"
    ]
   ]
  },
  "m5.cte.sqlite": {
   "cols": [
    "name",
    "orders",
    "spent"
   ],
   "rows": [
    [
     "Chen Wei",
     "2",
     "45"
    ],
    [
     "Ana Lim",
     "3",
     "37.0"
    ],
    [
     "Eli Cohen",
     "2",
     "30.5"
    ]
   ]
  },
  "m5.cte_reuse.duckdb": {
   "cols": [
    "store_id",
    "revenue",
    "share_percent"
   ],
   "rows": [
    [
     "1",
     "82.00",
     "64.6"
    ],
    [
     "4",
     "30.50",
     "24.0"
    ],
    [
     "2",
     "14.50",
     "11.4"
    ]
   ]
  },
  "m5.cte_reuse.postgres": {
   "cols": [
    "store_id",
    "revenue",
    "share_percent"
   ],
   "rows": [
    [
     "1",
     "82.00",
     "64.6"
    ],
    [
     "4",
     "30.50",
     "24.0"
    ],
    [
     "2",
     "14.50",
     "11.4"
    ]
   ]
  },
  "m5.cte_reuse.sqlite": {
   "cols": [
    "store_id",
    "revenue",
    "share_percent"
   ],
   "rows": [
    [
     "1",
     "82.0",
     "64.6"
    ],
    [
     "4",
     "30.5",
     "24.0"
    ],
    [
     "2",
     "14.5",
     "11.4"
    ]
   ]
  },
  "m5.cycle_union.duckdb": {
   "cols": [
    "categories_reached"
   ],
   "rows": [
    [
     "9"
    ]
   ]
  },
  "m5.cycle_union.postgres": {
   "cols": [
    "categories_reached"
   ],
   "rows": [
    [
     "9"
    ]
   ]
  },
  "m5.cycle_union.sqlite": {
   "cols": [
    "categories_reached"
   ],
   "rows": [
    [
     "9"
    ]
   ]
  },
  "m5.cycle_union_all.duckdb": {
   "cols": [
    "rows_produced",
    "deepest"
   ],
   "rows": [
    [
     "61",
     "20"
    ]
   ]
  },
  "m5.cycle_union_all.postgres": {
   "cols": [
    "rows_produced",
    "deepest"
   ],
   "rows": [
    [
     "61",
     "20"
    ]
   ]
  },
  "m5.cycle_union_all.sqlite": {
   "cols": [
    "rows_produced",
    "deepest"
   ],
   "rows": [
    [
     "61",
     "20"
    ]
   ]
  },
  "m5.derived.duckdb": {
   "cols": [
    "customer_id",
    "spent"
   ],
   "rows": [
    [
     "3",
     "45.00"
    ],
    [
     "1",
     "37.00"
    ],
    [
     "5",
     "30.50"
    ]
   ]
  },
  "m5.derived.postgres": {
   "cols": [
    "customer_id",
    "spent"
   ],
   "rows": [
    [
     "3",
     "45.00"
    ],
    [
     "1",
     "37.00"
    ],
    [
     "5",
     "30.50"
    ]
   ]
  },
  "m5.derived.sqlite": {
   "cols": [
    "customer_id",
    "spent"
   ],
   "rows": [
    [
     "3",
     "45"
    ],
    [
     "1",
     "37.0"
    ],
    [
     "5",
     "30.5"
    ]
   ]
  },
  "m5.exists.duckdb": {
   "cols": [
    "customer_id",
    "name"
   ],
   "rows": [
    [
     "7",
     "Gus Hall"
    ]
   ]
  },
  "m5.exists.postgres": {
   "cols": [
    "customer_id",
    "name"
   ],
   "rows": [
    [
     "7",
     "Gus Hall"
    ]
   ]
  },
  "m5.exists.sqlite": {
   "cols": [
    "customer_id",
    "name"
   ],
   "rows": [
    [
     "7",
     "Gus Hall"
    ]
   ]
  },
  "m5.in_join.duckdb": {
   "cols": [
    "customer_id",
    "name"
   ],
   "rows": [
    [
     "1",
     "Ana Lim"
    ],
    [
     "1",
     "Ana Lim"
    ],
    [
     "1",
     "Ana Lim"
    ],
    [
     "3",
     "Chen Wei"
    ],
    [
     "3",
     "Chen Wei"
    ]
   ]
  },
  "m5.in_join.postgres": {
   "cols": [
    "customer_id",
    "name"
   ],
   "rows": [
    [
     "1",
     "Ana Lim"
    ],
    [
     "1",
     "Ana Lim"
    ],
    [
     "1",
     "Ana Lim"
    ],
    [
     "3",
     "Chen Wei"
    ],
    [
     "3",
     "Chen Wei"
    ]
   ]
  },
  "m5.in_join.sqlite": {
   "cols": [
    "customer_id",
    "name"
   ],
   "rows": [
    [
     "1",
     "Ana Lim"
    ],
    [
     "1",
     "Ana Lim"
    ],
    [
     "1",
     "Ana Lim"
    ],
    [
     "3",
     "Chen Wei"
    ],
    [
     "3",
     "Chen Wei"
    ]
   ]
  },
  "m5.in_subquery.duckdb": {
   "cols": [
    "customer_id",
    "name"
   ],
   "rows": [
    [
     "1",
     "Ana Lim"
    ],
    [
     "3",
     "Chen Wei"
    ]
   ]
  },
  "m5.in_subquery.postgres": {
   "cols": [
    "customer_id",
    "name"
   ],
   "rows": [
    [
     "1",
     "Ana Lim"
    ],
    [
     "3",
     "Chen Wei"
    ]
   ]
  },
  "m5.in_subquery.sqlite": {
   "cols": [
    "customer_id",
    "name"
   ],
   "rows": [
    [
     "1",
     "Ana Lim"
    ],
    [
     "3",
     "Chen Wei"
    ]
   ]
  },
  "m5.scalar.duckdb": {
   "cols": [
    "order_id",
    "total"
   ],
   "rows": [
    [
     "1002",
     "18.50"
    ],
    [
     "1004",
     "26.00"
    ],
    [
     "1010",
     "19.00"
    ],
    [
     "1011",
     "16.50"
    ]
   ]
  },
  "m5.scalar.postgres": {
   "cols": [
    "order_id",
    "total"
   ],
   "rows": [
    [
     "1002",
     "18.50"
    ],
    [
     "1004",
     "26.00"
    ],
    [
     "1010",
     "19.00"
    ],
    [
     "1011",
     "16.50"
    ]
   ]
  },
  "m5.scalar.sqlite": {
   "cols": [
    "order_id",
    "total"
   ],
   "rows": [
    [
     "1002",
     "18.5"
    ],
    [
     "1004",
     "26"
    ],
    [
     "1010",
     "19"
    ],
    [
     "1011",
     "16.5"
    ]
   ]
  },
  "m5.scalar_many.sqlite": {
   "cols": [
    "name",
    "order_id"
   ],
   "rows": [
    [
     "Ana Lim",
     "1001"
    ],
    [
     "Ben Ortiz",
     "1003"
    ],
    [
     "Chen Wei",
     "1004"
    ],
    [
     "Dara Putri",
     "1005"
    ],
    [
     "Eli Cohen",
     "1006"
    ],
    [
     "Fay Tan",
     "NULL"
    ],
    [
     "Gus Hall",
     "1008"
    ],
    [
     "Hana Ito",
     "NULL"
    ]
   ]
  },
  "m5.series_duckdb": {
   "cols": [
    "day",
    "orders"
   ],
   "rows": [
    [
     "2026-03-01",
     "1"
    ],
    [
     "2026-03-02",
     "2"
    ],
    [
     "2026-03-03",
     "1"
    ],
    [
     "2026-03-04",
     "2"
    ],
    [
     "2026-03-05",
     "1"
    ],
    [
     "2026-03-06",
     "2"
    ],
    [
     "2026-03-07",
     "1"
    ],
    [
     "2026-03-08",
     "1"
    ],
    [
     "2026-03-09",
     "1"
    ],
    [
     "2026-03-10",
     "0"
    ]
   ]
  },
  "m5.series_postgres": {
   "cols": [
    "day",
    "orders"
   ],
   "rows": [
    [
     "2026-03-01",
     "1"
    ],
    [
     "2026-03-02",
     "2"
    ],
    [
     "2026-03-03",
     "1"
    ],
    [
     "2026-03-04",
     "2"
    ],
    [
     "2026-03-05",
     "1"
    ],
    [
     "2026-03-06",
     "2"
    ],
    [
     "2026-03-07",
     "1"
    ],
    [
     "2026-03-08",
     "1"
    ],
    [
     "2026-03-09",
     "1"
    ],
    [
     "2026-03-10",
     "0"
    ]
   ]
  },
  "m5.tree.duckdb": {
   "cols": [
    "category_id",
    "depth",
    "path"
   ],
   "rows": [
    [
     "1",
     "0",
     "Menu"
    ],
    [
     "2",
     "1",
     "Menu > Drinks"
    ],
    [
     "3",
     "2",
     "Menu > Drinks > Coffee"
    ],
    [
     "5",
     "3",
     "Menu > Drinks > Coffee > Cold coffee"
    ],
    [
     "4",
     "3",
     "Menu > Drinks > Coffee > Espresso drinks"
    ],
    [
     "6",
     "2",
     "Menu > Drinks > Tea"
    ],
    [
     "7",
     "1",
     "Menu > Retail"
    ],
    [
     "8",
     "2",
     "Menu > Retail > Beans"
    ],
    [
     "9",
     "2",
     "Menu > Retail > Merch"
    ]
   ]
  },
  "m5.tree.postgres": {
   "cols": [
    "category_id",
    "depth",
    "path"
   ],
   "rows": [
    [
     "1",
     "0",
     "Menu"
    ],
    [
     "2",
     "1",
     "Menu > Drinks"
    ],
    [
     "3",
     "2",
     "Menu > Drinks > Coffee"
    ],
    [
     "5",
     "3",
     "Menu > Drinks > Coffee > Cold coffee"
    ],
    [
     "4",
     "3",
     "Menu > Drinks > Coffee > Espresso drinks"
    ],
    [
     "6",
     "2",
     "Menu > Drinks > Tea"
    ],
    [
     "7",
     "1",
     "Menu > Retail"
    ],
    [
     "8",
     "2",
     "Menu > Retail > Beans"
    ],
    [
     "9",
     "2",
     "Menu > Retail > Merch"
    ]
   ]
  },
  "m5.tree.sqlite": {
   "cols": [
    "category_id",
    "depth",
    "path"
   ],
   "rows": [
    [
     "1",
     "0",
     "Menu"
    ],
    [
     "2",
     "1",
     "Menu > Drinks"
    ],
    [
     "3",
     "2",
     "Menu > Drinks > Coffee"
    ],
    [
     "5",
     "3",
     "Menu > Drinks > Coffee > Cold coffee"
    ],
    [
     "4",
     "3",
     "Menu > Drinks > Coffee > Espresso drinks"
    ],
    [
     "6",
     "2",
     "Menu > Drinks > Tea"
    ],
    [
     "7",
     "1",
     "Menu > Retail"
    ],
    [
     "8",
     "2",
     "Menu > Retail > Beans"
    ],
    [
     "9",
     "2",
     "Menu > Retail > Merch"
    ]
   ]
  },
  "m5.tree_iterations.duckdb": {
   "cols": [
    "iteration",
    "category_id",
    "name"
   ],
   "rows": [
    [
     "0",
     "1",
     "Menu"
    ],
    [
     "1",
     "2",
     "Drinks"
    ],
    [
     "1",
     "7",
     "Retail"
    ],
    [
     "2",
     "3",
     "Coffee"
    ],
    [
     "2",
     "6",
     "Tea"
    ],
    [
     "2",
     "8",
     "Beans"
    ],
    [
     "2",
     "9",
     "Merch"
    ],
    [
     "3",
     "4",
     "Espresso drinks"
    ],
    [
     "3",
     "5",
     "Cold coffee"
    ]
   ]
  },
  "m5.tree_iterations.postgres": {
   "cols": [
    "iteration",
    "category_id",
    "name"
   ],
   "rows": [
    [
     "0",
     "1",
     "Menu"
    ],
    [
     "1",
     "2",
     "Drinks"
    ],
    [
     "1",
     "7",
     "Retail"
    ],
    [
     "2",
     "3",
     "Coffee"
    ],
    [
     "2",
     "6",
     "Tea"
    ],
    [
     "2",
     "8",
     "Beans"
    ],
    [
     "2",
     "9",
     "Merch"
    ],
    [
     "3",
     "4",
     "Espresso drinks"
    ],
    [
     "3",
     "5",
     "Cold coffee"
    ]
   ]
  },
  "m5.tree_iterations.sqlite": {
   "cols": [
    "iteration",
    "category_id",
    "name"
   ],
   "rows": [
    [
     "0",
     "1",
     "Menu"
    ],
    [
     "1",
     "2",
     "Drinks"
    ],
    [
     "1",
     "7",
     "Retail"
    ],
    [
     "2",
     "3",
     "Coffee"
    ],
    [
     "2",
     "6",
     "Tea"
    ],
    [
     "2",
     "8",
     "Beans"
    ],
    [
     "2",
     "9",
     "Merch"
    ],
    [
     "3",
     "4",
     "Espresso drinks"
    ],
    [
     "3",
     "5",
     "Cold coffee"
    ]
   ]
  },
  "m5.view.duckdb": {
   "cols": [
    "paid_orders",
    "revenue"
   ],
   "rows": [
    [
     "9",
     "127.00"
    ]
   ]
  },
  "m5.view.postgres": {
   "cols": [
    "paid_orders",
    "revenue"
   ],
   "rows": [
    [
     "9",
     "127.00"
    ]
   ]
  },
  "m5.view.sqlite": {
   "cols": [
    "paid_orders",
    "revenue"
   ],
   "rows": [
    [
     "9",
     "127.0"
    ]
   ]
  },
  "m6.ch_drop.duckdb": {
   "cols": [
    "store_id",
    "day",
    "revenue",
    "prev_revenue"
   ],
   "rows": [
    [
     "1",
     "2026-03-03",
     "35.00",
     "55.00"
    ],
    [
     "1",
     "2026-03-05",
     "50.00",
     "60.00"
    ],
    [
     "2",
     "2026-03-04",
     "20.00",
     "45.00"
    ]
   ]
  },
  "m6.ch_drop.postgres": {
   "cols": [
    "store_id",
    "day",
    "revenue",
    "prev_revenue"
   ],
   "rows": [
    [
     "1",
     "2026-03-03",
     "35.00",
     "55.00"
    ],
    [
     "1",
     "2026-03-05",
     "50.00",
     "60.00"
    ],
    [
     "2",
     "2026-03-04",
     "20.00",
     "45.00"
    ]
   ]
  },
  "m6.ch_drop.sqlite": {
   "cols": [
    "store_id",
    "day",
    "revenue",
    "prev_revenue"
   ],
   "rows": [
    [
     "1",
     "2026-03-03",
     "35",
     "55"
    ],
    [
     "1",
     "2026-03-05",
     "50",
     "60"
    ],
    [
     "2",
     "2026-03-04",
     "20",
     "45"
    ]
   ]
  },
  "m6.ch_share.duckdb": {
   "cols": [
    "order_id",
    "store_id",
    "total",
    "store_share"
   ],
   "rows": [
    [
     "1001",
     "1",
     "11.50",
     "14.0"
    ],
    [
     "1002",
     "1",
     "18.50",
     "22.6"
    ],
    [
     "1003",
     "2",
     "5.00",
     "34.5"
    ],
    [
     "1004",
     "1",
     "26.00",
     "31.7"
    ],
    [
     "1006",
     "4",
     "14.00",
     "45.9"
    ],
    [
     "1007",
     "1",
     "7.00",
     "8.5"
    ],
    [
     "1009",
     "2",
     "9.50",
     "65.5"
    ],
    [
     "1010",
     "1",
     "19.00",
     "23.2"
    ],
    [
     "1011",
     "4",
     "16.50",
     "54.1"
    ]
   ]
  },
  "m6.ch_share.postgres": {
   "cols": [
    "order_id",
    "store_id",
    "total",
    "store_share"
   ],
   "rows": [
    [
     "1001",
     "1",
     "11.50",
     "14.0"
    ],
    [
     "1002",
     "1",
     "18.50",
     "22.6"
    ],
    [
     "1003",
     "2",
     "5.00",
     "34.5"
    ],
    [
     "1004",
     "1",
     "26.00",
     "31.7"
    ],
    [
     "1006",
     "4",
     "14.00",
     "45.9"
    ],
    [
     "1007",
     "1",
     "7.00",
     "8.5"
    ],
    [
     "1009",
     "2",
     "9.50",
     "65.5"
    ],
    [
     "1010",
     "1",
     "19.00",
     "23.2"
    ],
    [
     "1011",
     "4",
     "16.50",
     "54.1"
    ]
   ]
  },
  "m6.ch_share.sqlite": {
   "cols": [
    "order_id",
    "store_id",
    "total",
    "store_share"
   ],
   "rows": [
    [
     "1001",
     "1",
     "11.5",
     "14.0"
    ],
    [
     "1002",
     "1",
     "18.5",
     "22.6"
    ],
    [
     "1003",
     "2",
     "5",
     "34.5"
    ],
    [
     "1004",
     "1",
     "26",
     "31.7"
    ],
    [
     "1006",
     "4",
     "14",
     "45.9"
    ],
    [
     "1007",
     "1",
     "7",
     "8.5"
    ],
    [
     "1009",
     "2",
     "9.5",
     "65.5"
    ],
    [
     "1010",
     "1",
     "19",
     "23.2"
    ],
    [
     "1011",
     "4",
     "16.5",
     "54.1"
    ]
   ]
  },
  "m6.ch_third.duckdb": {
   "cols": [
    "day",
    "store_id",
    "revenue"
   ],
   "rows": [
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
  "m6.ch_third.postgres": {
   "cols": [
    "day",
    "store_id",
    "revenue"
   ],
   "rows": [
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
  "m6.ch_third.sqlite": {
   "cols": [
    "day",
    "store_id",
    "revenue"
   ],
   "rows": [
    [
     "2026-03-05",
     "1",
     "50"
    ],
    [
     "2026-03-05",
     "2",
     "50"
    ]
   ]
  },
  "m6.group_by.duckdb": {
   "cols": [
    "store_id",
    "store_paid"
   ],
   "rows": [
    [
     "1",
     "82.00"
    ],
    [
     "2",
     "14.50"
    ],
    [
     "4",
     "30.50"
    ]
   ]
  },
  "m6.group_by.postgres": {
   "cols": [
    "store_id",
    "store_paid"
   ],
   "rows": [
    [
     "1",
     "82.00"
    ],
    [
     "2",
     "14.50"
    ],
    [
     "4",
     "30.50"
    ]
   ]
  },
  "m6.group_by.sqlite": {
   "cols": [
    "store_id",
    "store_paid"
   ],
   "rows": [
    [
     "1",
     "82.0"
    ],
    [
     "2",
     "14.5"
    ],
    [
     "4",
     "30.5"
    ]
   ]
  },
  "m6.lag.duckdb": {
   "cols": [
    "store_id",
    "day",
    "revenue",
    "prev_revenue",
    "change",
    "next_revenue"
   ],
   "rows": [
    [
     "1",
     "2026-03-01",
     "40.00",
     "NULL",
     "NULL",
     "55.00"
    ],
    [
     "1",
     "2026-03-02",
     "55.00",
     "40.00",
     "15.00",
     "35.00"
    ],
    [
     "1",
     "2026-03-03",
     "35.00",
     "55.00",
     "-20.00",
     "60.00"
    ],
    [
     "1",
     "2026-03-04",
     "60.00",
     "35.00",
     "25.00",
     "50.00"
    ],
    [
     "1",
     "2026-03-05",
     "50.00",
     "60.00",
     "-10.00",
     "0.00"
    ],
    [
     "2",
     "2026-03-01",
     "25.00",
     "NULL",
     "NULL",
     "30.00"
    ],
    [
     "2",
     "2026-03-02",
     "30.00",
     "25.00",
     "5.00",
     "45.00"
    ],
    [
     "2",
     "2026-03-03",
     "45.00",
     "30.00",
     "15.00",
     "20.00"
    ],
    [
     "2",
     "2026-03-04",
     "20.00",
     "45.00",
     "-25.00",
     "50.00"
    ],
    [
     "2",
     "2026-03-05",
     "50.00",
     "20.00",
     "30.00",
     "0.00"
    ]
   ]
  },
  "m6.lag.postgres": {
   "cols": [
    "store_id",
    "day",
    "revenue",
    "prev_revenue",
    "change",
    "next_revenue"
   ],
   "rows": [
    [
     "1",
     "2026-03-01",
     "40.00",
     "NULL",
     "NULL",
     "55.00"
    ],
    [
     "1",
     "2026-03-02",
     "55.00",
     "40.00",
     "15.00",
     "35.00"
    ],
    [
     "1",
     "2026-03-03",
     "35.00",
     "55.00",
     "-20.00",
     "60.00"
    ],
    [
     "1",
     "2026-03-04",
     "60.00",
     "35.00",
     "25.00",
     "50.00"
    ],
    [
     "1",
     "2026-03-05",
     "50.00",
     "60.00",
     "-10.00",
     "0"
    ],
    [
     "2",
     "2026-03-01",
     "25.00",
     "NULL",
     "NULL",
     "30.00"
    ],
    [
     "2",
     "2026-03-02",
     "30.00",
     "25.00",
     "5.00",
     "45.00"
    ],
    [
     "2",
     "2026-03-03",
     "45.00",
     "30.00",
     "15.00",
     "20.00"
    ],
    [
     "2",
     "2026-03-04",
     "20.00",
     "45.00",
     "-25.00",
     "50.00"
    ],
    [
     "2",
     "2026-03-05",
     "50.00",
     "20.00",
     "30.00",
     "0"
    ]
   ]
  },
  "m6.lag.sqlite": {
   "cols": [
    "store_id",
    "day",
    "revenue",
    "prev_revenue",
    "change",
    "next_revenue"
   ],
   "rows": [
    [
     "1",
     "2026-03-01",
     "40",
     "NULL",
     "NULL",
     "55"
    ],
    [
     "1",
     "2026-03-02",
     "55",
     "40",
     "15",
     "35"
    ],
    [
     "1",
     "2026-03-03",
     "35",
     "55",
     "-20",
     "60"
    ],
    [
     "1",
     "2026-03-04",
     "60",
     "35",
     "25",
     "50"
    ],
    [
     "1",
     "2026-03-05",
     "50",
     "60",
     "-10",
     "0"
    ],
    [
     "2",
     "2026-03-01",
     "25",
     "NULL",
     "NULL",
     "30"
    ],
    [
     "2",
     "2026-03-02",
     "30",
     "25",
     "5",
     "45"
    ],
    [
     "2",
     "2026-03-03",
     "45",
     "30",
     "15",
     "20"
    ],
    [
     "2",
     "2026-03-04",
     "20",
     "45",
     "-25",
     "50"
    ],
    [
     "2",
     "2026-03-05",
     "50",
     "20",
     "30",
     "0"
    ]
   ]
  },
  "m6.last_value.duckdb": {
   "cols": [
    "store_id",
    "day",
    "revenue",
    "first_day",
    "last_default",
    "last_full"
   ],
   "rows": [
    [
     "1",
     "2026-03-01",
     "40.00",
     "40.00",
     "40.00",
     "50.00"
    ],
    [
     "1",
     "2026-03-02",
     "55.00",
     "40.00",
     "55.00",
     "50.00"
    ],
    [
     "1",
     "2026-03-03",
     "35.00",
     "40.00",
     "35.00",
     "50.00"
    ],
    [
     "1",
     "2026-03-04",
     "60.00",
     "40.00",
     "60.00",
     "50.00"
    ],
    [
     "1",
     "2026-03-05",
     "50.00",
     "40.00",
     "50.00",
     "50.00"
    ],
    [
     "2",
     "2026-03-01",
     "25.00",
     "25.00",
     "25.00",
     "50.00"
    ],
    [
     "2",
     "2026-03-02",
     "30.00",
     "25.00",
     "30.00",
     "50.00"
    ],
    [
     "2",
     "2026-03-03",
     "45.00",
     "25.00",
     "45.00",
     "50.00"
    ],
    [
     "2",
     "2026-03-04",
     "20.00",
     "25.00",
     "20.00",
     "50.00"
    ],
    [
     "2",
     "2026-03-05",
     "50.00",
     "25.00",
     "50.00",
     "50.00"
    ]
   ]
  },
  "m6.last_value.postgres": {
   "cols": [
    "store_id",
    "day",
    "revenue",
    "first_day",
    "last_default",
    "last_full"
   ],
   "rows": [
    [
     "1",
     "2026-03-01",
     "40.00",
     "40.00",
     "40.00",
     "50.00"
    ],
    [
     "1",
     "2026-03-02",
     "55.00",
     "40.00",
     "55.00",
     "50.00"
    ],
    [
     "1",
     "2026-03-03",
     "35.00",
     "40.00",
     "35.00",
     "50.00"
    ],
    [
     "1",
     "2026-03-04",
     "60.00",
     "40.00",
     "60.00",
     "50.00"
    ],
    [
     "1",
     "2026-03-05",
     "50.00",
     "40.00",
     "50.00",
     "50.00"
    ],
    [
     "2",
     "2026-03-01",
     "25.00",
     "25.00",
     "25.00",
     "50.00"
    ],
    [
     "2",
     "2026-03-02",
     "30.00",
     "25.00",
     "30.00",
     "50.00"
    ],
    [
     "2",
     "2026-03-03",
     "45.00",
     "25.00",
     "45.00",
     "50.00"
    ],
    [
     "2",
     "2026-03-04",
     "20.00",
     "25.00",
     "20.00",
     "50.00"
    ],
    [
     "2",
     "2026-03-05",
     "50.00",
     "25.00",
     "50.00",
     "50.00"
    ]
   ]
  },
  "m6.last_value.sqlite": {
   "cols": [
    "store_id",
    "day",
    "revenue",
    "first_day",
    "last_default",
    "last_full"
   ],
   "rows": [
    [
     "1",
     "2026-03-01",
     "40",
     "40",
     "40",
     "50"
    ],
    [
     "1",
     "2026-03-02",
     "55",
     "40",
     "55",
     "50"
    ],
    [
     "1",
     "2026-03-03",
     "35",
     "40",
     "35",
     "50"
    ],
    [
     "1",
     "2026-03-04",
     "60",
     "40",
     "60",
     "50"
    ],
    [
     "1",
     "2026-03-05",
     "50",
     "40",
     "50",
     "50"
    ],
    [
     "2",
     "2026-03-01",
     "25",
     "25",
     "25",
     "50"
    ],
    [
     "2",
     "2026-03-02",
     "30",
     "25",
     "30",
     "50"
    ],
    [
     "2",
     "2026-03-03",
     "45",
     "25",
     "45",
     "50"
    ],
    [
     "2",
     "2026-03-04",
     "20",
     "25",
     "20",
     "50"
    ],
    [
     "2",
     "2026-03-05",
     "50",
     "25",
     "50",
     "50"
    ]
   ]
  },
  "m6.moving.duckdb": {
   "cols": [
    "store_id",
    "day",
    "revenue",
    "avg_3_days",
    "rows_in_frame"
   ],
   "rows": [
    [
     "1",
     "2026-03-01",
     "40.00",
     "40.0",
     "1"
    ],
    [
     "1",
     "2026-03-02",
     "55.00",
     "47.5",
     "2"
    ],
    [
     "1",
     "2026-03-03",
     "35.00",
     "43.33",
     "3"
    ],
    [
     "1",
     "2026-03-04",
     "60.00",
     "50.0",
     "3"
    ],
    [
     "1",
     "2026-03-05",
     "50.00",
     "48.33",
     "3"
    ],
    [
     "2",
     "2026-03-01",
     "25.00",
     "25.0",
     "1"
    ],
    [
     "2",
     "2026-03-02",
     "30.00",
     "27.5",
     "2"
    ],
    [
     "2",
     "2026-03-03",
     "45.00",
     "33.33",
     "3"
    ],
    [
     "2",
     "2026-03-04",
     "20.00",
     "31.67",
     "3"
    ],
    [
     "2",
     "2026-03-05",
     "50.00",
     "38.33",
     "3"
    ]
   ]
  },
  "m6.moving.postgres": {
   "cols": [
    "store_id",
    "day",
    "revenue",
    "avg_3_days",
    "rows_in_frame"
   ],
   "rows": [
    [
     "1",
     "2026-03-01",
     "40.00",
     "40.00",
     "1"
    ],
    [
     "1",
     "2026-03-02",
     "55.00",
     "47.50",
     "2"
    ],
    [
     "1",
     "2026-03-03",
     "35.00",
     "43.33",
     "3"
    ],
    [
     "1",
     "2026-03-04",
     "60.00",
     "50.00",
     "3"
    ],
    [
     "1",
     "2026-03-05",
     "50.00",
     "48.33",
     "3"
    ],
    [
     "2",
     "2026-03-01",
     "25.00",
     "25.00",
     "1"
    ],
    [
     "2",
     "2026-03-02",
     "30.00",
     "27.50",
     "2"
    ],
    [
     "2",
     "2026-03-03",
     "45.00",
     "33.33",
     "3"
    ],
    [
     "2",
     "2026-03-04",
     "20.00",
     "31.67",
     "3"
    ],
    [
     "2",
     "2026-03-05",
     "50.00",
     "38.33",
     "3"
    ]
   ]
  },
  "m6.moving.sqlite": {
   "cols": [
    "store_id",
    "day",
    "revenue",
    "avg_3_days",
    "rows_in_frame"
   ],
   "rows": [
    [
     "1",
     "2026-03-01",
     "40",
     "40.0",
     "1"
    ],
    [
     "1",
     "2026-03-02",
     "55",
     "47.5",
     "2"
    ],
    [
     "1",
     "2026-03-03",
     "35",
     "43.33",
     "3"
    ],
    [
     "1",
     "2026-03-04",
     "60",
     "50.0",
     "3"
    ],
    [
     "1",
     "2026-03-05",
     "50",
     "48.33",
     "3"
    ],
    [
     "2",
     "2026-03-01",
     "25",
     "25.0",
     "1"
    ],
    [
     "2",
     "2026-03-02",
     "30",
     "27.5",
     "2"
    ],
    [
     "2",
     "2026-03-03",
     "45",
     "33.33",
     "3"
    ],
    [
     "2",
     "2026-03-04",
     "20",
     "31.67",
     "3"
    ],
    [
     "2",
     "2026-03-05",
     "50",
     "38.33",
     "3"
    ]
   ]
  },
  "m6.named_window.duckdb": {
   "cols": [
    "store_id",
    "day",
    "revenue",
    "running",
    "best_so_far"
   ],
   "rows": [
    [
     "1",
     "2026-03-01",
     "40.00",
     "40.00",
     "40.00"
    ],
    [
     "1",
     "2026-03-02",
     "55.00",
     "95.00",
     "55.00"
    ],
    [
     "1",
     "2026-03-03",
     "35.00",
     "130.00",
     "55.00"
    ],
    [
     "1",
     "2026-03-04",
     "60.00",
     "190.00",
     "60.00"
    ],
    [
     "1",
     "2026-03-05",
     "50.00",
     "240.00",
     "60.00"
    ],
    [
     "2",
     "2026-03-01",
     "25.00",
     "25.00",
     "25.00"
    ],
    [
     "2",
     "2026-03-02",
     "30.00",
     "55.00",
     "30.00"
    ],
    [
     "2",
     "2026-03-03",
     "45.00",
     "100.00",
     "45.00"
    ],
    [
     "2",
     "2026-03-04",
     "20.00",
     "120.00",
     "45.00"
    ],
    [
     "2",
     "2026-03-05",
     "50.00",
     "170.00",
     "50.00"
    ]
   ]
  },
  "m6.named_window.postgres": {
   "cols": [
    "store_id",
    "day",
    "revenue",
    "running",
    "best_so_far"
   ],
   "rows": [
    [
     "1",
     "2026-03-01",
     "40.00",
     "40.00",
     "40.00"
    ],
    [
     "1",
     "2026-03-02",
     "55.00",
     "95.00",
     "55.00"
    ],
    [
     "1",
     "2026-03-03",
     "35.00",
     "130.00",
     "55.00"
    ],
    [
     "1",
     "2026-03-04",
     "60.00",
     "190.00",
     "60.00"
    ],
    [
     "1",
     "2026-03-05",
     "50.00",
     "240.00",
     "60.00"
    ],
    [
     "2",
     "2026-03-01",
     "25.00",
     "25.00",
     "25.00"
    ],
    [
     "2",
     "2026-03-02",
     "30.00",
     "55.00",
     "30.00"
    ],
    [
     "2",
     "2026-03-03",
     "45.00",
     "100.00",
     "45.00"
    ],
    [
     "2",
     "2026-03-04",
     "20.00",
     "120.00",
     "45.00"
    ],
    [
     "2",
     "2026-03-05",
     "50.00",
     "170.00",
     "50.00"
    ]
   ]
  },
  "m6.named_window.sqlite": {
   "cols": [
    "store_id",
    "day",
    "revenue",
    "running",
    "best_so_far"
   ],
   "rows": [
    [
     "1",
     "2026-03-01",
     "40",
     "40",
     "40"
    ],
    [
     "1",
     "2026-03-02",
     "55",
     "95",
     "55"
    ],
    [
     "1",
     "2026-03-03",
     "35",
     "130",
     "55"
    ],
    [
     "1",
     "2026-03-04",
     "60",
     "190",
     "60"
    ],
    [
     "1",
     "2026-03-05",
     "50",
     "240",
     "60"
    ],
    [
     "2",
     "2026-03-01",
     "25",
     "25",
     "25"
    ],
    [
     "2",
     "2026-03-02",
     "30",
     "55",
     "30"
    ],
    [
     "2",
     "2026-03-03",
     "45",
     "100",
     "45"
    ],
    [
     "2",
     "2026-03-04",
     "20",
     "120",
     "45"
    ],
    [
     "2",
     "2026-03-05",
     "50",
     "170",
     "50"
    ]
   ]
  },
  "m6.ntile.duckdb": {
   "cols": [
    "day",
    "store_id",
    "revenue",
    "quartile"
   ],
   "rows": [
    [
     "2026-03-04",
     "1",
     "60.00",
     "1"
    ],
    [
     "2026-03-02",
     "1",
     "55.00",
     "1"
    ],
    [
     "2026-03-05",
     "1",
     "50.00",
     "1"
    ],
    [
     "2026-03-05",
     "2",
     "50.00",
     "2"
    ],
    [
     "2026-03-03",
     "2",
     "45.00",
     "2"
    ],
    [
     "2026-03-01",
     "1",
     "40.00",
     "2"
    ],
    [
     "2026-03-03",
     "1",
     "35.00",
     "3"
    ],
    [
     "2026-03-02",
     "2",
     "30.00",
     "3"
    ],
    [
     "2026-03-01",
     "2",
     "25.00",
     "4"
    ],
    [
     "2026-03-04",
     "2",
     "20.00",
     "4"
    ]
   ]
  },
  "m6.ntile.postgres": {
   "cols": [
    "day",
    "store_id",
    "revenue",
    "quartile"
   ],
   "rows": [
    [
     "2026-03-04",
     "1",
     "60.00",
     "1"
    ],
    [
     "2026-03-02",
     "1",
     "55.00",
     "1"
    ],
    [
     "2026-03-05",
     "1",
     "50.00",
     "1"
    ],
    [
     "2026-03-05",
     "2",
     "50.00",
     "2"
    ],
    [
     "2026-03-03",
     "2",
     "45.00",
     "2"
    ],
    [
     "2026-03-01",
     "1",
     "40.00",
     "2"
    ],
    [
     "2026-03-03",
     "1",
     "35.00",
     "3"
    ],
    [
     "2026-03-02",
     "2",
     "30.00",
     "3"
    ],
    [
     "2026-03-01",
     "2",
     "25.00",
     "4"
    ],
    [
     "2026-03-04",
     "2",
     "20.00",
     "4"
    ]
   ]
  },
  "m6.ntile.sqlite": {
   "cols": [
    "day",
    "store_id",
    "revenue",
    "quartile"
   ],
   "rows": [
    [
     "2026-03-04",
     "1",
     "60",
     "1"
    ],
    [
     "2026-03-02",
     "1",
     "55",
     "1"
    ],
    [
     "2026-03-05",
     "1",
     "50",
     "1"
    ],
    [
     "2026-03-05",
     "2",
     "50",
     "2"
    ],
    [
     "2026-03-03",
     "2",
     "45",
     "2"
    ],
    [
     "2026-03-01",
     "1",
     "40",
     "2"
    ],
    [
     "2026-03-03",
     "1",
     "35",
     "3"
    ],
    [
     "2026-03-02",
     "2",
     "30",
     "3"
    ],
    [
     "2026-03-01",
     "2",
     "25",
     "4"
    ],
    [
     "2026-03-04",
     "2",
     "20",
     "4"
    ]
   ]
  },
  "m6.over.duckdb": {
   "cols": [
    "order_id",
    "store_id",
    "total",
    "all_paid",
    "store_paid"
   ],
   "rows": [
    [
     "1001",
     "1",
     "11.50",
     "127.00",
     "82.00"
    ],
    [
     "1002",
     "1",
     "18.50",
     "127.00",
     "82.00"
    ],
    [
     "1003",
     "2",
     "5.00",
     "127.00",
     "14.50"
    ],
    [
     "1004",
     "1",
     "26.00",
     "127.00",
     "82.00"
    ],
    [
     "1006",
     "4",
     "14.00",
     "127.00",
     "30.50"
    ],
    [
     "1007",
     "1",
     "7.00",
     "127.00",
     "82.00"
    ],
    [
     "1009",
     "2",
     "9.50",
     "127.00",
     "14.50"
    ],
    [
     "1010",
     "1",
     "19.00",
     "127.00",
     "82.00"
    ],
    [
     "1011",
     "4",
     "16.50",
     "127.00",
     "30.50"
    ]
   ]
  },
  "m6.over.postgres": {
   "cols": [
    "order_id",
    "store_id",
    "total",
    "all_paid",
    "store_paid"
   ],
   "rows": [
    [
     "1001",
     "1",
     "11.50",
     "127.00",
     "82.00"
    ],
    [
     "1002",
     "1",
     "18.50",
     "127.00",
     "82.00"
    ],
    [
     "1003",
     "2",
     "5.00",
     "127.00",
     "14.50"
    ],
    [
     "1004",
     "1",
     "26.00",
     "127.00",
     "82.00"
    ],
    [
     "1006",
     "4",
     "14.00",
     "127.00",
     "30.50"
    ],
    [
     "1007",
     "1",
     "7.00",
     "127.00",
     "82.00"
    ],
    [
     "1009",
     "2",
     "9.50",
     "127.00",
     "14.50"
    ],
    [
     "1010",
     "1",
     "19.00",
     "127.00",
     "82.00"
    ],
    [
     "1011",
     "4",
     "16.50",
     "127.00",
     "30.50"
    ]
   ]
  },
  "m6.over.sqlite": {
   "cols": [
    "order_id",
    "store_id",
    "total",
    "all_paid",
    "store_paid"
   ],
   "rows": [
    [
     "1001",
     "1",
     "11.5",
     "127.0",
     "82.0"
    ],
    [
     "1002",
     "1",
     "18.5",
     "127.0",
     "82.0"
    ],
    [
     "1003",
     "2",
     "5",
     "127.0",
     "14.5"
    ],
    [
     "1004",
     "1",
     "26",
     "127.0",
     "82.0"
    ],
    [
     "1006",
     "4",
     "14",
     "127.0",
     "30.5"
    ],
    [
     "1007",
     "1",
     "7",
     "127.0",
     "82.0"
    ],
    [
     "1009",
     "2",
     "9.5",
     "127.0",
     "14.5"
    ],
    [
     "1010",
     "1",
     "19",
     "127.0",
     "82.0"
    ],
    [
     "1011",
     "4",
     "16.5",
     "127.0",
     "30.5"
    ]
   ]
  },
  "m6.qualify.duckdb": {
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
  "m6.rank.duckdb": {
   "cols": [
    "day",
    "store_id",
    "revenue",
    "row_num",
    "rnk",
    "dense_rnk"
   ],
   "rows": [
    [
     "2026-03-04",
     "1",
     "60.00",
     "1",
     "1",
     "1"
    ],
    [
     "2026-03-02",
     "1",
     "55.00",
     "2",
     "2",
     "2"
    ],
    [
     "2026-03-05",
     "1",
     "50.00",
     "3",
     "3",
     "3"
    ],
    [
     "2026-03-05",
     "2",
     "50.00",
     "4",
     "3",
     "3"
    ],
    [
     "2026-03-03",
     "2",
     "45.00",
     "5",
     "5",
     "4"
    ],
    [
     "2026-03-01",
     "1",
     "40.00",
     "6",
     "6",
     "5"
    ],
    [
     "2026-03-03",
     "1",
     "35.00",
     "7",
     "7",
     "6"
    ],
    [
     "2026-03-02",
     "2",
     "30.00",
     "8",
     "8",
     "7"
    ],
    [
     "2026-03-01",
     "2",
     "25.00",
     "9",
     "9",
     "8"
    ],
    [
     "2026-03-04",
     "2",
     "20.00",
     "10",
     "10",
     "9"
    ]
   ]
  },
  "m6.rank.postgres": {
   "cols": [
    "day",
    "store_id",
    "revenue",
    "row_num",
    "rnk",
    "dense_rnk"
   ],
   "rows": [
    [
     "2026-03-04",
     "1",
     "60.00",
     "1",
     "1",
     "1"
    ],
    [
     "2026-03-02",
     "1",
     "55.00",
     "2",
     "2",
     "2"
    ],
    [
     "2026-03-05",
     "1",
     "50.00",
     "3",
     "3",
     "3"
    ],
    [
     "2026-03-05",
     "2",
     "50.00",
     "4",
     "3",
     "3"
    ],
    [
     "2026-03-03",
     "2",
     "45.00",
     "5",
     "5",
     "4"
    ],
    [
     "2026-03-01",
     "1",
     "40.00",
     "6",
     "6",
     "5"
    ],
    [
     "2026-03-03",
     "1",
     "35.00",
     "7",
     "7",
     "6"
    ],
    [
     "2026-03-02",
     "2",
     "30.00",
     "8",
     "8",
     "7"
    ],
    [
     "2026-03-01",
     "2",
     "25.00",
     "9",
     "9",
     "8"
    ],
    [
     "2026-03-04",
     "2",
     "20.00",
     "10",
     "10",
     "9"
    ]
   ]
  },
  "m6.rank.sqlite": {
   "cols": [
    "day",
    "store_id",
    "revenue",
    "row_num",
    "rnk",
    "dense_rnk"
   ],
   "rows": [
    [
     "2026-03-04",
     "1",
     "60",
     "1",
     "1",
     "1"
    ],
    [
     "2026-03-02",
     "1",
     "55",
     "2",
     "2",
     "2"
    ],
    [
     "2026-03-05",
     "1",
     "50",
     "3",
     "3",
     "3"
    ],
    [
     "2026-03-05",
     "2",
     "50",
     "4",
     "3",
     "3"
    ],
    [
     "2026-03-03",
     "2",
     "45",
     "5",
     "5",
     "4"
    ],
    [
     "2026-03-01",
     "1",
     "40",
     "6",
     "6",
     "5"
    ],
    [
     "2026-03-03",
     "1",
     "35",
     "7",
     "7",
     "6"
    ],
    [
     "2026-03-02",
     "2",
     "30",
     "8",
     "8",
     "7"
    ],
    [
     "2026-03-01",
     "2",
     "25",
     "9",
     "9",
     "8"
    ],
    [
     "2026-03-04",
     "2",
     "20",
     "10",
     "10",
     "9"
    ]
   ]
  },
  "m6.rank_after_where.duckdb": {
   "cols": [
    "order_id",
    "status",
    "total",
    "rank_paid_only"
   ],
   "rows": [
    [
     "1004",
     "paid",
     "26.00",
     "1"
    ],
    [
     "1010",
     "paid",
     "19.00",
     "2"
    ],
    [
     "1002",
     "paid",
     "18.50",
     "3"
    ],
    [
     "1011",
     "paid",
     "16.50",
     "4"
    ],
    [
     "1006",
     "paid",
     "14.00",
     "5"
    ],
    [
     "1001",
     "paid",
     "11.50",
     "6"
    ],
    [
     "1009",
     "paid",
     "9.50",
     "7"
    ],
    [
     "1007",
     "paid",
     "7.00",
     "8"
    ],
    [
     "1003",
     "paid",
     "5.00",
     "9"
    ]
   ]
  },
  "m6.rank_after_where.postgres": {
   "cols": [
    "order_id",
    "status",
    "total",
    "rank_paid_only"
   ],
   "rows": [
    [
     "1004",
     "paid",
     "26.00",
     "1"
    ],
    [
     "1010",
     "paid",
     "19.00",
     "2"
    ],
    [
     "1002",
     "paid",
     "18.50",
     "3"
    ],
    [
     "1011",
     "paid",
     "16.50",
     "4"
    ],
    [
     "1006",
     "paid",
     "14.00",
     "5"
    ],
    [
     "1001",
     "paid",
     "11.50",
     "6"
    ],
    [
     "1009",
     "paid",
     "9.50",
     "7"
    ],
    [
     "1007",
     "paid",
     "7.00",
     "8"
    ],
    [
     "1003",
     "paid",
     "5.00",
     "9"
    ]
   ]
  },
  "m6.rank_after_where.sqlite": {
   "cols": [
    "order_id",
    "status",
    "total",
    "rank_paid_only"
   ],
   "rows": [
    [
     "1004",
     "paid",
     "26",
     "1"
    ],
    [
     "1010",
     "paid",
     "19",
     "2"
    ],
    [
     "1002",
     "paid",
     "18.5",
     "3"
    ],
    [
     "1011",
     "paid",
     "16.5",
     "4"
    ],
    [
     "1006",
     "paid",
     "14",
     "5"
    ],
    [
     "1001",
     "paid",
     "11.5",
     "6"
    ],
    [
     "1009",
     "paid",
     "9.5",
     "7"
    ],
    [
     "1007",
     "paid",
     "7",
     "8"
    ],
    [
     "1003",
     "paid",
     "5",
     "9"
    ]
   ]
  },
  "m6.rank_all_orders.duckdb": {
   "cols": [
    "order_id",
    "status",
    "total",
    "rank_all"
   ],
   "rows": [
    [
     "1004",
     "paid",
     "26.00",
     "1"
    ],
    [
     "1010",
     "paid",
     "19.00",
     "2"
    ],
    [
     "1002",
     "paid",
     "18.50",
     "3"
    ],
    [
     "1011",
     "paid",
     "16.50",
     "4"
    ],
    [
     "1006",
     "paid",
     "14.00",
     "5"
    ],
    [
     "1008",
     "refunded",
     "12.00",
     "6"
    ],
    [
     "1001",
     "paid",
     "11.50",
     "7"
    ],
    [
     "1009",
     "paid",
     "9.50",
     "8"
    ],
    [
     "1005",
     "cancelled",
     "9.00",
     "9"
    ],
    [
     "1012",
     "pending",
     "8.00",
     "10"
    ],
    [
     "1007",
     "paid",
     "7.00",
     "11"
    ],
    [
     "1003",
     "paid",
     "5.00",
     "12"
    ]
   ]
  },
  "m6.rank_all_orders.postgres": {
   "cols": [
    "order_id",
    "status",
    "total",
    "rank_all"
   ],
   "rows": [
    [
     "1004",
     "paid",
     "26.00",
     "1"
    ],
    [
     "1010",
     "paid",
     "19.00",
     "2"
    ],
    [
     "1002",
     "paid",
     "18.50",
     "3"
    ],
    [
     "1011",
     "paid",
     "16.50",
     "4"
    ],
    [
     "1006",
     "paid",
     "14.00",
     "5"
    ],
    [
     "1008",
     "refunded",
     "12.00",
     "6"
    ],
    [
     "1001",
     "paid",
     "11.50",
     "7"
    ],
    [
     "1009",
     "paid",
     "9.50",
     "8"
    ],
    [
     "1005",
     "cancelled",
     "9.00",
     "9"
    ],
    [
     "1012",
     "pending",
     "8.00",
     "10"
    ],
    [
     "1007",
     "paid",
     "7.00",
     "11"
    ],
    [
     "1003",
     "paid",
     "5.00",
     "12"
    ]
   ]
  },
  "m6.rank_all_orders.sqlite": {
   "cols": [
    "order_id",
    "status",
    "total",
    "rank_all"
   ],
   "rows": [
    [
     "1004",
     "paid",
     "26",
     "1"
    ],
    [
     "1010",
     "paid",
     "19",
     "2"
    ],
    [
     "1002",
     "paid",
     "18.5",
     "3"
    ],
    [
     "1011",
     "paid",
     "16.5",
     "4"
    ],
    [
     "1006",
     "paid",
     "14",
     "5"
    ],
    [
     "1008",
     "refunded",
     "12",
     "6"
    ],
    [
     "1001",
     "paid",
     "11.5",
     "7"
    ],
    [
     "1009",
     "paid",
     "9.5",
     "8"
    ],
    [
     "1005",
     "cancelled",
     "9",
     "9"
    ],
    [
     "1012",
     "pending",
     "8",
     "10"
    ],
    [
     "1007",
     "paid",
     "7",
     "11"
    ],
    [
     "1003",
     "paid",
     "5",
     "12"
    ]
   ]
  },
  "m6.rank_partition.duckdb": {
   "cols": [
    "store_id",
    "day",
    "revenue",
    "rank_in_store"
   ],
   "rows": [
    [
     "1",
     "2026-03-04",
     "60.00",
     "1"
    ],
    [
     "1",
     "2026-03-02",
     "55.00",
     "2"
    ],
    [
     "1",
     "2026-03-05",
     "50.00",
     "3"
    ],
    [
     "1",
     "2026-03-01",
     "40.00",
     "4"
    ],
    [
     "1",
     "2026-03-03",
     "35.00",
     "5"
    ],
    [
     "2",
     "2026-03-05",
     "50.00",
     "1"
    ],
    [
     "2",
     "2026-03-03",
     "45.00",
     "2"
    ],
    [
     "2",
     "2026-03-02",
     "30.00",
     "3"
    ],
    [
     "2",
     "2026-03-01",
     "25.00",
     "4"
    ],
    [
     "2",
     "2026-03-04",
     "20.00",
     "5"
    ]
   ]
  },
  "m6.rank_partition.postgres": {
   "cols": [
    "store_id",
    "day",
    "revenue",
    "rank_in_store"
   ],
   "rows": [
    [
     "1",
     "2026-03-04",
     "60.00",
     "1"
    ],
    [
     "1",
     "2026-03-02",
     "55.00",
     "2"
    ],
    [
     "1",
     "2026-03-05",
     "50.00",
     "3"
    ],
    [
     "1",
     "2026-03-01",
     "40.00",
     "4"
    ],
    [
     "1",
     "2026-03-03",
     "35.00",
     "5"
    ],
    [
     "2",
     "2026-03-05",
     "50.00",
     "1"
    ],
    [
     "2",
     "2026-03-03",
     "45.00",
     "2"
    ],
    [
     "2",
     "2026-03-02",
     "30.00",
     "3"
    ],
    [
     "2",
     "2026-03-01",
     "25.00",
     "4"
    ],
    [
     "2",
     "2026-03-04",
     "20.00",
     "5"
    ]
   ]
  },
  "m6.rank_partition.sqlite": {
   "cols": [
    "store_id",
    "day",
    "revenue",
    "rank_in_store"
   ],
   "rows": [
    [
     "1",
     "2026-03-04",
     "60",
     "1"
    ],
    [
     "1",
     "2026-03-02",
     "55",
     "2"
    ],
    [
     "1",
     "2026-03-05",
     "50",
     "3"
    ],
    [
     "1",
     "2026-03-01",
     "40",
     "4"
    ],
    [
     "1",
     "2026-03-03",
     "35",
     "5"
    ],
    [
     "2",
     "2026-03-05",
     "50",
     "1"
    ],
    [
     "2",
     "2026-03-03",
     "45",
     "2"
    ],
    [
     "2",
     "2026-03-02",
     "30",
     "3"
    ],
    [
     "2",
     "2026-03-01",
     "25",
     "4"
    ],
    [
     "2",
     "2026-03-04",
     "20",
     "5"
    ]
   ]
  },
  "m6.rownum_ties.duckdb": {
   "cols": [
    "day",
    "store_id",
    "revenue",
    "row_num"
   ],
   "rows": [
    [
     "2026-03-04",
     "1",
     "60.00",
     "1"
    ],
    [
     "2026-03-02",
     "1",
     "55.00",
     "2"
    ],
    [
     "2026-03-05",
     "1",
     "50.00",
     "3"
    ],
    [
     "2026-03-05",
     "2",
     "50.00",
     "4"
    ]
   ]
  },
  "m6.rownum_ties.postgres": {
   "cols": [
    "day",
    "store_id",
    "revenue",
    "row_num"
   ],
   "rows": [
    [
     "2026-03-04",
     "1",
     "60.00",
     "1"
    ],
    [
     "2026-03-02",
     "1",
     "55.00",
     "2"
    ],
    [
     "2026-03-05",
     "1",
     "50.00",
     "3"
    ],
    [
     "2026-03-05",
     "2",
     "50.00",
     "4"
    ]
   ]
  },
  "m6.rownum_ties.sqlite": {
   "cols": [
    "day",
    "store_id",
    "revenue",
    "row_num"
   ],
   "rows": [
    [
     "2026-03-04",
     "1",
     "60",
     "1"
    ],
    [
     "2026-03-02",
     "1",
     "55",
     "2"
    ],
    [
     "2026-03-05",
     "1",
     "50",
     "3"
    ],
    [
     "2026-03-05",
     "2",
     "50",
     "4"
    ]
   ]
  },
  "m6.running.duckdb": {
   "cols": [
    "store_id",
    "day",
    "revenue",
    "running_total"
   ],
   "rows": [
    [
     "1",
     "2026-03-01",
     "40.00",
     "40.00"
    ],
    [
     "1",
     "2026-03-02",
     "55.00",
     "95.00"
    ],
    [
     "1",
     "2026-03-03",
     "35.00",
     "130.00"
    ],
    [
     "1",
     "2026-03-04",
     "60.00",
     "190.00"
    ],
    [
     "1",
     "2026-03-05",
     "50.00",
     "240.00"
    ],
    [
     "2",
     "2026-03-01",
     "25.00",
     "25.00"
    ],
    [
     "2",
     "2026-03-02",
     "30.00",
     "55.00"
    ],
    [
     "2",
     "2026-03-03",
     "45.00",
     "100.00"
    ],
    [
     "2",
     "2026-03-04",
     "20.00",
     "120.00"
    ],
    [
     "2",
     "2026-03-05",
     "50.00",
     "170.00"
    ]
   ]
  },
  "m6.running.postgres": {
   "cols": [
    "store_id",
    "day",
    "revenue",
    "running_total"
   ],
   "rows": [
    [
     "1",
     "2026-03-01",
     "40.00",
     "40.00"
    ],
    [
     "1",
     "2026-03-02",
     "55.00",
     "95.00"
    ],
    [
     "1",
     "2026-03-03",
     "35.00",
     "130.00"
    ],
    [
     "1",
     "2026-03-04",
     "60.00",
     "190.00"
    ],
    [
     "1",
     "2026-03-05",
     "50.00",
     "240.00"
    ],
    [
     "2",
     "2026-03-01",
     "25.00",
     "25.00"
    ],
    [
     "2",
     "2026-03-02",
     "30.00",
     "55.00"
    ],
    [
     "2",
     "2026-03-03",
     "45.00",
     "100.00"
    ],
    [
     "2",
     "2026-03-04",
     "20.00",
     "120.00"
    ],
    [
     "2",
     "2026-03-05",
     "50.00",
     "170.00"
    ]
   ]
  },
  "m6.running.sqlite": {
   "cols": [
    "store_id",
    "day",
    "revenue",
    "running_total"
   ],
   "rows": [
    [
     "1",
     "2026-03-01",
     "40",
     "40"
    ],
    [
     "1",
     "2026-03-02",
     "55",
     "95"
    ],
    [
     "1",
     "2026-03-03",
     "35",
     "130"
    ],
    [
     "1",
     "2026-03-04",
     "60",
     "190"
    ],
    [
     "1",
     "2026-03-05",
     "50",
     "240"
    ],
    [
     "2",
     "2026-03-01",
     "25",
     "25"
    ],
    [
     "2",
     "2026-03-02",
     "30",
     "55"
    ],
    [
     "2",
     "2026-03-03",
     "45",
     "100"
    ],
    [
     "2",
     "2026-03-04",
     "20",
     "120"
    ],
    [
     "2",
     "2026-03-05",
     "50",
     "170"
    ]
   ]
  },
  "m6.running_ties.duckdb": {
   "cols": [
    "day",
    "store_id",
    "revenue",
    "default_frame",
    "rows_frame"
   ],
   "rows": [
    [
     "2026-03-04",
     "2",
     "20.00",
     "20.00",
     "20.00"
    ],
    [
     "2026-03-01",
     "2",
     "25.00",
     "45.00",
     "45.00"
    ],
    [
     "2026-03-02",
     "2",
     "30.00",
     "75.00",
     "75.00"
    ],
    [
     "2026-03-03",
     "1",
     "35.00",
     "110.00",
     "110.00"
    ],
    [
     "2026-03-01",
     "1",
     "40.00",
     "150.00",
     "150.00"
    ],
    [
     "2026-03-03",
     "2",
     "45.00",
     "195.00",
     "195.00"
    ],
    [
     "2026-03-05",
     "1",
     "50.00",
     "295.00",
     "245.00"
    ],
    [
     "2026-03-05",
     "2",
     "50.00",
     "295.00",
     "295.00"
    ],
    [
     "2026-03-02",
     "1",
     "55.00",
     "350.00",
     "350.00"
    ],
    [
     "2026-03-04",
     "1",
     "60.00",
     "410.00",
     "410.00"
    ]
   ]
  },
  "m6.running_ties.postgres": {
   "cols": [
    "day",
    "store_id",
    "revenue",
    "default_frame",
    "rows_frame"
   ],
   "rows": [
    [
     "2026-03-04",
     "2",
     "20.00",
     "20.00",
     "20.00"
    ],
    [
     "2026-03-01",
     "2",
     "25.00",
     "45.00",
     "45.00"
    ],
    [
     "2026-03-02",
     "2",
     "30.00",
     "75.00",
     "75.00"
    ],
    [
     "2026-03-03",
     "1",
     "35.00",
     "110.00",
     "110.00"
    ],
    [
     "2026-03-01",
     "1",
     "40.00",
     "150.00",
     "150.00"
    ],
    [
     "2026-03-03",
     "2",
     "45.00",
     "195.00",
     "195.00"
    ],
    [
     "2026-03-05",
     "1",
     "50.00",
     "295.00",
     "245.00"
    ],
    [
     "2026-03-05",
     "2",
     "50.00",
     "295.00",
     "295.00"
    ],
    [
     "2026-03-02",
     "1",
     "55.00",
     "350.00",
     "350.00"
    ],
    [
     "2026-03-04",
     "1",
     "60.00",
     "410.00",
     "410.00"
    ]
   ]
  },
  "m6.running_ties.sqlite": {
   "cols": [
    "day",
    "store_id",
    "revenue",
    "default_frame",
    "rows_frame"
   ],
   "rows": [
    [
     "2026-03-04",
     "2",
     "20",
     "20",
     "20"
    ],
    [
     "2026-03-01",
     "2",
     "25",
     "45",
     "45"
    ],
    [
     "2026-03-02",
     "2",
     "30",
     "75",
     "75"
    ],
    [
     "2026-03-03",
     "1",
     "35",
     "110",
     "110"
    ],
    [
     "2026-03-01",
     "1",
     "40",
     "150",
     "150"
    ],
    [
     "2026-03-03",
     "2",
     "45",
     "195",
     "195"
    ],
    [
     "2026-03-05",
     "1",
     "50",
     "295",
     "245"
    ],
    [
     "2026-03-05",
     "2",
     "50",
     "295",
     "295"
    ],
    [
     "2026-03-02",
     "1",
     "55",
     "350",
     "350"
    ],
    [
     "2026-03-04",
     "1",
     "60",
     "410",
     "410"
    ]
   ]
  },
  "m6.share.duckdb": {
   "cols": [
    "store_id",
    "revenue",
    "share_percent"
   ],
   "rows": [
    [
     "1",
     "82.00",
     "64.6"
    ],
    [
     "4",
     "30.50",
     "24.0"
    ],
    [
     "2",
     "14.50",
     "11.4"
    ]
   ]
  },
  "m6.share.postgres": {
   "cols": [
    "store_id",
    "revenue",
    "share_percent"
   ],
   "rows": [
    [
     "1",
     "82.00",
     "64.6"
    ],
    [
     "4",
     "30.50",
     "24.0"
    ],
    [
     "2",
     "14.50",
     "11.4"
    ]
   ]
  },
  "m6.share.sqlite": {
   "cols": [
    "store_id",
    "revenue",
    "share_percent"
   ],
   "rows": [
    [
     "1",
     "82.0",
     "64.6"
    ],
    [
     "4",
     "30.5",
     "24.0"
    ],
    [
     "2",
     "14.5",
     "11.4"
    ]
   ]
  },
  "m6.top3_cte.duckdb": {
   "cols": [
    "order_id",
    "total",
    "rn"
   ],
   "rows": [
    [
     "1004",
     "26.00",
     "1"
    ],
    [
     "1010",
     "19.00",
     "2"
    ],
    [
     "1002",
     "18.50",
     "3"
    ]
   ]
  },
  "m6.top3_cte.postgres": {
   "cols": [
    "order_id",
    "total",
    "rn"
   ],
   "rows": [
    [
     "1004",
     "26.00",
     "1"
    ],
    [
     "1010",
     "19.00",
     "2"
    ],
    [
     "1002",
     "18.50",
     "3"
    ]
   ]
  },
  "m6.top3_cte.sqlite": {
   "cols": [
    "order_id",
    "total",
    "rn"
   ],
   "rows": [
    [
     "1004",
     "26",
     "1"
    ],
    [
     "1010",
     "19",
     "2"
    ],
    [
     "1002",
     "18.5",
     "3"
    ]
   ]
  },
  "m7.arith_duckdb": {
   "cols": [
    "order_id",
    "first_payment_after",
    "last_payment_after"
   ],
   "rows": [
    [
     "1001",
     "1",
     "1"
    ],
    [
     "1002",
     "1",
     "2"
    ],
    [
     "1003",
     "1",
     "1"
    ],
    [
     "1004",
     "1",
     "1"
    ],
    [
     "1006",
     "1",
     "1"
    ],
    [
     "1007",
     "1",
     "1"
    ],
    [
     "1008",
     "1",
     "280"
    ],
    [
     "1009",
     "1",
     "1"
    ],
    [
     "1010",
     "1",
     "1"
    ],
    [
     "1011",
     "1",
     "1"
    ]
   ]
  },
  "m7.arith_postgres": {
   "cols": [
    "order_id",
    "first_payment_after",
    "last_payment_after"
   ],
   "rows": [
    [
     "1001",
     "1",
     "1"
    ],
    [
     "1002",
     "1",
     "2"
    ],
    [
     "1003",
     "1",
     "1"
    ],
    [
     "1004",
     "1",
     "1"
    ],
    [
     "1006",
     "1",
     "1"
    ],
    [
     "1007",
     "1",
     "1"
    ],
    [
     "1008",
     "1",
     "280"
    ],
    [
     "1009",
     "1",
     "1"
    ],
    [
     "1010",
     "1",
     "1"
    ],
    [
     "1011",
     "1",
     "1"
    ]
   ]
  },
  "m7.arith_sqlite": {
   "cols": [
    "order_id",
    "first_payment_after",
    "last_payment_after"
   ],
   "rows": [
    [
     "1001",
     "1",
     "1"
    ],
    [
     "1002",
     "1",
     "2"
    ],
    [
     "1003",
     "1",
     "1"
    ],
    [
     "1004",
     "1",
     "1"
    ],
    [
     "1006",
     "1",
     "1"
    ],
    [
     "1007",
     "1",
     "1"
    ],
    [
     "1008",
     "1",
     "280"
    ],
    [
     "1009",
     "1",
     "1"
    ],
    [
     "1010",
     "1",
     "1"
    ],
    [
     "1011",
     "1",
     "1"
    ]
   ]
  },
  "m7.arrays_duckdb": {
   "cols": [
    "order_id",
    "products",
    "lines",
    "has_latte"
   ],
   "rows": [
    [
     "1001",
     "[Espresso, Latte]",
     "2",
     "true"
    ],
    [
     "1002",
     "[House beans 250g, Latte]",
     "2",
     "true"
    ],
    [
     "1011",
     "[Latte, Brewline mug]",
     "2",
     "true"
    ]
   ]
  },
  "m7.arrays_postgres": {
   "cols": [
    "order_id",
    "products",
    "lines",
    "has_latte"
   ],
   "rows": [
    [
     "1001",
     "[Espresso, Latte]",
     "2",
     "true"
    ],
    [
     "1002",
     "[House beans 250g, Latte]",
     "2",
     "true"
    ],
    [
     "1011",
     "[Latte, Brewline mug]",
     "2",
     "true"
    ]
   ]
  },
  "m7.arrays_sqlite": {
   "cols": [
    "order_id",
    "products",
    "lines",
    "has_latte"
   ],
   "rows": [
    [
     "1001",
     "[\"Espresso\",\"Latte\"]",
     "2",
     "1"
    ],
    [
     "1002",
     "[\"House beans 250g\",\"Latte\"]",
     "2",
     "1"
    ],
    [
     "1011",
     "[\"Latte\",\"Brewline mug\"]",
     "2",
     "1"
    ]
   ]
  },
  "m7.bytes.postgres": {
   "cols": [
    "s",
    "chars",
    "bytes"
   ],
   "rows": [
    [
     "Zoë",
     "3",
     "4"
    ]
   ]
  },
  "m7.bytes.sqlite": {
   "cols": [
    "s",
    "chars",
    "bytes"
   ],
   "rows": [
    [
     "Zoë",
     "3",
     "4"
    ]
   ]
  },
  "m7.bytes_duckdb": {
   "cols": [
    "s",
    "chars",
    "bytes"
   ],
   "rows": [
    [
     "Zoë",
     "3",
     "4"
    ]
   ]
  },
  "m7.ch_domain.duckdb": {
   "cols": [
    "domain",
    "customers"
   ],
   "rows": [
    [
     "example.com",
     "6"
    ],
    [
     "unknown",
     "2"
    ]
   ]
  },
  "m7.ch_domain.postgres": {
   "cols": [
    "domain",
    "customers"
   ],
   "rows": [
    [
     "example.com",
     "6"
    ],
    [
     "unknown",
     "2"
    ]
   ]
  },
  "m7.ch_firstorder.duckdb": {
   "cols": [
    "customer_id",
    "name",
    "days_to_first_order"
   ],
   "rows": [
    [
     "1",
     "Ana Lim",
     "55"
    ],
    [
     "2",
     "Ben Ortiz",
     "49"
    ],
    [
     "3",
     "Chen Wei",
     "41"
    ],
    [
     "4",
     "Dara Putri",
     "30"
    ],
    [
     "5",
     "Eli Cohen",
     "22"
    ],
    [
     "7",
     "Gus Hall",
     "14"
    ]
   ]
  },
  "m7.ch_firstorder.postgres": {
   "cols": [
    "customer_id",
    "name",
    "days_to_first_order"
   ],
   "rows": [
    [
     "1",
     "Ana Lim",
     "55"
    ],
    [
     "2",
     "Ben Ortiz",
     "49"
    ],
    [
     "3",
     "Chen Wei",
     "41"
    ],
    [
     "4",
     "Dara Putri",
     "30"
    ],
    [
     "5",
     "Eli Cohen",
     "22"
    ],
    [
     "7",
     "Gus Hall",
     "14"
    ]
   ]
  },
  "m7.ch_localday.duckdb": {
   "cols": [
    "store_id",
    "local_day",
    "orders"
   ],
   "rows": [
    [
     "1",
     "2026-03-01",
     "1"
    ],
    [
     "1",
     "2026-03-03",
     "2"
    ],
    [
     "1",
     "2026-03-05",
     "1"
    ],
    [
     "1",
     "2026-03-07",
     "1"
    ],
    [
     "2",
     "2026-03-03",
     "1"
    ],
    [
     "2",
     "2026-03-06",
     "1"
    ],
    [
     "2",
     "2026-03-09",
     "1"
    ],
    [
     "3",
     "2026-03-04",
     "1"
    ],
    [
     "4",
     "2026-03-05",
     "1"
    ],
    [
     "4",
     "2026-03-06",
     "1"
    ],
    [
     "4",
     "2026-03-08",
     "1"
    ]
   ]
  },
  "m7.ch_localday.postgres": {
   "cols": [
    "store_id",
    "local_day",
    "orders"
   ],
   "rows": [
    [
     "1",
     "2026-03-01",
     "1"
    ],
    [
     "1",
     "2026-03-03",
     "2"
    ],
    [
     "1",
     "2026-03-05",
     "1"
    ],
    [
     "1",
     "2026-03-07",
     "1"
    ],
    [
     "2",
     "2026-03-03",
     "1"
    ],
    [
     "2",
     "2026-03-06",
     "1"
    ],
    [
     "2",
     "2026-03-09",
     "1"
    ],
    [
     "3",
     "2026-03-04",
     "1"
    ],
    [
     "4",
     "2026-03-05",
     "1"
    ],
    [
     "4",
     "2026-03-06",
     "1"
    ],
    [
     "4",
     "2026-03-08",
     "1"
    ]
   ]
  },
  "m7.collation.duckdb": {
   "cols": [
    "word"
   ],
   "rows": [
    [
     "Apple"
    ],
    [
     "Banana"
    ],
    [
     "apple"
    ],
    [
     "banana"
    ],
    [
     "cherry"
    ],
    [
     "Éclair"
    ]
   ]
  },
  "m7.collation.postgres": {
   "cols": [
    "word"
   ],
   "rows": [
    [
     "Apple"
    ],
    [
     "Banana"
    ],
    [
     "apple"
    ],
    [
     "banana"
    ],
    [
     "cherry"
    ],
    [
     "Éclair"
    ]
   ]
  },
  "m7.collation.sqlite": {
   "cols": [
    "word"
   ],
   "rows": [
    [
     "Apple"
    ],
    [
     "Banana"
    ],
    [
     "apple"
    ],
    [
     "banana"
    ],
    [
     "cherry"
    ],
    [
     "Éclair"
    ]
   ]
  },
  "m7.collation_en": {
   "cols": [
    "word"
   ],
   "rows": [
    [
     "apple"
    ],
    [
     "Apple"
    ],
    [
     "banana"
    ],
    [
     "Banana"
    ],
    [
     "cherry"
    ],
    [
     "Éclair"
    ]
   ]
  },
  "m7.collation_icu": {
   "cols": [
    "word"
   ],
   "rows": [
    [
     "apple"
    ],
    [
     "Apple"
    ],
    [
     "banana"
    ],
    [
     "Banana"
    ],
    [
     "cherry"
    ],
    [
     "Éclair"
    ]
   ]
  },
  "m7.collation_nocase.duckdb": {
   "cols": [
    "word"
   ],
   "rows": [
    [
     "Apple"
    ],
    [
     "apple"
    ],
    [
     "Banana"
    ],
    [
     "banana"
    ],
    [
     "cherry"
    ],
    [
     "Éclair"
    ]
   ]
  },
  "m7.collation_nocase.sqlite": {
   "cols": [
    "word"
   ],
   "rows": [
    [
     "Apple"
    ],
    [
     "apple"
    ],
    [
     "Banana"
    ],
    [
     "banana"
    ],
    [
     "cherry"
    ],
    [
     "Éclair"
    ]
   ]
  },
  "m7.domain.duckdb": {
   "cols": [
    "customer_id",
    "email",
    "domain"
   ],
   "rows": [
    [
     "1",
     "ana@example.com",
     "example.com"
    ],
    [
     "2",
     "NULL",
     "NULL"
    ],
    [
     "3",
     "chen@example.com",
     "example.com"
    ],
    [
     "4",
     "dara@example.com",
     "example.com"
    ],
    [
     "5",
     "eli@example.com",
     "example.com"
    ],
    [
     "6",
     "NULL",
     "NULL"
    ],
    [
     "7",
     "gus@example.com",
     "example.com"
    ],
    [
     "8",
     "hana@example.com",
     "example.com"
    ]
   ]
  },
  "m7.domain.postgres": {
   "cols": [
    "customer_id",
    "email",
    "domain"
   ],
   "rows": [
    [
     "1",
     "ana@example.com",
     "example.com"
    ],
    [
     "2",
     "NULL",
     "NULL"
    ],
    [
     "3",
     "chen@example.com",
     "example.com"
    ],
    [
     "4",
     "dara@example.com",
     "example.com"
    ],
    [
     "5",
     "eli@example.com",
     "example.com"
    ],
    [
     "6",
     "NULL",
     "NULL"
    ],
    [
     "7",
     "gus@example.com",
     "example.com"
    ],
    [
     "8",
     "hana@example.com",
     "example.com"
    ]
   ]
  },
  "m7.domain_sqlite": {
   "cols": [
    "customer_id",
    "email",
    "domain"
   ],
   "rows": [
    [
     "1",
     "ana@example.com",
     "example.com"
    ],
    [
     "2",
     "NULL",
     "NULL"
    ],
    [
     "3",
     "chen@example.com",
     "example.com"
    ],
    [
     "4",
     "dara@example.com",
     "example.com"
    ],
    [
     "5",
     "eli@example.com",
     "example.com"
    ],
    [
     "6",
     "NULL",
     "NULL"
    ],
    [
     "7",
     "gus@example.com",
     "example.com"
    ],
    [
     "8",
     "hana@example.com",
     "example.com"
    ]
   ]
  },
  "m7.fmt": {
   "cols": [
    "minute_text",
    "month_text"
   ],
   "rows": [
    [
     "2026-03-01 02:15",
     "2026-03"
    ]
   ]
  },
  "m7.fmt_postgres": {
   "cols": [
    "minute_text",
    "month_text"
   ],
   "rows": [
    [
     "2026-03-01 02:15",
     "2026-03"
    ]
   ]
  },
  "m7.fmt_sqlite": {
   "cols": [
    "minute_text",
    "month_text"
   ],
   "rows": [
    [
     "2026-03-01 02:15",
     "2026-03"
    ]
   ]
  },
  "m7.json_data.duckdb": {
   "cols": [
    "event_id",
    "payload"
   ],
   "rows": [
    [
     "1",
     "{\"device\":\"ios\",\"country\":\"SG\",\"cart\":{\"items\":[{\"sku\":\"ESP-01\",\"qty\":2},{\"sku\":\"LAT-01\",\"qty\":1}],\"coupon\":null}}"
    ],
    [
     "2",
     "{\"device\":\"android\",\"country\":\"MY\",\"cart\":{\"items\":[{\"sku\":\"BEA-01\",\"qty\":1}],\"coupon\":\"WELCOME\"}}"
    ],
    [
     "3",
     "{\"device\":\"web\",\"country\":\"SG\",\"cart\":{\"items\":[]}}"
    ],
    [
     "4",
     "{\"device\":\"ios\",\"country\":\"ID\"}"
    ]
   ]
  },
  "m7.json_data.postgres": {
   "cols": [
    "event_id",
    "payload"
   ],
   "rows": [
    [
     "1",
     "{\"device\":\"ios\",\"country\":\"SG\",\"cart\":{\"items\":[{\"sku\":\"ESP-01\",\"qty\":2},{\"sku\":\"LAT-01\",\"qty\":1}],\"coupon\":null}}"
    ],
    [
     "2",
     "{\"device\":\"android\",\"country\":\"MY\",\"cart\":{\"items\":[{\"sku\":\"BEA-01\",\"qty\":1}],\"coupon\":\"WELCOME\"}}"
    ],
    [
     "3",
     "{\"device\":\"web\",\"country\":\"SG\",\"cart\":{\"items\":[]}}"
    ],
    [
     "4",
     "{\"device\":\"ios\",\"country\":\"ID\"}"
    ]
   ]
  },
  "m7.json_data.sqlite": {
   "cols": [
    "event_id",
    "payload"
   ],
   "rows": [
    [
     "1",
     "{\"device\":\"ios\",\"country\":\"SG\",\"cart\":{\"items\":[{\"sku\":\"ESP-01\",\"qty\":2},{\"sku\":\"LAT-01\",\"qty\":1}],\"coupon\":null}}"
    ],
    [
     "2",
     "{\"device\":\"android\",\"country\":\"MY\",\"cart\":{\"items\":[{\"sku\":\"BEA-01\",\"qty\":1}],\"coupon\":\"WELCOME\"}}"
    ],
    [
     "3",
     "{\"device\":\"web\",\"country\":\"SG\",\"cart\":{\"items\":[]}}"
    ],
    [
     "4",
     "{\"device\":\"ios\",\"country\":\"ID\"}"
    ]
   ]
  },
  "m7.json_fields_duckdb": {
   "cols": [
    "event_id",
    "device",
    "coupon",
    "items"
   ],
   "rows": [
    [
     "1",
     "ios",
     "NULL",
     "2"
    ],
    [
     "2",
     "android",
     "WELCOME",
     "1"
    ],
    [
     "3",
     "web",
     "NULL",
     "0"
    ],
    [
     "4",
     "ios",
     "NULL",
     "NULL"
    ]
   ]
  },
  "m7.json_fields_postgres": {
   "cols": [
    "event_id",
    "device",
    "coupon",
    "items"
   ],
   "rows": [
    [
     "1",
     "ios",
     "NULL",
     "2"
    ],
    [
     "2",
     "android",
     "WELCOME",
     "1"
    ],
    [
     "3",
     "web",
     "NULL",
     "0"
    ],
    [
     "4",
     "ios",
     "NULL",
     "NULL"
    ]
   ]
  },
  "m7.json_fields_sqlite": {
   "cols": [
    "event_id",
    "device",
    "coupon",
    "items"
   ],
   "rows": [
    [
     "1",
     "ios",
     "NULL",
     "2"
    ],
    [
     "2",
     "android",
     "WELCOME",
     "1"
    ],
    [
     "3",
     "web",
     "NULL",
     "0"
    ],
    [
     "4",
     "ios",
     "NULL",
     "NULL"
    ]
   ]
  },
  "m7.json_flat_duckdb": {
   "cols": [
    "event_id",
    "sku",
    "qty"
   ],
   "rows": [
    [
     "1",
     "ESP-01",
     "2"
    ],
    [
     "1",
     "LAT-01",
     "1"
    ],
    [
     "2",
     "BEA-01",
     "1"
    ]
   ]
  },
  "m7.json_flat_left_duckdb": {
   "cols": [
    "event_id",
    "sku",
    "qty"
   ],
   "rows": [
    [
     "1",
     "ESP-01",
     "2"
    ],
    [
     "1",
     "LAT-01",
     "1"
    ],
    [
     "2",
     "BEA-01",
     "1"
    ],
    [
     "3",
     "NULL",
     "NULL"
    ],
    [
     "4",
     "NULL",
     "NULL"
    ]
   ]
  },
  "m7.json_flat_left_postgres": {
   "cols": [
    "event_id",
    "sku",
    "qty"
   ],
   "rows": [
    [
     "1",
     "ESP-01",
     "2"
    ],
    [
     "1",
     "LAT-01",
     "1"
    ],
    [
     "2",
     "BEA-01",
     "1"
    ],
    [
     "3",
     "NULL",
     "NULL"
    ],
    [
     "4",
     "NULL",
     "NULL"
    ]
   ]
  },
  "m7.json_flat_left_sqlite": {
   "cols": [
    "event_id",
    "sku",
    "qty"
   ],
   "rows": [
    [
     "1",
     "ESP-01",
     "2"
    ],
    [
     "1",
     "LAT-01",
     "1"
    ],
    [
     "2",
     "BEA-01",
     "1"
    ],
    [
     "3",
     "NULL",
     "NULL"
    ],
    [
     "4",
     "NULL",
     "NULL"
    ]
   ]
  },
  "m7.json_flat_postgres": {
   "cols": [
    "event_id",
    "sku",
    "qty"
   ],
   "rows": [
    [
     "1",
     "ESP-01",
     "2"
    ],
    [
     "1",
     "LAT-01",
     "1"
    ],
    [
     "2",
     "BEA-01",
     "1"
    ]
   ]
  },
  "m7.json_flat_sqlite": {
   "cols": [
    "event_id",
    "sku",
    "qty"
   ],
   "rows": [
    [
     "1",
     "ESP-01",
     "2"
    ],
    [
     "1",
     "LAT-01",
     "1"
    ],
    [
     "2",
     "BEA-01",
     "1"
    ]
   ]
  },
  "m7.month_end.duckdb": {
   "cols": [
    "plus_one_month",
    "minus_one_month"
   ],
   "rows": [
    [
     "2026-02-28",
     "2026-02-28"
    ]
   ]
  },
  "m7.month_end.postgres": {
   "cols": [
    "plus_one_month",
    "minus_one_month"
   ],
   "rows": [
    [
     "2026-02-28",
     "2026-02-28"
    ]
   ]
  },
  "m7.month_end_sqlite": {
   "cols": [
    "plus_one_month",
    "minus_one_month"
   ],
   "rows": [
    [
     "2026-03-03",
     "2026-03-03"
    ]
   ]
  },
  "m7.parts.duckdb": {
   "cols": [
    "order_id",
    "order_ts",
    "isodow",
    "dow",
    "iso_week"
   ],
   "rows": [
    [
     "1001",
     "2026-03-01 02:15:00",
     "7",
     "0",
     "9"
    ],
    [
     "1002",
     "2026-03-03 09:40:00",
     "2",
     "2",
     "10"
    ],
    [
     "1011",
     "2026-03-08 04:45:00",
     "7",
     "0",
     "10"
    ]
   ]
  },
  "m7.parts.postgres": {
   "cols": [
    "order_id",
    "order_ts",
    "isodow",
    "dow",
    "iso_week"
   ],
   "rows": [
    [
     "1001",
     "2026-03-01 02:15:00",
     "7",
     "0",
     "9"
    ],
    [
     "1002",
     "2026-03-03 09:40:00",
     "2",
     "2",
     "10"
    ],
    [
     "1011",
     "2026-03-08 04:45:00",
     "7",
     "0",
     "10"
    ]
   ]
  },
  "m7.parts_sqlite": {
   "cols": [
    "order_id",
    "order_ts",
    "isodow",
    "dow",
    "iso_week",
    "week_monday_first"
   ],
   "rows": [
    [
     "1001",
     "2026-03-01 02:15:00",
     "7",
     "0",
     "9",
     "8"
    ],
    [
     "1002",
     "2026-03-03 09:40:00",
     "2",
     "2",
     "10",
     "9"
    ],
    [
     "1011",
     "2026-03-08 04:45:00",
     "7",
     "0",
     "10",
     "9"
    ]
   ]
  },
  "m7.regex.duckdb": {
   "cols": [
    "name",
    "masked"
   ],
   "rows": [
    [
     "Ana Lim",
     "An* L*m"
    ],
    [
     "Ben Ortiz",
     "B*n Ort*z"
    ],
    [
     "Chen Wei",
     "Ch*n W**"
    ],
    [
     "Dara Putri",
     "D*r* P*tr*"
    ],
    [
     "Eli Cohen",
     "El* C*h*n"
    ],
    [
     "Fay Tan",
     "F*y T*n"
    ],
    [
     "Gus Hall",
     "G*s H*ll"
    ],
    [
     "Hana Ito",
     "H*n* It*"
    ]
   ]
  },
  "m7.regex.postgres": {
   "cols": [
    "name",
    "masked"
   ],
   "rows": [
    [
     "Ana Lim",
     "An* L*m"
    ],
    [
     "Ben Ortiz",
     "B*n Ort*z"
    ],
    [
     "Chen Wei",
     "Ch*n W**"
    ],
    [
     "Dara Putri",
     "D*r* P*tr*"
    ],
    [
     "Eli Cohen",
     "El* C*h*n"
    ],
    [
     "Fay Tan",
     "F*y T*n"
    ],
    [
     "Gus Hall",
     "G*s H*ll"
    ],
    [
     "Hana Ito",
     "H*n* It*"
    ]
   ]
  },
  "m7.shift.duckdb": {
   "cols": [
    "order_id",
    "order_ts",
    "refund_deadline",
    "refund_deadline_day"
   ],
   "rows": [
    [
     "1001",
     "2026-03-01 02:15:00",
     "2026-03-08 02:15:00",
     "2026-03-08"
    ],
    [
     "1004",
     "2026-03-02 23:50:00",
     "2026-03-09 23:50:00",
     "2026-03-09"
    ]
   ]
  },
  "m7.shift.postgres": {
   "cols": [
    "order_id",
    "order_ts",
    "refund_deadline",
    "refund_deadline_day"
   ],
   "rows": [
    [
     "1001",
     "2026-03-01 02:15:00",
     "2026-03-08 02:15:00",
     "2026-03-08"
    ],
    [
     "1004",
     "2026-03-02 23:50:00",
     "2026-03-09 23:50:00",
     "2026-03-09"
    ]
   ]
  },
  "m7.strings.duckdb": {
   "cols": [
    "customer_id",
    "name",
    "shouted",
    "chars",
    "first3",
    "handle"
   ],
   "rows": [
    [
     "1",
     "Ana Lim",
     "ANA LIM",
     "7",
     "Ana",
     "ana.lim"
    ],
    [
     "2",
     "Ben Ortiz",
     "BEN ORTIZ",
     "9",
     "Ben",
     "ben.ortiz"
    ],
    [
     "3",
     "Chen Wei",
     "CHEN WEI",
     "8",
     "Che",
     "chen.wei"
    ],
    [
     "4",
     "Dara Putri",
     "DARA PUTRI",
     "10",
     "Dar",
     "dara.putri"
    ],
    [
     "5",
     "Eli Cohen",
     "ELI COHEN",
     "9",
     "Eli",
     "eli.cohen"
    ],
    [
     "6",
     "Fay Tan",
     "FAY TAN",
     "7",
     "Fay",
     "fay.tan"
    ],
    [
     "7",
     "Gus Hall",
     "GUS HALL",
     "8",
     "Gus",
     "gus.hall"
    ],
    [
     "8",
     "Hana Ito",
     "HANA ITO",
     "8",
     "Han",
     "hana.ito"
    ]
   ]
  },
  "m7.strings.postgres": {
   "cols": [
    "customer_id",
    "name",
    "shouted",
    "chars",
    "first3",
    "handle"
   ],
   "rows": [
    [
     "1",
     "Ana Lim",
     "ANA LIM",
     "7",
     "Ana",
     "ana.lim"
    ],
    [
     "2",
     "Ben Ortiz",
     "BEN ORTIZ",
     "9",
     "Ben",
     "ben.ortiz"
    ],
    [
     "3",
     "Chen Wei",
     "CHEN WEI",
     "8",
     "Che",
     "chen.wei"
    ],
    [
     "4",
     "Dara Putri",
     "DARA PUTRI",
     "10",
     "Dar",
     "dara.putri"
    ],
    [
     "5",
     "Eli Cohen",
     "ELI COHEN",
     "9",
     "Eli",
     "eli.cohen"
    ],
    [
     "6",
     "Fay Tan",
     "FAY TAN",
     "7",
     "Fay",
     "fay.tan"
    ],
    [
     "7",
     "Gus Hall",
     "GUS HALL",
     "8",
     "Gus",
     "gus.hall"
    ],
    [
     "8",
     "Hana Ito",
     "HANA ITO",
     "8",
     "Han",
     "hana.ito"
    ]
   ]
  },
  "m7.strings.sqlite": {
   "cols": [
    "customer_id",
    "name",
    "shouted",
    "chars",
    "first3",
    "handle"
   ],
   "rows": [
    [
     "1",
     "Ana Lim",
     "ANA LIM",
     "7",
     "Ana",
     "ana.lim"
    ],
    [
     "2",
     "Ben Ortiz",
     "BEN ORTIZ",
     "9",
     "Ben",
     "ben.ortiz"
    ],
    [
     "3",
     "Chen Wei",
     "CHEN WEI",
     "8",
     "Che",
     "chen.wei"
    ],
    [
     "4",
     "Dara Putri",
     "DARA PUTRI",
     "10",
     "Dar",
     "dara.putri"
    ],
    [
     "5",
     "Eli Cohen",
     "ELI COHEN",
     "9",
     "Eli",
     "eli.cohen"
    ],
    [
     "6",
     "Fay Tan",
     "FAY TAN",
     "7",
     "Fay",
     "fay.tan"
    ],
    [
     "7",
     "Gus Hall",
     "GUS HALL",
     "8",
     "Gus",
     "gus.hall"
    ],
    [
     "8",
     "Hana Ito",
     "HANA ITO",
     "8",
     "Han",
     "hana.ito"
    ]
   ]
  },
  "m7.trunc.duckdb": {
   "cols": [
    "week_start",
    "orders",
    "revenue"
   ],
   "rows": [
    [
     "2026-02-23 00:00:00",
     "1",
     "11.50"
    ],
    [
     "2026-03-02 00:00:00",
     "10",
     "136.50"
    ],
    [
     "2026-03-09 00:00:00",
     "1",
     "8.00"
    ]
   ]
  },
  "m7.trunc.postgres": {
   "cols": [
    "week_start",
    "orders",
    "revenue"
   ],
   "rows": [
    [
     "2026-02-23 00:00:00",
     "1",
     "11.50"
    ],
    [
     "2026-03-02 00:00:00",
     "10",
     "136.50"
    ],
    [
     "2026-03-09 00:00:00",
     "1",
     "8.00"
    ]
   ]
  },
  "m7.trunc_sqlite": {
   "cols": [
    "week_start",
    "orders",
    "revenue"
   ],
   "rows": [
    [
     "2026-02-23",
     "1",
     "11.5"
    ],
    [
     "2026-03-02",
     "10",
     "136.5"
    ],
    [
     "2026-03-09",
     "1",
     "8"
    ]
   ]
  },
  "m7.tz_day.duckdb": {
   "cols": [
    "order_id",
    "utc_day",
    "local_day"
   ],
   "rows": [
    [
     "1003",
     "2026-03-02",
     "2026-03-03"
    ],
    [
     "1004",
     "2026-03-02",
     "2026-03-03"
    ],
    [
     "1006",
     "2026-03-04",
     "2026-03-05"
    ]
   ]
  },
  "m7.tz_day.postgres": {
   "cols": [
    "order_id",
    "utc_day",
    "local_day"
   ],
   "rows": [
    [
     "1003",
     "2026-03-02",
     "2026-03-03"
    ],
    [
     "1004",
     "2026-03-02",
     "2026-03-03"
    ],
    [
     "1006",
     "2026-03-04",
     "2026-03-05"
    ]
   ]
  },
  "m7.tz_local.duckdb": {
   "cols": [
    "order_id",
    "store_id",
    "tz",
    "utc_ts",
    "local_ts"
   ],
   "rows": [
    [
     "1001",
     "1",
     "Asia/Singapore",
     "2026-03-01 02:15:00",
     "2026-03-01 10:15:00"
    ],
    [
     "1002",
     "1",
     "Asia/Singapore",
     "2026-03-03 09:40:00",
     "2026-03-03 17:40:00"
    ],
    [
     "1003",
     "2",
     "Asia/Kuala_Lumpur",
     "2026-03-02 16:30:00",
     "2026-03-03 00:30:00"
    ],
    [
     "1004",
     "1",
     "Asia/Singapore",
     "2026-03-02 23:50:00",
     "2026-03-03 07:50:00"
    ],
    [
     "1005",
     "3",
     "Asia/Jakarta",
     "2026-03-04 03:05:00",
     "2026-03-04 10:05:00"
    ],
    [
     "1006",
     "4",
     "Australia/Sydney",
     "2026-03-04 21:10:00",
     "2026-03-05 08:10:00"
    ],
    [
     "1007",
     "1",
     "Asia/Singapore",
     "2026-03-05 08:00:00",
     "2026-03-05 16:00:00"
    ],
    [
     "1008",
     "4",
     "Australia/Sydney",
     "2026-03-06 10:20:00",
     "2026-03-06 21:20:00"
    ],
    [
     "1009",
     "2",
     "Asia/Kuala_Lumpur",
     "2026-03-06 11:00:00",
     "2026-03-06 19:00:00"
    ],
    [
     "1010",
     "1",
     "Asia/Singapore",
     "2026-03-07 12:30:00",
     "2026-03-07 20:30:00"
    ],
    [
     "1011",
     "4",
     "Australia/Sydney",
     "2026-03-08 04:45:00",
     "2026-03-08 15:45:00"
    ],
    [
     "1012",
     "2",
     "Asia/Kuala_Lumpur",
     "2026-03-09 15:00:00",
     "2026-03-09 23:00:00"
    ]
   ]
  },
  "m7.tz_local.postgres": {
   "cols": [
    "order_id",
    "store_id",
    "tz",
    "utc_ts",
    "local_ts"
   ],
   "rows": [
    [
     "1001",
     "1",
     "Asia/Singapore",
     "2026-03-01 02:15:00",
     "2026-03-01 10:15:00"
    ],
    [
     "1002",
     "1",
     "Asia/Singapore",
     "2026-03-03 09:40:00",
     "2026-03-03 17:40:00"
    ],
    [
     "1003",
     "2",
     "Asia/Kuala_Lumpur",
     "2026-03-02 16:30:00",
     "2026-03-03 00:30:00"
    ],
    [
     "1004",
     "1",
     "Asia/Singapore",
     "2026-03-02 23:50:00",
     "2026-03-03 07:50:00"
    ],
    [
     "1005",
     "3",
     "Asia/Jakarta",
     "2026-03-04 03:05:00",
     "2026-03-04 10:05:00"
    ],
    [
     "1006",
     "4",
     "Australia/Sydney",
     "2026-03-04 21:10:00",
     "2026-03-05 08:10:00"
    ],
    [
     "1007",
     "1",
     "Asia/Singapore",
     "2026-03-05 08:00:00",
     "2026-03-05 16:00:00"
    ],
    [
     "1008",
     "4",
     "Australia/Sydney",
     "2026-03-06 10:20:00",
     "2026-03-06 21:20:00"
    ],
    [
     "1009",
     "2",
     "Asia/Kuala_Lumpur",
     "2026-03-06 11:00:00",
     "2026-03-06 19:00:00"
    ],
    [
     "1010",
     "1",
     "Asia/Singapore",
     "2026-03-07 12:30:00",
     "2026-03-07 20:30:00"
    ],
    [
     "1011",
     "4",
     "Australia/Sydney",
     "2026-03-08 04:45:00",
     "2026-03-08 15:45:00"
    ],
    [
     "1012",
     "2",
     "Asia/Kuala_Lumpur",
     "2026-03-09 15:00:00",
     "2026-03-09 23:00:00"
    ]
   ]
  },
  "m7.tz_sqlite": {
   "cols": [
    "order_id",
    "utc_ts",
    "singapore_ts"
   ],
   "rows": [
    [
     "1001",
     "2026-03-01 02:15:00",
     "2026-03-01 10:15:00"
    ],
    [
     "1002",
     "2026-03-03 09:40:00",
     "2026-03-03 17:40:00"
    ],
    [
     "1004",
     "2026-03-02 23:50:00",
     "2026-03-03 07:50:00"
    ],
    [
     "1007",
     "2026-03-05 08:00:00",
     "2026-03-05 16:00:00"
    ],
    [
     "1010",
     "2026-03-07 12:30:00",
     "2026-03-07 20:30:00"
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
  "m4.rollup_sqlite.error": "no such function: ROLLUP",
  "m5.plan.duck_corr": "HASH_JOIN RIGHT   (customer_id IS NOT DISTINCT FROM customer_id, rows 3000)\n  PERFECT_HASH_GROUP_BY   (groups: #0, aggregates: max(#1), rows 3000)\n    SCAN big_orders   (scanned 30000, rows 30000)\n  SCAN big_customers   (scanned 3000, rows 3000)",
  "m5.plan.duck_exists": "HASH_JOIN RIGHT_SEMI   (customer_id = customer_id, rows 90)\n  SCAN big_orders   (filter: (status = 'refunded'), scanned 30000, rows 900)\n  SCAN big_customers   (scanned 3000, rows 3000)",
  "m5.plan.duck_once": "SCAN big_orders   (filter: (order_id = 12345), scanned 15664, rows 1)",
  "m5.plan.duck_twice": "CTE   (cte name: s, table index: 0, execution mode: HYBRID_FANOUT, fanout mode: DIRECT, consumers: 1, direct consumers: 1, buffered consumers: 0, chunk storage: NONE, order mode: UNORDERED, materialized consumers: 1, rows 0)\n  PERFECT_HASH_GROUP_BY   (groups: #0, aggregates: sum(#1), rows 4)\n    SCAN big_orders   (filter: (status = 'paid'), scanned 30000, rows 27315)\n  ORDER_BY store_id ASC   (rows 4)\n    CROSS_PRODUCT   (rows 4)\n      CTE_SCAN   (cte index: 0, rows 4)\n      UNGROUPED_AGGREGATE   (aggregates: sum(#0), rows 1)\n        CTE_SCAN   (cte index: 0, cte mode: DIRECT, consumer: 1, rows 4)",
  "m5.plan.pg_corr_index": "Seq Scan on big_customers c (actual rows=3000 loops=1)\n  SubPlan 1\n    ->  Aggregate (actual rows=1 loops=3000)\n          ->  Bitmap Heap Scan on big_orders o (actual rows=10 loops=3000)\n                Recheck Cond: (customer_id = c.customer_id)\n                Heap Blocks: exact=30000\n                ->  Bitmap Index Scan on big_orders_cust (actual rows=10 loops=3000)\n                      Index Cond: (customer_id = c.customer_id)",
  "m5.plan.pg_corr_noindex": "Seq Scan on big_customers c (actual rows=3000 loops=1)\n  SubPlan 1\n    ->  Aggregate (actual rows=1 loops=3000)\n          ->  Seq Scan on big_orders o (actual rows=10 loops=3000)\n                Filter: (customer_id = c.customer_id)\n                Rows Removed by Filter: 29990",
  "m5.plan.pg_exists": "Hash Semi Join (actual rows=90 loops=1)\n  Hash Cond: (c.customer_id = o.customer_id)\n  ->  Seq Scan on big_customers c (actual rows=3000 loops=1)\n  ->  Hash (actual rows=900 loops=1)\n        Buckets: 1024  Batches: 1  Memory Usage: 40kB\n        ->  Seq Scan on big_orders o (actual rows=900 loops=1)\n              Filter: (status = 'refunded'::text)\n              Rows Removed by Filter: 29100",
  "m5.plan.pg_inlined_index": "Index Scan using big_orders_id on big_orders (actual rows=1 loops=1)\n  Index Cond: (order_id = 12345)",
  "m5.plan.pg_inlined_noindex": "Seq Scan on big_orders (actual rows=1 loops=1)\n  Filter: (order_id = 12345)\n  Rows Removed by Filter: 29999",
  "m5.plan.pg_materialized_index": "CTE Scan on o (actual rows=1 loops=1)\n  Filter: (order_id = 12345)\n  Rows Removed by Filter: 29999\n  CTE o\n    ->  Seq Scan on big_orders (actual rows=30000 loops=1)",
  "m5.plan.pg_materialized_noindex": "CTE Scan on o (actual rows=1 loops=1)\n  Filter: (order_id = 12345)\n  Rows Removed by Filter: 29999\n  CTE o\n    ->  Seq Scan on big_orders (actual rows=30000 loops=1)",
  "m5.plan.pg_twice": "Sort (actual rows=4 loops=1)\n  Sort Key: a.store_id\n  Sort Method: quicksort  Memory: 25kB\n  CTE s\n    ->  HashAggregate (actual rows=4 loops=1)\n          Group Key: big_orders.store_id\n          Batches: 1  Memory Usage: 24kB\n          ->  Seq Scan on big_orders (actual rows=27315 loops=1)\n                Filter: (status = 'paid'::text)\n                Rows Removed by Filter: 2685\n  InitPlan 2 (returns $1)\n    ->  Aggregate (actual rows=1 loops=1)\n          ->  CTE Scan on s (actual rows=4 loops=1)\n  ->  CTE Scan on s a (actual rows=4 loops=1)",
  "m5.scalar_many.duckdb.error": "Invalid Input Error: More than one row returned by a subquery used as an expression - scalar subqueries can only return a single row.",
  "m5.scalar_many.postgres.error": "more than one row returned by a subquery used as an expression",
  "m6.plan.duck": "WINDOW row_number() OVER (PARTITION BY customer_id ORDER BY order_ts ASC NULLS LAST)   (rows 30000)\n  SCAN big_orders   (scanned 30000, rows 30000)",
  "m6.plan.pg_index": "WindowAgg (actual rows=30000 loops=1)\n  ->  Index Scan using big_orders_cust_ts on big_orders (actual rows=30000 loops=1)",
  "m6.plan.pg_noindex": "WindowAgg (actual rows=30000 loops=1)\n  ->  Sort (actual rows=30000 loops=1)\n        Sort Key: customer_id, order_ts\n        Sort Method: quicksort  Memory: 2175kB\n        ->  Seq Scan on big_orders (actual rows=30000 loops=1)",
  "m6.qualify.postgres.error": "syntax error at or near \"QUALIFY\"",
  "m6.qualify.sqlite.error": "near \"QUALIFY\": syntax error",
  "m6.where_error.duckdb.error": "Binder Error: WHERE clause cannot contain window functions!",
  "m6.where_error.postgres.error": "window functions are not allowed in WHERE",
  "m6.where_error.sqlite.error": "misuse of window function ROW_NUMBER()",
  "m7.regex.sqlite.error": "no such function: regexp_replace",
  "m7.tz_sqlite_error.error": "near \"TIME\": syntax error"
 }
};
