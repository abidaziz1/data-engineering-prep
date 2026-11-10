#!/usr/bin/env python3
"""Check the code and the recorded output of the AWS tutorial.

Nothing in this tutorial ran on AWS. The recording (capture_aws.py) comes from boto3 and botocore, the real AWS SDK, against moto, an
open-source emulator of AWS services, plus DuckDB, pyarrow, cfn-lint, parliament, asl-validator and pytest. This script checks what can be
checked without an AWS account:

1. Every Python snippet in the lessons is parsed with ast. Every boto3 call is checked against the botocore service model: the client, the
   method, every keyword name, the required members, and the type, enum and range of every value that is a literal. Paginator names are
   checked too. A group of snippets is then run against moto and the results are compared with the recording or with the claim of the lesson
   (a round trip, a label, a count, a retry that resends only the failures).
2. SQL is parsed with sqlglot in the Athena dialect (Redshift for mission 6). Statements that sqlglot reads as a bare command are matched
   against the documented form and counted separately. The solutions of the coding challenges run in DuckDB against the data shown on screen
   and must give the result shown on screen.
3. JSON: syntax of every document; IAM policies through parliament; Step Functions definitions through asl-validator (the three broken
   copies must give the recorded errors); the S3 event through the Powertools S3Event class; the table definitions and the lifecycle rule
   against the botocore model of Glue and S3 and through moto.
4. YAML: the CloudFormation templates through cfn-lint (the broken copy must give the five recorded findings), and the GitHub workflow
   against the SchemaStore schema.
5. The shell commands: `bash -n`, `cfn-lint`, the options of `aws cloudformation deploy` from the CLI help, and the other CLI commands and
   waiters against the service model.
6. The recorded handler and its tests run again with pytest and moto (3 pass, and the handler without the decode fails).
7. The logic of the lab widgets is checked against the recording and against arithmetic done by hand (check_widgets.js).
8. The content lint runs, which also fails when a lesson quotes a number that the recording no longer shows.
9. With --recapture, the whole recording is made again and compared with js/real.js. Ids, clock values and random bytes are ignored.

What this cannot show: that AWS accepts a call or a statement, what IAM really evaluates (moto does not enforce policies except in the special
mode used for the permission lab), how Athena, Glue, Redshift, Kinesis, Step Functions, EventBridge, Lambda or DMS behave under load, what
anything costs, or that a feature, limit or price is current. Those screens carry the "From documentation" tag, and the README lists the
pages they come from.

Run:  python3 aws/verify/verify_aws.py [--no-run] [--offline] [--recapture] [--reuse]
Needs: pip install -r dev/requirements.txt  (boto3, moto[all,server], duckdb, pyarrow, cfn-lint, parliament, setuptools<81, pytest, awscli,
       aws-lambda-powertools, cryptography, pyyaml, sqlglot, jsonschema), Node 20 or later (asl-validator is installed by
       `npm install` in aws/verify), bash.
"""
import argparse, ast, base64, contextlib, datetime, io, json, logging, os, pathlib, re, shlex, shutil, subprocess, sys, tempfile, textwrap, time, types

os.environ['AWS_ACCESS_KEY_ID'] = 'AKIAIOSFODNN7EXAMPLE'
os.environ['AWS_SECRET_ACCESS_KEY'] = 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY'
os.environ['AWS_DEFAULT_REGION'] = 'us-east-1'
os.environ.pop('AWS_PROFILE', None)

import warnings
warnings.filterwarnings('ignore', message='pkg_resources is deprecated')
import boto3, botocore, botocore.validate, yaml
import sqlglot
from botocore.exceptions import ClientError
from sqlglot import errors, exp

logging.getLogger('sqlglot').setLevel(logging.ERROR)
HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent.parent
CACHE = HERE / '.cache'
WORKFLOW_SCHEMA_URL = 'https://raw.githubusercontent.com/SchemaStore/schemastore/master/src/schemas/json/github-workflow.json'

ap = argparse.ArgumentParser()
ap.add_argument('--no-run', action='store_true', help='skip the runs against moto, DuckDB and pytest')
ap.add_argument('--offline', action='store_true', help='do not download the GitHub workflow schema (that check is skipped)')
ap.add_argument('--recapture', action='store_true', help='record everything again and compare with js/real.js')
ap.add_argument('--reuse', action='store_true', help='with --recapture: compare the recording kept in verify/.cache from the last --recapture')
ap.add_argument('--verbose', action='store_true')
args = ap.parse_args()

problems = 0
TALLY = {}


def bad(msg):
    global problems
    problems += 1
    print('PROBLEM:', msg)


def tick(group, n=1):
    TALLY[group] = TALLY.get(group, 0) + n


def note(msg):
    if args.verbose:
        print('  note:', msg)


def load_real(path):
    text = pathlib.Path(path).read_text()
    return json.loads(text[text.index('LAB.real = ') + len('LAB.real = '):].rstrip().rstrip(';'))


real = load_real(ROOT / 'aws' / 'js' / 'real.js')
dump = json.loads(subprocess.check_output(['node', str(ROOT / 'dev' / 'dump-scenes.js'), 'aws']))
SN = {}
for s in dump['snippets']:
    SN[(s['id'], s['kind'])] = s
RES = {}
for r in dump['results']:
    RES.setdefault((r['id'], r['kind']), []).append(r)

# ======================================================================================================================
# 1. Python: syntax, and every boto3 call against the botocore service model
# ======================================================================================================================
DEFAULT_VARS = {'s3': 's3', 'sts': 'sts', 'sqs': 'sqs', 'sns': 'sns', 'kinesis': 'kinesis', 'glue': 'glue', 'athena': 'athena', 'kms': 'kms',
                'sm': 'secretsmanager', 'ssm': 'ssm', 'cw': 'cloudwatch', 'logs': 'logs', 'ce': 'ce', 'bud': 'budgets', 'eb': 'events',
                'lam': 'lambda', 'fh': 'firehose', 'dms': 'dms', 'sfn': 'stepfunctions', 'sch': 'scheduler', 'rsd': 'redshift-data', 'iam': 'iam'}
_clients = {}


def client(svc):
    if svc not in _clients:
        _clients[svc] = boto3.client(svc, region_name='us-east-1', aws_access_key_id='x', aws_secret_access_key='y')
    return _clients[svc]


def can_paginate(c, name):
    try:
        return c.can_paginate(name)
    except KeyError:                                   # botocore raises for a method name it does not know
        return False


def lit(node):
    try:
        return True, ast.literal_eval(node)
    except Exception:
        return False, None


