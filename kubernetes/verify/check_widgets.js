// Checks the recorded numbers that the Kubernetes labs and lessons read, with rules written here, in code that shares nothing with the widgets:
// what a rolling update must look like for given settings, how a QoS class follows from the manifest, what a Role allows, what each delete
// removes, how many pods a failing Job makes, which pod handles a signal, and how the facts of the recording agree with the manifests that
// were applied. The widgets themselves are driven in a browser by kubernetes/verify/e2e_labs.js.
// Run: node kubernetes/verify/check_widgets.js        K8S_REAL_JS=<file> lets verify_k8s.py feed it a changed copy of the recording
const fs = require('fs'), path = require('path');
global.window = global; global.LAB = {};
const root = path.join(__dirname, '..', '..');
(0, eval)(fs.readFileSync(process.env.K8S_REAL_JS || path.join(root, 'kubernetes', 'js', 'real.js'), 'utf8'));
const R = LAB.real, C = k => R.counts[k], T = k => R.tables[k], X = k => R.text[k], F = k => R.files[k];
let checks = 0, fails = 0;
const eq = (got, want, what) => { checks++; if (JSON.stringify(got) !== JSON.stringify(want)) { fails++; console.log('FAIL:', what, '\n   got ', JSON.stringify(got), '\n   want', JSON.stringify(want)); } };
const yes = (cond, what) => { checks++; if (!cond) { fails++; console.log('FAIL:', what); } };

// ---- a little reader for the flat YAML of the project: the value of the first line "key: value" --------------------------------------------------------
const val = (text, key) => { const m = new RegExp('^\\s*(?:-\\s+)?' + key + ':\\s*(.+?)\\s*$', 'm').exec(text); return m ? m[1].replace(/^"|"$/g, '') : null; };

// ---- pods that fail --------------------------------------------------------------------------------------------------------------------------------------
const BI = C('fail.badimage');
yes(BI.seen.indexOf('ErrImagePull') >= 0 && BI.seen.indexOf('ImagePullBackOff') > BI.seen.indexOf('ErrImagePull'), 'a bad image shows ErrImagePull first and ImagePullBackOff after it');
yes(/not found$/.test(X('fail.badimage_message')) && val(F('pod-badimage.yaml'), 'image').endsWith('-nope'), 'the image of the pod has a tag that does not exist, and the registry says not found');
const CR = C('fail.crash');
const gaps = CR.restart_times_s.slice(1).map((t, i) => t - CR.restart_times_s[i]);
yes(CR.restart_times_s.length >= 3 && CR.restart_times_s.every((t, i, a) => i === 0 || t > a[i - 1]), 'the crash pod restarted at least three times, at increasing times');
yes(gaps.length >= 2 && gaps.every((g, i) => i === 0 || g > gaps[i - 1]), 'the wait between restarts grows: ' + gaps.join(', '));
yes(gaps[0] >= 8 && gaps[0] <= 18, 'the first wait is about ten seconds (the back-off starts near ten seconds): ' + gaps[0]);
eq([CR.last_exit_code, /exit 3/.test(F('pod-crash.yaml')), X('fail.crash_logs')], [3, true, 'starting the load'], 'the crash pod printed its line and exited with the code that the manifest sets');
yes(CR.backoff_event && /Back-off restarting failed container/.test(X('fail.crash_event')), 'the back-off is written as an event');
yes(CR.status_samples.Error > 0 && Object.values(CR.status_samples).reduce((a, b) => a + b, 0) >= 20, 'the status column of the crash pod was read many times and said Error');
const OM = C('fail.oom');
eq([OM.reason, OM.exit_code, OM.exit_code - 128, OM.phase, OM.qos, OM.limit], ['OOMKilled', 137, 9, 'Failed', 'Burstable', '64Mi'], 'the memory kill is exit 128 + 9, the pod ends as Failed, and the class is Burstable');
yes(val(F('pod-oom.yaml'), 'memory') === OM.limit, 'the limit of the manifest is the limit that was read back');
const PE = C('fail.pending');
yes(PE.status === 'Pending' && PE.node_assigned === false && /Insufficient cpu/.test(X('fail.pending_event')) && +val(F('pod-pending.yaml'), 'cpu') > PE.node_cpus, 'a request larger than the node leaves the pod Pending with no node');

