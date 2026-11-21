#!/usr/bin/env python3
"""Record what the real Scala toolchain does, for the Scala course.

Everything runs on this machine, in a temporary folder, with made-up Brewline data: the Scala 2.13 compiler and library from the pyspark 4.0.1 package (the version that Spark 4.0.1 is built with),
a Scala 2.12.20 compiler from Maven Central (for the binary-version failure), the JDK (java, jar) and a local Spark 4.0.1 session started by spark-submit. The programs of scala/verify/project are the
programs that run, as they are on disk. Output that varies from run to run (an object hash, a port, a log line) is removed or not printed. Nothing is timed.

Not recorded: sbt, Maven with a Scala plugin, Scala 3, a cluster, Spark Structured Streaming, and a published library on another Scala version than 2.12 and 2.13. The lessons say which is which.
The scalac script was not installed: the recorder starts scala.tools.nsc.Main, the class that the script starts, and the screens write that command as "scalac".

Usage:   python3 scala/verify/capture_scala.py [--out scala/js/real.js]      (run with an interpreter that has pyspark 4.0.1)
Needs:   JDK 21 or later, pyspark==4.0.1, and Maven with the network once (for the Scala 2.12 compiler).
"""
import argparse
import pathlib
import re
import shutil
import sys

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
sys.dont_write_bytecode = True
import scalalib                                      # noqa: E402
from scalalib import R, T, run, scalac, WORK, PROJECT, SCALA_LIB, SCALA_VERSION, SPARK_HOME, JARS, COMPILER_CP, SPARK_CP    # noqa: E402

ap = argparse.ArgumentParser()
ap.add_argument('--out', default=str(HERE.parent / 'js' / 'real.js'))
args = ap.parse_args()

for f in sorted(PROJECT.rglob('*')):
    if f.is_file():
        R['files'][str(f.relative_to(PROJECT))] = f.read_text()

SRC = WORK / 'src'
shutil.copytree(PROJECT, SRC)
LIB = str(SCALA_LIB)


def jrun(cp, cls, *a):
    return run(['java', '-cp', cp, cls] + list(a), cwd=SRC)


def sc(files, out='out', **kw):
    return scalac([SRC / f for f in files], SRC / out, cwd=SRC, **kw)


# ---------------------------------------------------------------------------------------------------------------------------------------------------------------
# 1. the toolchain
# ---------------------------------------------------------------------------------------------------------------------------------------------------------------
_, v = run(['java', '-version'])
_, sv = run(['java', '-cp', COMPILER_CP, 'scala.tools.nsc.Main', '-version'])
import pyspark                                                              # noqa: E402
R['meta'].update({'java_version': re.search(r'version "([^"]+)"', v).group(1), 'java_feature': int(re.search(r'version "(\d+)', v).group(1)), 'scala': SCALA_VERSION, 'spark': pyspark.__version__,
                  'scala_212': '2.12.20', 'vm': v.split('\n')[-1].split(' (')[0], 'recorded_on': __import__('datetime').date.today().isoformat(),
                  'note': 'Recorded by scala/verify/capture_scala.py on the real Scala 2.13 compiler, the JDK and Spark of one machine. sbt, Scala 3 and a cluster were not used.'})
T('tool.versions', 'scalac -version\n' + sv + '\n\njava -version\n' + v + '\n\nspark-submit --version (the Spark of the course)\nSpark ' + pyspark.__version__ + ', built with Scala ' + SCALA_VERSION)

# ---------------------------------------------------------------------------------------------------------------------------------------------------------------
# 2. build: compile, run, a missing library, a jar, and two Scala versions in one program
# ---------------------------------------------------------------------------------------------------------------------------------------------------------------
rc, out = sc(['Hello.scala'])
assert rc == 0 and not out, out
rc_run, hello = jrun('out:' + LIB, 'Hello')
T('build.hello', 'scalac Hello.scala\njava -cp out:scala-library.jar Hello\n' + hello)
R['counts']['build.hello'] = {'compile_exit': rc, 'run_exit': rc_run, 'output': hello, 'prints_scala_version': ('Scala ' + SCALA_VERSION) in hello}
rc_e, err = sc(['BadTypes.scala'], out='bad_out')
T('build.compile_error', 'scalac BadTypes.scala\n' + err)
R['counts']['build.compile_error'] = {'exit_code': rc_e, 'class_file_made': (SRC / 'bad_out' / 'BadTypes.class').exists(), 'says_type_mismatch': 'type mismatch' in err}
rc_n, nolib = jrun('out', 'Hello')
T('build.no_library', 'java -cp out Hello\n' + '\n'.join(nolib.split('\n')[:3]))
R['counts']['build.no_library'] = {'exit': rc_n, 'error': nolib.split('\n')[0].replace('Exception in thread "main" ', '')}
rc_j, jarout = run(['jar', '--create', '--file', 'hello.jar', '--main-class', 'Hello', '-C', 'out', '.'], cwd=SRC)
rc_jj, jj = run(['java', '-jar', 'hello.jar'], cwd=SRC)
rc_jc, jc = jrun('hello.jar:' + LIB, 'Hello')
T('build.jar', 'jar --create --file hello.jar --main-class Hello -C out .\njava -jar hello.jar\n' + '\n'.join(jj.split('\n')[:2]) + '\n\njava -cp hello.jar:scala-library.jar Hello\n' + jc)
R['counts']['build.jar'] = {'jar_exit': rc_j, 'jar_run_exit': rc_jj, 'jar_run_error': jj.split('\n')[0].replace('Exception in thread "main" ', ''), 'with_library_exit': rc_jc, 'with_library_output': jc}

