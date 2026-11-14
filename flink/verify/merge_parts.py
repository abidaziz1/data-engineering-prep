"""Development helper: merge the sections that are finished in a --parts folder into a real.js, so that the lessons can be written while the rest is still being recorded.   python3 merge_parts.py /tmp/flink-parts-1 ../js/real.js"""
import json
import pathlib
import sys

parts, dest = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
out = {'meta': {'flink': '2.2.1', 'kafka': '4.4.0', 'kafka-connector': '5.0.0-2.2', 'flink-cdc': '3.7.0-2.2', 'postgresql': '16', 'java': '21', 'python': '3', 'confluent-kafka': '', 'librdkafka': '', 'company': 'Brewline', 'note': 'merged for development'},
       'files': {}, 'text': {}, 'tables': {}, 'counts': {}}
for p in sorted(parts.glob('part-*.json')):
    for k, v in json.loads(p.read_text()).items():
        out[k].update(v)
dest.write_text('window.LAB = window.LAB || {};\nLAB.real = ' + json.dumps(out, indent=1, sort_keys=True, ensure_ascii=False) + ';\n')
print('merged', [p.name for p in sorted(parts.glob('part-*.json'))], {k: len(v) for k, v in out.items()})
