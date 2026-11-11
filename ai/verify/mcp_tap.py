"""A tap on the wire. It starts the real server as a child process, copies every line that passes in either direction to a log file, and changes nothing."""
import json
import subprocess
import sys
import threading

log = open(sys.argv[1], 'w')
child = subprocess.Popen(sys.argv[2:], stdin=subprocess.PIPE, stdout=subprocess.PIPE, text=True, bufsize=1)


def pump(src, dst, tag):
    for line in src:
        log.write(json.dumps({'dir': tag, 'line': line.rstrip('\n')}) + '\n')
        log.flush()
        dst.write(line)
        dst.flush()


threading.Thread(target=pump, args=(child.stdout, sys.stdout, 'server->client'), daemon=True).start()
pump(sys.stdin, child.stdin, 'client->server')
child.stdin.close()
child.wait()
