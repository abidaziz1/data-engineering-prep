// Checks the recorded numbers that the Docker labs and lessons read, with rules written here, in code that shares nothing with the widgets:
// the rule of the build cache, sizes against each other, what survives in which kind of storage, which connection attempts work, the memory kill,
// which process gets a signal, restarts and log rotation, tags and digests, capability bits, the objects of a Compose project.
// The widgets themselves are driven in the browser by docker/verify/e2e_labs.js.
// Run: node docker/verify/check_widgets.js        DK_REAL_JS=<file> lets verify_dk.py feed it a changed copy of the recording
const fs = require('fs'), path = require('path');
global.window = global; global.LAB = {};
const root = path.join(__dirname, '..', '..');
(0, eval)(fs.readFileSync(process.env.DK_REAL_JS || path.join(root, 'docker', 'js', 'real.js'), 'utf8'));
const R = LAB.real, C = k => R.counts[k], T = k => R.tables[k], X = k => R.text[k];
let checks = 0, fails = 0;
const eq = (got, want, what) => { checks++; if (JSON.stringify(got) !== JSON.stringify(want)) { fails++; console.log('FAIL:', what, '\n   got ', JSON.stringify(got), '\n   want', JSON.stringify(want)); } };
const yes = (cond, what) => { checks++; if (!cond) { fails++; console.log('FAIL:', what); } };
const popcount = hex => BigInt('0x' + hex).toString(2).replace(/0/g, '').length;

// ---- the build cache: a step runs again when its own input changed or any step above it ran again ----------------------------------------------
const DOCKERFILES = {
  'copy first': [['WORKDIR /app', null], ['COPY . .', 'any'], ['RUN pip install', 'requirements']],
  'dependencies first': [['WORKDIR /app', null], ['COPY requirements.txt .', 'requirements'], ['RUN pip install', 'requirements'], ['COPY load_orders.py worker.py ./', 'code']]
};
// which file each instruction reads: 'any' reads every file, 'requirements' reads requirements.txt, 'code' reads the code; the install reads what was copied before it
const touches = (reads, change) => reads === 'any' ? change !== 'nothing' : change === 'requirements.txt' ? reads === 'requirements' : change.startsWith('one line') ? reads === 'code' : false;
const steps = T('cache.steps').rows, summary = T('cache.summary').rows;
Object.keys(DOCKERFILES).forEach(order => ['nothing', 'one line of load_orders.py', 'requirements.txt'].forEach(change => {
  let again = false;
  const model = DOCKERFILES[order].map(([cmd, reads]) => { if (reads && touches(reads, change)) again = true; return !again; });
  // the install in "dependencies first" reads the file that the COPY above it brought, so it is invalidated by that COPY
  const rec = steps.filter(r => r[0] === order && r[1] === change).sort((a, b) => a[2] - b[2]);
  eq(rec.map(r => r[4]), model, 'cache: ' + order + ' / ' + change + ' (cached per step)');
  const sm = summary.find(r => r[0] === order && r[1] === change);
  eq([sm[2], sm[3], sm[4]], [rec.length, rec.filter(r => !r[4]).length, rec.some(r => !r[4] && /^RUN pip/.test(r[3]))], 'cache: summary of ' + order + ' / ' + change);
}));

