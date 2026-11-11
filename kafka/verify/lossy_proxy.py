"""A TCP proxy that sits between a client and one Kafka broker and throws away the response to the first Produce request.

The broker has written the records, the client never hears about it. This is what a network that drops a packet looks like to a producer, and it is the cleanest way to make
a producer retry a batch that the broker already has. It reads the Kafka protocol only as far as it must: every request and response starts with a 4 byte length, a request has an
API key (Produce is 0) and a correlation id, and a response starts with the correlation id of the request that it answers.
"""
import socket
import threading


def recv_exact(sock, n):
    buf = b''
    while len(buf) < n:
        chunk = sock.recv(n - len(buf))
        if not chunk:
            raise ConnectionError('closed')
        buf += chunk
    return buf


class LossyProxy:
    def __init__(self, listen_port, target_port, drop=1):
        self.listen_port, self.target_port, self.drop = listen_port, target_port, drop
        self.dropped = 0
        self.produce_requests = 0
        self.srv = socket.socket()
        self.srv.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        self.srv.bind(('localhost', listen_port))
        self.srv.listen(16)
        self.lock = threading.Lock()
        threading.Thread(target=self._accept, daemon=True).start()

    def arm(self, drop=1):
        """Start counting again and throw away the response to the next `drop` Produce requests."""
        with self.lock:
            self.dropped, self.produce_requests, self.drop = 0, 0, drop

    def _accept(self):
        while True:
            try:
                client, _ = self.srv.accept()
            except OSError:
                return
            threading.Thread(target=self._handle, args=(client,), daemon=True).start()

    def _handle(self, client):
        try:
            up = socket.create_connection(('localhost', self.target_port))
        except OSError:
            client.close()
            return
        produce_ids = set()

        def to_broker():
            try:
                while True:
                    head = recv_exact(client, 4)
                    body = recv_exact(client, int.from_bytes(head, 'big'))
                    if int.from_bytes(body[0:2], 'big', signed=True) == 0:         # API key 0 is Produce
                        with self.lock:
                            self.produce_requests += 1
                        produce_ids.add(int.from_bytes(body[4:8], 'big'))
                    up.sendall(head + body)
            except (ConnectionError, OSError):
                pass
            finally:
                for s in (up, client):
                    try:
                        s.close()
                    except OSError:
                        pass

        def to_client():
            try:
                while True:
                    head = recv_exact(up, 4)
                    body = recv_exact(up, int.from_bytes(head, 'big'))
                    corr = int.from_bytes(body[0:4], 'big')
                    if corr in produce_ids:
                        produce_ids.discard(corr)
                        with self.lock:
                            if self.dropped < self.drop:
                                self.dropped += 1
                                continue                      # the response is thrown away
                    client.sendall(head + body)
            except (ConnectionError, OSError):
                pass
            finally:
                for s in (up, client):
                    try:
                        s.close()
                    except OSError:
                        pass
        threading.Thread(target=to_broker, daemon=True).start()
        threading.Thread(target=to_client, daemon=True).start()

    def close(self):
        self.srv.close()
