/* Everything the Python tutorial quotes as output. Written by python/verify/capture_py.py: do not edit by hand.
   Real runs of Python and its libraries on one machine with made-up Brewline data. Timings are medians from that machine. */
window.LAB = window.LAB || {};
LAB.real = {
 "meta": {
  "python": "3.14.6",
  "python_build": "3.14.6 (main, Jul 18 2026, 17:01:31) [Clang 22.1.3 ]",
  "implementation": "CPython",
  "platform": "Linux-6.18.44-fc-v445-x86_64-with-glibc2.39",
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
  "captured": "2026-11-13",
  "python_free_threaded": "3.14.6"
 },
 "files": {
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
  "m5/read_csv_safely.py": "\"\"\"The safe way to read a supplier CSV: say the encoding, pass newline=\"\", and let utf-8-sig drop a byte order mark.\"\"\"\nimport csv\n\nwith open(\"supplier.csv\", newline=\"\", encoding=\"utf-8-sig\") as f:\n    rows = list(csv.DictReader(f))\n\nprint(\"rows:\", len(rows), \" columns:\", list(rows[0]))\nprint(\"customer of the first row:\", rows[0][\"customer\"])\nprint(\"note of the second row:\", repr(rows[1][\"note\"]))\nprint(\"total as money:\", sum(float(r[\"total\"]) for r in rows))\n",
  "m5/csv_traps.py": "\"\"\"One supplier file, read two ways. The file has a quoted comma, a quoted line break and a byte order mark.\"\"\"\nimport csv\nimport io\n\nraw = (\n    \"﻿order_id,customer,note,total\\n\"\n    'O-1,\"Ng, Mei\",\"extra shot\",12.50\\n'\n    'O-2,Ravi,\"leave at door\\nring twice\",4.75\\n'\n    \"O-3,Zoë,,31.00\\n\"\n)\nprint(\"bytes in the file:\", len(raw.encode(\"utf-8\")), \"  lines:\", raw.count(\"\\n\"))\n\nprint(\"\\nwith line.split(','):\")\nfor line in raw.splitlines():\n    print(\"  \", len(line.split(\",\")), \"fields:\", line.split(\",\")[:4])\n\nprint(\"\\nwith the csv module:\")\nfor row in csv.DictReader(io.StringIO(raw)):\n    print(\"  \", row)\n\nprint(\"\\nwith the csv module, and the byte order mark removed:\")\nrows = list(csv.DictReader(io.StringIO(raw.lstrip(\"﻿\"))))\nprint(\"  \", [r[\"order_id\"] for r in rows], \"total:\", sum(float(r[\"total\"]) for r in rows))\n",
  "m5/encodings.py": "\"\"\"Text is characters. A file is bytes. An encoding is the rule between them.\"\"\"\nfor text in [\"Zoe\", \"Zoë\", \"café\", \"東京\"]:\n    print(f\"{text!r}\")\n    for enc in [\"utf-8\", \"latin-1\", \"utf-16\"]:\n        try:\n            data = text.encode(enc)\n            print(f\"   {enc:<8} {len(data)} bytes  {data.hex(' ')}\")\n        except UnicodeEncodeError as e:\n            print(f\"   {enc:<8} cannot encode: {e.reason}\")\n\ndata = \"café\".encode(\"utf-8\")\nprint()\nprint(\"the bytes of 'café' in UTF-8, read as latin-1:\", data.decode(\"latin-1\"))\nprint(\"the bytes of 'café' in latin-1, read as UTF-8:\", end=\" \")\ntry:\n    \"café\".encode(\"latin-1\").decode(\"utf-8\")\nexcept UnicodeDecodeError as e:\n    print(\"UnicodeDecodeError:\", e.reason, \"at byte\", e.start)\nprint(\"the same bytes, errors='replace':\", \"café\".encode(\"latin-1\").decode(\"utf-8\", errors=\"replace\"))\nprint(\"a file saved with a byte order mark:\", repr(b\"\\xef\\xbb\\xbforder_id\".decode(\"utf-8\")), \"against\", repr(b\"\\xef\\xbb\\xbforder_id\".decode(\"utf-8-sig\")))\n",
  "m5/json_lines.py": "\"\"\"One JSON document, or one JSON object per line, and a file that was cut off in the middle.\"\"\"\nimport json\n\norders = [{\"order_id\": f\"O-{i}\", \"total\": i * 1.5} for i in range(1, 6)]\n\nwhole = json.dumps(orders)\nlines = \"\\n\".join(json.dumps(o) for o in orders) + \"\\n\"\nprint(\"JSON array:\", len(whole), \"bytes.  JSON Lines:\", len(lines), \"bytes, one object per line\")\n\ncut = 118  # the upload stopped here\nprint(\"\\nthe array, cut at byte\", cut, \":\")\ntry:\n    json.loads(whole[:cut])\nexcept json.JSONDecodeError as e:\n    print(\"  JSONDecodeError:\", e.msg, f\"(line {e.lineno}, column {e.colno})  ->  0 orders readable\")\n\nprint(\"\\nthe JSON Lines file, cut at byte\", cut, \":\")\ngood = bad = 0\nfor line in lines[:cut].split(\"\\n\"):\n    if not line:\n        continue\n    try:\n        json.loads(line)\n        good += 1\n    except json.JSONDecodeError:\n        bad += 1\nprint(\"  readable lines:\", good, \"  broken lines:\", bad, \"(the last one, cut in the middle)\")\nprint(\"  the last bytes of the cut file:\", repr(lines[:cut][-14:]))\n",
  "m5/atomic_write.py": "\"\"\"A job that stops while it writes. Two ways to write the same file.\"\"\"\nimport os\nimport pathlib\nimport tempfile\n\nrows = [f\"O-{i},{i * 2.5}\\n\" for i in range(1, 6)]\ntarget = pathlib.Path(\"orders.csv\")\ntarget.write_text(\"order_id,total\\nO-0,1.0\\n\")  # last night's complete file\n\n\ndef write_in_place(path, rows, fail_after):\n    with open(path, \"w\") as f:\n        f.write(\"order_id,total\\n\")\n        for n, r in enumerate(rows):\n            if n == fail_after:\n                raise RuntimeError(\"the job was killed\")\n            f.write(r)\n\n\ndef write_atomically(path, rows, fail_after):\n    fd, tmp = tempfile.mkstemp(dir=path.parent, suffix=\".tmp\")\n    try:\n        with os.fdopen(fd, \"w\") as f:\n            f.write(\"order_id,total\\n\")\n            for n, r in enumerate(rows):\n                if n == fail_after:\n                    raise RuntimeError(\"the job was killed\")\n                f.write(r)\n        os.replace(tmp, path)  # one step: the new file replaces the old one\n    except BaseException:\n        os.unlink(tmp)\n        raise\n\n\ndef lines(path):\n    return len(path.read_text().splitlines()) - 1\n\n\ntry:\n    write_in_place(target, rows, fail_after=3)\nexcept RuntimeError as e:\n    print(\"in place:   \", e, \"-> the file now has\", lines(target), \"of 5 orders, and last night's file is gone\")\n\ntarget.write_text(\"order_id,total\\nO-0,1.0\\n\")\ntry:\n    write_atomically(target, rows, fail_after=3)\nexcept RuntimeError as e:\n    print(\"atomically: \", e, \"-> the file still has\", lines(target), \"order from last night, nothing half written\")\n\nwrite_atomically(target, rows, fail_after=99)\nprint(\"atomically, no failure: the file has\", lines(target), \"orders;\", sorted(p.name for p in pathlib.Path(\".\").iterdir() if p.suffix == \".tmp\"), \"temporary files are left\")\n",
  "m5/paths.py": "\"\"\"Paths with pathlib, a partitioned layout, and the sort that surprises people.\"\"\"\nimport pathlib\nimport tempfile\n\nroot = pathlib.Path(tempfile.mkdtemp())\nfor name in [\"part-1.csv\", \"part-2.csv\", \"part-10.csv\", \"notes.txt\"]:\n    (root / \"dt=2026-03-14\").mkdir(parents=True, exist_ok=True)\n    (root / \"dt=2026-03-14\" / name).write_text(\"x\")\n\np = root / \"dt=2026-03-14\" / \"part-1.csv\"\nprint(\"name:\", p.name, \" stem:\", p.stem, \" suffix:\", p.suffix, \" parent folder:\", p.parent.name)\nprint(\"another extension:\", p.with_suffix(\".parquet\").name)\nprint(\"is a file:\", p.is_file(), \" exists:\", (root / \"nothing\").exists())\n\nfiles = [f.name for f in (root / \"dt=2026-03-14\").glob(\"part-*.csv\")]\nprint(\"\\nsorted as text:   \", sorted(files))\nprint(\"sorted by number: \", sorted(files, key=lambda n: int(n.split(\"-\")[1].split(\".\")[0])))\nprint(\"zero-padded names sort correctly as text:\", sorted([\"part-0001.csv\", \"part-0002.csv\", \"part-0010.csv\"]))\n",
  "m5/parquet_tour.py": "\"\"\"What is inside a Parquet file: row groups, types and the minimum and maximum of each column.\"\"\"\nimport datetime as dt\nimport random\nfrom decimal import Decimal\n\nimport pyarrow as pa\nimport pyarrow.dataset as ds\nimport pyarrow.parquet as pq\n\nrng = random.Random(42)  # made-up orders, the same on every machine\nstart = dt.datetime(2026, 3, 1)\nrows = sorted(\n    (f\"O-{i:07d}\", rng.choice([\"SG-01\", \"SG-02\", \"KL-01\", \"JK-01\"]), rng.choice([\"paid\", \"paid\", \"paid\", \"cancelled\"]),\n     Decimal(rng.randint(350, 12000)) / 100, start + dt.timedelta(seconds=rng.randint(0, 31 * 86400 - 1)))\n    for i in range(200_000)\n)\nrows.sort(key=lambda r: r[4])\ntable = pa.table({\n    \"order_id\": [r[0] for r in rows],\n    \"store\": [r[1] for r in rows],\n    \"status\": [r[2] for r in rows],\n    \"total\": pa.array([r[3] for r in rows], pa.decimal128(10, 2)),\n    \"ordered_at\": pa.array([r[4] for r in rows], pa.timestamp(\"us\")),\n})\npq.write_table(table, \"orders.parquet\", row_group_size=50_000, compression=\"zstd\")\n\nf = pq.ParquetFile(\"orders.parquet\")\nprint(\"rows:\", f.metadata.num_rows, \" row groups:\", f.metadata.num_row_groups, \" columns:\", f.metadata.num_columns)\nprint(f.schema_arrow)\nprint()\nprint(\"row group  rows    first order_at        last order_at\")\nfor g in range(f.metadata.num_row_groups):\n    st = f.metadata.row_group(g).column(4).statistics\n    print(f\"{g:>9}  {f.metadata.row_group(g).num_rows:<6}  {st.min}  {st.max}\")\n\ndataset = ds.dataset(\"orders.parquet\")\nflt = ds.field(\"ordered_at\") >= pa.scalar(dt.datetime(2026, 3, 30), pa.timestamp(\"us\"))\nfragment = next(iter(dataset.get_fragments()))\npicked = list(fragment.split_by_row_group(filter=flt))\nprint(f\"\\nrows from 30 March on: the statistics select {len(picked)} of {f.metadata.num_row_groups} row groups to read\")\nprint(\"one column only:\", pq.read_table(\"orders.parquet\", columns=[\"total\"]).num_rows, \"values, without reading the other four\")\n",
  "m5/parse_log.py": "\"\"\"Coding round: turn log lines into dicts, and count the lines that cannot be parsed.\"\"\"\nimport re\n\nPATTERN = re.compile(r\"^(?P<ts>\\S+) (?P<level>[A-Z]+) (?P<job>\\S+) rows=(?P<rows>\\d+) ms=(?P<ms>\\d+)$\")\n\nlines = [\n    \"2026-03-14T02:00:01Z INFO load_orders rows=1200 ms=340\",\n    \"2026-03-14T02:00:05Z WARN load_orders rows=0 ms=12\",\n    \"2026-03-14T02:01:00Z INFO load_stores rows=40 ms=8\",\n    \"this line is not a log line\",\n    \"2026-03-14T02:02:00Z INFO load_orders rows=abc ms=9\",\n]\n\n\ndef parse_log(lines):\n    good, bad = [], 0\n    for line in lines:\n        m = PATTERN.match(line)\n        if not m:\n            bad += 1\n            continue\n        d = m.groupdict()\n        d[\"rows\"], d[\"ms\"] = int(d[\"rows\"]), int(d[\"ms\"])\n        good.append(d)\n    return good, bad\n\n\ngood, bad = parse_log(lines)\nfor d in good:\n    print(d[\"ts\"], d[\"level\"].ljust(4), d[\"job\"].ljust(12), d[\"rows\"], d[\"ms\"])\nprint(\"unparsable lines:\", bad)\n\nassert len(good) == 3 and bad == 2\nassert parse_log([]) == ([], 0)\nprint(\"tests passed\")\n",
  "m5/write_partitions.py": "\"\"\"Coding round: write orders into one folder for each day, so a later job can read a single day.\"\"\"\nimport csv\nimport os\nimport pathlib\nimport tempfile\nfrom collections import defaultdict\n\norders = [\n    (\"O-1\", \"2026-03-14 08:15:00\", 12.5), (\"O-2\", \"2026-03-14 09:02:00\", 4.75), (\"O-3\", \"2026-03-15 00:03:00\", 8.2),\n    (\"O-4\", \"2026-03-15 10:41:00\", 19.9), (\"O-5\", \"2026-03-14 23:58:00\", 31.0),\n]\n\n\ndef write_partitions(rows, root):\n    by_day = defaultdict(list)\n    for order_id, ts, total in rows:\n        by_day[ts[:10]].append((order_id, ts, total))\n    written = {}\n    for day, day_rows in sorted(by_day.items()):\n        folder = pathlib.Path(root) / f\"dt={day}\"\n        folder.mkdir(parents=True, exist_ok=True)\n        fd, tmp = tempfile.mkstemp(dir=folder, suffix=\".tmp\")\n        with os.fdopen(fd, \"w\", newline=\"\") as f:\n            csv.writer(f).writerows(sorted(day_rows))\n        os.replace(tmp, folder / \"part-0000.csv\")\n        written[day] = len(day_rows)\n    return written\n\n\nroot = tempfile.mkdtemp()\nresult = write_partitions(orders, root)\nfor day, n in result.items():\n    print(f\"dt={day}/part-0000.csv  {n} rows\")\nassert write_partitions(orders, root) == result  # running it again changes nothing\nassert sorted(p.name for p in pathlib.Path(root).iterdir()) == [\"dt=2026-03-14\", \"dt=2026-03-15\"]\nprint(\"tests passed\")\n",
  "m6/naive_aware.py": "\"\"\"A datetime without a time zone is a clock reading. A datetime with one is a moment.\"\"\"\nimport warnings\nfrom datetime import datetime, timedelta, timezone\n\nnaive = datetime(2026, 3, 14, 8, 15)\naware = datetime(2026, 3, 14, 8, 15, tzinfo=timezone.utc)\nprint(\"naive:\", naive.isoformat(), \" tzinfo:\", naive.tzinfo)\nprint(\"aware:\", aware.isoformat(), \" tzinfo:\", aware.tzinfo)\n\ntry:\n    naive < aware\nexcept TypeError as e:\n    print(\"comparing them:\", e)\nprint(\"naive == aware:\", naive == aware, \"  (== never raises, < does)\")\n\nsingapore = timezone(timedelta(hours=8))\nlocal = datetime(2026, 3, 14, 16, 15, tzinfo=singapore)\nprint(\"16:15 in Singapore is the same moment as 08:15 UTC:\", local == aware)\nprint(\"converted to UTC:\", local.astimezone(timezone.utc).isoformat())\n\nwith warnings.catch_warnings(record=True) as caught:\n    warnings.simplefilter(\"always\")\n    value = datetime.utcnow()\nprint(\"utcnow() returns a naive value:\", value.tzinfo is None)\nprint(\"and warns:\", caught[0].category.__name__, \"-\", str(caught[0].message)[:78])\nprint(\"the replacement:\", datetime.now(timezone.utc).tzinfo)\n",
  "m6/iso_parse.py": "\"\"\"Parsing timestamps, and the epoch mistake that gives a year in the 58,000s.\"\"\"\nfrom datetime import datetime, timezone\n\nfor text in [\"2026-03-14T08:15:00Z\", \"2026-03-14T16:15:00+08:00\", \"2026-03-14 08:15:00\", \"2026-03-14\"]:\n    d = datetime.fromisoformat(text)\n    print(f\"{text:<28} -> {d.isoformat():<28} aware: {d.tzinfo is not None}\")\n\nprint()\nprint(\"strptime, with an offset:\", datetime.strptime(\"14/03/2026 16:15 +0800\", \"%d/%m/%Y %H:%M %z\").isoformat())\n\nseconds = 1_773_476_100\nprint(\"\\nepoch seconds:     \", datetime.fromtimestamp(seconds, timezone.utc).isoformat())\ntry:\n    datetime.fromtimestamp(seconds * 1000, timezone.utc)\nexcept (ValueError, OverflowError) as e:\n    print(\"epoch milliseconds:\", type(e).__name__ + \":\", e)\nprint(\"divide by 1000 first:\", datetime.fromtimestamp(seconds * 1000 / 1000, timezone.utc).isoformat())\n",
  "m6/zoneinfo_dst.py": "\"\"\"What zoneinfo says about local times around a clock change.\"\"\"\nimport zoneinfo\nfrom datetime import datetime, timezone\nfrom pathlib import Path\nfrom zoneinfo import ZoneInfo\n\nzi = Path(zoneinfo.TZPATH[0]) / \"tzdata.zi\"\nprint(\"database:\", zi.read_text().splitlines()[0] if zi.exists() else \"the tzdata package\")\nprint()\n\nCASES = [\n    (\"Europe/London\", datetime(2026, 3, 29, 1, 30)),   # the clocks go forward at 01:00 and skip an hour\n    (\"Europe/London\", datetime(2026, 10, 25, 1, 30)),  # the clocks go back at 02:00 and repeat an hour\n    (\"America/New_York\", datetime(2026, 3, 8, 2, 30)),\n    (\"America/New_York\", datetime(2026, 11, 1, 1, 30)),\n    (\"Asia/Singapore\", datetime(2026, 3, 29, 1, 30)),  # no clock changes\n]\n\n\ndef describe(zone, naive):\n    tz = ZoneInfo(zone)\n    a, b = naive.replace(tzinfo=tz, fold=0), naive.replace(tzinfo=tz, fold=1)\n    back = a.astimezone(timezone.utc).astimezone(tz)\n    if a.utcoffset() != b.utcoffset():\n        kind = \"ambiguous\" if back.replace(tzinfo=None) == naive else \"does not exist\"\n    else:\n        kind = \"exists once\"\n    return kind, a, b\n\n\nfor zone, naive in CASES:\n    kind, a, b = describe(zone, naive)\n    print(f\"{zone:<17} {naive:%Y-%m-%d %H:%M}  {kind}\")\n    print(f\"    fold=0: offset {a.isoformat()[-6:]}  utc {a.astimezone(timezone.utc):%Y-%m-%d %H:%M}\")\n    print(f\"    fold=1: offset {b.isoformat()[-6:]}  utc {b.astimezone(timezone.utc):%Y-%m-%d %H:%M}\")\n",
  "m6/day_buckets.py": "\"\"\"Which day is an order on? It depends on whose clock you ask.\"\"\"\nfrom collections import Counter\nfrom datetime import datetime, timedelta, timezone\nfrom zoneinfo import ZoneInfo\n\nSG = ZoneInfo(\"Asia/Singapore\")\norders = [  # UTC timestamps\n    (\"O-1\", datetime(2026, 3, 14, 3, 0, tzinfo=timezone.utc)),\n    (\"O-2\", datetime(2026, 3, 14, 15, 59, tzinfo=timezone.utc)),\n    (\"O-3\", datetime(2026, 3, 14, 16, 1, tzinfo=timezone.utc)),\n    (\"O-4\", datetime(2026, 3, 14, 22, 30, tzinfo=timezone.utc)),\n    (\"O-5\", datetime(2026, 3, 15, 5, 0, tzinfo=timezone.utc)),\n]\nprint(\"orders per day by the UTC date:       \", dict(Counter(str(t.date()) for _, t in orders)))\nprint(\"orders per day by Singapore's date:   \", dict(Counter(str(t.astimezone(SG).date()) for _, t in orders)))\n\nlondon = ZoneInfo(\"Europe/London\")\nstart = datetime(2026, 3, 29, 0, 0, tzinfo=london)\nend = start + timedelta(days=1)\nprint()\nprint(\"London, 29 March 2026: from\", start.isoformat(), \"to\", end.isoformat())\nprint(\"subtracting the two aware values:     \", end - start)\nprint(\"the same two moments in UTC:          \", end.astimezone(timezone.utc) - start.astimezone(timezone.utc))\n",
  "m6/money.py": "\"\"\"Money in a float, in a Decimal and in whole cents.\"\"\"\nimport math\nfrom decimal import ROUND_DOWN, ROUND_HALF_EVEN, ROUND_HALF_UP, Decimal\n\nprint(\"0.1 + 0.2 =\", 0.1 + 0.2)\nprint(\"0.1 + 0.2 == 0.3:\", 0.1 + 0.2 == 0.3)\nprint(\"the float 0.1 is really:\", Decimal(0.1))\nprint(\"the Decimal from text:   \", Decimal(\"0.1\"))\n\nn = 1_000_000\ntotal = 0.0\nfor _ in range(n):\n    total += 0.10\nprint(f\"\\nadding 0.10 {n:,} times:\")\nprint(\"  float, a loop:      \", total)\nprint(\"  math.fsum:          \", math.fsum([0.10] * n))\nprint(\"  Decimal:            \", sum(Decimal(\"0.10\") for _ in range(n)))\nprint(\"  whole cents (int):  \", sum(10 for _ in range(n)) / 100)\n\nprint(\"\\nrounding a half to 2 places:\")\nprint(\"  round(2.675, 2):\", round(2.675, 2), \"  (the float is a little below 2.675)\")\nfor mode in (ROUND_HALF_EVEN, ROUND_HALF_UP, ROUND_DOWN):\n    print(f\"  Decimal('2.675'), {mode:<15}\", Decimal(\"2.675\").quantize(Decimal(\"0.01\"), rounding=mode))\nprint(\"  round(2.5):\", round(2.5), \"  round(3.5):\", round(3.5), \"  (halves go to the even number)\")\n",
  "m6/normalize_timestamps.py": "\"\"\"Coding round: turn timestamps in mixed formats into one UTC format.\"\"\"\nfrom datetime import datetime, timezone\nfrom zoneinfo import ZoneInfo\n\n\ndef to_utc(value, default_zone):\n    \"\"\"Return an ISO 8601 string in UTC. Numbers are epoch seconds. Text without an offset is in default_zone.\"\"\"\n    if isinstance(value, (int, float)):\n        d = datetime.fromtimestamp(value, timezone.utc)\n    else:\n        d = datetime.fromisoformat(value)\n        if d.tzinfo is None:\n            d = d.replace(tzinfo=ZoneInfo(default_zone))\n    return d.astimezone(timezone.utc).isoformat().replace(\"+00:00\", \"Z\")\n\n\nsamples = [\"2026-03-14T08:15:00Z\", \"2026-03-14T16:15:00+08:00\", \"2026-03-14 16:15:00\", 1_773_476_100]\nfor s in samples:\n    print(f\"{s!s:<28} -> {to_utc(s, 'Asia/Singapore')}\")\n\nassert to_utc(\"2026-03-14T08:15:00Z\", \"Asia/Singapore\") == \"2026-03-14T08:15:00Z\"\nassert to_utc(\"2026-03-14T16:15:00+08:00\", \"Europe/London\") == \"2026-03-14T08:15:00Z\"\nassert to_utc(\"2026-03-14 16:15:00\", \"Asia/Singapore\") == \"2026-03-14T08:15:00Z\"\nassert to_utc(\"2026-07-01 12:00:00\", \"Europe/London\") == \"2026-07-01T11:00:00Z\"  # summer time\nprint(\"tests passed\")\n",
  "m6/local_days.py": "\"\"\"Coding round: count orders for each local day of a store, including the day that has 23 hours.\"\"\"\nfrom collections import Counter\nfrom datetime import datetime, timedelta, timezone\nfrom zoneinfo import ZoneInfo\n\n\ndef orders_per_local_day(utc_times, zone):\n    tz = ZoneInfo(zone)\n    return dict(sorted(Counter(t.astimezone(tz).date().isoformat() for t in utc_times).items()))\n\n\ndef hours_in_local_day(day, zone):\n    tz = ZoneInfo(zone)\n    start = datetime.fromisoformat(day).replace(tzinfo=tz)\n    end = start + timedelta(days=1)  # the next midnight on the wall clock\n    return (end.astimezone(timezone.utc) - start.astimezone(timezone.utc)).total_seconds() / 3600\n\n\ntimes = [datetime(2026, 3, 28, 23, 30, tzinfo=timezone.utc), datetime(2026, 3, 29, 0, 30, tzinfo=timezone.utc),\n         datetime(2026, 3, 29, 22, 59, tzinfo=timezone.utc), datetime(2026, 3, 29, 23, 1, tzinfo=timezone.utc)]\nprint(\"London:   \", orders_per_local_day(times, \"Europe/London\"))\nprint(\"Singapore:\", orders_per_local_day(times, \"Asia/Singapore\"))\nfor day in (\"2026-03-28\", \"2026-03-29\", \"2026-10-25\"):\n    print(f\"hours in {day} in London: {hours_in_local_day(day, 'Europe/London'):g}\")\n\nassert orders_per_local_day(times, \"Europe/London\") == {\"2026-03-28\": 1, \"2026-03-29\": 2, \"2026-03-30\": 1}\nassert hours_in_local_day(\"2026-03-29\", \"Europe/London\") == 23\nassert hours_in_local_day(\"2026-10-25\", \"Europe/London\") == 25\nprint(\"tests passed\")\n",
  "m7/exceptions_tour.py": "\"\"\"try, except, else and finally: which block runs when, and what `raise ... from` keeps.\"\"\"\n\n\ndef parse_total(text):\n    print(f\"  parsing {text!r}\")\n    try:\n        value = float(text)\n    except ValueError as err:\n        raise ValueError(f\"order total {text!r} is not a number\") from err\n    else:\n        print(\"  else: no error, so this runs\")\n        return value\n    finally:\n        print(\"  finally: this runs either way\")\n\n\nprint(\"a good value:\")\nprint(\"  result:\", parse_total(\"12.50\"))\n\nprint(\"a bad value:\")\ntry:\n    parse_total(\"12,50\")\nexcept ValueError as err:\n    print(\"  caught:\", err)\n    print(\"  the cause:\", repr(err.__cause__))\n\nprint(\"a value of the wrong type:\")\ntry:\n    parse_total(None)\nexcept TypeError as err:\n    print(\"  the ValueError handler did not catch it, the caller did:\", type(err).__name__)\n",
  "m7/raise_from.py": "\"\"\"What a traceback looks like when one error causes another. Read it from the bottom.\"\"\"\n\n\ndef to_cents(text):\n    try:\n        return round(float(text) * 100)\n    except ValueError as err:\n        raise ValueError(f\"order total {text!r} is not a number\") from err\n\n\nprint(to_cents(\"12.50\"))\nprint(to_cents(\"12,50\"))\n",
  "m7/swallowed.py": "\"\"\"A loader that catches everything. It reports success while it drops rows.\"\"\"\nROWS = [(\"O-1\", \"12.50\"), (\"O-2\", \"4.75\"), (\"O-3\", \"8,20\"), (\"O-4\", \"19.90\"), (\"O-5\", \"\"), (\"O-6\", \"31.00\")]\n\n\ndef load(rows):\n    loaded = []\n    for order_id, total in rows:\n        try:\n            loaded.append((order_id, float(total)))\n        except Exception:\n            pass\n    return loaded\n\n\nloaded = load(ROWS)\nprint(f\"loaded {len(loaded)} of {len(ROWS)} rows\")\nprint(\"status: success\")\n",
  "m7/fail_loud.py": "\"\"\"The same loader, with the bad rows counted and an exit code that tells the truth.\"\"\"\nimport sys\n\nROWS = [(\"O-1\", \"12.50\"), (\"O-2\", \"4.75\"), (\"O-3\", \"8,20\"), (\"O-4\", \"19.90\"), (\"O-5\", \"\"), (\"O-6\", \"31.00\")]\nMAX_BAD = 0.05  # more than 5 percent bad rows fails the run\n\n\ndef load(rows):\n    loaded, bad = [], []\n    for order_id, total in rows:\n        try:\n            loaded.append((order_id, float(total)))\n        except ValueError as err:\n            bad.append((order_id, total, str(err)))\n    return loaded, bad\n\n\nloaded, bad = load(ROWS)\nprint(f\"loaded {len(loaded)} of {len(ROWS)} rows\")\nfor order_id, total, why in bad:\n    print(f\"  rejected {order_id}: {why}\")\nif len(bad) / len(ROWS) > MAX_BAD:\n    print(f\"status: failed, {len(bad)} of {len(ROWS)} rows rejected (limit {MAX_BAD:.0%})\")\n    sys.exit(1)\nprint(\"status: success\")\n",
  "m7/retry_backoff.py": "\"\"\"A retry loop with exponential backoff and full jitter.\nTime and randomness are passed in, so this file runs in a fraction of a second and a test never waits.\"\"\"\nimport random\n\n\nclass Transient(Exception):\n    \"\"\"A failure that a second try can fix: a timeout, a 429, a 503.\"\"\"\n\n\ndef delay_for(attempt, base=0.5, cap=8.0, rng=random):\n    \"\"\"Full jitter: a random wait between 0 and min(cap, base * 2 ** (attempt - 1)).\"\"\"\n    return rng.uniform(0, min(cap, base * 2 ** (attempt - 1)))\n\n\ndef retry(fn, *, attempts=5, sleep, rng):\n    for attempt in range(1, attempts + 1):\n        try:\n            return fn()\n        except Transient as err:\n            if attempt == attempts:\n                raise\n            wait = delay_for(attempt, rng=rng)\n            print(f\"  attempt {attempt} failed ({err}); waiting {wait:.2f} s\")\n            sleep(wait)\n\n\nclass Flaky:\n    \"\"\"Fails the first `failures` calls, then works.\"\"\"\n\n    def __init__(self, failures):\n        self.failures, self.calls = failures, 0\n\n    def __call__(self):\n        self.calls += 1\n        if self.calls <= self.failures:\n            raise Transient(\"503 from the API\")\n        return \"orders page 1\"\n\n\nslept = []\nprint(\"an API that fails 3 times, then works:\")\napi = Flaky(3)\nprint(\"  result:\", retry(api, sleep=slept.append, rng=random.Random(7)), \"after\", api.calls, \"calls\")\nprint(f\"  total wait: {sum(slept):.2f} s (a fake clock, so nothing really waited)\")\n\nprint(\"an API that fails every time:\")\nslept.clear()\ntry:\n    retry(Flaky(99), sleep=slept.append, rng=random.Random(7))\nexcept Transient as err:\n    print(\"  gave up after\", len(slept) + 1, \"calls with:\", err)\n\nprint(\"the most a wait can last, by attempt:\", [min(8.0, 0.5 * 2 ** n) for n in range(5)])\n",
  "m7/tenacity_retry.py": "\"\"\"The same idea with the tenacity library, and a failure that must not be retried.\"\"\"\nimport logging\nimport random\nimport sys\n\nfrom tenacity import before_sleep_log, retry, retry_if_exception_type, stop_after_attempt, wait_random_exponential\n\nlogging.basicConfig(stream=sys.stdout, level=logging.WARNING, format=\"%(levelname)s %(message)s\")\nlog = logging.getLogger(\"loader\")\nrandom.seed(3)\n\n\nclass Transient(Exception):\n    pass\n\n\ncalls = {\"n\": 0}\n\n\n@retry(\n    retry=retry_if_exception_type(Transient),\n    stop=stop_after_attempt(5),\n    wait=wait_random_exponential(multiplier=0.01, max=0.05),  # full jitter, with small waits so that this file runs fast\n    before_sleep=before_sleep_log(log, logging.WARNING),\n    reraise=True,\n)\ndef fetch_page(kind):\n    calls[\"n\"] += 1\n    if kind == \"bad request\":\n        raise ValueError(\"400 Bad Request\")\n    if calls[\"n\"] <= 2:\n        raise Transient(\"429 Too Many Requests\")\n    return \"page 1\"\n\n\nprint(\"result:\", fetch_page(\"fine\"), \"after\", calls[\"n\"], \"calls\")\n\ncalls[\"n\"] = 0\ntry:\n    fetch_page(\"bad request\")\nexcept ValueError as err:\n    print(\"a ValueError is not in the retry list, so it stopped after\", calls[\"n\"], \"call:\", err)\n",
  "m7/load_strategies.py": "\"\"\"Five ways to load one day of orders, and what each does when the job runs twice, crashes or sees a changed file.\"\"\"\nimport sqlite3\n\nDAY = \"2026-03-14\"\nFILE = [(\"O-1\", 1250), (\"O-2\", 475), (\"O-3\", 820), (\"O-4\", 1990), (\"O-5\", 3100), (\"O-6\", 640)]  # cents\nCORRECTED = [(\"O-1\", 1250), (\"O-2\", 475), (\"O-3\", 920), (\"O-4\", 1990), (\"O-5\", 3100), (\"O-6\", 640)]\nCANCELLED = FILE[:5]  # O-6 is gone from the source file\n\n\nclass Crash(Exception):\n    pass\n\n\ndef new_db(with_key):\n    db = sqlite3.connect(\":memory:\", isolation_level=None)  # autocommit: we say BEGIN and COMMIT ourselves\n    db.execute(f\"CREATE TABLE orders (order_id TEXT {'PRIMARY KEY' if with_key else ''}, day TEXT, total_cents INTEGER)\")\n    return db\n\n\nINSERT = \"INSERT INTO orders VALUES (?, ?, ?)\"\nUPSERT = INSERT + \" ON CONFLICT (order_id) DO UPDATE SET total_cents = excluded.total_cents\"\n\n\ndef write(db, rows, sql, crash):\n    for i, (order_id, cents) in enumerate(rows):\n        if crash and i == 3:\n            raise Crash(\"the job died after 3 rows\")\n        db.execute(sql, (order_id, DAY, cents))\n\n\ndef append(db, rows, crash):                  # a table with no key\n    write(db, rows, INSERT, crash)\n\n\ndef insert_key(db, rows, crash):              # a table with a primary key\n    write(db, rows, INSERT, crash)\n\n\ndef delete_insert(db, rows, crash):           # no transaction: every statement commits on its own\n    db.execute(\"DELETE FROM orders WHERE day = ?\", (DAY,))\n    write(db, rows, INSERT, crash)\n\n\ndef delete_insert_tx(db, rows, crash):        # one transaction: all of it, or none of it\n    db.execute(\"BEGIN\")\n    try:\n        db.execute(\"DELETE FROM orders WHERE day = ?\", (DAY,))\n        write(db, rows, INSERT, crash)\n        db.execute(\"COMMIT\")\n    except Exception:\n        db.execute(\"ROLLBACK\")\n        raise\n\n\ndef upsert(db, rows, crash):                  # a key, and ON CONFLICT DO UPDATE\n    write(db, rows, UPSERT, crash)\n\n\nSTRATEGIES = {\n    \"append\": (append, False),\n    \"insert with a key\": (insert_key, True),\n    \"delete, then insert\": (delete_insert, True),\n    \"delete, then insert, in a transaction\": (delete_insert_tx, True),\n    \"upsert\": (upsert, True),\n}\nSCENARIOS = {  # what happens to the job, in order\n    \"run once\": [(\"run\", FILE)],\n    \"run twice\": [(\"run\", FILE), (\"run\", FILE)],\n    \"crash, then run again\": [(\"crash\", FILE), (\"run\", FILE)],\n    \"the source corrects O-3\": [(\"run\", FILE), (\"run\", CORRECTED)],\n    \"the source drops O-6\": [(\"run\", FILE), (\"run\", CANCELLED)],\n}\nTRUTH = {\"run once\": FILE, \"run twice\": FILE, \"crash, then run again\": FILE, \"the source corrects O-3\": CORRECTED, \"the source drops O-6\": CANCELLED}\n\n\ndef state(db):\n    return db.execute(\"SELECT order_id, total_cents FROM orders ORDER BY order_id, total_cents\").fetchall()\n\n\ndef play(strategy, scenario):\n    fn, with_key = STRATEGIES[strategy]\n    db = new_db(with_key)\n    runs = []\n    for kind, rows in SCENARIOS[scenario]:\n        try:\n            fn(db, rows, kind == \"crash\")\n            outcome = \"finished\"\n        except Crash as err:\n            outcome = f\"crashed: {err}\"\n        except sqlite3.IntegrityError as err:\n            outcome = f\"failed: {err}\"\n        runs.append({\"outcome\": outcome, \"rows\": len(state(db)), \"cents\": sum(c for _, c in state(db))})\n    final = state(db)\n    want = sorted(TRUTH[scenario])\n    return {\"runs\": runs, \"final\": final, \"right\": final == want, \"want_rows\": len(want), \"want_cents\": sum(c for _, c in want)}\n\n\nif __name__ == \"__main__\":\n    for scenario in SCENARIOS:\n        print(scenario)\n        for strategy in STRATEGIES:\n            r = play(strategy, scenario)\n            last = r[\"runs\"][-1]\n            verdict = \"right\" if r[\"right\"] else \"WRONG\"\n            print(f\"  {strategy:<40} {last['rows']} rows, {last['cents'] / 100:7.2f}  {verdict}\")\n",
  "m7/watermark.py": "\"\"\"An incremental load with a watermark: what it loses when it is saved too early, and when a row arrives late.\"\"\"\nimport sqlite3\nfrom datetime import datetime, timedelta\n\nCOLS = \"order_id TEXT PRIMARY KEY, total_cents INTEGER, updated_at TEXT\"\nUPSERT = (\"INSERT INTO orders VALUES (?, ?, ?) ON CONFLICT (order_id) DO UPDATE \"\n          \"SET total_cents = excluded.total_cents, updated_at = excluded.updated_at\")\n\n\ndef make(*rows):\n    src = sqlite3.connect(\":memory:\", isolation_level=None)\n    dst = sqlite3.connect(\":memory:\", isolation_level=None)\n    for db in (src, dst):\n        db.execute(f\"CREATE TABLE orders ({COLS})\")\n    src.executemany(\"INSERT INTO orders VALUES (?, ?, ?)\", rows)\n    return src, dst, {\"watermark\": \"2026-03-14 00:00\"}\n\n\ndef rows(n):\n    return f\"{n} row\" + (\"\" if n == 1 else \"s\")\n\n\ndef count(db):\n    return db.execute(\"SELECT count(*) FROM orders\").fetchone()[0]\n\n\ndef load(src, dst, state, overlap=0, save_first=False, crash=False):\n    since = datetime.fromisoformat(state[\"watermark\"]) - timedelta(minutes=overlap)\n    rows = src.execute(\"SELECT * FROM orders WHERE updated_at > ? ORDER BY updated_at\", (f\"{since:%Y-%m-%d %H:%M}\",)).fetchall()\n    if rows and save_first:\n        state[\"watermark\"] = rows[-1][2]  # saved before the rows are written\n    if crash:\n        raise RuntimeError(\"the job died before writing\")\n    dst.executemany(UPSERT, rows)\n    if rows and not save_first:\n        state[\"watermark\"] = max(state[\"watermark\"], rows[-1][2])  # saved after the rows are written\n    return len(rows)\n\n\nprint(\"1. the watermark is saved first, then the job dies\")\nsrc, dst, state = make((\"O-1\", 1250, \"2026-03-14 08:00\"), (\"O-2\", 475, \"2026-03-14 08:05\"), (\"O-3\", 820, \"2026-03-14 08:10\"))\ntry:\n    load(src, dst, state, save_first=True, crash=True)\nexcept RuntimeError as err:\n    print(\"   run 1:\", err, \"| watermark is now\", state[\"watermark\"])\nprint(\"   run 2 reads\", rows(load(src, dst, state, save_first=True)) + \"; the target has\", count(dst), \"of 3\")\n\nprint(\"2. the watermark is saved after the rows are written\")\nsrc, dst, state = make((\"O-1\", 1250, \"2026-03-14 08:00\"), (\"O-2\", 475, \"2026-03-14 08:05\"), (\"O-3\", 820, \"2026-03-14 08:10\"))\ntry:\n    load(src, dst, state, crash=True)\nexcept RuntimeError as err:\n    print(\"   run 1:\", err, \"| watermark is still\", state[\"watermark\"])\nprint(\"   run 2 reads\", rows(load(src, dst, state)) + \"; the target has\", count(dst), \"of 3\")\n\nprint(\"3. a row arrives late: a slow writer commits updated_at 08:07 after the load has passed 08:10\")\nfor overlap in (0, 15):\n    src, dst, state = make((\"O-1\", 1250, \"2026-03-14 08:00\"), (\"O-3\", 820, \"2026-03-14 08:10\"))\n    load(src, dst, state, overlap=overlap)\n    src.execute(\"INSERT INTO orders VALUES ('O-4', 640, '2026-03-14 08:07')\")  # late, with an old timestamp\n    src.execute(\"INSERT INTO orders VALUES ('O-5', 3100, '2026-03-14 08:20')\")\n    n = load(src, dst, state, overlap=overlap)\n    print(f\"   overlap {overlap:>2} min: run 2 reads {rows(n)}; the target has {count(dst)} of 4\")\n",
  "m7/idempotent_load.py": "\"\"\"Coding round: load one day of orders so that running it twice, or after a crash, leaves the same table.\"\"\"\nimport sqlite3\n\n\ndef load_day(db, day, rows):\n    \"\"\"Replace the orders of `day` with `rows`, a list of (order_id, total_cents). All or nothing. Returns the rows written.\"\"\"\n    db.execute(\"BEGIN\")\n    try:\n        db.execute(\"DELETE FROM orders WHERE day = ?\", (day,))\n        db.executemany(\"INSERT INTO orders (order_id, day, total_cents) VALUES (?, ?, ?)\", [(i, day, c) for i, c in rows])\n        db.execute(\"COMMIT\")\n    except Exception:\n        db.execute(\"ROLLBACK\")\n        raise\n    return len(rows)\n\n\ndef table(db):\n    return db.execute(\"SELECT order_id, day, total_cents FROM orders ORDER BY day, order_id\").fetchall()\n\n\ndb = sqlite3.connect(\":memory:\", isolation_level=None)\ndb.execute(\"CREATE TABLE orders (order_id TEXT PRIMARY KEY, day TEXT NOT NULL, total_cents INTEGER NOT NULL)\")\nmonday = [(\"O-1\", 1250), (\"O-2\", 475)]\ntuesday = [(\"O-3\", 820), (\"O-4\", 1990), (\"O-5\", 3100)]\n\nload_day(db, \"2026-03-09\", monday)\nload_day(db, \"2026-03-10\", tuesday)\nonce = table(db)\nprint(\"Monday and Tuesday loaded:\", len(once), \"rows\")\n\nload_day(db, \"2026-03-10\", tuesday)\nassert table(db) == once, \"the second run changed the table\"\nprint(\"Tuesday loaded again:\", len(table(db)), \"rows, the same table\")\n\ntry:\n    load_day(db, \"2026-03-10\", [(\"O-3\", 820), (\"O-4\", None)])  # None breaks NOT NULL halfway through\nexcept sqlite3.IntegrityError as err:\n    print(\"a run that fails halfway:\", err)\nassert table(db) == once, \"a failed run changed the table\"\nprint(\"after the failed run:\", len(table(db)), \"rows, the same table\")\n\nload_day(db, \"2026-03-10\", [(\"O-3\", 920), (\"O-4\", 1990)])  # the source corrected O-3 and dropped O-5\nafter = table(db)\nassert [r for r in after if r[1] == \"2026-03-09\"] == [r for r in once if r[1] == \"2026-03-09\"], \"Monday changed\"\nassert [r[0] for r in after if r[1] == \"2026-03-10\"] == [\"O-3\", \"O-4\"], \"Tuesday did not follow the file\"\nprint(\"a corrected Tuesday:\", len(after), \"rows, Monday untouched\")\nprint(\"tests passed\")\n",
  "m7/call_with_retry.py": "\"\"\"Coding round: a retry function that retries only what is worth retrying, and that tests can run without waiting.\"\"\"\nimport random\n\n\nclass Transient(Exception):\n    pass\n\n\ndef call_with_retry(fn, *, retry_on=(Transient,), attempts=4, base=0.5, cap=8.0, sleep, rng):\n    \"\"\"Call fn(). On an exception in retry_on, wait a random time between 0 and min(cap, base * 2 ** (n - 1)) and try again.\n    Give up after `attempts` calls and raise the last error. Any other exception is raised at once.\"\"\"\n    for attempt in range(1, attempts + 1):\n        try:\n            return fn()\n        except retry_on:\n            if attempt == attempts:\n                raise\n            sleep(rng.uniform(0, min(cap, base * 2 ** (attempt - 1))))\n\n\nclass Upper:\n    \"\"\"A stand-in for random: always picks the top of the range, so the waits are the bounds themselves.\"\"\"\n    def uniform(self, a, b):\n        return b\n\n\nclass Script:\n    \"\"\"A function that raises the given errors, one for each call, then returns \"ok\".\"\"\"\n    def __init__(self, *errors):\n        self.errors, self.calls = list(errors), 0\n\n    def __call__(self):\n        self.calls += 1\n        if self.errors:\n            raise self.errors.pop(0)\n        return \"ok\"\n\n\nwaits = []\nfn = Script(Transient(\"503\"), Transient(\"503\"))\nassert call_with_retry(fn, sleep=waits.append, rng=random.Random(7)) == \"ok\" and fn.calls == 3\nassert len(waits) == 2 and 0 <= waits[0] <= 0.5 and 0 <= waits[1] <= 1.0\nprint(\"fails twice, then works:\", fn.calls, \"calls, waits\", [round(w, 2) for w in waits])\n\nwaits = []\nfn = Script(ValueError(\"400\"))\ntry:\n    call_with_retry(fn, sleep=waits.append, rng=random.Random(7))\n    raise AssertionError(\"a ValueError must not be swallowed\")\nexcept ValueError:\n    pass\nassert fn.calls == 1 and waits == []\nprint(\"a ValueError is not retried:\", fn.calls, \"call, no waits\")\n\nwaits = []\nfn = Script(*[Transient(f\"503 #{i}\") for i in range(10)])\ntry:\n    call_with_retry(fn, sleep=waits.append, rng=random.Random(7))\n    raise AssertionError(\"it must give up\")\nexcept Transient as err:\n    assert str(err) == \"503 #3\" and fn.calls == 4 and len(waits) == 3\nprint(\"always fails: gave up after\", fn.calls, \"calls, with the last error\")\n\nwaits = []\nfn = Script(*[Transient(\"503\") for _ in range(7)])\nassert call_with_retry(fn, attempts=8, sleep=waits.append, rng=Upper()) == \"ok\"\nassert waits == [0.5, 1.0, 2.0, 4.0, 8.0, 8.0, 8.0], waits\nprint(\"the longest waits, with the cap at 8 s:\", waits)\nprint(\"tests passed\")\n",
  "m8/api_basics.py": "\"\"\"Calling an API: a session, a timeout, a status check and JSON. The server is a fake Brewline API that runs on this machine.\"\"\"\nimport requests\nfrom brewline_api import serve\n\nbase = serve()\nwith requests.Session() as http:  # one session reuses the connection\n    r = http.get(f\"{base}/orders\", params={\"page\": 1, \"per_page\": 3}, timeout=5)\n    print(r.status_code, r.headers[\"Content-Type\"])\n    page = r.json()\n    print(\"keys:\", sorted(page), \"ids:\", [o[\"id\"] for o in page[\"items\"]])\n\n    r = http.get(f\"{base}/orders/O-999\", timeout=5)\n    print(r.status_code, r.reason, r.json())\n    try:\n        r.raise_for_status()\n    except requests.HTTPError as err:\n        print(\"raise_for_status:\", err)\n\n    try:\n        http.get(f\"{base}/slow\", params={\"delay\": 2}, timeout=0.5)\n    except requests.Timeout as err:\n        print(\"timeout:\", type(err).__name__)\n",
  "m8/paginate.py": "\"\"\"Two ways to page through an API while the data changes: offset pages and cursor pages. The server is the fake Brewline API.\"\"\"\nimport requests\nfrom brewline_api import serve\n\nbase = serve()\nhttp = requests.Session()\n\n\ndef ids(sid):\n    return http.get(f\"{base}/admin/ids\", params={\"sid\": sid}, timeout=5).json()[\"ids\"]\n\n\ndef fetch_offset(sid, scenario, per_page=5):\n    got, page = [], 1\n    while True:\n        items = http.get(f\"{base}/orders\", params={\"sid\": sid, \"scenario\": scenario, \"page\": page, \"per_page\": per_page}, timeout=5).json()[\"items\"]\n        got += [o[\"id\"] for o in items]\n        if len(items) < per_page:\n            return got\n        page += 1\n\n\ndef fetch_cursor(sid, scenario, limit=5):\n    got, after = [], None\n    while True:\n        params = {\"sid\": sid, \"scenario\": scenario, \"limit\": limit}\n        if after:\n            params[\"after\"] = after\n        data = http.get(f\"{base}/orders/cursor\", params=params, timeout=5).json()\n        got += [o[\"id\"] for o in data[\"items\"]]\n        after = data[\"next_cursor\"]\n        if after is None:\n            return got\n\n\nprint(f\"{'style':<8}{'while we read':<30}{'rows':>5}{'unique':>8}{'repeated':>10}{'missed':>8}\")\nfor style, fetch in ((\"offset\", fetch_offset), (\"cursor\", fetch_cursor)):\n    for scenario, what in ((\"none\", \"nothing changes\"), (\"insert\", \"3 new orders arrive\"), (\"delete\", \"3 newest are cancelled\")):\n        sid = f\"{style}-{scenario}\"\n        before = set(ids(sid))\n        got = fetch(sid, scenario)\n        stayed = before & set(ids(sid))  # orders that existed for the whole run\n        print(f\"{style:<8}{what:<30}{len(got):>5}{len(set(got)):>8}{len(got) - len(set(got)):>10}{len(stayed - set(got)):>8}\")\n",
  "m8/rate_limit.py": "\"\"\"A client that obeys 429 and Retry-After. The fake API allows 3 requests in each second.\"\"\"\nimport time\n\nimport requests\nfrom brewline_api import serve\n\nbase = serve()\n\n\ndef get_json(http, url, **params):\n    for attempt in range(1, 6):\n        r = http.get(url, params=params, timeout=5)\n        if r.status_code == 429:\n            wait = float(r.headers.get(\"Retry-After\", 1))\n            print(f\"    429 Too Many Requests, Retry-After: {wait:g}, so wait {wait:g} s\")\n            time.sleep(wait)\n            continue\n        r.raise_for_status()\n        return r.json()\n    raise RuntimeError(\"still limited after 5 tries\")\n\n\nwith requests.Session() as http:\n    for n in range(1, 7):\n        t0 = time.monotonic()\n        get_json(http, f\"{base}/limited\", sid=\"demo\")\n        print(f\"call {n}: ok in {time.monotonic() - t0:.0f} s\")\n",
  "m8/fetch_all.py": "\"\"\"Coding round: read every page of a cursor API, wait when the server says 429, and never read a page twice.\"\"\"\nimport time\n\nimport requests\nfrom brewline_api import serve\n\n\ndef fetch_all(http, url, limit=5, sleep=time.sleep, **params):\n    \"\"\"Return every item of a cursor-paged listing. `url` takes `limit` and `after`, and answers {\"items\": [...], \"next_cursor\": ...}.\n    On a 429, wait for the Retry-After seconds and ask for the same page again. Any other error status raises.\"\"\"\n    items, after = [], None\n    while True:\n        query = dict(params, limit=limit)\n        if after:\n            query[\"after\"] = after\n        r = http.get(url, params=query, timeout=5)\n        if r.status_code == 429:\n            sleep(float(r.headers.get(\"Retry-After\", 1)))\n            continue\n        r.raise_for_status()\n        data = r.json()\n        items += data[\"items\"]\n        after = data[\"next_cursor\"]\n        if after is None:\n            return items\n\n\nbase = serve()\nhttp = requests.Session()\n\ngot = fetch_all(http, f\"{base}/orders/cursor\", sid=\"t1\")\nassert [o[\"id\"] for o in got] == [f\"O-{n}\" for n in range(100, 123)], \"all 23 orders, once each, in order\"\nprint(\"a quiet API:\", len(got), \"orders, from\", got[0][\"id\"], \"to\", got[-1][\"id\"])\n\ngot = fetch_all(http, f\"{base}/orders/cursor\", limit=7, sid=\"t2\", scenario=\"insert\")\nassert len({o[\"id\"] for o in got}) == len(got) == 26, \"the 3 new orders arrive at the end, with no repeats\"\nprint(\"3 orders arrive while reading:\", len(got), \"orders, none twice\")\n\nwaits = []\n\n\nclass Limited:\n    \"\"\"Answers 429 once, then forwards to the real session.\"\"\"\n    def __init__(self):\n        self.tripped = False\n\n    def get(self, url, **kw):\n        if not self.tripped:\n            self.tripped = True\n            r = requests.Response()\n            r.status_code, r.headers[\"Retry-After\"] = 429, \"2\"\n            return r\n        return http.get(url, **kw)\n\n\ngot = fetch_all(Limited(), f\"{base}/orders/cursor\", sid=\"t3\", sleep=waits.append)\nassert waits == [2.0] and len(got) == 23\nprint(\"one 429 with Retry-After 2: waited\", waits, \"then read\", len(got), \"orders\")\ntry:\n    fetch_all(http, f\"{base}/orders/O-999\")\n    raise AssertionError(\"a 404 must raise\")\nexcept requests.HTTPError as err:\n    print(\"a 404 raises:\", err.response.status_code)\nprint(\"tests passed\")\n",
  "m8/sql_params.py": "\"\"\"Putting a value into SQL with an f-string, and with a parameter. SQLite, in memory.\"\"\"\nimport sqlite3\n\nconn = sqlite3.connect(\":memory:\")\nconn.executescript(\"\"\"\nCREATE TABLE customers (id INTEGER PRIMARY KEY, name TEXT, city TEXT);\nINSERT INTO customers (name, city) VALUES ('Ana Tan', 'Singapore'), ('Ben Lee', 'London'), ('Cy Park', 'London');\n\"\"\")\n\n\ndef find_unsafe(name):\n    sql = f\"SELECT name, city FROM customers WHERE name = '{name}'\"\n    print(\"  sql:\", sql)\n    return conn.execute(sql).fetchall()\n\n\ndef find_safe(name):\n    return conn.execute(\"SELECT name, city FROM customers WHERE name = ?\", (name,)).fetchall()\n\n\nprint(\"a normal name, with an f-string:\", find_unsafe(\"Ana Tan\"))\nprint(\"a name with an apostrophe:\")\ntry:\n    find_unsafe(\"Conan O'Brien\")\nexcept sqlite3.OperationalError as err:\n    print(\"  error:\", err)\nprint(\"a name that changes the query:\")\nrows = find_unsafe(\"x' OR '1'='1\")\nprint(\"  rows returned:\", len(rows), \"of\", conn.execute(\"SELECT count(*) FROM customers\").fetchone()[0])\n\nprint(\"the same two names, with a parameter:\")\nprint(\"  Conan O'Brien ->\", find_safe(\"Conan O'Brien\"))\nprint(\"  x' OR '1'='1 ->\", find_safe(\"x' OR '1'='1\"))\n",
  "m8/transactions.py": "\"\"\"A transaction: either both updates happen or neither does. SQLite, in memory.\"\"\"\nimport sqlite3\n\nconn = sqlite3.connect(\":memory:\")\nconn.execute(\"CREATE TABLE stock (store TEXT PRIMARY KEY, beans_kg INTEGER NOT NULL CHECK (beans_kg >= 0))\")\nconn.executemany(\"INSERT INTO stock VALUES (?, ?)\", [(\"Singapore\", 40), (\"London\", 10)])\nconn.commit()\n\n\ndef levels():\n    return dict(conn.execute(\"SELECT store, beans_kg FROM stock ORDER BY store\"))\n\n\ndef move(kg, src, dst, use_transaction):\n    try:\n        if use_transaction:\n            with conn:  # commits when the block ends, rolls back when it raises\n                conn.execute(\"UPDATE stock SET beans_kg = beans_kg + ? WHERE store = ?\", (kg, dst))\n                conn.execute(\"UPDATE stock SET beans_kg = beans_kg - ? WHERE store = ?\", (kg, src))\n        else:\n            conn.execute(\"UPDATE stock SET beans_kg = beans_kg + ? WHERE store = ?\", (kg, dst))\n            conn.commit()                         # the first update is saved on its own\n            conn.execute(\"UPDATE stock SET beans_kg = beans_kg - ? WHERE store = ?\", (kg, src))\n            conn.commit()\n    except sqlite3.IntegrityError as err:\n        print(\"  error:\", err)\n\n\nprint(\"start:\", levels())\nprint(\"move 5 kg, London to Singapore, with a transaction (London has 10):\")\nmove(5, \"London\", \"Singapore\", True)\nprint(\"  now:\", levels())\nprint(\"move 30 kg, London to Singapore, with a transaction (London only has 5 left):\")\nmove(30, \"London\", \"Singapore\", True)\nprint(\"  now:\", levels())\nprint(\"the same move, with each update committed on its own:\")\nmove(30, \"London\", \"Singapore\", False)\nprint(\"  now:\", levels(), \"-> total\", sum(levels().values()), \"kg, and it was 50\")\n",
  "m8/sqlalchemy_core.py": "\"\"\"The same ideas in SQLAlchemy Core: an engine, a text query with bind parameters, and a transaction block.\"\"\"\nimport sqlalchemy as sa\n\nengine = sa.create_engine(\"sqlite:///:memory:\")\nwith engine.begin() as conn:  # BEGIN ... COMMIT, or ROLLBACK when the block raises\n    conn.execute(sa.text(\"CREATE TABLE orders (order_id TEXT PRIMARY KEY, store TEXT, total_cents INTEGER)\"))\n    conn.execute(sa.text(\"INSERT INTO orders VALUES (:id, :store, :cents)\"), [\n        {\"id\": \"O-1\", \"store\": \"London\", \"cents\": 1250}, {\"id\": \"O-2\", \"store\": \"London\", \"cents\": 475}, {\"id\": \"O-3\", \"store\": \"Singapore\", \"cents\": 820}])\n\nwith engine.connect() as conn:\n    rows = conn.execute(sa.text(\"SELECT store, sum(total_cents) AS cents FROM orders WHERE total_cents >= :min GROUP BY store ORDER BY store\"), {\"min\": 500}).mappings().all()\n    print(\"rows:\", [dict(r) for r in rows])\n    print(\"column names:\", list(rows[0].keys()))\nprint(\"sqlalchemy\", sa.__version__)\n",
  "m8/upsert_batches.py": "\"\"\"Coding round: write many rows in batches, safe to run twice. SQLite, in memory.\"\"\"\nimport sqlite3\nfrom itertools import batched\n\n\ndef upsert_orders(conn, rows, batch_size=1000):\n    \"\"\"rows are (order_id, store, total_cents). Insert new orders and update the ones that exist. One transaction for each batch.\n    Return the number of batches written.\"\"\"\n    sql = (\"INSERT INTO orders (order_id, store, total_cents) VALUES (?, ?, ?) \"\n           \"ON CONFLICT (order_id) DO UPDATE SET store = excluded.store, total_cents = excluded.total_cents\")\n    n = 0\n    for chunk in batched(rows, batch_size):\n        with conn:\n            conn.executemany(sql, chunk)\n        n += 1\n    return n\n\n\nconn = sqlite3.connect(\":memory:\")\nconn.execute(\"CREATE TABLE orders (order_id TEXT PRIMARY KEY, store TEXT NOT NULL, total_cents INTEGER NOT NULL)\")\nrows = [(f\"O-{i}\", \"London\" if i % 2 else \"Singapore\", 100 + i) for i in range(2500)]\n\nn = upsert_orders(conn, rows, batch_size=1000)\ncount = lambda: conn.execute(\"SELECT count(*), sum(total_cents) FROM orders\").fetchone()\nassert n == 3 and count() == (2500, sum(r[2] for r in rows))\nprint(\"2,500 rows in batches of 1,000:\", n, \"batches,\", count()[0], \"rows\")\n\nupsert_orders(conn, rows, batch_size=1000)\nassert count() == (2500, sum(r[2] for r in rows))\nprint(\"run again:\", count()[0], \"rows, the same total\")\n\nchanged = [(\"O-0\", \"Singapore\", 9999)] + rows[1:]\nupsert_orders(conn, changed, batch_size=1000)\nassert conn.execute(\"SELECT total_cents FROM orders WHERE order_id = 'O-0'\").fetchone() == (9999,) and count()[0] == 2500\nprint(\"one changed row: updated in place, still\", count()[0], \"rows\")\n\nbad = rows[:3] + [(\"O-9000\", None, 1)]\ntry:\n    upsert_orders(conn, bad, batch_size=2)\nexcept sqlite3.IntegrityError as err:\n    print(\"a bad row in the second batch:\", err)\nassert conn.execute(\"SELECT count(*) FROM orders WHERE order_id = 'O-9000'\").fetchone() == (0,)\nprint(\"tests passed\")\n",
  "m8/batch_insert.py": "\"\"\"Four ways to write 5,000 rows into SQLite, in a file on disk. The timings come from the machine that runs this file.\"\"\"\nimport os\nimport sqlite3\nimport statistics\nimport tempfile\nimport time\n\nROWS = [(f\"O-{i}\", \"London\" if i % 2 else \"Singapore\", 100 + i) for i in range(5000)]\nSQL = \"INSERT INTO orders VALUES (?, ?, ?)\"\n\n\ndef commit_each(conn, rows):          # a transaction for every row\n    for r in rows:\n        conn.execute(SQL, r)\n        conn.commit()\n\n\ndef one_transaction(conn, rows):      # one transaction, one execute for every row\n    for r in rows:\n        conn.execute(SQL, r)\n    conn.commit()\n\n\ndef many(conn, rows):                 # one transaction, one executemany call\n    conn.executemany(SQL, rows)\n    conn.commit()\n\n\ndef batches(conn, rows, size=1000):   # executemany, and a commit for every 1,000 rows\n    for i in range(0, len(rows), size):\n        conn.executemany(SQL, rows[i:i + size])\n        conn.commit()\n\n\nMETHODS = {\"commit for every row\": commit_each, \"one transaction, execute in a loop\": one_transaction, \"one transaction, executemany\": many, \"executemany, commit every 1,000\": batches}\n\n\ndef seconds(method, rows=ROWS):\n    with tempfile.TemporaryDirectory() as folder:\n        conn = sqlite3.connect(os.path.join(folder, \"orders.db\"))\n        conn.execute(\"CREATE TABLE orders (order_id TEXT PRIMARY KEY, store TEXT, total_cents INTEGER)\")\n        conn.commit()\n        t0 = time.perf_counter()\n        METHODS[method](conn, rows)\n        took = time.perf_counter() - t0\n        assert conn.execute(\"SELECT count(*) FROM orders\").fetchone()[0] == len(rows)\n        conn.close()\n        return took\n\n\nif __name__ == \"__main__\":\n    print(f\"{'method':<38}{'seconds':>9}{'rows per second':>18}\")\n    for name in METHODS:\n        s = statistics.median(seconds(name) for _ in range(3))\n        print(f\"{name:<38}{s:>9.3f}{len(ROWS) / s:>18,.0f}\")\n",
  "m9/nulls_and_types.py": "\"\"\"Missing values in pandas, Polars and DuckDB: what counts, what sums and what groups.\"\"\"\nimport duckdb\nimport pandas as pd\nimport polars as pl\n\ndata = {\"order_id\": [\"O-1\", \"O-2\", \"O-3\", \"O-4\"], \"total\": [12.5, None, 8.2, None], \"store\": [\"London\", \"London\", None, \"Singapore\"]}\n\np = pd.DataFrame(data)\nprint(\"pandas  dtypes:\", {k: str(v) for k, v in p.dtypes.items()})\nprint(\"pandas  rows:\", len(p), \" count of total:\", p[\"total\"].count(), \" sum:\", p[\"total\"].sum(), \" mean:\", round(p[\"total\"].mean(), 2))\nprint(\"pandas  nan == nan:\", p[\"total\"][1] == p[\"total\"][1], \" isna:\", p[\"total\"].isna().tolist())\nprint(\"pandas  rows per store:\", p.groupby(\"store\").size().to_dict(), \"(the missing store is dropped)\")\nprint(\"pandas  with dropna=False:\", p.groupby(\"store\", dropna=False).size().to_dict())\n\nq = pl.DataFrame(data)\nprint(\"polars  dtypes:\", {k: str(v) for k, v in q.schema.items()})\nprint(\"polars  rows:\", q.height, \" count of total:\", q[\"total\"].count(), \" null_count:\", q[\"total\"].null_count(), \" sum:\", q[\"total\"].sum(), \" mean:\", round(q[\"total\"].mean(), 2))\nprint(\"polars  rows per store:\", dict(q.group_by(\"store\").len().sort(\"store\", nulls_last=True).iter_rows()))\n\nprint(\"duckdb  rows per store:\", dict(duckdb.sql(\"SELECT store, count(*) FROM p GROUP BY store ORDER BY store NULLS LAST\").fetchall()))\nprint(\"duckdb  count(*), count(total), sum, avg:\", duckdb.sql(\"SELECT count(*), count(total), sum(total), round(avg(total), 2) FROM p\").fetchall()[0])\n",
  "m9/merge_fanout.py": "\"\"\"A join that multiplies rows: the customer table has two rows for customer 3. The same join in pandas, Polars and DuckDB.\"\"\"\nimport duckdb\nimport pandas as pd\nimport polars as pl\n\norders = pd.DataFrame({\"order_id\": [\"O-1\", \"O-2\", \"O-3\", \"O-4\", \"O-5\", \"O-6\"], \"customer_id\": [1, 2, 2, 3, 1, 3], \"total_cents\": [1250, 475, 820, 1990, 3100, 640]})\ncustomers = pd.DataFrame({\"customer_id\": [1, 2, 3, 3], \"city\": [\"London\", \"London\", \"Singapore\", \"Singapore\"]})  # 3 appears twice, like a history table\n\nprint(\"orders:\", len(orders), \"rows, total\", orders[\"total_cents\"].sum(), \"cents\")\n\nmerged = orders.merge(customers, on=\"customer_id\", how=\"left\")\nprint(\"pandas  left join:\", len(merged), \"rows, total\", merged[\"total_cents\"].sum(), \"cents\")\n\njoined = pl.from_pandas(orders).join(pl.from_pandas(customers), on=\"customer_id\", how=\"left\")\nprint(\"polars  left join:\", joined.height, \"rows, total\", joined[\"total_cents\"].sum(), \"cents\")\n\nrow = duckdb.sql(\"SELECT count(*), sum(total_cents) FROM orders LEFT JOIN customers USING (customer_id)\").fetchall()[0]\nprint(\"duckdb  left join:\", row[0], \"rows, total\", row[1], \"cents\")\n\nprint(\"who is repeated:\", merged[merged[\"order_id\"].duplicated(keep=False)][\"order_id\"].tolist())\n\ntry:\n    orders.merge(customers, on=\"customer_id\", how=\"left\", validate=\"m:1\")\nexcept Exception as err:\n    print(\"pandas  validate m:1 ->\", type(err).__name__ + \":\", err)\ntry:\n    pl.from_pandas(orders).join(pl.from_pandas(customers), on=\"customer_id\", how=\"left\", validate=\"m:1\")\nexcept Exception as err:\n    print(\"polars  validate m:1 ->\", type(err).__name__ + \":\", err)\nprint(\"duckdb  has no validate. Check the key yourself:\",\n      duckdb.sql(\"SELECT customer_id, count(*) AS rows FROM customers GROUP BY customer_id HAVING count(*) > 1\").fetchall())\n\nfixed = orders.merge(customers.drop_duplicates(\"customer_id\"), on=\"customer_id\", how=\"left\", validate=\"m:1\")\nprint(\"after drop_duplicates and validate m:1:\", len(fixed), \"rows, total\", fixed[\"total_cents\"].sum(), \"cents\")\n",
  "m9/safe_join.py": "\"\"\"Coding round: a left join that cannot multiply rows.\"\"\"\nimport pandas as pd\n\n\ndef safe_join(orders, customers, key=\"customer_id\"):\n    \"\"\"Left join orders to customers. Raise ValueError, naming the keys, when customers has more than one row for a key.\n    The result has exactly one row for each order, in the order of `orders`.\"\"\"\n    repeated = customers.loc[customers[key].duplicated(keep=False), key].unique().tolist()\n    if repeated:\n        raise ValueError(f\"customers has more than one row for {key} {repeated}\")\n    out = orders.merge(customers, on=key, how=\"left\", validate=\"m:1\")\n    assert len(out) == len(orders)\n    return out\n\n\norders = pd.DataFrame({\"order_id\": [\"O-1\", \"O-2\", \"O-3\", \"O-4\"], \"customer_id\": [1, 2, 3, 9], \"total_cents\": [1250, 475, 820, 1990]})\ncustomers = pd.DataFrame({\"customer_id\": [1, 2, 3], \"city\": [\"London\", \"London\", \"Singapore\"]})\n\nout = safe_join(orders, customers)\nassert out[\"order_id\"].tolist() == [\"O-1\", \"O-2\", \"O-3\", \"O-4\"] and out[\"total_cents\"].sum() == orders[\"total_cents\"].sum()\nprint(\"a clean join:\", len(out), \"rows, total\", out[\"total_cents\"].sum(), \"cents\")\nassert bool(out[\"city\"].isna().iloc[3]) and out[\"city\"].iloc[0] == \"London\"\nprint(\"an order with no customer is kept:\", out[\"order_id\"].iloc[3], \"with a missing city\")\ntry:\n    safe_join(orders, pd.concat([customers, customers.iloc[[2]]]))\n    raise AssertionError(\"a repeated key must raise\")\nexcept ValueError as err:\n    print(\"a repeated key raises:\", err)\nprint(\"tests passed\")\n",
  "m9/latest_per_order.py": "\"\"\"Coding round: the latest row for each order, in SQL, with DuckDB.\"\"\"\nimport duckdb\nimport pandas as pd\n\n\ndef latest_per_order(rows):\n    \"\"\"rows are (order_id, status, updated_at). Return one row for each order_id, the one with the latest updated_at, sorted by order_id.\"\"\"\n    df = pd.DataFrame(rows, columns=[\"order_id\", \"status\", \"updated_at\"])\n    return duckdb.sql(\"\"\"\n        SELECT order_id, status, updated_at FROM df\n        QUALIFY row_number() OVER (PARTITION BY order_id ORDER BY updated_at DESC) = 1\n        ORDER BY order_id\"\"\").fetchall()\n\n\nrows = [(\"O-1\", \"placed\", \"2026-03-14 08:00\"), (\"O-2\", \"placed\", \"2026-03-14 09:00\"), (\"O-1\", \"paid\", \"2026-03-14 08:05\"),\n        (\"O-3\", \"placed\", \"2026-03-14 07:00\"), (\"O-1\", \"refunded\", \"2026-03-15 10:00\"), (\"O-2\", \"paid\", \"2026-03-14 09:30\")]\ngot = latest_per_order(rows)\nassert got == [(\"O-1\", \"refunded\", \"2026-03-15 10:00\"), (\"O-2\", \"paid\", \"2026-03-14 09:30\"), (\"O-3\", \"placed\", \"2026-03-14 07:00\")]\nprint(\"latest status of each order:\", [(o, s) for o, s, _ in got])\nassert latest_per_order([]) == []\nprint(\"no rows:\", latest_per_order([]))\nassert latest_per_order(rows[:1]) == [rows[0]]\nprint(\"one row:\", len(latest_per_order(rows[:1])), \"row\")\nprint(\"tests passed\")\n",
  "m9/three_engines.py": "\"\"\"The same question in pandas, Polars and DuckDB: paid revenue for each store, biggest first. Two million made-up orders.\"\"\"\nimport duckdb\nimport numpy as np\nimport pandas as pd\nimport polars as pl\n\nrng = np.random.default_rng(7)\nn = 2_000_000\npd.DataFrame({\n    \"order_id\": np.arange(n),\n    \"store\": rng.choice([\"London\", \"Singapore\", \"Sydney\", \"Mumbai\", \"Dubai\", \"Paris\", \"Tokyo\", \"Lagos\"], n),\n    \"status\": rng.choice([\"paid\", \"paid\", \"paid\", \"refunded\", \"cancelled\"], n),\n    \"total_cents\": rng.integers(300, 4000, n),\n}).to_parquet(\"orders.parquet\")\n\n\ndef with_pandas():\n    df = pd.read_parquet(\"orders.parquet\", columns=[\"store\", \"status\", \"total_cents\"])\n    paid = df[df[\"status\"] == \"paid\"]\n    return paid.groupby(\"store\")[\"total_cents\"].agg([\"sum\", \"count\"]).sort_values(\"sum\", ascending=False)\n\n\ndef with_polars():\n    return (pl.scan_parquet(\"orders.parquet\").filter(pl.col(\"status\") == \"paid\")\n            .group_by(\"store\").agg(pl.col(\"total_cents\").sum().alias(\"sum\"), pl.col(\"total_cents\").count().alias(\"count\"))\n            .sort(\"sum\", descending=True).collect())\n\n\ndef with_duckdb():\n    return duckdb.sql(\"\"\"SELECT store, sum(total_cents) AS \"sum\", count(*) AS \"count\" FROM 'orders.parquet'\n                         WHERE status = 'paid' GROUP BY store ORDER BY \"sum\" DESC\"\"\").fetchall()\n\n\na = [(store, int(r[\"sum\"]), int(r[\"count\"])) for store, r in with_pandas().iterrows()]\nb = [tuple(r) for r in with_polars().iter_rows()]\nc = with_duckdb()\nprint(\"same answer from all three:\", a == b == c)\nfor store, cents, count in a[:3]:\n    print(f\"  {store:<10}{count:>9,} paid orders{cents / 100:>14,.2f}\")\n",
  "m9/lazy_polars.py": "\"\"\"Polars can look at the whole query before it reads anything. explain() prints the plan.\"\"\"\nimport polars as pl\n\nquery = (pl.scan_parquet(\"orders.parquet\")\n         .filter(pl.col(\"status\") == \"paid\")\n         .group_by(\"store\").agg(pl.col(\"total_cents\").sum().alias(\"cents\"))\n         .sort(\"cents\", descending=True))\nprint(query.explain())\n",
  "m10/profile_first.py": "\"\"\"Measure first. A slow report, a profile that names the hot spot, a one-line fix, and the same run again.\"\"\"\nimport cProfile\nimport pstats\nimport statistics\nimport time\n\nSTORES = [f\"S-{n:04d}\" for n in range(5000)]\nROWS = [(f\"O-{i}\", STORES[(i * 37) % 5000], 100 + i % 900) for i in range(20_000)]\n\n\ndef is_known(store, known):\n    return store in known\n\n\ndef report(rows, known):\n    totals = {}\n    for order_id, store, cents in rows:\n        if is_known(store, known):\n            totals[store] = totals.get(store, 0) + cents\n    return totals\n\n\ndef seconds(known, runs=3):\n    took = []\n    for _ in range(runs):\n        t0 = time.perf_counter()\n        report(ROWS, known)\n        took.append(time.perf_counter() - t0)\n    return statistics.median(took)\n\n\nprofile = cProfile.Profile()\nprofile.runcall(report, ROWS, STORES)  # `known` is a list of 5,000 store ids\npstats.Stats(profile).strip_dirs().sort_stats(\"tottime\").print_stats(3)\n\nprint(f\"known is a list: {seconds(STORES):.3f} s\")\nprint(f\"known is a set:  {seconds(set(STORES)):.4f} s\")\n",
  "m10/vectorize.py": "\"\"\"One million numbers: a Python loop and the same sum as one column operation. Median of 5 runs each.\"\"\"\nimport statistics\nimport time\n\nimport numpy as np\nimport pandas as pd\n\nvalues = list(range(1_000_000))\narr = np.arange(1_000_000)\nseries = pd.Series(arr)\n\n\ndef loop():\n    total = 0\n    for v in values:\n        total += v * 2\n    return total\n\n\ndef comprehension():\n    return sum([v * 2 for v in values])\n\n\ndef numpy_sum():\n    return int((arr * 2).sum())\n\n\ndef pandas_sum():\n    return int((series * 2).sum())\n\n\ndef median_ms(fn, runs=5):\n    took = []\n    for _ in range(runs):\n        t0 = time.perf_counter()\n        fn()\n        took.append((time.perf_counter() - t0) * 1000)\n    return statistics.median(took)\n\n\nassert loop() == comprehension() == numpy_sum() == pandas_sum()\nprint(f\"{'method':<28}{'milliseconds':>14}\")\nfor name, fn in ((\"for loop\", loop), (\"list comprehension and sum\", comprehension), (\"numpy: (arr * 2).sum()\", numpy_sum), (\"pandas: (s * 2).sum()\", pandas_sum)):\n    print(f\"{name:<28}{median_ms(fn):>14.1f}\")\n",
  "m10/pandas_memory.py": "\"\"\"The memory of one table, with the default types and with smaller ones. One million made-up orders.\"\"\"\nimport numpy as np\nimport pandas as pd\n\nrng = np.random.default_rng(7)\nn = 1_000_000\ndf = pd.DataFrame({\n    \"order_id\": np.arange(n),\n    \"store\": rng.choice([\"London\", \"Singapore\", \"Sydney\", \"Mumbai\", \"Dubai\", \"Paris\", \"Tokyo\", \"Lagos\"], n),\n    \"status\": rng.choice([\"paid\", \"refunded\", \"cancelled\"], n),\n    \"qty\": rng.integers(1, 10, n),\n    \"total_cents\": rng.integers(300, 4000, n),\n})\nsmall = df.astype({\"order_id\": \"int32\", \"store\": \"category\", \"status\": \"category\", \"qty\": \"int8\", \"total_cents\": \"int32\"})\nbefore, after = df.memory_usage(deep=True), small.memory_usage(deep=True)\n\nprint(f\"{'column':<13}{'default type':<14}{'MB':>7}   {'smaller type':<14}{'MB':>7}\")\nfor col in df.columns:\n    print(f\"{col:<13}{str(df[col].dtype):<14}{before[col] / 1e6:>7.1f}   {str(small[col].dtype):<14}{after[col] / 1e6:>7.1f}\")\nprint(f\"{'total':<13}{'':<14}{before.sum() / 1e6:>7.1f}   {'':<14}{after.sum() / 1e6:>7.1f}\")\nassert df[\"total_cents\"].sum() == small[\"total_cents\"].sum() and (df[\"store\"] == small[\"store\"].astype(str)).all()\nprint(\"same sums and values after the change\")\n",
  "m10/threaded_fetch.py": "\"\"\"Coding round: do many slow calls at once, keep the order, and keep going when one call fails.\"\"\"\nimport time\nfrom concurrent.futures import ThreadPoolExecutor\n\n\ndef fetch_all(fetch, urls, workers=10):\n    \"\"\"Call fetch(url) for every url in a thread pool. Return a list in the order of `urls` with one item for each:\n    (\"ok\", result) when the call worked, or (\"error\", \"ExceptionName: message\") when it raised.\"\"\"\n    def one(url):\n        try:\n            return (\"ok\", fetch(url))\n        except Exception as err:\n            return (\"error\", f\"{type(err).__name__}: {err}\")\n    with ThreadPoolExecutor(workers) as pool:\n        return list(pool.map(one, urls))\n\n\ndef slow(url):\n    time.sleep(0.1)  # stands in for a network call\n    if url.endswith(\"/7\"):\n        raise TimeoutError(\"read timed out\")\n    return url.upper()\n\n\nurls = [f\"/orders/{n}\" for n in range(20)]\nt0 = time.perf_counter()\ngot = fetch_all(slow, urls, workers=10)\ntook = time.perf_counter() - t0\nassert [g[1] for g in got if g[0] == \"ok\"] == [u.upper() for u in urls if not u.endswith(\"/7\")], \"results in the order of the urls\"\nassert got[7] == (\"error\", \"TimeoutError: read timed out\") and len([g for g in got if g[0] == \"error\"]) == 1\nprint(\"20 calls of 0.1 s with 10 workers:\", \"finished in under a second\" if took < 1.0 else \"TOO SLOW\", \"-\", len(got), \"results\")\nassert took < 1.0, took\nprint(\"order kept:\", got[0], got[19])\nprint(\"one failure kept, the other 19 worked:\", got[7])\nassert fetch_all(slow, []) == []\nprint(\"no urls:\", fetch_all(slow, []))\nprint(\"tests passed\")\n",
  "m10/concurrency.py": "\"\"\"Eight jobs, done one after another and at once. The waiting jobs sleep 0.25 s, which stands in for a network call.\nThe computing jobs add up numbers. Each time is the median of 3 runs on this machine.\"\"\"\nimport asyncio\nimport os\nimport statistics\nimport sys\nimport time\nfrom concurrent.futures import ProcessPoolExecutor, ThreadPoolExecutor\n\n\ndef wait_job(_):\n    time.sleep(0.25)\n\n\nasync def wait_async(_):\n    await asyncio.sleep(0.25)\n\n\ndef cpu_job(_):\n    total = 0\n    for i in range(10_000_000):\n        total += i * i % 7\n    return total\n\n\ndef one_after_another(fn):\n    return [fn(i) for i in range(8)]\n\n\ndef with_threads(fn):\n    with ThreadPoolExecutor(8) as pool:\n        return list(pool.map(fn, range(8)))\n\n\ndef with_processes(fn):\n    with ProcessPoolExecutor(4) as pool:\n        return list(pool.map(fn, range(8)))\n\n\ndef with_asyncio():\n    async def main():\n        await asyncio.gather(*(wait_async(i) for i in range(8)))\n    asyncio.run(main())\n\n\ndef seconds(run, repeats=3):\n    took = []\n    for _ in range(repeats):\n        t0 = time.perf_counter()\n        run()\n        took.append(time.perf_counter() - t0)\n    return statistics.median(took)\n\n\nif __name__ == \"__main__\":\n    print(f\"GIL enabled: {sys._is_gil_enabled()}, cores: {os.cpu_count()}\")\n    print(\"eight jobs that wait 0.25 s\")\n    for name, run in ((\"one after another\", lambda: one_after_another(wait_job)), (\"8 threads\", lambda: with_threads(wait_job)),\n                      (\"4 processes\", lambda: with_processes(wait_job)), (\"asyncio\", with_asyncio)):\n        print(f\"  {name:<20}{seconds(run):>6.2f} s\")\n    print(\"eight jobs that compute\")\n    for name, run in ((\"one after another\", lambda: one_after_another(cpu_job)), (\"8 threads\", lambda: with_threads(cpu_job)), (\"4 processes\", lambda: with_processes(cpu_job))):\n        print(f\"  {name:<20}{seconds(run):>6.2f} s\")\n",
  "m10/concurrency.py@free": "\"\"\"Eight jobs, done one after another and at once. The waiting jobs sleep 0.25 s, which stands in for a network call.\nThe computing jobs add up numbers. Each time is the median of 3 runs on this machine.\"\"\"\nimport asyncio\nimport os\nimport statistics\nimport sys\nimport time\nfrom concurrent.futures import ProcessPoolExecutor, ThreadPoolExecutor\n\n\ndef wait_job(_):\n    time.sleep(0.25)\n\n\nasync def wait_async(_):\n    await asyncio.sleep(0.25)\n\n\ndef cpu_job(_):\n    total = 0\n    for i in range(10_000_000):\n        total += i * i % 7\n    return total\n\n\ndef one_after_another(fn):\n    return [fn(i) for i in range(8)]\n\n\ndef with_threads(fn):\n    with ThreadPoolExecutor(8) as pool:\n        return list(pool.map(fn, range(8)))\n\n\ndef with_processes(fn):\n    with ProcessPoolExecutor(4) as pool:\n        return list(pool.map(fn, range(8)))\n\n\ndef with_asyncio():\n    async def main():\n        await asyncio.gather(*(wait_async(i) for i in range(8)))\n    asyncio.run(main())\n\n\ndef seconds(run, repeats=3):\n    took = []\n    for _ in range(repeats):\n        t0 = time.perf_counter()\n        run()\n        took.append(time.perf_counter() - t0)\n    return statistics.median(took)\n\n\nif __name__ == \"__main__\":\n    print(f\"GIL enabled: {sys._is_gil_enabled()}, cores: {os.cpu_count()}\")\n    print(\"eight jobs that wait 0.25 s\")\n    for name, run in ((\"one after another\", lambda: one_after_another(wait_job)), (\"8 threads\", lambda: with_threads(wait_job)),\n                      (\"4 processes\", lambda: with_processes(wait_job)), (\"asyncio\", with_asyncio)):\n        print(f\"  {name:<20}{seconds(run):>6.2f} s\")\n    print(\"eight jobs that compute\")\n    for name, run in ((\"one after another\", lambda: one_after_another(cpu_job)), (\"8 threads\", lambda: with_threads(cpu_job)), (\"4 processes\", lambda: with_processes(cpu_job))):\n        print(f\"  {name:<20}{seconds(run):>6.2f} s\")\n",
  "m11/type_hints.py": "\"\"\"Type hints are notes for readers and tools. Python does not check them when the program runs.\"\"\"\nfrom dataclasses import dataclass\n\n\ndef total_in_cents(price: str, qty: int) -> int:\n    return price * qty  # \"12.50\" * 3 is legal Python: it repeats the text\n\n\nprint(\"the hint says int, and we got:\", repr(total_in_cents(\"12.50\", 3)))\n\n\n@dataclass\nclass Order:\n    order_id: str\n    total_cents: int\n\n\norder = Order(order_id=17, total_cents=\"12.50\")\nprint(\"a dataclass accepts anything:\", order)\nprint(\"the types of the fields:\", type(order.order_id).__name__, type(order.total_cents).__name__)\n",
  "m11/dataclass_vs_pydantic.py": "\"\"\"A pydantic model checks what it is given, converts what it can, and says what is wrong.\"\"\"\nfrom datetime import datetime\nfrom typing import Literal\n\nfrom pydantic import BaseModel, Field, ValidationError\n\n\nclass Order(BaseModel):\n    order_id: str = Field(pattern=r\"^O-\\d+$\")\n    store: Literal[\"London\", \"Singapore\"]\n    qty: int = Field(ge=1)\n    total_cents: int = Field(ge=0)\n    ordered_at: datetime\n\n\ngood = {\"order_id\": \"O-17\", \"store\": \"London\", \"qty\": \"2\", \"total_cents\": \"1250\", \"ordered_at\": \"2026-03-14T08:15:00\"}\norder = Order.model_validate(good)\nprint(\"a row of text, converted:\", repr(order.qty), repr(order.total_cents), order.ordered_at.isoformat())\n\nbad = {\"order_id\": \"17\", \"store\": \"Paris\", \"qty\": 0, \"total_cents\": \"12.50\", \"ordered_at\": \"yesterday\"}\ntry:\n    Order.model_validate(bad)\nexcept ValidationError as err:\n    print(err.error_count(), \"errors:\")\n    for e in err.errors():\n        print(f\"  {e['loc'][0]:<13}{e['type']:<32}{e['msg']}\")\n\ntry:\n    Order.model_validate(good, strict=True)\nexcept ValidationError as err:\n    first = err.errors()[0]\n    print(\"strict mode on text from a CSV:\", err.error_count(), \"errors, the first is\", first[\"loc\"][0], \"->\", first[\"msg\"])\n",
  "m11/validate_or_quarantine.py": "\"\"\"Validate every row at the boundary. Good rows go on, bad rows go to quarantine with the reason, and too many bad rows fail the run.\"\"\"\nimport sys\nfrom datetime import datetime\nfrom typing import Literal\n\nfrom pydantic import BaseModel, ConfigDict, Field, ValidationError\n\n\nclass Order(BaseModel):\n    model_config = ConfigDict(extra=\"ignore\")  # \"forbid\" would reject a column that is not in the model\n\n    order_id: str = Field(pattern=r\"^O-\\d+$\")\n    store: Literal[\"London\", \"Singapore\"]\n    qty: int = Field(ge=1)\n    total_cents: int = Field(ge=0)\n    ordered_at: datetime\n\n\nROWS = [  # one dict for each line of a CSV file, so every value is text\n    {\"order_id\": \"O-1\", \"store\": \"London\", \"qty\": \"2\", \"total_cents\": \"1250\", \"ordered_at\": \"2026-03-14T08:15:00\"},\n    {\"order_id\": \"O-2\", \"store\": \"Singapore\", \"qty\": \"1\", \"total_cents\": \"475\", \"ordered_at\": \"2026-03-14T09:02:00\"},\n    {\"order_id\": \"O-3\", \"store\": \"Paris\", \"qty\": \"1\", \"total_cents\": \"820\", \"ordered_at\": \"2026-03-14T09:30:00\"},\n    {\"order_id\": \"O-4\", \"store\": \"London\", \"qty\": \"3\", \"total_cents\": \"1990\", \"ordered_at\": \"2026-03-14T10:11:00\"},\n    {\"order_id\": \"O-5\", \"store\": \"London\", \"qty\": \"1\", \"total_cents\": \"12,50\", \"ordered_at\": \"2026-03-14T10:40:00\"},\n    {\"order_id\": \"O-6\", \"store\": \"Singapore\", \"qty\": \"2\", \"total_cents\": \"3100\", \"ordered_at\": \"2026-03-14T11:05:00\", \"coupon\": \"SPRING\"},\n    {\"order_id\": \"O-7\", \"store\": \"Singapore\", \"qty\": \"0\", \"total_cents\": \"640\", \"ordered_at\": \"2026-03-14T11:30:00\"},\n    {\"order_id\": \"O-8\", \"store\": \"London\", \"qty\": \"1\", \"total_cents\": \"900\", \"ordered_at\": \"2026-03-14T12:00:00\"},\n    {\"order_id\": \"O-8\", \"store\": \"London\", \"qty\": \"1\", \"total_cents\": \"900\", \"ordered_at\": \"2026-03-14T12:00:00\"},\n    {\"order_id\": \"O-10\", \"store\": \"Singapore\", \"qty\": \"4\", \"total_cents\": \"2200\", \"ordered_at\": \"2026-03-14T12:45:00\"},\n]\nMAX_BAD_SHARE = 0.50  # 50 percent suits this small demo. A real file gets a limit of a few percent.\n\n\ndef validate(rows):\n    good, quarantine, seen = [], [], set()\n    for line, row in enumerate(rows, start=2):  # line 1 of the file is the header\n        try:\n            order = Order.model_validate(row)\n        except ValidationError as err:\n            why = \"; \".join(f\"{e['loc'][0]}: {e['msg']}\" for e in err.errors())\n            quarantine.append({\"line\": line, \"order_id\": row[\"order_id\"], \"why\": why})\n            continue\n        if order.order_id in seen:\n            quarantine.append({\"line\": line, \"order_id\": row[\"order_id\"], \"why\": \"order_id: already seen in this file\"})\n            continue\n        seen.add(order.order_id)\n        good.append(order)\n    return good, quarantine\n\n\ngood, quarantine = validate(ROWS)\nprint(f\"read {len(ROWS)} rows: {len(good)} good, {len(quarantine)} in quarantine\")\nfor q in quarantine:\n    print(f\"  line {q['line']:>2} {q['order_id']:<5} {q['why']}\")\nshare = len(quarantine) / len(ROWS)\nif share > MAX_BAD_SHARE:\n    print(f\"status: failed, {share:.0%} of the rows are bad (limit {MAX_BAD_SHARE:.0%})\")\n    sys.exit(1)\nprint(f\"status: loaded {len(good)} rows, {share:.0%} in quarantine (limit {MAX_BAD_SHARE:.0%})\")\n",
  "m11/split_valid.py": "\"\"\"Coding round: split rows into good ones and quarantined ones with a checking function, and fail when too many are bad.\"\"\"\n\n\ndef split_valid(rows, check, max_bad_share=0.2):\n    \"\"\"check(row) returns the cleaned row, or raises ValueError(\"reason\"). Return (good, quarantine).\n    A quarantine item is {\"line\": n, \"row\": row, \"why\": reason}, with n counting from 2 because line 1 is the header.\n    When the share of bad rows is above max_bad_share, raise RuntimeError (the good and quarantined rows are not returned).\"\"\"\n    good, quarantine = [], []\n    for line, row in enumerate(rows, start=2):\n        try:\n            good.append(check(row))\n        except ValueError as err:\n            quarantine.append({\"line\": line, \"row\": row, \"why\": str(err)})\n    if rows and len(quarantine) / len(rows) > max_bad_share:\n        raise RuntimeError(f\"{len(quarantine)} of {len(rows)} rows are bad\")\n    return good, quarantine\n\n\ndef check_order(row):\n    try:\n        qty = int(row[\"qty\"])\n        cents = int(row[\"total_cents\"])\n    except (KeyError, ValueError):\n        raise ValueError(\"qty and total_cents must be whole numbers\") from None\n    if qty < 1:\n        raise ValueError(\"qty must be at least 1\")\n    return {\"order_id\": row[\"order_id\"], \"qty\": qty, \"total_cents\": cents}\n\n\nrows = [{\"order_id\": \"O-1\", \"qty\": \"2\", \"total_cents\": \"1250\"}, {\"order_id\": \"O-2\", \"qty\": \"0\", \"total_cents\": \"475\"}, {\"order_id\": \"O-3\", \"qty\": \"1\", \"total_cents\": \"8,20\"},\n        {\"order_id\": \"O-4\", \"qty\": \"1\", \"total_cents\": \"1990\"}, {\"order_id\": \"O-5\", \"qty\": \"3\", \"total_cents\": \"3100\"}, {\"order_id\": \"O-6\", \"qty\": \"1\", \"total_cents\": \"640\"},\n        {\"order_id\": \"O-7\", \"qty\": \"2\", \"total_cents\": \"900\"}, {\"order_id\": \"O-8\", \"qty\": \"1\", \"total_cents\": \"2200\"}, {\"order_id\": \"O-9\", \"qty\": \"1\", \"total_cents\": \"500\"},\n        {\"order_id\": \"O-10\", \"qty\": \"5\", \"total_cents\": \"1000\"}]\ngood, quarantine = split_valid(rows, check_order, max_bad_share=0.3)\nassert [g[\"order_id\"] for g in good] == [\"O-1\", \"O-4\", \"O-5\", \"O-6\", \"O-7\", \"O-8\", \"O-9\", \"O-10\"] and good[0] == {\"order_id\": \"O-1\", \"qty\": 2, \"total_cents\": 1250}\nprint(\"8 good rows, cleaned:\", good[0])\nassert [(q[\"line\"], q[\"why\"]) for q in quarantine] == [(3, \"qty must be at least 1\"), (4, \"qty and total_cents must be whole numbers\")]\nprint(\"quarantined:\", [(q[\"line\"], q[\"why\"]) for q in quarantine])\ntry:\n    split_valid(rows, check_order, max_bad_share=0.1)\n    raise AssertionError(\"20 percent bad rows must fail a 10 percent limit\")\nexcept RuntimeError as err:\n    print(\"over the limit:\", err)\nassert split_valid([], check_order) == ([], [])\nprint(\"no rows:\", split_valid([], check_order))\nprint(\"tests passed\")\n",
  "m11/contract_check.py": "\"\"\"Coding round: a data contract as code, and a report of how today's file differs from it.\"\"\"\nCONTRACT = {\"order_id\": \"str\", \"store\": \"str\", \"qty\": \"int\", \"total_cents\": \"int\"}\n\n\ndef kind(value):\n    for name, cast in ((\"int\", int), (\"float\", float)):\n        try:\n            cast(value)\n            return name\n        except ValueError:\n            pass\n    return \"str\"\n\n\ndef check_schema(contract, rows):\n    \"\"\"Compare the columns of `rows` (a list of dicts of text) with `contract` ({column: \"int\" | \"float\" | \"str\"}).\n    Return findings as tuples, sorted: (\"missing\", column), (\"new\", column), (\"type\", column, expected, got).\n    The type of a column is the widest kind seen in its values: str beats float, and float beats int.\"\"\"\n    order = {\"int\": 0, \"float\": 1, \"str\": 2}\n    columns = {c for row in rows for c in row}\n    findings = [(\"missing\", c) for c in contract if c not in columns] + [(\"new\", c) for c in columns if c not in contract]\n    for c in contract:\n        if c in columns:\n            seen = max((kind(row[c]) for row in rows if row.get(c) not in (None, \"\")), key=order.get, default=\"int\")\n            if seen != contract[c] and not (contract[c] == \"float\" and seen == \"int\"):\n                findings.append((\"type\", c, contract[c], seen))\n    return sorted(findings)\n\n\nok = [{\"order_id\": \"O-1\", \"store\": \"London\", \"qty\": \"2\", \"total_cents\": \"1250\"}, {\"order_id\": \"O-2\", \"store\": \"Singapore\", \"qty\": \"1\", \"total_cents\": \"475\"}]\nassert check_schema(CONTRACT, ok) == []\nprint(\"the contract and a clean file:\", check_schema(CONTRACT, ok))\n\nrenamed = [{\"order_id\": \"O-1\", \"store\": \"London\", \"qty\": \"2\", \"total\": \"1250\"}]\nassert check_schema(CONTRACT, renamed) == [(\"missing\", \"total_cents\"), (\"new\", \"total\")]\nprint(\"a renamed column:\", check_schema(CONTRACT, renamed))\n\nchanged = [{\"order_id\": \"O-1\", \"store\": \"London\", \"qty\": \"2\", \"total_cents\": \"12.50\"}, {\"order_id\": \"O-2\", \"store\": \"London\", \"qty\": \"two\", \"total_cents\": \"475\"}]\nassert check_schema(CONTRACT, changed) == [(\"type\", \"qty\", \"int\", \"str\"), (\"type\", \"total_cents\", \"int\", \"float\")]\nprint(\"values of another type:\", check_schema(CONTRACT, changed))\n\nextra = [dict(ok[0], coupon=\"SPRING\")]\nassert check_schema(CONTRACT, extra) == [(\"new\", \"coupon\")]\nprint(\"a new column:\", check_schema(CONTRACT, extra))\nprint(\"tests passed\")\n",
  "m11/bad_types.py": "\"\"\"Three mistakes that mypy finds without running the code.\"\"\"\n\n\ndef total_in_cents(price_cents: int, qty: int) -> int:\n    return price_cents * qty / 100\n\n\ndef find_store(stores: dict[str, str], key: str) -> str:\n    return stores.get(key)\n\n\ndef load(order_id: str, total_cents: int) -> None:\n    print(order_id, total_cents)\n\n\nload(17, \"12.50\")\n",
  "m12/orders.py": "\"\"\"Small cleaning functions that a nightly job uses.\"\"\"\nfrom decimal import Decimal, InvalidOperation\n\n\ndef to_cents(text):\n    \"\"\"'12.50' becomes 1250. Raise ValueError for anything that is not an amount with at most two decimals.\"\"\"\n    try:\n        amount = Decimal(text.strip())\n    except InvalidOperation:\n        raise ValueError(f\"not an amount: {text!r}\") from None\n    if amount != amount.quantize(Decimal(\"0.01\")):\n        raise ValueError(f\"more than two decimals: {text!r}\")\n    return int(amount * 100)\n\n\ndef is_large(total_cents, limit_cents=10_000):\n    \"\"\"An order is large when it reaches the limit.\"\"\"\n    return total_cents >= limit_cents\n\n\ndef clean_store(name):\n    \"\"\"' london ' becomes 'London'. An empty name becomes None.\"\"\"\n    name = name.strip().title()\n    return name or None\n\n\ndef discount_cents(total_cents, qty):\n    \"\"\"10 percent off from 10 items, and never more than 5,000 cents.\"\"\"\n    if qty >= 10:\n        return min(total_cents // 10, 5_000)\n    return 0\n",
  "m12/test_weak.py": "import pytest\n\nfrom orders import clean_store, discount_cents, is_large, to_cents\n\n\ndef test_to_cents():\n    assert to_cents(\"12.50\") == 1250\n    with pytest.raises(ValueError):\n        to_cents(\"abc\")\n    with pytest.raises(ValueError):\n        to_cents(\"1.234\")\n\n\ndef test_is_large():\n    assert is_large(20_000)\n    assert not is_large(100)\n\n\ndef test_clean_store():\n    assert clean_store(\" london \") == \"London\"\n    assert clean_store(\"\") is None\n\n\ndef test_discount():\n    assert discount_cents(10_000, 12) == 1000\n    assert discount_cents(10_000, 2) == 0\n",
  "m12/test_strong.py": "import pytest\n\nfrom orders import clean_store, discount_cents, is_large, to_cents\n\n\n@pytest.mark.parametrize(\"text, cents\", [(\"12.50\", 1250), (\" 7 \", 700), (\"0.01\", 1), (\"1000\", 100_000)])\ndef test_to_cents(text, cents):\n    assert to_cents(text) == cents\n\n\n@pytest.mark.parametrize(\"text\", [\"abc\", \"1.234\", \"\", \"12,50\"])\ndef test_to_cents_rejects(text):\n    with pytest.raises(ValueError):\n        to_cents(text)\n\n\n@pytest.mark.parametrize(\"cents, large\", [(20_000, True), (10_000, True), (9_999, False), (100, False)])\ndef test_is_large(cents, large):\n    assert is_large(cents) is large\n\n\ndef test_clean_store():\n    assert clean_store(\" london \") == \"London\"\n    assert clean_store(\"SINGAPORE\") == \"Singapore\"\n    assert clean_store(\"   \") is None\n\n\n@pytest.mark.parametrize(\"total, qty, discount\", [(10_000, 12, 1000), (10_000, 10, 1000), (10_000, 9, 0), (100_000, 10, 5_000), (1, 10, 0)])\ndef test_discount(total, qty, discount):\n    assert discount_cents(total, qty) == discount\n",
  "m12/test_failing.py": "from orders import to_cents\n\n\ndef test_to_cents_of_a_price():\n    assert to_cents(\"12.50\") == 125\n",
  "m12/run_mutants.py": "\"\"\"Mutation testing by hand: change one thing in orders.py, run the tests, and see whether they notice.\"\"\"\nimport pathlib\nimport shutil\nimport subprocess\nimport sys\nimport tempfile\n\nMUTANTS = [\n    (\"is_large: >= becomes >\", \"total_cents >= limit_cents\", \"total_cents > limit_cents\"),\n    (\"discount: qty >= 10 becomes > 10\", \"qty >= 10\", \"qty > 10\"),\n    (\"discount: the cap 5,000 becomes 50,000\", \"5_000)\", \"50_000)\"),\n    (\"clean_store: title() becomes upper()\", \".title()\", \".upper()\"),\n    (\"clean_store: an empty name is no longer None\", \"return name or None\", \"return name\"),\n    (\"to_cents: the scale 100 becomes 10\", \"amount * 100\", \"amount * 10\"),\n    (\"to_cents: the decimals check is inverted\", \"amount != amount.quantize\", \"amount == amount.quantize\"),\n]\n\n\ndef passes(source, suite):\n    with tempfile.TemporaryDirectory() as folder:\n        folder = pathlib.Path(folder)\n        (folder / \"orders.py\").write_text(source)\n        shutil.copy(suite, folder / suite.name)\n        run = subprocess.run([sys.executable, \"-m\", \"pytest\", \"-q\", \"-x\", \"-p\", \"no:cacheprovider\", suite.name], cwd=folder, capture_output=True, text=True)\n        return run.returncode == 0\n\n\nhere = pathlib.Path(__file__).parent\noriginal = (here / \"orders.py\").read_text()\nfor suite in (\"test_weak.py\", \"test_strong.py\"):\n    suite = here / suite\n    assert passes(original, suite), \"the tests must pass on the real code\"\n    survived = [name for name, old, new in MUTANTS if passes(original.replace(old, new, 1), suite)]\n    print(f\"{suite.name}: {len(MUTANTS) - len(survived)} of {len(MUTANTS)} mutants caught\")\n    for name in survived:\n        print(f\"  survived: {name}\")\n",
  "m12/hypothesis_demo.py": "\"\"\"A property test: say what must always be true, and let Hypothesis look for an example that breaks it.\"\"\"\nfrom decimal import Decimal\n\nfrom hypothesis import given, settings, strategies as st\n\nfrom orders import to_cents\n\n\ndef dedupe_keep_order(items):\n    return sorted(set(items))  # a bug: it sorts, and does not keep the first-seen order\n\n\n@settings(derandomize=True, max_examples=200)\n@given(st.lists(st.integers(-5, 5)))\ndef test_dedupe_keeps_the_first_seen_order(xs):\n    first_seen = [x for i, x in enumerate(xs) if x not in xs[:i]]\n    assert dedupe_keep_order(xs) == first_seen\n\n\n@settings(derandomize=True, max_examples=200)\n@given(st.integers(min_value=0, max_value=10**9))\ndef test_to_cents_reads_back_what_was_written(cents):\n    assert to_cents(f\"{Decimal(cents) / 100:.2f}\") == cents\n",
  "m12/bad_style.py": "import os, sys\nfrom decimal import *\n\n\ndef load(rows, seen=[]):\n    for r in rows:\n        if r == None:\n            continue\n        try:\n            seen.append(int(r))\n        except:\n            pass\n    return seen\n",
  "m12/logging_basics.py": "\"\"\"Logs that you can search: a level, a name, fields as data, and the traceback of an error. No timestamps, so the output is the same each run.\"\"\"\nimport json\nimport logging\nimport sys\n\n\nclass JsonFormatter(logging.Formatter):\n    def format(self, record):\n        data = {\"level\": record.levelname, \"logger\": record.name, \"message\": record.getMessage()}\n        data.update(getattr(record, \"fields\", {}))\n        if record.exc_info:\n            data[\"error\"] = self.formatException(record.exc_info).splitlines()[-1]\n        return json.dumps(data)\n\n\nhandler = logging.StreamHandler(sys.stdout)\nhandler.setFormatter(JsonFormatter())\nlog = logging.getLogger(\"brewline.load\")\nlog.addHandler(handler)\nlog.setLevel(logging.INFO)\nlog.propagate = False\n\nrun = {\"run_id\": \"2026-03-14\"}\nlog.debug(\"this line is not shown at the level INFO\")\nlog.info(\"extract finished\", extra={\"fields\": dict(run, rows=1200, seconds=4)})\nlog.warning(\"rows rejected\", extra={\"fields\": dict(run, rejected=3, share=0.0025)})\ntry:\n    int(\"12,50\")\nexcept ValueError:\n    log.exception(\"load failed\", extra={\"fields\": run})\n",
  "m12/parse_amount.py": "\"\"\"Coding round: read a money amount from text, exactly, and refuse anything that is not one.\"\"\"\nfrom decimal import Decimal, InvalidOperation\n\n\ndef parse_amount(text):\n    \"\"\"Return the amount as a Decimal with two places. Accept spaces around the text, a thousands comma in the right places\n    (\"1,250.00\"), and 0 to 2 decimals. Raise ValueError for anything else: \"12,50\", \"1.234\", \"abc\", \"\" and \"1,25.0\".\"\"\"\n    clean = text.strip()\n    whole, _, decimals = clean.partition(\".\")\n    if len(decimals) > 2:\n        raise ValueError(f\"more than two decimals: {text!r}\")\n    groups = whole.split(\",\")\n    if len(groups) > 1 and (not 1 <= len(groups[0]) <= 3 or any(len(g) != 3 for g in groups[1:])):\n        raise ValueError(f\"misplaced comma: {text!r}\")\n    try:\n        return Decimal(\"\".join(groups) + (\".\" + decimals if decimals else \"\")).quantize(Decimal(\"0.01\"))\n    except InvalidOperation:\n        raise ValueError(f\"not an amount: {text!r}\") from None\n\n\nGOOD = [(\"12.50\", \"12.50\"), (\" 7 \", \"7.00\"), (\"1,250.00\", \"1250.00\"), (\"0.5\", \"0.50\"), (\"1,000\", \"1000.00\"), (\"999,999.99\", \"999999.99\")]\nBAD = [\"12,50\", \"1.234\", \"abc\", \"\", \"1,25.0\", \",100\", \"1,2345\"]\nfor text, want in GOOD:\n    assert parse_amount(text) == Decimal(want), (text, parse_amount(text))\nprint(\"amounts read:\", len(GOOD), \"of\", len(GOOD), \"-\", [str(parse_amount(t)) for t, _ in GOOD[:3]], \"...\")\nfor text in BAD:\n    try:\n        parse_amount(text)\n    except ValueError:\n        continue\n    raise AssertionError(f\"{text!r} must be refused\")\nprint(\"amounts refused:\", len(BAD), \"of\", len(BAD), \"-\", BAD[:4], \"...\")\nassert isinstance(parse_amount(\"12.5\"), Decimal) and str(parse_amount(\"12.5\")) == \"12.50\"\nprint(\"the type is Decimal, never float:\", repr(parse_amount(\"12.5\")))\nprint(\"tests passed\")\n",
  "m13/config_precedence.py": "\"\"\"Settings come from four places. The one nearest to the person who runs the job wins, and every value remembers where it came from.\"\"\"\nimport tomllib\n\nDEFAULTS = {\"api_url\": \"https://api.brewline.example/orders\", \"batch_size\": 1000, \"dry_run\": False}\nSECRET = \"BREWLINE_API_TOKEN\"  # a secret is read from the environment only, and never printed\n\n\ndef as_type(default, value):\n    if isinstance(default, bool):\n        return value if isinstance(value, bool) else str(value).lower() in (\"1\", \"true\", \"yes\")\n    return type(default)(value)\n\n\ndef load_config(file_text=None, env=None, args=None):\n    \"\"\"Layers, from weakest to strongest: defaults, a TOML file, BREWLINE_* environment variables, command line flags.\"\"\"\n    config = {key: (value, \"default\") for key, value in DEFAULTS.items()}\n    layers = []\n    if file_text:\n        layers.append((\"config file\", tomllib.loads(file_text)))\n    if env:\n        layers.append((\"environment\", {k.removeprefix(\"BREWLINE_\").lower(): v for k, v in env.items() if k.startswith(\"BREWLINE_\") and k != SECRET}))\n    if args:\n        layers.append((\"command line\", args))\n    for name, values in layers:\n        for key, value in values.items():\n            if key not in DEFAULTS:\n                raise KeyError(f\"unknown setting {key!r} in the {name}\")\n            config[key] = (as_type(DEFAULTS[key], value), name)\n    return config\n\n\ndef api_token(env):\n    token = env.get(SECRET)\n    if not token:\n        raise SystemExit(f\"{SECRET} is not set. Export it, or run with --dry-run.\")\n    return token\n\n\nFILE = 'api_url = \"https://staging.brewline.example/orders\"\\nbatch_size = 500\\n'\nENV = {\"BREWLINE_BATCH_SIZE\": \"200\", \"BREWLINE_API_TOKEN\": \"s3cr3t-token-value\"}\nARGS = {\"batch_size\": 50, \"dry_run\": True}\n\n\ndef show(title, config):\n    print(title)\n    for key, (value, source) in config.items():\n        print(f\"  {key:<11}{value!s:<42}from the {source}\")\n\n\nshow(\"defaults only:\", load_config())\nshow(\"with a config file:\", load_config(FILE))\nshow(\"and an environment variable:\", load_config(FILE, ENV))\nshow(\"and command line flags:\", load_config(FILE, ENV, ARGS))\n\nprint(\"a setting that does not exist:\")\ntry:\n    load_config(FILE, args={\"batchsize\": 5})\nexcept KeyError as err:\n    print(\"  KeyError:\", err)\nprint(\"the token is read from the environment:\", len(api_token(ENV)), \"characters, never printed\")\ntry:\n    api_token({})\nexcept SystemExit as err:\n    print(\"without it:\", err)\n",
  "m13/load_orders.py": "\"\"\"A command line for the nightly load. typer builds the options, the help text and the checks from the function signature.\"\"\"\nfrom datetime import date\nfrom pathlib import Path\nfrom typing import Annotated\n\nimport typer\n\napp = typer.Typer(add_completion=False, help=\"Load one day of orders.\")\n\n\n@app.command()\ndef load(\n    source: Annotated[Path, typer.Argument(exists=True, dir_okay=False, help=\"The CSV file of orders.\")],\n    day: Annotated[date, typer.Option(help=\"The business day, as YYYY-MM-DD.\")],\n    batch_size: Annotated[int, typer.Option(min=1, help=\"Rows for each commit.\")] = 1000,\n    dry_run: Annotated[bool, typer.Option(help=\"Check the file and print the plan. Write nothing.\")] = False,\n):\n    rows = sum(1 for _ in source.open()) - 1  # the first line is the header\n    plan = f\"{rows} rows from {source.name} for {day}, in batches of {batch_size}\"\n    if dry_run:\n        typer.echo(f\"dry run: would load {plan}\")\n        raise typer.Exit(0)\n    if rows == 0:\n        typer.echo(\"the file has no rows\", err=True)\n        raise typer.Exit(1)\n    typer.echo(f\"loaded {plan}\")\n\n\nif __name__ == \"__main__\":\n    app()\n",
  "m13/pyproject.toml": "[project]\nname = \"brewline-loader\"\nversion = \"0.1.0\"\ndescription = \"Load one day of Brewline orders\"\nrequires-python = \">=3.12\"\ndependencies = [\"typer>=0.12\"]\n\n[project.scripts]\nbrewline-load = \"brewline_loader.cli:app\"\n\n[build-system]\nrequires = [\"hatchling\"]\nbuild-backend = \"hatchling.build\"\n\n[tool.hatch.build.targets.wheel]\npackages = [\"src/brewline_loader\"]\n\n[tool.pytest.ini_options]\npythonpath = [\"src\"]\n\n[tool.ruff]\nline-length = 140\n",
  "m13/test_cli.py": "from pathlib import Path\n\nfrom typer.testing import CliRunner\n\nfrom brewline_loader.cli import app\n\nrunner = CliRunner()\n\n\ndef orders_file(folder: Path, rows: int) -> Path:\n    path = folder / \"orders.csv\"\n    path.write_text(\"order_id,total_cents\\n\" + \"\".join(f\"O-{n},{100 + n}\\n\" for n in range(rows)))\n    return path\n\n\ndef test_dry_run_prints_the_plan(tmp_path: Path) -> None:\n    result = runner.invoke(app, [str(orders_file(tmp_path, 3)), \"--day\", \"2026-03-14\", \"--dry-run\"])\n    assert result.exit_code == 0\n    assert \"dry run: would load 3 rows\" in result.output\n\n\ndef test_a_bad_date_is_a_usage_error(tmp_path: Path) -> None:\n    result = runner.invoke(app, [str(orders_file(tmp_path, 3)), \"--day\", \"14-03-2026\"])\n    assert result.exit_code == 2\n\n\ndef test_an_empty_file_fails(tmp_path: Path) -> None:\n    result = runner.invoke(app, [str(orders_file(tmp_path, 0)), \"--day\", \"2026-03-14\"])\n    assert result.exit_code == 1\n",
  "m13/ci.yml": "name: ci\non:\n  push:\n    branches: [main]\n  pull_request:\n\njobs:\n  checks:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v6\n      - uses: astral-sh/setup-uv@v8.1.0\n      - run: uv sync --locked\n      - run: uv run ruff check .\n      - run: uv run mypy src\n      - run: uv run pytest -q\n      - run: uv build\n",
  "m14/tangled.py": "\"\"\"One function that does everything: it reads a file, cleans rows, adds them up, writes to a database and prints. It works, and it is hard to test.\"\"\"\nimport csv\nimport sqlite3\nfrom datetime import datetime\n\n\ndef run(path, db_path):\n    conn = sqlite3.connect(db_path)\n    conn.execute(\"CREATE TABLE IF NOT EXISTS daily (store TEXT, day TEXT, cents INTEGER)\")\n    totals = {}\n    with open(path) as f:\n        for row in csv.DictReader(f):\n            if row[\"status\"] != \"paid\":\n                continue\n            store = row[\"store\"].strip().title()\n            day = datetime.fromisoformat(row[\"ordered_at\"]).date().isoformat()\n            totals[(store, day)] = totals.get((store, day), 0) + int(row[\"total_cents\"])\n    for (store, day), cents in sorted(totals.items()):\n        conn.execute(\"INSERT INTO daily VALUES (?, ?, ?)\", (store, day, cents))\n    conn.commit()\n    print(f\"wrote {len(totals)} rows to {db_path}\")\n",
  "m14/test_tangled.py": "import sqlite3\n\nfrom tangled import run\n\n\ndef test_run_writes_the_daily_totals(tmp_path, capsys):\n    source = tmp_path / \"orders.csv\"\n    source.write_text(\n        \"order_id,store,status,ordered_at,total_cents\\n\"\n        \"O-1, london ,paid,2026-03-14T08:15:00,1250\\n\"\n        \"O-2,London,refunded,2026-03-14T09:00:00,475\\n\"\n        \"O-3,London,paid,2026-03-14T10:30:00,820\\n\"\n        \"O-4,Singapore,paid,2026-03-15T01:00:00,1990\\n\"\n    )\n    db = tmp_path / \"out.db\"\n    run(source, db)\n    rows = sqlite3.connect(db).execute(\"SELECT store, day, cents FROM daily ORDER BY store, day\").fetchall()\n    assert rows == [(\"London\", \"2026-03-14\", 2070), (\"Singapore\", \"2026-03-15\", 1990)]\n    assert \"wrote 2 rows\" in capsys.readouterr().out\n",
  "m14/core.py": "\"\"\"The core: pure functions. They take values and return values. They read no file, call no API and know no clock.\"\"\"\nfrom datetime import datetime\n\n\ndef parse_order(row):\n    \"\"\"A row of text from the file becomes a clean order. Raise ValueError for a row that cannot be used.\"\"\"\n    try:\n        return {\"store\": row[\"store\"].strip().title(), \"status\": row[\"status\"],\n                \"day\": datetime.fromisoformat(row[\"ordered_at\"]).date().isoformat(), \"cents\": int(row[\"total_cents\"])}\n    except (KeyError, ValueError) as err:\n        raise ValueError(f\"bad order row: {err}\") from None\n\n\ndef daily_totals(orders):\n    \"\"\"Paid revenue for each store and day, as a sorted list of (store, day, cents).\"\"\"\n    totals = {}\n    for o in orders:\n        if o[\"status\"] == \"paid\":\n            totals[(o[\"store\"], o[\"day\"])] = totals.get((o[\"store\"], o[\"day\"]), 0) + o[\"cents\"]\n    return [(store, day, cents) for (store, day), cents in sorted(totals.items())]\n",
  "m14/shell.py": "\"\"\"The shell: it reads the file, calls the core, and writes the result. It decides nothing about the data.\"\"\"\nimport csv\nimport sqlite3\nimport sys\n\nfrom core import daily_totals, parse_order\n\n\ndef main(path, db_path):\n    with open(path) as f:\n        orders = [parse_order(row) for row in csv.DictReader(f)]\n    totals = daily_totals(orders)\n    conn = sqlite3.connect(db_path)\n    conn.execute(\"CREATE TABLE IF NOT EXISTS daily (store TEXT, day TEXT, cents INTEGER)\")\n    conn.executemany(\"INSERT INTO daily VALUES (?, ?, ?)\", totals)\n    conn.commit()\n    print(f\"wrote {len(totals)} rows to {db_path}\")\n\n\nif __name__ == \"__main__\":\n    main(sys.argv[1], sys.argv[2])\n",
  "m14/test_core.py": "import pytest\n\nfrom core import daily_totals, parse_order\n\n\ndef test_parse_order_cleans_the_row():\n    row = {\"order_id\": \"O-1\", \"store\": \" london \", \"status\": \"paid\", \"ordered_at\": \"2026-03-14T08:15:00\", \"total_cents\": \"1250\"}\n    assert parse_order(row) == {\"store\": \"London\", \"status\": \"paid\", \"day\": \"2026-03-14\", \"cents\": 1250}\n\n\ndef test_parse_order_rejects_a_bad_row():\n    with pytest.raises(ValueError):\n        parse_order({\"store\": \"London\", \"status\": \"paid\", \"ordered_at\": \"yesterday\", \"total_cents\": \"12,50\"})\n\n\ndef test_daily_totals_counts_paid_orders_only():\n    orders = [{\"store\": \"London\", \"status\": \"paid\", \"day\": \"2026-03-14\", \"cents\": 1250}, {\"store\": \"London\", \"status\": \"refunded\", \"day\": \"2026-03-14\", \"cents\": 475},\n              {\"store\": \"London\", \"status\": \"paid\", \"day\": \"2026-03-14\", \"cents\": 820}, {\"store\": \"Singapore\", \"status\": \"paid\", \"day\": \"2026-03-15\", \"cents\": 1990}]\n    assert daily_totals(orders) == [(\"London\", \"2026-03-14\", 2070), (\"Singapore\", \"2026-03-15\", 1990)]\n",
  "m14/inject.py": "\"\"\"Pass in what changes: the reader, the writer and the clock. The job does not know whether they are real.\"\"\"\nimport csv\nfrom datetime import datetime, timezone\n\n\ndef run_day(day, read, write, now):\n    \"\"\"Read the orders of a day, stamp them with the time of the run, and write them. Returns the number of rows written.\"\"\"\n    rows = [dict(row, loaded_at=now().isoformat()) for row in read(day)]\n    write(rows)\n    return len(rows)\n\n\n# 1. with fakes: no file, no database, and a clock that always says the same time\nwritten = []\nfake_now = lambda: datetime(2026, 3, 15, 2, 0, tzinfo=timezone.utc)\nn = run_day(\"2026-03-14\", read=lambda day: [{\"order_id\": \"O-1\"}, {\"order_id\": \"O-2\"}], write=written.extend, now=fake_now)\nprint(\"with fakes:\", n, \"rows, first one:\", written[0])\n\n\n# 2. with the real things: a CSV file, a list that stands for the table, and the real clock\ndef read_csv(day):\n    with open(\"orders.csv\") as f:\n        return [r for r in csv.DictReader(f) if r[\"ordered_at\"].startswith(day)]\n\n\ntable = []\nn = run_day(\"2026-03-14\", read=read_csv, write=table.extend, now=lambda: datetime.now(timezone.utc))\nprint(\"with the real reader:\", n, \"rows, ids\", [r[\"order_id\"] for r in table], \", loaded_at is set:\", all(r[\"loaded_at\"].endswith(\"+00:00\") for r in table))\n",
  "m14/steps.py": "\"\"\"Coding round: a pipeline as a list of named steps. The runner times each step, stops at the first failure and says which step failed.\"\"\"\n\n\ndef run_pipeline(steps, ctx, log, clock):\n    \"\"\"steps is a list of (name, function). Each function takes the result of the step before it (the first takes ctx) and returns its own result.\n    log(text) is called once for each step: \"step NAME: ok in X.X s\", or \"step NAME: FAILED after X.X s: ErrorName: message\" for the step that raised.\n    Stop at the first failure. Return 0 when every step worked and 1 when one failed. clock() returns the time in seconds.\"\"\"\n    for name, fn in steps:\n        start = clock()\n        try:\n            ctx = fn(ctx)\n        except Exception as err:\n            log(f\"step {name}: FAILED after {clock() - start:.1f} s: {type(err).__name__}: {err}\")\n            return 1\n        log(f\"step {name}: ok in {clock() - start:.1f} s\")\n    return 0\n\n\ndef fake_clock(*times):\n    it = iter(times)\n    return lambda: next(it)\n\n\ndef need_rows(rows):\n    if not rows:\n        raise ValueError(\"no rows to load\")\n    return rows\n\n\nlines = []\nsteps = [(\"extract\", lambda ctx: [1, 2, 3]), (\"validate\", need_rows), (\"load\", lambda rows: len(rows))]\ncode = run_pipeline(steps, None, lines.append, fake_clock(0.0, 0.4, 0.4, 0.5, 0.5, 2.0))\nassert code == 0 and lines == [\"step extract: ok in 0.4 s\", \"step validate: ok in 0.1 s\", \"step load: ok in 1.5 s\"], lines\nprint(\"all steps worked, exit code\", code, \"-\", lines)\n\nlines.clear()\nsteps = [(\"extract\", lambda ctx: []), (\"validate\", need_rows), (\"load\", lambda rows: len(rows))]\ncode = run_pipeline(steps, None, lines.append, fake_clock(0.0, 0.2, 0.2, 0.3, 9.9))\nassert code == 1 and lines == [\"step extract: ok in 0.2 s\", \"step validate: FAILED after 0.1 s: ValueError: no rows to load\"], lines\nprint(\"the second step failed, exit code\", code, \"-\", lines)\nassert not any(line.startswith(\"step load\") for line in lines)\nprint(\"the third step never ran\")\nprint(\"tests passed\")\n",
  "m14/pull_logic_out.py": "\"\"\"Coding round: pull the logic out of a function that reads a log file and sends an email.\"\"\"\n\n\ndef failures_by_job(lines):\n    \"\"\"Lines look like '2026-03-14T02:00:05Z ERROR load_orders rows=0'. Return {job: number of ERROR lines}, for jobs with at least one.\"\"\"\n    counts = {}\n    for line in lines:\n        parts = line.split()\n        if len(parts) >= 3 and parts[1] == \"ERROR\":\n            counts[parts[2]] = counts.get(parts[2], 0) + 1\n    return counts\n\n\ndef alert_text(counts, limit=3):\n    \"\"\"None when no job has more than `limit` errors. Otherwise one line for each job over the limit, the worst first, like 'load_orders: 5 errors'.\"\"\"\n    worst = sorted(((n, job) for job, n in counts.items() if n > limit), reverse=True)\n    if not worst:\n        return None\n    return \"\\n\".join(f\"{job}: {n} errors\" for n, job in worst)\n\n\nLOG = [\"2026-03-14T02:00:01Z INFO load_orders rows=1200\", \"2026-03-14T02:00:05Z ERROR load_orders rows=0\", \"2026-03-14T02:00:06Z ERROR load_orders rows=0\",\n       \"2026-03-14T02:00:07Z ERROR load_stores rows=0\", \"2026-03-14T02:00:08Z ERROR load_orders rows=0\", \"2026-03-14T02:00:09Z ERROR load_orders rows=0\",\n       \"2026-03-14T02:00:10Z WARN load_orders slow\", \"2026-03-14T02:01:00Z ERROR load_stores rows=0\", \"short line\"]\ncounts = failures_by_job(LOG)\nassert counts == {\"load_orders\": 4, \"load_stores\": 2}\nprint(\"errors by job:\", counts)\nassert alert_text(counts, limit=3) == \"load_orders: 4 errors\"\nprint(\"alert, limit 3:\", repr(alert_text(counts, limit=3)))\nassert alert_text(counts, limit=1) == \"load_orders: 4 errors\\nload_stores: 2 errors\"\nprint(\"alert, limit 1:\", repr(alert_text(counts, limit=1)))\nassert alert_text(counts, limit=10) is None and failures_by_job([]) == {}\nprint(\"quiet when under the limit:\", alert_text(counts, limit=10))\nprint(\"tests passed\")\n",
  "m15/pipeline_round.py": "\"\"\"Coding round: one day of a pipeline, from pages to a table, with a limit on bad rows. Everything that touches the outside world is passed in.\"\"\"\n\n\ndef run_day(pages, check, write, max_bad_share=0.1, batch_size=2):\n    \"\"\"pages is an iterator of lists of rows, like a cursor API. check(row) returns the cleaned row or raises ValueError(reason).\n    write(rows) writes one batch, and is safe to repeat. Return {\"read\": n, \"loaded\": n, \"quarantined\": [(line, reason)], \"batches\": n}.\n    Raise RuntimeError, before anything is written, when the share of bad rows is above max_bad_share. Line 1 is the header, so rows count from 2.\"\"\"\n    good, bad, line = [], [], 1\n    for page in pages:\n        for row in page:\n            line += 1\n            try:\n                good.append(check(row))\n            except ValueError as err:\n                bad.append((line, str(err)))\n    read = len(good) + len(bad)\n    if read and len(bad) / read > max_bad_share:\n        raise RuntimeError(f\"{len(bad)} of {read} rows are bad\")\n    batches = 0\n    for i in range(0, len(good), batch_size):\n        write(good[i:i + batch_size])\n        batches += 1\n    return {\"read\": read, \"loaded\": len(good), \"quarantined\": bad, \"batches\": batches}\n\n\ndef check(row):\n    if not str(row.get(\"qty\", \"\")).isdigit() or int(row[\"qty\"]) < 1:\n        raise ValueError(\"qty must be a whole number from 1\")\n    return {\"order_id\": row[\"order_id\"], \"qty\": int(row[\"qty\"])}\n\n\ndef pages_of(rows, size=3):\n    return iter([rows[i:i + size] for i in range(0, len(rows), size)])\n\n\nrows = [{\"order_id\": f\"O-{n}\", \"qty\": \"2\"} for n in range(1, 11)]\nrows[4][\"qty\"] = \"0\"\nwritten = []\nsummary = run_day(pages_of(rows), check, written.append, max_bad_share=0.2, batch_size=4)\nassert summary == {\"read\": 10, \"loaded\": 9, \"quarantined\": [(6, \"qty must be a whole number from 1\")], \"batches\": 3}\nassert [len(b) for b in written] == [4, 4, 1] and written[0][0] == {\"order_id\": \"O-1\", \"qty\": 2}\nprint(\"one bad row of 10 under a limit of 20 percent:\", summary[\"loaded\"], \"loaded in\", summary[\"batches\"], \"batches, quarantined\", summary[\"quarantined\"])\n\nwritten.clear()\nrows[7][\"qty\"] = \"x\"\nrows[8][\"qty\"] = \"\"\ntry:\n    run_day(pages_of(rows), check, written.append, max_bad_share=0.2)\n    raise AssertionError(\"3 bad rows of 10 must fail a 20 percent limit\")\nexcept RuntimeError as err:\n    print(\"three bad rows of 10:\", err, \"- batches written:\", len(written))\nassert written == []\n\nwritten.clear()\nassert run_day(iter([]), check, written.append) == {\"read\": 0, \"loaded\": 0, \"quarantined\": [], \"batches\": 0} and written == []\nprint(\"no pages:\", run_day(iter([]), check, written.append))\nprint(\"tests passed\")\n"
 },
 "text": {
  "m1/load_orders_v7.py#1": "loaded 6 rows\n(6, 6, 78.85)\n(1,)",
  "m1/load_orders_v7.py#2": "loaded 6 rows\n(12, 6, 157.7)\n(1,)",
  "m1/partial_failure.py#1": "stopped: could not convert string to float: 'n/a'\nloaded 2 of 4 rows before the stop\n[('O-1007',), ('O-1008',)]",
  "m1/partial_failure.py#2": "stopped: could not convert string to float: 'n/a'\nloaded 2 of 4 rows before the stop\n[('O-1007',), ('O-1007',), ('O-1008',), ('O-1008',)]",
  "m1/notebook_cells.py": "top to bottom (1, 2, 3):          13.63\ncell 2 pressed twice (1, 2, 2, 3): 27.25\ntax before the order (1, 3, 2):   12.5",
  "m1/load_orders_v8.py#1": "(6, 6, 7885)",
  "m1/load_orders_v8.py#2": "(6, 6, 7885)",
  "m1/versions.py": "3.14.6 CPython x86_64\npandas     3.1.1\npolars     2.1.0\npyarrow    26.0.1\nduckdb     2.0.0\nsqlalchemy 2.1.8\npydantic   2.14.3\npytest     9.2.0\nmypy       2.4.1\nruff       0.17.4",
  "m2/venv_session": "$ python -m venv .venv\n$ ls .venv\nbin\ninclude\nlib\nlib64\npyvenv.cfg\n$ grep -E \"^(include-system-site-packages|version) \" .venv/pyvenv.cfg\ninclude-system-site-packages = false\nversion = 3.14.6\n$ .venv/bin/python -c \"import sys; print(sys.prefix.endswith('.venv'), sys.prefix != sys.base_prefix)\"\nTrue True\n$ .venv/bin/python -c \"import pandas\"\nTraceback (most recent call last):\n  File \"<string>\", line 1, in <module>\n    import pandas\nModuleNotFoundError: No module named 'pandas'\n$ uv pip install --python .venv/bin/python \"pandas>=3,<4\"\nResolved 4 packages in 4ms\nInstalled 4 packages in 18ms\n + numpy==2.5.4\n + pandas==3.1.1\n + python-dateutil==4.0.0\n + tzdata==2026.6\n$ .venv/bin/python -c \"import pandas; print(pandas.__version__)\"\n3.1.1",
  "m2/uv_session": "$ uv init --package brewline-etl --python 3.14 --author-from none\nInitialized project `brewline-etl` at `/work/m2/uvproj/brewline-etl`\n$ cd brewline-etl && ls -A\n.git\n.gitignore\n.python-version\nREADME.md\npyproject.toml\nsrc\n$ cd brewline-etl && uv add requests \"pandas>=3,<4\"\nUsing CPython 3.14.6\nCreating virtual environment at: .venv\nResolved 10 packages in 6ms\n   Building brewline-etl @ file:///work/m2/uvproj/brewline-etl\n      Built brewline-etl @ file:///work/m2/uvproj/brewline-etl\nPrepared 1 package in 5ms\nInstalled 10 packages in 23ms\n + brewline-etl==0.1.0 (from file:///work/m2/uvproj/brewline-etl)\n + certifi==2026.10.23\n + charset-normalizer==3.5.2\n + idna==3.20\n + numpy==2.5.4\n + pandas==3.1.1\n + python-dateutil==4.0.0\n + requests==2.34.2\n + tzdata==2026.6\n + urllib3==2.8.0\n$ cd brewline-etl && uv tree --depth 1\nbrewline-etl v0.1.0\n├── pandas v3.1.1\n└── requests v2.34.2\nResolved 10 packages in 2ms\n$ cd brewline-etl && uv run python -c \"import requests, pandas; print(requests.__version__, pandas.__version__)\"\n2.34.2 3.1.1\n$ cd brewline-etl && uv add --dev pytest\nResolved 16 packages in 8ms\n   Building brewline-etl @ file:///work/m2/uvproj/brewline-etl\n      Built brewline-etl @ file:///work/m2/uvproj/brewline-etl\nPrepared 1 package in 3ms\nUninstalled 1 package in 0.93ms\nInstalled 6 packages in 4ms\n ~ brewline-etl==0.1.0 (from file:///work/m2/uvproj/brewline-etl)\n + iniconfig==2.3.1\n + packaging==26.3\n + pluggy==1.7.0\n + pygments==2.21.0\n + pytest==9.2.0",
  "m2/python-version": "3.14",
  "m2/lock_check": "$ uv lock --check\nResolved 17 packages in 7ms\nerror: The lockfile at `uv.lock` needs to be updated, but `--check` was provided.\n\nhint: To update the lockfile, run `uv lock`.\n$ uv sync --locked\nResolved 17 packages in 11ms\nerror: The lockfile at `uv.lock` needs to be updated, but `--locked` was provided.\n\nhint: To update the lockfile, run `uv lock`.\n$ uv lock\nResolved 17 packages in 11ms\nAdded tenacity v9.2.1\n$ uv sync --locked\nResolved 17 packages in 1ms\n   Building brewline-etl @ file:///work/m2/uvproj/brewline-etl\n      Built brewline-etl @ file:///work/m2/uvproj/brewline-etl\nPrepared 1 package in 4ms\nUninstalled 1 package in 1ms\nInstalled 2 packages in 3ms\n ~ brewline-etl==0.1.0 (from file:///work/m2/uvproj/brewline-etl)\n + tenacity==9.2.1",
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
  "m5/read_csv_safely.py": "rows: 3  columns: ['order_id', 'customer', 'note', 'total']\ncustomer of the first row: Ng, Mei\nnote of the second row: 'leave at door\\nring twice'\ntotal as money: 48.25",
  "m5/csv_traps.py": "bytes in the file: 122   lines: 5\n\nwith line.split(','):\n   4 fields: ['\\ufefforder_id', 'customer', 'note', 'total']\n   5 fields: ['O-1', '\"Ng', ' Mei\"', '\"extra shot\"']\n   3 fields: ['O-2', 'Ravi', '\"leave at door']\n   2 fields: ['ring twice\"', '4.75']\n   4 fields: ['O-3', 'Zoë', '', '31.00']\n\nwith the csv module:\n   {'\\ufefforder_id': 'O-1', 'customer': 'Ng, Mei', 'note': 'extra shot', 'total': '12.50'}\n   {'\\ufefforder_id': 'O-2', 'customer': 'Ravi', 'note': 'leave at door\\nring twice', 'total': '4.75'}\n   {'\\ufefforder_id': 'O-3', 'customer': 'Zoë', 'note': '', 'total': '31.00'}\n\nwith the csv module, and the byte order mark removed:\n   ['O-1', 'O-2', 'O-3'] total: 48.25",
  "m5/encodings.py": "'Zoe'\n   utf-8    3 bytes  5a 6f 65\n   latin-1  3 bytes  5a 6f 65\n   utf-16   8 bytes  ff fe 5a 00 6f 00 65 00\n'Zoë'\n   utf-8    4 bytes  5a 6f c3 ab\n   latin-1  3 bytes  5a 6f eb\n   utf-16   8 bytes  ff fe 5a 00 6f 00 eb 00\n'café'\n   utf-8    5 bytes  63 61 66 c3 a9\n   latin-1  4 bytes  63 61 66 e9\n   utf-16   10 bytes  ff fe 63 00 61 00 66 00 e9 00\n'東京'\n   utf-8    6 bytes  e6 9d b1 e4 ba ac\n   latin-1  cannot encode: ordinal not in range(256)\n   utf-16   6 bytes  ff fe 71 67 ac 4e\n\nthe bytes of 'café' in UTF-8, read as latin-1: cafÃ©\nthe bytes of 'café' in latin-1, read as UTF-8: UnicodeDecodeError: unexpected end of data at byte 3\nthe same bytes, errors='replace': caf�\na file saved with a byte order mark: '\\ufefforder_id' against 'order_id'",
  "m5/json_lines.py": "JSON array: 175 bytes.  JSON Lines: 170 bytes, one object per line\n\nthe array, cut at byte 118 :\n  JSONDecodeError: Expecting value (line 1, column 119)  ->  0 orders readable\n\nthe JSON Lines file, cut at byte 118 :\n  readable lines: 3   broken lines: 1 (the last one, cut in the middle)\n  the last bytes of the cut file: 'order_id\": \"O-'",
  "m5/atomic_write.py": "in place:    the job was killed -> the file now has 3 of 5 orders, and last night's file is gone\natomically:  the job was killed -> the file still has 1 order from last night, nothing half written\natomically, no failure: the file has 5 orders; [] temporary files are left",
  "m5/paths.py": "name: part-1.csv  stem: part-1  suffix: .csv  parent folder: dt=2026-03-14\nanother extension: part-1.parquet\nis a file: True  exists: False\n\nsorted as text:    ['part-1.csv', 'part-10.csv', 'part-2.csv']\nsorted by number:  ['part-1.csv', 'part-2.csv', 'part-10.csv']\nzero-padded names sort correctly as text: ['part-0001.csv', 'part-0002.csv', 'part-0010.csv']",
  "m5/parquet_tour.py": "rows: 200000  row groups: 4  columns: 5\norder_id: string\nstore: string\nstatus: string\ntotal: decimal128(10, 2)\nordered_at: timestamp[us]\n\nrow group  rows    first order_at        last order_at\n        0  50000   2026-03-01 00:00:05  2026-03-08 18:38:14\n        1  50000   2026-03-08 18:38:16  2026-03-16 13:01:20\n        2  50000   2026-03-16 13:01:22  2026-03-24 06:44:28\n        3  50000   2026-03-24 06:44:36  2026-03-31 23:59:56\n\nrows from 30 March on: the statistics select 1 of 4 row groups to read\none column only: 200000 values, without reading the other four",
  "m5/parse_log.py": "2026-03-14T02:00:01Z INFO load_orders  1200 340\n2026-03-14T02:00:05Z WARN load_orders  0 12\n2026-03-14T02:01:00Z INFO load_stores  40 8\nunparsable lines: 2\ntests passed",
  "m5/write_partitions.py": "dt=2026-03-14/part-0000.csv  3 rows\ndt=2026-03-15/part-0000.csv  2 rows\ntests passed",
  "m6/naive_aware.py": "naive: 2026-03-14T08:15:00  tzinfo: None\naware: 2026-03-14T08:15:00+00:00  tzinfo: UTC\ncomparing them: can't compare offset-naive and offset-aware datetimes\nnaive == aware: False   (== never raises, < does)\n16:15 in Singapore is the same moment as 08:15 UTC: True\nconverted to UTC: 2026-03-14T08:15:00+00:00\nutcnow() returns a naive value: True\nand warns: DeprecationWarning - datetime.datetime.utcnow() is deprecated and scheduled for removal in a future\nthe replacement: UTC",
  "m6/iso_parse.py": "2026-03-14T08:15:00Z         -> 2026-03-14T08:15:00+00:00    aware: True\n2026-03-14T16:15:00+08:00    -> 2026-03-14T16:15:00+08:00    aware: True\n2026-03-14 08:15:00          -> 2026-03-14T08:15:00          aware: False\n2026-03-14                   -> 2026-03-14T00:00:00          aware: False\n\nstrptime, with an offset: 2026-03-14T16:15:00+08:00\n\nepoch seconds:      2026-03-14T08:15:00+00:00\nepoch milliseconds: ValueError: year must be in 1..9999, not 58169\ndivide by 1000 first: 2026-03-14T08:15:00+00:00",
  "m6/zoneinfo_dst.py": "database: # version 2026e\n\nEurope/London     2026-03-29 01:30  does not exist\n    fold=0: offset +00:00  utc 2026-03-29 01:30\n    fold=1: offset +01:00  utc 2026-03-29 00:30\nEurope/London     2026-10-25 01:30  ambiguous\n    fold=0: offset +01:00  utc 2026-10-25 00:30\n    fold=1: offset +00:00  utc 2026-10-25 01:30\nAmerica/New_York  2026-03-08 02:30  does not exist\n    fold=0: offset -05:00  utc 2026-03-08 07:30\n    fold=1: offset -04:00  utc 2026-03-08 06:30\nAmerica/New_York  2026-11-01 01:30  ambiguous\n    fold=0: offset -04:00  utc 2026-11-01 05:30\n    fold=1: offset -05:00  utc 2026-11-01 06:30\nAsia/Singapore    2026-03-29 01:30  exists once\n    fold=0: offset +08:00  utc 2026-03-28 17:30\n    fold=1: offset +08:00  utc 2026-03-28 17:30",
  "m6/day_buckets.py": "orders per day by the UTC date:        {'2026-03-14': 4, '2026-03-15': 1}\norders per day by Singapore's date:    {'2026-03-14': 2, '2026-03-15': 3}\n\nLondon, 29 March 2026: from 2026-03-29T00:00:00+00:00 to 2026-03-30T00:00:00+01:00\nsubtracting the two aware values:      1 day, 0:00:00\nthe same two moments in UTC:           23:00:00",
  "m6/money.py": "0.1 + 0.2 = 0.30000000000000004\n0.1 + 0.2 == 0.3: False\nthe float 0.1 is really: 0.1000000000000000055511151231257827021181583404541015625\nthe Decimal from text:    0.1\n\nadding 0.10 1,000,000 times:\n  float, a loop:       100000.00000133288\n  math.fsum:           100000.0\n  Decimal:             100000.00\n  whole cents (int):   100000.0\n\nrounding a half to 2 places:\n  round(2.675, 2): 2.67   (the float is a little below 2.675)\n  Decimal('2.675'), ROUND_HALF_EVEN 2.68\n  Decimal('2.675'), ROUND_HALF_UP   2.68\n  Decimal('2.675'), ROUND_DOWN      2.67\n  round(2.5): 2   round(3.5): 4   (halves go to the even number)",
  "m6/normalize_timestamps.py": "2026-03-14T08:15:00Z         -> 2026-03-14T08:15:00Z\n2026-03-14T16:15:00+08:00    -> 2026-03-14T08:15:00Z\n2026-03-14 16:15:00          -> 2026-03-14T08:15:00Z\n1773476100                   -> 2026-03-14T08:15:00Z\ntests passed",
  "m6/local_days.py": "London:    {'2026-03-28': 1, '2026-03-29': 2, '2026-03-30': 1}\nSingapore: {'2026-03-29': 2, '2026-03-30': 2}\nhours in 2026-03-28 in London: 24\nhours in 2026-03-29 in London: 23\nhours in 2026-10-25 in London: 25\ntests passed",
  "m7/exceptions_tour.py": "a good value:\n  parsing '12.50'\n  else: no error, so this runs\n  finally: this runs either way\n  result: 12.5\na bad value:\n  parsing '12,50'\n  finally: this runs either way\n  caught: order total '12,50' is not a number\n  the cause: ValueError(\"could not convert string to float: '12,50'\")\na value of the wrong type:\n  parsing None\n  finally: this runs either way\n  the ValueError handler did not catch it, the caller did: TypeError",
  "m7/raise_from.py": "1250\nTraceback (most recent call last):\n  File \"raise_from.py\", line 6, in to_cents\n    return round(float(text) * 100)\n                 ~~~~~^^^^^^\nValueError: could not convert string to float: '12,50'\n\nThe above exception was the direct cause of the following exception:\n\nTraceback (most recent call last):\n  File \"raise_from.py\", line 12, in <module>\n    print(to_cents(\"12,50\"))\n          ~~~~~~~~^^^^^^^^^\n  File \"raise_from.py\", line 8, in to_cents\n    raise ValueError(f\"order total {text!r} is not a number\") from err\nValueError: order total '12,50' is not a number",
  "m7/swallowed.py": "loaded 4 of 6 rows\nstatus: success",
  "m7/fail_loud.py": "loaded 4 of 6 rows\n  rejected O-3: could not convert string to float: '8,20'\n  rejected O-5: could not convert string to float: ''\nstatus: failed, 2 of 6 rows rejected (limit 5%)",
  "m7/retry_backoff.py": "an API that fails 3 times, then works:\n  attempt 1 failed (503 from the API); waiting 0.16 s\n  attempt 2 failed (503 from the API); waiting 0.15 s\n  attempt 3 failed (503 from the API); waiting 1.30 s\n  result: orders page 1 after 4 calls\n  total wait: 1.61 s (a fake clock, so nothing really waited)\nan API that fails every time:\n  attempt 1 failed (503 from the API); waiting 0.16 s\n  attempt 2 failed (503 from the API); waiting 0.15 s\n  attempt 3 failed (503 from the API); waiting 1.30 s\n  attempt 4 failed (503 from the API); waiting 0.29 s\n  gave up after 5 calls with: 503 from the API\nthe most a wait can last, by attempt: [0.5, 1.0, 2.0, 4.0, 8.0]",
  "m7/tenacity_retry.py": "WARNING Retrying __main__.fetch_page in 0.00238 seconds as it raised Transient: 429 Too Many Requests.\nWARNING Retrying __main__.fetch_page in 0.0109 seconds as it raised Transient: 429 Too Many Requests.\nresult: page 1 after 3 calls\na ValueError is not in the retry list, so it stopped after 1 call: 400 Bad Request",
  "m7/load_strategies.py": "run once\n  append                                   6 rows,   82.75  right\n  insert with a key                        6 rows,   82.75  right\n  delete, then insert                      6 rows,   82.75  right\n  delete, then insert, in a transaction    6 rows,   82.75  right\n  upsert                                   6 rows,   82.75  right\nrun twice\n  append                                   12 rows,  165.50  WRONG\n  insert with a key                        6 rows,   82.75  right\n  delete, then insert                      6 rows,   82.75  right\n  delete, then insert, in a transaction    6 rows,   82.75  right\n  upsert                                   6 rows,   82.75  right\ncrash, then run again\n  append                                   9 rows,  108.20  WRONG\n  insert with a key                        3 rows,   25.45  WRONG\n  delete, then insert                      6 rows,   82.75  right\n  delete, then insert, in a transaction    6 rows,   82.75  right\n  upsert                                   6 rows,   82.75  right\nthe source corrects O-3\n  append                                   12 rows,  166.50  WRONG\n  insert with a key                        6 rows,   82.75  WRONG\n  delete, then insert                      6 rows,   83.75  right\n  delete, then insert, in a transaction    6 rows,   83.75  right\n  upsert                                   6 rows,   83.75  right\nthe source drops O-6\n  append                                   11 rows,  159.10  WRONG\n  insert with a key                        6 rows,   82.75  WRONG\n  delete, then insert                      5 rows,   76.35  right\n  delete, then insert, in a transaction    5 rows,   76.35  right\n  upsert                                   6 rows,   82.75  WRONG",
  "m7/watermark.py": "1. the watermark is saved first, then the job dies\n   run 1: the job died before writing | watermark is now 2026-03-14 08:10\n   run 2 reads 0 rows; the target has 0 of 3\n2. the watermark is saved after the rows are written\n   run 1: the job died before writing | watermark is still 2026-03-14 00:00\n   run 2 reads 3 rows; the target has 3 of 3\n3. a row arrives late: a slow writer commits updated_at 08:07 after the load has passed 08:10\n   overlap  0 min: run 2 reads 1 row; the target has 3 of 4\n   overlap 15 min: run 2 reads 4 rows; the target has 4 of 4",
  "m7/idempotent_load.py": "Monday and Tuesday loaded: 5 rows\nTuesday loaded again: 5 rows, the same table\na run that fails halfway: NOT NULL constraint failed: orders.total_cents\nafter the failed run: 5 rows, the same table\na corrected Tuesday: 4 rows, Monday untouched\ntests passed",
  "m7/call_with_retry.py": "fails twice, then works: 3 calls, waits [0.16, 0.15]\na ValueError is not retried: 1 call, no waits\nalways fails: gave up after 4 calls, with the last error\nthe longest waits, with the cap at 8 s: [0.5, 1.0, 2.0, 4.0, 8.0, 8.0, 8.0]\ntests passed",
  "m7/exit_codes": "$ python swallowed.py; echo \"exit code: $?\"\nloaded 4 of 6 rows\nstatus: success\nexit code: 0\n$ python fail_loud.py; echo \"exit code: $?\"\nloaded 4 of 6 rows\n  rejected O-3: could not convert string to float: '8,20'\n  rejected O-5: could not convert string to float: ''\nstatus: failed, 2 of 6 rows rejected (limit 5%)\nexit code: 1",
  "m8/api_basics.py": "200 application/json\nkeys: ['items', 'page'] ids: ['O-122', 'O-121', 'O-120']\n404 Not Found {'error': 'no such order'}\nraise_for_status: 404 Client Error: Not Found for url: http://127.0.0.1:PORT/orders/O-999\ntimeout: ReadTimeout",
  "m8/paginate.py": "style   while we read                  rows  unique  repeated  missed\noffset  nothing changes                  23      23         0       0\noffset  3 new orders arrive              26      23         3       0\noffset  3 newest are cancelled           20      20         0       3\ncursor  nothing changes                  23      23         0       0\ncursor  3 new orders arrive              26      26         0       0\ncursor  3 newest are cancelled           20      20         0       0",
  "m8/rate_limit.py": "call 1: ok in 0 s\ncall 2: ok in 0 s\ncall 3: ok in 0 s\n    429 Too Many Requests, Retry-After: 1, so wait 1 s\ncall 4: ok in 1 s\ncall 5: ok in 0 s\ncall 6: ok in 0 s",
  "m8/fetch_all.py": "a quiet API: 23 orders, from O-100 to O-122\n3 orders arrive while reading: 26 orders, none twice\none 429 with Retry-After 2: waited [2.0] then read 23 orders\na 404 raises: 404\ntests passed",
  "m8/sql_params.py": "  sql: SELECT name, city FROM customers WHERE name = 'Ana Tan'\na normal name, with an f-string: [('Ana Tan', 'Singapore')]\na name with an apostrophe:\n  sql: SELECT name, city FROM customers WHERE name = 'Conan O'Brien'\n  error: near \"Brien\": syntax error\na name that changes the query:\n  sql: SELECT name, city FROM customers WHERE name = 'x' OR '1'='1'\n  rows returned: 3 of 3\nthe same two names, with a parameter:\n  Conan O'Brien -> []\n  x' OR '1'='1 -> []",
  "m8/transactions.py": "start: {'London': 10, 'Singapore': 40}\nmove 5 kg, London to Singapore, with a transaction (London has 10):\n  now: {'London': 5, 'Singapore': 45}\nmove 30 kg, London to Singapore, with a transaction (London only has 5 left):\n  error: CHECK constraint failed: beans_kg >= 0\n  now: {'London': 5, 'Singapore': 45}\nthe same move, with each update committed on its own:\n  error: CHECK constraint failed: beans_kg >= 0\n  now: {'London': 5, 'Singapore': 75} -> total 80 kg, and it was 50",
  "m8/sqlalchemy_core.py": "rows: [{'store': 'London', 'cents': 1250}, {'store': 'Singapore', 'cents': 820}]\ncolumn names: ['store', 'cents']\nsqlalchemy 2.1.8",
  "m8/upsert_batches.py": "2,500 rows in batches of 1,000: 3 batches, 2500 rows\nrun again: 2500 rows, the same total\none changed row: updated in place, still 2500 rows\na bad row in the second batch: NOT NULL constraint failed: orders.store\ntests passed",
  "m8/batch_insert.py": "method                                  seconds   rows per second\ncommit for every row                      4.700             1,064\none transaction, execute in a loop        0.009           586,396\none transaction, executemany              0.006           868,926\nexecutemany, commit every 1,000           0.012           427,005",
  "m9/nulls_and_types.py": "pandas  dtypes: {'order_id': 'str', 'total': 'float64', 'store': 'str'}\npandas  rows: 4  count of total: 2  sum: 20.7  mean: 10.35\npandas  nan == nan: False  isna: [False, True, False, True]\npandas  rows per store: {'London': 2, 'Singapore': 1} (the missing store is dropped)\npandas  with dropna=False: {'London': 2, 'Singapore': 1, nan: 1}\npolars  dtypes: {'order_id': 'String', 'total': 'Float64', 'store': 'String'}\npolars  rows: 4  count of total: 2  null_count: 2  sum: 20.7  mean: 10.35\npolars  rows per store: {'London': 2, 'Singapore': 1, None: 1}\nduckdb  rows per store: {'London': 2, 'Singapore': 1, None: 1}\nduckdb  count(*), count(total), sum, avg: (4, 2, 20.7, 10.35)",
  "m9/merge_fanout.py": "orders: 6 rows, total 8275 cents\npandas  left join: 8 rows, total 10905 cents\npolars  left join: 8 rows, total 10905 cents\nduckdb  left join: 8 rows, total 10905 cents\nwho is repeated: ['O-4', 'O-4', 'O-6', 'O-6']\npandas  validate m:1 -> MergeError: Merge keys are not unique in right dataset; not a many-to-one merge\n\nDuplicates in right:\n  customer_id\n           3 ...\npolars  validate m:1 -> ComputeError: join keys did not fulfill m:1 validation\nduckdb  has no validate. Check the key yourself: [(3, 2)]\nafter drop_duplicates and validate m:1: 6 rows, total 8275 cents",
  "m9/safe_join.py": "a clean join: 4 rows, total 4535 cents\nan order with no customer is kept: O-4 with a missing city\na repeated key raises: customers has more than one row for customer_id [3]\ntests passed",
  "m9/latest_per_order.py": "latest status of each order: [('O-1', 'refunded'), ('O-2', 'paid'), ('O-3', 'placed')]\nno rows: []\none row: 1 row\ntests passed",
  "m9/three_engines.py": "same answer from all three: True\n  Paris       150,613 paid orders  3,235,372.73\n  Tokyo       150,288 paid orders  3,233,056.35\n  Dubai       150,263 paid orders  3,227,403.79",
  "m9/lazy_polars.py": "SORT BY [descending: [true]] [col(\"cents\")]\n  AGGREGATE[maintain_order: false]\n    [col(\"total_cents\").sum().alias(\"cents\")] BY [col(\"store\")]\n    FROM\n    simple π 2/2 [\"store\", \"total_cents\"]\n      Parquet SCAN [orders.parquet]\n      PROJECT 3/4 COLUMNS\n      SELECTION: col(\"status\") == \"paid\"\n      ESTIMATED ROWS: 2000000",
  "m10/profile_first.py": "         40002 function calls in 0.495 seconds\n\n   Ordered by: internal time\n   List reduced from 4 to 3 due to restriction <3>\n\n   ncalls  tottime  percall  cumtime  percall filename:lineno(function)\n    20000    0.481    0.000    0.481    0.000 profile_first.py:11(is_known)\n        1    0.011    0.011    0.495    0.495 profile_first.py:15(report)\n    20000    0.004    0.000    0.004    0.000 {method 'get' of 'dict' objects}\n\n\nknown is a list: 0.551 s\nknown is a set:  0.0020 s",
  "m10/vectorize.py": "method                        milliseconds\nfor loop                              27.0\nlist comprehension and sum            38.6\nnumpy: (arr * 2).sum()                 1.0\npandas: (s * 2).sum()                  1.4",
  "m10/pandas_memory.py": "column       default type       MB   smaller type       MB\norder_id     int64             8.0   int32             4.0\nstore        str              13.9   category          1.0\nstatus       str              15.0   category          1.0\nqty          int64             8.0   int8              1.0\ntotal_cents  int64             8.0   int32             4.0\ntotal                         52.9                    11.0\nsame sums and values after the change",
  "m10/threaded_fetch.py": "20 calls of 0.1 s with 10 workers: finished in under a second - 20 results\norder kept: ('ok', '/ORDERS/0') ('ok', '/ORDERS/19')\none failure kept, the other 19 worked: ('error', 'TimeoutError: read timed out')\nno urls: []\ntests passed",
  "m10/concurrency.py": "GIL enabled: True, cores: 4\neight jobs that wait 0.25 s\n  one after another     2.00 s\n  8 threads             0.25 s\n  4 processes           0.53 s\n  asyncio               0.25 s\neight jobs that compute\n  one after another     4.35 s\n  8 threads             3.95 s\n  4 processes           1.86 s",
  "m10/concurrency.py@free": "GIL enabled: False, cores: 4\neight jobs that wait 0.25 s\n  one after another     2.00 s\n  8 threads             0.25 s\n  4 processes           0.57 s\n  asyncio               0.25 s\neight jobs that compute\n  one after another     3.61 s\n  8 threads             1.28 s\n  4 processes           1.33 s",
  "m11/type_hints.py": "the hint says int, and we got: '12.5012.5012.50'\na dataclass accepts anything: Order(order_id=17, total_cents='12.50')\nthe types of the fields: int str",
  "m11/dataclass_vs_pydantic.py": "a row of text, converted: 2 1250 2026-03-14T08:15:00\n5 errors:\n  order_id     string_pattern_mismatch         String should match pattern '^O-\\d+$'\n  store        literal_error                   Input should be 'London' or 'Singapore'\n  qty          greater_than_equal              Input should be greater than or equal to 1\n  total_cents  int_parsing                     Input should be a valid integer, unable to parse string as an integer\n  ordered_at   datetime_from_date_parsing      Input should be a valid datetime or date, input is too short\nstrict mode on text from a CSV: 3 errors, the first is qty -> Input should be a valid integer",
  "m11/validate_or_quarantine.py": "read 10 rows: 6 good, 4 in quarantine\n  line  4 O-3   store: Input should be 'London' or 'Singapore'\n  line  6 O-5   total_cents: Input should be a valid integer, unable to parse string as an integer\n  line  8 O-7   qty: Input should be greater than or equal to 1\n  line 10 O-8   order_id: already seen in this file\nstatus: loaded 6 rows, 40% in quarantine (limit 50%)",
  "m11/split_valid.py": "8 good rows, cleaned: {'order_id': 'O-1', 'qty': 2, 'total_cents': 1250}\nquarantined: [(3, 'qty must be at least 1'), (4, 'qty and total_cents must be whole numbers')]\nover the limit: 2 of 10 rows are bad\nno rows: ([], [])\ntests passed",
  "m11/contract_check.py": "the contract and a clean file: []\na renamed column: [('missing', 'total_cents'), ('new', 'total')]\nvalues of another type: [('type', 'qty', 'int', 'str'), ('type', 'total_cents', 'int', 'float')]\na new column: [('new', 'coupon')]\ntests passed",
  "m11/mypy": "$ mypy bad_types.py\nbad_types.py:5: error: Incompatible return value type (got \"float\", expected \"int\")  [return-value]\nbad_types.py:9: error: Incompatible return value type (got \"str | None\", expected \"str\")  [return-value]\nbad_types.py:16: error: Argument 1 to \"load\" has incompatible type \"int\"; expected \"str\"  [arg-type]\nbad_types.py:16: error: Argument 2 to \"load\" has incompatible type \"str\"; expected \"int\"  [arg-type]\nFound 4 errors in 1 file (checked 1 source file)",
  "m12/pytest_weak": "$ pytest -q test_weak.py\n....                                                                                         [100%]\n4 passed in 0.44s",
  "m12/pytest_failing": "$ pytest -q test_failing.py\nF                                                                                            [100%]\n============================================= FAILURES =============================================\n_____________________________________ test_to_cents_of_a_price _____________________________________\n\n    def test_to_cents_of_a_price():\n>       assert to_cents(\"12.50\") == 125\nE       AssertionError: assert 1250 == 125\nE        +  where 1250 = to_cents('12.50')\n\ntest_failing.py:5: AssertionError\n===================================== short test summary info ======================================\nFAILED test_failing.py::test_to_cents_of_a_price - AssertionError: assert 1250 == 125\n1 failed in 0.40s",
  "m12/pytest_strong": "$ pytest -q test_strong.py\n..................                                                                           [100%]\n18 passed in 0.45s",
  "m12/coverage_weak": "$ pytest -q --cov=orders --cov-report=term-missing test_weak.py\n....                                                                                         [100%]\n========================================== tests coverage ==========================================\n_________________________ coverage: platform linux, python 3.14.6-final-0 __________________________\n\nName        Stmts   Miss  Cover   Missing\n-----------------------------------------\norders.py      18      0   100%\n-----------------------------------------\nTOTAL          18      0   100%\n4 passed in 0.45s",
  "m12/coverage_strong": "$ pytest -q --cov=orders --cov-report=term-missing test_strong.py\n..................                                                                           [100%]\n========================================== tests coverage ==========================================\n_________________________ coverage: platform linux, python 3.14.6-final-0 __________________________\n\nName        Stmts   Miss  Cover   Missing\n-----------------------------------------\norders.py      18      0   100%\n-----------------------------------------\nTOTAL          18      0   100%\n18 passed in 0.45s",
  "m12/hypothesis": "$ pytest -q hypothesis_demo.py\nF.                                                                                           [100%]\n============================================= FAILURES =============================================\n______________________________ test_dedupe_keeps_the_first_seen_order ______________________________\n\n    @settings(derandomize=True, max_examples=200)\n>   @given(st.lists(st.integers(-5, 5)))\n                   ^^^\n\nhypothesis_demo.py:14:\n_ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _\n\nxs = [0, -1]\n\n    @settings(derandomize=True, max_examples=200)\n    @given(st.lists(st.integers(-5, 5)))\n    def test_dedupe_keeps_the_first_seen_order(xs):\n        first_seen = [x for i, x in enumerate(xs) if x not in xs[:i]]\n>       assert dedupe_keep_order(xs) == first_seen\nE       assert [-1, 0] == [0, -1]\nE\nE         At index 0 diff: -1 != 0\nE         Use -v to get more diff\nE       Failing test case: test_dedupe_keeps_the_first_seen_order(\nE           xs=[0, -1],\nE       )\n\nhypothesis_demo.py:17: AssertionError\n===================================== short test summary info ======================================\nFAILED hypothesis_demo.py::test_dedupe_keeps_the_first_seen_order - assert [-1, 0] == [0, -1]\n1 failed, 1 passed in 0.63s",
  "m12/ruff": "$ ruff check --select E,F,B --output-format=concise bad_style.py\nbad_style.py:1:1: E401 [*] Multiple imports on one line\nbad_style.py:1:8: F401 [*] `os` imported but unused\nbad_style.py:1:12: F401 [*] `sys` imported but unused\nbad_style.py:2:1: F403 `from decimal import *` used; unable to detect undefined names\nbad_style.py:5:21: B006 Do not use mutable data structures for argument defaults\nbad_style.py:7:17: E711 Comparison to `None` should be `cond is None`\nbad_style.py:11:9: E722 Do not use bare `except`\nFound 7 errors.\n[*] 3 fixable with `--fix` (2 unsafe fixes available with `--fix --unsafe-fixes`).",
  "m12/run_mutants.py": "test_weak.py: 4 of 7 mutants caught\n  survived: is_large: >= becomes >\n  survived: discount: qty >= 10 becomes > 10\n  survived: discount: the cap 5,000 becomes 50,000\ntest_strong.py: 7 of 7 mutants caught",
  "m12/logging_basics.py": "{\"level\": \"INFO\", \"logger\": \"brewline.load\", \"message\": \"extract finished\", \"run_id\": \"2026-03-14\", \"rows\": 1200, \"seconds\": 4}\n{\"level\": \"WARNING\", \"logger\": \"brewline.load\", \"message\": \"rows rejected\", \"run_id\": \"2026-03-14\", \"rejected\": 3, \"share\": 0.0025}\n{\"level\": \"ERROR\", \"logger\": \"brewline.load\", \"message\": \"load failed\", \"run_id\": \"2026-03-14\", \"error\": \"ValueError: invalid literal for int() with base 10: '12,50'\"}",
  "m12/parse_amount.py": "amounts read: 6 of 6 - ['12.50', '7.00', '1250.00'] ...\namounts refused: 7 of 7 - ['12,50', '1.234', 'abc', ''] ...\nthe type is Decimal, never float: Decimal('12.50')\ntests passed",
  "m13/config_precedence.py": "defaults only:\n  api_url    https://api.brewline.example/orders       from the default\n  batch_size 1000                                      from the default\n  dry_run    False                                     from the default\nwith a config file:\n  api_url    https://staging.brewline.example/orders   from the config file\n  batch_size 500                                       from the config file\n  dry_run    False                                     from the default\nand an environment variable:\n  api_url    https://staging.brewline.example/orders   from the config file\n  batch_size 200                                       from the environment\n  dry_run    False                                     from the default\nand command line flags:\n  api_url    https://staging.brewline.example/orders   from the config file\n  batch_size 50                                        from the command line\n  dry_run    True                                      from the command line\na setting that does not exist:\n  KeyError: \"unknown setting 'batchsize' in the command line\"\nthe token is read from the environment: 18 characters, never printed\nwithout it: BREWLINE_API_TOKEN is not set. Export it, or run with --dry-run.",
  "m13/cli": "$ python load_orders.py --help\n\n Usage: load_orders.py [OPTIONS] {source}\n\n╭─ Arguments ──────────────────────────────────────────────────────────────────────────────────────╮\n│ *    source      <file>  The CSV file of orders. [required]                                      │\n╰──────────────────────────────────────────────────────────────────────────────────────────────────╯\n╭─ Options ────────────────────────────────────────────────────────────────────────────────────────╮\n│ *  --day                           <date>              The business day, as YYYY-MM-DD.          │\n│                                                        [required]                                │\n│    --batch-size                    <int range> [x>=1]  Rows for each commit. [default: 1000]     │\n│    --dry-run       --no-dry-run    <bool>              Check the file and print the plan. Write  │\n│                                                        nothing.                                  │\n│                                                        [default: no-dry-run]                     │\n│    --help                          <bool>              Show this message and exit.               │\n╰──────────────────────────────────────────────────────────────────────────────────────────────────╯\n$ python load_orders.py orders.csv --day 2026-03-14 --dry-run 2>&1; echo \"exit code: $?\"\ndry run: would load 3 rows from orders.csv for 2026-03-14, in batches of 1000\nexit code: 0\n$ python load_orders.py orders.csv --day 2026-03-14 2>&1; echo \"exit code: $?\"\nloaded 3 rows from orders.csv for 2026-03-14, in batches of 1000\nexit code: 0\n$ python load_orders.py orders.csv --day 14-03-2026 2>&1; echo \"exit code: $?\"\nUsage: load_orders.py [OPTIONS] {source}\nTry 'load_orders.py --help' for help.\n╭─ Error ──────────────────────────────────────────────────────────────────────────────────────────╮\n│ Invalid value for '--day': Input should be a valid date or datetime, invalid character in year   │\n╰──────────────────────────────────────────────────────────────────────────────────────────────────╯\nexit code: 2\n$ python load_orders.py missing.csv --day 2026-03-14 2>&1; echo \"exit code: $?\"\nUsage: load_orders.py [OPTIONS] {source}\nTry 'load_orders.py --help' for help.\n╭─ Error ──────────────────────────────────────────────────────────────────────────────────────────╮\n│ Invalid value for 'source': file 'missing.csv' does not exist.                                   │\n╰──────────────────────────────────────────────────────────────────────────────────────────────────╯\nexit code: 2\n$ python load_orders.py empty.csv --day 2026-03-14 2>&1; echo \"exit code: $?\"\nthe file has no rows\nexit code: 1",
  "m13/checks": "$ ruff check .\nAll checks passed!\n$ mypy src\nSuccess: no issues found in 2 source files\n$ pytest -q\n...                                                                                          [100%]\n3 passed in 0.78s",
  "m13/build": "$ uv build\nBuilding source distribution...\nBuilding wheel from source distribution...\nSuccessfully built dist/brewline_loader-0.1.0.tar.gz\nSuccessfully built dist/brewline_loader-0.1.0-py3-none-any.whl\n$ python -m zipfile -l dist/brewline_loader-0.1.0-py3-none-any.whl\nFile Name                                             Modified             Size\nbrewline_loader/__init__.py                    2020-02-02 00:00:00           61\nbrewline_loader/cli.py                         2020-02-02 00:00:00         1136\nbrewline_loader-0.1.0.dist-info/METADATA       2020-02-02 00:00:00          151\nbrewline_loader-0.1.0.dist-info/WHEEL          2020-02-02 00:00:00           87\nbrewline_loader-0.1.0.dist-info/entry_points.txt 2020-02-02 00:00:00           58\nbrewline_loader-0.1.0.dist-info/RECORD         2020-02-02 00:00:00          493\n$ uv venv --quiet .demo\n$ uv pip install --quiet --python .demo/bin/python dist/brewline_loader-0.1.0-py3-none-any.whl\n$ .demo/bin/brewline-load --help\n\n Usage: brewline-load [OPTIONS] {source}\n\n╭─ Arguments ──────────────────────────────────────────────────────────────────────────────────────╮\n│ *    source      <file>  The CSV file of orders. [required]                                      │\n╰──────────────────────────────────────────────────────────────────────────────────────────────────╯\n╭─ Options ────────────────────────────────────────────────────────────────────────────────────────╮\n│ *  --day                           <date>              The business day, as YYYY-MM-DD.          │\n│                                                        [required]                                │\n│    --batch-size                    <int range> [x>=1]  Rows for each commit. [default: 1000]     │\n│    --dry-run       --no-dry-run    <bool>              Check the file and print the plan. Write  │\n│                                                        nothing.                                  │\n│                                                        [default: no-dry-run]                     │\n│    --help                          <bool>              Show this message and exit.               │\n╰──────────────────────────────────────────────────────────────────────────────────────────────────╯",
  "m14/pytest_tangled": "$ pytest -q test_tangled.py\n.                                                                                            [100%]\n1 passed in 0.45s",
  "m14/pytest_core": "$ pytest -q test_core.py\n...                                                                                          [100%]\n3 passed in 0.48s",
  "m14/shell": "$ python shell.py orders.csv out.db\nwrote 2 rows to out.db\n$ python -c \"import sqlite3; print(sqlite3.connect('out.db').execute('SELECT * FROM daily ORDER BY store, day').fetchall())\"\n[('London', '2026-03-14', 2070), ('Singapore', '2026-03-15', 1990)]",
  "m14/inject.py": "with fakes: 2 rows, first one: {'order_id': 'O-1', 'loaded_at': '2026-03-15T02:00:00+00:00'}\nwith the real reader: 3 rows, ids ['O-1', 'O-2', 'O-3'] , loaded_at is set: True",
  "m14/steps.py": "all steps worked, exit code 0 - ['step extract: ok in 0.4 s', 'step validate: ok in 0.1 s', 'step load: ok in 1.5 s']\nthe second step failed, exit code 1 - ['step extract: ok in 0.2 s', 'step validate: FAILED after 0.1 s: ValueError: no rows to load']\nthe third step never ran\ntests passed",
  "m14/pull_logic_out.py": "errors by job: {'load_orders': 4, 'load_stores': 2}\nalert, limit 3: 'load_orders: 4 errors'\nalert, limit 1: 'load_orders: 4 errors\\nload_stores: 2 errors'\nquiet when under the limit: None\ntests passed",
  "m15/pipeline_round.py": "one bad row of 10 under a limit of 20 percent: 9 loaded in 3 batches, quarantined [(6, 'qty must be a whole number from 1')]\nthree bad rows of 10: 3 of 10 rows are bad - batches written: 0\nno pages: {'read': 0, 'loaded': 0, 'quarantined': [], 'batches': 0}\ntests passed"
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
     54043277,
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
   "m1/load_orders_v7.py#1": 0,
   "m1/load_orders_v7.py#2": 0,
   "m1/partial_failure.py#1": 0,
   "m1/partial_failure.py#2": 0,
   "m1/notebook_cells.py": 0,
   "m1/load_orders_v8.py#1": 0,
   "m1/load_orders_v8.py#2": 0,
   "m1/versions.py": 0,
   "m2/venv_session|ls .venv": 0,
   "m2/venv_session|grep -E \"^(include-system-site-packages|version) \" .venv/pyvenv.cfg": 0,
   "m2/venv_session|.venv/bin/python -c \"import sys; print(sys.prefix.endswith('.venv'), sys.prefix != sys.base_prefix)\"": 0,
   "m2/venv_session|.venv/bin/python -c \"import pandas\"": 1,
   "m2/venv_session|uv pip install --python .venv/bin/python \"pandas>=3,<4\"": 0,
   "m2/venv_session|.venv/bin/python -c \"import pandas; print(pandas.__version__)\"": 0,
   "m2/uv_session|uv init --package brewline-etl --python 3.14 --author-from none": 0,
   "m2/uv_session|cd brewline-etl && ls -A": 0,
   "m2/uv_session|cd brewline-etl && uv add requests \"pandas>=3,<4\"": 0,
   "m2/uv_session|cd brewline-etl && uv tree --depth 1": 0,
   "m2/uv_session|cd brewline-etl && uv run python -c \"import requests, pandas; print(requests.__version__, pandas.__version__)\"": 0,
   "m2/uv_session|cd brewline-etl && uv add --dev pytest": 0,
   "m2/lock_check|uv lock --check": 1,
   "m2/lock_check|uv sync --locked": 0,
   "m2/lock_check|uv lock": 0,
   "m2/pandas_versions.py@old": 0,
   "m2/pandas_versions.py@new": 0,
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
   "m5/read_csv_safely.py": 0,
   "m5/csv_traps.py": 0,
   "m5/encodings.py": 0,
   "m5/json_lines.py": 0,
   "m5/atomic_write.py": 0,
   "m5/paths.py": 0,
   "m5/parquet_tour.py": 0,
   "m5/parse_log.py": 0,
   "m5/write_partitions.py": 0,
   "m6/naive_aware.py": 0,
   "m6/iso_parse.py": 0,
   "m6/zoneinfo_dst.py": 0,
   "m6/day_buckets.py": 0,
   "m6/money.py": 0,
   "m6/normalize_timestamps.py": 0,
   "m6/local_days.py": 0,
   "m7/exceptions_tour.py": 0,
   "m7/raise_from.py": 1,
   "m7/swallowed.py": 0,
   "m7/fail_loud.py": 1,
   "m7/retry_backoff.py": 0,
   "m7/tenacity_retry.py": 0,
   "m7/load_strategies.py": 0,
   "m7/watermark.py": 0,
   "m7/idempotent_load.py": 0,
   "m7/call_with_retry.py": 0,
   "m8/api_basics.py": 0,
   "m8/paginate.py": 0,
   "m8/rate_limit.py": 0,
   "m8/fetch_all.py": 0,
   "m8/sql_params.py": 0,
   "m8/transactions.py": 0,
   "m8/sqlalchemy_core.py": 0,
   "m8/upsert_batches.py": 0,
   "m8/batch_insert.py": 0,
   "m9/nulls_and_types.py": 0,
   "m9/merge_fanout.py": 0,
   "m9/safe_join.py": 0,
   "m9/latest_per_order.py": 0,
   "m9/three_engines.py": 0,
   "m9/lazy_polars.py": 0,
   "m10/profile_first.py": 0,
   "m10/vectorize.py": 0,
   "m10/pandas_memory.py": 0,
   "m10/threaded_fetch.py": 0,
   "m10/concurrency.py": 0,
   "m10/concurrency.py@free": 0,
   "m11/type_hints.py": 0,
   "m11/dataclass_vs_pydantic.py": 0,
   "m11/validate_or_quarantine.py": 0,
   "m11/split_valid.py": 0,
   "m11/contract_check.py": 0,
   "m12/run_mutants.py": 0,
   "m12/logging_basics.py": 0,
   "m12/parse_amount.py": 0,
   "m13/config_precedence.py": 0,
   "m13/build|.demo/bin/brewline-load --help": 0,
   "m14/inject.py": 0,
   "m14/steps.py": 0,
   "m14/pull_logic_out.py": 0,
   "m15/pipeline_round.py": 0,
   "m2/venv_session|python -m venv .venv": 0,
   "m7/exit_codes|python swallowed.py; echo \"exit code: $?\"": 0,
   "m7/exit_codes|python fail_loud.py; echo \"exit code: $?\"": 0,
   "m11/mypy|python -m mypy bad_types.py": 1,
   "m12/pytest_weak|python -m pytest -q -p no:cacheprovider --no-header test_weak.py": 0,
   "m12/pytest_failing|python -m pytest -q -p no:cacheprovider --no-header test_failing.py": 1,
   "m12/pytest_strong|python -m pytest -q -p no:cacheprovider --no-header test_strong.py": 0,
   "m12/coverage_weak|python -m pytest -q -p no:cacheprovider --no-header --cov=orders --cov-report=term-missing test_weak.py": 0,
   "m12/coverage_strong|python -m pytest -q -p no:cacheprovider --no-header --cov=orders --cov-report=term-missing test_strong.py": 0,
   "m12/hypothesis|python -m pytest -q -p no:cacheprovider --no-header hypothesis_demo.py": 1,
   "m12/ruff|python -m ruff check --select E,F,B --output-format=concise --no-cache bad_style.py": 1,
   "m13/cli|python load_orders.py --help": 0,
   "m13/cli|python load_orders.py orders.csv --day 2026-03-14 --dry-run 2>&1; echo \"exit code: $?\"": 0,
   "m13/cli|python load_orders.py orders.csv --day 2026-03-14 2>&1; echo \"exit code: $?\"": 0,
   "m13/cli|python load_orders.py orders.csv --day 14-03-2026 2>&1; echo \"exit code: $?\"": 0,
   "m13/cli|python load_orders.py missing.csv --day 2026-03-14 2>&1; echo \"exit code: $?\"": 0,
   "m13/cli|python load_orders.py empty.csv --day 2026-03-14 2>&1; echo \"exit code: $?\"": 0,
   "m13/checks|python -m ruff check --no-cache .": 0,
   "m13/checks|python -m mypy --no-incremental src": 0,
   "m13/checks|python -m pytest -q -p no:cacheprovider --no-header": 0,
   "m13/build|uv build": 0,
   "m13/build|python -m zipfile -l dist/brewline_loader-0.1.0-py3-none-any.whl": 0,
   "m13/build|uv venv --quiet .demo": 0,
   "m13/build|uv pip install --quiet --python .demo/bin/python dist/brewline_loader-0.1.0-py3-none-any.whl": 0,
   "m14/pytest_tangled|python -m pytest -q -p no:cacheprovider --no-header test_tangled.py": 0,
   "m14/pytest_core|python -m pytest -q -p no:cacheprovider --no-header test_core.py": 0,
   "m14/shell|python shell.py orders.csv out.db": 0,
   "m14/shell|python -c \"import sqlite3; print(sqlite3.connect('out.db').execute('SELECT * FROM daily ORDER BY store, day').fetchall())\"": 0
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
    7.4925,
    119.0751,
    680.4144,
    7739.7447
   ],
   "set": [
    0.032,
    0.0235,
    0.0249,
    0.0341
   ],
   "dict": [
    0.0321,
    0.0316,
    0.0306,
    0.0469
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
     "query_ms": 53.64,
     "total": 12311029.11
    },
    {
     "format": "CSV, gzip",
     "file": "orders.csv.gz",
     "bytes": 3087406,
     "query_ms": 129.39,
     "total": 12311029.11
    },
    {
     "format": "CSV, zstd",
     "file": "orders.csv.zst",
     "bytes": 3363892,
     "query_ms": 154.01,
     "total": 12311029.11
    },
    {
     "format": "JSON Lines",
     "file": "orders.jsonl",
     "bytes": 30703423,
     "query_ms": 106.84,
     "total": 12311029.11
    },
    {
     "format": "JSON Lines, gzip",
     "file": "orders.jsonl.gz",
     "bytes": 3798380,
     "query_ms": 155.71,
     "total": 12311029.11
    },
    {
     "format": "Parquet, snappy",
     "file": "orders_snappy.parquet",
     "bytes": 4153000,
     "query_ms": 2.28,
     "total": 12311029.11
    },
    {
     "format": "Parquet, zstd",
     "file": "orders_zstd.parquet",
     "bytes": 2900742,
     "query_ms": 2.02,
     "total": 12311029.11
    }
   ],
   "query": "SELECT sum(total) FROM <the file>",
   "runs": 5,
   "note": "bytes of each file, and the median of 5 runs of one DuckDB query over it, on this machine"
  },
  "m6.dst": {
   "database": {
    "path": "/usr/share/zoneinfo",
    "version": "2026e",
    "package": "2026.6",
    "package_iana": "2026f"
   },
   "package_agrees": true,
   "cases": [
    {
     "zone": "Europe/London",
     "local": "2026-06-15 12:00",
     "label": "an ordinary noon",
     "hint": "regular",
     "fold0": {
      "offset": "+01:00",
      "utc": "2026-06-15 11:00",
      "back": "2026-06-15 12:00"
     },
     "fold1": {
      "offset": "+01:00",
      "utc": "2026-06-15 11:00",
      "back": "2026-06-15 12:00"
     },
     "kind": "exists once"
    },
    {
     "zone": "Europe/London",
     "local": "2026-03-29 01:30",
     "label": "clocks go forward",
     "hint": "gap",
     "fold0": {
      "offset": "+00:00",
      "utc": "2026-03-29 01:30",
      "back": "2026-03-29 02:30"
     },
     "fold1": {
      "offset": "+01:00",
      "utc": "2026-03-29 00:30",
      "back": "2026-03-29 00:30"
     },
     "kind": "does not exist"
    },
    {
     "zone": "Europe/London",
     "local": "2026-10-25 01:30",
     "label": "clocks go back",
     "hint": "ambiguous",
     "fold0": {
      "offset": "+01:00",
      "utc": "2026-10-25 00:30",
      "back": "2026-10-25 01:30"
     },
     "fold1": {
      "offset": "+00:00",
      "utc": "2026-10-25 01:30",
      "back": "2026-10-25 01:30"
     },
     "kind": "ambiguous"
    },
    {
     "zone": "America/New_York",
     "local": "2026-06-15 12:00",
     "label": "an ordinary noon",
     "hint": "regular",
     "fold0": {
      "offset": "-04:00",
      "utc": "2026-06-15 16:00",
      "back": "2026-06-15 12:00"
     },
     "fold1": {
      "offset": "-04:00",
      "utc": "2026-06-15 16:00",
      "back": "2026-06-15 12:00"
     },
     "kind": "exists once"
    },
    {
     "zone": "America/New_York",
     "local": "2026-03-08 02:30",
     "label": "clocks go forward",
     "hint": "gap",
     "fold0": {
      "offset": "-05:00",
      "utc": "2026-03-08 07:30",
      "back": "2026-03-08 03:30"
     },
     "fold1": {
      "offset": "-04:00",
      "utc": "2026-03-08 06:30",
      "back": "2026-03-08 01:30"
     },
     "kind": "does not exist"
    },
    {
     "zone": "America/New_York",
     "local": "2026-11-01 01:30",
     "label": "clocks go back",
     "hint": "ambiguous",
     "fold0": {
      "offset": "-04:00",
      "utc": "2026-11-01 05:30",
      "back": "2026-11-01 01:30"
     },
     "fold1": {
      "offset": "-05:00",
      "utc": "2026-11-01 06:30",
      "back": "2026-11-01 01:30"
     },
     "kind": "ambiguous"
    },
    {
     "zone": "Asia/Singapore",
     "local": "2026-06-15 12:00",
     "label": "an ordinary noon",
     "hint": "regular",
     "fold0": {
      "offset": "+08:00",
      "utc": "2026-06-15 04:00",
      "back": "2026-06-15 12:00"
     },
     "fold1": {
      "offset": "+08:00",
      "utc": "2026-06-15 04:00",
      "back": "2026-06-15 12:00"
     },
     "kind": "exists once"
    },
    {
     "zone": "Asia/Kolkata",
     "local": "2026-06-15 12:00",
     "label": "an ordinary noon",
     "hint": "regular",
     "fold0": {
      "offset": "+05:30",
      "utc": "2026-06-15 06:30",
      "back": "2026-06-15 12:00"
     },
     "fold1": {
      "offset": "+05:30",
      "utc": "2026-06-15 06:30",
      "back": "2026-06-15 12:00"
     },
     "kind": "exists once"
    },
    {
     "zone": "Australia/Sydney",
     "local": "2026-06-15 12:00",
     "label": "an ordinary noon",
     "hint": "regular",
     "fold0": {
      "offset": "+10:00",
      "utc": "2026-06-15 02:00",
      "back": "2026-06-15 12:00"
     },
     "fold1": {
      "offset": "+10:00",
      "utc": "2026-06-15 02:00",
      "back": "2026-06-15 12:00"
     },
     "kind": "exists once"
    },
    {
     "zone": "Australia/Sydney",
     "local": "2026-04-05 02:30",
     "label": "clocks go back",
     "hint": "ambiguous",
     "fold0": {
      "offset": "+11:00",
      "utc": "2026-04-04 15:30",
      "back": "2026-04-05 02:30"
     },
     "fold1": {
      "offset": "+10:00",
      "utc": "2026-04-04 16:30",
      "back": "2026-04-05 02:30"
     },
     "kind": "ambiguous"
    },
    {
     "zone": "Australia/Sydney",
     "local": "2026-10-04 02:30",
     "label": "clocks go forward",
     "hint": "gap",
     "fold0": {
      "offset": "+10:00",
      "utc": "2026-10-03 16:30",
      "back": "2026-10-04 03:30"
     },
     "fold1": {
      "offset": "+11:00",
      "utc": "2026-10-03 15:30",
      "back": "2026-10-04 01:30"
     },
     "kind": "does not exist"
    },
    {
     "zone": "Australia/Lord_Howe",
     "local": "2026-06-15 12:00",
     "label": "an ordinary noon",
     "hint": "regular",
     "fold0": {
      "offset": "+10:30",
      "utc": "2026-06-15 01:30",
      "back": "2026-06-15 12:00"
     },
     "fold1": {
      "offset": "+10:30",
      "utc": "2026-06-15 01:30",
      "back": "2026-06-15 12:00"
     },
     "kind": "exists once"
    },
    {
     "zone": "Australia/Lord_Howe",
     "local": "2026-04-05 01:45",
     "label": "clocks go back",
     "hint": "ambiguous",
     "fold0": {
      "offset": "+11:00",
      "utc": "2026-04-04 14:45",
      "back": "2026-04-05 01:45"
     },
     "fold1": {
      "offset": "+10:30",
      "utc": "2026-04-04 15:15",
      "back": "2026-04-05 01:45"
     },
     "kind": "ambiguous"
    },
    {
     "zone": "Australia/Lord_Howe",
     "local": "2026-10-04 02:15",
     "label": "clocks go forward",
     "hint": "gap",
     "fold0": {
      "offset": "+10:30",
      "utc": "2026-10-03 15:45",
      "back": "2026-10-04 02:45"
     },
     "fold1": {
      "offset": "+11:00",
      "utc": "2026-10-03 15:15",
      "back": "2026-10-04 01:45"
     },
     "kind": "does not exist"
    }
   ],
   "note": "computed with zoneinfo; kind is found with the check from PEP 495: a local time that does not survive a trip through UTC does not exist"
  },
  "m6.money": {
   "sums": [
    {
     "n": 10,
     "float": "0.9999999999999999",
     "fsum": "1.0",
     "decimal": "1.00",
     "cents": "100",
     "float_error": "-1.1102230246251565e-16"
    },
    {
     "n": 100,
     "float": "9.99999999999998",
     "fsum": "10.0",
     "decimal": "10.00",
     "cents": "1000",
     "float_error": "-1.9539925233402755e-14"
    },
    {
     "n": 1000,
     "float": "99.9999999999986",
     "fsum": "100.0",
     "decimal": "100.00",
     "cents": "10000",
     "float_error": "-1.4068746168049984e-12"
    },
    {
     "n": 100000,
     "float": "10000.000000018848",
     "fsum": "10000.0",
     "decimal": "10000.00",
     "cents": "1000000",
     "float_error": "1.8848368199542165e-08"
    },
    {
     "n": 1000000,
     "float": "100000.00000133288",
     "fsum": "100000.0",
     "decimal": "100000.00",
     "cents": "10000000",
     "float_error": "1.3328826753422618e-06"
    }
   ],
   "rounding": [
    {
     "value": "0.5",
     "places": 0,
     "round": "0.0",
     "half_even": "0",
     "half_up": "1",
     "down": "0"
    },
    {
     "value": "1.5",
     "places": 0,
     "round": "2.0",
     "half_even": "2",
     "half_up": "2",
     "down": "1"
    },
    {
     "value": "2.5",
     "places": 0,
     "round": "2.0",
     "half_even": "2",
     "half_up": "3",
     "down": "2"
    },
    {
     "value": "-2.5",
     "places": 0,
     "round": "-2.0",
     "half_even": "-2",
     "half_up": "-3",
     "down": "-2"
    },
    {
     "value": "2.675",
     "places": 2,
     "round": "2.67",
     "half_even": "2.68",
     "half_up": "2.68",
     "down": "2.67"
    },
    {
     "value": "1.005",
     "places": 2,
     "round": "1.0",
     "half_even": "1.00",
     "half_up": "1.01",
     "down": "1.00"
    },
    {
     "value": "0.125",
     "places": 2,
     "round": "0.12",
     "half_even": "0.12",
     "half_up": "0.13",
     "down": "0.12"
    }
   ]
  },
  "m7.idem": {
   "strategies": [
    "append",
    "insert with a key",
    "delete, then insert",
    "delete, then insert, in a transaction",
    "upsert"
   ],
   "scenarios": [
    "run once",
    "run twice",
    "crash, then run again",
    "the source corrects O-3",
    "the source drops O-6"
   ],
   "cells": {
    "append": {
     "run once": {
      "runs": [
       {
        "outcome": "finished",
        "rows": 6,
        "cents": 8275
       }
      ],
      "final": [
       [
        "O-1",
        1250
       ],
       [
        "O-2",
        475
       ],
       [
        "O-3",
        820
       ],
       [
        "O-4",
        1990
       ],
       [
        "O-5",
        3100
       ],
       [
        "O-6",
        640
       ]
      ],
      "right": true,
      "want_rows": 6,
      "want_cents": 8275
     },
     "run twice": {
      "runs": [
       {
        "outcome": "finished",
        "rows": 6,
        "cents": 8275
       },
       {
        "outcome": "finished",
        "rows": 12,
        "cents": 16550
       }
      ],
      "final": [
       [
        "O-1",
        1250
       ],
       [
        "O-1",
        1250
       ],
       [
        "O-2",
        475
       ],
       [
        "O-2",
        475
       ],
       [
        "O-3",
        820
       ],
       [
        "O-3",
        820
       ],
       [
        "O-4",
        1990
       ],
       [
        "O-4",
        1990
       ],
       [
        "O-5",
        3100
       ],
       [
        "O-5",
        3100
       ],
       [
        "O-6",
        640
       ],
       [
        "O-6",
        640
       ]
      ],
      "right": false,
      "want_rows": 6,
      "want_cents": 8275
     },
     "crash, then run again": {
      "runs": [
       {
        "outcome": "crashed: the job died after 3 rows",
        "rows": 3,
        "cents": 2545
       },
       {
        "outcome": "finished",
        "rows": 9,
        "cents": 10820
       }
      ],
      "final": [
       [
        "O-1",
        1250
       ],
       [
        "O-1",
        1250
       ],
       [
        "O-2",
        475
       ],
       [
        "O-2",
        475
       ],
       [
        "O-3",
        820
       ],
       [
        "O-3",
        820
       ],
       [
        "O-4",
        1990
       ],
       [
        "O-5",
        3100
       ],
       [
        "O-6",
        640
       ]
      ],
      "right": false,
      "want_rows": 6,
      "want_cents": 8275
     },
     "the source corrects O-3": {
      "runs": [
       {
        "outcome": "finished",
        "rows": 6,
        "cents": 8275
       },
       {
        "outcome": "finished",
        "rows": 12,
        "cents": 16650
       }
      ],
      "final": [
       [
        "O-1",
        1250
       ],
       [
        "O-1",
        1250
       ],
       [
        "O-2",
        475
       ],
       [
        "O-2",
        475
       ],
       [
        "O-3",
        820
       ],
       [
        "O-3",
        920
       ],
       [
        "O-4",
        1990
       ],
       [
        "O-4",
        1990
       ],
       [
        "O-5",
        3100
       ],
       [
        "O-5",
        3100
       ],
       [
        "O-6",
        640
       ],
       [
        "O-6",
        640
       ]
      ],
      "right": false,
      "want_rows": 6,
      "want_cents": 8375
     },
     "the source drops O-6": {
      "runs": [
       {
        "outcome": "finished",
        "rows": 6,
        "cents": 8275
       },
       {
        "outcome": "finished",
        "rows": 11,
        "cents": 15910
       }
      ],
      "final": [
       [
        "O-1",
        1250
       ],
       [
        "O-1",
        1250
       ],
       [
        "O-2",
        475
       ],
       [
        "O-2",
        475
       ],
       [
        "O-3",
        820
       ],
       [
        "O-3",
        820
       ],
       [
        "O-4",
        1990
       ],
       [
        "O-4",
        1990
       ],
       [
        "O-5",
        3100
       ],
       [
        "O-5",
        3100
       ],
       [
        "O-6",
        640
       ]
      ],
      "right": false,
      "want_rows": 5,
      "want_cents": 7635
     }
    },
    "insert with a key": {
     "run once": {
      "runs": [
       {
        "outcome": "finished",
        "rows": 6,
        "cents": 8275
       }
      ],
      "final": [
       [
        "O-1",
        1250
       ],
       [
        "O-2",
        475
       ],
       [
        "O-3",
        820
       ],
       [
        "O-4",
        1990
       ],
       [
        "O-5",
        3100
       ],
       [
        "O-6",
        640
       ]
      ],
      "right": true,
      "want_rows": 6,
      "want_cents": 8275
     },
     "run twice": {
      "runs": [
       {
        "outcome": "finished",
        "rows": 6,
        "cents": 8275
       },
       {
        "outcome": "failed: UNIQUE constraint failed: orders.order_id",
        "rows": 6,
        "cents": 8275
       }
      ],
      "final": [
       [
        "O-1",
        1250
       ],
       [
        "O-2",
        475
       ],
       [
        "O-3",
        820
       ],
       [
        "O-4",
        1990
       ],
       [
        "O-5",
        3100
       ],
       [
        "O-6",
        640
       ]
      ],
      "right": true,
      "want_rows": 6,
      "want_cents": 8275
     },
     "crash, then run again": {
      "runs": [
       {
        "outcome": "crashed: the job died after 3 rows",
        "rows": 3,
        "cents": 2545
       },
       {
        "outcome": "failed: UNIQUE constraint failed: orders.order_id",
        "rows": 3,
        "cents": 2545
       }
      ],
      "final": [
       [
        "O-1",
        1250
       ],
       [
        "O-2",
        475
       ],
       [
        "O-3",
        820
       ]
      ],
      "right": false,
      "want_rows": 6,
      "want_cents": 8275
     },
     "the source corrects O-3": {
      "runs": [
       {
        "outcome": "finished",
        "rows": 6,
        "cents": 8275
       },
       {
        "outcome": "failed: UNIQUE constraint failed: orders.order_id",
        "rows": 6,
        "cents": 8275
       }
      ],
      "final": [
       [
        "O-1",
        1250
       ],
       [
        "O-2",
        475
       ],
       [
        "O-3",
        820
       ],
       [
        "O-4",
        1990
       ],
       [
        "O-5",
        3100
       ],
       [
        "O-6",
        640
       ]
      ],
      "right": false,
      "want_rows": 6,
      "want_cents": 8375
     },
     "the source drops O-6": {
      "runs": [
       {
        "outcome": "finished",
        "rows": 6,
        "cents": 8275
       },
       {
        "outcome": "failed: UNIQUE constraint failed: orders.order_id",
        "rows": 6,
        "cents": 8275
       }
      ],
      "final": [
       [
        "O-1",
        1250
       ],
       [
        "O-2",
        475
       ],
       [
        "O-3",
        820
       ],
       [
        "O-4",
        1990
       ],
       [
        "O-5",
        3100
       ],
       [
        "O-6",
        640
       ]
      ],
      "right": false,
      "want_rows": 5,
      "want_cents": 7635
     }
    },
    "delete, then insert": {
     "run once": {
      "runs": [
       {
        "outcome": "finished",
        "rows": 6,
        "cents": 8275
       }
      ],
      "final": [
       [
        "O-1",
        1250
       ],
       [
        "O-2",
        475
       ],
       [
        "O-3",
        820
       ],
       [
        "O-4",
        1990
       ],
       [
        "O-5",
        3100
       ],
       [
        "O-6",
        640
       ]
      ],
      "right": true,
      "want_rows": 6,
      "want_cents": 8275
     },
     "run twice": {
      "runs": [
       {
        "outcome": "finished",
        "rows": 6,
        "cents": 8275
       },
       {
        "outcome": "finished",
        "rows": 6,
        "cents": 8275
       }
      ],
      "final": [
       [
        "O-1",
        1250
       ],
       [
        "O-2",
        475
       ],
       [
        "O-3",
        820
       ],
       [
        "O-4",
        1990
       ],
       [
        "O-5",
        3100
       ],
       [
        "O-6",
        640
       ]
      ],
      "right": true,
      "want_rows": 6,
      "want_cents": 8275
     },
     "crash, then run again": {
      "runs": [
       {
        "outcome": "crashed: the job died after 3 rows",
        "rows": 3,
        "cents": 2545
       },
       {
        "outcome": "finished",
        "rows": 6,
        "cents": 8275
       }
      ],
      "final": [
       [
        "O-1",
        1250
       ],
       [
        "O-2",
        475
       ],
       [
        "O-3",
        820
       ],
       [
        "O-4",
        1990
       ],
       [
        "O-5",
        3100
       ],
       [
        "O-6",
        640
       ]
      ],
      "right": true,
      "want_rows": 6,
      "want_cents": 8275
     },
     "the source corrects O-3": {
      "runs": [
       {
        "outcome": "finished",
        "rows": 6,
        "cents": 8275
       },
       {
        "outcome": "finished",
        "rows": 6,
        "cents": 8375
       }
      ],
      "final": [
       [
        "O-1",
        1250
       ],
       [
        "O-2",
        475
       ],
       [
        "O-3",
        920
       ],
       [
        "O-4",
        1990
       ],
       [
        "O-5",
        3100
       ],
       [
        "O-6",
        640
       ]
      ],
      "right": true,
      "want_rows": 6,
      "want_cents": 8375
     },
     "the source drops O-6": {
      "runs": [
       {
        "outcome": "finished",
        "rows": 6,
        "cents": 8275
       },
       {
        "outcome": "finished",
        "rows": 5,
        "cents": 7635
       }
      ],
      "final": [
       [
        "O-1",
        1250
       ],
       [
        "O-2",
        475
       ],
       [
        "O-3",
        820
       ],
       [
        "O-4",
        1990
       ],
       [
        "O-5",
        3100
       ]
      ],
      "right": true,
      "want_rows": 5,
      "want_cents": 7635
     }
    },
    "delete, then insert, in a transaction": {
     "run once": {
      "runs": [
       {
        "outcome": "finished",
        "rows": 6,
        "cents": 8275
       }
      ],
      "final": [
       [
        "O-1",
        1250
       ],
       [
        "O-2",
        475
       ],
       [
        "O-3",
        820
       ],
       [
        "O-4",
        1990
       ],
       [
        "O-5",
        3100
       ],
       [
        "O-6",
        640
       ]
      ],
      "right": true,
      "want_rows": 6,
      "want_cents": 8275
     },
     "run twice": {
      "runs": [
       {
        "outcome": "finished",
        "rows": 6,
        "cents": 8275
       },
       {
        "outcome": "finished",
        "rows": 6,
        "cents": 8275
       }
      ],
      "final": [
       [
        "O-1",
        1250
       ],
       [
        "O-2",
        475
       ],
       [
        "O-3",
        820
       ],
       [
        "O-4",
        1990
       ],
       [
        "O-5",
        3100
       ],
       [
        "O-6",
        640
       ]
      ],
      "right": true,
      "want_rows": 6,
      "want_cents": 8275
     },
     "crash, then run again": {
      "runs": [
       {
        "outcome": "crashed: the job died after 3 rows",
        "rows": 0,
        "cents": 0
       },
       {
        "outcome": "finished",
        "rows": 6,
        "cents": 8275
       }
      ],
      "final": [
       [
        "O-1",
        1250
       ],
       [
        "O-2",
        475
       ],
       [
        "O-3",
        820
       ],
       [
        "O-4",
        1990
       ],
       [
        "O-5",
        3100
       ],
       [
        "O-6",
        640
       ]
      ],
      "right": true,
      "want_rows": 6,
      "want_cents": 8275
     },
     "the source corrects O-3": {
      "runs": [
       {
        "outcome": "finished",
        "rows": 6,
        "cents": 8275
       },
       {
        "outcome": "finished",
        "rows": 6,
        "cents": 8375
       }
      ],
      "final": [
       [
        "O-1",
        1250
       ],
       [
        "O-2",
        475
       ],
       [
        "O-3",
        920
       ],
       [
        "O-4",
        1990
       ],
       [
        "O-5",
        3100
       ],
       [
        "O-6",
        640
       ]
      ],
      "right": true,
      "want_rows": 6,
      "want_cents": 8375
     },
     "the source drops O-6": {
      "runs": [
       {
        "outcome": "finished",
        "rows": 6,
        "cents": 8275
       },
       {
        "outcome": "finished",
        "rows": 5,
        "cents": 7635
       }
      ],
      "final": [
       [
        "O-1",
        1250
       ],
       [
        "O-2",
        475
       ],
       [
        "O-3",
        820
       ],
       [
        "O-4",
        1990
       ],
       [
        "O-5",
        3100
       ]
      ],
      "right": true,
      "want_rows": 5,
      "want_cents": 7635
     }
    },
    "upsert": {
     "run once": {
      "runs": [
       {
        "outcome": "finished",
        "rows": 6,
        "cents": 8275
       }
      ],
      "final": [
       [
        "O-1",
        1250
       ],
       [
        "O-2",
        475
       ],
       [
        "O-3",
        820
       ],
       [
        "O-4",
        1990
       ],
       [
        "O-5",
        3100
       ],
       [
        "O-6",
        640
       ]
      ],
      "right": true,
      "want_rows": 6,
      "want_cents": 8275
     },
     "run twice": {
      "runs": [
       {
        "outcome": "finished",
        "rows": 6,
        "cents": 8275
       },
       {
        "outcome": "finished",
        "rows": 6,
        "cents": 8275
       }
      ],
      "final": [
       [
        "O-1",
        1250
       ],
       [
        "O-2",
        475
       ],
       [
        "O-3",
        820
       ],
       [
        "O-4",
        1990
       ],
       [
        "O-5",
        3100
       ],
       [
        "O-6",
        640
       ]
      ],
      "right": true,
      "want_rows": 6,
      "want_cents": 8275
     },
     "crash, then run again": {
      "runs": [
       {
        "outcome": "crashed: the job died after 3 rows",
        "rows": 3,
        "cents": 2545
       },
       {
        "outcome": "finished",
        "rows": 6,
        "cents": 8275
       }
      ],
      "final": [
       [
        "O-1",
        1250
       ],
       [
        "O-2",
        475
       ],
       [
        "O-3",
        820
       ],
       [
        "O-4",
        1990
       ],
       [
        "O-5",
        3100
       ],
       [
        "O-6",
        640
       ]
      ],
      "right": true,
      "want_rows": 6,
      "want_cents": 8275
     },
     "the source corrects O-3": {
      "runs": [
       {
        "outcome": "finished",
        "rows": 6,
        "cents": 8275
       },
       {
        "outcome": "finished",
        "rows": 6,
        "cents": 8375
       }
      ],
      "final": [
       [
        "O-1",
        1250
       ],
       [
        "O-2",
        475
       ],
       [
        "O-3",
        920
       ],
       [
        "O-4",
        1990
       ],
       [
        "O-5",
        3100
       ],
       [
        "O-6",
        640
       ]
      ],
      "right": true,
      "want_rows": 6,
      "want_cents": 8375
     },
     "the source drops O-6": {
      "runs": [
       {
        "outcome": "finished",
        "rows": 6,
        "cents": 8275
       },
       {
        "outcome": "finished",
        "rows": 6,
        "cents": 8275
       }
      ],
      "final": [
       [
        "O-1",
        1250
       ],
       [
        "O-2",
        475
       ],
       [
        "O-3",
        820
       ],
       [
        "O-4",
        1990
       ],
       [
        "O-5",
        3100
       ],
       [
        "O-6",
        640
       ]
      ],
      "right": false,
      "want_rows": 5,
      "want_cents": 7635
     }
    }
   },
   "truth": {
    "run once": [
     [
      "O-1",
      1250
     ],
     [
      "O-2",
      475
     ],
     [
      "O-3",
      820
     ],
     [
      "O-4",
      1990
     ],
     [
      "O-5",
      3100
     ],
     [
      "O-6",
      640
     ]
    ],
    "run twice": [
     [
      "O-1",
      1250
     ],
     [
      "O-2",
      475
     ],
     [
      "O-3",
      820
     ],
     [
      "O-4",
      1990
     ],
     [
      "O-5",
      3100
     ],
     [
      "O-6",
      640
     ]
    ],
    "crash, then run again": [
     [
      "O-1",
      1250
     ],
     [
      "O-2",
      475
     ],
     [
      "O-3",
      820
     ],
     [
      "O-4",
      1990
     ],
     [
      "O-5",
      3100
     ],
     [
      "O-6",
      640
     ]
    ],
    "the source corrects O-3": [
     [
      "O-1",
      1250
     ],
     [
      "O-2",
      475
     ],
     [
      "O-3",
      920
     ],
     [
      "O-4",
      1990
     ],
     [
      "O-5",
      3100
     ],
     [
      "O-6",
      640
     ]
    ],
    "the source drops O-6": [
     [
      "O-1",
      1250
     ],
     [
      "O-2",
      475
     ],
     [
      "O-3",
      820
     ],
     [
      "O-4",
      1990
     ],
     [
      "O-5",
      3100
     ]
    ]
   },
   "sql": {
    "append": "INSERT INTO orders VALUES (?, ?, ?)",
    "insert with a key": "INSERT INTO orders VALUES (?, ?, ?)",
    "upsert": "INSERT INTO orders VALUES (?, ?, ?) ON CONFLICT (order_id) DO UPDATE SET total_cents = excluded.total_cents"
   },
   "note": "every cell is a run of the functions in lessons/m7/load_strategies.py against SQLite (an in-memory database), with crash = an exception after 3 rows"
  },
  "m7.retry": {
   "policies": [
    "at once",
    "fixed 1 s",
    "exponential",
    "exponential with full jitter"
   ],
   "one": {
    "at once": {
     "1": {
      "waits": [
       0.0
      ],
      "total": 0.0
     },
     "2": {
      "waits": [
       0.0,
       0.0
      ],
      "total": 0.0
     },
     "3": {
      "waits": [
       0.0,
       0.0,
       0.0
      ],
      "total": 0.0
     },
     "4": {
      "waits": [
       0.0,
       0.0,
       0.0,
       0.0
      ],
      "total": 0.0
     }
    },
    "fixed 1 s": {
     "1": {
      "waits": [
       1.0
      ],
      "total": 1.0
     },
     "2": {
      "waits": [
       1.0,
       1.0
      ],
      "total": 2.0
     },
     "3": {
      "waits": [
       1.0,
       1.0,
       1.0
      ],
      "total": 3.0
     },
     "4": {
      "waits": [
       1.0,
       1.0,
       1.0,
       1.0
      ],
      "total": 4.0
     }
    },
    "exponential": {
     "1": {
      "waits": [
       0.5
      ],
      "total": 0.5
     },
     "2": {
      "waits": [
       0.5,
       1.0
      ],
      "total": 1.5
     },
     "3": {
      "waits": [
       0.5,
       1.0,
       2.0
      ],
      "total": 3.5
     },
     "4": {
      "waits": [
       0.5,
       1.0,
       2.0,
       4.0
      ],
      "total": 7.5
     }
    },
    "exponential with full jitter": {
     "1": {
      "waits": [
       0.162
      ],
      "total": 0.162
     },
     "2": {
      "waits": [
       0.162,
       0.151
      ],
      "total": 0.313
     },
     "3": {
      "waits": [
       0.162,
       0.151,
       1.302
      ],
      "total": 1.615
     },
     "4": {
      "waits": [
       0.162,
       0.151,
       1.302,
       0.29
      ],
      "total": 1.904
     }
    }
   },
   "storm": {
    "at once": {
     "requests": 330,
     "succeeded": 10,
     "gave_up": 40,
     "rejected": 320,
     "last_second": 0,
     "peak": 330,
     "retry_burst": 280,
     "finished_at": 0.0,
     "per_second": [
      [
       10,
       320
      ]
     ],
     "per_tenth": [
      [
       10,
       320
      ]
     ]
    },
    "fixed 1 s": {
     "requests": 150,
     "succeeded": 50,
     "gave_up": 0,
     "rejected": 100,
     "last_second": 4,
     "peak": 50,
     "retry_burst": 40,
     "finished_at": 4.0,
     "per_second": [
      [
       10,
       40
      ],
      [
       10,
       30
      ],
      [
       10,
       20
      ],
      [
       10,
       10
      ],
      [
       10,
       0
      ]
     ],
     "per_tenth": [
      [
       10,
       40
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       10,
       30
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       10,
       20
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       10,
       10
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       10,
       0
      ]
     ]
    },
    "exponential": {
     "requests": 190,
     "succeeded": 50,
     "gave_up": 0,
     "rejected": 140,
     "last_second": 15,
     "peak": 90,
     "retry_burst": 40,
     "finished_at": 15.5,
     "per_second": [
      [
       10,
       80
      ],
      [
       10,
       30
      ],
      [
       0,
       0
      ],
      [
       10,
       20
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       10,
       10
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       10,
       0
      ]
     ],
     "per_tenth": [
      [
       10,
       40
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       40
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       10,
       30
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       10,
       20
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       10,
       10
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       10,
       0
      ]
     ]
    },
    "exponential with full jitter": {
     "requests": 196,
     "succeeded": 50,
     "gave_up": 0,
     "rejected": 146,
     "last_second": 7,
     "peak": 127,
     "retry_burst": 14,
     "finished_at": 7.45,
     "per_second": [
      [
       10,
       117
      ],
      [
       10,
       25
      ],
      [
       10,
       4
      ],
      [
       4,
       0
      ],
      [
       9,
       0
      ],
      [
       4,
       0
      ],
      [
       2,
       0
      ],
      [
       1,
       0
      ]
     ],
     "per_tenth": [
      [
       10,
       50
      ],
      [
       0,
       4
      ],
      [
       0,
       13
      ],
      [
       0,
       14
      ],
      [
       0,
       13
      ],
      [
       0,
       3
      ],
      [
       0,
       5
      ],
      [
       0,
       7
      ],
      [
       0,
       6
      ],
      [
       0,
       2
      ],
      [
       6,
       0
      ],
      [
       4,
       0
      ],
      [
       0,
       9
      ],
      [
       0,
       4
      ],
      [
       0,
       1
      ],
      [
       0,
       0
      ],
      [
       0,
       5
      ],
      [
       0,
       4
      ],
      [
       0,
       2
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       2,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       4,
       0
      ],
      [
       1,
       0
      ],
      [
       1,
       0
      ],
      [
       1,
       0
      ],
      [
       1,
       4
      ],
      [
       0,
       0
      ],
      [
       1,
       0
      ],
      [
       1,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       1,
       0
      ],
      [
       1,
       0
      ],
      [
       2,
       0
      ],
      [
       0,
       0
      ],
      [
       2,
       0
      ],
      [
       1,
       0
      ],
      [
       2,
       0
      ],
      [
       2,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       2,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       2,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       1,
       0
      ],
      [
       1,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       0,
       0
      ],
      [
       1,
       0
      ]
     ]
    }
   },
   "setup": {
    "clients": 50,
    "capacity": 10,
    "attempts": 8,
    "seed": 11
   },
   "note": "a simulation: the delay function is the one in lessons/m7/retry_backoff.py, time is a number, and there is no network. Each whole second the service accepts 10 requests and answers 429 to the rest."
  },
  "m8.paging": {
   "per_page": 5,
   "cases": [
    {
     "style": "offset",
     "scenario": "none",
     "pages": [
      [
       "O-122",
       "O-121",
       "O-120",
       "O-119",
       "O-118"
      ],
      [
       "O-117",
       "O-116",
       "O-115",
       "O-114",
       "O-113"
      ],
      [
       "O-112",
       "O-111",
       "O-110",
       "O-109",
       "O-108"
      ],
      [
       "O-107",
       "O-106",
       "O-105",
       "O-104",
       "O-103"
      ],
      [
       "O-102",
       "O-101",
       "O-100"
      ]
     ],
     "rows": 23,
     "unique": 23,
     "repeated": [],
     "missed": [],
     "new": [],
     "cancelled": [],
     "before": 23,
     "after": 23
    },
    {
     "style": "offset",
     "scenario": "insert",
     "pages": [
      [
       "O-122",
       "O-121",
       "O-120",
       "O-119",
       "O-118"
      ],
      [
       "O-120",
       "O-119",
       "O-118",
       "O-117",
       "O-116"
      ],
      [
       "O-115",
       "O-114",
       "O-113",
       "O-112",
       "O-111"
      ],
      [
       "O-110",
       "O-109",
       "O-108",
       "O-107",
       "O-106"
      ],
      [
       "O-105",
       "O-104",
       "O-103",
       "O-102",
       "O-101"
      ],
      [
       "O-100"
      ]
     ],
     "rows": 26,
     "unique": 23,
     "repeated": [
      "O-118",
      "O-119",
      "O-120"
     ],
     "missed": [],
     "new": [],
     "cancelled": [],
     "before": 23,
     "after": 26
    },
    {
     "style": "offset",
     "scenario": "delete",
     "pages": [
      [
       "O-122",
       "O-121",
       "O-120",
       "O-119",
       "O-118"
      ],
      [
       "O-114",
       "O-113",
       "O-112",
       "O-111",
       "O-110"
      ],
      [
       "O-109",
       "O-108",
       "O-107",
       "O-106",
       "O-105"
      ],
      [
       "O-104",
       "O-103",
       "O-102",
       "O-101",
       "O-100"
      ]
     ],
     "rows": 20,
     "unique": 20,
     "repeated": [],
     "missed": [
      "O-115",
      "O-116",
      "O-117"
     ],
     "new": [],
     "cancelled": [
      "O-120",
      "O-121",
      "O-122"
     ],
     "before": 23,
     "after": 20
    },
    {
     "style": "cursor",
     "scenario": "none",
     "pages": [
      [
       "O-100",
       "O-101",
       "O-102",
       "O-103",
       "O-104"
      ],
      [
       "O-105",
       "O-106",
       "O-107",
       "O-108",
       "O-109"
      ],
      [
       "O-110",
       "O-111",
       "O-112",
       "O-113",
       "O-114"
      ],
      [
       "O-115",
       "O-116",
       "O-117",
       "O-118",
       "O-119"
      ],
      [
       "O-120",
       "O-121",
       "O-122"
      ]
     ],
     "rows": 23,
     "unique": 23,
     "repeated": [],
     "missed": [],
     "new": [],
     "cancelled": [],
     "before": 23,
     "after": 23
    },
    {
     "style": "cursor",
     "scenario": "insert",
     "pages": [
      [
       "O-100",
       "O-101",
       "O-102",
       "O-103",
       "O-104"
      ],
      [
       "O-105",
       "O-106",
       "O-107",
       "O-108",
       "O-109"
      ],
      [
       "O-110",
       "O-111",
       "O-112",
       "O-113",
       "O-114"
      ],
      [
       "O-115",
       "O-116",
       "O-117",
       "O-118",
       "O-119"
      ],
      [
       "O-120",
       "O-121",
       "O-122",
       "O-123",
       "O-124"
      ],
      [
       "O-125"
      ]
     ],
     "rows": 26,
     "unique": 26,
     "repeated": [],
     "missed": [],
     "new": [
      "O-123",
      "O-124",
      "O-125"
     ],
     "cancelled": [],
     "before": 23,
     "after": 26
    },
    {
     "style": "cursor",
     "scenario": "delete",
     "pages": [
      [
       "O-100",
       "O-101",
       "O-102",
       "O-103",
       "O-104"
      ],
      [
       "O-105",
       "O-106",
       "O-107",
       "O-108",
       "O-109"
      ],
      [
       "O-110",
       "O-111",
       "O-112",
       "O-113",
       "O-114"
      ],
      [
       "O-115",
       "O-116",
       "O-117",
       "O-118",
       "O-119"
      ]
     ],
     "rows": 20,
     "unique": 20,
     "repeated": [],
     "missed": [],
     "new": [],
     "cancelled": [
      "O-120",
      "O-121",
      "O-122"
     ],
     "before": 23,
     "after": 20
    }
   ],
   "note": "every case is a run of the functions in lessons/m8/paginate.py against the fake API (support/brewline_api.py): the first page is read, then the data changes, then the rest is read"
  },
  "m8.batch": {
   "rows": 5000,
   "methods": {
    "commit for every row": {
     "seconds": 4.7,
     "rows_per_second": 1064
    },
    "one transaction, execute in a loop": {
     "seconds": 0.009,
     "rows_per_second": 586396
    },
    "one transaction, executemany": {
     "seconds": 0.006,
     "rows_per_second": 868926
    },
    "executemany, commit every 1,000": {
     "seconds": 0.012,
     "rows_per_second": 427005
    }
   },
   "note": "median of 3 runs for each method, SQLite in a file in a temporary folder, on this machine. Parsed from the recorded output of lessons/m8/batch_insert.py."
  },
  "m9.engines": {
   "rows": 2000000,
   "file_mb": 12.9,
   "engines": {
    "pandas": {
     "seconds": 0.1508,
     "extra_mb": 268.2,
     "peak_mb": 373.9,
     "runs": [
      0.1499,
      0.1508,
      0.1677,
      0.1554,
      0.1331
     ]
    },
    "polars eager": {
     "seconds": 0.0705,
     "extra_mb": 230.0,
     "peak_mb": 276.4,
     "runs": [
      0.0697,
      0.0705,
      0.0745,
      0.0744,
      0.0698
     ]
    },
    "polars lazy": {
     "seconds": 0.0173,
     "extra_mb": 53.8,
     "peak_mb": 100.3,
     "runs": [
      0.0209,
      0.0173,
      0.0163,
      0.0167,
      0.0184
     ]
    },
    "duckdb": {
     "seconds": 0.0382,
     "extra_mb": 37.9,
     "peak_mb": 74.6,
     "runs": [
      0.0356,
      0.0382,
      0.0446,
      0.0346,
      0.0395
     ]
    }
   },
   "note": "each number is the median of 5 runs, each run a new process, reading the same Parquet file and answering the same question, on this machine. extra_mb is the growth of the peak resident memory during the query."
  },
  "m9.fanout": {
   "orders": {
    "rows": 7,
    "cents": 8835
   },
   "cases": [
    {
     "how": "inner",
     "dup": 0,
     "rows": 6,
     "cents": 8275,
     "pandas_validate": null,
     "polars_validate": null
    },
    {
     "how": "inner",
     "dup": 1,
     "rows": 8,
     "cents": 10905,
     "pandas_validate": "MergeError: Merge keys are not unique in right dataset; not a many-to-one merge",
     "polars_validate": "ComputeError: join keys did not fulfill m:1 validation"
    },
    {
     "how": "inner",
     "dup": 2,
     "rows": 10,
     "cents": 13535,
     "pandas_validate": "MergeError: Merge keys are not unique in right dataset; not a many-to-one merge",
     "polars_validate": "ComputeError: join keys did not fulfill m:1 validation"
    },
    {
     "how": "left",
     "dup": 0,
     "rows": 7,
     "cents": 8835,
     "pandas_validate": null,
     "polars_validate": null
    },
    {
     "how": "left",
     "dup": 1,
     "rows": 9,
     "cents": 11465,
     "pandas_validate": "MergeError: Merge keys are not unique in right dataset; not a many-to-one merge",
     "polars_validate": "ComputeError: join keys did not fulfill m:1 validation"
    },
    {
     "how": "left",
     "dup": 2,
     "rows": 11,
     "cents": 14095,
     "pandas_validate": "MergeError: Merge keys are not unique in right dataset; not a many-to-one merge",
     "polars_validate": "ComputeError: join keys did not fulfill m:1 validation"
    }
   ]
  },
  "m9.duckdb2": {
   "fetchone_error": "Relations no longer have fetchone(): a relation keeps no result between calls, so every call runs it again. Use rel.limit(1).fetchall() instead.",
   "note": "what DuckDB itself answers when a relation is asked for fetchone(): the error text of the installed version"
  },
  "m10.profile": {
   "hot_function": "is_known",
   "hot_calls": 20000,
   "list_seconds": 0.551,
   "set_seconds": 0.002,
   "note": "cProfile on 20,000 rows and a list of 5,000 store ids, then the median of 3 runs with a list and with a set, on this machine"
  },
  "m10.vector": {
   "ms": {
    "for loop": 27.0,
    "list comprehension and sum": 38.6,
    "numpy: (arr * 2).sum()": 1.0,
    "pandas: (s * 2).sum()": 1.4
   },
   "note": "median of 5 runs, one million numbers, on this machine"
  },
  "m10.memory": {
   "columns": {
    "order_id": {
     "before_mb": 8.0,
     "after_mb": 4.0,
     "before_type": "int64",
     "after_type": "int32"
    },
    "store": {
     "before_mb": 13.9,
     "after_mb": 1.0,
     "before_type": "str",
     "after_type": "category"
    },
    "status": {
     "before_mb": 15.0,
     "after_mb": 1.0,
     "before_type": "str",
     "after_type": "category"
    },
    "qty": {
     "before_mb": 8.0,
     "after_mb": 1.0,
     "before_type": "int64",
     "after_type": "int8"
    },
    "total_cents": {
     "before_mb": 8.0,
     "after_mb": 4.0,
     "before_type": "int64",
     "after_type": "int32"
    },
    "total": {
     "before_mb": 52.9,
     "after_mb": 11.0,
     "before_type": null,
     "after_type": null
    }
   },
   "rows": 1000000
  },
  "m10.concurrency": {
   "builds": {
    "regular": {
     "gil": true,
     "cores": 4,
     "waiting": {
      "one after another": 2.0,
      "8 threads": 0.25,
      "4 processes": 0.53,
      "asyncio": 0.25
     },
     "computing": {
      "one after another": 4.35,
      "8 threads": 3.95,
      "4 processes": 1.86
     }
    },
    "free-threaded": {
     "gil": false,
     "cores": 4,
     "waiting": {
      "one after another": 2.0,
      "8 threads": 0.25,
      "4 processes": 0.57,
      "asyncio": 0.25
     },
     "computing": {
      "one after another": 3.61,
      "8 threads": 1.28,
      "4 processes": 1.33
     }
    }
   },
   "note": "the waiting jobs sleep 0.25 s (a stand-in for a network call), the computing jobs add up numbers. Each time is the median of 3 runs on a 4 core machine that other programs were also using."
  },
  "m11.validate": {
   "rows": [
    {
     "order_id": "O-1",
     "store": "London",
     "qty": "2",
     "total_cents": "1250",
     "ordered_at": "2026-03-14T08:15:00"
    },
    {
     "order_id": "O-2",
     "store": "Singapore",
     "qty": "1",
     "total_cents": "475",
     "ordered_at": "2026-03-14T09:02:00"
    },
    {
     "order_id": "O-3",
     "store": "Paris",
     "qty": "1",
     "total_cents": "820",
     "ordered_at": "2026-03-14T09:30:00"
    },
    {
     "order_id": "O-4",
     "store": "London",
     "qty": "3",
     "total_cents": "1990",
     "ordered_at": "2026-03-14T10:11:00"
    },
    {
     "order_id": "O-5",
     "store": "London",
     "qty": "1",
     "total_cents": "12,50",
     "ordered_at": "2026-03-14T10:40:00"
    },
    {
     "order_id": "O-6",
     "store": "Singapore",
     "qty": "2",
     "total_cents": "3100",
     "ordered_at": "2026-03-14T11:05:00",
     "coupon": "SPRING"
    },
    {
     "order_id": "O-7",
     "store": "Singapore",
     "qty": "0",
     "total_cents": "640",
     "ordered_at": "2026-03-14T11:30:00"
    },
    {
     "order_id": "O-8",
     "store": "London",
     "qty": "1",
     "total_cents": "900",
     "ordered_at": "2026-03-14T12:00:00"
    },
    {
     "order_id": "O-8",
     "store": "London",
     "qty": "1",
     "total_cents": "900",
     "ordered_at": "2026-03-14T12:00:00"
    },
    {
     "order_id": "O-10",
     "store": "Singapore",
     "qty": "4",
     "total_cents": "2200",
     "ordered_at": "2026-03-14T12:45:00"
    }
   ],
   "models": {
    "lax": {
     "good": [
      "O-1",
      "O-2",
      "O-4",
      "O-6",
      "O-8",
      "O-10"
     ],
     "quarantine": [
      {
       "line": 4,
       "order_id": "O-3",
       "why": "store: Input should be 'London' or 'Singapore'"
      },
      {
       "line": 6,
       "order_id": "O-5",
       "why": "total_cents: Input should be a valid integer, unable to parse string as an integer"
      },
      {
       "line": 8,
       "order_id": "O-7",
       "why": "qty: Input should be greater than or equal to 1"
      },
      {
       "line": 10,
       "order_id": "O-8",
       "why": "order_id: already seen in this file"
      }
     ]
    },
    "strict": {
     "good": [],
     "quarantine": [
      {
       "line": 2,
       "order_id": "O-1",
       "why": "qty: Input should be a valid integer; total_cents: Input should be a valid integer; ordered_at: Input should be a valid datetime"
      },
      {
       "line": 3,
       "order_id": "O-2",
       "why": "qty: Input should be a valid integer; total_cents: Input should be a valid integer; ordered_at: Input should be a valid datetime"
      },
      {
       "line": 4,
       "order_id": "O-3",
       "why": "store: Input should be 'London' or 'Singapore'; qty: Input should be a valid integer; total_cents: Input should be a valid integer; ordered_at: Input should be a valid datetime"
      },
      {
       "line": 5,
       "order_id": "O-4",
       "why": "qty: Input should be a valid integer; total_cents: Input should be a valid integer; ordered_at: Input should be a valid datetime"
      },
      {
       "line": 6,
       "order_id": "O-5",
       "why": "qty: Input should be a valid integer; total_cents: Input should be a valid integer; ordered_at: Input should be a valid datetime"
      },
      {
       "line": 7,
       "order_id": "O-6",
       "why": "qty: Input should be a valid integer; total_cents: Input should be a valid integer; ordered_at: Input should be a valid datetime"
      },
      {
       "line": 8,
       "order_id": "O-7",
       "why": "qty: Input should be a valid integer; total_cents: Input should be a valid integer; ordered_at: Input should be a valid datetime"
      },
      {
       "line": 9,
       "order_id": "O-8",
       "why": "qty: Input should be a valid integer; total_cents: Input should be a valid integer; ordered_at: Input should be a valid datetime"
      },
      {
       "line": 10,
       "order_id": "O-8",
       "why": "qty: Input should be a valid integer; total_cents: Input should be a valid integer; ordered_at: Input should be a valid datetime"
      },
      {
       "line": 11,
       "order_id": "O-10",
       "why": "qty: Input should be a valid integer; total_cents: Input should be a valid integer; ordered_at: Input should be a valid datetime"
      }
     ]
    },
    "forbid extra columns": {
     "good": [
      "O-1",
      "O-2",
      "O-4",
      "O-8",
      "O-10"
     ],
     "quarantine": [
      {
       "line": 4,
       "order_id": "O-3",
       "why": "store: Input should be 'London' or 'Singapore'"
      },
      {
       "line": 6,
       "order_id": "O-5",
       "why": "total_cents: Input should be a valid integer, unable to parse string as an integer"
      },
      {
       "line": 7,
       "order_id": "O-6",
       "why": "coupon: Extra inputs are not permitted"
      },
      {
       "line": 8,
       "order_id": "O-7",
       "why": "qty: Input should be greater than or equal to 1"
      },
      {
       "line": 10,
       "order_id": "O-8",
       "why": "order_id: already seen in this file"
      }
     ]
    }
   },
   "policies": [
    "fail on the first bad row",
    "quarantine, fail above 20 percent",
    "quarantine, fail above 50 percent",
    "drop bad rows silently"
   ],
   "cells": {
    "lax": {
     "fail on the first bad row": {
      "loaded": 0,
      "quarantined": 1,
      "dropped": 0,
      "status": "failed at line 4: store: Input should be 'London' or 'Singapore'"
     },
     "quarantine, fail above 20 percent": {
      "loaded": 0,
      "quarantined": 4,
      "dropped": 0,
      "status": "failed: 40% of the rows are bad (limit 20%)"
     },
     "quarantine, fail above 50 percent": {
      "loaded": 6,
      "quarantined": 4,
      "dropped": 0,
      "status": "loaded, 40% in quarantine (limit 50%)"
     },
     "drop bad rows silently": {
      "loaded": 6,
      "quarantined": 0,
      "dropped": 4,
      "status": "success, and nobody is told that 4 rows were dropped"
     }
    },
    "strict": {
     "fail on the first bad row": {
      "loaded": 0,
      "quarantined": 1,
      "dropped": 0,
      "status": "failed at line 2: qty: Input should be a valid integer; total_cents: Input should be a valid integer; ordered_at: Input should be a valid datetime"
     },
     "quarantine, fail above 20 percent": {
      "loaded": 0,
      "quarantined": 10,
      "dropped": 0,
      "status": "failed: 100% of the rows are bad (limit 20%)"
     },
     "quarantine, fail above 50 percent": {
      "loaded": 0,
      "quarantined": 10,
      "dropped": 0,
      "status": "failed: 100% of the rows are bad (limit 50%)"
     },
     "drop bad rows silently": {
      "loaded": 0,
      "quarantined": 0,
      "dropped": 10,
      "status": "success, and nobody is told that 10 rows were dropped"
     }
    },
    "forbid extra columns": {
     "fail on the first bad row": {
      "loaded": 0,
      "quarantined": 1,
      "dropped": 0,
      "status": "failed at line 4: store: Input should be 'London' or 'Singapore'"
     },
     "quarantine, fail above 20 percent": {
      "loaded": 0,
      "quarantined": 5,
      "dropped": 0,
      "status": "failed: 50% of the rows are bad (limit 20%)"
     },
     "quarantine, fail above 50 percent": {
      "loaded": 5,
      "quarantined": 5,
      "dropped": 0,
      "status": "loaded, 50% in quarantine (limit 50%)"
     },
     "drop bad rows silently": {
      "loaded": 5,
      "quarantined": 0,
      "dropped": 5,
      "status": "success, and nobody is told that 5 rows were dropped"
     }
    }
   },
   "note": "every case is a run of validate() from lessons/m11/validate_or_quarantine.py with a changed pydantic model (lax is the default, strict rejects text for numbers, forbid rejects columns that are not in the model). The policies are computed from those results."
  },
  "m12.mutants": {
   "mutants": [
    {
     "name": "is_large: >= becomes >",
     "old": "total_cents >= limit_cents",
     "new": "total_cents > limit_cents"
    },
    {
     "name": "discount: qty >= 10 becomes > 10",
     "old": "qty >= 10",
     "new": "qty > 10"
    },
    {
     "name": "discount: the cap 5,000 becomes 50,000",
     "old": "5_000)",
     "new": "50_000)"
    },
    {
     "name": "clean_store: title() becomes upper()",
     "old": ".title()",
     "new": ".upper()"
    },
    {
     "name": "clean_store: an empty name is no longer None",
     "old": "return name or None",
     "new": "return name"
    },
    {
     "name": "to_cents: the scale 100 becomes 10",
     "old": "amount * 100",
     "new": "amount * 10"
    },
    {
     "name": "to_cents: the decimals check is inverted",
     "old": "amount != amount.quantize",
     "new": "amount == amount.quantize"
    }
   ],
   "suites": {
    "test_weak.py": {
     "caught": 4,
     "total": 7,
     "survived": [
      "is_large: >= becomes >",
      "discount: qty >= 10 becomes > 10",
      "discount: the cap 5,000 becomes 50,000"
     ]
    },
    "test_strong.py": {
     "caught": 7,
     "total": 7,
     "survived": []
    }
   },
   "coverage": {
    "weak": {
     "statements": 18,
     "missed": 0,
     "percent": 100,
     "tests": 4
    },
    "strong": {
     "statements": 18,
     "missed": 0,
     "percent": 100,
     "tests": 18
    }
   }
  },
  "m13.config": {
   "layers": [
    "config file",
    "environment variable",
    "command line flags"
   ],
   "defaults": {
    "api_url": "https://api.brewline.example/orders",
    "batch_size": "1000",
    "dry_run": "False"
   },
   "file": {
    "api_url": "https://staging.brewline.example/orders",
    "batch_size": "500"
   },
   "env": {
    "batch_size": "200"
   },
   "args": {
    "batch_size": "50",
    "dry_run": "True"
   },
   "cells": {
    "0|0|0": {
     "api_url": {
      "value": "https://api.brewline.example/orders",
      "source": "default"
     },
     "batch_size": {
      "value": "1000",
      "source": "default"
     },
     "dry_run": {
      "value": "False",
      "source": "default"
     }
    },
    "0|0|1": {
     "api_url": {
      "value": "https://api.brewline.example/orders",
      "source": "default"
     },
     "batch_size": {
      "value": "50",
      "source": "command line"
     },
     "dry_run": {
      "value": "True",
      "source": "command line"
     }
    },
    "0|1|0": {
     "api_url": {
      "value": "https://api.brewline.example/orders",
      "source": "default"
     },
     "batch_size": {
      "value": "200",
      "source": "environment"
     },
     "dry_run": {
      "value": "False",
      "source": "default"
     }
    },
    "0|1|1": {
     "api_url": {
      "value": "https://api.brewline.example/orders",
      "source": "default"
     },
     "batch_size": {
      "value": "50",
      "source": "command line"
     },
     "dry_run": {
      "value": "True",
      "source": "command line"
     }
    },
    "1|0|0": {
     "api_url": {
      "value": "https://staging.brewline.example/orders",
      "source": "config file"
     },
     "batch_size": {
      "value": "500",
      "source": "config file"
     },
     "dry_run": {
      "value": "False",
      "source": "default"
     }
    },
    "1|0|1": {
     "api_url": {
      "value": "https://staging.brewline.example/orders",
      "source": "config file"
     },
     "batch_size": {
      "value": "50",
      "source": "command line"
     },
     "dry_run": {
      "value": "True",
      "source": "command line"
     }
    },
    "1|1|0": {
     "api_url": {
      "value": "https://staging.brewline.example/orders",
      "source": "config file"
     },
     "batch_size": {
      "value": "200",
      "source": "environment"
     },
     "dry_run": {
      "value": "False",
      "source": "default"
     }
    },
    "1|1|1": {
     "api_url": {
      "value": "https://staging.brewline.example/orders",
      "source": "config file"
     },
     "batch_size": {
      "value": "50",
      "source": "command line"
     },
     "dry_run": {
      "value": "True",
      "source": "command line"
     }
    }
   },
   "note": "every case is a call of load_config() from lessons/m13/config_precedence.py with the layers that are switched on"
  },
  "m14.tests": {
   "tangled": {
    "tests": 1,
    "lines": 14,
    "fixtures": 2
   },
   "core": {
    "tests": 3,
    "lines": 10,
    "fixtures": 0
   },
   "note": "counted with the ast module: the number of test functions, their total lines, and their parameters (pytest fixtures such as tmp_path and capsys)"
  }
 }
};
