"""A small agent for Brewline store managers, built with LangGraph. The lessons show this file, and the recorder runs it.

The model in this course is a script: a list of replies that the recorder gives it. A real model chooses its own replies, so a real run
differs from the recorded one. What the recording shows is real: how the graph moves, what a tool error looks like, where the loop stops,
what a checkpoint holds, and what happens at a point that needs a person.
"""
import operator
from typing import Annotated, TypedDict

from langgraph.graph import END, START, StateGraph
from langgraph.types import interrupt

WRITE_TOOLS = {'issue_refund'}


class State(TypedDict):
    messages: Annotated[list, operator.add]       # the conversation. New messages are added to it, never replaced.
    steps: int                                    # how many times the model has been asked


class ScriptedModel:
    """Each step is a reply, or a function that reads the messages and returns a reply. A reply is {'tool_calls': [...]} or {'final': text}.
    Like a real model it keeps nothing between calls: the step is chosen from the messages it is given (how many replies it has already made)."""

    def __init__(self, script):
        self.script = list(script)

    def next(self, messages):
        i = sum(1 for m in messages if m['role'] == 'assistant')
        step = self.script[min(i, len(self.script) - 1)]
        return step(messages) if callable(step) else step


def make_graph(model, tools, checkpointer=None, max_steps=8, approve_writes=True, on_tool=None):
    def call_model(state):
        reply = model.next(state['messages'])
        return {'messages': [{'role': 'assistant', **reply}], 'steps': state['steps'] + 1}

    def run_tools(state):
        out = []
        for call in state['messages'][-1]['tool_calls']:
            name, args = call['name'], call['args']
            if name not in tools:
                out.append({'role': 'tool', 'name': name, 'ok': False, 'content': 'unknown tool %s' % name})
                continue
            if approve_writes and name in WRITE_TOOLS:
                decision = interrupt({'tool': name, 'args': args, 'question': 'Approve this write?'})
                if decision != 'approve':
                    out.append({'role': 'tool', 'name': name, 'ok': False, 'content': 'the approver said no'})
                    continue
            try:
                if on_tool:
                    on_tool(name, args)                              # lets the recorder count how often a tool really runs
                out.append({'role': 'tool', 'name': name, 'ok': True, 'content': tools[name](**args)})
            except Exception as e:                                   # the error goes back to the model as a message, so that it can try again
                out.append({'role': 'tool', 'name': name, 'ok': False, 'content': str(e)})
        return {'messages': out}

    def give_up(state):
        return {'messages': [{'role': 'assistant', 'final': 'I stopped after %d steps without an answer.' % state['steps']}]}

    def route(state):
        last = state['messages'][-1]
        if 'final' in last:
            return END
        return 'give_up' if state['steps'] >= max_steps else 'tools'

    g = StateGraph(State)
    g.add_node('model', call_model)
    g.add_node('tools', run_tools)
    g.add_node('give_up', give_up)
    g.add_edge(START, 'model')
    g.add_conditional_edges('model', route, ['tools', 'give_up', END])
    g.add_edge('tools', 'model')
    g.add_edge('give_up', END)
    return g.compile(checkpointer=checkpointer)
