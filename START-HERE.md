# AI Software Factory

Two halves, both runnable.

```
backend/    the agent pipeline + FastAPI event bridge
frontend/   the Next.js office UI that watches it work
```

## Run it

Two terminals. Backend first.

### 1. Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn server:app --reload --port 8000
```

Check it:

```bash
curl localhost:8000/health
```

`api_key_present: false` is fine for now — the demo run below needs no key.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000. The top bar should say **backend up**.

If the backend is down the office still runs on simulated data, so a dead
socket never looks like an empty screen. The toggle next to the connection
chip switches between the two.

## See it work — no API key

Click **Demo run** (or `curl -X POST localhost:8000/runs/demo`).

A scripted sequence of events runs through the real bus: SQLite, the
WebSocket, the office. Desks light up, tests fail then pass, the reviewer
approves. Nothing is built and no model is called — this exists to prove the
wiring before you spend anything.

## Make it actually build something

```bash
export ANTHROPIC_API_KEY=sk-ant-...
```

Restart the backend, then type a requirement into the bar at the top of the
office and hit **Start build**. Or from the CLI, with no server involved:

```bash
cd backend
python run.py "Build a FastAPI task API with users, JWT auth and pytest tests" -w ./workspace/task-api
```

Then read what the agents actually wrote: `backend/workspace/task-api/`.

**The agents run shell commands inside the workspace directory.** Read
`backend/README.md` before pointing this at anything you care about, and run it
in the container once you have seen it work.

## Provider and model

Anthropic by default (`claude-sonnet-5`). The provider is whichever key is set:

| Env var | Provider |
|---|---|
| `ANTHROPIC_API_KEY` | anthropic (default) |
| `OPENAI_API_KEY` | openai |
| `XAI_API_KEY` | xai |

Override the model with `AGENT_MODEL`, force a provider with `AGENT_PROVIDER`.
`GET /health` tells you which one is live.

## Read next

- `backend/README.md` — what the pipeline is and where it breaks
- `backend/BRIDGE.md` — how events reach the UI
- `client-acquisition-playbook.md` — finding the first client
