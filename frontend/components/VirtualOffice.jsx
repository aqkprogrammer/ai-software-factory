"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  Building2, LayoutDashboard, FolderKanban, Users, ListChecks, Activity,
  GitBranch, Code2, FlaskConical, ShieldCheck, Rocket, TrendingUp,
  Wallet, AlertTriangle, Settings, Bell, Search, Circle, Pause, Square,
  FileCode2, Terminal as TerminalIcon, ChevronRight, Play, Wifi, WifiOff,
} from "lucide-react";

import { useRealtime } from "../lib/useRealtime";

/* ============================================================================
   AI SOFTWARE FACTORY — Virtual Office
   ----------------------------------------------------------------------------
   Screen 1 of the spec, built for real. The office is an SVG isometric scene:
   room plates, desks, monitors, seated staff, status above each head.

   Motion is CSS keyframes here because this file has to run standalone. In the
   Next.js project these map 1:1 to Framer Motion variants — the classes are
   named after the variant they'd become (deskTyping, statusPulse, eventPing).

   Data comes from a mock engine that emits the RealtimeMessage envelope from
   types.ts. Swapping in a WebSocket is a change at one function.
   ============================================================================ */

/* ---------------------------------------------------------------- tokens -- */

const C = {
  bg: "#080D19",
  floor: "#0F1830",
  panel: "rgba(19,28,49,0.72)",
  panelSolid: "#131C31",
  raise: "#1B2540",
  border: "#22304F",
  borderSoft: "#1A2440",
  ink: "#E6ECF8",
  dim: "#8C9CBF",
  faint: "#5A6889",
  accent: "#6366F1",
};

const STATUS = {
  working:   { c: "#22C55E", label: "Working" },
  thinking:  { c: "#3B82F6", label: "Thinking" },
  reviewing: { c: "#A855F7", label: "Reviewing" },
  waiting:   { c: "#EAB308", label: "Waiting" },
  blocked:   { c: "#F97316", label: "Blocked" },
  error:     { c: "#EF4444", label: "Error" },
  offline:   { c: "#64748B", label: "Offline" },
};

/* ------------------------------------------------------------ office data -- */

const ROOMS = [
  { id: "management",     label: "Management",     gx: 0,  gy: 0,  w: 4,  h: 4, tint: "#4C1D95" },
  { id: "product",        label: "Product",        gx: 4,  gy: 0,  w: 8,  h: 4, tint: "#1E3A8A" },
  { id: "engineering",    label: "Engineering",    gx: 0,  gy: 4,  w: 7,  h: 6, tint: "#164E63" },
  { id: "quality",        label: "Quality",        gx: 7,  gy: 4,  w: 5,  h: 6, tint: "#312E81" },
  { id: "infrastructure", label: "Infrastructure", gx: 0,  gy: 10, w: 12, h: 3, tint: "#134E4A" },
];

const STAFF = [
  { id: "cto",       name: "Atlas",  role: "AI CTO",             room: "management",     gx: 1.6, gy: 1.6, standing: true },
  { id: "pm",        name: "Iris",   role: "Product Manager",    room: "product",        gx: 5.4, gy: 1.4 },
  { id: "analyst",   name: "Sol",    role: "Business Analyst",   room: "product",        gx: 8.8, gy: 1.4 },
  { id: "architect", name: "Vector", role: "System Architect",   room: "engineering",    gx: 0.9, gy: 5.1 },
  { id: "backend",   name: "Forge",  role: "Backend Engineer",   room: "engineering",    gx: 3.9, gy: 5.1 },
  { id: "database",  name: "Quarry", role: "Database Engineer",  room: "engineering",    gx: 0.9, gy: 7.9 },
  { id: "frontend",  name: "Lumen",  role: "Frontend Engineer",  room: "engineering",    gx: 3.9, gy: 7.9 },
  { id: "qa",        name: "Sieve",  role: "QA Engineer",        room: "quality",        gx: 7.9, gy: 5.1 },
  { id: "security",  name: "Aegis",  role: "Security Engineer",  room: "quality",        gx: 10.4, gy: 5.1 },
  { id: "reviewer",  name: "Lens",   role: "Code Reviewer",      room: "quality",        gx: 7.9, gy: 7.9 },
  { id: "devops",    name: "Pylon",  role: "DevOps Engineer",    room: "infrastructure", gx: 2.6, gy: 11.1 },
  { id: "sre",       name: "Beacon", role: "SRE",                room: "infrastructure", gx: 7.6, gy: 11.1 },
];

const TASKS = {
  cto: "Decompose CRM scope into task graph",
  pm: "Write acceptance criteria for deals module",
  analyst: "Map current quotation workflow",
  architect: "Define service boundaries and contracts",
  backend: "Implement authentication API",
  database: "Model deals, contacts and companies",
  frontend: "Build the deals dashboard",
  qa: "Cover auth and deals endpoints",
  security: "Audit token handling and authz",
  reviewer: "Review PR #148 — auth middleware",
  devops: "Wire CI and container build",
  sre: "Configure staging alerting",
};