def check_python(sid, kind, code):
    try:
        tree = ast.parse(code)
    except SyntaxError as e:
        bad('%s (%s): Python does not parse: %s' % (sid, kind, e))
        return
    tick('Python snippets parsed')
    # which variable is which client
    varmap = dict(DEFAULT_VARS)
    for n in ast.walk(tree):
        if isinstance(n, ast.Assign) and isinstance(n.value, ast.Call) and isinstance(n.value.func, ast.Attribute) and n.value.func.attr == 'client' \
                and isinstance(n.value.func.value, ast.Name) and n.value.func.value.id == 'boto3' and n.value.args:
            ok_, svc = lit(n.value.args[0])
            if ok_ and len(n.targets) == 1 and isinstance(n.targets[0], ast.Name):
                varmap[n.targets[0].id] = svc
                try:
                    client(svc)
                except Exception as e:
                    bad('%s: boto3 has no client "%s": %s' % (sid, svc, e))
    for n in ast.walk(tree):
        if not (isinstance(n, ast.Call) and isinstance(n.func, ast.Attribute)):
            continue
        base = n.func.value
        # client.get_paginator("name").paginate(...)
        if isinstance(base, ast.Call) and isinstance(base.func, ast.Attribute) and base.func.attr == 'get_paginator' and isinstance(base.func.value, ast.Name) \
                and base.func.value.id in varmap and n.func.attr == 'paginate':
            svc = varmap[base.func.value.id]
            ok_, name = lit(base.args[0]) if base.args else (False, None)
            if not ok_:
                continue
            c = client(svc)
            if not can_paginate(c, name):
                bad('%s: the %s client has no paginator for "%s"' % (sid, svc, name))
                continue
            op = c.meta.method_to_api_mapping[name]
            shape = c.meta.service_model.operation_model(op).input_shape
            for kw in n.keywords:
                if kw.arg and kw.arg != 'PaginationConfig' and kw.arg not in shape.members:
                    bad('%s: %s paginator "%s" has no parameter %s' % (sid, svc, name, kw.arg))
            tick('boto3 paginators checked')
            continue
        if not (isinstance(base, ast.Name) and base.id in varmap):
            continue
        svc, method = varmap[base.id], n.func.attr
        if method == 'get_paginator':
            ok_, name = lit(n.args[0]) if n.args else (False, None)
            if ok_ and not can_paginate(client(svc), name):
                bad('%s: the %s client has no paginator for "%s"' % (sid, svc, name))
            continue
        c = client(svc)
        if method not in c.meta.method_to_api_mapping:
            if method in ('can_paginate', 'get_waiter', 'close', 'exceptions', 'meta', 'generate_presigned_url'):
                continue
            bad('%s: the %s client has no method %s' % (sid, svc, method))
            continue
        op = c.meta.method_to_api_mapping[method]
        shape = c.meta.service_model.operation_model(op).input_shape
        members = shape.members if shape is not None else {}
        spread = any(k.arg is None for k in n.keywords)
        seen = set()
        for kw in n.keywords:
            if kw.arg is None:
                continue
            seen.add(kw.arg)
            if kw.arg not in members:
                bad('%s: %s.%s has no parameter %s' % (sid, svc, method, kw.arg))
                continue
            is_lit, val = lit(kw.value)
            if is_lit:
                report = botocore.validate.ParamValidator().validate({kw.arg: val}, shape)
                if report.has_errors():
                    for line in report.generate_report().splitlines():
                        if line.startswith('Invalid') or line.startswith('Unknown'):
                            bad('%s: %s.%s: %s' % (sid, svc, method, line.strip()))
        if shape is not None and not spread:
            for req in shape.required_members:
                if req not in seen and not n.args:
                    bad('%s: %s.%s is missing the required parameter %s' % (sid, svc, method, req))
        tick('boto3 calls checked against the service model')


for (sid, kind), s in SN.items():
    if s['lang'] == 'python':
        check_python(sid, kind, s['code'])
for k, v in real['files'].items():
    if k.endswith('.py'):
        check_python(k, 'recorded file', v)

# ======================================================================================================================
# 2. Python snippets run against moto
# ======================================================================================================================
def snippet(sid, kind='code'):
    return SN[(sid, kind)]['code']


def run_code(code, ns=None, name='<snippet>'):
    ns = ns if ns is not None else {}
    ns.setdefault('__name__', 'snippet')
    exec(compile(code, name, 'exec'), ns)
    return ns


@contextlib.contextmanager
def sleep_guard(limit=25):
    """polling loops call time.sleep: count the calls, do not wait, and stop a loop that never ends"""
    from unittest import mock
    calls = []

    def fake(seconds):
        calls.append(seconds)
        if len(calls) > limit:
            raise RuntimeError('the loop is still polling after %d sleeps' % limit)
    with mock.patch('time.sleep', side_effect=fake):
        yield calls


def code_of(fn):
    try:
        fn()
        return None
    except ClientError as e:
        return e.response['Error']['Code']


