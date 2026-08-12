# Wiring the office to real agent runs

Three pieces, one event shape.

```
run_agent()  ──emit──▶  EventBus  ──┬──▶  SQLite  (agent_events, replayable)
 tool loop                          └──▶  WebSocket  ──▶  useRealtime()  ──▶  office
```

## Run it

```bash
pip install -r requirements.txt
export ANTHROPIC_API_KEY=sk-...
uvicorn server:app --reload --port 8000
```

Start a build (or POST from the UI):

```bash
curl -X POST localhost:8000/runs -H 'content-type: application/json' -d '{
  "requirement": "Build a FastAPI task API with users, JWT auth, projects and tasks on SQLite, with pytest tests",
  "workspace": "./workspace/task-api"
}'
```

Watch it:

```bash
npx wscat -c ws://localhost:8000/stream
```

Or prove the whole path with no API key and no model calls:

```bash
curl -X POST localhost:8000/runs/demo
```

## How the UI is wired

`components/VirtualOffice.jsx` runs both sources and reads one of them:

```js
const mock = useOfficeEngine();      // simulation, every desk busy
const wire = useRealtime(apiUrl);    // the backend, four desks lit
const [live, setLive] = useState(false);
useEffect(() => { if (wire.connected) setLive(true); }, [wire.connected]);
```

It flips to live the moment the socket connects, and the toggle in the top bar
flips it back. Keep both until you've watched a real run — comparing them is how
you find out which parts of the simulation were lying.

When you're done comparing, delete `useOfficeEngine` and its mock tables.

## What the office will actually show

Four desks light up: **Atlas** (planner), **Forge** (coder), **Sieve** (tester),
**Lens** (reviewer). The other eight sit `offline` because those agents do not
exist yet. That is deliberate — a fake-busy desk teaches you nothing.

## Endpoints

| Route | Purpose |
|---|---|
| `POST /runs` | Start a build. Returns immediately; one run at a time. |
| `POST /runs/demo` | Scripted run. No key, no model calls, no files written. |
| `GET /health` | Provider, model, and whether the API key is actually set. |
| `GET /state` | Snapshot: agent states + last 120 events. First paint. |
| `WS /stream` | Replays recent events, then streams live. |

## Where this breaks

1. **One process.** The agent thread and the API share memory. Two concurrent
   runs will interleave into one office. Fix: a run_id per project and a
   `run_id` filter on the socket — the column already exists.
2. **SQLite writes on every tool call.** Fine for one run, not for ten. Move to
   Postgres when you notice it, not before.
3. **In-memory fanout.** Restart the API and connected tabs reconnect but the
   snapshot resets to whatever SQLite replays. Redis pub/sub fixes this and is
   a change to `_fanout` only.
4. **No auth.** Do not expose this port. The `/runs` endpoint executes code.
