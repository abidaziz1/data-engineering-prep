#!/usr/bin/env python3
"""Record what the AWS SDK, an AWS emulator and open-source tools do, for the AWS tutorial.

Nothing here runs on AWS. The recording comes from:
  boto3 and botocore   the real AWS SDK: request building, signing, validation, error classes, pagination
  moto                 an open-source emulator of AWS services (it is not AWS)
  DuckDB and pyarrow   real query and file engines, used for the Athena scan sizes
  cfn-lint, parliament open-source checkers for CloudFormation and IAM policy documents
  pytest               runs the tests of a Lambda handler against moto
The lessons use moto only for behaviour that the AWS documentation describes the same way. The README lists what was not checked.

Usage:   python3 aws/verify/capture_aws.py [--out aws/js/real.js] [--only s3,sigv4,iam,glue,athena,kinesis,sqs,events,lambda,kms,cfn,test,cli] [--json FILE]
Needs:   pip install -r dev/requirements.txt   (boto3, moto[all,server], duckdb, pyarrow, cfn-lint, parliament, setuptools<81, pytest, awscli)
"""
import argparse, base64, contextlib, datetime, hashlib, hmac, io, json, os, pathlib, re, shutil, subprocess, sys, tempfile, textwrap, time
from unittest import mock

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent.parent

ap = argparse.ArgumentParser()
ap.add_argument('--out', default=str(HERE.parent / 'js' / 'real.js'))
ap.add_argument('--only', default='s3,sigv4,iam,glue,athena,kinesis,sqs,events,lambda,kms,cfn,test,cli')
ap.add_argument('--json')
args = ap.parse_args()
ONLY = set(args.only.split(','))

# No real credentials, no real network: moto answers every call. These are the dummy values of the AWS documentation.
os.environ['AWS_ACCESS_KEY_ID'] = 'AKIAIOSFODNN7EXAMPLE'
os.environ['AWS_SECRET_ACCESS_KEY'] = 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY'
os.environ['AWS_DEFAULT_REGION'] = 'us-east-1'
os.environ.pop('AWS_PROFILE', None)

import boto3, botocore, botocore.auth, botocore.exceptions
from botocore.config import Config
from moto import mock_aws
from moto.core import set_initial_no_auth_action_count
import importlib.metadata as md

WORK = pathlib.Path(tempfile.mkdtemp(prefix='aws-capture-'))
ACCOUNT = '123456789012'                      # the account id that moto uses, and the one used in AWS examples
REGION = 'us-east-1'
BUCKET = 'brewline-lake'
OUT = {'meta': {}, 'files': {}, 'text': {}, 'tables': {}, 'counts': {}}


def versions():
    out = {}
    for pkg in ('boto3', 'botocore', 'moto', 'duckdb', 'pyarrow', 'cfn-lint', 'parliament', 'awscli', 'pytest'):
        try:
            out[pkg] = md.version(pkg)
        except md.PackageNotFoundError:
            out[pkg] = None
    return out


OUT['meta'].update(versions())
OUT['meta'].update({'python': sys.version.split()[0], 'account': ACCOUNT, 'region': REGION, 'bucket': BUCKET,
                    'note': 'Recorded by aws/verify/capture_aws.py with boto3 against moto (an AWS emulator), DuckDB, cfn-lint, parliament and pytest on one machine. Nothing ran on AWS.'})


def put(section, key, value):
    OUT[section][key] = value
    return value


def text(key, s):
    return put('text', key, s.strip('\n') if isinstance(s, str) else s)


def file(key, s):
    return put('files', key, s if s.endswith('\n') else s + '\n')


def counts(key, d):
    return put('counts', key, d)


def table(key, cols, rows):
    return put('tables', key, {'cols': cols, 'rows': [[str(c) for c in r] for r in rows]})


def jdump(o, indent=2):
    return json.dumps(o, indent=indent, ensure_ascii=False, default=str)


def client(svc, **kw):
    return boto3.client(svc, region_name=kw.pop('region_name', REGION), **kw)


def code_of(fn):
    """Run fn and return the AWS error code and HTTP status, or None when the call succeeded."""
    try:
        fn()
    except botocore.exceptions.ClientError as e:
        er = e.response
        return {'code': er['Error']['Code'], 'status': er['ResponseMetadata']['HTTPStatusCode'], 'message': er['Error'].get('Message', '')}
    return None


FIXED_TIME = datetime.datetime(2026, 3, 14, 12, 0, 0, tzinfo=datetime.timezone.utc)


@contextlib.contextmanager
def frozen_clock(when=FIXED_TIME):
    """botocore signs with the current time. Fix it so the signatures in the recording are the same on every run."""
    with mock.patch.object(botocore.auth, 'get_current_datetime', return_value=when), mock.patch('time.time', return_value=when.timestamp()):
        yield


# ============================================================================= 1. S3
LAKE_KEYS = [
    'README.txt',
    'raw/customers/customers.csv',
    'raw/events/year=2026/month=03/day=14/part-0.json.gz',
    'raw/orders/dt=2026-03-14/orders-0001.json',
    'raw/orders/dt=2026-03-14/orders-0002.json',
    'raw/orders/dt=2026-03-15/orders-0001.json',
    'curated/daily_revenue/part-0.parquet',
    'curated/orders/dt=2026-03-14/part-0.parquet',
    'curated/orders/dt=2026-03-15/part-0.parquet',
    'scripts/etl.py',
]