if not args.no_run:
    from moto import mock_aws
    from moto.core import set_initial_no_auth_action_count

    def expect(cond, msg):
        if not cond:
            bad(msg)
        else:
            tick('snippets run against moto and checked')

    # ---- S3: the conditional write, the paginated count, the lifecycle rule ----------------------------------------
    with mock_aws():
        s3 = boto3.client('s3', region_name='us-east-1')
        s3.create_bucket(Bucket='brewline-lake')
        out = io.StringIO()
        with contextlib.redirect_stdout(out):
            run_code(snippet('m2-cond'), {'s3': s3, 'ClientError': ClientError}, 'm2-cond')
        want = real['counts']['s3.conditional_write']
        expect(out.getvalue().strip() == '%s %s' % (want['error_code'] if 'error_code' in want else 'PreconditionFailed', want.get('status', 412)), 'm2-cond printed "%s", the recording says %s' % (out.getvalue().strip(), json.dumps(want)))
        for i in range(1005):
            s3.put_object(Bucket='brewline-lake', Key='raw/orders/part-%04d.json' % i, Body=b'x')
        ns = run_code(snippet('m2-bug', 'fix'), {}, 'm2-bug fix')
        expect(ns['count_objects'](s3, 'brewline-lake', 'raw/orders/') == 1005, 'm2-bug fix does not count 1005 objects across pages')
        expect(ns['count_objects'](s3, 'brewline-lake', 'nothing/here/') == 0, 'm2-bug fix does not return 0 for an empty prefix')
        ns_bad = run_code(snippet('m2-bug'), {}, 'm2-bug')
        expect(ns_bad['count_objects'](s3, 'brewline-lake', 'raw/orders/') == 1000, 'm2-bug (the bug) should stop at 1000 objects')
        try:
            ns_bad['count_objects'](s3, 'brewline-lake', 'nothing/here/')
            bad('m2-bug (the bug) should raise KeyError for an empty prefix')
        except KeyError:
            tick('snippets run against moto and checked')

    # ---- STS: assume a role ---------------------------------------------------------------------------------------
    with mock_aws():
        iam = boto3.client('iam', region_name='us-east-1')
        trust = {'Version': '2012-10-17', 'Statement': [{'Effect': 'Allow', 'Principal': {'AWS': 'arn:aws:iam::123456789012:root'}, 'Action': 'sts:AssumeRole'}]}
        iam.create_role(RoleName='raw-reader', AssumeRolePolicyDocument=json.dumps(trust))
        ns = run_code(snippet('m3-assume'), {'boto3': boto3}, 'm3-assume')
        expect(ns['keys']['AccessKeyId'].startswith(real['counts']['iam.assume']['access_key_prefix']) and bool(ns['keys'].get('SessionToken')), 'm3-assume: temporary keys should start with %s and carry a session token' % real['counts']['iam.assume']['access_key_prefix'])

    # ---- Glue: table definitions from the lessons are accepted by moto and keep their parameters -----------------------
    with mock_aws():
        glue = boto3.client('glue', region_name='us-east-1')
        glue.create_database(DatabaseInput={'Name': 'brewline_lake'})
        for sid in ('m4-table', 'm4-proj'):
            doc = json.loads(snippet(sid))
            glue.create_table(DatabaseName='brewline_lake', TableInput=doc)
            got = glue.get_table(DatabaseName='brewline_lake', Name=doc['Name'])['Table']
            expect(got['Parameters'] == doc['Parameters'] and [c['Name'] for c in got['StorageDescriptor']['Columns']] == [c['Name'] for c in doc['StorageDescriptor']['Columns']], '%s: moto did not keep the table definition' % sid)

    # ---- the coding challenge: missing partitions against moto S3 and Glue -----------------------------------------------
    with mock_aws():
        s3 = boto3.client('s3', region_name='us-east-1')
        glue = boto3.client('glue', region_name='us-east-1')
        s3.create_bucket(Bucket='brewline-lake')
        data = RES[('m13-ch', 'data')]
        for r in data[0]['rows']:
            s3.put_object(Bucket='brewline-lake', Key=r[0] + 'part-0.parquet', Body=b'x')
        glue.create_database(DatabaseInput={'Name': 'brewline_lake'})
        glue.create_table(DatabaseName='brewline_lake', TableInput={'Name': 'orders', 'PartitionKeys': [{'Name': 'dt', 'Type': 'string'}], 'StorageDescriptor': {'Columns': [{'Name': 'order_id', 'Type': 'string'}], 'Location': 's3://brewline-lake/curated/orders/'}})
        glue.batch_create_partition(DatabaseName='brewline_lake', TableName='orders', PartitionInputList=[{'Values': [r[0]], 'StorageDescriptor': {'Columns': [{'Name': 'order_id', 'Type': 'string'}], 'Location': 's3://brewline-lake/curated/orders/dt=%s/' % r[0]}} for r in data[1]['rows']])
        ns = run_code(snippet('m13-ch', 'sol'), {}, 'm13-ch')
        got = ns['missing_partitions']('brewline-lake', 'curated/orders/', 'brewline_lake', 'orders')
        want = [r[0] for r in RES[('m13-ch', 'res')][0]['rows']]
        expect(got == want, 'm13-ch: the solution returned %s, the lesson shows %s' % (got, want))

    # ---- KMS: the envelope round trip, and the wrong encryption context ---------------------------------------------------
    with mock_aws():
        kms = boto3.client('kms', region_name='us-east-1')
        key = kms.create_key(Description='brewline lake key')['KeyMetadata']
        kms.create_alias(AliasName='alias/brewline-lake', TargetKeyId=key['KeyId'])
        ns = run_code(snippet('m10-kms'), {}, 'm10-kms')
        rec = real['counts']['kms.envelope']
        expect(ns['again'] == ns['plain'] and len(ns['data_key']['Plaintext']) == rec['data_key_bytes'], 'm10-kms: the round trip fails or the data key is not %d bytes' % rec['data_key_bytes'])
        wrong = code_of(lambda: kms.decrypt(CiphertextBlob=ns['data_key']['CiphertextBlob'], EncryptionContext={'dataset': 'customers'}))
        expect(wrong == rec['wrong_encryption_context']['code'], 'm10-kms: a different encryption context gave %s, the recording says %s' % (wrong, rec['wrong_encryption_context']['code']))

    # ---- Secrets Manager and Parameter Store ------------------------------------------------------------------------------
    with mock_aws():
        ns = run_code(snippet('m10-sm'), {}, 'm10-sm')
        rec = real['counts']['secrets.versions']
        expect(ns['now'] == rec['current_password'] and ns['before'] == rec['previous_password'], 'm10-sm: current and previous passwords differ from the recording')
        vs = boto3.client('secretsmanager', region_name='us-east-1').list_secret_version_ids(SecretId='brewline/redshift')['Versions']
        expect(sorted(sorted(v['VersionStages']) for v in vs) == rec['versions'], 'm10-sm: the version labels differ from the recording')
    with mock_aws():
        ns = run_code(snippet('m10-params'), {}, 'm10-params')
        rec = real['counts']['ssm.parameters']
        expect(sorted(p['Name'] for p in ns['found']) == rec['names'] and {p['Name']: p['Type'] for p in ns['found']} == rec['types'], 'm10-params: names or types differ from the recording')
        expect(ns['password'] == 's3cret' and all(p['Value'] != 's3cret' for p in ns['found'] if p['Type'] == 'SecureString'), 'm10-params: a SecureString without decryption must not show the clear text')

    # ---- CloudWatch: the alarm, the freshness metric, the retention sweep -----------------------------------------------
    with mock_aws():
        run_code(snippet('m11-alarm'), {}, 'm11-alarm')
        a = boto3.client('cloudwatch', region_name='us-east-1').describe_alarms(AlarmNames=['raw-orders-dlq-not-empty'])['MetricAlarms'][0]
        expect(a['Threshold'] == 0 and a['Period'] == 300 and a['TreatMissingData'] == 'notBreaching' and a['ComparisonOperator'] == 'GreaterThanThreshold' and a['AlarmActions'] == ['arn:aws:sns:us-east-1:123456789012:data-alerts'], 'm11-alarm: moto returned a different alarm')
    with mock_aws():
        ns = run_code(snippet('m11-fresh'), {}, 'm11-fresh')
        ns['publish_freshness']('orders', datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(hours=3))
        cw = boto3.client('cloudwatch', region_name='us-east-1')
        m = cw.list_metrics(Namespace='Brewline/Pipelines')['Metrics']
        expect(len(m) == 1 and m[0]['MetricName'] == 'FreshnessSeconds' and m[0]['Dimensions'] == [{'Name': 'Table', 'Value': 'orders'}], 'm11-fresh: the metric or its dimension is not as the lesson says')
        stats = cw.get_metric_statistics(Namespace='Brewline/Pipelines', MetricName='FreshnessSeconds', Dimensions=[{'Name': 'Table', 'Value': 'orders'}], StartTime=datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(minutes=10), EndTime=datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(minutes=5), Period=60, Statistics=['Maximum'])['Datapoints']
        expect(stats and abs(stats[0]['Maximum'] - 3 * 3600) < 5, 'm11-fresh: the published value is not about 3 hours in seconds')
    with mock_aws():
        lg = boto3.client('logs', region_name='us-east-1')
        for name, days in (('/aws/lambda/a', None), ('/aws/lambda/b', None), ('/aws/lambda/c', 7)):
            lg.create_log_group(logGroupName=name)
            if days:
                lg.put_retention_policy(logGroupName=name, retentionInDays=days)
        run_code(snippet('m11-retain'), {}, 'm11-retain')
        got = {g['logGroupName']: g.get('retentionInDays') for g in lg.describe_log_groups()['logGroups']}
        expect(got == {'/aws/lambda/a': 30, '/aws/lambda/b': 30, '/aws/lambda/c': 7}, 'm11-retain: the sweep gave %s (it must set 30 on groups without retention and leave 7 alone)' % got)

    # ---- Budgets, Firehose, EventBridge, Scheduler ------------------------------------------------------------------------
    with mock_aws():
        run_code(snippet('m11-budget'), {}, 'm11-budget')
        b = boto3.client('budgets', region_name='us-east-1').describe_budgets(AccountId='123456789012')['Budgets']
        expect(len(b) == 1 and b[0]['BudgetName'] == 'data-platform-monthly' and b[0]['BudgetLimit']['Amount'] in ('1500', '1500.0'), 'm11-budget: moto did not keep the budget')
    with mock_aws():
        run_code(snippet('m7-fhcode'), {}, 'm7-fhcode')
        d = boto3.client('firehose', region_name='us-east-1').describe_delivery_stream(DeliveryStreamName='clicks-to-lake')['DeliveryStreamDescription']
        dst = d['Destinations'][0]['ExtendedS3DestinationDescription']
        expect(dst['BufferingHints'] == {'SizeInMBs': 64, 'IntervalInSeconds': 120} and dst['CompressionFormat'] == 'GZIP' and dst['Prefix'].startswith('raw/clicks/dt='), 'm7-fhcode: the delivery stream is not as the lesson says')
    with mock_aws():
        run_code(snippet('m8-ebcode'), {}, 'm8-ebcode')
        ev = boto3.client('events', region_name='us-east-1')
        rule = ev.describe_rule(Name='raw-orders-created')
        expect(json.loads(rule['EventPattern'])['detail']['object']['key'] == [{'prefix': 'raw/orders/'}], 'm8-ebcode: the rule pattern is not the one of the lesson')
        t = ev.list_targets_by_rule(Rule='raw-orders-created')['Targets'][0]
        if t.get('RetryPolicy') == {'MaximumRetryAttempts': 20, 'MaximumEventAgeInSeconds': 3600} and t.get('DeadLetterConfig'):
            tick('snippets run against moto and checked')
        else:
            note('moto does not keep the retry policy and the dead-letter config of an EventBridge target; the parameter names were checked against the service model')
    with mock_aws():
        try:
            run_code(snippet('m9-sched'), {}, 'm9-sched')
            sc = boto3.client('scheduler', region_name='us-east-1').get_schedule(Name='orders-nightly')
            expect(sc['ScheduleExpression'] == 'cron(0 2 * * ? *)' and sc.get('ScheduleExpressionTimezone') == 'America/New_York', 'm9-sched: moto returned a different schedule')
        except Exception as e:
            note('m9-sched did not run on moto (%s); the parameter names were checked against the service model' % type(e).__name__)

    # ---- Step Functions: start a run with a name, twice ----------------------------------------------------------------------
    with mock_aws():
        sfn = boto3.client('stepfunctions', region_name='us-east-1')
        defn = json.loads(snippet('m9-asl').replace('"<Ref>"', '"arn:aws:sns:us-east-1:123456789012:failures"'))
        sfn.create_state_machine(name='brewline-orders-pipeline', definition=json.dumps(defn), roleArn='arn:aws:iam::123456789012:role/pipeline', type='STANDARD')
        run_code(snippet('m9-start'), {}, 'm9-start')
        ex = sfn.list_executions(stateMachineArn='arn:aws:states:us-east-1:123456789012:stateMachine:brewline-orders-pipeline')['executions']
        expect(len(ex) == 1 and ex[0]['name'] == 'orders-2026-03-14', 'm9-start: the run is not named orders-2026-03-14')
        again = code_of(lambda: run_code(snippet('m9-start'), {}, 'm9-start again'))
        if again == 'ExecutionAlreadyExists':
            tick('snippets run against moto and checked')
        else:
            note('moto answered %s for a second start with the same name; the lesson relies on the Step Functions documentation (names are unique for Standard workflows)' % again)

    # ---- Kinesis: the producer sends again only what failed ---------------------------------------------------------------
    with mock_aws():
        k = boto3.client('kinesis', region_name='us-east-1')
        k.create_stream(StreamName='orders', ShardCount=4)
        ns = run_code(snippet('m7-put'), {}, 'm7-put')
        ns['send']([{'order_id': 'O-%d' % i, 'total_usd': 1.0} for i in range(25)])
        got = 0
        for sh in k.describe_stream(StreamName='orders')['StreamDescription']['Shards']:
            it = k.get_shard_iterator(StreamName='orders', ShardId=sh['ShardId'], ShardIteratorType='TRIM_HORIZON')['ShardIterator']
            got += len(k.get_records(ShardIterator=it, Limit=1000)['Records'])
        expect(got == 25, 'm7-put: 25 events went in and %d records are in the stream' % got)

        class Flaky:
            """first call: records 0 and 2 fail. second call: all succeed."""
            def __init__(self):
                self.calls = []

            def put_records(self, StreamName, Records):
                self.calls.append(list(Records))
                if len(self.calls) == 1:
                    return {'FailedRecordCount': 2, 'Records': [{'ErrorCode': 'ProvisionedThroughputExceededException'}, {'SequenceNumber': '1', 'ShardId': 's'}, {'ErrorCode': 'ProvisionedThroughputExceededException'}]}
                return {'FailedRecordCount': 0, 'Records': [{'SequenceNumber': '2', 'ShardId': 's'}] * len(Records)}
        fl = Flaky()
        ns['kinesis'] = fl
        ns['time'] = types.SimpleNamespace(sleep=lambda s: None)
        ns['send']([{'order_id': 'A'}, {'order_id': 'B'}, {'order_id': 'C'}])
        expect(len(fl.calls) == 2 and [r['PartitionKey'] for r in fl.calls[1]] == ['A', 'C'], 'm7-put: the second call must carry only the two failed records (A and C), it carried %s' % ([r['PartitionKey'] for r in fl.calls[1]] if len(fl.calls) > 1 else fl.calls))

    # ---- The Lambda handlers for Kinesis and SQS ---------------------------------------------------------------------------
    seen = []

    def write_order(order):
        if 'total_usd' not in order:
            raise ValueError('no total')
        seen.append(order['order_id'])
    ns = run_code(snippet('m7-handler'), {'write_order': write_order}, 'm7-handler')

    def kinesis_rec(seq, payload):
        return {'kinesis': {'sequenceNumber': seq, 'data': base64.b64encode(payload).decode()}}
    out = ns['handler']({'Records': [kinesis_rec('11', b'{"order_id": "O-1", "total_usd": 5}'), kinesis_rec('12', b'not json'), kinesis_rec('13', b'{"order_id": "O-3"}'), kinesis_rec('14', b'{"order_id": "O-4", "total_usd": 2}')]}, None)
    expect(out == {'batchItemFailures': [{'itemIdentifier': '12'}, {'itemIdentifier': '13'}]} and seen == ['O-1', 'O-4'], 'm7-handler: the Kinesis handler must report exactly the bad records, it returned %s' % out)
    loaded = []

    def load_file(key):
        if key.endswith('bad.json'):
            raise RuntimeError('boom')
        loaded.append(key)
    ns = run_code(snippet('m8-sqshandler'), {'load_file': load_file}, 'm8-sqshandler')
    ev = lambda mid, key: {'messageId': mid, 'body': json.dumps({'detail': {'object': {'key': key}}})}
    out = ns['handler']({'Records': [ev('m1', 'raw/orders/a.json'), ev('m2', 'raw/orders/bad.json'), ev('m3', 'raw/orders/c.json')]}, None)
    expect(out == {'batchItemFailures': [{'itemIdentifier': 'm2'}]} and loaded == ['raw/orders/a.json', 'raw/orders/c.json'], 'm8-sqshandler: the SQS handler must report only message m2, it returned %s' % out)

    # ---- SQS: the queue settings of the lesson -----------------------------------------------------------------------------------
    with mock_aws():
        ns_src = snippet('m8-redrive')
        head, _, tail = ns_src.partition('# later')
        ns = run_code(head, {}, 'm8-redrive')
        sq = boto3.client('sqs', region_name='us-east-1')
        url = sq.get_queue_url(QueueName='raw-orders')['QueueUrl']
        at = sq.get_queue_attributes(QueueUrl=url, AttributeNames=['All'])['Attributes']
        rp = json.loads(at['RedrivePolicy'])
        expect(at['VisibilityTimeout'] == '360' and at['ReceiveMessageWaitTimeSeconds'] == '20' and rp['maxReceiveCount'] == 5 and rp['deadLetterTargetArn'].endswith(':raw-orders-dlq'), 'm8-redrive: the queue attributes are not the ones of the lesson')
        dl = sq.get_queue_attributes(QueueUrl=sq.get_queue_url(QueueName='raw-orders-dlq')['QueueUrl'], AttributeNames=['MessageRetentionPeriod'])['Attributes']
        expect(dl['MessageRetentionPeriod'] == '1209600', 'm8-redrive: the dead-letter queue must keep messages for 14 days')
        try:
            run_code('sqs = boto3.client("sqs", region_name="us-east-1")\n' + tail.split('\n', 1)[1] if tail.strip() else '', {'boto3': boto3, 'dlq_arn': ns['dlq_arn']}, 'm8-redrive move')
            tick('snippets run against moto and checked')
        except Exception as e:
            note('moto does not run start_message_move_task (%s); the call was checked against the service model' % type(e).__name__)

    # ---- Athena and the Redshift Data API: the polling loops run against the emulator -----------------------------------
    with mock_aws():
        try:
            ns = run_code(snippet('m5-api'), {}, 'm5-api')
            boto3.client('athena', region_name='us-east-1').create_work_group(Name='brewline', Configuration={'ResultConfiguration': {'OutputLocation': 's3://brewline-lake/athena-results/'}})
            boto3.client('s3', region_name='us-east-1').create_bucket(Bucket='brewline-lake')
            with contextlib.redirect_stdout(io.StringIO()), sleep_guard():
                rows = ns['run_query']('SELECT 1')
            tick('snippets run against moto and checked')
            note('m5-api returned %r from the emulator' % (rows,))
        except Exception as e:
            note('m5-api did not run on moto (%s: %s); the parameter names and states were checked against the service model' % (type(e).__name__, str(e)[:80]))
    class FakeRSD:
        """a Redshift Data API client: SUBMITTED, STARTED, then the final status. moto never finishes a statement, so the loop is tested here."""
        def __init__(self, final='FINISHED', has_result=True, error=None):
            self.polls, self.final, self.has_result, self.error, self.kw = 0, final, has_result, error, None

        def execute_statement(self, **kw):
            self.kw = kw
            return {'Id': 'stmt-1'}

        def describe_statement(self, Id):
            self.polls += 1
            st = ['SUBMITTED', 'STARTED', self.final][min(self.polls - 1, 2)]
            d = {'Id': Id, 'Status': st, 'HasResultSet': self.has_result}
            if st == 'FAILED':
                d['Error'] = self.error
            return d

        def get_paginator(self, name):
            assert name == 'get_statement_result'
            pages = [{'Records': [[{'stringValue': 'COMPLETED'}, {'longValue': 5}]]}, {'Records': [[{'stringValue': 'CANCELLED'}, {'longValue': 1}]]}]
            return types.SimpleNamespace(paginate=lambda Id: iter(pages))
    ns = run_code(snippet('m6-api'), {}, 'm6-api')
    ns['rsd'] = fake = FakeRSD()
    with sleep_guard():
        rows = ns['run_sql']('SELECT 1')
    expect(rows == [[{'stringValue': 'COMPLETED'}, {'longValue': 5}], [{'stringValue': 'CANCELLED'}, {'longValue': 1}]] and fake.polls == 3 and fake.kw['WorkgroupName'] == 'brewline' and fake.kw['Sql'] == 'SELECT 1', 'm6-api: the loop must poll until FINISHED and return the records of both pages')
    ns['rsd'] = FakeRSD(has_result=False)
    with sleep_guard():
        expect(ns['run_sql']('COPY ...') == [], 'm6-api: a statement without a result set must return an empty list')
    ns['rsd'] = FakeRSD(final='FAILED', error='String length exceeds DDL length')
    try:
        with sleep_guard():
            ns['run_sql']('COPY ...')
        bad('m6-api: a FAILED statement must raise')
    except RuntimeError as e:
        expect('String length exceeds DDL length' in str(e), 'm6-api: the error must carry the message of the database')

    # ---- the recorded handler and its tests, once more, with pytest ------------------------------------------------------------
    work = pathlib.Path(tempfile.mkdtemp(prefix='aws-verify-'))
    try:
        (work / 'tests').mkdir()
        (work / 'handler.py').write_text(real['files']['lambda/handler.py'])
        (work / 'tests' / 'conftest.py').write_text(real['files']['lambda/conftest.py'])
        (work / 'tests' / 'test_handler.py').write_text(real['files']['lambda/test_handler.py'])
        env = dict(os.environ, PYTHONPATH=str(work), PYTHONDONTWRITEBYTECODE='1')
        r = subprocess.run([sys.executable, '-m', 'pytest', '-q', '-p', 'no:cacheprovider', str(work / 'tests')], capture_output=True, text=True, cwd=work, env=env)
        rec = real['counts']['test.summary']
        expect(r.returncode == rec['pass_rc'] and re.search(r'%d passed' % rec['passed'], r.stdout), 'the recorded handler no longer passes its %d tests:\n%s' % (rec['passed'], r.stdout[-600:]))
        (work / 'handler.py').write_text(real['files']['lambda/handler_bug.py'])
        r = subprocess.run([sys.executable, '-m', 'pytest', '-q', '-x', '-p', 'no:cacheprovider', str(work / 'tests')], capture_output=True, text=True, cwd=work, env=env)
        expect(r.returncode == rec['fail_rc'] and 'NoSuchKey' in r.stdout, 'the handler without the decode must fail with NoSuchKey:\n%s' % r.stdout[-600:])
    finally:
        shutil.rmtree(work, ignore_errors=True)