const CHECKLIST = {
  backend: ["Analyse architecture", "Inspect database schema", "Create auth service",
            "Implement JWT middleware", "Write integration tests", "Security review", "Open pull request"],
  frontend: ["Read API contracts", "Build table component", "Wire data fetching",
             "Empty and error states", "Responsive pass", "Open pull request"],
  qa: ["Read implementation", "Write happy path tests", "Write failure cases",
       "Run suite", "Report failures", "Re-run after fix"],
};
const DEFAULT_CHECKLIST = ["Load project context", "Inspect existing work", "Implement change",
                           "Validate output", "Hand off"];

const FILES = {
  cto: ["PLAN.md", "tasks.json"], pm: ["acceptance-criteria.md"], analyst: ["workflow-map.md"],
  architect: ["ARCHITECTURE.md", "api-contracts.json"], backend: ["auth/service.py", "auth/middleware.py", "api/deals.py"],
  database: ["models/deal.py", "migrations/0007_deals.sql"], frontend: ["app/deals/page.tsx", "components/DealTable.tsx"],
  qa: ["tests/test_auth.py", "tests/test_deals.py"], security: ["auth/middleware.py", ".env.example"],
  reviewer: ["auth/middleware.py"], devops: ["Dockerfile", ".github/workflows/ci.yml"], sre: ["alerts/staging.yaml"],
};

const COMMANDS = {
  backend: "pytest tests/test_auth.py -q", qa: "pytest tests/ -q", frontend: "npm run build",
  database: "alembic upgrade head", devops: "docker build -t crm-api .", security: "bandit -r api/ auth/",
  sre: "kubectl get pods -n staging", reviewer: "git diff --stat", architect: "git log --oneline -5",
  cto: "git log --oneline -5", pm: "ls docs/", analyst: "ls docs/",
};

/* --------------------------------------------------------- iso projection -- */

const TW = 46, TH = 23; // tile half-width / half-height
const iso = (gx, gy) => ({ x: (gx - gy) * TW, y: (gx + gy) * TH });

function RoomPlate({ room, active }) {
  const a = iso(room.gx, room.gy);
  const b = iso(room.gx + room.w, room.gy);
  const c = iso(room.gx + room.w, room.gy + room.h);
  const d = iso(room.gx, room.gy + room.h);
  const pts = `${a.x},${a.y} ${b.x},${b.y} ${c.x},${c.y} ${d.x},${d.y}`;
  const label = iso(room.gx + 0.35, room.gy + 0.35);
  return (
    <g>
      <polygon points={pts} fill={C.floor} stroke={C.border} strokeWidth="1" />
      <polygon points={pts} fill={room.tint} opacity={active ? 0.22 : 0.12}
        style={{ transition: "opacity 400ms ease" }} />
      <text x={label.x} y={label.y + 14} fill={C.faint} fontSize="10"
        fontFamily="'JetBrains Mono', monospace" letterSpacing="1.4">
        {room.label.toUpperCase()}
      </text>
    </g>
  );
}

/** Isometric box: top face + left face + right face. */
function IsoBox({ gx, gy, w, d, h, top, left, right, opacity = 1 }) {
  const p = (x, y, z = 0) => { const s = iso(x, y); return `${s.x},${s.y - z}`; };
  return (
    <g opacity={opacity}>
      <polygon points={`${p(gx, gy, h)} ${p(gx + w, gy, h)} ${p(gx + w, gy + d, h)} ${p(gx, gy + d, h)}`} fill={top} />
      <polygon points={`${p(gx, gy + d, h)} ${p(gx + w, gy + d, h)} ${p(gx + w, gy + d, 0)} ${p(gx, gy + d, 0)}`} fill={right} />
      <polygon points={`${p(gx, gy, h)} ${p(gx, gy + d, h)} ${p(gx, gy + d, 0)} ${p(gx, gy, 0)}`} fill={left} />
    </g>
  );
}

/* ------------------------------------------------------------ workstation -- */