# Scala 2.12 from Maven Central
S212 = WORK / 's212'
S212.mkdir()
for a in ('scala-compiler', 'scala-library', 'scala-reflect'):
    rc_m, om = run(['mvn', '-B', '-ntp', '-q', 'dependency:copy', '-Dartifact=org.scala-lang:%s:2.12.20' % a, '-DoutputDirectory=' + str(S212)], cwd=WORK, timeout=600)
    assert rc_m == 0, om
CC212 = ':'.join(str(S212 / ('%s-2.12.20.jar' % a)) for a in ('scala-compiler', 'scala-library', 'scala-reflect'))
LIB212 = str(S212 / 'scala-library-2.12.20.jar')
rc1, o1 = sc(['Totals.scala'], out='lib213')
rc2, o2 = sc(['UseTotals.scala'], out='app213', cp='lib213')
_, r213 = jrun('app213:lib213:' + LIB, 'UseTotals')
rc3, o3 = sc(['Totals.scala'], out='lib212', compiler=CC212)
rc4, o4 = sc(['UseTotals.scala'], out='app212', cp='lib212', compiler=CC212)
_, r212 = jrun('app212:lib212:' + LIB212, 'UseTotals')
rc5, o5 = sc(['UseTotals.scala'], out='app_mixed', cp='lib212')           # the 2.13 compiler reads the library that 2.12 compiled
rc_mix, mix = jrun('app_mixed:lib212:' + LIB, 'UseTotals')
T('build.binary', '# Totals.scala and UseTotals.scala, both compiled and run with Scala 2.13.16\nscalac Totals.scala UseTotals.scala\njava -cp app:lib:scala-library-2.13.16.jar UseTotals\n' + r213
  + '\n\n# the same two files, both compiled and run with Scala 2.12.20\nscalac Totals.scala UseTotals.scala\njava -cp app:lib:scala-library-2.12.20.jar UseTotals\n' + r212
  + '\n\n# Totals compiled with 2.12.20, UseTotals compiled with 2.13.16 against it, run on the 2.13.16 library\nscalac -cp lib212 UseTotals.scala\njava -cp app:lib212:scala-library-2.13.16.jar UseTotals\n' + '\n'.join(mix.split('\n')[:3]))
R['counts']['build.binary'] = {'both213_output': r213, 'both212_output': r212, 'mixed_compiled': rc5 == 0 and not o5, 'mixed_exit': rc_mix, 'mixed_error': mix.split('\n')[0].replace('Exception in thread "main" ', ''),
                               'all_compiles_clean': rc1 == rc2 == rc3 == rc4 == 0 and not (o1 + o2 + o3 + o4)}

# ---------------------------------------------------------------------------------------------------------------------------------------------------------------
# 3. the language: case classes, a sealed trait and a match
# ---------------------------------------------------------------------------------------------------------------------------------------------------------------
rc, out = sc(['Orders.scala', 'Partial.scala'], out='lang_out')
assert rc == 0, out
_, orders = jrun('lang_out:' + LIB, 'Orders')
T('lang.orders', 'scalac Orders.scala\njava -cp out:scala-library.jar Orders\n' + orders)
T('lang.partial', 'scalac Orders.scala Partial.scala\n' + out + '\n\njava -cp out:scala-library.jar Partial\n' + '\n'.join(jrun('lang_out:' + LIB, 'Partial')[1].split('\n')[:3]))
R['counts']['lang'] = {'orders_lines': len(orders.split('\n')), 'warning': 'match may not be exhaustive' in out, 'missing_input': re.search(r'would fail on the following input: (\w+)', out).group(1),
                       'match_error': re.search(r'scala\.MatchError: (.+)', jrun('lang_out:' + LIB, 'Partial')[1]).group(1), 'exit': jrun('lang_out:' + LIB, 'Partial')[0]}