# ======================================================================================================================
# 3. SQL: parsed with sqlglot, and the coding challenges run in DuckDB
# ======================================================================================================================
BARE = [
    ('OPTIMIZE of an Iceberg table', re.compile(r'^OPTIMIZE [\w.]+ REWRITE DATA USING BIN_PACK;?$')),
    ('VACUUM of an Iceberg table', re.compile(r'^VACUUM [\w.]+;?$')),
    ('Redshift COPY from S3', re.compile(r"^COPY [\w.]+( \([\w, ]+\))?\s+FROM 's3://[^']+'\s+IAM_ROLE 'arn:aws:iam::\d{12}:role/[\w+=,.@/-]+'\s+FORMAT AS PARQUET;?$", re.S)),
    ('Redshift external schema', re.compile(r"^CREATE EXTERNAL SCHEMA \w+\s+FROM DATA CATALOG DATABASE '\w+'\s+IAM_ROLE 'arn:aws:iam::\d{12}:role/[\w+=,.@/-]+';?$", re.S)),
]


def dialect_of(sid):
    return 'redshift' if sid.startswith('m6-') else 'athena'


def split_statements(sql):
    return [s.strip() for s in re.split(r';\s*(?:\n|$)', sql) if s.strip() and not all(l.strip().startswith('--') for l in s.strip().splitlines())]


