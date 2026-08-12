"""A scripted run. No API key, no model calls, no files written.

This exists so you can prove the wiring works — event bus, SQLite, WebSocket,
office UI — before you spend a cent on tokens. It emits exactly the same event
shapes `runtime.py` emits, so anything that renders a real run renders this one.

It is labelled DEMO everywhere it surfaces. Do not mistake it for a build.
"""
from __future__ import annotations

import time
import uuid

from .events import activity, agent_update, bus

SCRIPT = [
    ("cto",      "thinking",  "Analysing requirements",           "task_started",   "agent", "Analysing requirements", 0.8),
    ("cto",      "reviewing", "Supervising the build",            "task_completed", "agent", "Broke the work into 4 tasks", 0.6),
    ("backend",  "thinking",  "Loading project context",          "task_assigned",  "agent", "Started: Project scaffold and dependencies", 0.6),
    ("backend",  "working",   "Inspecting the repository",        "tool_called",    "code",  "Inspecting the repository", 0.5),
    ("backend",  "working",   "Creating app/main.py",             "file_created",   "code",  "Creating app/main.py", 0.7),
    ("backend",  "working",   "Creating app/models.py",           "file_created",   "code",  "Creating app/models.py", 0.7),
    ("backend",  "working",   "Modifying app/auth.py",            "file_modified",  "code",  "Modifying app/auth.py", 0.7),
    ("backend",  "working",   "Running pytest -q",                "test_started",   "test",  "Running pytest -q", 1.2),
    ("backend",  "error",     "Analysing test failure",           "test_failed",    "error", "2 of 18 tests failed", 0.9),
    ("backend",  "working",   "Modifying app/auth.py",            "file_modified",  "code",  "Updating implementation after test failure", 0.8),
    ("backend",  "working",   "Running pytest -q",                "test_started",   "test",  "Running pytest -q", 1.2),
    ("backend",  "working",   "Tests passed",                     "test_passed",    "test",  "18 tests passed", 0.5),
    ("qa",       "working",   "Writing test cases",               "task_started",   "agent", "Writing independent test cases", 0.9),
    ("qa",       "working",   "Running pytest tests/ -q",         "test_started",   "test",  "Running pytest tests/ -q", 1.2),
    ("qa",       "working",   "Tests passed",                     "test_passed",    "test",  "24 tests passed", 0.6),
    ("reviewer", "reviewing", "Reading the diff",                 "task_started",   "git",   "Reading the diff", 1.0),
    ("reviewer", "reviewing", "Review complete",                  "review_submitted", "git", "Review complete: APPROVE", 0.5),
]

DESKS = ("cto", "backend", "qa", "reviewer")

# The plan a real run would produce, so the task board and the workflow graph
# have something to show. Keyed by the SCRIPT index that moves them.
TASKS = [
    ("t1", "Project scaffold and dependencies", "backend"),
    ("t2", "SQLAlchemy models and migrations", "database"),
    ("t3", "JWT authentication endpoints", "backend"),
    ("t4", "Test suite and CI", "qa"),
]

TASK_MOVES = {
    2:  [("t1", "running")],
    4:  [("t1", "review"), ("t2", "running")],
    6:  [("t2", "review"), ("t3", "running")],
    11: [("t1", "completed"), ("t2", "completed"), ("t3", "review")],
    12: [("t4", "running")],
    14: [("t3", "completed"), ("t4", "review")],
    16: [("t4", "completed")],
}


def run() -> None:
    activity("cto", "task_started", "agent", "DEMO run started — no model calls, no files written")
    counters = {d: {"tools": 0, "files": 0} for d in DESKS}

    for i, (tid, title, owner) in enumerate(TASKS):
        bus.emit("task_update", {"id": tid, "title": title, "status": "ready",
                                 "assignedAgentId": owner, "progress": 0,
                                 "priority": "high" if i < 2 else "medium"})

    for i, (aid, status, doing, type_, category, message, pause) in enumerate(SCRIPT):
        c = counters[aid]
        c["tools"] += 1
        if type_ in ("file_created", "file_modified"):
            c["files"] += 1

        # Same metadata the real runtime attaches, so the terminal pane and the
        # test counters render here exactly as they do on a live run.
        meta = {"tool": "demo"}
        if type_ in ("file_created", "file_modified", "tool_called"):
            # "Creating app/main.py" -> "app/main.py"
            tail = message.split(" ")[-1]
            meta = {"tool": "write_file", "path": tail if "/" in tail or "." in tail else ""}
        if type_ == "test_started":
            meta = {"tool": "run_command", "path": message.replace("Running ", "")}
        elif type_ == "test_passed":
            total = 18 if aid == "backend" else 24
            meta = {"passed": total, "total": total}   # no tool key: results are not commands
        elif type_ == "test_failed":
            meta = {"passed": 16, "total": 18}

        activity(aid, type_, category, message, **meta)
        agent_update(
            aid, status=status, currentActivity=doing,
            progress=min(100, round((i + 1) / len(SCRIPT) * 100)),
            toolCalls=c["tools"], filesChanged=c["files"],
        )
        if type_ in ("test_passed", "test_failed"):
            agent_update(aid, testsPassed=meta["passed"], testsTotal=meta["total"])

        for tid, status in TASK_MOVES.get(i, []):
            bus.emit("task_update", {"id": tid, "status": status,
                                     "progress": 100 if status == "completed" else
                                     60 if status == "review" else 25})
        time.sleep(pause)

    bus.emit("approval_requested", {
        # Run-scoped: two runs must not collide on one id, or the second
        # silently overwrites the first one's decision.
        "id": f"ap-demo-{uuid.uuid4().hex[:8]}", "type": "production_deployment",
        "title": "Deploy to production (demo)", "requestedByAgentId": "reviewer",
        "status": "pending",
        "summary": {"filesChanged": 3, "testsPassed": 24, "testsTotal": 24,
                    "securityStatus": "skipped", "infrastructureChanges": 0,
                    "estimatedMonthlyCostDeltaUsd": 0},
    })
    for aid in DESKS:
        agent_update(aid, status="waiting", currentActivity="Idle", progress=100)
    activity("cto", "task_completed", "agent", "DEMO run finished")
