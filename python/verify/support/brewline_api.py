"""A fake Brewline partner API for the lessons. It runs on this machine, in a thread, and uses only the standard library.
Pagination that changes under you, rate limits, slow answers and flaky answers, each one per client (the `sid` query value)."""
import json
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

LOCK = threading.Lock()
STATE = {}


def fresh():
    # 23 orders, O-100 to O-122. The newest-first listing starts at O-122.
    return {"orders": [{"id": f"O-{n}", "total_cents": 500 + (n * 137) % 3000} for n in range(100, 123)], "served": 0, "calls": [], "flaky": 0}


def events(st, scenario):
    """What changes after the first page of a listing has been served."""
    if st["served"] == 1 and scenario == "insert":
        st["orders"] += [{"id": f"O-{n}", "total_cents": 900 + n} for n in (123, 124, 125)]          # three new orders arrive
    if st["served"] == 1 and scenario == "delete":
        st["orders"] = [o for o in st["orders"] if o["id"] not in ("O-122", "O-121", "O-120")]        # three newest are cancelled


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *args):
        pass

    def send(self, code, body, headers=None):
        raw = json.dumps(body).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(raw)))
        for k, v in (headers or {}).items():
            self.send_header(k, v)
        self.end_headers()
        self.wfile.write(raw)

    def do_GET(self):
        u = urlparse(self.path)
        q = {k: v[0] for k, v in parse_qs(u.query).items()}
        sid = q.get("sid", "-")
        with LOCK:
            st = STATE.setdefault(sid, fresh())
            if u.path == "/orders":  # offset pages, newest first
                page, per = int(q.get("page", 1)), int(q.get("per_page", 5))
                newest_first = sorted(st["orders"], key=lambda o: -int(o["id"][2:]))
                items = newest_first[(page - 1) * per: page * per]
                st["served"] += 1
                events(st, q.get("scenario"))
                return self.send(200, {"page": page, "items": items})
            if u.path == "/orders/cursor":  # keyset pages, oldest first, after an id
                limit, after = int(q.get("limit", 5)), q.get("after")
                oldest_first = sorted(st["orders"], key=lambda o: int(o["id"][2:]))
                rest = [o for o in oldest_first if after is None or int(o["id"][2:]) > int(after[2:])]
                items = rest[:limit]
                st["served"] += 1
                events(st, q.get("scenario"))
                return self.send(200, {"items": items, "next_cursor": items[-1]["id"] if len(rest) > limit else None})
            if u.path == "/admin/ids":
                return self.send(200, {"ids": sorted(o["id"] for o in st["orders"])})
            if u.path.startswith("/orders/"):
                found = [o for o in st["orders"] if o["id"] == u.path.split("/")[-1]]
                return self.send(200, found[0]) if found else self.send(404, {"error": "no such order"})
            if u.path == "/limited":  # at most 3 requests in each second, then 429 with Retry-After
                now = time.monotonic()
                st["calls"] = [t for t in st["calls"] if now - t < 1.0]
                if len(st["calls"]) >= 3:
                    return self.send(429, {"error": "slow down"}, {"Retry-After": "1"})
                st["calls"].append(now)
                return self.send(200, {"ok": True})
            if u.path == "/flaky":  # fails with 503 the first `fail` times
                st["flaky"] += 1
                if st["flaky"] <= int(q.get("fail", 2)):
                    return self.send(503, {"error": "try again"})
                return self.send(200, {"ok": True, "calls": st["flaky"]})
        if u.path == "/slow":
            time.sleep(float(q.get("delay", 1)))
            return self.send(200, {"ok": True})
        return self.send(404, {"error": "unknown path"})


def serve():
    """Start the server on a free port, in a thread that ends with the program. Returns the base URL."""
    server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    return f"http://127.0.0.1:{server.server_address[1]}"
