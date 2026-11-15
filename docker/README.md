# Docker for data engineers

A guided, press-Next course on the part of Docker that a data engineer uses every week. Coach Otto follows **Brewline**, the coffee retailer, and one small job that loads a day of orders into Postgres. You put it in an image and watch the build cache, lose a database on purpose, find out why a container cannot reach `localhost`, start a stack with Compose, stop a job that ignores SIGTERM, and push an image to a registry and move a tag. Every terminal in the course is real output from a Docker Engine that ran on one machine.

Open **`index.html`** in a browser. No install, no account.

## What is recorded, and what is a stand-in

**Docker Desktop, rootless mode, Podman, Docker Swarm, Kubernetes, cloud registries and image scanners did not run for this course.** Every screen carries one of two tags.

| Tag | What it means |
| --- | --- |
| **Recorded** | Real output written by `docker/verify/capture_dk.py` on one Linux machine: **Docker Engine 29.9.2** (API 1.56, overlayfs with the containerd image store, cgroup version 1, kernel 6.18.44, x86_64, 4 CPUs), **Buildx v0.38.1** and **Docker Compose 5.6.1**. The images came from Docker Hub: `python:3.13-slim` (Python 3.13.18), `python:3.13`, `python:3.13-alpine`, `postgres:16-alpine` (Postgres 16.16), `alpine:3.22`, `registry:2` and `docker:cli`. The job is `load_orders.py` with psycopg 3.3.8, loading 5,000 made-up orders from a fixed rule. The pip installs used pandas 3.1.1, numpy 2.5.4, pyarrow 26.0.1 and pytest 9.2.0 |
| **From documentation** | What Docker does elsewhere or that I did not run: Docker Desktop and the virtual machine behind it on macOS and Windows, rootless mode, user namespaces, gVisor and Kata, Swarm, Kubernetes, Amazon ECR, Google Artifact Registry, Azure Container Registry, Docker Scout and Trivy, the limits of Docker Hub, multi-platform builds with emulation, BuildKit cache mounts and cache export, zombie processes, how published ports are written into the firewall of the host, and the other conditions of `depends_on`. Nothing was timed |

The stand-ins and limits, said again where they matter:

- **Builds ran on the host network.** The sandbox that built the course reached PyPI only that way, and through its proxy, so the recorder passed `--network host` and the proxy as build arguments. None of it is in a Dockerfile on screen. BuildKit does not write the predefined proxy arguments into the image history, and the history screens show it.
- **Compose did not build.** Compose 5.6 builds through bake, which refused a build on the host network. In the sandbox the recorder built the image with `docker build` first and Compose ran that image (an override file with `build: !reset null`). Everything that Compose did with containers, networks, volumes, health and order is unchanged. Elsewhere `capture_dk.py` lets Compose build.
- **Image names on screen are short.** The recorder used `dkc/loader:1`, `dkc/nonroot:1` and similar. The lessons show `loader:1` and `loader:nonroot`. A command that is long in the recording shows `...` where it holds a password or an id.
- **A terminal replay is built from recorded values.** Every output line came from the recording. Some replays print the full text that a command printed (the pytest lines, the `docker diff`, the `docker port` results). Others, such as `m4-lost`, `m7-oom` and `m6-up`, put the command next to the values that the recorder read after it. The recorder did not store a screen capture of a terminal.
- **The registry is `registry:2` on `localhost`.** It has no immutable-tag switch and no access control. Moving `latest` for the stale-tag lab was done with `docker buildx imagetools create`, which changes the registry without touching the local tags.
- **Docker Hub refused a pull while I worked.** After many recordings in one day, `docker pull python:3.13` answered `429 Too Many Requests`, which is the pull limit of anonymous users at work. The rate-limit headers that Docker Hub returned for the address of the sandbox said 100 requests in a window of 3600 seconds, and the remaining count moved up and down between two calls a minute apart, which means that other users share the address. The recorder now pulls an image only when it is not on the machine, and the recorder and the verifier wait a minute and try again when they get a 429. To record against newer bases, run `docker pull` on them first. I did not put a limit in the course, because the documentation pages that I found give other numbers.
- **The data is made up.** 5,000 orders in 12 stores, in March 2026, from a fixed rule. The token `brewline-demo-token-4711` and the password in the `.env` example are made up too.
- **Sizes of built images differ by a few hundred bytes** from one build to the next, because layers carry the time that they were made. The verifier allows 0.2 percent and says so.
- **The Docker documentation website could not be opened** from the sandbox, because its network policy blocked the host. Docker and AWS documentation was read through search summaries. Nothing was opened page by page. The claims to check are listed below.