function Workstation({ person, state, selected, onSelect, ping }) {
  const s = STATUS[state.status];
  const base = iso(person.gx + 0.9, person.gy + 0.9);
  const busy = ["working", "thinking", "reviewing"].includes(state.status);

  return (
    <g style={{ cursor: "pointer" }} onClick={() => onSelect(person.id)}
      className="vo-station" tabIndex={0} role="button"
      onKeyDown={(e) => { if (e.key === "Enter") onSelect(person.id); }}
      aria-label={`${person.name}, ${person.role}, ${s.label}`}>

      {/* selection footprint */}
      {selected && (
        <ellipse cx={base.x} cy={base.y + 6} rx="52" ry="26" fill="none"
          stroke={C.accent} strokeWidth="1.5" strokeDasharray="4 4" className="vo-rotate"
          style={{ transformOrigin: `${base.x}px ${base.y + 6}px` }} />
      )}

      {/* event ping — the office reacting to the feed */}
      {ping > 0 && (
        <ellipse key={ping} cx={base.x} cy={base.y + 6} rx="30" ry="15" fill="none"
          stroke={s.c} strokeWidth="1.5" className="vo-ping"
          style={{ transformOrigin: `${base.x}px ${base.y + 6}px` }} />
      )}

      {/* status wash on the floor */}
      <ellipse cx={base.x} cy={base.y + 6} rx="34" ry="17" fill={s.c} opacity={busy ? 0.14 : 0.07}
        className={busy ? "vo-wash" : ""} style={{ transformOrigin: `${base.x}px ${base.y + 6}px` }} />

      {/* desk */}
      <IsoBox gx={person.gx} gy={person.gy} w={1.8} d={1.1} h={16}
        top="#1C2745" left="#141C33" right="#18213C" />

      {/* monitor */}
      <g>
        <IsoBox gx={person.gx + 0.35} gy={person.gy + 0.1} w={1.1} d={0.12} h={44}
          top="#243156" left="#1A2340" right="#1E2947" />
        <polygon
          points={(() => {
            const a = iso(person.gx + 0.4, person.gy + 0.2), b = iso(person.gx + 1.45, person.gy + 0.2);
            return `${a.x},${a.y - 42} ${b.x},${b.y - 42} ${b.x},${b.y - 20} ${a.x},${a.y - 20}`;
          })()}
          fill={s.c} opacity={busy ? 0.75 : 0.28}
          className={state.status === "working" ? "vo-screen" : ""} />
      </g>

      {/* chair + person */}
      <g transform={`translate(${base.x}, ${base.y})`}>
        {!person.standing && (
          <path d="M-13 4 q0 -13 13 -13 q13 0 13 13 z" fill="#141C33" opacity="0.9" />
        )}
        <g className={state.status === "working" ? "vo-type" : busy ? "vo-breathe" : ""}
          style={{ transformOrigin: "0px 0px" }}>
          {/* body */}
          <path d="M-11 2 q0 -16 11 -16 q11 0 11 16 z" fill={C.raise} stroke={s.c} strokeWidth="1.2" strokeOpacity="0.55" />
          {/* head */}
          <circle cx="0" cy="-22" r="7.5" fill="#2A3758" stroke={s.c} strokeWidth="1.2" strokeOpacity="0.55" />
          <circle cx="0" cy="-24" r="3" fill={s.c} opacity="0.55" />
        </g>

        {/* status marker above head */}
        <g transform="translate(0,-46)">
          <circle r="4.5" fill={s.c} className={busy ? "vo-pulse" : ""} />
          <circle r="4.5" fill="none" stroke={s.c} strokeWidth="1" opacity="0.4"
            className={busy ? "vo-halo" : ""} style={{ transformOrigin: "0px 0px" }} />
        </g>

        {/* name plate */}
        <g transform="translate(0,22)" className="vo-plate">
          <rect x="-42" y="-9" width="84" height="18" rx="9" fill="rgba(8,13,25,0.85)" stroke={C.border} strokeWidth="1" />
          <text x="0" y="4" textAnchor="middle" fill={C.dim} fontSize="9.5"
            fontFamily="'JetBrains Mono', monospace">{person.name}</text>
        </g>
      </g>
    </g>
  );
}

/* --------------------------------------------------------------- mock bus -- */
/*  GOING LIVE:
      const ws = new WebSocket(`wss://api.yours/projects/${projectId}/stream`);
      ws.onmessage = (e) => dispatch(JSON.parse(e.data));
    The engine below emits the same RealtimeMessage envelope declared in types.ts. */

const ACTIONS = [
  { type: "file_read",        cat: "code",  status: "working",   verb: "Reading" },
  { type: "search_performed", cat: "code",  status: "working",   verb: "Searching repository for" },
  { type: "file_modified",    cat: "code",  status: "working",   verb: "Modifying" },
  { type: "file_created",     cat: "code",  status: "working",   verb: "Creating" },
  { type: "task_started",     cat: "agent", status: "thinking",  verb: "Planning" },
  { type: "review_submitted", cat: "git",   status: "reviewing", verb: "Reviewing" },
];

/** A desk with nobody at it. Guards against an id the backend knows and we don't. */
const EMPTY_STATE = {
  status: "offline", activity: "Not provisioned", progress: 0, filesChanged: 0,
  toolCalls: 0, testsPassed: 0, testsTotal: 0, tokens: 0, activeSeconds: 0,
  ping: 0, terminal: [], checklistIndex: 0,
};

const pick = (a) => a[Math.floor(Math.random() * a.length)];
const now = () => new Date().toLocaleTimeString("en-GB", { hour12: false });

/** Deterministic spread, seeded by desk index.
 *  Math.random() here would differ between the server render and the client
 *  render and blow up hydration — the variety has to be a pure function of i. */
const spread = (i, base, span) => base + ((i * 37 + 11) % span);