// ---- deployments and the rolling update, from the rules of the controller ----------------------------------------------------------------------------------
const DY = F('deploy-web.yaml');
const replicas = +val(DY, 'replicas'), surge = +val(DY, 'maxSurge'), unavail = +val(DY, 'maxUnavailable');
const ST = C('deploy.state');
eq([ST.replicas, ST.replicasets, ST.pods, ST.ready], [replicas, 1, replicas, replicas], 'one Deployment: one ReplicaSet and as many ready pods as replicas');
const HE = C('deploy.heal');
eq([HE.pods_before, HE.pods_after, HE.ready_after, HE.deleted_name_still_there, HE.new_names], [replicas, replicas, replicas, false, 1], 'a deleted pod is replaced by one pod with a new name');
eq(C('deploy.scale').pods, 5, 'scale to five gives five pods');
const RO = C('deploy.rolling');
// the limits that the controller keeps: pods in all <= replicas + maxSurge, pods ready >= replicas - maxUnavailable
yes(RO.max_pods_seen <= replicas + surge && RO.max_pods_seen >= replicas, 'a rolling update never has more than replicas + maxSurge pods: ' + RO.max_pods_seen);
yes(RO.min_ready_seen >= replicas - unavail, 'a rolling update never has fewer than replicas - maxUnavailable ready pods: ' + RO.min_ready_seen);
eq([RO.surge, RO.max_unavailable, RO.replicasets], [surge, unavail, 2], 'the recorded settings are the settings of the manifest, and the update left two ReplicaSets');
yes(/NAME\s+DESIRED\s+CURRENT\s+READY/.test(X('deploy.rs')) && / 0 {2}0 {2}0 /.test(X('deploy.rs')) && / 3 {2}3 {2}3 /.test(X('deploy.rs')), 'the two ReplicaSets hold 0 and 3 pods');
yes(/REVISION/.test(X('deploy.history')) && /\n2 /.test(X('deploy.history')), 'the history lists two revisions');
eq(X('deploy.curl_v2'), 'web version 2', 'the new pods serve version 2');
const SK = C('deploy.stuck');
eq([SK.replicas, SK.updated_replicas, SK.available_replicas, SK.ready_replicas], [replicas + surge, 1, replicas, replicas], 'a stuck update has the new pod unready and the old pods available');
yes(SK.rollout_exit_code !== 0 && /timed out/.test(X('deploy.stuck_status')), 'rollout status gives up with a time-out and a non-zero code');
yes(/ErrImagePull|ImagePullBackOff/.test(X('deploy.stuck_pods')) && /\b0\/1\b/.test(X('deploy.stuck_pods')), 'the stuck pod cannot pull its image');
eq([C('deploy.undo').image, C('deploy.undo').ready, val(DY, 'image')], [val(DY, 'image'), replicas, 'python:3.13-slim'], 'the undo restores the image and the ready pods');

// ---- services -----------------------------------------------------------------------------------------------------------------------------------------------------
const EP = C('svc.endpoints');
eq([EP.addresses, EP.pods], [replicas, replicas], 'a Service has one endpoint address for each ready pod');
const SW = F('svc-web.yaml'), SX = F('svc-web-wrong.yaml'), SP = F('svc-web-port.yaml');
eq([val(SW, 'app'), val(SX, 'app'), val(DY, 'app')], ['web', 'webb', 'web'], 'the selectors: web matches the pods, web-wrong has one letter more');
eq([val(SW, 'targetPort'), val(SP, 'targetPort'), val(DY, 'containerPort')], ['8080', '8000', '8080'], 'targetPort of web is the container port, web-port forwards to 8000');
eq([C('svc.wrong_selector').endpoints_empty, C('svc.wrong_selector').wget_rc !== 0, C('svc.wrong_port').wget_rc !== 0], [true, true, true], 'both broken Services fail');
yes(/Connection refused/.test(X('svc.wrong_wget')) && /Connection refused/.test(X('svc.port_wget')), 'both broken Services answer with a refused connection, so the endpoints are what tells them apart');
eq(X('svc.port_endpoint'), '8000', 'the endpoints of web-port carry the wrong target port');
yes(/^Endpoints:\s*$/.test(X('svc.wrong_describe')), 'the Endpoints line of the Service without pods has nothing after it');
eq([X('svc.short'), X('svc.fqdn')], ['web version 1', 'web version 1'], 'the short and the full name reach a pod of version 1');
yes(/search brewline\.svc\.cluster\.local svc\.cluster\.local cluster\.local/.test(X('svc.resolv')) && /ndots:5/.test(X('svc.resolv')), 'the search path of a pod starts with its own namespace');
yes(/web\.brewline\.svc\.cluster\.local/.test(X('svc.getent')), 'the full name of the Service is service.namespace.svc.cluster.local');
yes(/ClusterIP/.test(X('svc.get')) && /8080\/TCP/.test(X('svc.get')), 'the Service is a ClusterIP on 8080');
eq([C('svc.ip_change').old_ip_gone, C('svc.ip_change').name_still_works], [true, true], 'a replaced pod has a new address, and the Service name still works');

