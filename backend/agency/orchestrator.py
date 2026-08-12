"""The pipeline: plan -> code -> test -> fix -> review.

Emits task-level events alongside the tool-level ones from runtime.py, so the
office can show both "who is typing" and "which stage are we in".
"""
from __future__ import annotations

import json
import uuid
from pathlib import Path

from . import agents
from .events import activity, agent_update, bus
from .llm import price_per_million
from .runtime import Result, Usage, ask_json, run_agent
from .tools import Workspace


def estimate_cost(u: Usage) -> float:
    price_in, price_out = price_per_million()
    return (u.input_tokens * price_in + u.output_tokens * price_out) / 1_000_000


def _normalise(tasks) -> list[dict]:
    """The planner is a model, not a schema. Accept what it plausibly returns."""
    if isinstance(tasks, dict):
        for key in ("tasks", "plan", "items"):
            if isinstance(tasks.get(key), list):
                tasks = tasks[key]
                break
        else:
            tasks = [tasks]
    if not isinstance(tasks, list) or not tasks:
        raise ValueError(f"planner returned no tasks: {tasks!r}")

    out = []
    for i, t in enumerate(tasks, start=1):
        if isinstance(t, str):
            t = {"title": t}
        out.append({
            "id": t.get("id", i),
            "title": t.get("title") or t.get("name") or f"Task {i}",
            "detail": t.get("detail") or t.get("description") or "",
            "done_when": t.get("done_when") or "the task is implemented and runs",
        })
    return out


def build(requirement: str, workspace: str, max_fix_attempts: int = 2) -> Usage:
    ws = Workspace(workspace)
    total = Usage()
    log_path = ws.root / ".agency" / "run.jsonl"
    log_path.parent.mkdir(parents=True, exist_ok=True)

    def record(stage: str, result: Result):
        total.merge(result.usage)
        with log_path.open("a") as f:
            f.write(json.dumps({
                "stage": stage, "input_tokens": result.usage.input_tokens,
                "output_tokens": result.usage.output_tokens, "turns": result.usage.turns,
                "seconds": round(result.usage.seconds, 1), "summary": result.text[-2000:],
            }) + "\n")

    # 1. Plan
    print("\n=== PLANNING ===")
    tasks = _normalise(ask_json(agents.PLANNER, requirement))
    for t in tasks:
        print(f"  {t['id']}. {t['title']}")
    (ws.root / ".agency" / "plan.json").write_text(json.dumps(tasks, indent=2))
    activity("cto", "task_completed", "agent", f"Broke the work into {len(tasks)} tasks")
    agent_update("cto", status="reviewing", progress=100, currentActivity="Supervising the build")
    for t in tasks:
        bus.emit("task_update", {"id": f"t{t['id']}", "title": t["title"],
                                 "status": "ready", "assignedAgentId": "backend",
                                 "progress": 0, "priority": "high"})

    # 2. Implement each task
    for t in tasks:
        tid = f"t{t['id']}"
        print(f"\n=== CODING: {t['title']} ===")
        activity("backend", "task_assigned", "agent", f"Started: {t['title']}", tid)
        bus.emit("task_update", {"id": tid, "status": "running"})
        prompt = (
            f"Overall project goal:\n{requirement}\n\n"
            f"Your task ({t['id']}/{len(tasks)}): {t['title']}\n\n"
            f"Details: {t['detail']}\n\n"
            f"Done when: {t['done_when']}"
        )
        record(f"code:{t['id']}", run_agent(agents.CODER, prompt, ws, task_id=tid))
        activity("backend", "task_completed", "agent", f"Finished: {t['title']}", tid)
        bus.emit("task_update", {"id": tid, "status": "review", "progress": 100})

    # 3. Test, then feed failures back to the coder
    for attempt in range(1, max_fix_attempts + 2):
        print(f"\n=== TESTING (attempt {attempt}) ===")
        agent_update("qa", status="working", currentActivity="Writing test cases", progress=0)
        test = run_agent(agents.TESTER, f"Test this project against its goal:\n{requirement}", ws)
        record(f"test:{attempt}", test)

        if "FAIL" not in test.text.upper() or attempt > max_fix_attempts:
            break

        print(f"\n=== FIXING (attempt {attempt}) ===")
        activity("backend", "task_started", "agent", "Fixing failures reported by QA")
        fix = run_agent(
            agents.CODER,
            "QA ran the test suite against your implementation and it failed. "
            "Fix the implementation so the tests pass. Do not modify the tests to make "
            "them pass unless a test is provably asserting the wrong thing — if so, say why.\n\n"
            f"QA report:\n{test.text}", ws)
        record(f"fix:{attempt}", fix)

    # 4. Review
    print("\n=== REVIEW ===")
    agent_update("reviewer", status="reviewing", currentActivity="Reading the diff", progress=0)
    review = run_agent(agents.REVIEWER, f"Review this project. Goal was:\n{requirement}", ws)
    record("review", review)
    verdict = "APPROVE" if "APPROVE" in review.text.upper() else "REQUEST_CHANGES"
    activity("reviewer", "review_submitted", "git", f"Review complete: {verdict}")

    # Anything that touches production stops here and waits for a person.
    bus.emit("approval_requested", {
        "id": f"ap-{uuid.uuid4().hex[:8]}", "type": "production_deployment",
        "title": "Deploy to production", "requestedByAgentId": "reviewer",
        "status": "pending",
        "summary": {"filesChanged": 0, "testsPassed": 0, "testsTotal": 0,
                    "securityStatus": "skipped", "infrastructureChanges": 0,
                    "estimatedMonthlyCostDeltaUsd": 0},
    })

    for aid in ("cto", "backend", "qa", "reviewer"):
        agent_update(aid, status="waiting", currentActivity="Idle")

    print(f"\n=== DONE ===\n"
          f"tokens in/out: {total.input_tokens:,} / {total.output_tokens:,}\n"
          f"model calls:   {total.turns}\n"
          f"est. cost:     ${estimate_cost(total):.2f}\n"
          f"workspace:     {ws.root}\n"
          f"run log:       {log_path}")
    return total