function useOfficeEngine() {
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
    }])));
  const [feed, setFeed] = useState([]);
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

    const emit = (agentId, type, cat, message) =>
      setFeed((f) => [{ id: `${agentId}-${Date.now()}-${Math.random()}`, ts: now(), agentId, type, cat, message }, ...f].slice(0, 80));

    function step(person) {
      setAgents((prev) => {
        const a = prev[person.id];
        const next = { ...a, ping: a.ping + 1, toolCalls: a.toolCalls + 1 };

        if (a.status === "error") {                       // recover from failure
          next.status = "working"; next.activity = "Updating implementation";
          emit(person.id, "file_modified", "code", "Updating implementation after test failure");
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
          emit(person.id, "test_started", "test", `Started ${cmd}`);

          setTimeout(() => setAgents((p2) => {
            const b = p2[person.id];
            const lines = failed
              ? ["FAILED tests/test_auth.py::test_expired_token",
                 `${passed} passed, ${total - passed} failed in ${(1 + Math.random() * 4).toFixed(2)}s`]
              : [`${total} passed in ${(1 + Math.random() * 4).toFixed(2)}s`];
            emit(person.id, failed ? "test_failed" : "test_passed", failed ? "error" : "test",
              failed ? `${total - passed} of ${total} tests failed` : `${total} tests passed`);
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
        emit(person.id, act.type, act.cat, `${act.verb} ${target}`);
        return { ...prev, [person.id]: next };
      });
    }

    return () => timers.forEach(clearTimeout);
  }, []);

  return { agents, feed, running, setRunning };
}

/* ------------------------------------------------------------------- nav -- */

const NAV = [
  { id: "office", label: "Office", icon: Building2, ready: true },
  { id: "command", label: "Command Center", icon: LayoutDashboard },
  { id: "projects", label: "Projects", icon: FolderKanban },
  { id: "employees", label: "AI Employees", icon: Users },
  { id: "tasks", label: "Tasks", icon: ListChecks },
  { id: "activity", label: "Agent Activity", icon: Activity },
  { id: "workflow", label: "Workflow", icon: GitBranch },
  { id: "code", label: "Code", icon: Code2 },
  { id: "testing", label: "Testing", icon: FlaskConical },
  { id: "security", label: "Security", icon: ShieldCheck },
  { id: "deployments", label: "Deployments", icon: Rocket },
  { id: "analytics", label: "Analytics", icon: TrendingUp },
  { id: "costs", label: "Costs", icon: Wallet },
  { id: "approvals", label: "Approvals", icon: AlertTriangle, badge: 2 },
  { id: "settings", label: "Settings", icon: Settings },
];

const FILTERS = [
  { id: "all", label: "All" }, { id: "agent", label: "Agents" }, { id: "code", label: "Code" },
  { id: "test", label: "Tests" }, { id: "git", label: "Git" },
  { id: "deployment", label: "Deploy" }, { id: "error", label: "Errors" },
];

/* ----------------------------------------------------------------- shell -- */

export default function VirtualOffice({ apiUrl = "http://localhost:8000" }) {
  /*  Two sources, one office.

      The mock engine keeps every desk busy so the UI is never empty. The
      realtime hook shows what the backend is actually doing — four desks lit,
      eight offline, which is the honest picture. Both run; `live` decides
      which one the screen reads. It flips itself on the moment the socket
      connects, and you can flip it back to compare.                        */
  const mock = useOfficeEngine();
  const wire = useRealtime(apiUrl);
  const [live, setLive] = useState(false);
  const [requirement, setRequirement] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => { if (wire.connected) setLive(true); }, [wire.connected]);

  const agents = live ? wire.agents : mock.agents;
  const feed = live ? wire.feed : mock.feed;
  const running = live ? wire.running : mock.running;
  const setRunning = live ? () => {} : mock.setRunning;

  const [selected, setSelected] = useState("backend");
  const [filter, setFilter] = useState("all");
  const [route, setRoute] = useState("office");

  const startBuild = useCallback(async (demo) => {
    setNotice("");
    try {
      const r = demo
        ? await fetch(`${apiUrl}/runs/demo`, { method: "POST" }).then((x) => x.json())
        : await wire.startRun(requirement.trim());
      setNotice(r?.error ? r.error : demo ? "Demo run started" : "Build started");
    } catch {
      setNotice(`Cannot reach the backend at ${apiUrl}`);
    }
  }, [apiUrl, requirement, wire]);

  const person = STAFF.find((p) => p.id === selected) ?? STAFF[0];
  const st = agents[person.id] ?? agents.backend;
  const sc = STATUS[st.status].c;

  const activeRooms = useMemo(() => {
    const set = new Set();
    STAFF.forEach((p) => {
      if (["working", "thinking", "reviewing"].includes(agents[p.id]?.status)) set.add(p.room);
    });
    return set;
  }, [agents]);

  const counts = useMemo(() => {
    const v = Object.values(agents);
    return {
      working: v.filter((a) => ["working", "thinking", "reviewing"].includes(a.status)).length,
      blocked: v.filter((a) => ["blocked", "error"].includes(a.status)).length,
      cost: v.reduce((n, a) => n + a.tokens, 0) * 0.000009,
    };
  }, [agents]);

  const visibleFeed = filter === "all" ? feed : feed.filter((e) => e.cat === filter);
  const checklist = CHECKLIST[selected] || DEFAULT_CHECKLIST;

  const onSelect = useCallback((id) => setSelected(id), []);
  const mins = Math.floor(st.activeSeconds / 60);

  return (
    <div className="vo-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter+Tight:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');

        .vo-root { font-family: Inter, system-ui, sans-serif; background: ${C.bg}; color: ${C.ink};
          min-height: 100vh; display: grid; grid-template-columns: 218px 1fr;
          -webkit-font-smoothing: antialiased; }
        .vo-mono { font-family: 'JetBrains Mono', ui-monospace, monospace; }
        .vo-h { font-family: 'Inter Tight', Inter, sans-serif; font-weight: 600; letter-spacing: -0.02em; }
        .vo-eyebrow { font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: .12em;
          text-transform: uppercase; color: ${C.faint}; }

        .vo-side { border-right: 1px solid ${C.borderSoft}; padding: 16px 10px;
          background: linear-gradient(180deg, #0B1224, ${C.bg}); position: sticky; top: 0; height: 100vh; overflow-y: auto; }
        .vo-nav { display: flex; align-items: center; gap: 10px; width: 100%; padding: 8px 10px;
          border-radius: 8px; background: none; border: none; color: ${C.dim}; font-size: 13px;
          cursor: pointer; text-align: left; transition: background 160ms, color 160ms; }
        .vo-nav:hover { background: ${C.raise}; color: ${C.ink}; }
        .vo-nav[data-on="true"] { background: rgba(99,102,241,.14); color: ${C.ink};
          box-shadow: inset 2px 0 0 ${C.accent}; }
        .vo-nav[data-soon="true"] { opacity: .45; }
        .vo-nav:focus-visible { outline: 2px solid ${C.accent}; outline-offset: 1px; }

        .vo-top { display: flex; align-items: center; gap: 18px; padding: 12px 20px; flex-wrap: wrap;
          border-bottom: 1px solid ${C.borderSoft}; background: rgba(11,18,36,.7); backdrop-filter: blur(12px);
          position: sticky; top: 0; z-index: 10; }
        .vo-chip { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 999px;
          border: 1px solid ${C.border}; font-size: 11px; color: ${C.dim}; }

        .vo-runbar { display: flex; align-items: center; gap: 9px; flex-wrap: wrap;
          padding: 10px 20px; border-bottom: 1px solid ${C.borderSoft}; background: rgba(11,18,36,.45); }
        .vo-input { flex: 1 1 320px; min-width: 200px; padding: 7px 11px; border-radius: 8px;
          background: #0C1424; border: 1px solid ${C.border}; color: ${C.ink}; font: inherit; font-size: 12.5px; }
        .vo-input:focus { outline: none; border-color: ${C.accent}; }
        .vo-input::placeholder { color: ${C.faint}; }

        .vo-body { display: grid; grid-template-columns: minmax(0,1fr) 330px; gap: 16px; padding: 16px 20px 28px; align-items: start; }
        @media (max-width: 1240px) { .vo-body { grid-template-columns: 1fr; } }
        @media (max-width: 900px) { .vo-root { grid-template-columns: 1fr; } .vo-side { display: none; } }

        .vo-card { background: ${C.panel}; border: 1px solid ${C.border}; border-radius: 14px;
          backdrop-filter: blur(10px); box-shadow: 0 10px 32px rgba(0,0,0,.34); }

        .vo-station:focus-visible { outline: none; }
        .vo-station .vo-plate { opacity: .55; transition: opacity 200ms ease; }
        .vo-station:hover .vo-plate { opacity: 1; }

        .vo-fbtn { padding: 4px 10px; border-radius: 999px; font-size: 11px; cursor: pointer;
          background: transparent; border: 1px solid ${C.border}; color: ${C.faint}; }
        .vo-fbtn[data-on="true"] { color: ${C.ink}; border-color: ${C.accent}; background: rgba(99,102,241,.14); }

        .vo-evt { display: flex; gap: 9px; padding: 7px 0; border-bottom: 1px solid ${C.borderSoft};
          animation: vo-in 300ms ease both; width: 100%; background: none; border-left: none;
          border-right: none; border-top: none; text-align: left; cursor: pointer; }
        .vo-btn { display: inline-flex; align-items: center; gap: 6px; padding: 6px 11px; border-radius: 8px;
          background: ${C.raise}; border: 1px solid ${C.border}; color: ${C.dim}; font-size: 11.5px; cursor: pointer;
          transition: color 160ms, border-color 160ms; }
        .vo-btn:hover { color: ${C.ink}; border-color: ${C.accent}; }

        /* --- motion (→ Framer Motion variants in the Next.js build) --- */
        @keyframes vo-type { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-1.4px) } }
        .vo-type { animation: vo-type .42s ease-in-out infinite; }
        @keyframes vo-breathe { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-1px) } }
        .vo-breathe { animation: vo-breathe 3.2s ease-in-out infinite; }
        @keyframes vo-screen { 0%,100% { opacity: .62 } 50% { opacity: .9 } }
        .vo-screen { animation: vo-screen 2.4s ease-in-out infinite; }
        @keyframes vo-pulse { 0%,100% { opacity: 1 } 50% { opacity: .45 } }
        .vo-pulse { animation: vo-pulse 1.8s ease-in-out infinite; }
        @keyframes vo-halo { from { transform: scale(1); opacity: .5 } to { transform: scale(2.6); opacity: 0 } }
        .vo-halo { animation: vo-halo 2.2s ease-out infinite; }
        @keyframes vo-wash { 0%,100% { opacity: .1 } 50% { opacity: .2 } }
        .vo-wash { animation: vo-wash 3s ease-in-out infinite; }
        @keyframes vo-ping { from { transform: scale(.4); opacity: .7 } to { transform: scale(1.8); opacity: 0 } }
        .vo-ping { animation: vo-ping 1.1s ease-out forwards; }
        @keyframes vo-rotate { to { transform: rotate(360deg) } }
        .vo-rotate { animation: vo-rotate 14s linear infinite; }
        @keyframes vo-in { from { opacity: 0; transform: translateY(-4px) } to { opacity: 1; transform: none } }
        @keyframes vo-live { 0%,100% { opacity: 1 } 50% { opacity: .3 } }
        .vo-live { animation: vo-live 2s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) { .vo-root * { animation: none !important; } }
      `}</style>

      {/* ------------------------------------------------------- sidebar -- */}
      <aside className="vo-side">
        <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "2px 10px 18px" }}>
          <div style={{ width: 26, height: 26, borderRadius: 8, background: `linear-gradient(135deg, ${C.accent}, #06B6D4)`,
            display: "grid", placeItems: "center", fontSize: 13, fontWeight: 700 }}>F</div>
          <div>
            <div className="vo-h" style={{ fontSize: 13 }}>Factory</div>
            <div className="vo-eyebrow" style={{ fontSize: 9 }}>AI Engineering OS</div>
          </div>
        </div>
        {NAV.map((n) => {
          const Icon = n.icon;
          return (
            <button key={n.id} className="vo-nav" data-on={route === n.id} data-soon={!n.ready}
              onClick={() => setRoute(n.id)}>
              <Icon size={15} strokeWidth={1.8} />
              <span style={{ flex: 1 }}>{n.label}</span>
              {n.badge && <span className="vo-mono" style={{ fontSize: 10, color: "#F97316" }}>{n.badge}</span>}
            </button>
          );
        })}
      </aside>

      <div>
        {/* ---------------------------------------------------- topbar -- */}
        <header className="vo-top">
          <div>
            <div className="vo-eyebrow">Current project</div>
            <div className="vo-h" style={{ fontSize: 15, marginTop: 2 }}>AI CRM Platform</div>
          </div>
          <span className="vo-chip"><Circle size={7} fill="#3B82F6" strokeWidth={0} /> staging</span>
          <span className="vo-chip">{STAFF.length} agents</span>
          <span className="vo-chip" style={{ color: "#22C55E" }}>{counts.working} running</span>
          {counts.blocked > 0 && <span className="vo-chip" style={{ color: "#F97316" }}>{counts.blocked} need attention</span>}
          <span className="vo-chip"><Wallet size={11} /> ${counts.cost.toFixed(2)} today</span>
          <div style={{ flex: 1 }} />
          <span className="vo-chip vo-mono" style={{ borderStyle: "dashed" }}><Search size={11} /> ⌘K</span>

          {/* which source the office is reading */}
          <span className="vo-chip" style={{ color: wire.connected ? "#22C55E" : C.faint,
            borderColor: wire.connected ? "#22C55E55" : C.border }}>
            {wire.connected ? <Wifi size={11} /> : <WifiOff size={11} />}
            {wire.connected ? "backend up" : "backend down"}
          </span>
          <button className="vo-btn" onClick={() => setLive((v) => !v)}
            title={live ? "Showing real agent events" : "Showing simulated events"}>
            {live ? "Live data" : "Demo data"}
          </button>

          {!live && (
            <button className="vo-btn" onClick={() => setRunning((r) => !r)}>
              {running ? <><Pause size={12} /> Pause floor</> : <><Circle size={12} /> Resume floor</>}
            </button>
          )}
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span className={running ? "vo-live" : ""} style={{ width: 7, height: 7, borderRadius: 7, background: running ? "#22C55E" : C.faint }} />
            <span className="vo-mono" style={{ fontSize: 10, color: C.dim }}>{running ? "LIVE" : "PAUSED"}</span>
          </span>
          <Bell size={16} color={C.dim} />
          <div style={{ width: 27, height: 27, borderRadius: 999, background: C.raise, border: `1px solid ${C.border}`,
            display: "grid", placeItems: "center", fontSize: 11, color: C.dim }}>AK</div>
        </header>

        {/* ------------------------------------------------- start a run -- */}
        <div className="vo-runbar">
          <input className="vo-input" value={requirement} placeholder="Build a FastAPI task API with JWT auth and pytest tests"
            onChange={(e) => setRequirement(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && requirement.trim()) startBuild(false); }} />
          <button className="vo-btn" disabled={!requirement.trim() || !wire.connected}
            style={{ opacity: requirement.trim() && wire.connected ? 1 : 0.45 }}
            onClick={() => startBuild(false)}>
            <Play size={12} /> Start build
          </button>
          <button className="vo-btn" disabled={!wire.connected}
            style={{ opacity: wire.connected ? 1 : 0.45 }}
            onClick={() => startBuild(true)} title="Scripted run — no API key, no model calls">
            Demo run
          </button>
          <span style={{ fontSize: 11.5, color: notice ? C.dim : C.faint }}>
            {notice || (wire.connected
              ? "Real agents. They will write files into the workspace directory."
              : `Backend not reachable at ${apiUrl} — the office is showing simulated data.`)}
          </span>
        </div>

        {route !== "office" ? (
          <div style={{ padding: "72px 24px", textAlign: "center", color: C.faint }}>
            <div className="vo-h" style={{ fontSize: 17, color: C.ink }}>{NAV.find((n) => n.id === route)?.label}</div>
            <p style={{ fontSize: 13, maxWidth: 420, margin: "10px auto 0", lineHeight: 1.6 }}>
              Not built yet. The office and the event model came first because they set the contract
              every other screen reads from.
            </p>
            <button className="vo-btn" style={{ marginTop: 18 }} onClick={() => setRoute("office")}>Back to the office</button>
          </div>
        ) : (
          <div className="vo-body">
            {/* ------------------------------------------------- office -- */}
            <section className="vo-card" style={{ padding: 14, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <div>
                  <div className="vo-eyebrow">Floor plan</div>
                  <div className="vo-h" style={{ fontSize: 16, marginTop: 3 }}>Who is working right now</div>
                </div>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  {["working", "thinking", "waiting", "blocked", "error"].map((k) => (
                    <span key={k} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 10.5, color: C.faint }}>
                      <span style={{ width: 7, height: 7, borderRadius: 7, background: STATUS[k].c }} />{STATUS[k].label}
                    </span>
                  ))}
                </div>
              </div>

              <svg viewBox="-620 -90 1240 700" style={{ width: "100%", display: "block" }}
                role="group" aria-label="Isometric office floor plan">
                <defs>
                  <radialGradient id="voGlow" cx="50%" cy="45%" r="60%">
                    <stop offset="0%" stopColor="#1E293B" stopOpacity="0.5" />
                    <stop offset="100%" stopColor="#080D19" stopOpacity="0" />
                  </radialGradient>
                </defs>
                <rect x="-620" y="-90" width="1240" height="700" fill="url(#voGlow)" />
                {ROOMS.map((r) => <RoomPlate key={r.id} room={r} active={activeRooms.has(r.id)} />)}
                {[...STAFF].sort((a, b) => (a.gx + a.gy) - (b.gx + b.gy)).map((p) => (
                  <Workstation key={p.id} person={p} state={agents[p.id] ?? EMPTY_STATE}
                    selected={p.id === selected} onSelect={onSelect}
                    ping={agents[p.id]?.ping ?? 0} />
                ))}
              </svg>
            </section>

            {/* ------------------------------------------- right column -- */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>

              {/* employee detail */}
              <section className="vo-card" style={{ padding: 16 }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
                  <div>
                    <div className="vo-h" style={{ fontSize: 17 }}>{person.name}</div>
                    <div style={{ fontSize: 12, color: C.faint, marginTop: 1 }}>{person.role}</div>
                  </div>
                  <span className="vo-chip" style={{ color: sc, borderColor: sc + "55" }}>
                    <Circle size={7} fill={sc} strokeWidth={0} />{STATUS[st.status].label}
                  </span>
                </div>

                <div style={{ marginTop: 14 }}>
                  <div className="vo-eyebrow">Current task</div>
                  <div style={{ fontSize: 13.5, marginTop: 4, lineHeight: 1.45 }}>{TASKS[selected]}</div>
                  <div className="vo-mono" style={{ fontSize: 11.5, color: sc, marginTop: 7, display: "flex", gap: 6 }}>
                    <ChevronRight size={13} style={{ flexShrink: 0, marginTop: 1 }} />{st.activity}
                  </div>
                </div>

                <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ flex: 1, height: 5, background: C.raise, borderRadius: 5 }}>
                    <div style={{ width: `${st.progress}%`, height: "100%", background: sc, borderRadius: 5,
                      transition: "width 600ms cubic-bezier(.22,1,.36,1)" }} />
                  </div>
                  <span className="vo-mono" style={{ fontSize: 11, color: C.dim }}>{Math.round(st.progress)}%</span>
                </div>

                <div style={{ marginTop: 16 }}>
                  <div className="vo-eyebrow" style={{ marginBottom: 8 }}>Steps</div>
                  {checklist.map((item, i) => {
                    const state = i < st.checklistIndex ? "done" : i === st.checklistIndex ? "active" : "pending";
                    return (
                      <div key={item} style={{ display: "flex", gap: 9, alignItems: "center", padding: "3.5px 0",
                        fontSize: 12.5, color: state === "pending" ? C.faint : state === "active" ? C.ink : C.dim }}>
                        <span style={{ width: 13, textAlign: "center", color: state === "done" ? "#22C55E" : state === "active" ? sc : C.faint }}>
                          {state === "done" ? "✓" : state === "active" ? "●" : "○"}
                        </span>
                        <span>{item}</span>
                      </div>
                    );
                  })}
                </div>

                <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
                  {[
                    ["Files changed", st.filesChanged],
                    ["Tests", st.testsTotal ? `${st.testsPassed}/${st.testsTotal}` : "—"],
                    ["Tool calls", st.toolCalls],
                    ["Time working", `${mins}m`],
                    ["Tokens", `${(st.tokens / 1000).toFixed(0)}k`],
                    ["Est. cost", `$${(st.tokens * 0.000009).toFixed(2)}`],
                  ].map(([l, v]) => (
                    <div key={l}>
                      <div className="vo-mono" style={{ fontSize: 15 }}>{v}</div>
                      <div className="vo-eyebrow" style={{ fontSize: 9, marginTop: 2 }}>{l}</div>
                    </div>
                  ))}
                </div>

                <div style={{ display: "flex", gap: 7, marginTop: 16, flexWrap: "wrap" }}>
                  <button className="vo-btn"><FileCode2 size={12} /> View diff</button>
                  <button className="vo-btn"><TerminalIcon size={12} /> Logs</button>
                  <button className="vo-btn"><Pause size={12} /> Pause</button>
                  <button className="vo-btn"><Square size={12} /> Stop</button>
                </div>

                {st.terminal.length > 0 && (
                  <div className="vo-mono" style={{ marginTop: 14, padding: 10, borderRadius: 9,
                    background: "#060B16", border: `1px solid ${C.borderSoft}`, fontSize: 11, lineHeight: 1.75,
                    maxHeight: 108, overflowY: "auto" }}>
                    {st.terminal.slice(-6).map((l, i) => (
                      <div key={i} style={{ overflowWrap: "anywhere", color: l.startsWith("$") ? "#818CF8"
                        : /FAILED|failed/.test(l) ? "#EF4444" : /passed/.test(l) ? "#22C55E" : C.dim }}>{l}</div>
                    ))}
                  </div>
                )}
              </section>

              {/* activity feed */}
              <section className="vo-card" style={{ padding: 16, minWidth: 0 }}>
                <div className="vo-eyebrow" style={{ marginBottom: 10 }}>Live activity</div>
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 8 }}>
                  {FILTERS.map((f) => (
                    <button key={f.id} className="vo-fbtn" data-on={filter === f.id} onClick={() => setFilter(f.id)}>{f.label}</button>
                  ))}
                </div>
                <div style={{ maxHeight: 320, overflowY: "auto" }}>
                  {visibleFeed.length === 0 && (
                    <div style={{ fontSize: 12.5, color: C.faint, padding: "14px 0" }}>
                      No events in this filter yet.
                    </div>
                  )}
                  {visibleFeed.map((e) => {
                    // The backend can emit ids with no desk (e.g. "system"). Show them,
                    // don't crash on them, and don't try to select them.
                    const who = STAFF.find((p) => p.id === e.agentId)
                      ?? { name: e.agentId ?? "system", role: "Unassigned" };
                    const known = STAFF.some((p) => p.id === e.agentId);
                    const col = e.cat === "error" ? "#EF4444" : e.cat === "test" ? "#22C55E" : C.dim;
                    return (
                      <button key={e.id} className="vo-evt"
                        onClick={() => known && setSelected(e.agentId)}>
                        <span className="vo-mono" style={{ fontSize: 10, color: C.faint, flex: "0 0 54px" }}>{e.ts}</span>
                        <span style={{ minWidth: 0 }}>
                          <span style={{ fontSize: 11.5, color: C.ink, fontWeight: 500 }}>{who.name}</span>
                          <span style={{ fontSize: 10.5, color: C.faint }}> · {who.role}</span>
                          <span style={{ display: "block", fontSize: 12, color: col, overflowWrap: "anywhere", marginTop: 1 }}>
                            {e.message}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
