#!/usr/bin/env python3
"""Record what the real Java toolchain does, for the Java course.

Everything runs on this machine, in a temporary folder, with made-up Brewline data: the JDK (javac, java, javap, jar), Maven with the JUnit and Maven Shade plugins, the H2 database
through JDBC, and the libraries commons-csv, commons-io and commons-lang3. The programs of java/verify/project are the programs that run, as they are on disk. Output that varies from run to
run (a race, a path) is reduced to what must be the same. Nothing is timed.

Not recorded: Spark, Kafka, Flink and Hadoop (they have courses of their own), a real database server through JDBC (H2 runs inside the process), connection pools, other JDKs than the one
installed, other garbage collectors, and a build with Gradle. The lessons say which is which.

Usage:   python3 java/verify/capture_java.py [--out java/js/real.js]
Needs:   JDK 21 or later (javac, java, javap, jar) and Maven 3.9, with the network for the first run (Maven Central).
"""
import argparse
import pathlib
import re
import shutil
import sys

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
sys.dont_write_bytecode = True
import javalib                                      # noqa: E402
from javalib import R, T, table, run, mvn, grep, tree_of, WORK, PROJECT     # noqa: E402

ap = argparse.ArgumentParser()
ap.add_argument('--out', default=str(HERE.parent / 'js' / 'real.js'))
args = ap.parse_args()

for f in sorted(PROJECT.rglob('*')):
    if f.is_file():
        R['files'][str(f.relative_to(PROJECT))] = f.read_text()

SRC = WORK / 'src'
shutil.copytree(PROJECT, SRC, ignore=shutil.ignore_patterns('target'))
LIBS = WORK / 'libs'
LIBS.mkdir()


def jv(name, *a, cp=None, opts=(), check=True):
    """Run a single-file program with the source launcher: java File.java args."""
    cmd = ['java'] + list(opts) + (['-cp', cp] if cp else []) + [name + '.java'] + list(a)
    return run(cmd, cwd=SRC, check=check)[1]


# ---------------------------------------------------------------------------------------------------------------------------------------------------------------
# 1. the toolchain
# ---------------------------------------------------------------------------------------------------------------------------------------------------------------
_, v = run(['java', '-version'])
_, vc = run(['javac', '-version'])
_, vm = run(['mvn', '-v'])
R['meta'].update({'java_version': re.search(r'version "([^"]+)"', v).group(1), 'java_feature': int(re.search(r'version "(\d+)', v).group(1)), 'javac': vc.split()[-1], 'maven': re.search(r'Apache Maven ([\d.]+)', vm).group(1),
                  'vm': v.split('\n')[-1].split(' (')[0], 'recorded_on': __import__('datetime').date.today().isoformat(),
                  'note': 'Recorded by java/verify/capture_java.py on the real JDK and Maven of one machine. Spark, Kafka and a database server were not used.'})
