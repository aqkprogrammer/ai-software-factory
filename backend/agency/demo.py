"""A scripted run. No API key, no model calls, no files written.

This exists so you can prove the wiring works — event bus, SQLite, WebSocket,
office UI — before you spend a cent on tokens. It emits exactly the same event
shapes `runtime.py` emits, so anything that renders a real run renders this one.

It is labelled DEMO everywhere it surfaces. Do not mistake it for a build.
"""
from __future__ import annotations

import time

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


def run() -> None:
    activity("cto", "task_started", "agent", "DEMO run started — no model calls, no files written")
    counters = {d: {"tools": 0, "files": 0} for d in DESKS}

    for i, (aid, status, doing, type_, category, message, pause) in enumerate(SCRIPT):
        c = counters[aid]
        c["tools"] += 1
        if type_ in ("file_created", "file_modified"):
            c["files"] += 1

        # Same metadata the real runtime attaches, so the terminal pane and the
        # test counters render here exactly as they do on a live run.
        meta = {"tool": "demo"}
        if type_ == "test_started":
            meta = {"tool": "run_command"}
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
        time.sleep(pause)

    bus.emit("approval_requested", {
        "id": "ap-demo", "type": "production_deployment",
        "title": "Deploy to production (demo)", "requestedByAgentId": "reviewer",
        "status": "pending",
        "summary": {"filesChanged": 3, "testsPassed": 24, "testsTotal": 24,
                    "securityStatus": "skipped", "infrastructureChanges": 0,
                    "estimatedMonthlyCostDeltaUsd": 0},
    })
    for aid in DESKS:
        agent_update(aid, status="waiting", currentActivity="Idle", progress=100)
    activity("cto", "task_completed", "agent", "DEMO run finished")