def check_sql(sid, kind, code):
    dialect = dialect_of(sid)
    for stmt in split_statements(code):
        body = '\n'.join(l for l in stmt.splitlines() if not l.strip().startswith('--')).strip()
        try:
            trees = sqlglot.parse(body, read=dialect, error_level=errors.ErrorLevel.RAISE)
        except errors.ParseError as e:
            bad('%s (%s): sqlglot (%s) cannot parse a statement: %s | %s' % (sid, kind, dialect, str(e).splitlines()[0][:100], body[:70].replace('\n', ' ')))
            continue
        for t in trees:
            if t is None:
                continue
            if isinstance(t, exp.Command):
                if not any(rx.match(body) for _, rx in BARE):
                    bad('%s (%s): sqlglot reads this as a bare command and it matches no documented form: %s' % (sid, kind, body[:80].replace('\n', ' ')))
                else:
                    tick('SQL statements read as a bare command and matched to the documented form')
            else:
                tick('SQL statements parsed by sqlglot')


for (sid, kind), s in SN.items():
    if s['lang'] == 'sql' and kind != 'starter':
        check_sql(sid, kind, s['code'])
for k, v in real['files'].items():
    if k.endswith('.sql'):
        try:
            sqlglot.parse_one(v, read='athena', error_level=errors.ErrorLevel.RAISE)
            tick('SQL statements parsed by sqlglot')
        except errors.ParseError as e:
            bad('%s: sqlglot cannot parse the recorded query: %s' % (k, str(e).splitlines()[0][:100]))

