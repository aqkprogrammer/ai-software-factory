"use client";

/**
 * The application shell: sidebar, top bar, run bar, routing, palette.
 *
 * Two data sources run at once — the simulation and the socket — and `live`
 * decides which one every screen reads. It flips itself on when the backend
 * connects. Keeping both is deliberate: with no backend you still see the
 * product, and comparing them tells you which parts of the simulation lie.
 */
import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Building2, LayoutDashboard, FolderKanban, Users, ListChecks, Activity,
  GitBranch, Code2, FlaskConical, ShieldCheck, Rocket, TrendingUp,
  Wallet, AlertTriangle, Settings, Bell, Search, Circle, Pause, Play, Wifi, WifiOff,
} from "lucide-react";

import { C, STATUS } from "../lib/theme";
import { STAFF, FILTERS } from "../lib/roster";
import { useRealtime } from "../lib/useRealtime";
import { useOfficeEngine } from "../lib/mockEngine";

import Floor from "./office/Floor";
import AgentPanel from "./AgentPanel";
import ActivityFeed, { FilterChips } from "./ActivityFeed";
import CommandPalette from "./CommandPalette";
import CommandCenter from "./screens/CommandCenter";
import Workflow from "./screens/Workflow";
import TaskBoard from "./screens/TaskBoard";
import ActivityScreen from "./screens/ActivityScreen";
import Approvals from "./screens/Approvals";
import Projects from "./screens/Projects";
import Employees from "./screens/Employees";
import CodeScreen from "./screens/CodeScreen";
import TestingScreen from "./screens/TestingScreen";
import SecurityScreen from "./screens/SecurityScreen";
import DeploymentsScreen from "./screens/DeploymentsScreen";
import AnalyticsScreen from "./screens/AnalyticsScreen";
import CostsScreen from "./screens/CostsScreen";
import SettingsScreen from "./screens/SettingsScreen";

const NAV = [
  { id: "office",      label: "Office",         icon: Building2, ready: true },
  { id: "command",     label: "Command Center", icon: LayoutDashboard, ready: true },
  { id: "tasks",       label: "Tasks",          icon: ListChecks, ready: true },
  { id: "workflow",    label: "Workflow",       icon: GitBranch, ready: true },
  { id: "activity",    label: "Agent Activity", icon: Activity, ready: true },
  { id: "approvals",   label: "Approvals",      icon: AlertTriangle, ready: true },
  { id: "projects",    label: "Projects",       icon: FolderKanban, ready: true },
  { id: "employees",   label: "AI Employees",   icon: Users, ready: true },
  { id: "code",        label: "Code",           icon: Code2, ready: true },
  { id: "testing",     label: "Testing",        icon: FlaskConical, ready: true },
  { id: "security",    label: "Security",       icon: ShieldCheck, ready: true },
  { id: "deployments", label: "Deployments",    icon: Rocket, ready: true },
  { id: "analytics",   label: "Analytics",      icon: TrendingUp, ready: true },
  { id: "costs",       label: "Costs",          icon: Wallet, ready: true },
  { id: "settings",    label: "Settings",       icon: Settings, ready: true },
];