# ---------------------------------------------------------------------------------------------------------------------------------------------------------------
# 4. collections, and errors as values
# ---------------------------------------------------------------------------------------------------------------------------------------------------------------
rc, out = sc(['Collections.scala', 'Errors.scala', 'Challenge.scala'], out='lib_out')
assert rc == 0 and not out, out
_, coll = jrun('lib_out:' + LIB, 'Collections')
T('coll.collections', 'scalac Collections.scala\njava -cp out:scala-library.jar Collections\n' + coll)
cl = coll.split('\n')
R['counts']['coll'] = {'strict_steps': int(re.search(r'strict: \d+ after (\d+) steps', coll).group(1)), 'lazy_steps': int(re.search(r'view: \d+ after (\d+) steps', coll).group(1)), 'lazy_trace': re.search(r'steps: (.+)', coll).group(1),
                       'duplicate_key_line': cl[3], 'missing_key_line': [l for l in cl if l.startswith('stock(')][0], 'head_line': [l for l in cl if l.startswith('head:')][0], 'total_cents': int(cl[2])}
_, errs = jrun('lib_out:' + LIB, 'Errors')
T('err.errors', 'scalac Errors.scala\njava -cp out:scala-library.jar Errors\n' + errs)
el = errs.split('\n')
R['counts']['err'] = {'lines': len(el), 'good': 2, 'bad': 3, 'cents': 1950, 'summary': el[5], 'none_get': el[6], 'number_format': el[7]}
_, chal = jrun('lib_out:' + LIB, 'Challenge')
T('challenge.run', 'scalac Challenge.scala\njava -cp out:scala-library.jar Challenge\n' + chal)
from decimal import Decimal                                    # noqa: E402
_by = {}
for _s, _a in [(2, '12.50'), (1, '5.00'), (2, '3.25'), (1, '0.99'), (3, '100'), (2, '7.10')]:
    _by[_s] = _by.get(_s, 0) + int(Decimal(_a) * 100)
cll = chal.split('\n')
R['counts']['challenge'] = {'good_output': cll[0], 'expected': 'Right(TreeMap(' + ', '.join('%d -> %d' % (k, _by[k]) for k in sorted(_by)) + '))', 'bad_output': cll[1]}

# ---------------------------------------------------------------------------------------------------------------------------------------------------------------
# 5. Spark: a typed Dataset, a typo, a closure that cannot be sent, a missing encoder
# ---------------------------------------------------------------------------------------------------------------------------------------------------------------
rc, out = sc(['SparkApp.scala'], out='spark_out', spark=True)
assert rc == 0 and not out, out
shutil.copytree(SRC / 'spark_out', WORK / 'spark_jar_src')
rc, o = run(['jar', '--create', '--file', 'app.jar', '-C', str(WORK / 'spark_jar_src'), '.'], cwd=SRC)
assert rc == 0, o
rc_s, spark_out = run([str(SPARK_HOME / 'bin' / 'spark-submit'), '--master', 'local[2]', '--class', 'SparkApp', '--conf', 'spark.ui.enabled=false', 'app.jar'], cwd=SRC, env={'SPARK_HOME': str(SPARK_HOME)}, timeout=600, stdout_only=True)
T('spark.run', 'spark-submit --master local[2] --class SparkApp app.jar\n' + spark_out)
sl = spark_out.split('\n')
R['counts']['spark'] = {'exit': rc_s, 'banner': sl[0], 'orders': 1000, 'placed': 900, 'untyped_error': re.search(r'untyped column typo: (\S+)', spark_out).group(1), 'closure_headline': re.search(r'closure over Settings: (.+)', spark_out).group(1),
                        'cause': re.search(r'cause: (.+)', spark_out).group(1), 'fixed_count': int(re.search(r'copy the number first: (\d+)', spark_out).group(1)), 'by_store': sl[3]}
rc_t, typed = sc(['SparkApp.scala', 'BadTyped.scala'], out='typed_out', spark=True)
rc_t2, typed2 = sc(['BadTyped.scala'], out='typed_out2', spark=True, cp='spark_out')
T('spark.typed_error', 'scalac BadTyped.scala\n' + typed2)
rc_x, enc = sc(['BadEncoder.scala'], out='enc_out', spark=True)
T('spark.encoder_error', 'scalac BadEncoder.scala\n' + enc)
R['counts']['spark.errors'] = {'typed_exit': rc_t2, 'typed_message': re.search(r'error: (.+)', typed2).group(1), 'typed_hint': 'did you mean status?' in typed2, 'encoder_exit': rc_x, 'encoder_message': re.search(r'error: (.+)', enc).group(1)}

scalalib.write_real(args.out)
print('wrote %s: %d files, %d texts, %d tables, %d sets of counts' % (args.out, len(R['files']), len(R['text']), len(R['tables']), len(R['counts'])))
scalalib.cleanup()
