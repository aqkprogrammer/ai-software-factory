/**
 * The simulation.
 *
 * It exists so the office is never a blank screen — with no backend running
 * you still see what the product does. It emits the same shapes `useRealtime`
 * produces, so screens can't tell the difference, and the top bar always says
 * which one you're looking at.
 *
 * Nothing here is a claim about a real run. When the backend is up, use it.
 */
import { useState, useEffect, useRef } from "react";

import { STAFF, FILES, COMMANDS } from "./roster";
import { useDerivedMetrics } from "./useRealtime";

const ACTIONS = [
  { type: "file_read",        cat: "code",  status: "working",   verb: "Reading" },
  { type: "search_performed", cat: "code",  status: "working",   verb: "Searching repository for" },
  { type: "file_modified",    cat: "code",  status: "working",   verb: "Modifying" },
  { type: "file_created",     cat: "code",  status: "working",   verb: "Creating" },
  { type: "task_started",     cat: "agent", status: "thinking",  verb: "Planning" },
  { type: "review_submitted", cat: "git",   status: "reviewing", verb: "Reviewing" },
];

const MOCK_TASKS = [
  { id: "m1", title: "Authentication API",        assignedAgentId: "backend",  status: "running",   progress: 82, priority: "high" },
  { id: "m2", title: "Deals dashboard",           assignedAgentId: "frontend", status: "running",   progress: 64, priority: "high" },
  { id: "m3", title: "Contacts and companies schema", assignedAgentId: "database", status: "completed", progress: 100, priority: "high" },
  { id: "m4", title: "Quotation workflow",        assignedAgentId: "backend",  status: "ready",     progress: 0,  priority: "medium" },
  { id: "m5", title: "Auth and deals test suite", assignedAgentId: "qa",       status: "review",    progress: 90, priority: "high" },
  { id: "m6", title: "Token handling audit",      assignedAgentId: "security", status: "blocked",   progress: 30, priority: "critical" },
  { id: "m7", title: "CI and container build",    assignedAgentId: "devops",   status: "backlog",   progress: 0,  priority: "low" },
  { id: "m8", title: "Staging alerting",          assignedAgentId: "sre",      status: "backlog",   progress: 0,  priority: "low" },
];

const MOCK_APPROVALS = {
  "ap-mock-1": {
    id: "ap-mock-1", type: "production_deployment", title: "Deploy to production",
    requestedByAgentId: "reviewer", status: "pending",
    summary: { filesChanged: 37, testsPassed: 147, testsTotal: 147,
               securityStatus: "passed", infrastructureChanges: 2,
               estimatedMonthlyCostDeltaUsd: 42 },
  },
  "ap-mock-2": {
    id: "ap-mock-2", type: "database_migration", title: "Run migration 0007_deals",
    requestedByAgentId: "database", status: "pending",
    summary: { filesChanged: 2, testsPassed: 18, testsTotal: 18,
               securityStatus: "skipped", infrastructureChanges: 0,
               estimatedMonthlyCostDeltaUsd: 0 },
  },
};

/** Simulated run history. Marked as such wherever it surfaces. */
const MOCK_RUNS = [
  { runId: "run-simulated-1", startedAt: null, endedAt: null, events: 412, agents: 7,
    testsPassed: 24, testsFailed: 3, fileWrites: 37, current: true, simulated: true },
  { runId: "run-simulated-2", startedAt: null, endedAt: null, events: 388, agents: 6,
    testsPassed: 18, testsFailed: 1, fileWrites: 22, current: false, simulated: true },
  { runId: "run-simulated-3", startedAt: null, endedAt: null, events: 96, agents: 4,
    testsPassed: 6, testsFailed: 4, fileWrites: 9, current: false, simulated: true },
];

/** Mirrors the shape of GET /agents. Real values come from the backend. */
const MOCK_ROSTER = [
  { name: "planner",  deskId: "cto",      model: "simulated", maxTurns: 50, tools: [], canWrite: false, canExecute: false },
  { name: "coder",    deskId: "backend",  model: "simulated", maxTurns: 50,
    tools: ["list_files", "read_file", "write_file", "edit_file", "search_code", "run_command"],
    canWrite: true, canExecute: true },
  { name: "tester",   deskId: "qa",       model: "simulated", maxTurns: 50,
    tools: ["list_files", "read_file", "write_file", "edit_file", "search_code", "run_command"],
    canWrite: true, canExecute: true },
  { name: "reviewer", deskId: "reviewer", model: "simulated", maxTurns: 50,
    tools: ["list_files", "read_file", "search_code", "run_command"], canWrite: false, canExecute: true },
];

const pick = (a) => a[Math.floor(Math.random() * a.length)];
const now = () => new Date().toLocaleTimeString("en-GB", { hour12: false });

/** Deterministic spread, seeded by desk index — random values here would
 *  differ between the server and client render and break hydration. */
const spread = (i, base, span) => base + ((i * 37 + 11) % span);