// ---- config and secrets -------------------------------------------------------------------------------------------------------------------------------------
const cm1 = val(F('configmap-settings.yaml'), 'LOG_LEVEL'), cm2 = val(F('configmap-settings-debug.yaml'), 'LOG_LEVEL');
eq([C('cfg.before').env, C('cfg.before').file], [cm1, cm1], 'before the change the variable and the file hold the first value');
eq([C('cfg.after').env, C('cfg.after').file, C('cfg.after').file_changed_within_120s], [cm1, cm2, true], 'after the change the variable keeps the first value and the file has the second');
const secret = val(F('secret-token.yaml'), 'token');
eq(Buffer.from(X('cfg.secret_encoded'), 'base64').toString(), secret, 'the stored Secret is the base64 of the value in the manifest');
yes(X('cfg.secret_yaml').indexOf(X('cfg.secret_encoded')) >= 0 && X('cfg.secret_encoded') !== secret, 'the Secret as the cluster returns it holds the encoded value, which is not the value');
yes(/token:\s+24 bytes/.test(X('cfg.secret_describe')) && secret.length === 24, 'describe shows the size of the value, 24 bytes, and not the value');
const OR = C('cfg.orders');
eq([OR.limit_bytes, OR.rows], [1024 * 1024, 5000], 'the limit of a ConfigMap is 1 MiB, and the orders have 5,000 rows');
yes(OR.bytes > OR.rows * 10 && OR.bytes < OR.limit_bytes, 'the file of orders is larger than ten bytes a row, and below the limit');

// ---- storage ------------------------------------------------------------------------------------------------------------------------------------------------------------
const RW = C('sto.rows');
eq([RW.after_load, RW.after_pod_deleted, RW.after_statefulset_recreated, RW.same_pod_name], [5000, 5000, 5000, true], 'the data survives a deleted pod and a deleted StatefulSet');
const PV = C('sto.pv'), cls = X('sto.classes');
yes(new RegExp(PV.storage_class + ' \\(default\\)\\s+\\S+\\s+' + PV.reclaim + '\\s').test(cls), 'the reclaim policy of the volume is the reclaim policy of its storage class');
eq([PV.count, PV.phase, PV.access_modes], [1, 'Bound', ['ReadWriteOnce']], 'one bound volume, ReadWriteOnce');
const claim = 'data-' + C('sto.sts').pods[0];
eq(C('sto.sts').pvc_name, claim, 'the claim of the StatefulSet pod is named data-<pod>');
yes(new RegExp(claim + '\\s+Bound').test(X('sto.pvc')) && new RegExp(claim + '\\s+Bound').test(X('sto.pvc_after_delete')) && C('sto.after_delete').pvc_still_there, 'the claim is Bound before and after the StatefulSet is deleted');
const AP = C('sto.after_pvc_delete');
eq([AP.pv_count, AP.pvc_count >= 0, AP.rows_in_the_new_database], [PV.reclaim === 'Delete' ? 0 : 1, true, PV.reclaim === 'Delete' ? 0 : 5000], 'with the policy Delete a deleted claim takes the volume and the rows with it');
yes(/read 5000 rows from \/data\/orders\.csv, the table now has 5000/.test(X('sto.job_logs')) && /Complete\s+1\/1/.test(X('sto.job_get')), 'the loader read 5,000 rows and the Job completed 1 of 1');