if 's3' in ONLY:
    with mock_aws():
        s3 = client('s3')
        s3.create_bucket(Bucket=BUCKET)
        for k in LAKE_KEYS:
            s3.put_object(Bucket=BUCKET, Key=k, Body=('contents of ' + k).encode())
        counts('s3.keys', {'bucket': BUCKET, 'keys': sorted(LAKE_KEYS)})

        def listing(prefix, delim):
            kw = {'Bucket': BUCKET}
            if prefix:
                kw['Prefix'] = prefix
            if delim:
                kw['Delimiter'] = delim
            r = s3.list_objects_v2(**kw)
            return {'prefix': prefix, 'delimiter': delim or '', 'common_prefixes': [p['Prefix'] for p in r.get('CommonPrefixes', [])],
                    'keys': [o['Key'] for o in r.get('Contents', [])], 'key_count': r['KeyCount'], 'is_truncated': r['IsTruncated']}
        prefixes = ['', 'raw/', 'raw/orders/', 'raw/orders/dt=2026-03-14/', 'raw/ord', 'curated/', 'raw/orders/dt=2026-03-1']
        counts('s3.listing', [listing(p, d) for p in prefixes for d in ('', '/')])

        # pages: MaxKeys 4 over the 10 keys
        pages, token = [], None
        while True:
            kw = {'Bucket': BUCKET, 'MaxKeys': 4}
            if token:
                kw['ContinuationToken'] = token
            r = s3.list_objects_v2(**kw)
            pages.append({'keys': [o['Key'] for o in r['Contents']], 'is_truncated': r['IsTruncated'], 'has_next_token': 'NextContinuationToken' in r})
            token = r.get('NextContinuationToken')
            if not token:
                break
        paginated = [p for page in s3.get_paginator('list_objects_v2').paginate(Bucket=BUCKET, PaginationConfig={'PageSize': 4}) for p in [len(page['Contents'])]]
        counts('s3.pages', {'max_keys': 4, 'pages': pages, 'paginator_page_sizes': paginated})

        # errors
        counts('s3.errors', {
            'get_missing_key': code_of(lambda: s3.get_object(Bucket=BUCKET, Key='raw/orders/nope.json')),
            'head_missing_key': code_of(lambda: s3.head_object(Bucket=BUCKET, Key='raw/orders/nope.json')),
            'get_missing_bucket': code_of(lambda: s3.get_object(Bucket='no-such-bucket-brewline', Key='a')),
        })

    # versioning and delete markers, step by step
    with mock_aws():
        s3 = client('s3')
        s3.create_bucket(Bucket=BUCKET)
        s3.put_bucket_versioning(Bucket=BUCKET, VersioningConfiguration={'Status': 'Enabled'})
        names = {}                                   # real version id -> stable name

        def nm(vid, prefix='v'):
            if vid not in names:
                names[vid] = '%s%d' % (prefix, sum(1 for x in names.values() if x.startswith(prefix)) + 1)
            return names[vid]

        def state():
            lv = s3.list_object_versions(Bucket=BUCKET, Prefix='report.csv')
            return {'versions': [{'id': nm(v['VersionId']), 'latest': v['IsLatest']} for v in sorted(lv.get('Versions', []), key=lambda x: x['LastModified'], reverse=True)],
                    'delete_markers': [{'id': nm(v['VersionId'], 'dm'), 'latest': v['IsLatest']} for v in lv.get('DeleteMarkers', [])]}

        def read():
            try:
                o = s3.get_object(Bucket=BUCKET, Key='report.csv')
                return {'ok': True, 'body': o['Body'].read().decode(), 'version': nm(o['VersionId'])}
            except botocore.exceptions.ClientError as e:
                return {'ok': False, 'code': e.response['Error']['Code'], 'status': e.response['ResponseMetadata']['HTTPStatusCode']}
        steps = []
        r1 = s3.put_object(Bucket=BUCKET, Key='report.csv', Body=b'total=100')
        steps.append({'call': 'put_object report.csv "total=100"', 'result': 'new version ' + nm(r1['VersionId']), 'state': state(), 'read': read()})
        time.sleep(0.02)
        r2 = s3.put_object(Bucket=BUCKET, Key='report.csv', Body=b'total=120')
        steps.append({'call': 'put_object report.csv "total=120"', 'result': 'new version ' + nm(r2['VersionId']), 'state': state(), 'read': read()})
        time.sleep(0.02)
        d = s3.delete_object(Bucket=BUCKET, Key='report.csv')
        steps.append({'call': 'delete_object report.csv', 'result': 'delete marker ' + nm(d['VersionId'], 'dm') + ' (nothing is removed)', 'state': state(), 'read': read()})
        s3.delete_object(Bucket=BUCKET, Key='report.csv', VersionId=r1['VersionId'])
        steps.append({'call': 'delete_object report.csv VersionId=v1', 'result': 'version v1 is deleted for good', 'state': state(), 'read': read()})
        s3.delete_object(Bucket=BUCKET, Key='report.csv', VersionId=d['VersionId'])
        steps.append({'call': 'delete_object report.csv VersionId=dm1', 'result': 'the delete marker is removed, so v2 is current again', 'state': state(), 'read': read()})
        s3.delete_object(Bucket=BUCKET, Key='report.csv', VersionId=r2['VersionId'])
        steps.append({'call': 'delete_object report.csv VersionId=v2', 'result': 'the last version is deleted for good', 'state': state(), 'read': read()})
        counts('s3.versioning', {'steps': steps})

    # lifecycle, multipart, conditional write, presigned URLs
    with mock_aws():
        s3 = client('s3')
        s3.create_bucket(Bucket=BUCKET)
        rules = [{'ID': 'raw-to-cheaper-storage', 'Status': 'Enabled', 'Filter': {'Prefix': 'raw/'},
                  'Transitions': [{'Days': 30, 'StorageClass': 'STANDARD_IA'}, {'Days': 90, 'StorageClass': 'GLACIER'}], 'Expiration': {'Days': 365}},
                 {'ID': 'clean-up-failed-uploads', 'Status': 'Enabled', 'Filter': {'Prefix': ''}, 'AbortIncompleteMultipartUpload': {'DaysAfterInitiation': 7}}]
        s3.put_bucket_lifecycle_configuration(Bucket=BUCKET, LifecycleConfiguration={'Rules': rules})
        back = s3.get_bucket_lifecycle_configuration(Bucket=BUCKET)['Rules']
        file('s3/lifecycle.json', jdump({'Rules': rules}))
        counts('s3.lifecycle', {'sent': rules, 'returned': json.loads(json.dumps(back, default=str)),
                                'bad_storage_class': code_of(lambda: s3.put_bucket_lifecycle_configuration(Bucket=BUCKET, LifecycleConfiguration={'Rules': [dict(rules[0], Transitions=[{'Days': 30, 'StorageClass': 'STANDARD_IAA'}])]}))})
        # the SDK refuses a misspelled storage class before any request leaves the machine
        try:
            s3.put_bucket_lifecycle_configuration(Bucket=BUCKET, LifecycleConfiguration={'Rules': [dict(rules[0], Expiration={'Day': 365})]})
        except botocore.exceptions.ParamValidationError as e:
            counts('s3.param_validation', {'error': type(e).__name__, 'message': str(e).split('\n')[-1].strip()})

        MIB = 1024 * 1024
        up = s3.create_multipart_upload(Bucket=BUCKET, Key='big/orders.parquet')
        parts, md5s, sizes = [], [], []
        for n, ch in enumerate((b'a', b'b', b'c'), start=1):
            body = ch * (5 * MIB if n < 3 else 1 * MIB)
            r = s3.upload_part(Bucket=BUCKET, Key='big/orders.parquet', UploadId=up['UploadId'], PartNumber=n, Body=body)
            parts.append({'ETag': r['ETag'], 'PartNumber': n})
            md5s.append(hashlib.md5(body).digest())
            sizes.append(len(body))
        done = s3.complete_multipart_upload(Bucket=BUCKET, Key='big/orders.parquet', UploadId=up['UploadId'], MultipartUpload={'Parts': parts})
        expected = hashlib.md5(b''.join(md5s)).hexdigest() + '-%d' % len(parts)
        too_small = s3.create_multipart_upload(Bucket=BUCKET, Key='small/part.bin')
        s3.upload_part(Bucket=BUCKET, Key='small/part.bin', UploadId=too_small['UploadId'], PartNumber=1, Body=b'x' * 1024)
        s3.upload_part(Bucket=BUCKET, Key='small/part.bin', UploadId=too_small['UploadId'], PartNumber=2, Body=b'y' * 1024)
        err = code_of(lambda: s3.complete_multipart_upload(Bucket=BUCKET, Key='small/part.bin', UploadId=too_small['UploadId'],
                                                           MultipartUpload={'Parts': [{'ETag': s3.list_parts(Bucket=BUCKET, Key='small/part.bin', UploadId=too_small['UploadId'])['Parts'][i]['ETag'], 'PartNumber': i + 1} for i in range(2)]}))
        counts('s3.multipart', {'part_sizes_bytes': sizes, 'part_etags': [p['ETag'].strip('"') for p in parts], 'final_etag': done['ETag'].strip('"'), 'expected_etag': expected,
                                'matches_the_documented_rule': done['ETag'].strip('"') == expected, 'too_small_error': err})

        # conditional write: the way to make a put idempotent without a lock
        first = s3.put_object(Bucket=BUCKET, Key='curated/orders/dt=2026-03-14/_SUCCESS', Body=b'', IfNoneMatch='*')
        second = code_of(lambda: s3.put_object(Bucket=BUCKET, Key='curated/orders/dt=2026-03-14/_SUCCESS', Body=b'', IfNoneMatch='*'))
        counts('s3.conditional_write', {'first_status': first['ResponseMetadata']['HTTPStatusCode'], 'second': second})

    creds = dict(aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'], aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY'])
    with mock_aws(), frozen_clock():
        v2 = boto3.client('s3', region_name=REGION, config=Config(signature_version='s3'), **creds)
        v4 = boto3.client('s3', region_name=REGION, config=Config(signature_version='s3v4'), **creds)
        u2 = v2.generate_presigned_url('get_object', Params={'Bucket': BUCKET, 'Key': 'raw/customers/customers.csv'}, ExpiresIn=900)
        u4 = v4.generate_presigned_url('get_object', Params={'Bucket': BUCKET, 'Key': 'raw/customers/customers.csv'}, ExpiresIn=900)
        text('s3.presign_v2', u2.replace('?', '\n?').replace('&', '\n&'))
        text('s3.presign_v4', u4.replace('?', '\n?').replace('&', '\n&'))
        counts('s3.presign', {'v2_params': sorted(re.findall(r'[?&]([A-Za-z\-]+)=', u2)), 'v4_params': sorted(re.findall(r'[?&]([A-Za-z\-]+)=', u4)), 'expires_seconds': 900})
    print('s3 group done')