// ---- sizes ---------------------------------------------------------------------------------------------------------------------------------------
const B = T('small.bases').rows.map(r => [r[0], r[1]]), size = n => B.find(r => r[0] === n)[1];
yes(size('python:3.13') > size('python:3.13-slim') && size('python:3.13-slim') > size('python:3.13-alpine'), 'bases: full > slim > alpine');
const H = C('small.heavy');
yes(H.slim.ok && H.alpine.ok && H.alpine.size < H.slim.size, 'the same packages are smaller on alpine');
eq(H.slim.pandas, H.alpine.pandas, 'the same pandas and pyarrow versions on both bases');
yes(H.slim.size > size('python:3.13-slim') + 200e6, 'the packages add more than 200 MB on slim');
const RM = C('small.rm');
yes(Math.abs(RM.later_layer - RM.base - RM.file_bytes) < 2e6, 'a deleted file still counts: later layer is the base plus 50 MiB');
yes(Math.abs(RM.same_layer - RM.base) < 1e5, 'created and deleted in one RUN: the base plus a few kilobytes');
eq(RM.file_bytes, 50 * 1024 * 1024, 'the file is 50 MiB');
const hist = T('small.rm_history').rows;
yes(hist.some(r => /^5\d\.\dMB$/.test(r[0])), 'the history shows the 50 MiB layer');
const ST = C('small.stages');
yes(ST.test_image_size > ST.runtime_image_size, 'the test stage image is larger than the runtime image');
eq([ST.pytest_in_test, ST.pytest_in_runtime, ST.default_build_ran_pytest], ['True', 'False', false], 'pytest is in the test stage only, and a plain build does not run it');
yes(/2 passed/.test(X('small.pytest')), 'the test stage ran two tests');

// ---- the build context -----------------------------------------------------------------------------------------------------------------------------
const CX = C('build.context');
const toBytes = s => { const m = /^([0-9.]+)(B|kB|MB|GB)$/.exec(s); return +m[1] * { B: 1, kB: 1e3, MB: 1e6, GB: 1e9 }[m[2]]; };
yes(Math.abs(toBytes(CX.without_ignore) - CX.junk_bytes) < 0.1e6, 'the context without .dockerignore is the 40 MiB of junk plus the project');
yes(toBytes(CX.with_ignore) < 20e3, 'the context with .dockerignore is a few kilobytes');
eq(CX.junk_bytes, CX.junk_files * 2 * 1024 * 1024, 'twenty files of 2 MiB');

// ---- what survives -------------------------------------------------------------------------------------------------------------------------------------
const N = String(C('volumes.rows_before').rows);
const model = { 'no volume flag': [N, 'no table'], 'named volume': [N, N], 'bind mount of a host folder': [N, N], 'tmpfs (memory)': ['no table', 'no table'] };
T('volumes.matrix').rows.forEach(r => eq([r[1], r[2]], model[r[0]], 'survives: ' + r[0]));
eq(T('volumes.matrix').rows.length, 4, 'four ways to store the data');
const AN = C('volumes.anonymous'), BD = C('volumes.bind'), PM = C('volumes.perms');
eq([AN.mounts, AN.dangling_volumes_left_by_rm], ['volume /var/lib/postgresql/data', 1], 'the image declares a volume and rm leaves one behind');
eq(BD.owner_of_pg_version_on_host, '70:70 600', 'the data files belong to the postgres user of the alpine image, uid 70');
eq([PM.file_owner_written_by_root_in_container, PM.non_root_write_rc], ['0:0', 1], 'root writes root-owned files, and uid 1000 cannot write there');
yes(C('volumes.backup').tar_bytes === true && C('volumes.backup').files_in_volume === BD.files_in_host_dir, 'the volume holds the same number of entries as the bind mounted folder');

