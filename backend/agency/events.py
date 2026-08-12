"""Event bus.

Two sinks, one call site:

    bus.emit("activity", {...})   -> appended to SQLite, fanned out to sockets

The agent loop runs on a worker thread; FastAPI runs on the event loop. emit()
is called from the worker and hands off with call_soon_threadsafe, so nothing
here needs to be async and the agent code stays plain synchronous Python.

When one process stops being enough, replace _fanout with a Redis publish and
subscribe on the API side. The emit() signature does not change.
"""
from __future__ import annotations

import asyncio
import json
import sqlite3
import threading
import uuid
from datetime import datetime, timezone

SCHEMA = """
CREATE TABLE IF NOT EXISTS agent_events (
    id          TEXT PRIMARY KEY,
    ts          TEXT NOT NULL,
    run_id      TEXT NOT NULL,
    agent_id    TEXT NOT NULL,
    task_id     TEXT,
    kind        TEXT NOT NULL,
    type        TEXT,
    category    TEXT,
    message     TEXT,
    payload     TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_events_run ON agent_events(run_id, ts);
"""

def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


class EventBus:
    def __init__(self, db_path: str = "agency.db"):
        self._db = sqlite3.connect(db_path, check_same_thread=False)
        self._db.executescript(SCHEMA)
        self._db.commit()
        self._lock = threading.Lock()
        self._subscribers: set[asyncio.Queue] = set()
        self._loop: asyncio.AbstractEventLoop | None = None
        # Last known state per agent, so a browser connecting mid-run sees a
        # populated office instead of an empty one.
        self.snapshot: dict[str, dict] = {}
        self.run_id = "run-" + uuid.uuid4().hex[:8]

    # -- wiring ------------------------------------------------------------

    def bind_loop(self, loop: asyncio.AbstractEventLoop) -> None:
        self._loop = loop

    async def subscribe(self) -> asyncio.Queue:
        q: asyncio.Queue = asyncio.Queue(maxsize=500)
        self._subscribers.add(q)
        return q

    def unsubscribe(self, q: asyncio.Queue) -> None:
        self._subscribers.discard(q)

    # -- emit --------------------------------------------------------------

    def emit(self, kind: str, payload: dict) -> dict:
        """Called from any thread. Persists, updates snapshot, fans out."""
        msg = {"kind": kind, "payload": payload, "ts": _now(), "run_id": self.run_id}

        if kind == "agent_update":
            aid = payload.get("id")
            if aid:
                self.snapshot[aid] = {**self.snapshot.get(aid, {}), **payload}

        with self._lock:
            self._db.execute(
                "INSERT INTO agent_events (id, ts, run_id, agent_id, task_id, kind, type, category, message, payload)"
                " VALUES (?,?,?,?,?,?,?,?,?,?)",
                (uuid.uuid4().hex, msg["ts"], self.run_id,
                 payload.get("agentId") or payload.get("id") or "system",
                 payload.get("taskId"), kind, payload.get("type"),
                 payload.get("category"), payload.get("message"), json.dumps(msg)),
            )
            self._db.commit()

        if self._loop is not None:
            self._loop.call_soon_threadsafe(self._fanout, msg)
        return msg

    def _fanout(self, msg: dict) -> None:
        for q in list(self._subscribers):
            try:
                q.put_nowait(msg)
            except asyncio.QueueFull:
                # A browser tab that stopped reading must not stall the agents.
                self._subscribers.discard(q)

    # -- replay ------------------------------------------------------------

    def replay(self, limit: int = 200) -> list[dict]:
        with self._lock:
            rows = self._db.execute(
                "SELECT payload FROM agent_events WHERE run_id = ? ORDER BY ts DESC LIMIT ?",
                (self.run_id, limit),
            ).fetchall()
        return [json.loads(r[0]) for r in reversed(rows)]


# One bus per process. The orchestrator and the API both import this.
bus = EventBus()


# -- helpers the agent loop uses ------------------------------------------

def agent_update(agent_id: str, **fields) -> None:
    bus.emit("agent_update", {"id": agent_id, **fields})


def activity(agent_id: str, type_: str, category: str, message: str,
             task_id: str | None = None, **metadata) -> None:
    bus.emit("activity", {
        "id": uuid.uuid4().hex, "timestamp": _now(), "agentId": agent_id,
        "taskId": task_id, "type": type_, "category": category,
        "message": message, "metadata": metadata or None,
    })


# Tool name -> (event type, feed category, agent status, phrasing).
# Everything the UI shows is derived from this table, which is why no model
# reasoning can reach the screen: there is nowhere to put it.
TOOL_EVENTS = {
    "read_file":    ("file_read", "code", "working", "Reading {}"),
    "write_file":   ("file_created", "code", "working", "Creating {}"),
    "edit_file":    ("file_modified", "code", "working", "Modifying {}"),
    "search_code":  ("search_performed", "code", "working", "Searching repository for {}"),
    "list_files":   ("tool_called", "code", "working", "Inspecting the repository"),
    "run_command":  ("tool_called", "code", "working", "Running {}"),
}


def describe_tool(tool: str, args: dict) -> tuple[str, str, str, str]:
    type_, cat, status, template = TOOL_EVENTS.get(
        tool, ("tool_called", "agent", "working", "Calling " + tool))
    target = args.get("path") or args.get("pattern") or args.get("command") or ""
    if tool == "run_command" and any(k in target for k in ("pytest", "npm test", "go test", "jest")):
        type_, cat = "test_started", "test"
    return type_, cat, status, (template.format(target) if "{}" in template else template)
