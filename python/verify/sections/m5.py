"""Mission 5: files and formats."""
import json
import pathlib
import shutil

BENCH = pathlib.Path(__file__).resolve().parent.parent / 'bench'

TEXTS = ['Zoe', 'Zoë', 'café', 'Ñandú', '東京']
FILE_ENC = ['utf-8', 'utf-16', 'latin-1', 'cp1252']
READ_AS = ['utf-8', 'latin-1', 'cp1252', 'ascii']


def encoding_matrix():
    cells = {}
    for t in TEXTS:
        for fe in FILE_ENC:
            try:
                data = t.encode(fe)
            except UnicodeEncodeError as e:
                for ra in READ_AS:
                    cells['%s|%s|%s' % (t, fe, ra)] = {'bytes': None, 'error': 'cannot encode: ' + e.reason}
                continue
            for ra in READ_AS:
                try:
                    cells['%s|%s|%s' % (t, fe, ra)] = {'bytes': data.hex(' '), 'length': len(data), 'text': data.decode(ra)}
                except UnicodeDecodeError as e:
                    cells['%s|%s|%s' % (t, fe, ra)] = {'bytes': data.hex(' '), 'length': len(data), 'error': 'UnicodeDecodeError: %s at byte %d' % (e.reason, e.start)}
    return {'texts': TEXTS, 'file_encodings': FILE_ENC, 'readers': READ_AS, 'cells': cells}


def supplier_file(cwd):
    (pathlib.Path(cwd) / 'supplier.csv').write_bytes(
        b'\xef\xbb\xbforder_id,customer,note,total\n'
        b'O-1,"Ng, Mei","extra shot",12.50\n'
        b'O-2,Ravi,"leave at door\nring twice",4.75\n'
        b'O-3,Zo\xc3\xab,,31.00\n')


def record(rec, work, cache):
    rec.lesson('m5/read_csv_safely.py', setup=supplier_file)
    for name in ('csv_traps', 'encodings', 'json_lines', 'atomic_write', 'paths', 'parquet_tour', 'parse_log', 'write_partitions'):
        rec.lesson('m5/%s.py' % name)
    rec.counts('m5.encoding', encoding_matrix())

    d = work / 'm5' / 'fmt'
    rc, text, _ = rec.run([rec.py, str(BENCH / 'formats.py'), str(d)], work, timeout=600)
    r = json.loads(text.strip().splitlines()[-1])
    r['note'] = 'bytes of each file, and the median of 5 runs of one DuckDB query over it, on this machine'
    rec.counts('m5.formats', r)
    shutil.rmtree(d, ignore_errors=True)