export function useOfficeEngine() {
  const [agents, setAgents] = useState(() =>
    Object.fromEntries(STAFF.map((p, i) => [p.id, {
      status: i < 7 ? "working" : "waiting",
      activity: "Loading project context",
      progress: spread(i, 20, 55),
      filesChanged: spread(i, 0, 9),
      toolCalls: spread(i, 10, 40),
      testsPassed: 0, testsTotal: 0,
      tokens: spread(i, 40, 90) * 1000,
      activeSeconds: spread(i, 300, 2000),
      ping: 0, terminal: [],
      checklistIndex: 2 + (i % 2),
      currentTaskId: null,
    }])));
  const [feed, setFeed] = useState([]);
  const [tasks, setTasks] = useState(() => Object.fromEntries(MOCK_TASKS.map((t) => [t.id, t])));
  const [approvals, setApprovals] = useState(MOCK_APPROVALS);
  const [running, setRunning] = useState(true);
  const runRef = useRef(running);
  runRef.current = running;

  useEffect(() => {
    const timers = STAFF.map((person, i) => {
      const tick = () => {
        if (runRef.current) step(person);
        timers[i] = setTimeout(tick, 1600 + Math.random() * 3400);
      };
      return setTimeout(tick, 500 + i * 340);
    });

    const emit = (agentId, type, cat, message, extra = {}) =>
      setFeed((f) => [{ id: `${agentId}-${Date.now()}-${Math.random()}`, ts: now(),
                        iso: new Date().toISOString(), agentId, type, cat, message,
                        ...extra },
                      ...f].slice(0, 200));

    function step(person) {
      setAgents((prev) => {
        const a = prev[person.id];
        const next = { ...a, ping: a.ping + 1, toolCalls: a.toolCalls + 1 };

        if (a.status === "error") {                       // recover from failure
          next.status = "working"; next.activity = "Updating implementation";
          emit(person.id, "file_modified", "code", "Updating implementation after test failure",
            { path: pick(FILES[person.id] || ["README.md"]), tool: "edit_file" });
          return { ...prev, [person.id]: next };
        }
        if (Math.random() < 0.07) {                        // genuinely blocked
          next.status = "blocked";
          next.activity = "Waiting on Backend API contract";
          emit(person.id, "task_blocked", "agent", "Blocked — waiting on Backend API contract");
          return { ...prev, [person.id]: next };
        }
        if (Math.random() < 0.16 && COMMANDS[person.id]) { // run a suite
          const cmd = COMMANDS[person.id];
          const failed = Math.random() < 0.28;
          const total = 14 + Math.floor(Math.random() * 34);
          const passed = failed ? total - (1 + Math.floor(Math.random() * 3)) : total;
          next.status = "working";
          next.activity = `Running ${cmd}`;
          next.terminal = [...a.terminal, `$ ${cmd}`].slice(-30);
          emit(person.id, "test_started", "test", `Started ${cmd}`, { path: cmd, tool: "run_command" });

          setTimeout(() => setAgents((p2) => {
            const b = p2[person.id];
            const lines = failed
              ? ["FAILED tests/test_auth.py::test_expired_token",
                 `${passed} passed, ${total - passed} failed in ${(1 + Math.random() * 4).toFixed(2)}s`]
              : [`${total} passed in ${(1 + Math.random() * 4).toFixed(2)}s`];
            emit(person.id, failed ? "test_failed" : "test_passed", failed ? "error" : "test",
              failed ? `${total - passed} of ${total} tests failed` : `${total} tests passed`,
              { passed, total });
            return { ...p2, [person.id]: { ...b,
              status: failed ? "error" : "working",
              activity: failed ? "Analysing test failure" : "Tests passed",
              testsPassed: passed, testsTotal: total,
              terminal: [...b.terminal, ...lines].slice(-30),
              progress: Math.min(100, b.progress + (failed ? 1 : 5)),
              checklistIndex: failed ? b.checklistIndex : b.checklistIndex + (Math.random() < 0.5 ? 1 : 0),
            } };
          }), 2000);

          return { ...prev, [person.id]: next };
        }

        const act = pick(ACTIONS);
        const target = act.type === "search_performed"
          ? pick(["JWT_SECRET", "get_current_user", "DealStatus", "refresh_token"])
          : pick(FILES[person.id] || ["README.md"]);
        next.status = act.status;
        next.activity = `${act.verb} ${target}`;
        next.progress = Math.min(100, a.progress + 1 + Math.random() * 2.5);
        next.tokens = a.tokens + 900 + Math.floor(Math.random() * 4200);
        next.activeSeconds = a.activeSeconds + 20 + Math.floor(Math.random() * 60);
        if (act.type === "file_modified" || act.type === "file_created") next.filesChanged = a.filesChanged + 1;
        emit(person.id, act.type, act.cat, `${act.verb} ${target}`,
          act.type === "search_performed" ? {} : { path: target, tool: "write_file" });
        return { ...prev, [person.id]: next };
      });

      // Nudge a task along now and then so the board isn't frozen.
      if (Math.random() < 0.12) {
        setTasks((prev) => {
          const runningIds = Object.values(prev).filter((t) => t.status === "running");
          if (!runningIds.length) return prev;
          const t = pick(runningIds);
          const progress = Math.min(100, t.progress + 4);
          return { ...prev, [t.id]: { ...t, progress,
            status: progress >= 100 ? "review" : "running" } };
        });
      }
    }

    return () => timers.forEach(clearTimeout);
  }, []);

  const resolveApproval = async (id, decision) => {
    setApprovals((prev) => ({ ...prev, [id]: { ...prev[id], status: decision } }));
    return { id, status: decision, simulated: true };
  };

  const metrics = useDerivedMetrics(agents, feed, tasks, approvals);

  return { agents, feed, tasks, approvals, metrics, running, setRunning,
           runs: MOCK_RUNS, roster: MOCK_ROSTER, health: null, apiUrl: null,
           connected: false, resolveApproval, live: false,
           startRun: async () => ({ error: "simulation — start the backend for a real run" }),
           startDemo: async () => ({ error: "simulation — start the backend for a real run" }) };
}
