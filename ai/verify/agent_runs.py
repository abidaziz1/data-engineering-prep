"""How the lessons run the agent graph: to a pause, resume it after a decision, look at its checkpoints, replay from one.
The lessons show this file, and the recorder runs these functions. The graph is in agent_graph.py, and its model is a script.
"""
from langgraph.types import Command


def thread(name):
    """A thread is one conversation. The checkpointer keeps the state of each thread under its id."""
    return {'configurable': {'thread_id': name}}


def run(graph, first, config):
    """Run until the graph ends or pauses. first is the starting state, or a Command that resumes a paused run. Returns what each node did."""
    return list(graph.stream(first, config, stream_mode='updates'))


def paused(graph, config):
    """What a paused run waits for: the next node, and the questions that it asks a person."""
    snap = graph.get_state(config)
    return list(snap.next), [i.value for t in snap.tasks for i in t.interrupts]


def decide(graph, config, decision):
    """Resume a paused run with the answer of a person. The tool node starts again from its first line, and gets the decision from interrupt()."""
    return run(graph, Command(resume=decision), config)


def checkpoints(graph, config):
    """Every checkpoint of a thread, oldest first. Each one holds the state and the node that runs next."""
    return list(graph.get_state_history(config))[::-1]


def replay_from(graph, checkpoint):
    """Run again from a checkpoint. Every node after it runs again, tools included."""
    return graph.invoke(None, checkpoint.config)
