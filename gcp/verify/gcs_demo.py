"""Cloud Storage with the real client library, on an emulator that runs on this machine, and a signed URL that is made without any network.

The emulator (gcp-storage-emulator) is a small Python program that speaks the JSON API of Cloud Storage. It is not Cloud Storage. It ignores bucket locations
and it does not enforce preconditions. The lesson shows both, because an emulator that says yes to everything is the main way to be surprised later.
A signed URL needs no network: the library signs a text with a private key, and Cloud Storage checks the signature when someone uses the URL.
"""
import datetime
import hashlib
import urllib.parse

from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding, rsa
from google.auth.credentials import AnonymousCredentials
from google.cloud import storage
from google.oauth2 import service_account


def anonymous_client(project='brewline-dev'):
    """A client that talks to the emulator (STORAGE_EMULATOR_HOST is set) and sends no credentials."""
    return storage.Client(project=project, credentials=AnonymousCredentials())


def land_files(client, bucket_name):
    """Three files in a Hive style layout: orders/dt=2026-11-10/part-0000.json and so on."""
    bucket = client.create_bucket(bucket_name, location='asia-southeast1')
    for dt, parts in (('2026-11-09', 2), ('2026-11-10', 3)):
        for i in range(parts):
            bucket.blob('orders/dt=%s/part-%04d.json' % (dt, i)).upload_from_string(('{"order_id": %d}\n' % (i + 1)).encode(), content_type='application/json')
    bucket.blob('exports/week-45/report.csv').upload_from_string(b'store_id,total\ns01,450\n', content_type='text/csv')
    return bucket


def list_like_folders(client, bucket_name, prefix, delimiter='/'):
    """There are no folders in a bucket: a name is one string. prefix and delimiter make the names look like a tree."""
    it = client.list_blobs(bucket_name, prefix=prefix, delimiter=delimiter)
    names = [b.name for b in it]
    return {'prefix': prefix, 'delimiter': delimiter, 'objects': names, 'prefixes': sorted(it.prefixes)}


def lifecycle_rules():
    """Move to a cheaper class after 30 days, delete after a year, and delete old versions after 3 newer ones exist. Returned as the JSON the API takes."""
    b = storage.Bucket(storage.Client(project='brewline-dev', credentials=AnonymousCredentials()), 'brewline-landing-dev')
    b.add_lifecycle_set_storage_class_rule('NEARLINE', age=30, matches_storage_class=['STANDARD'])
    b.add_lifecycle_delete_rule(age=365)
    b.add_lifecycle_delete_rule(number_of_newer_versions=3, is_live=False)
    return list(b.lifecycle_rules)


def throwaway_credentials():
    """A service account key made on the spot. It belongs to no project and works nowhere: it only lets the library sign."""
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    pem = key.private_bytes(serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8, serialization.NoEncryption()).decode()
    info = {'type': 'service_account', 'project_id': 'brewline-dev', 'private_key_id': 'k1', 'private_key': pem,
            'client_email': 'reader@brewline-dev.iam.gserviceaccount.com', 'client_id': '1', 'token_uri': 'https://oauth2.googleapis.com/token'}
    return service_account.Credentials.from_service_account_info(info), key.public_key()


def signed_url(creds, bucket, name, minutes=15):
    client = storage.Client(project='brewline-dev', credentials=creds)
    blob = client.bucket(bucket).blob(name)
    return blob.generate_signed_url(version='v4', expiration=datetime.timedelta(minutes=minutes), method='GET', credentials=creds)


def check_signature(url, public_key, object_name=None):
    """Rebuild the text that was signed, from the URL alone, and check the signature with the public key. Returns True or False."""
    u = urllib.parse.urlsplit(url)
    q = {k: v[0] for k, v in urllib.parse.parse_qs(u.query).items()}
    sig = bytes.fromhex(q.pop('X-Goog-Signature'))
    path = u.path if object_name is None else '/' + urllib.parse.quote(object_name, safe='/')
    query = '&'.join('%s=%s' % (urllib.parse.quote(k, safe=''), urllib.parse.quote(q[k], safe='')) for k in sorted(q))
    canonical = '\n'.join(['GET', path, query, 'host:' + u.netloc + '\n', q['X-Goog-SignedHeaders'], 'UNSIGNED-PAYLOAD'])
    scope = q['X-Goog-Credential'].split('/', 1)[1]
    to_sign = '\n'.join(['GOOG4-RSA-SHA256', q['X-Goog-Date'], scope, hashlib.sha256(canonical.encode()).hexdigest()])
    try:
        public_key.verify(sig, to_sign.encode(), padding.PKCS1v15(), hashes.SHA256())
        return True, canonical, to_sign
    except Exception:
        return False, canonical, to_sign
