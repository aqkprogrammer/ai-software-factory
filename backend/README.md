# ai-agency-v1

The smallest thing that is genuinely an AI engineering pipeline: plan → code → test → fix → review,
running against a real directory, executing real commands, reporting real test output.

Roughly 500 lines. Read all of it before you extend it.

## Run it

```bash
pip install -r requirements.txt
export ANTHROPIC_API_KEY=sk-...

python run.py "Build a FastAPI task API with users, JWT auth, projects and tasks on SQLite, with pytest tests" \
  --workspace ./workspace/task-api
```

Better, once you have seen it work once — run it in the container, since `run_command`
executes whatever the model decides to run:

```bash
docker compose run --rm agency "Build a FastAPI task API..." -w ./workspace/task-api
```

No API key yet? Two things run without one:

```bash
python test_tools.py     # tool layer smoke test
python run.py --demo     # scripted run: exercises the event bus, builds nothing
```

Provider is whichever key is set — `ANTHROPIC_API_KEY` (default, `claude-sonnet-5`),
`OPENAI_API_KEY`, or `XAI_API_KEY`. Override with `AGENT_MODEL` / `AGENT_PROVIDER`.

## Layout

| File | What it is |
|---|---|
| `agency/tools.py` | The six tools. `Workspace` enforces the sandbox boundary. |
| `agency/runtime.py` | The agent loop. ~60 lines. This is the core concept. |
| `agency/agents.py` | Four agents = system prompt + tool allowlist. |
| `agency/orchestrator.py` | The pipeline and the cost/token log. |

## The three ideas that matter

**The tool allowlist is the permission system.** `REVIEWER` gets read tools only. It cannot write
code because the write tools were never handed to it — not because the prompt asked it not to.
Every permission you add later is the same move.

**The tester never fixes.** The coder never grades itself. When the tester reports FAIL, the report
goes back to the coder as new input. That loop, capped at `max_fix_attempts`, is what turns a code
generator into something that converges.

**Everything is scoped to a workspace.** One directory, one project. Multi-tenancy later is just
one workspace per project with real isolation underneath — the tool signatures don't change.

## Where it will break

Run it on something real and you will hit these in roughly this order. Each one is a milestone.

1. **Context.** The coder re-reads files every task and burns tokens. Fix: pass a compact repo map
   plus a summary of what previous tasks changed.
2. **Drift.** Task 4 contradicts task 2. Fix: an architecture artifact (`ARCHITECTURE.md`, API
   contracts as JSON) written by the planner and read by every coder task.
3. **Failure handling.** A crashed run loses everything. Fix: persist task state to Postgres, make
   runs resumable. This is where a durable workflow engine starts to pay for itself — not before.
4. **Git.** Right now agents mutate the workspace directly. Fix: branch per task, PR per task,
   reviewer comments on the diff.
5. **Cost.** Check `.agency/run.jsonl` after each run. Route planning and review to a strong model,
   mechanical edits to a cheap one.

Do not start on 3 until 1 and 2 hurt.