// ---- jobs: how many pods a failing Job makes ---------------------------------------------------------------------------------------------------------------------------
const bo = f => +val(F(f), 'backoffLimit'), rp = f => val(F(f), 'restartPolicy');
const NV = C('job.never'), OF = C('job.onfailure');
eq([rp('job-fail-never.yaml'), bo('job-fail-never.yaml')], ['Never', 2], 'the manifest of the first failing Job');
eq([NV.pods, NV.failed, NV.pod_status, NV.condition], [bo('job-fail-never.yaml') + 1, bo('job-fail-never.yaml') + 1, ['Error'], ['Failed', 'BackoffLimitExceeded']], 'with Never a Job makes backoffLimit + 1 pods, and they all stay');
eq([rp('job-fail-onfailure.yaml'), OF.max_pods_seen, OF.pods_left_after_failure, OF.condition[1]], ['OnFailure', 1, 0, 'BackoffLimitExceeded'], 'with OnFailure one pod restarts and a failed Job removes it');
yes(OF.max_restarts_seen >= 1 && OF.max_restarts_seen <= bo('job-fail-onfailure.yaml') + 1, 'the restarts stay within backoffLimit: ' + OF.max_restarts_seen);
const PA = C('job.parallel');
eq([PA.completions, PA.parallelism, +val(F('job-parallel.yaml'), 'completions'), +val(F('job-parallel.yaml'), 'parallelism')], [4, 2, 4, 2], 'the recorded settings are the settings of the manifest');
yes(PA.peak_running <= PA.parallelism && PA.peak_running >= 1 && PA.succeeded === PA.completions && /4\/4/.test(X('job.parallel_get')), 'a Job runs at most parallelism pods at once and ends with completions successes');
eq([C('job.deadline').condition, +val(F('job-deadline.yaml'), 'activeDeadlineSeconds') < 60], [['Failed', 'DeadlineExceeded'], true], 'a deadline shorter than the work ends the Job with DeadlineExceeded');
eq([C('job.ttl').deleted_by_the_cluster, C('job.ttl').ttl_seconds, +val(F('job-ttl.yaml'), 'ttlSecondsAfterFinished')], [true, 5, 5], 'a finished Job is removed after its time to live');
const JC = C('job.cron');
eq([JC.schedule, JC.concurrency, val(F('cronjob-loader.yaml'), 'schedule'), val(F('cronjob-loader.yaml'), 'concurrencyPolicy')], ['* * * * *', 'Forbid', '* * * * *', 'Forbid'], 'the CronJob that ran is the CronJob of the manifest');
yes(JC.jobs_created >= 1 && JC.job_name_pattern && JC.suspended && JC.manual_job_succeeded, 'the schedule made a Job, it can be suspended, and a Job can be made from it');
yes(/the table now has 5000$/.test(X('job.cron_logs')) && /read 5000 rows/.test(X('job.cron_logs')), 'a scheduled load of the same file leaves the table at 5,000 rows');

// ---- resources, probes, shutdown ---------------------------------------------------------------------------------------------------------------------------------
// the rule of the QoS class, applied to the manifest text of each pod
const qosOf = text => {
  const block = n => { const m = new RegExp('^\\s+' + n + ':\\n((?:\\s{10,}\\S.*\\n?)+)', 'm').exec(text); return m ? m[1] : ''; };
  const req = block('requests'), lim = block('limits');
  if (!req && !lim) return 'BestEffort';
  const pick = (b, k) => { const m = new RegExp(k + ':\\s*(\\S+)').exec(b); return m ? m[1] : null; };
  const same = ['cpu', 'memory'].every(k => pick(req, k) && pick(req, k) === pick(lim, k));
  return same ? 'Guaranteed' : 'Burstable';
};
['besteffort', 'burstable', 'guaranteed'].forEach(k => eq(C('res.qos')[k], qosOf(F('pod-qos-' + k + '.yaml')), 'the QoS class of pod-qos-' + k + ' follows from its manifest'));
eq(qosOf(F('pod-oom.yaml')), 'Burstable', 'the memory pod has a limit and no request, which is Burstable by the same rule');
const PR = C('probe.ready');
eq([PR.before.ready_column, PR.before.phase, PR.before.endpoint_addresses, PR.after.ready_column, PR.after.endpoint_addresses], ['0/1', 'Running', 0, '1/1', 1], 'a pod that is Running but not ready is not in the endpoints, and is when it is ready');
yes(PR.before.listed_but_not_ready === 1, 'the Service listed the pod as not ready');
const PL = C('probe.live');
eq([PL.restarts_at_least_1, PL.event_reasons, PL.last_exit_code - 128], [true, ['Killing', 'Unhealthy'], 9], 'a failing liveness probe gives Unhealthy and Killing, and the container ended with 128 + 9');
yes(+val(F('pod-live.yaml'), 'failureThreshold') === 2, 'the probe is allowed two failures');
const SD = T('probe.shutdown').rows, handles = f => val(F(f), 'value') === '1';
const sdOf = name => SD.find(r => r[0] === name);
eq([sdOf('worker')[1], sdOf('worker')[2], handles('pod-worker.yaml')], ['no', 'yes', true], 'the worker with a handler did not wait and ran the handler');
eq([sdOf('worker-nohandler')[1], sdOf('worker-nohandler')[2], handles('pod-worker-nohandler.yaml')], ['yes', 'no', false], 'the worker without a handler waited the grace period and did not run the handler');
eq(SD.map(r => r[3]).concat([+val(F('pod-worker.yaml'), 'terminationGracePeriodSeconds')]), [5, 5, 5], 'both pods had a grace period of 5 seconds');

