"""A local stand-in for a model API. It speaks just enough of the Messages API and of the Chat Completions API for the real SDKs to talk to it.

It is not a model. It answers with text that the script gives it, it can fail on demand (429, 500, a slow answer), and it writes down every request
it receives. That makes the behaviour of the client libraries repeatable: retries, timeouts, streaming events, tool calls.
"""
import http.server
import json
import socketserver
import threading
import time


def anthropic_message(text='ok', tool=None, input_tokens=21, output_tokens=7):
    content = [{'type': 'text', 'text': text}] if tool is None else [{'type': 'tool_use', 'id': 'toolu_01', 'name': tool[0], 'input': tool[1]}]
    return {'id': 'msg_01', 'type': 'message', 'role': 'assistant', 'model': 'stand-in', 'content': content, 'stop_reason': 'end_turn' if tool is None else 'tool_use',
            'stop_sequence': None, 'usage': {'input_tokens': input_tokens, 'output_tokens': output_tokens}}


def anthropic_error(kind, message):
    return {'type': 'error', 'error': {'type': kind, 'message': message}}


def openai_chat(text='ok', prompt_tokens=18, completion_tokens=5):
    return {'id': 'chatcmpl-1', 'object': 'chat.completion', 'created': 1, 'model': 'stand-in', 'choices': [{'index': 0, 'message': {'role': 'assistant', 'content': text}, 'finish_reason': 'stop'}],
            'usage': {'prompt_tokens': prompt_tokens, 'completion_tokens': completion_tokens, 'total_tokens': prompt_tokens + completion_tokens}}


def anthropic_sse(pieces):
    out = ['event: message_start\ndata: ' + json.dumps({'type': 'message_start', 'message': {'id': 'msg_01', 'type': 'message', 'role': 'assistant', 'model': 'stand-in', 'content': [], 'stop_reason': None,
                                                                                          'stop_sequence': None, 'usage': {'input_tokens': 21, 'output_tokens': 1}}}),
           'event: content_block_start\ndata: ' + json.dumps({'type': 'content_block_start', 'index': 0, 'content_block': {'type': 'text', 'text': ''}})]
    for t in pieces:
        out.append('event: content_block_delta\ndata: ' + json.dumps({'type': 'content_block_delta', 'index': 0, 'delta': {'type': 'text_delta', 'text': t}}))
    out += ['event: content_block_stop\ndata: ' + json.dumps({'type': 'content_block_stop', 'index': 0}),
            'event: message_delta\ndata: ' + json.dumps({'type': 'message_delta', 'delta': {'stop_reason': 'end_turn', 'stop_sequence': None}, 'usage': {'output_tokens': len(pieces) * 2}}),
            'event: message_stop\ndata: ' + json.dumps({'type': 'message_stop'})]
    return '\n\n'.join(out) + '\n\n'


def openai_sse(pieces):
    out = []
    for i, t in enumerate(pieces):
        delta = {'content': t} if i else {'role': 'assistant', 'content': t}
        out.append('data: ' + json.dumps({'id': 'chatcmpl-1', 'object': 'chat.completion.chunk', 'created': 1, 'model': 'stand-in', 'choices': [{'index': 0, 'delta': delta, 'finish_reason': None}]}))
    out.append('data: ' + json.dumps({'id': 'chatcmpl-1', 'object': 'chat.completion.chunk', 'created': 1, 'model': 'stand-in', 'choices': [{'index': 0, 'delta': {}, 'finish_reason': 'stop'}]}))
    out.append('data: [DONE]')
    return '\n\n'.join(out) + '\n\n'


class StandIn:
    """plan: a list. Each item is (status, headers, body, delay_seconds). The body is a dict (JSON) or a string (sent as it is, for streaming)."""

    def __init__(self):
        self.plan, self.log, self.side_effects, self.lock = [], [], {}, threading.Lock()
        standin = self

        class H(http.server.BaseHTTPRequestHandler):
            def log_message(self, *a):
                pass

            def do_POST(self):
                n = int(self.headers.get('content-length', 0))
                body = self.rfile.read(n)
                try:
                    parsed = json.loads(body or b'{}')
                except ValueError:
                    parsed = None
                with standin.lock:
                    standin.log.append({'t': time.time(), 'path': self.path, 'retry_count': self.headers.get('x-stainless-retry-count'), 'idempotency_key': self.headers.get('idempotency-key'), 'body': parsed})
                    item = standin.plan.pop(0) if standin.plan else (200, {}, {}, 0)
                status, headers, out, delay = (list(item) + [0])[:4]
                if delay:
                    time.sleep(delay)
                if self.headers.get('idempotency-key'):
                    with standin.lock:
                        key = self.headers['idempotency-key']
                        standin.side_effects[key] = standin.side_effects.get(key, 0) + (0 if key in standin.side_effects else 1)
                else:
                    with standin.lock:
                        standin.side_effects['no-key'] = standin.side_effects.get('no-key', 0) + 1
                data = out.encode() if isinstance(out, str) else json.dumps(out).encode()
                try:
                    self.send_response(status)
                    self.send_header('content-type', 'text/event-stream' if isinstance(out, str) else 'application/json')
                    self.send_header('content-length', str(len(data)))
                    for k, v in headers.items():
                        self.send_header(k, v)
                    self.end_headers()
                    self.wfile.write(data)
                except (BrokenPipeError, ConnectionResetError):
                    pass

        class S(socketserver.ThreadingTCPServer):
            daemon_threads = True
            allow_reuse_address = True

        self.srv = S(('127.0.0.1', 0), H)
        threading.Thread(target=self.srv.serve_forever, daemon=True).start()
        self.base = 'http://127.0.0.1:%d' % self.srv.server_address[1]

    def reset(self, plan=None):
        with self.lock:
            self.plan, self.log, self.side_effects = list(plan or []), [], {}

    def gaps(self):
        t = [x['t'] for x in self.log]
        return [round(b - a, 2) for a, b in zip(t, t[1:])]

    def close(self):
        self.srv.shutdown()
