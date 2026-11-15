window.LAB = window.LAB || {};
LAB.real = {
 "counts": {
  "basics.history_count": {
   "rows": 10,
   "with_size": 4
  },
  "basics.kernel": {
   "container": "6.18.44-fc-v470",
   "container_os": "Alpine Linux v3.22",
   "host": "6.18.44-fc-v470",
   "host_os": "Ubuntu 24.04.5 LTS",
   "same": true
  },
  "basics.layers.alpine:3.22": {
   "layers": 1,
   "size": 12766248
  },
  "basics.layers.postgres:16-alpine": {
   "layers": 11,
   "size": 419577300
  },
  "basics.layers.python:3.13-slim": {
   "layers": 4,
   "size": 176193475
  },
  "basics.life": {
   "exit_code": 0,
   "logs_after_exit": "done"
  },
  "basics.processes": {
   "in_container": 1,
   "on_host": 97
  },
  "basics.stop": {
   "exit_code": 137,
   "status": "exited"
  },
  "basics.tty": {
   "rc": 1
  },
  "build.check": {
   "rc": 1,
   "warnings": 5
  },
  "build.context": {
   "junk_bytes": 41943040,
   "junk_files": 20,
   "with_ignore": "5.01kB",
   "without_ignore": "41.96MB"
  },
  "build.image": {
   "base_size": 176193475,
   "psycopg_inside": "3.3.8",
   "size": 217956608
  },
  "compose.down": {
   "networks_after_down": [],
   "volumes_after_down": [
    "dkc-stack_pgdata"
   ]
  },
  "compose.down_v": {
   "volumes_after_down_v": []
  },
  "compose.objects": {
   "networks_while_up": [
    "dkc-stack_default"
   ],
   "volumes_while_up": [
    "dkc-stack_pgdata"
   ]
  },
  "compose.profiles": {
   "job_rc": 0,
   "services_after_up": [
    "db"
   ]
  },
  "compose.race": {
   "exit_code": 1,
   "loader_failed": true
  },
  "compose.up": {
   "loader_exit_code": 0
  },
  "jobs.cpus": {
   "cpus_0_5": {
    "cpu_count": 4,
    "process_cpu_count": 4
   },
   "cpuset_0": {
    "cpu_count": 4,
    "process_cpu_count": 1
   },
   "no_limit": {
    "cpu_count": 4,
    "process_cpu_count": 4
   }
  },
  "jobs.limit_seen": {
   "inside": 67108864
  },
  "jobs.logs": {
   "driver_and_options": "json-file {\"max-file\":\"2\",\"max-size\":\"20k\"}",
   "kept_with_rotation": 243,
   "kept_without_rotation": 3000,
   "printed": 3000
  },
  "jobs.tz": {
   "default": "UTC +0000",
   "host": "UTC +0000",
   "with_TZ": "IST +0530"
  },
  "net.byname": {
   "rc": 0
  },
  "net.default": {
   "network": "bridge",
   "ping_by_ip_rc": 0,
   "resolve_by_name_rc": 2
  },
  "net.localhost": {
   "rc": 1
  },
  "net.modes": {
   "interfaces_bridge": 2,
   "interfaces_host": 6,
   "interfaces_none": 1
  },
  "net.ports": {
   "host_reaches_p1": true,
   "host_reaches_p3_from_localhost_15434": false,
   "p1_listens_on": "127.0.0.1:15432",
   "p2_listens_on": "0.0.0.0:15433"
  },
  "net.recreate": {
   "address_changed": true,
   "name_still_resolves": true
  },
  "net.user": {
   "dns_server": true,
   "resolve_by_name_rc": 0
  },
  "registry.facts": {
   "latest_moved": true,
   "local_stale_until_pull": true,
   "ran_after_pull": "this is build 2",
   "run_by_digest": "this is build 1",
   "same_digest_1_0_and_latest_before": true,
   "tag_1_0_unchanged": true
  },
  "registry.platforms": {
   "attestations": true,
   "image": "python:3.13-slim",
   "platforms": [
    "linux/386",
    "linux/amd64",
    "linux/arm/v5",
    "linux/arm/v7",
    "linux/arm64/v8",
    "linux/ppc64le",
    "linux/riscv64",
    "linux/s390x"
   ]
  },
  "registry.save": {
   "has_index_json": true,
   "members": 13,
   "runs_after_load": "this is build 2",
   "tar_bytes": 3810816
  },
  "sec.caps": {
   "default_count": 14,
   "default_hex": "00000000a80425fb",
   "dropped_count": 0,
   "dropped_hex": "0000000000000000",
   "privileged_count": 40,
   "privileged_hex": "000001fffeffffff"
  },
  "sec.chown": {
   "cap_drop_all_error": "chown: /f: Operation not permitted",
   "cap_drop_all_rc": 1,
   "default_rc": 0
  },
  "sec.dotenv": {
   "with_ignore_error": "cat: /app/.env: No such file or directory",
   "with_ignore_rc": 1,
   "without_ignore_content": "DATABASE_URL=postgresql://postgres:brewline-prod-secret@db/brewline",
   "without_ignore_rc": 0
  },
  "sec.leak": {
   "arg_in_history": true,
   "env_in_history": true,
   "env_in_inspect": true
  },
  "sec.pin": {
   "digest_prefix": "sha256:e48f59cdba69",
   "reference": "python"
  },
  "sec.readonly": {
   "rc_with_tmpfs": 0,
   "rc_without_tmpfs": 1,
   "with_tmpfs_output": "written"
  },
  "sec.root_write": {
   "rc": 0
  },
  "sec.run_env": {
   "visible_in_inspect": true
  },
  "sec.secretmount": {
   "files_that_contain_the_token": [],
   "note": "token has 24 bytes",
   "token_in_history": false
  },
  "sec.socket": {
   "container_sees_host_container": true,
   "image": "docker:cli",
   "reads_host_file": true
  },
  "sec.user": {
   "default_image": "uid=0(root) gid=0(root) groups=0(root)",
   "nonroot_image": "uid=10001(app) gid=10001(app) groups=10001(app)"
  },
  "small.heavy": {
   "alpine": {
    "ok": true,
    "pandas": "3.1.1 26.0.1",
    "size": 602004678
   },
   "slim": {
    "ok": true,
    "pandas": "3.1.1 26.0.1",
    "size": 656467005
   }
  },
  "small.rm": {
   "base": 12766248,
   "file_bytes": 52428800,
   "later_layer": 65262983,
   "same_layer": 12770324
  },
  "small.stages": {
   "default_build_ran_pytest": false,
   "default_build_steps": 4,
   "pytest_in_runtime": "False",
   "pytest_in_test": "True",
   "runtime_image_size": 217894344,
   "test_image_size": 239250778
  },
  "volumes.anonymous": {
   "dangling_volumes_left_by_rm": 1,
   "mounts": "volume /var/lib/postgresql/data"
  },
  "volumes.backup": {
   "files_in_volume": 24,
   "tar_bytes": true
  },
  "volumes.bind": {
   "files_in_host_dir": 24,
   "owner_of_pg_version_on_host": "70:70 600"
  },
  "volumes.perms": {
   "file_owner_written_by_root_in_container": "0:0",
   "non_root_write_error": "sh: can't create /out/second.txt: Permission denied",
   "non_root_write_rc": 1
  },
  "volumes.rows_before": {
   "rows": 5000
  }
 },
 "files": {
  "app/.dockerignore": "data/\n.git/\n__pycache__/\n*.pyc\n.env\n",
  "app/Dockerfile": "FROM python:3.13-slim\nWORKDIR /app\nCOPY requirements.txt .\nRUN pip install --no-cache-dir -r requirements.txt\nCOPY load_orders.py worker.py ./\nCMD [\"python\", \"load_orders.py\", \"/data/orders.csv\"]\n",
  "app/Dockerfile.bad": "FORM python:3.13-slim\nCOPY requirements.txt .\n",
  "app/Dockerfile.copy_first": "FROM python:3.13-slim\nWORKDIR /app\nCOPY . .\nRUN pip install --no-cache-dir -r requirements.txt\nCMD [\"python\", \"load_orders.py\", \"/data/orders.csv\"]\n",
  "app/Dockerfile.entry": "FROM alpine:3.22\nENTRYPOINT [\"echo\", \"entrypoint:\"]\nCMD [\"default argument\"]\n",
  "app/Dockerfile.heavy": "ARG BASE=python:3.13-slim\nFROM ${BASE}\nWORKDIR /app\nCOPY requirements-heavy.txt .\nRUN pip install --no-cache-dir -r requirements-heavy.txt\n",
  "app/Dockerfile.leaky": "FROM alpine:3.22\nARG API_TOKEN\nENV PARTNER_TOKEN=brewline-demo-token-4711\nRUN echo \"token has ${#API_TOKEN} characters\" > /tmp/note.txt\n",
  "app/Dockerfile.lint": "FROM python:3.13-slim\nmaintainer Brewline Data\nWORKDIR app\nENV PYTHONUNBUFFERED 1\nCOPY . .\nRUN pip install -r requirements.txt\nCMD python load_orders.py /data/orders.csv\n",
  "app/Dockerfile.multistage": "FROM python:3.13-slim AS base\nWORKDIR /app\nCOPY requirements.txt .\nRUN pip install --no-cache-dir -r requirements.txt\n\nFROM base AS test\nCOPY requirements-dev.txt .\nRUN pip install --no-cache-dir -r requirements-dev.txt\nCOPY load_orders.py test_load_orders.py ./\nRUN python -m pytest -q\n\nFROM base AS runtime\nCOPY load_orders.py worker.py ./\nCMD [\"python\", \"load_orders.py\", \"/data/orders.csv\"]\n",
  "app/Dockerfile.nonroot": "FROM python:3.13-slim\nRUN useradd --create-home --uid 10001 app\nWORKDIR /app\nCOPY requirements.txt .\nRUN pip install --no-cache-dir -r requirements.txt\nCOPY --chown=app:app load_orders.py worker.py ./\nUSER app\nCMD [\"python\", \"load_orders.py\", \"/data/orders.csv\"]\n",
  "app/Dockerfile.registry": "FROM alpine:3.22\nARG BUILD=1\nLABEL build=$BUILD\nRUN echo \"this is build $BUILD\" > /build.txt\nCMD [\"cat\", \"/build.txt\"]\n",
  "app/Dockerfile.rm_later": "FROM alpine:3.22\nRUN dd if=/dev/zero of=/tmp/export.bin bs=1M count=50\nRUN rm /tmp/export.bin\n",
  "app/Dockerfile.rm_same": "FROM alpine:3.22\nRUN dd if=/dev/zero of=/tmp/export.bin bs=1M count=50 && rm /tmp/export.bin\n",
  "app/Dockerfile.secretmount": "# syntax=docker/dockerfile:1\nFROM alpine:3.22\nRUN --mount=type=secret,id=partner_token \\\n    echo \"token has $(wc -c < /run/secrets/partner_token) bytes\" > /tmp/note.txt\n",
  "app/load_orders.py": "\"\"\"Load one file of Brewline orders into Postgres. Running it twice does no harm.\"\"\"\nimport csv\nimport os\nimport sys\n\nimport psycopg\n\nSCHEMA = \"\"\"\nCREATE TABLE IF NOT EXISTS orders (\n    order_id   integer PRIMARY KEY,\n    store_id   text NOT NULL,\n    order_date date NOT NULL,\n    amount     numeric(10, 2) NOT NULL\n)\n\"\"\"\n\n\ndef read_rows(path):\n    with open(path, newline=\"\") as f:\n        return [(int(r[\"order_id\"]), r[\"store_id\"], r[\"order_date\"], r[\"amount\"])\n                for r in csv.DictReader(f)]\n\n\ndef main(path):\n    rows = read_rows(path)\n    with psycopg.connect(os.environ[\"DATABASE_URL\"]) as con:\n        con.execute(SCHEMA)\n        with con.cursor() as cur:\n            cur.executemany(\n                \"INSERT INTO orders VALUES (%s, %s, %s, %s) ON CONFLICT (order_id) DO NOTHING\",\n                rows)\n        total = con.execute(\"SELECT count(*) FROM orders\").fetchone()[0]\n    print(f\"read {len(rows)} rows from {path}, the table now has {total}\")\n\n\nif __name__ == \"__main__\":\n    main(sys.argv[1])\n",
  "app/requirements-dev.txt": "-r requirements.txt\npytest==9.2.0\n",
  "app/requirements-heavy.txt": "psycopg[binary]==3.3.8\npandas==3.1.1\nnumpy==2.5.4\npyarrow==26.0.1\n",
  "app/requirements.txt": "psycopg[binary]==3.3.8\n",
  "app/test_load_orders.py": "from load_orders import read_rows\n\n\ndef test_read_rows_types(tmp_path):\n    p = tmp_path / \"orders.csv\"\n    p.write_text(\"order_id,store_id,order_date,amount\\n7,s03,2026-03-02,12.50\\n\")\n    assert read_rows(str(p)) == [(7, \"s03\", \"2026-03-02\", \"12.50\")]\n\n\ndef test_read_rows_empty(tmp_path):\n    p = tmp_path / \"orders.csv\"\n    p.write_text(\"order_id,store_id,order_date,amount\\n\")\n    assert read_rows(str(p)) == []\n",
  "app/worker.py": "\"\"\"A job that runs until it is stopped. With HANDLE_TERM=1 it finishes its batch when it gets SIGTERM.\"\"\"\nimport os\nimport signal\nimport sys\nimport time\n\n\ndef stop(signum, frame):\n    print(\"got SIGTERM, finishing the batch\", flush=True)\n    sys.exit(0)\n\n\nif os.environ.get(\"HANDLE_TERM\") == \"1\":\n    signal.signal(signal.SIGTERM, stop)\n\nprint(\"worker started as process\", os.getpid(), flush=True)\nwhile True:\n    time.sleep(0.2)\n",
  "compose.nohealth.yaml": "services:\n  db:\n    image: postgres:16-alpine\n    environment:\n      POSTGRES_PASSWORD: brewline-dev\n      POSTGRES_DB: brewline\n\n  loader:\n    build: ./app\n    depends_on:\n      - db\n    environment:\n      DATABASE_URL: postgresql://postgres:brewline-dev@db:5432/brewline\n    volumes:\n      - ./data:/data:ro\n",
  "compose.profiles.yaml": "services:\n  db:\n    image: postgres:16-alpine\n    environment:\n      POSTGRES_PASSWORD: brewline-dev\n      POSTGRES_DB: brewline\n    healthcheck:\n      test: [\"CMD-SHELL\", \"pg_isready -h 127.0.0.1 -U postgres -d brewline\"]\n      interval: 2s\n      timeout: 3s\n      retries: 15\n\n  loader:\n    build: ./app\n    profiles: [\"jobs\"]\n    depends_on:\n      db:\n        condition: service_healthy\n    environment:\n      DATABASE_URL: postgresql://postgres:brewline-dev@db:5432/brewline\n    volumes:\n      - ./data:/data:ro\n",
  "compose.yaml": "services:\n  db:\n    image: postgres:16-alpine\n    environment:\n      POSTGRES_PASSWORD: brewline-dev\n      POSTGRES_DB: brewline\n    volumes:\n      - pgdata:/var/lib/postgresql/data\n    healthcheck:\n      test: [\"CMD-SHELL\", \"pg_isready -h 127.0.0.1 -U postgres -d brewline\"]\n      interval: 2s\n      timeout: 3s\n      retries: 15\n\n  loader:\n    build: ./app\n    depends_on:\n      db:\n        condition: service_healthy\n    environment:\n      DATABASE_URL: postgresql://postgres:brewline-dev@db:5432/brewline\n    volumes:\n      - ./data:/data:ro\n\nvolumes:\n  pgdata:\n",
  "data/orders.csv (first rows)": "order_id,store_id,order_date,amount\n1,s05,2026-03-13,35.53\n2,s09,2026-03-08,31.47\n3,s04,2026-03-16,27.31\n4,s04,2026-03-25,9.60\n5,s03,2026-03-14,28.31\n"
 },
 "meta": {
  "alpine_image": "alpine:3.22",
  "arch": "x86_64",
  "buildx": "v0.38.1",
  "cgroup_version": "1",
  "compose": "5.6.1",
  "cpus": 4,
  "docker_api": "1.56",
  "docker_client": "29.9.2",
  "docker_engine": "29.9.2",
  "host_os": "Ubuntu 24.04.5 LTS",
  "kernel": "6.18.44-fc-v470",
  "pandas": "3.1.1",
  "postgres_image": "postgres:16-alpine",
  "postgres_version": "16.16",
  "psycopg": "3.3.8",
  "python_image": "python:3.13-slim",
  "python_version": "3.13.18",
  "recorded_on": "2026-11-15",
  "snapshotter": "containerd",
  "storage_driver": "overlayfs"
 },
 "tables": {
  "basics.history": {
   "cols": [
    "Size",
    "Instruction that made the layer"
   ],
   "rows": [
    [
     "0B",
     "CMD [\"python3\"]"
    ],
    [
     "16.4kB",
     "RUN /bin/sh -c set -eux; for src in idle3 pip3 pydoc3 python3 python3…"
    ],
    [
     "40.5MB",
     "RUN /bin/sh -c set -eux; savedAptMark=\"$(apt-mark showmanual)\"; apt-g…"
    ],
    [
     "0B",
     "ENV PYTHON_SHA256=abb0102e6d4ae027509bcb82327d9dd85515b44a3ba8ad538cf…"
    ],
    [
     "0B",
     "ENV PYTHON_VERSION=3.13.18"
    ],
    [
     "0B",
     "ENV GPG_KEY=7169605F62C751356D054A26A821E680E5FA6305"
    ],
    [
     "4.93MB",
     "RUN /bin/sh -c set -eux; apt-get update; apt-get install -y --no-inst…"
    ],
    [
     "0B",
     "ENV LANG=C.UTF-8"
    ],
    [
     "0B",
     "ENV PATH=/usr/local/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr…"
    ],
    [
     "87.7MB",
     "# debian.sh --arch 'amd64' out/ 'trixie' '@1793827419'"
    ]
   ]
  },
  "basics.states": {
   "cols": [
    "What you do",
    "State you expect",
    "State recorded"
   ],
   "rows": [
    [
     "docker create",
     "created",
     "created"
    ],
    [
     "docker start",
     "running",
     "running"
    ],
    [
     "the command ends",
     "exited",
     "exited"
    ],
    [
     "docker rm",
     "gone",
     "gone"
    ]
   ]
  },
  "build.history": {
   "cols": [
    "Size",
    "Instruction"
   ],
   "rows": [
    [
     "0B",
     "CMD [\"python\" \"load_orders.py\" \"/data/orders.csv\"]"
    ],
    [
     "32.2MB",
     "RUN /bin/sh -c pip install --no-cache-dir -r requirements.txt"
    ],
    [
     "90.1kB",
     "COPY . ."
    ],
    [
     "8.19kB",
     "WORKDIR /app"
    ],
    [
     "0B",
     "CMD [\"python3\"]"
    ],
    [
     "16.4kB",
     "RUN /bin/sh -c set -eux; for src in idle3 pip3 pydoc3 python3 python3…"
    ]
   ]
  },
  "cache.steps": {
   "cols": [
    "order",
    "change",
    "step",
    "instruction",
    "cached"
   ],
   "rows": [
    [
     "copy first",
     "nothing",
     1,
     "WORKDIR /app",
     true
    ],
    [
     "copy first",
     "nothing",
     2,
     "COPY . .",
     true
    ],
    [
     "copy first",
     "nothing",
     3,
     "RUN pip install --no-cache-dir -r requirements.txt",
     true
    ],
    [
     "copy first",
     "one line of load_orders.py",
     1,
     "WORKDIR /app",
     true
    ],
    [
     "copy first",
     "one line of load_orders.py",
     2,
     "COPY . .",
     false
    ],
    [
     "copy first",
     "one line of load_orders.py",
     3,
     "RUN pip install --no-cache-dir -r requirements.txt",
     false
    ],
    [
     "copy first",
     "requirements.txt",
     1,
     "WORKDIR /app",
     true
    ],
    [
     "copy first",
     "requirements.txt",
     2,
     "COPY . .",
     false
    ],
    [
     "copy first",
     "requirements.txt",
     3,
     "RUN pip install --no-cache-dir -r requirements.txt",
     false
    ],
    [
     "dependencies first",
     "nothing",
     1,
     "WORKDIR /app",
     true
    ],
    [
     "dependencies first",
     "nothing",
     2,
     "COPY requirements.txt .",
     true
    ],
    [
     "dependencies first",
     "nothing",
     3,
     "RUN pip install --no-cache-dir -r requirements.txt",
     true
    ],
    [
     "dependencies first",
     "nothing",
     4,
     "COPY load_orders.py worker.py ./",
     true
    ],
    [
     "dependencies first",
     "one line of load_orders.py",
     1,
     "WORKDIR /app",
     true
    ],
    [
     "dependencies first",
     "one line of load_orders.py",
     2,
     "COPY requirements.txt .",
     true
    ],
    [
     "dependencies first",
     "one line of load_orders.py",
     3,
     "RUN pip install --no-cache-dir -r requirements.txt",
     true
    ],
    [
     "dependencies first",
     "one line of load_orders.py",
     4,
     "COPY load_orders.py worker.py ./",
     false
    ],
    [
     "dependencies first",
     "requirements.txt",
     1,
     "WORKDIR /app",
     true
    ],
    [
     "dependencies first",
     "requirements.txt",
     2,
     "COPY requirements.txt .",
     false
    ],
    [
     "dependencies first",
     "requirements.txt",
     3,
     "RUN pip install --no-cache-dir -r requirements.txt",
     false
    ],
    [
     "dependencies first",
     "requirements.txt",
     4,
     "COPY load_orders.py worker.py ./",
     false
    ]
   ]
  },
  "cache.summary": {
   "cols": [
    "order",
    "change",
    "steps",
    "steps that ran again",
    "pip ran again"
   ],
   "rows": [
    [
     "copy first",
     "nothing",
     3,
     0,
     false
    ],
    [
     "copy first",
     "one line of load_orders.py",
     3,
     2,
     true
    ],
    [
     "copy first",
     "requirements.txt",
     3,
     2,
     true
    ],
    [
     "dependencies first",
     "nothing",
     4,
     0,
     false
    ],
    [
     "dependencies first",
     "one line of load_orders.py",
     4,
     1,
     false
    ],
    [
     "dependencies first",
     "requirements.txt",
     4,
     3,
     true
    ]
   ]
  },
  "compose.ps": {
   "cols": [
    "service",
    "state",
    "health"
   ],
   "rows": [
    [
     "db",
     "running",
     "healthy"
    ],
    [
     "loader",
     "exited",
     ""
    ]
   ]
  },
  "jobs.entry": {
   "cols": [
    "command",
    "what it prints"
   ],
   "rows": [
    [
     "docker run IMAGE",
     "entrypoint: default argument"
    ],
    [
     "docker run IMAGE other words",
     "entrypoint: other words"
    ],
    [
     "docker run --entrypoint echo IMAGE replaced",
     "replaced"
    ]
   ]
  },
  "jobs.exit": {
   "cols": [
    "what the command does",
    "exit code of docker run"
   ],
   "rows": [
    [
     "exit 0",
     0
    ],
    [
     "exit 3",
     3
    ],
    [
     "a command that does not exist",
     127
    ],
    [
     "a file that is not executable",
     126
    ],
    [
     "docker kill (SIGKILL)",
     137
    ]
   ]
  },
  "jobs.oom": {
   "cols": [
    "memory limit",
    "job allocates",
    "exit code",
    "OOMKilled",
    "what the job printed"
   ],
   "rows": [
    [
     "64m",
     "32 MB",
     0,
     false,
     "allocated 32 MB"
    ],
    [
     "64m",
     "200 MB",
     137,
     true,
     ""
    ],
    [
     "512m",
     "200 MB",
     0,
     false,
     "allocated 200 MB"
    ]
   ]
  },
  "jobs.restart": {
   "cols": [
    "--restart",
    "RestartCount",
    "times the job ran",
    "final state",
    "exit code"
   ],
   "rows": [
    [
     "no",
     0,
     1,
     "exited",
     1
    ],
    [
     "on-failure:3",
     3,
     4,
     "exited",
     1
    ]
   ]
  },
  "jobs.signals": {
   "cols": [
    "how the job starts",
    "process id of the job",
    "stop waited for the 3 second grace period",
    "exit code",
    "the handler ran"
   ],
   "rows": [
    [
     "exec form, no handler",
     1,
     "yes",
     137,
     "no"
    ],
    [
     "exec form, handles SIGTERM",
     1,
     "no",
     0,
     "yes"
    ],
    [
     "shell form (sh -c), handles SIGTERM",
     7,
     "yes",
     137,
     "no"
    ],
    [
     "shell form with exec, handles SIGTERM",
     1,
     "no",
     0,
     "yes"
    ],
    [
     "exec form, no handler, docker run --init",
     7,
     "no",
     143,
     "no"
    ]
   ]
  },
  "registry.steps": {
   "cols": [
    "step",
    "latest in the registry",
    "latest on this machine",
    "what docker run prints"
   ],
   "rows": [
    [
     "build 1 is pushed as 1.0 and latest, and pulled here",
     "938440fdf6bf",
     "938440fdf6bf",
     "this is build 1"
    ],
    [
     "build 2 is pushed as latest and 1.1",
     "6af21fd8b751",
     "938440fdf6bf",
     "this is build 1"
    ],
    [
     "docker pull",
     "6af21fd8b751",
     "6af21fd8b751",
     "this is build 2"
    ]
   ]
  },
  "registry.tags": {
   "cols": [
    "tag",
    "digest (first 12)",
    "what it runs"
   ],
   "rows": [
    [
     "1.0 (never moved)",
     "938440fdf6bf",
     "this is build 1"
    ],
    [
     "1.1",
     "6af21fd8b751",
     "this is build 2"
    ],
    [
     "latest (moved by the second push)",
     "6af21fd8b751",
     "this is build 2"
    ]
   ]
  },
  "small.bases": {
   "cols": [
    "image",
    "size in bytes",
    "layers"
   ],
   "rows": [
    [
     "python:3.13",
     1607233686,
     7
    ],
    [
     "python:3.13-slim",
     176193475,
     4
    ],
    [
     "python:3.13-alpine",
     69866703,
     4
    ]
   ]
  },
  "small.rm_history": {
   "cols": [
    "Size",
    "Instruction"
   ],
   "rows": [
    [
     "8.19kB",
     "RUN /bin/sh -c rm /tmp/export.bin"
    ],
    [
     "52.4MB",
     "RUN /bin/sh -c dd if=/dev/zero of=/tmp/expor…"
    ],
    [
     "0B",
     "CMD [\"/bin/sh\"]"
    ]
   ]
  },
  "volumes.matrix": {
   "cols": [
    "how the data directory is stored",
    "after stop and start",
    "after rm and a new container"
   ],
   "rows": [
    [
     "no volume flag",
     "5000",
     "no table"
    ],
    [
     "named volume",
     "5000",
     "5000"
    ],
    [
     "bind mount of a host folder",
     "5000",
     "5000"
    ],
    [
     "tmpfs (memory)",
     "no table",
     "no table"
    ]
   ]
  }
 },
 "text": {
  "basics.diff": "C /etc\nD /etc/motd\nC /tmp\nA /tmp/a.txt",
  "basics.exec": "PID   COMMAND\n    1 sh -c while true; do echo tick; sleep 1; done\n    9 sleep 1\n   10 ps -o pid,args",
  "basics.hello": "hello from a container",
  "basics.logs": "tick\ntick",
  "basics.ps": "PID   COMMAND\n    1 ps -o pid,args",
  "basics.ps_size": "IMAGE         SIZE\nalpine:3.22   4.1kB (virtual 8.99MB)\nalpine:3.22   4.1kB (virtual 8.99MB)\nalpine:3.22   4.1kB (virtual 8.99MB)",
  "basics.tty": "cannot attach stdin to a TTY-enabled container because stdin is not a terminal",
  "build.bad": "ERROR: failed to build: failed to solve: dockerfile parse error on line 1: unknown instruction: FORM (did you mean FROM?)",
  "build.check": "Check complete, 5 warnings have been found!\n\nWARNING: MaintainerDeprecated - https://docs.docker.com/go/dockerfile/rule/maintainer-deprecated/\nMaintainer instruction is deprecated in favor of using label\nDockerfile.lint:2\n--------------------\n   1 |     FROM python:3.13-slim\n   2 | >>> maintainer Brewline Data\n   3 |     WORKDIR app\n   4 |     ENV PYTHONUNBUFFERED 1\n--------------------\n\nWARNING: ConsistentInstructionCasing - https://docs.docker.com/go/dockerfile/rule/consistent-instruction-casing/\nCommand 'maintainer' should match the case of the command majority (uppercase)\nDockerfile.lint:2\n--------------------\n   1 |     FROM python:3.13-slim\n   2 | >>> maintainer Brewline Data\n   3 |     WORKDIR app\n   4 |     ENV PYTHONUNBUFFERED 1\n--------------------\n\nWARNING: WorkdirRelativePath - https://docs.docker.com/go/dockerfile/rule/workdir-relative-path/\nRelative workdir \"app\" can have unexpected results if the base image changes\nDockerfile.lint:3\n--------------------\n   1 |     FROM python:3.13-slim\n   2 |     maintainer Brewline Data\n   3 | >>> WORKDIR app\n   4 |     ENV PYTHONUNBUFFERED 1\n   5 |     COPY . .\n--------------------\n\nWARNING: LegacyKeyValueFormat - https://docs.docker.com/go/dockerfile/rule/legacy-key-value-format/\n\"ENV key=value\" should be used instead of legacy \"ENV key value\" format\nDockerfile.lint:4\n--------------------\n   2 |     maintainer Brewline Data\n   3 |     WORKDIR app\n   4 | >>> ENV PYTHONUNBUFFERED 1\n   5 |     COPY . .\n   6 |     RUN pip install -r requirements.txt\n--------------------\n\nWARNING: JSONArgsRecommended - https://docs.docker.com/go/dockerfile/rule/json-args-recommended/\nJSON arguments recommended for CMD to prevent unintended behavior related to OS signals\nDockerfile.lint:7\n--------------------\n   5 |     COPY . .\n   6 |     RUN pip install -r requirements.txt\n   7 | >>> CMD python load_orders.py /data/orders.csv\n   8 |     \n--------------------",
  "build.context": "transferring context: 2B done\ntransferring context: 41.96MB 0.2s done\ntransferring context: 76B done\ntransferring context: 5.01kB done",
  "build.nodata": "FileNotFoundError: [Errno 2] No such file or directory: '/data/orders.csv'",
  "compose.again": "read 5000 rows from /data/orders.csv, the table now has 5000",
  "compose.config": "name: dkc-stack\nservices:\n  db:\n    environment:\n      POSTGRES_DB: brewline\n      POSTGRES_PASSWORD: brewline-dev\n    image: postgres:16-alpine\n    networks:\n      default: null\n    volumes:\n      - type: volume\n        source: pgdata\n        target: /var/lib/postgresql/data\n        volume: {}\n    healthcheck:\n      test:\n        - CMD-SHELL\n        - pg_isready -h 127.0.0.1 -U postgres -d brewline\n      timeout: 3s\n      interval: 2s\n      retries: 15\n  loader:\n    environment:\n      DATABASE_URL: postgresql://postgres:brewline-dev@db:5432/brewline\n    networks:\n      default: null\n    volumes:\n      - type: bind\n        source: ./data\n        target: /data\n        read_only: true\n        bind: {}\n    build:\n      context: ./app\n      dockerfile: Dockerfile\n    depends_on:\n      db:\n        condition: service_healthy\n        required: true\nnetworks:\n  default:\n    name: dkc-stack_default\nvolumes:\n  pgdata:\n    name: dkc-stack_pgdata",
  "compose.entrypoint": "297:\tset -- \"$@\" -c listen_addresses='' -p \"${PGPORT:-5432}\"\n299:\t# unset NOTIFY_SOCKET so the temporary server doesn't prematurely notify",
  "compose.job": "read 5000 rows from /data/orders.csv, the table now has 5000",
  "compose.race": "psycopg.OperationalError: connection failed: connection to server at \"172.18.0.2\", port 5432 failed: Connection refused",
  "compose.up": "read 5000 rows from /data/orders.csv, the table now has 5000",
  "net.busy": "Bind for 127.0.0.1:15432 failed: port is already allocated",
  "net.byname": "read 5000 rows from /data/orders.csv, the table now has 5000",
  "net.localhost": "psycopg.OperationalError: connection failed: connection to server at \"127.0.0.1\", port 5432 failed: Connection refused\nIs the server running on that host and accepting TCP/IP connections?",
  "net.port1": "5432/tcp -> 127.0.0.1:15432",
  "net.port2": "5432/tcp -> 0.0.0.0:15433",
  "net.port3": "(nothing published)",
  "net.user": "x.x.x.x        dkc-db  dkc-db\nnameserver 127.0.0.11",
  "net.wrongname": "psycopg.OperationalError: failed to resolve host 'database': [Errno -2] Name or service not known",
  "registry.catalog": "{\"repositories\":[\"brewline/loader\"]}",
  "registry.push": "The push refers to repository [localhost:5000/brewline/loader]\n<layer>: Layer already exists\n<layer>: Already exists\n<layer>: Already exists\n<layer>: Layer already exists\nlatest: digest: sha256:<digest> size: 855",
  "registry.tags_1": "{\"name\":\"brewline/loader\",\"tags\":[\"latest\",\"1.0\"]}",
  "registry.tags_2": "{\"name\":\"brewline/loader\",\"tags\":[\"latest\",\"1.1\",\"1.0\"]}",
  "sec.history_leak": "RUN |1 API_TOKEN=brewline-demo-token-4711 /bin/sh -c echo \"token has ${#API_TOKEN} characters\" > /tmp/note.txt\nENV PARTNER_TOKEN=brewline-demo-token-4711\nARG API_TOKEN=brewline-demo-token-4711",
  "sec.nonroot_write": "touch: cannot touch '/usr/local/x': Permission denied",
  "sec.readonly": "sh: can't create /tmp/a: Read-only file system",
  "small.pytest": "..                                                                       [100%]\n2 passed in 0.0s"
 }
};