// ---- networks --------------------------------------------------------------------------------------------------------------------------------------------------
const D = C('net.default'), U = C('net.user');
yes(D.resolve_by_name_rc !== 0 && D.ping_by_ip_rc === 0, 'default bridge: no names, addresses work');
yes(U.resolve_by_name_rc === 0 && U.dns_server && /127\.0\.0\.11/.test(X('net.user')), 'a created network resolves names through 127.0.0.11');
yes(/refused/i.test(X('net.localhost')), 'localhost is refused');
yes(/failed to resolve host 'database'/.test(X('net.wrongname')), 'a wrong name does not resolve');
yes(/the table now has 5000/.test(X('net.byname')), 'the container name works and loads 5,000 rows');
eq(X('net.port1'), '5432/tcp -> 127.0.0.1:15432', 'published on loopback');
eq(X('net.port2'), '5432/tcp -> 0.0.0.0:15433', 'published on every interface');
eq(X('net.port3'), '(nothing published)', 'no -p, nothing published');
const P = C('net.ports');
eq([P.p1_listens_on, P.p2_listens_on, P.host_reaches_p1, P.host_reaches_p3_from_localhost_15434], ['127.0.0.1:15432', '0.0.0.0:15433', true, false], 'what listens, and what the host can reach');
yes(/port is already allocated/.test(X('net.busy')), 'a host port belongs to one container');
const NR = C('net.recreate'), MD = C('net.modes');
eq([NR.address_changed, NR.name_still_resolves], [true, true], 'the address changed and the name still resolves');
eq([MD.interfaces_none, MD.interfaces_bridge], [1, 2], 'none has loopback only, bridge has loopback and eth0');
yes(MD.interfaces_host > MD.interfaces_bridge, 'host mode sees the interfaces of the host');

// ---- memory, CPU, signals, restarts, logs ------------------------------------------------------------------------------------------------------------------
const unit = s => ({ m: 1024 * 1024, g: 1024 * 1024 * 1024 })[s.slice(-1)] * parseInt(s, 10);
T('jobs.oom').rows.forEach(r => { const killed = parseInt(r[1], 10) * 1024 * 1024 > unit(r[0]); eq([r[2], r[3]], killed ? [137, true] : [0, false], 'memory: ' + r[0] + ' limit, ' + r[1]); if (!killed) yes(/allocated/.test(r[4]), 'a job that fits prints its line'); else eq(r[4], '', 'a killed job prints nothing'); });
eq(C('jobs.limit_seen').inside, 64 * 1024 * 1024, 'the limit inside the container, in bytes');
const CP = C('jobs.cpus'), cpus = R.meta.cpus;
eq([CP.no_limit.cpu_count, CP.cpus_0_5.cpu_count, CP.cpuset_0.cpu_count], [cpus, cpus, cpus], 'os.cpu_count() is the CPU count of the host in all three cases');
eq([CP.no_limit.process_cpu_count, CP.cpus_0_5.process_cpu_count, CP.cpuset_0.process_cpu_count], [cpus, cpus, 1], 'only a cpuset changes what the process can use');
// a signal reaches the job only when the job is process 1; process 1 ignores a signal that it does not handle
const sigModel = { 'exec form, no handler': { pid: 1, waited: 'yes', exit: 137, handled: 'no' }, 'exec form, handles SIGTERM': { pid: 1, waited: 'no', exit: 0, handled: 'yes' },
  'shell form (sh -c), handles SIGTERM': { waited: 'yes', exit: 137, handled: 'no' }, 'shell form with exec, handles SIGTERM': { pid: 1, waited: 'no', exit: 0, handled: 'yes' }, 'exec form, no handler, docker run --init': { waited: 'no', exit: 143, handled: 'no' } };
T('jobs.signals').rows.forEach(r => { const m = sigModel[r[0]]; yes(!!m, 'a known case: ' + r[0]); if (!m) return; if (m.pid) eq(r[1], m.pid, 'signals: process id of ' + r[0]); else yes(r[1] > 1, 'signals: the job is not process 1 in ' + r[0]); eq([r[2], r[3], r[4]], [m.waited, m.exit, m.handled], 'signals: ' + r[0]); });
const RS = T('jobs.restart').rows;
eq(RS.map(r => [r[1], r[2], r[3], r[4]]), [[0, 1, 'exited', 1], [3, 4, 'exited', 1]], 'restarts: no policy runs once, on-failure:3 runs 1 + 3 times');
const L = C('jobs.logs');
yes(L.kept_without_rotation === L.printed && L.kept_with_rotation > 0 && L.kept_with_rotation < 2 * 20480 / 20, 'logs: rotation keeps fewer lines than were printed, within the size limit');
eq(L.driver_and_options, 'json-file {"max-file":"2","max-size":"20k"}', 'log driver and options');
const TZ = C('jobs.tz');
yes(/^UTC \+0000$/.test(TZ.default) && /^IST \+0530$/.test(TZ.with_TZ), 'time zone: UTC by default, IST with TZ=Asia/Kolkata');
eq(T('jobs.exit').rows.map(r => r[1]), [0, 3, 127, 126, 137], 'exit codes');
eq(T('jobs.entry').rows.map(r => r[1]), ['entrypoint: default argument', 'entrypoint: other words', 'replaced'], 'ENTRYPOINT and CMD');

