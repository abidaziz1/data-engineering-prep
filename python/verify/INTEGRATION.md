# Python tutorial: what to paste into the hub, the root README and package.json

For the parent. The tutorial itself only touches `python/`, so these parts could not be done from inside it.

## a. The hub card (`index.html`, in the list of ready tutorials)

```html
      <a class="card ready" href="python/index.html">
        <span class="chip ready">Ready</span>
        <h3>Python for data engineers</h3>
        <p>Python in a data platform, environments and uv, data structures and what they cost, generators, files and formats, dates and money, retries and loads that can run twice, APIs and databases, pandas, Polars and DuckDB, speed and the GIL, validation, tests, shipping and design. Fifteen missions with a boss round. Every output was recorded from real runs of Python 3.14 and its libraries, and a fake partner API runs on the machine.</p>
        <div class="paths"><span>Junior path about 8.5 hours</span><span>Senior path about 12 hours</span></div>
        <span class="go">Open the tutorial &rarr;</span>
      </a>
```

In the plan list, turn the chip green: change `<li>Python</li>` to `<li class="ready">Python</li>`.

## b. Root README: the table row

```
| **Python for data engineers**: from a script to a pipeline you can trust | Ready. 15 missions, 3 paths, every output recorded from real runs of Python 3.14, pandas, Polars, DuckDB, SQLite, pydantic, pytest and uv | [`python/`](python/README.md) |
```

## c. Root README: the layout block

```
python/                  one tutorial, same layout, plus
  js/real.js             output, sizes, timings and counts recorded from Python 3.14, pandas, Polars, DuckDB, SQLite, pydantic, pytest, mypy, ruff and uv
  verify/capture_py.py   runs the lesson programs, a fake partner API, benchmarks and a free-threaded build, and writes js/real.js
  verify/verify_py.py    runs every coding round again, checks the controls and the lab logic and, with --recapture, the recording
  verify/check_widgets.js, verify/e2e_labs.js   recompute the 17 labs independently, and drive them in the browser
```

## d. Root README: the honest-notes bullet

```
- **The Python tutorial records one shared machine.** Every output was run on Python 3.14.6 with the library versions in `python/js/real.js`. Timings are medians on a 4-core machine that other programs were using, so the lessons teach ratios and say "on this machine". The partner API is a small fake that runs in a thread, SQLite stands in for a database, a sleep stands in for a network wait in the concurrency lab, and the fifty-client retry lab is a simulation, and each says so on screen. The GitHub workflow file was shown and checked against the SchemaStore schema, and it was not run. Docker, Kubernetes, Great Expectations and the cloud services are not run.
```

## e. Root README: the check tools

```
python3 python/verify/verify_py.py        # Python: lint, every program parses, every coding round runs again, controls, lab logic; --recapture records again
```

Needs the Python 3.14 environment of `python/verify/requirements-py.txt`, for example
`uv run --python 3.14 --with-requirements python/verify/requirements-py.txt python/verify/verify_py.py`.
The recorder and `--recapture` also need `uv`, the free-threaded build (`uv python install 3.14 3.14t`) and access to PyPI. The browser tests need Playwright, as for the other tutorials. There is no `npm install --prefix` step.

## f. package.json scripts

```json
"lint:python": "node dev/lint-content.js python",
"smoke:python": "node dev/smoke.js python --path all",
"e2e:python": "node dev/e2e.js python && node python/verify/e2e_labs.js",
"stats:python": "node dev/stats.js python",
"verify:python": "uv run --python 3.14 --with-requirements python/verify/requirements-py.txt python/verify/verify_py.py",
```

Add `&& node dev/lint-content.js python` to the `lint` script.

## g. dev/requirements.txt

The verifier needs two packages besides the libraries of `requirements-py.txt` (which is pinned to Python 3.14 and stays in `python/verify/`):

```
# python/verify (verify_py.py, for the workflow checks; the recorder uses python/verify/requirements-py.txt):
pyyaml
jsonschema
```

## h. The coach sentence for the root README

"Lena teaches Python." Add it to the sentence about the coaches: "Sam teaches Snowflake, dbt, Databricks, AWS and Snowflake with dbt, Noor teaches Azure, ..., and Lena teaches Python."

## i. CI

`node python/verify/e2e_labs.js` is standalone and needs no arguments. `python/verify/check_widgets.js` is run by `verify_py.py`, and it can also be run alone with `node python/verify/check_widgets.js`.