T('tool.versions', 'java -version\n' + v + '\n\njavac -version\n' + vc + '\n\nmvn -v\n' + '\n'.join(vm.split('\n')[:3]))
_, flags = run(['java', '-XX:+PrintFlagsFinal', '-version'])
R['counts']['tool.gc'] = {'g1_is_default': bool(re.search(r'bool UseG1GC\s+=\s+true', flags)), 'max_heap_mb': int(re.search(r'size_t MaxHeapSize\s+=\s+(\d+)', flags).group(1)) // 1048576}

# ---------------------------------------------------------------------------------------------------------------------------------------------------------------
# 2. from source to a running program
# ---------------------------------------------------------------------------------------------------------------------------------------------------------------
T('build.source_launcher', 'java Hello.java Brewline\n' + jv('Hello', 'Brewline'))
run(['javac', 'Hello.java', 'Adder.java'], cwd=SRC, check=True)
classes = sorted(p.name for p in SRC.glob('*.class'))
T('build.javac_run', 'javac Hello.java Adder.java\nls *.class\n' + '\n'.join(classes) + '\njava Hello\n' + run(['java', 'Hello'], cwd=SRC)[1])
rc, out = run(['javac', 'BadTypes.java'], cwd=SRC)
T('build.compile_error', 'javac BadTypes.java\n' + out)
R['counts']['build.compile_error'] = {'exit_code': rc, 'class_file_made': (SRC / 'BadTypes.class').exists()}
_, jp = run(['javap', '-c', 'Adder'], cwd=SRC, check=True)
T('build.javap', 'javap -c Adder\n' + jp)
R['counts']['build.javap'] = {'has_iadd': 'iadd' in jp, 'has_ireturn': 'ireturn' in jp}
run(['jar', '--create', '--file', 'app.jar', '--main-class', 'Hello', 'Hello.class'], cwd=SRC, check=True)
_, jtf = run(['jar', '--list', '--file', 'app.jar'], cwd=SRC)
T('build.jar', 'jar --create --file app.jar --main-class Hello Hello.class\njar --list --file app.jar\n' + jtf + '\njava -jar app.jar\n' + run(['java', '-jar', 'app.jar'], cwd=SRC)[1])
# a library on the classpath, and what happens without it
mvn(['dependency:copy', '-Dartifact=org.apache.commons:commons-lang3:3.14.0', '-DoutputDirectory=' + str(LIBS)], cwd=WORK)
mvn(['dependency:copy', '-Dartifact=com.h2database:h2:2.3.232', '-DoutputDirectory=' + str(LIBS)], cwd=WORK)
lang = LIBS / 'commons-lang3-3.14.0.jar'
h2 = LIBS / 'h2-2.3.232.jar'
run(['javac', '-cp', str(lang), 'UsesLib.java'], cwd=SRC, check=True)
rc1, o1 = run(['java', '-cp', '.', 'UsesLib'], cwd=SRC)
rc2, o2 = run(['java', '-cp', '.:' + str(lang), 'UsesLib'], cwd=SRC)
T('build.classpath', 'javac -cp libs/commons-lang3-3.14.0.jar UsesLib.java\njava -cp . UsesLib\n' + '\n'.join(o1.split('\n')[:3]) + '\njava -cp .:libs/commons-lang3-3.14.0.jar UsesLib\n' + o2)
R['counts']['build.classpath'] = {'without_exit': rc1, 'with_exit': rc2, 'error_names_the_class': 'org/apache/commons/lang3/StringUtils' in o1, 'with_output': o2}

# ---------------------------------------------------------------------------------------------------------------------------------------------------------------
# 3. Maven: a build, its tests, its tree, a conflict and a jar that runs alone
# ---------------------------------------------------------------------------------------------------------------------------------------------------------------
orders = SRC / 'orders.csv'
cents_total = 0
with open(orders, 'w') as f:
    f.write('order_id,store_id,customer_id,order_ts,status,amount\n')
    for i in range(1, 51):
        c = (5 + (i * 17) % 80) * 100 + (i * 5) % 100
        cents_total += c
        f.write('O-%d,%d,C-%03d,2026-03-14 %02d:00:00,PLACED,%d.%02d\n' % (i, 1 + (i * 7) % 12, 1 + (i * 13) % 400, i % 24, c // 100, c % 100))
MV = SRC / 'maven'
rc, out = mvn(['package'], cwd=MV)
lines = grep(out, r'--- .* @ loader ---|Tests run:|Building jar|Replacing|BUILD|ERROR')
lines = re.sub(r'\bTime elapsed: [\d.]+ s( -- in)?', 'Time elapsed: <time> --', lines)
lines = re.sub(r'Tests run: (\d+), Failures: (\d+), Errors: (\d+), Skipped: (\d+), Time elapsed: <time> -- ', r'Tests run: \1, Failures: \2, Errors: \3, Skipped: \4 -- ', lines)
T('maven.package', 'mvn package\n' + lines)
R['counts']['maven.package'] = {'exit': rc, 'tests_run': int(re.search(r'Tests run: (\d+), Failures: 0, Errors: 0, Skipped: 0\n', out + '\n').group(1)), 'build_success': 'BUILD SUCCESS' in out,
                                'shaded': 'Replacing' in out, 'original_jar_kept': (MV / 'target' / 'original-loader-1.0.jar').exists(), 'jar_made': (MV / 'target' / 'loader-1.0.jar').exists()}
_, tree = mvn(['dependency:tree'], cwd=MV)
tl = tree_of(tree)
T('maven.tree', 'mvn dependency:tree\n' + '\n'.join(tl))
R['counts']['maven.tree'] = {'direct': len([l for l in tl if l.startswith('+- ') or l.startswith('\\- ')]), 'lines': len(tl), 'has_junit_test_scope': any('junit-jupiter' in l and ':test' in l for l in tl)}
rc_f, out_f = run(['java', '-jar', 'target/loader-1.0.jar', str(orders)], cwd=MV)
rc_t, out_t = run(['java', '-jar', 'target/original-loader-1.0.jar', str(orders)], cwd=MV)
T('maven.run_shaded', 'java -jar target/loader-1.0.jar orders.csv\n' + out_f + '\n\njava -jar target/original-loader-1.0.jar orders.csv\n' + '\n'.join(out_t.split('\n')[:3]))
R['counts']['maven.run'] = {'shaded_exit': rc_f, 'shaded_output': out_f, 'expected_output': '50 orders, %d cents' % cents_total, 'thin_exit': rc_t, 'thin_error': out_t.split('\n')[0],
                            'shaded_bigger_than_thin': (MV / 'target' / 'loader-1.0.jar').stat().st_size > 20 * (MV / 'target' / 'original-loader-1.0.jar').stat().st_size, 'cents_expected': cents_total}
rc_c, out_c = run(['java', '-cp', 'target/original-loader-1.0.jar', 'brewline.Loader', str(orders)], cwd=MV)
T('maven.run_thin', 'java -cp target/original-loader-1.0.jar brewline.Loader orders.csv\n' + '\n'.join(out_c.split('\n')[:3]))
R['counts']['maven.run']['thin_cp_exit'] = rc_c
R['counts']['maven.run']['thin_cp_error'] = out_c.split('\n')[0]
# a failing test
tp = MV / 'src' / 'test' / 'java' / 'brewline' / 'LoaderTest.java'
tp.write_text(tp.read_text().replace('assertEquals(1250,', 'assertEquals(1251,'))
rc, out = mvn(['test'], cwd=MV)
fl = grep(out, r'Tests run:.*Fail|expected:|FAIL|BUILD')
fl = re.sub(r'Time elapsed: [\d.]+ s', 'Time elapsed: <time>', fl)
T('maven.failing_test', 'mvn test   # the test now expects 1251 cents\n' + '\n'.join(l for l in fl.split('\n') if 'Tests run:' in l and 'LoaderTest' not in l or 'expected:' in l or 'BUILD' in l))
R['counts']['maven.failing_test'] = {'exit': rc, 'build_failure': 'BUILD FAILURE' in out, 'message_has_expected': 'expected: <1251> but was: <1250>' in out}
tp.write_text(tp.read_text().replace('assertEquals(1251,', 'assertEquals(1250,'))
# a dependency conflict
CF = SRC / 'maven-conflict'
_, tv = mvn(['dependency:tree', '-Dverbose'], cwd=CF)
tvl = tree_of(tv)
T('maven.conflict_tree', 'mvn dependency:tree -Dverbose\n' + '\n'.join(tvl))
mvn(['compile'], cwd=CF, timeout=300)
mvn(['dependency:build-classpath', '-Dmdep.outputFile=cp.txt'], cwd=CF)
cp = (CF / 'cp.txt').read_text().strip()
rc, out = run(['java', '-cp', 'target/classes:' + cp, 'demo.Main'], cwd=CF)
T('maven.conflict_run', 'java -cp target/classes:<the classpath of Maven> demo.Main\n' + '\n'.join(out.split('\n')[:4]))
R['counts']['maven.conflict'] = {'exit': rc, 'error': out.split('\n')[0], 'omitted_for_conflict_lines': len([l for l in tvl if 'omitted for conflict' in l]), 'chosen_io_version': '2.4', 'wanted_io_version': (re.search(r'commons-io:commons-io:jar:([\d.]+):compile - omitted for conflict', tv + ' ') or re.search(r'commons-io:jar:([\d.]+)', tv)).group(1)}
mvn(['dependency:tree'], cwd=CF)
fixed = (CF / 'pom.xml').read_text().replace('<version>2.4</version>', '<version>2.16.1</version>')
(CF / 'pom.xml').write_text(fixed)
mvn(['compile', 'dependency:build-classpath', '-Dmdep.outputFile=cp.txt'], cwd=CF)
rc, out = run(['java', '-cp', 'target/classes:' + (CF / 'cp.txt').read_text().strip(), 'demo.Main'], cwd=CF)
R['counts']['maven.conflict_fixed'] = {'exit': rc, 'output': out}

# ---------------------------------------------------------------------------------------------------------------------------------------------------------------
# 4. the language, streams, numbers and time
# ---------------------------------------------------------------------------------------------------------------------------------------------------------------
T('lang.orders', 'java Orders.java\n' + jv('Orders'))
T('lang.streams', 'java Streams.java\n' + jv('Streams'))
T('num.numbers', 'java Numbers.java\n' + jv('Numbers'))
T('num.times', 'java Times.java\n' + jv('Times'))
nm = R['text']['num.numbers'].split('\n')
R['counts']['num.sums'] = {'first': nm[1], 'double_sum': re.search(r'double sum:\s+(\S+)', R['text']['num.numbers']).group(1), 'bigdecimal_sum': re.search(r'BigDecimal sum: (\S+)', R['text']['num.numbers']).group(1), 'iterations': 1000000}
R['counts']['lang'] = {'orders_lines': len(R['text']['lang.orders'].split('\n')) - 1, 'streams_lines': len(R['text']['lang.streams'].split('\n')) - 1}

# ---------------------------------------------------------------------------------------------------------------------------------------------------------------
# 5. files and memory: a file of a million lines against a heap of 64 MB
# ---------------------------------------------------------------------------------------------------------------------------------------------------------------
big = WORK / 'orders_1m.csv'
total = 0
with open(big, 'w') as f:
    f.write('order_id,store_id,customer_id,order_ts,status,amount\n')
    for i in range(1, 1_000_001):
        c = (5 + (i * 17) % 80) * 100 + (i * 5) % 100
        total += c
        f.write('O-%07d,%d,C-%03d,2026-03-%02d %02d:%02d:00,%s,%d.%02d\n' % (i, 1 + (i * 7) % 12, 1 + (i * 13) % 400, 1 + i % 28, i % 24, (i * 11) % 60, 'REFUNDED' if i % 25 == 0 else 'PLACED', c // 100, c % 100))
size_mb = round(big.stat().st_size / 1048576, 1)
MEM = {}
for label, mode, heap in [('all_64', 'all', '64m'), ('stream_64', 'stream', '64m'), ('sum_32', 'sum', '32m'), ('all_2g', 'all', '2g')]:
    rc, out = run(['java', '-Xmx' + heap, 'Memory.java', mode, str(big)], cwd=SRC, timeout=600)
    MEM[label] = (rc, out)
T('mem.oom', 'java -Xmx64m Memory.java all orders_1m.csv\n' + '\n'.join(l for l in MEM['all_64'][1].split('\n')[:3]))
T('mem.stream', 'java -Xmx64m Memory.java stream orders_1m.csv\n' + MEM['stream_64'][1] + '\n\njava -Xmx32m Memory.java sum orders_1m.csv\n' + MEM['sum_32'][1] + '\n\njava -Xmx2g Memory.java all orders_1m.csv\n' + MEM['all_2g'][1])
R['counts']['mem'] = {'file_mb': size_mb, 'lines': 1_000_001, 'oom_exit': MEM['all_64'][0], 'oom_message': [l for l in MEM['all_64'][1].split('\n') if 'OutOfMemoryError' in l][0].replace('Exception in thread "main" ', ''), 'stream_exit': MEM['stream_64'][0],
                      'stream_output': MEM['stream_64'][1].split('\n')[-1], 'sum_exit': MEM['sum_32'][0], 'sum_output': MEM['sum_32'][1].split('\n')[-1], 'sum_expected': '1000000 rows, %d cents' % total, 'all_2g_output': MEM['all_2g'][1].split('\n')[-1],
                      'max_heap_64': MEM['all_64'][1].split('\n')[0], 'max_heap_32': MEM['sum_32'][1].split('\n')[0]}
big.unlink()

# ---------------------------------------------------------------------------------------------------------------------------------------------------------------
# 6. JDBC on H2, tests are in section 3, concurrency, serialization
# ---------------------------------------------------------------------------------------------------------------------------------------------------------------
T('jdbc.run', 'java -cp libs/h2-2.3.232.jar Jdbc.java\n' + jv('Jdbc', cp=str(h2)))
outs = [jv('Race') for _ in range(3)]
T('conc.race', 'java Race.java\n' + outs[0])
R['counts']['conc'] = {'runs': 3, 'plain_short_in_runs': [('plain int short' in o) for o in outs], 'atomic_exact_in_runs': [('AtomicInteger 800000' in o) for o in outs], 'pool_sum': int(re.search(r'pool of 4: (\d+)', outs[0]).group(1)),
                       'virtual_finished': int(re.search(r'finished: (\d+)', outs[0]).group(1)), 'is_virtual': 'is virtual: true' in outs[0], 'cpus': __import__('os').cpu_count()}
T('conc.ser', 'java Ser.java\n' + jv('Ser'))

# ---------------------------------------------------------------------------------------------------------------------------------------------------------------
# 7. the coding round of the boss mission: cents by store from a stream of lines
# ---------------------------------------------------------------------------------------------------------------------------------------------------------------
T('challenge.run', 'java Challenge.java\n' + jv('Challenge'))
from decimal import Decimal                                    # noqa: E402
_sample = [('2', '12.50'), ('1', '5.00'), ('2', '3.25'), ('1', '0.99'), ('3', '100'), ('2', '7.10')]
_by = {}
for _s, _a in _sample:
    _by[int(_s)] = _by.get(int(_s), 0) + int(Decimal(_a) * 100)
_ch = R['text']['challenge.run'].split('\n')
R['counts']['challenge'] = {'output': _ch[1], 'expected': '{' + ', '.join('%d=%d' % (k, _by[k]) for k in sorted(_by)) + '}', 'refused': _ch[2], 'stores': len(_by)}

javalib.write_real(args.out)
print('wrote %s: %d files, %d texts, %d tables, %d sets of counts' % (args.out, len(R['files']), len(R['text']), len(R['tables']), len(R['counts'])))
javalib.cleanup()