// ---- compose ---------------------------------------------------------------------------------------------------------------------------------------------------------
const O = C('compose.objects'), DN = C('compose.down'), DV = C('compose.down_v');
yes(O.volumes_while_up.length === 1 && /^[a-z0-9-]+_pgdata$/.test(O.volumes_while_up[0]) && /^[a-z0-9-]+_default$/.test(O.networks_while_up[0]), 'the objects of the project carry the project name');
eq([DN.volumes_after_down, DN.networks_after_down, DV.volumes_after_down_v], [O.volumes_while_up, [], []], 'down keeps the volume, down -v removes it');
eq(C('compose.race').loader_failed, true, 'without a healthcheck the loader fails');
yes(/Connection refused/.test(X('compose.race')), 'the race ends in a refused connection');
eq([X('compose.up'), X('compose.again'), X('compose.job')], Array(3).fill('read 5000 rows from /data/orders.csv, the table now has 5000'), 'the loader reads 5,000 rows each time and the table keeps 5,000');
eq(T('compose.ps').rows, [['db', 'running', 'healthy'], ['loader', 'exited', '']], 'db healthy, loader exited');
eq([C('compose.profiles').services_after_up, C('compose.profiles').job_rc], [['db'], 0], 'a profile keeps the loader out of up');
yes(/listen_addresses=''/.test(X('compose.entrypoint')), 'the temporary server of the postgres entrypoint listens on a socket only');

// ---- registry --------------------------------------------------------------------------------------------------------------------------------------------------------
const steps2 = T('registry.steps').rows, tags = T('registry.tags').rows, F2 = C('registry.facts');
eq([steps2[0][1], steps2[0][2]], [steps2[0][1], steps2[0][1]], 'first state: registry and machine agree');
yes(steps2[1][1] !== steps2[1][2] && steps2[1][2] === steps2[0][2], 'second state: latest moved in the registry, and not on the machine');
eq(steps2[2][1], steps2[2][2], 'third state: a pull brings the machine to the registry');
eq([steps2.map(r => r[3])], [['this is build 1', 'this is build 1', 'this is build 2']], 'what docker run prints in the three states');
const tag = n => tags.find(r => r[0].startsWith(n));
eq([tag('1.0')[1], tag('1.1')[1], tag('latest')[1]], [steps2[0][1], steps2[1][1], steps2[1][1]], 'digests of the tags: 1.0 stayed, latest moved to 1.1');
eq([tag('1.0')[2], tag('1.1')[2], tag('latest')[2]], ['this is build 1', 'this is build 2', 'this is build 2'], 'what each tag runs');
eq(F2, { latest_moved: true, local_stale_until_pull: true, ran_after_pull: 'this is build 2', run_by_digest: 'this is build 1', same_digest_1_0_and_latest_before: true, tag_1_0_unchanged: true }, 'the facts of the registry experiment');
eq(JSON.parse(X('registry.tags_1')).tags.sort(), ['1.0', 'latest'], 'tags after the first push');
eq(JSON.parse(X('registry.tags_2')).tags.sort(), ['1.0', '1.1', 'latest'], 'tags after the second push');
eq(JSON.parse(X('registry.catalog')), { repositories: ['brewline/loader'] }, 'one repository');
yes((X('registry.push').match(/exists/gi) || []).length >= 2, 'the second tag uploaded no layers');
const SV = C('registry.save'), PL = C('registry.platforms');
yes(SV.has_index_json && SV.members > 3 && SV.runs_after_load === 'this is build 2', 'save and load carry the image');
yes(PL.platforms.includes('linux/amd64') && PL.platforms.includes('linux/arm64/v8') && PL.platforms.length >= 4, 'the python tag lists several platforms');

