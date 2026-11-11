"""Apache Beam pipelines for the Dataflow lessons. They run on Beam's own local runners (pure Python), which use the same model of windows, triggers and watermarks as Dataflow.
The runners are named in the code on purpose: the default "DirectRunner" may fetch and start a separate program (Prism) for some batch pipelines, and these lessons run Python only.

What is real: the Beam SDK, its windowing, its triggers and its panes. What is not: the Dataflow service (autoscaling, Streaming Engine, billing, drain, update).
A TestStream replays events with a watermark that YOU move, so a late event is late on purpose and the result is the same on every run.
"""
import json
import os
import tempfile

import apache_beam as beam
from apache_beam.runners.direct.direct_runner import BundleBasedDirectRunner
from apache_beam.runners.portability.fn_api_runner.fn_runner import FnApiRunner
from apache_beam.options.pipeline_options import PipelineOptions, StandardOptions
from apache_beam.testing.test_stream import TestStream
from apache_beam.transforms.trigger import AccumulationMode, AfterCount, AfterProcessingTime, AfterWatermark
from apache_beam.transforms.window import FixedWindows, Sessions, TimestampedValue

TIMING = {0: 'EARLY', 1: 'ON_TIME', 2: 'LATE'}


class LogPane(beam.DoFn):
    """Write one line per pane (one firing of a window) to a file, so that the result can be read after the pipeline ends."""

    def __init__(self, path):
        self.path = path

    def process(self, kv, window=beam.DoFn.WindowParam, pane=beam.DoFn.PaneInfoParam):
        with open(self.path, 'a') as f:
            f.write(json.dumps({'key': kv[0], 'value': kv[1], 'window': [int(window.start), int(window.end)], 'timing': TIMING.get(int(pane.timing), str(pane.timing)),
                                'index': pane.index}) + '\n')
        yield kv


def _streaming():
    opts = PipelineOptions(['--runner=DirectRunner'])
    opts.view_as(StandardOptions).streaming = True
    return opts


def _read(path):
    return [json.loads(line) for line in open(path)]


def late_data(allowed_lateness, late_trigger, accumulation, early=False):
    """Count sales per store in one minute windows. Four events are on time, one is late by a few seconds, one is late by minutes.

    On time: store s01 at seconds 5, 20 and 55, store s02 at second 30. The watermark then moves to 70, so the first window closes at 60.
    Then an event stamped second 40 arrives (late, but inside the allowed lateness if you gave any), then the watermark moves to 200, then an event stamped second 10 arrives.
    """
    path = os.path.join(tempfile.mkdtemp(prefix='beam-'), 'panes.jsonl')
    open(path, 'w').close()
    stream = TestStream().advance_watermark_to(0)
    stream = stream.add_elements([TimestampedValue(('s01', 1), 5), TimestampedValue(('s01', 1), 20), TimestampedValue(('s02', 1), 30)])
    if early:
        stream = stream.advance_processing_time(30)
    stream = (stream.advance_watermark_to(50).add_elements([TimestampedValue(('s01', 1), 55)]).advance_watermark_to(70)
              .add_elements([TimestampedValue(('s01', 1), 40)]).advance_watermark_to(200).add_elements([TimestampedValue(('s01', 1), 10)]).advance_watermark_to_infinity())
    trigger = AfterWatermark(early=AfterProcessingTime(20) if early else None, late=late_trigger)
    with beam.Pipeline(runner=BundleBasedDirectRunner(), options=_streaming()) as p:
        (p | stream
           | beam.WindowInto(FixedWindows(60), trigger=trigger, accumulation_mode=accumulation, allowed_lateness=allowed_lateness)
           | beam.CombinePerKey(sum)
           | beam.ParDo(LogPane(path)))
    return sorted(_read(path), key=lambda r: (r['window'], r['key'], r['index']))


def sessions(gap):
    """One customer opens the app at seconds 0, 20 and 45, then again at 200 and 215. A session is a run of events with no gap longer than `gap`."""
    path = os.path.join(tempfile.mkdtemp(prefix='beam-'), 'panes.jsonl')
    open(path, 'w').close()
    seconds = [0, 20, 45, 200, 215]
    with beam.Pipeline(runner=FnApiRunner()) as p:
        (p | beam.Create(seconds)
           | beam.Map(lambda t: TimestampedValue(('c0007', 1), t))
           | beam.WindowInto(Sessions(gap))
           | beam.CombinePerKey(sum)
           | beam.ParDo(LogPane(path)))
    return sorted(_read(path), key=lambda r: r['window'])


class ParseLine(beam.DoFn):
    """Parse a JSON line. A line that cannot be parsed goes to a second output instead of failing the whole bundle."""
    DEAD = 'dead'

    def process(self, line):
        try:
            ev = json.loads(line)
            if not isinstance(ev, dict) or 'order_id' not in ev:
                raise ValueError('no order_id')
            yield ev
        except Exception as err:
            yield beam.pvalue.TaggedOutput(self.DEAD, {'line': line, 'error': type(err).__name__ + ': ' + str(err)[:60]})


def dead_letter(lines):
    d = tempfile.mkdtemp(prefix='beam-')
    ok_path, dead_path = os.path.join(d, 'ok.jsonl'), os.path.join(d, 'dead.jsonl')
    with beam.Pipeline(runner=FnApiRunner()) as p:
        res = p | beam.Create(lines) | beam.ParDo(ParseLine()).with_outputs(ParseLine.DEAD, main='ok')
        res.ok | 'OkJson' >> beam.Map(json.dumps) | 'WriteOk' >> beam.io.WriteToText(ok_path, shard_name_template='', num_shards=1)
        res[ParseLine.DEAD] | 'Json' >> beam.Map(json.dumps) | 'WriteDead' >> beam.io.WriteToText(dead_path, shard_name_template='', num_shards=1)
    ok = _read(ok_path) if os.path.exists(ok_path) else []
    dead = _read(dead_path) if os.path.exists(dead_path) else []
    return ok, dead


class KeepFirst(beam.DoFn):
    def process(self, kv, window=beam.DoFn.WindowParam):
        yield kv[1][0]


def dedupe(events, size):
    """Remove events that were delivered twice. The key is the event id; the window is `size` seconds. Duplicates in different windows are not seen as duplicates."""
    d = tempfile.mkdtemp(prefix='beam-')
    out = os.path.join(d, 'out.jsonl')
    with beam.Pipeline(runner=FnApiRunner()) as p:
        (p | beam.Create(events)
           | beam.Map(lambda e: TimestampedValue(e, e['event_ts']))
           | beam.WindowInto(FixedWindows(size))
           | beam.Map(lambda e: (e['event_id'], e))
           | beam.GroupByKey()
           | beam.ParDo(KeepFirst())
           | beam.Map(json.dumps)
           | beam.io.WriteToText(out, shard_name_template='', num_shards=1))
    return _read(out)


DATAFLOW_FLAGS = ['--runner=DataflowRunner', '--project=brewline-dev', '--region=asia-southeast1', '--temp_location=gs://brewline-tmp-dev/tmp',
                  '--staging_location=gs://brewline-tmp-dev/staging', '--service_account_email=sa-pipeline@brewline-dev.iam.gserviceaccount.com',
                  '--subnetwork=regions/asia-southeast1/subnetworks/data', '--no_use_public_ips', '--max_num_workers=10', '--machine_type=n2-standard-2', '--streaming',
                  '--labels=pipeline=orders-stream', '--labels=env=dev']