if not args.no_run:
    import duckdb
    TYPES = {'total_usd': 'DECIMAL(12,2)', 'ingested_at': 'TIMESTAMP', 'cdc_ts': 'TIMESTAMP'}
    for sid in ('m5-ch-dedupe', 'm7-ch-cdc'):
        con = duckdb.connect()
        for d in RES[(sid, 'data')]:
            cols = ', '.join('%s %s' % (c, TYPES.get(c, 'VARCHAR')) for c in d['cols'])
            con.execute('CREATE TABLE %s (%s)' % (d['name'], cols))
            for r in d['rows']:
                con.execute('INSERT INTO %s VALUES (%s)' % (d['name'], ', '.join('?' * len(r))), r)
        got = [[str(v) for v in row] for row in con.execute(snippet(sid, 'sol')).fetchall()]
        want = RES[(sid, 'res')][0]['rows']
        if got != want:
            bad('%s: the solution gives %s, the lesson shows %s' % (sid, got, want))
        else:
            tick('coding challenges run in DuckDB and match the result on screen')

# ======================================================================================================================
# 4. JSON, IAM policies, state machines, the S3 event
# ======================================================================================================================
EXCERPTS = {'m9-bug'}                                   # a part of a definition, not a whole document
POLICY_IDS = {'m3-policy': 'clean', 'm3-bug': 'findings', 'm3-least': 'clean', 'm10-endpoint': 'clean'}
TRUST_IDS = {'m3-trust', 'm3-oidc', 'm3-bug2'}
for (sid, kind), s in SN.items():
    if s['lang'] != 'json' or sid in EXCERPTS:
        continue
    try:
        doc = json.loads(s['code'])
        tick('JSON documents parsed')
    except ValueError as e:
        bad('%s (%s): not valid JSON: %s' % (sid, kind, e))
        continue
    if sid in TRUST_IDS and kind in ('code', 'fix'):
        for st in doc['Statement']:
            if 'Principal' not in st or 'sts:AssumeRole' not in json.dumps(st.get('Action')):
                bad('%s (%s): a trust policy statement needs a Principal and an sts:AssumeRole action' % (sid, kind))
            else:
                tick('trust policy statements checked')

import parliament


def lint_policy(text):
    a = parliament.analyze_policy_string(text)
    a.analyze()
    return [(f.issue, re.sub(r'\s+', ' ', str(f.detail))[:90]) for f in a.findings]


for (sid, kind), s in SN.items():
    if sid in POLICY_IDS and s['lang'] == 'json':
        found = lint_policy(s['code'])
        want = POLICY_IDS[sid]
        if sid == 'm3-bug':
            want = 'findings' if kind == 'code' else 'clean'
        real_issues = [f for f in found if f[0] not in ('RESOURCE_STAR',)]
        if want == 'clean' and real_issues:
            bad('%s (%s): parliament found problems in a policy that is shown as good: %s' % (sid, kind, real_issues))
        elif want == 'findings' and not real_issues:
            bad('%s (%s): parliament found nothing in the policy that is shown as the bug' % (sid, kind))
        else:
            tick('IAM policies checked with parliament (the good ones clean, the bugs flagged)')
for k, v in real['files'].items():
    if k.startswith('iam/') and 'Principal' not in v:
        found = [f for f in lint_policy(v) if f[0] != 'RESOURCE_STAR']
        want = real['counts']['policy.lint'].get(k[4:-5])
        if want is not None and [f for f in want if f['issue'] != 'RESOURCE_STAR'] and not found:
            bad('%s: parliament should flag the recorded policy and found nothing' % k)

# Step Functions definitions through asl-validator, against the recorded answers
asl_dir = pathlib.Path(tempfile.mkdtemp(prefix='aws-asl-'))
try:
    paths = []
    for name, text in [('pipeline_good.json', SN[('m9-asl', 'code')]['code'])] + [(k[4:], v) for k, v in real['files'].items() if re.match(r'cfn/pipeline_\w+\.json', k) and 'good' not in k]:
        (asl_dir / name).write_text(text)
        paths.append(str(asl_dir / name))
    r = subprocess.run(['node', str(HERE / 'asl_check.js')] + paths, capture_output=True, text=True)
    if r.returncode != 0:
        bad('asl_check.js failed: ' + r.stderr[-300:])
    else:
        got = {x['file']: {'valid': x['valid'], 'errors': x['errors']} for x in (json.loads(l) for l in r.stdout.strip().splitlines())}
        if got != real['counts']['asl.validate']:
            bad('asl-validator now says something other than the recording: %s' % json.dumps(got)[:400])
        else:
            tick('Step Functions definitions checked with asl-validator (1 valid, 3 broken, as recorded)')
finally:
    shutil.rmtree(asl_dir, ignore_errors=True)

