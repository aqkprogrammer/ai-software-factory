# AI Software Factory

**An AI engineering team you can watch work.**

Most AI coding tools give you a spinner and then a wall of diff. This one gives
you a floor plan. Twelve desks, each an agent with a name and a job. When the
backend agent reads a file, its monitor lights up. When the tester's suite goes
red, the desk turns red. When the reviewer approves, you see it happen — with a
timestamp, in a feed, on the same screen.

**[▶ Open the live demo](https://ai-software-factory-qadir-khan.vercel.app)** — no
install, no API key. (The hosted build runs the simulation; clone the repo to
watch real agents write real code.)

![Tour of the platform](docs/media/tour.gif)

*Every frame above is the running application. There are no mockups in this
repository.*

---

## Contents

| | |
|---|---|
| [Run it in five minutes](#run-it-in-five-minutes) | Get it on screen |
| [The one idea](#the-one-idea-that-holds-it-together) | Why it's built this way |
| [How it works](#how-it-works) | Architecture, end to end |
| [**Learn this codebase in eight steps**](#learn-this-codebase-in-eight-steps) | A guided reading path |
| [The concepts](#the-concepts-worth-stealing) | What's transferable to your own work |
| [Every screen](#every-screen-and-what-is-real-in-it) | What each tab shows |
| [The API](#the-api) | Endpoints |
| [Extend it](#extend-it) | Add an agent, a tool, a screen |
| [Where it breaks](#where-it-breaks) | Honest limits |
| [Troubleshooting](#troubleshooting) | When it won't start |
| [Contributing](#contributing) | Open issues, good first ones marked |

---

## Run it in five minutes

Two terminals. Backend first.

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn server:app --reload --port 8000
```

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:3000**. The top bar should say `backend up`.

### See it work without an API key

Click **Demo run**.

A scripted sequence flows through the real event bus — SQLite, WebSocket,
office. Desks light up, a test suite fails, the coder fixes it, the reviewer
approves, a deployment gate opens. No model is called and no file is written.

This exists so you can prove the whole pipe works before spending a cent. It's
also what the animation at the top of this page is showing.

### Make it build something real

```bash
export ANTHROPIC_API_KEY=sk-ant-...
```

Restart the backend, type a requirement into the bar at the top, and hit
**Start build**. Or skip the UI entirely:

```bash
cd backend
python run.py "Build a FastAPI task API with users, JWT auth and pytest tests" \
  -w ./workspace/task-api
```

Then read what the agents actually wrote in `backend/workspace/task-api/`.

> ⚠️ **The agents run shell commands.** They're scoped to the workspace
> directory, but `run_command` executes whatever the model decides to run. A
> `docker compose` setup ships with the backend — use it once you've seen it
> work.

**Providers.** Anthropic by default (`claude-sonnet-5`). Set `OPENAI_API_KEY`
or `XAI_API_KEY` instead and it switches; `AGENT_MODEL` and `AGENT_PROVIDER`
override. `GET /health` tells you which one is live.

---

## The one idea that holds it together

An AI agency has an honesty problem: the client can't see the work, and often
neither can you. *"It's 70% done"* means nothing when the thing doing the work
is a loop you can't watch.

Most dashboards bolt observation on afterwards: the system does the work, then
a reporting layer describes it. Those two drift apart, and the description wins
because it's the only thing anyone reads.

So this project inverts it — **emitting the event is how the work gets done**:

```
   run_agent()                     the agent loop
       │
       │  every tool call emits an event, BEFORE it runs
       ▼
   EventBus  ──────┬─────▶  SQLite       every run replayable, forever
                   │
                   └─────▶  WebSocket ──▶  the UI, live
```

There is no reporting layer to drift. If a tool ran, an event exists, because
the emit is on the same line as the call.

**And one rule keeps it honest.** The UI renders a fixed lookup table of
tool → phrasing:

```python
# backend/agency/events.py
TOOL_EVENTS = {
    "read_file":   ("file_read",     "code", "working", "Reading {}"),
    "write_file":  ("file_created",  "code", "working", "Creating {}"),
    "edit_file":   ("file_modified", "code", "working", "Modifying {}"),
    ...
}
```

`read_file` becomes *"Reading auth/service.py"*. There is no field anywhere in
the pipeline that carries model reasoning — so none can reach the screen. You
see what the agent **did**, never what it "thought". That's a structural
guarantee, not a promise.

---

## How it works

```
                    ┌───────────────────────────────────────────┐
  requirement ─────▶│  ORCHESTRATOR   plan → code → test → fix  │
                    │                        → review → gate    │
                    └────────────────┬──────────────────────────┘
                                     │  runs one agent at a time
                                     ▼
                    ┌───────────────────────────────────────────┐
                    │  AGENT LOOP     model call → tool calls   │
                    │                 → results → repeat        │
                    └───────┬───────────────────────┬───────────┘
                            │ tools                 │ events
                            ▼                       ▼
                  ┌──────────────────┐    ┌────────────────────┐
                  │  WORKSPACE       │    │  EVENT BUS         │
                  │  six tools,      │    │  SQLite + sockets  │
                  │  one directory   │    └─────────┬──────────┘
                  └──────────────────┘              │
                                                    ▼
                                        ┌────────────────────────┐
                                        │  15 SCREENS            │
                                        │  all projections of    │
                                        │  the same event log    │
                                        └────────────────────────┘
```

**The threading trick.** The agent pipeline is blocking, synchronous Python.
FastAPI is async. A run happens on a worker thread, and `emit()` hands events
back to the event loop with `call_soon_threadsafe`. Nothing else crosses that
boundary — which is why the agent code stays plain, readable Python with no
`async` anywhere in it.

---

## The office, up close

![The floor plan](docs/media/floor-plan.png)

Hand-built isometric SVG — room plates, desks, monitors, seated staff, a status
marker over each head. The desk bobs while its agent is typing and settles when
it stops. Rooms tint when anyone in them is active, so you can read the room
from across your own desk. Click a desk and the camera zooms to it.

Projection is one line:

```js
const iso = (gx, gy) => ({ x: (gx - gy) * 46, y: (gx + gy) * 23 });
```

Everything else is polygons stacked in painter's order, sorted back-to-front by
`gx + gy` so near desks overlap far ones. No canvas, no 3D library, no game
engine.

<img src="docs/media/agent-panel.png" width="330" align="right" alt="Agent detail panel" />

Click a desk and you get what a manager would actually ask for: what they're
working on, the step they're on, files changed, tool calls, tests passing,
tokens burned, and the raw terminal — the actual `pytest` output, not a summary
of it.

Four of the twelve desks light up on a real run: **Atlas** (planner), **Forge**
(coder), **Sieve** (tester), **Lens** (reviewer). The other eight sit `offline`
because those agents don't exist yet. That's deliberate — a fake-busy desk
teaches you nothing.

<br clear="right" />

### One full run, start to finish

![A build, start to finish](docs/media/office-run.gif)

Atlas breaks the work down, Forge writes the code, the suite fails, Forge fixes
it, Sieve tests it independently, Lens reviews the diff. Nobody typed anything
after "go".

---

## Learn this codebase in eight steps

Read it in this order. It's about 900 lines of backend and it's meant to be
read in one sitting. Each step says what to look for and gives you something to
try.

### Step 1 — The tools (`backend/agency/tools.py`)

Start here. Six functions, one class, no cleverness.

```python
class Workspace:
    def path(self, rel: str) -> Path:
        p = (self.root / rel).resolve()
        if p != self.root and self.root not in p.parents:
            raise ValueError(f"path escapes workspace: {rel}")
        return p
```

**What to notice:** that's the entire sandbox. Every tool resolves paths
through it, so `../../../etc/passwd` fails in one place rather than six.

**Try it:** `python test_tools.py` — runs without an API key and asserts the
boundary holds.

### Step 2 — The agent loop (`backend/agency/runtime.py`)

The core concept of the whole project, in about 60 lines:

```
messages = [user task]
loop:
    response = model(messages, tools)
    if no tool calls: return          ← the agent decided it's done
    for each tool call:
        emit event                     ← before executing, not after
        result = execute(tool)
    messages += results
```

**What to notice:** an "agent" is not a framework. It's a while-loop that keeps
feeding tool results back to a model until the model stops asking for tools.
Everything else in the industry is scaffolding around this shape.

Also notice `_report_command_result` — it reads pytest's output and turns
`18 passed` into a structured test event. That's how the UI knows tests passed
without the model being asked to self-report.

### Step 3 — The agents (`backend/agency/agents.py`)

Four agents. Each is a system prompt plus a list of tool names.

```python
CODE_TOOLS = ["list_files", "read_file", "write_file", "edit_file", "search_code", "run_command"]
READ_TOOLS = ["list_files", "read_file", "search_code", "run_command"]

REVIEWER = Agent(system="You are a staff engineer reviewing a diff...",
                 tool_names=READ_TOOLS)
```

**What to notice — this is the most important idea in the repo:** the reviewer
*cannot* write code. Not because the prompt asks it not to, but because
`write_file` was never handed to it. **The tool allowlist is the permission
system.** Every permission you add later is the same move.

Open the **Security** screen in the UI to see this rendered live — it reads
from the same objects.

### Step 4 — The orchestrator (`backend/agency/orchestrator.py`)

The pipeline: plan → code each task → test → fix → review → gate.

**What to notice:** the fix loop.

```python
for attempt in range(1, max_fix_attempts + 2):
    test = run_agent(agents.TESTER, ...)
    if "FAIL" not in test.text.upper() or attempt > max_fix_attempts:
        break
    fix = run_agent(agents.CODER, f"QA ran the suite and it failed...\n{test.text}")
```

The tester never fixes. The coder never grades itself. The tester's report
becomes the coder's next input. **That loop is what turns a code generator into
something that converges** — and capping it is what stops it looping forever.

### Step 5 — The event bus (`backend/agency/events.py`)

```python
def emit(self, kind, payload):
    msg = {...}
    if kind == "agent_update":   self.snapshot[id] = {**old, **payload}
    elif kind == "task_update":  self.tasks[id]    = {**old, **payload}
    self._db.execute("INSERT INTO agent_events ...")
    self._loop.call_soon_threadsafe(self._fanout, msg)
```

**What to notice:** three things happen per event — fold into memory, append to
SQLite, fan out to sockets. The in-memory dicts are a *projection*: a running
summary rebuilt from events, so a browser connecting mid-run gets a populated
screen instead of an empty one.

This is event sourcing in about 40 lines. The log is the truth; everything else
is a view of it.

### Step 6 — The bridge (`backend/server.py`)

FastAPI. Read `_start()` and the `/stream` handler.

**What to notice:** the socket replays recent history *before* going live, so a
tab opened mid-run catches up. And a run holds a lock — one at a time,
deliberately, because two concurrent runs would interleave into one office.

### Step 7 — The client projection (`frontend/lib/useRealtime.js`)

Snapshot from `/state`, then live over `/stream`, with reconnect.

**What to notice:** the dedupe.

```js
const eventId = payload.id || `${id}-${ts}-${payload.message}`;
if (seenRef.current.has(eventId)) return;   // replayed on reconnect
```

The server replays on every connect. Without this, a dropped connection
silently duplicates the entire feed. This is the kind of bug you only find by
running the thing for real — it was caught by watching React warn about
duplicate keys.

### Step 8 — The screens (`frontend/components/screens/`)

Fifteen screens, one event stream. Read `lib/derive.js` first: files, test runs,
analytics and costs are all folded out of the same feed.

**What to notice:** there is no `files` table and no `test_runs` table on the
backend. The Code screen is `useFiles(feed)`. The Testing screen is
`useTestRuns(feed)`. Because they're derived from the same log the office
renders, **no two screens can disagree** about what happened.

---

### Exercises, in increasing difficulty

1. **Trace one event end to end.** Add `print(msg)` in `EventBus.emit`, start a
   demo run, and watch the same object appear in the terminal, in `agency.db`,
   and in the browser feed.
2. **Break the sandbox on purpose.** Ask the coder to write to `/tmp/x`. Watch
   it get refused, and watch the agent recover.
3. **Give the reviewer `write_file`.** Observe that the prompt no longer
   controls its behaviour. Then take it away again.
4. **Add a seventh tool** (see [Extend it](#extend-it)) and see it appear in the
   activity feed without touching the UI.
5. **Make the planner drift.** Run a large requirement and watch task 4
   contradict task 2. That's limitation #2 below, and fixing it is the most
   valuable thing you could build here.

---

## The concepts worth stealing

Things this project demonstrates that transfer to any agent system you build.

| Concept | Where | Why it matters |
|---|---|---|
| **An agent is a while-loop** | `runtime.py` | Model call → tool calls → results → repeat. No framework needed to understand or debug it. |
| **Tool allowlists as permissions** | `agents.py` | Capability is granted by handing over a function, not by asking a model politely. A prompt can't talk its way past it. |
| **Sandbox at one choke point** | `tools.py` | One `path()` method every tool routes through beats six scattered checks. |
| **Emit before you execute** | `runtime.py` | Events emitted *before* the call show work in flight, not just completed work — and survive a crash mid-tool. |
| **Structured events, never prose** | `events.py` | A fixed tool→phrasing table means model reasoning has nowhere to leak into the UI. |
| **Event sourcing + projections** | `events.py` | Append-only log, in-memory summaries. Replay, audit and time-travel come free. |
| **Thread → event loop handoff** | `events.py` | `call_soon_threadsafe` lets blocking agent code coexist with an async API, with no async in the agent code. |
| **Snapshot then stream** | `useRealtime.js` | First paint from `/state`, updates from the socket. No empty screens, no polling. |
| **Dedupe on replay** | `useRealtime.js` | Any system that replays history on reconnect needs this. Most learn it from a bug. |
| **Two sources, one UI** | `mockEngine.js` | The simulation and the socket return identical shapes, so the product demos with the backend down — labelled, never disguised. |
| **Derive, don't duplicate** | `derive.js` | Screens compute from the log rather than keeping their own state. Disagreement becomes impossible. |
| **Say what you don't do** | `SecurityScreen.jsx` | Empty states name the gap instead of showing a plausible number. |

---

## Every screen, and what is real in it

| Screen | Shows | Source |
|---|---|---|
| **Office** | Isometric floor, live desk states, per-agent panel, terminal | `agent_update` events |
| **Command Center** | Agents working, tasks, tests, tokens, what needs you | All projections |
| **Tasks** | Kanban of the planner's plan | `task_update` events |
| **Workflow** | The pipeline as a graph, state per stage | Agents + tasks + approvals |
| **Agent Activity** | Full log, filters, replay scrubber | The raw feed |
| **Approvals** | The human gate; approve or reject | `approval_*` + `POST /approvals/{id}` |
| **Projects** | Run history: duration, events, writes, tests | `GET /runs`, rebuilt from SQLite |
| **AI Employees** | Model, tool count, permissions per desk | `GET /agents` |
| **Code** | Files touched, per-path history | `path` metadata on file events |
| **Testing** | Suite executions, first-run pass rate | test events |
| **Security** | The real boundary, and the gaps | `GET /agents` + architecture |
| **Deployments** | How far a run actually gets | Tasks + tests + approvals |
| **Analytics** | Events by desk, category, type, over time | The feed |
| **Costs** | Token spend per desk, model rates | `usage` from the model |
| **Settings** | Provider, model, whether the key is set | `GET /health` |

Screens are deep-linkable: `?screen=security`, `?screen=costs`.
Press **⌘K** for the command palette.

**Three screens deliberately show less than they could.** Security shows no
findings because no scanner runs. Deployments ends at *"nothing has ever
shipped from here"*. Code has no diff viewer because the API doesn't serve file
contents. A green tick in those places would be a lie, and a reviewer who
catches one lie discounts everything else on the screen.

---

## The API

| Route | Purpose |
|---|---|
| `POST /runs` | Start a build. Returns immediately; one at a time. |
| `POST /runs/demo` | Scripted run. No key, no model calls, no files written. |
| `POST /approvals/{id}` | Answer a gate: `{"decision": "approved"}`. |
| `GET /health` | Provider, model, and whether the key is actually set. |
| `GET /agents` | Each agent's model and exact tool allowlist. |
| `GET /runs` | Run history, reconstructed from the event log. |
| `GET /state` | Snapshot for first paint: agents, tasks, approvals, events. |
| `WS /stream` | Replays recent events, then streams live. |

**Event kinds on the socket:** `activity`, `agent_update`, `task_update`,
`approval_requested`, `approval_resolved`. Every one is
`{kind, payload, ts, run_id}`.

---

## Extend it

### Add a tool

1. Write the function in `tools.py` — it takes `(ws, **kwargs)` and returns a string.
2. Add its JSON schema to `SCHEMAS` and the function to `IMPLS`.
3. Add it to an agent's `tool_names` in `agents.py`.
4. *Optional:* add a row to `TOOL_EVENTS` in `events.py` so the UI phrases it nicely.

Skip step 4 and it still works — it just shows as "Calling your_tool".

### Add an agent

1. Define it in `agents.py`: system prompt + `tool_names` + `office_id` (which
   desk it sits at).
2. Call it from `orchestrator.py` at the right point in the pipeline.
3. That's it — the UI already has twelve desks and will light up the matching one.

The empty desks are `architect`, `database`, `frontend`, `security`, `devops`,
`sre`, `pm`, `analyst`. **Start with the architect** — see
[Where it breaks](#where-it-breaks).

### Add a screen

1. Create `frontend/components/screens/YourScreen.jsx`.
2. Add a `NAV` entry and a `case` in `Shell.jsx`.
3. Derive what you need from `feed` — add a hook to `lib/derive.js` rather than
   introducing new state.

### Change the model

```bash
export AGENT_MODEL=claude-opus-5      # anything your provider serves
export AGENT_PROVIDER=openai          # force a provider
```

Rates for the cost estimate live in `PRICES` in `llm.py`.

---

## Where it breaks

Written down honestly, because a demo that hides its edges isn't worth showing.

1. **Context.** The coder re-reads files every task and burns tokens. Fix: a
   compact repo map plus a summary of what previous tasks changed. This is the
   single largest avoidable cost.
2. **Drift.** Task 4 can contradict task 2. Fix: an **architect agent** that
   writes `ARCHITECTURE.md` and API contracts once, which every coder task then
   reads. *This is the highest-value thing to build next.*
3. **Crash recovery.** A failed run loses its state. Fix: persist task state and
   make runs resumable. This is where a durable workflow engine starts paying
   for itself — not before.
4. **One process.** Two concurrent runs would interleave into one office. The
   `run_id` column already exists; the socket needs to filter on it.
5. **Git.** Agents mutate the workspace directly. Fix: branch per task, PR per
   task, reviewer comments on a real diff.
6. **Eight empty desks.** Frontend, database, security, devops and the rest are
   roster entries, not implementations.
7. **No auth on the API.** `POST /runs` executes code. Do not expose the port.

---

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `backend down` in the top bar | Server not running, or on another port | Start uvicorn; check `NEXT_PUBLIC_API_URL` |
| `address already in use` | Something already on 8000 | `lsof -nP -iTCP:8000 -sTCP:LISTEN -t \| xargs kill` |
| Run fails instantly with `MissingAPIKey` | No key exported | `export ANTHROPIC_API_KEY=...`, restart the backend |
| Everything looks busy but nothing is real | You're in **Demo data** mode | Toggle **Live data** in the top bar |
| `Cannot find module './447.js'` | Stale Next.js cache | `rm -rf frontend/.next` and restart |
| Screens empty after a backend restart | Projections live in memory | Run again; SQLite keeps the events either way |

Reset everything: `rm backend/agency.db` (deletes run history, not code).

---

## Project layout

```
backend/
  agency/tools.py         six tools; Workspace enforces the sandbox boundary
  agency/runtime.py       the agent loop — this is the core concept
  agency/agents.py        four agents = system prompt + tool allowlist
  agency/orchestrator.py  plan → code → test → fix → review
  agency/events.py        the bus: SQLite, projections, WebSocket fanout
  agency/llm.py           provider adapter — Anthropic, OpenAI, xAI
  agency/demo.py          scripted run, no key required
  server.py               FastAPI bridge
  test_tools.py           sandbox tests, no key required
frontend/
  components/Shell.jsx           sidebar, top bar, routing, ⌘K
  components/office/Floor.jsx    the isometric floor plan
  components/screens/            the fifteen screens
  lib/useRealtime.js             snapshot, then live, with reconnect and dedupe
  lib/derive.js                  files, tests, analytics and costs from the feed
  lib/mockEngine.js              the simulation, for when the backend is down
  lib/roster.js  lib/theme.js    the desks and the design tokens
docs/media/                      the screenshots and animation in this README
```

**Stack:** Python 3.11+, FastAPI, WebSockets, SQLite · Next.js 15, React 19,
hand-written SVG. No agent framework, no state library, no component library,
no game engine. The floor plan is
`iso(gx, gy) => ({x: (gx-gy)*46, y: (gx+gy)*23})` and about 200 lines of
polygons.

---

## Screens

<img src="docs/media/command.png" width="49%" alt="Command center" />
<img src="docs/media/workflow.png" width="49%" alt="Pipeline graph" />
<img src="docs/media/employees.png" width="49%" alt="AI employees" />
<img src="docs/media/security.png" width="49%" alt="Security" />
<img src="docs/media/activity.png" width="49%" alt="Activity log with replay" />
<img src="docs/media/approvals.png" width="49%" alt="Approvals" />
<img src="docs/media/tasks.png" width="49%" alt="Task board" />
<img src="docs/media/office.png" width="49%" alt="The office" />

---

## Contributing

Issues are open, and the ones labelled
[`good first issue`](https://github.com/aqkprogrammer/ai-software-factory/labels/good%20first%20issue)
are real gaps rather than busywork — each one is a limitation named in
[Where it breaks](#where-it-breaks). Fork it, pick one, open a PR.

---

## License

[MIT](LICENSE) — use it, fork it, build on it.

Built by **Abdul Qadir Khan** · [@aqkprogrammer](https://github.com/aqkprogrammer)
