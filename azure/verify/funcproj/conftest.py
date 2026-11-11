import importlib
import os
import uuid

import pytest
from azure.storage.blob import BlobServiceClient

CONNECTION = os.environ["LAKE_CONNECTION"]       # set by the recorder: the storage emulator


@pytest.fixture()
def lake(monkeypatch):
    """Two fresh containers in the emulator, and the handler module pointed at them."""
    suffix = uuid.uuid4().hex[:8]
    svc = BlobServiceClient.from_connection_string(CONNECTION)
    raw, curated = "raw" + suffix, "curated" + suffix
    svc.create_container(raw)
    svc.create_container(curated)
    monkeypatch.setenv("SUMMARY_CONTAINER", curated)
    import handler
    importlib.reload(handler)
    handler.svc, handler.RAW, handler.CURATED = svc, raw, curated
    yield handler
