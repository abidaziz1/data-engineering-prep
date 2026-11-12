"""Logs that you can search: a level, a name, fields as data, and the traceback of an error. No timestamps, so the output is the same each run."""
import json
import logging
import sys


class JsonFormatter(logging.Formatter):
    def format(self, record):
        data = {"level": record.levelname, "logger": record.name, "message": record.getMessage()}
        data.update(getattr(record, "fields", {}))
        if record.exc_info:
            data["error"] = self.formatException(record.exc_info).splitlines()[-1]
        return json.dumps(data)


handler = logging.StreamHandler(sys.stdout)
handler.setFormatter(JsonFormatter())
log = logging.getLogger("brewline.load")
log.addHandler(handler)
log.setLevel(logging.INFO)
log.propagate = False

run = {"run_id": "2026-03-14"}
log.debug("this line is not shown at the level INFO")
log.info("extract finished", extra={"fields": dict(run, rows=1200, seconds=4)})
log.warning("rows rejected", extra={"fields": dict(run, rejected=3, share=0.0025)})
try:
    int("12,50")
except ValueError:
    log.exception("load failed", extra={"fields": run})
