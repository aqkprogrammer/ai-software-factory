"""The agent runtime: one loop, one model call at a time, tools executed locally.

Every tool call now emits an event before it runs and a status change after it
returns. That emit is the only reason the office screen can show anything real.
"""
from __future__ import annotations

import json
import os
import re
import time
from dataclasses import dataclass, field

from . import tools
from .events import activity, agent_update, describe_tool
from .llm import client, MODEL as DEFAULT_MODEL

# Non-streaming ceiling. High enough that a coder turn with thinking on does not
# get cut mid-edit, low enough to stay under the SDK's HTTP timeout.
MAX_TOKENS = 16000


@dataclass
class Usage:
    input_tokens: int = 0
    output_tokens: int = 0
    turns: int = 0
    seconds: float = 0.0

    def add(self, resp):
        self.input_tokens += resp.usage.input_tokens
        self.output_tokens += resp.usage.output_tokens
        self.turns += 1

    def merge(self, other: "Usage"):
        self.input_tokens += other.input_tokens
        self.output_tokens += other.output_tokens
        self.turns += other.turns
        self.seconds += other.seconds


@dataclass
class Agent:
    name: str
    system: str
    tool_names: list[str] = field(default_factory=list)
    model: str = DEFAULT_MODEL
    max_turns: int = 50
    # Which desk in the office this agent sits at. Must match an id in the
    # frontend roster or the UI has nowhere to put it.
    office_id: str = "backend"


@dataclass
class Result:
    text: str
    usage: Usage
    messages: list


TEST_LINE = re.compile(r"(\d+)\s+passed(?:,\s*(\d+)\s+failed)?")


def _report_command_result(agent: Agent, args: dict, output: str, task_id: str | None):
    """Turn raw command output into a test result event, when it is one."""
    cmd = args.get("command", "")
    if not any(k in cmd for k in ("pytest", "npm test", "go test", "jest")):
        return
    exit_ok = "exit_code=0" in output
    m = TEST_LINE.search(output)
    passed = int(m.group(1)) if m else 0
    failed = int(m.group(2)) if (m and m.group(2)) else (0 if exit_ok else 1)
    total = passed + failed
    if exit_ok:
        activity(agent.office_id, "test_passed", "test", f"{total} tests passed",
                 task_id, passed=passed, total=total)
    else:
        activity(agent.office_id, "test_failed", "error",
                 f"{failed} of {total} tests failed", task_id, passed=passed, total=total)
    agent_update(agent.office_id, testsPassed=passed, testsTotal=total,
                 status="working" if exit_ok else "error",
                 currentActivity="Tests passed" if exit_ok else "Analysing test failure")


def run_agent(agent: Agent, task: str, ws: tools.Workspace,
              task_id: str | None = None, verbose: bool = True) -> Result:
    """Run one agent until it stops calling tools, or hits max_turns."""
    messages = [{"role": "user", "content": task}]
    schemas = tools.schemas_for(agent.tool_names)
    usage = Usage()
    started = time.time()
    files_changed = 0
    tool_calls = 0

    agent_update(agent.office_id, status="thinking", progress=0,
                 currentActivity="Loading project context", currentTaskId=task_id)

    for turn in range(agent.max_turns):
        kwargs = dict(model=agent.model, max_tokens=MAX_TOKENS, system=agent.system, messages=messages)
        if schemas:
            kwargs["tools"] = schemas

        agent_update(agent.office_id, status="thinking", currentActivity="Planning next step")
        resp = client.messages.create(**kwargs)
        usage.add(resp)
        messages.append({"role": "assistant", "content": resp.content})

        text = "".join(b.text for b in resp.content if b.type == "text")
        if verbose and text.strip():
            print(f"\n[{agent.name}] {text.strip()}")

        tool_uses = [b for b in resp.content if b.type == "tool_use"]
        if not tool_uses:
            usage.seconds = time.time() - started
            agent_update(agent.office_id, status="waiting", progress=100,
                         currentActivity="Finished", inputTokens=usage.input_tokens,
                         outputTokens=usage.output_tokens)
            return Result(text=text, usage=usage, messages=messages)

        results = []
        for tu in tool_uses:
            tool_calls += 1
            type_, category, status, message, target = describe_tool(tu.name, tu.input)

            # Emitted BEFORE execution, so the office shows work in flight
            # rather than only completed work. `path` rides along so the code
            # screen can group by file instead of parsing the message.
            activity(agent.office_id, type_, category, message, task_id,
                     tool=tu.name, path=target)
            agent_update(
                agent.office_id, status=status, currentActivity=message,
                progress=min(95, round(turn / agent.max_turns * 100)),
                toolCalls=tool_calls, filesChanged=files_changed,
                inputTokens=usage.input_tokens, outputTokens=usage.output_tokens,
            )

            if verbose:
                print(f"  -> {tu.name}({json.dumps(tu.input)[:140]})")
            out = tools.execute(tu.name, tu.input, ws)

            if tu.name in ("write_file", "edit_file"):
                files_changed += 1
                agent_update(agent.office_id, filesChanged=files_changed)
            if tu.name == "run_command":
                _report_command_result(agent, tu.input, out, task_id)

            results.append({"type": "tool_result", "tool_use_id": tu.id, "content": out})

        messages.append({"role": "user", "content": results})

    usage.seconds = time.time() - started
    agent_update(agent.office_id, status="error", currentActivity="Hit the turn limit")
    return Result(text="STOPPED: max_turns reached", usage=usage, messages=messages)


def _extract_json(raw: str) -> dict | list:
    """Pull JSON out of a reply that may be fenced or wrapped in prose."""
    text = raw.strip()
    if "```" in text:
        # take the contents of the first fenced block
        chunk = text.split("```", 2)[1]
        text = chunk.split("\n", 1)[1] if chunk.lstrip().startswith("json") else chunk
        text = text.strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    for opener, closer in (("[", "]"), ("{", "}")):
        start, end = text.find(opener), text.rfind(closer)
        if start != -1 and end > start:
            try:
                return json.loads(text[start:end + 1])
            except json.JSONDecodeError:
                continue
    raise ValueError(f"model did not return JSON. First 400 chars:\n{raw[:400]}")


def ask_json(agent: Agent, task: str) -> dict | list:
    """Run a tool-less agent and parse its JSON reply."""
    agent_update(agent.office_id, status="thinking", currentActivity="Analysing requirements", progress=5)
    activity(agent.office_id, "task_started", "agent", "Analysing requirements")
    resp = client.messages.create(
        model=agent.model, max_tokens=4000, system=agent.system,
        messages=[{"role": "user", "content": task}],
    )
    raw = "".join(b.text for b in resp.content if b.type == "text")
    return _extract_json(raw)
