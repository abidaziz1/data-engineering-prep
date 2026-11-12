/* Everything the Python tutorial quotes as output. Written by python/verify/capture_py.py: do not edit by hand.
   Real runs of Python and its libraries on one machine with made-up Brewline data. Timings are medians from that machine. */
window.LAB = window.LAB || {};
LAB.real = {
 "meta": {
  "python": "3.14.6",
  "python_build": "3.14.6 (main, Jul 18 2026, 17:01:31) [Clang 22.1.3 ]",
  "implementation": "CPython",
  "platform": "Linux-6.18.44-fc-v378-x86_64-with-glibc2.39",
  "cpus": 4,
  "uv": "0.11.32",
  "pandas": "3.1.1",
  "numpy": "2.5.4",
  "polars": "2.1.0",
  "pyarrow": "26.0.1",
  "duckdb": "2.0.0",
  "sqlalchemy": "2.1.8",
  "pydantic": "2.14.3",
  "pydantic_core": "2.50.4",
  "mypy": "2.4.1",
  "ruff": "0.17.4",
  "pytest": "9.2.0",
  "pytest-cov": "7.1.0",
  "hypothesis": "6.170.15",
  "requests": "2.34.2",
  "httpx": "0.28.1",
  "tenacity": "9.2.1",
  "typer": "0.29.1",
  "psutil": "7.2.2",
  "tzdata": "2026.6",
  "python-dateutil": "4.0.0",
  "packaging": "26.3",
  "captured": "2026-11-12",
  "python_free_threaded": "3.14.6"
 },
 "files": {
  "m1_fragile_script.py": "\"\"\"load_orders_v7.py: the script that Brewline runs from cron. It works on the laptop where it was written.\"\"\"\nimport csv\nimport datetime\nimport glob\nimport sqlite3\n\ncon = sqlite3.connect(\"warehouse.db\")\ncon.execute(\"CREATE TABLE IF NOT EXISTS orders (order_id TEXT, customer_id TEXT, total REAL, day TEXT)\")\n\nrows = []\nfor path in glob.glob(\"incoming/*.csv\"):\n    for r in csv.DictReader(open(path)):\n        r[\"total\"] = float(r[\"total\"])\n        r[\"day\"] = str(datetime.date.today())\n        rows.append(r)\n\nfor r in rows:\n    con.execute(\"INSERT INTO orders VALUES (?, ?, ?, ?)\", (r[\"order_id\"], r[\"customer_id\"], r[\"total\"], r[\"day\"]))\ncon.commit()\n\nprint(\"loaded\", len(rows), \"rows\")\nprint(con.execute(\"SELECT count(*), count(DISTINCT order_id), round(sum(total), 2) FROM orders\").fetchone())\nprint(con.execute(\"SELECT count(DISTINCT day) FROM orders\").fetchone())\n",
  "m1_partial_failure.py": "\"\"\"The same script, one day later: the file from the supplier has a bad value in row 3.\"\"\"\nimport csv\nimport sqlite3\n\ncon = sqlite3.connect(\"warehouse.db\")\ncon.execute(\"CREATE TABLE IF NOT EXISTS orders (order_id TEXT, customer_id TEXT, total REAL)\")\n\nloaded = 0\ntry:\n    for r in csv.DictReader(open(\"incoming/orders_c.csv\")):\n        con.execute(\"INSERT INTO orders VALUES (?, ?, ?)\", (r[\"order_id\"], r[\"customer_id\"], float(r[\"total\"])))\n        con.commit()\n        loaded += 1\nexcept ValueError as e:\n    print(\"stopped:\", e)\n\nprint(\"loaded\", loaded, \"of 4 rows before the stop\")\nprint(con.execute(\"SELECT order_id FROM orders ORDER BY order_id\").fetchall())\n",
  "m1_hidden_state.py": "\"\"\"A notebook is a set of cells that share one namespace. The order that you press Run in is part of the program.\"\"\"\ncells = {\n    1: \"total = 0\",\n    2: \"total = total + 12.50  # add the first order\",\n    3: \"total = total * 1.09   # add 9 percent tax\",\n}\n\ndef run(order):\n    ns = {}\n    for n in order:\n        exec(cells[n], ns)\n    return round(ns[\"total\"], 2)\n\nprint(\"top to bottom (1, 2, 3):         \", run([1, 2, 3]))\nprint(\"cell 2 pressed twice (1, 2, 2, 3):\", run([1, 2, 2, 3]))\nprint(\"tax before the order (1, 3, 2):  \", run([1, 3, 2]))\n",
  "m1_safe_rerun.py": "\"\"\"load_orders_v8.py: the same job, written so that running it twice gives the same table.\"\"\"\nimport csv\nimport glob\nimport sqlite3\nfrom decimal import Decimal\n\ncon = sqlite3.connect(\"warehouse.db\")\ncon.execute(\"\"\"CREATE TABLE IF NOT EXISTS orders (\n    order_id TEXT PRIMARY KEY, customer_id TEXT, total_cents INTEGER, ordered_at TEXT)\"\"\")\n\ndef read_orders(pattern):\n    for path in sorted(glob.glob(pattern)):\n        with open(path, newline=\"\", encoding=\"utf-8\") as f:\n            for r in csv.DictReader(f):\n                yield (r[\"order_id\"], r[\"customer_id\"], int(Decimal(r[\"total\"]) * 100), r[\"ordered_at\"])\n\nwith con:  # one transaction: all rows or none\n    con.executemany(\n        \"INSERT INTO orders VALUES (?, ?, ?, ?) \"\n        \"ON CONFLICT(order_id) DO UPDATE SET customer_id = excluded.customer_id, \"\n        \"total_cents = excluded.total_cents, ordered_at = excluded.ordered_at\",\n        read_orders(\"incoming/orders_[ab].csv\"))\n\nprint(con.execute(\"SELECT count(*), count(DISTINCT order_id), sum(total_cents) FROM orders\").fetchone())\n",
  "m1_versions.py": "\"\"\"What this course ran on.\"\"\"\nimport platform\nimport sys\nfrom importlib.metadata import version\n\nprint(sys.version.split(\" (\")[0], platform.python_implementation(), platform.machine())\nfor name in [\"pandas\", \"polars\", \"pyarrow\", \"duckdb\", \"sqlalchemy\", \"pydantic\", \"pytest\", \"mypy\", \"ruff\"]:\n    print(f\"{name:<11}{version(name)}\")\n",
  "m1/load_orders_v7.py": "\"\"\"load_orders_v7.py: the script that Brewline runs from cron. It works on the laptop where it was written.\"\"\"\nimport csv\nimport datetime\nimport glob\nimport sqlite3\n\ncon = sqlite3.connect(\"warehouse.db\")\ncon.execute(\"CREATE TABLE IF NOT EXISTS orders (order_id TEXT, customer_id TEXT, total REAL, day TEXT)\")\n\nrows = []\nfor path in glob.glob(\"incoming/*.csv\"):\n    for r in csv.DictReader(open(path)):\n        r[\"total\"] = float(r[\"total\"])\n        r[\"day\"] = str(datetime.date.today())\n        rows.append(r)\n\nfor r in rows:\n    con.execute(\"INSERT INTO orders VALUES (?, ?, ?, ?)\", (r[\"order_id\"], r[\"customer_id\"], r[\"total\"], r[\"day\"]))\ncon.commit()\n\nprint(\"loaded\", len(rows), \"rows\")\nprint(con.execute(\"SELECT count(*), count(DISTINCT order_id), round(sum(total), 2) FROM orders\").fetchone())\nprint(con.execute(\"SELECT count(DISTINCT day) FROM orders\").fetchone())\n",
  "m1/partial_failure.py": "\"\"\"The same script, one day later: the file from the supplier has a bad value in row 3.\"\"\"\nimport csv\nimport sqlite3\n\ncon = sqlite3.connect(\"warehouse.db\")\ncon.execute(\"CREATE TABLE IF NOT EXISTS orders (order_id TEXT, customer_id TEXT, total REAL)\")\n\nloaded = 0\ntry:\n    for r in csv.DictReader(open(\"later/orders_c.csv\")):\n        con.execute(\"INSERT INTO orders VALUES (?, ?, ?)\", (r[\"order_id\"], r[\"customer_id\"], float(r[\"total\"])))\n        con.commit()\n        loaded += 1\nexcept ValueError as e:\n    print(\"stopped:\", e)\n\nprint(\"loaded\", loaded, \"of 4 rows before the stop\")\nprint(con.execute(\"SELECT order_id FROM orders ORDER BY order_id\").fetchall())\n",
  "m1/notebook_cells.py": "\"\"\"A notebook is a set of cells that share one namespace. The order that you press Run in is part of the program.\"\"\"\ncells = {\n    1: \"total = 0\",\n    2: \"total = total + 12.50  # add the first order\",\n    3: \"total = total * 1.09   # add 9 percent tax\",\n}\n\ndef run(order):\n    ns = {}\n    for n in order:\n        exec(cells[n], ns)\n    return round(ns[\"total\"], 2)\n\nprint(\"top to bottom (1, 2, 3):         \", run([1, 2, 3]))\nprint(\"cell 2 pressed twice (1, 2, 2, 3):\", run([1, 2, 2, 3]))\nprint(\"tax before the order (1, 3, 2):  \", run([1, 3, 2]))\n",
  "m1/load_orders_v8.py": "\"\"\"load_orders_v8.py: the same job, written so that running it twice gives the same table.\"\"\"\nimport csv\nimport glob\nimport sqlite3\nfrom decimal import Decimal\n\ncon = sqlite3.connect(\"warehouse.db\")\ncon.execute(\"\"\"CREATE TABLE IF NOT EXISTS orders (\n    order_id TEXT PRIMARY KEY, customer_id TEXT, total_cents INTEGER, ordered_at TEXT)\"\"\")\n\ndef read_orders(pattern):\n    for path in sorted(glob.glob(pattern)):\n        with open(path, newline=\"\", encoding=\"utf-8\") as f:\n            for r in csv.DictReader(f):\n                yield (r[\"order_id\"], r[\"customer_id\"], int(Decimal(r[\"total\"]) * 100), r[\"ordered_at\"])\n\nwith con:  # one transaction: all rows or none\n    con.executemany(\n        \"INSERT INTO orders VALUES (?, ?, ?, ?) \"\n        \"ON CONFLICT(order_id) DO UPDATE SET customer_id = excluded.customer_id, \"\n        \"total_cents = excluded.total_cents, ordered_at = excluded.ordered_at\",\n        read_orders(\"incoming/orders_[ab].csv\"))\n\nprint(con.execute(\"SELECT count(*), count(DISTINCT order_id), sum(total_cents) FROM orders\").fetchone())\n",
  "m1/versions.py": "\"\"\"What this course ran on.\"\"\"\nimport platform\nimport sys\nfrom importlib.metadata import version\n\nprint(sys.version.split(\" (\")[0], platform.python_implementation(), platform.machine())\nfor name in [\"pandas\", \"polars\", \"pyarrow\", \"duckdb\", \"sqlalchemy\", \"pydantic\", \"pytest\", \"mypy\", \"ruff\"]:\n    print(f\"{name:<11}{version(name)}\")\n",
  "m2/pyproject.toml": "[project]\nname = \"brewline-etl\"\nversion = \"0.1.0\"\ndescription = \"Add your description here\"\nreadme = \"README.md\"\nrequires-python = \">=3.14\"\ndependencies = [\n    \"pandas>=3,<4\",\n    \"requests>=2.34.2\",\n]\n\n[project.scripts]\nbrewline-etl = \"brewline_etl:main\"\n\n[build-system]\nrequires = [\"uv_build>=0.11.32,<0.12.0\"]\nbuild-backend = \"uv_build\"\n\n[dependency-groups]\ndev = [\n    \"pytest>=9.2.0\",\n]\n",
  "m2/uv.lock.excerpt": "version = 1\nrevision = 3\nrequires-python = \">=3.14\"\nresolution-markers = [\n    \"sys_platform == 'win32'\",\n    \"sys_platform == 'emscripten'\",\n    \"sys_platform != 'emscripten' and sys_platform != 'win32'\",\n]\n\n[[package]]\nname = \"brewline-etl\"\nversion = \"0.1.0\"\nsource = { editable = \".\" }\ndependencies = [\n...\n[[package]]\nname = \"requests\"\nversion = \"2.34.2\"\nsource = { registry = \"https://pypi.org/simple\" }\ndependencies = [\n    { name = \"certifi\" },\n    { name = \"charset-normalizer\" },\n    { name = \"idna\" },\n    { name = \"urllib3\" },\n]\nsdist = { url = \"https://files.pythonhosted.org/packages/ac/c3/e2a2b89f2d3e2179abd6d00ebd70bff6273f37fb3e0cc209f48b39d00cbf/requests-2.34.2.tar.gz\", hash = \"sha256:f288924cae4e29463698d6d60bc6a4da69c89185ad1e0bcc4104f584e960b9ed\", size = 142856, upload-time = \"2026-05-14T19:25:27.735Z\" }\nwheels = [\n    { url = \"https://files.pythonhosted.org/packages/a0/f4/c67b0b3f1b9245e8d266f0f112c500d50e5b4e83cb6f3b71b6528104182a/requests-2.34.2-py3-none-any.whl\", hash = \"sha256:2a0d60c172f83ac6ab31e4554906c0f3b3588d37b5cb939b1c061f4907e278e0\", size = 73075, upload-time = \"2026-05-14T19:25:26.443Z\" },\n]\n",
  "m2/pandas_versions.py@old": "\"\"\"The same file, run in two environments: pandas 2.3.3 on Python 3.13, and pandas 3.1.1 on Python 3.14.\"\"\"\nimport sys\nimport warnings\n\nimport pandas as pd\n\nprint(sys.version.split()[0], \"with pandas\", pd.__version__)\n\nprint(\"dtype of a column of strings:\", pd.Series([\"a\", \"b\"]).dtype)\n\ndf = pd.DataFrame({\"a\": [1, 2, 3]})\ncolumn = df[\"a\"]\ncolumn.iloc[0] = 99\nprint(\"df after changing the column object:\", df[\"a\"].tolist())\n\nprint(\"dtype of parsed timestamps:\", pd.to_datetime([\"2026-03-01 10:00:00\"]).dtype)\n\ndf2 = pd.DataFrame({\"a\": [1, 2, 3]})\nwith warnings.catch_warnings(record=True) as caught:\n    warnings.simplefilter(\"always\")\n    df2[df2[\"a\"] > 1][\"a\"] = 0\nprint(\"chained assignment warned with:\", [type(w.message).__name__ for w in caught], \"and left\", df2[\"a\"].tolist())\n",
  "m2/pandas_versions.py@new": "\"\"\"The same file, run in two environments: pandas 2.3.3 on Python 3.13, and pandas 3.1.1 on Python 3.14.\"\"\"\nimport sys\nimport warnings\n\nimport pandas as pd\n\nprint(sys.version.split()[0], \"with pandas\", pd.__version__)\n\nprint(\"dtype of a column of strings:\", pd.Series([\"a\", \"b\"]).dtype)\n\ndf = pd.DataFrame({\"a\": [1, 2, 3]})\ncolumn = df[\"a\"]\ncolumn.iloc[0] = 99\nprint(\"df after changing the column object:\", df[\"a\"].tolist())\n\nprint(\"dtype of parsed timestamps:\", pd.to_datetime([\"2026-03-01 10:00:00\"]).dtype)\n\ndf2 = pd.DataFrame({\"a\": [1, 2, 3]})\nwith warnings.catch_warnings(record=True) as caught:\n    warnings.simplefilter(\"always\")\n    df2[df2[\"a\"] > 1][\"a\"] = 0\nprint(\"chained assignment warned with:\", [type(w.message).__name__ for w in caught], \"and left\", df2[\"a\"].tolist())\n",
  "m3/membership_counts.py": "\"\"\"Count the work that `in` does on a list and on a set. No clock: the counts are the same on every machine.\"\"\"\n\n\nclass Key:\n    eq_calls = 0\n    hash_calls = 0\n\n    def __init__(self, value):\n        self.value = value\n\n    def __eq__(self, other):\n        Key.eq_calls += 1\n        return self.value == other.value\n\n    def __hash__(self):\n        Key.hash_calls += 1\n        return hash(self.value)\n\n\ndef count(container, needle):\n    Key.eq_calls = Key.hash_calls = 0\n    found = needle in container\n    return found, Key.eq_calls, Key.hash_calls\n\n\nfor n in (1_000, 10_000, 100_000):\n    keys = [Key(i) for i in range(n)]\n    as_set = set(keys)\n    needle = Key(n - 1)  # the last id, the worst case for a list\n    _, list_eq, _ = count(keys, needle)\n    _, set_eq, set_hash = count(as_set, needle)\n    print(f\"{n:>7} ids  list: {list_eq:>7} comparisons   set: {set_eq} comparison, {set_hash} hash call\")\n",
  "m3/hashing.py": "\"\"\"What can be a dict key or a set member: only objects whose hash never changes while they are in it.\"\"\"\nfrom dataclasses import dataclass\n\norder = {\"order_id\": \"O-1\", \"total\": 12.5}\n\nfor label, key in [(\"a tuple\", (\"O-1\", \"C-7\")), (\"a list\", [\"O-1\", \"C-7\"]), (\"a dict\", order)]:\n    try:\n        {key: \"row\"}\n        print(f\"{label:<8} works as a dict key\")\n    except TypeError as e:\n        print(f\"{label:<8} {e}\")\n\n\nclass Customer:\n    def __init__(self, customer_id):\n        self.customer_id = customer_id\n\n    def __eq__(self, other):\n        return self.customer_id == other.customer_id\n\n\ntry:\n    {Customer(\"C-7\")}\nexcept TypeError as e:\n    print(\"a class that defines __eq__ and no __hash__:\", e)\n\n\n@dataclass(frozen=True)\nclass Store:\n    code: str\n\n\nprint(\"a frozen dataclass:\", {Store(\"SG-01\"), Store(\"SG-01\")})\n",
  "m3/mutable_default.py": "\"\"\"A default value is made once, when `def` runs. A mutable default is shared by every call.\"\"\"\n\n\ndef add_order(order_id, batch=[]):\n    batch.append(order_id)\n    return batch\n\n\nprint(add_order(\"O-1\"))\nprint(add_order(\"O-2\"))\nprint(add_order(\"O-3\", batch=[]))\nprint(add_order(\"O-4\"))\n\n\ndef add_order_safe(order_id, batch=None):\n    if batch is None:\n        batch = []\n    batch.append(order_id)\n    return batch\n\n\nprint(add_order_safe(\"O-1\"))\nprint(add_order_safe(\"O-2\"))\nprint(\"the default that was made once:\", add_order.__defaults__)\n",
  "m3/copying.py": "\"\"\"A copy of a list is a new list. The things inside it are still the same objects.\"\"\"\nimport copy\n\norders = [{\"order_id\": \"O-1\", \"lines\": [1, 2]}, {\"order_id\": \"O-2\", \"lines\": [3]}]\n\nshallow = list(orders)\nshallow[0][\"lines\"].append(99)\nprint(\"after changing a line through the shallow copy:\", orders[0][\"lines\"])\nprint(\"same object inside both lists:\", shallow[0] is orders[0])\n\norders = [{\"order_id\": \"O-1\", \"lines\": [1, 2]}, {\"order_id\": \"O-2\", \"lines\": [3]}]\ndeep = copy.deepcopy(orders)\ndeep[0][\"lines\"].append(99)\nprint(\"after changing a line through the deep copy:\", orders[0][\"lines\"], deep[0][\"lines\"])\n\nrow = {\"order_id\": \"O-1\", \"total\": 12.5}\nalias = row\nalias[\"total\"] = 0\nprint(\"an alias is the same dict:\", row)\nprint(\"the new dict from dict(row) is separate:\", dict(row) is not row)\n",
  "m3/group_count.py": "\"\"\"Counting, grouping and the top few, with the tools of the standard library.\"\"\"\nimport heapq\nfrom collections import Counter, defaultdict\n\norders = [\n    (\"O-1\", \"SG-01\", \"paid\", 1250), (\"O-2\", \"SG-01\", \"paid\", 475), (\"O-3\", \"KL-01\", \"cancelled\", 3100),\n    (\"O-4\", \"SG-02\", \"paid\", 820), (\"O-5\", \"KL-01\", \"paid\", 1990), (\"O-6\", \"SG-01\", \"refunded\", 250),\n    (\"O-7\", \"KL-01\", \"paid\", 5400), (\"O-8\", \"SG-02\", \"paid\", 610),\n]\n\nprint(\"orders per status:\", Counter(status for _, _, status, _ in orders))\n\nrevenue = defaultdict(int)\nfor _, store, status, cents in orders:\n    if status == \"paid\":\n        revenue[store] += cents\nprint(\"paid revenue per store (cents):\", dict(revenue))\n\nprint(\"two biggest orders:\", heapq.nlargest(2, orders, key=lambda o: o[3]))\nprint(\"stores by revenue, highest first:\", sorted(revenue, key=revenue.get, reverse=True))\nprint(\"sorted by status, then by amount (a stable sort):\")\nfor o in sorted(orders, key=lambda o: (o[2], o[3])):\n    print(\"  \", o)\n",
  "m3/sizes.py": "\"\"\"What things weigh. sys.getsizeof counts one object, not the objects it points to.\"\"\"\nimport sys\n\nfor label, obj in [\n    (\"int 0\", 0), (\"int 1\", 1), (\"int 2**30\", 2**30), (\"int 2**60\", 2**60), (\"float\", 1.5),\n    (\"str ''\", \"\"), (\"str 'a'\", \"a\"), (\"str 'O-0000001'\", \"O-0000001\"), (\"str of 100 characters\", \"x\" * 100),\n    (\"bytes b'abc'\", b\"abc\"), (\"tuple of 3 ints\", (1, 2, 3)), (\"empty list\", []), (\"list of 1000 ints\", list(range(1000))),\n    (\"empty dict\", {}), (\"dict with 1000 keys\", dict.fromkeys(range(1000))), (\"empty set\", set()), (\"set of 1000 ints\", set(range(1000))),\n]:\n    print(f\"{label:<24}{sys.getsizeof(obj):>8} bytes\")\n\nints = list(range(1000))\nprint()\nprint(\"the list of 1000 ints, the list object alone:\", sys.getsizeof(ints), \"bytes\")\nprint(\"the list and the 1000 int objects it points to:\", sys.getsizeof(ints) + sum(sys.getsizeof(i) for i in ints), \"bytes\")\n",
  "m3/latest_per_key.py": "\"\"\"Coding round: keep the newest record for each order, even when an old record arrives late.\"\"\"\n\nevents = [\n    {\"order_id\": \"O-1\", \"status\": \"created\", \"updated_at\": \"2026-03-01T08:00:00Z\"},\n    {\"order_id\": \"O-2\", \"status\": \"created\", \"updated_at\": \"2026-03-01T08:05:00Z\"},\n    {\"order_id\": \"O-1\", \"status\": \"paid\", \"updated_at\": \"2026-03-01T08:07:00Z\"},\n    {\"order_id\": \"O-3\", \"status\": \"created\", \"updated_at\": \"2026-03-01T09:00:00Z\"},\n    {\"order_id\": \"O-2\", \"status\": \"cancelled\", \"updated_at\": \"2026-03-01T08:06:00Z\"},\n    {\"order_id\": \"O-1\", \"status\": \"refunded\", \"updated_at\": \"2026-03-01T07:59:00Z\"},  # arrives last, but is the oldest\n]\n\n\ndef latest_per_key(events, key=\"order_id\", order_by=\"updated_at\"):\n    latest = {}\n    for e in events:\n        k = e[key]\n        if k not in latest or e[order_by] > latest[k][order_by]:\n            latest[k] = e\n    return list(latest.values())\n\n\nresult = latest_per_key(events)\nfor r in sorted(result, key=lambda r: r[\"order_id\"]):\n    print(r[\"order_id\"], r[\"status\"].ljust(10), r[\"updated_at\"])\n\nassert len(result) == 3\nassert {r[\"order_id\"]: r[\"status\"] for r in result} == {\"O-1\": \"paid\", \"O-2\": \"cancelled\", \"O-3\": \"created\"}\nassert latest_per_key([]) == []\nprint(\"tests passed\")\n",
  "m3/top_k_per_group.py": "\"\"\"Coding round: the two biggest orders for each store, without sorting every order.\"\"\"\nimport heapq\nfrom collections import defaultdict\n\norders = [\n    (\"O-1\", \"SG-01\", 1250), (\"O-2\", \"SG-01\", 475), (\"O-3\", \"KL-01\", 3100), (\"O-4\", \"SG-02\", 820),\n    (\"O-5\", \"KL-01\", 1990), (\"O-6\", \"SG-01\", 250), (\"O-7\", \"KL-01\", 5400), (\"O-8\", \"SG-02\", 610),\n    (\"O-9\", \"SG-01\", 1250),\n]\n\n\ndef top_k_per_group(rows, k):\n    heaps = defaultdict(list)  # a min-heap per store that never holds more than k rows\n    for order_id, store, cents in rows:\n        item = (cents, order_id)\n        if len(heaps[store]) < k:\n            heapq.heappush(heaps[store], item)\n        elif item > heaps[store][0]:\n            heapq.heapreplace(heaps[store], item)\n    return {store: sorted(h, reverse=True) for store, h in heaps.items()}\n\n\nresult = top_k_per_group(orders, 2)\nfor store in sorted(result):\n    print(store, [(oid, cents) for cents, oid in result[store]])\n\nassert result[\"KL-01\"] == [(5400, \"O-7\"), (3100, \"O-3\")]\nassert result[\"SG-02\"] == [(820, \"O-4\"), (610, \"O-8\")]\nassert len(result[\"SG-01\"]) == 2\nprint(\"tests passed\")\n",
  "m4/generator_basics.py": "\"\"\"A generator function makes values one at a time, when something asks for the next one.\"\"\"\n\n\ndef evens(limit):\n    for n in range(0, limit, 2):\n        print(\"  making\", n)\n        yield n\n\n\ngen = evens(6)\nprint(type(gen).__name__, \"- nothing has run yet\")\nprint(\"first:\", next(gen))\nprint(\"second:\", next(gen))\nprint(\"the rest:\", list(gen))\ntry:\n    next(gen)\nexcept StopIteration:\n    print(\"StopIteration: the generator is used up\")\n\nsquares = (n * n for n in range(4))  # a generator expression\nprint(\"sum, then sum again:\", sum(squares), sum(squares))\n",
  "m4/pull_trace.py": "\"\"\"Four orders through read, parse and keep. Lists do each stage for everyone first. Generators pass one order all the way.\"\"\"\nTOTALS = [150, 80, 220, 40]\n\n\ndef read():\n    for i, cents in enumerate(TOTALS, start=1):\n        print(f\"  read  {i}\")\n        yield i, cents\n\n\ndef parse(rows):\n    for i, cents in rows:\n        print(f\"  parse {i}\")\n        yield {\"id\": i, \"cents\": cents}\n\n\ndef keep(rows):\n    for r in rows:\n        if r[\"cents\"] >= 100:\n            print(f\"  keep  {r['id']}\")\n            yield r\n        else:\n            print(f\"  drop  {r['id']}\")\n\n\nprint(\"with lists\")\nrows = list(read())\nparsed = list(parse(rows))\nkept = list(keep(parsed))\nfor r in kept:\n    print(f\"  write {r['id']}\")\n\nprint(\"with generators\")\nfor r in keep(parse(read())):\n    print(f\"  write {r['id']}\")\n",
  "m4/itertools_tools.py": "\"\"\"A few tools from itertools, and the one rule of groupby.\"\"\"\nimport itertools\n\nprint(\"batched:\", list(itertools.batched(range(7), 3)))\nprint(\"islice of an endless count:\", list(itertools.islice(itertools.count(1), 5)))\nprint(\"chain:\", list(itertools.chain([\"a\", \"b\"], [\"c\"])))\nprint(\"pairwise:\", list(itertools.pairwise([1, 4, 9, 16])))\n\nrows = [(\"SG-01\", 1250), (\"KL-01\", 3100), (\"SG-01\", 475), (\"KL-01\", 1990)]\nprint(\"groupby, input not sorted:\", [(k, [c for _, c in g]) for k, g in itertools.groupby(rows, key=lambda r: r[0])])\nprint(\"groupby, input sorted:    \", [(k, [c for _, c in g]) for k, g in itertools.groupby(sorted(rows), key=lambda r: r[0])])\n",
  "m4/generator_close.py": "\"\"\"A generator that holds a resource: what happens when the caller stops early.\"\"\"\nfrom contextlib import closing\n\n\ndef read_lines(name):\n    print(\"open\", name)\n    try:\n        for i in range(1, 6):\n            yield i\n    finally:\n        print(\"close\", name)\n\n\nfor n in read_lines(\"a.csv\"):\n    if n == 3:\n        break\nprint(\"after the loop\")\n\nwith closing(read_lines(\"b.csv\")) as lines:\n    next(lines)\n    print(\"leaving the with block\")\nprint(\"done\")\n",
  "m4/flatten_json.py": "\"\"\"Coding round: walk nested JSON and yield (path, value) pairs, without building one big list.\"\"\"\n\n\ndef flatten(obj, prefix=\"\"):\n    if isinstance(obj, dict):\n        for key, value in obj.items():\n            yield from flatten(value, f\"{prefix}{key}.\")\n    elif isinstance(obj, list):\n        for i, value in enumerate(obj):\n            yield from flatten(value, f\"{prefix}{i}.\")\n    else:\n        yield prefix.rstrip(\".\"), obj\n\n\norder = {\n    \"order_id\": \"O-1\",\n    \"customer\": {\"id\": \"C-7\", \"tier\": \"gold\"},\n    \"lines\": [{\"sku\": \"LATTE\", \"qty\": 2}, {\"sku\": \"MUFFIN\", \"qty\": 1}],\n    \"note\": None,\n}\nfor path, value in flatten(order):\n    print(f\"{path:<16} {value!r}\")\n\nassert dict(flatten({})) == {}\nassert dict(flatten({\"a\": [1, [2, 3]]})) == {\"a.0\": 1, \"a.1.0\": 2, \"a.1.1\": 3}\nprint(\"tests passed\")\n",
  "m4/sessionize.py": "\"\"\"Coding round: split each user's events into sessions. A gap of more than 30 minutes starts a new session.\"\"\"\n\n\ndef sessionize(events, gap=30):\n    \"\"\"events: (user, minute) pairs, sorted by user and then by minute. Yield (user, first, last, count).\"\"\"\n    current = None\n    for user, minute in events:\n        if current and current[0] == user and minute - current[2] <= gap:\n            current[2] = minute\n            current[3] += 1\n        else:\n            if current:\n                yield tuple(current)\n            current = [user, minute, minute, 1]\n    if current:\n        yield tuple(current)\n\n\nevents = [(\"C-1\", 5), (\"C-1\", 20), (\"C-1\", 90), (\"C-1\", 100), (\"C-2\", 15), (\"C-3\", 0), (\"C-3\", 30), (\"C-3\", 61)]\nfor user, first, last, count in sessionize(events):\n    print(f\"{user}  minutes {first:>3} to {last:>3}  events: {count}\")\n\nassert list(sessionize([])) == []\nassert list(sessionize([(\"A\", 0), (\"A\", 30)])) == [(\"A\", 0, 30, 2)]\nassert list(sessionize([(\"A\", 0), (\"A\", 31)])) == [(\"A\", 0, 0, 1), (\"A\", 31, 31, 1)]\nprint(\"tests passed\")\n",
  "m4/pipeline.py": "\"\"\"One pass over a CSV file of orders, in small steps, with the memory that Python used.\"\"\"\nimport csv\nimport itertools\nimport sys\nimport tracemalloc\nfrom decimal import Decimal\n\n\ndef read_rows(path):\n    with open(path, newline=\"\", encoding=\"utf-8\") as f:\n        yield from csv.DictReader(f)\n\n\ndef parse(rows):\n    for r in rows:\n        yield {\"order_id\": r[\"order_id\"], \"store\": r[\"store\"], \"status\": r[\"status\"], \"cents\": int(Decimal(r[\"total\"]) * 100)}\n\n\ndef paid(rows):\n    return (r for r in rows if r[\"status\"] == \"paid\")\n\n\ndef batches(rows, size):\n    return itertools.batched(rows, size)\n\n\ntracemalloc.start()\nrows_in_batches = batches(paid(parse(read_rows(sys.argv[1]))), 10_000)\ntotal_cents = orders = batch_count = 0\nfor batch in rows_in_batches:\n    total_cents += sum(r[\"cents\"] for r in batch)\n    orders += len(batch)\n    batch_count += 1\npeak = tracemalloc.get_traced_memory()[1]\n\nprint(f\"paid orders: {orders:,} in {batch_count} batches\")\nprint(f\"paid revenue: {total_cents / 100:,.2f}\")\nprint(f\"peak memory held by Python: {peak / 1e6:.2f} MB\")\n",
  "m5/csv_traps.py": "\"\"\"One supplier file, read two ways. The file has a quoted comma, a quoted line break and a byte order mark.\"\"\"\nimport csv\nimport io\n\nraw = (\n    \"﻿order_id,customer,note,total\\n\"\n    'O-1,\"Ng, Mei\",\"extra shot\",12.50\\n'\n    'O-2,Ravi,\"leave at door\\nring twice\",4.75\\n'\n    \"O-3,Zoë,,31.00\\n\"\n)\nprint(\"bytes in the file:\", len(raw.encode(\"utf-8\")), \"  lines:\", raw.count(\"\\n\"))\n\nprint(\"\\nwith line.split(','):\")\nfor line in raw.splitlines():\n    print(\"  \", len(line.split(\",\")), \"fields:\", line.split(\",\")[:4])\n\nprint(\"\\nwith the csv module:\")\nfor row in csv.DictReader(io.StringIO(raw)):\n    print(\"  \", row)\n\nprint(\"\\nwith the csv module, and the byte order mark removed:\")\nrows = list(csv.DictReader(io.StringIO(raw.lstrip(\"﻿\"))))\nprint(\"  \", [r[\"order_id\"] for r in rows], \"total:\", sum(float(r[\"total\"]) for r in rows))\n",
  "m5/encodings.py": "\"\"\"Text is characters. A file is bytes. An encoding is the rule between them.\"\"\"\nfor text in [\"Zoe\", \"Zoë\", \"café\", \"東京\"]:\n    print(f\"{text!r}\")\n    for enc in [\"utf-8\", \"latin-1\", \"utf-16\"]:\n        try:\n            data = text.encode(enc)\n            print(f\"   {enc:<8} {len(data)} bytes  {data.hex(' ')}\")\n        except UnicodeEncodeError as e:\n            print(f\"   {enc:<8} cannot encode: {e.reason}\")\n\ndata = \"café\".encode(\"utf-8\")\nprint()\nprint(\"the bytes of 'café' in UTF-8, read as latin-1:\", data.decode(\"latin-1\"))\nprint(\"the bytes of 'café' in latin-1, read as UTF-8:\", end=\" \")\ntry:\n    \"café\".encode(\"latin-1\").decode(\"utf-8\")\nexcept UnicodeDecodeError as e:\n    print(\"UnicodeDecodeError:\", e.reason, \"at byte\", e.start)\nprint(\"the same bytes, errors='replace':\", \"café\".encode(\"latin-1\").decode(\"utf-8\", errors=\"replace\"))\nprint(\"a file saved with a byte order mark:\", repr(b\"\\xef\\xbb\\xbforder_id\".decode(\"utf-8\")), \"against\", repr(b\"\\xef\\xbb\\xbforder_id\".decode(\"utf-8-sig\")))\n",
  "m5/json_lines.py": "\"\"\"One JSON document, or one JSON object per line, and a file that was cut off in the middle.\"\"\"\nimport json\n\norders = [{\"order_id\": f\"O-{i}\", \"total\": i * 1.5} for i in range(1, 6)]\n\nwhole = json.dumps(orders)\nlines = \"\\n\".join(json.dumps(o) for o in orders) + \"\\n\"\nprint(\"JSON array:\", len(whole), \"bytes.  JSON Lines:\", len(lines), \"bytes, one object per line\")\n\ncut = 118  # the upload stopped here\nprint(\"\\nthe array, cut at byte\", cut, \":\")\ntry:\n    json.loads(whole[:cut])\nexcept json.JSONDecodeError as e:\n    print(\"  JSONDecodeError:\", e.msg, f\"(line {e.lineno}, column {e.colno})  ->  0 orders readable\")\n\nprint(\"\\nthe JSON Lines file, cut at byte\", cut, \":\")\ngood = bad = 0\nfor line in lines[:cut].split(\"\\n\"):\n    if not line:\n        continue\n    try:\n        json.loads(line)\n        good += 1\n    except json.JSONDecodeError:\n        bad += 1\nprint(\"  readable lines:\", good, \"  broken lines:\", bad, \"(the last one, cut in the middle)\")\nprint(\"  the last bytes of the cut file:\", repr(lines[:cut][-14:]))\n",
  "m5/atomic_write.py": "\"\"\"A job that stops while it writes. Two ways to write the same file.\"\"\"\nimport os\nimport pathlib\nimport tempfile\n\nrows = [f\"O-{i},{i * 2.5}\\n\" for i in range(1, 6)]\ntarget = pathlib.Path(\"orders.csv\")\ntarget.write_text(\"order_id,total\\nO-0,1.0\\n\")  # last night's complete file\n\n\ndef write_in_place(path, rows, fail_after):\n    with open(path, \"w\") as f:\n        f.write(\"order_id,total\\n\")\n        for n, r in enumerate(rows):\n            if n == fail_after:\n                raise RuntimeError(\"the job was killed\")\n            f.write(r)\n\n\ndef write_atomically(path, rows, fail_after):\n    fd, tmp = tempfile.mkstemp(dir=path.parent, suffix=\".tmp\")\n    try:\n        with os.fdopen(fd, \"w\") as f:\n            f.write(\"order_id,total\\n\")\n            for n, r in enumerate(rows):\n                if n == fail_after:\n                    raise RuntimeError(\"the job was killed\")\n                f.write(r)\n        os.replace(tmp, path)  # one step: the new file replaces the old one\n    except BaseException:\n        os.unlink(tmp)\n        raise\n\n\ndef lines(path):\n    return len(path.read_text().splitlines()) - 1\n\n\ntry:\n    write_in_place(target, rows, fail_after=3)\nexcept RuntimeError as e:\n    print(\"in place:   \", e, \"-> the file now has\", lines(target), \"of 5 orders, and last night's file is gone\")\n\ntarget.write_text(\"order_id,total\\nO-0,1.0\\n\")\ntry:\n    write_atomically(target, rows, fail_after=3)\nexcept RuntimeError as e:\n    print(\"atomically: \", e, \"-> the file still has\", lines(target), \"order from last night, nothing half written\")\n\nwrite_atomically(target, rows, fail_after=99)\nprint(\"atomically, no failure: the file has\", lines(target), \"orders;\", sorted(p.name for p in pathlib.Path(\".\").iterdir() if p.suffix == \".tmp\"), \"temporary files are left\")\n",
  "m5/paths.py": "\"\"\"Paths with pathlib, a partitioned layout, and the sort that surprises people.\"\"\"\nimport pathlib\nimport tempfile\n\nroot = pathlib.Path(tempfile.mkdtemp())\nfor name in [\"part-1.csv\", \"part-2.csv\", \"part-10.csv\", \"notes.txt\"]:\n    (root / \"dt=2026-03-14\").mkdir(parents=True, exist_ok=True)\n    (root / \"dt=2026-03-14\" / name).write_text(\"x\")\n\np = root / \"dt=2026-03-14\" / \"part-1.csv\"\nprint(\"name:\", p.name, \" stem:\", p.stem, \" suffix:\", p.suffix, \" parent folder:\", p.parent.name)\nprint(\"another extension:\", p.with_suffix(\".parquet\").name)\nprint(\"is a file:\", p.is_file(), \" exists:\", (root / \"nothing\").exists())\n\nfiles = [f.name for f in (root / \"dt=2026-03-14\").glob(\"part-*.csv\")]\nprint(\"\\nsorted as text:   \", sorted(files))\nprint(\"sorted by number: \", sorted(files, key=lambda n: int(n.split(\"-\")[1].split(\".\")[0])))\nprint(\"zero-padded names sort correctly as text:\", sorted([\"part-0001.csv\", \"part-0002.csv\", \"part-0010.csv\"]))\n",
  "m5/parquet_tour.py": "\"\"\"What is inside a Parquet file: row groups, types and the minimum and maximum of each column.\"\"\"\nimport datetime as dt\nimport random\nfrom decimal import Decimal\n\nimport pyarrow as pa\nimport pyarrow.dataset as ds\nimport pyarrow.parquet as pq\n\nrng = random.Random(42)  # made-up orders, the same on every machine\nstart = dt.datetime(2026, 3, 1)\nrows = sorted(\n    (f\"O-{i:07d}\", rng.choice([\"SG-01\", \"SG-02\", \"KL-01\", \"JK-01\"]), rng.choice([\"paid\", \"paid\", \"paid\", \"cancelled\"]),\n     Decimal(rng.randint(350, 12000)) / 100, start + dt.timedelta(seconds=rng.randint(0, 31 * 86400 - 1)))\n    for i in range(200_000)\n)\nrows.sort(key=lambda r: r[4])\ntable = pa.table({\n    \"order_id\": [r[0] for r in rows],\n    \"store\": [r[1] for r in rows],\n    \"status\": [r[2] for r in rows],\n    \"total\": pa.array([r[3] for r in rows], pa.decimal128(10, 2)),\n    \"ordered_at\": pa.array([r[4] for r in rows], pa.timestamp(\"us\")),\n})\npq.write_table(table, \"orders.parquet\", row_group_size=50_000, compression=\"zstd\")\n\nf = pq.ParquetFile(\"orders.parquet\")\nprint(\"rows:\", f.metadata.num_rows, \" row groups:\", f.metadata.num_row_groups, \" columns:\", f.metadata.num_columns)\nprint(f.schema_arrow)\nprint()\nprint(\"row group  rows    first order_at        last order_at\")\nfor g in range(f.metadata.num_row_groups):\n    st = f.metadata.row_group(g).column(4).statistics\n    print(f\"{g:>9}  {f.metadata.row_group(g).num_rows:<6}  {st.min}  {st.max}\")\n\ndataset = ds.dataset(\"orders.parquet\")\nflt = ds.field(\"ordered_at\") >= pa.scalar(dt.datetime(2026, 3, 30), pa.timestamp(\"us\"))\nfragment = next(iter(dataset.get_fragments()))\npicked = list(fragment.split_by_row_group(filter=flt))\nprint(f\"\\nrows from 30 March on: the statistics select {len(picked)} of {f.metadata.num_row_groups} row groups to read\")\nprint(\"one column only:\", pq.read_table(\"orders.parquet\", columns=[\"total\"]).num_rows, \"values, without reading the other four\")\n",
  "m5/parse_log.py": "\"\"\"Coding round: turn log lines into dicts, and count the lines that cannot be parsed.\"\"\"\nimport re\n\nPATTERN = re.compile(r\"^(?P<ts>\\S+) (?P<level>[A-Z]+) (?P<job>\\S+) rows=(?P<rows>\\d+) ms=(?P<ms>\\d+)$\")\n\nlines = [\n    \"2026-03-14T02:00:01Z INFO load_orders rows=1200 ms=340\",\n    \"2026-03-14T02:00:05Z WARN load_orders rows=0 ms=12\",\n    \"2026-03-14T02:01:00Z INFO load_stores rows=40 ms=8\",\n    \"this line is not a log line\",\n    \"2026-03-14T02:02:00Z INFO load_orders rows=abc ms=9\",\n]\n\n\ndef parse_log(lines):\n    good, bad = [], 0\n    for line in lines:\n        m = PATTERN.match(line)\n        if not m:\n            bad += 1\n            continue\n        d = m.groupdict()\n        d[\"rows\"], d[\"ms\"] = int(d[\"rows\"]), int(d[\"ms\"])\n        good.append(d)\n    return good, bad\n\n\ngood, bad = parse_log(lines)\nfor d in good:\n    print(d[\"ts\"], d[\"level\"].ljust(4), d[\"job\"].ljust(12), d[\"rows\"], d[\"ms\"])\nprint(\"unparsable lines:\", bad)\n\nassert len(good) == 3 and bad == 2\nassert parse_log([]) == ([], 0)\nprint(\"tests passed\")\n",
  "m5/write_partitions.py": "\"\"\"Coding round: write orders into one folder for each day, so a later job can read a single day.\"\"\"\nimport csv\nimport os\nimport pathlib\nimport tempfile\nfrom collections import defaultdict\n\norders = [\n    (\"O-1\", \"2026-03-14 08:15:00\", 12.5), (\"O-2\", \"2026-03-14 09:02:00\", 4.75), (\"O-3\", \"2026-03-15 00:03:00\", 8.2),\n    (\"O-4\", \"2026-03-15 10:41:00\", 19.9), (\"O-5\", \"2026-03-14 23:58:00\", 31.0),\n]\n\n\ndef write_partitions(rows, root):\n    by_day = defaultdict(list)\n    for order_id, ts, total in rows:\n        by_day[ts[:10]].append((order_id, ts, total))\n    written = {}\n    for day, day_rows in sorted(by_day.items()):\n        folder = pathlib.Path(root) / f\"dt={day}\"\n        folder.mkdir(parents=True, exist_ok=True)\n        fd, tmp = tempfile.mkstemp(dir=folder, suffix=\".tmp\")\n        with os.fdopen(fd, \"w\", newline=\"\") as f:\n            csv.writer(f).writerows(sorted(day_rows))\n        os.replace(tmp, folder / \"part-0000.csv\")\n        written[day] = len(day_rows)\n    return written\n\n\nroot = tempfile.mkdtemp()\nresult = write_partitions(orders, root)\nfor day, n in result.items():\n    print(f\"dt={day}/part-0000.csv  {n} rows\")\nassert write_partitions(orders, root) == result  # running it again changes nothing\nassert sorted(p.name for p in pathlib.Path(root).iterdir()) == [\"dt=2026-03-14\", \"dt=2026-03-15\"]\nprint(\"tests passed\")\n",
  "m5/read_csv_safely.py": "\"\"\"The safe way to read a supplier CSV: say the encoding, pass newline=\"\", and let utf-8-sig drop a byte order mark.\"\"\"\nimport csv\n\nwith open(\"supplier.csv\", newline=\"\", encoding=\"utf-8-sig\") as f:\n    rows = list(csv.DictReader(f))\n\nprint(\"rows:\", len(rows), \" columns:\", list(rows[0]))\nprint(\"customer of the first row:\", rows[0][\"customer\"])\nprint(\"note of the second row:\", repr(rows[1][\"note\"]))\nprint(\"total as money:\", sum(float(r[\"total\"]) for r in rows))\n"
 },
 "text": {
  "m1_fragile_script.py#1": "Traceback (most recent call last):\n  File \"/work/m1_fragile_script/m1_fragile_script.py\", line 13, in <module>\n    r[\"total\"] = float(r[\"total\"])\n                 ~~~~~^^^^^^^^^^^^\nValueError: could not convert string to float: 'n/a'",
  "m1_fragile_script.py#2": "Traceback (most recent call last):\n  File \"/work/m1_fragile_script/m1_fragile_script.py\", line 13, in <module>\n    r[\"total\"] = float(r[\"total\"])\n                 ~~~~~^^^^^^^^^^^^\nValueError: could not convert string to float: 'n/a'",
  "m1_partial_failure.py#1": "stopped: could not convert string to float: 'n/a'\nloaded 2 of 4 rows before the stop\n[('O-1007',), ('O-1008',)]",
  "m1_partial_failure.py#2": "stopped: could not convert string to float: 'n/a'\nloaded 2 of 4 rows before the stop\n[('O-1007',), ('O-1007',), ('O-1008',), ('O-1008',)]",
  "m1_hidden_state.py": "top to bottom (1, 2, 3):          13.63\ncell 2 pressed twice (1, 2, 2, 3): 27.25\ntax before the order (1, 3, 2):   12.5",
  "m1_safe_rerun.py#1": "(6, 6, 7885)",
  "m1_safe_rerun.py#2": "(6, 6, 7885)",
  "m1_versions.py": "3.14.6 CPython x86_64\npandas     3.1.1\npolars     2.1.0\npyarrow    26.0.1\nduckdb     2.0.0\nsqlalchemy 2.1.8\npydantic   2.14.3\npytest     9.2.0\nmypy       2.4.1\nruff       0.17.4",
  "m1/load_orders_v7.py#1": "loaded 6 rows\n(6, 6, 78.85)\n(1,)",
  "m1/load_orders_v7.py#2": "loaded 6 rows\n(12, 6, 157.7)\n(1,)",
  "m1/partial_failure.py#1": "stopped: could not convert string to float: 'n/a'\nloaded 2 of 4 rows before the stop\n[('O-1007',), ('O-1008',)]",
  "m1/partial_failure.py#2": "stopped: could not convert string to float: 'n/a'\nloaded 2 of 4 rows before the stop\n[('O-1007',), ('O-1007',), ('O-1008',), ('O-1008',)]",
  "m1/notebook_cells.py": "top to bottom (1, 2, 3):          13.63\ncell 2 pressed twice (1, 2, 2, 3): 27.25\ntax before the order (1, 3, 2):   12.5",
  "m1/load_orders_v8.py#1": "(6, 6, 7885)",
  "m1/load_orders_v8.py#2": "(6, 6, 7885)",
  "m1/versions.py": "3.14.6 CPython x86_64\npandas     3.1.1\npolars     2.1.0\npyarrow    26.0.1\nduckdb     2.0.0\nsqlalchemy 2.1.8\npydantic   2.14.3\npytest     9.2.0\nmypy       2.4.1\nruff       0.17.4",
  "m2/venv_session": "$ python -m venv .venv\n$ ls .venv\nbin\ninclude\nlib\nlib64\npyvenv.cfg\n$ grep -E \"^(include-system-site-packages|version) \" .venv/pyvenv.cfg\ninclude-system-site-packages = false\nversion = 3.14.6\n$ .venv/bin/python -c \"import sys; print(sys.prefix.endswith('.venv'), sys.prefix != sys.base_prefix)\"\nTrue True\n$ .venv/bin/python -c \"import pandas\"\nTraceback (most recent call last):\n  File \"<string>\", line 1, in <module>\n    import pandas\nModuleNotFoundError: No module named 'pandas'\n$ uv pip install --python .venv/bin/python \"pandas>=3,<4\"\nResolved 4 packages in 3ms\nInstalled 4 packages in 22ms\n + numpy==2.5.4\n + pandas==3.1.1\n + python-dateutil==4.0.0\n + tzdata==2026.6\n$ .venv/bin/python -c \"import pandas; print(pandas.__version__)\"\n3.1.1",
  "m2/uv_session": "$ uv init --package brewline-etl --python 3.14 --author-from none\nInitialized project `brewline-etl` at `/work/m2/uvproj/brewline-etl`\n$ cd brewline-etl && ls -A\n.git\n.gitignore\n.python-version\nREADME.md\npyproject.toml\nsrc\n$ cd brewline-etl && uv add requests \"pandas>=3,<4\"\nUsing CPython 3.14.6\nCreating virtual environment at: .venv\nResolved 10 packages in 7ms\n   Building brewline-etl @ file:///work/m2/uvproj/brewline-etl\n      Built brewline-etl @ file:///work/m2/uvproj/brewline-etl\nPrepared 1 package in 4ms\nInstalled 10 packages in 20ms\n + brewline-etl==0.1.0 (from file:///work/m2/uvproj/brewline-etl)\n + certifi==2026.10.23\n + charset-normalizer==3.5.2\n + idna==3.20\n + numpy==2.5.4\n + pandas==3.1.1\n + python-dateutil==4.0.0\n + requests==2.34.2\n + tzdata==2026.6\n + urllib3==2.8.0\n$ cd brewline-etl && uv tree --depth 1\nbrewline-etl v0.1.0\n├── pandas v3.1.1\n└── requests v2.34.2\nResolved 10 packages in 1ms\n$ cd brewline-etl && uv run python -c \"import requests, pandas; print(requests.__version__, pandas.__version__)\"\n2.34.2 3.1.1\n$ cd brewline-etl && uv add --dev pytest\nResolved 16 packages in 7ms\n   Building brewline-etl @ file:///work/m2/uvproj/brewline-etl\n      Built brewline-etl @ file:///work/m2/uvproj/brewline-etl\nPrepared 1 package in 4ms\nUninstalled 1 package in 1ms\nInstalled 6 packages in 3ms\n ~ brewline-etl==0.1.0 (from file:///work/m2/uvproj/brewline-etl)\n + iniconfig==2.3.1\n + packaging==26.3\n + pluggy==1.7.0\n + pygments==2.21.0\n + pytest==9.2.0",
  "m2/python-version": "3.14",
  "m2/lock_check": "$ uv lock --check\nResolved 17 packages in 7ms\nerror: The lockfile at `uv.lock` needs to be updated, but `--check` was provided.\n\nhint: To update the lockfile, run `uv lock`.\n$ uv sync --locked\nResolved 17 packages in 9ms\nerror: The lockfile at `uv.lock` needs to be updated, but `--locked` was provided.\n\nhint: To update the lockfile, run `uv lock`.\n$ uv lock\nResolved 17 packages in 7ms\nAdded tenacity v9.2.1\n$ uv sync --locked\nResolved 17 packages in 1ms\n   Building brewline-etl @ file:///work/m2/uvproj/brewline-etl\n      Built brewline-etl @ file:///work/m2/uvproj/brewline-etl\nPrepared 1 package in 6ms\nUninstalled 1 package in 1ms\nInstalled 2 packages in 2ms\n ~ brewline-etl==0.1.0 (from file:///work/m2/uvproj/brewline-etl)\n + tenacity==9.2.1",
  "m2/pandas_versions.py@old": "3.13.18 with pandas 2.3.3\ndtype of a column of strings: object\ndf after changing the column object: [99, 2, 3]\ndtype of parsed timestamps: datetime64[ns]\nchained assignment warned with: ['SettingWithCopyWarning'] and left [1, 2, 3]",
  "m2/pandas_versions.py@new": "3.14.6 with pandas 3.1.1\ndtype of a column of strings: str\ndf after changing the column object: [1, 2, 3]\ndtype of parsed timestamps: datetime64[us]\nchained assignment warned with: ['ChainedAssignmentError'] and left [1, 2, 3]",
  "m3/membership_counts.py": "   1000 ids  list:    1000 comparisons   set: 1 comparison, 1 hash call\n  10000 ids  list:   10000 comparisons   set: 1 comparison, 1 hash call\n 100000 ids  list:  100000 comparisons   set: 1 comparison, 1 hash call",
  "m3/hashing.py": "a tuple  works as a dict key\na list   cannot use 'list' as a dict key (unhashable type: 'list')\na dict   cannot use 'dict' as a dict key (unhashable type: 'dict')\na class that defines __eq__ and no __hash__: cannot use 'Customer' as a set element (unhashable type: 'Customer')\na frozen dataclass: {Store(code='SG-01')}",
  "m3/mutable_default.py": "['O-1']\n['O-1', 'O-2']\n['O-3']\n['O-1', 'O-2', 'O-4']\n['O-1']\n['O-2']\nthe default that was made once: (['O-1', 'O-2', 'O-4'],)",
  "m3/copying.py": "after changing a line through the shallow copy: [1, 2, 99]\nsame object inside both lists: True\nafter changing a line through the deep copy: [1, 2] [1, 2, 99]\nan alias is the same dict: {'order_id': 'O-1', 'total': 0}\nthe new dict from dict(row) is separate: True",
  "m3/group_count.py": "orders per status: Counter({'paid': 6, 'cancelled': 1, 'refunded': 1})\npaid revenue per store (cents): {'SG-01': 1725, 'SG-02': 1430, 'KL-01': 7390}\ntwo biggest orders: [('O-7', 'KL-01', 'paid', 5400), ('O-3', 'KL-01', 'cancelled', 3100)]\nstores by revenue, highest first: ['KL-01', 'SG-01', 'SG-02']\nsorted by status, then by amount (a stable sort):\n   ('O-3', 'KL-01', 'cancelled', 3100)\n   ('O-2', 'SG-01', 'paid', 475)\n   ('O-8', 'SG-02', 'paid', 610)\n   ('O-4', 'SG-02', 'paid', 820)\n   ('O-1', 'SG-01', 'paid', 1250)\n   ('O-5', 'KL-01', 'paid', 1990)\n   ('O-7', 'KL-01', 'paid', 5400)\n   ('O-6', 'SG-01', 'refunded', 250)",
  "m3/sizes.py": "int 0                         28 bytes\nint 1                         28 bytes\nint 2**30                     32 bytes\nint 2**60                     36 bytes\nfloat                         24 bytes\nstr ''                        41 bytes\nstr 'a'                       42 bytes\nstr 'O-0000001'               50 bytes\nstr of 100 characters        141 bytes\nbytes b'abc'                  36 bytes\ntuple of 3 ints               72 bytes\nempty list                    56 bytes\nlist of 1000 ints           8056 bytes\nempty dict                    64 bytes\ndict with 1000 keys        36952 bytes\nempty set                    216 bytes\nset of 1000 ints           32984 bytes\n\nthe list of 1000 ints, the list object alone: 8056 bytes\nthe list and the 1000 int objects it points to: 36056 bytes",
  "m3/latest_per_key.py": "O-1 paid       2026-03-01T08:07:00Z\nO-2 cancelled  2026-03-01T08:06:00Z\nO-3 created    2026-03-01T09:00:00Z\ntests passed",
  "m3/top_k_per_group.py": "KL-01 [('O-7', 5400), ('O-3', 3100)]\nSG-01 [('O-9', 1250), ('O-1', 1250)]\nSG-02 [('O-4', 820), ('O-8', 610)]\ntests passed",
  "m4/generator_basics.py": "generator - nothing has run yet\n  making 0\nfirst: 0\n  making 2\nsecond: 2\n  making 4\nthe rest: [4]\nStopIteration: the generator is used up\nsum, then sum again: 14 0",
  "m4/pull_trace.py": "with lists\n  read  1\n  read  2\n  read  3\n  read  4\n  parse 1\n  parse 2\n  parse 3\n  parse 4\n  keep  1\n  drop  2\n  keep  3\n  drop  4\n  write 1\n  write 3\nwith generators\n  read  1\n  parse 1\n  keep  1\n  write 1\n  read  2\n  parse 2\n  drop  2\n  read  3\n  parse 3\n  keep  3\n  write 3\n  read  4\n  parse 4\n  drop  4",
  "m4/itertools_tools.py": "batched: [(0, 1, 2), (3, 4, 5), (6,)]\nislice of an endless count: [1, 2, 3, 4, 5]\nchain: ['a', 'b', 'c']\npairwise: [(1, 4), (4, 9), (9, 16)]\ngroupby, input not sorted: [('SG-01', [1250]), ('KL-01', [3100]), ('SG-01', [475]), ('KL-01', [1990])]\ngroupby, input sorted:     [('KL-01', [1990, 3100]), ('SG-01', [475, 1250])]",
  "m4/generator_close.py": "open a.csv\nclose a.csv\nafter the loop\nopen b.csv\nleaving the with block\nclose b.csv\ndone",
  "m4/flatten_json.py": "order_id         'O-1'\ncustomer.id      'C-7'\ncustomer.tier    'gold'\nlines.0.sku      'LATTE'\nlines.0.qty      2\nlines.1.sku      'MUFFIN'\nlines.1.qty      1\nnote             None\ntests passed",
  "m4/sessionize.py": "C-1  minutes   5 to  20  events: 2\nC-1  minutes  90 to 100  events: 2\nC-2  minutes  15 to  15  events: 1\nC-3  minutes   0 to  30  events: 2\nC-3  minutes  61 to  61  events: 1\ntests passed",
  "m4/pipeline.py": "paid orders: 133,273 in 14 batches\npaid revenue: 8,250,382.67\npeak memory held by Python: 7.47 MB",
  "m5/csv_traps.py": "bytes in the file: 122   lines: 5\n\nwith line.split(','):\n   4 fields: ['\\ufefforder_id', 'customer', 'note', 'total']\n   5 fields: ['O-1', '\"Ng', ' Mei\"', '\"extra shot\"']\n   3 fields: ['O-2', 'Ravi', '\"leave at door']\n   2 fields: ['ring twice\"', '4.75']\n   4 fields: ['O-3', 'Zoë', '', '31.00']\n\nwith the csv module:\n   {'\\ufefforder_id': 'O-1', 'customer': 'Ng, Mei', 'note': 'extra shot', 'total': '12.50'}\n   {'\\ufefforder_id': 'O-2', 'customer': 'Ravi', 'note': 'leave at door\\nring twice', 'total': '4.75'}\n   {'\\ufefforder_id': 'O-3', 'customer': 'Zoë', 'note': '', 'total': '31.00'}\n\nwith the csv module, and the byte order mark removed:\n   ['O-1', 'O-2', 'O-3'] total: 48.25",
  "m5/encodings.py": "'Zoe'\n   utf-8    3 bytes  5a 6f 65\n   latin-1  3 bytes  5a 6f 65\n   utf-16   8 bytes  ff fe 5a 00 6f 00 65 00\n'Zoë'\n   utf-8    4 bytes  5a 6f c3 ab\n   latin-1  3 bytes  5a 6f eb\n   utf-16   8 bytes  ff fe 5a 00 6f 00 eb 00\n'café'\n   utf-8    5 bytes  63 61 66 c3 a9\n   latin-1  4 bytes  63 61 66 e9\n   utf-16   10 bytes  ff fe 63 00 61 00 66 00 e9 00\n'東京'\n   utf-8    6 bytes  e6 9d b1 e4 ba ac\n   latin-1  cannot encode: ordinal not in range(256)\n   utf-16   6 bytes  ff fe 71 67 ac 4e\n\nthe bytes of 'café' in UTF-8, read as latin-1: cafÃ©\nthe bytes of 'café' in latin-1, read as UTF-8: UnicodeDecodeError: unexpected end of data at byte 3\nthe same bytes, errors='replace': caf�\na file saved with a byte order mark: '\\ufefforder_id' against 'order_id'",
  "m5/json_lines.py": "JSON array: 175 bytes.  JSON Lines: 170 bytes, one object per line\n\nthe array, cut at byte 118 :\n  JSONDecodeError: Expecting value (line 1, column 119)  ->  0 orders readable\n\nthe JSON Lines file, cut at byte 118 :\n  readable lines: 3   broken lines: 1 (the last one, cut in the middle)\n  the last bytes of the cut file: 'order_id\": \"O-'",
  "m5/atomic_write.py": "in place:    the job was killed -> the file now has 3 of 5 orders, and last night's file is gone\natomically:  the job was killed -> the file still has 1 order from last night, nothing half written\natomically, no failure: the file has 5 orders; [] temporary files are left",
  "m5/paths.py": "name: part-1.csv  stem: part-1  suffix: .csv  parent folder: dt=2026-03-14\nanother extension: part-1.parquet\nis a file: True  exists: False\n\nsorted as text:    ['part-1.csv', 'part-10.csv', 'part-2.csv']\nsorted by number:  ['part-1.csv', 'part-2.csv', 'part-10.csv']\nzero-padded names sort correctly as text: ['part-0001.csv', 'part-0002.csv', 'part-0010.csv']",
  "m5/parquet_tour.py": "rows: 200000  row groups: 4  columns: 5\norder_id: string\nstore: string\nstatus: string\ntotal: decimal128(10, 2)\nordered_at: timestamp[us]\n\nrow group  rows    first order_at        last order_at\n        0  50000   2026-03-01 00:00:05  2026-03-08 18:38:14\n        1  50000   2026-03-08 18:38:16  2026-03-16 13:01:20\n        2  50000   2026-03-16 13:01:22  2026-03-24 06:44:28\n        3  50000   2026-03-24 06:44:36  2026-03-31 23:59:56\n\nrows from 30 March on: the statistics select 1 of 4 row groups to read\none column only: 200000 values, without reading the other four",
  "m5/parse_log.py": "2026-03-14T02:00:01Z INFO load_orders  1200 340\n2026-03-14T02:00:05Z WARN load_orders  0 12\n2026-03-14T02:01:00Z INFO load_stores  40 8\nunparsable lines: 2\ntests passed",
  "m5/write_partitions.py": "dt=2026-03-14/part-0000.csv  3 rows\ndt=2026-03-15/part-0000.csv  2 rows\ntests passed",
  "m5/read_csv_safely.py": "rows: 3  columns: ['order_id', 'customer', 'note', 'total']\ncustomer of the first row: Ng, Mei\nnote of the second row: 'leave at door\\nring twice'\ntotal as money: 48.25"
 },
 "tables": {
  "m3.structs": {
   "cols": [
    "structure",
    "bytes",
    "bytes per record",
    "measured with"
   ],
   "rows": [
    [
     "a list of dicts",
     100323037,
     501.6,
     "tracemalloc"
    ],
    [
     "a list of tuples",
     65122845,
     325.6,
     "tracemalloc"
    ],
    [
     "a list of named tuples",
     66723037,
     333.6,
     "tracemalloc"
    ],
    [
     "a list of dataclass objects",
     69925581,
     349.6,
     "tracemalloc"
    ],
    [
     "a list of dataclass objects with slots",
     61923037,
     309.6,
     "tracemalloc"
    ],
    [
     "a dict of lists (one list per column)",
     54043245,
     270.2,
     "tracemalloc"
    ],
    [
     "a pandas DataFrame, default types",
     14700129,
     73.5,
     "memory_usage(deep=True)"
    ],
    [
     "a pandas DataFrame, with category and small integers",
     5256744,
     26.3,
     "memory_usage(deep=True)"
    ],
    [
     "a pyarrow Table",
     11499997,
     57.5,
     "Table.nbytes"
    ],
    [
     "a Polars DataFrame",
     8299997,
     41.5,
     "DataFrame.estimated_size()"
    ]
   ]
  }
 },
 "counts": {
  "exit": {
   "m1_fragile_script.py#1": 1,
   "m1_fragile_script.py#2": 1,
   "m1_partial_failure.py#1": 0,
   "m1_partial_failure.py#2": 0,
   "m1_hidden_state.py": 0,
   "m1_safe_rerun.py#1": 0,
   "m1_safe_rerun.py#2": 0,
   "m1_versions.py": 0,
   "m1/load_orders_v7.py#1": 0,
   "m1/load_orders_v7.py#2": 0,
   "m1/partial_failure.py#1": 0,
   "m1/partial_failure.py#2": 0,
   "m1/notebook_cells.py": 0,
   "m1/load_orders_v8.py#1": 0,
   "m1/load_orders_v8.py#2": 0,
   "m1/versions.py": 0,
   "m2/venv_session|/tmp/claude-0/-home-user/a3635923-0dcc-5766-9df4-bde417681138/scratchpad/python/venv/bin/python -m venv .venv": 0,
   "m2/venv_session|ls .venv": 0,
   "m2/venv_session|grep -E \"^(include-system-site-packages|version) \" .venv/pyvenv.cfg": 0,
   "m2/venv_session|.venv/bin/python -c \"import sys; print(sys.prefix.endswith('.venv'), sys.prefix != sys.base_prefix)\"": 0,
   "m2/venv_session|.venv/bin/python -c \"import pandas\"": 1,
   "m2/venv_session|uv pip install --python .venv/bin/python \"pandas>=3,<4\" 2>&1 | grep -v \"^warning\" | sed -E \"s/ in [0-9.]+m?s/ in Nms/\"": 0,
   "m2/venv_session|.venv/bin/python -c \"import pandas; print(pandas.__version__)\"": 0,
   "m2/uv_session|uv init --package brewline-etl --python 3.14 --author-from none": 0,
   "m2/uv_session|cd brewline-etl && ls -A": 0,
   "m2/uv_session|cd brewline-etl && uv add requests \"pandas>=3,<4\"": 0,
   "m2/uv_session|cd brewline-etl && uv tree --depth 1": 0,
   "m2/uv_session|cd brewline-etl && uv run python -c \"import requests, pandas; print(requests.__version__, pandas.__version__)\"": 0,
   "m2/uv_session|cd brewline-etl && uv add --dev pytest": 0,
   "m2/lock_check|uv lock --check 2>&1 | grep -v \"^warning\"": 0,
   "m2/lock_check|uv sync --locked 2>&1 | grep -v \"^warning\"": 0,
   "m2/lock_check|uv lock 2>&1 | grep -v \"^warning\" | sed -E \"s/ in [0-9.]+m?s/ in Nms/\"": 0,
   "m2/lock_check|uv sync --locked 2>&1 | grep -v \"^warning\" | sed -E \"s/ in [0-9.]+m?s/ in Nms/\"": 0,
   "m2/pandas_versions.py@old": 0,
   "m2/pandas_versions.py@new": 0,
   "m2/venv_session|uv pip install --python .venv/bin/python \"pandas>=3,<4\"": 0,
   "m2/lock_check|uv lock --check": 1,
   "m2/lock_check|uv sync --locked": 0,
   "m2/lock_check|uv lock": 0,
   "m3/membership_counts.py": 0,
   "m3/hashing.py": 0,
   "m3/mutable_default.py": 0,
   "m3/copying.py": 0,
   "m3/group_count.py": 0,
   "m3/sizes.py": 0,
   "m3/latest_per_key.py": 0,
   "m3/top_k_per_group.py": 0,
   "m4/generator_basics.py": 0,
   "m4/pull_trace.py": 0,
   "m4/itertools_tools.py": 0,
   "m4/generator_close.py": 0,
   "m4/flatten_json.py": 0,
   "m4/sessionize.py": 0,
   "m4/pipeline.py": 0,
   "m5/csv_traps.py": 0,
   "m5/encodings.py": 0,
   "m5/json_lines.py": 0,
   "m5/atomic_write.py": 0,
   "m5/paths.py": 0,
   "m5/parquet_tour.py": 0,
   "m5/parse_log.py": 0,
   "m5/write_partitions.py": 0,
   "m5/read_csv_safely.py": 0
  },
  "m2.specifiers.pandas": {
   "versions": [
    "2.0.3",
    "2.1.4",
    "2.2.3",
    "2.3.3",
    "3.0.0",
    "3.0.6",
    "3.1.0",
    "3.1.1"
   ],
   "specs": [
    {
     "spec": "==3.1.1",
     "matches": [
      "3.1.1"
     ]
    },
    {
     "spec": ">=3",
     "matches": [
      "3.0.0",
      "3.0.6",
      "3.1.0",
      "3.1.1"
     ]
    },
    {
     "spec": ">=2.2,<3",
     "matches": [
      "2.2.3",
      "2.3.3"
     ]
    },
    {
     "spec": "~=3.0",
     "matches": [
      "3.0.0",
      "3.0.6",
      "3.1.0",
      "3.1.1"
     ]
    },
    {
     "spec": "~=3.0.2",
     "matches": [
      "3.0.6"
     ]
    },
    {
     "spec": "!=3.0.0",
     "matches": [
      "2.0.3",
      "2.1.4",
      "2.2.3",
      "2.3.3",
      "3.0.6",
      "3.1.0",
      "3.1.1"
     ]
    },
    {
     "spec": "<3.1",
     "matches": [
      "2.0.3",
      "2.1.4",
      "2.2.3",
      "2.3.3",
      "3.0.0",
      "3.0.6"
     ]
    },
    {
     "spec": "==3.*",
     "matches": [
      "3.0.0",
      "3.0.6",
      "3.1.0",
      "3.1.1"
     ]
    },
    {
     "spec": ">3.1",
     "matches": [
      "3.1.1"
     ]
    }
   ],
   "checked": "release list sampled from PyPI; matching by packaging.specifiers.SpecifierSet"
  },
  "m2.specifiers.requests": {
   "versions": [
    "2.28.2",
    "2.31.0",
    "2.32.3",
    "2.32.5",
    "2.33.1",
    "2.34.0",
    "2.34.2"
   ],
   "specs": [
    {
     "spec": "==2.32.3",
     "matches": [
      "2.32.3"
     ]
    },
    {
     "spec": ">=2.31",
     "matches": [
      "2.31.0",
      "2.32.3",
      "2.32.5",
      "2.33.1",
      "2.34.0",
      "2.34.2"
     ]
    },
    {
     "spec": "~=2.32.0",
     "matches": [
      "2.32.3",
      "2.32.5"
     ]
    },
    {
     "spec": "~=2.32",
     "matches": [
      "2.32.3",
      "2.32.5",
      "2.33.1",
      "2.34.0",
      "2.34.2"
     ]
    },
    {
     "spec": "<2.33",
     "matches": [
      "2.28.2",
      "2.31.0",
      "2.32.3",
      "2.32.5"
     ]
    },
    {
     "spec": ">=2.32,<2.34",
     "matches": [
      "2.32.3",
      "2.32.5",
      "2.33.1"
     ]
    },
    {
     "spec": "!=2.34.0",
     "matches": [
      "2.28.2",
      "2.31.0",
      "2.32.3",
      "2.32.5",
      "2.33.1",
      "2.34.2"
     ]
    },
    {
     "spec": "==2.33.*",
     "matches": [
      "2.33.1"
     ]
    },
    {
     "spec": ">2.34.0",
     "matches": [
      "2.34.2"
     ]
    }
   ],
   "checked": "release list sampled from PyPI; matching by packaging.specifiers.SpecifierSet"
  },
  "m3.structs.meta": {
   "records": 200000,
   "fields": [
    "order_id",
    "customer_id",
    "store",
    "status",
    "total_cents",
    "items"
   ]
  },
  "m3.lookup": {
   "sizes": [
    1000,
    10000,
    100000,
    1000000
   ],
   "list": [
    7.8434,
    81.3152,
    820.2874,
    8373.6749
   ],
   "set": [
    0.0301,
    0.0283,
    0.0307,
    0.0356
   ],
   "dict": [
    0.0311,
    0.0396,
    0.0363,
    0.0367
   ],
   "lookups": {
    "1000": {
     "list": 200,
     "set_dict": 2000
    },
    "10000": {
     "list": 200,
     "set_dict": 2000
    },
    "100000": {
     "list": 10,
     "set_dict": 200
    },
    "1000000": {
     "list": 10,
     "set_dict": 200
    }
   },
   "runs": 5,
   "note": "microseconds per membership test, median of 5 runs, on this machine"
  },
  "m3.idset": {
   "ids": "strings like O-00000001",
   "measured_with": "tracemalloc",
   "set_of_ids": [
    {
     "n": 1000000,
     "bytes": 84554648,
     "per_id": 84.6
    },
    {
     "n": 4000000,
     "bytes": 338217944,
     "per_id": 84.6
    }
   ],
   "list_of_ids": [
    {
     "n": 1000000,
     "bytes": 59448672,
     "per_id": 59.4
    },
    {
     "n": 4000000,
     "bytes": 238724128,
     "per_id": 59.7
    }
   ]
  },
  "m4.genmem": {
   "sizes": [
    50000,
    100000,
    200000,
    400000,
    800000
   ],
   "list": [
    {
     "peak_bytes": 28975279,
     "paid_cents": 206982287
    },
    {
     "peak_bytes": 57705844,
     "paid_cents": 412039888
    },
    {
     "peak_bytes": 115277472,
     "paid_cents": 825038267
    },
    {
     "peak_bytes": 230439878,
     "paid_cents": 1649660308
    },
    {
     "peak_bytes": 460812207,
     "paid_cents": 3295046208
    }
   ],
   "generator": [
    {
     "peak_bytes": 11673654,
     "paid_cents": 206982287
    },
    {
     "peak_bytes": 11674129,
     "paid_cents": 412039888
    },
    {
     "peak_bytes": 11679826,
     "paid_cents": 825038267
    },
    {
     "peak_bytes": 11680003,
     "paid_cents": 1649660308
    },
    {
     "peak_bytes": 11682787,
     "paid_cents": 3295046208
    }
   ],
   "file_bytes": [
    2924229,
    5849320,
    11699892,
    23397748,
    46796291
   ],
   "note": "peak bytes of Python memory (tracemalloc) while adding up the paid orders of a CSV file; both ways give the same total"
  },
  "m5.encoding": {
   "texts": [
    "Zoe",
    "Zoë",
    "café",
    "Ñandú",
    "東京"
   ],
   "file_encodings": [
    "utf-8",
    "utf-16",
    "latin-1",
    "cp1252"
   ],
   "readers": [
    "utf-8",
    "latin-1",
    "cp1252",
    "ascii"
   ],
   "cells": {
    "Zoe|utf-8|utf-8": {
     "bytes": "5a 6f 65",
     "length": 3,
     "text": "Zoe"
    },
    "Zoe|utf-8|latin-1": {
     "bytes": "5a 6f 65",
     "length": 3,
     "text": "Zoe"
    },
    "Zoe|utf-8|cp1252": {
     "bytes": "5a 6f 65",
     "length": 3,
     "text": "Zoe"
    },
    "Zoe|utf-8|ascii": {
     "bytes": "5a 6f 65",
     "length": 3,
     "text": "Zoe"
    },
    "Zoe|utf-16|utf-8": {
     "bytes": "ff fe 5a 00 6f 00 65 00",
     "length": 8,
     "error": "UnicodeDecodeError: invalid start byte at byte 0"
    },
    "Zoe|utf-16|latin-1": {
     "bytes": "ff fe 5a 00 6f 00 65 00",
     "length": 8,
     "text": "ÿþZ\u0000o\u0000e\u0000"
    },
    "Zoe|utf-16|cp1252": {
     "bytes": "ff fe 5a 00 6f 00 65 00",
     "length": 8,
     "text": "ÿþZ\u0000o\u0000e\u0000"
    },
    "Zoe|utf-16|ascii": {
     "bytes": "ff fe 5a 00 6f 00 65 00",
     "length": 8,
     "error": "UnicodeDecodeError: ordinal not in range(128) at byte 0"
    },
    "Zoe|latin-1|utf-8": {
     "bytes": "5a 6f 65",
     "length": 3,
     "text": "Zoe"
    },
    "Zoe|latin-1|latin-1": {
     "bytes": "5a 6f 65",
     "length": 3,
     "text": "Zoe"
    },
    "Zoe|latin-1|cp1252": {
     "bytes": "5a 6f 65",
     "length": 3,
     "text": "Zoe"
    },
    "Zoe|latin-1|ascii": {
     "bytes": "5a 6f 65",
     "length": 3,
     "text": "Zoe"
    },
    "Zoe|cp1252|utf-8": {
     "bytes": "5a 6f 65",
     "length": 3,
     "text": "Zoe"
    },
    "Zoe|cp1252|latin-1": {
     "bytes": "5a 6f 65",
     "length": 3,
     "text": "Zoe"
    },
    "Zoe|cp1252|cp1252": {
     "bytes": "5a 6f 65",
     "length": 3,
     "text": "Zoe"
    },
    "Zoe|cp1252|ascii": {
     "bytes": "5a 6f 65",
     "length": 3,
     "text": "Zoe"
    },
    "Zoë|utf-8|utf-8": {
     "bytes": "5a 6f c3 ab",
     "length": 4,
     "text": "Zoë"
    },
    "Zoë|utf-8|latin-1": {
     "bytes": "5a 6f c3 ab",
     "length": 4,
     "text": "ZoÃ«"
    },
    "Zoë|utf-8|cp1252": {
     "bytes": "5a 6f c3 ab",
     "length": 4,
     "text": "ZoÃ«"
    },
    "Zoë|utf-8|ascii": {
     "bytes": "5a 6f c3 ab",
     "length": 4,
     "error": "UnicodeDecodeError: ordinal not in range(128) at byte 2"
    },
    "Zoë|utf-16|utf-8": {
     "bytes": "ff fe 5a 00 6f 00 eb 00",
     "length": 8,
     "error": "UnicodeDecodeError: invalid start byte at byte 0"
    },
    "Zoë|utf-16|latin-1": {
     "bytes": "ff fe 5a 00 6f 00 eb 00",
     "length": 8,
     "text": "ÿþZ\u0000o\u0000ë\u0000"
    },
    "Zoë|utf-16|cp1252": {
     "bytes": "ff fe 5a 00 6f 00 eb 00",
     "length": 8,
     "text": "ÿþZ\u0000o\u0000ë\u0000"
    },
    "Zoë|utf-16|ascii": {
     "bytes": "ff fe 5a 00 6f 00 eb 00",
     "length": 8,
     "error": "UnicodeDecodeError: ordinal not in range(128) at byte 0"
    },
    "Zoë|latin-1|utf-8": {
     "bytes": "5a 6f eb",
     "length": 3,
     "error": "UnicodeDecodeError: unexpected end of data at byte 2"
    },
    "Zoë|latin-1|latin-1": {
     "bytes": "5a 6f eb",
     "length": 3,
     "text": "Zoë"
    },
    "Zoë|latin-1|cp1252": {
     "bytes": "5a 6f eb",
     "length": 3,
     "text": "Zoë"
    },
    "Zoë|latin-1|ascii": {
     "bytes": "5a 6f eb",
     "length": 3,
     "error": "UnicodeDecodeError: ordinal not in range(128) at byte 2"
    },
    "Zoë|cp1252|utf-8": {
     "bytes": "5a 6f eb",
     "length": 3,
     "error": "UnicodeDecodeError: unexpected end of data at byte 2"
    },
    "Zoë|cp1252|latin-1": {
     "bytes": "5a 6f eb",
     "length": 3,
     "text": "Zoë"
    },
    "Zoë|cp1252|cp1252": {
     "bytes": "5a 6f eb",
     "length": 3,
     "text": "Zoë"
    },
    "Zoë|cp1252|ascii": {
     "bytes": "5a 6f eb",
     "length": 3,
     "error": "UnicodeDecodeError: ordinal not in range(128) at byte 2"
    },
    "café|utf-8|utf-8": {
     "bytes": "63 61 66 c3 a9",
     "length": 5,
     "text": "café"
    },
    "café|utf-8|latin-1": {
     "bytes": "63 61 66 c3 a9",
     "length": 5,
     "text": "cafÃ©"
    },
    "café|utf-8|cp1252": {
     "bytes": "63 61 66 c3 a9",
     "length": 5,
     "text": "cafÃ©"
    },
    "café|utf-8|ascii": {
     "bytes": "63 61 66 c3 a9",
     "length": 5,
     "error": "UnicodeDecodeError: ordinal not in range(128) at byte 3"
    },
    "café|utf-16|utf-8": {
     "bytes": "ff fe 63 00 61 00 66 00 e9 00",
     "length": 10,
     "error": "UnicodeDecodeError: invalid start byte at byte 0"
    },
    "café|utf-16|latin-1": {
     "bytes": "ff fe 63 00 61 00 66 00 e9 00",
     "length": 10,
     "text": "ÿþc\u0000a\u0000f\u0000é\u0000"
    },
    "café|utf-16|cp1252": {
     "bytes": "ff fe 63 00 61 00 66 00 e9 00",
     "length": 10,
     "text": "ÿþc\u0000a\u0000f\u0000é\u0000"
    },
    "café|utf-16|ascii": {
     "bytes": "ff fe 63 00 61 00 66 00 e9 00",
     "length": 10,
     "error": "UnicodeDecodeError: ordinal not in range(128) at byte 0"
    },
    "café|latin-1|utf-8": {
     "bytes": "63 61 66 e9",
     "length": 4,
     "error": "UnicodeDecodeError: unexpected end of data at byte 3"
    },
    "café|latin-1|latin-1": {
     "bytes": "63 61 66 e9",
     "length": 4,
     "text": "café"
    },
    "café|latin-1|cp1252": {
     "bytes": "63 61 66 e9",
     "length": 4,
     "text": "café"
    },
    "café|latin-1|ascii": {
     "bytes": "63 61 66 e9",
     "length": 4,
     "error": "UnicodeDecodeError: ordinal not in range(128) at byte 3"
    },
    "café|cp1252|utf-8": {
     "bytes": "63 61 66 e9",
     "length": 4,
     "error": "UnicodeDecodeError: unexpected end of data at byte 3"
    },
    "café|cp1252|latin-1": {
     "bytes": "63 61 66 e9",
     "length": 4,
     "text": "café"
    },
    "café|cp1252|cp1252": {
     "bytes": "63 61 66 e9",
     "length": 4,
     "text": "café"
    },
    "café|cp1252|ascii": {
     "bytes": "63 61 66 e9",
     "length": 4,
     "error": "UnicodeDecodeError: ordinal not in range(128) at byte 3"
    },
    "Ñandú|utf-8|utf-8": {
     "bytes": "c3 91 61 6e 64 c3 ba",
     "length": 7,
     "text": "Ñandú"
    },
    "Ñandú|utf-8|latin-1": {
     "bytes": "c3 91 61 6e 64 c3 ba",
     "length": 7,
     "text": "ÃandÃº"
    },
    "Ñandú|utf-8|cp1252": {
     "bytes": "c3 91 61 6e 64 c3 ba",
     "length": 7,
     "text": "Ã‘andÃº"
    },
    "Ñandú|utf-8|ascii": {
     "bytes": "c3 91 61 6e 64 c3 ba",
     "length": 7,
     "error": "UnicodeDecodeError: ordinal not in range(128) at byte 0"
    },
    "Ñandú|utf-16|utf-8": {
     "bytes": "ff fe d1 00 61 00 6e 00 64 00 fa 00",
     "length": 12,
     "error": "UnicodeDecodeError: invalid start byte at byte 0"
    },
    "Ñandú|utf-16|latin-1": {
     "bytes": "ff fe d1 00 61 00 6e 00 64 00 fa 00",
     "length": 12,
     "text": "ÿþÑ\u0000a\u0000n\u0000d\u0000ú\u0000"
    },
    "Ñandú|utf-16|cp1252": {
     "bytes": "ff fe d1 00 61 00 6e 00 64 00 fa 00",
     "length": 12,
     "text": "ÿþÑ\u0000a\u0000n\u0000d\u0000ú\u0000"
    },
    "Ñandú|utf-16|ascii": {
     "bytes": "ff fe d1 00 61 00 6e 00 64 00 fa 00",
     "length": 12,
     "error": "UnicodeDecodeError: ordinal not in range(128) at byte 0"
    },
    "Ñandú|latin-1|utf-8": {
     "bytes": "d1 61 6e 64 fa",
     "length": 5,
     "error": "UnicodeDecodeError: invalid continuation byte at byte 0"
    },
    "Ñandú|latin-1|latin-1": {
     "bytes": "d1 61 6e 64 fa",
     "length": 5,
     "text": "Ñandú"
    },
    "Ñandú|latin-1|cp1252": {
     "bytes": "d1 61 6e 64 fa",
     "length": 5,
     "text": "Ñandú"
    },
    "Ñandú|latin-1|ascii": {
     "bytes": "d1 61 6e 64 fa",
     "length": 5,
     "error": "UnicodeDecodeError: ordinal not in range(128) at byte 0"
    },
    "Ñandú|cp1252|utf-8": {
     "bytes": "d1 61 6e 64 fa",
     "length": 5,
     "error": "UnicodeDecodeError: invalid continuation byte at byte 0"
    },
    "Ñandú|cp1252|latin-1": {
     "bytes": "d1 61 6e 64 fa",
     "length": 5,
     "text": "Ñandú"
    },
    "Ñandú|cp1252|cp1252": {
     "bytes": "d1 61 6e 64 fa",
     "length": 5,
     "text": "Ñandú"
    },
    "Ñandú|cp1252|ascii": {
     "bytes": "d1 61 6e 64 fa",
     "length": 5,
     "error": "UnicodeDecodeError: ordinal not in range(128) at byte 0"
    },
    "東京|utf-8|utf-8": {
     "bytes": "e6 9d b1 e4 ba ac",
     "length": 6,
     "text": "東京"
    },
    "東京|utf-8|latin-1": {
     "bytes": "e6 9d b1 e4 ba ac",
     "length": 6,
     "text": "æ±äº¬"
    },
    "東京|utf-8|cp1252": {
     "bytes": "e6 9d b1 e4 ba ac",
     "length": 6,
     "error": "UnicodeDecodeError: character maps to <undefined> at byte 1"
    },
    "東京|utf-8|ascii": {
     "bytes": "e6 9d b1 e4 ba ac",
     "length": 6,
     "error": "UnicodeDecodeError: ordinal not in range(128) at byte 0"
    },
    "東京|utf-16|utf-8": {
     "bytes": "ff fe 71 67 ac 4e",
     "length": 6,
     "error": "UnicodeDecodeError: invalid start byte at byte 0"
    },
    "東京|utf-16|latin-1": {
     "bytes": "ff fe 71 67 ac 4e",
     "length": 6,
     "text": "ÿþqg¬N"
    },
    "東京|utf-16|cp1252": {
     "bytes": "ff fe 71 67 ac 4e",
     "length": 6,
     "text": "ÿþqg¬N"
    },
    "東京|utf-16|ascii": {
     "bytes": "ff fe 71 67 ac 4e",
     "length": 6,
     "error": "UnicodeDecodeError: ordinal not in range(128) at byte 0"
    },
    "東京|latin-1|utf-8": {
     "bytes": null,
     "error": "cannot encode: ordinal not in range(256)"
    },
    "東京|latin-1|latin-1": {
     "bytes": null,
     "error": "cannot encode: ordinal not in range(256)"
    },
    "東京|latin-1|cp1252": {
     "bytes": null,
     "error": "cannot encode: ordinal not in range(256)"
    },
    "東京|latin-1|ascii": {
     "bytes": null,
     "error": "cannot encode: ordinal not in range(256)"
    },
    "東京|cp1252|utf-8": {
     "bytes": null,
     "error": "cannot encode: character maps to <undefined>"
    },
    "東京|cp1252|latin-1": {
     "bytes": null,
     "error": "cannot encode: character maps to <undefined>"
    },
    "東京|cp1252|cp1252": {
     "bytes": null,
     "error": "cannot encode: character maps to <undefined>"
    },
    "東京|cp1252|ascii": {
     "bytes": null,
     "error": "cannot encode: character maps to <undefined>"
    }
   }
  },
  "m5.formats": {
   "rows": 200000,
   "formats": [
    {
     "format": "CSV",
     "file": "orders.csv",
     "bytes": 11699307,
     "query_ms": 84.61,
     "total": 12311029.11
    },
    {
     "format": "CSV, gzip",
     "file": "orders.csv.gz",
     "bytes": 3087406,
     "query_ms": 134.19,
     "total": 12311029.11
    },
    {
     "format": "CSV, zstd",
     "file": "orders.csv.zst",
     "bytes": 3363892,
     "query_ms": 105.47,
     "total": 12311029.11
    },
    {
     "format": "JSON Lines",
     "file": "orders.jsonl",
     "bytes": 30703423,
     "query_ms": 112.64,
     "total": 12311029.11
    },
    {
     "format": "JSON Lines, gzip",
     "file": "orders.jsonl.gz",
     "bytes": 3798380,
     "query_ms": 193.22,
     "total": 12311029.11
    },
    {
     "format": "Parquet, snappy",
     "file": "orders_snappy.parquet",
     "bytes": 4153000,
     "query_ms": 1.86,
     "total": 12311029.11
    },
    {
     "format": "Parquet, zstd",
     "file": "orders_zstd.parquet",
     "bytes": 2900742,
     "query_ms": 1.59,
     "total": 12311029.11
    }
   ],
   "query": "SELECT sum(total) FROM <the file>",
   "runs": 5,
   "note": "bytes of each file, and the median of 5 runs of one DuckDB query over it, on this machine"
  }
 }
};