// ---- security --------------------------------------------------------------------------------------------------------------------------------------------------------
const CA = C('sec.caps');
eq([popcount(CA.default_hex), popcount(CA.dropped_hex), popcount(CA.privileged_hex)], [CA.default_count, CA.dropped_count, CA.privileged_count], 'capability counts are the set bits of the capability masks');
eq([CA.default_count, CA.dropped_count], [14, 0], '14 capabilities by default, none after cap-drop ALL');
yes(CA.privileged_count > 30, 'privileged gives most capabilities');
const US = C('sec.user');
yes(/^uid=0\(root\)/.test(US.default_image) && /^uid=10001\(app\)/.test(US.nonroot_image), 'root by default, user 10001 with USER');
eq([C('sec.root_write').rc, /Permission denied/.test(X('sec.nonroot_write'))], [0, true], 'root can write to /usr/local, the app user cannot');
eq([C('sec.readonly').rc_without_tmpfs !== 0, C('sec.readonly').rc_with_tmpfs, /Read-only file system/.test(X('sec.readonly'))], [true, 0, true], 'read-only root and tmpfs');
const CH = C('sec.chown');
yes(CH.default_rc === 0 && CH.cap_drop_all_rc !== 0 && /Operation not permitted/.test(CH.cap_drop_all_error), 'chown needs a capability');
const lk = X('sec.history_leak');
yes(/API_TOKEN=brewline-demo-token-4711/.test(lk) && /PARTNER_TOKEN=brewline-demo-token-4711/.test(lk), 'the ARG, the RUN and the ENV carry the token in the history');
eq(C('sec.leak'), { arg_in_history: true, env_in_history: true, env_in_inspect: true }, 'the token is in the history and in inspect');
eq(C('sec.secretmount'), { files_that_contain_the_token: [], note: 'token has 24 bytes', token_in_history: false }, 'a secret mount leaves no token, and the token has 24 bytes');
eq('brewline-demo-token-4711'.length, 24, 'the made-up token is 24 characters');
eq(C('sec.run_env').visible_in_inspect, true, 'a variable given at run time shows in inspect');
const DE = C('sec.dotenv');
yes(DE.without_ignore_rc === 0 && /brewline-prod-secret/.test(DE.without_ignore_content) && DE.with_ignore_rc !== 0 && /No such file/.test(DE.with_ignore_error), '.env is copied without the ignore line and absent with it');
eq([C('sec.socket').container_sees_host_container, C('sec.socket').reads_host_file], [true, true], 'the socket and a mount expose the host');
yes(/^sha256:[0-9a-f]{12}/.test(C('sec.pin').digest_prefix), 'a digest prefix is recorded');

// ---- the machine ---------------------------------------------------------------------------------------------------------------------------------------------
const K = C('basics.kernel');
eq([K.same, K.host === R.meta.kernel], [true, true], 'the container and the host report the same kernel');
yes(C('basics.processes').in_container === 1 && C('basics.processes').on_host > 10, 'one process in the container, many on the host');
eq(C('basics.stop'), { exit_code: 137, status: 'exited' }, 'a shell loop stopped after 1 second ends with 137');
yes(C('basics.tty').rc !== 0 && /TTY/.test(X('basics.tty')), 'docker run -it without a terminal fails');
eq(C('basics.layers.alpine:3.22').layers, 1, 'alpine has one layer');
yes(C('basics.layers.python:3.13-slim').layers > 1 && C('basics.layers.postgres:16-alpine').layers > C('basics.layers.python:3.13-slim').layers, 'python has several layers, postgres more');

console.log(fails ? fails + ' of ' + checks + ' checks failed' : checks + ' checks passed');
process.exit(fails ? 1 : 0);
