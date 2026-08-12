"""API + WebSocket bridge between the agent pipeline and the office UI.

    pip install -r requirements.txt
    export ANTHROPIC_API_KEY=sk-ant-...
    uvicorn server:app --reload --port 8000

Then in the UI, point NEXT_PUBLIC_API_URL at http://localhost:8000.

The agent pipeline is synchronous and blocking, so a run happens on a worker
thread. The bus hands events back to the event loop; nothing else crosses the
boundary. That is the whole trick, and it holds until you outgrow one process.
"""
from __future__ import annotations

import asyncio
import contextlib
import os
import pathlib
import threading
import uuid

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from agency import demo, llm
from agency.events import bus
from agency.orchestrator import build

STATIC = pathlib.Path(__file__).parent / "static"

# The UI dev server, plus anything you add via ALLOWED_ORIGINS=a,b,c
ORIGINS = [o.strip() for o in os.environ.get(
    "ALLOWED_ORIGINS",
    "http://localhost:3000,http://127.0.0.1:3000,http://localhost:3001",
).split(",") if o.strip()]


@contextlib.asynccontextmanager
async def lifespan(app: FastAPI):
    bus.bind_loop(asyncio.get_running_loop())
    yield


app = FastAPI(title="AI Software Factory", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ORIGINS,
    allow_methods=["*"], allow_headers=["*"],
)

_run_lock = threading.Lock()
_running = False


class RunRequest(BaseModel):
    requirement: str
    workspace: str = "./workspace/demo"
    fix_attempts: int = 2


class Decision(BaseModel):
    decision: str          # "approved" | "rejected"
    note: str | None = None


def _start(target, label: str):
    """Run `target` on a worker thread. One run at a time, failures surfaced."""
    global _running
    with _run_lock:
        if _running:
            return {"error": "a run is already in progress", "run_id": bus.run_id}
        _running = True

    def worker():
        global _running
        try:
            target()
        except Exception as e:  # surface the failure in the UI, don't swallow it
            bus.emit("activity", {
                "id": "err", "agentId": "cto", "type": "task_failed",
                "category": "error", "message": f"{label} failed: {type(e).__name__}: {e}",
            })
        finally:
            with _run_lock:
                _running = False

    threading.Thread(target=worker, daemon=True).start()
    return {"run_id": bus.run_id, "status": "started"}


@app.post("/runs")
def start_run(req: RunRequest):
    """Kick off a build. Returns immediately; watch /stream for what happens."""
    return _start(lambda: build(req.requirement, req.workspace, req.fix_attempts), "Run")


@app.post("/runs/demo")
def start_demo():
    """Scripted run. No API key, no model calls — proves the wiring end to end."""
    return _start(demo.run, "Demo")


@app.post("/approvals/{approval_id}")
def resolve_approval(approval_id: str, body: Decision):
    """Answer a gate. The pipeline stops at one of these on purpose."""
    if body.decision not in ("approved", "rejected"):
        return {"error": "decision must be 'approved' or 'rejected'"}
    if approval_id not in bus.approvals:
        return {"error": f"no approval {approval_id}"}

    bus.emit("approval_resolved", {
        "id": approval_id, "status": body.decision,
        "note": body.note, "resolvedBy": "human",
    })
    bus.emit("activity", {
        "id": uuid.uuid4().hex, "agentId": "cto",
        "type": "approval_granted" if body.decision == "approved" else "approval_rejected",
        "category": "deployment",
        "message": f"Human {body.decision}: {bus.approvals[approval_id].get('title', approval_id)}",
    })
    return {"id": approval_id, "status": body.decision}


@app.get("/health")
def health():
    """Is the server up, and can it actually reach a model?"""
    key_var = llm.KEY_VARS[llm.PROVIDER]
    return {
        "status": "ok",
        "provider": llm.PROVIDER,
        "model": llm.MODEL,
        "api_key_present": bool(os.environ.get(key_var)),
        "api_key_env_var": key_var,
        "running": _running,
    }


@app.get("/agents")
def list_agents():
    """Who exists, what model they run on, and exactly which tools they hold.

    The tool list is the permission system, so this endpoint is the honest
    answer to "what is this agent allowed to do" — it is read from the same
    objects the runtime uses, not a description of them.
    """
    from agency import agents as roster
    defined = [roster.PLANNER, roster.CODER, roster.TESTER, roster.REVIEWER]
    return {"agents": [{
        "name": a.name,
        "deskId": a.office_id,
        "model": a.model,
        "maxTurns": a.max_turns,
        "tools": a.tool_names,
        "canWrite": any(t in a.tool_names for t in ("write_file", "edit_file")),
        "canExecute": "run_command" in a.tool_names,
    } for a in defined]}


@app.get("/runs")
def list_runs():
    """Run history, straight out of the event log."""
    return {"runs": bus.runs(50), "current": bus.run_id}


@app.get("/state")
def state():
    """Snapshot for first paint, so a page load doesn't start from an empty office."""
    return {"run_id": bus.run_id, "running": _running,
            "agents": bus.snapshot, "tasks": bus.tasks,
            "approvals": bus.approvals, "events": bus.replay(200)}


@app.websocket("/stream")
async def stream(ws: WebSocket):
    await ws.accept()
    q = await bus.subscribe()
    try:
        # Replay first so a tab opened mid-run catches up before going live.
        for msg in bus.replay(120):
            await ws.send_json(msg)
        while True:
            await ws.send_json(await q.get())
    except WebSocketDisconnect:
        pass
    finally:
        bus.unsubscribe(q)


@app.get("/")
def index():
    return FileResponse(STATIC / "index.html")