## Pick a path

| Path | Frames | Time | For |
| --- | --- | --- | --- |
| **Junior** | 330 | about 3 hours | Starting out, or interviewing for a junior data engineer role |
| **Senior** | 475 | about 5 hours | Everything in Junior, plus the build, data, job and shipping decisions that seniors own |
| **Everything** | 523 | about 5.5 hours | Adds the finer points: BuildKit, overlay file systems, cgroups, the mechanics of `-p`, PID 1 and zombies |

Times are estimates from reading and speaking each step, and they include saying the interview answers out loud. Switch paths at any time from the **Map** button.

## The missions

| # | Mission | Junior | Senior | Everything |
| --- | --- | --- | --- | --- |
| 1 | Images and containers | 18 min | 20 min | 23 min |
| 2 | Layers and the build cache | 19 min | 28 min | 30 min |
| 3 | Small images and stages | 14 min | 23 min | 25 min |
| 4 | Data and volumes | 11 min | 19 min | 19 min |
| 5 | Networks, names and ports | 16 min | 21 min | 23 min |
| 6 | Docker Compose | 19 min | 28 min | 30 min |
| 7 | Jobs that run for a while | 18 min | 30 min | 34 min |
| 8 | Registries, tags and digests | 13 min | 24 min | 26 min |
| 9 | Security and hygiene | 15 min | 25 min | 28 min |
| 10 | Boss round | 42 min | 71 min | 89 min |
| | **Total** | **191 min** | **296 min** | **334 min** |

A short mission 0 sets up the course: the whole picture, what a junior and a senior are asked, how the screens work and what ran. Mission 10 has two drills that mix missions (a refused connection followed by a memory kill, and two machines that run different code from one commit), a design decision (one image or twelve), a coding round (write the Dockerfile of the loader), a mock interview of 36 questions, a scorecard and a one-page cheat sheet of recorded numbers.

## What job descriptions ask for, and where this course covers it

I read a small sample of postings through search: eight queries, with and without Docker in the query, for data engineer roles in the United States, London, Bangalore, Singapore and Sydney. I read the search summaries and not every posting, many results were recruiter and aggregator pages that repeat each other, and some were undated, so this shows **direction and not a count**.

| What postings ask for | Where | How it is covered |
| --- | --- | --- |
| Docker next to Python, SQL and Airflow, to package and run pipelines. Several US postings ask to containerize data-processing jobs and run them on Kubernetes | 1 to 8 | **Recorded**: a job in an image, a stack in Compose, a job started and stopped by a scheduler-style command. Kubernetes is **not covered** here and has its own course |
| Docker as a "plus" or "good to have" in Bangalore postings, and as a requirement, with Docker Compose, in a few | 6 | **Recorded**: a compose file, a healthcheck, `depends_on`, profiles and a one-off job |
| Docker named in London Snowflake and dbt postings only rarely. Terraform is named more often there | all | The Docker skills here are the same. Terraform has its own course |
| Docker, Kubernetes and AWS together in Sydney and Singapore postings, with CI/CD and infrastructure as code | 8, 9 | **Recorded**: building, tagging, pushing to a registry and deploying by digest. ECR, ECS and CI services are **from documentation** |
| "Containerize and orchestrate", build and deploy pipelines | 2, 3, 8 | **Recorded**: the build cache, stages with a test target, small images. The orchestrators are **from documentation** |
| CI/CD with automated tests and security scanning | 3, 9 | **Recorded**: tests in a build stage, `docker build --check`, secrets in images. Scanners are **from documentation** |
| Debugging a job that died: exit codes, memory limits, logs | 7 | **Recorded**: 137 with `OOMKilled`, 143, the shell form that swallows SIGTERM, restart policies and log rotation |
| Networking and data between containers | 4, 5 | **Recorded**: volumes that survive and volumes that do not, why `localhost` fails, names, published ports |
| Image hygiene: users, secrets, pinned bases | 9 | **Recorded**: root by default, a secret in `ARG` and `ENV`, a secret mount, a `.env` file in an image, the Docker socket |
| Helm, service meshes, GitOps, ECS task definitions, image signing | not here | Not covered |