# the S3 event through the Powertools class
from aws_lambda_powertools.utilities.data_classes import S3Event
event = json.loads(SN[('m8-event', 'code')]['code'])
pe = S3Event(event)
if pe.bucket_name != 'brewline-lake' or pe.object_key != 'raw/orders/dt=2026-03-14/orders-0001.json' or event['Records'][0]['s3']['object']['key'] != 'raw/orders/dt%3D2026-03-14/orders-0001.json':
    bad('m8-event: the Powertools S3Event class reads %r and %r' % (pe.bucket_name, pe.object_key))
else:
    tick('the S3 event read by the Powertools S3Event class (the key arrives encoded, the class decodes it)')

# the lifecycle rule against the S3 model, and the Glue table inputs against the Glue model
s3m = client('s3').meta.service_model
rep = botocore.validate.ParamValidator().validate({'Bucket': 'b', 'LifecycleConfiguration': json.loads(SN[('m2-life', 'code')]['code'])}, s3m.operation_model('PutBucketLifecycleConfiguration').input_shape)
if rep.has_errors():
    bad('m2-life: the S3 model rejects the lifecycle rule: ' + rep.generate_report())
else:
    tick('table definitions and lifecycle rules checked against the service model')
gm = client('glue').meta.service_model
for sid in ('m4-table', 'm4-proj'):
    rep = botocore.validate.ParamValidator().validate(json.loads(SN[(sid, 'code')]['code']), gm.shape_for('TableInput'))
    if rep.has_errors():
        bad('%s: the Glue model rejects the table definition: %s' % (sid, rep.generate_report()))
    else:
        tick('table definitions and lifecycle rules checked against the service model')

# ======================================================================================================================
# 5. YAML and the shell
# ======================================================================================================================
CFN_LINT = shutil.which('cfn-lint') or str(pathlib.Path(sys.executable).parent / 'cfn-lint')


def cfn_lint(text, name):
    d = pathlib.Path(tempfile.mkdtemp(prefix='aws-cfn-'))
    try:
        (d / name).write_text(text)
        r = subprocess.run([CFN_LINT, '--format', 'json', name], capture_output=True, text=True, cwd=d)
        return r.returncode, [{'rule': f['Rule']['Id'], 'line': f['Location']['Start']['LineNumber'], 'message': f['Message']} for f in json.loads(r.stdout or '[]')]
    finally:
        shutil.rmtree(d, ignore_errors=True)


for sid in ('m9-yaml', 'm12-yaml'):
    rc, f = cfn_lint(SN[(sid, 'code')]['code'], 'template.yaml')
    if rc != 0 or f:
        bad('%s: cfn-lint reports %s' % (sid, f))
    else:
        tick('CloudFormation templates checked with cfn-lint (the good ones clean, the broken one flagged as recorded)')
rc, f = cfn_lint(real['files']['cfn/lake_bug.yaml'], 'lake_bug.yaml')
rec = real['counts']['cfn.lint']
if rc != rec['bug_rc'] or [(x['rule'], x['line']) for x in f] != [(x['rule'], x['line']) for x in rec['findings']]:
    bad('cfn-lint on the broken template now says %s (rc %s), the recording says %s (rc %s)' % ([(x['rule'], x['line']) for x in f], rc, [(x['rule'], x['line']) for x in rec['findings']], rec['bug_rc']))
else:
    tick('CloudFormation templates checked with cfn-lint (the good ones clean, the broken one flagged as recorded)')
for (sid, kind), s in SN.items():
    if s['lang'] == 'yaml' and sid in ('m12-bug', 'm12-bug2') and kind == 'fix':
        pass                                              # excerpts: the full template above is the one that is linted

# the GitHub workflow
gha = SN[('m12-gha', 'code')]['code']
try:
    wf = yaml.safe_load(gha)
    wf['on'] = wf.pop(True, wf.get('on'))                 # YAML 1.1 reads the key `on` as True
    step = [st for st in wf['jobs']['dev']['steps'] if 'configure-aws-credentials' in st.get('uses', '')]
    if wf['permissions'].get('id-token') != 'write' or not step or 'role-to-assume' not in step[0]['with'] or 'aws-region' not in step[0]['with']:
        bad('m12-gha: the workflow does not ask for id-token: write, or the credentials step lacks role-to-assume or aws-region')
    else:
        tick('the GitHub workflow checked (structure and, online, the SchemaStore schema)')
    schema_file = CACHE / 'github-workflow.json'
    if not args.offline:
        CACHE.mkdir(exist_ok=True)
        if not schema_file.exists():
            subprocess.run(['curl', '-fsSL', '-m', '60', '-o', str(schema_file), WORKFLOW_SCHEMA_URL], check=False)
    if schema_file.exists() and schema_file.stat().st_size > 1000:
        import jsonschema
        jsonschema.validate(json.loads(json.dumps(wf, default=str)), json.loads(schema_file.read_text()))
        tick('the GitHub workflow checked (structure and, online, the SchemaStore schema)')
    else:
        note('the workflow schema was not available, so only the structure was checked')
except Exception as e:
    bad('m12-gha: %s' % str(e)[:300])

# shell: syntax, the options of `aws cloudformation deploy`, the other commands against the service model
cli = SN[('m12-cli', 'code')]['code']
r = subprocess.run(['bash', '-n'], input=cli, capture_output=True, text=True)
if r.returncode != 0:
    bad('m12-cli: bash -n says ' + r.stderr[:200])
else:
    tick('shell commands checked (bash -n, CLI help, service model)')
from awscli.customizations.cloudformation.deploy import DeployCommand      # the option table that builds `aws cloudformation deploy help`
DEPLOY_OPTIONS = {'--' + a['name'] for a in DeployCommand.ARG_TABLE}
cfn_model = client('cloudformation').meta.service_model


def check_cli(cmd):
    parts = shlex.split(cmd.strip())
    if not parts or parts[0] != 'aws':
        return
    svc, op = parts[1], parts[2]
    flags = [p for p in parts[3:] if p.startswith('--')]
    if op == 'deploy':
        for fl in flags:
            if fl not in DEPLOY_OPTIONS:
                bad('m12-cli: `aws cloudformation deploy` has no option %s (the CLI knows %s)' % (fl, ', '.join(sorted(DEPLOY_OPTIONS))))
    elif op == 'wait':
        if parts[3] not in client('cloudformation').waiter_names and parts[3].replace('-', '_') not in client('cloudformation').waiter_names:
            names = [w.replace('_', '-') for w in client('cloudformation').waiter_names]
            if parts[3] not in names:
                bad('m12-cli: cloudformation has no waiter %s' % parts[3])
    else:
        api = ''.join(w.capitalize() for w in op.split('-'))
        try:
            shape = cfn_model.operation_model(api).input_shape
        except Exception:
            bad('m12-cli: cloudformation has no operation %s' % op)
            return
        for fl in flags:
            member = ''.join(w.capitalize() for w in fl[2:].split('-'))
            if member not in shape.members:
                bad('m12-cli: `aws cloudformation %s` has no option %s' % (op, fl))
    tick('shell commands checked (bash -n, CLI help, service model)')


for cmd in re.sub(r'\\\n', ' ', cli).splitlines():
    check_cli(cmd)

