/**
 * useRealtime — the drop-in replacement for useOfficeEngine().
 *
 * In virtual-office.jsx, change one line:
 *
 *     const { agents, feed, running, setRunning } = useOfficeEngine();
 *     const { agents, feed, running, setRunning, connected, startRun } =
 *         useRealtime("http://localhost:8000");
 *
 * It returns the same shape the office already renders, so nothing else in
 * that file changes. Agents the backend never mentions stay `offline` — which
 * is honest: eight of the twelve desks are empty until you build those agents.
 */
import { useState, useEffect, useRef, useCallback } from "react";

/** Must match the office roster ids in virtual-office.jsx. */
const DESKS = [
  "cto", "pm", "analyst", "architect", "backend", "database",
  "frontend", "qa", "security", "reviewer", "devops", "sre",
];

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
  if (p.inputTokens !== undefined || p.outputTokens !== undefined) {
    next.tokens = (p.inputTokens || 0) + (p.outputTokens || 0);
  }
  return next;
}

const clock = (iso) => {
  const d = iso ? new Date(iso) : new Date();
  return Number.isNaN(d.getTime())
    ? new Date().toLocaleTimeString("en-GB", { hour12: false })
    : d.toLocaleTimeString("en-GB", { hour12: false });
};

export function useRealtime(apiUrl = "http://localhost:8000") {
  const [agents, setAgents] = useState(blankFleet);
  const [feed, setFeed] = useState([]);
  const [connected, setConnected] = useState(false);
  const [running, setRunning] = useState(false);
  const wsRef = useRef(null);
  const retryRef = useRef(null);

  const handle = useCallback((msg) => {
    const { kind, payload, ts } = msg;

    if (kind === "agent_update") {
      const id = payload.id;
      if (!DESKS.includes(id)) return;      // unknown agent — no desk to sit at
      setAgents((prev) => ({ ...prev, [id]: applyAgentUpdate(prev[id], payload) }));
      return;
    }

    if (kind === "activity") {
      const id = payload.agentId;
      setFeed((f) => [{
        id: payload.id || `${id}-${Math.random()}`,
        ts: clock(payload.timestamp || ts),
        agentId: id,
        type: payload.type,
        cat: payload.category,
        message: payload.message,
      }, ...f].slice(0, 200));

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

  return { agents, feed, connected, running, setRunning, startRun };
}
