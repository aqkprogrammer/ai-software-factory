/**
 * The client-side projection of the backend's event stream.
 *
 *     GET  /state    snapshot, so first paint is never empty
 *     WS   /stream   replay + live, with reconnect
 *
 * Every screen in the app reads from what this returns. Nothing else in the UI
 * talks to the network, which is why swapping in the mock engine works at all:
 * it returns the same shape.
 */
import { useState, useEffect, useRef, useCallback, useMemo } from "react";

import { DESKS } from "./roster";
import { BUSY } from "./theme";

const EMPTY_DESK = {
  status: "offline",
  activity: "Not provisioned",
  progress: 0,
  filesChanged: 0,
  toolCalls: 0,
  testsPassed: 0,
  testsTotal: 0,
  tokens: 0,
  activeSeconds: 0,
  ping: 0,
  terminal: [],
  checklistIndex: 0,
  currentTaskId: null,
};

const blankFleet = () => Object.fromEntries(DESKS.map((id) => [id, { ...EMPTY_DESK }]));

/** Backend sends camelCase partials; the office reads its own field names. */
function applyAgentUpdate(prev, p) {
  const next = { ...prev, ping: prev.ping + 1 };
  if (p.status !== undefined) next.status = p.status;
  if (p.currentActivity !== undefined) next.activity = p.currentActivity;
  if (p.progress !== undefined) next.progress = p.progress;
  if (p.filesChanged !== undefined) next.filesChanged = p.filesChanged;
  if (p.toolCalls !== undefined) next.toolCalls = p.toolCalls;
  if (p.testsPassed !== undefined) next.testsPassed = p.testsPassed;
  if (p.testsTotal !== undefined) next.testsTotal = p.testsTotal;
  if (p.currentTaskId !== undefined) next.currentTaskId = p.currentTaskId;
  if (p.inputTokens !== undefined || p.outputTokens !== undefined) {
    next.tokens = (p.inputTokens || 0) + (p.outputTokens || 0);
  }
  return next;
}

const clockOf = (iso) => {
  const d = iso ? new Date(iso) : new Date();
  return Number.isNaN(d.getTime())
    ? new Date().toLocaleTimeString("en-GB", { hour12: false })
    : d.toLocaleTimeString("en-GB", { hour12: false });
};