The interview themes that came up most in the summaries are missions here: what a container is, how the cache and layers work, volumes and persistence, how containers talk to each other, why a container dies, and how an image gets to production.

## What you work through

- **Follow Brewline.** One job, one Postgres, one registry. A build that reinstalls everything on every commit, a database that is empty on Monday, a connection that is refused, a stack that races, a job that gets killed at 02:30, a worker that runs last week's code, and a token in an image.
- **8 animated diagrams.** A Dockerfile becoming a container, what `docker run` asks for, the build cache, the four places a container writes, how containers find each other, a Compose project, what `docker stop` does, and how an image reaches the machine that runs it.
- **7 labs.** Which build steps run again after a change. What makes an image large. What survives in which storage. Nine attempts to connect. Limits and what a job sees. Five ways to start the same job and stop it. Which image you run after a tag moved.
- **21 terminal replays and 16 code walkthroughs.** Dockerfiles, compose files, a Python worker with a signal handler, and the commands with their real output.
- **27 quizzes, 9 bug hunts, 7 ordering games, 9 decisions with a recommended answer and 11 incident drills,** each drill with a first-move choice, a triage checklist, a way to tell the story and prevention steps.
- **36 interview questions,** each with a timer, a 60-second model answer, a key-point checklist, likely follow-ups and the mistake people make most often.

## How it was checked

| Check | Result |
| --- | --- |
| Content lint (ids, tiers, code line ranges, diagram references, answer length, writing rules, the source tag on every screen, and every number the lessons quote against the recording) | Clean. 11 chapters, 255 screens: 170 for everyone, 67 for Senior, 18 extra |
| Every frame walked in Chromium (`dev/smoke.js`), with console, network, text size, overflow and markup checks | No errors on any path. Walked 330 frames on the Junior path, 475 on the Senior path and 523 on the Everything path |
| The same walk at phone width (390 px), Everything path | No horizontal overflow, no errors. The script reports small text: the numbers of the shared interface and the diagram labels are 10.5 to 14.8 px |
| Interaction test (`node dev/e2e.js docker`): every quiz, bug hunt, ordering game, decision, incident, interview question, coding problem and boss question, plus keys, text size, Map, paths, saving and reset | 870 checks passed, 0 failed |
| The 7 labs driven in the browser (`docker/verify/e2e_labs.js`): every chip of every lab, compared with the recording and with values worked out in the test (the rule of the build cache, byte ratios, what survives in which storage, which process gets a signal). The same file fails when a step shows an HTML tag, backticks, asterisks, `undefined` or `NaN` as text | 210 checks passed |
| Recorded output (`docker/verify/capture_dk.py`) | 24 files, 33 texts, 16 tables and 51 sets of counts. The recorder takes about 5 minutes and removes everything it started |
| The files and the code of the lessons (`docker/verify/verify_dk.py`) | The files of the recording are the files on disk. 16 Dockerfiles go through `docker build --check`: the good ones with no warning, the lint example with its five warnings, the one with a leaked token with the engine's own warning, and the one with a typo is refused. 18 Dockerfile snippets of the lessons parse, and the 5 fixed ones have no warning. 9 compose snippets and the 3 compose files of the project are accepted by `docker compose config`, and a profile adds the loader only when it is switched on. 4 shell snippets pass `sh -n`, and 3 Python snippets and the 3 Python files of the project compile |
| Commands (`verify_dk.py`) | 58 `docker` commands of the terminal replays are checked against `--help` of the installed Docker: the subcommand exists, every flag exists, and a flag that takes a value is read as one |
| Recapture (`verify_dk.py --recapture`) | The whole recording is made again on the same machine and compared with `js/real.js`: 144 items, 0 differ in the last run. The first runs found three things that I fixed: a build cache that remembered layers from the earlier run (so the recorder now empties it before each case), a `docker diff` that lists in no fixed order (now sorted) and a process id that is 7 on one run and 8 on another. The comparison allows exactly these and nothing else: the date, the digest of the python tag (it moves upstream), the digests of pushed images, IP addresses, process ids above 1, the number of processes on the host, which of two phrases the push report uses for a layer that is already there, sizes of built images by 0.2 percent, the size of the tar file by 2 percent, the number of log lines that a rotation keeps by 15 percent and the context size of the ignore case |
| Lab data (`docker/verify/check_widgets.js`) | 120 checks: the rule of the build cache against the recorded steps, sizes against each other, what survives in each storage, which connection attempts work, the memory kill, which process gets a signal, restarts, log rotation, tags against digests, capability bits counted in the masks, the objects of a Compose project |
| Controls | 20 deliberately broken inputs, and each one is refused: a Dockerfile with a typo, a Dockerfile that breaks five rules, a Compose file with an unknown key and one with no image, a shell script with an unclosed quote, Python with a syntax error, a command with a flag that does not exist, a subcommand that does not exist, a Compose command with an unknown global flag, six changes to the recording that the widget checker must refuse (an exit code, what survives in a named volume, a cached step, the digest of a stale tag, the number of capabilities, the volume that survives `down`), a recording with one number changed and one with a size changed by five percent that the comparison must report, and, with `--browser`, three changes to the widget code that the lab test must fail (a changed step marked as cached, the stop lab reversed, tmpfs said to keep its rows) |

