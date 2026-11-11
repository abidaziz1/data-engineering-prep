"""Tests for the Brewline agent. The model is a script, so the loop, the limit and the approval are tested the same way every time.
The lessons show this file, and the recorder runs it with pytest, on the real agent and on two broken copies of it."""
import os

from langgraph.checkpoint.memory import InMemorySaver
from langgraph.types import Command

import agent_graph as ag

START = {'messages': [{'role': 'user', 'content': 'How long do customers have to return beans, and how many orders are completed?'}], 'steps': 0}
BREAK = os.environ.get('AGENT_BREAK')            # a switch for the lesson: it breaks the agent on purpose, to prove that a test can fail


def make_tools():
    calls = []

    def search_policies(query):
        calls.append('search_policies')
        return 'A customer may return a sealed bag of beans within 14 days of purchase.'

    def orders_by_status(status):
        if status not in ('COMPLETED', 'CANCELLED', 'PENDING'):
            raise ValueError("unknown status '%s'. allowed: COMPLETED, CANCELLED, PENDING" % status)
        calls.append('orders_by_status')
        return 120

    def issue_refund(order_id, amount):
        calls.append('issue_refund')
        return 'refunded %.2f on %s' % (amount, order_id)
    return {'search_policies': search_policies, 'orders_by_status': orders_by_status, 'issue_refund': issue_refund}, calls


def call(name, **args):
    return {'tool_calls': [{'name': name, 'args': args}]}


def last_tool(messages):
    return [m for m in messages if m['role'] == 'tool'][-1]


def graph(script, tools, **kw):
    if BREAK == 'no_limit':
        kw['max_steps'] = 10000
    if BREAK == 'no_approval':
        kw['approve_writes'] = False
    return ag.make_graph(ag.ScriptedModel(script), tools, **kw)


def test_two_tools_then_an_answer():
    tools, calls = make_tools()
    script = [call('search_policies', query='return beans'), call('orders_by_status', status='COMPLETED'), lambda m: {'final': '14 days, %s orders' % last_tool(m)['content']}]
    out = graph(script, tools).invoke(START)
    assert calls == ['search_policies', 'orders_by_status']
    assert out['steps'] == 3
    assert out['messages'][-1]['final'].startswith('14 days')


def test_a_wrong_argument_comes_back_as_a_message_and_is_fixed():
    tools, calls = make_tools()
    script = [call('orders_by_status', status='done'), call('orders_by_status', status='COMPLETED'), {'final': 'ok'}]
    out = graph(script, tools).invoke(START)
    assert out['messages'][2]['ok'] is False and 'allowed: COMPLETED' in out['messages'][2]['content']
    assert calls == ['orders_by_status']


def test_a_loop_stops_at_the_step_limit():
    tools, calls = make_tools()
    out = graph([call('search_policies', query='refund')], tools, max_steps=6).invoke(START, {'recursion_limit': 40})
    assert out['steps'] <= 6
    assert out['messages'][-1]['final'].startswith('I stopped after')


def test_a_write_waits_for_a_person():
    tools, calls = make_tools()
    g = graph([call('issue_refund', order_id='ORD-1', amount=12.5), {'final': 'ok'}], tools, checkpointer=InMemorySaver())
    cfg = {'configurable': {'thread_id': 't'}}
    g.invoke(START, cfg)
    assert 'issue_refund' not in calls                  # nothing was written while the run waited
    g.invoke(Command(resume='approve'), cfg)
    assert calls.count('issue_refund') == 1