export default function Shell({ apiUrl = "http://localhost:8000" }) {
  const mock = useOfficeEngine();
  const wire = useRealtime(apiUrl);
  const [live, setLive] = useState(false);
  /*  The screen lives in the URL: ?screen=workflow. A refresh keeps you where
      you were, and a link to a screen is a link someone else can open.      */
  const [route, setRouteState] = useState(() => {
    if (typeof window === "undefined") return "office";
    const wanted = new URLSearchParams(window.location.search).get("screen");
    return NAV.some((n) => n.id === wanted) ? wanted : "office";
  });
  const setRoute = useCallback((id) => {
    setRouteState(id);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (id === "office") url.searchParams.delete("screen");
      else url.searchParams.set("screen", id);
      window.history.replaceState(null, "", url);
    }
  }, []);
  const [selected, setSelected] = useState("backend");
  const [filter, setFilter] = useState("all");
  const [zoom, setZoom] = useState(false);
  const [requirement, setRequirement] = useState("");
  const [notice, setNotice] = useState("");
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => { if (wire.connected) setLive(true); }, [wire.connected]);

  const src = live ? wire : mock;
  const { agents, feed, tasks, approvals, metrics } = src;

  /* ⌘K / ctrl-K, and "/" as a shortcut when you're not already typing. */
  useEffect(() => {
    const onKey = (e) => {
      const typing = ["INPUT", "TEXTAREA"].includes(e.target?.tagName);
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !typing)) {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
      if (e.key === "Escape") setPaletteOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const startBuild = useCallback(async (demo) => {
    setNotice("");
    try {
      const r = demo ? await wire.startDemo() : await wire.startRun(requirement.trim());
      setNotice(r?.error ? r.error : demo ? "Demo run started" : "Build started");
    } catch {
      setNotice(`Cannot reach the backend at ${apiUrl}`);
    }
  }, [apiUrl, requirement, wire]);

  const onSelectAgent = useCallback((id) => { setSelected(id); }, []);

  const visibleFeed = useMemo(
    () => (filter === "all" ? feed : feed.filter((e) => e.cat === filter)), [feed, filter]);

  const person = STAFF.find((p) => p.id === selected) ?? STAFF[0];
  const st = agents[person.id];

  const screen = () => {
    switch (route) {
      case "command":
        return <CommandCenter agents={agents} feed={feed} tasks={tasks} metrics={metrics}
          onSelectAgent={(id) => { onSelectAgent(id); setRoute("office"); }} onRoute={setRoute} />;
      case "tasks":
        return <TaskBoard tasks={tasks} onSelectAgent={(id) => { onSelectAgent(id); setRoute("office"); }} />;
      case "workflow":
        return <Workflow agents={agents} tasks={tasks} approvals={approvals}
          onSelectAgent={(id) => { onSelectAgent(id); setRoute("office"); }} onRoute={setRoute} />;
      case "activity":
        return <ActivityScreen feed={feed} onSelectAgent={(id) => { onSelectAgent(id); setRoute("office"); }} />;
      case "approvals":
        return <Approvals approvals={approvals} onResolve={src.resolveApproval} live={live} />;
      case "projects":
        return <Projects runs={src.runs} metrics={metrics} live={live} onRoute={setRoute} />;
      case "employees":
        return <Employees agents={agents} roster={src.roster}
          onSelectAgent={(id) => { onSelectAgent(id); setRoute("office"); }} />;
      case "code":
        return <CodeScreen feed={feed}
          onSelectAgent={(id) => { onSelectAgent(id); setRoute("office"); }} />;
      case "testing":
        return <TestingScreen feed={feed} metrics={metrics}
          onSelectAgent={(id) => { onSelectAgent(id); setRoute("office"); }} />;
      case "security":
        return <SecurityScreen roster={src.roster} live={live} />;
      case "deployments":
        return <DeploymentsScreen metrics={metrics} approvals={approvals} tasks={tasks} onRoute={setRoute} />;
      case "analytics":
        return <AnalyticsScreen feed={feed} agents={agents} metrics={metrics} />;
      case "costs":
        return <CostsScreen agents={agents} metrics={metrics} health={src.health} live={live}
          onSelectAgent={(id) => { onSelectAgent(id); setRoute("office"); }} />;
      case "settings":
        return <SettingsScreen health={src.health} apiUrl={src.apiUrl ?? apiUrl}
          connected={wire.connected} live={live} runs={src.runs}
          onToggleLive={() => setLive((v) => !v)} />;
      case "office":
        return (
          <div className="vo-body">
            <section className="vo-card" style={{ padding: 14, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
                marginBottom: 6, gap: 10, flexWrap: "wrap" }}>
                <div>
                  <div className="vo-eyebrow">Floor plan</div>
                  <div className="vo-h" style={{ fontSize: 16, marginTop: 3 }}>Who is working right now</div>
                </div>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  {["working", "thinking", "waiting", "blocked", "error"].map((k) => (
                    <span key={k} style={{ display: "inline-flex", alignItems: "center", gap: 5,
                      fontSize: 10.5, color: C.faint }}>
                      <span style={{ width: 7, height: 7, borderRadius: 7, background: STATUS[k].c }} />
                      {STATUS[k].label}
                    </span>
                  ))}
                </div>
              </div>
              <Floor agents={agents} selected={selected} onSelect={onSelectAgent} zoom={zoom} />
            </section>

            <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
              <AgentPanel id={selected} state={st} tasks={tasks}
                zoom={zoom} onToggleZoom={() => setZoom((v) => !v)} />

              <section className="vo-card" style={{ padding: 16, minWidth: 0 }}>
                <div className="vo-eyebrow" style={{ marginBottom: 10 }}>Live activity</div>
                <div style={{ marginBottom: 8 }}>
                  <FilterChips value={filter} onChange={setFilter} options={FILTERS} />
                </div>
                <ActivityFeed events={visibleFeed} onSelectAgent={onSelectAgent} maxHeight={320} />
              </section>
            </div>
          </div>
        );
      default:
        return (
          <div className="vo-empty">
            <div className="vo-h" style={{ fontSize: 17, color: C.ink }}>
              {NAV.find((n) => n.id === route)?.label}
            </div>
            <p>
              Not built yet. The office, the pipeline and the event model came
              first because they set the contract every other screen reads from.
            </p>
            <button className="vo-btn" onClick={() => setRoute("command")}>Back to the command center</button>
          </div>
        );
    }
  };

  return (
    <div className="vo-root">
      <aside className="vo-side">
        <div className="vo-brand">
          <div className="vo-logo">F</div>
          <div>
            <div className="vo-h" style={{ fontSize: 13 }}>Factory</div>
            <div className="vo-eyebrow" style={{ fontSize: 9 }}>AI Engineering OS</div>
          </div>
        </div>
        {NAV.map((n) => {
          const Icon = n.icon;
          const badge = n.id === "approvals" ? metrics.pendingApprovals : 0;
          return (
            <button key={n.id} className="vo-nav" data-on={route === n.id} data-soon={!n.ready}
              aria-label={n.ready ? n.label : `${n.label} (not built yet)`}
              aria-current={route === n.id ? "page" : undefined}
              onClick={() => setRoute(n.id)}>
              <Icon size={15} strokeWidth={1.8} aria-hidden="true" />
              <span style={{ flex: 1 }}>{n.label}</span>
              {badge > 0 && <span className="vo-mono" style={{ fontSize: 10, color: "#F97316" }}>{badge}</span>}
            </button>
          );
        })}
      </aside>

      <div style={{ minWidth: 0 }}>
        <header className="vo-top">
          <div>
            <div className="vo-eyebrow">Current project</div>
            <div className="vo-h" style={{ fontSize: 15, marginTop: 2 }}>AI CRM Platform</div>
          </div>
          <span className="vo-chip"><Circle size={7} fill="#3B82F6" strokeWidth={0} /> staging</span>
          <span className="vo-chip">{STAFF.length} agents</span>
          <span className="vo-chip" style={{ color: "#22C55E" }}>{metrics.busy} running</span>
          {metrics.needsAttention > 0 && (
            <span className="vo-chip" style={{ color: "#F97316" }}>{metrics.needsAttention} need attention</span>
          )}
          <span className="vo-chip"><Wallet size={11} /> ${metrics.cost.toFixed(2)}</span>
          <div style={{ flex: 1 }} />

          <button className="vo-chip vo-mono" style={{ borderStyle: "dashed", cursor: "pointer" }}
            onClick={() => setPaletteOpen(true)}>
            <Search size={11} /> ⌘K
          </button>
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
            <button className="vo-btn" onClick={() => mock.setRunning((r) => !r)}>
              {mock.running ? <><Pause size={12} /> Pause floor</> : <><Play size={12} /> Resume floor</>}
            </button>
          )}
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span className={src.running ? "vo-live" : ""} style={{ width: 7, height: 7, borderRadius: 7,
              background: src.running ? "#22C55E" : C.faint }} />
            <span className="vo-mono" style={{ fontSize: 10, color: C.dim }}>
              {src.running ? "LIVE" : "IDLE"}
            </span>
          </span>
          <Bell size={16} color={C.dim} />
          <div className="vo-avatar">AK</div>
        </header>

        <div className="vo-runbar">
          <input className="vo-input" value={requirement}
            placeholder="Build a FastAPI task API with JWT auth and pytest tests"
            onChange={(e) => setRequirement(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && requirement.trim()) startBuild(false); }} />
          <button className="vo-btn" disabled={!requirement.trim() || !wire.connected}
            onClick={() => startBuild(false)}>
            <Play size={12} /> Start build
          </button>
          <button className="vo-btn" disabled={!wire.connected} onClick={() => startBuild(true)}
            title="Scripted run — no API key, no model calls">
            Demo run
          </button>
          <span style={{ fontSize: 11.5, color: notice ? C.dim : C.faint }}>
            {notice || (wire.connected
              ? "Real agents. They will write files into the workspace directory."
              : `Backend not reachable at ${apiUrl} — showing simulated data.`)}
          </span>
        </div>

        {screen()}
      </div>

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        nav={NAV}
        onRoute={setRoute}
        onSelectAgent={onSelectAgent}
        approvals={approvals}
        onStartDemo={() => startBuild(true)}
        onToggleLive={() => setLive((v) => !v)}
        live={live}
      />
    </div>
  );
}
