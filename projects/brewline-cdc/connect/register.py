"""Registers the connector on a Kafka Connect worker, or updates it when it exists.

Run:   python connect/register.py            (uses PGHOST, PGPORT and CONNECT_URL when they are set)
"""

import json
import os
import pathlib
import urllib.request

CONNECT_URL = os.environ.get('CONNECT_URL', 'http://localhost:8083')


def request(method, path, body=None):
    data = json.dumps(body).encode() if body is not None else None
    headers = {'Content-Type': 'application/json'}
    req = urllib.request.Request(CONNECT_URL + path, data=data, method=method, headers=headers)
    with urllib.request.urlopen(req, timeout=30) as response:
        text = response.read().decode()
        return response.status, json.loads(text) if text else None


def load_config():
    path = pathlib.Path(__file__).with_name('orders-connector.json')
    spec = json.loads(path.read_text())
    settings = spec['config']
    settings['database.hostname'] = os.environ.get('PGHOST', settings['database.hostname'])
    settings['database.port'] = os.environ.get('PGPORT', settings['database.port'])
    return spec


if __name__ == '__main__':
    spec = load_config()
    status, body = request('PUT', '/connectors/%s/config' % spec['name'], spec['config'])
    print('connector %s: HTTP %d' % (spec['name'], status))