### What was not checked

- **Docker Desktop, rootless mode, Podman, Swarm, Kubernetes, cloud registries and scanners were not run.** Their screens come from documentation.
- **Nothing was timed.** The lessons compare counts, bytes, exit codes and plans. How fast a build or a pull is depends on the machine and the network.
- **One machine, one engine.** The recording used cgroup version 1 and the containerd image store. A newer host that uses cgroup version 2 reads different files for the same limits, and the engine hides that. The behaviour that the lessons show is the same.
- **A socket healthcheck that races was not reproduced.** The entrypoint of the Postgres image starts a temporary server that listens on a socket only, and the lesson says so. A health check over the socket that passed too early did not happen in my run, so the lesson gives the reason and not an observation.
- **Zombie processes, the firewall rules of `-p`, cache mounts and cache export, rootless mode, user namespaces and the exec format error of a wrong platform** are described from documentation.
- **The Airflow `DockerOperator` file is from documentation.** It parses as Python. No Airflow ran in this course, and the parameter names are worth checking against the version that you run.
- **Only the screens listed under "Screens looked at" were reviewed by eye.** Every other screen was checked by the tests above and was not looked at.
- **This is engineering practice and not security advice.** Ask your security team which rules apply to you.

### Re-check before you rely on it

| Claim | Where it comes from | Link |
| --- | --- | --- |
| `docker stop` sends SIGTERM and then SIGKILL after 10 seconds by default, and the timeout can be changed | The CLI reference and the man page, read through search | [docker container stop](https://docs.docker.com/reference/cli/docker/container/stop/) |
| Docker Hub limits pulls for anonymous and free users. **I did not put a number in the course**: the pages that I found disagree (100 pulls per 6 hours in one, 10 per hour in others) | Docker documentation and news articles, read through search | [Docker Hub pull usage and limits](https://docs.docker.com/docker-hub/usage/pulls/) |
| A secret mount gives a build step a secret as a file under `/run/secrets` and leaves it out of the image | The build secrets page, read through search | [Build secrets](https://docs.docker.com/build/building/secrets/) |
| `depends_on` has the conditions `service_started`, `service_healthy` and `service_completed_successfully` | The Compose specification, read through blog posts and a forum quote. The recording ran `service_healthy` only. I did not find the official page in my results | [A forum post that quotes the specification](https://forums.docker.com/t/depends-on-version-3/29463) |
| Amazon ECR can make tags immutable for a repository, with exclusions since 2025 | The ECR user guide, read through search | [Image tag mutability](https://docs.aws.amazon.com/AmazonECR/latest/userguide/image-tag-mutability.html) |
| `docker run --init` uses a small init process (tini) that forwards signals and reaps children | Blog posts. I did not find the official page in my results, so there is no link. The recording shows the effect, exit code 143 | none |
| Compose 5.x builds through bake, and a build on the host network needs an entitlement | The error message of the recording: `additional privileges requested: pass "--allow=network.host"`. I did not find the documentation | none |
| BuildKit cache mounts and cache export for CI | Third-party guides, read through search. **Not run** | [A guide to BuildKit cache mounts and secrets](https://oneuptime.com/blog/post/2026-01-16-docker-buildkit-cache-secrets/view) |
| The job postings: direction only, from search summaries of eight queries | Pages of job boards, recruiters and company career sites. A small sample | [Example posting, Python, SQL, Airflow, Docker, Kubernetes](https://www.wearedevelopers.com/jobs/ext/2284512-data-engineer) |

## Screens looked at

These are the only screens that were reviewed by eye, at 1440 by 900 unless stated:

- Eight diagrams: a Dockerfile becoming a container, what `docker run` asks for, the build cache, the four places to write, how a container finds another, a Compose project, what `docker stop` does, and how an image reaches the machine that runs it.
- Seven labs, each in its first state: the build cache, image sizes, what survives, nine attempts to connect, limits, five ways to stop a job, and which image you run. The network lab was also looked at on a phone (390 by 844).
- The welcome screen, with Coach Otto.

Looking found four faults that the tests had missed, and all four are fixed: a tag that ran past the edge of the first diagram, a label that was wider than its box in the network diagram, a tag that covered a node in the stop diagram, and two terminal blocks in the network lab that were cut off. The phone walk found two long strings that made a page wider than the screen.

## Files

```
docker/
  index.html, css/docker.css  the page and its colours
  js/config.js               the course settings: Coach Otto, the paths, the eleven levels
  js/graphs.js               8 diagram specs
  js/widgets.js              the 7 labs
  js/content/                one file per mission, 00 to 10
  js/real.js                 the recording: files, tables, texts and counts written by capture_dk.py
  verify/project/            the Brewline loader: Dockerfiles, compose files, load_orders.py, worker.py
  verify/dklib.py            helpers of the recorder: run docker, parse build output, clean up
  verify/capture_dk.py       runs everything on a real Docker Engine and writes js/real.js
  verify/verify_dk.py        checks every Dockerfile, compose file, command and snippet, compares a new recording with js/real.js, runs the controls
  verify/check_widgets.js    recomputes the rules of the labs from the recording
  verify/e2e_labs.js         drives the seven labs in Chromium
  verify/dump_dk.js          lists the code, the commands and the strings of the course for verify_dk.py
  verify/requirements.txt    what the machine needs (no Python package)
  verify/INTEGRATION.md      what the hub page, the root README and package.json needed
```

## Run the checks

```bash
python3 docker/verify/verify_dk.py                       # Dockerfiles, compose files, snippets, commands, lab data and controls (about 15 seconds)
python3 docker/verify/verify_dk.py --recapture --browser # also record again (about 5 minutes) and drive the labs in Chromium
python3 docker/verify/capture_dk.py                      # writes docker/js/real.js
node dev/lint-content.js docker
node dev/e2e.js docker && node docker/verify/e2e_labs.js
node dev/smoke.js docker --path all
```

In the sandbox that built the course, set `DK_BUILD_NETWORK=host DK_BUILD_PROXY=1` before the recorder or `--recapture`. Elsewhere leave both unset. A check whose tool is missing says so and is skipped.

Independent study material. Not affiliated with or endorsed by Docker, Inc., Amazon, Google, Microsoft, the Postgres Global Development Group or any other vendor or project named here.