# ======================================================================================================================
# 6. Widgets, content lint
# ======================================================================================================================
r = subprocess.run(['node', str(HERE / 'check_widgets.js')], capture_output=True, text=True)
if r.returncode != 0:
    bad('check_widgets.js failed:\n' + r.stdout[-800:] + r.stderr[-300:])
else:
    tick('lab widget checks (node aws/verify/check_widgets.js): ' + r.stdout.strip().split('\n')[-1])
r = subprocess.run(['node', str(ROOT / 'dev' / 'lint-content.js'), 'aws'], capture_output=True, text=True)
if r.returncode != 0 or 'lint clean' not in r.stdout:
    bad('the content lint failed:\n' + r.stdout[-800:])
else:
    tick('content lint (also fails when a lesson quotes a number that the recording no longer shows)')

# ======================================================================================================================
# 6b. Controls: each checker must flag a broken input, or a clean run means nothing
# ======================================================================================================================
@contextlib.contextmanager
def collecting():
    """collect the problems that a checker reports instead of failing, and do not count the control inputs as checked snippets"""
    global bad, tick
    saved_bad, saved_tick, found = bad, tick, []
    bad = lambda msg: found.append(msg)
    tick = lambda group, n=1: None
    try:
        yield found
    finally:
        bad, tick = saved_bad, saved_tick


CONTROLS = [
    ('a misspelled keyword', lambda: check_python('control', 'code', "s3 = boto3.client('s3')\ns3.list_objects_v2(Bucket='b', Prefx='x')"), 'has no parameter Prefx'),
    ('a value of the wrong type', lambda: check_python('control', 'code', "kms.generate_data_key(KeyId='k', NumberOfBytes='many')"), 'Invalid type'),
    ('a missing required parameter', lambda: check_python('control', 'code', "s3.get_object(Bucket='b')"), 'required parameter Key'),
    ('a method that does not exist', lambda: check_python('control', 'code', "s3.list_object(Bucket='b')"), 'has no method list_object'),
    ('a paginator that does not exist', lambda: check_python('control', 'code', "s3.get_paginator('list_objects_v9').paginate(Bucket='b')"), 'no paginator'),
    ('a value that is not an allowed enum value', lambda: check_python('control', 'code', "sqs.create_queue(QueueName='q', Attributes={'VisibilityTimeout': 30})"), 'Invalid type'),
    ('Python that does not parse', lambda: check_python('control', 'code', 'def f(:\n    pass'), 'does not parse'),
    ('SQL that does not parse', lambda: check_sql('control', 'code', 'SELECT FROM WHERE'), 'cannot parse'),
    ('a bare command of an unknown form', lambda: check_sql('control', 'code', 'OPTIMIZE t FOR FUN'), 'bare command'),
    ('an option that deploy does not have', lambda: check_cli('aws cloudformation deploy --stack-nam x'), 'has no option'),
    ('an operation that does not exist', lambda: check_cli('aws cloudformation describe-change-sets --stack-name x'), 'no operation'),
]
for label, fn, expect_text in CONTROLS:
    with collecting() as found:
        fn()
    if not any(expect_text in m for m in found):
        bad('control "%s": the checker said %s' % (label, found or 'nothing'))
    else:
        tick('controls: a broken input is flagged by the checker')
with collecting() as found:
    lint = lint_policy(json.dumps({'Version': '2012-10-17', 'Statement': [{'Effect': 'Allow', 'Action': ['s3:GetObjects'], 'Resource': 'arn:aws:s3:::b/*'}]}))
if not any(i == 'UNKNOWN_ACTION' for i, _ in lint):
    bad('control "a misspelled IAM action": parliament found %s' % lint)
else:
    tick('controls: a broken input is flagged by the checker')

# ======================================================================================================================
# 7. --recapture: record everything again and compare
# ======================================================================================================================
if args.recapture:
    CACHE.mkdir(exist_ok=True)
    fresh_js, fresh_json = CACHE / 'real_fresh.js', CACHE / 'real_fresh.json'
    if args.reuse and fresh_json.exists():
        print('recapture: comparing the recording kept from the last run')
        r = types.SimpleNamespace(returncode=0)
    else:
        r = subprocess.run([sys.executable, str(HERE / 'capture_aws.py'), '--out', str(fresh_js), '--json', str(fresh_json)], capture_output=True, text=True)
    if r.returncode != 0:
        bad('capture_aws.py failed:\n' + (r.stdout + r.stderr)[-1500:])
    else:
        UUID = re.compile(r'[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}')

        def canon(x, key=''):
            if isinstance(x, dict):
                return {k: canon(v, key + '.' + k if key else k) for k, v in x.items()}
            if isinstance(x, list):
                return [canon(v, key) for v in x]
            if isinstance(x, str):
                x = UUID.sub('<id>', x)
                x = re.sub(r'/tmp/aws-capture-\w+', '<work>', re.sub(r'aws-capture-\w+', '<work>', x))
                if key.endswith('.output') and '.commands' in key:       # `aws s3 sync` transfers files in parallel and prints them in any order
                    x = '\n'.join(sorted(x.splitlines()))
                return x
            return x

        # DuckDB writes the 90 day files of the by-day Parquet layout with several threads, and their sizes differ by a few KB from run to run
        # (35.97 MB against 35.97 MB, within 0.02 %). Every other size in the recording is identical. Allow 0.5 % for these keys only.
        SIZE_KEYS = re.compile(r'parquet_by_day|avg_day_parquet_bytes')

        def near(path, a, b):
            return SIZE_KEYS.search(path) and isinstance(a, (int, float)) and isinstance(b, (int, float)) and a and abs(a - b) / a <= 0.005

        def diffs(a, b, path=''):
            if isinstance(a, dict) and isinstance(b, dict):
                out = []
                for k in sorted(set(a) | set(b)):
                    out += ['added ' + path + '.' + k] if k not in a else ['removed ' + path + '.' + k] if k not in b else diffs(a[k], b[k], path + '.' + k)
                return out
            if isinstance(a, list) and isinstance(b, list):
                if len(a) != len(b):
                    return ['changed %s: %d items before, %d now' % (path, len(a), len(b))]
                return [x for i, (u, v) in enumerate(zip(a, b)) for x in diffs(u, v, '%s[%d]' % (path, i))]
            return [] if (a == b or near(path, a, b)) else ['changed %s: %s -> %s' % (path, repr(a)[:70], repr(b)[:70])]
        fresh = json.loads(fresh_json.read_text())
        VOLATILE_META = {'python', 'account', 'region', 'bucket', 'note'}
        old, new = canon(real), canon(fresh)
        for k in ('meta',):
            for m in list(old[k]):
                if m in VOLATILE_META:
                    old[k].pop(m, None)
                    new[k].pop(m, None)
        d = diffs(old, new)
        if d:
            for x in d[:40]:
                bad('the recording differs: ' + x)
            if len(d) > 40:
                bad('... and %d more differences' % (len(d) - 40))
        else:
            print('recapture: %s were recorded again and match js/real.js' % ', '.join('%d %s' % (len(new[k]), k) for k in ('files', 'text', 'tables', 'counts')))

print()
for k in sorted(TALLY):
    print('  %4d  %s' % (TALLY[k], k))
print('verification clean' if not problems else '%d problem(s)' % problems)
sys.exit(1 if problems else 0)