export function useRealtime(apiUrl = "http://localhost:8000") {
  const [agents, setAgents] = useState(blankFleet);
  const [feed, setFeed] = useState([]);
  const [tasks, setTasks] = useState({});
  const [approvals, setApprovals] = useState({});
  const [connected, setConnected] = useState(false);
  const [running, setRunning] = useState(false);
  const [runs, setRuns] = useState([]);
  const [roster, setRoster] = useState([]);
  const [health, setHealth] = useState(null);
  const wsRef = useRef(null);
  const retryRef = useRef(null);
  // The socket replays recent history on every (re)connect, so the same event
  // can arrive more than once. Without this, a reconnect duplicates the feed
  // and React starts warning about repeated keys.
  const seenRef = useRef(new Set());

  const handle = useCallback((msg) => {
    const { kind, payload, ts } = msg;

    if (kind === "agent_update") {
      const id = payload.id;
      if (!DESKS.includes(id)) return;      // unknown agent — no desk to sit at
      setAgents((prev) => ({ ...prev, [id]: applyAgentUpdate(prev[id], payload) }));
      return;
    }

    if (kind === "task_update") {
      setTasks((prev) => ({ ...prev, [payload.id]: { ...prev[payload.id], ...payload } }));
      return;
    }

    if (kind === "approval_requested" || kind === "approval_resolved") {
      setApprovals((prev) => ({
        ...prev,
        [payload.id]: { ...prev[payload.id], ...payload, requestedAt: prev[payload.id]?.requestedAt ?? ts },
      }));
      return;
    }

    if (kind === "activity") {
      const id = payload.agentId;
      const eventId = payload.id || `${id}-${ts}-${payload.message}`;
      if (seenRef.current.has(eventId)) return;   // replayed on reconnect
      seenRef.current.add(eventId);
      if (seenRef.current.size > 2000) {
        seenRef.current = new Set([...seenRef.current].slice(-1000));
      }

      const meta = payload.metadata || {};
      setFeed((f) => [{
        id: eventId,
        ts: clockOf(payload.timestamp || ts),
        iso: payload.timestamp || ts,
        agentId: id,
        type: payload.type,
        cat: payload.category,
        message: payload.message,
        // carried so the code/testing/analytics screens can group without
        // parsing English back out of `message`
        path: meta.path || undefined,
        tool: meta.tool || undefined,
        passed: meta.passed,
        total: meta.total,
      }, ...f].slice(0, 400));

      // Command output is the one place we mirror raw text into the terminal.
      if (payload.metadata?.tool === "run_command" && DESKS.includes(id)) {
        setAgents((prev) => ({ ...prev, [id]: {
          ...prev[id],
          terminal: [...prev[id].terminal, `$ ${payload.message.replace(/^Running /, "")}`].slice(-40),
        }}));
      }
      if (["test_passed", "test_failed"].includes(payload.type) && DESKS.includes(id)) {
        const { passed = 0, total = 0 } = payload.metadata || {};
        setAgents((prev) => ({ ...prev, [id]: {
          ...prev[id],
          terminal: [...prev[id].terminal,
            payload.type === "test_passed" ? `${total} passed` : `${total - passed} failed, ${passed} passed`,
          ].slice(-40),
        }}));
      }
      if (payload.type === "task_completed" && DESKS.includes(id)) {
        setAgents((prev) => ({ ...prev, [id]: { ...prev[id], checklistIndex: prev[id].checklistIndex + 1 } }));
      }
    }
  }, []);

  /* -- socket, with reconnect. A dropped connection must not look like a
        stopped fleet, so we keep the last known state and retry. ---------- */
  useEffect(() => {
    let closed = false;

    const connect = () => {
      if (closed) return;
      const url = apiUrl.replace(/^http/, "ws") + "/stream";
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => setConnected(true);
      ws.onmessage = (e) => {
        try { handle(JSON.parse(e.data)); } catch { /* ignore malformed frame */ }
      };
      ws.onclose = () => {
        setConnected(false);
        if (!closed) retryRef.current = setTimeout(connect, 2000);
      };
      ws.onerror = () => ws.close();
    };

    // Snapshot first so the office paints populated, then go live.
    fetch(`${apiUrl}/state`)
      .then((r) => r.json())
      .then((s) => {
        setRunning(Boolean(s.running));
        setTasks(s.tasks || {});
        setApprovals(s.approvals || {});
        setAgents((prev) => {
          const next = { ...prev };
          Object.entries(s.agents || {}).forEach(([id, p]) => {
            if (DESKS.includes(id)) next[id] = applyAgentUpdate(next[id], p);
          });
          return next;
        });
      })
      .catch(() => { /* server not up yet; the socket retry will cover it */ })
      .finally(connect);

    return () => {
      closed = true;
      clearTimeout(retryRef.current);
      wsRef.current?.close();
    };
  }, [apiUrl, handle]);

  /* -- polling the run flag. The socket carries events, not run state, and a
        run that ends quietly would otherwise leave the bar spinning. Run
        history and config ride along on the same tick.                     */
  useEffect(() => {
    if (!connected) return undefined;
    const poll = () => {
      fetch(`${apiUrl}/state`).then((r) => r.json())
        .then((s) => setRunning(Boolean(s.running))).catch(() => {});
      fetch(`${apiUrl}/runs`).then((r) => r.json())
        .then((d) => setRuns(d.runs || [])).catch(() => {});
    };
    poll();
    // config is static for the life of the process — fetch it once
    fetch(`${apiUrl}/agents`).then((r) => r.json())
      .then((d) => setRoster(d.agents || [])).catch(() => {});
    fetch(`${apiUrl}/health`).then((r) => r.json())
      .then(setHealth).catch(() => {});

    const t = setInterval(poll, 5000);
    return () => clearInterval(t);
  }, [apiUrl, connected]);

  const startRun = useCallback(async (requirement, workspace = "./workspace/demo") => {
    setRunning(true);
    try {
      const r = await fetch(`${apiUrl}/runs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requirement, workspace }),
      });
      return await r.json();
    } catch (e) {
      setRunning(false);
      throw e;
    }
  }, [apiUrl]);

  const startDemo = useCallback(async () => {
    setRunning(true);
    const r = await fetch(`${apiUrl}/runs/demo`, { method: "POST" });
    return r.json();
  }, [apiUrl]);

  const resolveApproval = useCallback(async (id, decision) => {
    const r = await fetch(`${apiUrl}/approvals/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision }),
    });
    return r.json();
  }, [apiUrl]);

  const metrics = useDerivedMetrics(agents, feed, tasks, approvals);

  return { agents, feed, tasks, approvals, metrics, runs, roster, health,
           connected, running, setRunning, startRun, startDemo, resolveApproval,
           apiUrl, live: true };
}

/** Numbers every screen needs, derived once instead of per component. */
export function useDerivedMetrics(agents, feed, tasks, approvals) {
  return useMemo(() => {
    const list = Object.values(agents);
    const taskList = Object.values(tasks);
    const tokens = list.reduce((n, a) => n + (a.tokens || 0), 0);
    const tests = list.reduce(
      (acc, a) => ({ passed: acc.passed + (a.testsPassed || 0), total: acc.total + (a.testsTotal || 0) }),
      { passed: 0, total: 0 });

    return {
      busy: list.filter((a) => BUSY.includes(a.status)).length,
      needsAttention: list.filter((a) => ["blocked", "error"].includes(a.status)).length,
      offline: list.filter((a) => a.status === "offline").length,
      filesChanged: list.reduce((n, a) => n + (a.filesChanged || 0), 0),
      toolCalls: list.reduce((n, a) => n + (a.toolCalls || 0), 0),
      tokens,
      // Sonnet-class blended rate. Rough by design — the run log has the real number.
      cost: (tokens / 1_000_000) * 9,
      tests,
      events: feed.length,
      errors: feed.filter((e) => e.cat === "error").length,
      tasksTotal: taskList.length,
      tasksDone: taskList.filter((t) => t.status === "completed").length,
      tasksRunning: taskList.filter((t) => t.status === "running").length,
      progress: taskList.length
        ? Math.round((taskList.filter((t) => t.status === "completed").length / taskList.length) * 100)
        : 0,
      pendingApprovals: Object.values(approvals).filter((a) => a.status === "pending").length,
    };
  }, [agents, feed, tasks, approvals]);
}
