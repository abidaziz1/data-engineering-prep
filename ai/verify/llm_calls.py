"""The model API calls of the course, as small functions. The lessons show this file, and the recorder runs it.

The recorder points the real Anthropic and OpenAI client libraries at a local server that speaks the same protocol as the services.
No provider was called, and no language model was used. What the recording proves is what the libraries send, what they do when the
server fails, and how a tool call and a checked answer travel. It proves nothing about what a real model would say.
"""
import pydantic

MODEL = 'stand-in'


def ask_anthropic(client, text, **options):
    """One question, one answer. options go to with_options: timeout, max_retries."""
    c = client.with_options(**options) if options else client
    return c.messages.create(model=MODEL, max_tokens=20, messages=[{'role': 'user', 'content': text}])


def ask_openai(client, text, **options):
    c = client.with_options(**options) if options else client
    return c.chat.completions.create(model=MODEL, messages=[{'role': 'user', 'content': text}])


def stream_anthropic(client, text):
    """Stream the answer. The events arrive one by one, and the final message holds the usage."""
    events = []
    with client.messages.stream(model=MODEL, max_tokens=50, messages=[{'role': 'user', 'content': text}]) as stream:
        for event in stream:
            events.append(event.type)
        final = stream.get_final_message()
    return events, final


def stream_openai(client, text):
    return list(client.chat.completions.create(model=MODEL, messages=[{'role': 'user', 'content': text}], stream=True))


TOOLS = [{'name': 'search_policies', 'description': 'Find Brewline policy sentences.',
          'input_schema': {'type': 'object', 'properties': {'query': {'type': 'string'}, 'limit': {'type': 'integer'}}, 'required': ['query']}}]


def answer_with_tool(client, question, run_tool):
    """Two calls. The first returns a request to call a tool. The code runs the tool, and sends the result back in a second call."""
    first = client.messages.create(model=MODEL, max_tokens=100, messages=[{'role': 'user', 'content': question}], tools=TOOLS)
    block = next(b for b in first.content if b.type == 'tool_use')
    result = run_tool(block.name, **block.input)
    second = client.messages.create(model=MODEL, max_tokens=100, tools=TOOLS, messages=[
        {'role': 'user', 'content': question},
        {'role': 'assistant', 'content': [block.model_dump()]},
        {'role': 'user', 'content': [{'type': 'tool_result', 'tool_use_id': block.id, 'content': result}]}])
    return first, block, second


class RefundDecision(pydantic.BaseModel):
    order_id: str
    approve: bool
    reason: str = pydantic.Field(max_length=120)


def check_decision(raw):
    """Check the text of a model's answer against the schema. Returns the object, or the reasons that it was refused."""
    try:
        return RefundDecision.model_validate_json(raw), ''
    except pydantic.ValidationError as e:
        return None, ' | '.join('%s: %s' % ('.'.join(str(x) for x in err['loc']) or 'the text', err['msg']) for err in e.errors())