# ============================================================================= 2. SIGV4
if 'sigv4' in ONLY:
    from botocore.awsrequest import AWSRequest
    from botocore.credentials import Credentials

    DOC_SIGNATURE = 'f0e8bdb87c964420e857bd35b5d6ed310bd44f0170aba48dd91039c6036bdb41'     # the value printed in the AWS documentation for this example
    DOC_CREDS = Credentials('AKIAIOSFODNN7EXAMPLE', 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY')
    DOC_TIME = datetime.datetime(2013, 5, 24, 0, 0, 0, tzinfo=datetime.timezone.utc)

    def sign(secret=DOC_CREDS.secret_key, when=DOC_TIME, region='us-east-1', range_header='bytes=0-9', extra=None, method='GET'):
        """The same steps as SigV4Auth.add_auth, one by one, so the lesson can show each intermediate value."""
        headers = {'Range': range_header}
        headers.update(extra or {})
        req = AWSRequest(method=method, url='https://examplebucket.s3.amazonaws.com/test.txt', headers=headers)
        with mock.patch.object(botocore.auth, 'get_current_datetime', return_value=when):
            auth = botocore.auth.S3SigV4Auth(Credentials(DOC_CREDS.access_key, secret), 's3', region)
            req.context['timestamp'] = when.strftime('%Y%m%dT%H%M%SZ')
            auth._modify_request_before_signing(req)           # adds x-amz-date and x-amz-content-sha256
            canon = auth.canonical_request(req)
            sts = auth.string_to_sign(req, canon)
            signature = auth.signature(sts, req)
            auth._inject_signature_to_request(req, signature)   # the Authorization header
            # a second, independent route: the public add_auth call on a fresh request must give the same header
            req2 = AWSRequest(method=method, url='https://examplebucket.s3.amazonaws.com/test.txt', headers=dict(headers))
            auth.add_auth(req2)
        assert req.headers['Authorization'] == req2.headers['Authorization']
        return req.headers['Authorization'], canon, sts

    def derive(secret, datestamp, region, service='s3'):
        k = hmac.new(('AWS4' + secret).encode(), datestamp.encode(), hashlib.sha256).digest()
        chain = {'kDate': k.hex()}
        k = hmac.new(k, region.encode(), hashlib.sha256).digest()
        chain['kRegion'] = k.hex()
        k = hmac.new(k, service.encode(), hashlib.sha256).digest()
        chain['kService'] = k.hex()
        k = hmac.new(k, b'aws4_request', hashlib.sha256).digest()
        chain['kSigning'] = k.hex()
        return chain, k

    auth_h, canon, sts = sign()
    chain, ksign = derive(DOC_CREDS.secret_key, '20130524', 'us-east-1')
    mine = hmac.new(ksign, sts.encode(), hashlib.sha256).hexdigest()
    sig = re.search(r'Signature=([0-9a-f]+)', auth_h).group(1)
    text('sigv4.canonical_request', canon)
    text('sigv4.string_to_sign', sts)
    text('sigv4.authorization', auth_h.replace(', ', ',\n  ').replace('AWS4-HMAC-SHA256 ', 'AWS4-HMAC-SHA256\n  '))
    counts('sigv4.keys', dict(chain, signature=sig, doc_signature=DOC_SIGNATURE, matches_the_documentation=(sig == DOC_SIGNATURE), recomputed_by_hand=mine, recomputed_matches=(mine == sig),
                              credential_scope='20130524/us-east-1/s3/aws4_request', payload_hash=hashlib.sha256(b'').hexdigest()))
    variants = [('The documentation example', {}, 'bytes=0-9 in us-east-1 on 2013-05-24'),
                ('One character of the secret key is wrong', {'secret': DOC_CREDS.secret_key[:-1] + 'Z'}, 'The last character of the secret key changed'),
                ('The request is a day late', {'when': DOC_TIME + datetime.timedelta(days=1)}, 'The date changed from 20130524 to 20130525'),
                ('Another region', {'region': 'us-west-2'}, 'The region in the scope changed to us-west-2'),
                ('The Range header changed', {'range_header': 'bytes=0-10'}, 'Range: bytes=0-10 instead of bytes=0-9'),
                ('A signed header is added', {'extra': {'x-amz-meta-run': '7'}}, 'x-amz-meta-run: 7 is now signed')]
    rows = []
    for label, kw, change in variants:
        a, c, s_ = sign(**kw)
        rows.append([label, change, re.search(r'Signature=([0-9a-f]+)', a).group(1), 'yes' if re.search(r'Signature=([0-9a-f]+)', a).group(1) == DOC_SIGNATURE else 'no'])
    table('sigv4.variants', ['Case', 'What changed', 'Signature', 'Same as the documentation'], rows)
    print('sigv4 group done')

# ============================================================================= 3. IAM AND STS
def arn_bucket(b=BUCKET):
    return 'arn:aws:s3:::%s' % b


def policy(*statements):
    return {'Version': '2012-10-17', 'Statement': list(statements)}


POL_READ_CURATED = policy(
    {'Sid': 'ReadCurated', 'Effect': 'Allow', 'Action': 's3:GetObject', 'Resource': arn_bucket() + '/curated/*'},
    {'Sid': 'ListTheBucket', 'Effect': 'Allow', 'Action': 's3:ListBucket', 'Resource': arn_bucket()})
POL_DENY_SECRET = policy({'Sid': 'NoSecrets', 'Effect': 'Deny', 'Action': 's3:GetObject', 'Resource': arn_bucket() + '/curated/orders/secret/*'})
POL_WRONG_ARNS = policy(
    {'Sid': 'ObjectActionOnTheBucketArn', 'Effect': 'Allow', 'Action': 's3:GetObject', 'Resource': arn_bucket()},
    {'Sid': 'BucketActionOnTheObjectArn', 'Effect': 'Allow', 'Action': 's3:ListBucket', 'Resource': arn_bucket() + '/*'})
POL_ROLE_RAW = policy({'Sid': 'ReadRaw', 'Effect': 'Allow', 'Action': 's3:GetObject', 'Resource': arn_bucket() + '/raw/*'})
TRUST_ACCOUNT = policy({'Effect': 'Allow', 'Principal': {'AWS': 'arn:aws:iam::%s:root' % ACCOUNT}, 'Action': 'sts:AssumeRole'})
TRUST_GLUE = policy({'Effect': 'Allow', 'Principal': {'Service': 'glue.amazonaws.com'}, 'Action': 'sts:AssumeRole'})
for name, doc in (('read_curated', POL_READ_CURATED), ('deny_secret', POL_DENY_SECRET), ('wrong_arns', POL_WRONG_ARNS), ('role_raw', POL_ROLE_RAW), ('trust_account', TRUST_ACCOUNT), ('trust_glue', TRUST_GLUE)):
    file('iam/%s.json' % name, jdump(doc))

if 'iam' in ONLY:
    calls = [0]

    def bump(**kw):
        calls[0] += 1

    def counted(svc, **kw):
        c = boto3.client(svc, region_name=REGION, **kw)
        c.meta.events.register('before-call.*.*', bump)
        return c

    RESULT = {}

    def setup_and_run(enforce):
        iam, root, sts = counted('iam'), counted('s3'), counted('sts')
        root.create_bucket(Bucket=BUCKET)
        for k in ('curated/orders/dt=2026-03-14/part-0.parquet', 'raw/orders/dt=2026-03-14/orders-0001.json', 'curated/orders/secret/s.parquet'):
            root.put_object(Bucket=BUCKET, Key=k, Body=b'x')
        users = {}
        for user, pols in (('analyst', {'read-curated': POL_READ_CURATED, 'deny-secret': POL_DENY_SECRET}), ('analyst-wrong-arns', {'wrong-arns': POL_WRONG_ARNS})):
            iam.create_user(UserName=user)
            users[user] = iam.create_access_key(UserName=user)['AccessKey']
            for pn, doc in pols.items():
                iam.put_user_policy(UserName=user, PolicyName=pn, PolicyDocument=json.dumps(doc))
        role = iam.create_role(RoleName='raw-reader', AssumeRolePolicyDocument=json.dumps(TRUST_ACCOUNT))['Role']
        iam.put_role_policy(RoleName='raw-reader', PolicyName='read-raw', PolicyDocument=json.dumps(POL_ROLE_RAW))
        assumed = sts.assume_role(RoleArn=role['Arn'], RoleSessionName='etl-run-1', DurationSeconds=900)
        if not enforce:
            return None
        RESULT['assumed'] = assumed
        RESULT['role'] = role

        def s3_as(creds, token=None):
            kw = dict(aws_access_key_id=creds['AccessKeyId'], aws_secret_access_key=creds['SecretAccessKey'])
            if token:
                kw['aws_session_token'] = token
            return boto3.client('s3', region_name=REGION, **kw)
        who = {'analyst': s3_as(users['analyst']), 'analyst-wrong-arns': s3_as(users['analyst-wrong-arns']),
               'role raw-reader': s3_as(assumed['Credentials'], assumed['Credentials']['SessionToken'])}
        CUR = 'curated/orders/dt=2026-03-14/part-0.parquet'
        RAW = 'raw/orders/dt=2026-03-14/orders-0001.json'
        scen = [
            ('analyst', 's3:GetObject', 'curated/orders/dt=2026-03-14/part-0.parquet', lambda c: c.get_object(Bucket=BUCKET, Key=CUR), 'allow', 'ReadCurated allows it'),
            ('analyst', 's3:GetObject', 'raw/orders/dt=2026-03-14/orders-0001.json', lambda c: c.get_object(Bucket=BUCKET, Key=RAW), 'deny', 'No statement allows it, so the default deny applies'),
            ('analyst', 's3:PutObject', 'curated/orders/new.parquet', lambda c: c.put_object(Bucket=BUCKET, Key='curated/orders/new.parquet', Body=b'1'), 'deny', 'Read access only. Nothing allows s3:PutObject'),
            ('analyst', 's3:GetObject', 'curated/orders/secret/s.parquet', lambda c: c.get_object(Bucket=BUCKET, Key='curated/orders/secret/s.parquet'), 'deny', 'ReadCurated allows it, but NoSecrets denies it, and an explicit deny always wins'),
            ('analyst', 's3:ListBucket', 'the bucket brewline-lake', lambda c: c.list_objects_v2(Bucket=BUCKET), 'allow', 'ListTheBucket allows s3:ListBucket on the bucket ARN'),
            ('analyst', 's3:ListBucket', 'another bucket', lambda c: c.list_objects_v2(Bucket='other-bucket'), 'deny', 'The policy names only brewline-lake'),
            ('analyst-wrong-arns', 's3:GetObject', 'curated/orders/dt=2026-03-14/part-0.parquet', lambda c: c.get_object(Bucket=BUCKET, Key=CUR), 'deny', 'The allow is on the bucket ARN. Objects have their own ARN, which ends in /*'),
            ('analyst-wrong-arns', 's3:ListBucket', 'the bucket brewline-lake', lambda c: c.list_objects_v2(Bucket=BUCKET), 'deny', 'The allow is on the object ARN. Listing needs the bucket ARN'),
            ('role raw-reader', 's3:GetObject', 'raw/orders/dt=2026-03-14/orders-0001.json', lambda c: c.get_object(Bucket=BUCKET, Key=RAW), 'allow', 'The role policy allows raw/*, and the assumed session gets the role permissions'),
            ('role raw-reader', 's3:GetObject', 'curated/orders/dt=2026-03-14/part-0.parquet', lambda c: c.get_object(Bucket=BUCKET, Key=CUR), 'deny', 'The role policy does not cover curated/*'),
        ]
        rows = []
        for who_, action, res, fn, want, why in scen:
            err = code_of(lambda: fn(who[who_]))
            got = 'deny' if err else 'allow'
            assert got == want, (who_, action, res, got, want)           # moto and the documented rules must agree
            rows.append({'who': who_, 'action': action, 'resource': res, 'result': got, 'code': err['code'] if err else '', 'status': err['status'] if err else 200, 'why': why})
        RESULT['rows'] = rows

    with mock_aws():                                          # a dry run only counts the setup calls
        setup_and_run(False)
    setup_calls = calls[0]

    @mock_aws
    @set_initial_no_auth_action_count(setup_calls)
    def enforced():
        setup_and_run(True)
    enforced()
    a = RESULT['assumed']
    counts('iam.truth', {'rows': RESULT['rows'], 'setup_calls': setup_calls})
    table('iam.truth', ['Who', 'Action', 'Resource', 'Result', 'Why'], [[r['who'], r['action'], r['resource'], r['result'], r['why']] for r in RESULT['rows']])
    counts('iam.assume', {'role_arn': RESULT['role']['Arn'], 'assumed_role_user_arn': a['AssumedRoleUser']['Arn'], 'access_key_prefix': a['Credentials']['AccessKeyId'][:4],
                          'has_session_token': bool(a['Credentials'].get('SessionToken')), 'requested_duration_seconds': 900,
                          'expires_in_seconds': round((a['Credentials']['Expiration'] - datetime.datetime.now(datetime.timezone.utc)).total_seconds() / 60) * 60,
                          'response_fields': sorted(a.keys() - {'ResponseMetadata'}), 'credential_fields': sorted(a['Credentials'].keys())})
    print('iam group done: %d setup calls, %d scenarios' % (setup_calls, len(RESULT['rows'])))

# ============================================================================= 4. GLUE DATA CATALOG
if 'glue' in ONLY:
    with mock_aws():
        s3, glue = client('s3'), client('glue')
        s3.create_bucket(Bucket=BUCKET)
        days = ['2026-03-14', '2026-03-15', '2026-03-16', '2026-03-17']
        for d in days:
            s3.put_object(Bucket=BUCKET, Key='curated/orders/dt=%s/part-0.parquet' % d, Body=b'x')
        s3.put_object(Bucket=BUCKET, Key='curated/orders/_SUCCESS', Body=b'')
        # what a crawler or MSCK REPAIR TABLE does in essence: list the prefixes and register one partition for each
        r = s3.list_objects_v2(Bucket=BUCKET, Prefix='curated/orders/', Delimiter='/')
        found = [p['Prefix'] for p in r.get('CommonPrefixes', [])]
        glue.create_database(DatabaseInput={'Name': 'brewline_lake', 'Description': 'The Brewline data lake'})
        sd = {'Columns': [{'Name': 'order_id', 'Type': 'string'}, {'Name': 'customer_id', 'Type': 'string'}, {'Name': 'total_usd', 'Type': 'decimal(12,2)'}, {'Name': 'status', 'Type': 'string'}],
              'Location': 's3://%s/curated/orders/' % BUCKET,
              'InputFormat': 'org.apache.hadoop.hive.ql.io.parquet.MapredParquetInputFormat',
              'OutputFormat': 'org.apache.hadoop.hive.ql.io.parquet.MapredParquetOutputFormat',
              'SerdeInfo': {'SerializationLibrary': 'org.apache.hadoop.hive.ql.io.parquet.serde.ParquetHiveSerDe', 'Parameters': {'serialization.format': '1'}}}
        table_input = {'Name': 'orders', 'TableType': 'EXTERNAL_TABLE', 'PartitionKeys': [{'Name': 'dt', 'Type': 'string'}], 'StorageDescriptor': sd,
                       'Parameters': {'classification': 'parquet', 'EXTERNAL': 'TRUE'}}
        glue.create_table(DatabaseName='brewline_lake', TableInput=table_input)
        file('glue/table_input.json', jdump(table_input))
        parts = []
        for pfx in found:
            m = re.search(r'dt=([^/]+)/', pfx)
            parts.append({'Values': [m.group(1)], 'StorageDescriptor': dict(sd, Location='s3://%s/%s' % (BUCKET, pfx))})
        res = glue.batch_create_partition(DatabaseName='brewline_lake', TableName='orders', PartitionInputList=parts)
        counts('glue.discover', {'prefixes_found': found, 'registered': len(parts), 'errors': res.get('Errors', [])})
        exprs = ["dt = '2026-03-15'", "dt >= '2026-03-15'", "dt between '2026-03-14' and '2026-03-15'", "dt in ('2026-03-14', '2026-03-17')", "dt like '2026-03-1%'", "dt > '2026-03-15' and dt < '2026-03-17'"]
        counts('glue.expressions', [{'expression': e, 'partitions': [p['Values'][0] for p in glue.get_partitions(DatabaseName='brewline_lake', TableName='orders', Expression=e)['Partitions']]} for e in exprs])
        counts('glue.all_partitions', [p['Values'][0] for p in glue.get_partitions(DatabaseName='brewline_lake', TableName='orders')['Partitions']])
        counts('glue.errors', {'duplicate_database': code_of(lambda: glue.create_database(DatabaseInput={'Name': 'brewline_lake'})),
                               'missing_table': code_of(lambda: glue.get_table(DatabaseName='brewline_lake', Name='nope')),
                               'duplicate_partition': glue.batch_create_partition(DatabaseName='brewline_lake', TableName='orders', PartitionInputList=[parts[0]])['Errors'][0]['ErrorDetail']['ErrorCode']})
        # schema change: add a column, and the catalog keeps the older definition as a version
        before = len(glue.get_table_versions(DatabaseName='brewline_lake', TableName='orders')['TableVersions'])
        new_input = json.loads(json.dumps(table_input))
        new_input['StorageDescriptor']['Columns'].append({'Name': 'channel', 'Type': 'string'})
        glue.update_table(DatabaseName='brewline_lake', TableInput=new_input)
        versions_ = glue.get_table_versions(DatabaseName='brewline_lake', TableName='orders')['TableVersions']
        tbl = glue.get_table(DatabaseName='brewline_lake', Name='orders')['Table']
        counts('glue.schema_change', {'versions_before': before, 'versions_after': len(versions_), 'columns_now': [c['Name'] for c in tbl['StorageDescriptor']['Columns']],
                                      'partition_still_has_old_columns': [c['Name'] for c in glue.get_partition(DatabaseName='brewline_lake', TableName='orders', PartitionValues=['2026-03-14'])['Partition']['StorageDescriptor']['Columns']]})
        # a table with partition projection: the settings live in the table parameters, and no partition is registered
        proj = {'Name': 'orders_projected', 'TableType': 'EXTERNAL_TABLE', 'PartitionKeys': [{'Name': 'dt', 'Type': 'string'}], 'StorageDescriptor': dict(sd, Location='s3://%s/curated/orders/' % BUCKET),
                'Parameters': {'classification': 'parquet', 'EXTERNAL': 'TRUE', 'projection.enabled': 'true', 'projection.dt.type': 'date', 'projection.dt.range': '2026-01-01,NOW',
                               'projection.dt.format': 'yyyy-MM-dd', 'projection.dt.interval': '1', 'projection.dt.interval.unit': 'DAYS',
                               'storage.location.template': 's3://%s/curated/orders/dt=${dt}/' % BUCKET}}
        glue.create_table(DatabaseName='brewline_lake', TableInput=proj)
        file('glue/table_projection.json', jdump(proj))
        counts('glue.projection', {'registered_partitions': len(glue.get_partitions(DatabaseName='brewline_lake', TableName='orders_projected')['Partitions']), 'parameters': proj['Parameters']})
        job = glue.create_job(Name='orders-to-parquet', Role='arn:aws:iam::%s:role/glue-etl' % ACCOUNT, GlueVersion='5.0', WorkerType='G.1X', NumberOfWorkers=5,
                              Command={'Name': 'glueetl', 'ScriptLocation': 's3://%s/scripts/etl.py' % BUCKET, 'PythonVersion': '3'},
                              DefaultArguments={'--job-bookmark-option': 'job-bookmark-enable', '--enable-metrics': 'true', '--TempDir': 's3://%s/tmp/' % BUCKET})
        got = glue.get_job(JobName='orders-to-parquet')['Job']
        counts('glue.job', {'name': got['Name'], 'worker_type': got['WorkerType'], 'workers': got['NumberOfWorkers'], 'glue_version': got['GlueVersion'], 'arguments': got['DefaultArguments'], 'dpu_for_workers': 5 * 1})
    print('glue group done')

# ============================================================================= 5. ATHENA: WHAT A QUERY MUST READ
# Athena bills for the bytes it reads from S3. Which bytes depends on the file format, the compression and the layout.
# This group writes the same 2 million orders in five layouts with DuckDB, then reads the real file sizes and the Parquet footers
# with pyarrow to work out what each query has to read. The price is the only documented input and is applied later, in the lab.
ATHENA_ROWS = 2_000_000
ATHENA_DAYS = 90

if 'athena' in ONLY:
    import duckdb, pyarrow.parquet as pq
    A = WORK / 'athena'
    A.mkdir()
    con = duckdb.connect()
    con.execute("""
        create table orders as
        select
          'O-' || lpad(cast(i as varchar), 7, '0')                                                              as order_id,
          'C-' || lpad(cast(1 + (hash(i * 7919) % 5000) as varchar), 4, '0')                                     as customer_id,
          timestamp '2026-01-01 00:00:00' + to_seconds(cast(i * @DAYS@ * 86400 / @ROWS@ as bigint))          as order_ts,
          'P-' || lpad(cast(1 + (hash(i * 13) % 40) as varchar), 2, '0')                                        as product_id,
          cast(1 + (hash(i * 17) % 4) as integer)                                                               as qty,
          cast(3.00 + (hash(i * 19) % 40) * 0.25 as decimal(8,2))                                               as unit_price_usd,
          case when hash(i * 23) % 100 < 90 then 'COMPLETED' when hash(i * 23) % 100 < 96 then 'CANCELLED' else 'REFUNDED' end as status,
          (['web', 'app', 'store'])[cast(1 + (hash(i * 29) % 3) as bigint)]                                     as channel,
          cast(1 + (hash(i * 31) % 25) as integer)                                                              as store_id
        from range(@ROWS@) t(i)
    """.replace('@DAYS@', str(ATHENA_DAYS)).replace('@ROWS@', str(ATHENA_ROWS)))
    con.execute("alter table orders add column total_usd decimal(12,2)")
    con.execute("update orders set total_usd = qty * unit_price_usd")
    con.execute("alter table orders add column order_date date")
    con.execute("update orders set order_date = cast(order_ts as date)")
    COLS = ['order_id', 'customer_id', 'order_ts', 'product_id', 'qty', 'unit_price_usd', 'total_usd', 'status', 'channel', 'store_id', 'order_date']
    sel = ', '.join(COLS)
    sel_nodate = ', '.join(c for c in COLS if c != 'order_date')
    con.execute("copy (select %s from orders order by order_ts, order_id) to '%s' (format csv, header)" % (sel, A / 'orders.csv'))
    con.execute("copy (select %s from orders order by order_ts, order_id) to '%s' (format csv, header, compression gzip)" % (sel, A / 'orders.csv.gz'))
    con.execute("copy (select %s from orders order by order_ts, order_id) to '%s' (format parquet, compression snappy)" % (sel, A / 'orders.parquet'))
    con.execute("copy (select %s, order_date as dt from orders order by order_ts, order_id) to '%s' (format parquet, compression snappy, partition_by (dt))" % (sel_nodate, A / 'parquet_by_day'))
    con.execute("copy (select %s, order_date as dt from orders order by order_ts, order_id) to '%s' (format csv, header, partition_by (dt))" % (sel_nodate, A / 'csv_by_day'))

    def size(path):
        return path.stat().st_size

    sizes = {'csv': size(A / 'orders.csv'), 'csv_gz': size(A / 'orders.csv.gz'), 'parquet': size(A / 'orders.parquet'),
             'parquet_by_day': sum(size(f) for f in (A / 'parquet_by_day').rglob('*.parquet')), 'csv_by_day': sum(size(f) for f in (A / 'csv_by_day').rglob('*.csv'))}
    day_files_p = {f.parent.name[3:]: f for f in (A / 'parquet_by_day').rglob('*.parquet')}
    day_files_c = {f.parent.name[3:]: f for f in (A / 'csv_by_day').rglob('*.csv')}
    assert len(day_files_p) == ATHENA_DAYS and len(day_files_c) == ATHENA_DAYS, (len(day_files_p), len(day_files_c))
    pf = pq.ParquetFile(A / 'orders.parquet')
    md_ = pf.metadata
    colnames = [md_.schema.column(i).name for i in range(md_.num_columns)]
    col_bytes = {c: sum(md_.row_group(r).column(i).total_compressed_size for r in range(md_.num_row_groups)) for i, c in enumerate(colnames)}
    rg_rows = [md_.row_group(r).num_rows for r in range(md_.num_row_groups)]
    footer = md_.serialized_size
    ci = {c: i for i, c in enumerate(colnames)}

    def rg_stats(col):
        out = []
        for r in range(md_.num_row_groups):
            st = md_.row_group(r).column(ci[col]).statistics
            out.append((st.min, st.max))
        return out
    date_stats, id_stats = rg_stats('order_date'), rg_stats('order_id')

    def rgs_for_dates(lo, hi):
        return [r for r, (a, b) in enumerate(date_stats) if not (b < lo or a > hi)]

    def rgs_for_id(v):
        return [r for r, (a, b) in enumerate(id_stats) if a <= v <= b]

    def parquet_bytes(rgs, cols):
        return footer + sum(md_.row_group(r).column(ci[c]).total_compressed_size for r in rgs for c in cols)

    def day_parquet_bytes(days, cols):
        total = 0
        for d in days:
            m = pq.ParquetFile(day_files_p[d]).metadata
            idx = {m.schema.column(i).name: i for i in range(m.num_columns)}
            total += m.serialized_size + sum(m.row_group(r).column(idx[c]).total_compressed_size for r in range(m.num_row_groups) for c in cols if c in idx)
        return total

    def day_parquet_footers(days):
        return sum(pq.ParquetFile(day_files_p[d]).metadata.serialized_size for d in days)

    all_days = sorted(day_files_p)
    mar = [d for d in all_days if d.startswith('2026-03')]
    one_day = '2026-03-14'
    target_id = 'O-1234567'
    lo, hi = datetime.date(2026, 3, 1), datetime.date(2026, 3, 31)
    d14 = datetime.date(2026, 3, 14)
    rg_one, rg_mar, rg_id = rgs_for_dates(d14, d14), rgs_for_dates(lo, hi), rgs_for_id(target_id)
    non_date = [c for c in colnames]
    queries = [
        {'id': 'q1', 'title': 'Count every order', 'sql': 'SELECT count(*) FROM orders', 'columns': [], 'needs': 'no column, and no filter',
         'bytes': {'csv': sizes['csv'], 'csv_gz': sizes['csv_gz'], 'csv_by_day': sizes['csv_by_day'], 'parquet': footer, 'parquet_by_day': day_parquet_footers(all_days)}},
        {'id': 'q2', 'title': 'One day of revenue', 'sql': "SELECT sum(total_usd) FROM orders WHERE order_date = DATE '2026-03-14'", 'columns': ['total_usd', 'order_date'], 'needs': '2 columns, 1 day out of 90',
         'bytes': {'csv': sizes['csv'], 'csv_gz': sizes['csv_gz'], 'csv_by_day': size(day_files_c[one_day]), 'parquet': parquet_bytes(rg_one, ['total_usd', 'order_date']), 'parquet_by_day': day_parquet_bytes([one_day], ['total_usd'])}},
        {'id': 'q3', 'title': 'Top customers in March', 'sql': "SELECT customer_id, sum(total_usd) AS spend FROM orders WHERE order_date BETWEEN DATE '2026-03-01' AND DATE '2026-03-31' GROUP BY customer_id ORDER BY spend DESC LIMIT 5",
         'columns': ['customer_id', 'total_usd', 'order_date'], 'needs': '3 columns, 31 days out of 90',
         'bytes': {'csv': sizes['csv'], 'csv_gz': sizes['csv_gz'], 'csv_by_day': sum(size(day_files_c[d]) for d in mar), 'parquet': parquet_bytes(rg_mar, ['customer_id', 'total_usd', 'order_date']), 'parquet_by_day': day_parquet_bytes(mar, ['customer_id', 'total_usd'])}},
        {'id': 'q4', 'title': 'Find one order with SELECT *', 'sql': "SELECT * FROM orders WHERE order_id = 'O-1234567'", 'columns': COLS, 'needs': 'every column, and no partition filter',
         'bytes': {'csv': sizes['csv'], 'csv_gz': sizes['csv_gz'], 'csv_by_day': sizes['csv_by_day'], 'parquet': parquet_bytes(rg_id, [c for c in colnames]),
                   'parquet_by_day': day_parquet_footers(all_days) + sum(pq.ParquetFile(day_files_p[d]).metadata.row_group(0).total_byte_size * 0 for d in all_days) + 0}},
        {'id': 'q5', 'title': 'Orders by status', 'sql': 'SELECT status, count(*) FROM orders GROUP BY status', 'columns': ['status'], 'needs': '1 column, every day',
         'bytes': {'csv': sizes['csv'], 'csv_gz': sizes['csv_gz'], 'csv_by_day': sizes['csv_by_day'], 'parquet': parquet_bytes(range(md_.num_row_groups), ['status']), 'parquet_by_day': day_parquet_bytes(all_days, ['status'])}},
    ]
    # q4 on the daily files: only the footers of 89 files, and everything for the one file whose id range holds the order
    holder = None
    for d in all_days:
        m = pq.ParquetFile(day_files_p[d]).metadata
        idx = {m.schema.column(i).name: i for i in range(m.num_columns)}
        st = m.row_group(0).column(idx['order_id']).statistics
        if st.min <= target_id <= st.max:
            holder = d
    assert holder is not None
    queries[3]['bytes']['parquet_by_day'] = day_parquet_footers([d for d in all_days if d != holder]) + day_parquet_bytes([holder], [c for c in colnames if c != 'order_date'])
    # results from DuckDB, the engine that read these same files here (Athena would give the same rows)
    res = {}
    res['q1'] = con.execute('select count(*) as orders from orders').fetchall()
    res['q2'] = con.execute("select sum(total_usd) as revenue_usd from orders where order_date = date '2026-03-14'").fetchall()
    res['q3'] = con.execute("select customer_id, sum(total_usd) as spend from orders where order_date between date '2026-03-01' and date '2026-03-31' group by customer_id order by spend desc, customer_id limit 5").fetchall()
    res['q4'] = con.execute("select order_id, customer_id, order_ts, status, total_usd, order_date from orders where order_id = 'O-1234567'").fetchall()
    res['q5'] = con.execute('select status, count(*) as orders from orders group by status order by 2 desc').fetchall()
    for q in queries:
        rows = res[q['id']]
        cols = {'q1': ['orders'], 'q2': ['revenue_usd'], 'q3': ['customer_id', 'spend'], 'q4': ['order_id', 'customer_id', 'order_ts', 'status', 'total_usd', 'order_date'], 'q5': ['status', 'orders']}[q['id']]
        table('athena.%s_result' % q['id'], cols, rows)
    counts('athena.sizes', dict(sizes, rows=ATHENA_ROWS, days=ATHENA_DAYS, csv_columns=len(COLS), parquet_row_groups=md_.num_row_groups, parquet_row_group_rows=rg_rows[0], parquet_footer_bytes=footer,
                                files_by_day=ATHENA_DAYS, avg_day_parquet_bytes=round(sizes['parquet_by_day'] / ATHENA_DAYS), avg_day_csv_bytes=round(sizes['csv_by_day'] / ATHENA_DAYS)))
    counts('athena.parquet_columns', {'bytes_by_column': col_bytes, 'row_groups_for_one_day': rg_one, 'row_groups_for_march': rg_mar, 'row_groups_for_the_order_id': rg_id, 'daily_file_with_the_order': holder})
    counts('athena.scan', {'layouts': [{'k': 'csv', 'name': 'One CSV file'}, {'k': 'csv_gz', 'name': 'One gzip CSV file'}, {'k': 'csv_by_day', 'name': 'CSV, one folder for each day'},
                                       {'k': 'parquet', 'name': 'One Parquet file'}, {'k': 'parquet_by_day', 'name': 'Parquet, one folder for each day'}],
                           'queries': queries})
    text('athena.layout_tree', '\n'.join(['orders.csv', 'orders.csv.gz', 'orders.parquet']
                                         + ['csv_by_day/dt=%s/%s' % (d, day_files_c[d].name) for d in all_days[:2]] + ['csv_by_day/... (%d folders in all)' % ATHENA_DAYS]
                                         + ['parquet_by_day/dt=%s/%s' % (d, day_files_p[d].name) for d in all_days[:2]] + ['parquet_by_day/... (%d folders in all)' % ATHENA_DAYS]))
    # the generated SQL of the lesson must parse as written: the lesson reads it from here
    for q in queries:
        file('athena/%s.sql' % q['id'], q['sql'])
    print('athena group done:', {k: round(v / 1e6, 1) for k, v in sizes.items()})

# ============================================================================= 6. KINESIS: WHICH SHARD GETS A RECORD
if 'kinesis' in ONLY:
    import random
    with mock_aws():
        k = client('kinesis')
        k.create_stream(StreamName='orders', ShardCount=4)
        desc = k.describe_stream(StreamName='orders')['StreamDescription']
        shards = [(sh['ShardId'], int(sh['HashKeyRange']['StartingHashKey']), int(sh['HashKeyRange']['EndingHashKey'])) for sh in desc['Shards']]
        top = 2 ** 128 - 1
        assert shards[0][1] == 0 and shards[-1][2] == top and all(shards[i][2] + 1 == shards[i + 1][1] for i in range(len(shards) - 1))
        counts('kinesis.shards', {'stream': 'orders', 'max_hash': str(top), 'shards': [{'id': sid, 'start': str(a), 'end': str(b), 'share_of_the_ring': round((b - a + 1) / 2 ** 128, 6)} for sid, a, b in shards]})

        def shard_of(key):
            h = int(hashlib.md5(key.encode()).hexdigest(), 16)
            return next(sid for sid, a, b in shards if a <= h <= b), h
        keys = ['C-0001', 'C-0002', 'C-0003', 'C-0004', 'C-0005', 'C-0006', 'C-0007', 'C-0008', 'C-1880', 'C-1884', 'C-4417', 'guest']
        rows = []
        for key in keys:
            r = k.put_record(StreamName='orders', Data=json.dumps({'customer_id': key}).encode(), PartitionKey=key)
            mine, h = shard_of(key)
            assert r['ShardId'] == mine, (key, r['ShardId'], mine)       # moto and the documented MD5 rule agree
            rows.append({'key': key, 'md5': hashlib.md5(key.encode()).hexdigest(), 'ring_position': round(h / 2 ** 128, 4), 'shard': r['ShardId']})
        counts('kinesis.mapping', {'rows': rows, 'rule': 'MD5 of the partition key, read as a 128-bit integer, picks the shard whose hash key range holds it'})

        # a skewed stream: 20,000 events, customers drawn with weights 1/rank, so a few customers send most of the events
        rng = random.Random(42)
        customers = ['C-%04d' % n for n in range(1, 501)]
        weights = [1.0 / (n + 1) for n in range(500)]
        events = rng.choices(customers, weights=weights, k=20000)

        def put_all(keys_):
            per = {sid: 0 for sid, _, _ in shards}
            for i in range(0, len(keys_), 500):
                batch = keys_[i:i + 500]
                res = k.put_records(StreamName='orders', Records=[{'Data': b'{}', 'PartitionKey': x} for x in batch])
                assert res['FailedRecordCount'] == 0
                for rec in res['Records']:
                    per[rec['ShardId']] += 1
            return per
        by_key = put_all(events)
        salted = put_all(['%s#%d' % (c, i % 8) for i, c in enumerate(events)])
        for label, per, keys_ in (('by_key', by_key, events), ('salted', salted, ['%s#%d' % (c, i % 8) for i, c in enumerate(events)])):
            mine = {sid: 0 for sid, _, _ in shards}
            for x in keys_:
                mine[shard_of(x)[0]] += 1
            assert mine == per, (label, mine, per)                        # the same counts from the documented rule
        top_key = max(set(events), key=events.count)
        counts('kinesis.skew', {'events': 20000, 'customers': 500, 'busiest_customer': top_key, 'busiest_customer_events': events.count(top_key),
                                'by_key': by_key, 'salted_8': salted, 'mean_per_shard': 20000 / 4,
                                'by_key_ratio': round(max(by_key.values()) / (20000 / 4), 2), 'salted_ratio': round(max(salted.values()) / (20000 / 4), 2)})
        # resharding: split the busiest shard in the middle of its range
        hot = max(by_key, key=by_key.get)
        a, b = next((a, b) for sid, a, b in shards if sid == hot)
        before = k.list_shards(StreamName='orders')['Shards']
        k.split_shard(StreamName='orders', ShardToSplit=hot, NewStartingHashKey=str((a + b) // 2 + 1))
        after = k.list_shards(StreamName='orders')['Shards']

        def brief(lst):
            return [{'id': x['ShardId'], 'parent': x.get('ParentShardId', ''), 'state': 'closed' if 'EndingSequenceNumber' in x['SequenceNumberRange'] else 'open',
                     'share_of_the_ring': round((int(x['HashKeyRange']['EndingHashKey']) - int(x['HashKeyRange']['StartingHashKey']) + 1) / 2 ** 128, 4)} for x in lst]
        counts('kinesis.split', {'split': hot, 'before': brief(before), 'after': brief(after)})
        counts('kinesis.errors', {'unknown_stream': code_of(lambda: k.put_record(StreamName='nope', Data=b'x', PartitionKey='a'))})
    print('kinesis group done')

# ============================================================================= 7. SQS AND SNS
if 'sqs' in ONLY:
    with mock_aws():
        sqs = client('sqs')
        sns = client('sns')

        def arn(url):
            return sqs.get_queue_attributes(QueueUrl=url, AttributeNames=['QueueArn'])['Attributes']['QueueArn']
        dlq = sqs.create_queue(QueueName='orders-dlq')['QueueUrl']
        q = sqs.create_queue(QueueName='orders', Attributes={'VisibilityTimeout': '2', 'RedrivePolicy': json.dumps({'deadLetterTargetArn': arn(dlq), 'maxReceiveCount': 2})})['QueueUrl']
        sqs.send_message(QueueUrl=q, MessageBody='{"order_id": "O-5001"}')
        t0 = time.time()
        tl = []

        def receive(label):
            m = sqs.receive_message(QueueUrl=q, MaxNumberOfMessages=1, WaitTimeSeconds=0, AttributeNames=['ApproximateReceiveCount']).get('Messages', [])
            tl.append({'t': round((time.time() - t0) * 2) / 2, 'step': label, 'received': bool(m), 'receive_count': int(m[0]['Attributes']['ApproximateReceiveCount']) if m else None})
            return m
        receive('first receive, the worker starts and then crashes')
        receive('a second worker asks 0.1 seconds later')
        time.sleep(2.3)
        receive('the visibility timeout (2 s) has passed, the message is back')
        time.sleep(2.3)
        receive('a third attempt, but maxReceiveCount is 2')
        depth = lambda u: int(sqs.get_queue_attributes(QueueUrl=u, AttributeNames=['ApproximateNumberOfMessages', 'ApproximateNumberOfMessagesNotVisible'])['Attributes']['ApproximateNumberOfMessages'])
        moved = sqs.receive_message(QueueUrl=dlq, MaxNumberOfMessages=1, WaitTimeSeconds=0).get('Messages', [])
        counts('sqs.redrive', {'visibility_timeout_seconds': 2, 'max_receive_count': 2, 'timeline': tl, 'main_queue_depth_at_end': depth(q), 'dlq_message_body': moved[0]['Body'] if moved else None})
        # the happy path: receive, work, delete. The message does not come back.
        q2 = sqs.create_queue(QueueName='orders-ok', Attributes={'VisibilityTimeout': '1'})['QueueUrl']
        sqs.send_message(QueueUrl=q2, MessageBody='ok')
        m = sqs.receive_message(QueueUrl=q2, MaxNumberOfMessages=1).get('Messages', [])
        sqs.delete_message(QueueUrl=q2, ReceiptHandle=m[0]['ReceiptHandle'])
        time.sleep(1.3)
        counts('sqs.delete', {'received_first_time': bool(m), 'received_again_after_timeout': bool(sqs.receive_message(QueueUrl=q2, MaxNumberOfMessages=1).get('Messages', []))})
        # FIFO: the same deduplication id inside the window is one message
        fifo = sqs.create_queue(QueueName='orders.fifo', Attributes={'FifoQueue': 'true'})['QueueUrl']
        ids = []
        for _ in range(2):
            r = sqs.send_message(QueueUrl=fifo, MessageBody='order 1', MessageGroupId='C-0001', MessageDeduplicationId='O-5001')
            ids.append(r['MessageId'])
        r3 = sqs.send_message(QueueUrl=fifo, MessageBody='order 2', MessageGroupId='C-0001', MessageDeduplicationId='O-5002')
        got = []
        while True:
            m = sqs.receive_message(QueueUrl=fifo, MaxNumberOfMessages=10).get('Messages', [])
            if not m:
                break
            got += [x['Body'] for x in m]
            for x in m:
                sqs.delete_message(QueueUrl=fifo, ReceiptHandle=x['ReceiptHandle'])
        counts('sqs.fifo', {'sent': 3, 'received_in_order': got})
        counts('sqs.errors', {'fifo_without_group_id': code_of(lambda: sqs.send_message(QueueUrl=fifo, MessageBody='x'))})

        # SNS fan-out with a filter policy
        topic = sns.create_topic(Name='orders')['TopicArn']
        analytics = sqs.create_queue(QueueName='orders-analytics')['QueueUrl']
        billing = sqs.create_queue(QueueName='orders-billing')['QueueUrl']
        sns.subscribe(TopicArn=topic, Protocol='sqs', Endpoint=arn(analytics))
        sub = sns.subscribe(TopicArn=topic, Protocol='sqs', Endpoint=arn(billing), Attributes={'FilterPolicy': json.dumps({'status': ['COMPLETED']}), 'RawMessageDelivery': 'true'}, ReturnSubscriptionArn=True)
        for status in ('COMPLETED', 'CANCELLED'):
            sns.publish(TopicArn=topic, Message=json.dumps({'order_id': 'O-5001' if status == 'COMPLETED' else 'O-5002', 'status': status}), MessageAttributes={'status': {'DataType': 'String', 'StringValue': status}})

        def drain(url):
            out = []
            while True:
                m = sqs.receive_message(QueueUrl=url, MaxNumberOfMessages=10).get('Messages', [])
                if not m:
                    return out
                out += [x['Body'] for x in m]
                for x in m:
                    sqs.delete_message(QueueUrl=url, ReceiptHandle=x['ReceiptHandle'])
        a_bodies, b_bodies = drain(analytics), drain(billing)
        env = json.loads(a_bodies[0])
        counts('sns.fanout', {'analytics_count': len(a_bodies), 'billing_count': len(b_bodies), 'envelope_fields': sorted(env.keys()), 'envelope_type': env.get('Type'),
                              'inner_message_in_envelope': json.loads(env['Message']), 'billing_body_is_raw_message': json.loads(b_bodies[0]), 'filter_policy': {'status': ['COMPLETED']}})
    print('sqs group done')

# ============================================================================= 8. EVENTBRIDGE: WHICH EVENTS A RULE LETS THROUGH
if 'events' in ONLY:
    EV = [
        ('e1', 'Object Created', 'brewline-lake', 'raw/orders/dt=2026-03-14/orders-0001.json', 5000),
        ('e2', 'Object Created', 'brewline-lake', 'raw/customers/customers.csv', 120),
        ('e3', 'Object Created', 'other-lake', 'raw/orders/dt=2026-03-14/orders-0001.json', 5000),
        ('e4', 'Object Created', 'brewline-lake', 'curated/orders/dt=2026-03-14/part-0.parquet', 2000000),
        ('e5', 'Object Deleted', 'brewline-lake', 'raw/orders/dt=2026-03-14/orders-0001.json', 5000),
        ('e6', 'Object Created', 'brewline-lake', 'raw/orders/_temporary/part-0.json', 0),
    ]
    PATTERNS = [
        ('p1', 'The bucket and the key prefix', {'detail-type': ['Object Created'], 'detail': {'bucket': {'name': ['brewline-lake']}, 'object': {'key': [{'prefix': 'raw/orders/'}]}}}),
        ('p2', 'A number above a limit', {'detail': {'object': {'size': [{'numeric': ['>', 1000000]}]}}}),
        ('p3', 'Anything but one bucket', {'detail': {'bucket': {'name': [{'anything-but': ['other-lake']}]}}}),
        ('p4', 'Either of two detail types', {'detail-type': ['Object Created', 'Object Deleted'], 'detail': {'bucket': {'name': ['brewline-lake']}, 'object': {'key': [{'prefix': 'raw/customers/'}, {'prefix': 'raw/orders/dt='}]}}}),
        ('p5', 'A key suffix', {'detail': {'object': {'key': [{'suffix': '.parquet'}]}}}),
        ('p6', 'A field must exist', {'detail': {'object': {'size': [{'exists': True}]}}}),
    ]

    def doc_rule(pid, e):
        """What the EventBridge documentation says each pattern matches, worked out by hand from the rules for content filtering."""
        _, dtype, bucket, key, size = e
        if pid == 'p1':
            return dtype == 'Object Created' and bucket == 'brewline-lake' and key.startswith('raw/orders/')
        if pid == 'p2':
            return size > 1000000
        if pid == 'p3':
            return bucket != 'other-lake'
        if pid == 'p4':
            return dtype in ('Object Created', 'Object Deleted') and bucket == 'brewline-lake' and (key.startswith('raw/customers/') or key.startswith('raw/orders/dt='))
        if pid == 'p5':
            return key.endswith('.parquet')
        if pid == 'p6':
            return True
    rows = []
    with mock_aws():
        eb, sqs = client('events'), client('sqs')
        for pid, label, pat in PATTERNS:
            qurl = sqs.create_queue(QueueName='q-' + pid)['QueueUrl']
            qarn = sqs.get_queue_attributes(QueueUrl=qurl, AttributeNames=['QueueArn'])['Attributes']['QueueArn']
            eb.put_rule(Name='rule-' + pid, EventPattern=json.dumps(pat), State='ENABLED')
            eb.put_targets(Rule='rule-' + pid, Targets=[{'Id': '1', 'Arn': qarn}])
            sent = eb.put_events(Entries=[{'Source': 'aws.s3', 'DetailType': e[1], 'Detail': json.dumps({'bucket': {'name': e[2]}, 'object': {'key': e[3], 'size': e[4]}}), 'Resources': []} for e in EV])
            assert sent['FailedEntryCount'] == 0
            time.sleep(0.2)
            got = []
            while True:
                m = sqs.receive_message(QueueUrl=qurl, MaxNumberOfMessages=10).get('Messages', [])
                if not m:
                    break
                for x in m:
                    d = json.loads(x['Body'])['detail']
                    got.append((d['bucket']['name'], d['object']['key'], json.loads(x['Body'])['detail-type']))
                    sqs.delete_message(QueueUrl=qurl, ReceiptHandle=x['ReceiptHandle'])
            matched = [e[0] for e in EV if (e[2], e[3], e[1]) in got]
            want = [e[0] for e in EV if doc_rule(pid, e)]
            rows.append({'id': pid, 'label': label, 'pattern': pat, 'matched': matched, 'documented': want, 'agrees': matched == want})
    counts('events.patterns', {'events': [{'id': e[0], 'detail_type': e[1], 'bucket': e[2], 'key': e[3], 'size': e[4]} for e in EV], 'patterns': rows})
    print('events group done:', [(r['id'], r['agrees']) for r in rows])

# ============================================================================= 9. KMS, SECRETS MANAGER, SSM
if 'kms' in ONLY:
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM
    with mock_aws():
        kms, sm, ssm = client('kms'), client('secretsmanager'), client('ssm')
        key = kms.create_key(Description='brewline lake key')['KeyMetadata']
        kms.create_alias(AliasName='alias/brewline-lake', TargetKeyId=key['KeyId'])
        ctx = {'dataset': 'orders'}
        dk = kms.generate_data_key(KeyId='alias/brewline-lake', KeySpec='AES_256', EncryptionContext=ctx)
        plain = b'order O-5001 for customer C-0001, total 11.50'
        nonce = os.urandom(12)
        blob = nonce + AESGCM(dk['Plaintext']).encrypt(nonce, plain, b'orders')
        # keep only the encrypted data key next to the data, and forget the plaintext key
        restored = kms.decrypt(CiphertextBlob=dk['CiphertextBlob'], EncryptionContext=ctx)['Plaintext']
        again = AESGCM(restored).decrypt(blob[:12], blob[12:], b'orders')
        wrong_ctx = code_of(lambda: kms.decrypt(CiphertextBlob=dk['CiphertextBlob'], EncryptionContext={'dataset': 'customers'}))
        counts('kms.envelope', {'data_key_bytes': len(dk['Plaintext']), 'key_spec': 'AES_256', 'steps': ['GenerateDataKey returns the key twice: plaintext and encrypted under the KMS key', 'encrypt the data locally with the plaintext key (AES-GCM)',
                                                                                                           'store the encrypted data key next to the encrypted data, and drop the plaintext key', 'later: Decrypt the data key through KMS, then decrypt the data locally'],
                                'round_trip_ok': again == plain, 'wrong_encryption_context': wrong_ctx, 'key_has_alias': 'alias/brewline-lake', 'key_state': key['KeyState'], 'rotation_enabled_by_default': kms.get_key_rotation_status(KeyId=key['KeyId'])['KeyRotationEnabled']})
        sm.create_secret(Name='brewline/redshift', SecretString=json.dumps({'username': 'etl', 'password': 'v1-password'}))
        sm.put_secret_value(SecretId='brewline/redshift', SecretString=json.dumps({'username': 'etl', 'password': 'v2-password'}))
        vs = sm.list_secret_version_ids(SecretId='brewline/redshift')['Versions']
        cur = json.loads(sm.get_secret_value(SecretId='brewline/redshift')['SecretString'])['password']
        prev = json.loads(sm.get_secret_value(SecretId='brewline/redshift', VersionStage='AWSPREVIOUS')['SecretString'])['password']
        counts('secrets.versions', {'versions': sorted([sorted(v['VersionStages']) for v in vs]), 'current_password': cur, 'previous_password': prev,
                                    'missing': code_of(lambda: sm.get_secret_value(SecretId='brewline/nope'))})
        ssm.put_parameter(Name='/brewline/prod/athena/workgroup', Value='brewline', Type='String')
        ssm.put_parameter(Name='/brewline/prod/db/password', Value='s3cret', Type='SecureString')
        by_path = ssm.get_parameters_by_path(Path='/brewline/prod', Recursive=True, WithDecryption=False)['Parameters']
        counts('ssm.parameters', {'names': sorted(p['Name'] for p in by_path), 'types': {p['Name']: p['Type'] for p in by_path},
                                  'secure_value_without_decryption_is_clear_text': [p['Value'] for p in by_path if p['Type'] == 'SecureString'][0] == 's3cret'})
    print('kms group done')

# ============================================================================= 10. LAMBDA HANDLER AND ITS TESTS
LAMBDA_DIR = HERE / 'lambdaproj'
file('lambda/handler.py', (LAMBDA_DIR / 'handler.py').read_text())
file('lambda/handler_bug.py', (LAMBDA_DIR / 'handler_bug.py').read_text())
file('lambda/event.json', (LAMBDA_DIR / 'event.json').read_text())
file('lambda/test_handler.py', (LAMBDA_DIR / 'tests' / 'test_handler.py').read_text())
file('lambda/conftest.py', (LAMBDA_DIR / 'conftest.py').read_text())

if 'lambda' in ONLY:
    sys.path.insert(0, str(LAMBDA_DIR))
    with mock_aws():
        s3 = client('s3')
        s3.create_bucket(Bucket=BUCKET)
        lines = '\n'.join(json.dumps(o) for o in [{'order_id': 'O-5001', 'status': 'COMPLETED', 'total_usd': 11.5}, {'order_id': 'O-5002', 'status': 'COMPLETED', 'total_usd': 8.0}, {'order_id': 'O-5003', 'status': 'CANCELLED', 'total_usd': 30.0}])
        s3.put_object(Bucket=BUCKET, Key='raw/orders/dt=2026-03-14/orders-0001.json', Body=lines.encode())
        import importlib
        import handler as hmod
        importlib.reload(hmod)
        event = json.loads((LAMBDA_DIR / 'event.json').read_text())
        first = hmod.lambda_handler(event, None)
        second = hmod.lambda_handler(event, None)
        written = [o['Key'] for o in s3.list_objects_v2(Bucket=BUCKET, Prefix='curated/').get('Contents', [])]
        counts('lambda.run', {'event_key': event['Records'][0]['s3']['object']['key'], 'first': first, 'second': second, 'objects_written': written,
                              'summary_body': json.loads(s3.get_object(Bucket=BUCKET, Key=written[0])['Body'].read())})
    sys.path.remove(str(LAMBDA_DIR))
    print('lambda group done')


def run_pytest(handler_source):
    d = WORK / ('pytest-' + hashlib.md5(handler_source.encode()).hexdigest()[:6])
    shutil.copytree(LAMBDA_DIR, d, ignore=shutil.ignore_patterns('__pycache__', '.pytest_cache', 'handler_bug.py', 'event.json'))
    (d / 'handler.py').write_text(handler_source)
    env = dict(os.environ)
    env.pop('PYTHONPATH', None)
    r = subprocess.run([sys.executable, '-m', 'pytest', '-p', 'no:cacheprovider', '-q', '-x', '--tb=short', 'tests'], cwd=d, capture_output=True, text=True, env=env)
    out = (r.stdout + r.stderr).strip()
    out = re.sub(r' in \d+\.\d+s', ' in 0.5s', out)
    out = out.replace(str(d), '.').replace(str(WORK), '.')
    out = re.sub(r'(/[^\s:]*)?/site-packages/', '', out)
    return r.returncode, out


if 'test' in ONLY:
    rc_ok, out_ok = run_pytest((LAMBDA_DIR / 'handler.py').read_text())
    rc_bad, out_bad = run_pytest((LAMBDA_DIR / 'handler_bug.py').read_text())
    assert rc_ok == 0 and rc_bad != 0, (rc_ok, rc_bad)
    text('test.pass', out_ok)
    text('test.fail', out_bad)
    counts('test.summary', {'pass_rc': rc_ok, 'fail_rc': rc_bad, 'passed': 3, 'failed_with_bug': len(re.findall(r'^FAILED|NoSuchKey', out_bad, re.M)) > 0})
    print('test group done')

# ============================================================================= 11. CLOUDFORMATION, POLICY AND STATE MACHINE CHECKS
CFN_DIR = HERE / 'cfnproj'
for n in ('lake', 'pipeline'):
    file('cfn/%s.yaml' % n, (CFN_DIR / ('%s.yaml' % n)).read_text())

if 'cfn' in ONLY:
    BIN = pathlib.Path(sys.executable).parent
    d = WORK / 'cfn'
    d.mkdir()
    lake = (CFN_DIR / 'lake.yaml').read_text()
    bug = (lake.replace('      VersioningConfiguration:\n', '      VersioningConfig:\n').replace('SSEAlgorithm: aws:kms', 'SSEAlgorithm: aws:kmss')
               .replace('Resource: !GetAtt LakeBucket.Arn', 'Resource: !GetAtt LakeBucket.Arnn').replace('NumberOfWorkers: 5', 'NumberOfWorkers: five'))
    bug = re.sub(r'      Command:\n(        .*\n)+', '', bug)
    assert bug != lake
    (d / 'lake.yaml').write_text(lake)
    (d / 'lake_bug.yaml').write_text(bug)
    file('cfn/lake_bug.yaml', bug)

    def lint(name):
        r = subprocess.run([str(BIN / 'cfn-lint'), name], cwd=d, capture_output=True, text=True)
        return r.returncode, (r.stdout + r.stderr).strip()
    rc_good, out_good = lint('lake.yaml')
    rc_bug, out_bug = lint('lake_bug.yaml')
    findings = re.findall(r'^(\w\d{4}) (.*)$\n(\S+):(\d+):(\d+)', out_bug, re.M)
    text('cfn.lint_good', out_good or 'no findings (exit code 0)')
    text('cfn.lint_bug', out_bug)
    counts('cfn.lint', {'good_rc': rc_good, 'bug_rc': rc_bug, 'findings': [{'rule': f[0], 'message': f[1][:160], 'line': int(f[3])} for f in findings]})
    assert rc_good == 0 and rc_bug != 0 and len(findings) == 5, (rc_good, rc_bug, len(findings))

    # the state machine: asl-validator checks the definition the way the AWS API would
    import yaml

    class Loader(yaml.SafeLoader):
        pass
    Loader.add_multi_constructor('!', lambda loader, suffix, node: '<%s>' % suffix)
    tpl = yaml.load((CFN_DIR / 'pipeline.yaml').read_text(), Loader=Loader)
    asl = tpl['Resources']['OrdersPipeline']['Properties']['Definition']
    variants = {'pipeline_good': asl}
    b1 = json.loads(json.dumps(asl)); b1['States']['RunGlueJob']['Next'] = 'CheckRowCounts'
    b2 = json.loads(json.dumps(asl)); del b2['States']['CheckRowCount']['End']
    b3 = json.loads(json.dumps(asl)); b3['States']['Failed']['Type'] = 'Failure'
    variants.update({'pipeline_next_to_a_missing_state': b1, 'pipeline_no_end': b2, 'pipeline_unknown_type': b3})
    paths = []
    for name, defn in variants.items():
        pth = d / (name + '.json')
        pth.write_text(json.dumps(defn, indent=2))
        paths.append(str(pth))
        file('cfn/%s.json' % name, json.dumps(defn, indent=2))
    r = subprocess.run(['node', str(HERE / 'asl_check.js')] + paths, capture_output=True, text=True)
    assert r.returncode == 0, r.stderr
    asl_results = [json.loads(x) for x in r.stdout.strip().splitlines()]
    counts('asl.validate', {x['file']: {'valid': x['valid'], 'errors': x['errors']} for x in asl_results})

    # IAM policy documents, checked by parliament
    import parliament
    docs = {
        'read_curated': POL_READ_CURATED, 'deny_secret': POL_DENY_SECRET, 'wrong_arns': POL_WRONG_ARNS, 'role_raw': POL_ROLE_RAW,
        'misspelled_action': policy({'Effect': 'Allow', 'Action': ['s3:GetObjects'], 'Resource': arn_bucket() + '/*'}),
        'wildcards': policy({'Effect': 'Allow', 'Action': 's3:*', 'Resource': '*'}),
    }
    pl = {}
    for name, doc in docs.items():
        a = parliament.analyze_policy_string(json.dumps(doc))
        a.analyze()
        seen, found = set(), []
        for f in a.findings:
            detail = re.sub(r'\s+', ' ', str(f.detail))
            if f.issue == 'RESOURCE_STAR':
                detail = 'Resource is * for actions that accept a resource ARN (%d actions)' % len(re.findall(r"'[a-z0-9\-]+:[A-Za-z0-9*]+'", detail))
            if (f.issue, detail) not in seen:
                seen.add((f.issue, detail))
                found.append({'issue': f.issue, 'detail': detail[:160]})
        pl[name] = found
    counts('policy.lint', pl)
    print('cfn group done:', [f[0] for f in findings], {k: v['valid'] for k, v in OUT['counts']['asl.validate'].items()})

# ============================================================================= 12. THE AWS CLI AGAINST MOTO
if 'cli' in ONLY:
    import socket
    PORT = 5055
    BIN = pathlib.Path(sys.executable).parent
    srv = subprocess.Popen([sys.executable, '-m', 'moto.server', '-H', '127.0.0.1', '-p', str(PORT)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        for _ in range(100):
            try:
                socket.create_connection(('127.0.0.1', PORT), timeout=0.2).close()
                break
            except OSError:
                time.sleep(0.2)
        d = WORK / 'cli'
        (d / 'landing').mkdir(parents=True)
        for n in (1, 2, 3):
            (d / 'landing' / ('orders-%04d.json' % n)).write_text('{"order_id": "O-%d"}\n' % (5000 + n) * (n * 40))
        (d / 'lifecycle.json').write_text(jdump({'Rules': [{'ID': 'raw-to-cheaper-storage', 'Status': 'Enabled', 'Filter': {'Prefix': 'raw/'}, 'Transitions': [{'Days': 30, 'StorageClass': 'STANDARD_IA'}]}]}))
        env = dict(os.environ, AWS_PAGER='', AWS_DEFAULT_OUTPUT='json', COLUMNS='100')

        def aws(*a, keep_rc=False):
            r = subprocess.run([str(BIN / 'aws'), '--endpoint-url', 'http://127.0.0.1:%d' % PORT] + list(a), cwd=d, capture_output=True, text=True, env=env)
            out = (r.stdout + r.stderr).rstrip('\n')
            out = re.sub(r'\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}', '2026-03-14 09:00:00', out)
            # the CLI redraws a progress line ("Completed 920 Bytes/5.4 KiB ...") with a carriage return, so a terminal never shows it for long
            out = '\n'.join(ln for ln in out.split('\n') if not ln.startswith('Completed ')).strip('\n')
            return (r.returncode, out) if keep_rc else out
        cmds = []

        def run(label, *a, **kw):
            res = aws(*a, **kw)
            rc, out = res if isinstance(res, tuple) else (0, res)
            shown = 'aws ' + ' '.join(("'%s'" % x if re.search(r'[\s\[\]{}\\,]', x) and not x.startswith('--') else x) for x in a)
            cmds.append({'label': label, 'command': shown, 'rc': rc, 'output': out})
            return out
        run('make a bucket', 's3', 'mb', 's3://' + BUCKET)
        run('copy one file', 's3', 'cp', 'landing/orders-0001.json', 's3://%s/raw/orders/dt=2026-03-14/orders-0001.json' % BUCKET)
        run('sync, dry run', 's3', 'sync', 'landing', 's3://%s/raw/orders/dt=2026-03-15/' % BUCKET, '--dryrun')
        run('sync', 's3', 'sync', 'landing', 's3://%s/raw/orders/dt=2026-03-15/' % BUCKET)
        run('list a prefix', 's3', 'ls', 's3://%s/raw/orders/' % BUCKET, '--recursive', '--human-readable', '--summarize')
        run('list as a table', 's3api', 'list-objects-v2', '--bucket', BUCKET, '--prefix', 'raw/orders/dt=2026-03-15/', '--query', 'Contents[].{Key:Key,Size:Size}', '--output', 'table')
        run('sum the sizes', 's3api', 'list-objects-v2', '--bucket', BUCKET, '--prefix', 'raw/orders/', '--query', 'sum(Contents[].Size)')
        run('two keys at a time', 's3api', 'list-objects-v2', '--bucket', BUCKET, '--prefix', 'raw/orders/dt=2026-03-15/', '--max-items', '2', '--query', '{keys: Contents[].Key, next: NextToken}')
        run('set a lifecycle rule', 's3api', 'put-bucket-lifecycle-configuration', '--bucket', BUCKET, '--lifecycle-configuration', 'file://lifecycle.json')
        run('read it back', 's3api', 'get-bucket-lifecycle-configuration', '--bucket', BUCKET, '--query', 'Rules[].{id:ID,days:Transitions[0].Days,class:Transitions[0].StorageClass}', '--output', 'text')
        run('a bucket that does not exist', 's3', 'ls', 's3://no-such-bucket-brewline', keep_rc=True)
        counts('cli.runs', {'commands': cmds, 'cli': 'AWS CLI %s (version 1, installed with pip)' % OUT['meta'].get('awscli')})
        print('cli group done:', [(c['label'], c['rc']) for c in cmds])
    finally:
        srv.terminate()
        try:
            srv.wait(timeout=10)
        except subprocess.TimeoutExpired:
            srv.kill()

# ============================================================================= FINISH
def finish():
    body = 'window.LAB = window.LAB || {};\nLAB.real = ' + json.dumps(OUT, indent=1, ensure_ascii=False, sort_keys=True) + ';\n'
    pathlib.Path(args.out).write_text(body)
    if args.json:
        pathlib.Path(args.json).write_text(json.dumps(OUT, indent=1, ensure_ascii=False, sort_keys=True))
    shutil.rmtree(WORK, ignore_errors=True)
    print('wrote', args.out, '(%d bytes)' % len(body), {k: len(v) for k, v in OUT.items()})


finish()
