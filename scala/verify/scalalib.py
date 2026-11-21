"""Helpers of the recorder for the Scala course: run the real Scala 2.13 compiler (the class that the scalac script starts), a Scala 2.12 compiler from Maven Central, the JDK and Spark 4.0.1
in a temporary folder, clean what they print of the volatile parts, and write js/real.js.
The Scala compiler, the Scala library and Spark come from the jars that the pyspark package ships (pip install pyspark==4.0.1): Spark 4.0.1 is built with Scala 2.13.16, so that is the version to teach.
Everything the recorder makes lives in one temporary folder that is removed at the end. No setting of the machine is read or changed (Maven uses its local repository, ~/.m2, as it always does)."""
import json
import os
import pathlib
import re
import shutil
import subprocess
import tempfile

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent
PROJECT = HERE / 'project'
R = {'meta': {}, 'files': {}, 'text': {}, 'tables': {}, 'counts': {}}
WORK = pathlib.Path(tempfile.mkdtemp(prefix='scala-capture-'))
M2 = str(pathlib.Path.home() / '.m2')

try:
    import pyspark
except ImportError:
    raise SystemExit('The Scala course records with the jars of pyspark 4.0.1: python3 -m venv scala-env && scala-env/bin/pip install pyspark==4.0.1, then run this script with scala-env/bin/python.')
SPARK_HOME = pathlib.Path(pyspark.__file__).resolve().parent
JARS = SPARK_HOME / 'jars'


def _one(pattern):
    found = sorted(JARS.glob(pattern))
    if not found:
        raise SystemExit('no %s in %s' % (pattern, JARS))
    return found[0]


SCALA_LIB = _one('scala-library-2.13.*.jar')
SCALA_COMPILER = _one('scala-compiler-2.13.*.jar')
SCALA_REFLECT = _one('scala-reflect-2.13.*.jar')
SCALA_VERSION = re.search(r'scala-library-(\d+\.\d+\.\d+)\.jar', SCALA_LIB.name).group(1)
COMPILER_CP = ':'.join(str(p) for p in (SCALA_COMPILER, SCALA_LIB, SCALA_REFLECT))
SPARK_CP = ':'.join(str(p) for p in sorted(JARS.glob('*.jar')))


def mask(s):
    s = '\n'.join(l for l in str(s).split('\n') if not l.startswith('Picked up JAVA_TOOL_OPTIONS'))
    s = s.replace(str(WORK), '~').replace(M2, '~/.m2').replace(str(JARS), '$SPARK_HOME/jars').replace(str(SPARK_HOME), '$SPARK_HOME')
    s = re.sub(r'/tmp/scala-capture-\w+', '~', s)
    return '\n'.join(l.rstrip() for l in s.split('\n'))


def T(key, s):
    R['text'][key] = mask(s).strip('\n')
    return R['text'][key]


def table(cols, rows):
    return {'cols': cols, 'rows': rows}


def run(cmd, cwd=None, timeout=300, env=None, check=False, stdout_only=False):
    """The exit code and the output (standard output and error together, in order) of a command, with the volatile parts removed."""
    e = dict(os.environ)
    if env:
        e.update(env)
    p = subprocess.run([str(c) for c in cmd], cwd=str(cwd or WORK), capture_output=True, text=True, timeout=timeout, env=e)
    if stdout_only:
        out = mask(p.stdout.rstrip('\n'))
    else:
        out = mask(p.stdout.rstrip('\n') + (('\n' if p.stdout.strip() and p.stderr.strip() else '') + p.stderr.rstrip('\n') if p.stderr.strip() else ''))
    if check and p.returncode:
        raise RuntimeError('%s failed (%d): %s' % (' '.join(map(str, cmd)), p.returncode, out[-800:]))
    return p.returncode, out.strip('\n')


def scalac(files, out, cwd, cp=None, spark=False, compiler=None, extra=()):
    """Compile with the Scala compiler: the class that the scalac script starts. compiler is (compiler classpath, library) for another Scala version."""
    ccp = compiler or COMPILER_CP
    lib = [] if compiler else []
    cpp = [x for x in [cp, SPARK_CP if spark else None] if x]
    cmd = ['java', '-Xss4m', '-cp', ccp, 'scala.tools.nsc.Main', '-usejavacp'] + (['-cp', ':'.join(cpp)] if cpp else []) + list(extra) + ['-d', str(out)] + [str(f) for f in files]
    pathlib.Path(out).mkdir(parents=True, exist_ok=True)
    return run(cmd, cwd=cwd)


def write_real(path):
    path = pathlib.Path(path)
    path.write_text('window.LAB = window.LAB || {};\nLAB.real = ' + json.dumps(R, indent=1, sort_keys=True, ensure_ascii=False, default=str) + ';\n')
    return path


def cleanup():
    shutil.rmtree(WORK, ignore_errors=True)
