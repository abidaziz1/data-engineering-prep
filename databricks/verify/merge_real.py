#!/usr/bin/env python3
"""Copy chosen keys from a partial recording (capture_db.py --only ... --json FILE) into js/real.js.

Use it after you add one recorded fact to capture_db.py and do not want to run the whole recording again (about 10 minutes).
The next full run of capture_db.py rewrites everything, so the committed real.js always matches the recorder.

A key is  section.name  or  section.prefix*  (the star copies every key that starts with the prefix).
Usage:  python3 databricks/verify/merge_real.py partial.json text.delta.err_merge_duplicates 'counts.sdp.*' 'files.sdp/*'
"""
import json, pathlib, re, sys

REAL = pathlib.Path(__file__).resolve().parent.parent / 'js' / 'real.js'
src = json.loads(pathlib.Path(sys.argv[1]).read_text())
text = REAL.read_text()
m = re.match(r'(window\.LAB = window\.LAB \|\| \{\};\nLAB\.real = )(.*);\n$', text, re.S)
real = json.loads(m.group(2))
for k in sys.argv[2:]:
    section, _, name = k.partition('.')
    names = [n for n in src[section] if n.startswith(name[:-1])] if name.endswith('*') else [name]
    for n in names:
        real[section][n] = src[section][n]
        print('merged', section + '.' + n)
REAL.write_text(m.group(1) + json.dumps(real, indent=1, ensure_ascii=False, sort_keys=True) + ';\n')