// ---- access and packaging: what a Role allows, from its rules -------------------------------------------------------------------------------------------------------
const role = F('rbac.yaml'), rules = { resources: JSON.parse(/resources:\s*(\[.*\])/.exec(role)[1]), verbs: JSON.parse(/verbs:\s*(\[.*\])/.exec(role)[1]) };
const allowed = (verb, res, ns) => ns === 'brewline' && rules.verbs.concat([]).indexOf(verb) >= 0 && rules.resources.indexOf(res) >= 0;      // a Role works only in its own namespace
const Q = { 'list pods in brewline': ['list', 'pods', 'brewline'], 'get the log of a pod in brewline': ['get', 'pods/log', 'brewline'], 'delete pods in brewline': ['delete', 'pods', 'brewline'], 'list secrets in brewline': ['list', 'secrets', 'brewline'], 'list pods in default': ['list', 'pods', 'default'], 'create deployments in brewline': ['create', 'deployments', 'brewline'] };
const RT = T('rbac.reader').rows;
eq(RT.length, Object.keys(Q).length, 'six questions were asked');
RT.forEach(r => eq(r[1], allowed.apply(null, Q[r[0]]) ? 'yes' : 'no', 'RBAC: ' + r[0]));
eq(C('rbac.default_sa').list_pods, 'no', 'the default service account has no Role');
yes(/Forbidden/.test(X('rbac.forbidden')) && /system:serviceaccount:brewline:reader/.test(X('rbac.forbidden')) && /cannot delete resource "pods"/.test(X('rbac.forbidden')) && /namespace "brewline"/.test(X('rbac.forbidden')), 'a Forbidden message names the user, the verb, the resource and the namespace');
const KO = F('kustomize/overlays/prod/kustomization.yaml'), KB = F('kustomize/base/deployment.yaml'), kz = X('kz.out');
const prefix = val(KO, 'namePrefix'), baseName = val(KB, 'name');
yes(kz.indexOf('name: ' + prefix + baseName) >= 0 && kz.indexOf('namespace: ' + val(KO, 'namespace')) >= 0 && new RegExp('replicas: ' + val(KO, 'count')).test(kz) && kz.indexOf(':' + val(KO, 'newTag')) >= 0 && /env: prod/.test(kz), 'the output of kustomize is the base with the changes of the overlay');
yes(+val(KB, 'replicas') === 1 && +val(KO, 'count') === 3, 'the base has one replica and the overlay three');
yes(Object.values(C('kz.facts')).every(v => v === true), 'every fact about the overlay output is true');
yes(C('val.strict').rc !== 0 && /unknown field "spec\.containers\[0\]\.imagee"/.test(X('val.strict')) && /\(server dry run\)/.test(X('val.dry_run')), 'strict validation refuses an unknown field with its path, and a dry run says what would happen');

// ---- the cluster --------------------------------------------------------------------------------------------------------------------------------------------------------------
yes(/^1\.\d+\.\d+$/.test(R.meta.kubernetes) && R.meta.kubelet === R.meta.kubernetes && /v\d+\.\d+\.\d+\+k3s\d+/.test(X('obj.nodes')), 'one cluster version in the meta, and the node reports it');
yes(R.meta.sandbox === true, 'the recording says that it was made in a sandbox with accommodations');

console.log(fails ? fails + ' of ' + checks + ' checks FAILED' : checks + ' checks passed');
process.exit(fails ? 1 : 0);
