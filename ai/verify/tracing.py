"""Traces for the agent of the course, made with the OpenTelemetry SDK. The lessons show this file, and the recorder runs it.

One span covers the whole run. Under it sit one span for each model call and one for each tool call. The names of the attributes follow the
OpenTelemetry conventions for generative AI, which are still in development, so your tools may use older or newer names.
No model ran, so the token counts are estimated from the length of the messages: one token for four characters.
"""
import json

from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import SimpleSpanProcessor
from opentelemetry.sdk.trace.export.in_memory_span_exporter import InMemorySpanExporter
from opentelemetry.trace import Status, StatusCode


def setup():
    """An exporter that keeps the spans in memory, so that the lessons can read them. A real service exports them to a collector."""
    exporter = InMemorySpanExporter()
    provider = TracerProvider()
    provider.add_span_processor(SimpleSpanProcessor(exporter))
    return provider.get_tracer('brewline-agent'), exporter


class TracedModel:
    """Wraps a model. One span for each call, with the model name and the number of tokens that went in and out."""

    def __init__(self, model, tracer, name='stand-in-model'):
        self.model, self.tracer, self.name = model, tracer, name

    def next(self, messages):
        with self.tracer.start_as_current_span('chat ' + self.name, kind=trace.SpanKind.CLIENT) as span:
            chars = sum(len(json.dumps(m, default=str)) for m in messages)
            reply = self.model.next(messages)
            span.set_attribute('gen_ai.operation.name', 'chat')
            span.set_attribute('gen_ai.request.model', self.name)
            span.set_attribute('gen_ai.usage.input_tokens', chars // 4)
            span.set_attribute('gen_ai.usage.output_tokens', len(json.dumps(reply, default=str)) // 4)
            return reply


def traced(tracer, name, fn):
    """Wraps a tool. One span for each call. If the tool raises, the span gets an error status and the exception, and the error still goes on."""
    def wrapper(**kwargs):
        with tracer.start_as_current_span('execute_tool ' + name) as span:
            span.set_attribute('gen_ai.operation.name', 'execute_tool')
            span.set_attribute('gen_ai.tool.name', name)
            try:
                return fn(**kwargs)
            except Exception as e:
                span.record_exception(e)
                span.set_status(Status(StatusCode.ERROR, str(e)))
                raise
    return wrapper


def run_agent(graph, tracer, state, name='brewline-assistant'):
    """The root span of one run. Every span of the run is its child."""
    with tracer.start_as_current_span('invoke_agent ' + name) as root:
        root.set_attribute('gen_ai.operation.name', 'invoke_agent')
        root.set_attribute('gen_ai.agent.name', name)
        return graph.invoke(state)
