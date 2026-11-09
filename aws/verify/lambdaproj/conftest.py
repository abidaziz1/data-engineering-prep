import importlib
import os

import pytest
from moto import mock_aws

os.environ.setdefault("AWS_ACCESS_KEY_ID", "testing")
os.environ.setdefault("AWS_SECRET_ACCESS_KEY", "testing")
os.environ.setdefault("AWS_DEFAULT_REGION", "us-east-1")

BUCKET = "brewline-lake"


@pytest.fixture()
def lake():
    """An empty bucket in a mocked S3, and the handler module created inside the mock."""
    with mock_aws():
        import boto3

        boto3.client("s3").create_bucket(Bucket=BUCKET)
        import handler

        importlib.reload(handler)
        yield handler
